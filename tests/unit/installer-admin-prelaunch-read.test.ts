import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'off',INSTALLER_BASE_URL:'https://solarmatch-thailand.deluxejahseh.workers.dev',DB:undefined as D1Database|undefined}));
const access=vi.hoisted(()=>({authenticated:true}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime,requireDatabase:()=>runtime.DB!}));
vi.mock('@/lib/server/admin-api',()=>({requireAdminRequest:async()=>access.authenticated?{email:'synthetic-admin@example.test'}:Response.json({error:'unauthorized'},{status:401}),isAdminError:(value:unknown)=>value instanceof Response}));
import {GET,POST} from '@/app/admin/api/installer-platform/route';
import {assertAdminPlatformReadRequest,assertPlatformRequest} from '@/lib/installer/platform';
import {FixtureDatabase} from '../installer/fixtures';
describe('authenticated prelaunch installer reporting',()=>{
  let fixture:FixtureDatabase;
  beforeEach(()=>{fixture=new FixtureDatabase();runtime.DB=fixture.d1();runtime.INSTALLER_PLATFORM_MODE='off';runtime.INSTALLER_BASE_URL='https://solarmatch-thailand.deluxejahseh.workers.dev';access.authenticated=true;fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.platformPaused',json('true'),'$.collectionEnabled',json('false'),'$.paymentsEnabled',json('false'),'$.deliveryPaused',json('true'),'$.notificationsEnabled',json('false')) WHERE id=1");});
  afterEach(()=>fixture.close());
  it('loads records/health with authoritative holds and read-only state while public access stays off',async()=>{
    const request=new Request(runtime.INSTALLER_BASE_URL+'/admin/api/installer-platform');
    const response=await GET(request);expect(response.status).toBe(200);
    const body=await response.json() as {readOnly:boolean;operations:unknown;settings:Record<string,unknown>};expect(body.readOnly).toBe(true);expect(body.operations).toBeDefined();
    expect(body.settings).toMatchObject({platformPaused:true,collectionEnabled:false,paymentsEnabled:false,deliveryPaused:true,notificationsEnabled:false});
    expect(()=>assertPlatformRequest(new Request(runtime.INSTALLER_BASE_URL+'/api/installer/portal'))).toThrow('platform_unavailable');
  });
  it.each(['campaign','shutdown'])('allows the authenticated read-only %s report without activation',async report=>{
    const request=new Request(runtime.INSTALLER_BASE_URL+`/admin/api/installer-platform?report=${report}&fromDay=2026-10-01&toDay=2026-10-31`);
    const response=await GET(request);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fixture.sqlite.prepare('SELECT count(*) count FROM installer_credit_ledger').get()?.count).toBe(0);
  });
  it('retains authentication for records and reports',async()=>{
    access.authenticated=false;
    for(const suffix of['','?report=shutdown','?report=campaign'])expect((await GET(new Request(runtime.INSTALLER_BASE_URL+'/admin/api/installer-platform'+suffix))).status).toBe(401);
  });
  it.each(['https://unrelated.example/admin/api/installer-platform','http://solarmatch-thailand.deluxejahseh.workers.dev/admin/api/installer-platform'])('rejects an unexpected read origin %s',url=>expect(()=>assertAdminPlatformReadRequest(new Request(url))).toThrow('platform_unavailable'));
  it('keeps all operational POSTs disabled',async()=>{
    const response=await POST(new Request(runtime.INSTALLER_BASE_URL+'/admin/api/installer-platform',{method:'POST',headers:{origin:runtime.INSTALLER_BASE_URL,'content-type':'application/json'},body:JSON.stringify({action:'process-queue'})}));
    expect(response.ok).toBe(false);expect(()=>assertAdminPlatformReadRequest(new Request(runtime.INSTALLER_BASE_URL+'/admin/api/installer-platform',{method:'POST'}))).toThrow('platform_unavailable');
    expect(fixture.sqlite.prepare('SELECT count(*) count FROM lead_recipient_deliveries').get()?.count).toBe(0);
  });
});
