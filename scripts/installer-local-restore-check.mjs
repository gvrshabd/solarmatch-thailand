import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';

const require=createRequire(import.meta.url);
const {Miniflare}=createRequire(require.resolve('wrangler/package.json'))('miniflare');
const fakeId='00000000-0000-0000-0000-000000000006';
const source=new Miniflare({modules:true,script:'export default {}',d1Persist:path.resolve('.wrangler/installer-final-state/v3/d1'),d1Databases:{DATABASE:fakeId}});
const restored=new Miniflare({modules:true,script:'export default {}',d1Persist:path.resolve('.wrangler/restore12/v3/d1'),d1Databases:{DATABASE:fakeId}});
const hash=rows=>createHash('sha256').update(JSON.stringify(rows)).digest('hex');
try {
  const [a,b]=await Promise.all([source.getD1Database('DATABASE'),restored.getD1Database('DATABASE')]);
  const tables=(await a.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name").all()).results;
  const counts={};
  for(const {name} of tables){
    const sql=`SELECT * FROM "${name.replaceAll('"','""')}" ORDER BY rowid`;
    const [left,right]=await Promise.all([a.prepare(sql).all(),b.prepare(sql).all()]);
    if(hash(left.results)!==hash(right.results))throw new Error(`Restore differs in ${name}; row values withheld.`);
    counts[name]=left.results.length;
  }
  for(const db of [a,b]) {
    if((await db.prepare('PRAGMA foreign_key_check').all()).results.length)throw new Error('Restore foreign-key check failed.');
    const mismatch=await db.prepare(`SELECT COUNT(*) AS total FROM installer_credit_accounts a WHERE
      a.available<>(SELECT COALESCE(SUM(available_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.reserved<>(SELECT COALESCE(SUM(reserved_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.trial_remaining<>(SELECT COALESCE(SUM(trial_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)
      OR a.debt<>(SELECT COALESCE(SUM(debt_delta),0) FROM installer_credit_ledger WHERE company_id=a.company_id)`).first();
    if(mismatch.total!==0)throw new Error('Financial ledger conservation failed.');
  }
  const [triggersA,triggersB]=await Promise.all([a.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all(),b.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all()]);
  if(hash(triggersA.results)!==hash(triggersB.results))throw new Error('Restored safety triggers differ.');
  console.log(JSON.stringify({passed:true,tablesCompared:tables.length,triggersCompared:triggersA.results.length,counts,foreignKeyViolations:0,ledgerMismatches:0,syntheticOnly:true}));
}finally{await Promise.all([source.dispose(),restored.dispose()]);}
