import {articles,validateArticle} from './content.mjs';
articles.forEach(validateArticle);
console.log(`Validated ${articles.length} articles: every factual block and deck has resolvable citations.`);
