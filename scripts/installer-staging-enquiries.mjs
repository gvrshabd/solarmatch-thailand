import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {stagingQuery} from './installer-staging-cloudflare.mjs';

// Node's native TypeScript stripping loads only fresh synthetic fixture logic.
// Never read or export a local customer/demo database.
registerHooks({resolve(specifier,context,next){
  if(context.parentURL?.includes('/node_modules/')||context.conditions?.includes('require'))return next(specifier,context);
  if(specifier==='cloudflare:workers')specifier=pathToFileURL(path.resolve('tests/stubs/cloudflare-workers.ts')).href;
  else if(specifier.startsWith('@/'))specifier=pathToFileURL(path.resolve(specifier.slice(2))).href;
  else if(specifier.startsWith('.'))specifier=new URL(specifier,context.parentURL).href;
  if(specifier.startsWith('file:')){const file=fileURLToPath(specifier);if(!path.extname(file)&&existsSync(file+'.ts'))specifier=pathToFileURL(file+'.ts').href;}
  return next(specifier,context);
}});
const {FixtureDatabase,seedLead}=await import('../tests/installer/fixtures.ts');
const {getCurrentRelease}=await import('../lib/server/releases.ts');
const {env}=await import('../tests/stubs/cloudflare-workers.ts');
const secrets=JSON.parse(await readFile('.wrangler/installer-staging-management/secrets.json','utf8'));
env.PHONE_VERIFICATION_SECRET=secrets.PHONE_VERIFICATION_SECRET;
env.ASSESSMENT_SIGNING_SECRET=secrets.ASSESSMENT_SIGNING_SECRET;
const fixture=new FixtureDatabase();
const literal=value=>value===null?'NULL':typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
const insert=(table,row)=>`INSERT OR IGNORE INTO ${table}(${Object.keys(row).map(name=>'"'+name+'"').join(',')}) VALUES(${Object.values(row).map(literal).join(',')});`;
const held="json_set(config_json,'$.platformPaused',json('true'),'$.collectionEnabled',json('false'),'$.paymentsEnabled',json('false'),'$.deliveryPaused',json('true'),'$.notificationsEnabled',json('false'))";
try{
  const count=(await stagingQuery('SELECT COUNT(*) n FROM leads'))[0].results[0].n;
  if(count!==0)throw Error('Preserve existing staging enquiries; this seed is one-time.');
  await getCurrentRelease(fixture.d1());
  fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.collectionEnabled',json('true'),'$.platformPaused',json('false')) WHERE id=1");
  await seedLead(fixture.d1(),'+66000000001',undefined,'sandbox');
  await seedLead(fixture.d1(),'+66000000002',undefined,'sandbox');
  const tables=['questionnaire_versions','assessment_questions','assessment_options','rule_versions','scoring_rules','qualification_rules','content_versions','legal_document_versions','contact_configuration_versions','loading_fact_set_versions','loading_facts','public_releases'];
  for(const table of tables){const rows=fixture.sqlite.prepare(`SELECT * FROM ${table}`).all();if(rows.length)await stagingQuery(rows.map(row=>insert(table,row)).join('\n'));}
  const leads=fixture.sqlite.prepare('SELECT * FROM leads').all();
  // Remote public PII endpoints are blocked by the staging wrapper. Enable only
  // the database insertion guard within this one controlled synthetic SQL batch;
  // restore held state immediately, including after a failed operation.
  const leadSql="UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.collectionEnabled',json('true'),'$.platformPaused',json('false')) WHERE id=1;\n"+leads.map(row=>insert('leads',row)).join('\n')+`\nUPDATE installer_platform_settings SET config_json=${held} WHERE id=1;`;
  await stagingQuery(leadSql);
  for(const table of ['installer_enquiries','installer_enquiry_leads']){const rows=fixture.sqlite.prepare(`SELECT * FROM ${table}`).all();await stagingQuery(rows.map(row=>insert(table,row)).join('\n'));}
  console.log(JSON.stringify({syntheticLeads:leads.length,classification:'sandbox',realContacts:false,realPhoneVerification:false,remoteCustomerDataCopied:false,collectionEnabled:false}));
}finally{
  fixture.close();
  await stagingQuery(`UPDATE installer_platform_settings SET config_json=${held} WHERE id=1`);
}
