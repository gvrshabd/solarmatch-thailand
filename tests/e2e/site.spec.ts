import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { initialQuestionnaire } from '../../config/assessment';

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, activelyPlanningSolar: true, propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false, roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

const exactSharedConsent = {
  en: 'I explicitly consent to SolarMatch storing my request and information, and I give SolarMatch permission to share my name, contact details, location and relevant assessment answers with solar service providers, installers, their authorized representatives, or other businesses involved in providing solar services, so they may contact me with relevant solar information and/or offers for solar-related services. I understand that SolarMatch may be paid for the connection and that choosing Yes does not guarantee that I will be contacted or receive a quotation. I have read the Privacy Notice.',
  th: 'ข้าพเจ้ายินยอมโดยชัดแจ้งให้ SolarMatch จัดเก็บคำขอและข้อมูลของข้าพเจ้า และอนุญาตให้ SolarMatch ส่งต่อหรือเปิดเผยชื่อ ข้อมูลติดต่อ สถานที่ตั้ง และคำตอบที่เกี่ยวข้องจากแบบประเมินของข้าพเจ้าแก่ผู้ให้บริการด้านโซลาร์ ผู้ติดตั้ง ตัวแทนที่ได้รับอนุญาตของผู้ให้บริการหรือผู้ติดตั้งดังกล่าว หรือธุรกิจอื่นที่เกี่ยวข้องกับการให้บริการด้านโซลาร์ เพื่อให้บุคคลหรือธุรกิจเหล่านั้นสามารถติดต่อข้าพเจ้าพร้อมข้อมูลที่เกี่ยวข้องกับโซลาร์ และ/หรือข้อเสนอเกี่ยวกับบริการที่เกี่ยวข้องกับโซลาร์ ข้าพเจ้าเข้าใจว่า SolarMatch อาจได้รับค่าตอบแทนจากการเชื่อมโยงดังกล่าว และการเลือก “ใช่” ไม่ได้รับประกันว่าจะมีผู้ใดติดต่อข้าพเจ้า หรือว่าข้าพเจ้าจะได้รับใบเสนอราคา ข้าพเจ้าได้อ่านประกาศความเป็นส่วนตัวแล้ว',
};

function operationalConfiguration() {
  return {
    privatePreview: false,
    accessRestrictedSession: true,
    restrictedSiteCollectionEnabled: true,
    publicCollectionEnabled: false,
    releaseId: 'residential-release-v4',
    questionnaireVersionId: 'residential-questionnaire-v3',
    ruleVersionId: 'residential-rules-v3',
    questionnaire: initialQuestionnaire,
    assessmentToken: 'a'.repeat(96),
    assessmentTokenExpiresAt: '2099-01-01T00:00:00.000Z',
    liveLeadSubmissions: true,
    receivingCompany: null,
    contact: {
      enabled: true, preview: false, restrictedSiteCollectionEnabled: true, publicCollectionEnabled: false,
      operationalDistributionEnabled: false, mode: 'shared_solar_company_handoff',
      contactConfigurationVersionId: 'contact-configuration-consent-v2', contentVersionId: 'residential-content-consent-v2', privacyVersion: 'legal-placeholder-v1',
      retentionDays: null, distributionWindowDays: null, recipientCategory: 'participating_residential_solar_companies',
      adultConfirmationVersionId: 'restricted-operational-adult-v1', consentVersionId: 'restricted-operational-consent-v2', privacyNoticeVersionId: 'legal-placeholder-v1', termsVersionId: null, cookiePolicyVersionId: null,
      question: { en: 'Want real quotes from local installers?', th: 'อยากได้ใบเสนอราคาจริงจากผู้ติดตั้งในพื้นที่ไหม?' },
      help: { en: 'Choose Yes or No to continue.', th: 'เลือกใช่หรือไม่ใช่เพื่อดำเนินการต่อ' },
      yesLabel: { en: 'Yes, I would like solar companies to contact me', th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับ' },
      noLabel: { en: 'No', th: 'ไม่ใช่' },
      consent: exactSharedConsent,
      declineTitle: { en: 'Continue without contact details', th: 'ดูผลประเมินต่อโดยไม่ต้องให้ข้อมูลติดต่อ' },
      declineBody: { en: 'Your estimate is still available. You can continue now without providing contact details.', th: 'คุณยังดูผลประเมินได้ตามปกติโดยไม่ต้องให้ข้อมูลติดต่อ' },
      declineContinueLabel: { en: 'Continue to my result', th: 'ดูผลประเมินต่อ' },
      skipLabel: { en: 'Continue to my results without submitting', th: 'ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ' },
      failureTitle: { en: 'We could not save your contact request', th: 'ยังบันทึกคำขอติดต่อไม่ได้' },
      failureBody: { en: 'Your assessment and result are safe in this browser. You can try again or continue to your result without submitting contact details.', th: 'คำตอบและผลประเมินของคุณยังอยู่ในเบราว์เซอร์นี้ คุณสามารถลองอีกครั้งหรือดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ' },
      adultConfirmation: { en: 'I confirm that I am at least 20 years old and that I am the property owner or am authorized by the property owner to request contact about this property.', th: 'ฉันยืนยันว่ามีอายุอย่างน้อย 20 ปี และเป็นเจ้าของอสังหาริมทรัพย์หรือได้รับอนุญาตจากเจ้าของให้ขอรับการติดต่อเกี่ยวกับอสังหาริมทรัพย์นี้' },
      recipient: null, permittedContactMethods: ['phone', 'line'], sharedFields: ['legalFirstName', 'legalLastName', 'phone', 'preferredContactMethod', 'lineId', 'assessmentAnswers'],
    },
    loadingFactSetVersionId: 'loading-facts-v1',
    loadingFacts: [],
  };
}

async function primeQuoteStep(page: Page) {
  await page.addInitScript(({ answers, configuration }) => {
    sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
      version: 6, answers, step: 10, questionnaireVersionId: configuration.questionnaireVersionId,
      releaseId: configuration.releaseId, assessmentToken: configuration.assessmentToken,
      assessmentTokenExpiresAt: configuration.assessmentTokenExpiresAt,
    }));
  }, { answers: { ...savedEstimate, quoteContactRequested: undefined }, configuration: operationalConfiguration() });
}

