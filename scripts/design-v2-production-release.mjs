import {readFile,readdir,mkdir,writeFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {cloudflare,account} from './installer-staging-cloudflare.mjs';
import {unstable_splitSqlQuery} from 'wrangler';

// Explicitly authorised Design v2 production release only. No deploy, activation,
// seeding, secret management, staging mutation or automatic database restoration.
const worker='solarmatch-thailand',name='solarmatch-thailand-admin',database='61d0704e-5c1f-4bf6-bf58-32dbe07e9f65';
const directory='.wrangler/production-design-v2-20261015';
const action=process.argv[2];
if(!['backup','rehearse','migrate','verify'].includes(action))throw Error('Choose backup, rehearse, migrate or verify.');
if(execFileSync('git',['remote','get-url','origin'],{encoding:'utf8'}).trim()!=='https://github.com/gvrshabd/solarmatch-thailand.git')throw Error('Wrong repository');
if(!['feature/design-v2-integration','main'].includes(execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim()))throw Error('Wrong release branch');
execFileSync('git',['merge-base','--is-ancestor','807b4970e724bd0e8f9d89c73b55defd64f82856','HEAD']);
const meta=await cloudflare(`accounts/${account}/d1/database/${database}`);
if(meta.uuid!==database||meta.name!==name)throw Error('Production identity mismatch');
const query=async(sql,params=[])=>{
 const current=await cloudflare(`accounts/${account}/d1/database/${database}`);
 if(current.uuid!==database||current.name!==name)throw Error('Production identity changed');
 return(await cloudflare(`accounts/${account}/d1/database/${database}/query`,'POST',{sql,params}))[0].results;
};
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const migrationNames=(await readdir('migrations')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort();
const applied=async()=>{const names=(await query('SELECT name FROM d1_migrations ORDER BY name')).map(r=>r.name);if(JSON.stringify(names)!==JSON.stringify(migrationNames.slice(0,names.length)))throw Error('Unexpected migration history');return names;};
async function holds(){
 const row=(await query("SELECT json_extract(config_json,'$.collectionEnabled') collection,json_extract(config_json,'$.paymentsEnabled') payments,json_extract(config_json,'$.notificationsEnabled') notifications,json_extract(config_json,'$.platformPaused') platformPaused,json_extract(config_json,'$.deliveryPaused') deliveryPaused FROM installer_platform_settings WHERE id=1"))[0];
 if(!row||row.collection!==0||row.payments!==0||row.notifications!==0||row.platformPaused!==1||row.deliveryPaused!==1)throw Error('Production holds changed');
 if((await query('SELECT fixed_at FROM installer_test_clock WHERE id=1'))[0]?.fixed_at!==null)throw Error('Test clock must be null');
 return row;
}
const ledgerSql='SELECT COUNT(*) n FROM installer_credit_accounts a WHERE a.available<>(SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.reserved<>(SELECT COALESCE(SUM(reserved_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.trial_remaining<>(SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.debt<>(SELECT COALESCE(SUM(debt_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)';
async function integrity(){if((await query('PRAGMA foreign_key_check')).length||(await query(ledgerSql))[0].n)throw Error('Foreign keys or ledger do not reconcile');}
async function snapshot(){
 const tables=await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name");
 const result={};for(const{name:table}of tables){const columns=(await query(`PRAGMA table_info(${quote(table)})`)).map(c=>c.name);const rows=await query(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY rowid`);result[table]={columns,count:rows.length,sha256:digest(rows)};}return result;
}
function protectKey(bytes,decrypt=false){
 const op=decrypt?'Unprotect':'Protect';
 const cmd=`Add-Type -AssemblyName System.Security; $releaseBytes=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); $releaseResult=[Security.Cryptography.ProtectedData]::${op}($releaseBytes,[Text.Encoding]::UTF8.GetBytes('SolarMatch production design-v2 20261015'),[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($releaseResult))`;
 return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',cmd],{input:bytes.toString('base64'),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(),'base64');
}
function restore(sql){
 const statements=unstable_splitSqlQuery(sql).map(s=>s.trim()).filter(Boolean),db=new DatabaseSync(':memory:');
 try{
  const schema=statements.filter(s=>/^CREATE\b/i.test(s)&&!/^CREATE\s+TRIGGER\b/i.test(s)),rows=statements.filter(s=>/^(INSERT|REPLACE|UPDATE|DELETE)\b/i.test(s)),triggers=statements.filter(s=>/^CREATE\s+TRIGGER\b/i.test(s));
  if(statements.some(s=>!schema.includes(s)&&!rows.includes(s)&&!triggers.includes(s)&&!/^(PRAGMA|BEGIN|COMMIT|END)\b/i.test(s)&&!/^ANALYZE sqlite_schema;?$/i.test(s)))throw Error('Unreviewed export statement');
  db.exec('PRAGMA foreign_keys=OFF; BEGIN;');for(const s of schema)db.exec(s);db.exec('ANALYZE sqlite_schema');for(const s of [...rows,...triggers])db.exec(s);db.exec('COMMIT; PRAGMA foreign_keys=ON;');
  if(db.prepare('PRAGMA foreign_key_check').all().length||db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare(ledgerSql).get().n)throw Error('Restored integrity failed');
  return db;
 }catch(error){db.close();throw error;}
}
async function decryptedBackup(){
 const saved=JSON.parse(await readFile(directory+'/database.sql.enc.json','utf8')),key=protectKey(await readFile(directory+'/key.dpapi'),true);
 try{const d=createDecipheriv('aes-256-gcm',key,Buffer.from(saved.iv,'base64'));d.setAuthTag(Buffer.from(saved.tag,'base64'));return Buffer.concat([d.update(Buffer.from(saved.ciphertext,'base64')),d.final()]);}finally{key.fill(0);}
}
async function preserved(before,db=null){
 const changed=[],mutable=[];
 for(const[table,s]of Object.entries(before)){if(table==='d1_migrations')continue;const sql=`SELECT ${s.columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY rowid`;const rows=db?db.prepare(sql).all():await query(sql);if(digest(rows)!==s.sha256)(['audit_events','installer_auth_session','public_request_limits'].includes(table)?mutable:changed).push(table);}
 if(changed.length)throw Error('Original records changed in: '+changed.join(',')+'; values withheld');return{compared:Object.keys(before).length-1,mutableMetadata:mutable};
}
await holds();await integrity();const names=await applied(),pending=migrationNames.slice(names.length);
if(pending.some(n=>n!=='0019_installer_delivery_workspace.sql'))throw Error('Unexpected pending production migration; review separately');
if(action==='backup'){
 await mkdir(directory,{recursive:true});
 try{await readFile(directory+'/manifest.json');throw Error('Existing backup must not be overwritten');}catch(error){if(error.code!=='ENOENT')throw error;}
 const sid=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8'}).trim();
 execFileSync('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],{stdio:'pipe'});
 const before=await snapshot(),deployment=(await cloudflare(`accounts/${account}/workers/scripts/${worker}/deployments`)).deployments[0];
 const raw=directory+'/temporary-export.sql';try{await readFile(raw);throw Error('Temporary export exists; inspect before retry');}catch(error){if(error.code!=='ENOENT')throw error;}
 execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','export',name,'--remote','--config','wrangler.jsonc','--output',raw],{stdio:['ignore','pipe','pipe']});
 const sql=await readFile(raw),key=randomBytes(32),iv=randomBytes(12),c=createCipheriv('aes-256-gcm',key,iv),ciphertext=Buffer.concat([c.update(sql),c.final()]);
 await writeFile(directory+'/database.sql.enc.json',JSON.stringify({format:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:c.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}),{flag:'wx',mode:0o600});
 await writeFile(directory+'/key.dpapi',protectKey(key),{flag:'wx',mode:0o600});key.fill(0);
 const recovered=await decryptedBackup();if(digest(recovered)!==digest(sql))throw Error('Encrypted roundtrip failed');
 const restored=restore(recovered.toString('utf8'));let preservation;try{preservation=await preserved(before,restored);}finally{restored.close();}
 let timeTravel;try{timeTravel=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','time-travel','info',name,'--config','wrangler.jsonc','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{timeTravel={unavailable:true};}
 const manifest={createdAt:new Date().toISOString(),worker,database,name,deployment,before,pending,sourceSha256:digest(sql),encryptedRoundTripVerified:true,restoredTables:Object.keys(before).length,foreignKeys:0,ledgerMismatches:0,preservation,timeTravel};
 await writeFile(directory+'/manifest.json',JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});await unlink(raw);
 console.log(JSON.stringify({backup:directory+'/database.sql.enc.json',encrypted:true,verified:true,sha256:manifest.sourceSha256,restoredTables:manifest.restoredTables,counts:Object.fromEntries(Object.entries(before).map(([n,v])=>[n,v.count])),pending,previousVersion:deployment.versions,timeTravelAvailable:!timeTravel.unavailable}));
}else{
 const manifest=JSON.parse(await readFile(directory+'/manifest.json','utf8'));if(manifest.database!==database||!manifest.encryptedRoundTripVerified)throw Error('Unverified backup');
 if(action==='rehearse'){
  const sql=await decryptedBackup();if(digest(sql)!==manifest.sourceSha256)throw Error('Backup hash changed');const db=restore(sql.toString('utf8'));
  const migrations=[];try{for(const file of pending){const source=await readFile('migrations/'+file,'utf8');db.exec(source);migrations.push({file,sha256:digest(source),statements:unstable_splitSqlQuery(source).length});}await preserved(manifest.before,db);if(db.prepare('PRAGMA foreign_key_check').all().length||db.prepare(ledgerSql).get().n)throw Error('Rehearsal integrity failed');}finally{db.close();}
  await writeFile(directory+'/rehearsal.json',JSON.stringify({verified:true,migrations,oldCodeCompatible:true,originalColumnsPreserved:true},null,2),{flag:'wx'});console.log(JSON.stringify({rehearsal:'passed',migrations,oldCodeCompatible:true}));
 }else if(action==='migrate'){
  const rehearsal=JSON.parse(await readFile(directory+'/rehearsal.json','utf8'));if(!rehearsal.verified)throw Error('Missing rehearsal');await preserved(manifest.before);
  // Wrangler migrations apply uses D1's supported migration transaction and records
  // only the genuinely pending original file; no historical import/transport.
  for(const file of pending){const expected=rehearsal.migrations.find(m=>m.file===file);if(!expected||digest(await readFile('migrations/'+file))!==expected.sha256)throw Error('Migration changed after rehearsal');}
  if(pending.length)execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply',name,'--remote','--config','wrangler.jsonc'],{stdio:['ignore','inherit','inherit'],env:{...process.env,CI:'true'}});
  const now=await applied();if(now.length!==migrationNames.length)throw Error('Migration chain incomplete');await integrity();console.log(JSON.stringify({applied:pending,preservation:await preserved(manifest.before),holds:await holds()}));
 }else{
  await integrity();const preservation=await preserved(manifest.before),counts=await query('SELECT (SELECT count(*) FROM leads) leads,(SELECT count(*) FROM media_assets) media,(SELECT count(*) FROM legal_document_versions) legal,(SELECT count(*) FROM installer_enquiries) enquiries,(SELECT count(*) FROM installer_auth_user) users,(SELECT count(*) FROM lead_recipient_deliveries) deliveries,(SELECT count(*) FROM installer_credit_ledger) ledger,(SELECT count(*) FROM installer_payment_orders) orders,(SELECT count(*) FROM installer_outbox) outbox');
  const result={checkedAt:new Date().toISOString(),migrations:(await applied()).length,preservation,foreignKeys:0,ledgerMismatches:0,counts:counts[0],holds:await holds(),clock:null};await writeFile(directory+`/verified-${Date.now()}.json`,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
 }
}
