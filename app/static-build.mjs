import {mkdir,readFile,writeFile,rm,cp} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse,parseFragment,serialize} from 'parse5';
import {articles as originals,validateArticle} from './content.mjs';
import {openDatabase,listItems,saveItems,saveStatus} from './db.mjs';
import {aggregate,sources} from './feeds.mjs';
import {renderPage} from './views.mjs';
import {translatePage} from './page-translation.mjs';
import {cachedTranslation,languages} from './translation.mjs';

const attr=(node,name)=>node?.attrs?.find(a=>a.name===name)?.value;
function setAttr(node,name,value){const existing=node.attrs.find(a=>a.name===name);if(existing)existing.value=value;else node.attrs.push({name,value});}
function walk(node,fn){fn(node);for(const child of node.childNodes||[])walk(child,fn);}
const textOf=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(textOf).join('');
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const categoryNames=['politics-governance','human-rights','conflict-security','press-freedom','economy','regional','opinion-analysis','explainers','verification'];
const regionNames=['national','tigray','amhara','oromia','somali','afar'];
export function staticRoutes(articles=originals){return ['', 'about','support','members','corrections','methodology','search','verification',...categoryNames.map(c=>`category/${c}`),...regionNames.map(r=>`region/${r}`),...articles.map(a=>`article/${a.slug}`)];}

// Only these public tables are cached. Correction submissions are never read or exported.
export function exportPublicCache(db){return {
 version:1,items:db.prepare('SELECT * FROM field_items ORDER BY aggregatedAt DESC LIMIT 600').all(),
 statuses:db.prepare('SELECT * FROM source_status').all(),
 pageTranslations:db.prepare('SELECT language,contentHash,translated,createdAt FROM page_translations').all(),
 articleTranslations:db.prepare('SELECT slug,language,contentHash,data,status,reviewer,reviewedAt FROM translations').all()
};}
async function importCache(db,file){
 let cached;try{cached=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return;throw e;}
 if(cached.version!==1)throw Error('Unsupported public build cache');
 saveItems(db,cached.items||[]);for(const status of cached.statuses||[])saveStatus(db,status);
 const page=db.prepare('INSERT OR REPLACE INTO page_translations VALUES(?,?,?,?)');
 for(const row of cached.pageTranslations||[])if(languages.includes(row.language))page.run(row.language,row.contentHash,row.translated,row.createdAt);
 const article=db.prepare('INSERT OR REPLACE INTO translations VALUES(?,?,?,?,?,?,?)');
 for(const row of cached.articleTranslations||[]){validateArticle(JSON.parse(row.data));article.run(row.slug,row.language,row.contentHash,row.data,row.status,row.reviewer,row.reviewedAt);}
}

