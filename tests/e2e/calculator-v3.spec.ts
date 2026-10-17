import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { calculatorV3Questionnaire, homeownerDesignV3Questionnaire, initialQuestionnaire } from '../../config/assessment';
import { contactContent } from '../../config/contact-content';
import { contactReviewCopy } from '../../config/contact-review';
import { initialLoadingFactSet } from '../../config/loading-facts';
import type { EstimateAnswers } from '../../lib/calculator/types';
import type { PublicAssessmentConfig } from '../../lib/questionnaire/types';
import { calculateFinanceScenario } from '../../lib/calculator/scenarios';

const modern: EstimateAnswers = {
  estimateModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-17',
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200',
  daytimePattern: 'high', daytimeLoads: ['none'], roofMaterial: 'concrete-tile', shade: 'almost-none',
  quoteContactRequested: false, electricityPhase: 'three', exactRoofAreaSqm: 100,
  consumptionInput: 'kwh', monthlyConsumptionKwh: 1200, billingPeriodDays: 30,
  tariffCategory: 'ordinary-1.2', utility: 'MEA', billDate: '2026-09-30',
};

function assertNoPrivateScenarioData(value: unknown) {
  if (typeof value === 'number' || typeof value === 'string') {
    expect(value).not.toBe(800_000);
    expect(value).not.toBe('800000');
  } else if (Array.isArray(value)) {
    for (const item of value) assertNoPrivateScenarioData(item);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      expect(key).not.toMatch(/netTaxableIncome|taxIncome|taxFacts|taxCalculationBasis|qualifyingSpendBaht|depositBaht|actualMonthlyPaymentBaht/i);
      assertNoPrivateScenarioData(item);
    }
  }
}

async function browserStorage(page: Page) {
  return page.evaluate(() => ({ session: Object.fromEntries(Object.entries(sessionStorage)),
    local: Object.fromEntries(Object.entries(localStorage)) }));
}

async function localApis(page: Page) {
  // Deterministic offline configuration uses the local bill-first qv8 fallback. No lead is sent.
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'local_test_offline' } }));
  await page.route('https://tile.openstreetmap.org/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

function legacyConfiguration(): PublicAssessmentConfig {
  return {
    calculatorModelVersion: 'legacy-v5', calculationReferenceDate: '2026-10-17',
    privatePreview: true, accessRestrictedSession: false, restrictedSiteCollectionEnabled: false,
    publicCollectionEnabled: false, releaseId: 'synthetic-held-q6-release',
    questionnaireVersionId: initialQuestionnaire.id, ruleVersionId: 'synthetic-legacy-rules',
    questionnaire: initialQuestionnaire, assessmentToken: 'a'.repeat(96),
    assessmentTokenExpiresAt: '2099-01-01T00:00:00.000Z', liveLeadSubmissions: false, receivingCompany: null,
    loadingFactSetVersionId: 'synthetic-no-facts', loadingFacts: [],
    contact: {
      ...contactContent.contactModes.shared_solar_company_handoff, ...contactContent.contactModes.common,
      enabled: false, preview: true, restrictedSiteCollectionEnabled: false, publicCollectionEnabled: false,
      operationalDistributionEnabled: false, mode: 'disabled', contactConfigurationVersionId: 'synthetic-disabled-contact',
      contentVersionId: 'synthetic-contact-content', privacyVersion: 'synthetic-privacy', retentionDays: null,
      distributionWindowDays: null, recipientCategory: null, adultConfirmationVersionId: null,
      consentVersionId: null, privacyNoticeVersionId: null, termsVersionId: null, cookiePolicyVersionId: null,
      recipient: null, permittedContactMethods: ['phone'], sharedFields: [],
    },
  };
}

async function holdLegacyConfiguration(page: Page, configuration = legacyConfiguration()) {
  await localApis(page);
  let release!: () => void;
  let requested!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const seen = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/api/assessment/config', async route => {
    requested();
    await gate;
    await route.fulfill({ json: configuration });
  });
  return {
    configuration, requested: seen,
    async release() {
      const response = page.waitForResponse(candidate => candidate.url().endsWith('/api/assessment/config'));
      release();
      const received = await response;
      expect(received.status()).toBe(200);
      await received.finished();
      // Drain fetch's state updates and the resulting render before checking an
      // ignored response: immediate negative assertions could otherwise race it.
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    },
  };
}

test('a fresh pre-interaction q6 response starts at its province question and remains usable', async ({ page }) => {
  const held = await holdLegacyConfiguration(page);
  await page.goto('/en/estimate');
  await held.requested;
  await expect(page.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions[0].title.en);
  await held.release();
  await expect(page.locator('#estimate-question')).toHaveText(initialQuestionnaire.questions[0].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(initialQuestionnaire.questions.length));
  await page.locator('#estimate-province').selectOption('bangkok');
  await page.locator('#estimate-district').selectOption('sathon');
  await page.locator('.estimate-actions > button').last().click();
  await expect(page.locator('#estimate-question')).toHaveText(initialQuestionnaire.questions[1].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!));
  expect(saved.version).toBe(9);
  expect(saved.answers.estimateModelVersion).toBe('legacy-v5');
  expect(saved.questionnaireVersionId).toBe(initialQuestionnaire.id);
  expect(saved.releaseId).toBe(held.configuration.releaseId);
  expect(saved.assessmentToken).toBe(held.configuration.assessmentToken);
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!).step)).toBe(1);
  await page.reload();
  await expect(page.locator('#estimate-question')).toHaveText(initialQuestionnaire.questions[1].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(initialQuestionnaire.questions.length));
  const resumed = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!));
  expect(resumed.version).toBe(9);
  expect(resumed.answers.estimateModelVersion).toBe('legacy-v5');
  expect(resumed.questionnaireVersionId).toBe(initialQuestionnaire.id);
});

