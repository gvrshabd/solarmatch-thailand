import { expect, test, type Page, type TestInfo, type Route } from '@playwright/test';
import { initialQuestionnaire } from '../../config/assessment';

const savedEstimate = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000, activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop', propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', quoteContactRequested: false, roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

test('saved Thai and English estimates remain available when configuration never responds',async({page})=>{
  const pending:Route[]=[];
  await page.route('**/api/assessment/config',route=>{pending.push(route);});
  await page.addInitScript(answers=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(answers)),savedEstimate);
  for(const prefix of ['','/en']){
    await page.goto(`${prefix}/estimate/results`);
    await expect(page.locator('.rstats > div')).toHaveCount(3,{timeout:10000});
    await expect(page.getByText(prefix?'simple payback':'คืนทุนอย่างง่าย')).toBeVisible();
  }
  for(const route of pending)await route.abort().catch(()=>{});
});

test('a refreshed release cannot replace the saved result journey snapshot',async({page})=>{
  const stored={...operationalConfiguration(),loadingFactSetVersionId:'saved-facts',loadingFacts:[]};
  await page.addInitScript(({answers,configuration})=>{
    sessionStorage.setItem('solarmatch:estimate',JSON.stringify(answers));
    sessionStorage.setItem('solarmatch:assessment-context',JSON.stringify(configuration));
  },{answers:savedEstimate,configuration:stored});
  await page.route('**/api/assessment/config',route=>route.fulfill({json:{...stored,releaseId:'different-release',questionnaireVersionId:'different-questionnaire',loadingFactSetVersionId:'replacement-facts'}}));
  for(const prefix of ['','/en']){
    await page.goto(`${prefix}/estimate/results`);
    await expect(page.locator('.rstats > div')).toHaveCount(3,{timeout:10000});
    expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:result-view-state')!).factSetVersionId)).toBe('saved-facts');
  }
});

test('failed configuration refresh does not block Thai or English results',async({page})=>{
  await page.addInitScript(answers=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(answers)),savedEstimate);
  await page.route('**/api/assessment/config',route=>route.fulfill({status:503,json:{error:'synthetic_unavailable'}}));
  for(const prefix of ['','/en']){
    await page.goto(`${prefix}/estimate/results`);
    await expect(page.locator('.rstats > div')).toHaveCount(3,{timeout:10000});
  }
});

const exactSharedConsent = {
  en: "I consent to [COMPANY_EN], operating SolarMatch, disclosing my name, chosen contact details, property location and relevant assessment answers to up to three participating installation companies serving my area, so they can assess and contact me about this residential solar request using my selected contact method. A new installer may receive my request only within [DISTRIBUTION_DAYS] days after submission. I understand that installers pay SolarMatch for delivered enquiries, that the request is shared, and that I can withdraw this consent at any time by contacting [PRIVACY_EMAIL]. I can receive the free estimate without giving this consent. Details are in the Privacy Notice.",
  th: "ฉันยินยอมให้ [COMPANY_TH] ผู้ดำเนินการ SolarMatch เปิดเผยชื่อ ช่องทางติดต่อที่ฉันเลือก ที่ตั้งทรัพย์สิน และคำตอบแบบประเมินที่เกี่ยวข้องแก่บริษัทติดตั้งที่เข้าร่วมและให้บริการในพื้นที่ของฉันไม่เกินสามบริษัท เพื่อประเมินและติดต่อฉันเกี่ยวกับคำขอโซลาร์สำหรับที่อยู่อาศัยนี้ผ่านวิธีติดต่อที่ฉันเลือก บริษัทติดตั้งรายใหม่จะได้รับคำขอของฉันได้เฉพาะภายใน [DISTRIBUTION_DAYS] วันนับจากวันที่ส่งคำขอ ฉันเข้าใจว่าบริษัทติดตั้งชำระค่าบริการให้ SolarMatch สำหรับคำขอที่ได้รับ คำขออาจถูกส่งให้หลายบริษัท และฉันสามารถถอนความยินยอมนี้ได้ทุกเมื่อโดยติดต่อ [PRIVACY_EMAIL] ฉันสามารถรับผลประเมินฟรีได้โดยไม่ให้ความยินยอมนี้ ดูรายละเอียดได้ในประกาศความเป็นส่วนตัว",
};

