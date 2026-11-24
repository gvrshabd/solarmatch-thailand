import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { mockSignalPortal, signalId, signalReady } from './signal-fixtures';

/**
 * Opt-in review captures of every installer app state on a 390 px phone, in Thai and English.
 * Fictional fixtures only. Set INSTALLER_APP_SCREENS to an ignored local directory, for example
 * test-results/app-screens/after, and run the mobile-chromium project against a local preview.
 */
const out = process.env.INSTALLER_APP_SCREENS;
const app = '/installers/app';
test.skip(!out, 'Set INSTALLER_APP_SCREENS to capture installer app review screens.');
test.use({ serviceWorkers: 'block', trace: 'off', viewport: { width: 390, height: 844 } });

type Shot = { name: string; overflowX: boolean };
const summary: Shot[] = [];
test.afterAll(() => { if (out) writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2)); });

async function capture(page: Page, lang: string, name: string) {
  await signalReady(page).catch(() => undefined);
  await page.evaluate(() => document.fonts.ready);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const dir = join(out!, lang);
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, name + '.png'), animations: 'disabled', caret: 'hide' });
  summary.push({ name: lang + '/' + name, overflowX });
}

// Calls, texts and calendar hand-offs stay inside the page during captures.
async function blockHandOffs(page: Page) {
  await page.addInitScript(() => document.addEventListener('click', event => {
    if ((event.target as Element).closest?.('a[href^="tel:"],a[href^="sms:"],a[href^="solarmatch-calendar:"]')) event.preventDefault();
  }, true));
}

for (const lang of ['th', 'en'] as const) {
  const t = (th: string, en: string) => lang === 'en' ? en : th;

  test(`${lang}: account and inbox states`, async ({ page }) => {
    await mockSignalPortal(page, 'approved', lang);
    await page.route('**/api/installer/portal**', route => route.fulfill({ status: 401, json: { error: 'unauthenticated' } }));
    await page.goto(`${app}?lang=${lang}`);
    await expect(page.getByRole('button', { name: t('เข้าสู่ระบบ', 'Sign in') })).toBeVisible();
    await capture(page, lang, '01-sign-in');

    for (const [state, name] of [['nocompany', '02-new-account'], ['pending', '03-pending-approval'], ['empty', '04-empty-inbox'], ['approved', '05-busy-inbox']] as const) {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await mockSignalPortal(page, state, lang);
      await page.goto(`${app}?lang=${lang}`);
      await capture(page, lang, name);
    }
  });

  test(`${lang}: enquiry next step states`, async ({ page }) => {
    await blockHandOffs(page);
    const { data } = await mockSignalPortal(page, 'approved', lang);
    const open = (n: number) => page.goto(`${app}/enquiry/${signalId(n)}?lang=${lang}`);
    await open(39);
    await capture(page, lang, '06-enquiry-new');
    await page.locator('.ns-card a[href^="tel:"]').first().click();
    await capture(page, lang, '07-enquiry-calling');
    await page.getByRole('button', { name: t('ไม่รับสาย', 'No answer') }).click();
    await expect(page.locator('.ns-card textarea')).toBeVisible();
    await capture(page, lang, '08-enquiry-text-after-no-answer');
    await open(33);
    await capture(page, lang, '09-enquiry-book-visit');
    await open(30);
    await capture(page, lang, '10-enquiry-visit-booked');
    await open(28);
    await capture(page, lang, '11-enquiry-quoted');
    await page.getByRole('button', { name: t('ยังไม่ตกลง', 'Not this time') }).click();
    await capture(page, lang, '12-enquiry-close-reasons');
    await open(22);
    await capture(page, lang, '13-enquiry-won');
    await open(25);
    await capture(page, lang, '14-enquiry-withdrawn');
    expect(data.deliveries.length).toBeGreaterThan(0);
  });

  test(`${lang}: failures, credits and company`, async ({ page }) => {
    await blockHandOffs(page);
    await mockSignalPortal(page, 'approved', lang);
    await page.goto(`${app}/enquiry/${signalId(41)}?lang=${lang}`);
    await page.locator('.ns-card').waitFor();
    await page.route('**/api/installer/portal**', route => route.request().method() === 'POST'
      ? route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } }) : route.fallback());
    await page.locator('.ns-card a[href^="tel:"]').first().click();
    await page.getByRole('button', { name: t('ได้คุยแล้ว', 'Spoke with them') }).click();
    await page.waitForTimeout(300);
    await capture(page, lang, '15-save-failed');

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockSignalPortal(page, 'approved', lang);
    await page.route('**/api/installer/portal**', route => route.abort('internetdisconnected'));
    await page.goto(`${app}?lang=${lang}`);
    await page.waitForTimeout(500);
    await capture(page, lang, '16-offline');

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await mockSignalPortal(page, 'approved', lang);
    await page.goto(`${app}?view=credits&lang=${lang}`);
    await capture(page, lang, '17-credits');
    await page.goto(`${app}?view=claims&lang=${lang}`);
    await capture(page, lang, '18-claims');
    await page.goto(`${app}?view=profile&lang=${lang}`);
    await capture(page, lang, '19-company');
    await page.locator('#installer-account').scrollIntoViewIfNeeded();
    await page.locator('.account-delete summary').click();
    await page.locator('#installer-account').scrollIntoViewIfNeeded();
    await capture(page, lang, '20-account-deletion');
    await page.goto(`/installers/delete-account?lang=${lang}`);
    await capture(page, lang, '21-deletion-web-page');
  });

  test(`${lang}: store app credits`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      serviceWorkers: 'block', userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 SolarMatchInstallers/Android' });
    const page = await context.newPage();
    await mockSignalPortal(page, 'approved', lang);
    await page.goto(`${app}?view=credits&lang=${lang}`);
    await expect(page.getByText(t('ไม่สามารถซื้อเครดิตในแอปนี้ได้', 'Credits can’t be bought in this app.'), { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(t('ชำระผ่าน', 'Pay with')) })).toHaveCount(0);
    await capture(page, lang, '22-store-app-credits');
    await context.close();
  });
}
