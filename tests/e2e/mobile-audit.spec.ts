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
  province: 'bangkok', monthlyBillThb: 4500, daytimeUsage: 'medium', authority: 'owner',
  propertyType: 'detached', roofKnown: false, shade: 'unknown', timing: 'research', energyInterest: 'solar',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
});

test('every important Thai and English route avoids document overflow at required widths', async ({ page }) => {
  test.setTimeout(240_000);
  for (const width of widths) {
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
  }
});

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
    await expect(image).toHaveAttribute('srcset', /solar-home-ai-768\.webp 768w/);
    await expect(figure.locator('figcaption')).toContainText(route === '/' ? 'AI' : 'AI-generated');
    const overlap = await figure.evaluate((element) => {
      const caption = element.querySelector('figcaption')?.getBoundingClientRect();
      const card = element.querySelector('.result-peek')?.getBoundingClientRect();
      if (!caption || !card) return true;
      return !(caption.right <= card.left || caption.left >= card.right || caption.bottom <= card.top || caption.top >= card.bottom);
    });
    expect(overlap, `${route} caption and example card`).toBe(false);
  }
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
