import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {FixtureDatabase} from '../installer/fixtures';
import {stagingLineBudget} from '@/lib/installer/staging-line-budget';
import {sha256} from '@/lib/server/crypto';
import {requestLinkToken} from '@/lib/installer/providers/line';
const owner='U'+'1'.repeat(32),sessionId='00000000-0000-4000-8000-000000000005';
const legacy={STAGING_LINE_MAX_MESSAGES:'3',INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://solarmatch-installer-staging.deluxejahseh.workers.dev'};
const env={...legacy,STAGING_LINE_TEST_SESSION:sessionId};
let fixture:FixtureDatabase;
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-14T03:00:00Z'));fixture=new FixtureDatabase();});
afterEach(()=>{fixture.close();vi.useRealTimers();});
async function authorise(){
  const old=stagingLineBudget(fixture.d1(),legacy)!;await old('old-failed-1',owner);await old('old-failed-2',owner);
  fixture.sqlite.prepare('INSERT INTO installer_operational_events(id,event_type,attribution_json,created_at) VALUES(?,?,?,?)').run(sessionId,'staging-line-test-session',JSON.stringify({active:true,recipientHash:await sha256(owner),maxNewApiAttempts:5,priorReservations:2,expiresAt:new Date(Date.now()+45*60000).toISOString()}),new Date().toISOString());
  fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('false'),'$.notificationsEnabled',json('true')) WHERE id=1");
}
it('adds exactly five API attempts without erasing history; repeat keys consume attempts',async()=>{
  await authorise();const old=fixture.sqlite.prepare("SELECT * FROM installer_operational_events WHERE event_type='staging-line-test-budget'").all();
  const reserve=stagingLineBudget(fixture.d1(),env)!;
  for(const operation of ['invitation','link-token','enquiry','invitation','link-token'] as const)await reserve('same-key',owner,operation);
  await expect(reserve('same-key',owner)).rejects.toThrow('staging_session_cap_or_hold');
  const rows=fixture.sqlite.prepare("SELECT * FROM installer_operational_events WHERE event_type='staging-line-test-budget'").all();
  expect(rows).toHaveLength(7);expect(rows.filter(row=>!JSON.parse(String(row.attribution_json)).sessionId)).toEqual(old);
  expect(rows.filter(row=>JSON.parse(String(row.attribution_json)).sessionId).map(row=>JSON.parse(String(row.attribution_json)).operation)).toEqual(['invitation','link-token','enquiry','invitation','link-token']);
});
it('atomically caps concurrent requests at five',async()=>{
  await authorise();const reserve=stagingLineBudget(fixture.d1(),env)!;
  const results=await Promise.allSettled(Array.from({length:10},()=>reserve('repeated',owner)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);
});
it('rejects unapproved sessions and different recipients',async()=>{
  const reserve=stagingLineBudget(fixture.d1(),env)!;await expect(reserve('one',owner)).rejects.toThrow('not_authorised');
  await authorise();await expect(reserve('one','U'+'2'.repeat(32))).rejects.toThrow('invalid_or_expired');
});
it('enforces pause, expiry, revocation, hours and absence of a staging test clock',async()=>{
  await authorise();const reserve=stagingLineBudget(fixture.d1(),env)!;
  fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('true')) WHERE id=1");
  await expect(reserve('one',owner)).rejects.toThrow('cap_or_hold');
  fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('false')) WHERE id=1; UPDATE installer_test_clock SET fixed_at='2026-10-14T03:00:00Z' WHERE id=1");
  await expect(reserve('one',owner)).rejects.toThrow('cap_or_hold');
  fixture.sqlite.exec('UPDATE installer_test_clock SET fixed_at=NULL WHERE id=1');
  vi.setSystemTime(new Date('2026-10-14T04:00:00Z'));await expect(reserve('one',owner)).rejects.toThrow('invalid_or_expired');
  vi.setSystemTime(new Date('2026-10-14T11:00:00Z'));await expect(reserve('one',owner)).rejects.toThrow('outside_hours');
  vi.setSystemTime(new Date('2026-10-14T03:00:00Z'));fixture.sqlite.prepare("UPDATE installer_operational_events SET attribution_json=json_set(attribution_json,'$.active',json('false')) WHERE id=?").run(sessionId);
  await expect(reserve('one',owner)).rejects.toThrow('invalid_or_expired');
});
it('counts link-token requests and denies transport when reservation fails',async()=>{
  await authorise();const reserve=stagingLineBudget(fixture.d1(),env)!;
  const transport=vi.fn<typeof fetch>(async()=>Response.json({linkToken:'synthetic-token'}));
  const config={mode:'sandbox' as const,outboundEnabled:true,accessToken:'synthetic',sandboxRecipients:[owner],countLinkTokenAttempts:true,reserveMessage:reserve,fetch:transport};
  await requestLinkToken(owner,config);
  const rows=fixture.sqlite.prepare("SELECT attribution_json FROM installer_operational_events WHERE json_extract(attribution_json,'$.sessionId')=?").all(sessionId);
  expect(rows).toHaveLength(1);expect(JSON.parse(String(rows[0].attribution_json)).operation).toBe('link-token');
  await expect(requestLinkToken(owner,{...config,reserveMessage:async()=>{throw Error('cap');}})).rejects.toThrow('cap');expect(transport).toHaveBeenCalledTimes(1);
});
