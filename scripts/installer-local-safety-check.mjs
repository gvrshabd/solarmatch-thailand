import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';

// Read-only, aggregate-only check: never print accounts, sessions or secret values.
const config=JSON.parse(readFileSync('.installer-test/preview-ipv4.jsonc','utf8'));
if(config.name!=='solarmatch-installer-local-test'||config.d1_databases?.[0]?.database_id!=='00000000-0000-0000-0000-000000000006')throw new Error('Fictitious isolated configuration required.');
const source=process.argv[2]??'installer-demo';
if(!/^installer-[a-z0-9-]{1,80}$/.test(source))throw new Error('Private installer store name required.');
const directory=path.resolve('.wrangler',source,'v3/d1/miniflare-D1DatabaseObject');
const files=readdirSync(directory).filter(file=>/^[a-f0-9]{64}\.sqlite$/.test(file));
if(files.length!==1)throw new Error('Exactly one isolated application database required.');
const db=new DatabaseSync(path.join(directory,files[0]),{readOnly:true});
try{
  const setting=JSON.parse(db.prepare('SELECT config_json FROM installer_platform_settings WHERE id=1').get().config_json);
  const held={collectionEnabled:false,paymentsEnabled:false,notificationsEnabled:false,deliveryPaused:true,platformPaused:true};
  for(const [key,value] of Object.entries(held))if(setting[key]!==value)throw new Error(`Safety state not held: ${key}`);
  if(db.prepare('SELECT fixed_at FROM installer_test_clock WHERE id=1').get().fixed_at!==null)throw new Error('Synthetic clock not cleared.');
  const flags=['OUTBOUND_MESSAGES_ENABLED','AUTH_EMAIL_LIVE_ENABLED','SMS_LIVE_ENABLED','LINE_LIVE_ENABLED','OMISE_LIVE_ENABLED','CAMPAIGN_ATTRIBUTION_ENABLED','CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED','INSTALLER_SCHEDULER_EXPECTED'];
  // Inspect only named nonsecret activation switches, not arbitrary configuration.
  const privateVars=readFileSync('.installer-test/.dev.vars','utf8').split(/\r?\n/u);
  for(const flag of flags){
    if(String(config.vars?.[flag]??'false')==='true')throw new Error(`Unsafe preview flag: ${flag}`);
    const line=privateVars.find(row=>new RegExp(`^\\s*${flag}\\s*=`,'u').test(row));
    if(line&&line.slice(line.indexOf('=')+1).trim().replace(/^['"]|['"]$/gu,'')==='true')throw new Error(`Unsafe private flag: ${flag}`);
  }
  const counts={};
  for(const table of ['leads','installer_enquiries','lead_recipient_deliveries','installer_credit_ledger','installer_claims','legal_document_versions','d1_migrations'])counts[table]=db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
  console.log(JSON.stringify({passed:true,source,held,clock:null,activationFlags:'all off or absent',counts,readOnly:true,syntheticOnly:true}));
}finally{db.close();}
