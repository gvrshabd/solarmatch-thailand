import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { attributionFixture } from '../../scripts/calculator-benefit-attribution-v3';

// Separate read-only comparison harness. No fixture values enter production code
// or replace either engine's output. The original prototype files stay untouched.
test('capture final prototype and authoritative results in both locales and layouts', async ({ browser }) => {
  test.skip(process.env.CAPTURE_HOMEOWNER_V3 !== '1', 'Opt-in local visual artifact capture; run separately from behavior tests.');
  test.setTimeout(240_000);
  const measurements: unknown[] = [];
  for (const locale of ['en', 'th'] as const) {
    for (const width of [360, 390, 768, 1440]) {
      for (const surface of ['prototype', 'implementation'] as const) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'synthetic_read_only_comparison' } }));
        await page.addInitScript(({ answers, locale, surface }) => {
          if (surface === 'prototype') {
            localStorage.setItem('sm-lang', locale);
            sessionStorage.setItem('sm-answers', JSON.stringify({ ...answers, activelyPlanningSolar: answers.planningTimeframe }));
            sessionStorage.setItem('sm-refine', JSON.stringify({ roofArea: answers.roofArea, electricityPhase: answers.electricityPhase }));
            sessionStorage.setItem('sm-extras', JSON.stringify({ tax: false, sell: false, rate: '0.2' }));
          } else sessionStorage.setItem('solarmatch:estimate', JSON.stringify({ ...answers, estimateModelVersion: 'energy-v3' }));
        }, { answers: attributionFixture, locale, surface });
        const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
        await page.goto(surface === 'prototype' ? 'http://localhost:4175/#results' : `${base}/${locale === 'en' ? 'en/' : ''}estimate/results`);
        await expect(page.locator('.rhero h1')).toBeVisible({ timeout: 30_000 });
        await page.evaluate(() => document.fonts.ready);
        if (surface === 'prototype') await page.addStyleTag({ content: '.proto{display:none!important}' });
        // Closed state is user-collapsed even when exact roof data auto-opens it.
        for (const detail of await page.locator('main details[open]').all()) await detail.locator(':scope > summary').click();
        await page.evaluate(() => scrollTo(0, 0));
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        for (const state of ['results', 'results-extras', 'results-refined'] as const) {
          if (state === 'results-extras') {
            if (surface === 'prototype') await page.locator('[data-act="xtax"]').click();
            else await page.locator('.scenario-disclosure').first().locator(':scope > summary').click();
          }
          if (state === 'results-refined') {
            if (surface === 'prototype') await page.locator('[data-act="xtax"]').click();
            else await page.locator('.scenario-disclosure').first().locator(':scope > summary').click();
            const precise = surface === 'prototype' ? page.locator('.rbody .col').first().locator('.card').last().locator('details') : page.locator('.results-precise > details');
            if (await precise.getAttribute('open') === null) await precise.locator(':scope > summary').click();
          }
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({ path: `docs/design-v3-comparison/${surface}-${state}-${locale}-${width}.png`, fullPage: true, scale: 'css' });
          if (state === 'results') await page.screenshot({ path: `docs/design-v3-comparison/viewport-${surface}-${state}-${locale}-${width}.png`, scale: 'css' });
          measurements.push(await page.evaluate(({ surface, state, locale, width }) => ({
            surface, state, locale, width, scrollWidth: document.documentElement.scrollWidth,
            hero: document.querySelector('.rhero')!.getBoundingClientRect().toJSON(),
            before: document.querySelector('.ba .was')?.textContent,
            after: document.querySelector('.ba .now')?.textContent,
            headline: document.querySelector('.rhero h1')?.textContent,
            styles: ['.rhero', '.ba .was', '.ba .now', '.rbody', '.rstats'].map(selector => {
              const node = document.querySelector(selector)!;
              const css = getComputedStyle(node);
              return { selector, fontFamily: css.fontFamily, fontWeight: css.fontWeight, fontSize: css.fontSize, lineHeight: css.lineHeight, padding: css.padding, columns: css.gridTemplateColumns, gap: css.gap, radius: css.borderRadius };
            }),
          }), { surface, state, locale, width }));
        }
        if (surface === 'implementation' && width === 1440) {
          for (const breakpointWidth of [599, 600, 899, 900, 959, 960, 999, 1000, 1099, 1100]) {
            await page.setViewportSize({ width: breakpointWidth, height: 844 });
            await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
            measurements.push(await page.evaluate(({ locale, width }) => ({
              surface: 'implementation', state: 'breakpoint-refined', locale, width,
              columns: getComputedStyle(document.querySelector('.rbody')!).gridTemplateColumns,
              scrollWidth: document.documentElement.scrollWidth,
            }), { locale, width: breakpointWidth }));
          }
        }
        await context.close();
      }
    }
  }
  await writeFile('docs/design-v3-comparison/results-metrics.json', JSON.stringify(measurements, null, 2));
  console.log('RESULTS_COMPARISON_MEASUREMENTS=' + JSON.stringify(measurements));
});
