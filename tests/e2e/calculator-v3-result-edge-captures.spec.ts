import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { attributionFixture } from '../../scripts/calculator-benefit-attribution-v3';
import { calculateEstimate } from '../../lib/calculator';
import type { EstimateAnswers } from '../../lib/calculator/types';

test('capture real negative, no-payback and unavailable result states', async ({ browser }) => {
  test.skip(process.env.CAPTURE_HOMEOWNER_V3 !== '1', 'Opt-in synthetic local visual capture.');
  test.setTimeout(180_000);
  const quotation = { quoteSystemKw: 5.005, quoteModuleCount: 7, quoteModuleWp: 715, quoteInverterAcKw: 5, quoteBatteryIncluded: false };
  const cases: Array<{ name: string; changes: Partial<EstimateAnswers> }> = [
    { name: 'negative', changes: { ...quotation, quoteCashPriceThb: 900_000 } },
    { name: 'no-payback', changes: { ...quotation, quoteCashPriceThb: 4_000_000 } },
    { name: 'unsupported', changes: { projectType: 'solar-with-battery' } },
    { name: 'no-feasible', changes: { exactRoofAreaSqm: 1 } },
    { name: 'exact-quote', changes: { ...quotation, quoteCashPriceThb: 150_123.45 } },
  ];
  const records: unknown[] = [];
  for (const locale of ['en', 'th'] as const) for (const scenario of cases) {
    const answers: EstimateAnswers = { ...attributionFixture, estimateModelVersion: 'energy-v3', ...scenario.changes };
    const model = calculateEstimate(answers);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const operations: string[] = [];
    page.on('request', request => { if (/\/api\/(?:leads|enquiries|assessment\/submit)/.test(request.url())) operations.push(request.url()); });
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'synthetic_edge_capture' } }));
    await page.addInitScript(answers => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(answers)), answers);
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'}/${locale === 'en' ? 'en/' : ''}estimate/results`);
    await expect(page.locator('.rhero h1')).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    if (scenario.name === 'negative' || scenario.name === 'no-payback') {
      expect(model.planningTwentyFiveYearNetBenefitThb).toBeLessThan(0);
      await expect(page.locator('.v2-negative-verdict')).toBeVisible();
    }
    if (scenario.name === 'no-payback') {
      expect(model.planningPaybackYears).toBeNull();
      await expect(page.locator('.rstats > div').last().locator('b')).toHaveText('—');
    }
    if (scenario.name === 'unsupported' || scenario.name === 'no-feasible') {
      expect(model.modelStatus).toBe(scenario.name === 'unsupported' ? 'unsupported' : 'no-feasible-option');
      await expect(page.locator('.rhero .ba')).toHaveCount(0);
      await expect(page.locator('.rstats > div').first().locator('b')).toHaveText('—');
    }
    for (const width of scenario.name === 'exact-quote' ? [320, 360, 390, 414, 1440] : [390, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: `docs/design-v3-comparison/implementation-results-${scenario.name}-${locale}-${width}.png`, fullPage: true, scale: 'css' });
      await page.screenshot({ path: `docs/design-v3-comparison/viewport-implementation-results-${scenario.name}-${locale}-${width}.png`, scale: 'css' });
      records.push(await page.evaluate(({ locale, name, width, status, net, payback }) => ({
        locale, name, width, status, net, payback,
        statistics: [...document.querySelectorAll('.rstats b')].map(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), cell = node.parentElement!.getBoundingClientRect();
          return { text: node.textContent, width: node.clientWidth, contentWidth: node.scrollWidth,
            textRight: text.right, cellRight: cell.right, crossesCell: text.right > cell.right + 1 };
        }),
      }), { locale, name: scenario.name, width, status: model.modelStatus, net: model.planningTwentyFiveYearNetBenefitThb, payback: model.planningPaybackYears }));
      if (scenario.name === 'exact-quote') {
        const crosses = await page.locator('.rstats > div').nth(1).locator('b').evaluate(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          return range.getBoundingClientRect().right > node.parentElement!.getBoundingClientRect().right + 1;
        });
        expect(crosses).toBe(false);
      }
    }
    expect(operations).toEqual([]);
    await context.close();
  }
  await writeFile('docs/design-v3-comparison/results-edge-metrics.json', JSON.stringify(records, null, 2));
});
