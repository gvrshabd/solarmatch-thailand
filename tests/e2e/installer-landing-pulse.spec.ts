import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signalReady } from './signal-fixtures';

// API interception is restricted to synthetic authentication states; nothing is submitted.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
});

for (const lang of ['en', 'th'] as const) {
  for (const width of [360, 390, 768, 860, 1180, 1440]) test(`Pulse ${lang} ${width}: layout, path, reduced motion and axe`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: width === 1180 ? 820 : width < 500 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/installers?lang=' + lang);
    await signalReady(page);
    await expect(page.locator('.signal.landing')).toHaveAttribute('lang', lang);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('.qa')).toHaveCount(4);
    await expect(page.locator('.qa[open]')).toHaveCount(0);
    await expect(page.locator('.feed a, .feed [role="link"]')).toHaveCount(0);
    await expect(page.locator('.feed .pc:not([aria-hidden])')).toHaveCount(6);
    await expect(page.locator('.fp')).toHaveAttribute('aria-label', lang === 'en' ? 'Play examples' : 'เล่นตัวอย่าง');
    await expect(page.locator('.fp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.path li.lit')).toHaveCount(3);
    expect(await page.locator('.blob').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width >= 960) {
      const hero = await page.locator('.top').boundingBox();
      expect(hero!.height).toBeGreaterThanOrEqual(Math.min(860, Math.max(600, (width === 1180 ? 820 : 900) - 68)));
    }
    if (width >= 860) {
      await page.locator('.how').scrollIntoViewIfNeeded();
      const offsets = await page.locator('.path').evaluate(box => {
        const rect = box.getBoundingClientRect();
        return Array.from(box.querySelectorAll('.n')).map((node, i) => {
          const circle = node.getBoundingClientRect();
          return { x: Math.abs(circle.x + circle.width / 2 - rect.x - rect.width * [.12, .5, .88][i]), y: Math.abs(circle.y + circle.height / 2 - rect.y - [218, 96, 218][i]) };
        });
      });
      for (const offset of offsets) { expect(offset.x).toBeLessThanOrEqual(1); expect(offset.y).toBeLessThanOrEqual(1); }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    const axe = () => new AxeBuilder({ page }).include('.signal').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
    expect((await axe()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`landing-${lang}-${width}.png`), fullPage: true });
    await page.locator('.qa summary').first().click();
    await expect(page.locator('.qa[open]')).toHaveCount(1);
    expect((await axe()).violations).toEqual([]);
  });

  test(`Pulse ${lang}: language, real auth replacement and disabled service`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/installers?lang=' + lang);
    await signalReady(page);
    await page.getByRole('button', { name: lang === 'en' ? 'Switch to Thai' : 'Switch to English' }).click();
    await expect(page.locator('.signal.landing')).toHaveAttribute('lang', lang === 'en' ? 'th' : 'en');
    await page.getByRole('button', { name: lang === 'en' ? 'Switch to English' : 'Switch to Thai' }).click();
    const signIn = page.locator('.hero .btn.ghost');
    await expect(signIn).toBeEnabled();
    await signIn.click();
    await expect(page.locator('.auth')).toBeVisible();
    await expect(page.locator('.feed')).toHaveCount(0);
    await expect(page.locator('.auth input[type="email"]')).toBeVisible();
    await expect(page.locator('.auth input[type="password"]')).toBeVisible();
    await expect(page.locator('.hero .btns')).toBeHidden();
    await page.getByRole('button', { name: lang === 'en' ? 'Close' : 'ปิด', exact: true }).click();
    await expect(page.locator('.feed')).toBeVisible();
    await page.route('**/api/installer/portal', route => route.fulfill({ status: 503, json: { error: 'portal_unavailable' } }));
    await page.reload();
    await signalReady(page);
    // A temporary API failure preserves the existing retry screen, rather than
    // pretending that a configured service has been administratively disabled.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(lang === 'en' ? 'The portal is temporarily unavailable' : 'พอร์ทัลไม่พร้อมใช้งาน');
    await expect(page.getByRole('button', { name: lang === 'en' ? 'Retry' : 'ลองอีกครั้ง', exact: true })).toBeEnabled();
    await expect(page.locator('form')).toHaveCount(0);
  });

  test(`Pulse ${lang}: disabled configuration has no clipped entry controls`, async ({ page }) => {
    // A second loopback preview uses the same build with installer mode off.
    // This tests actual disabled server configuration, not a simulated API outage.
    const disabledBase = process.env.PULSE_DISABLED_BASE_URL || 'http://127.0.0.1:3002';
    expect(['localhost', '127.0.0.1']).toContain(new URL(disabledBase).hostname);
    await page.goto(disabledBase + '/installers?lang=' + lang);
    await signalReady(page);
    await expect(page.locator('.hero .btn.primary')).toBeDisabled();
    await expect(page.locator('.hero .btn.ghost')).toBeDisabled();
    await expect(page.locator('.hero .btn.primary')).toContainText(lang === 'en' ? 'Applications unavailable' : 'ยังไม่เปิดรับสมัคร');
    for (const width of [360, 390, 768, 1180, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const actions = await page.locator('.hdr .r').boundingBox();
      expect(actions!.x + actions!.width).toBeLessThanOrEqual(width);
    }
  });
}

