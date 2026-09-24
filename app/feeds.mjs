import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {hash,saveItems,saveStatus} from './db.mjs';
const parser=new XMLParser({ignoreAttributes:false,processEntities:true,htmlEntities:true,parseTagValue:false});
const array=x=>x==null?[]:Array.isArray(x)?x:[x];
export const clean = s=>String(typeof s==='object'?s?.['#text']||'':s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export const relevant=s=>/ethiopia|tigray|amhara|oromia|addis ababa|abyssinia/i.test(s);
export function classify(s){return /journalist|press freedom|media|newsroom/i.test(s)?'press-freedom':/inflation|econom|bank|finance|poverty|food price/i.test(s)?'economy':/conflict|killed|war|armed|displace|security/i.test(s)?'conflict-security':/rights|detention|torture|abuse/i.test(s)?'human-rights':'politics-governance';}
export function safeLink(link){try{const u=new URL(link);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)return null;u.hash='';for(const k of [...u.searchParams.keys()])if(k.startsWith('utm_'))u.searchParams.delete(k);return u.href;}catch{return null;}}
export function normalize(raw,source){
 const link=safeLink(raw.link),title=clean(raw.title).slice(0,400);if(!link||!title)return null;
 const parsed=Date.parse(raw.date);const date=Number.isFinite(parsed)&&parsed<=Date.now()+86400000?new Date(parsed).toISOString():null;
 // Short metadata excerpts only. Never retain feed content:encoded or report bodies.
 const summary=clean(raw.summary).split(/\s+/).slice(0,28).join(' ').slice(0,240);
 return {id:hash(link),title,source:raw.source||source.name,date,summary,link,category:classify(title+' '+summary),language:clean(raw.language||'en'),aggregatedAt:new Date().toISOString()};
}
export function parseRSS(xml,source){
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Unsafe XML document');
 if(XMLValidator.validate(xml)!==true)throw Error('Invalid RSS/Atom XML');
 const doc=parser.parse(xml);if(!doc.rss?.channel&&!doc.feed&&!doc['rdf:RDF'])throw Error('Expected RSS or Atom feed');
 return array(doc.rss?.channel?.item||doc.feed?.entry||doc['rdf:RDF']?.item).flatMap(item=>{
  const link=typeof item.link==='string'?item.link:array(item.link).find(l=>!l['@_rel']||l['@_rel']==='alternate')?.['@_href'];
  const raw={title:item.title,link,date:item.pubDate||item.published||item.updated||item['dc:date'],summary:item.description||item.summary||'',language:source.language||'en'};
  if(!source.ethiopiaOnly&&!relevant(clean(raw.title)+' '+clean(raw.summary)))return [];
  if(source.id==='allafrica'){const publisher=clean(raw.summary).match(/^\[([^\]]+)\]/)?.[1];if(publisher)raw.source=publisher+' via AllAfrica';}
  const n=normalize(raw,source);return n?[n]:[];
 });
}
export function sources(){return [
 {id:'reliefweb',name:'ReliefWeb · UN OCHA',kind:'reliefweb',url:'https://api.reliefweb.int/v2/reports'},
 {id:'gdelt',name:'GDELT',kind:'gdelt',url:'https://api.gdeltproject.org/api/v2/doc/doc'},
 {id:'ohchr',name:'UN OHCHR',kind:'rss',url:process.env.OHCHR_RSS_URL||''},
 {id:'amnesty',name:'Amnesty International',kind:'rss',url:process.env.AMNESTY_RSS_URL||'https://www.amnesty.org/en/latest/feed/'},
 {id:'hrw',name:'Human Rights Watch',kind:'rss',url:process.env.HRW_RSS_URL||'https://www.hrw.org/rss/news'},
 {id:'addis-standard',name:'Addis Standard',kind:'rss',url:process.env.ADDIS_STANDARD_RSS_URL||'https://addisstandard.com/feed/',ethiopiaOnly:true},
 {id:'ethiopia-insight',name:'Ethiopia Insight',kind:'rss',url:process.env.ETHIOPIA_INSIGHT_RSS_URL||'https://www.ethiopia-insight.com/feed/',ethiopiaOnly:true},
 {id:'allafrica',name:'AllAfrica',kind:'rss',url:process.env.ALLAFRICA_RSS_URL||'https://allafrica.com/tools/headlines/rdf/ethiopia/headlines.rdf',ethiopiaOnly:true}
 ];}
async function limitedText(response){
 const reader=response.body.getReader();let total=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>3000000)throw Error('Feed exceeds 3 MB limit');chunks.push(value);}}finally{await reader.cancel();}
 return Buffer.concat(chunks).toString('utf8');
}
export async function fetchSource(s,fetcher=fetch){
 const url=new URL(s.url);let options={};
 if(s.kind==='reliefweb'){
  url.searchParams.set('appname',process.env.RELIEFWEB_APPNAME);
  options={method:'POST',body:JSON.stringify({filter:{field:'country.iso3',value:'eth'},fields:{include:['title','date.original','url','source.name']},sort:['date:desc'],limit:30}),headers:{'Content-Type':'application/json'}};
 }
 if(s.kind==='gdelt')for(const[k,v]of Object.entries({query:'Ethiopia (rights OR conflict OR government)',mode:'artlist',format:'json',maxrecords:'30',sort:'datedesc',timespan:'7d'}))url.searchParams.set(k,v);
 const response=await fetcher(url,{...options,signal:AbortSignal.timeout(15000),headers:{'User-Agent':'UnquietHorn/1.0 (attributed news metadata aggregator)',...options.headers}});
 if(!response.ok)throw Error(`Publisher returned HTTP ${response.status}`);
 const body=await limitedText(response);
 if(s.kind==='rss')return parseRSS(body,s);
 const json=JSON.parse(body);
 if(s.kind==='reliefweb')return (json.data||[]).map(r=>normalize({title:r.fields.title,date:r.fields.date?.original,link:r.fields.url,source:array(r.fields.source).map(x=>x.name).join(', ')+' via ReliefWeb',summary:''},s)).filter(Boolean);
 return (json.articles||[]).map(r=>normalize({title:r.title,link:r.url,date:r.seendate?.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z'),summary:'',source:(r.domain||'Publisher')+' via GDELT',language:r.language||'unknown'},s)).filter(Boolean);
}
let running=false;
export async function aggregate(db,feedSources=sources(),fetcher=fetch){
 if(running)return [];running=true;
 try{return await Promise.all(feedSources.map(async s=>{
  const state={id:s.id,name:s.name,lastAttempt:new Date().toISOString()};
  if(!s.url||(s.kind==='reliefweb'&&!process.env.RELIEFWEB_APPNAME)){
   const result={...state,status:'configuration_required',error:s.kind==='reliefweb'?'An approved ReliefWeb app name is required.':'A verified publisher RSS URL is required.'};saveStatus(db,result);return result;
  }
  try{const items=await fetchSource(s,fetcher);saveItems(db,items);const result={...state,status:'ok',lastSuccess:new Date().toISOString(),itemCount:items.length};saveStatus(db,result);return result;}
  catch(e){const result={...state,status:'error',error:String(e.message).slice(0,180)};saveStatus(db,result);return result;}
 }));}finally{running=false;}
}