test('a restored v9 province maps by question identity when q6 is accepted before interaction', async ({ page }) => {
  const held = await holdLegacyConfiguration(page);
  await page.addInitScript(() => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
    version: 9, step: 0, answers: { province: 'bangkok', district: 'sathon' },
  })));
  await page.goto('/en/estimate');
  await held.requested;
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await held.release();
  await expect(page.locator('#estimate-question')).toHaveText(initialQuestionnaire.questions[0].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(initialQuestionnaire.questions.length));
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!).questionnaireVersionId)).toBe(initialQuestionnaire.id);
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!));
  expect(saved.version).toBe(9);
  expect(saved.answers.province).toBe('bangkok');
  expect(saved.answers.district).toBe('sathon');
  expect(saved.assessmentToken).toBe(held.configuration.assessmentToken);
});

test('a restored modern v10 journey rejects q6 questionnaire, release and token', async ({ page }) => {
  const held = await holdLegacyConfiguration(page);
  await page.addInitScript(answers => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
    version: 10, step: 1, answers, releaseId: 'synthetic-saved-modern-release',
    questionnaireVersionId: 'residential-questionnaire-v7', assessmentToken: 'b'.repeat(96),
  })), modern);
  await page.goto('/en/estimate');
  await held.requested;
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  await held.release();
  await expect(page.locator('#estimate-question')).toHaveText(calculatorV3Questionnaire.questions[1].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(calculatorV3Questionnaire.questions.length));
  const storage = await browserStorage(page);
  const saved = JSON.parse(storage.session['solarmatch:estimate-draft']);
  expect(saved.version).toBe(11);
  expect(saved.answers.estimateModelVersion).toBe('energy-v3');
  expect(saved.answers.calculationReferenceDate).toBe(modern.calculationReferenceDate);
  expect(JSON.stringify(storage)).not.toContain(held.configuration.releaseId);
  expect(JSON.stringify(storage)).not.toContain(held.configuration.assessmentToken!);
  expect(saved.questionnaireVersionId).not.toBe(initialQuestionnaire.id);
});

test('a restored modern v11 journey hydrates matching read-only q8 facts without moving its step or reference date', async ({ page }) => {
  const configuration: PublicAssessmentConfig = {
    ...legacyConfiguration(), calculatorModelVersion: 'energy-v3', calculationReferenceDate: '2026-10-18',
    accessRestrictedSession: true, contactReviewAvailable: true,
    questionnaire: homeownerDesignV3Questionnaire, questionnaireVersionId: homeownerDesignV3Questionnaire.id,
    releaseId: 'synthetic-read-only-q8-release', assessmentToken: null, assessmentTokenExpiresAt: null,
    loadingFactSetVersionId: initialLoadingFactSet.id,
    loadingFacts: initialLoadingFactSet.facts.map(fact => ({ ...fact, imageUrl: `/images/loading-facts/${fact.sketchId}.svg` })),
  };
  const held = await holdLegacyConfiguration(page, configuration);
  const step = homeownerDesignV3Questionnaire.questions.length - 1;
  await page.addInitScript(({ answers, step, questionnaireVersionId }) => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
    version: 11, step, answers, questionnaireVersionId,
  })), { answers: modern, step, questionnaireVersionId: homeownerDesignV3Questionnaire.id });
  await page.goto('/en/estimate');
  await held.requested;
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step + 1));
  const before = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!));
  await held.release();
  await expect(page.getByRole('radio').filter({ has: page.getByText(contactReviewCopy.label.en, { exact: true }) })).toBeVisible();
  await expect(page.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions[step].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(step + 1));
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(calculatorV3Questionnaire.questions.length));
  const storage = await browserStorage(page);
  const saved = JSON.parse(storage.session['solarmatch:estimate-draft']);
  const context = JSON.parse(storage.session['solarmatch:assessment-context']);
  expect(saved.step).toBe(step);
  expect(saved.answers).toEqual(before.answers);
  expect(saved.answers.calculationReferenceDate).toBe('2026-10-17');
  expect(context.calculationReferenceDate).toBeUndefined();
  expect(context.loadingFactSetVersionId).toBe(initialLoadingFactSet.id);
  expect(context.loadingFacts).toEqual(configuration.loadingFacts);
  expect(context.contact.mode).toBe('disabled');
  expect(context.assessmentToken).toBeNull();
  expect(context.liveLeadSubmissions).toBe(false);
  await expect(page.locator('input[autocomplete="tel"]')).toHaveCount(0);
});

