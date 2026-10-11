import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({db:null as D1Database|null,userId:'owner1',verified:true}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://installer.example.test',OMISE_PROVIDER_MODE:'sandbox',OMISE_SECRET_KEY:'skey_test_fixture',INSTALLER_AUTH_SECRET:'fixture-secret-thirty-two-characters-minimum'}),requireDatabase:()=>state.db}));
vi.mock('@/lib/installer/auth',()=>({getInstallerSession:async()=>state.userId?{user:{id:state.userId,emailVerified:state.verified}}:null}));
import { FixtureDatabase, seedFixture } from '../installer/fixtures';
import { GET, POST } from '@/app/api/installer/payment-status/route';
import { defaultInstallerSettings } from '@/lib/installer/settings';

let fixture:FixtureDatabase;
const id='00000000-0000-4000-8000-000000000001';
const url='https://installer.example.test/api/installer/payment-status';
const post=()=>POST(new Request(url,{method:'POST',headers:{Origin:'https://installer.example.test','Content-Type':'application/json'},body:JSON.stringify({orderId:id})}));
const resultOrder=async(response:Response)=>(await response.json() as {order:{id:string;status:string;credits:number;credited:boolean}}).order;
beforeEach(async()=>{
  fixture=new FixtureDatabase();state.db=fixture.d1();state.userId='owner1';state.verified=true;
  await seedFixture(state.db);
  await state.db.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify(defaultInstallerSettings)).run();
  for(const [user,company] of [['owner1','synthetic-company-1'],['owner2','synthetic-company-2']]){
    await state.db.prepare('INSERT INTO installer_auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').bind(user,'Synthetic Owner',`${user}@example.test`,1,Date.now(),Date.now()).run();
    await state.db.prepare("INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,'owner')").bind(`member-${user}`,company,user).run();
  }
  await state.db.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,provider_order_id,created_at,updated_at) VALUES(?,'synthetic-company-1','credits-20',20,400000,'thb','pending','omise','chrg_test_fixture','now','now')").bind(id).run();
});
afterEach(()=>{fixture.close();state.db=null;vi.unstubAllGlobals();});
function provider(status='pending') {
  return {id:'chrg_test_fixture',object:'charge',livemode:false,amount:400000,currency:'thb',paid:status==='paid',capture:true,status:status==='paid'?'successful':status==='failed'?'failed':'pending',expired:status==='cancelled',metadata:{solarmatch_order_id:id},transaction:status==='paid'?'trxn_test_fixture':null};
}
describe('authenticated payment return status',()=>{
  it('ignores forged redirect success values and does not issue credits on a read',async()=>{
    const network=vi.fn();vi.stubGlobal('fetch',network);
    const result=await GET(new Request(`${url}?orderId=${id}&status=paid&success=true&credits=99999`));
    expect(result.status).toBe(200);expect(await resultOrder(result)).toMatchObject({id,status:'pending',credited:false,credits:20});
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
    expect(network).not.toHaveBeenCalled();
    expect(fixture.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='synthetic-company-1'").get()?.available).toBe(20);
  });
  it('verifies pending then successful payment server-side and grants a purchase once on repeated returns',async()=>{
    const network=vi.fn(async(providerUrl:string)=>{expect(providerUrl).toBe('https://api.omise.co/charges/chrg_test_fixture');return Response.json(provider());});vi.stubGlobal('fetch',network);
    expect((await resultOrder(await post())).status).toBe('pending');
    expect(fixture.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='synthetic-company-1'").get()?.available).toBe(20);
    network.mockImplementation(async()=>Response.json(provider('paid')));
    expect(await resultOrder(await post())).toMatchObject({status:'paid',credited:true});
    expect((await resultOrder(await post())).status).toBe('paid');
    expect(fixture.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='synthetic-company-1'").get()?.available).toBe(40);
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM installer_credit_ledger WHERE kind='purchase'").get()?.n).toBe(1);
    expect(network.mock.calls.every(call=>String(call[0]).endsWith('/charges/chrg_test_fixture'))).toBe(true);
  });
  it.each(['failed','cancelled'])('shows provider-confirmed %s without issuing credits',async status=>{
    vi.stubGlobal('fetch',vi.fn(async()=>Response.json(provider(status))));
    expect(await resultOrder(await post())).toMatchObject({status,credited:false});
    expect(fixture.sqlite.prepare("SELECT COUNT(*) AS n FROM installer_credit_ledger WHERE kind='purchase'").get()?.n).toBe(0);
  });
  it('shows unassociated pending orders without creating a charge or inventing a failure',async()=>{
    fixture.sqlite.prepare('UPDATE installer_payment_orders SET provider_order_id=NULL WHERE id=?').run(id);
    const network=vi.fn();vi.stubGlobal('fetch',network);
    expect((await resultOrder(await post())).status).toBe('pending');
    expect(network).not.toHaveBeenCalled();
  });
  it('denies another company, anonymous and unverified access before a provider request',async()=>{
    const network=vi.fn();vi.stubGlobal('fetch',network);
    state.userId='owner2';
    expect((await GET(new Request(`${url}?orderId=${id}`))).status).toBe(404);
    expect((await post()).status).toBe(404);
    state.userId='';expect((await post()).status).toBe(401);
    state.userId='owner1';state.verified=false;expect((await post()).status).toBe(401);
    expect(network).not.toHaveBeenCalled();
  });
  it('rejects a cross-origin reconciliation request without provider calls',async()=>{
    const network=vi.fn();vi.stubGlobal('fetch',network);
    const response=await POST(new Request(url,{method:'POST',headers:{Origin:'https://foreign.example.test','Content-Type':'application/json'},body:JSON.stringify({orderId:id})}));
    expect(response.ok).toBe(false);expect(network).not.toHaveBeenCalled();
  });
});