export function prepareStaticHTML(html,{path,siteURL,articles=originals,noindex=false}){
 const site=new URL(siteURL),base=site.pathname.replace(/\/$/,'');
 const doc=parse(html);let head;
 const localURL=value=>{
  if(!value.startsWith('/')||value.startsWith('//'))return value;
  if(path==='/404.html')value=value.replace(/^\/(en|am|om|ti)\/not-found\/?(?=$|[?#])/,'/$1/');
  const url=new URL(value,site.origin);
  if(!url.pathname.split('/').at(-1).includes('.')&&!url.pathname.endsWith('/'))url.pathname+='/';
  return base+url.pathname+url.search+url.hash;
 };
 walk(doc,node=>{
  if(node.tagName==='head')head=node;
  if(node.tagName==='html'){setAttr(node,'data-site-base',base);setAttr(node,'data-static-site','true');setAttr(node,'data-page-language',path==='/404.html'?'en':path.split('/')[1]);}
  for(const a of node.attrs||[])if(['href','src','action'].includes(a.name))a.value=localURL(a.value);
 });
 walk(doc,node=>{
  if(attr(node,'class')?.split(' ').includes('story')&&path.includes('/search/')){
   let slug;walk(node,n=>{const href=attr(n,'href');if(href?.startsWith(`${base}/${path.split('/')[1]}/article/`))slug=decodeURIComponent(href.split('/article/')[1].split('/')[0]);});
   const article=articles.find(a=>a.slug===slug),original=originals.find(a=>a.slug===slug);
   if(article)setAttr(node,'data-search-text',[textOf(node),article.region,article.category,...article.blocks.map(b=>b.text),original?.title,...(original?.blocks||[]).map(b=>b.text)].join(' ').normalize('NFKC').toLowerCase());
  }
 });
 const canonical=site.origin+base+path;
 const title=textOf(head.childNodes.find(n=>n.tagName==='title'));
 const description=head.childNodes.find(n=>n.tagName==='meta'&&attr(n,'name')==='description');
 const tags=`<script type="module" src="${xml(base)}/pages.js"></script><link rel="canonical" href="${xml(canonical)}"><meta property="og:site_name" content="The Unquiet Horn"><meta property="og:title" content="${xml(title)}"><meta property="og:description" content="${xml(attr(description,'content')||'')}"><meta property="og:url" content="${xml(canonical)}"><meta property="og:type" content="${path.includes('/article/')?'article':'website'}">${noindex?'<meta name="robots" content="noindex,follow">':''}`;
 for(const node of parseFragment(tags).childNodes){node.parentNode=head;head.childNodes.push(node);}
 // Alternate URLs must be absolute. Untranslated fallback editions are noindexed below.
 for(const n of head.childNodes)if(n.tagName==='link'&&attr(n,'rel')==='alternate')setAttr(n,'href',site.origin+attr(n,'href'));
 return serialize(doc);
}

export async function buildSite({outDir=resolve('.site'),cacheFile=resolve('.cache/pages/public-cache.json'),siteURL=process.env.SITE_URL||'https://unquiethorn.com',refresh=process.env.STATIC_REFRESH_FEEDS!=='false',fetcher=fetch,translationFetcher=fetch,articles=originals,seedFile=resolve('data/field-snapshot.json')}={}){
 const parsedURL=new URL(siteURL);
 if(!['http:','https:'].includes(parsedURL.protocol)||parsedURL.username||parsedURL.password||parsedURL.search||parsedURL.hash)throw Error('SITE_URL must be a public base URL');
 const db=openDatabase(':memory:');const pages=[];const translatedCount={am:0,om:0,ti:0};
 try{
  await importCache(db,seedFile);await importCache(db,cacheFile);
  if(refresh)await aggregate(db,sources(),fetcher);
  const fieldItems=listItems(db);const statuses=sources().map(s=>db.prepare('SELECT * FROM source_status WHERE id=?').get(s.id)||{id:s.id,name:s.name,status:'configuration_required',error:'No successful build fetch yet.'});
  await rm(outDir,{recursive:true,force:true});await mkdir(outDir,{recursive:true});await cp(resolve('public'),outDir,{recursive:true});
  const write=async(path,html)=>{const filename=resolve(outDir,'.'+path,'index.html');await mkdir(dirname(filename),{recursive:true});await writeFile(filename,html);};
  for(const language of languages){
   const localized=articles.map(a=>language==='en'?a:cachedTranslation(db,a,language)||a);
   const protectedTexts=new Set(articles.flatMap(a=>[a.byline,...a.sources.map(s=>s.publisher)]));
   for(const a of localized)if(a.language!=='en')for(const value of [a.title,a.deck,a.pullquote,...a.blocks.map(b=>b.text)])if(value)protectedTexts.add(value.trim());
   for(const item of fieldItems)if(!['en','english'].includes(item.language?.toLowerCase())){protectedTexts.add(item.title);protectedTexts.add(item.summary);}
   for(const suffix of staticRoutes(articles)){
    const path=`/${language}/${suffix?suffix+'/':''}`,url=new URL(path,'https://build.invalid');
    let html,translated=language==='en';
    if(language==='en')html=renderPage({url,articles:localized,fieldItems,statuses,staticSite:true});
    else{
     const ready=localized.map(a=>a.language!=='en'?a:{...a,translationStatus:'machine',blocks:a.blocks.map(b=>b.type==='quote'?{...b,originalText:b.text,translatedQuote:true}:b)});
     const candidate=renderPage({url,articles:ready,fieldItems,statuses,staticSite:true,pageTranslation:'machine'});
     try{html=await translatePage(db,candidate,language,{protectedTexts,fetcher:translationFetcher});translated=true;translatedCount[language]++;}
     catch{html=renderPage({url,articles:localized,fieldItems,statuses,staticSite:true,pageTranslation:'unavailable',translationError:'This language edition has not been generated for the current content. English is shown where no saved translation exists.'});}
    }
    html=prepareStaticHTML(html,{path,siteURL,articles:localized,noindex:!translated||suffix==='search'});
    pages.push({path,indexable:translated&&suffix!=='search',html});
   }
  }
  const indexable=new Set(pages.filter(p=>p.indexable).map(p=>p.path));
  const articleText=new Map(pages.filter(p=>p.path.includes('/article/')).map(page=>{
   let text='';walk(parse(page.html),node=>{if(attr(node,'class')?.split(' ').includes('article-body'))text=textOf(node);});
   return [page.path,text];
  }));
  for(const page of pages){
   // Do not advertise untranslated English copies as language alternatives.
   const doc=parse(page.html);walk(doc,n=>{if(n.tagName==='head')n.childNodes=n.childNodes.filter(c=>c.tagName!=='link'||attr(c,'rel')!=='alternate'||indexable.has(new URL(attr(c,'href')).pathname.slice(parsedURL.pathname.replace(/\/$/,'').length)));});
   if(page.path.endsWith('/search/'))walk(doc,node=>{
    if(attr(node,'data-search-text')===undefined)return;
    const base=parsedURL.pathname.replace(/\/$/,'');
    let translatedText='';walk(node,n=>{const href=attr(n,'href');if(href?.startsWith(`${base}/${page.path.split('/')[1]}/article/`))translatedText=articleText.get(href.slice(base.length))||translatedText;});
    setAttr(node,'data-search-text',`${attr(node,'data-search-text')} ${translatedText}`.normalize('NFKC').toLowerCase());
   });
   page.html=serialize(doc);await write(page.path,page.html);
  }
  const home=pages.find(p=>p.path==='/en/').html;
  await writeFile(resolve(outDir,'index.html'),home.replace('data-static-site="true"','data-static-site="true" data-language-entry="true"'));
  const notFound=renderPage({url:new URL('/en/not-found','https://build.invalid'),articles,fieldItems,statuses,staticSite:true});
  await writeFile(resolve(outDir,'404.html'),prepareStaticHTML(notFound,{path:'/404.html',siteURL,noindex:true}));
  const base=siteURL.replace(/\/$/,'');
  await writeFile(resolve(outDir,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p=>p.indexable).map(p=>`<url><loc>${xml(base+p.path)}</loc></url>`).join('')}</urlset>`);
  await writeFile(resolve(outDir,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
  await writeFile(resolve(outDir,'.nojekyll'),'');
  const cache=exportPublicCache(db);await mkdir(dirname(cacheFile),{recursive:true});await writeFile(cacheFile,JSON.stringify(cache));
  const summary={pages:pages.length,articles:articles.length,feedItems:fieldItems.length,translatedPages:translatedCount};
  await writeFile(resolve(outDir,'build-info.json'),JSON.stringify({...summary,builtAt:new Date().toISOString(),revision:process.env.GITHUB_SHA||'local'}));
  return summary;
 }finally{db.close();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Static build:',await buildSite());
