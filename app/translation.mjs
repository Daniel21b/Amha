import {translateTexts,translationProvider} from './translation-provider.mjs';
import {hash} from './db.mjs';
import {validateArticle} from './content.mjs';
export const languages=['en','am','om','ti'];
export const contentHash=a=>hash(JSON.stringify(a));
const pending=new Map();
const failures=new Map();
export function cachedTranslation(db,a,language){
 const row=db.prepare('SELECT * FROM translations WHERE slug=? AND language=? AND contentHash=?').get(a.slug,language,contentHash(a));
 return row?{...JSON.parse(row.data),translationStatus:row.status,reviewer:row.reviewer,reviewedAt:row.reviewedAt}:null;
}
export async function translateArticle(db,a,language,fetcher=fetch){
 if(!languages.includes(language))throw Error('Unsupported language');
 if(language==='en')return a;
 const cached=cachedTranslation(db,a,language);if(cached)return cached;
 if(!translationProvider(language))throw Error('Translation is not available yet. The original English article is shown.');
 const key=a.slug+language+contentHash(a);
 if(failures.get(key)>Date.now())throw Error('Translation is temporarily unavailable. The original English article is shown.');
 if(pending.has(key))return pending.get(key);
 const request=(async()=>{
  const texts=[a.title,a.deck,...a.blocks.map(b=>b.text),...(a.pullquote?[a.pullquote]:[])];
  const text=await translateTexts(texts,language,fetcher);
  const translated={...a,title:text[0],deck:text[1],originalTitle:a.title,language,translationStatus:'machine',blocks:a.blocks.map((b,i)=>({...b,text:text[i+2],...(b.type==='quote'?{originalText:b.text,originalLanguage:b.originalLanguage||'en',translatedQuote:true}:{})})),...(a.pullquote?{pullquote:text.at(-1)}:{})};
  validateArticle(translated);
  db.prepare(`INSERT INTO translations(slug,language,contentHash,data,status) VALUES(?,?,?,?,?) ON CONFLICT(slug,language) DO UPDATE SET contentHash=excluded.contentHash,data=excluded.data,status=excluded.status,reviewer=NULL,reviewedAt=NULL`).run(a.slug,language,contentHash(a),JSON.stringify(translated),'machine');
  return translated;
 })();pending.set(key,request);
 try{return await request;}catch(e){failures.set(key,Date.now()+60000);throw e;}finally{pending.delete(key);}
}