function operationalConfiguration() {
  return {
    privatePreview: false,
    accessRestrictedSession: true,
    restrictedSiteCollectionEnabled: true,
    publicCollectionEnabled: false,
    releaseId: 'residential-release-v8',
    questionnaireVersionId: 'residential-questionnaire-v6',
    ruleVersionId: 'residential-rules-v4',
    questionnaire: initialQuestionnaire,
    assessmentToken: 'a'.repeat(96),
    assessmentTokenExpiresAt: '2099-01-01T00:00:00.000Z',
    liveLeadSubmissions: true,
    receivingCompany: null,
    contact: {
      enabled: true, preview: false, restrictedSiteCollectionEnabled: true, publicCollectionEnabled: false,
      operationalDistributionEnabled: false, mode: 'shared_solar_company_handoff',
      contactConfigurationVersionId: 'contact-configuration-consent-v2', contentVersionId: 'residential-content-consent-v2', privacyVersion: 'legal-placeholder-v1',
      retentionDays: null, distributionWindowDays: null, recipientCategory: 'solar_service_recipients',
      adultConfirmationVersionId: 'restricted-operational-adult-v1', consentVersionId: 'restricted-operational-consent-v2', privacyNoticeVersionId: 'legal-placeholder-v1', termsVersionId: null, cookiePolicyVersionId: null,
      question: { en: 'Want real quotes from local installers?', th: 'อยากได้ใบเสนอราคาจริงจากผู้ติดตั้งในพื้นที่ไหม?' },
      help: { en: 'Choose Yes only if you want solar companies to contact you about this request. If you choose No, you will go directly to your estimate without being asked for contact details.', th: 'เลือก “ใช่” เฉพาะเมื่อคุณต้องการให้บริษัทโซลาร์ติดต่อเกี่ยวกับคำขอนี้ หากเลือก “ไม่ใช่” คุณจะไปดูผลประเมินได้ทันทีโดยไม่ต้องให้ข้อมูลติดต่อ' },
      yesLabel: { en: 'Yes, I would like solar companies to contact me', th: 'ต้องการให้บริษัทโซลาร์ติดต่อกลับ' },
      noLabel: { en: 'No, show my estimate without installer contact', th: 'ไม่ใช่ ดูผลประเมินโดยไม่ให้ผู้ติดตั้งติดต่อ' },
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

async function primeQuoteStep(page: Page, answerOverrides: Record<string, unknown> = {}) {
  await page.addInitScript(({ answers, configuration }) => {
    sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({
      version: 9, answers, step: 10, questionnaireVersionId: configuration.questionnaireVersionId,
      releaseId: configuration.releaseId, assessmentToken: configuration.assessmentToken,
      assessmentTokenExpiresAt: configuration.assessmentTokenExpiresAt,
    }));
  }, { answers: { ...savedEstimate, ...answerOverrides, quoteContactRequested: undefined }, configuration: operationalConfiguration() });
}

const thaiHeaderLinks = [['วิธีการทำงาน', '/how-it-works'], ['ทำไมเชื่อถือได้', '/#trust'], ['สำหรับผู้ติดตั้ง', '/installers?lang=th']] as const;
const englishHeaderLinks = [['How it works', '/en/how-it-works'], ['Why trust us', '/en#trust'], ['For installers', '/installers?lang=en']] as const;

function desktopOnly(testInfo: TestInfo) { test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only coverage.'); }
async function expectPath(page: Page, path: string) {
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(path);
}

async function expectHeading(page: Page, name: string) {
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
}

async function choose(page: Page, name: string | RegExp, next: string) {
  await page.getByRole('radio', { name, exact: typeof name === 'string' }).click();
  void next;
  await expect(page.getByRole('radio', {name, exact:typeof name==='string'})).toBeHidden();
}

async function chooseDistrict(page: Page, label: string) {
  const field = page.locator('#estimate-district');
  await field.fill(label);
  await page.getByRole('option', { name: label, exact: true }).click();
}

async function completeEstimate(page: Page, locale: 'th' | 'en', bill = '6000') {
  const en = locale === 'en';
  await page.goto(en ? '/en' : '/');
  const starter = page.locator('#hero-estimator');
  await starter.getByRole('textbox').fill(bill);
  await starter.getByRole('button', { name: en ? 'See my estimate' : 'ดูผลประเมินของฉัน' }).click();
  await expectPath(page, en ? '/en/estimate' : '/estimate');
  const next = en ? 'Next' : 'ถัดไป';
  await page.getByRole('button',{name:en?'Bangkok':'กรุงเทพมหานคร',exact:true}).click();
  await chooseDistrict(page, en ? 'Sathon' : 'สาทร');
  await page.getByRole('button', { name: next, exact: true }).click();
  await expect(page.locator('#monthly-bill')).toHaveValue(Number(bill).toLocaleString('en-US'));
  await page.getByRole('button', { name: next, exact: true }).click();
  await choose(page,en?'Yes — within 3 months':'ใช่ — ภายใน 3 เดือน',next);
  await choose(page, en ? 'A new rooftop solar system' : 'ระบบโซลาร์รูฟท็อปใหม่', next);
  await choose(page, en ? 'Detached house' : 'บ้านเดี่ยว', next);
  await choose(page, en ? 'I own the property' : 'เป็นเจ้าของกรรมสิทธิ์', next);
  await choose(page, en ? /High Several appliances/ : /มาก มีเครื่องใช้ไฟฟ้าหลายอย่าง/, next);
  await expectHeading(page, en ? 'Which appliances are installed in the home' : 'บ้านนี้มีเครื่องใช้ไฟฟ้าหรืออุปกรณ์ใดบ้าง?');
  await page.getByRole('checkbox', { name: en ? 'Air conditioning' : 'เครื่องปรับอากาศ' }).click();
  await page.getByRole('checkbox', { name: en ? 'Home-office computers or equipment' : 'คอมพิวเตอร์หรืออุปกรณ์ทำงานที่บ้าน' }).click();
  await page.getByLabel(en ? 'How many air-conditioning units are installed at this property?' : 'บ้านหรือที่พักอาศัยนี้ติดตั้งเครื่องปรับอากาศทั้งหมดกี่เครื่อง?').fill('5');
  await page.getByRole('button', { name: next, exact: true }).click();
  await choose(page, en ? 'Almost none' : 'แทบไม่มี', next);
  await choose(page, en ? 'Concrete roof tiles' : 'กระเบื้องคอนกรีต', next);
  const decline = page.getByRole('radio', { name: en ? 'No, show my estimate without installer contact' : 'ไม่ใช่ ดูผลประเมินโดยไม่ให้ผู้ติดตั้งติดต่อ', exact: true });
  if (await decline.isVisible()) {
    await decline.click();
    await page.getByRole('button', { name: en ? /^(?:See|View) my estimate$/ : 'ดูผลประเมิน', exact: true }).click();
  } else {
    await page.getByRole('button', { name: en ? 'View my estimate' : 'ดูผลประเมิน', exact: true }).click();
  }
  await expectPath(page, en ? '/en/estimate/results' : '/estimate/results');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(en ? 'simple payback' : 'คืนทุนอย่างง่าย')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('main')).not.toContainText(/Needs more information|ต้องมีข้อมูลเพิ่ม|Evidence confidence|ความมั่นใจจากหลักฐาน/);
}

test.beforeEach(async ({ page }) => { await page.route('https://tile.openstreetmap.org/**', (route) => route.abort()); });

test('homepage reflects the supplied design and language spacing',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toHaveText('โซลาร์ช่วยบ้านคุณประหยัดได้เท่าไร?');
 await expect(page.locator('main')).toContainText('ไม่ต้องให้เบอร์โทร');
 await expect(page.locator('.hero-photo .example')).toContainText('฿1,665');
 const switcher=page.getByRole('link',{name:'View this page in English'});
 await expect(switcher).toHaveText('EN');await switcher.click();await expectPath(page,'/en');
});

test('bill field can be emptied and supports large values without a 50,000 cap',async({page})=>{
 await page.goto('/en');const input=page.locator('#hero-monthly-bill');
 await input.fill('0');await input.press('Backspace');await expect(input).toHaveValue('');
 await input.fill('250000');await expect(input).toHaveValue('250,000');
 await page.getByRole('button',{name:'See my estimate',exact:true}).click();await expectPath(page,'/en/estimate');
 await page.getByRole('button',{name:'Bangkok',exact:true}).click();await chooseDistrict(page,'Sathon');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('#monthly-bill')).toHaveValue('250,000');
 await expect(page.locator('.bill-range')).toHaveAttribute('max','250000');
});

