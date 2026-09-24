import {readFileSync} from 'node:fs';
import {articles,validateArticle} from './content.mjs';
import {openDatabase} from './db.mjs';
import {contentHash,languages} from './translation.mjs';
const [file,reviewer]=process.argv.slice(2);
if(!file||!reviewer){console.error('Usage: npm run review-translation -- reviewed-article.json "Reviewer name"');process.exit(1);}
const translated=JSON.parse(readFileSync(file,'utf8'));
const original=articles.find(a=>a.slug===translated.slug);
if(!original||!languages.includes(translated.language)||translated.language==='en')throw Error('Unknown article or language');
validateArticle(translated);
if(JSON.stringify(translated.sources)!==JSON.stringify(original.sources)||JSON.stringify(translated.sourceIds)!==JSON.stringify(original.sourceIds)||translated.blocks.length!==original.blocks.length)throw Error('Preserve source citations and block count');
translated.blocks.forEach((b,i)=>{if(b.type!==original.blocks[i].type||JSON.stringify(b.sourceIds)!==JSON.stringify(original.blocks[i].sourceIds))throw Error('Preserve evidence types and citations');if(b.type==='quote'){b.originalText=original.blocks[i].text;b.originalLanguage=original.blocks[i].originalLanguage;b.translatedQuote=true;}});
const db=openDatabase();
const data={...original,title:translated.title,deck:translated.deck,blocks:translated.blocks,pullquote:translated.pullquote,language:translated.language,originalTitle:original.title,translationStatus:'reviewed'};
db.prepare(`INSERT INTO translations(slug,language,contentHash,data,status,reviewer,reviewedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(slug,language) DO UPDATE SET contentHash=excluded.contentHash,data=excluded.data,status=excluded.status,reviewer=excluded.reviewer,reviewedAt=excluded.reviewedAt`).run(original.slug,translated.language,contentHash(original),JSON.stringify(data),'reviewed',reviewer,new Date().toISOString());
db.close();console.log('Reviewed translation stored. Any source-article change invalidates this version automatically.');
