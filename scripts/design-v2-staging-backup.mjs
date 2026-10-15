import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {unstable_splitSqlQuery} from 'wrangler';
import {cloudflare,verifiedDatabase,stagingQuery} from './installer-staging-cloudflare.mjs';

const directory='.wrangler/design-v2-staging-20261015';
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const quote=name=>'"'+name.replaceAll('"','""')+'"';
async function query(sql){return (await stagingQuery(sql))[0].results;}
async function snapshot(){
 const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name");
 const data={};
 for(const {name} of tables){
  const columns=(await query(`PRAGMA table_info(${quote(name)})`)).map(c=>c.name);
  const rows=await query(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)} ORDER BY rowid`);
  data[name]={columns,count:rows.length,sha256:digest(rows)};
 }
 return data;
}
function protectKey(key,decrypt=false){
 const expression=decrypt?'Unprotect':'Protect';
 const command=`Add-Type -AssemblyName System.Security; $backupInput=[Console]::In.ReadToEnd().Trim(); $backupBytes=[Convert]::FromBase64String($backupInput); $backupResult=[Security.Cryptography.ProtectedData]::${expression}($backupBytes,[Text.Encoding]::UTF8.GetBytes('SolarMatch staging design-v2'),[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($backupResult))`;
 return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:key.toString('base64'),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(),'base64');
}
function restore(sql){
 const statements=unstable_splitSqlQuery(sql).map(value=>value.trim()).filter(Boolean);
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=OFF; BEGIN;');
  const schema=statements.filter(s=>/^CREATE\b/i.test(s)&&!/^CREATE\s+TRIGGER\b/i.test(s));
  const rows=statements.filter(s=>/^(INSERT|REPLACE|UPDATE|DELETE)\b/i.test(s));
  const triggers=statements.filter(s=>/^CREATE\s+TRIGGER\b/i.test(s));
  const unknown=statements.filter(s=>!schema.includes(s)&&!rows.includes(s)&&!triggers.includes(s)&&!/^(PRAGMA|BEGIN|COMMIT|END)\b/i.test(s)&&!/^ANALYZE sqlite_schema;?$/i.test(s));
  if(unknown.length)throw Error('Unreviewed export statement; no recovery claim made.');
  for(const statement of schema)db.exec(statement);
  // D1 exports sqlite_stat1 rows after ANALYZE sqlite_schema creates that internal table.
  db.exec('ANALYZE sqlite_schema');
  for(const statement of [...rows,...triggers])db.exec(statement);
  db.exec('COMMIT; PRAGMA foreign_keys=ON;');
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Restored foreign keys do not reconcile.');
  const mismatch=db.prepare(`SELECT COUNT(*) n FROM installer_credit_accounts a WHERE a.available<>(SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.reserved<>(SELECT COALESCE(SUM(reserved_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.trial_remaining<>(SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.debt<>(SELECT COALESCE(SUM(debt_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)`).get();
  if(mismatch.n)throw Error('Restored credit ledger does not reconcile.');
  return db;
 }catch(error){db.close();throw error;}
}
const state=await verifiedDatabase(),action=process.argv[2];
if(action==='inspect'){
 const deployments=await cloudflare(`accounts/${state.account}/workers/scripts/${state.worker}/deployments`);
 const holds=await query("SELECT json_extract(config_json,'$.collectionEnabled') collectionEnabled,json_extract(config_json,'$.paymentsEnabled') paymentsEnabled,json_extract(config_json,'$.notificationsEnabled') notificationsEnabled,json_extract(config_json,'$.platformPaused') platformPaused,json_extract(config_json,'$.deliveryPaused') deliveryPaused FROM installer_platform_settings WHERE id=1");
 console.log(JSON.stringify({worker:state.worker,database:state.database,deployment:deployments.deployments[0],holds,clock:await query('SELECT fixed_at FROM installer_test_clock WHERE id=1'),migrations:await query('SELECT name FROM d1_migrations ORDER BY name')}));
}else if(action==='backup'){
 await mkdir(directory,{recursive:true});
 const before=await snapshot();
 const deployments=await cloudflare(`accounts/${state.account}/workers/scripts/${state.worker}/deployments`);
 const version=deployments.deployments[0].versions;
 const rawPath=directory+'/temporary-export.sql';
 try{await readFile(directory+'/manifest.json');throw Error('Existing backup must be preserved.');}catch(error){if(error.code!=='ENOENT')throw error;}
 let existing=false;try{await readFile(directory+'/database.sql.enc.json');existing=true;}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!existing)execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','export',state.database.name,'--remote','--config','staging/wrangler.jsonc','--output',rawPath],{stdio:['ignore','pipe','pipe']});
 const sql=await readFile(rawPath),key=randomBytes(32),iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv),ciphertext=Buffer.concat([cipher.update(sql),cipher.final()]);
 if(!existing){await writeFile(directory+'/database.sql.enc.json',JSON.stringify({format:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}),{flag:'wx',mode:0o600});
 await writeFile(directory+'/key.dpapi',protectKey(key),{flag:'wx',mode:0o600});}
 const saved=JSON.parse(await readFile(directory+'/database.sql.enc.json','utf8'));
 const recoveredKey=protectKey(await readFile(directory+'/key.dpapi'),true);
 const decipher=createDecipheriv('aes-256-gcm',recoveredKey,Buffer.from(saved.iv,'base64'));decipher.setAuthTag(Buffer.from(saved.tag,'base64'));
 const recovered=Buffer.concat([decipher.update(Buffer.from(saved.ciphertext,'base64')),decipher.final()]);
 if(digest(recovered)!==digest(sql))throw Error('Encrypted backup verification failed.');
 const db=restore(recovered.toString('utf8'));
 try{for(const [name,expected]of Object.entries(before)){
  const actual=db.prepare(`SELECT ${expected.columns.map(quote).join(',')} FROM ${quote(name)} ORDER BY rowid`).all();
  if(digest(actual)!==expected.sha256)throw Error(`Backup differs in ${name}; values withheld.`);
 }}finally{db.close();recoveredKey.fill(0);key.fill(0);}
 const names=(await readdir('migrations')).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
 const applied=(await query('SELECT name FROM d1_migrations ORDER BY name')).map(row=>row.name);
 if(JSON.stringify(applied)!==JSON.stringify(names.slice(0,applied.length)))throw Error('Unexpected staging migration prefix.');
 let timeTravel;try{timeTravel=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','time-travel','info',state.database.name,'--config','staging/wrangler.jsonc','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{timeTravel={unavailable:true};}
 await writeFile(directory+'/manifest.json',JSON.stringify({createdAt:new Date().toISOString(),worker:state.worker,database:state.database,version,before,sourceSha256:digest(sql),encryptedRoundTripVerified:true,restoredTables:Object.keys(before).length,foreignKeyViolations:0,ledgerMismatches:0,timeTravel},null,2),{flag:'wx',mode:0o600});
 await unlink(rawPath);
 console.log(JSON.stringify({backup:directory+'/database.sql.enc.json',keyProtection:'Windows CurrentUser DPAPI',sha256:digest(sql),restoredTables:Object.keys(before).length,verified:true,version,timeTravelAvailable:!timeTravel.unavailable,pending:names.slice(applied.length),counts:Object.fromEntries(['leads','installer_enquiries','lead_recipient_deliveries','installer_credit_ledger'].map(name=>[name,before[name].count]))}));
}else if(action==='integrity'){
 const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));
 const changed=[];
 for(const [name,expected]of Object.entries(manifest.before)){
  if(name==='d1_migrations')continue;
  const rows=await query(`SELECT ${expected.columns.map(quote).join(',')} FROM ${quote(name)} ORDER BY rowid`);
  if(digest(rows)!==expected.sha256)changed.push(name);
 }
 if(changed.length)throw Error('Pre-existing staging rows differ: '+changed.join(',')+'; values withheld.');
 console.log(JSON.stringify({preservedTables:Object.keys(manifest.before).length-1,changed:[],migrations:await query('SELECT name FROM d1_migrations ORDER BY name')}));
}else throw Error('Choose inspect, backup or integrity. No operation performed.');