test('a q6 response arriving after q8 bill interaction cannot replace its question sequence or token scope', async ({ page }) => {
  const held = await holdLegacyConfiguration(page);
  await page.goto('/en/estimate');
  await held.requested;
  const first = homeownerDesignV3Questionnaire.questions[0];
  await expect(page.locator('#estimate-question')).toHaveText(first.title.en);
  await expect(page.locator('.estimate-actions > button').last()).toBeEnabled();
  await page.locator('#monthly-bill').fill('6000');
  await page.locator('.estimate-actions > button').last().click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  await held.release();
  await expect(page.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions[1].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(calculatorV3Questionnaire.questions.length));
  const project = homeownerDesignV3Questionnaire.questions[1];
  await page.getByRole('radio').filter({ has: page.getByText(project.options!.find(item => item.value === 'new-rooftop')!.label.en, { exact: true }) }).click();
  await expect(page.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions[2].title.en);
  await page.locator('#estimate-province').selectOption('bangkok');
  await page.locator('#estimate-district').selectOption('sathon');
  await page.locator('.estimate-actions > button').last().click();
  await expect(page.locator('#estimate-question')).toHaveText(homeownerDesignV3Questionnaire.questions[3].title.en);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  const storage = await browserStorage(page);
  const saved = JSON.parse(storage.session['solarmatch:estimate-draft']);
  expect(saved.version).toBe(11);
  expect(saved.answers.projectType).toBe('new-rooftop');
  expect(saved.answers.estimateModelVersion).toBe('energy-v3');
  expect(JSON.stringify(storage)).not.toContain(held.configuration.releaseId);
  expect(JSON.stringify(storage)).not.toContain(held.configuration.assessmentToken!);
});

async function seed(page: Page, answers: EstimateAnswers, locale: 'en' | 'th' = 'en', waitForHeadingFocus = true) {
  await localApis(page);
  await page.addInitScript(value => {
    // Seed only a fresh page. Reload must exercise the user's persisted edits,
    // rather than overwrite an explicit legacy-to-modern recalculation.
    if (sessionStorage.getItem('solarmatch:estimate') === null) {
      sessionStorage.setItem('solarmatch:estimate', JSON.stringify(value));
      sessionStorage.removeItem('solarmatch:result-view-state');
      sessionStorage.removeItem('solarmatch:assessment-context');
    }
  }, answers);
  await page.goto(locale === 'en' ? '/en/estimate/results' : '/estimate/results');
  await expect(page.locator('.rhero h1')).toBeVisible({ timeout: 20_000 });
  if (waitForHeadingFocus) await expect(page.locator('.rhero h1')).toBeFocused();
  const breakdown = page.locator('.v2-breakdown > details');
  if (await breakdown.getAttribute('open') === null) await breakdown.locator(':scope > summary').click();
  await expect(page.locator('.calculator-model-details')).toBeVisible();
  await expect(page.locator('.calculation-loading-page')).toHaveCount(0);
  // The results journey deliberately announces its heading after its transition.
  // Begin keyboard interaction once that initial focus handoff has completed.
}

test('the delayed result announcement does not steal an already focused input', async ({ page }) => {
  await seed(page, modern, 'en', false);
  const roof = page.getByRole('spinbutton', { name: /^Usable roof area for solar/ });
  await roof.focus();
  await expect(roof).toBeFocused();
  // Exercise the specific 390 ms result-announcement timer without changing any
  // answer, which would otherwise cancel/reschedule the effect being tested.
  await page.waitForTimeout(450);
  await expect(roof).toBeFocused();
});

test('clearing the last optional refinement keeps its input visible and focused', async ({ page }) => {
  await seed(page, modern);
  const precise = page.locator('.results-precise > details');
  await expect(precise).toHaveAttribute('open', '');
  const roof = precise.getByRole('spinbutton', { name: /^Usable roof area for solar/ });
  await roof.fill('');
  await expect(precise).toHaveAttribute('open', '');
  await expect(roof).toBeVisible();
  await expect(roof).toBeFocused();
  await roof.fill('80');
  await expect(roof).toHaveValue('80');
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate')!).exactRoofAreaSqm)).toBe(80);
});

test('modern saved inputs retain model/date and show reproducible equipment and energy balances', async ({ page }) => {
  await seed(page, modern);
  const details = page.locator('.calculator-model-details');
  await expect(details).toContainText('residential-hourly-2026-10-17-v3');
  await expect(details).toContainText('2026-10-17');
  await expect(details).toContainText('kWp DC /');
  await expect(details).toContainText('kW AC');
  await expect(details.locator('article')).toHaveCount(4);
  await expect(page.locator('.rhero .ba .now')).toBeVisible();
  const before = await page.locator('.rhero .ba .now').innerText();
  await page.reload();
  await expect(page.locator('.rhero .ba .now')).toHaveText(before, { timeout: 20_000 });
  await page.locator('.v2-breakdown > details > summary').click();
  await details.getByText('First-year energy balance', { exact: true }).click();
  await expect(details).toContainText('Grid imports');
  await expect(details).toContainText('Surplus: export/curtailment, no base revenue');
});

