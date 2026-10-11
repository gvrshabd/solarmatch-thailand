import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

const fakeId='00000000-0000-0000-0000-000000000006';
const config=JSON.parse(readFileSync('.installer-test/preview.jsonc','utf8'));
if(config.name!=='solarmatch-installer-local-test'||config.d1_databases?.[0]?.database_id!==fakeId)throw new Error('Isolated fictitious configuration required.');
const restoreName=process.argv[2]??'restore12';
if(!/^restore[a-z0-9-]{1,40}$/.test(restoreName))throw new Error('Use a short private restore directory under .wrangler.');
const sourceName=process.argv[3]??'installer-final-state';
if(!/^installer-[a-z0-9-]{1,80}$/.test(sourceName))throw new Error('Use a private installer source directory under .wrangler.');
function openLocal(name) {
  const directory=path.resolve('.wrangler',name,'v3/d1/miniflare-D1DatabaseObject');
  const files=readdirSync(directory).filter(file=>/^[a-f0-9]{64}\.sqlite$/.test(file));
  if(files.length!==1)throw new Error('Expected exactly one isolated application database.');
  // Read-only comparison avoids starting additional local Workerd RPC servers.
  return new DatabaseSync(path.join(directory,files[0]),{readOnly:true});
}
const source=openLocal(sourceName),restored=openLocal(restoreName);
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
try {
  const [a,b]=[source,restored];
  const tableSql="SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name";
  const tables=a.prepare(tableSql).all();
  if(hash(tables)!==hash(b.prepare(tableSql).all()))throw new Error('Restored application table inventory differs.');
  const counts={};
  for(const {name} of tables){
    const sql=`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`;
    const [left,right]=[a.prepare(sql).all(),b.prepare(sql).all()];
    if(hash(left)!==hash(right))throw new Error(`Restore differs in ${name}; row values withheld.`);
    counts[name]=left.length;
  }
  for(const db of [a,b]) {
    if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Restore foreign-key check failed.');
    const mismatch=db.prepare(`SELECT COUNT(*) AS total FROM installer_credit_accounts a WHERE
      a.available<>(SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.reserved<>(SELECT COALESCE(SUM(reserved_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.trial_remaining<>(SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.debt<>(SELECT COALESCE(SUM(debt_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)`).get();
    if(mismatch.total!==0)throw new Error('Financial ledger conservation failed.');
    const invalidRecipients=db.prepare(`SELECT COUNT(*) total FROM (SELECT enquiry_id,COUNT(DISTINCT partner_id) n FROM lead_recipient_deliveries WHERE delivery_channel='portal' GROUP BY enquiry_id HAVING n>3)`).get();
    if(invalidRecipients.total!==0)throw new Error('Lifetime recipient cap failed.');
    const missingConsent=db.prepare(`SELECT COUNT(*) total FROM lead_recipient_deliveries d JOIN leads l ON l.id=d.lead_id WHERE d.delivery_channel='portal' AND (d.consent_version IS NULL OR d.privacy_notice_version_id IS NULL OR l.consent_text_en IS NULL OR l.consent_text_th IS NULL)`).get();
    if(missingConsent.total!==0)throw new Error('Historic portal consent evidence missing.');
  }
  const triggerSql="SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name";
  const [triggersA,triggersB]=[a.prepare(triggerSql).all(),b.prepare(triggerSql).all()];
  if(hash(triggersA)!==hash(triggersB))throw new Error('Restored safety triggers differ.');
  console.log(JSON.stringify({passed:true,tablesCompared:tables.length,triggersCompared:triggersA.length,counts,foreignKeyViolations:0,ledgerMismatches:0,recipientCapViolations:0,missingPortalConsentSnapshots:0,syntheticOnly:true,comparisonReadOnly:true}));
}finally{source.close();restored.close();}
