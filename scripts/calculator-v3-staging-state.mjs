// Read-only release check. Exact staging provenance is verified before every query.
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {cloudflare,account,stagingQuery,verifiedDatabase} from './installer-staging-cloudflare.mjs';
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw Error('Use before or after');
const identity=await verifiedDatabase();
const rows=async sql=>(await stagingQuery(sql))[0].results;
const migrations=(await rows('SELECT name FROM d1_migrations ORDER BY name')).map(r=>r.name);
const expected=(await readdir('migrations')).filter(n=>/^\d{4}_.+\.sql$/.test(n)).sort();
if(JSON.stringify(migrations)!==JSON.stringify(expected))throw Error('Migration chain differs; stop before deployment.');
const selections={
 leads:'SELECT id,created_at,questionnaire_version_id,consent_version,privacy_notice_version_id,suppressed,consent_withdrawn_at FROM leads ORDER BY id',
 enquiries:'SELECT id,lead_id,status,product,recipient_limit FROM installer_enquiries ORDER BY id',
 deliveries:'SELECT id,lead_id,partner_id,consent_version,delivered_at FROM lead_recipient_deliveries ORDER BY id',
 ledger:'SELECT id,company_id,kind,available_delta,reserved_delta,trial_delta,debt_delta,source_id FROM installer_credit_ledger ORDER BY id',
 accounts:'SELECT company_id,available,reserved,trial_remaining,debt FROM installer_credit_accounts ORDER BY company_id',
 legal:'SELECT id,state FROM legal_document_versions ORDER BY id',
};
const fingerprints={};for(const[name,sql]of Object.entries(selections)){const values=await rows(sql);fingerprints[name]={count:values.length,sha256:createHash('sha256').update(JSON.stringify(values)).digest('hex')};}
const foreignKeys=await rows('PRAGMA foreign_key_check');if(foreignKeys.length)throw Error('Foreign key violation');
const held=(await rows("SELECT json_extract(config_json,'$.collectionEnabled') collection,json_extract(config_json,'$.paymentsEnabled') payments,json_extract(config_json,'$.notificationsEnabled') notifications,json_extract(config_json,'$.platformPaused') platform,json_extract(config_json,'$.deliveryPaused') delivery FROM installer_platform_settings WHERE id=1"))[0];
if(held.collection!==0||held.payments!==0||held.notifications!==0||held.platform!==1||held.delivery!==1)throw Error('Operations not held');
if((await rows('SELECT fixed_at FROM installer_test_clock WHERE id=1'))[0]?.fixed_at!==null)throw Error('Clock override active');
const deployments=await cloudflare(`accounts/${account}/workers/scripts/solarmatch-installer-staging/deployments`);
const result={at:new Date().toISOString(),worker:identity.worker,database:identity.database,migrations:migrations.length,fingerprints,held,foreignKeys:0,version:deployments.deployments[0]?.versions};
const directory='.wrangler/calculator-v3-review';await mkdir(directory,{recursive:true});
if(phase==='after'){const before=JSON.parse(await readFile(directory+'/before.json','utf8'));if(JSON.stringify(before.fingerprints)!==JSON.stringify(fingerprints))throw Error('Staging business records changed; inspect privately.');}
await writeFile(directory+'/'+phase+'.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
