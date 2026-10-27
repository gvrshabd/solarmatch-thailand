import {expect,test,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {InstallerPortalData} from '../../lib/installer/portal-contract';

const deliveryId='00000000-0000-4000-8000-000000000009';
const deliveredAt='2026-10-08T03:00:00.000Z',claimDeadline='2026-10-15T03:00:00.000Z';
function portalFixture():InstallerPortalData {
  return {
    session:{user:{id:'synthetic-owner',name:'Synthetic owner',email:'owner@example.test',emailVerified:true}},
    company:{id:'synthetic-company',name:'Synthetic company',approvalStatus:'approved',contactName:'Synthetic owner',phone:'0800000000',serviceAreas:['bangkok'],supportedProducts:['shared_residential'],dailyLimit:3,paused:false,lineLinked:true,termsAcceptedVersion:'synthetic-terms'},
    products:[],packages:[],balance:{available:0,reserved:0,trialRemaining:0,debt:0},orders:[],ledger:[],claims:[],
    // Deliberately supply stale personal fields: the withdrawn UI must hide them
    // even if an older response is still present. Service redaction is unit-tested.
    deliveries:[{id:deliveryId,enquiryId:'synthetic-enquiry',reference:'SM-REPAIR09',product:'shared_residential',fundingSource:'purchased',creditCost:2,deliveredAt,notificationStatus:'action-required',claimDeadline,withdrawn:true,homeownerName:'WITHDRAWN_SYNTHETIC_HOMEOWNER',phone:'+66876543210',location:'WITHDRAWN_SYNTHETIC_LOCATION',requestedAt:deliveredAt,assessment:{monthlyBillThb:765432,roofMaterial:'WITHDRAWN_SYNTHETIC_ROOF'},qualification:'WITHDRAWN_SYNTHETIC_ASSESSMENT',outcome:'won'}],
    terms:{version:'synthetic-terms',textTh:'ข้อตกลงทดสอบ',textEn:'Synthetic terms',acceptedAt:deliveredAt},
    integrations:{paymentsEnabled:false,paymentMethods:[],lineConfigured:true,mode:'local-test'},
    commercial:{creditValueMinor:20000,sharedCredits:2,claimDays:7,trialDeliveries:2,recipientLimit:3},
  };
}
async function dates(page:Page,en:boolean) {
  return page.evaluate(({en,deliveredAt,claimDeadline})=>{
    const format=(value:string)=>new Date(value).toLocaleString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'});
    return {delivered:format(deliveredAt),deadline:format(claimDeadline)};
  },{en,deliveredAt,claimDeadline});
}
async function narrowAccessible(page:Page) {
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'320px portal has no horizontal overflow').toBe(true);
  expect((await new AxeBuilder({page}).include('.signal.portal').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
}

test.describe('compiled repaired portal with synthetic route responses',()=>{
  test.beforeEach(async({page})=>{
    await page.setViewportSize({width:320,height:800});
    await page.clock.setFixedTime(new Date('2026-10-11T03:00:00.000Z'));
  });
  for(const lang of ['en','th'] as const) {
    const en=lang==='en';
    test(`${lang}: an enquiry without a disclosed name retains a meaningful reference heading`,async({page})=>{
      const data=portalFixture();data.deliveries[0].withdrawn=false;data.deliveries[0].homeownerName='';
      await page.route('**/api/installer/portal**',route=>route.fulfill({json:data}));
      await page.goto(`/installers/enquiry/${deliveryId}?lang=${lang}`);
      await expect(page.getByRole('heading',{name:'SM-REPAIR09',exact:true})).toBeVisible();
      const overflow=await page.evaluate(()=>[...document.querySelectorAll('#installer-content *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(el=>({tag:el.tagName,className:el.className,width:Math.round(el.getBoundingClientRect().width)})));
      if(overflow.length)console.log('SYNTHETIC_LAYOUT_DIAGNOSTIC',JSON.stringify(overflow));
      await expect(page.getByLabel(en?'Notes for your team':'บันทึกสำหรับทีม',{exact:true})).toBeVisible();await expect(page.locator('#installer-page-title')).toBeFocused();await narrowAccessible(page);
    });
    test(`${lang}: withdrawn financial record preserves original claim route and hides contact controls`,async({page})=>{
      const data=portalFixture();const submissions:unknown[]=[];
      await page.route('**/api/installer/portal**',async route=>{
        if(route.request().method()==='GET'){await route.fulfill({json:data});return;}
        expect(new URL(route.request().url()).searchParams.get('lang')).toBe(lang);
        const body=route.request().postDataJSON();submissions.push(body);
        expect(body).toEqual({action:'create-claim',deliveryId,reason:'withdrawn',notes:'Synthetic evidence supporting the original delivery claim.'});
        data.claims=[{id:'synthetic-claim',deliveryId,reason:body.reason,status:'submitted',submittedAt:'2026-10-11T03:00:00.000Z',decision:null}];
        await route.fulfill({status:201,json:{id:'synthetic-claim',status:'submitted'}});
      });
      const response=await page.goto(`/installers/enquiry/${deliveryId}?lang=${lang}`);expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading',{level:1,name:en?'Access withdrawn':'ถอนสิทธิ์แล้ว',exact:true})).toBeVisible();
      await expect(page.getByText(en?'Access withdrawn or suppressed. Do not contact the homeowner about this enquiry. Personal details and staff links are unavailable. The financial record remains, and eligible claims can be submitted within the original deadline.':'ถอนหรือระงับสิทธิ์เข้าถึงข้อมูลแล้ว ห้ามติดต่อเจ้าของบ้านจากคำขอนี้ ข้อมูลส่วนบุคคลและลิงก์ทีมงานไม่พร้อมใช้งาน บันทึกการคิดเครดิตยังคงอยู่ และสามารถยื่นคำร้องได้ภายในกำหนดเดิม',{exact:true})).toBeVisible();
      await expect(page.locator('.a-detail .meta')).toContainText(en?' · 2 credits · ':' · 2 เครดิต · ');
      const formatted=await dates(page,en);
      await expect(page.locator('.a-detail .meta')).toContainText(`${en?'Available in portal':'พร้อมใช้ในพอร์ทัล'} ${formatted.delivered}`);
      await page.getByText(en?'Problem with this enquiry?':'คำขอมีปัญหาหรือไม่?',{exact:true}).click();
      const deadline=page.getByText(`${en?'Submit by':'ยื่นได้ถึง'} ${formatted.deadline}`,{exact:false});await expect(deadline).toBeVisible();
      for(const marker of ['WITHDRAWN_SYNTHETIC_HOMEOWNER','+66876543210','WITHDRAWN_SYNTHETIC_LOCATION','WITHDRAWN_SYNTHETIC_ROOF','WITHDRAWN_SYNTHETIC_ASSESSMENT','765,432'])await expect(page.locator('.signal.portal')).not.toContainText(marker);
      await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
      await expect(page.getByText(en?'Share with a team member':'แชร์กับทีมงาน',{exact:true})).toHaveCount(0);
      await expect(page.getByRole('heading',{name:en?'Progress':'ความคืบหน้า',exact:true})).toHaveCount(0);
      await expect(page.getByLabel(en?'Notes for your team':'บันทึกสำหรับทีม',{exact:true})).toHaveCount(0);
      await expect(page.getByRole('combobox',{name:en?'Contact outcome':'ผลการติดต่อ',exact:true})).toHaveCount(0);
      await page.getByRole('combobox',{name:en?'Reason':'เหตุผล',exact:true}).selectOption('withdrawn');
      await page.getByLabel(en?'Supporting information':'ข้อมูลสนับสนุน',{exact:true}).fill('Synthetic evidence supporting the original delivery claim.');
      await page.getByRole('button',{name:en?'Submit claim':'ส่งคำร้อง',exact:true}).click();
      await expect(page.locator('.toast[role=status]')).toContainText(en?'Saved.':'บันทึกแล้ว');expect(submissions).toHaveLength(1);
      await expect(deadline).toBeVisible();expect(data.deliveries[0].claimDeadline).toBe(claimDeadline);
      await narrowAccessible(page);
    });
    test(`${lang}: expiry keeps financial record but closes claim submission`,async({page})=>{
      await page.clock.setFixedTime(new Date('2026-10-16T03:00:00.000Z'));const posts:unknown[]=[];
      await page.route('**/api/installer/portal**',async route=>{
        if(route.request().method()==='POST')posts.push(route.request().postDataJSON());
        await route.fulfill({json:portalFixture()});
      });
      await page.goto(`/installers/enquiry/${deliveryId}?lang=${lang}`);
      await expect(page.getByRole('heading',{level:1,name:en?'Access withdrawn':'ถอนสิทธิ์แล้ว',exact:true})).toBeVisible();
      await page.getByText(en?'Problem with this enquiry?':'คำขอมีปัญหาหรือไม่?',{exact:true}).click();
      await expect(page.getByText(en?'The claim submission window has closed for this enquiry.':'พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว',{exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:en?'Submit claim':'ส่งคำร้อง',exact:true})).toHaveCount(0);
      await expect(page.getByLabel(en?'Supporting information':'ข้อมูลสนับสนุน',{exact:true})).toHaveCount(0);expect(posts).toEqual([]);
      const formatted=await dates(page,en);await expect(page.getByText(`${en?'Submit by':'ยื่นได้ถึง'} ${formatted.deadline}`,{exact:false})).toBeVisible();
    });
    test(`${lang}: withdrawn Claims list retains status with a localized redaction notice`,async({page})=>{
      const data=portalFixture();
      data.claims=[{id:'synthetic-redacted-claim',deliveryId,reason:'withdrawn-claim',status:'submitted',submittedAt:deliveredAt,decision:null}];
      await page.route('**/api/installer/portal**',route=>route.fulfill({json:data}));
      await page.goto(`/installers?view=claims&lang=${lang}`);
      await expect(page.getByText(en?'Claim for withdrawn enquiry — personal details hidden':'คำร้องสำหรับคำขอที่ถอนแล้ว — ไม่แสดงข้อมูลส่วนบุคคล',{exact:true})).toBeVisible();
      await expect(page.locator('.signal.portal')).not.toContainText('SYNTHETIC_WITHDRAWN_CLAIM_PERSONAL_MARKER');
      await expect(page.getByRole('link',{name:en?'Open enquiry':'เปิดคำขอ',exact:true})).toHaveAttribute('href',`/installers/enquiry/${deliveryId}?lang=${lang}&tab=closed`);
      await narrowAccessible(page);
    });
    test(`${lang}: credit debt explains blocked allocation and separate trial entitlement`,async({page})=>{
      const data=portalFixture();data.balance={available:0,reserved:0,trialRemaining:2,debt:2};
      await page.route('**/api/installer/portal**',route=>route.fulfill({json:data}));
      await page.goto(`/installers?view=credits&lang=${lang}`);
      const notice=page.locator('.notice[data-warning]');await expect(notice).toHaveCount(1);await expect(notice).toContainText(en?'2 credits owed. Clear the balance before new enquiries.':'มีเครดิตค้าง 2 เครดิต โปรดชำระก่อนรับคำขอใหม่');
      const balance=page.locator('.bal');await expect(balance).toContainText(en?'Enough for 0 enquiries':'พอสำหรับ 0 คำขอ');await expect(balance).toContainText(en?'2 free trials left':'เหลือสิทธิ์ทดลองฟรี 2');
      await expect(balance).toContainText(en?'New deliveries are blocked until this debt is cleared.':'บริษัทจะยังรับคำขอใหม่ไม่ได้จนกว่าจะชำระยอดนี้');
      await expect(balance).toContainText(en?'Purchased credits and purchased-credit restorations offset debt first; only the remainder becomes available. Trial entitlements are separate.':'เครดิตที่ซื้อเพิ่มหรือได้รับคืนจะหักยอดค้างก่อน ส่วนที่เหลือจึงเป็นเครดิตพร้อมใช้ สิทธิ์ทดลองแยกจากยอดนี้');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    });
    test(`${lang}: owner disconnects LINE and sees retained notification status with reconnection control`,async({page})=>{
      const data=portalFixture();const submissions:unknown[]=[];
      await page.route('**/api/installer/portal**',async route=>{
        if(route.request().method()==='GET'){await route.fulfill({json:data});return;}
        const body=route.request().postDataJSON();submissions.push(body);expect(body).toEqual({action:'unlink-line'});
        expect(new URL(route.request().url()).searchParams.get('lang')).toBe(lang);data.company!.lineLinked=false;
        await route.fulfill({json:{status:'not-connected',notificationsRequireAction:1}});
      });
      await page.goto(`/installers?view=profile&lang=${lang}`);
      await expect(page.getByText(en?'Connected':'เชื่อมต่อแล้ว',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:en?'Disconnect':'ยกเลิกการเชื่อมต่อ',exact:true}).click();
      await expect(page.getByText(en?'Disconnecting stops new LINE notifications and invalidates pending link invitations. Unsent notifications remain for operator review. You can reconnect later.':'การยกเลิกจะหยุดการแจ้งเตือนใหม่ผ่าน LINE และยกเลิกลิงก์เชื่อมต่อที่รอดำเนินการ ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้',{exact:true})).toBeVisible();expect(submissions).toHaveLength(0);
      await page.getByRole('button',{name:en?'Disconnect LINE':'ยกเลิกการเชื่อมต่อ LINE',exact:true}).click();
      await expect(page.locator('.toast[role=status]')).toContainText(en?'LINE disconnected. Unsent notifications are retained for operator review. You can reconnect later. Messages already sent cannot be recalled.':'ยกเลิกการเชื่อมต่อ LINE แล้ว ข้อความที่ยังไม่ส่งจะเก็บไว้ให้ผู้ดูแลตรวจสอบ คุณสามารถเชื่อมต่อใหม่ได้ ข้อความที่ส่งไปแล้วไม่สามารถเรียกคืนได้');
      await expect(page.getByText(en?'Connected':'เชื่อมต่อแล้ว',{exact:true})).toHaveCount(0);
      await expect(page.getByRole('button',{name:en?'Disconnect LINE':'ยกเลิกการเชื่อมต่อ LINE',exact:true})).toHaveCount(0);
      await expect(page.getByRole('button',{name:en?'Connect':'เชื่อมต่อ',exact:true})).toBeEnabled();expect(submissions).toHaveLength(1);
      await narrowAccessible(page);
    });
  }
});
