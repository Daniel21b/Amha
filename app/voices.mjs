// Editorially selected destinations. Profiles are not evidence of a reporter's location.
export const voiceSources=[
 {id:'addis-standard',name:'Addis Standard',feedId:'addis-standard',description:'Newsroom website and social channels. Available reports are linked to their original publisher.',links:[{label:'Website',url:'https://addisstandard.com/'},{label:'Facebook',url:'https://www.facebook.com/AddisstandardEng'},{label:'X',url:'https://x.com/addisstandard'}]},
 {id:'meseret-media',name:'Meseret Media',description:'Selected Facebook and X channels. Social updates remain on the original platform; they are not automatically imported.',links:[{label:'Facebook',url:'https://www.facebook.com/p/Meseret-Media-61562533862014/'},{label:'X',url:'https://x.com/MeseretMedia'}]},
 {id:'elias-meseret',name:'Elias Meseret',description:'A selected individual account for following reporting, commentary and links. Read each post in its original context.',links:[{label:'X',url:'https://x.com/EliasMeseret'}]},
 {id:'reporter',name:'The Reporter Ethiopia',feedId:'reporter',description:'News, politics and in-depth coverage from the publisher’s website. Available RSS headlines appear below.',links:[{label:'Website',url:'https://www.thereporterethiopia.com/'}]},
 {id:'tsedale-lemma',name:'Tsedale Lemma',description:'A selected individual account for following context, commentary and links to reporting.',links:[{label:'X',url:'https://x.com/TsedaleLemma'}]}
];
export const selectedPosts=[
 {id:'addis-x-2104594482633060411',sourceId:'addis-standard',platform:'X',url:'https://x.com/addisstandard/status/2104594482633060411',label:'Selected Addis Standard post · 01'},
 {id:'addis-x-2104585715115753902',sourceId:'addis-standard',platform:'X',url:'https://x.com/addisstandard/status/2104585715115753902',label:'Selected Addis Standard post · 02'},
 {id:'addis-x-2104616629774495893',sourceId:'addis-standard',platform:'X',url:'https://x.com/addisstandard/status/2104616629774495893',label:'Selected Addis Standard post · 03'}
];
const publisherHosts=new Set(['addisstandard.com','www.addisstandard.com','thereporterethiopia.com','www.thereporterethiopia.com']);
export function selectVoiceReports(items){
 return items.filter(item=>{try{const url=new URL(item.link);return ['http:','https:'].includes(url.protocol)&&(publisherHosts.has(url.hostname)||(url.hostname==='allafrica.com'&&/^Addis Standard via AllAfrica$/i.test(item.source)));}catch{return false;}})
 .sort((a,b)=>(Date.parse(b.date||b.aggregatedAt)||0)-(Date.parse(a.date||a.aggregatedAt)||0)).slice(0,12);
}
export function embedURL(value,{page=false}={}){
 let url;try{url=new URL(value);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
 if(['www.facebook.com','facebook.com'].includes(url.hostname)){
  const allowedPage=voiceSources.flatMap(s=>s.links).some(link=>link.label==='Facebook'&&link.url.replace(/\/$/,'')===url.href.replace(/\/$/,''));
  const isPost=/^\/[^/]+\/posts\/[^/]+\/?$/.test(url.pathname)||(/^\/permalink\.php$/.test(url.pathname)&&url.searchParams.has('story_fbid')&&url.searchParams.has('id'));
  if(page?!allowedPage:!isPost)return null;
  const result=new URL(`https://www.facebook.com/plugins/${page?'page':'post'}.php`);
  result.searchParams.set('href',url.href);result.searchParams.set('width','350');
  if(page){result.searchParams.set('tabs','timeline');result.searchParams.set('height','500');result.searchParams.set('small_header','true');result.searchParams.set('adapt_container_width','true');}
  else result.searchParams.set('show_text','true');
  return result.href;
 }
 if(!page&&['www.instagram.com','instagram.com'].includes(url.hostname)&&/^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname))return `https://www.instagram.com${url.pathname.replace(/\/$/,'')}/embed/`;
 return null;
}
