import test from 'node:test';
import {parse} from 'parse5';
import assert from 'node:assert/strict';
import {openDatabase} from '../app/db.mjs';
import {translatePage} from '../app/page-translation.mjs';
import {translateTexts} from '../app/translation-provider.mjs';
import {createApp} from '../app/server.mjs';
import {articles} from '../app/content.mjs';
const withKey=async fn=>{const prior=process.env.GOOGLE_TRANSLATE_API_KEY;process.env.GOOGLE_TRANSLATE_API_KEY='fixture-secret';try{await fn();}finally{if(prior===undefined)delete process.env.GOOGLE_TRANSLATE_API_KEY;else process.env.GOOGLE_TRANSLATE_API_KEY=prior;}};
test('whole-page translation preserves links, original quotes, reviews and private form values; caches text',()=>withKey(async()=>{
 const db=openDatabase(':memory:');const requests=[];
 const fetcher=async(url,options)=>{requests.push(JSON.parse(options.body));assert.equal(options.headers['X-Goog-Api-Key'],'fixture-secret');assert.ok(!String(url).includes('fixture-secret'));return Response.json({data:{translations:requests.at(-1).q.map(text=>({translatedText:`AM ${text} &amp; safe <img src=x onerror=alert(1)>`}))}});};
 const html='<html lang="am"><head><title>Article title</title></head><body><nav>Politics</nav><p>Reviewed text</p><a href="https://source.example/report">Evidence</a><details class="original-quote" lang="en">Original quotation</details><form><input value="private query" placeholder="Search articles"><textarea>private feedback</textarea><button data-i18n-loading="Submitting">Submit</button></form><h1 translate="no">private query</h1></body></html>';
 try{
  const output=await translatePage(db,html,'am',{fetcher,protectedTexts:new Set(['Reviewed text'])});
  assert.match(output,/AM Politics/);assert.match(output,/AM Search articles/);assert.match(output,/href="https:\/\/source.example\/report"/);
  const tags=[];const visit=node=>{if(node.tagName)tags.push(node.tagName);for(const child of node.childNodes||[])visit(child);};visit(parse(output));assert.ok(!tags.includes('img'));assert.match(output,/&lt;img/);assert.match(output,/<p>Reviewed text<\/p>/);assert.match(output,/lang="en">Original quotation/);
  assert.ok(!JSON.stringify(requests).includes('private'));assert.ok(!JSON.stringify(requests).includes('Original quotation'));
  assert.ok(!output.includes('fixture-secret'));
  const calls=requests.length;await translatePage(db,html,'am',{fetcher,protectedTexts:new Set(['Reviewed text'])});assert.equal(requests.length,calls);
  await translatePage(db,html.replace('Politics','New headline'),'am',{fetcher,protectedTexts:new Set(['Reviewed text'])});assert.deepEqual(requests.at(-1).q,['New headline']);
 }finally{db.close();}
}));
test('Google batching respects string count and supports all three target languages',()=>withKey(async()=>{
 const counts=[];
 const fetcher=async(url,options)=>{const {q,target}=JSON.parse(options.body);counts.push(q.length);assert.ok(['am','om','ti'].includes(target));return Response.json({data:{translations:q.map(text=>({translatedText:target+' '+text}))}});};
 for(const language of ['am','om','ti']){const output=await translateTexts(Array.from({length:135},(_,i)=>`Text ${i}`),language,fetcher);assert.equal(output.length,135);assert.match(output[134],new RegExp(`^${language} `));}
 assert.deepEqual(counts,[100,35,100,35,100,35]);
}));
test('provider failure never caches a partial page translation',()=>withKey(async()=>{
 const db=openDatabase(':memory:');try{await assert.rejects(translatePage(db,'<p>Public story</p>','am',{fetcher:async()=>Response.json({data:{translations:[]}})}),/incomplete/);assert.equal(db.prepare('SELECT count(*) AS n FROM page_translations').get().n,0);}finally{db.close();}
}));
test('translation control keeps path and search, and full SSR translates article plus navigation',()=>withKey(async()=>{
 const db=openDatabase(':memory:');const fetcher=async(url,options)=>{const {q,target}=JSON.parse(options.body);return Response.json({data:{translations:q.map(text=>({translatedText:`${target.toUpperCase()} ${text}`}))}});};
 const server=createApp(db,{translationFetcher:fetcher});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  const redirect=await fetch(origin+'/en/search?q=civil&translate=om',{redirect:'manual'});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/om/search?q=civil');assert.match(redirect.headers.get('set-cookie'),/ledger-language=om/);
  const response=await fetch(`${origin}/am/article/${articles[0].slug}`);assert.equal(response.status,200);const html=await response.text();
  assert.match(html,/AM Translate this page/);assert.match(html,/AM Politics &amp; Governance/);assert.ok(html.includes('AM '+articles[0].title));assert.match(html,/AM Machine-translated page/);assert.ok(!html.includes('fixture-secret'));
  assert.equal((await fetch(origin+'/en/?translate=bad',{redirect:'manual'})).status,400);
  const fallback=createApp(db,{translationFetcher:async()=>new Response('outage',{status:503})});await new Promise(resolve=>fallback.listen(0,'127.0.0.1',resolve));try{const failed=await fetch(`http://127.0.0.1:${fallback.address().port}/ti/about`);const text=await failed.text();assert.match(text,/Whole-page translation is unavailable/);assert.ok(!text.includes('Machine-translated page —'));}finally{await new Promise(resolve=>fallback.close(resolve));}
 }finally{await new Promise(resolve=>server.close(resolve));db.close();}
}));