test('homepage values hand off while the assessment still collects a district',async({page})=>{
 await page.goto('/en');await page.locator('#hero-monthly-bill').fill('85000');await page.getByRole('button',{name:'See my estimate',exact:true}).click();
 await expectPath(page,'/en/estimate');await expectHeading(page,'Where is the property located?');
 await page.getByRole('button',{name:'Nonthaburi',exact:true}).click();await chooseDistrict(page,'Mueang Nonthaburi');
 await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.locator('#monthly-bill')).toHaveValue('85,000');
 await page.getByRole('button',{name:'Back',exact:true}).click();await expect(page.locator('#estimate-district')).toHaveValue('Mueang Nonthaburi');
});

test('district chooser is searchable, eight rows tall, and sorted for each language', async ({ page }) => {
  await page.goto('/en/estimate');
  await page.getByRole('button',{name:/^(Bangkok|กรุงเทพมหานคร)$/}).click();
  const district = page.locator('#estimate-district');
  await district.click();
  const listbox = page.getByRole('listbox', { name: 'Districts' });
  await expect(listbox.getByRole('option')).toHaveCount(50);
  const menuSize = await listbox.evaluate((element) => {
    const first = element.querySelector<HTMLElement>('[role="option"]');
    return { clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, rowHeight: first?.getBoundingClientRect().height ?? 0 };
  });
  expect(menuSize.scrollHeight).toBeGreaterThan(menuSize.clientHeight);
  expect(Math.floor(menuSize.clientHeight / menuSize.rowHeight)).toBeLessThanOrEqual(8);

  await district.fill('Sath');
  await expect(page.getByRole('option', { name: 'Sathon', exact: true })).toBeVisible();
  await page.getByRole('option', { name: 'Sathon', exact: true }).click();
  await expect(district).toHaveValue('Sathon');

  await page.getByRole('link', { name: 'View this estimate in Thai' }).click();
  const thaiDistrict = page.locator('#estimate-district');
  await expect(thaiDistrict).toHaveValue('สาทร');
  await thaiDistrict.fill('');
  const thaiLabels = await page.getByRole('listbox', { name: 'เขตและอำเภอ' }).getByRole('option').allTextContents();
  const thaiSorted = await page.evaluate((labels) => [...labels].sort(new Intl.Collator('th', { sensitivity: 'base' }).compare), thaiLabels);
  expect(thaiLabels).toEqual(thaiSorted);
});

