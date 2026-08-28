import { expect, test } from '@playwright/test';

const widths = [320, 360, 375, 390, 414, 430, 768];
const routes = [
  '/', '/estimate', '/estimate/results', '/how-it-works', '/solar-guide', '/methodology',
  '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies',
  '/en', '/en/estimate', '/en/estimate/results', '/en/how-it-works', '/en/solar-guide',
  '/en/methodology', '/en/about', '/en/contact', '/en/resources', '/en/privacy', '/en/terms', '/en/cookies',
  '/missing-page', '/en/missing-page',
];

const savedEstimate = {
  province: 'bangkok',
  location: { address: '99 Test Road, Bangkok', latitude: 13.7563, longitude: 100.5018, province: 'bangkok', source: 'manual-map', confirmed: true },
  electricityInputKind: 'kwh', monthlyKwh: 900, consumptionPeriod: 'average-12', tariffType: 'standard',
  daytimePattern: 'work-or-ac', daytimeLoads: ['air-conditioning', 'home-office'], acDaytimeHours: '2-4',
  roofMaterial: 'concrete-tile', shade: 'none', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
});

for (const width of widths) {
  test(`every important Thai and English route avoids document overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(layout.clientWidth + 1);
    }
  });
}

test('the 320px header, menu, language control, and estimator controls remain touch-friendly', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en');
  const header = page.locator('.site-header');
  await expect(header.getByRole('link', { name: 'SolarMatch Thailand home' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'View this page in Thai' })).toBeVisible();
  await expect(header.locator('details.mobile-menu > summary')).toBeVisible();
  await expect(header.locator(':scope > .site-shell > .header-actions > .button-small')).toBeHidden();

  await header.locator('details.mobile-menu > summary').click();
  const menuCta = header.getByRole('link', { name: 'Start free estimate' });
  await expect(menuCta).toBeVisible();
  const headerTargets = await header.locator('a:visible, summary:visible').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { name: element.textContent?.trim() ?? element.getAttribute('aria-label'), width: rect.width, height: rect.height };
  }));
  expect(headerTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);

  await page.goto('/en/estimate');
  const estimatorTargets = await page.locator('.estimate-card button:visible, .estimate-card input:visible').evaluateAll((elements) => elements
    .filter((element) => !(element instanceof HTMLInputElement && element.type === 'range'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return { name: element.textContent?.trim() ?? element.getAttribute('aria-label'), width: rect.width, height: rect.height };
    }));
  expect(estimatorTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);
});

test('results keep dense data inside an explicit accessible scroll region', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en/estimate/results');
  await page.locator('.lifetime-details > summary').click();
  const region = page.getByRole('region', { name: 'Scrollable cumulative-cost data table' });
  await expect(region).toBeVisible();
  const metrics = await region.evaluate((element) => {
    const table = element.querySelector('table');
    return {
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      tableFontSize: table ? Number.parseFloat(getComputedStyle(table).fontSize) : 0,
    };
  });
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
  expect(metrics.tableFontSize).toBeGreaterThanOrEqual(12);
  await region.focus();
  await expect(region).toBeFocused();
});

test('mobile hero imagery is local, responsive, disclosed, and collision-free', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ['/', '/en']) {
    await page.goto(route);
    const figure = page.locator('.hero-photo');
    const image = figure.locator('img');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('srcset', /solar-home-real-768\.webp 768w/);
    await expect(figure.locator('figcaption')).toContainText(route === '/' ? 'ภาพประกอบ' : 'Illustrative');
    const overlap = await figure.evaluate((element) => {
      const caption = element.querySelector('figcaption')?.getBoundingClientRect();
      const card = element.querySelector('.result-peek')?.getBoundingClientRect();
      if (!caption || !card) return true;
      return !(caption.right <= card.left || caption.left >= card.right || caption.bottom <= card.top || caption.top >= card.bottom);
    });
    expect(overlap, `${route} caption and example card`).toBe(false);

    const sectionOverlap = await page.locator('.hero-editorial').evaluate((element) => {
      const photo = element.querySelector('.hero-photo')?.getBoundingClientRect();
      const estimator = element.querySelector('.hero-estimator-panel')?.getBoundingClientRect();
      if (!photo || !estimator) return true;
      return !(photo.right <= estimator.left || photo.left >= estimator.right || photo.bottom <= estimator.top || photo.top >= estimator.bottom);
    });
    expect(sectionOverlap, `${route} photo and estimator`).toBe(false);
  }
});

test('result card groups align on desktop and return to natural height on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/en/estimate/results');
  for (const selector of ['.result-metrics-v2 article', '.energy-flow-grid article']) {
    const cards = page.locator(selector);
    await expect(cards).not.toHaveCount(0);
    const heights = await cards.evaluateAll((elements) => elements.map((element) => Math.round(element.getBoundingClientRect().height)));
    expect(new Set(heights).size, `${selector} desktop heights: ${heights.join(', ')}`).toBe(1);
  }
  await expect(page.locator('.result-metrics-v2')).not.toContainText(/\d+\.\d{4,}/);
  await expect(page.locator('.result-metrics-v2')).toContainText(/About \d+(?:\.\d)? years|Needs more information/);

  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en/estimate/results');
  const mobileRows = await page.locator('.result-metrics-v2 article').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).height));
  expect(mobileRows.every((height) => height !== '0px')).toBe(true);
});

test('landscape menus remain reachable and reduced-motion preferences are respected', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/en');
  const menu = page.locator('details.mobile-menu');
  await menu.locator('summary').click();
  const navigation = menu.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(navigation).toBeVisible();
  const menuMetrics = await navigation.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, viewport: window.innerHeight }));
  expect(menuMetrics.clientHeight).toBeLessThan(menuMetrics.viewport);
  expect(menuMetrics.scrollHeight).toBeGreaterThanOrEqual(menuMetrics.clientHeight);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/estimate');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await expect.poll(() => page.locator('.question-stage').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});