const thaiHeaderLinks = [['หน้าหลัก', '/'], ['ประเมินโซลาร์', '/estimate'], ['วิธีการทำงาน', '/how-it-works'], ['คู่มือโซลาร์', '/solar-guide'], ['วิธีคำนวณ', '/methodology'], ['เกี่ยวกับเรา', '/about']] as const;
const englishHeaderLinks = [['Home', '/en'], ['Solar estimate', '/en/estimate'], ['How it works', '/en/how-it-works'], ['Solar guide', '/en/solar-guide'], ['Methodology', '/en/methodology'], ['About', '/en/about']] as const;

function desktopOnly(testInfo: TestInfo) { test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only coverage.'); }
async function expectPath(page: Page, path: string) { await expect.poll(() => new URL(page.url()).pathname).toBe(path); }

async function expectHeading(page: Page, name: string) {
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
}

async function choose(page: Page, name: string | RegExp, next: string) {
  await page.getByRole('radio', { name, exact: typeof name === 'string' }).click();
  await page.getByRole('button', { name: next, exact: true }).click();
}

async function completeEstimate(page: Page, locale: 'th' | 'en', bill = '6000') {
  const en = locale === 'en';
  await page.goto(en ? '/en' : '/');
  const starter = page.locator('#hero-estimator');
  await starter.getByRole('textbox').fill(bill);
  await starter.getByRole('button', { name: en ? 'See my solar estimate' : 'ดูค่าประเมินโซลาร์' }).click();
  await expectPath(page, en ? '/en/estimate' : '/estimate');
  await expectHeading(page, en ? 'Are you actively planning to install solar?' : 'คุณกำลังวางแผนติดตั้งโซลาร์อยู่หรือไม่?');
  const next = en ? 'Next' : 'ถัดไป';
  await choose(page, en ? 'Yes' : 'ใช่', next);
  await choose(page, en ? 'Detached house' : 'บ้านเดี่ยว', next);
  await choose(page, en ? 'I own the property' : 'เป็นเจ้าของกรรมสิทธิ์', next);
  await choose(page, en ? '60–100 m²' : '60–100 ตร.ม.', next);
  await choose(page, en ? /High Several appliances/ : /มาก มีเครื่องใช้ไฟฟ้าหลายอย่าง/, next);
  await page.getByRole('checkbox', { name: en ? 'Air conditioning' : 'เครื่องปรับอากาศ' }).click();
  await page.getByRole('checkbox', { name: en ? 'Home-office computers or equipment' : 'คอมพิวเตอร์หรืออุปกรณ์ทำงานที่บ้าน' }).click();
  await page.getByLabel(en ? 'How many air-conditioning units are installed at this property?' : 'บ้านหรือที่พักอาศัยนี้ติดตั้งเครื่องปรับอากาศทั้งหมดกี่เครื่อง?').selectOption('5');
  await page.getByRole('button', { name: next, exact: true }).click();
  await choose(page, en ? 'Concrete roof tiles' : 'กระเบื้องคอนกรีต', next);
  await choose(page, en ? 'Almost none' : 'แทบไม่มี', next);
  await page.getByRole('radio', { name: en ? 'No' : 'ไม่ใช่', exact: true }).click();
  await page.getByRole('button', { name: en ? 'See my estimate' : 'ดูผลประเมิน', exact: true }).click();
  await expectPath(page, en ? '/en/estimate/results' : '/estimate/results');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(en ? 'Simple cash payback' : 'คืนทุนเงินสดอย่างง่าย')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('main')).not.toContainText(/Needs more information|ต้องมีข้อมูลเพิ่ม|Evidence confidence|ความมั่นใจจากหลักฐาน/);
}

