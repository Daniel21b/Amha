import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parse} from 'parse5';
import {buildSite,exportPublicCache,staticRoutes} from '../app/static-build.mjs';
import {openDatabase} from '../app/db.mjs';
import {articles} from '../app/content.mjs';
import {languagePath,publicIssueURL,matchesSearch} from '../public/pages.js';

const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
function walk(node,fn){fn(node);for(const child of node.childNodes||[])walk(child,fn);}
async function files(dir,prefix=''){
 const result=[];for(const entry of await readdir(join(dir,prefix),{withFileTypes:true})){
  const path=join(prefix,entry.name);result.push(...entry.isDirectory()?await files(dir,path):[path]);
 }return result;
}
async function temporary(fn){const dir=await mkdtemp(join(tmpdir(),'horn-pages-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
async function environment(values,fn){const saved={};for(const [key,value] of Object.entries(values)){saved[key]=process.env[key];if(value===undefined)delete process.env[key];else process.env[key]=value;}try{await fn();}finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}}

test('public build cache excludes the private correction table',()=>{
 const db=openDatabase(':memory:');try{
  db.prepare('INSERT INTO corrections VALUES(?,?,?,?,?,?,?)').run('private-id','private-article','en','factual','private-message',new Date().toISOString(),'pending');
  const exported=exportPublicCache(db);
  assert.deepEqual(Object.keys(exported).sort(),['articleTranslations','items','pageTranslations','statuses','version']);
  assert.ok(!JSON.stringify(exported).includes('private-'));
 }finally{db.close();}
});

test('Pages build has working direct routes, assets, public corrections and custom-domain/project URLs',()=>temporary(dir=>environment({GOOGLE_TRANSLATE_API_KEY:undefined,TRANSLATOR_KEY:undefined},async()=>{
 const outDir=join(dir,'site');
 for(const base of ['','/Amha']){
  const summary=await buildSite({outDir,cacheFile:join(dir,'cache.json'),seedFile:join(dir,'absent.json'),refresh:false,siteURL:'https://publication.example'+base});
  assert.equal(summary.pages,staticRoutes().length*4);assert.equal(summary.articles,articles.length);
  assert.deepEqual(summary.translatedPages,{am:0,om:0,ti:0});
  const published=await files(outDir),available=new Set(published);
  assert.ok(available.has('404.html'));assert.ok(available.has('.nojekyll'));
  assert.ok(!published.some(path=>/sqlite|\.env|cache|^app\/|^tests\//.test(path)));
  for(const path of published.filter(path=>path.endsWith('.html'))){
   const html=await readFile(join(outDir,path),'utf8');
   assert.ok(!html.includes('data-correction-form'),path);
   walk(parse(html),node=>{
    for(const name of ['href','src','action']){
     const value=attr(node,name);if(!value?.startsWith('/')||value.startsWith('//'))continue;
     const pathname=new URL(value,'https://publication.example').pathname;
     assert.ok(pathname.startsWith(base+'/'),`${path}: ${value} omits base path`);
     const local=decodeURIComponent(pathname.slice(base.length+1));
     assert.ok(available.has(local.endsWith('/')?local+'index.html':local),`${path}: broken ${value}`);
    }
   });
  }
  const home=await readFile(join(outDir,'en/index.html'),'utf8');
  assert.ok(home.includes(`rel="canonical" href="https://publication.example${base}/en/"`));
  assert.ok(!home.includes('hreflang="am"'));
  const correction=await readFile(join(outDir,'en/corrections/index.html'),'utf8');
  assert.match(correction,/Corrections are public GitHub issues/);assert.match(correction,/data-public-correction/);
  const fallback=await readFile(join(outDir,'am/index.html'),'utf8');assert.match(fallback,/name="robots" content="noindex,follow"/);
  const sitemap=await readFile(join(outDir,'sitemap.xml'),'utf8');
  assert.ok(sitemap.includes(base+'/en/article/'+articles[0].slug+'/'));assert.ok(!sitemap.includes('/am/'));assert.ok(!sitemap.includes('/search/'));
  const search=await readFile(join(outDir,'en/search/index.html'),'utf8');
  let count=0;walk(parse(search),n=>{if(attr(n,'data-search-text')!==undefined)count++;});assert.equal(count,articles.length);
 }
})));

test('static translations include the page and searchable article body, reuse cache and never publish keys',()=>temporary(dir=>environment({GOOGLE_TRANSLATE_API_KEY:'private-build-key',TRANSLATION_CHARACTERS_PER_MINUTE:'1000000'},async()=>{
 const article={...structuredClone(articles[0]),blocks:[{type:'opinion',text:'Distinctive full article passage.'}],pullquote:''};
 let requests=0;
 const translationFetcher=async(url,options)=>{
  requests++;const {q,target}=JSON.parse(options.body);
  assert.equal(options.headers['X-Goog-Api-Key'],'private-build-key');
  return Response.json({data:{translations:q.map(text=>({translatedText:text==='Distinctive full article passage.'?`${target} የፈተና አንቀጽ`:`${target} ${text}`}))}});
 };
 const options={outDir:join(dir,'site'),cacheFile:join(dir,'cache.json'),seedFile:join(dir,'absent.json'),refresh:false,articles:[article],siteURL:'https://publication.example',translationFetcher};
 const summary=await buildSite(options);
 for(const language of ['am','om','ti'])assert.equal(summary.translatedPages[language],staticRoutes([article]).length);
 const page=await readFile(join(options.outDir,'am/article',article.slug,'index.html'),'utf8');
 assert.match(page,/am የፈተና አንቀጽ/);assert.match(page,/am Translate this page/);assert.ok(!page.includes('name="robots" content="noindex'));
 const search=await readFile(join(options.outDir,'am/search/index.html'),'utf8');
 let text;walk(parse(search),n=>{if(attr(n,'data-search-text')!==undefined)text=attr(n,'data-search-text');});
 assert.ok(matchesSearch(text,'የፈተና አንቀጽ'));
 assert.ok(!page.includes('private-build-key'));
 assert.ok(!(await readFile(options.cacheFile,'utf8')).includes('private-build-key'));
 assert.ok(requests>0);
 await buildSite({...options,translationFetcher:async()=>{assert.fail('Cached pages must not make provider requests');}});
})));

test('browser search and language routes preserve Unicode, article paths and project prefixes',()=>{
 assert.ok(matchesSearch('Abiy Ahmed’s Ethiopia','ABIY'));assert.ok(matchesSearch('የፈተና አንቀጽ',' የፈተና '));
 assert.ok(!matchesSearch('Article title','<script>'));
 assert.equal(languagePath('/Amha/en/article/test/','am','/Amha'),'/Amha/am/article/test/');
 assert.equal(languagePath('/en/search/','ti'),'/ti/search/');
 assert.throws(()=>languagePath('/en/','invalid'),/Unsupported/);
});

test('correction drafts are encoded for public GitHub issues without publishing or including search queries',()=>{
 const input={issueURL:'https://github.com/Daniel21b/Amha/issues/new',articleSlug:articles[0].slug,language:'am',type:'translation',message:'Please check <script> & the “quotation”. ሰላም',pageURL:'https://unquiethorn.com/am/article/test/?q=private-query#correction-form'};
 const url=new URL(publicIssueURL(input));assert.equal(url.origin,'https://github.com');assert.equal(url.pathname,'/Daniel21b/Amha/issues/new');
 assert.ok(url.searchParams.get('title').includes(articles[0].slug));
 assert.ok(url.searchParams.get('body').includes(input.message));assert.ok(!url.searchParams.get('body').includes('private-query'));
 assert.throws(()=>publicIssueURL({...input,issueURL:'https://example.com/issues/new'}),/Invalid correction/);
});
