import { expect, test } from '@playwright/test';

for (const locale of ['en', 'th'] as const) {
  const prefix = locale === 'en' ? '/en' : '';
  test(`${locale}: About is removed and Terms preserve all clauses in continuous prose`, async ({ page }) => {
    const removed = await page.goto(`${prefix}/about`);
    expect(removed?.status()).toBe(404);
    await page.goto(prefix || '/');
    await expect(page.locator('a[href="/about"],a[href="/en/about"]')).toHaveCount(0);
    await page.goto(`${prefix}/terms`);
    await expect(page.locator('.terms-continuous')).toBeVisible();
    await expect(page.locator('.terms-continuous > span')).toHaveCount(16);
    await expect(page.locator('.terms-continuous #liability')).toBeVisible();
    await expect(page.locator('.terms-continuous #law')).toBeVisible();
    await expect(page.locator('.legal-shell article section,.legal-shell article ul')).toHaveCount(0);
  });

  test(`${locale}: unavailable collection never offers a dead-end Yes or sends personal information`, async ({ page }) => {
    let submissions = 0;
    await page.route('**/api/leads', (route) => { submissions++; return route.abort(); });
    await page.route('**/api/assessment/config', async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      config.liveLeadSubmissions = false;
      config.contact.enabled = false;
      await route.fulfill({ response, json: config });
    });
    await page.addInitScript(() => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 9, step: 10, answers: {
      province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true,
      planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home',
      ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning'],
      airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: true,
    } })));
    await page.goto(`${prefix}/estimate`);
    await expect(page.getByRole('status').filter({ hasText: locale === 'en' ? 'Contact requests are currently unavailable' : 'ขณะนี้ยังไม่สามารถรับคำขอ' })).toBeVisible();
    await expect(page.locator('.quote-consent-check,input[type="tel"],.question-stage [role="radio"]')).toHaveCount(0);
    await page.getByRole('button', { name: locale === 'en' ? 'View my estimate' : 'ดูผลประเมิน', exact: true }).click();
    await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5, { timeout: 15_000 });
    expect(submissions).toBe(0);
  });
}
