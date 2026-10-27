import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { InstallerPortalData } from '../../lib/installer/portal-contract';

for (const lang of ['en', 'th']) test(`unavailable installer service hides registration and recovery (${lang})`, async ({ page }) => {
  await page.route('**/api/installer/portal*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'portal_unavailable' }) }));
  await page.goto(`/installers?lang=${lang}`);
  await expect(page.getByRole('heading', { level:1, name: lang === 'en' ? 'The portal is temporarily unavailable' : 'พอร์ทัลไม่พร้อมใช้งาน' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.getByRole('button',{name:lang==='en'?'Retry':'ลองอีกครั้ง',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:lang==='en'?'Create a company account':'สร้างบัญชีบริษัท',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:lang==='en'?'Forgot password':'ลืมรหัสผ่าน',exact:true})).toHaveCount(0);
});

// Deliberately synthetic API fixtures: no account, messages or payment side effects.
const fixture = (): InstallerPortalData => ({
  session: { user: { id: 'studio-owner', name: 'Synthetic owner', email: 'studio@example.test', emailVerified: true } },
  company: { id: 'studio-company', name: 'Synthetic Solar Studio', approvalStatus: 'approved', contactName: 'Synthetic owner', phone: '0800000000', serviceAreas: ['bangkok'], supportedProducts: ['shared_residential'], dailyLimit: 3, paused: true, lineLinked: false, termsAcceptedVersion: 'synthetic' },
  products: [], packages: [{ id: 'synthetic-package', nameEn: 'Shared enquiry package', nameTh: 'แพ็กเกจคำขอแบบแชร์', credits: 20, amountMinor: 400000, currency: 'THB', taxLabel: 'Synthetic package — no real payment' }],
  balance: { available: 18, reserved: 2, trialRemaining: 1, debt: 0 },
  deliveries: [
    { id: '00000000-0000-4000-8000-000000000039', enquiryId: 'synthetic39', reference: 'SM-TEST-039', product: 'shared_residential', fundingSource: 'purchased', creditCost: 2, deliveredAt: '2026-10-10T03:00:00Z', notificationStatus: 'pending', claimDeadline: '2026-10-30T03:00:00Z', withdrawn: false, homeownerName: 'Synthetic Arun', phone: '0800000000', location: 'Prawet, Bangkok', requestedAt: '2026-10-10T02:00:00Z', assessment: { monthlyBillThb: 7200, airConditionerCount: 6 }, qualification: 'Synthetic assessment', outcome: null },
    { id: '00000000-0000-4000-8000-000000000041', enquiryId: 'synthetic41', reference: 'SM-TEST-041', product: 'shared_residential', fundingSource: 'trial', creditCost: 0, deliveredAt: '2026-10-11T03:00:00Z', notificationStatus: 'pending', claimDeadline: '2026-10-30T03:00:00Z', withdrawn: false, homeownerName: 'Synthetic Natee', phone: '0800000000', location: 'Sathon, Bangkok', requestedAt: '2026-10-11T02:00:00Z', assessment: { monthlyBillThb: 6000, airConditionerCount: 5 }, qualification: 'Synthetic assessment', outcome: 'open' },
    { id: '00000000-0000-4000-8000-000000000042', enquiryId: 'synthetic42', reference: 'SM-TEST-042', product: 'shared_residential', fundingSource: 'purchased', creditCost: 2, deliveredAt: '2026-10-12T03:00:00Z', notificationStatus: 'cancelled', claimDeadline: '2026-10-30T03:00:00Z', withdrawn: true, homeownerName: 'HIDDEN_PRIVATE_NAME', phone: '0899999999', location: 'HIDDEN_PRIVATE_LOCATION', requestedAt: '2026-10-12T02:00:00Z', assessment: { monthlyBillThb: 999999, airConditionerCount: 99 }, qualification: 'HIDDEN_PRIVATE_INFO', outcome: null },
  ],
  orders: [{ id: 'synthetic-order', status: 'pending', amountMinor: 400000, currency: 'THB', credits: 20, createdAt: '2026-10-08T03:00:00Z', receiptReference: null }],
  ledger: [{ id: 'synthetic-restoration', kind: 'claim-restoration', units: 2, reason: 'Synthetic approved claim', createdAt: '2026-10-12T03:00:00Z' }, { id: 'synthetic-delivery', kind: 'delivery', units: -2, reason: 'Synthetic shared enquiry', createdAt: '2026-10-11T03:00:00Z' }],
  claims: [], terms: { version: 'synthetic', textTh: 'ข้อตกลงทดสอบเท่านั้น', textEn: 'Synthetic terms only.', acceptedAt: '2026-10-01T00:00:00Z' },
  integrations: { paymentsEnabled: false, paymentMethods: ['promptpay'], lineConfigured: false, mode: 'local-test' },
  commercial: { creditValueMinor: 20000, sharedCredits: 2, claimDays: 7, trialDeliveries: 2, recipientLimit: 3 },
});

for (const lang of ['en', 'th'] as const) {
  const en = lang === 'en';
  test.describe('installer studio ' + lang, () => {
    test.beforeEach(async ({ page }) => {
      await page.route('**/api/installer/portal**', route => {
        expect(route.request().method()).toBe('GET');
        return route.fulfill({ json: fixture() });
      });
    });
    test('responsive workspace, credits, account, enquiries and accessibility', async ({ page }, info) => {
      test.setTimeout(120000);
      await page.setViewportSize({width:390,height:844});
      await page.goto('/installers?lang=' + lang);
      await expect(page.locator('.rows .row').first()).toContainText('Synthetic Arun');
      await expect(page.getByRole('button',{name:en?'Waiting 2':'รอติดต่อ 2',exact:true})).toHaveAttribute('aria-pressed','true');
      const nav = page.locator('nav:visible').filter({has:page.getByRole('link',{name:en?'Credits':'เครดิต',exact:true})});
      for (const width of [320, 360, 390, 430, 768, 900, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const view of [en ? 'Enquiries' : 'คำขอ', en ? 'Credits' : 'เครดิต', en ? 'Company' : 'บริษัท']) {
          await nav.getByRole('link', { name: new RegExp('^'+view+'(?:$| )') }).click();
          await expect(page.locator('#installer-page-title')).toBeFocused();
          await expect(page.getByRole('heading',{level:1})).toHaveCount(1);
          await expect.poll(()=>new URL(page.url()).searchParams.get('lang')).toBe(lang);
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ' ' + view).toBe(true);
        }
      }
      for (const view of ['overview', 'inbox', 'credits', 'profile', 'terms', 'claims']) {
        await page.goto('/installers?view=' + view + '&lang=' + lang);
        await expect(page.locator('.a-app')).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        expect((await new AxeBuilder({ page }).include('.signal').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
        if (view === 'overview' || view === 'credits') await page.screenshot({ path: info.outputPath(view + '-' + lang + '-mobile.png'), fullPage: true });
        await page.setViewportSize({ width: 1440, height: 1000 });
        if (view === 'overview' || view === 'credits') expect((await new AxeBuilder({ page }).include('.signal').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
        if (view === 'overview' || view === 'credits') await page.screenshot({ path: info.outputPath(view + '-' + lang + '-desktop.png'), fullPage: true });
      }
    });
    test('search, status groups, withdrawal privacy and back navigation', async ({ page }) => {
      await page.setViewportSize({width:390,height:844});
      await page.goto('/installers?view=inbox&lang=' + lang);
      await expect(page.locator('.rows .row')).toHaveCount(2);
      await page.getByRole('button',{name:en?'Closed 1':'ปิดแล้ว 1',exact:true}).click();
      await expect(page.locator('.rows .row')).toHaveCount(1);
      await expect(page.locator('.rows .row')).toContainText('SM-TEST-042');
      await expect(page.locator('.signal')).not.toContainText('HIDDEN_PRIVATE');
      await expect(page.locator('.signal')).not.toContainText('999,999');
      await page.getByRole('searchbox').fill('HIDDEN_PRIVATE');
      await expect(page.locator('.rows .row')).toHaveCount(0);
      await page.getByRole('searchbox').fill('');
      await page.getByRole('button',{name:en?'Waiting 2':'รอติดต่อ 2',exact:true}).click();
      await page.getByRole('searchbox').fill('Sathon');
      await expect(page.locator('.rows .row')).toHaveCount(1);
      await page.getByRole('searchbox').fill('');
      await expect(page.locator('.rows .row').first()).toContainText('Synthetic Arun');
      await expect(page.locator('.rows .row').first()).toHaveAttribute('href',new RegExp('/'+fixture().deliveries[0].id+'\\?lang='+lang+'&tab=waiting$'));
      await page.locator('nav:visible').getByRole('link', { name: en ? 'Credits' : 'เครดิต', exact: true }).click();
      await expect(page.locator('.bal > b')).toContainText('18');
      await expect(page.getByRole('button', { name: (en ? 'Pay with ' : 'ชำระผ่าน ') + 'PromptPay' })).toBeDisabled();
      await page.goBack();
      await expect(page.locator('.rows')).toBeVisible();await expect(page.getByRole('button',{name:en?'Waiting 2':'รอติดต่อ 2',exact:true})).toHaveAttribute('aria-pressed','true');
    });
    test('details retain actions and reduced-motion support without fake competition', async ({ page }) => {
      await page.setViewportSize({width:1440,height:1000});
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/installers/enquiry/' + fixture().deliveries[0].id + '?lang=' + lang);
      await expect(page.getByRole('link', { name: '080 000 0000', exact: true })).toHaveAttribute('href', 'tel:0800000000');
      await expect(page.getByRole('group', { name: en ? 'Set the stage' : 'เลือกขั้นตอน' })).toBeVisible();
      await page.getByText(en?'Share with a team member':'แชร์กับทีมงาน',{exact:true}).click();
      await expect(page.getByRole('button', { name: en ? 'Create link' : 'สร้างลิงก์',exact:true })).toBeVisible();
      await expect(page.getByRole('button', { name: en ? 'Create replacement link' : 'สร้างลิงก์ใหม่',exact:true })).toHaveCount(0);
      await expect(page.locator('.signal')).not.toContainText('companies have contacted');
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await expect(page.locator('.mcall').getByRole('link',{name:en?'Call Synthetic Arun':'โทรหา Synthetic Arun'})).toBeVisible();
      expect((await new AxeBuilder({ page }).include('.signal').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
    });
    test('calling and manual copying keep the stage unchanged; stage and share controls use real actions',async({page})=>{
      await page.setViewportSize({width:1440,height:1000});
      const data=fixture(),item=data.deliveries[0],posts:unknown[]=[];
      await page.unroute('**/api/installer/portal**');
      await page.route('**/api/installer/portal**',async route=>{
        if(route.request().method()==='GET'){await route.fulfill({json:data});return;}
        const body=route.request().postDataJSON();posts.push(body);expect(new URL(route.request().url()).searchParams.get('lang')).toBe(lang);
        if(body.action==='report-outcome'){
          expect(body).toEqual({action:'report-outcome',deliveryId:item.id,outcome:'contacted'});item.outcome='contacted';await route.fulfill({json:{ok:true}});return;
        }
        expect(body).toEqual({action:'rotate-share-link',deliveryId:item.id});await route.fulfill({json:{url:'http://127.0.0.1:3000/installers/shared/synthetic-staff-token'}});
      });
      await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Synthetic denied clipboard');}}}));
      await page.goto('/installers/enquiry/'+item.id+'?lang='+lang);
      await expect(page.locator('#installer-page-title')).toBeFocused();
      const stages=page.getByRole('group',{name:en?'Set the stage':'เลือกขั้นตอน',exact:true});
      await expect(stages.getByRole('button',{name:en?'New':'ใหม่',exact:true})).toHaveAttribute('aria-pressed','true');
      const call=page.locator('.dact a[href^="tel:"]');await expect(call).toHaveAttribute('href','tel:0800000000');
      await call.evaluate(node=>node.addEventListener('click',event=>event.preventDefault()));await call.click();expect(posts).toHaveLength(0);
      await page.locator('.dact').getByRole('button',{name:en?'Copy':'คัดลอก',exact:true}).click();
      await expect(page.getByLabel(en?'Number to copy':'หมายเลขสำหรับคัดลอก',{exact:true})).toHaveValue('0800000000');expect(posts).toHaveLength(0);
      await expect(stages.getByRole('button',{name:en?'New':'ใหม่',exact:true})).toHaveAttribute('aria-pressed','true');
      await stages.getByRole('button',{name:en?'Contacted':'ติดต่อแล้ว',exact:true}).click();
      await expect(stages.getByRole('button',{name:en?'Contacted':'ติดต่อแล้ว',exact:true})).toHaveAttribute('aria-pressed','true');expect(posts).toHaveLength(1);
      await page.getByText(en?'Share with a team member':'แชร์กับทีมงาน',{exact:true}).click();
      await page.getByRole('button',{name:en?'Create link':'สร้างลิงก์',exact:true}).click();
      await expect(page.getByLabel(en?'Staff access link':'ลิงก์สำหรับทีมงาน',{exact:true})).toHaveValue('http://127.0.0.1:3000/installers/shared/synthetic-staff-token');
      await expect(page.getByRole('button',{name:en?'Create replacement link':'สร้างลิงก์ใหม่',exact:true})).toBeVisible();expect(posts).toHaveLength(2);
    });
    test('signed-out form remains usable on mobile', async ({ page, browserName }) => {
      await page.unroute('**/api/installer/portal**');
      await page.route('**/api/installer/portal**', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto('/installers?lang=' + lang);
      await expect(page.locator('.skip-link')).toHaveCount(0);
      const skip = page.getByRole('link', {name:en?'Skip to content':'ข้ามไปเนื้อหา',exact:true});
      await expect(skip).toHaveCount(1);
      await expect.poll(()=>skip.evaluate(element=>(element as HTMLElement).tabIndex)).toBe(0);
      expect(await skip.evaluate(node=>Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).find(element=>element.tabIndex>=0&&!(element as HTMLButtonElement).disabled&&element.getClientRects().length>0&&getComputedStyle(element).visibility!=='hidden')===node)).toBe(true);
      // Bundled Windows WebKit skips native links with both Tab and Alt+Tab,
      // even in minimal HTML. Check natural order plus actual focus/activation;
      // Chromium still exercises the first hardware-Tab step. This is not a
      // claim about physical Safari keyboard or assistive-technology behavior.
      if(browserName==='webkit')await skip.focus();else await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#installer-landing-main')).toBeFocused();
      await page.getByRole('button', {name:en?'Sign in':'เข้าสู่ระบบ',exact:true}).first().click();
      await expect(page.getByRole('heading', { name: en ? 'Sign in' : 'เข้าสู่ระบบ', exact: true })).toBeVisible();
      await page.getByLabel(en ? 'Email' : 'อีเมล', { exact: true }).fill('design@example.test');
      await expect(page.getByLabel(en ? 'Email' : 'อีเมล', { exact: true })).toHaveValue('design@example.test');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect((await new AxeBuilder({ page }).include('.signal').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']).analyze()).violations).toEqual([]);
    });
  });
}
