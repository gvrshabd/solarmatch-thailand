import { expect, test, type Page, type TestInfo } from '@playwright/test';

const savedEstimate = {
  province: 'bangkok', monthlyBillThb: 6000, propertyType: 'detached-home', roofArea: '60-100',
  daytimePattern: 'high', daytimeLoads: ['air-conditioning', 'pump', 'office-equipment'],
  roofMaterial: 'concrete-tile', shade: 'almost-none', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
};

const thaiHeaderLinks = [['ประเมินโซลาร์', '/estimate'], ['วิธีการทำงาน', '/how-it-works'], ['คู่มือโซลาร์', '/solar-guide'], ['วิธีคำนวณ', '/methodology'], ['เกี่ยวกับเรา', '/about']] as const;
const englishHeaderLinks = [['Solar estimate', '/en/estimate'], ['How it works', '/en/how-it-works'], ['Solar guide', '/en/solar-guide'], ['Methodology', '/en/methodology'], ['About', '/en/about']] as const;

function desktopOnly(testInfo: TestInfo) { test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only coverage.'); }
async function expectPath(page: Page, path: string) { await expect.poll(() => new URL(page.url()).pathname).toBe(path); }

async function expectHeading(page: Page, name: string) {
  await expect(page.getByRole('heading', { name })).toBeVisible({ timeout: 15_000 });
}

async function choose(page: Page, name: string | RegExp, next: string) {
  await page.getByRole('radio', { name }).click();
  await page.getByRole('button', { name: next, exact: true }).click();
}

async function completeEstimate(page: Page, locale: 'th' | 'en', bill = '6000') {
  const en = locale === 'en';
  await page.goto(en ? '/en' : '/');
  const starter = page.locator('#hero-estimator');
  await starter.getByRole('textbox').fill(bill);
  await starter.getByRole('button', { name: en ? 'See my solar estimate' : 'ดูค่าประเมินโซลาร์' }).click();
  await expectPath(page, en ? '/en/estimate' : '/estimate');
  await expectHeading(page, en ? 'What type of property is it?' : 'สถานที่เป็นประเภทไหน?');
  const next = en ? 'Next' : 'ถัดไป';
  await choose(page, en ? 'Detached home or bungalow' : 'บ้านเดี่ยวหรือบังกะโล', next);
  await choose(page, en ? '60–100 m²' : '60–100 ตร.ม.', next);
  await choose(page, en ? /High Several appliances/ : /มาก มีหลายอุปกรณ์/, next);
  await page.getByRole('checkbox', { name: en ? 'Air conditioning' : 'เครื่องปรับอากาศ' }).click();
  await page.getByRole('checkbox', { name: en ? 'Office equipment' : 'อุปกรณ์สำนักงาน' }).click();
  await page.getByRole('button', { name: next, exact: true }).click();
  await choose(page, en ? 'Concrete roof tiles' : 'กระเบื้องคอนกรีต', next);
  await page.getByRole('radio', { name: en ? 'Almost none' : 'แทบไม่มี' }).click();
  await page.getByRole('button', { name: en ? 'See my estimate' : 'ดูผลประเมิน', exact: true }).click();
  await expectPath(page, en ? '/en/estimate/results' : '/estimate/results');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(en ? 'Simple cash payback' : 'คืนทุนเงินสดอย่างง่าย')).toBeVisible();
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
  await expectHeading(page, 'What type of property is it?');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is a typical monthly electricity bill?' })).toBeVisible();
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

test('required estimator remains eight questions and uses focused chrome', async ({ page }) => {
  await page.goto('/en/estimate');
  await expect(page.getByRole('progressbar').locator(':scope > span')).toHaveCount(8);
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
  await page.getByRole('radio', { name: 'บ้านเดี่ยวหรือบังกะโล' }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'บ้านเดี่ยวหรือบังกะโล' })).toBeChecked();
  await page.getByRole('link', { name: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' }).click();
  await expect(page.getByRole('radio', { name: 'Detached home or bungalow' })).toBeChecked();
});

test('complete Thai and English journeys produce every metric', async ({ page }) => { await completeEstimate(page, 'th'); await completeEstimate(page, 'en'); });

test('optional precision details visibly recalculate results', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  const production = page.getByText('First-year production').locator('..').locator('strong');
  const before = await production.textContent();
  await page.locator('.accuracy-upgrade summary').click();
  await page.getByLabel('Main roof direction').selectOption('north');
  await page.getByLabel('Roof slope').selectOption('steep');
  await expect(page.getByRole('status')).toContainText('Roof slope applied');
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

test('matching form validates locally and never sends a POST request', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await page.getByRole('button', { name: 'Check my request' }).click();
  await expect(page.getByLabel('Name')).toBeFocused();
  await page.getByLabel('Name').fill('Test Homeowner');
  await page.getByLabel('Thai phone number').fill('081 234 5678');
  await page.getByRole('checkbox', { name: /I understand matching is not live/ }).check();
  await page.getByRole('button', { name: 'Check my request' }).click();
  await expect(page.getByText('Nothing was sent or stored', { exact: false })).toBeVisible();
  expect(posts).toEqual([]);
});
