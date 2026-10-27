import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { homeownerDesignV3Questionnaire as questionnaire, calculatorV3Questionnaire } from '../../config/assessment';

const answers = {
  estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17', monthlyBillThb: 6000,
  province: 'bangkok', district: 'sathon', projectType: 'new-rooftop', propertyType: 'detached-home',
  ownershipStatus: 'owner', activelyPlanningSolar: true, planningTimeframe: 'within-3-months',
  daytimePattern: 'high', roofArea: '100-200', daytimeLoads: ['none'], shade: 'almost-none',
  roofMaterial: 'concrete-tile', quoteContactRequested: false,
};
for (const lang of ['en', 'th'] as const) {
  const path = lang === 'en' ? '/en/estimate' : '/estimate';
  test(`v3 bill-first, native location and no-contact complete journey ${lang}`, async ({ page }) => {
    test.setTimeout(120000);
    let submissions = 0;
    await page.route('**/api/**', route => { if (route.request().method() !== 'GET') submissions++; return route.fulfill({ status: 503, json: { error: 'synthetic_offline' } }); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(value => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 11, answers: value, step: 0 })), answers);
    await page.goto(path);
    await expect(page.locator('#estimate-question')).toHaveText(questionnaire.questions[0].title[lang]);
    await expect(page.locator('#monthly-bill')).toBeEnabled();
    await page.locator('#monthly-bill').fill('60000');
    await expect(page.locator('.bill-range')).toHaveAttribute('max', '25000');
    await expect(page.locator('.bill-range')).toHaveValue('25000');
    await expect(page.locator('#monthly-bill')).toHaveValue('60,000');
    await page.locator('#monthly-bill').fill('6000');
    for (let i = 0; i < questionnaire.questions.length; i++) {
      const question = questionnaire.questions[i];
      await expect(page.locator('#estimate-question')).toHaveText(question.title[lang]);
      await expect(page.locator('.estimate-actions .button').last()).toBeEnabled();
      if (question.id === 'province') {
        await expect(page.locator('#estimate-province')).toHaveValue('bangkok');
        await expect(page.locator('#estimate-district')).toHaveValue('sathon');
        expect(await page.locator('#estimate-district').evaluate(el => el.tagName)).toBe('SELECT');
        for (const width of [360, 390, 600, 768, 1000, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          // Read both boxes in one layout frame: sequential remote reads can
          // straddle the existing viewport transition in Windows WebKit.
          const topDifference=await page.evaluate(()=>Math.abs(document.getElementById('estimate-province')!.getBoundingClientRect().top-document.getElementById('estimate-district')!.getBoundingClientRect().top));
          if (width >= 600) expect(topDifference).toBeLessThan(2);
        }
        expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
      }
      if (question.id === 'quoteContactRequested') {
        await expect(page.locator('.quote-consent-check')).toHaveCount(0);
        await expect(page.getByRole('radio', { name: /Test|ทดสอบ/ })).toHaveCount(0);
      }
      await page.locator('.estimate-actions .button').last().click();
    }
    await expect(page).toHaveURL(/estimate\/results/);
    await expect(page.locator('.rhero')).toBeVisible();
    expect(submissions).toBe(0);
  });
  test(`v3 restores qv7 position by question ID, not index ${lang}`, async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
    await page.addInitScript(value => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 10, answers: value, step: 0 })), answers);
    await page.goto(path);
    await expect(page.locator('#estimate-question')).toHaveText(calculatorV3Questionnaire.questions[0].title[lang]);
    await expect(page.locator('.estimate-actions .button').last()).toBeEnabled();
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!).version)).toBe(11);
  });
}

test('editing a completed result never restores prior referral consent', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(value => sessionStorage.setItem('solarmatch:estimate', JSON.stringify({ ...value, quoteContactRequested: true, quoteConsentAccepted: true })), answers);
  await page.goto('/en/estimate');
  await expect(page.locator('#monthly-bill')).toBeEnabled();
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft') || '{}').version)).toBe(11);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!).answers.quoteConsentAccepted)).toBeUndefined();
});
