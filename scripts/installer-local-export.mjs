import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Wrangler 4.92's local export lacks --persist-to. Use its exact installed
// Miniflare export mechanism with the explicitly isolated persistence path.
const config=JSON.parse(await readFile('.installer-test/preview.jsonc','utf8'));
const fakeId='00000000-0000-0000-0000-000000000006';
if(config.name!=='solarmatch-installer-local-test'||config.d1_databases?.[0]?.database_id!==fakeId)throw new Error('Isolated fictitious configuration required.');
const require=createRequire(import.meta.url);
const wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');
const source=path.resolve('.wrangler/installer-final-state/v3/d1');
const directory=path.resolve('.wrangler/installer-recovery-2026-10-11');
const output=path.join(directory,'synthetic-final.sql');
const mf=new Miniflare({modules:true,script:'export default {}',d1Persist:source,d1Databases:{DATABASE:fakeId}});
try {
  const db=await mf.getD1Database('DATABASE');
  const counts=await db.prepare('SELECT (SELECT count(*) FROM leads) leads,(SELECT count(*) FROM installer_enquiries) enquiries,(SELECT count(*) FROM lead_recipient_deliveries) deliveries,(SELECT count(*) FROM installer_credit_ledger) ledger,(SELECT count(*) FROM installer_claims) claims,(SELECT count(*) FROM d1_migrations) migrations').first();
  if(counts.migrations!==13||counts.deliveries<4)throw new Error('Expected populated isolated demo schema is missing.');
  const dump=await db.prepare('PRAGMA miniflare_d1_export(?,?,?);').bind(false,false).raw();
  const sql=dump[0].join('\n');
  await mkdir(directory,{recursive:true});
  let exists=false;try{await access(output);exists=true;}catch{}
  if(!exists)await writeFile(output,sql,{flag:'wx',mode:0o600});
  else if(await readFile(output,'utf8')!==sql)throw new Error('Existing export differs; preserve it and choose a new private backup location.');
  const schema=(await db.prepare('PRAGMA miniflare_d1_export(?,?,?);').bind(false,true).raw())[0];
  const data=(await db.prepare('PRAGMA miniflare_d1_export(?,?,?);').bind(true,false).raw())[0];
  const triggers=schema.filter(value=>String(value).startsWith('CREATE TRIGGER'));
  // Create every referenced table first. Restore saved balances before enabling
  // ledger/delivery triggers, otherwise replaying rows can double-debit accounts.
  const restoreSql=[...schema.filter(value=>!String(value).startsWith('CREATE TRIGGER')),...data,...triggers].join('\n');
  const restoreOutput=path.join(directory,'synthetic-restore-ordered.sql');
  let restoreExists=false;try{await access(restoreOutput);restoreExists=true;}catch{}
  if(!restoreExists)await writeFile(restoreOutput,restoreSql,{flag:'wx',mode:0o600});
  else if(await readFile(restoreOutput,'utf8')!==restoreSql)throw new Error('Existing ordered restore differs; preserve it and choose a new backup location.');
  console.log(JSON.stringify({restoreOutput,restoredTriggers:triggers.length}));
  console.log(JSON.stringify({output,counts,sha256:createHash('sha256').update(sql).digest('hex'),syntheticOnly:true}));
}finally{await mf.dispose();}