test('historic saved inputs stay on the legacy engine until explicit recalculation', async ({ page }) => {
  await seed(page, { ...modern, estimateModelVersion: 'legacy-v5',
    consumptionInput: 'bill', monthlyConsumptionKwh: undefined,
    roofArea: undefined, exactRoofAreaSqm: undefined, electricityPhase: undefined,
    daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5 });
  await expect(page.locator('.rhero h1')).toContainText('฿1,665 less each month');
  await expect(page.locator('.rhero .ba .now')).toHaveText('฿4,335');
  await expect(page.locator('.calculator-model-details')).toContainText('Saved legacy estimate');
  const today = await page.evaluate(() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
  });
  await page.getByRole('button', { name: 'Recalculate with current model', exact: true }).click();
  await expect(page.locator('.calculator-model-details')).toContainText('residential-hourly-2026-10-17-v3');
  const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate')!));
  expect(saved.estimateModelVersion).toBe('energy-v3');
  expect(saved.calculationReferenceDate).toBe(today);
  await page.reload();
  await expect(page.locator('.calculator-model-details')).toContainText('residential-hourly-2026-10-17-v3', { timeout: 20_000 });
});

test('no feasible roof option does not display an invented system, price or payback', async ({ page }) => {
  await seed(page, { ...modern, exactRoofAreaSqm: 1 });
  await expect(page.locator('.rhero h1')).toHaveText('No suitable economic installation identified');
  await expect(page.locator('.rhero .ba')).toHaveCount(0);
  await expect(page.locator('.rstats > div').nth(0).locator('b')).toHaveText('—');
  await expect(page.locator('.rstats > div').nth(1).locator('b')).toHaveText('—');
  await expect(page.locator('.calculator-model-details')).toContainText('No evidenced package fits');
});

test('unsupported battery project requires an explicit labelled solar-only illustration', async ({ page }) => {
  await seed(page, { ...modern, projectType: 'solar-with-battery' });
  await expect(page.locator('.rhero h1')).toHaveText('A battery system needs a separate estimate');
  await expect(page.locator('.rhero .result-model-recovery')).toBeVisible();
  await expect(page.locator('.rhero .rstats')).toHaveCount(0);
  await expect(page.locator('.rhero .ba')).toHaveCount(0);
  await expect(page.locator('.lifetime-chart')).toHaveCount(0);
  await expect(page.locator('.bars')).toHaveCount(0);
  await expect(page.locator('#optional-scenarios-title')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show a new-system solar-only illustration. This does not model my battery or existing system.' }).check();
  await expect(page.locator('.calculator-model-details')).toContainText('NEW-SYSTEM SOLAR-ONLY ILLUSTRATION');
  await expect(page.locator('.rhero .ba .now')).toBeVisible();
});

for(const locale of ['en','th'] as const)for(const projectType of ['solar-with-battery','expand-existing'] as const){
  test(`model recovery stays prominent and preserves ${projectType} answers ${locale}`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await seed(page,{...modern,consumptionInput:'bill',projectType},locale);
    await page.locator('.v2-breakdown > details > summary').click();
    const optIn=page.locator('.result-model-recovery input[type=checkbox]');
    await expect(optIn).toBeVisible();await expect(optIn).not.toBeChecked();
    await expect(page.locator('.rhero .rstats')).toHaveCount(0);
    await expect(page.locator('.rhero .verdict')).toHaveCount(0);
    await expect(page.locator('.lifetime-chart')).toHaveCount(0);
    expect((await new AxeBuilder({page}).include('.rhero').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
    await page.setViewportSize({width:390,height:844});
    await optIn.focus();await optIn.press('Space');
    await expect(page.locator('.rhero .ba .now')).toBeVisible();
    await expect(optIn).toBeFocused();
    await expect(page.locator('.rhero')).toContainText(locale==='en'?'excludes batteries, backup power and your existing system':'ไม่รวมแบตเตอรี่ ไฟสำรอง และระบบเดิม');
    await page.reload();
    await expect(page.locator('.rhero .ba .now')).toBeVisible();
    const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:estimate')!));
    expect(saved.projectType).toBe(projectType);expect(saved.solarOnlyIllustration).toBe(true);expect(saved.monthlyBillThb).toBe(modern.monthlyBillThb);expect(saved.quoteContactRequested).toBe(false);
    await page.locator('.v2-breakdown > details > summary').click();
    const checked=page.locator('.result-model-recovery input[type=checkbox]');
    await expect(checked).toBeChecked();await checked.uncheck();
    await expect(page.locator('.result-model-recovery')).toBeVisible();
    await expect(page.locator('.rhero .ba')).toHaveCount(0);
    if(process.env.MODEL_RECOVERY_SCREENSHOTS==='1'){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`.wrangler/model-recovery-${projectType}-${locale}.png`,fullPage:false});}
  });
}

