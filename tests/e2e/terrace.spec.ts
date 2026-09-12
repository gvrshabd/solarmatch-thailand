import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const answers = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', daytimePattern: 'high',
  daytimeLoads: ['air-conditioning', 'pump'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false,
};

test('Terrace static surfaces retain accessibility and stay within the viewport', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript((value) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(value)), answers);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  for (const route of ['/en', '/', '/en/estimate', '/estimate', '/en/estimate/results', '/estimate/results', '/en/privacy', '/privacy']) {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (route.includes('results')) {
      await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5, { timeout: 15_000 });
      await expect(page.locator('.results-page')).toHaveCSS('opacity', '1');
    }
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => (element as HTMLImageElement).decode().catch(() => undefined));
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), route).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-') || 'thai-home'}-viewport.png`), fullPage: false });
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(audit.violations, `${route}: ${JSON.stringify(audit.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })))}`).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${route.replaceAll('/', '-') || 'thai-home'}.png`), fullPage: true });
  }
  expect(requests.filter((url) => /\.(mp4|webm|mov)(?:\?|$)|cinematic.*frames/i.test(url))).toEqual([]);
  await expect(page.locator('video, canvas[data-cinematic]')).toHaveCount(0);
});

test('Terrace mobile menu closes with Escape and returns keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en');
  const summary = page.locator('.mobile-menu summary');
  await summary.click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.getByRole('button', { name: 'Close menu', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  await summary.click();
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await expect(summary).toBeFocused();
});

test('Terrace is not applied to protected admin', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.locator('.terrace-public')).toHaveCount(0);
  await expect(page.locator('.terrace-hero,.terrace-assessment-aside')).toHaveCount(0);
});
