import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',LINE_CHANNEL_SECRET:'synthetic-line-secret',PHONE_VERIFICATION_SECRET:'synthetic-phone-secret-thirty-two-characters'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase,seedFixture} from '../installer/fixtures';
import {beginLineLink,processLineWebhook,unlinkLine} from '@/lib/installer/line-linking';
import * as provider from '@/lib/installer/providers/line';
import {sha256} from '@/lib/server/crypto';
import * as cryptoHelpers from '@/lib/server/crypto';
import {base64,hmac} from '@/lib/installer/providers/common';
const company='synthetic-company-1',other='synthetic-company-2';
const user=`U${'a'.repeat(32)}`,prior=`U${'b'.repeat(32)}`;
const request=new Request('http://localhost:3000/installers');
let fixture:FixtureDatabase;
beforeEach(async()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));fixture=new FixtureDatabase();await seedFixture(fixture.d1());fixture.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(prior,company);});
afterEach(()=>{fixture.close();vi.restoreAllMocks();vi.useRealTimers();});
async function invitation(id:string,lineUser=user){
  const token=id.padEnd(43,'a').slice(0,43),now=new Date().toISOString();
  fixture.sqlite.prepare('INSERT INTO installer_line_invitations(id,line_user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?)').run(id,lineUser,await sha256(token),new Date(Date.now()+600000).toISOString(),now);
  return token;
}
async function complete(nonce:string,event='synthetic-link-event',lineUser=user){
  const raw=JSON.stringify({events:[{type:'accountLink',webhookEventId:event,timestamp:Date.now(),source:{type:'user',userId:lineUser},link:{result:'ok',nonce}}]});
  const signature=base64(await hmac(new TextEncoder().encode(runtime.LINE_CHANNEL_SECRET),raw));
  return processLineWebhook(fixture.d1(),new Request('http://localhost:3000/api/installer/webhooks/line',{headers:{'x-line-signature':signature}}),raw);
}
const linked=()=>fixture.sqlite.prepare('SELECT line_user_id FROM solar_company_partners WHERE id=?').get(company)?.line_user_id;
describe('LINE linking cancellation during provider work',()=>{
  it('increments private generation even when already disconnected and isolates another company',async()=>{
    await unlinkLine(fixture.d1(),company,'synthetic-owner');await unlinkLine(fixture.d1(),company,'synthetic-owner');
    expect(fixture.sqlite.prepare('SELECT line_link_generation FROM solar_company_partners WHERE id=?').get(company)?.line_link_generation).toBe(2);
    expect(fixture.sqlite.prepare('SELECT line_link_generation FROM solar_company_partners WHERE id=?').get(other)?.line_link_generation).toBe(0);
  });
  it('rejects initialization cancelled during asynchronous hashing before the pending row exists',async()=>{
    const token=await invitation('hash-race-invitation');
    const original=cryptoHelpers.sha256;
    vi.spyOn(cryptoHelpers,'sha256').mockImplementationOnce(async value=>{
      const result=await original(value);await unlinkLine(fixture.d1(),company,'synthetic-owner');return result;
    });
    const providerCall=vi.spyOn(provider,'requestLinkToken');
    await expect(beginLineLink(fixture.d1(),company,request,token)).rejects.toThrow('line_link_cancelled');
    expect(providerCall).not.toHaveBeenCalled();
    expect(linked()).toBeNull();
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_line_links WHERE consumed_at IS NULL').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_line_invitations WHERE id=?').get('hash-race-invitation')?.consumed_at).toBeTruthy();
  });
  it('cannot create a usable stale challenge when unlink occurs inside the provider token request',async()=>{
    const token=await invitation('stale-invitation');
    vi.spyOn(provider,'requestLinkToken').mockImplementationOnce(async()=>{
      await unlinkLine(fixture.d1(),company,'synthetic-owner');
      return {linkToken:'synthetic-provider-token',expiresInSeconds:600};
    });
    await expect(beginLineLink(fixture.d1(),company,request,token)).rejects.toThrow('line_link_cancelled');
    expect(linked()).toBeNull();
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_line_links WHERE company_id=? AND consumed_at IS NULL').get(company)?.n).toBe(0);
    await expect(beginLineLink(fixture.d1(),company,request,token)).rejects.toThrow('line_invitation_expired');
  });
  it('keeps another tenant linking, allows a fresh later connection and prevents webhook replay after unlink',async()=>{
    const token=await invitation('fresh-invitation');const otherToken=await invitation('other-invitation',`U${'c'.repeat(32)}`);
    const otherLink=await beginLineLink(fixture.d1(),other,request,otherToken);expect(otherLink.status).toBe('confirmation-pending');
    await unlinkLine(fixture.d1(),company,'synthetic-owner');
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_line_links WHERE company_id=? AND consumed_at IS NULL').get(other)?.n).toBe(1);
    const fresh=await beginLineLink(fixture.d1(),company,request,token);
    const nonce=new URL(fresh.authorizationUrl!).searchParams.get('nonce')!;
    await complete(nonce);expect(linked()).toBe(user);
    await unlinkLine(fixture.d1(),company,'synthetic-owner');await complete(nonce);await complete(nonce,'synthetic-new-replay');
    expect(linked()).toBeNull();
    const next=await beginLineLink(fixture.d1(),company,request,await invitation('new-fresh-invitation'));
    await complete(new URL(next.authorizationUrl!).searchParams.get('nonce')!,'synthetic-later-event');expect(linked()).toBe(user);
  });
  it('retires pending state after a provider failure and permits a fresh invitation',async()=>{
    const token=await invitation('provider-failure-invitation');
    vi.spyOn(provider,'requestLinkToken').mockRejectedValueOnce(new Error('synthetic token failure'));
    await expect(beginLineLink(fixture.d1(),company,request,token)).rejects.toThrow('synthetic token failure');
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_line_links WHERE company_id=? AND consumed_at IS NULL').get(company)?.n).toBe(0);
    await expect(beginLineLink(fixture.d1(),company,request,token)).rejects.toThrow('line_invitation_expired');
    expect((await beginLineLink(fixture.d1(),company,request,await invitation('provider-retry-invitation'))).status).toBe('confirmation-pending');
  });
  it('allows exactly one company to claim a concurrently used invitation',async()=>{
    const token=await invitation('competing-invitation');const providerCall=vi.spyOn(provider,'requestLinkToken');
    const results=await Promise.allSettled([beginLineLink(fixture.d1(),company,request,token),beginLineLink(fixture.d1(),other,request,token)]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect(results.filter(result=>result.status==='rejected')).toHaveLength(1);
    expect(providerCall).toHaveBeenCalledTimes(1);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_line_links WHERE consumed_at IS NULL').get()?.n).toBe(1);
  });
});
