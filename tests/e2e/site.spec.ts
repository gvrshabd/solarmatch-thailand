import { expect, test, type Page, type TestInfo } from '@playwright/test';

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', installationTimeframe: 'one-three-months', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

const exactSharedConsent = {
  en: 'I explicitly consent to SolarMatch sharing my name, contact details, location and relevant assessment answers with participating residential solar companies that serve my area, so they may contact me about a residential solar site survey and quotation. I understand that more than one company may receive my information, the number may vary, and SolarMatch may receive payment for the introduction. I have read the Privacy Notice.',
  th: 'ฉันยินยอมโดยชัดแจ้งให้ SolarMatch ส่งชื่อ ข้อมูลติดต่อ พื้นที่ และคำตอบที่เกี่ยวข้องจากแบบประเมินของฉันให้บริษัทติดตั้งโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมและให้บริการในพื้นที่ของฉัน เพื่อให้บริษัทเหล่านั้นติดต่อเกี่ยวกับการสำรวจหน้างานและใบเสนอราคา ฉันเข้าใจว่าข้อมูลของฉันอาจถูกส่งให้มากกว่าหนึ่งบริษัท จำนวนบริษัทอาจแตกต่างกันไป และ SolarMatch อาจได้รับค่าตอบแทนสำหรับการแนะนำลูกค้า ฉันได้อ่านประกาศความเป็นส่วนตัวแล้ว',
};

