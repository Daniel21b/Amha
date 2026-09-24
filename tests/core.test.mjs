import test from 'node:test';
import assert from 'node:assert/strict';
import {articles,validateArticle} from '../app/content.mjs';
import {openDatabase,listItems,saveItems} from '../app/db.mjs';
import {parseRSS,normalize,aggregate} from '../app/feeds.mjs';
import {translateArticle,cachedTranslation} from '../app/translation.mjs';
const source={id:'fixture',name:'Publisher',kind:'rss',url:'https://example.org/feed'};
test('editorial validation rejects uncited facts and broken citations',()=>{
 for(const article of articles)assert.equal(validateArticle(article),true);
 const a=structuredClone(articles[0]);a.blocks.push({type:'fact',text:'Unsupported',sourceIds:[]});assert.throws(()=>validateArticle(a),/Uncited/);
 a.blocks.at(-1).sourceIds=['missing'];assert.throws(()=>validateArticle(a),/Unknown citation/);
 const personal=structuredClone(articles.find(article=>article.blocks.some(block=>block.type==='personal')));
 delete personal.blocks.find(block=>block.type==='personal').attribution;
 assert.throws(()=>validateArticle(personal),/Personal account/);
});
test('RSS filters Ethiopia, strips markup, bounds excerpts and deduplicates canonical URLs',()=>{
 const text=`<rss><channel><item><title>Ethiopia rights update</title><link>https://example.org/a?utm_source=rss</link><description><![CDATA[<p>${'word '.repeat(100)}</p>]]></description><pubDate>Mon, 01 Sep 2025 12:00:00 GMT</pubDate></item><item><title>Other country news</title><link>https://example.org/b</link></item><item><title>Ethiopia unsafe</title><link>javascript:alert(1)</link></item></channel></rss>`;
 const items=parseRSS(text,source);assert.equal(items.length,1);assert.equal(items[0].link,'https://example.org/a');assert.equal(items[0].summary.split(' ').length,28);
 const db=openDatabase(':memory:');saveItems(db,items);saveItems(db,items);assert.equal(listItems(db).length,1);db.close();
});
test('Atom and RDF feeds supported; invalid dates stay unknown',()=>{
 const atom='<feed><entry><title>Ethiopia update</title><link href="https://example.org/atom"/><updated>nonsense</updated><summary>Report</summary></entry></feed>';
 assert.equal(parseRSS(atom,source)[0].date,null);
 const rdf='<rdf:RDF><item><title>Ethiopia update</title><link>https://example.org/rdf</link><dc:date>2025-01-01</dc:date></item></rdf:RDF>';
 assert.equal(parseRSS(rdf,source).length,1);
 assert.throws(()=>parseRSS('<html>Access denied</html>',source),/Expected RSS/);
 assert.throws(()=>parseRSS('<!DOCTYPE foo><rss/>',source),/Unsafe/);
});
test('one failed publisher does not lose other feeds or existing records',async()=>{
 const db=openDatabase(':memory:');const fixture='<rss><channel><item><title>Ethiopia update</title><link>https://example.org/ok</link></item></channel></rss>';
 const states=await aggregate(db,[source,{...source,id:'failure',url:'https://example.org/bad'}],async url=>new Response(url.pathname==='/bad'?'fail':fixture,{status:url.pathname==='/bad'?503:200}));
 assert.equal(states[0].status,'ok');assert.equal(states[1].status,'error');assert.equal(listItems(db).length,1);
 await aggregate(db,[source],async()=>new Response('outage',{status:503}));assert.equal(listItems(db).length,1);assert.ok(db.prepare('SELECT lastSuccess FROM source_status WHERE id=?').get('fixture').lastSuccess);db.close();
});
test('translation preserves citations, labels translated quotes and invalidates stale cache',async()=>{
 const db=openDatabase(':memory:');const oldKey=process.env.TRANSLATOR_KEY;process.env.TRANSLATOR_KEY='test-key';
 const a=structuredClone(articles[0]);a.blocks.push({type:'quote',text:'test quotation',sourceIds:a.sourceIds,originalLanguage:'en'});
 let calls=0;
 const mock=async(url,options)=>{calls++;return Response.json(JSON.parse(options.body).map(({Text})=>({translations:[{text:`translated ${Text}`,to:'am'}]})));};
 try{const translated=await translateArticle(db,a,'am',mock);assert.equal(translated.translationStatus,'machine');assert.deepEqual(translated.sourceIds,a.sourceIds);assert.equal(translated.blocks.at(-1).translatedQuote,true);assert.equal(translated.blocks.at(-1).originalText,'test quotation');await translateArticle(db,a,'am',mock);assert.equal(calls,1);a.title+=' changed';assert.equal(cachedTranslation(db,a,'am'),null);}
 finally{if(oldKey===undefined)delete process.env.TRANSLATOR_KEY;else process.env.TRANSLATOR_KEY=oldKey;db.close();}
});
