import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',PHONE_VERIFICATION_SECRET:'synthetic-attribution-secret-over-thirty-two'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead,syntheticAnswers} from '../installer/fixtures';
import {ATTRIBUTION_CATALOG,approvedAttribution,attributionEnabled,captureAttributionFromSearch,publicAttributionConfig,attributionSchema} from '@/lib/analytics/attribution';
import {submissionAttributionStatements} from '@/lib/analytics/submission-attribution';
import {campaignReport,campaignReportCsv,campaignSpendStatements,campaignSpendSchema,safeCsvCell} from '@/lib/analytics/campaign-report';
import {allocateEnquiry,createClaim,decideClaim,grantTrial} from '@/lib/installer/deliveries';
import {redactInstallerLeads} from '@/lib/installer/privacy';
const approved={CAMPAIGN_ATTRIBUTION_ENABLED:'true',CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED:'true'};
const period={fromDay:'2026-10-11',toDay:'2026-10-11',submissionMode:'local-test' as const};
let fixture:FixtureDatabase;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));runtime.INSTALLER_PLATFORM_MODE='local-test';fixture=new FixtureDatabase();await seedFixture(fixture.d1());});
afterEach(()=>{fixture.close();vi.useRealTimers();});
async function attributed(phone:string,codes:typeof ATTRIBUTION_CATALOG[number]=ATTRIBUTION_CATALOG[2],qualified=true,mode:'production'|'sandbox'|'local-test'|'restricted-preview'='local-test') {
  const row=await seedLead(fixture.d1(),phone,qualified?syntheticAnswers:{...syntheticAnswers,ownershipStatus:'renter'},mode);
  await fixture.d1().batch(submissionAttributionStatements(fixture.d1(),row.leadId,codes,approved,{submissionMode:mode,originalQualified:qualified}));
  return row;
}
describe('strict privacy-gated campaign catalogue',()=>{
  it('is off unless both exact approval switches are true and projects no catalogue when off',()=>{
    for(const gate of [{},{CAMPAIGN_ATTRIBUTION_ENABLED:'true'},{CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED:'true'},{...approved,CAMPAIGN_ATTRIBUTION_ENABLED:'TRUE'}]) {
      expect(attributionEnabled(gate)).toBe(false);expect(publicAttributionConfig(gate)).toEqual({enabled:false,catalog:[]});
    }
    expect(publicAttributionConfig(approved)).toEqual({enabled:true,catalog:ATTRIBUTION_CATALOG});
  });
  it('retains only an exact tuple; slug-shaped PII, URLs, wrong combinations and extras fail',()=>{
    expect(approvedAttribution(ATTRIBUTION_CATALOG[2])).toEqual(ATTRIBUTION_CATALOG[2]);
    for(const value of [{campaign:'somchai-0812345678',source:'google',medium:'cpc'},{campaign:'https://example.test/private',source:'google',medium:'cpc'},
      {...ATTRIBUTION_CATALOG[2],source:'facebook'},{...ATTRIBUTION_CATALOG[2],phone:'0812345678'}]) {
      expect(approvedAttribution(value)).toBeNull();expect(attributionSchema.safeParse(value).success).toBe(false);
    }
  });
  it('ignores every non-attribution query value and has safe direct/unknown fallback',()=>{
    const config=publicAttributionConfig(approved);
    expect(captureAttributionFromSearch(new URLSearchParams('phone=0812345678&token=secret&answers=private'),config)).toEqual(ATTRIBUTION_CATALOG[0]);
    expect(captureAttributionFromSearch(new URLSearchParams('utm_campaign=pilot-search&utm_source=google&utm_medium=cpc&secret=private'),config)).toEqual(ATTRIBUTION_CATALOG[2]);
    for(const query of ['utm_campaign=pilot-search','utm_campaign=pilot-search&utm_source=google&utm_medium=cpc&utm_source=google','utm_campaign=somchai-0812345678&utm_source=google&utm_medium=cpc'])
      expect(captureAttributionFromSearch(new URLSearchParams(query),config)).toEqual(ATTRIBUTION_CATALOG[1]);
    expect(captureAttributionFromSearch(new URLSearchParams('utm_campaign=pilot-search'),publicAttributionConfig({}))).toBeUndefined();
  });
  it('adds no capture statement while disabled and a missing lead cannot create attribution',async()=>{
    const ctx={submissionMode:'local-test' as const,originalQualified:true};
    expect(submissionAttributionStatements(fixture.d1(),'missing',ATTRIBUTION_CATALOG[2],{},ctx)).toEqual([]);
    await fixture.d1().batch(submissionAttributionStatements(fixture.d1(),'missing',ATTRIBUTION_CATALOG[2],approved,ctx));
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_campaign_attribution').get()?.n).toBe(0);
  });
  it('SQLite rejects out-of-catalogue tuples and forged submission classification at the final insert',async()=>{
    const lead=await seedLead(fixture.d1());
    const insert=fixture.sqlite.prepare(`INSERT INTO lead_campaign_attribution(lead_id,campaign_code,source_code,medium_code,capture_state,submission_mode,submitted_at,original_qualified)
      SELECT id,?,?,?,'captured',?,created_at,1 FROM leads WHERE id=?`);
    expect(()=>insert.run('pilot-search','facebook','cpc','local-test',lead.leadId)).toThrow('unapproved campaign codes');
    expect(()=>insert.run('pilot-search','google','cpc','production',lead.leadId)).toThrow('campaign submission context mismatch');
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_campaign_attribution').get()?.n).toBe(0);
  });
});
describe('original acquisition and event-day financial reporting',()=>{
  it('counts rejected/unsold requests and repeated original attribution without inflating qualified canonical enquiries',async()=>{
    const first=await attributed('+66812345678');
    const repeat=await attributed('+66812345678',ATTRIBUTION_CATALOG[3]);expect(repeat.enquiryId).toBe(first.enquiryId);
    await attributed('+66812345679',ATTRIBUTION_CATALOG[2],false);
    const report=await campaignReport(fixture.d1(),period);
    expect(report.totals).toMatchObject({incomingRequests:2,repeatedSubmissions:1,qualifiedEnquiries:1,rejectedRequests:1,unsoldEnquiries:2,paidDeliveries:0});
    expect(report.rows.find(row=>row.campaignCode==='pilot-social')).toMatchObject({incomingRequests:0,repeatedSubmissions:1,qualifiedEnquiries:0});
    expect(report.totals.adSpendRecordCount).toBe(0);
    expect(report.missingCostNotice).toContain('unknown, not proven zero');
    expect(campaignReportCsv(report)).toContain('"adSpendRecordCount"');
    expect(()=>fixture.sqlite.prepare("UPDATE lead_campaign_attribution SET campaign_code='unknown' WHERE lead_id=?").run(first.leadId)).toThrow('campaign snapshot is immutable');
  });
  it('keeps synthetic contexts separate from production and historical missing capture visible',async()=>{
    for(const mode of ['production','sandbox','local-test','restricted-preview'] as const)await attributed('+66812345678',ATTRIBUTION_CATALOG[2],true,mode);
    await seedLead(fixture.d1(),'+66812345679',syntheticAnswers,'production');
    expect((await campaignReport(fixture.d1(),{...period,submissionMode:undefined})).totals).toMatchObject({incomingRequests:2,qualifiedEnquiries:1,unattributedRequests:1,qualificationUnknownRequests:1});
    for(const mode of ['sandbox','local-test','restricted-preview'] as const)expect((await campaignReport(fixture.d1(),{...period,submissionMode:mode})).totals.incomingRequests).toBe(1);
  });
  it('counts earned purchased deliveries separately from trials and debt-first one-time restorations',async()=>{
    const paid=await attributed('+66812345678');
    const allocated=await allocateEnquiry(fixture.d1(),paid.enquiryId,'fixture',['synthetic-company-1']);expect(allocated.allocated).toHaveLength(1);
    const duplicate=await attributed('+66812345678',ATTRIBUTION_CATALOG[3]);await allocateEnquiry(fixture.d1(),duplicate.enquiryId,'fixture',['synthetic-company-1']);
    const trial=await attributed('+66812345679');await grantTrial(fixture.d1(),'synthetic-company-2','fixture');
    const trialDelivery=await allocateEnquiry(fixture.d1(),trial.enquiryId,'fixture',['synthetic-company-2']);
    fixture.sqlite.prepare("INSERT INTO installer_credit_ledger(id,company_id,kind,debt_delta,idempotency_key,reason,actor,created_at) VALUES('test-debt','synthetic-company-1','fixture-debt',2,'test-debt','Synthetic debt','fixture',?)").run(new Date().toISOString());
    const claim=await createClaim(fixture.d1(),'synthetic-company-1',allocated.allocated[0],'incorrect-contact','Synthetic');
    await decideClaim(fixture.d1(),claim.id,'approved','Synthetic','fixture');await decideClaim(fixture.d1(),claim.id,'approved','Synthetic','fixture');
    const trialClaim=await createClaim(fixture.d1(),'synthetic-company-2',trialDelivery.allocated[0],'incorrect-contact','Synthetic');await decideClaim(fixture.d1(),trialClaim.id,'approved','Synthetic','fixture');
    const report=await campaignReport(fixture.d1(),period);
    expect(report.totals).toMatchObject({incomingRequests:2,repeatedSubmissions:1,paidDeliveries:1,paidDeliveryFeeMinor:40000,trialDeliveries:1,claimRestoredPurchasedCredits:2,claimRestoredFeeMinorEstimate:40000,trialRestorations:1,estimatedContributionMinor:0});
    expect(report.rows.find(row=>row.campaignCode==='pilot-social')?.paidDeliveries).toBe(0);
  });
  it('uses explicit Bangkok spend dates, rejects invalid notes/dates, and never projects legacy free text',async()=>{
    await attributed('+66812345678');
    await fixture.d1().batch(campaignSpendStatements(fixture.d1(),{campaignCode:'pilot-search',spendDay:'2026-10-11',amountMinor:5000,submissionMode:'local-test'},'synthetic-admin@example.test'));
    fixture.sqlite.prepare("INSERT INTO installer_operational_events(id,event_type,amount_minor,attribution_json,created_at) VALUES('old','ad-spend',9000,?,?)").run(JSON.stringify({campaign:'Somchai 0812345678 =HYPERLINK("private")'}),'2026-10-10T18:00:00Z');
    const report=await campaignReport(fixture.d1(),period);
    expect(report.totals).toMatchObject({adSpendMinor:5000,adSpendRecordCount:1,estimatedContributionMinor:-5000});
    expect(report.unallocatedAllEnvironments.legacyAdSpendMinor).toBe(9000);
    expect(JSON.stringify(report)).not.toContain('0812345678');expect(campaignReportCsv(report)).not.toContain('Somchai');
    for(const value of [{campaignCode:'somchai-0812345678',spendDay:'2026-10-11',amountMinor:1},{campaignCode:'pilot-search',spendDay:'2026-02-30',amountMinor:1},{campaignCode:'pilot-search',spendDay:'2026-10-11',amountMinor:1,reason:'private'}])expect(campaignSpendSchema.safeParse(value).success).toBe(false);
    await expect(campaignReport(fixture.d1(),{...period,toDay:'2028-10-11'})).rejects.toThrow();
  });
  it('dates acquisition and later delivery independently in Bangkok, rather than pretending event totals are cohort conversion',async()=>{
    vi.setSystemTime(new Date('2026-10-11T16:30:00Z'));fixture.now='2026-10-11T16:30:00Z';
    const lead=await attributed('+66812345678');
    vi.setSystemTime(new Date('2026-10-12T03:00:00Z'));fixture.now='2026-10-12T03:00:00Z';
    await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);
    const report=await campaignReport(fixture.d1(),{...period,toDay:'2026-10-12'});
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]).toMatchObject({day:'2026-10-11',incomingRequests:1,paidDeliveries:0});
    expect(report.rows[1]).toMatchObject({day:'2026-10-12',incomingRequests:0,paidDeliveries:1});
    expect(campaignReportCsv(report)).toContain('"submissionMode"');expect(campaignReportCsv(report)).toContain('"local-test"');
  });
  it('shows company-level payment reversals only as explicitly unallocated all-environment liabilities, never campaign earned fees',async()=>{
    await attributed('+66812345678');
    fixture.sqlite.prepare(`INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,debt_delta,idempotency_key,reason,actor,created_at)
      VALUES('test-reversal','synthetic-company-1','payment-reversal',-2,1,'test-reversal','Synthetic reversal','fixture',?)`).run(new Date().toISOString());
    const report=await campaignReport(fixture.d1(),period);
    expect(report.unallocatedAllEnvironments.paymentReversalCredits).toBe(3);
    expect(report.totals).toMatchObject({paidDeliveryFeeMinor:0,claimRestoredPurchasedCredits:0,estimatedContributionMinor:0});
  });
  it('redacts attribution for canonical/duplicate leads while keeping nonpersonal counts and financial facts; holds abort atomically',async()=>{
    const lead=await attributed('+66812345678');const duplicate=await attributed('+66812345678',ATTRIBUTION_CATALOG[3]);
    await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);
    fixture.sqlite.prepare('UPDATE leads SET legal_hold=1 WHERE id=?').run(duplicate.leadId);
    await expect(redactInstallerLeads(fixture.d1(),[lead.leadId],'synthetic-admin@example.test')).rejects.toThrow();
    expect(fixture.sqlite.prepare('SELECT campaign_code FROM lead_campaign_attribution WHERE lead_id=?').get(lead.leadId)?.campaign_code).toBe('pilot-search');
    fixture.sqlite.prepare('UPDATE leads SET legal_hold=0 WHERE id=?').run(duplicate.leadId);
    await redactInstallerLeads(fixture.d1(),[lead.leadId],'synthetic-admin@example.test');
    expect(fixture.sqlite.prepare('SELECT campaign_code,source_code,medium_code,capture_state FROM lead_campaign_attribution').all()).toEqual([
      {campaign_code:null,source_code:null,medium_code:null,capture_state:'redacted'}, {campaign_code:null,source_code:null,medium_code:null,capture_state:'redacted'}]);
    const report=await campaignReport(fixture.d1(),period);
    expect(report.totals).toMatchObject({incomingRequests:1,repeatedSubmissions:1,qualifiedEnquiries:1,redactedRequests:1,unattributedRequests:1,paidDeliveries:1,paidDeliveryFeeMinor:40000});
    expect(report.rows).toHaveLength(1);expect(report.rows[0].campaignCode).toBe('unknown');
  });
  it('CSV guards formulas, quotes, commas and line breaks without converting numeric negative contribution into a formula',()=>{
    for(const input of ['=1+1','  +CMD','-HYPERLINK("private")','@SUM(1)','\tcmd','\rline','\nline'])expect(safeCsvCell(input)).toMatch(/^"'/u);
    expect(safeCsvCell('a,"b"\nline')).toBe('"a,""b""\nline"');expect(safeCsvCell(-5000)).toBe('"-5000"');
  });
});
