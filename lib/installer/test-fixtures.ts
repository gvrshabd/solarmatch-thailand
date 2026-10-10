import {assertPlatformRequest} from './platform';
import {defaultInstallerSettings} from './settings';
import {getCurrentRelease} from '@/lib/server/releases';

/** Local-only synthetic setup. Does not create authenticated memberships or alter public releases. */
export async function seedLocalInstallerFixtures(request:Request,database:D1Database) {
  if(assertPlatformRequest(request).mode!=='local-test') throw new Error('unavailable');
  await getCurrentRelease(database);
  const now=new Date().toISOString();
  const config=JSON.stringify({...defaultInstallerSettings,collectionEnabled:true,deliveryPaused:false});
  const statements:D1PreparedStatement[]=[
    database.prepare("UPDATE installer_platform_settings SET config_json=?,version=version+1,updated_at=?,updated_by='local-test-fixture' WHERE id=1").bind(config,now),
    database.prepare("INSERT INTO installer_settings_revisions(id,config_json,actor,created_at) VALUES(?,?,'local-test-fixture',?)").bind(crypto.randomUUID(),config,now),
  ];
  for(let index=1;index<=4;index++) {
    const id=`synthetic-company-${index}`;
    statements.push(
      database.prepare(`INSERT OR IGNORE INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,service_provinces_json,service_areas_json,contract_state,active,created_by,updated_by,approval_status,paused,daily_limit,terms_version,terms_accepted_at)
        VALUES(?,?,?,'https://example.test/privacy','["bangkok"]','[]','active',1,'local-test-fixture','local-test-fixture','approved',0,100,?,?)`).bind(id,`Synthetic Company ${index}`,`บริษัททดสอบ ${index}`,defaultInstallerSettings.termsVersion,now),
      database.prepare('INSERT OR IGNORE INTO installer_credit_accounts(company_id) VALUES(?)').bind(id),
      database.prepare("UPDATE solar_company_partners SET contract_effective_date='2026-01-01',contract_expiry_date='2030-12-31' WHERE id=?").bind(id),
      database.prepare(`INSERT OR IGNORE INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at)
        VALUES(?,?,'local-test-fixture',20,?,'Synthetic local test credits; no payment received','local-test-fixture',?)`).bind(`fixture-credit-${index}`,id,`fixture-credit-${index}`,now),
    );
  }
  const paymentOrderId='00000000-0000-4000-8000-000000000001';
  statements.push(database.prepare(`INSERT OR IGNORE INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,created_at,updated_at)
    VALUES(?,'synthetic-company-1','credits-20',20,400000,'THB','pending','local-test',?,?)`).bind(paymentOrderId,now,now));
  await database.batch(statements);
  return {mode:'local-test',companies:4,companyIds:[1,2,3,4].map(index=>`synthetic-company-${index}`),paymentOrderId,syntheticCreditsPerCompany:20,publicCollectionEnabled:false,paymentsEnabled:false};
}
