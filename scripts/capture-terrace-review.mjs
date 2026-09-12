/** Local visual review only. All submission traffic is blocked, never sent. */
import { chromium } from '@playwright/test';
import { resolve, join } from 'node:path';
import { mkdir } from 'node:fs/promises';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)) throw new Error('Use a local review server only.');
const output = resolve(process.argv[2] ?? '../solarmatch-terrace-review');
await mkdir(output, { recursive: true });
const answers = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', daytimePattern: 'high',
  daytimeLoads: ['air-conditioning', 'pump'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false,
};
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const [format, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.route('**/api/leads', (route) => route.abort());
    await context.route('https://tile.openstreetmap.org/**', (route) => route.abort());
    const page = await context.newPage();
    const capture = async (name) => {
      await page.evaluate(() => document.fonts.ready);
      for (const img of await page.locator('main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate((element) => element.decode().catch(() => undefined));
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: join(output, `${format}-${name}.png`), fullPage: true });
      await page.screenshot({ path: join(output, `${format}-${name}-viewport.png`) });
    };
    for (const locale of ['en', 'th']) {
      const prefix = locale === 'en' ? '/en' : '';
      await page.goto(baseURL + (prefix || '/'));
      await capture(`${locale}-home`);
      await page.evaluate((value) => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 9, answers: value, step: 1 })), answers);
      await page.goto(baseURL + prefix + '/estimate');
      await page.locator('#monthly-bill').waitFor();
      await capture(`${locale}-bill`);
      await page.evaluate((value) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(value)), answers);
      await page.goto(baseURL + prefix + '/estimate/results');
      await page.locator('.result-metrics-v3').waitFor({ timeout: 15_000 });
      await capture(`${locale}-results`);
      await page.goto(baseURL + prefix + '/privacy');
      await capture(`${locale}-privacy`);
    }
    // Enable only the local visual fixture; no operational settings are written.
    await page.route('**/api/assessment/config', async (route) => {
      const response = await route.fetch();
      const configuration = await response.json();
      configuration.liveLeadSubmissions = true;
      configuration.contact.enabled = true;
      configuration.contact.mode = 'shared_solar_company_handoff';
      await route.fulfill({ response, json: configuration });
    });
    await page.evaluate((value) => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 9, answers: { ...value, quoteContactRequested: undefined }, step: 10 })), answers);
    await page.goto(baseURL + '/en/estimate');
    await page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me', exact: true }).click();
    await page.getByRole('checkbox', { name: /I explicitly consent/ }).check();
    await capture('en-consent');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.locator('#contact-form-title').waitFor();
    await capture('en-contact');
    await context.close();
  }
} finally { await browser.close(); }
console.log(`Local, non-submitting review captures: ${output}`);
