import {parseFragment} from 'parse5';
export function translationProvider(language){
 if(process.env.GOOGLE_TRANSLATE_API_KEY)return 'google';
 if(process.env.TRANSLATOR_KEY&&language!=='om')return 'microsoft';
 return null;
}
// Decode provider HTML entities as text; returned markup is never inserted into the page.
function decodeEntities(value){
 const fragment=parseFragment(value.replace(/</g,'&lt;').replace(/>/g,'&gt;'));
 return fragment.childNodes.map(n=>n.value||'').join('');
}
export async function translateTexts(texts,language,fetcher=fetch){
 if(!['am','om','ti'].includes(language))throw Error('Unsupported translation language.');
 const provider=translationProvider(language);
 if(!provider)throw Error('Whole-page translation is not configured yet. English content is shown.');
 const translated=[];
 for(let i=0;i<texts.length;){
  const batch=[];let size=0;
  while(i<texts.length&&batch.length<100&&(size+texts[i].length<=20000||batch.length===0)){size+=texts[i].length;batch.push(texts[i++]);}
  if(size>30000)throw Error('Text exceeds the translation limit.');
  let result;
  if(provider==='google'){
   result=await fetcher('https://translation.googleapis.com/language/translate/v2',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','X-Goog-Api-Key':process.env.GOOGLE_TRANSLATE_API_KEY},body:JSON.stringify({q:batch,target:language,source:'en',format:'text'})});
  }else{
   result=await fetcher(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=${language}&textType=plain`,{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','Ocp-Apim-Subscription-Key':process.env.TRANSLATOR_KEY,...(process.env.TRANSLATOR_REGION?{'Ocp-Apim-Subscription-Region':process.env.TRANSLATOR_REGION}:{})},body:JSON.stringify(batch.map(Text=>({Text})))});
  }
  if(!result.ok)throw Error('The translation service is temporarily unavailable. English content is shown.');
  const data=await result.json();
  const rows=provider==='google'?data.data?.translations?.map(row=>row.translatedText):Array.isArray(data)?data.map(row=>row.translations?.[0]?.text):null;
  if(!Array.isArray(rows)||rows.length!==batch.length||rows.some(text=>typeof text!=='string'||!text.trim()))throw Error('The translation was incomplete. English content is shown.');
  translated.push(...rows.map(text=>provider==='google'?decodeEntities(text):text));
 }
 return translated;
}
