// Read-only, loopback-only comparison of the original prototype and implementation.
// Start the local application and installer-landing-comparison.mjs --serve first.
import { webkit, devices } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await webkit.launch();
const results = [];
try {
  for (const scale of [1, 2, 3]) for (const width of [390, 1180]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: scale, reducedMotion: 'no-preference' });
    try {
      const page = await context.newPage();
      await page.setViewportSize({ width, height: 844 });
      await page.route('**/api/**', route => route.fulfill({ status: 401, json: {} }));
      for (const [surface, url] of [
        ['implementation', 'http://127.0.0.1:3000/installers?lang=en'],
        ['prototype', 'http://127.0.0.1:4174/prototype/'],
      ]) {
        await page.goto(url);
        await page.locator('.feed-v').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1000);
        const sample = await page.evaluate(() => new Promise(resolve => {
          const feed = document.querySelector('.feed-v');
          const before = feed.scrollTop + feed.scrollLeft;
          const started = performance.now();
          let frames = 0, id;
          const tick = () => { frames++; id = requestAnimationFrame(tick); };
          id = requestAnimationFrame(tick);
          setTimeout(() => {
            cancelAnimationFrame(id);
            const elapsedMs = performance.now() - started;
            const movement = feed.scrollTop + feed.scrollLeft - before;
            resolve({ frames, elapsedMs, movement, pixelsPerSecond: movement / elapsedMs * 1000, layoutWidth: document.documentElement.clientWidth });
          }, 1500);
        }));
        results.push({ surface, scale, width, sampleMilliseconds: 1500, ...sample });
        console.log(results.at(-1));
      }
    } finally { await context.close(); }
  }
  await writeFile('.wrangler/pulse-webkit-motion-diagnostic.json', JSON.stringify(results, null, 2));
} finally { await browser.close(); }
