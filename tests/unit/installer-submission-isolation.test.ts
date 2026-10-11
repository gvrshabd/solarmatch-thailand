import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import type {SQLInputValue} from 'node:sqlite';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',PHONE_VERIFICATION_SECRET:'synthetic-isolation-secret-thirty-two-characters',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
vi.mock('@/lib/server/admin-api',()=>({requireAdminRequest:async()=>({email:'synthetic-admin@example.test'}),isAdminError:()=>false}));
import {FixtureDatabase,seedFixture,seedLead,syntheticAnswers} from '../installer/fixtures';
import {allocateEnquiry} from '@/lib/installer/deliveries';
import {canonicalEnquiryKey} from '@/lib/installer/enquiries';
import {GET} from '@/app/admin/api/leads/route';
let fixture:FixtureDatabase;
type AdminList={leads:{submission_mode:string|null}[];submissionCounts:{submission_mode:string|null;is_test_submission:number;count:number}[]};
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));fixture=new FixtureDatabase();runtime.DB=fixture.d1();runtime.INSTALLER_PLATFORM_MODE='local-test';await seedFixture(fixture.d1());});
afterEach(()=>{fixture.close();vi.useRealTimers();});
describe('canonical identity separates submission contexts',()=>{
  it('namespaces a historical test hash on upgrade without changing labels, financial history or recipient slots',async()=>{
    const historical=await seedLead(fixture.d1());await allocateEnquiry(fixture.d1(),historical.enquiryId,'fixture',['synthetic-company-1']);
    const base=await canonicalEnquiryKey('+66812345678',syntheticAnswers);
    const old=new FixtureDatabase(14);
    try {
      await seedFixture(old.d1());
      const copy=(table:string,row:Record<string,SQLInputValue>)=>{
        const columns=old.sqlite.prepare(`PRAGMA table_info(${table})`).all().map(c=>String(c.name)).filter(c=>c in row);
        old.sqlite.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...columns.map(c=>row[c]));
      };
      copy('leads',fixture.sqlite.prepare('SELECT * FROM leads WHERE id=?').get(historical.leadId)!);
      copy('installer_enquiries',{...fixture.sqlite.prepare('SELECT * FROM installer_enquiries WHERE id=?').get(historical.enquiryId)!,canonical_key:base});
      copy('installer_enquiry_leads',fixture.sqlite.prepare('SELECT * FROM installer_enquiry_leads WHERE lead_id=?').get(historical.leadId)!);
      copy('lead_recipient_deliveries',fixture.sqlite.prepare('SELECT * FROM lead_recipient_deliveries WHERE enquiry_id=?').get(historical.enquiryId)!);
      const before=old.sqlite.prepare('SELECT * FROM lead_recipient_deliveries').get()!;
      old.sqlite.exec(readFileSync('migrations/0015_installer_submission_boundaries.sql','utf8'));
      expect(old.sqlite.prepare('SELECT * FROM lead_recipient_deliveries').get()).toMatchObject(before);
      expect(old.sqlite.prepare('SELECT is_test_submission,submission_mode FROM leads WHERE id=?').get(historical.leadId)).toMatchObject({is_test_submission:1,submission_mode:null});
      expect(old.sqlite.prepare('SELECT canonical_key FROM installer_enquiries WHERE id=?').get(historical.enquiryId)?.canonical_key).toBe(`local-test:${base}`);
      const production=await seedLead(old.d1(),'+66812345678',syntheticAnswers,'production');
      expect(production.enquiryId).not.toBe(historical.enquiryId);
      const repeated=await seedLead(old.d1());expect(repeated.enquiryId).toBe(historical.enquiryId);
      expect(old.sqlite.prepare('SELECT count(DISTINCT partner_id) n FROM lead_recipient_deliveries WHERE enquiry_id=?').get(historical.enquiryId)?.n).toBe(1);
    } finally {old.close();}
  });
  it('keeps the same phone separate across production, sandbox, local and restricted preview',async()=>{
    const records=[];
    for(const mode of ['local-test','production','sandbox','restricted-preview'] as const)records.push(await seedLead(fixture.d1(),'+66812345678',syntheticAnswers,mode));
    expect(new Set(records.map(row=>row.enquiryId)).size).toBe(4);
    const repeated=await seedLead(fixture.d1(),'+66812345678',syntheticAnswers,'production');expect(repeated.enquiryId).toBe(records[1].enquiryId);
    const base=await canonicalEnquiryKey('+66812345678',syntheticAnswers);
    expect(fixture.sqlite.prepare('SELECT canonical_key FROM installer_enquiries WHERE id=?').get(records[1].enquiryId)?.canonical_key).toBe(base);
    expect(fixture.sqlite.prepare('SELECT canonical_key FROM installer_enquiries WHERE id=?').get(records[0].enquiryId)?.canonical_key).toBe(`local-test:${base}`);
  });
  it('does not let same-phone test submissions poison production status or expiry and retains its lifetime slots',async()=>{
    runtime.INSTALLER_PLATFORM_MODE='production';const production=await seedLead(fixture.d1(),'+66812345678',syntheticAnswers,'production');
    await allocateEnquiry(fixture.d1(),production.enquiryId,'fixture');
    const before=fixture.sqlite.prepare('SELECT status,request_expires_at,recipient_limit FROM installer_enquiries WHERE id=?').get(production.enquiryId)!;
    await seedLead(fixture.d1(),'+66812345678',{...syntheticAnswers,district:'bang-rak'},'local-test');
    await seedLead(fixture.d1(),'+66812345678',{...syntheticAnswers,district:'bang-rak'},'sandbox');
    await seedLead(fixture.d1(),'+66812345678',syntheticAnswers,'restricted-preview');
    expect(fixture.sqlite.prepare('SELECT status,request_expires_at,recipient_limit FROM installer_enquiries WHERE id=?').get(production.enquiryId)).toEqual(before);
    const repeated=await seedLead(fixture.d1(),'+66812345678',syntheticAnswers,'production');
    expect(repeated.enquiryId).toBe(production.enquiryId);
    expect((await allocateEnquiry(fixture.d1(),production.enquiryId,'fixture')).allocated).toEqual([]);
    expect(fixture.sqlite.prepare('SELECT count(DISTINCT partner_id) n FROM lead_recipient_deliveries WHERE enquiry_id=?').get(production.enquiryId)?.n).toBe(3);
  });
  it('reports and filters exact nullable submission modes separately from historical test flags',async()=>{
    for(const mode of ['production','sandbox','local-test','restricted-preview'] as const)await seedLead(fixture.d1(),`+6681234500${mode.length}`,syntheticAnswers,mode);
    const all=await (await GET(new Request('http://localhost:3000/admin/api/leads'))).json() as AdminList;
    expect(new Set(all.leads.map(row=>row.submission_mode))).toEqual(new Set(['production','sandbox','local-test','restricted-preview']));
    const sandbox=await (await GET(new Request('http://localhost:3000/admin/api/leads?submissionMode=sandbox'))).json() as AdminList;
    expect(sandbox.leads).toHaveLength(1);expect(sandbox.leads[0].submission_mode).toBe('sandbox');
    expect(sandbox.submissionCounts).toEqual([{submission_mode:'sandbox',is_test_submission:1,count:1}]);
    const historical=await seedLead(fixture.d1(),'+66898765432');fixture.sqlite.prepare('UPDATE leads SET submission_mode=NULL WHERE id=?').run(historical.leadId);
    const legacy=await (await GET(new Request('http://localhost:3000/admin/api/leads?submissionMode=historical&submissionType=test'))).json() as AdminList;
    expect(legacy.leads).toHaveLength(1);expect(legacy.leads[0].submission_mode).toBeNull();
  });
});