test.beforeEach(async ({ page }) => { await page.route('https://tile.openstreetmap.org/**', (route) => route.abort()); });

test('homepage reflects the lead-first brief and language spacing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ค่าไฟบ้านคุณ');
  await expect(page.locator('main')).toContainText('ประหยัดค่าไฟ พร้อมช่วยโลกไปด้วยกัน');
  await expect(page.locator('main')).not.toContainText(/ตัวอย่างผลเพื่อวางแผน|ประมาณ 5 kWp|ไม่ใช่คำสัญญาหรือใบเสนอราคา/);
  await expect(page.locator('footer')).not.toContainText('©');
  const switcher = page.getByRole('link', { name: 'View this page in English' });
  await expect(switcher).toHaveText('TH / EN');
  expect(await switcher.evaluate((element) => Number.parseFloat(getComputedStyle(element).gap))).toBeGreaterThan(0);
});

test('bill field can be emptied and supports large values without a 50,000 cap', async ({ page }) => {
  await page.goto('/en');
  const input = page.locator('#hero-monthly-bill');
  await input.fill('0');
  await input.press('Backspace');
  await expect(input).toHaveValue('');
  await input.fill('250000');
  await expect(input).toHaveValue('250000');
  await expect(page.locator('#hero-estimator input[type="range"]')).toHaveAttribute('max', '250000');
});

test('homepage bill and province hand off once and skip duplicate questions', async ({ page }) => {
  await page.goto('/en');
  await page.locator('#hero-province').selectOption('nonthaburi');
  await page.locator('#hero-monthly-bill').fill('85000');
  await page.getByRole('button', { name: 'See my solar estimate' }).click();
  await expectPath(page, '/en/estimate');
  await expectHeading(page, 'Are you actively planning to install solar?');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About how much is the electricity bill in a typical month?' })).toBeVisible();
  await expect(page.locator('#monthly-bill')).toHaveValue('85000');
});

test('all desktop navigation anchors work in Thai and English', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  for (const [home, navigation, links] of [['/', 'เมนูหลัก', thaiHeaderLinks], ['/en', 'Primary navigation', englishHeaderLinks]] as const) {
    for (const [label, path] of links) {
      await page.goto(home);
      const link = page.getByRole('navigation', { name: navigation }).getByRole('link', { name: label, exact: true });
      await expect(link).toHaveAttribute('href', path);
      await link.click();
      await expectPath(page, path);
    }
  }
});

test('required estimator uses eleven concise residential questions and focused chrome', async ({ page }) => {
  await page.goto('/en/estimate');
  await expect(page.getByRole('progressbar').locator(':scope > span')).toHaveCount(11);
  await expect(page.locator('header').getByRole('link', { name: 'Exit estimate' })).toBeVisible();
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/kWh figure|TOU|On Peak|Off Peak|What period/);
});

