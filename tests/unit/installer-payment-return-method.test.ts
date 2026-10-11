import { existsSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://installer.example.test',OMISE_PROVIDER_MODE:'sandbox',OMISE_SECRET_KEY:'skey_test_fixture',OMISE_PUBLIC_KEY:'pkey_test_fixture'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import { FixtureDatabase, seedFixture } from '../installer/fixtures';
import { authorizeOrder, createOrder } from '@/lib/installer/payments';
import { createHostedOrder } from '@/lib/installer/providers/payment';
import { defaultInstallerSettings } from '@/lib/installer/settings';

const request=new Request('https://installer.example.test/api/installer/portal?lang=en');
let fixture:FixtureDatabase;
beforeEach(async()=>{
  fixture=new FixtureDatabase();
  await seedFixture(fixture.d1());
  await fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...defaultInstallerSettings,paymentsEnabled:true,paymentMethods:['promptpay','mobile_banking_kbank']})).run();
});
afterEach(()=>{fixture.close();vi.unstubAllGlobals();});

describe('payment return route and selected merchant method',()=>{
  it('opens the selected configured method instead of the first method',async()=>{
    const result=await createOrder(fixture.d1(),'synthetic-company-1',request,'mobile_banking_kbank');
    expect(result.checkout?.defaultPaymentMethod).toBe('mobile_banking_kbank');
    expect(result.checkout?.otherPaymentMethods).toBe('promptpay');
  });
  it('rejects disabled or unknown methods before persisting an order',async()=>{
    for(const method of ['credit_card','truemoney_jumpapp','fake-method']) await expect(createOrder(fixture.d1(),'synthetic-company-1',request,method)).rejects.toThrow('payment_method_unavailable');
    expect(fixture.sqlite.prepare('SELECT COUNT(*) AS n FROM installer_payment_orders').get()?.n).toBe(0);
  });
  it('provider hosted checkout rejects a method outside merchant configuration',async()=>{
    const order={orderId:'fixture',amountMinor:400000,currency:'thb' as const,description:'Synthetic order',returnUrl:'https://installer.example.test/installers/payment',method:'credit_card' as const};
    await expect(createHostedOrder(order,{mode:'sandbox',sandboxEnabled:true,secretKey:'skey_test_fixture',publicKey:'pkey_test_fixture',activatedMethods:['promptpay']})).rejects.toThrow('payment_method_unavailable');
  });
  it('does not advertise credit cards before the merchant card brands are configured',async()=>{
    const order={orderId:'fixture',amountMinor:400000,currency:'thb' as const,description:'Synthetic order',returnUrl:'https://installer.example.test/installers/payment',method:'promptpay' as const};
    const result=await createHostedOrder(order,{mode:'sandbox',sandboxEnabled:true,secretKey:'skey_test_fixture',publicKey:'pkey_test_fixture',activatedMethods:['credit_card','promptpay']});
    expect(result.methods).toEqual(['promptpay']);expect(result.checkout?.otherPaymentMethods).toBe('');
  });
  it('returns authorisation to an implemented page with the exact order and language',async()=>{
    const created=await createOrder(fixture.d1(),'synthetic-company-1',request,'promptpay');
    let returnUri='';
    vi.stubGlobal('fetch',vi.fn(async(url:string,init?:RequestInit)=>{
      if(url.includes('/sources/')) return Response.json({livemode:false,amount:400000,currency:'thb',type:'promptpay'});
      returnUri=new URLSearchParams(String(init?.body)).get('return_uri')!;
      return Response.json({id:'chrg_test_fixture',object:'charge',livemode:false,amount:400000,currency:'thb',paid:false,capture:true,status:'pending',metadata:{solarmatch_order_id:created.orderId},authorize_uri:'https://payments.example.test/authorize'});
    }));
    await authorizeOrder(fixture.d1(),'synthetic-company-1',created.orderId,'src_test_fixture',request);
    const returned=new URL(returnUri);
    expect(returned.pathname).toBe('/installers/payment');
    expect(returned.searchParams.get('orderId')).toBe(created.orderId);
    expect(returned.searchParams.get('lang')).toBe('en');
    expect(existsSync(`app${returned.pathname}/page.tsx`)).toBe(true);
    expect(fixture.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='synthetic-company-1'").get()?.available).toBe(20);
  });
});