test('Pulse feed: moves on both axes, pauses, resumes and survives resizing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/installers?lang=en');
  await signalReady(page);
  const viewport = page.locator('.feed-v');
  const position = () => viewport.evaluate(el => innerWidth >= 960 ? el.scrollTop : el.scrollLeft);
  const start = await position();
  await expect.poll(position).toBeGreaterThan(start + 3);
  await page.getByRole('button', { name: 'Pause examples' }).click();
  const paused = await position();
  await page.waitForTimeout(200);
  expect(await position()).toBe(paused);
  await page.getByRole('button', { name: 'Play examples' }).click();
  await page.mouse.move(0, 0);
  await expect.poll(position).toBeGreaterThan(paused + 3);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileStart = await position();
  await expect.poll(position).toBeGreaterThan(mobileStart + 3);
  await viewport.dispatchEvent('pointerdown');
  const held = await position();
  await page.waitForTimeout(200);
  expect(await position()).toBe(held);
  await viewport.evaluate(el => { el.scrollLeft += 40; });
  const manual = await position();
  expect(manual).toBeGreaterThan(held + 20);
  await expect.poll(position, { timeout: 6000 }).toBeGreaterThan(manual + 3);
  if (test.info().project.use.hasTouch) {
    // A real tap synthesizes mouseenter on mobile. It must not pause forever.
    await viewport.tap();
    const tapped = await position();
    await page.waitForTimeout(200);
    expect(await position()).toBe(tapped);
    await expect.poll(position, { timeout: 6000 }).toBeGreaterThan(tapped + 3);
  }
});

test('Pulse sun follows scroll progress and reaches the final circle', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/installers?lang=en');
  await signalReady(page);
  await page.locator('.path').evaluate(el => scrollTo(0, scrollY + el.getBoundingClientRect().top - innerHeight * (.85 - .6 * .55)));
  await expect(page.locator('.path li.lit')).toHaveCount(2);
  await page.locator('.path').evaluate(el => scrollTo(0, scrollY + el.getBoundingClientRect().top - innerHeight * .2));
  await expect(page.locator('.path li.lit')).toHaveCount(3);
  const centre = await page.locator('.path').evaluate(el => {
    const sun = el.querySelector('.sun')!.getBoundingClientRect();
    const last = el.querySelector('li:last-child .n')!.getBoundingClientRect();
    return { x: Math.abs(sun.x + sun.width / 2 - last.x - last.width / 2), y: Math.abs(sun.y + sun.height / 2 - last.y - last.height / 2) };
  });
  expect(centre.x).toBeLessThanOrEqual(1);
  expect(centre.y).toBeLessThanOrEqual(1);
});
