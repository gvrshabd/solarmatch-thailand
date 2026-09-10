import { expect, test, type Page } from '@playwright/test';

const widths = [320, 360, 375, 384, 390, 393, 402, 412, 414, 430, 432, 768];
const sliderWidths = [320, 360, 375, 390, 393, 402, 414, 430];
const routes = [
  '/', '/estimate', '/estimate/results', '/how-it-works', '/solar-guide', '/methodology', '/about', '/contact', '/resources', '/privacy', '/terms', '/cookies',
  '/en', '/en/estimate', '/en/estimate/results', '/en/how-it-works', '/en/solar-guide', '/en/methodology', '/en/about', '/en/contact', '/en/resources', '/en/privacy', '/en/terms', '/en/cookies',
  '/missing-page', '/en/missing-page',
];

const savedEstimate = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false, roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
});

async function primeQuestion(page: Page, route: '/estimate' | '/en/estimate', step: number, overrides: Record<string, unknown> = {}) {
  await page.addInitScript(({ answers, currentStep }) => {
    sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 9, answers, step: currentStep }));
  }, { answers: { ...savedEstimate, ...overrides }, currentStep: step });
  await page.goto(route);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step + 1));
  // The question surface uses an exit-before-enter transition. Wait for the
  // requested step's content, rather than measuring the outgoing first step.
  await page.waitForTimeout(320);
}

