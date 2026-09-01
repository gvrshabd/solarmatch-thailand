import AxeBuilder from '@axe-core/playwright';
import { expect, test, type TestInfo } from '@playwright/test';

const contentRoutes = [
  '/', '/estimate', '/estimate/results', '/how-it-works', '/solar-guide', '/methodology',
  '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies',
  '/en', '/en/estimate', '/en/estimate/results', '/en/how-it-works', '/en/solar-guide',
  '/en/methodology', '/en/about', '/en/contact', '/en/resources', '/en/privacy', '/en/terms', '/en/cookies',
];
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', installationTimeframe: 'one-three-months', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

function desktopOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One browser project is sufficient for protocol and automated accessibility checks.');
}

test('admin routes fail closed while public assessment configuration stays readable', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  // Run this document check before the automated-fetch matrix. A plain fetch
  // avoids applying Next's client-navigation protocol to the dynamic route.
  const admin = await fetch(new URL('/admin', baseUrl), { headers: { accept: 'text/html' } });
  expect(admin.status).toBe(200);
  const adminHtml = await admin.text();
  expect(adminHtml).toContain('Access denied');
  expect(adminHtml).toMatch(/<meta name="robots" content="noindex, nofollow/i);
  expect(adminHtml).not.toContain('Residential contact submissions');

  const session = await request.get('/admin/api/session');
  expect(session.status()).toBe(401);
  expect(await session.json()).toMatchObject({ error: 'unauthorized' });

  const forged = await request.get('/admin/api/session', { headers: { 'cf-access-authenticated-user-email': 'deluxejahseh@gmail.com' } });
  expect(forged.status()).toBe(401);

  const configuration = await request.get('/api/assessment/config');
  expect(configuration.status()).toBe(200);
  const publicConfiguration = await configuration.json();
  expect(publicConfiguration.liveLeadSubmissions).toBe(false);
  expect(publicConfiguration.assessmentToken).toBeNull();
  expect(publicConfiguration.receivingCompany).toBeNull();
});

test('robots and review files express the intended agent policy', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  const robotsText = await robots.text();
  expect(robotsText).toMatch(/User-Agent:\s*Claude-User[\s\S]*Allow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*ClaudeBot[\s\S]*Disallow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*Claude-SearchBot[\s\S]*Disallow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*\*[\s\S]*Allow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*\*[\s\S]*Disallow:\s*\/admin\//i);

  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(llms.headers()['content-type']).toContain('text/plain');
  await expect.poll(async () => (await llms.text()).includes('residential-solar assessment')).toBe(true);
});

test('public HTML is fetchable with browser, generic automation, and Anthropic user agents', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const userAgents = ['Mozilla/5.0', 'SolarMatchAudit/1.0', 'Claude-User', 'Claude-SearchBot', 'ClaudeBot'];
  for (const userAgent of userAgents) {
    for (const path of ['/', '/en']) {
      const response = await request.get(path, { headers: { 'user-agent': userAgent } });
      expect(response.status(), `${userAgent} GET ${path}`).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(response.headers()['cf-mitigated']).toBeUndefined();
      const html = await response.text();
      expect(html, `${userAgent} SSR ${path}`).toMatch(/<h1[\s>]/i);
    }
    const head = await request.head('/methodology', { headers: { 'user-agent': userAgent } });
    expect(head.status(), `${userAgent} HEAD /methodology`).toBe(200);
    expect(head.headers()['content-type']).toContain('text/html');
  }

  for (const path of ['/en/methodology', '/estimate/results']) {
    const response = await request.get(path, { headers: { 'user-agent': 'SolarMatchAudit/1.0' } });
    expect(response.status(), `generic automation GET ${path}`).toBe(200);
    expect((await response.text()), `generic automation SSR ${path}`).toMatch(/<h1[\s>]/i);
  }
});

test('SSR metadata, language boundaries, and images are safe', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const thai = await (await request.get('/methodology')).text();
  expect(thai).toMatch(/<meta name="robots" content="noindex, follow"/i);
  expect(thai).toContain('rel="canonical" href="https://solarmatch-thailand.deluxejahseh.workers.dev/methodology"');
  expect(thai).toMatch(/hrefLang="en-US"/i);

  const english = await (await request.get('/en/methodology')).text();
  expect(english).toContain('lang="en" data-locale="en"');
  expect(english).toMatch(/hrefLang="th-TH"/i);
  expect(english).toContain('A useful ballpark without pretending it is a quote');

  const home = await (await request.get('/')).text();
  expect(home).toContain('/images/solar-home-real-768.webp 768w');
  expect(home).not.toContain('solar-home-hero.jpg');
  expect(home).not.toContain('solar-home-ai-');
  expect(home).not.toMatch(/<img[^>]+src="https?:\/\//i);

  const largeImage = await request.get('/images/solar-home-real-1440.webp');
  expect(largeImage.status()).toBe(200);
  expect(largeImage.headers()['content-type']).toContain('image/webp');
  expect((await largeImage.body()).byteLength).toBeLessThan(350_000);
  expect((await request.get('/images/solar-home-hero.jpg')).status()).toBe(404);
  expect((await request.get('/images/solar-home-ai-1440.webp')).status()).toBe(404);
  expect((await request.get('/images/solar-home-ai-768.webp')).status()).toBe(404);

});

test('all Thai and English content routes have no serious or critical axe findings', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  test.setTimeout(180_000);
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  const failures: string[] = [];

  for (const route of contentRoutes) {
    await page.goto(route, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    await expect.poll(() => new URL(page.url()).pathname).toBe(route);
    await expect.poll(() => documentLanguage(page)).toBe(route.startsWith('/en') ? 'en' : 'th');
    await expect.poll(() => page.title()).not.toBe('');
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    if (blocking.length) failures.push(`${route}: ${blocking.map((item) => `${item.id} (${item.nodes.length}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')})`).join(', ')}`);
  }

  expect(failures, failures.join('\n')).toEqual([]);
});

async function documentLanguage(page: import('@playwright/test').Page) {
  return page.evaluate(() => document.documentElement.lang);
}
