import {afterEach,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({} as Record<string,string>));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import {FixtureDatabase} from '../installer/fixtures';
import {stagingLineBudget} from '@/lib/installer/staging-line-budget';
import {sendAccountLinkInvitation} from '@/lib/installer/providers/line';
import {processLineWebhook} from '@/lib/installer/line-linking';
import {base64,hmac} from '@/lib/installer/providers/common';
const env={STAGING_LINE_MAX_MESSAGES:'3',INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://solarmatch-installer-staging.deluxejahseh.workers.dev'};
const owner='U'+'1'.repeat(32);
afterEach(()=>{for(const key of Object.keys(runtime))delete runtime[key];});
it('ignores signed non-owner events and owner follow without storing invitations or sending',async()=>{
  const fixture=new FixtureDatabase();try{
    Object.assign(runtime,env,{LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_SECRET:'synthetic-channel-secret',LINE_TEST_RECIPIENTS:JSON.stringify([owner]),OUTBOUND_MESSAGES_ENABLED:'false'});
    const raw=JSON.stringify({events:[{type:'message',webhookEventId:crypto.randomUUID(),timestamp:Date.now(),source:{type:'user',userId:'U'+'2'.repeat(32)},message:{type:'text',text:'LINK'}},{type:'follow',webhookEventId:crypto.randomUUID(),timestamp:Date.now(),source:{type:'user',userId:owner}}]});
    const signature=base64(await hmac(new TextEncoder().encode(runtime.LINE_CHANNEL_SECRET),raw));
    expect(await processLineWebhook(fixture.d1(),new Request(env.INSTALLER_BASE_URL+'/api/installer/webhooks/line',{headers:{'x-line-signature':signature}}),raw)).toEqual({received:true});
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_line_invitations').get()).toEqual({n:0});
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_test_messages').get()).toEqual({n:0});
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_operational_events').get()).toEqual({n:0});
  }finally{fixture.close();}
});
it('reserves at most three distinct messages atomically and reuses retry slots',async()=>{
  const fixture=new FixtureDatabase();try{
    const reserve=stagingLineBudget(fixture.d1(),env)!;
    const values=await Promise.allSettled(Array.from({length:8},(_,i)=>reserve(String(i),owner)));
    expect(values.filter(value=>value.status==='fulfilled')).toHaveLength(3);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_operational_events WHERE event_type='staging-line-test-budget'").get()).toEqual({n:3});
    await reserve('0',owner);await expect(reserve('0','U'+'2'.repeat(32))).rejects.toThrow(/recipient_mismatch/);
    await expect(reserve('new',owner)).rejects.toThrow(/cap_reached/);
    expect(JSON.stringify(fixture.sqlite.prepare('SELECT * FROM installer_operational_events').all())).not.toContain(owner);
  }finally{fixture.close();}
});
it('cannot select the staging cap in production or outside the exact staging origin',()=>{
  const fixture=new FixtureDatabase();try{
    expect(stagingLineBudget(fixture.d1(),{})).toBeUndefined();
    expect(()=>stagingLineBudget(fixture.d1(),{...env,INSTALLER_PLATFORM_MODE:'production'})).toThrow();
    expect(()=>stagingLineBudget(fixture.d1(),{...env,INSTALLER_BASE_URL:'https://other.example.test'})).toThrow();
  }finally{fixture.close();}
});
it('rejects non-owner recipients before reservation or a provider call',async()=>{
  const reserve=vi.fn(),provider=vi.fn();
  await expect(sendAccountLinkInvitation('U'+'2'.repeat(32),'https://staging.example.test/installers',crypto.randomUUID(),{mode:'sandbox',accessToken:'synthetic',outboundEnabled:true,sandboxRecipients:[owner],reserveMessage:reserve,fetch:provider})).rejects.toThrow(/outbound_disabled/);
  expect(reserve).not.toHaveBeenCalled();expect(provider).not.toHaveBeenCalled();
});
it('blocks a fourth invitation before sending and clearly labels allowed payloads',async()=>{
  const fixture=new FixtureDatabase();try{
    const provider=vi.fn<typeof fetch>(async()=>Response.json({},{headers:{'x-line-request-id':'fixture'}}));
    const config={mode:'sandbox' as const,accessToken:'synthetic',outboundEnabled:true,sandboxRecipients:[owner],reserveMessage:stagingLineBudget(fixture.d1(),env),stagingLabel:true,fetch:provider};
    for(let i=0;i<3;i++)await sendAccountLinkInvitation(owner,'https://staging.example.test/installers',crypto.randomUUID(),config);
    await expect(sendAccountLinkInvitation(owner,'https://staging.example.test/installers',crypto.randomUUID(),config)).rejects.toThrow(/cap_reached/);
    expect(provider).toHaveBeenCalledTimes(3);
    expect(String(provider.mock.calls[0][1]?.body)).toContain('STAGING TEST');
  }finally{fixture.close();}
});
