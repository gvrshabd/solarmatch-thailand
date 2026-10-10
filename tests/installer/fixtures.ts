import { DatabaseSync,type SQLInputValue } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import path from 'node:path';
import { getCurrentRelease } from '@/lib/server/releases';
import { defaultInstallerSettings,getPlatformSettings } from '@/lib/installer/settings';
import { canonicalEnquiryStatements } from '@/lib/installer/enquiries';
import type { EstimateAnswers } from '@/lib/calculator/types';

/** Real SQLite constraints/triggers with D1-style transactional batch behavior. */
export class FixtureDatabase {
  sqlite=new DatabaseSync(':memory:');
  clock=new DatabaseSync(':memory:');
  now='2026-10-11T03:00:00.000Z';
  constructor(migrationLimit = Number.POSITIVE_INFINITY) {
    for(const name of ['strftime','date','julianday']) this.sqlite.function(name,{varargs:true},(...values)=>{
      const args=values.map(value=>value==='now'?this.now:value);
      return this.clock.prepare(`SELECT ${name}(${args.map(()=>'?').join(',')}) AS value`).get(...args)?.value as string|number|null;
    });
    const folder=path.resolve('migrations');
    for(const file of readdirSync(folder).filter(file=>file.endsWith('.sql')).sort().slice(0,migrationLimit)) this.sqlite.exec(readFileSync(path.join(folder,file),'utf8'));
  }
  prepare(sql:string) {
    const execute=(values:SQLInputValue[])=>{
      const results=this.sqlite.prepare(sql).all(...values);
      const changes=Number(this.sqlite.prepare('SELECT changes() AS count').get()?.count??0);
      return {results,success:true,meta:{changes,duration:0,last_row_id:0,rows_read:results.length,rows_written:changes,changed_db:changes>0,size_after:0}};
    };
    const statement=(values:SQLInputValue[]=[])=>({
      bind:(...params:SQLInputValue[])=>statement(params),
      first:async <T>(column?:string)=>{const row=execute(values).results[0];return (column?row?.[column]:row??null) as T;},
      all:async <T>()=>execute(values) as unknown as D1Result<T>,
      run:async()=>execute(values),
      _execute:()=>execute(values),
    });
    return statement();
  }
  async batch(statements:D1PreparedStatement[]) {
    this.sqlite.exec('BEGIN');
    try {const results=statements.map(statement=>(statement as unknown as {_execute:()=>unknown})._execute());this.sqlite.exec('COMMIT');return results;}
    catch(error){this.sqlite.exec('ROLLBACK');throw error;}
  }
  d1(){return this as unknown as D1Database;}
  close(){this.sqlite.close();this.clock.close();}
}

export const syntheticAnswers:EstimateAnswers={province:'bangkok',district:'sathon',monthlyBillThb:6000,activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',daytimePattern:'high',daytimeLoads:['air-conditioning'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'little',quoteContactRequested:true,quoteConsentAccepted:true};

export async function seedFixture(database:D1Database) {
  await getCurrentRelease(database);
  await database.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...defaultInstallerSettings,collectionEnabled:true,deliveryPaused:false})).run();
  for(let i=1;i<=4;i++) {
    const id=`synthetic-company-${i}`;
    await database.prepare(`INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,service_provinces_json,service_areas_json,contract_state,active,created_by,updated_by,approval_status,paused,daily_limit,terms_version,terms_accepted_at)
      VALUES(?,?,?,'https://example.test/privacy','["bangkok"]','[]','active',1,'fixture','fixture','approved',0,100,?,?)`).bind(id,`Synthetic Company ${i}`,`บริษัททดสอบ ${i}`,defaultInstallerSettings.termsVersion,new Date().toISOString()).run();
    await database.prepare('INSERT INTO installer_credit_accounts(company_id) VALUES(?)').bind(id).run();
    await database.prepare("UPDATE solar_company_partners SET contract_effective_date='2026-01-01',contract_expiry_date='2030-12-31' WHERE id=?").bind(id).run();
    await database.prepare(`INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES(?,?,'fixture-purchase',20,?,'Synthetic credits','fixture',?)`).bind(`seed-${i}`,id,`seed-${i}`,new Date().toISOString()).run();
  }
}

export async function seedLead(database:D1Database,phone='+66812345678',answers=syntheticAnswers) {
  const release=await getCurrentRelease(database);
  if(!release) throw new Error('missing fixture release');
  const id=crypto.randomUUID();const now=new Date().toISOString();
  const expires=new Date(Date.now()+7*86400000).toISOString();
  const values:Record<string,unknown>={id,idempotency_key:crypto.randomUUID(),request_fingerprint:crypto.randomUUID(),legal_first_name:'Synthetic',legal_last_name:'Homeowner',phone_e164:phone,phone_display:phone,preferred_contact_method:'phone',province:answers.province,ownership_status:answers.ownershipStatus,property_type:answers.propertyType,daytime_loads_json:JSON.stringify(answers.daytimeLoads),air_conditioner_count:answers.airConditionerCount,monthly_bill_thb:answers.monthlyBillThb,roof_material:answers.roofMaterial,roof_shade:answers.shade,roof_area:'unsure',daytime_pattern:answers.daytimePattern,installation_timeframe:answers.planningTimeframe,quote_contact_requested:1,answers_json:JSON.stringify(answers),questionnaire_version_id:release.questionnaire_version_id,rule_version_id:release.rule_version_id,release_id:release.release_id,raw_score:90,quality_score:5,hard_eligible:1,high_quality:1,scoring_explanation_json:'{}',consent_version:'fixture-v1',consent_text_en:'Synthetic consent',consent_text_th:'ความยินยอมทดสอบ',consented_at:now,source_locale:'th',contact_collection_mode:'validation_interest',consent_scope:'solar_match_validation_followup',solar_match_followup_authorized:1,third_party_disclosure_authorized:0,contact_configuration_version_id:release.contact_configuration_version_id,content_version_id:release.content_version_id,contact_collection_mode_v2:'shared_solar_company_handoff',consent_scope_v2:'shared_residential_solar_referral',solar_match_followup_authorized_v2:0,third_party_disclosure_authorized_v2:1,distribution_expires_at:expires,disclosed_fields_snapshot_json:'["phone","assessmentAnswers"]',privacy_notice_version_id:'fixture-privacy',submission_environment:'private_development_preview',is_test_submission:1};
  values.hard_eligible=answers.ownershipStatus==='owner'&&(answers.airConditionerCount??0)>=4?1:0;
  values.high_quality=values.hard_eligible;
  const columns=Object.keys(values);
  values.adult_confirmed_at=now;
  values.phone_verified_at=now;
  columns.push('adult_confirmed_at','phone_verified_at');
  await database.batch([
    database.prepare(`INSERT INTO leads(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).bind(...Object.values(values)),
    ...await canonicalEnquiryStatements(database,id,phone,answers,await getPlatformSettings(database)),
  ]);
  const enquiry=await database.prepare('SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=?').bind(id).first<{enquiry_id:string}>();
  return {leadId:id,enquiryId:enquiry!.enquiry_id};
}
