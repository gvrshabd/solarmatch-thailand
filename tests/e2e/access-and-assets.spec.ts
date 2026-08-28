import AxeBuilder from '@axe-core/playwright';
import { expect, test, type TestInfo } from '@playwright/test';

const contentRoutes = [
  '/', '/estimate', '/estimate/results', '/how-it-works', '/solar-guide', '/methodology',
  '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies',
  '/en', '/en/estimate', '/en/estimate/results', '/en/how-it-works', '/en/solar-guide',
  '/en/methodology', '/en/about', '/en/contact', '/en/resources', '/en/privacy', '/en/terms', '/en/cookies',
];

const savedEstimate = {
  province: 'bangkok',
  monthlyBillThb: 4500,
  daytimeUsage: 'medium',
  authority: 'owner',
  propertyType: 'detached',
  roofKnown: false,
  shade: 'unknown',
  timing: 'research',
  energyInterest: 'solar',
};

function desktopOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'One browser project is sufficient for protocol and automated accessibility checks.');
}

test('robots and review files express the intended agent policy', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(robots.headers()['content-type']).toContain('text/plain');
  const robotsText = await robots.text();
  expect(robotsText).toMatch(/User-Agent:\s*Claude-User[\s\S]*Allow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*ClaudeBot[\s\S]*Disallow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*Claude-SearchBot[\s\S]*Disallow:\s*\//i);
  expect(robotsText).toMatch(/User-Agent:\s*\*[\s\S]*Disallow:\s*\//i);

  const llms = await request.get('/llms.txt');
  expect(llms.status()).toBe(200);
  expect(llms.headers()['content-type']).toContain('text/plain');
  await expect.poll(async () => (await llms.text()).includes('prototype')).toBe(true);
});

test('public HTML is fetchable with browser, generic automation, and Anthropic user agents', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const userAgents = ['Mozilla/5.0', 'SolarMatchAudit/1.0', 'Claude-User', 'Claude-SearchBot', 'ClaudeBot'];
  for (const userAgent of userAgents) {
    for (const path of ['/', '/en', '/methodology', '/en/methodology', '/estimate/results']) {
      const response = await request.get(path, { headers: { 'user-agent': userAgent } });
      expect(response.status(), `${userAgent} GET ${path}`).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(response.headers()['cf-mitigated']).toBeUndefined();
      const html = await response.text();
      expect(html, `${userAgent} SSR ${path}`).toMatch(/<h1[\s>]/i);

      const head = await request.head(path, { headers: { 'user-agent': userAgent } });
      expect(head.status(), `${userAgent} HEAD ${path}`).toBe(200);
      expect(head.headers()['content-type']).toContain('text/html');
    }
  }
});

test('SSR metadata, language boundaries, images, and the disabled lead endpoint are safe', async ({ request }, testInfo) => {
  desktopOnly(testInfo);
  const thai = await (await request.get('/methodology')).text();
  expect(thai).toMatch(/<meta name="robots" content="noindex, follow"/i);
  expect(thai).toContain('rel="canonical" href="https://solarmatch-thailand.deluxejahseh.workers.dev/methodology"');
  expect(thai).toMatch(/hrefLang="en-US"/i);

  const english = await (await request.get('/en/methodology')).text();
  expect(english).toContain('lang="en" data-locale="en"');
  expect(english).toMatch(/hrefLang="th-TH"/i);
  expect(english).toContain('We show assumptions');

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

  const disabledLead = await request.post('/api/leads', { data: { name: 'not-read' } });
  expect(disabledLead.status()).toBe(410);
  expect(disabledLead.headers()['cache-control']).toBe('no-store');
  expect(await disabledLead.json()).toMatchObject({ code: 'LEAD_SUBMISSION_DISABLED', persisted: false });
});

test('all Thai and English content routes have no serious or critical axe findings', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  test.setTimeout(180_000);
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  const failures: string[] = [];

  for (const route of contentRoutes) {
    await page.goto(route, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    if (blocking.length) failures.push(`${route}: ${blocking.map((item) => `${item.id} (${item.nodes.length}: ${item.nodes.map((node) => node.target.join(' ')).join(', ')})`).join(', ')}`);
  }

  expect(failures, failures.join('\n')).toEqual([]);
});
