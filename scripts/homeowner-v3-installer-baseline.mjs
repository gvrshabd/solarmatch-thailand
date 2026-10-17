// Synthetic, read-only visual regression fixtures; no account or remote API access.
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import vm from 'node:vm';
const mode = process.argv[2];
if (!['before', 'after'].includes(mode)) throw Error('Use before or after');
const origin = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) throw Error('Loopback only');
const testSource = await readFile('tests/e2e/installer-studio.spec.ts', 'utf8');
const source = testSource.slice(testSource.indexOf('const fixture ='), testSource.indexOf("for (const lang of ['en', 'th'] as const)"));
const fixture = vm.runInNewContext(ts.transpile(source + '\nfixture();', { target: ts.ScriptTarget.ES2022 }));
const dir = 'docs/design-v3-comparison/installer-' + mode;
await mkdir(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const lang of ['en', 'th']) for (const width of [390, 1440]) for (const view of ['landing', 'overview', 'credits']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    await page.route('**/api/**', route => route.request().url().includes('/api/installer/portal') && view !== 'landing'
      ? route.fulfill({ json: fixture }) : route.fulfill({ status: 503, json: { error: 'synthetic_offline' } }));
    await page.goto(`${origin}/installers?lang=${lang}&view=${view === 'landing' ? 'overview' : view}`);
    await page.locator(view === 'landing' ? 'h1' : '.installer-workspace').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${dir}/${view}-${lang}-${width}.png`, fullPage: true, animations: 'disabled' });
    await page.close();
  }
} finally { await browser.close(); }
console.log('Installer baseline captured: ' + dir);
