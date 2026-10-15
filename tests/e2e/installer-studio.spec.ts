import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { InstallerPortalData } from '../../lib/installer/portal-contract';

for (const lang of ['en', 'th']) test(`disabled installer service hides registration and recovery (${lang})`, async ({ page }) => {
  await page.route('**/api/installer/portal*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'portal_unavailable' }) }));
  await page.goto(`/installers?lang=${lang}`);
  await expect(page.getByRole('heading', { level:1, name: lang === 'en' ? 'Homeowners who already know their numbers.' : 'ลูกค้าที่รู้ตัวเลขของตัวเองมาแล้ว' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.getByRole('button',{name:lang==='en'?'Applications unavailable':'ยังไม่เปิดรับสมัคร',exact:true}).first()).toBeDisabled();
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
      await page.goto('/installers?lang=' + lang);
      await expect(page.locator('.callnext')).toContainText('Synthetic Arun');
      const nav = page.getByRole('navigation', { name: en ? 'Installer navigation' : 'เมนูผู้ติดตั้ง' });
      for (const width of [320, 360, 390, 430, 768, 900, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const view of [en ? 'Today' : 'วันนี้', en ? 'Enquiries' : 'คำขอ', en ? 'Credits' : 'เครดิต', en ? 'Company' : 'บริษัท']) {
          await nav.getByRole('button', { name: view, exact: true }).click();
          await expect(page.locator('#installer-page-title')).toBeFocused();
          await page.evaluate(() => document.fonts.ready);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ' ' + view).toBe(true);
        }
      }
      for (const view of ['overview', 'inbox', 'credits', 'profile', 'terms', 'claims']) {
        await page.goto('/installers?view=' + view + '&lang=' + lang);
        await expect(page.locator('.installer-workspace')).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        expect((await new AxeBuilder({ page }).include('.installer-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
        if (view === 'overview' || view === 'credits') await page.screenshot({ path: info.outputPath(view + '-' + lang + '-mobile.png'), fullPage: true });
        await page.setViewportSize({ width: 1440, height: 1000 });
        if (view === 'overview' || view === 'credits') expect((await new AxeBuilder({ page }).include('.installer-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
        if (view === 'overview' || view === 'credits') await page.screenshot({ path: info.outputPath(view + '-' + lang + '-desktop.png'), fullPage: true });
      }
    });
    test('search, status groups, withdrawal privacy and back navigation', async ({ page }) => {
      await page.goto('/installers?view=inbox&lang=' + lang);
      await page.getByRole('button',{name:en?'All 3':'ทั้งหมด 3',exact:true}).click();
      await expect(page.locator('.installer-enquiry-card')).toHaveCount(3);
      await expect(page.locator('.installer-shell')).not.toContainText('HIDDEN_PRIVATE');
      await expect(page.locator('.installer-shell')).not.toContainText('999,999');
      await page.getByRole('searchbox').fill('HIDDEN_PRIVATE');
      await expect(page.locator('.installer-enquiry-card')).toHaveCount(0);
      await page.getByRole('searchbox').fill('Sathon');
      await expect(page.locator('.installer-enquiry-card')).toHaveCount(1);
      await page.getByRole('searchbox').fill('');
      await page.getByRole('button', { name: en ? 'New 1' : 'ใหม่ 1', exact: true }).click();
      await expect(page.locator('.installer-enquiry-card')).toContainText('SM-TEST-039');
      await page.getByRole('navigation').getByRole('button', { name: en ? 'Credits' : 'เครดิต', exact: true }).click();
      await expect(page.locator('.balance .big')).toHaveText('18');
      await expect(page.getByRole('button', { name: (en ? 'Pay with ' : 'ชำระผ่าน ') + 'PromptPay' })).toBeDisabled();
      await page.goBack();
      await expect(page.locator('.installer-enquiry-grid')).toBeVisible();
    });
    test('details retain actions and reduced-motion support without fake competition', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/installers/enquiry/' + fixture().deliveries[0].id + '?lang=' + lang);
      await expect(page.getByRole('link', { name: '080 000 0000', exact: true })).toHaveAttribute('href', 'tel:0800000000');
      await expect(page.getByRole('group', { name: en ? 'Report outcome' : 'รายงานผล' })).toBeVisible();
      await page.getByText(en?'Share with staff':'แชร์กับทีมงาน',{exact:true}).click();
      await expect(page.getByRole('button', { name: en ? 'Create replacement link' : 'สร้างลิงก์ใหม่' })).toBeVisible();
      await expect(page.locator('.installer-shell')).not.toContainText('companies have contacted');
      await page.setViewportSize({ width: 320, height: 800 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect((await new AxeBuilder({ page }).include('.installer-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    });
    test('signed-out form remains usable on mobile', async ({ page }) => {
      await page.unroute('**/api/installer/portal**');
      await page.route('**/api/installer/portal**', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
      await page.setViewportSize({ width: 320, height: 800 });
      await page.goto('/installers?lang=' + lang);
      await expect(page.locator('.skip-link')).toHaveCount(0);
      const skip = page.getByRole('link', {name:en?'Skip to content':'ข้ามไปเนื้อหา',exact:true});
      await expect(skip).toHaveCount(1);
      await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await page.getByRole('button', {name:en?'Sign in':'เข้าสู่ระบบ',exact:true}).first().click();
      await expect(page.getByRole('heading', { name: en ? 'Sign in' : 'เข้าสู่ระบบ', exact: true })).toBeVisible();
      await page.getByLabel(en ? 'Email' : 'อีเมล', { exact: true }).fill('design@example.test');
      await expect(page.getByLabel(en ? 'Email' : 'อีเมล', { exact: true })).toHaveValue('design@example.test');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      expect((await new AxeBuilder({ page }).include('.installer-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    });
  });
}
