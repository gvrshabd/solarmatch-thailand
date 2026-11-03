// Rasterize the original Pulse CSS glow, not third-party imagery. Reproducible
// build-time assets avoid repainting large blur filters on high-density Safari.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'public/images/installer-glow';
const colors = ['rgba(214,239,145,.95)', 'rgba(226,166,43,.42)', 'rgba(150,205,176,.7)', 'rgba(255,255,255,.95)'];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [size, blur, diameters] of [['wide', 72, [560, 420, 480, 320]], ['narrow', 56, [340, 260, 300, 220]]]) {
    for (const [index, diameter] of diameters.entries()) {
      const extent = diameter + blur * 6;
      await page.setViewportSize({ width: extent, height: extent });
      await page.setContent(`<style>body{margin:0}div{position:absolute;left:${blur * 3}px;top:${blur * 3}px;width:${diameter}px;height:${diameter}px;border-radius:50%;filter:blur(${blur}px);background:${colors[index]}}</style><div></div>`);
      const rendered = await page.screenshot({ omitBackground: true });
      // These very soft shapes need no high-resolution texture. Keep their exact
      // CSS extent; only the backing image is smaller. No runtime canvas needed.
      const data = await page.evaluate(async src => {
        const image = new Image(); image.src = src; await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width / 4; canvas.height = image.height / 4;
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png').split(',')[1];
      }, 'data:image/png;base64,' + rendered.toString('base64'));
      await writeFile(`${output}/glow-${size}-${index + 1}.png`, Buffer.from(data, 'base64'));
    }
  }
  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(`<style>body{margin:0}</style><svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.08 0 0 0 0 0.18 0 0 0 0 0.15 0 0 0 .5 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`);
  await page.screenshot({ path: `${output}/grain.png`, omitBackground: true });
} finally { await browser.close(); }
