import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {SolarMatchRuntimeEnv} from '@/lib/server/runtime';
import {readFileSync} from 'node:fs';
import type {SQLInputValue} from 'node:sqlite';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',PHONE_VERIFICATION_SECRET:'synthetic-phone-secret-more-than-thirty-two'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture,seedLead} from '../installer/fixtures';
import {allocateEnquiry,suppressEnquiry} from '@/lib/installer/deliveries';
import {processOutbox} from '@/lib/installer/jobs';
import {getPlatformSettings} from '@/lib/installer/settings';
const lineUser=`U${'a'.repeat(32)}`;
let fixture:FixtureDatabase;
beforeEach(async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00.000Z'));runtime.INSTALLER_PLATFORM_MODE='local-test';runtime.INSTALLER_BASE_URL='http://localhost:3000';
  fixture=new FixtureDatabase();await seedFixture(fixture.d1());const settings=await getPlatformSettings(fixture.d1());
  fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,notificationsEnabled:true}));
  fixture.sqlite.prepare("UPDATE solar_company_partners SET line_user_id=? WHERE id='synthetic-company-1'").run(lineUser);
  vi.spyOn(globalThis,'fetch').mockImplementation(async(url)=>String(url).includes('api.line.me')?new Response('',{status:200,headers:{'x-line-request-id':'synthetic-line'}}):Response.json({sid:`SM${'b'.repeat(32)}`,status:'queued',to:'+66812345678'}));
});
afterEach(()=>{fixture.close();vi.restoreAllMocks();vi.useRealTimers();});
function environment(mode:string):SolarMatchRuntimeEnv {
  return {INSTALLER_PLATFORM_MODE:mode,INSTALLER_BASE_URL:mode==='local-test'?'http://localhost:3000':'https://synthetic.example.test',OUTBOUND_MESSAGES_ENABLED:'true',LINE_PROVIDER_MODE:mode==='production'?'live':'sandbox',LINE_LIVE_ENABLED:'true',LINE_CHANNEL_ACCESS_TOKEN:'synthetic-line-token',LINE_TEST_RECIPIENTS:JSON.stringify([lineUser]),SMS_PROVIDER_MODE:mode==='production'?'live':'sandbox',SMS_LIVE_ENABLED:'true',SMS_ACCOUNT_SID:`AC${'c'.repeat(32)}`,SMS_AUTH_TOKEN:'synthetic-sms-token',SMS_CREDENTIALS_ARE_TEST:mode==='production'?'false':'true',SMS_FROM:mode==='production'?'+66800000000':'+15005550006'};
}
async function queued(mode:string) {
  const lead=await seedLead(fixture.d1());
  fixture.sqlite.prepare('UPDATE leads SET submission_mode=?,submission_environment=?,is_test_submission=? WHERE id=?').run(mode,mode==='production'?'production':'private_development_preview',mode==='production'?0:1,lead.leadId);
  runtime.INSTALLER_PLATFORM_MODE=mode;const result=await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1']);expect(result.allocated).toHaveLength(1);
  return {...lead,deliveryId:result.allocated[0]};
}
describe('outbox tenant consent and environment boundary',()=>{
  it.each(['local-test','production'])('permits a migrated historical NULL delivery context only locally, checked in %s',async mode=>{
    const lead=await queued('local-test'),old=new FixtureDatabase(14);
    try {
      await seedFixture(old.d1());const settings=await getPlatformSettings(old.d1());old.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...settings,notificationsEnabled:true}));
      old.sqlite.prepare("UPDATE solar_company_partners SET line_user_id=? WHERE id='synthetic-company-1'").run(lineUser);
      const copy=(table:string,row:Record<string,SQLInputValue>)=>{
        const columns=old.sqlite.prepare(`PRAGMA table_info(${table})`).all().map(value=>String(value.name)).filter(key=>key in row);
        old.sqlite.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...columns.map(key=>row[key]));
      };
      copy('leads',fixture.sqlite.prepare('SELECT * FROM leads WHERE id=?').get(lead.leadId)!);
      copy('installer_enquiries',fixture.sqlite.prepare('SELECT * FROM installer_enquiries WHERE id=?').get(lead.enquiryId)!);
      copy('installer_enquiry_leads',fixture.sqlite.prepare('SELECT * FROM installer_enquiry_leads WHERE lead_id=?').get(lead.leadId)!);
      copy('lead_recipient_deliveries',fixture.sqlite.prepare('SELECT * FROM lead_recipient_deliveries WHERE id=?').get(lead.deliveryId)!);
      old.sqlite.exec(readFileSync('migrations/0015_installer_submission_boundaries.sql','utf8'));old.sqlite.exec(readFileSync('migrations/0016_installer_line_link_generation.sql','utf8'));
      expect(old.sqlite.prepare('SELECT allocation_environment FROM lead_recipient_deliveries').get()?.allocation_environment).toBeNull();
      expect((await processOutbox(old.d1(),environment(mode))).processed).toBe(mode==='local-test'?2:0);expect(fetch).not.toHaveBeenCalled();
      expect(old.sqlite.prepare('SELECT count(*) n FROM installer_outbox WHERE attempts=0').get()?.n).toBe(mode==='local-test'?0:2);
    } finally {old.close();}
  });
  it.each(['local-test','sandbox'])('never dispatches an existing %s queue through production providers',async mode=>{
    await queued(mode);expect(await processOutbox(fixture.d1(),environment('production'))).toEqual({processed:0,failed:0});expect(fetch).not.toHaveBeenCalled();
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_outbox WHERE attempts=0 AND state=\'action-required\' AND last_error=\'notification_environment_mismatch\'').get()?.n).toBe(2);
  });
  it.each(['production','sandbox','local-test'])('dispatches matching %s lead and immutable delivery context',async mode=>{
    await queued(mode);expect(await processOutbox(fixture.d1(),environment(mode))).toEqual({processed:2,failed:0});
    expect(fetch).toHaveBeenCalledTimes(mode==='local-test'?0:2);
  });
  it('blocks a changed runtime mode before a provider call without spending its claimed retry',async()=>{
    await queued('local-test');const env=environment('local-test');const original=fixture.prepare.bind(fixture);let reads=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('SELECT config_json'))return {...statement,first:async<T>()=>{const row=await statement.first<T>();if(++reads===2)Object.assign(env,environment('production'));return row;}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),env)).toEqual({processed:0,failed:0});expect(fetch).not.toHaveBeenCalled();
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_outbox WHERE attempts=0').get()?.n).toBe(2);
  });
  it('rechecks changed lead classification immediately before provider dispatch',async()=>{
    const lead=await queued('production');const original=fixture.prepare.bind(fixture);let reads=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('SELECT config_json'))return {...statement,first:async<T>()=>{const row=await statement.first<T>();if(++reads===2)fixture.sqlite.prepare("UPDATE leads SET submission_mode='sandbox',is_test_submission=1,submission_environment='private_development_preview' WHERE id=?").run(lead.leadId);return row;}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),environment('production'))).toEqual({processed:0,failed:0});expect(fetch).not.toHaveBeenCalled();
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_outbox WHERE attempts=0').get()?.n).toBe(2);
  });
  it('does not send a homeowner SMS whose lease was cancelled while settings were awaited',async()=>{
    const lead=await queued('local-test');fixture.sqlite.prepare("UPDATE installer_outbox SET state='accepted' WHERE kind='installer-delivery'").run();const original=fixture.prepare.bind(fixture);let reads=0;
    fixture.prepare=((sql:string)=>{const statement=original(sql);if(sql.includes('SELECT config_json'))return {...statement,first:async<T>()=>{const row=await statement.first<T>();if(++reads===2)await suppressEnquiry(fixture.d1(),lead.enquiryId,'Synthetic withdrawal at SMS dispatch','fixture');return row;}};return statement;}) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),environment('local-test'))).toEqual({processed:0,failed:0});
    expect(fixture.sqlite.prepare("SELECT count(*) n FROM installer_test_messages WHERE channel='homeowner-confirmation'").get()?.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
    expect(fixture.sqlite.prepare('SELECT state FROM installer_outbox WHERE id=?').get(`homeowner-${lead.deliveryId}`)?.state).toBe('cancelled');
  });
  it('checks the final clock and consent in one snapshot without a stale post-lookup await',async()=>{
    const lead=await queued('local-test');fixture.sqlite.prepare("UPDATE installer_outbox SET state='accepted' WHERE kind='installer-delivery'").run();
    const original=fixture.prepare.bind(fixture);let clockReads=0,withdrawn=false;
    const withdraw=async()=>{if(!withdrawn){withdrawn=true;await suppressEnquiry(fixture.d1(),lead.enquiryId,'Synthetic withdrawal at final clock snapshot','fixture');}};
    fixture.prepare=((sql:string)=>{
      const statement=original(sql);
      // The old path awaits a separate third clock read AFTER fetching consent.
      if(sql==='SELECT fixed_at FROM installer_test_clock WHERE id=1')return {...statement,first:async<T>()=>{const row=await statement.first<T>();if(++clockReads===3)await withdraw();return row;}};
      // The repaired path reads clock and live lease/consent together; withdrawal
      // committed before that final snapshot must be visible to the same query.
      if(sql.includes('AS notification_fixed_at'))return {...statement,bind:(...params:Parameters<typeof statement.bind>)=>{const bound=statement.bind(...params);return {...bound,first:async<T>()=>{await withdraw();return bound.first<T>();}};}};
      return statement;
    }) as typeof fixture.prepare;
    expect(await processOutbox(fixture.d1(),environment('local-test'))).toEqual({processed:0,failed:0});expect(withdrawn).toBe(true);
    expect(fixture.sqlite.prepare("SELECT count(*) n FROM installer_test_messages WHERE channel='homeowner-confirmation'").get()?.n).toBe(0);expect(fetch).not.toHaveBeenCalled();
  });
});
