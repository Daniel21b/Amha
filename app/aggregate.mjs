import {openDatabase} from './db.mjs';
import {aggregate} from './feeds.mjs';
const db=openDatabase();
try{const result=await aggregate(db);console.log(JSON.stringify(result,null,2));if(result.some(s=>s.status!=='ok'))process.exitCode=2;}finally{db.close();}
