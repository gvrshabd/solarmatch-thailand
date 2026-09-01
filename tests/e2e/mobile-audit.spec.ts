import { expect, test } from '@playwright/test';

const widths = [320, 360, 375, 390, 414, 430, 768];
const routes = [
  '/', '/estimate', '/estimate/results', '/how-it-works', '/solar-guide', '/methodology', '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies',
  '/en', '/en/estimate', '/en/estimate/results', '/en/how-it-works', '/en/solar-guide', '/en/methodology', '/en/about', '/en/contact', '/en/resources', '/en/privacy', '/en/terms', '/en/cookies',
  '/missing-page', '/en/missing-page',
];

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', installationTimeframe: 'one-three-months', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
});

for (const width of widths) {
  test(`important Thai and English routes avoid document overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(layout.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(layout.clientWidth + 1);
    }
  });
}

test('320px header and estimator controls remain touch-friendly', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en');
  const header = page.locator('.site-header');
  await expect(header.getByRole('link', { name: 'SolarMatch Thailand home' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'View this page in Thai' })).toBeVisible();
  await header.locator('details.mobile-menu > summary').click();
  const targets = await header.locator('a:visible, summary:visible').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect(); return { name: element.textContent?.trim(), width: rect.width, height: rect.height };
  }));
  expect(targets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);

  await page.goto('/en/estimate');
  const estimatorTargets = await page.locator('.estimate-card button:visible, .estimate-card input:visible, .estimate-card select:visible').evaluateAll((elements) => elements.filter((element) => !(element instanceof HTMLInputElement && element.type === 'range')).map((element) => {
    const rect = element.getBoundingClientRect(); return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height };
  }));
  expect(estimatorTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);
});

test('mobile homepage image, credit, message, and estimator do not collide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ['/', '/en']) {
    await page.goto(route);
    const figure = page.locator('.hero-photo');
    await expect(figure.locator('img')).toHaveAttribute('srcset', /solar-home-real-768\.webp 768w/);
    await expect(figure.locator('figcaption')).toContainText('Kindel Media');
    const collision = await page.locator('.hero-editorial').evaluate((element) => {
      const photo = element.querySelector('.hero-photo')?.getBoundingClientRect();
      const estimator = element.querySelector('.hero-estimator-panel')?.getBoundingClientRect();
      if (!photo || !estimator) return true;
      return !(photo.bottom <= estimator.top || estimator.bottom <= photo.top);
    });
    expect(collision).toBe(false);
  }
});

test('mobile results keep metrics, charts, tables, and lead fields readable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en/estimate/results');
  await expect(page.locator('.result-metrics-v3 article')).toHaveCount(4, { timeout: 10_000 });
  await expect(page.locator('.result-metrics-v3')).not.toContainText(/Needs more information/);
  await expect(page.getByRole('table', { name: 'Key lifetime cost points' })).toBeVisible();
  await expect(page.locator('.result-fact-section .solar-fact-card')).toHaveCount(0);
  const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});

test('landscape menu remains reachable and reduced motion is respected', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/en');
  const menu = page.locator('details.mobile-menu');
  await menu.locator('summary').click();
  await expect(menu.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/estimate');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.goto('/en/estimate/results');
  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  await expect(page.locator('.solar-loading-indicator')).toHaveCSS('animation-name', 'none');
});
