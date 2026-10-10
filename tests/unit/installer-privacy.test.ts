import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'fixture-secret-at-least-32-characters',INSTALLER_PLATFORM_MODE:'local-test',DB:undefined as D1Database|undefined}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
import { FixtureDatabase,seedFixture,seedLead } from '../installer/fixtures';
import { purgeInstallerLeads } from '@/lib/installer/privacy';
import { allocateEnquiry } from '@/lib/installer/deliveries';

describe('canonical personal-data redaction',()=>{
  let fixture:FixtureDatabase;
  beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));fixture=new FixtureDatabase();runtime.DB=fixture.d1();await seedFixture(fixture.d1());});
  afterEach(()=>{fixture.close();vi.useRealTimers();});
  it('redacts known personal markers including notes/snapshots while retaining delivery slots',async()=>{
    const first=await seedLead(fixture.d1());const duplicate=await seedLead(fixture.d1());
    await allocateEnquiry(fixture.d1(),first.enquiryId,'fixture');
    const marker='PRIVATE_PERSON_MARKER';
    fixture.sqlite.prepare("UPDATE leads SET legal_first_name=?,custom_location=?,answers_json=?,scoring_explanation_json=? WHERE id IN(?,?)").run(marker,marker,JSON.stringify({location:marker}),JSON.stringify({note:marker}),first.leadId,duplicate.leadId);
    fixture.sqlite.prepare('INSERT INTO lead_notes(id,lead_id,note,actor_email) VALUES(?,?,?,?)').run('private-note',first.leadId,marker,'fixture');
    fixture.sqlite.prepare('INSERT INTO export_batches(id,created_by,lead_count,export_scope,format_version) VALUES(?,?,?,?,?)').run('private-export','fixture',1,'solar_match_validation_followup','fixture-v1');
    fixture.sqlite.prepare('INSERT INTO export_batch_items(export_batch_id,lead_id,snapshot_json) VALUES(?,?,?)').run('private-export',first.leadId,JSON.stringify({contact:marker}));
    const result=await purgeInstallerLeads(fixture.d1(),new Request('http://localhost:3000/admin/api/leads'),[first.leadId],'fixture');
    expect(result.purged).toBe(2);
    for(const table of ['leads','lead_notes','export_batch_items','lead_score_history','audit_events']) expect(JSON.stringify(fixture.sqlite.prepare(`SELECT * FROM ${table}`).all())).not.toContain(marker);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM lead_recipient_deliveries').get()?.count).toBe(3);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM installer_credit_ledger WHERE kind=?').get('delivery')?.count).toBe(3);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS count FROM installer_outbox WHERE kind='withdrawal'").get()?.count).toBe(3);
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM leads WHERE purged_at IS NOT NULL').get()?.count).toBe(2);
  });
  it('rolls back every redaction when a canonical duplicate has a legal hold',async()=>{
    const first=await seedLead(fixture.d1());const duplicate=await seedLead(fixture.d1());
    fixture.sqlite.prepare('UPDATE leads SET legal_hold=1 WHERE id=?').run(duplicate.leadId);
    await expect(purgeInstallerLeads(fixture.d1(),new Request('http://localhost:3000/admin/api/leads'),[first.leadId],'fixture')).rejects.toThrow('legal hold');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS count FROM leads WHERE purged_at IS NOT NULL').get()?.count).toBe(0);
  });
  it('rejects remote callers in local test mode',async()=>{
    await expect(purgeInstallerLeads(fixture.d1(),new Request('https://example.com/admin/api/leads'),['missing'],'fixture')).rejects.toThrow('platform_unavailable');
  });
});
