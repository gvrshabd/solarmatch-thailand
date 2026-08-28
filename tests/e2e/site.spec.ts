import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const thaiHeaderLinks = [
  ['ประเมินโซลาร์', '/estimate'], ['วิธีการทำงาน', '/how-it-works'], ['คู่มือโซลาร์', '/solar-guide'],
  ['วิธีคำนวณ', '/methodology'], ['เกี่ยวกับเรา', '/about'],
] as const;
const englishHeaderLinks = [
  ['Solar estimate', '/en/estimate'], ['How it works', '/en/how-it-works'], ['Solar guide', '/en/solar-guide'],
  ['Methodology', '/en/methodology'], ['About', '/en/about'],
] as const;
const thaiFooterLinks = [...thaiHeaderLinks.slice(0, 3), ['วิธีคำนวณ', '/methodology'], ['แหล่งข้อมูล', '/resources'], ['เกี่ยวกับเรา', '/about'], ['ติดต่อ', '/contact'], ['ความเป็นส่วนตัว', '/privacy'], ['ข้อกำหนดการใช้งาน', '/terms'], ['คุกกี้', '/cookies']] as const;
const englishFooterLinks = [...englishHeaderLinks.slice(0, 3), ['Methodology', '/en/methodology'], ['Resources', '/en/resources'], ['About', '/en/about'], ['Contact', '/en/contact'], ['Privacy', '/en/privacy'], ['Terms of use', '/en/terms'], ['Cookies', '/en/cookies']] as const;

export const savedEstimate = {
  province: 'bangkok',
  location: { address: '99 Test Road, Bangkok', latitude: 13.7563, longitude: 100.5018, province: 'bangkok', source: 'manual-map', confirmed: true },
  electricityInputKind: 'kwh', monthlyKwh: 900, consumptionPeriod: 'average-12', tariffType: 'standard',
  daytimePattern: 'work-or-ac', daytimeLoads: ['air-conditioning', 'home-office'], acDaytimeHours: '2-4',
  roofMaterial: 'concrete-tile', shade: 'none', roofDirection: 'south-group', roofSlope: 'gentle', electricityPhase: 'single',
} as const;

