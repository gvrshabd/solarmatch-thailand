import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, 'docs/design-installer-landing');
const output = path.join(root, 'comparison');
const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('Local synthetic preview only.');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const bytes = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
if (process.argv.includes('--serve')) {
  console.log('Local comparison viewer: http://127.0.0.1:4174/comparison/');
} else {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const records = [];
  try {
    for (const lang of ['en', 'th']) for (const width of [360, 390, 768, 1180, 1440]) {
      const height = width === 1180 ? 820 : width < 500 ? 844 : 900;
      const record = { lang, width, height, captures: {}, geometry: {} };
      for (const surface of ['prototype', 'implementation']) {
        const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.route('**/api/**', route => route.fulfill({ status: 401, json: { error: 'synthetic_signed_out' } }));
        if (surface === 'prototype') {
          await page.goto('http://127.0.0.1:4174/prototype/');
          await page.evaluate(language => window.LP.lang(language), lang);
        } else await page.goto(base + '/installers?lang=' + lang);
        await page.locator('.landing h1').waitFor();
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(Array.from(document.images).map(img => img.decode()));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          scrollTo(0, 0);
        });
        record.geometry[surface] = await page.evaluate(() => {
          const result = {};
          for (const selector of ['.hdr', '.hero', '.hero h1', '.btns', '.feed', '.pc', '.how', '.path', '.band', '.qas', '.foot']) {
            const el = document.querySelector(selector), r = el.getBoundingClientRect(), s = getComputedStyle(el);
            result[selector] = { x: r.x, y: r.y, width: r.width, height: r.height, fontSize: s.fontSize, fontWeight: s.fontWeight };
          }
          return result;
        });
        const filename = `${surface}-${lang}-${width}.png`;
        await page.screenshot({ path: path.join(output, filename), fullPage: true });
        record.captures[surface] = filename;
        await context.close();
      }
      records.push(record);
      console.log(`Captured ${lang} ${width}`);
    }
    await writeFile(path.join(output, 'measurements.json'), JSON.stringify(records, null, 2));
    await writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SolarMatch Pulse comparisons</title><style>body{margin:0;background:#f5f4ef;color:#142d26;font:16px/1.5 system-ui}header{padding:20px;position:sticky;top:0;background:#f5f4ef;border-bottom:1px solid #ccd3c6}h1{font-size:22px;margin:0 0 8px}select,a{padding:8px;margin:4px}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}img{width:100%;display:block}figure{margin:0;min-width:0}figcaption{padding:8px;font-weight:bold}a{color:inherit}p{max-width:80em}@media(max-width:600px){main{grid-template-columns:1fr}}</style><header><h1>SolarMatch installer landing — Pulse</h1><label>Language <select id="lang"><option value="en">English</option><option value="th">ไทย</option></select></label><label>Width <select id="width">${[360,390,768,1180,1440].map(w=>`<option>${w}</option>`).join('')}</select></label><a id="live" href="${base}/installers?lang=en">Interactive local page</a><p>Matched Chromium, 1× scale and reduced motion. Examples and configuration are synthetic. Click either image for full size. Real availability controls are preserved; disabled labels vary with configuration. Lucide icons and existing image compression differ slightly from the reference. Thai native review and exact roof-photo source verification remain outstanding.</p></header><main><figure><figcaption>Prototype</figcaption><a id="pLink"><img id="p" alt="Supplied prototype"></a></figure><figure><figcaption>Implementation</figcaption><a id="iLink"><img id="i" alt="Implemented page"></a></figure></main><script>const l=document.getElementById('lang'),w=document.getElementById('width');function show(){for(const [id,s] of [['p','prototype'],['i','implementation']]){const src=s+'-'+l.value+'-'+w.value+'.png';document.getElementById(id).src=src;document.getElementById(id+'Link').href=src;}document.getElementById('live').href='${base}/installers?lang='+l.value;}l.onchange=w.onchange=show;show();</script></html>`);
  } finally { await browser.close(); server.close(); }
}