test('refresh and language switching preserve estimator progress', async ({ page }) => {
  await page.goto('/estimate');
  await page.locator('#estimate-province').selectOption('bangkok');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.locator('#monthly-bill').fill('7200');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByRole('radio', { name: 'ใช่', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'ใช่', exact: true })).toBeChecked();
  await page.getByRole('link', { name: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' }).click();
  await expect(page.getByRole('radio', { name: 'Yes', exact: true })).toBeChecked();
});

test('complete Thai and English journeys produce every metric', async ({ page }) => {
  test.setTimeout(60_000);
  await completeEstimate(page, 'th');
  await completeEstimate(page, 'en');
});

test('optional precision details visibly recalculate results', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await expect(page.getByText('First-year production')).toBeVisible({ timeout: 10_000 });
  const production = page.getByText('First-year production').locator('..').locator('strong');
  const before = await production.textContent();
  await page.locator('.accuracy-upgrade summary').click();
  await page.getByLabel('Main roof direction').selectOption('north');
  await page.getByLabel('Roof slope').selectOption('steep');
  await expect(page.locator('.calculation-updated[role="status"]')).toContainText('Roof slope applied');
  await expect(production).not.toHaveText(before ?? '');
});

test('optional map never sends the typed address to a geocoder', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await page.locator('.accuracy-upgrade summary').click();
  await page.getByLabel('Exact address (optional)').fill('777 Privacy Test Lane Bangkok');
  await page.getByRole('button', { name: 'Position on map' }).click();
  await expect(page.getByRole('button', { name: 'Put marker at map centre' })).toBeVisible();
  expect(requests.some((url) => decodeURIComponent(url).includes('777 Privacy Test Lane'))).toBe(false);
});

test('disabled contact release requests no personal information', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await expect(page.getByRole('heading', { name: 'Preparing your solar estimate' })).toBeVisible();
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel(/Thai mobile number|legal first name/i)).toHaveCount(0);
  await expect(page.locator('.result-fact-section .solar-fact-card')).toHaveCount(0);
});

test('integrated quote question starts unselected and No reaches the full estimate without PII', async ({ page }) => {
  let leadRequests = 0;
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await page.route('**/api/leads', (route) => { leadRequests += 1; return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }); });
  await primeQuoteStep(page);
  await page.goto('/en/estimate');

  const yes = page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me' });
  const no = page.getByRole('radio', { name: 'No', exact: true });
  const consent = page.getByRole('checkbox', { name: /I explicitly consent to SolarMatch storing my request/u });
  await expect(page.getByRole('heading', { name: 'Want real quotes from local installers?' })).toBeVisible();
  await expect(yes).not.toBeChecked();
  await expect(no).not.toBeChecked();
  await expect(consent).toBeVisible();
  await expect(consent).not.toBeChecked();
  await no.click();
  await expect(consent).toBeDisabled();
  await page.getByRole('button', { name: 'See my estimate' }).click();
  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
  expect(leadRequests).toBe(0);
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveCount(0);
});

test('Thai contact consent is verbatim, unselected, and links its Privacy Notice phrase', async ({ page }) => {
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await primeQuoteStep(page);
  await page.goto('/estimate');

  const consent = page.getByRole('checkbox', { name: /ข้าพเจ้ายินยอมโดยชัดแจ้งให้ SolarMatch จัดเก็บคำขอ/u });
  await expect(consent).not.toBeChecked();
  await expect(page.locator('.quote-consent-check')).toHaveText(exactSharedConsent.th);
  await expect(page.getByRole('link', { name: 'ประกาศความเป็นส่วนตัว', exact: true })).toHaveAttribute('href', '/privacy');
});