function desktopOnly(testInfo: TestInfo) { test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only coverage.'); }
function mobileOnly(testInfo: TestInfo) { test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only coverage.'); }
async function expectPath(page: Page, path: string) { await expect.poll(() => new URL(page.url()).pathname).toBe(path); }
async function clickAnchorAndExpectPath(page: Page, link: Locator, path: string) { await expect(link).toHaveAttribute('href', path); await link.click(); await expectPath(page, path); }
async function chooseAndContinue(page: Page, option: string | RegExp, next: string) {
  await page.getByRole('radio', { name: option, exact: typeof option === 'string' }).click();
  await page.getByRole('button', { name: next, exact: true }).click();
}

async function confirmAddress(page: Page, locale: 'th' | 'en', address = '99 Test Road, Bangkok') {
  const english = locale === 'en';
  const field = page.getByLabel(english ? 'Home address' : 'ที่อยู่บ้าน');
  if (!(await field.inputValue())) await field.fill(address);
  const position = page.getByRole('button', { name: english ? 'Position home on map' : 'วางตำแหน่งบ้านบนแผนที่' });
  if (await position.isVisible().catch(() => false)) await position.click();
  await page.getByRole('button', { name: english ? 'Confirm this property location' : 'ยืนยันตำแหน่งบ้านนี้' }).click();
  await page.getByRole('button', { name: english ? 'Next' : 'ถัดไป', exact: true }).click();
}

async function completeEstimate(page: Page, locale: 'th' | 'en') {
  const english = locale === 'en';
  const homePath = english ? '/en' : '/';
  const estimatePath = english ? '/en/estimate' : '/estimate';
  const resultsPath = english ? '/en/estimate/results' : '/estimate/results';
  const next = english ? 'Next' : 'ถัดไป';

  await page.goto(homePath);
  const starter = page.locator('#hero-estimator');
  await starter.getByRole('textbox').fill('99 Test Road, Bangkok');
  await starter.getByRole('button', { name: english ? 'Continue to map' : 'ไปวางตำแหน่งบนแผนที่' }).click();
  await expectPath(page, estimatePath);
  await confirmAddress(page, locale);

  await page.getByRole('radio', { name: english ? 'Electricity used in kWh' : 'จำนวนหน่วยไฟฟ้า (kWh)' }).click();
  await page.getByLabel(english ? 'Monthly electricity used' : 'จำนวนหน่วยต่อเดือน').fill('900');
  await page.getByRole('button', { name: next, exact: true }).click();
  await chooseAndContinue(page, english ? 'A 12-month average' : 'ค่าเฉลี่ย 12 เดือน', next);
  await chooseAndContinue(page, english ? /^No Standard/ : /^ไม่มี/, next);
  await chooseAndContinue(page, english ? /works from home or uses air conditioning/ : /ทำงานที่บ้านหรือเปิดแอร์/, next);

  await page.getByRole('checkbox', { name: english ? 'Air conditioning' : 'เครื่องปรับอากาศ' }).click();
  await page.getByRole('checkbox', { name: english ? 'Home-office equipment' : 'อุปกรณ์สำนักงานที่บ้าน' }).click();
  await page.getByRole('button', { name: next, exact: true }).click();
  await chooseAndContinue(page, english ? 'Concrete roof tiles' : 'กระเบื้องคอนกรีต', next);
  await page.getByRole('radio', { name: english ? 'Little or no shade' : 'แทบไม่มีเงา' }).click();
  await page.getByRole('button', { name: english ? 'See estimate' : 'ดูผลประเมิน', exact: true }).click();
  await expectPath(page, resultsPath);

  await expect(page.getByRole('heading', { level: 1 })).toContainText(english ? 'up to about' : 'สูงสุดประมาณ');
  await expect(page.getByLabel(english ? 'Planning figures' : 'ตัวเลขเพื่อวางแผน')).toBeVisible();
  await expect(page.getByText(english ? 'Suggested starting system' : 'ขนาดเริ่มต้นที่แนะนำ')).toBeVisible();
  await expect(page.getByRole('link', { name: english ? 'Read the full methodology' : 'อ่านวิธีคำนวณทั้งหมด' })).toBeVisible();
}

test.beforeEach(async ({ page }) => { await page.route('https://tile.openstreetmap.org/**', (route) => route.abort()); });

test('homepage and selector use the requested copy and spacing', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ค่าไฟบ้านคุณ');
  await expect(page.locator('footer')).not.toContainText('©');
  await expect(page.locator('body')).not.toContainText(/ประมาณ 3 นาที|About 3 minutes|และแก้ไขคำตอบได้ทุกเมื่อ|and edit your answers at any time/i);
  const switcher = page.getByRole('link', { name: 'View this page in English' });
  await expect(switcher).toHaveText('TH / EN');
  expect(await switcher.evaluate((element) => Number.parseFloat(getComputedStyle(element).gap))).toBeGreaterThan(0);
});

test('all desktop header and footer anchors navigate in Thai and English', async ({ page }, testInfo) => {
  desktopOnly(testInfo); test.slow();
  for (const [home, navLabel, headerLinks, footerLinks] of [
    ['/', 'เมนูหลัก', thaiHeaderLinks, thaiFooterLinks], ['/en', 'Primary navigation', englishHeaderLinks, englishFooterLinks],
  ] as const) {
    for (const [label, path] of headerLinks) { await page.goto(home); await clickAnchorAndExpectPath(page, page.getByRole('navigation', { name: navLabel }).getByRole('link', { name: label, exact: true }), path); }
    for (const [label, path] of footerLinks) { await page.goto(home); await clickAnchorAndExpectPath(page, page.locator('footer').getByRole('link', { name: label, exact: true }), path); }
  }
});

test('homepage CTAs and language switching navigate correctly', async ({ page }) => {
  for (const [home, label, path] of [
    ['/', 'ดูว่าเราทำงานอย่างไร', '/how-it-works'], ['/', 'ประเมินจากค่าไฟของฉัน', '/estimate'],
    ['/en', 'See how it works', '/en/how-it-works'], ['/en', 'Estimate from my bill', '/en/estimate'],
  ] as const) { await page.goto(home); await clickAnchorAndExpectPath(page, page.getByRole('link', { name: label, exact: true }), path); }
  await page.goto('/solar-guide'); await page.getByRole('link', { name: 'View this page in English' }).click(); await expectPath(page, '/en/solar-guide');
  await page.getByRole('link', { name: 'View this page in Thai' }).click(); await expectPath(page, '/solar-guide');
});

test('the mobile menu opens and navigation anchors work', async ({ page }, testInfo) => {
  mobileOnly(testInfo); test.slow();
  for (const [home, navLabel, links] of [['/', 'เมนูมือถือ', thaiHeaderLinks], ['/en', 'Mobile navigation', englishHeaderLinks]] as const) {
    for (const [label, path] of links) { await page.goto(home); const menu = page.locator('details.mobile-menu'); await menu.locator('summary').click(); await clickAnchorAndExpectPath(page, page.getByRole('navigation', { name: navLabel }).getByRole('link', { name: label, exact: true }), path); }
  }
});

for (const estimate of [
  { locale: 'th', path: '/estimate', exit: 'ออกจากแบบประเมิน', language: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' },
  { locale: 'en', path: '/en/estimate', exit: 'Exit estimate', language: 'View this estimate in Thai' },
] as const) {
  test(`${estimate.locale.toUpperCase()} estimator uses focused chrome and eight steps`, async ({ page }) => {
    await page.goto(estimate.path);
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: estimate.exit })).toBeVisible();
    await expect(header.getByRole('link', { name: estimate.language })).toHaveText('TH / EN');
    await expect(header.getByRole('navigation')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(page.getByRole('progressbar').locator(':scope > span')).toHaveCount(8);
  });
}

