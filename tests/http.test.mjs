import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../app/db.mjs';
import {createApp} from '../app/server.mjs';
import {articles} from '../app/content.mjs';
import {renderPage} from '../app/views.mjs';
import {aidOrganizations} from '../app/support.mjs';
test('SSR escapes untrusted search and feed content',()=>{
 const html=renderPage({url:new URL('http://localhost/en/search?q=%3Cscript%3Ealert(1)%3C/script%3E'),articles,fieldItems:[{title:'<img src=x onerror=alert(1)>',source:'Publisher',link:'javascript:alert(1)',date:'2025-01-01'}],statuses:[]});
 assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(!html.includes('href="javascript:'));
});
test('HTTP routes, language preference, durable corrections and private paths',async()=>{
 const db=openDatabase(':memory:');const server=createApp(db);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const path of ['/en/','/am/','/om/','/ti/','/en/about','/en/support','/am/support','/om/support','/ti/support','/en/members','/am/members','/om/members','/ti/members','/en/corrections','/en/methodology','/en/search?q=rights','/en/verification',`/en/article/${articles[0].slug}`]){const res=await fetch(origin+path);assert.equal(res.status,200,path);assert.ok((await res.text()).includes('THE UNQUIET HORN'));}
  const translated=await fetch(`${origin}/am/article/${articles[0].slug}`);assert.match(await translated.text(),/English article shown/);
  const redirect=await fetch(origin,{redirect:'manual',headers:{cookie:'ledger-language=om'}});assert.equal(redirect.headers.get('location'),'/om/');
  for(const path of ['/en/article/missing','/en/category/missing','/.env','/data/ledger.sqlite','/app/content.mjs'])assert.equal((await fetch(origin+path)).status,404);
  const request={articleSlug:articles[0].slug,language:'en',type:'factual',message:'Please verify the source date against the original report.'};
  const res=await fetch(origin+'/api/corrections',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(request)});assert.equal(res.status,201);const data=await res.json();assert.ok(data.id);assert.equal(db.prepare('SELECT count(*) AS count FROM corrections').get().count,1);
  assert.equal((await fetch(origin+'/api/corrections',{method:'POST',headers:{origin:'https://external.example','content-type':'application/json'},body:JSON.stringify(request)})).status,403);
  assert.equal((await fetch(origin+'/api/corrections',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({...request,message:'tiny'})})).status,400);
 }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});

test('support links go to official organizations and sample members are disclosed',()=>{
 const support=renderPage({url:new URL('http://localhost/en/support'),articles});
 for(const org of aidOrganizations){
  assert.ok(['donate.unhcr.org','www.icrc.org'].includes(new URL(org.donateUrl).hostname));
  assert.ok(support.includes(`href="${org.donateUrl}" target="_blank" rel="noopener noreferrer"`));
 }
 assert.ok(support.includes('not collecting donations'));
 assert.ok(support.includes('where they are needed most'));
 const members=renderPage({url:new URL('http://localhost/en/members'),articles});
 assert.ok(members.includes('Illustrative profiles only.'));
 assert.ok(members.includes('registration is not open yet'));
 assert.equal((members.match(/SAMPLE PROFILE/g)||[]).length,3);
});
