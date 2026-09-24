import {parse,serialize} from 'parse5';
import {hash} from './db.mjs';
import {translateTexts,translationProvider} from './translation-provider.mjs';
const queues=new WeakMap();
const budgets=new WeakMap();
const cooldowns=new WeakMap();
const attr=(node,name)=>node.attrs?.find(a=>a.name===name)?.value;
const skippedTags=new Set(['script','style','code','pre','textarea','svg','noscript']);
export async function translatePage(db,html,language,{protectedTexts=new Set(),fetcher=fetch}={}){
 if(language==='en')return html;
 if(!['am','om','ti'].includes(language))throw Error('Unsupported translation language.');
 const doc=parse(html),slots=[];
 function slot(object,key){
  const raw=object[key],text=raw.trim();
  if(!text||!/[A-Za-z]/.test(text)||protectedTexts.has(text))return;
  slots.push({object,key,text,prefix:raw.match(/^\s*/)[0],suffix:raw.match(/\s*$/)[0]});
 }
 function walk(node){
  const classes=(attr(node,'class')||'').split(/\s+/);
  if(skippedTags.has(node.tagName)||attr(node,'translate')==='no'||attr(node,'aria-hidden')==='true'||classes.some(c=>['language-switcher','masthead','footer-logo','original-quote'].includes(c)))return;
  if(node.nodeName==='#text')slot(node,'value');
  for(const a of node.attrs||[]){
   if(['placeholder','title','aria-label'].includes(a.name)||a.name.startsWith('data-i18n-')||(node.tagName==='meta'&&attr(node,'name')==='description'&&a.name==='content'))slot(a,'value');
   if(a.name==='lang'&&a.value==='en')a.value=language;
  }
  for(const child of node.childNodes||[])walk(child);
 }
 walk(doc);
 const unique=[...new Set(slots.map(s=>s.text))];
 // Serialise page work per database so overlapping visitors reuse newly cached strings.
 const previous=queues.get(db)||Promise.resolve();
 let release;const lock=new Promise(resolve=>{release=resolve;});queues.set(db,lock);
 await previous;
 try{
  const translated=new Map();const missing=[];
  for(const text of unique){const cached=db.prepare('SELECT translated FROM page_translations WHERE language=? AND contentHash=?').get(language,hash(text));if(cached)translated.set(text,cached.translated);else missing.push(text);}
  if(missing.length){
   if(!translationProvider(language))throw Error('Whole-page translation is not configured yet. English content is shown.');
   if((cooldowns.get(db)||0)>Date.now())throw Error('The translation service is temporarily unavailable. English content is shown.');
   const count=missing.reduce((sum,t)=>sum+t.length,0),now=Date.now();
   const budget=budgets.get(db)||{start:now,used:0};if(now-budget.start>60000){budget.start=now;budget.used=0;}
   const limit=Math.max(10000,Number(process.env.TRANSLATION_CHARACTERS_PER_MINUTE)||60000);
   if(budget.used+count>limit)throw Error('Translation is busy. Please try again in a minute. English content is shown.');
   budget.used+=count;budgets.set(db,budget);
   let results;try{results=await translateTexts(missing,language,fetcher);}catch(e){cooldowns.set(db,Date.now()+30000);throw e;}
   db.exec('BEGIN IMMEDIATE');
   try{
    const save=db.prepare('INSERT OR REPLACE INTO page_translations(language,contentHash,translated,createdAt) VALUES(?,?,?,?)');
    missing.forEach((text,i)=>{save.run(language,hash(text),results[i],new Date().toISOString());translated.set(text,results[i]);});
    db.exec('DELETE FROM page_translations WHERE rowid IN (SELECT rowid FROM page_translations ORDER BY createdAt DESC LIMIT -1 OFFSET 20000)');db.exec('COMMIT');
   }catch(e){db.exec('ROLLBACK');throw e;}
  }
  for(const s of slots)s.object[s.key]=s.prefix+translated.get(s.text)+s.suffix;
  return serialize(doc);
 }finally{release();if(queues.get(db)===lock)queues.delete(db);}
}