function privatePreviewConfiguration() {
  return {
    privatePreview: true,
    releaseId: 'residential-release-v2',
    questionnaireVersionId: 'residential-questionnaire-v2',
    ruleVersionId: 'residential-rules-v2',
    questionnaire: { id: 'residential-questionnaire-v2', schemaVersion: 5, questions: [] },
    assessmentToken: 'a'.repeat(96),
    assessmentTokenExpiresAt: '2099-01-01T00:00:00.000Z',
    liveLeadSubmissions: true,
    receivingCompany: null,
    contact: {
      enabled: true, preview: true, operationalDistributionEnabled: false, mode: 'shared_solar_company_handoff',
      contactConfigurationVersionId: 'private-preview-contact-v1', contentVersionId: 'residential-content-v1', privacyVersion: 'legal-placeholder-v1',
      retentionDays: null, distributionWindowDays: null, recipientCategory: 'participating_residential_solar_companies',
      adultConfirmationVersionId: 'private-preview-adult-v1', consentVersionId: 'private-preview-consent-v1', privacyNoticeVersionId: 'legal-placeholder-v1', termsVersionId: null, cookiePolicyVersionId: null,
      question: { en: 'Would you like to be contacted by solar companies?', th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับไหม?' },
      help: { en: 'If you choose Yes, SolarMatch may share your name, contact details, location and relevant assessment answers with participating residential solar companies that serve your area. More than one company may receive your information and contact you by phone or LINE, and the number may vary. SolarMatch may receive payment from these companies for the introduction. You will still receive your estimate if you choose No.', th: 'หากเลือก “ต้องการ” SolarMatch อาจส่งชื่อ ข้อมูลติดต่อ พื้นที่ และคำตอบที่เกี่ยวข้องจากแบบประเมินของคุณให้บริษัทติดตั้งโซลาร์สำหรับที่พักอาศัยที่เข้าร่วมและให้บริการในพื้นที่ของคุณ ข้อมูลของคุณอาจถูกส่งให้มากกว่าหนึ่งบริษัท และแต่ละบริษัทอาจติดต่อคุณทางโทรศัพท์หรือ LINE โดยจำนวนบริษัทอาจแตกต่างกันไป SolarMatch อาจได้รับค่าตอบแทนจากบริษัทเหล่านี้สำหรับการแนะนำลูกค้า คุณยังคงได้รับผลประเมินแม้เลือก “ไม่ต้องการ”' },
      yesLabel: { en: 'Yes, I would like solar companies to contact me', th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับ' },
      noLabel: { en: 'No, show me my estimate', th: 'ไม่ต้องการ ดูผลประเมินต่อ' },
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
  await expectHeading(page, en ? 'What kind of home is this?' : 'เป็นบ้านหรือที่พักอาศัยประเภทใด?');
  const next = en ? 'Next' : 'ถัดไป';
  await choose(page, en ? 'Detached house' : 'บ้านเดี่ยว', next);
  await choose(page, en ? 'I own the property' : 'เป็นเจ้าของกรรมสิทธิ์', next);
  await choose(page, en ? '60–100 m²' : '60–100 ตร.ม.', next);
  await choose(page, en ? /High Several appliances/ : /มาก มีเครื่องใช้ไฟฟ้าหลายอย่าง/, next);
  await page.getByRole('checkbox', { name: en ? 'Air conditioning' : 'เครื่องปรับอากาศ' }).click();
  await page.getByRole('checkbox', { name: en ? 'Home-office computers or equipment' : 'คอมพิวเตอร์หรืออุปกรณ์ทำงานที่บ้าน' }).click();
  await page.getByLabel(en ? 'How many air-conditioning units are installed at this property?' : 'บ้านหรือที่พักอาศัยนี้ติดตั้งเครื่องปรับอากาศทั้งหมดกี่เครื่อง?').selectOption('5');
  await page.getByRole('button', { name: next, exact: true }).click();
  await choose(page, en ? 'Concrete roof tiles' : 'กระเบื้องคอนกรีต', next);
  await page.getByRole('radio', { name: en ? 'Almost none' : 'แทบไม่มี', exact: true }).click();
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
  await expectHeading(page, 'What kind of home is this?');
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

test('required estimator uses nine concise residential questions and focused chrome', async ({ page }) => {
  await page.goto('/en/estimate');
  await expect(page.getByRole('progressbar').locator(':scope > span')).toHaveCount(9);
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
  await page.getByRole('radio', { name: 'บ้านเดี่ยว' }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'บ้านเดี่ยว' })).toBeChecked();
  await page.getByRole('link', { name: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' }).click();
  await expect(page.getByRole('radio', { name: 'Detached house', exact: true })).toBeChecked();
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

test('private contact preview starts unselected and No reaches the full estimate without PII', async ({ page }) => {
  let leadRequests = 0;
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(privatePreviewConfiguration()) }));
  await page.route('**/api/leads', (route) => { leadRequests += 1; return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }); });
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');

  const yes = page.getByRole('button', { name: 'Yes, I would like solar companies to contact me' });
  const no = page.getByRole('button', { name: 'No, show me my estimate' });
  await expect(page.getByRole('heading', { name: 'Would you like to be contacted by solar companies?' })).toBeVisible();
  await expect(yes).toHaveAttribute('aria-pressed', 'false');
  await expect(no).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('checkbox', { name: /I explicitly consent/u })).toHaveCount(0);
  await no.click();
  await expect(page.getByRole('heading', { name: 'Continue without contact details' })).toBeFocused();
  await page.getByRole('button', { name: 'Continue to my result' }).click();
  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
  expect(leadRequests).toBe(0);
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveCount(0);
});

test('private contact preview requires explicit consent, separate adult confirmation, and stores a test request', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(privatePreviewConfiguration()) }));
  await page.route('**/api/leads', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, leadId: crypto.randomUUID(), testSubmission: true }) });
  });
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');

  await page.getByRole('button', { name: 'Yes, I would like solar companies to contact me' }).click();
  const consent = page.getByRole('checkbox', { name: /I explicitly consent to SolarMatch sharing my name/u });
  await expect(consent).not.toBeChecked();
  await expect(page.locator('#main-content').getByRole('link', { name: 'Privacy Notice' })).toHaveAttribute('href', '/en/privacy');
  await page.getByRole('button', { name: 'Continue to contact details' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirm your consent');
  await consent.check();
  await page.getByRole('button', { name: 'Continue to contact details' }).click();

  await page.locator('input[autocomplete="given-name"]').fill('Private');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="family-name"]').fill('Tester');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="tel"]').fill('081 234 5678');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('radio', { name: 'LINE' }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.locator('input[autocomplete="off"]').fill('private.tester');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const adult = page.getByRole('checkbox', { name: /I confirm that I am at least 20 years old/u });
  await expect(adult).not.toBeChecked();
  await adult.check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your request' })).toBeFocused();
  await page.getByRole('button', { name: 'Submit my request' }).click();

  await expect(page.locator('.solar-loading-indicator')).toBeVisible();
  expect(submitted).toMatchObject({ legalFirstName: 'Private', legalLastName: 'Tester', phone: '0812345678', contactMethod: 'line', lineId: 'private.tester', adultConfirmed: true, consent: true });
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
  await expect(page.locator('.solar-loading-indicator')).toHaveCSS('animation-name', 'solar-loading-spin');
  await expect(page.locator('.calculation-loading-page').getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('.calculation-loading-page')).not.toContainText(/progress bar|satellite scan|engineering analysis|installer matching/iu);
  await expect(page.getByText('Simple cash payback')).toBeVisible({ timeout: 10_000 });
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
