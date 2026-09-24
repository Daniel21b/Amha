import {openDatabase} from './db.mjs';
const db=openDatabase();const [action='list',id]=process.argv.slice(2);
if(action==='list')console.log(JSON.stringify(db.prepare('SELECT * FROM corrections ORDER BY createdAt DESC LIMIT 100').all(),null,2));
else if(action==='resolve'&&id){const result=db.prepare("UPDATE corrections SET status='resolved' WHERE id=?").run(id);console.log(`Resolved ${result.changes} correction(s). Publish an editorial correction in the article before resolving factual errors.`);}
else{console.error('Usage: node app/corrections.mjs [list | resolve ID]');process.exitCode=1;}
db.close();