test('all desktop navigation anchors work in Thai and English', async ({ page }, testInfo) => {
  desktopOnly(testInfo);
  for (const [home, navigation, links] of [['/', 'เมนูหลัก', thaiHeaderLinks], ['/en', 'Primary navigation', englishHeaderLinks]] as const) {
    for (const [label, path] of links) {
      await page.goto(home);
      const link = page.getByRole('navigation', { name: navigation }).getByRole('link', { name: label, exact: true });
      await expect(link).toHaveAttribute('href', path);
      await link.click();
      await expectPath(page, new URL(path,'http://localhost').pathname);
    }
  }
});

test('required estimator uses eleven concise residential questions and focused chrome', async ({ page }) => {
  await page.goto('/en/estimate');
  await expect(page.getByRole('progressbar').locator(':scope > span')).toHaveCount(11);
  await expect(page.locator('header').getByRole('link', { name: 'Exit estimate' })).toBeVisible();
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/kWh figure|TOU|On Peak|Off Peak|What period/);
  await expect(page.locator('.question-heading > p')).toHaveCount(0);
});

test('planning and project type are separate consecutive questions', async ({ page }) => {
  await page.goto('/en/estimate');
  await page.getByRole('button',{name:/^(Bangkok|กรุงเทพมหานคร)$/}).click();
  await chooseDistrict(page, 'Sathon');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('#monthly-bill').fill('6000');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expectHeading(page, 'Are you actively planning to install solar?');
  await expect(page.getByRole('radio', { name: 'A new rooftop solar system' })).toHaveCount(0);
  await choose(page, 'Yes — within 3 months', 'Next');
  await expectHeading(page, 'What kind of solar project are you considering?');
  await expect(page.getByRole('radio', { name: 'A new rooftop solar system' })).toBeVisible();
});