function answerSignature(answers: Record<string, unknown>) {
  const source = JSON.stringify(answers);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function expectSequentialGeometry(page: Page, selectors: string[], label: string) {
  const result = await page.evaluate((orderedSelectors) => {
    const elements = orderedSelectors.map((selector) => document.querySelector<HTMLElement>(selector));
    if (elements.some((element) => !element)) return null;
    const rectangles = elements.map((element) => {
      const rect = element!.getBoundingClientRect();
      return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
    });
    const intersections = rectangles.slice(0, -1).map((rect, index) => {
      const next = rectangles[index + 1];
      return rect.left < next.right && rect.right > next.left && rect.top < next.bottom && rect.bottom > next.top;
    });
    return { rectangles, intersections };
  }, selectors);
  expect(result, `${label}: every geometry target should exist`).not.toBeNull();
  expect(result!.rectangles.every((rect) => rect.width > 0 && rect.height > 0), `${label}: every geometry target should have dimensions`).toBe(true);
  expect(result!.intersections, `${label}: sequential controls must not intersect`).not.toContain(true);
}

for (const width of widths) {
  test(`important Thai and English routes avoid document overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: width === 768 ? 1024 : 844 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
      expect(layout.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(layout.clientWidth + 1);
    }
  });
}

test('320px header and estimator controls remain touch-friendly', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en');
  const header = page.locator('.site-header');
  await expect(header.getByRole('link', { name: 'SolarMatch Thailand home' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'View this page in Thai' })).toBeVisible();
  await header.locator('details.mobile-menu > summary').click();
  const targets = await header.locator('a:visible, summary:visible').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect(); return { name: element.textContent?.trim(), width: rect.width, height: rect.height };
  }));
  expect(targets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);

  await page.goto('/en/estimate');
  const estimatorTargets = await page.locator('.estimate-card button:visible, .estimate-card input:visible, .estimate-card select:visible').evaluateAll((elements) => elements.filter((element) => !(element instanceof HTMLInputElement && element.type === 'range')).map((element) => {
    const rect = element.getBoundingClientRect(); return { name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height };
  }));
  expect(estimatorTargets.filter((target) => target.width < 44 || target.height < 44)).toEqual([]);
});

test('mobile bill slider occupies real document space and remains fully above navigation', async ({ context }) => {
  test.setTimeout(180_000);
  for (const width of sliderWidths) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 844 });
    await primeQuestion(page, '/en/estimate', 1);
    await expect(page.getByRole('heading', { name: 'About how much is the electricity bill in a typical month?' })).toBeVisible();
    const positions = await page.evaluate(() => {
      const wrapperElement = document.querySelector<HTMLElement>('[data-testid="bill-slider"]');
      const rangeElement = document.querySelector<HTMLInputElement>('.bill-range');
      const labelsElement = document.querySelector<HTMLElement>('.bill-range-labels');
      const actionsElement = document.querySelector<HTMLElement>('.estimate-actions');
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('.estimate-actions .button'));
      if (!wrapperElement || !rangeElement || !labelsElement || !actionsElement || buttons.length !== 2) return null;

      const rect = (element: Element) => {
        const value = element.getBoundingClientRect();
        return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
      };
      const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const rangeRect = rangeElement.getBoundingClientRect();
      const centreElement = document.elementFromPoint(rangeRect.left + (rangeRect.width / 2), rangeRect.top + (rangeRect.height / 2));
      const clippingAncestors: string[] = [];
      let ancestor = rangeElement.parentElement;
      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        if ([style.overflow, style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip')) {
          const ancestorRect = ancestor.getBoundingClientRect();
          if (rangeRect.left < ancestorRect.left || rangeRect.right > ancestorRect.right || rangeRect.top < ancestorRect.top || rangeRect.bottom > ancestorRect.bottom) {
            clippingAncestors.push(ancestor.className || ancestor.tagName);
          }
        }
        ancestor = ancestor.parentElement;
      }

      const wrapper = wrapperElement.getBoundingClientRect();
      const labels = labelsElement.getBoundingClientRect();
      const actions = actionsElement.getBoundingClientRect();
      const back = buttons[0].getBoundingClientRect();
      const next = buttons[1].getBoundingClientRect();
      return {
        wrapper: rect(wrapperElement), range: rect(rangeElement), labels: rect(labelsElement), actions: rect(actionsElement),
        position: getComputedStyle(actionsElement).position,
        centreReceivesInput: centreElement === rangeElement || Boolean(centreElement && rangeElement.contains(centreElement)),
        clippingAncestors,
        wrapperContainsRenderedControl: wrapper.top <= rangeRect.top && wrapper.bottom >= labels.bottom,
        rangeIntersectsActions: intersects(rangeRect, actions),
        labelsIntersectActions: intersects(labels, actions),
        buttonsIntersect: intersects(back, next),
      };
    });
    expect(positions, `${width}px should render bill and navigation`).not.toBeNull();
    expect(positions!.wrapper.width).toBeGreaterThan(0);
    expect(positions!.wrapper.height).toBeGreaterThan(100);
    expect(positions!.range.width).toBeGreaterThan(0);
    expect(positions!.range.height).toBeGreaterThanOrEqual(43.5);
    expect(positions!.wrapperContainsRenderedControl, `${width}px wrapper must reserve space for the track and labels`).toBe(true);
    expect(positions!.clippingAncestors, `${width}px slider must not be clipped by an ancestor`).toEqual([]);
    expect(positions!.centreReceivesInput, `${width}px slider centre must receive input`).toBe(true);
    expect(positions!.rangeIntersectsActions, `${width}px range must not intersect navigation`).toBe(false);
    expect(positions!.labelsIntersectActions, `${width}px labels must not intersect navigation`).toBe(false);
    expect(positions!.buttonsIntersect, `${width}px Back and Next must not intersect`).toBe(false);
    expect(positions!.wrapper.bottom + 24, `${width}px complete control wrapper must retain spacing before navigation`).toBeLessThanOrEqual(positions!.actions.top);
    expect(positions!.labels.bottom + 24, `${width}px control must retain spacing before navigation`).toBeLessThanOrEqual(positions!.actions.top);
    expect(positions!.position, `${width}px navigation must participate in layout`).toBe('static');

    const range = page.locator('.bill-range');
    await expect(range).toBeVisible();
    const rangeBox = await range.boundingBox();
    expect(rangeBox).not.toBeNull();
    await page.mouse.click(rangeBox!.x + rangeBox!.width * .18, rangeBox!.y + rangeBox!.height / 2);
    const tappedLowValue = Number(await range.inputValue());
    await page.mouse.click(rangeBox!.x + rangeBox!.width * .72, rangeBox!.y + rangeBox!.height / 2);
    const tappedHighValue = Number(await range.inputValue());
    expect(tappedHighValue, `${width}px tap-to-position must work across the track`).toBeGreaterThan(tappedLowValue);
    await page.mouse.move(rangeBox!.x + rangeBox!.width * .2, rangeBox!.y + rangeBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(rangeBox!.x + rangeBox!.width * .82, rangeBox!.y + rangeBox!.height / 2, { steps: 8 });
    await page.mouse.up();
    expect(Number(await range.inputValue()), `${width}px slider drag must change its value`).toBeGreaterThan(tappedLowValue);
    await page.close();
  }
});

test('question headings, conditional controls, consent, and navigation remain sequential', async ({ context }) => {
  test.setTimeout(120_000);
  for (const route of ['/estimate', '/en/estimate'] as const) {
    const cases = [
      { step: 5, overrides: { ownershipStatus: 'renter', ownerPermission: 'yes' }, visible: '.inline-followup', selectors: ['.question-heading', '.question-stage .choice-grid:not(.compact-choice-grid)', '.inline-followup', '.estimate-actions'], label: 'ownership' },
      { step: 7, overrides: { daytimeLoads: ['air-conditioning'], airConditionerCount: 10 }, visible: '.ac-count-followup', selectors: ['.question-heading', '.multichoice-grid', '.ac-count-followup', '.estimate-actions'], label: 'AC count' },
      { step: 9, overrides: { roofMaterial: 'other', customRoofMaterial: 'Standing seam' }, visible: '.conditional-followup', selectors: ['.question-heading', '.question-stage .choice-grid', '.conditional-followup', '.estimate-actions'], label: 'roof material' },
      { step: 10, overrides: { quoteContactRequested: true, quoteConsentAccepted: undefined }, visible: '.quote-consent-block', selectors: ['.question-heading', '.question-stage .choice-grid', '.quote-consent-block', '.estimate-actions'], label: 'quote consent' },
    ];
    for (const probeCase of cases) {
      const page = await context.newPage();
      await page.setViewportSize({ width: 390, height: 844 });
      await primeQuestion(page, route, probeCase.step, probeCase.overrides);
      await expect(page.locator(probeCase.visible)).toBeVisible();
      await expectSequentialGeometry(page, probeCase.selectors, `${route} ${probeCase.label}`);
      await page.close();
    }
  }
});

test('mobile contact fields stay readable, focusable, and separated from confirmation and actions', async ({ page }) => {
  await page.route('**/api/assessment/config', async (route) => {
    const response = await route.fetch();
    const configuration = await response.json() as Record<string, unknown> & { contact: Record<string, unknown> };
    configuration.accessRestrictedSession = true;
    configuration.liveLeadSubmissions = true;
    configuration.contact = {
      ...configuration.contact,
      enabled: true,
      restrictedSiteCollectionEnabled: true,
      mode: 'shared_solar_company_handoff',
    };
    await route.fulfill({ response, json: configuration });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await primeQuestion(page, '/en/estimate', 10, { quoteContactRequested: undefined, quoteConsentAccepted: undefined });
  await page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me' }).click();
  await page.locator('.quote-consent-check input').check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Where should installers contact you?' })).toBeVisible();

  await page.getByLabel('First name').fill('Mobile');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByRole('radio', { name: 'Phone', exact: true }).check();
  await page.getByLabel('Mobile phone number').fill('081 234 5678');
  await page.getByLabel('Mobile phone number').click();
  await expect(page.getByLabel('Mobile phone number')).toBeFocused();
  await page.getByRole('radio', { name: 'LINE', exact: true }).check();
  await expect(page.getByLabel('Mobile phone number')).toHaveCount(0);
  await page.getByLabel('LINE ID').fill('mobile.tester');
  await page.getByLabel('LINE ID').click();
  await expect(page.getByLabel('LINE ID')).toBeFocused();

  const inputGeometry = await page.locator('.contact-form-grid input[type="text"]:visible, .contact-form-grid input[type="tel"]:visible, .contact-form-grid input:not([type]):visible').evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) };
  }));
  expect(inputGeometry.every((item) => item.width > 0 && item.height >= 44 && item.fontSize >= 16)).toBe(true);
  await expectSequentialGeometry(page, ['.contact-form-grid', '.contact-adult-confirmation', '.privacy-inline', '.contact-form-actions'], 'contact form');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  expect(overflow).toBe(true);
});

test('bill control remains in flow after portrait-landscape rotation and scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await primeQuestion(page, '/en/estimate', 1);
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.locator('.bill-range-labels').scrollIntoViewIfNeeded();
    const separated = await page.evaluate(() => {
      const labels = document.querySelector('.bill-range-labels')?.getBoundingClientRect();
      const actions = document.querySelector('.estimate-actions')?.getBoundingClientRect();
      return Boolean(labels && actions && labels.bottom + 24 <= actions.top && document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    });
    expect(separated, `${viewport.width}x${viewport.height} should retain control/navigation separation`).toBe(true);
  }
});

test('mobile homepage image, credit, message, and estimator do not collide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  for (const route of ['/', '/en']) {
    await page.goto(route);
    const figure = page.locator('.hero-photo');
    await expect(figure.locator('img')).toHaveAttribute('srcset', /solar-home-real-768\.webp 768w/);
    await expect(figure.locator('figcaption')).toContainText('Kindel Media');
    const collision = await page.locator('.hero-editorial').evaluate((element) => {
      const photo = element.querySelector('.hero-photo')?.getBoundingClientRect();
      const estimator = element.querySelector('.hero-estimator-panel')?.getBoundingClientRect();
      if (!photo || !estimator) return true;
      return !(photo.bottom <= estimator.top || estimator.bottom <= photo.top);
    });
    expect(collision).toBe(false);
  }
});

test('mobile results keep metrics, charts, tables, and lead fields readable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/en/estimate/results');
  await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5, { timeout: 10_000 });
  await expect(page.locator('.result-metrics-v3')).not.toContainText(/Needs more information/);
  await expect(page.getByRole('table', { name: 'Key lifetime cost points' })).toBeVisible();
  await expect(page.locator('.result-fact-section .solar-fact-card')).toHaveCount(0);
  const layout = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});

test('landscape menu remains reachable and reduced motion is respected', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto('/en');
  const menu = page.locator('details.mobile-menu');
  await menu.locator('summary').click();
  await expect(menu.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/estimate');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.addInitScript(({ signature, estimate }) => {
    sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate));
    sessionStorage.setItem('solarmatch:result-view-state', JSON.stringify({
      signature,
      factSetVersionId: 'loading-facts-v1',
      fact: null,
      contactOutcome: 'declined',
      viewed: false,
      loadingDurationMs: 5000,
      loadingStartedAt: Date.now(),
    }));
  }, { signature: answerSignature(savedEstimate), estimate: savedEstimate });
  await page.goto('/en/estimate/results');
  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  await expect(page.locator('.solar-loading-indicator')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.solar-loading-indicator-progress')).toBeVisible();
});
