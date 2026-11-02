import { expect, test } from '@playwright/test';
import legalReviewCopy from '../../config/installer-commercial-copy';

for (const locale of ['en', 'th'] as const) {
  const prefix = locale === 'en' ? '/en' : '';
  test(`${locale}: legal pages render the supplied copy, placeholders, and localized legal links`, async ({ page }) => {
    for (const type of ['privacy', 'terms', 'cookies'] as const) {
      const legalDocument = legalReviewCopy.documents[type];
      await page.goto(`${prefix}/${type}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(legalDocument.title[locale]);
      await expect(page.locator('.legal-shell header')).toContainText(locale === 'en' ? '[EFFECTIVE_DATE_EN]' : '[EFFECTIVE_DATE_TH]');
      await expect(page.locator('.legal-shell header')).toContainText('[VERSION]');
      for (const [index, section] of legalDocument.sections.entries()) {
        const rendered = page.locator(`.legal-shell #${section.id}`);
        await expect(rendered.locator('h2')).toHaveText(`${index + 1}. ${section.title[locale]}`);
        await expect(rendered.locator(':scope > p')).toHaveText(section.paragraphs.map((paragraph) => paragraph[locale]));
      }
      for (const link of await page.locator('.legal-shell article a').all()) {
        await expect(link).toHaveAttribute('href', new RegExp(`^${prefix}/(?:privacy|terms|cookies)$`));
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    }
  });

  test(`${locale}: About is removed and Terms use the supplied review clauses in readable sections`, async ({ page }) => {
    const removed = await page.goto(`${prefix}/about`);
    expect(removed?.status()).toBe(404);
    await page.goto(prefix || '/');
    await expect(page.locator('a[href="/about"],a[href="/en/about"]')).toHaveCount(0);
    await page.goto(`${prefix}/terms`);
    await expect(page.locator('.terms-continuous')).toHaveCount(0);
    await expect(page.locator('.legal-shell article section')).toHaveCount(8);
    await expect(page.locator('.legal-shell article section > h2')).toHaveCount(8);
    await expect(page.locator('.legal-shell #liability > p').first()).toBeVisible();
    await expect(page.locator('.legal-shell #law > h2')).toBeVisible();
  });

  test(`${locale}: unavailable collection never offers a dead-end Yes or sends personal information`, async ({ page }) => {
    let submissions = 0;
    await page.route('**/api/leads', (route) => { submissions++; return route.abort(); });
    await page.route('**/api/assessment/config', async (route) => {
      const response = await route.fetch();
      const config = await response.json();
      config.liveLeadSubmissions = false;
      config.contact.enabled = false;
      config.contactReviewAvailable = false;
      config.accessRestrictedSession = false;
      await route.fulfill({ response, json: config });
    });
    await page.addInitScript(() => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 11, step: 11, answers: {
      estimateModelVersion:'energy-v3',calculationReferenceDate:'2026-11-03',roofArea:'100-200',
      province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true,
      planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home',
      ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning'],
      airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: true,
    } })));
    await page.goto(`${prefix}/estimate`);
    await expect(page.getByRole('status').filter({ hasText: locale === 'en' ? 'Installer contact requests are currently unavailable' : 'ขณะนี้ยังไม่เปิดรับคำขอให้ผู้ติดตั้งติดต่อกลับ' })).toBeVisible();
    await expect(page.locator('.quote-consent-check,input[type="tel"]')).toHaveCount(0);
    await expect(page.getByRole('radio', { name: locale === 'en' ? /^Test/ : /^ทดสอบ/ })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: locale === 'en' ? /^Yes,/ : /^ใช่ / })).toHaveCount(0);
    await page.getByRole('button', { name: locale === 'en' ? 'View my estimate' : 'ดูผลประเมิน', exact: true }).click();
    await expect(page.locator('.rstats > div')).toHaveCount(3, { timeout: 15_000 });
    expect(submissions).toBe(0);
  });
}
