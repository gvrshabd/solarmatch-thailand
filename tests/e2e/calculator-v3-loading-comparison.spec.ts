import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { attributionFixture } from '../../scripts/calculator-benefit-attribution-v3';
import { homeownerDesignV3Questionnaire } from '../../config/assessment';

test('capture genuine completed loading work and untouched prototype clock state', async ({ browser }) => {
  test.skip(process.env.CAPTURE_HOMEOWNER_V3 !== '1', 'Opt-in local comparison capture.');
  test.setTimeout(180_000);
  const records: unknown[] = [];
  for (const locale of ['en', 'th'] as const) {
    const prototypeContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    const reference = await prototypeContext.newPage();
    await reference.addInitScript(({ locale, answers }) => {
      localStorage.setItem('sm-lang', locale);
      sessionStorage.setItem('sm-answers', JSON.stringify({ ...answers, activelyPlanningSolar: answers.planningTimeframe }));
    }, { locale, answers: attributionFixture });
    const time = new Date('2026-10-17T12:00:00Z');
    await reference.clock.install({ time });
    await reference.clock.pauseAt(new Date(time.getTime() + 10_000));
    await reference.goto('http://localhost:4175/#loading');
    await expect(reference.locator('.ltasks li')).toHaveCount(3);
    await reference.evaluate(() => document.fonts.ready);
    // The untouched prototype ticks at0/750/1500/2250ms, then redirects350ms
    // later. Pause after its three completed rows, before that fake redirect.
    await reference.clock.runFor(2250);
    await expect(reference.locator('.ltasks li.done')).toHaveCount(3);
    await reference.addStyleTag({ content: '.proto{display:none!important}' });

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const actual = await context.newPage();
    const capture = await context.newCDPSession(actual);
    const readHeldDocument = async (expression: string) => {
      const result = await capture.send('Runtime.evaluate', { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    await actual.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'synthetic_loading_capture' } }));
    await actual.addInitScript(({ answers, questionnaireVersionId, step }) => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
      version: 11, answers: { ...answers, estimateModelVersion: 'energy-v3' }, questionnaireVersionId, step,
    })), { answers: attributionFixture, questionnaireVersionId: homeownerDesignV3Questionnaire.id, step: homeownerDesignV3Questionnaire.questions.length - 1 });
    let release!: () => void;
    let reached!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const documentRequested = new Promise<void>(resolve => { reached = resolve; });
    await actual.route('**/estimate/results', async route => {
      if (route.request().isNavigationRequest() && route.request().resourceType() === 'document') {
        reached(); await held;
      }
      await route.continue();
    });
    await actual.goto(`${process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'}/${locale === 'en' ? 'en/' : ''}estimate`);
    await expect(actual.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions.at(-1)!.title[locale]);
    await actual.evaluate(() => document.fonts.ready);
    const noLabel = homeownerDesignV3Questionnaire.questions.at(-1)!.options!.find(option => option.value === 'no')!.label[locale];
    await actual.getByRole('radio').filter({ has: actual.getByText(noLabel, { exact: true }) }).click();
    // Keep the actual document request pending; do not alter calculation flags,
    // add presentation time, fake work, or change application/prototype source.
    const navigation = actual.locator('.estimate-actions > button').last().click({ noWaitAfter: true });
    try {
      await documentRequested;
      // Locators auto-wait for the pending document navigation. Read the still
      // live document directly instead; the application has finished real work.
      await expect.poll(() => readHeldDocument("document.querySelectorAll('.calculation-loading-page .ltasks li.done').length")).toBe(3);
      expect(await readHeldDocument("document.querySelector('.calculation-loading-page [role=\"status\"]')?.getAttribute('aria-busy')")).toBe('false');
      for (const width of [360, 390, 768, 1440]) {
        for (const [surface, page] of [['prototype', reference], ['implementation', actual]] as const) {
          await page.setViewportSize({ width, height: 844 });
          if (surface === 'implementation') {
            // Chromium's screenshot protocol can capture the existing document
            // without Playwright's intentional pending-navigation auto-wait.
            const layout = await capture.send('Page.getLayoutMetrics');
            for (const fullPage of [true, false]) {
              const screenshot = await capture.send('Page.captureScreenshot', {
                format: 'png', captureBeyondViewport: fullPage,
                clip: { x: 0, y: 0, width, height: fullPage ? layout.cssContentSize.height : 844, scale: 1 },
              });
              await writeFile(`docs/design-v3-comparison/${fullPage ? '' : 'viewport-'}${surface}-loading-${locale}-${width}.png`, Buffer.from(screenshot.data, 'base64'));
            }
          } else {
            await page.screenshot({ path: `docs/design-v3-comparison/${surface}-loading-${locale}-${width}.png`, fullPage: true, scale: 'css', animations: 'disabled' });
            await page.screenshot({ path: `docs/design-v3-comparison/viewport-${surface}-loading-${locale}-${width}.png`, scale: 'css', animations: 'disabled' });
          }
          const measure = (value: { surface: string; locale: string; width: number }) => { const node = document.querySelector('.loading')!; return ({ ...value,
            bounds: node.getBoundingClientRect().toJSON(), font: getComputedStyle(node).fontFamily,
            rows: [...document.querySelectorAll('.ltasks li')].map(row => ({ text: row.textContent, state: row.className })),
            headerVisible: [...document.querySelectorAll('header')].some(header => header.getBoundingClientRect().height > 0),
            footerVisible: [...document.querySelectorAll('footer')].some(footer => footer.getBoundingClientRect().height > 0),
          }); };
          records.push(surface === 'implementation'
            ? await readHeldDocument(`(${measure.toString()})(${JSON.stringify({ surface, locale, width })})`)
            : await page.evaluate(measure, { surface, locale, width }));
        }
      }
    } finally { release(); await navigation; }
    await context.close(); await prototypeContext.close();
  }
  await writeFile('docs/design-v3-comparison/loading-metrics.json', JSON.stringify(records, null, 2));
});
