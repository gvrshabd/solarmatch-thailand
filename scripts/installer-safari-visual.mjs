import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

// Compare the fix to the retained pre-fix implementation captures. Never replace
// the original prototype or earlier evidence to make a comparison pass.
const output = 'docs/design-installer-landing/safari-fix';
const previous = 'docs/design-installer-landing/comparison';
const baseline = JSON.parse(await readFile(`${previous}/measurements.json`, 'utf8'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const comparisons = [];
try {
  for (const lang of ['en', 'th']) for (const width of [360, 390, 768, 1180, 1440]) {
    const height = width === 1180 ? 820 : width < 500 ? 844 : 900;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.route('**/api/**', route => route.fulfill({ status: 401, json: {} }));
      await page.goto(`http://127.0.0.1:3000/installers?lang=${lang}`);
      await page.locator('.signal.landing .feed').waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images).map(image => image.decode()));
        const backgrounds = [...document.querySelectorAll('.blob, .grain')].map(el => getComputedStyle(el, el.classList.contains('blob') ? '::before' : null).backgroundImage);
        await Promise.all(backgrounds.map(async value => {
          const url = value.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
          if (url) { const image = new Image(); image.src = url; await image.decode(); }
        }));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const expected = baseline.find(row => row.lang === lang && row.width === width).geometry.implementation;
      const geometry = await page.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return [selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
      })), Object.keys(expected));
      const geometryDelta = Math.max(...Object.entries(geometry).flatMap(([selector, rect]) => Object.entries(rect).map(([key, value]) => Math.abs(value - expected[selector][key]))));
      const filename = `implementation-${lang}-${width}.png`;
      const after = await page.screenshot({ path: `${output}/${filename}`, fullPage: true });
      const before = await readFile(`${previous}/${filename}`);
      const difference = await page.evaluate(async sources => {
        const decoded = await Promise.all(sources.map(async src => {
          const image = new Image(); image.src = src; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
        }));
        const [a, b] = decoded;
        if (a.width !== b.width || a.height !== b.height) throw Error('Screenshot dimensions changed');
        let changed = 0, total = 0;
        for (let p = 0; p < a.data.length; p += 4) {
          let largest = 0;
          for (let c = 0; c < 3; c++) { const delta = Math.abs(a.data[p + c] - b.data[p + c]); largest = Math.max(largest, delta); total += delta; }
          if (largest > 16) changed++;
        }
        return { pixelsAbove16Percent: changed / (a.width * a.height) * 100, meanChannelDifference: total / (a.width * a.height * 3) };
      }, [before, after].map(bytes => 'data:image/png;base64,' + bytes.toString('base64')));
      comparisons.push({ lang, width, height, geometryDelta, ...difference });
      console.log(comparisons.at(-1));
    } finally { await context.close(); }
  }
  await writeFile(`${output}/visual-comparison.json`, JSON.stringify(comparisons, null, 2));
} finally { await browser.close(); }
