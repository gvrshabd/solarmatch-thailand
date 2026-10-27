import { chromium, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockSignalPortal, SIGNAL_NOW, signalId } from '../tests/e2e/signal-fixtures.ts';

// Node 24 can execute the type-only fixture module directly. Original handoff is read-only.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repo, 'docs/design-signal/solarmatch-installer-signal');
const prototype = path.join(source, 'prototype');
const output = path.resolve(repo, process.env.SIGNAL_CAPTURE_OUTPUT || 'docs/design-signal-review');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const filter = new RegExp(process.env.SIGNAL_CAPTURE_FILTER || '.*');
const surfaces = (process.env.SIGNAL_CAPTURE_SURFACES || 'prototype,implementation').split(',').filter(surface => ['prototype', 'implementation'].includes(surface));
const referenceViewport = process.env.SIGNAL_REFERENCE_VIEWPORT !== '0';
const extraWidths = process.env.SIGNAL_CAPTURE_BOUNDARIES === '1' ? [360, 768, 859, 860, 899, 900, 959, 960, 999, 1000] : [];
const htmlEscape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dimensions = bytes => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });

async function ready(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(image => image.decode().catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

const homeownerProduction = 'https://solarmatch-thailand.deluxejahseh.workers.dev';
const homeownerConfigFile = path.join(repo, '.wrangler/signal-review/homeowner-before/public-assessment-config.json');

async function saveHomeownerPublicConfig() {
  const response = await fetch(homeownerProduction + '/api/assessment/config');
  if (!response.ok) throw new Error('Unable to read the public production assessment configuration: ' + response.status);
  const config = await response.json();
  // Rendering needs the published questionnaire/model, never a submission capability.
  delete config.assessmentToken;
  delete config.assessmentTokenExpiresAt;
  await mkdir(path.dirname(homeownerConfigFile), { recursive: true });
  await writeFile(homeownerConfigFile, JSON.stringify(config, null, 2));
  console.log('Saved read-only public production assessment configuration.');
}

async function captureHomeownerBaseline(after = false) {
  const destination = path.resolve(repo, process.env.SIGNAL_HOMEOWNER_OUTPUT || '.wrangler/signal-review/homeowner-' + (after ? 'after' : 'before'));
  const origin = after ? base : homeownerProduction;
  const publicConfig = after ? JSON.parse(await readFile(homeownerConfigFile, 'utf8')) : null;
  const answers = { estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17', monthlyBillThb: 6000, province: 'bangkok', district: 'sathon', projectType: 'new-rooftop', propertyType: 'detached-home', ownershipStatus: 'owner', activelyPlanningSolar: true, planningTimeframe: 'within-3-months', daytimePattern: 'high', roofArea: '100-200', daytimeLoads: ['none'], shade: 'almost-none', roofMaterial: 'concrete-tile', quoteContactRequested: false };
  await mkdir(destination, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const selectedScreenshots = new RegExp(process.env.SIGNAL_HOMEOWNER_FILTER || '.*');
  const previousInventory = process.env.SIGNAL_HOMEOWNER_FILTER ? await readFile(path.join(destination, 'inventory.json'), 'utf8').catch(() => null) : null;
  const records = previousInventory ? JSON.parse(previousInventory).captures : [];
  try {
    for (const lang of ['en', 'th']) for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', timezoneId: 'Asia/Bangkok' });
      const page = await context.newPage();
      const blockedMutations = [];
      await page.route('**/*', route => {
        if (!['GET', 'HEAD'].includes(route.request().method())) { blockedMutations.push({ method: route.request().method(), url: route.request().url() }); return route.abort(); }
        return route.continue();
      });
      if (publicConfig) await page.route('**/api/assessment/config', route => route.fulfill({ json: publicConfig }));
      await page.addInitScript(value => {
        sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 11, answers: value, step: 0 }));
        sessionStorage.setItem('solarmatch:estimate', JSON.stringify(value));
      }, answers);
      const prefix = lang === 'en' ? '/en' : '';
      for (const [surface, route, selector] of [['home', prefix || '/', '#hero-monthly-bill'], ['worksheet', prefix + '/estimate', '#monthly-bill'], ['result', prefix + '/estimate/results', '.rhero']]) {
        const filename = `${surface}-${lang}-${width}.png`;
        if (!selectedScreenshots.test(filename)) continue;
        try {
          await page.goto(origin + route);
          await ready(page, selector);
          await page.waitForFunction(language => document.documentElement.lang === language, lang);
          if (surface === 'home' || surface === 'worksheet') await page.waitForFunction(selector => { const input = document.querySelector(selector); return input instanceof HTMLInputElement && !input.disabled; }, selector);
          if (surface === 'worksheet') await page.waitForFunction(() => document.querySelector('#monthly-bill')?.value.replace(/\D/g, '') === '6000');
          const image = await page.screenshot({ path: path.join(destination, filename), fullPage: true, animations: 'disabled' });
          const renderMetrics = await page.evaluate(() => Object.fromEntries(['body', '.hero3', '.hero-bg', '.rhero', '.rhero .wrap'].flatMap(selector => {
            const element = document.querySelector(selector); if (!element) return [];
            const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
            const pseudo = type => { const value = getComputedStyle(element, type); return { background: value.background, opacity: value.opacity, transform: value.transform, filter: value.filter }; };
            return [[selector, { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fontFamily: style.fontFamily, fontSize: style.fontSize, color: style.color, background: style.background, opacity: style.opacity, transform: style.transform, filter: style.filter, before: pseudo('::before'), after: pseudo('::after') }]];
          })));
          const record = { filename, surface, lang, width, ...dimensions(image), url: page.url(), renderMetrics, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), blockedMutations: [...blockedMutations] };
          const previous = records.findIndex(item => item.filename === filename);
          if (previous >= 0) records[previous] = record;
          else records.push(record);
          console.log(`Homeowner ${after ? 'after' : 'before'}: ${filename}`);
        } catch (error) { records.push({ surface, lang, width, error: error.message }); }
        await writeFile(path.join(destination, 'inventory.json'), JSON.stringify({ origin, publicConfigSource: after ? homeownerConfigFile : homeownerProduction + '/api/assessment/config', syntheticAnswers: answers, noFormSubmissions: true, captures: records }, null, 2));
      }
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(`Read-only homeowner baseline: ${destination}`);
}

const configOnly = process.argv.includes('--homeowner-public-config');
const homeownerOnly = process.argv.includes('--homeowner-baseline') || process.argv.includes('--homeowner-after');
if (configOnly) {
  await saveHomeownerPublicConfig();
} else if (homeownerOnly) {
  await captureHomeownerBaseline(process.argv.includes('--homeowner-after'));
}

if (!configOnly && !homeownerOnly) {
const originalInventory = [];
for (const name of (await readdir(path.join(source, 'reference'))).filter(name => name.endsWith('.png')).sort()) {
  originalInventory.push({ name, ...dimensions(await readFile(path.join(source, 'reference', name))) });
}
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'source-inventory.json'), JSON.stringify({ count: originalInventory.length, phoneCssWidth: 390, phoneDeviceScaleFactor: 2, desktopCssWidth: 1440, desktopDeviceScaleFactor: 1, files: originalInventory }, null, 2));