test('refresh and language switching preserve estimator progress without restored auto-advance',async({page})=>{
 await page.goto('/estimate');await page.getByRole('button',{name:'กรุงเทพมหานคร',exact:true}).click();await chooseDistrict(page,'สาทร');
 await page.getByRole('button',{name:'ถัดไป',exact:true}).click();await page.locator('#monthly-bill').fill('7200');await page.getByRole('button',{name:'ถัดไป',exact:true}).click();
 await choose(page,'ใช่ — ภายใน 3 เดือน','ถัดไป');await page.reload();
 await expectHeading(page,'คุณกำลังพิจารณาโครงการโซลาร์แบบใด?');
 await page.getByRole('button',{name:'Back',exact:true}).count().then(async n=>{if(n)await page.getByRole('button',{name:'Back',exact:true}).click();else await page.getByRole('button',{name:'ย้อนกลับ',exact:true}).click();});
 await expect(page.getByRole('radio',{name:'ใช่ — ภายใน 3 เดือน',exact:true})).toBeChecked();
 await page.getByRole('link',{name:'ดูแบบประเมินนี้เป็นภาษาอังกฤษ'}).click();
 await expect(page.getByRole('radio',{name:'Yes — within 3 months',exact:true})).toBeChecked();
});

test('complete Thai and English journeys produce every metric', async ({ page }) => {
  test.setTimeout(60_000);
  await completeEstimate(page, 'th');
  await completeEstimate(page, 'en');
});

test('optional precision details visibly recalculate results', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await page.locator('.v2-breakdown summary').click();
  const productionCard = page.locator('.kv > div').filter({ hasText: 'Yearly generation' });
  await expect(productionCard).toBeVisible({ timeout: 10_000 });
  const production = productionCard.locator('b');
  const before = await production.textContent();
  await page.getByText('More optional details',{exact:true}).click();
  await page.getByLabel('Main roof direction').selectOption('north');
  await page.getByLabel('Roof slope').selectOption('steep');
  await expect(page.locator('.toast[role="status"]')).toContainText('Roof slope applied');
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
  await expect(page.getByText('simple payback')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel(/Mobile phone number|First name/i)).toHaveCount(0);
  await expect(page.locator('.result-fact-section .solar-fact-card')).toHaveCount(0);
});

test('integrated quote question starts unselected and No reaches the full estimate without PII', async ({ page }) => {
  let leadRequests = 0;
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await page.route('**/api/leads', (route) => { leadRequests += 1; return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }); });
  await primeQuoteStep(page);
  await page.goto('/en/estimate');

  const yes = page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me' });
  const no = page.getByRole('radio', { name: 'No, show my estimate without installer contact', exact: true });
  const consent = page.getByRole('checkbox', { name: /I consent to/u });
  await expect(page.getByRole('heading', { name: 'Want real quotes from local installers?' })).toBeVisible();
  await expect(yes).not.toBeChecked();
  await expect(no).not.toBeChecked();
  await expect(consent).toHaveCount(0);
  await no.click();
  await expect(consent).toHaveCount(0);
  const loadingStartedAt = Date.now();
  await page.getByRole('button', { name: 'See my estimate' }).click();
  await expect(page.getByText('simple payback')).toBeVisible({ timeout: 10_000 });
  // No artificial minimum: real preparation controls completion.
  expect(Date.now() - loadingStartedAt).toBeLessThan(6500);
  expect(leadRequests).toBe(0);
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveCount(0);
});

