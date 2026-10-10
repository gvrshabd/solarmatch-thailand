import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import legalReviewCopy from '../../config/installer-commercial-copy';

async function openReview(page: Page, locale: 'en' | 'th', enabled = false) {
  const requests = { submissions: 0, configurations: 0 };
  await page.route('**/api/leads', (route) => { requests.submissions++; return route.abort(); });
  await page.route('**/api/assessment/config', async (route) => {
    requests.configurations++;
    const response = await route.fetch();
    const config = await response.json();
    config.liveLeadSubmissions = enabled;
    config.contact.enabled = enabled;
    config.contact.mode = enabled ? 'shared_solar_company_handoff' : 'disabled';
    config.assessmentToken = enabled ? 'review-must-not-use-this-token' : null;
    // Review must use the supplied review version, never old persisted wording.
    config.contact.consent = { en: 'Obsolete consent', th: 'ข้อความเก่า' };
    await route.fulfill({ response, json: config });
  });
  await page.addInitScript(() => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ version: 9, step: 10, answers: {
    province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true,
    planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home',
    ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning'],
    airConditionerCount: 5, roofMaterial: 'concrete-tile', shade: 'almost-none',
  } })));
  await page.goto(locale === 'en' ? '/en/estimate' : '/estimate');
  const option = page.getByRole('radio', { name: locale === 'en' ? /^Test/ : /^ทดสอบ/ });
  await expect(option).toHaveAttribute('aria-checked', 'false');
  await option.click();
  return requests;
}

async function showForm(page: Page, locale: 'en' | 'th') {
  await page.locator('.quote-consent-check input').check();
  await page.getByRole('button', { name: locale === 'en' ? 'Continue' : 'ถัดไป', exact: true }).click();
  await expect(page.locator('.contact-form-step[data-review-only="true"]')).toBeVisible();
}

async function expectNoStoredDetails(page: Page) {
  const storage = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }));
  expect(storage).not.toContain('ReviewOnlyFirst');
  expect(storage).not.toContain('ReviewOnlyLast');
  expect(storage).not.toContain('review-only-line');
  expect(page.url()).not.toContain('ReviewOnly');
}

for (const locale of ['en', 'th'] as const) {
  test(`${locale}: Test previews exact consent and contact fields without submitting or storing details`, async ({ page }, testInfo) => {
    if (testInfo.project.name.startsWith('mobile')) await page.setViewportSize({ width: 320, height: 800 });
    const requests = await openReview(page, locale);
    const consent = page.locator('.quote-consent-check input');
    await expect(page.locator('.quote-consent-check span')).toHaveText(legalReviewCopy.contactLaunch.consent[locale]);
    await expect(consent).not.toBeChecked();
    await expect(page.locator('.quote-consent-check a')).toHaveAttribute('href', locale === 'en' ? '/en/privacy' : '/privacy');
    await expect(page.locator('.quote-consent-check a')).toHaveAttribute('target', '_blank');
    await page.getByRole('button', { name: locale === 'en' ? 'Continue' : 'ถัดไป', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(locale === 'en' ? 'Tick the consent box' : 'กรุณาทำเครื่องหมาย');
    await expect(page.locator('.contact-form-step')).toBeHidden();
    await showForm(page, locale);
    const form = page.locator('.contact-form-step');
    await expect(form.locator('[role="status"]')).toContainText(locale === 'en' ? 'Test only' : 'สำหรับทดสอบเท่านั้น');
    await expect(form.locator('.contact-form-grid')).toHaveCount(1);
    await expect(form.locator('input[type="tel"]')).toHaveValue('');
    await expect(form.getByRole('radio', { name: 'LINE', exact: true })).toHaveCount(0);
    await expect(form.locator('.contact-adult-confirmation input')).not.toBeChecked();
    const finish = form.getByRole('button', { name: locale === 'en' ? 'Finish test and view my estimate' : 'จบการทดสอบและดูผลประเมิน', exact: true });
    await finish.click();
    await expect(form.locator('[role="alert"]').first()).toBeVisible();
    await form.getByRole('textbox', { name: locale === 'en' ? /^First name/ : /^ชื่อ/ }).fill('ReviewOnlyFirst');
    await form.getByRole('textbox', { name: locale === 'en' ? /^Last name/ : /^นามสกุล/ }).fill('ReviewOnlyLast');
    await expect(form.locator('input[type="tel"]')).toBeVisible();
    await form.locator('input[type="tel"]').fill('0812345678');
    await expect(form.getByRole('textbox', { name: /^LINE ID/ })).toHaveCount(0);
    await form.locator('.contact-adult-confirmation input').check();
    await expectNoStoredDetails(page);
    const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft') ?? '{}'));
    expect(draft.answers.quoteContactRequested).toBe(false);
    expect(draft.answers.quoteConsentAccepted).toBeUndefined();
    expect((await new AxeBuilder({ page }).include('.contact-form-step').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    expect(requests.configurations).toBe(1);
    await finish.click();
    await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5, { timeout: 15_000 });
    await expectNoStoredDetails(page);
    expect(requests.submissions).toBe(0);
    // The results page performs its ordinary configuration read; the test form
    // must never trigger a token/configuration refresh while it is open.
    expect(requests.configurations).toBeLessThanOrEqual(2);
    const resultAnswers = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate') ?? '{}'));
    expect(resultAnswers.quoteContactRequested).toBe(false);
    expect(resultAnswers.quoteConsentAccepted).toBeUndefined();
  });
}

test('Test remains non-submitting even when the real contact configuration is enabled', async ({ page }) => {
  const requests = await openReview(page, 'en', true);
  await showForm(page, 'en');
  const form = page.locator('.contact-form-step');
  await form.getByRole('textbox', { name: 'First name', exact: true }).fill('ReviewOnlyFirst');
  await form.getByRole('textbox', { name: 'Last name', exact: true }).fill('ReviewOnlyLast');
  await form.locator('input[type="tel"]').fill('0812345678');
  await form.locator('.contact-adult-confirmation input').check();
  const finish = form.getByRole('button', { name: 'Finish test and view my estimate', exact: true });
  expect(requests.configurations).toBe(1);
  await finish.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5, { timeout: 15_000 });
  expect(requests.submissions).toBe(0);
  expect(requests.configurations).toBeLessThanOrEqual(2);
  await expectNoStoredDetails(page);
});

test('Back, No, and restart clear test consent and contact details', async ({ page }) => {
  const requests = await openReview(page, 'en');
  await showForm(page, 'en');
  await page.getByRole('textbox', { name: 'First name', exact: true }).fill('ReviewOnlyFirst');
  await page.locator('.contact-form-step').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.quote-consent-check input')).not.toBeChecked();
  await expect(page.locator('#estimate-question')).toBeFocused();
  await page.getByRole('radio', { name: 'No, show my estimate without installer contact', exact: true }).click();
  await expect(page.locator('.quote-consent-check')).toHaveCount(0);
  await page.getByRole('radio', { name: /^Test/ }).click();
  await expect(page.locator('.quote-consent-check input')).not.toBeChecked();
  await showForm(page, 'en');
  await expect(page.getByRole('textbox', { name: 'First name', exact: true })).toHaveValue('');
  await expect(page.locator('.contact-adult-confirmation input')).not.toBeChecked();
  await page.locator('.contact-form-step').getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Clear and start over', exact: true }).click();
  await expect(page.locator('#estimate-question')).toHaveText('Where is the property located?');
  const draft = await page.evaluate(() => JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft') ?? '{}'));
  expect(draft.answers).toEqual({});
  await expectNoStoredDetails(page);
  expect(requests.submissions).toBe(0);
});