const server = createServer(async (request, response) => {
  try {
    const route = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const file = path.resolve(prototype, '.' + (route === '/' ? '/index.html' : route));
    if (!file.startsWith(prototype + path.sep)) { response.writeHead(403).end(); return; }
    const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream';
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime }); response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const prototypeBase = 'http://127.0.0.1:' + server.address().port;

function decodeCase(name) {
  const match = name.match(/^(.*)-(en|th)-(desktop|phone)\.png$/);
  const [, stem, lang, device] = match;
  const route = stem.split('-')[0];
  const state = ['empty', 'paused', 'platform', 'unverified', 'terms', 'nocredits', 'debt', 'payment', 'pending', 'nocompany'].find(state => stem.endsWith('-' + state)) || 'approved';
  const scale = device === 'phone' ? 2 : 1;
  const original = originalInventory.find(item => item.name === name);
  return { name, stem, route, lang, state, width: device === 'phone' ? 390 : 1440, height: referenceViewport ? original.height / scale : device === 'phone' ? 844 : 900, interactiveHeight: device === 'phone' ? 844 : 900, scale, menu: stem.includes('account-menu') ? 'account' : stem.includes('close-menu') ? 'close' : '', fullPage: !referenceViewport && !stem.includes('-menu') };
}

function implementationUrl(item) {
  if (/^e\d+$/.test(item.route)) return `/installers/enquiry/${signalId(Number(item.route.slice(1)))}?lang=${item.lang}`;
  const view = { company: 'profile', credits: 'credits', claims: 'claims', terms: 'terms' }[item.route] || 'inbox';
  return '/installers?lang=' + item.lang + (['landing', 'signin'].includes(item.route) ? item.route === 'signin' ? '&auth=login' : '' : '&view=' + view);
}

async function metrics(page) {
  return page.evaluate(() => {
    const elements = {};
    for (const selector of ['.a-hdr', '.a-hero', '.a-hero h1', '.stack', '.auth', '.a-facts', '.a-how', '.a-faq', '.foot', '.a-rail', '.a-list', '.lhead', '.ltitle', '.seg3', '.search', '.row', '.a-detail', '.dperson', '.facts4', '.prog', '.a-page', '.a-two', '.bal', '.pkg', '.qr', '.a-co', '.notice', '.clist', '.terms-text', '.tabbar', '.callbar']) {
      const element = [...document.querySelectorAll(selector)].find(element => element.getBoundingClientRect().width && element.getBoundingClientRect().height);
      if (!element) continue;
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
      elements[selector] = { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, color: style.color, background: style.background, padding: style.padding, gap: style.gap };
    }
    return { viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1, fonts: { status: document.fonts.status, manrope: document.fonts.check('16px Manrope'), anuphan: document.fonts.check('16px Anuphan') }, images: [...document.images].map(image => ({ src: image.currentSrc || image.src, loaded: image.complete && image.naturalWidth > 0 })), elements };
  });
}

const browserName = process.env.SIGNAL_CAPTURE_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const browser = browserName === 'webkit' ? await webkit.launch({ headless: true }) : await chromium.launch({ channel: 'chrome', headless: true });
const records = process.env.SIGNAL_CAPTURE_MERGE === '1' ? JSON.parse(await readFile(path.join(output, 'comparison.json'), 'utf8')).cases : [];
try {
  const cases = originalInventory.filter(item => filter.test(item.name)).map(item => decodeCase(item.name));
  for (const width of extraWidths) for (const lang of ['en', 'th']) for (const route of ['landing', 'inbox', 'e39', 'company', 'credits']) {
    const height = width < 1000 ? 844 : 900;
    cases.push({ name: `${route}-${lang}-${width}.png`, stem: `${route}-${lang}-${width}`, route, lang, state: 'approved', width, height, interactiveHeight: height, scale: 1, menu: '', fullPage: false });
  }
  for (const item of cases) {
    const previous = records.find(record => record.name === item.name);
    const record = { ...item, browser: browserName, original: originalInventory.find(original => original.name === item.name) || null, captures: previous ? { ...previous.captures } : {}, errors: [] };
    for (const surface of surfaces) {
      const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, deviceScaleFactor: item.scale, timezoneId: 'Asia/Bangkok', reducedMotion: 'reduce' });
      const page = await context.newPage();
      try {
        await page.clock.setFixedTime(SIGNAL_NOW);
        if (surface === 'prototype') {
          await page.goto(prototypeBase + '/#' + item.route);
          await page.waitForFunction(() => typeof window.SM === 'object');
          await page.evaluate(({ state, lang, route }) => { window.SM.state(state); window.SM.lang(lang); location.hash = route; }, item);
          // Omit only the explicitly excluded prototype toolbar. No product CSS or masks.
          await page.addStyleTag({ content: '.cbar{display:none!important}:root{--pb:0px}' });
          await ready(page, ['landing', 'signin'].includes(item.route) ? '.a-hero h1' : 'h1');
        } else {
          if (['landing', 'signin'].includes(item.route)) {
            await page.route('**/api/**', route => route.fulfill({ status: 501, json: { error: 'unmocked_synthetic_api' } }));
            await page.route('**/api/installer/portal**', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
            await page.route('**/api/installer-auth/**', route => route.fulfill({ json: { ok: true } }));
          } else await mockSignalPortal(page, item.state, item.lang);
          await page.goto(base + implementationUrl(item));
          await ready(page, '.signal h1');
          if (item.route === 'signin') await ready(page, '.auth h2');
          if (item.route === 'inbox' && item.width >= 1000 && !['empty', 'pending', 'nocompany'].includes(item.state)) await page.waitForURL(new RegExp('/enquiry/' + signalId(36)));
          if (item.state === 'payment') {
            await page.getByRole('button', { name: (item.lang === 'en' ? 'Pay with ' : 'ชำระผ่าน ') + 'PromptPay', exact: true }).click();
            await ready(page, '.qr img');
          }
        }
        if (item.menu === 'account') await page.locator('.acct summary:visible').first().click();
        if (item.menu === 'close') await page.locator('details.menu summary:visible').first().click();
        await ready(page, surface === 'prototype' ? 'h1' : '.signal h1');
        const filename = `${surface}-${item.name}`;
        const buffer = await page.screenshot({ path: path.join(output, filename), fullPage: item.fullPage, animations: 'disabled' });
        record.captures[surface] = { filename, ...dimensions(buffer), metrics: await metrics(page), url: page.url() };
        if (referenceViewport && record.original && !item.menu && record.captures[surface].metrics.documentHeight > item.height + 1) {
          const companion = `${surface}-fullpage-${item.name}`;
          const bytes = await page.screenshot({ path: path.join(output, companion), fullPage: true, animations: 'disabled' });
          record.captures[surface].fullPageCompanion = { filename: companion, ...dimensions(bytes) };
        }
      } catch (error) { record.errors.push({ surface, message: error.message }); }
      finally { await context.close(); }
    }
    const priorIndex = records.findIndex(prior => prior.name === record.name);
    if (priorIndex >= 0) records[priorIndex] = record;
    else records.push(record);
    await writeFile(path.join(output, 'comparison.json'), JSON.stringify({ fixedNow: new Date(SIGNAL_NOW).toISOString(), baseUrl: base, referenceViewport, genuinePhoneHeight: 844, genuineDesktopHeight: 900, sourceScreenshotCount: originalInventory.length, completedCases: records.length, screenshotCount: records.reduce((sum, item) => sum + Object.values(item.captures).reduce((count, capture) => count + 1 + Number(!!capture.fullPageCompanion), 0), 0), cases: records }, null, 2));
    console.log(`${item.name}: ${Object.keys(record.captures).join(' + ')}${record.errors.length ? ' ERRORS ' + JSON.stringify(record.errors) : ''}`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

const knownDifferences = [
  'The prototype inbox initially selects e39/Arun despite sorting Kanya first. The implementation follows the spec and opens oldest waiting e36/Kanya at desktop widths.',
  'The source uses different company names in the header and company form. InstallerPortalData has one company.name; this fixture uses Suriya Solar.',
  'Supported questionnaire values render the established assessment labels (including ownership/timeframe), which are longer than simplified prototype labels.',
  'Claims, legal disclosures, notes conflict errors and terms use existing product wording. The legal paragraphs can differ in height from simplified prototype copy.',
  'The QR illustration is the deterministic fictional source SVG returned solely by mocked checkout; it never represents a provider payment.',
  'Phone source screenshots are 780 physical pixels wide: CSS width 390 at device scale 2. Desktop source screenshots are 1440 pixels at scale 1.',
  'Matched snapshots use the original PNG height divided by device scale as viewport height, so fixed bars sit at the reference image bottom. Genuine 844/900-height interaction and overflow checks are separate; full-page companions preserve any extra content.',
];
const cards = records.map(item => `<section><h2>${htmlEscape(item.name)}</h2>${item.errors.map(error => `<p class="error">${htmlEscape(error.surface + ': ' + error.message)}</p>`).join('')}<div class="pair">${['prototype', 'implementation'].map(surface => item.captures[surface] ? `<figure><figcaption>${surface} · ${item.captures[surface].width} × ${item.captures[surface].height}</figcaption><a href="${item.captures[surface].filename}"><img loading="lazy" src="${item.captures[surface].filename}" alt="${htmlEscape(surface + ' ' + item.name)}"></a></figure>` : `<p>${surface}: capture unavailable</p>`).join('')}</div></section>`).join('');
await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Signal visual comparison</title><style>body{margin:0;padding:24px;font:15px/1.5 system-ui;background:#eee;color:#142d26}h1{font-size:28px}section{border-top:1px solid #bbc6bb;padding:24px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}figure{margin:0;min-width:0}figcaption{font-weight:700;margin-bottom:10px}img{width:100%;height:auto;display:block;background:#fff}.error{color:#a4402a}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><h1>Signal prototype / implementation</h1><p>Original handoff unchanged. Fixed time: ${new Date(SIGNAL_NOW).toISOString()}. No screenshot masks or reference edits. Only prototype tooling is omitted.</p><ul>${knownDifferences.map(text => `<li>${htmlEscape(text)}</li>`).join('')}</ul><p><a href="comparison.json">Capture inventory and computed layout metrics</a> · <a href="source-inventory.json">All 52 original screenshot dimensions</a></p>${cards}</html>`);
console.log(`Comparison index: ${path.join(output, 'index.html')}`);
}
