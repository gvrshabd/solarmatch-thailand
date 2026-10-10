import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import type {SQLInputValue} from 'node:sqlite';
import {expect,it,vi} from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({PHONE_VERIFICATION_SECRET:'synthetic-migration-secret-at-least-32-characters',INSTALLER_PLATFORM_MODE:'off'})}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {getCurrentRelease} from '@/lib/server/releases';

it('additive installer migrations preserve legacy phone/LINE consent and manual delivery history without verification or funding',async()=>{
  const legacy=new FixtureDatabase(5),donor=new FixtureDatabase();
  try{
    await getCurrentRelease(legacy.d1());await seedFixture(donor.d1());
    const phone=await seedLead(donor.d1()),line=await seedLead(donor.d1(),'+66898765432');
    donor.sqlite.prepare("UPDATE leads SET preferred_contact_method='line',phone_e164=NULL,phone_display=NULL,line_id='synthetic-legacy-line' WHERE id=?").run(line.leadId);
    const copy=(table:string,row:Record<string,SQLInputValue>)=>{
      const columns=legacy.sqlite.prepare(`PRAGMA table_info(${table})`).all().map(value=>String(value.name)).filter(key=>key in row);
      legacy.sqlite.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...columns.map(key=>row[key]));
    };
    copy('solar_company_partners',donor.sqlite.prepare('SELECT * FROM solar_company_partners WHERE id=?').get('synthetic-company-1')!);
    for(const id of [phone.leadId,line.leadId])copy('leads',donor.sqlite.prepare('SELECT * FROM leads WHERE id=?').get(id)!);
    legacy.sqlite.prepare(`INSERT INTO lead_recipient_deliveries(id,lead_id,partner_id,consent_version,privacy_notice_version_id,disclosure_purpose,fields_disclosed_json,delivered_at,delivered_by,delivery_method,distribution_expires_at,payment_status,quotation_status,outcome_status)
      VALUES('legacy-manual',?,'synthetic-company-1','fixture-v1','fixture-privacy','residential_solar_site_survey_and_quotation','["phone","assessmentAnswers"]','2026-10-01T03:00:00.000Z','synthetic-legacy-admin','manual-line','2026-10-08T03:00:00.000Z','paid','provided','won')`).run(phone.leadId);
    const leadsBefore=legacy.sqlite.prepare('SELECT * FROM leads ORDER BY id').all();
    const deliveryBefore=legacy.sqlite.prepare("SELECT * FROM lead_recipient_deliveries WHERE id='legacy-manual'").get()!;
    const partnerBefore=legacy.sqlite.prepare("SELECT * FROM solar_company_partners WHERE id='synthetic-company-1'").get()!;
    const folder=path.resolve('migrations');for(const file of readdirSync(folder).filter(file=>file.endsWith('.sql')).sort().slice(5))legacy.sqlite.exec(readFileSync(path.join(folder,file),'utf8'));
    const leadsAfter=legacy.sqlite.prepare('SELECT * FROM leads ORDER BY id').all();
    for(let i=0;i<leadsBefore.length;i++){expect(leadsAfter[i]).toMatchObject(leadsBefore[i]);expect(leadsAfter[i].phone_verified_at).toBeNull();}
    expect(leadsAfter.find(row=>row.id===phone.leadId)?.phone_e164).toBe('+66812345678');
    expect(leadsAfter.find(row=>row.id===line.leadId)?.line_id).toBe('synthetic-legacy-line');
    expect(legacy.sqlite.prepare("SELECT * FROM lead_recipient_deliveries WHERE id='legacy-manual'").get()).toMatchObject({...deliveryBefore,delivery_channel:'legacy',funding_source:'legacy',credit_cost:0,price_minor:0,enquiry_id:`legacy-${phone.leadId}`});
    expect(legacy.sqlite.prepare("SELECT * FROM solar_company_partners WHERE id='synthetic-company-1'").get()).toMatchObject({...partnerBefore,approval_status:'pending',paused:1});
    const enquiries=legacy.sqlite.prepare('SELECT verification_state,qualification_state,duplicate_state,status FROM installer_enquiries').all();expect(enquiries).toHaveLength(2);
    for(const enquiry of enquiries)expect(enquiry).toEqual({verification_state:'unverified',qualification_state:'review',duplicate_state:'legacy',status:'review'});
    for(const table of ['installer_credit_ledger','installer_credit_accounts','installer_trial_grants','installer_outbox','installer_payment_orders'])expect(legacy.sqlite.prepare(`SELECT COUNT(*) count FROM ${table}`).get()?.count).toBe(0);
    expect(legacy.sqlite.prepare('SELECT COUNT(*) count FROM lead_recipient_deliveries').get()?.count).toBe(1);
    expect(legacy.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  }finally{legacy.close();donor.close();}
});
