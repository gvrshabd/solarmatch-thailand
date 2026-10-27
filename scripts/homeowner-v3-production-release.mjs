import {readFile,readdir,mkdir,mkdtemp,writeFile,unlink,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {unstable_splitSqlQuery} from 'wrangler';
import {cloudflare,account} from './installer-staging-cloudflare.mjs';

// No remote mutation, migration, deployment, publication, provider call or restore.
// D1 query POSTs below carry only fixed SELECT/read-only PRAGMA statements.
const targets={
  production:{worker:'solarmatch-thailand',name:'solarmatch-thailand-admin',database:'61d0704e-5c1f-4bf6-bf58-32dbe07e9f65',bucket:'solarmatch-thailand-storage',config:'wrangler.jsonc',mode:'off'},
  staging:{worker:'solarmatch-installer-staging',name:'solarmatch-installer-staging-db',database:'153b8867-e7ad-40ad-8a63-c2bde2338b43',bucket:'solarmatch-installer-staging-private',config:'staging/wrangler.jsonc',mode:'sandbox'},
};
const backupRoot='.wrangler/homeowner-v3-release';
const releaseId='residential-release-v9',questionnaireId='residential-questionnaire-v8',contactId='contact-configuration-homeowner-v3-disabled';
const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const ledgerSql='SELECT COUNT(*) n FROM installer_credit_accounts a WHERE a.available<>(SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.reserved<>(SELECT COALESCE(SUM(reserved_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.trial_remaining<>(SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id) OR a.debt<>(SELECT COALESCE(SUM(debt_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)';
const falseFlags=['INSTALLER_TEST_CLOCK_ENABLED','INSTALLER_SCHEDULER_EXPECTED','OUTBOUND_MESSAGES_ENABLED','CAMPAIGN_ATTRIBUTION_ENABLED','CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED','AUTH_EMAIL_LIVE_ENABLED','SMS_LIVE_ENABLED','OMISE_LIVE_ENABLED','LINE_LIVE_ENABLED'];
const offProviders=['AUTH_EMAIL_PROVIDER_MODE','SMS_PROVIDER_MODE','OMISE_PROVIDER_MODE'];

export function assertHeldFlags(vars,target){
  if(vars.INSTALLER_PLATFORM_MODE!==target.mode||vars.INSTALLER_BASE_URL!==`https://${target.worker}.deluxejahseh.workers.dev`)throw Error('Runtime identity/mode mismatch');
  for(const key of falseFlags)if(vars[key]!=='false')throw Error('Live flag is not disabled: '+key);
  for(const key of offProviders)if(vars[key]!=='off')throw Error('Provider not off: '+key);
  if(vars.LINE_PROVIDER_MODE!==(target.mode==='sandbox'?'sandbox':'off'))throw Error('Unexpected LINE provider mode');
}
function protectKey(bytes,decrypt=false){
  const command=`Add-Type -AssemblyName System.Security; $releaseBytes=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim()); $releaseResult=[Security.Cryptography.ProtectedData]::${decrypt?'Unprotect':'Protect'}($releaseBytes,[Text.Encoding]::UTF8.GetBytes('SolarMatch homeowner-v3 encrypted backup v1'),[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($releaseResult))`;
  return Buffer.from(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:bytes.toString('base64'),encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim(),'base64');
}
export function restoreExport(sql){
  const statements=unstable_splitSqlQuery(sql).map(s=>s.trim()).filter(Boolean),db=new DatabaseSync(':memory:');
  try{
    const schema=statements.filter(s=>/^CREATE\b/i.test(s)&&!/^CREATE\s+TRIGGER\b/i.test(s)),rows=statements.filter(s=>/^(INSERT|REPLACE|UPDATE|DELETE)\b/i.test(s)),triggers=statements.filter(s=>/^CREATE\s+TRIGGER\b/i.test(s));
    if(statements.some(s=>!schema.includes(s)&&!rows.includes(s)&&!triggers.includes(s)&&!/^(PRAGMA|BEGIN|COMMIT|END)\b/i.test(s)&&!/^ANALYZE sqlite_schema;?$/i.test(s)))throw Error('Unreviewed export statement');
    db.exec('PRAGMA foreign_keys=OFF; BEGIN');for(const s of schema)db.exec(s);db.exec('ANALYZE sqlite_schema');for(const s of [...rows,...triggers])db.exec(s);db.exec('COMMIT; PRAGMA foreign_keys=ON');
    if(db.prepare('PRAGMA foreign_key_check').all().length||db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare(ledgerSql).get().n)throw Error('Restored integrity/ledger failed');
    return db;
  }catch(error){db.close();throw error;}
}
async function decryptBackup(directory){
  const saved=JSON.parse(await readFile(path.join(directory,'database.sql.enc.json'),'utf8'));
  if(saved.format!==1||saved.algorithm!=='aes-256-gcm')throw Error('Unexpected backup format');
  const key=protectKey(await readFile(path.join(directory,'key.dpapi')),true);
  try{const cipher=createDecipheriv('aes-256-gcm',key,Buffer.from(saved.iv,'base64'));cipher.setAuthTag(Buffer.from(saved.tag,'base64'));return Buffer.concat([cipher.update(Buffer.from(saved.ciphertext,'base64')),cipher.final()]);}finally{key.fill(0);}
}
function orderedRows(db,table,columns){return db.prepare(`SELECT ${columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY rowid`).all();}
/** @param {{published?: boolean, previousReleaseId?: string}} [options] */
export function comparePreservation(table,before,after,options={}){
  const {published=false,previousReleaseId}=options;
  // Session expiry/rate-limit metadata can move during legitimate browser QA;
  // report it explicitly. No business/consent/ledger table is exempted.
  if(['installer_auth_session','public_request_limits'].includes(table))return{volatileMetadataChanged:digest(before)!==digest(after)};
  const remaining=new Map();
  for(const row of after){const key=digest(row);remaining.set(key,(remaining.get(key)??0)+1);}
  for(const original of before){
    const row=published&&table==='public_releases'&&original.id===previousReleaseId?{...original,is_current:0}:original;
    const key=digest(row),count=remaining.get(key)??0;
    if(!count)throw Error('Original record changed or missing in '+table+'; values withheld');
    remaining.set(key,count-1);
  }
  const additions=[];
  for(const row of after){const key=digest(row),count=remaining.get(key)??0;if(count){additions.push(row);remaining.set(key,count-1);}}
  for(const row of additions){
    const allowed=published&&(
      table==='public_releases'&&row.id===releaseId&&row.is_current===1&&row.live_lead_submissions===0&&row.questionnaire_version_id===questionnaireId&&row.rule_version_id==='residential-rules-v4'&&row.contact_configuration_version_id===contactId||
      table==='questionnaire_versions'&&row.id===questionnaireId&&row.schema_version===11&&row.state==='published'||
      table==='contact_configuration_versions'&&row.id===contactId&&row.contact_collection_mode==='disabled'&&row.contact_collection_mode_v2==='disabled'&&row.contact_collection_enabled===0&&row.restricted_site_collection_enabled===0&&row.public_collection_enabled===0||
      table==='assessment_questions'&&row.questionnaire_version_id===questionnaireId||
      table==='assessment_options'&&row.question_id.startsWith(questionnaireId+':')||
      table==='audit_events'&&row.action==='homeowner-design-v3.published-disabled'&&row.entity_id===releaseId);
    if(!allowed)throw Error('Unplanned added record in '+table+'; values withheld');
  }
  return{preserved:before.length,added:additions.length};
}

async function main(){
  const[action,targetName,directoryArg]=process.argv.slice(2),target=targets[targetName];
  if(!['inspect','backup','verify'].includes(action)||!target||((action==='verify')!==Boolean(directoryArg)))throw Error('Usage: inspect|backup production|staging, or verify production|staging <fresh-run-directory>');
  const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  if(git('remote','get-url','origin')!=='https://github.com/gvrshabd/solarmatch-thailand.git'||!['feature/homeowner-design-v3-integration','feature/homeowner-contact-and-quote-guide','feature/installer-signal-integration','main'].includes(git('branch','--show-current')))throw Error('Wrong repository/branch');
  const remoteMain=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];
  if(!/^[a-f0-9]{40}$/.test(remoteMain))throw Error('Remote main unavailable');
  const config=JSON.parse(await readFile(target.config,'utf8'));
  if(config.name!==target.worker||config.account_id!==account||config.d1_databases.length!==1||config.d1_databases[0].binding!=='DB'||config.d1_databases[0].database_name!==target.name||config.d1_databases[0].database_id!==target.database||config.r2_buckets.length!==1||config.r2_buckets[0].bucket_name!==target.bucket||config.r2_buckets[0].binding!=='MEDIA'||config.triggers.crons.length)throw Error('Local configuration mismatch');
  assertHeldFlags(config.vars,target);
  const api=`accounts/${account}`;
  const verifyIdentity=async()=>{const meta=await cloudflare(`${api}/d1/database/${target.database}`);if(meta.uuid!==target.database||meta.name!==target.name)throw Error('Remote D1 identity mismatch');};
  const query=async(sql,params=[])=>{
    if(!/^SELECT\b/i.test(sql)&&!/^PRAGMA (foreign_key_check|table_info\("[^"]+"\))$/i.test(sql))throw Error('Read-only SQL only');
    if(sql.includes(';'))throw Error('Multiple statements forbidden');
    await verifyIdentity();return(await cloudflare(`${api}/d1/database/${target.database}/query`,'POST',{sql,params}))[0].results;
  };
  async function state(){
    await verifyIdentity();
    const settings=await cloudflare(`${api}/workers/scripts/${target.worker}/settings`);
    const vars=Object.fromEntries(settings.bindings.filter(b=>b.type==='plain_text').map(b=>[b.name,b.text]));
    assertHeldFlags(vars,target); // Never serialize unfiltered bindings or secrets.
    if(settings.bindings.filter(b=>b.type==='d1').length!==1||!settings.bindings.some(b=>b.type==='d1'&&b.name==='DB'&&b.id===target.database)||!settings.bindings.some(b=>b.type==='r2_bucket'&&b.name==='MEDIA'&&b.bucket_name===target.bucket))throw Error('Deployed binding mismatch');
    const schedules=await cloudflare(`${api}/workers/scripts/${target.worker}/schedules`);
    if((schedules.schedules??schedules).length)throw Error('Remote cron must remain empty');
    const local=(await readdir('migrations')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort();
    const migrations=(await query('SELECT name FROM d1_migrations ORDER BY name')).map(r=>r.name);
    if(JSON.stringify(local)!==JSON.stringify(migrations))throw Error('Migration history differs; no migrations authorized by this helper');
    const holds=(await query("SELECT json_extract(config_json,'$.collectionEnabled') collection,json_extract(config_json,'$.paymentsEnabled') payments,json_extract(config_json,'$.notificationsEnabled') notifications,json_extract(config_json,'$.platformPaused') platformPaused,json_extract(config_json,'$.deliveryPaused') deliveryPaused FROM installer_platform_settings WHERE id=1"))[0];
    if(!holds||holds.collection!==0||holds.payments!==0||holds.notifications!==0||holds.platformPaused!==1||holds.deliveryPaused!==1||(await query('SELECT fixed_at FROM installer_test_clock WHERE id=1'))[0]?.fixed_at!==null)throw Error('Operation holds/clock changed');
    if((await query('PRAGMA foreign_key_check')).length||(await query(ledgerSql))[0].n)throw Error('Foreign keys/ledger mismatch');
    const current=await query('SELECT id,questionnaire_version_id,rule_version_id,contact_configuration_version_id,live_lead_submissions FROM public_releases WHERE is_current=1');
    if(current.length!==1)throw Error('Exactly one current release required');
    const collisions=await query("SELECT 'release' kind,id FROM public_releases WHERE id=? OR release_number>=9 UNION ALL SELECT 'questionnaire' kind,id FROM questionnaire_versions WHERE id=? OR version_number>=8 UNION ALL SELECT 'contact' kind,id FROM contact_configuration_versions WHERE id=?",[releaseId,questionnaireId,contactId]);
    const counts={};for(const {name}of await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name"))counts[name]=(await query(`SELECT COUNT(*) n FROM ${quote(name)}`))[0].n;
    const deployment=(await cloudflare(`${api}/workers/scripts/${target.worker}/deployments`)).deployments[0];
    return{checkedAt:new Date().toISOString(),target:targetName,worker:target.worker,database:target.database,remoteMain,localHead:git('rev-parse','HEAD'),deploymentId:deployment.id,versions:deployment.versions,migrations,holds,clock:null,current:current[0],collisions,counts,foreignKeys:0,ledgerMismatches:0,runtimeHeld:true,cronCount:0};
  }
  async function snapshot(){
    const result={};
    for(const{name}of await query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name")){
      const columns=(await query(`PRAGMA table_info(${quote(name)})`)).map(c=>c.name);
      const rows=await query(`SELECT ${columns.map(quote).join(',')} FROM ${quote(name)} ORDER BY rowid`);
      result[name]={columns,count:rows.length,sha256:digest(rows)};
    }return result;
  }
  const beforeState=await state();
  if(action==='inspect'){console.log(JSON.stringify(beforeState));return;}
  if(action==='backup'){
    // Existing published IDs prevent a duplicate publication, not a read-only
    // recovery backup. The publisher retains its independent atomic ID guard.
    if(process.platform!=='win32')throw Error('Backup requires reviewed Windows CurrentUser DPAPI protection');
    await mkdir(backupRoot,{recursive:true});
    const directory=await mkdtemp(path.join(backupRoot,`${targetName}-${new Date().toISOString().replaceAll(/[:.]/g,'-')}-`));
    const sid=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','[Security.Principal.WindowsIdentity]::GetCurrent().User.Value'],{encoding:'utf8'}).trim();
    execFileSync('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`],{stdio:'pipe'});
    const before=await snapshot(),raw=path.join(directory,'temporary-export.sql');
    // No plaintext is printed. On failure the private export is retained for
    // investigation, never silently deleted before recoverability is proved.
    execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','export',target.name,'--remote','--config',target.config,'--output',raw],{stdio:['ignore','pipe','pipe']});
    const sql=await readFile(raw),key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
    try{
      const ciphertext=Buffer.concat([cipher.update(sql),cipher.final()]);
      await writeFile(path.join(directory,'database.sql.enc.json'),JSON.stringify({format:1,algorithm:'aes-256-gcm',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}),{flag:'wx',mode:0o600});
      await writeFile(path.join(directory,'key.dpapi'),protectKey(key),{flag:'wx',mode:0o600});
    }finally{key.fill(0);}
    const recovered=await decryptBackup(directory);if(digest(recovered)!==digest(sql))throw Error('Encrypted roundtrip mismatch');
    const restored=restoreExport(recovered.toString('utf8'));
    try{for(const[table,s]of Object.entries(before))if(digest(orderedRows(restored,table,s.columns))!==s.sha256)throw Error('Export changed during snapshot: '+table);}finally{restored.close();}
    if(digest(await snapshot())!==digest(before))throw Error('Database changed during backup; take a fresh backup');
    let timeTravel;try{timeTravel=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','time-travel','info',target.name,'--config',target.config,'--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));}catch{timeTravel={unavailable:true};}
    const manifest={format:1,...beforeState,before,sourceSha256:digest(sql),encryptedRoundTripVerified:true,restoreVerified:true,timeTravel};
    await writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
    await unlink(raw); // Only this verified, explicitly named temporary export.
    console.log(JSON.stringify({directory:path.resolve(directory),sourceSha256:manifest.sourceSha256,verified:true,tables:Object.keys(before).length,state:beforeState}));return;
  }
  const root=await realpath(backupRoot),directory=await realpath(directoryArg);
  if(!directory.startsWith(root+path.sep)||path.dirname(directory)!==root)throw Error('Backup directory must be a fresh direct child of the designated private root');
  const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
  if(manifest.target!==targetName||manifest.database!==target.database||!manifest.restoreVerified||!manifest.encryptedRoundTripVerified)throw Error('Backup identity/verification mismatch');
  const recovered=await decryptBackup(directory);if(digest(recovered)!==manifest.sourceSha256)throw Error('Backup hash mismatch');
  const restored=restoreExport(recovered.toString('utf8')),preservation={};
  try{
    const current=await snapshot();
    if(JSON.stringify(Object.keys(current))!==JSON.stringify(Object.keys(manifest.before)))throw Error('Unexpected schema/table changes');
    const published=manifest.current.id!==releaseId&&beforeState.current.id===releaseId;
    if(!published&&beforeState.current.id!==manifest.current.id)throw Error('Unexpected current release');
    if(published){
      const next=(await query('SELECT * FROM public_releases WHERE id=?',[releaseId]))[0];
      const previous=restored.prepare('SELECT * FROM public_releases WHERE id=?').get(manifest.current.id);
      for(const key of ['rule_version_id','content_version_id','legal_document_version_id','fact_set_version_id'])if(next[key]!==previous[key])throw Error('Unplanned release reference change: '+key);
      const questionnaire=(await query('SELECT document_json FROM questionnaire_versions WHERE id=?',[questionnaireId]))[0];
      const document=JSON.parse(questionnaire?.document_json??'null');
      const expectedKeys=['monthlyBillThb','projectType','province','daytimePattern','roofArea','shade','propertyType','ownershipStatus','activelyPlanningSolar','daytimeLoads','roofMaterial','quoteContactRequested'];
      if(document?.id!==questionnaireId||document.schemaVersion!==11||JSON.stringify(document.questions.map(q=>q.id))!==JSON.stringify(expectedKeys)||document.questions.some(q=>!q.required))throw Error('Unexpected published questionnaire');
      if(current.assessment_questions.count-manifest.before.assessment_questions.count!==12||current.assessment_options.count-manifest.before.assessment_options.count!==document.questions.reduce((sum,q)=>sum+(q.options?.length??0),0))throw Error('Published question/option cardinality mismatch');
      for(const table of ['public_releases','questionnaire_versions','contact_configuration_versions','audit_events'])if(current[table].count-manifest.before[table].count!==1)throw Error('Unexpected release addition count: '+table);
      const audit=(await query("SELECT next_json FROM audit_events WHERE action='homeowner-design-v3.published-disabled' AND entity_id=?",[releaseId]));
      if(audit.length!==1||JSON.parse(audit[0].next_json).backupSha256!==manifest.sourceSha256)throw Error('Publication backup audit reference mismatch');
    }
    for(const[table,s]of Object.entries(manifest.before)){
      if(JSON.stringify(s.columns)!==JSON.stringify(current[table].columns))throw Error('Unexpected column changes: '+table);
      const oldRows=orderedRows(restored,table,s.columns);
      const newRows=await query(`SELECT ${s.columns.map(quote).join(',')} FROM ${quote(table)} ORDER BY rowid`);
      preservation[table]=comparePreservation(table,oldRows,newRows,{published,previousReleaseId:manifest.current.id});
    }
    const result={...beforeState,backupSha256:manifest.sourceSha256,published,preservation};
    await writeFile(path.join(directory,`verified-${Date.now()}.json`),JSON.stringify(result,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify(result));
  }finally{restored.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error instanceof Error?error.message:'Release inspection failed');process.exitCode=1;});
}
