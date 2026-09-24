import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
export function openDatabase(filename=process.env.DATABASE_PATH||resolve('data/ledger.sqlite')){
 if(filename!==':memory:') mkdirSync(dirname(filename),{recursive:true,mode:0o700});
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS field_items(id TEXT PRIMARY KEY,title TEXT NOT NULL,source TEXT NOT NULL,date TEXT,summary TEXT NOT NULL,link TEXT NOT NULL UNIQUE,category TEXT NOT NULL,language TEXT NOT NULL,aggregatedAt TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS source_status(id TEXT PRIMARY KEY,name TEXT NOT NULL,status TEXT NOT NULL,lastAttempt TEXT,lastSuccess TEXT,error TEXT,itemCount INTEGER DEFAULT 0);
 CREATE TABLE IF NOT EXISTS corrections(id TEXT PRIMARY KEY,articleSlug TEXT NOT NULL,language TEXT NOT NULL,type TEXT NOT NULL,message TEXT NOT NULL,createdAt TEXT NOT NULL,status TEXT DEFAULT 'pending');
 CREATE TABLE IF NOT EXISTS page_translations(language TEXT NOT NULL,contentHash TEXT NOT NULL,translated TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(language,contentHash));
 CREATE TABLE IF NOT EXISTS translations(slug TEXT NOT NULL,language TEXT NOT NULL,contentHash TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,reviewer TEXT,reviewedAt TEXT,PRIMARY KEY(slug,language));`);
 return db;
}
export const hash = value=>createHash('sha256').update(value).digest('hex');
export function saveItems(db,items){
 const query=db.prepare(`INSERT INTO field_items VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(link) DO UPDATE SET title=excluded.title,source=excluded.source,date=excluded.date,summary=excluded.summary,category=excluded.category,language=excluded.language,aggregatedAt=excluded.aggregatedAt`);
 db.exec('BEGIN IMMEDIATE');
 try{for(const a of items)query.run(a.id,a.title,a.source,a.date,a.summary,a.link,a.category,a.language,a.aggregatedAt);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
}
export function listItems(db,{source='',category='',limit=60}={}){
 return db.prepare(`SELECT * FROM field_items WHERE (?='' OR source=?) AND (?='' OR category=?) ORDER BY COALESCE(date,aggregatedAt) DESC LIMIT ?`).all(source,source,category,category,Math.min(100,Math.max(1,Number(limit)||60)));
}
export function saveStatus(db,s){
 db.prepare(`INSERT INTO source_status VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,lastAttempt=excluded.lastAttempt,lastSuccess=COALESCE(excluded.lastSuccess,source_status.lastSuccess),error=excluded.error,itemCount=excluded.itemCount`).run(s.id,s.name,s.status,s.lastAttempt,s.lastSuccess||null,s.error||null,s.itemCount||0);
}