test('address text stays out of requests and map confirmation has a no-drag alternative', async ({ page }) => {
  const secretAddress = '777 Privacy Test Lane Bangkok';
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/en/estimate');
  await page.getByLabel('Home address').fill(secretAddress);
  await page.getByRole('button', { name: 'Position home on map' }).click();
  await expect(page.getByRole('button', { name: 'Put marker at map centre' })).toBeVisible();
  await page.getByRole('button', { name: 'Move marker east' }).click();
  await page.getByRole('button', { name: 'Confirm this property location' }).click();
  expect(requests.some((url) => decodeURIComponent(url).includes(secretAddress))).toBe(false);
});

test('refresh and language switching preserve eligible estimator progress', async ({ page }) => {
  await page.goto('/estimate');
  await confirmAddress(page, 'th');
  await page.getByRole('radio', { name: 'จำนวนหน่วยไฟฟ้า (kWh)' }).click();
  await page.getByLabel('จำนวนหน่วยต่อเดือน').fill('900');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByRole('radio', { name: 'ค่าเฉลี่ย 12 เดือน' }).click();
  await page.reload();
  await expect(page.getByRole('radio', { name: 'ค่าเฉลี่ย 12 เดือน' })).toBeChecked();
  await page.getByRole('link', { name: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' }).click();
  await expectPath(page, '/en/estimate');
  await expect(page.getByRole('radio', { name: 'A 12-month average' })).toBeChecked();
  await page.getByRole('button', { name: 'Clear and start over' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Where is the home');
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('solarmatch:estimate'))).toBeNull();
});

test('the complete Thai estimate journey reaches a transparent result', async ({ page }) => { test.slow(); await completeEstimate(page, 'th'); });
test('the complete English estimate journey reaches a transparent result', async ({ page }) => { test.slow(); await completeEstimate(page, 'en'); });

test('TOU withholds financial results instead of applying the standard model', async ({ page }) => {
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify({ ...estimate, tariffType: 'tou' })), savedEstimate);
  await page.goto('/en/estimate/results');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('production estimate is ready');
  await expect(page.getByText('savings and payback are withheld', { exact: false })).toBeVisible();
});

test('the prototype contact form validates and discards without a lead request', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.addInitScript((estimate) => sessionStorage.setItem('solarmatch:estimate', JSON.stringify(estimate)), savedEstimate);
  await page.goto('/en/estimate/results');
  await page.getByRole('button', { name: 'Test the form' }).click();
  await expect(page.getByLabel(/Name/)).toBeFocused();
  await page.getByLabel(/Name/).fill('Test Homeowner');
  await page.getByLabel(/Thai phone number/).fill('081 234 5678');
  await page.getByLabel(/Preferred contact method/).selectOption('line');
  await page.getByLabel(/LINE ID/).fill('prototype-test');
  await page.getByRole('checkbox', { name: /I consent to this information/ }).check();
  await page.getByRole('button', { name: 'Test the form' }).click();
  await expect(page.getByText('without sending or storing it', { exact: false })).toBeVisible();
  expect(posts).toEqual([]);
});

test('legal, contact, and About pages expose prototype boundaries', async ({ page }) => {
  await page.goto('/privacy'); await expect(page.getByText('เซสชันเบราว์เซอร์', { exact: false }).first()).toBeVisible();
  await page.goto('/en/privacy'); await expect(page.getByText('browser session', { exact: false }).first()).toBeVisible();
  await page.goto('/contact'); await expect(page.getByRole('heading', { name: 'ช่องทางติดต่อยังไม่เปิดใช้งาน' })).toBeVisible();
  await page.goto('/en/about'); await expect(page.getByText('No lead storage or transmission')).toBeVisible();
});
