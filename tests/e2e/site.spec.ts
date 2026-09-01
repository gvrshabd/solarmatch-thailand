import { expect, test, type Page, type TestInfo } from '@playwright/test';

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', roofArea: '60-100',
  ownershipStatus: 'owner', daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'home-office-equipment'], airConditionerCount: 5,
  roofMaterial: 'concrete-tile', shade: 'almost-none', installationTimeframe: 'one-three-months', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

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

test('loading fact stays paired, uses the minimal loading surface, and is not repeated on results', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  const loadingFact = page.locator('.calculation-fact');
  await expect(loadingFact).toBeVisible();
  await expect(loadingFact.getByText('DID YOU KNOW?')).toBeVisible();
  await expect(loadingFact.getByRole('link', { name: 'View reference' })).toHaveAttribute('href', /^\/en\/resources#/u);
  await expect(page.locator('.calculation-loading-content')).not.toHaveCSS('border-style', 'solid');
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
