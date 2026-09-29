import test from 'node:test';
import assert from 'node:assert/strict';
import {voiceSources,selectedPosts,selectVoiceReports,embedURL} from '../app/voices.mjs';
import {fetchSource,normalize} from '../app/feeds.mjs';
import {openDatabase,saveItems,listPageItems} from '../app/db.mjs';
import {renderVoices} from '../app/voices-view.mjs';

test('selected sources retain supplied destinations and posts do not invent event descriptions',()=>{
 assert.deepEqual(voiceSources.slice(0,2).map(s=>s.name),['Addis Standard','Meseret Media']);
 for(const post of selectedPosts){assert.ok(voiceSources.some(s=>s.id===post.sourceId));assert.match(post.url,/^https:\/\/x.com\/addisstandard\/status\/\d+$/);assert.equal(post.date,undefined);assert.equal(post.summary,undefined);}
});
test('source page escapes feed text, preserves fallback links and does not preload social frames',()=>{
 const html=renderVoices({fieldItems:[{source:'The Reporter Ethiopia',title:'<script>bad</script>',summary:'<img src=x>',date:null,link:'https://www.thereporterethiopia.com/report/'}]});
 assert.match(html,/&lt;script&gt;bad/);assert.match(html,/Date unavailable/);assert.ok(!html.includes('Jan 1, 1970'));
 assert.ok(!html.includes('<iframe'));assert.ok(!html.includes('<script'));
 assert.equal((html.match(/data-load-post /g)||[]).length,2);
 assert.match(html,/https:\/\/www.facebook.com\/AddisstandardEng/);assert.match(html,/No individual Instagram posts have been selected/);
});
test('embed URLs allow known Facebook pages and public post patterns only',()=>{
 const fb=voiceSources[0].links.find(l=>l.label==='Facebook').url;
 const page=new URL(embedURL(fb,{page:true}));assert.equal(page.hostname,'www.facebook.com');assert.equal(page.pathname,'/plugins/page.php');assert.equal(page.searchParams.get('href'),fb);
 assert.equal(embedURL('https://www.facebook.com/p/Meseret-Media-61562533862014/',{page:true})?.includes('page.php'),true);
 assert.equal(embedURL(fb),null);
 assert.equal(embedURL('https://www.instagram.com/p/ABC_123/'),'https://www.instagram.com/p/ABC_123/embed/');
 assert.ok(embedURL('https://www.facebook.com/AddisstandardEng/posts/12345'));
 for(const url of ['javascript:alert(1)','https://facebook.com.evil.test/a/posts/1','https://user:pass@www.facebook.com/a/posts/1','https://www.facebook.com/groups/private','https://www.instagram.com/some-profile/','https://www.instagram.com:444/p/ABC/','https://x.com/addisstandard/status/123'])assert.equal(embedURL(url),null);
 assert.equal(embedURL('https://www.facebook.com/unknown',{page:true}),null);
});
test('voices reports include selected publishers and preserve syndicated attribution',()=>{
 const records=[{link:'https://addisstandard.com/report',source:'Addis Standard'},{link:'https://allafrica.com/stories/report',source:'Addis Standard via AllAfrica'},{link:'https://www.thereporterethiopia.com/123/report/',source:'The Reporter Ethiopia'},{link:'https://addisstandard.com.evil.test/report',source:'Addis Standard'},{link:'https://allafrica.com/stories/other',source:'Other publisher via AllAfrica'}];
 assert.deepEqual(selectVoiceReports(records).map(r=>r.source),['Addis Standard','Addis Standard via AllAfrica','The Reporter Ethiopia']);
});
test('a bare 304 retries once and imports the actual RSS body',async()=>{
 let calls=0;const urls=[];
 const items=await fetchSource({id:'reporter',name:'The Reporter Ethiopia',kind:'rss',ethiopiaOnly:true,url:'https://www.thereporterethiopia.com/feed/'},async url=>{
  urls.push(String(url));calls++;
  return calls===1?new Response(null,{status:304}):new Response('<rss><channel><item><title>Tigray report</title><link>https://www.thereporterethiopia.com/report/</link></item></channel></rss>');
 });
 assert.equal(calls,2);assert.ok(new URL(urls[1]).searchParams.has('_unquiet_refresh'));assert.equal(items.length,1);
});
test('busy general feeds do not displace the selected newsroom records from the page data',()=>{
 const db=openDatabase(':memory:');try{
  const items=Array.from({length:80},(_,i)=>normalize({title:'Ethiopia update',link:`https://example.com/${i}`,date:'2026-09-28'}, {name:'Other'}));
  items.push(normalize({title:'Earlier report',link:'https://www.thereporterethiopia.com/earlier/',date:'2026-09-20'},{name:'The Reporter Ethiopia'}));
  saveItems(db,items);assert.equal(selectVoiceReports(listPageItems(db)).length,1);
 }finally{db.close();}
});