test('the ฿4,800 Bangkok result reconciles its shared cards, table, and MEA tariff', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), {
    ...savedEstimate,
    monthlyBillThb: 4800,
    roofArea: undefined,
    roofDirection: undefined,
    roofSlope: undefined,
    daytimePattern: 'moderate',
    daytimeLoads: ['air-conditioning'],
    airConditionerCount: 4,
  });
  await page.goto('/en/estimate/results');
  await expect(page.getByText('simple payback')).toBeVisible({ timeout: 10_000 });
  await page.locator('.v2-breakdown summary').click();
  await expect(page.locator('.kv > div').filter({hasText:'25-year net benefit'})).toContainText('฿115,000');
  await expect(page.locator('.rbig')).toContainText(/฿98\d/u);
  await expect(page.locator('.rhero')).toContainText('21%');
  await expect(page.locator('.kv > div').filter({ hasText: 'Yearly maintenance reserve' })).toContainText('฿1,326');
  await expect(page.getByText('simple payback').locator('..')).toContainText('12.4 yrs');
  await expect(page.getByRole('table', { name: 'Key lifetime cost points' }).getByRole('row').last()).toContainText('฿1,440,000');
  await expect(page.getByRole('table', { name: 'Key lifetime cost points' }).getByRole('row').last()).toContainText(/฿1,325,\d{3}/u);
  await expect(page.locator('.trace-list article').filter({ hasText: /^TariffMEA/u })).toContainText('MEA');
  await expect(page.getByRole('link', { name: 'MEA residential tariff source' })).toHaveAttribute('href', /^https:\/\//u);
  const hierarchy = await page.locator('.results-page').evaluate((element) => {
    const metrics = element.querySelector('.rstats');
    const disclaimer = element.querySelector('.v2-breakdown');
    return metrics && disclaimer ? Boolean(metrics.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING) : false;
  });
  expect(hierarchy).toBe(true);
});

test('Thai contact consent is verbatim, unselected, and links its Privacy Notice phrase', async ({ page }) => {
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await primeQuoteStep(page);
  await page.goto('/estimate');

  await page.getByRole('radio', { name: 'ใช่ ฉันต้องการให้บริษัทโซลาร์ติดต่อ', exact: true }).click();
  const consent = page.getByRole('checkbox', { name: /ฉันยินยอมให้/u });
  await expect(consent).not.toBeChecked();
  await expect(page.locator('.quote-consent-check')).toHaveText(exactSharedConsent.th);
  await expect(page.getByRole('link', { name: 'ประกาศความเป็นส่วนตัว', exact: true })).toHaveAttribute('href', '/privacy');
});

