import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {articles} from './content.mjs';
import {openDatabase,listPageItems,listItems} from './db.mjs';
import {aggregate,sources} from './feeds.mjs';
import {cachedTranslation,languages} from './translation.mjs';
import {renderPage} from './views.mjs';
import {translatePage} from './page-translation.mjs';
const publicRoot=resolve('public');
const categories=new Set(['politics-governance','human-rights','conflict-security','press-freedom','economy','regional','opinion-analysis','explainers','verification']);
const regions=new Set(['national','tigray','amhara','oromia','somali','afar']);
const securityHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'"};
function respond(res,status,body,type='application/json; charset=utf-8',extra={}){res.writeHead(status,{...securityHeaders,'Content-Type':type,'Cache-Control':'no-store',...extra});res.end(typeof body==='string'?body:JSON.stringify(body));}
async function bodyJSON(req){let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>12000)throw Object.assign(Error('Request is too large'),{status:413});}try{return JSON.parse(body);}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}}
export function createApp(db=openDatabase(),{translationFetcher=fetch}={}){
 const requests=new Map();
 const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.searchParams.has('translate')){
   const language=url.searchParams.get('translate');
   if(!languages.includes(language)||!/^\/(en|am|om|ti)(\/|$)/.test(url.pathname))return respond(res,400,{error:'Choose a supported language.'});
   url.pathname=url.pathname.replace(/^\/(en|am|om|ti)(?=\/|$)/,`/${language}`);url.searchParams.delete('translate');
   res.writeHead(302,{...securityHeaders,Location:url.pathname+url.search,'Set-Cookie':`ledger-language=${language}; Path=/; SameSite=Lax; Max-Age=31536000`});return res.end();
  }
  if(req.method==='POST'&&url.pathname==='/api/corrections'){
   const origin=req.headers.origin;
   const expected=process.env.SITE_ORIGIN||`http://${req.headers.host}`;
   if(origin&&origin!==expected)return respond(res,403,{error:'Request origin is not permitted.'});
   if(!req.headers['content-type']?.startsWith('application/json'))return respond(res,415,{error:'Use application/json.'});
   const key=req.socket.remoteAddress;const now=Date.now();
   for(const[ip,times]of requests)if(!times.some(t=>now-t<60000))requests.delete(ip);
   const recent=(requests.get(key)||[]).filter(t=>now-t<60000);
   if(recent.length>=5)return respond(res,429,{error:'Please wait a minute before sending another correction.'});
   requests.set(key,[...recent,now]);
   const data=await bodyJSON(req);const {articleSlug='',language='en',type='factual',message}=data;
   if(typeof articleSlug!=='string'||(articleSlug&&!articles.some(a=>a.slug===articleSlug))||!languages.includes(language)||!['factual','translation','source','other'].includes(type)||typeof message!=='string'||message.trim().length<10||message.length>5000)return respond(res,400,{error:'Choose a valid correction type and provide 10–5,000 characters.'});
   const id=randomUUID();db.prepare('INSERT INTO corrections(id,articleSlug,language,type,message,createdAt) VALUES(?,?,?,?,?,?)').run(id,articleSlug,language,type,message.trim(),new Date().toISOString());
   return respond(res,201,{id,message:'Your correction has been saved for editorial review.'});
  }
  if(!['GET','HEAD'].includes(req.method))return respond(res,405,{error:'Method not allowed'},'application/json; charset=utf-8',{Allow:'GET, HEAD'});
  if(url.pathname==='/api/health')return respond(res,200,{status:'ok'});
  if(url.pathname==='/api/field')return respond(res,200,{items:listItems(db,Object.fromEntries(url.searchParams)),statuses:db.prepare('SELECT * FROM source_status').all()});
  if(url.pathname==='/api/articles')return respond(res,200,{articles:articles.map(({blocks,...rest})=>rest)});
  if(url.pathname==='/robots.txt')return respond(res,200,'User-agent: *\nAllow: /\nDisallow: /api/\n','text/plain');
  if(url.pathname==='/'){
   const lang=req.headers.cookie?.match(/(?:^|;\s*)ledger-language=(en|am|om|ti)(?:;|$)/)?.[1]||'en';
   res.writeHead(302,{Location:`/${lang}/`,...securityHeaders});return res.end();
  }
  if(url.pathname==='/favicon.ico')return respond(res,204,'','image/x-icon');
  if(extname(url.pathname)&&!url.pathname.startsWith('/api/')){
   const path=resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(publicRoot+sep))return respond(res,404,{error:'Not found'});
   try{const file=await readFile(path);res.writeHead(200,{...securityHeaders,'Content-Type':({'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream','Cache-Control':'public, max-age=3600'});return res.end(req.method==='HEAD'?'':file);}catch{return respond(res,404,{error:'Not found'});}
  }
  const parts=url.pathname.split('/').filter(Boolean),language=parts[0];
  if(!languages.includes(language))return respond(res,404,'Page not found. <a href="/en/">Return to The Unquiet Horn</a>','text/html');
  let valid=parts.length===1||(['about','members','support','voices','corrections','methodology','verification','search'].includes(parts[1])&&parts.length===2);
  if(parts[1]==='category'&&parts.length===3&&categories.has(parts[2]))valid=true;
  if(parts[1]==='region'&&parts.length===3&&regions.has(parts[2].toLowerCase()))valid=true;
  const selected=parts[1]==='article'&&parts.length===3?articles.find(a=>a.slug===parts[2]):null;
  if(selected)valid=true;
  if(!valid)return respond(res,404,'Page not found. <a href="/en/">Return to The Unquiet Horn</a>','text/html');
  const localized=articles.map(a=>language==='en'?a:cachedTranslation(db,a,language)||a);
  const statuses=sources().map(s=>db.prepare('SELECT * FROM source_status WHERE id=?').get(s.id)||{id:s.id,name:s.name,status:'configuration_required',error:'First update has not completed.',itemCount:0});
  const fieldItems=listPageItems(db);
  let html;
  if(language!=='en'&&req.method!=='HEAD'){
   const protectedTexts=new Set(articles.flatMap(a=>[a.byline,...a.sources.map(source=>source.publisher)]));
   for(const a of localized)if(a.language!=='en')for(const text of [a.title,a.deck,a.pullquote,...a.blocks.map(b=>b.text)])if(text)protectedTexts.add(text.trim());
   for(const item of fieldItems)if(!['en','english'].includes(item.language?.toLowerCase())){protectedTexts.add(item.title);protectedTexts.add(item.summary);}
   const machineReady=localized.map(a=>a.language!=='en'?a:{...a,translationStatus:'machine',blocks:a.blocks.map(b=>b.type==='quote'?{...b,originalText:b.text,translatedQuote:true}:b)});
   const candidate=renderPage({url,articles:machineReady,fieldItems,statuses,pageTranslation:'machine'});
   try{html=await translatePage(db,candidate,language,{protectedTexts,fetcher:translationFetcher});}
   catch{html=renderPage({url,articles:localized,fieldItems,statuses,pageTranslation:'unavailable',translationError:'Whole-page translation is unavailable. English content is shown where no saved translation exists.'});}
  }else html=renderPage({url,articles:localized,fieldItems,statuses});
  return respond(res,200,req.method==='HEAD'?'':html,'text/html; charset=utf-8');
 }catch(e){console.error(e.message);respond(res,e.status||500,{error:e.status?e.message:'The page could not be loaded. Please try again.'});}});
 return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const db=openDatabase();const server=createApp(db);const port=Number(process.env.PORT)||3000;
 server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`The Unquiet Horn: http://localhost:${port}`));
 let timer;
 if(process.env.AGGREGATION_ENABLED!=='false'){
  aggregate(db).then(result=>console.log('Feed refresh:',result.map(s=>`${s.id}=${s.status}`).join(', '))).catch(e=>console.error(e.message));
  timer=setInterval(()=>aggregate(db).catch(e=>console.error(e.message)),Math.max(5,Number(process.env.POLL_INTERVAL_MINUTES)||30)*60000);timer.unref();
 }
 const shutdown=()=>{if(timer)clearInterval(timer);server.close(()=>process.exit(0));};process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
