import {execFileSync} from 'node:child_process';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {triggerSafeStatement} from './installer-staging-migration-transport.mjs';
import {assertProtectedStagingBuild} from './installer-staging-build-guard.mjs';

export const account='e364d5c7864e07143bd229b367b95637';
export const workerName='solarmatch-installer-staging';
export const databaseName='solarmatch-installer-staging-db';
export const bucketName='solarmatch-installer-staging-private';
const privateDirectory='.wrangler/installer-staging-management';
const stateFile=`${privateDirectory}/resources.json`;
const origin='https://solarmatch-installer-staging.deluxejahseh.workers.dev';
let token;
export function assertStagingCheckout(remote,branch){
  if(remote!=='https://github.com/gvrshabd/solarmatch-thailand.git'||!['feature/installer-shared-workflow','feature/design-v2-integration','feature/calculator-energy-accuracy-v3'].includes(branch))throw Error('Wrong repository/branch.');
}
function verifyCheckout(){assertStagingCheckout(execFileSync('git',['remote','get-url','origin'],{encoding:'utf8'}).trim(),execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim());}
export async function cloudflare(suffix,method='GET',body){
  if(!token){
    const value=JSON.parse(execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','auth','token','--json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
    if(typeof value.token!=='string')throw Error('Cloudflare authentication unavailable.');
    token=value.token;
  }
  const response=await fetch(`https://api.cloudflare.com/client/v4/${suffix}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const value=await response.json();
  if(!response.ok||!value.success){
    const diagnostic=suffix.endsWith('/query')&&(value.errors??[]).every(error=>error.code===7500)?(value.errors??[]).map(error=>String(error.message).slice(0,200)).join('; '):'';
    throw Error(`Cloudflare ${method} failed (${response.status}; codes ${(value.errors??[]).map(error=>error.code).join(',')}). ${diagnostic}`);
  }
  return value.result;
}
function accountPath(suffix){return `accounts/${account}/${suffix}`;}
export async function stagingState(){
  verifyCheckout();
  const state=JSON.parse(await readFile(stateFile,'utf8'));
  if(state.account!==account||state.worker!==workerName||state.database.name!==databaseName||state.bucket!==bucketName||state.origin!==origin||state.database.id==='61d0704e-5c1f-4bf6-bf58-32dbe07e9f65')throw Error('Staging identity mismatch.');
  return state;
}
export async function verifiedDatabase(){
  const state=await stagingState();
  const actual=await cloudflare(accountPath(`d1/database/${state.database.id}`));
  if(actual.name!==databaseName||actual.uuid!==state.database.id)throw Error('Remote database does not match separate staging identity.');
  return state;
}
export async function stagingQuery(sql,params=[]){
  const state=await verifiedDatabase(); // Before every management database operation.
  return cloudflare(accountPath(`d1/database/${state.database.id}/query`),'POST',{sql,params});
}
async function verifiedConfiguration(){
  const state=await verifiedDatabase(),config=JSON.parse(await readFile('staging/wrangler.jsonc','utf8'));
  if(config.name!==workerName||config.account_id!==account||config.d1_databases[0].database_id!==state.database.id||config.d1_databases[0].database_name!==databaseName||config.r2_buckets[0].bucket_name!==bucketName||config.vars.INSTALLER_PLATFORM_MODE!=='sandbox'||config.vars.INSTALLER_BASE_URL!==origin||config.vars.OUTBOUND_MESSAGES_ENABLED!=='false'||config.vars.INSTALLER_TEST_CLOCK_ENABLED!=='false'||config.preview_urls!==false||config.assets.run_worker_first!==true||config.triggers.crons.length)throw Error('Unsafe staging deployment configuration.');
  if(config.d1_databases.length!==1||config.r2_buckets.length!==1||config.d1_databases[0].binding!=='DB'||config.r2_buckets[0].binding!=='MEDIA'||config.vars.STAGING_ACCESS_AUD!==state.access.site.aud||config.vars.ACCESS_AUD!==state.access.admin.aud||config.vars.ACCESS_TEAM_DOMAIN!=='https://millys.cloudflareaccess.com')throw Error('Staging bindings or Access audiences differ from verified provenance.');
  for(const key of ['AUTH_EMAIL_LIVE_ENABLED','SMS_LIVE_ENABLED','OMISE_LIVE_ENABLED','LINE_LIVE_ENABLED','CAMPAIGN_ATTRIBUTION_ENABLED','CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED'])if(config.vars[key]!=='false')throw Error('Live operation must remain disabled: '+key);
  for(const key of ['AUTH_EMAIL_PROVIDER_MODE','SMS_PROVIDER_MODE','OMISE_PROVIDER_MODE'])if(config.vars[key]!=='off')throw Error('Provider must remain off: '+key);
  const held=(await stagingQuery("SELECT json_extract(config_json,'$.collectionEnabled') collection,json_extract(config_json,'$.paymentsEnabled') payments,json_extract(config_json,'$.notificationsEnabled') notifications,json_extract(config_json,'$.platformPaused') platform,json_extract(config_json,'$.deliveryPaused') delivery FROM installer_platform_settings WHERE id=1"))[0].results[0];
  if(!held||held.collection!==0||held.payments!==0||held.notifications!==0||held.platform!==1||held.delivery!==1)throw Error('Staging operation holds are not intact.');
  if((await stagingQuery('SELECT fixed_at FROM installer_test_clock WHERE id=1'))[0].results[0]?.fixed_at!==null)throw Error('Staging test clock must be cleared.');
  return config;
}
async function migrateStatements(){
  const {unstable_splitSqlQuery}=await import('wrangler');
  // D1's bulk import parser rejects nested CASE/END in this chain. Preserve the
  // exact files; record transport hashes and retain equivalent RAISE predicates.
  // Validate all statements locally before any remote mutation.
  const names=(await readdir('migrations')).filter(name=>/^\d{4}_.+\.sql$/u.test(name)).sort();
  const migrations=[];const rehearsal=new DatabaseSync(':memory:');
  try{for(const name of names){const sql=await readFile(`migrations/${name}`,'utf8'),statements=unstable_splitSqlQuery(sql).map(triggerSafeStatement);for(const statement of statements)rehearsal.exec(statement);migrations.push({name,statements,sha256:createHash('sha256').update(sql).digest('hex')});}}finally{rehearsal.close();}
  const applied=(await stagingQuery('SELECT name FROM d1_migrations ORDER BY name'))[0].results.map(row=>row.name);
  if(JSON.stringify(applied)!==JSON.stringify(names.slice(0,applied.length)))throw Error('Applied chain is not an exact prefix.');
  const progressFile=`${privateDirectory}/migration-progress.json`;
  let progress=null;try{progress=JSON.parse(await readFile(progressFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  for(const migration of migrations.slice(applied.length)){
    if(progress&&(progress.name!==migration.name||progress.sha256!==migration.sha256))throw Error('Migration checkpoint differs from unchanged source.');
    const start=progress?.nextStatement??0;
    for(let index=start;index<migration.statements.length;index++){
      await stagingQuery(migration.statements[index]);
      progress={name:migration.name,sha256:migration.sha256,nextStatement:index+1};
      await writeFile(progressFile,JSON.stringify(progress)+'\n');
    }
    await stagingQuery('INSERT INTO d1_migrations(name) VALUES(?)',[migration.name]);
    await writeFile(progressFile,'null\n');progress=null;
    console.log(JSON.stringify({applied:migration.name,sourceSha256:migration.sha256,statements:migration.statements.length}));
  }
  console.log(JSON.stringify({complete:true,migrations:names.length,isolatedStagingOnly:true}));
}
async function prepare(){
  verifyCheckout();
  const user=await cloudflare('user');
  if(!user.email||user.email_verified===false)throw Error('Verified account owner email required.');
  const subdomain=await cloudflare(accountPath('workers/subdomain'));
  if(subdomain.subdomain!=='deluxejahseh')throw Error('Unexpected Workers subdomain.');
  await mkdir(privateDirectory,{recursive:true});
  let state;
  try{state=await stagingState();}catch(error){if(error.code!=='ENOENT')throw error;}
  const apps=await cloudflare(accountPath('access/apps'));
  // This OAuth scope can return an empty list even while dashboard applications
  // exist. Do not overwrite recorded identity/provenance with false "pending"
  // results. Read exact staging IDs/AUDs in the authenticated dashboard instead.
  if(!Array.isArray(apps)||apps.length===0)throw Error('Access application listing is unavailable/empty; verify staging applications in the dashboard before recording audiences.');
  const definitions=[
    {key:'site',name:'SolarMatch installer staging — owner only',domain:new URL(origin).hostname},
    {key:'admin',name:'SolarMatch installer staging — admin',domain:`${new URL(origin).hostname}/admin*`},
    {key:'webhook',name:'SolarMatch installer staging — signed LINE webhook',domain:`${new URL(origin).hostname}/api/installer/webhooks/line`},
  ];
  const access={};
  for(const definition of definitions){
    const existing=apps.filter(app=>app.domain===definition.domain||app.name===definition.name);
    if(existing.length>1)throw Error('Ambiguous staging Access application.');
    let app=existing[0];
    if(app&&(app.domain!==definition.domain||app.name!==definition.name))throw Error('Existing Access destination needs manual review.');
    // Wrangler OAuth can read Access but cannot create applications (403/1010).
    // A browser-confirmed owner-only application is required; never broaden its token.
    access[definition.key]=app?{id:app.id,aud:app.aud,domain:app.domain}:{pending:true,domain:definition.domain};
  }
  const databases=await cloudflare(accountPath('d1/database'));
  const matches=databases.filter(db=>db.name===databaseName);
  if(matches.length>1)throw Error('Ambiguous staging database.');
  let database=matches[0];
  if(database&&!state)throw Error('Existing database has no management provenance; refusing to adopt data.');
  if(!database)database=await cloudflare(accountPath('d1/database'),'POST',{name:databaseName,primary_location_hint:'apac'});
  const buckets=await cloudflare(accountPath('r2/buckets'));
  const bucket=buckets.buckets?.find(item=>item.name===bucketName);
  if(bucket&&!state)throw Error('Existing bucket has no management provenance; refusing to adopt data.');
  if(!bucket)await cloudflare(accountPath('r2/buckets'),'POST',{name:bucketName,locationHint:'apac',storageClass:'Standard'});
  state={account,worker:workerName,origin,database:{name:databaseName,id:database.uuid},bucket:bucketName,ownerEmail:user.email.toLowerCase(),access,createdAt:state?.createdAt??new Date().toISOString(),originalAccessHash:createHash('sha256').update(JSON.stringify(apps.filter(app=>!definitions.some(definition=>app.domain===definition.domain)))).digest('hex')};
  await writeFile(stateFile,JSON.stringify(state,null,2)+'\n');
  try{await readFile(`${privateDirectory}/secrets.json`);}catch(error){
    if(error.code!=='ENOENT')throw error;
    const secrets=Object.fromEntries(['INSTALLER_AUTH_SECRET','PHONE_VERIFICATION_SECRET','ASSESSMENT_SIGNING_SECRET','CSRF_SECRET'].map(name=>[name,randomBytes(32).toString('hex')]));
    secrets.ADMIN_EMAILS=state.ownerEmail;
    await writeFile(`${privateDirectory}/secrets.json`,JSON.stringify(secrets)+'\n',{flag:'wx',mode:0o600});
  }
  console.log(JSON.stringify({...state,originalAccessHash:undefined,ownerEmail:'verified Wrangler account owner',access}));
}
const action=process.argv[2];
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  if(action==='prepare')await prepare();
  else if(action==='verify')console.log(JSON.stringify(await verifiedDatabase()));
  else if(action==='migrate'){
    await migrateStatements();
  }else if(action==='secrets'){
    await verifiedConfiguration();
    execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk',`${privateDirectory}/secrets.json`,'--config','staging/wrangler.jsonc'],{stdio:['ignore','inherit','inherit']});
  }else if(action==='deploy'){
    const config=await verifiedConfiguration();
    await assertProtectedStagingBuild(process.cwd(),config);
    let configPath='staging/wrangler.jsonc';
    if(process.argv.includes('--design-review')){
      const {prepareReviewAssets}=await import('./design-v2-review-assets.mjs');
      const rows=(await stagingQuery("SELECT d.id FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id WHERE l.is_test_submission=1 AND l.submission_mode='sandbox' AND d.allocation_environment='sandbox' ORDER BY d.delivered_at LIMIT 1"))[0].results;
      const assets=await prepareReviewAssets(process.cwd(),{enquiryId:rows[0]?.id});
      config.main=path.resolve('dist/server/index.js');config.assets.directory=assets;
      for(const db of config.d1_databases)db.migrations_dir=path.resolve('migrations');
      configPath='.wrangler/design-v2-staging-deploy.json';await writeFile(configPath,JSON.stringify(config,null,2));
    }
    execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config',configPath],{stdio:['ignore','inherit','inherit'],env:{...process.env,CI:'true'}});
  }
}