test('a renter without owner permission can view the estimate but cannot request contact', async ({ page }) => {
  await page.route('**/api/assessment/config', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(operationalConfiguration()) }));
  await primeQuoteStep(page, { ownershipStatus: 'renter', ownerPermission: 'not-yet' });
  await page.goto('/en/estimate');
  await expect(page.getByText('You can still view your estimate. To request installer contact, you will first need the property owner’s permission.')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Yes, I would like solar companies to contact me' })).toHaveCount(0);
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'View my estimate', exact: true }).click();
  await expect(page.getByText('simple payback')).toBeVisible({ timeout: 10_000 });
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
  const consent = page.getByRole('checkbox', { name: /I consent to/u });
  await expect(consent).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Privacy Notice', exact: true })).toHaveAttribute('href', '/en/privacy');
  await expect(page.locator('.quote-consent-check')).toHaveText(exactSharedConsent.en);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Tick the consent box');
  await consent.check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'What number should installers call?' })).toBeFocused();
  await page.locator('input[autocomplete="given-name"]').fill('Private');
  await page.locator('input[autocomplete="family-name"]').fill('Tester');
  await page.locator('input[autocomplete="tel"]').fill('0812345678');
  const challengeId=crypto.randomUUID();
  await page.route('**/api/phone-verification',async route=>{
    const body=route.request().postDataJSON();
    await route.fulfill({json:body.code?{ok:true,proof:'a'.repeat(43)}:{ok:true,challengeId}});
  });
  await page.getByRole('button',{name:'Send SMS code',exact:true}).click();
  await page.getByRole('textbox',{name:/SMS verification code/}).fill('123456');
  await page.getByRole('button',{name:'Verify number',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Phone number verified.');
  const adult = page.getByRole('checkbox', { name: /I confirm that I am at least 20 years old/u });
  await expect(adult).not.toBeChecked();
  await adult.check();
  await page.getByRole('button', { name: 'Submit my request' }).click();

  await expect(page.locator('.rstats>div')).toHaveCount(3);
  expect(submitted).toMatchObject({ legalFirstName: 'Private', legalLastName: 'Tester', contactMethod: 'phone', phone:'0812345678', phoneVerificationId:challengeId, adultConfirmed: true, consent: true });
  expect(submitted).not.toHaveProperty('lineId');
  await expect(page.getByText('simple payback')).toBeVisible({ timeout: 10_000 });
});

test('assessment transitions preserve direction, focus and block rapid double navigation', async ({ page }) => {
  await page.goto('/en/estimate');
  await page.getByRole('button',{name:/^(Bangkok|กรุงเทพมหานคร)$/}).click();
  await chooseDistrict(page, 'Sathon');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  await next.evaluate((element) => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expectHeading(page, 'About how much is the electricity bill in a typical month?');
  await expect(page.locator('.question-stage')).toHaveAttribute('data-transition-direction', 'forward');
  await expect(page.getByRole('heading', { name: 'About how much is the electricity bill in a typical month?' })).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.question-stage')).toHaveAttribute('data-transition-direction', 'backward');
  await expect(page.getByRole('heading', { name: 'Where is the property located?' })).toBeFocused();
});

test('ready results have no artificial delay or repeated loading fact',async({page})=>{
 await page.addInitScript(estimate=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(estimate)),savedEstimate);
 const started=Date.now();await page.goto('/en/estimate/results');await expect(page.locator('.rstats>div')).toHaveCount(3);
 expect(Date.now()-started).toBeLessThan(6500);
 await expect(page.locator('.calculation-fact,.solar-loading-indicator,.result-fact-section')).toHaveCount(0);
 await expect(page.locator('.site-header')).toBeVisible();await expect(page.locator('.site-footer')).toBeVisible();
 await page.reload();await expect(page.locator('.rstats>div')).toHaveCount(3);
 await expect(page.getByRole('heading',{name:'Preparing your solar estimate'})).toHaveCount(0);
});

test('bilingual Resources pages expose the four supported fact anchors and references', async ({ page }) => {
  const ids = ['home-value', 'carbon-trees', 'neighbor-effect', 'water-use'];
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

test('incomplete operator facts fail closed and use explicit review placeholders without development prose', async ({ page, request }) => {
  const operator = await request.get('/api/public/operator');
  expect(operator.ok()).toBeTruthy();
  await expect(operator.json()).resolves.toEqual({ operator: null });
  for (const route of ['/privacy', '/terms', '/cookies', '/en/privacy', '/en/terms', '/en/cookies']) {
    await page.goto(route);
    await expect(page.locator('body')).toContainText(/\[(?:EFFECTIVE|LEGAL|BUSINESS|REGISTERED|PUBLIC|PRIVACY|LEAD|DATA|OPERATOR|TERMS|COOKIE)[A-Z _-]*\]/u);
    await expect(page.locator('body')).not.toContainText(/will be published|will open later|legal review (?:is )?(?:still )?required|contact collection remains disabled/iu);
  }
});