test('Yes requires disclosure consent and stores an operational request from one contact form', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await page.route('**/api/leads', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, leadId: crypto.randomUUID(), testSubmission: false }) });
  });
  await primeQuoteStep(page);
  await page.goto('/en/estimate');

  await page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me' }).click();
  const consent = page.getByRole('checkbox', { name: /I explicitly consent to SolarMatch storing my request/u });
  await expect(consent).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Privacy Notice', exact: true })).toHaveAttribute('href', '/en/privacy');
  await expect(page.locator('.quote-consent-check')).toHaveText(exactSharedConsent.en);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tick the consent box');
  await consent.check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Where should installers contact you?' })).toBeFocused();
  await page.locator('input[autocomplete="given-name"]').fill('Private');
  await page.locator('input[autocomplete="family-name"]').fill('Tester');
  await page.getByRole('radio', { name: 'LINE' }).check();
  await expect(page.locator('input[autocomplete="tel"]')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'LINE ID' }).fill('private.tester');
  const adult = page.getByRole('checkbox', { name: /I confirm that I am at least 20 years old/u });
  await expect(adult).not.toBeChecked();
  await adult.check();
  await page.getByRole('button', { name: 'Submit my request' }).click();

  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  expect(submitted).toMatchObject({ legalFirstName: 'Private', legalLastName: 'Tester', contactMethod: 'line', lineId: 'private.tester', adultConfirmed: true, consent: true });
  expect(submitted).not.toHaveProperty('phone');
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
});

test('assessment transitions preserve direction, focus and block rapid double navigation', async ({ page }) => {
  await page.goto('/en/estimate');
  await page.locator('#estimate-province').selectOption('bangkok');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.evaluate((element) => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expectHeading(page, 'About how much is the electricity bill in a typical month?');
  await expect(page.locator('.question-stage')).toHaveAttribute('data-transition-direction', 'forward');
  await expect(page.getByRole('heading', { name: 'About how much is the electricity bill in a typical month?' })).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.question-stage')).toHaveAttribute('data-transition-direction', 'backward');
  await expect(page.getByRole('heading', { name: 'Where is the property located?' })).toBeFocused();
});

test('loading fact stays paired, uses the minimal loading surface, and is not repeated on results', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  const loadingFact = page.locator('.calculation-fact');
  await expect(loadingFact).toBeVisible();
  await expect(loadingFact.getByText('DID YOU KNOW?')).toBeVisible();
  await expect(loadingFact.getByRole('link', { name: 'View reference' })).toHaveAttribute('href', /^\/en\/resources#/u);
  await expect(page.locator('.calculation-loading-content')).not.toHaveCSS('border-style', 'solid');
  await expect(page.locator('.calculation-loading-content')).toHaveAttribute('role', 'status');
  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  const progressRing = page.locator('.solar-loading-indicator-progress');
  await expect(progressRing).toBeVisible();
  const startOffset = await progressRing.evaluate((element) => (element as SVGElement).style.strokeDashoffset);
  await expect.poll(() => progressRing.evaluate((element) => (element as SVGElement).style.strokeDashoffset)).not.toBe(startOffset);
  await expect(page.locator('body')).toHaveClass(/calculation-loading-active/u);
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(page.locator('.calculation-loading-page').getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('.calculation-loading-page')).not.toContainText(/progress bar|satellite scan|engineering analysis|installer matching/iu);
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('body')).not.toHaveClass(/calculation-loading-active/u);
  await expect(page.locator('.site-header')).toBeVisible();
  await expect(page.locator('.site-footer')).toBeVisible();
  await expect(page.locator('.result-fact-section .solar-fact-card')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Simple cash payback')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Preparing your solar estimate' })).toHaveCount(0);
});

test('bilingual Resources pages expose all five fact anchors and references', async ({ page }) => {
  const ids = ['home-value', 'carbon-trees', 'neighbor-effect', 'patio-gardens', 'water-use'];
  for (const route of ['/resources', '/en/resources']) {
    await page.goto(route);
    for (const id of ids) {
      const card = page.locator(`#${id}`);
      await expect(card).toBeVisible();
      await expect(card.getByRole('link')).toHaveAttribute('href', /^https:\/\//u);
      await expect(card.locator('img')).toHaveAttribute('alt', /.+/u);
    }
  }
});

test('incomplete operator facts fail closed and never expose placeholder tokens', async ({ page, request }) => {
  const operator = await request.get('/api/public/operator');
  expect(operator.ok()).toBeTruthy();
  await expect(operator.json()).resolves.toEqual({ operator: null });
  for (const route of ['/privacy', '/terms', '/cookies', '/en/privacy', '/en/terms', '/en/cookies']) {
    await page.goto(route);
    await expect(page.locator('body')).not.toContainText(/\[(?:LEGAL|BUSINESS|REGISTERED|PUBLIC|PRIVACY|LEAD|DATA|OPERATOR|TERMS|COOKIE)[A-Z _-]*\]/u);
  }
});
