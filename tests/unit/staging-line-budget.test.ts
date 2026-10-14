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
afterEach(()=>{for(const key of Object.keys(runtime))delete runtime[key];vi.unstubAllGlobals();});
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
    // Concurrent reservation order is not guaranteed. Retry a key that actually
    // acquired a slot rather than assuming request zero won the race.
    const reservedKey=String(values.findIndex(value=>value.status==='fulfilled'));
    await reserve(reservedKey,owner);await expect(reserve(reservedKey,'U'+'2'.repeat(32))).rejects.toThrow(/recipient_mismatch/);
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
it('generates RFC version/variant invitation keys and deduplicates signed event replay',async()=>{
  const fixture=new FixtureDatabase();try{
    Object.assign(runtime,env,{LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_SECRET:'synthetic-channel-secret',LINE_CHANNEL_ACCESS_TOKEN:'synthetic',LINE_TEST_RECIPIENTS:JSON.stringify([owner]),OUTBOUND_MESSAGES_ENABLED:'true'});
    fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('false'),'$.notificationsEnabled',json('true')) WHERE id=1");
    const provider=vi.fn<typeof fetch>(async(_url,init)=>{expect(new Headers(init?.headers).get('X-Line-Retry-Key')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);return Response.json({},{headers:{'x-line-request-id':'synthetic'}});});vi.stubGlobal('fetch',provider);
    const raw=JSON.stringify({events:[{type:'message',webhookEventId:'synthetic-replay-key',timestamp:Date.now(),source:{type:'user',userId:owner},message:{type:'text',text:'LINK'}}]});
    const headers={'x-line-signature':base64(await hmac(new TextEncoder().encode(runtime.LINE_CHANNEL_SECRET),raw))};
    await processLineWebhook(fixture.d1(),new Request(env.INSTALLER_BASE_URL+'/api/installer/webhooks/line',{headers}),raw);
    await processLineWebhook(fixture.d1(),new Request(env.INSTALLER_BASE_URL+'/api/installer/webhooks/line',{headers}),raw);
    expect(provider).toHaveBeenCalledTimes(1);expect(fixture.sqlite.prepare("SELECT COUNT(*) n FROM installer_operational_events WHERE event_type='staging-line-test-budget'").get()).toEqual({n:1});
  }finally{fixture.close();}
});
it('rejects malformed retry UUIDs before reservation or provider work',async()=>{
  const reserve=vi.fn(),provider=vi.fn();
  await expect(sendAccountLinkInvitation(owner,env.INSTALLER_BASE_URL+'/installers','00000000-0000-8000-d000-000000000001',{mode:'sandbox',outboundEnabled:true,accessToken:'synthetic',sandboxRecipients:[owner],reserveMessage:reserve,fetch:provider})).rejects.toThrow('invalid_retry_key');
  expect(reserve).not.toHaveBeenCalled();expect(provider).not.toHaveBeenCalled();
});
it('retains safe invitation failure evidence without exposing recipient, token or provider body',async()=>{
  const fixture=new FixtureDatabase();try{
    Object.assign(runtime,env,{LINE_PROVIDER_MODE:'sandbox',LINE_CHANNEL_SECRET:'synthetic-channel-secret',LINE_CHANNEL_ACCESS_TOKEN:'synthetic',LINE_TEST_RECIPIENTS:JSON.stringify([owner]),OUTBOUND_MESSAGES_ENABLED:'true'});
    fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('false'),'$.notificationsEnabled',json('true')) WHERE id=1");
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json({message:'private provider diagnostic'},{status:401})));
    const raw=JSON.stringify({events:[{type:'message',webhookEventId:'synthetic-failed-invitation',timestamp:Date.now(),source:{type:'user',userId:owner},message:{type:'text',text:'LINK'}}]});
    const headers={'x-line-signature':base64(await hmac(new TextEncoder().encode(runtime.LINE_CHANNEL_SECRET),raw))};
    await expect(processLineWebhook(fixture.d1(),new Request(env.INSTALLER_BASE_URL+'/api/installer/webhooks/line',{headers}),raw)).rejects.toThrow('provider_http_401');
    expect(JSON.parse(String(fixture.sqlite.prepare("SELECT attribution_json FROM installer_operational_events WHERE event_type='line-invitation-provider-failure'").get()?.attribution_json))).toEqual({code:'provider_http_401'});
    expect(fixture.sqlite.prepare('SELECT COUNT(*) n FROM installer_webhook_events').get()).toEqual({n:0});
  }finally{fixture.close();}
});
