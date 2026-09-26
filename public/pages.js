export function languagePath(path,language,base=''){
 if(!['en','am','om','ti'].includes(language))throw Error('Unsupported language');
 const local=path.slice(base.length);
 return base+(/^\/(en|am|om|ti)(\/|$)/.test(local)?local.replace(/^\/(en|am|om|ti)(?=\/|$)/,`/${language}`):`/${language}/`);
}
export function publicIssueURL({issueURL,articleSlug,language,type,message,pageURL}){
 const url=new URL(issueURL);
 if(url.origin!=='https://github.com'||!/^\/[^/]+\/[^/]+\/issues\/new$/.test(url.pathname))throw Error('Invalid correction destination');
 const page=new URL(pageURL);page.search='';page.hash='';
 url.searchParams.set('title',`Correction: ${articleSlug||'publication'} (${type})`);
 url.searchParams.set('body',`Page: ${page.href}\nLanguage: ${language}\nCorrection type: ${type}\n\n${message.trim()}`);
 return url.href;
}
export const matchesSearch=(text,query)=>text.normalize('NFKC').toLowerCase().includes(query.trim().normalize('NFKC').toLowerCase());

if(typeof document!=='undefined'){
 const root=document.documentElement,base=root.dataset.siteBase||'';
 const currentLanguage=root.dataset.pageLanguage||'en';
 if(root.dataset.languageEntry){
  let preferred='en';try{preferred=localStorage.getItem('civic-ledger-language')||'en';}catch{}
  if(['am','om','ti'].includes(preferred))location.replace(base+`/${preferred}/`);
 }
 const translation=document.querySelector('[data-page-translate]');
 translation?.addEventListener('submit',event=>{
  event.preventDefault();const language=translation.querySelector('select').value;
  const url=new URL(location.href);url.pathname=languagePath(url.pathname,language,base);url.searchParams.delete('translate');
  location.assign(url.href);
 });
 const requested=new URL(location.href).searchParams.get('translate');
 if(['en','am','om','ti'].includes(requested)){
  const url=new URL(location.href);url.pathname=languagePath(url.pathname,requested,base);url.searchParams.delete('translate');location.replace(url.href);
 }
 const search=document.querySelector('[data-static-search]');
 if(search){
  const input=search.querySelector('input[name="q"]'),results=document.querySelector('[data-search-results]');
  const cards=[...results.querySelectorAll('[data-search-text]')],status=results.querySelector('[data-search-status]');
  const filter=()=>{
   const q=new URL(location.href).searchParams.get('q')||'';input.value=q;let count=0;
   for(const card of cards){const match=matchesSearch(card.dataset.searchText,q);card.hidden=!match;if(match)count++;}
   status.textContent=count?`${results.dataset.i18nCount} ${count}`:results.dataset.i18nEmpty;
   for(const link of document.querySelectorAll('[data-language]')){const url=new URL(link.href);if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');link.href=url.href;}
  };
  search.addEventListener('submit',event=>{event.preventDefault();const url=new URL(location.href);if(input.value.trim())url.searchParams.set('q',input.value.trim());else url.searchParams.delete('q');history.pushState(null,'',url.href);filter();});
  window.addEventListener('popstate',filter);filter();
 }
 document.querySelectorAll('[data-public-correction]').forEach(form=>form.addEventListener('submit',event=>{
  event.preventDefault();const data=Object.fromEntries(new FormData(form)),status=form.querySelector('.form-status');
  if(data.message.trim().length<20){status.textContent=form.dataset.i18nShort;return;}
  const url=publicIssueURL({...data,language:data.language||currentLanguage,issueURL:form.dataset.issueUrl,pageURL:location.href});
  if(url.length>7500){status.textContent=form.dataset.i18nLong;return;}
  location.assign(url);
 }));
}
