import { expect, test } from '@playwright/test';
import type { InstallerPortalData } from '../../lib/installer/portal-contract';

const orderId='00000000-0000-4000-8000-000000000001';
const order={id:orderId,status:'pending',amountMinor:400000,currency:'thb',credits:20,credited:false,receiptReference:null};
const portal:InstallerPortalData={
  session:{user:{id:'synthetic-owner',name:'Synthetic owner',email:'owner@example.test',emailVerified:true}},
  company:{id:'synthetic-company',name:'Synthetic company',approvalStatus:'approved',contactName:'Synthetic owner',phone:'0800000000',serviceAreas:['bangkok'],supportedProducts:['shared_residential'],dailyLimit:3,paused:true,lineLinked:false,termsAcceptedVersion:'fixture'},
  products:[],packages:[{id:'credits-20',nameTh:'20 เครดิต',nameEn:'20 credits',credits:20,amountMinor:400000,currency:'THB',taxLabel:'Synthetic package'}],
  balance:{available:0,reserved:0,trialRemaining:0,debt:0},deliveries:[],orders:[],ledger:[],claims:[],
  terms:{version:'fixture',textTh:'ข้อตกลงทดสอบ',textEn:'Synthetic terms',acceptedAt:'2026-10-11T03:00:00.000Z'},
  integrations:{paymentsEnabled:true,paymentMethods:['promptpay','mobile_banking_kbank'],lineConfigured:false,mode:'local-test'},
};

test.describe('compiled payment return pages with mocked provider responses',()=>{
  for(const lang of ['en','th'] as const) {
    const en=lang==='en';
    test(`${lang}: pending return ignores forged success, refreshes confirmed success and survives repeated returns`,async({page})=>{
      let status='pending',checks=0;
      await page.route('**/api/installer/payment-status**',async route=>{
        if(route.request().method()==='POST'){
          expect(route.request().postDataJSON()).toEqual({orderId});
          checks++;
        }
        await route.fulfill({json:{order:{...order,status,credited:status==='paid'}}});
      });
      const returned=`/installers/payment?orderId=${orderId}&lang=${lang}&success=true&status=paid&credits=99999`;
      const response=await page.goto(returned);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading',{name:en?'Payment status':'สถานะการชำระเงิน',exact:true})).toBeVisible();
      await expect(page.getByRole('heading',{name:en?'Payment pending':'รอยืนยันการชำระเงิน',exact:true})).toBeVisible();
      await expect(page.getByText(en?'This page shows the server-verified status. Returning from payment does not confirm success.':'หน้านี้แสดงสถานะที่ตรวจสอบโดยเซิร์ฟเวอร์ การกลับจากหน้าชำระเงินไม่ได้ยืนยันความสำเร็จ',{exact:true})).toBeVisible();
      status='paid';
      await page.getByRole('button',{name:en?'Check status again':'ตรวจสอบสถานะอีกครั้ง',exact:true}).click();
      await expect(page.getByRole('heading',{name:en?'Payment successful':'ชำระเงินสำเร็จ',exact:true})).toBeVisible();
      await page.goto(returned);
      await expect(page.getByRole('heading',{name:en?'Payment successful':'ชำระเงินสำเร็จ',exact:true})).toBeVisible();
      expect(checks).toBe(3);
      expect(await page.locator('html').getAttribute('lang')).toBe(lang);
      await expect(page.getByRole('link',{name:en?'← Back to credits and purchases':'← กลับไปที่เครดิตและการซื้อ'})).toHaveAttribute('href',`/installers?view=credits&lang=${lang}`);
    });
    for(const status of ['failed','cancelled'] as const) test(`${lang}: displays confirmed ${status}`,async({page})=>{
      await page.route('**/api/installer/payment-status**',route=>route.fulfill({json:{order:{...order,status}}}));
      const response=await page.goto(`/installers/payment?orderId=${orderId}&lang=${lang}&status=paid`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading',{name:status==='failed'?(en?'Payment failed':'ชำระเงินไม่สำเร็จ'):(en?'Payment cancelled':'ยกเลิกการชำระเงิน'),exact:true})).toBeVisible();
    });
    for(const method of ['promptpay','mobile_banking_kbank']) test(`${lang}: ${method} button reaches selected checkout and authorisation return`,async({page})=>{
      let checkoutMethod='',hostedMethod='',authorized=false;
      await page.exposeFunction('recordSelectedPaymentMethod',(value:string)=>{hostedMethod=value;});
      await page.addInitScript(()=>{
        const browser=window as unknown as {OmiseCard:{configure:()=>void;open:(options:{defaultPaymentMethod:string;onCreateTokenSuccess:(nonce:string)=>void})=>void};recordSelectedPaymentMethod:(method:string)=>Promise<void>};
        browser.OmiseCard={configure:()=>{},open:options=>{void browser.recordSelectedPaymentMethod(options.defaultPaymentMethod).then(()=>options.onCreateTokenSuccess('src_test_fixture'));}};
      });
      await page.route('**/api/installer/portal**',async route=>{
        if(route.request().method()==='GET'){await route.fulfill({json:portal});return;}
        const body=route.request().postDataJSON();
        expect(new URL(route.request().url()).searchParams.get('lang')).toBe(lang);
        if(body.action==='checkout'){
          checkoutMethod=body.method;
          await route.fulfill({json:{orderId,checkout:{publicKey:'pkey_test_fixture',amount:400000,currency:'THB',defaultPaymentMethod:body.method,otherPaymentMethods:portal.integrations.paymentMethods.filter(value=>value!==body.method).join(',')}}});return;
        }
        expect(body).toEqual({action:'authorize-payment',orderId,tokenOrSourceId:'src_test_fixture'});
        authorized=true;
        await route.fulfill({json:{orderId,authorizationUrl:`/installers/payment?orderId=${orderId}&lang=${lang}`}});
      });
      await page.route('**/api/installer/payment-status**',route=>route.fulfill({json:{order}}));
      await page.goto(`/installers?view=credits&lang=${lang}`);
      await page.getByRole('button',{name:(en?'Pay with ':'ชำระผ่าน ')+(method==='promptpay'?'PromptPay':'K PLUS'),exact:true}).click();
      await expect(page.getByRole('heading',{name:en?'Payment pending':'รอยืนยันการชำระเงิน',exact:true})).toBeVisible();
      expect(checkoutMethod).toBe(method);expect(hostedMethod).toBe(method);expect(authorized).toBe(true);
      await expect(page).toHaveURL(new RegExp(`/installers/payment\\?orderId=${orderId}&lang=${lang}$`));
    });
  }
});