test('a user quotation preserves exact cash price and separate DC and AC sizes', async ({ page }) => {
  await seed(page, { ...modern, quoteSystemKw: 5.5, quoteModuleCount: 10, quoteModuleWp: 550,
    quoteInverterAcKw: 5, quoteCashPriceThb: 150_123.45, quoteBatteryIncluded: false });
  await expect(page.locator('.rstats > div').nth(1).locator('b')).toHaveText('฿150,123.45');
  await expect(page.locator('.calculator-model-details')).toContainText('10 × 550 Wp');
  await expect(page.locator('.calculator-model-details')).toContainText('5.5 kWp DC / 5 kW AC');
  await expect(page.locator('.calculator-model-details article')).toHaveCount(1);
});

test('editing a quotation cash-price field preserves typed cents through live recalculation', async ({ page }) => {
  await seed(page, { ...modern, quoteSystemKw: 5.5, quoteModuleCount: 10, quoteModuleWp: 550,
    quoteInverterAcKw: 5, quoteCashPriceThb: 150_000, quoteBatteryIncluded: false });
  const price = page.getByLabel('Exact total installed cash price, including VAT (THB)', { exact: true });
  await price.fill('');
  await price.pressSequentially('150123.45', { delay: 30 });
  await price.press('Tab');
  await expect(price).toHaveValue('150123.45');
  await expect(page.locator('.rstats > div').nth(1).locator('b')).toHaveText('฿150,123.45');
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate')!).quoteCashPriceThb)).toBe(150_123.45);
  for (const width of [320, 360, 390, 414, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.locator('.rstats > div').nth(1).locator('b').evaluate(node => {
      const range = document.createRange(); range.selectNodeContents(node);
      const text = range.getBoundingClientRect(), cell = node.parentElement!.getBoundingClientRect();
      return { textLeft: text.left, textRight: text.right, textBottom: text.bottom,
        cellLeft: cell.left, cellRight: cell.right, cellBottom: cell.bottom };
    });
    expect(bounds.textLeft).toBeGreaterThanOrEqual(bounds.cellLeft);
    expect(bounds.textRight).toBeLessThanOrEqual(bounds.cellRight + 1);
    expect(bounds.textBottom).toBeLessThanOrEqual(bounds.cellBottom + 1);
    await expect(page.locator('.rstats > div').nth(1).locator('b')).toHaveText('฿150,123.45');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

for (const invalidQuote of [
  { name: 'conflicting module DC totals', quoteSystemKw: 5.5, quoteModuleCount: 10, quoteModuleWp: 500, quoteInverterAcKw: 5 },
  { name: 'capacity outside the residential model', quoteSystemKw: 31, quoteModuleCount: 100, quoteModuleWp: 310, quoteInverterAcKw: 30 },
]) {
  test(`invalid quote with ${invalidQuote.name} has no financial charts or optional revenue`, async ({ page }) => {
    await seed(page, { ...modern, ...invalidQuote, quoteCashPriceThb: 150_123.45, quoteBatteryIncluded: false });
    await expect(page.locator('.rhero h1')).toHaveText('Check the equipment in your quotation');
    await page.getByRole('button',{name:'Review quotation details',exact:true}).click();
    await expect(page.locator('.results-precise summary')).toBeFocused();
    await expect(page.locator('.calculator-model-details')).toContainText('Correct the equipment details; no financial estimate is provided.');
    await expect(page.locator('.rhero .ba')).toHaveCount(0);
    await expect(page.locator('.lifetime-chart')).toHaveCount(0);
    await expect(page.locator('.bars')).toHaveCount(0);
    await expect(page.locator('#optional-scenarios-title')).toHaveCount(0);
  });
}

test('existing-appliance schedules above the measured bill are capped and visibly explained', async ({ page }) => {
  await seed(page, { ...modern, daytimeLoads: ['air-conditioning'], airConditionerCount: 10,
    daylightAcUnits: 10, daylightAcHours: 9, acPowerKw: 10 });
  const details = page.locator('.calculator-model-details');
  await expect(details).toContainText('Entered existing-appliance schedules exceed the bill consumption in some months and were scaled down to that measured total.');
  await details.getByText('First-year energy balance', { exact: true }).click();
  await expect(details.locator('.kv > div').filter({ hasText: 'Household demand' }).locator('b')).toHaveText('14,600 kWh');
});

test('tax input remains memory-only and separate from bills, invoices, shared URLs and requests', async ({ page, context, browserName }) => {
  const sent: string[] = [];
  page.on('request', request => { if (request.postData()) sent.push(request.postData()!); });
  await seed(page, modern);
  await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:result-view-state') ?? '{}').viewed)).toBe(true);
  const originalStorage = await browserStorage(page);
  const sentBeforeTax = [...sent];
  const originalEstimate = await page.evaluate(() => sessionStorage.getItem('solarmatch:estimate'));
  const originalBill = await page.locator('.rhero .ba .now').innerText();
  const invoicePrice = page.locator('.rstats > div').nth(1).locator('b');
  const originalInvoice = await invoicePrice.innerText();
  const tax = page.locator('details').filter({ has: page.locator('summary', { hasText: 'Personal solar tax relief (optional)' }) });
  await tax.locator('summary').click();
  await tax.getByLabel('Annual net taxable income BEFORE solar relief (THB)', { exact: true }).fill('800000');
  await tax.getByLabel('Qualifying spending (THB)', { exact: true }).fill('200000');
  await tax.getByLabel('Total installed capacity at this home (kW, maximum 10)', { exact: true }).fill('5.5');
  for (const label of ['Contract / purchase agreement date', 'Qualifying payment date', 'Installation date',
    'Grid connection application date', 'Successful grid connection date']) {
    await tax.getByLabel(label, { exact: true }).fill('2026-10-17');
  }
  const selects = tax.locator('select:has(option[value="true"])');
  for (let index = 0; index < await selects.count(); index++) await selects.nth(index).selectOption('true');
  const calculationBasis = tax.getByRole('combobox', { name: 'Tax calculation basis', exact: true });
  await expect(tax).toContainText('Insufficient information to assess eligibility');
  await expect(tax.locator('.kv')).toHaveCount(0);
  await calculationBasis.selectOption('complex-or-unsure');
  await expect(tax).toContainText('Insufficient information to assess eligibility');
  await expect(tax.locator('.kv')).toHaveCount(0);
  await calculationBasis.selectOption('ordinary-progressive');
  await expect(tax).toContainText('Compatible with the supplied conditions');
  await expect(tax.locator('.kv > div').filter({ hasText: 'One-time conditional tax saving' }).locator('b')).toContainText('32,500');
  await expect(page.locator('.rhero .ba .now')).toHaveText(originalBill);
  await expect(invoicePrice).toHaveText(originalInvoice);
  expect(await page.evaluate(() => sessionStorage.getItem('solarmatch:estimate'))).toBe(originalEstimate);
  const stored = await browserStorage(page);
  expect(stored).toEqual(originalStorage);
  expect(sent).toEqual(sentBeforeTax);
  for (const raw of [...Object.values(stored.session), ...Object.values(stored.local)]) {
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* Non-JSON storage values are still checked as exact scalars. */ }
    assertNoPrivateScenarioData(parsed);
  }
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  const visibleLink = page.getByRole('textbox', { name: 'Estimate link', exact: true });
  await expect(visibleLink).toBeVisible();
  await expect(visibleLink).toHaveAttribute('readonly', '');
  const link = await visibleLink.inputValue();
  if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  const payload = JSON.parse(decodeURIComponent(new URL(link).hash.slice('#sm-estimate='.length)));
  expect(payload.modelVersion).toBe('residential-hourly-2026-10-17-v3');
  assertNoPrivateScenarioData(payload);
  for (const raw of sent) {
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* Exact scalar and field checks remain applicable. */ }
    assertNoPrivateScenarioData(parsed);
  }
  await page.reload();
  await expect(page.locator('.rhero h1')).toBeVisible({ timeout: 20_000 });
  const breakdown = page.locator('.v2-breakdown > details');
  if (await breakdown.getAttribute('open') === null) await breakdown.locator(':scope > summary').click();
  await expect(page.locator('.calculator-model-details')).toBeVisible();
  await page.getByText('Personal solar tax relief (optional)', { exact: true }).click();
  await expect(page.getByLabel('Annual net taxable income BEFORE solar relief (THB)', { exact: true })).toHaveValue('');
});

for (const locale of ['en', 'th'] as const) {
  test(`${locale}: entered finance and verified export scenarios remain separate from the base bill saving`, async ({ page }) => {
    await seed(page, modern, locale);
    const en = locale === 'en';
    const hero = await page.locator('.rhero .ba .now').innerText();
    const invoice = page.locator('.rstats > div').nth(1).locator('b');
    const invoiceText = await invoice.innerText();
    const systemCostBaht = Number(invoiceText.replace(/[^\d.-]/g, ''));
    const finance = page.locator('main details').filter({ has: page.locator('summary', { hasText: en
      ? 'Financing from your actual quote (optional)' : 'จำลองการผ่อนจากใบเสนอราคาของคุณ (ไม่บังคับ)' }) });
    await finance.locator(':scope > summary').click();
    for (const [label, value] of [
      [en ? 'Deposit (THB)' : 'เงินดาวน์ (บาท)', '20000'],
      [en ? 'Term (months)' : 'ระยะเวลาผ่อน (เดือน)', '60'],
      [en ? 'Annual rate (%)' : 'อัตราดอกเบี้ยต่อปี (%)', '6'],
      [en ? 'Upfront fees (THB, optional)' : 'ค่าธรรมเนียมจ่ายล่วงหน้า (บาท ไม่บังคับ)', '1000'],
      [en ? 'Fees added to the loan (THB, optional)' : 'ค่าธรรมเนียมรวมในยอดกู้ (บาท ไม่บังคับ)', '5000'],
    ]) await finance.getByRole('spinbutton', { name: label, exact: true }).fill(value);
    await finance.getByRole('combobox', { name: en ? 'Rate basis' : 'วิธีคิดดอกเบี้ย', exact: true }).selectOption('reducing');
    const expected = calculateFinanceScenario({ systemCostBaht, depositBaht: 20_000, termMonths: 60,
      annualRatePercent: 6, rateBasis: 'reducing', upfrontFeesBaht: 1_000, financedFeesBaht: 5_000,
      monthlyBenefitBaht: 0 });
    expect(expected.status).toBe('modelled');
    for (const [label, amount] of [
      [en ? 'Loan principal, including financed fees' : 'ยอดเงินต้น รวมค่าธรรมเนียมที่กู้เพิ่ม', expected.principalBaht],
      [en ? 'Monthly instalment' : 'ค่างวดรายเดือน', expected.monthlyPaymentBaht],
      [en ? 'Initial cash: deposit + upfront fees' : 'เงินสดเริ่มต้น: เงินดาวน์ + ค่าธรรมเนียมล่วงหน้า', expected.upfrontCashBaht],
    ] as const) {
      const row = finance.locator('.kv > div').filter({ hasText: label });
      await expect(row.locator('b')).toBeVisible();
      expect(Number((await row.locator('b').innerText()).replace(/[^\d.-]/g, ''))).toBe(Math.round(amount!));
    }

    const exportDetails = page.locator('main details').filter({ has: page.locator('summary', { hasText: en
      ? 'Export under a verified purchase contract (optional)' : 'ขายไฟตามสัญญารับซื้อที่ตรวจสอบแล้ว (ไม่บังคับ)' }) });
    await exportDetails.locator(':scope > summary').click();
    await expect(exportDetails).toContainText(en ? 'synthetic intervals for the representative year 2027' : 'ข้อมูลรายช่วงเวลาจำลองของปีตัวแทน 2027');
    await exportDetails.getByRole('checkbox', { name: en ? 'I have verified these terms in my own purchase contract' : 'ฉันตรวจสอบเงื่อนไขเหล่านี้จากสัญญารับซื้อของตนเองแล้ว', exact: true }).check();
    await exportDetails.getByRole('spinbutton', { name: en ? 'Contract rate (THB/kWh)' : 'อัตราตามสัญญา (บาทต่อหน่วย)', exact: true }).fill('2.2');
    await exportDetails.getByLabel(en ? 'Contract start date' : 'วันเริ่มรับซื้อตามสัญญา', { exact: true }).fill('2027-01-01');
    await exportDetails.getByLabel(en ? 'Contract final date (inclusive)' : 'วันสุดท้ายที่รับซื้อ (รวมวันนี้)', { exact: true }).fill('2027-12-31');
    await exportDetails.getByRole('spinbutton', { name: en ? 'Contract AC export limit (kW)' : 'เพดานกำลังไฟส่งออก AC ตามสัญญา (กิโลวัตต์)', exact: true }).fill('0.5');
    const energy = exportDetails.locator('.kv > div').filter({ hasText: en ? 'Export within contract and interval AC limits' : 'ไฟส่วนเกินภายในช่วงสัญญาและเพดาน AC ของแต่ละช่วง' }).locator('b');
    const revenue = exportDetails.locator('.kv > div').filter({ hasText: en ? 'Export income for the supplied intervals only' : 'รายได้ขายไฟเฉพาะช่วงข้อมูลที่นำมาคำนวณ' }).locator('b');
    await expect(energy).toBeVisible();
    await expect(revenue).toBeVisible();
    const exportedKwh = Number((await energy.innerText()).replace(/[^\d.-]/g, ''));
    const exportRevenue = Number((await revenue.innerText()).replace(/[^\d.-]/g, ''));
    expect(Number.isFinite(exportedKwh)).toBe(true);
    expect(exportedKwh).toBeGreaterThan(0);
    expect(exportedKwh).toBeLessThanOrEqual(8760 * 0.5);
    expect(Number.isFinite(exportRevenue)).toBe(true);
    expect(exportRevenue).toBeGreaterThan(0);
    expect(exportRevenue).toBeLessThanOrEqual(Math.ceil(8760 * 0.5 * 2.2));
    // Energy displays one decimal; currency displays whole baht.
    expect(Math.abs(exportRevenue - exportedKwh * 2.2)).toBeLessThanOrEqual(0.5 + 0.05 * 2.2 + 1e-6);
    await expect(page.locator('.rhero .ba .now')).toHaveText(hero);
    await expect(invoice).toHaveText(invoiceText);
  });

  test(`${locale}: expanded result scenarios fit narrow mobile widths`, async ({ page }, info) => {
    test.setTimeout(90_000);
    await seed(page, modern, locale);
    const details = page.locator('main.results-page details');
    for (let index = 0; index < await details.count(); index++) {
      const detail = details.nth(index);
      if (await detail.getAttribute('open') === null) await detail.locator(':scope > summary').click();
    }
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (width === 390) await page.screenshot({ path: info.outputPath(`calculator-v3-${locale}-390.png`), fullPage: true, scale: 'css' });
    }
    const accessibility = await new AxeBuilder({ page }).include('main.results-page')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(accessibility.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([]);
  });

  test(`${locale}: optional tax inputs work through native keyboard navigation`, async ({ page }) => {
    await seed(page, modern, locale);
    const taxTitle = locale === 'en' ? 'Personal solar tax relief (optional)' : 'สิทธิภาษีโซลาร์บุคคลธรรมดา (ไม่บังคับ)';
    const summary = page.locator('main summary').filter({ hasText: taxTitle });
    const tax = summary.locator('..');
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(tax).toHaveAttribute('open', '');
    await page.keyboard.press('Tab');
    const timing = tax.getByRole('combobox', { name: locale === 'en' ? 'Scenario timing' : 'ช่วงเวลาของข้อมูล', exact: true });
    await expect(timing).toBeFocused();
    await page.keyboard.press('Tab');
    const basis = tax.getByRole('combobox', { name: locale === 'en' ? 'Tax calculation basis' : 'วิธีคำนวณภาษีของคุณ', exact: true });
    await expect(basis).toBeFocused();
    await page.keyboard.press('Tab');
    const income = tax.getByRole('spinbutton', { name: locale === 'en' ? 'Annual net taxable income BEFORE solar relief (THB)' : 'เงินได้สุทธิทั้งปีก่อนใช้สิทธิโซลาร์ (บาท)', exact: true });
    await expect(income).toBeFocused();
    await page.keyboard.type('800000');
    await expect(income).toHaveValue('800000');
    await page.keyboard.press('Shift+Tab');
    await expect(basis).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(timing).toBeFocused();
    await expect(tax).toContainText(locale === 'en' ? 'Insufficient information to assess eligibility' : 'ข้อมูลยังไม่พอประเมินสิทธิ');
  });

  test(`${locale}: qv8 completes the actual no-contact journey using real kWh without a bill amount`, async ({ page }) => {
    test.setTimeout(90_000);
    await localApis(page);
    const submitted: string[] = [];
    page.on('request', request => { if (/\/api\/(?:leads|enquiries|assessment\/submit)/.test(request.url())) submitted.push(request.url()); });
    await page.goto(locale === 'en' ? '/en/estimate' : '/estimate');
    const values: Record<string, string> = { projectType: 'new-rooftop', daytimePattern: 'high', roofArea: '100-200',
      shade: 'almost-none', propertyType: 'detached-home', ownershipStatus: 'owner', activelyPlanningSolar: 'within-3-months',
      daytimeLoads: 'none', roofMaterial: 'concrete-tile', quoteContactRequested: 'no' };
    for (let index = 0; index < homeownerDesignV3Questionnaire.questions.length; index++) {
      const question = homeownerDesignV3Questionnaire.questions[index];
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index + 1));
      await expect(page.locator('#estimate-question')).toContainText(question.title[locale]);
      const next = page.locator('.estimate-actions > button').last();
      await expect(next).toBeEnabled();
      if (question.id === 'province') {
        await page.locator('#estimate-province').selectOption('bangkok');
        await page.locator('#estimate-district').selectOption('sathon');
        await next.click();
      } else if (question.id === 'monthlyBillThb') {
        await page.locator('.energy-bill-details > summary').click();
        await page.getByRole('combobox', { name: locale === 'en' ? 'Use a bill amount or actual electricity units?' : 'ต้องการกรอกค่าไฟหรือหน่วยไฟที่ใช้จริง?', exact: true }).selectOption('kwh');
        await page.getByLabel(locale === 'en' ? 'Electricity used in this billing period (kWh)' : 'หน่วยไฟที่ใช้ในรอบบิลนี้ (kWh)', { exact: true }).fill('1200');
        await page.getByRole('spinbutton', { name: locale === 'en' ? /^Days in this billing period \(optional\)/ : /^จำนวนวันในรอบบิลนี้ \(ถ้าทราบ\)/ }).fill('30');
        await next.click();
      } else {
        const option = question.options!.find(item => item.value === values[question.id])!;
        await page.getByRole(question.type === 'multichoice' ? 'checkbox' : 'radio').filter({ has: page.getByText(option.label[locale], { exact: true }) }).click();
        if (question.id === 'roofArea') {
          await page.getByRole('combobox', { name: locale === 'en' ? 'Electricity phase' : 'ระบบไฟฟ้า', exact: true }).selectOption('three');
        }
        if (['daytimePattern', 'roofArea', 'daytimeLoads', 'quoteContactRequested'].includes(question.id)) await next.click();
      }
    }
    await expect(page).toHaveURL(new RegExp((locale === 'en' ? '/en' : '') + '/estimate/results$'));
    await expect(page.locator('.calculator-model-details')).toContainText('residential-hourly-2026-10-17-v3', { timeout: 20_000 });
    await expect(page.locator('.rhero .eyebrow')).toContainText(locale === 'en' ? 'Reference bill' : 'ค่าไฟอ้างอิง');
    await expect(page.locator('.rhero .ba .was')).toBeVisible();
    await expect(page.locator('.rhero .ba .now')).toBeVisible();
    await expect(page.locator('.bars')).toHaveCount(0);
    await expect(page.locator('input[autocomplete="tel"]')).toHaveCount(0);
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate')!));
    expect(saved.estimateModelVersion).toBe('energy-v3');
    expect(saved.consumptionInput).toBe('kwh');
    expect(saved.monthlyConsumptionKwh).toBe(1200);
    expect(saved.monthlyBillThb).toBe(0);
    expect(saved.quoteContactRequested).toBe(false);
    expect(saved.quoteConsentAccepted).toBeUndefined();
    expect(submitted).toEqual([]);
  });
}
