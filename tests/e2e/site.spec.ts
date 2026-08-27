import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const thaiHeaderLinks = [
  ['ประเมินโซลาร์', '/estimate'],
  ['วิธีการทำงาน', '/how-it-works'],
  ['คู่มือโซลาร์', '/solar-guide'],
  ['วิธีคำนวณ', '/methodology'],
  ['เกี่ยวกับเรา', '/about'],
] as const;

const englishHeaderLinks = [
  ['Solar estimate', '/en/estimate'],
  ['How it works', '/en/how-it-works'],
  ['Solar guide', '/en/solar-guide'],
  ['Methodology', '/en/methodology'],
  ['About', '/en/about'],
] as const;

const thaiFooterLinks = [
  ...thaiHeaderLinks.slice(0, 3),
  ['วิธีคำนวณ', '/methodology'],
  ['แหล่งข้อมูล', '/resources'],
  ['เกี่ยวกับเรา', '/about'],
  ['ติดต่อ', '/contact'],
  ['ความเป็นส่วนตัว', '/privacy'],
  ['ข้อกำหนดการใช้งาน', '/terms'],
  ['คุกกี้', '/cookies'],
] as const;

const englishFooterLinks = [
  ...englishHeaderLinks.slice(0, 3),
  ['Methodology', '/en/methodology'],
  ['Resources', '/en/resources'],
  ['About', '/en/about'],
  ['Contact', '/en/contact'],
  ['Privacy', '/en/privacy'],
  ['Terms of use', '/en/terms'],
  ['Cookies', '/en/cookies'],
] as const;

function desktopOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop navigation is covered in the desktop project.');
}

function mobileOnly(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'The collapsed details menu is covered in the mobile project.');
}

async function expectPath(page: Page, expectedPath: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
}

async function clickAnchorAndExpectPath(page: Page, link: Locator, expectedPath: string) {
  await expect(link).toHaveAttribute('href', expectedPath);
  await link.click();
  await expectPath(page, expectedPath);
}

async function chooseAndContinue(page: Page, optionName: string | RegExp, nextName: string) {
  await page.getByRole('radio', { name: optionName, exact: typeof optionName === 'string' }).click();
  await page.getByRole('button', { name: nextName, exact: true }).click();
}

async function completeEstimate(page: Page, locale: 'th' | 'en') {
  const english = locale === 'en';
  const homePath = english ? '/en' : '/';
  const estimatePath = english ? '/en/estimate' : '/estimate';
  const resultsPath = english ? '/en/estimate/results' : '/estimate/results';
  const next = english ? 'Next' : 'ถัดไป';

  await page.goto(homePath);
  const starter = page.locator('#hero-estimator');
  await starter.getByRole('combobox').selectOption('bangkok');
  await starter.getByRole('spinbutton').fill('4500');
  await starter.getByRole('button', { name: english ? /See your initial estimate/ : /ดูผลประเมินเบื้องต้น/ }).click();
  await expectPath(page, estimatePath);

  await expect(page.getByRole('radio', { name: english ? 'Bangkok' : 'กรุงเทพมหานคร' })).toBeChecked();
  await page.getByRole('button', { name: next, exact: true }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('4500');
  await page.getByRole('button', { name: next, exact: true }).click();

  await chooseAndContinue(page, english ? /^High/ : /^มาก/, next);
  await chooseAndContinue(page, english ? 'I own the home' : 'เป็นเจ้าของบ้าน', next);
  await chooseAndContinue(page, english ? 'Detached house' : 'บ้านเดี่ยว', next);
  await chooseAndContinue(page, english ? 'Not sure / skip details' : 'ไม่แน่ใจ / ข้ามได้', next);
  await chooseAndContinue(page, english ? 'I am only researching for now' : 'ตอนนี้แค่ศึกษาข้อมูล', next);

  await page.getByRole('radio', { name: english ? 'Rooftop solar' : 'Solar Rooftop' }).click();
  await page.getByRole('button', { name: english ? 'See estimate' : 'ดูผลประเมิน', exact: true }).click();
  await expectPath(page, resultsPath);

  await expect(page.getByRole('heading', { level: 1 })).toContainText(english ? 'A useful starting range is' : 'ช่วงเริ่มต้นที่อาจเหมาะคือ');
  await expect(page.getByLabel(english ? 'Estimated figures' : 'ตัวเลขประมาณการ')).toBeVisible();
  await expect(page.getByRole('link', { name: english ? 'Read the full methodology' : 'อ่านวิธีคำนวณทั้งหมด' })).toBeVisible();
  await expect(page.getByRole('heading', { name: english ? 'Cumulative household electricity cost' : 'ต้นทุนไฟฟ้าสะสมของบ้าน' })).toBeVisible();
}

test('homepage explains the prototype without prohibited timing or copyright copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ค่าไฟบ้านคุณ');
  await expect(page.getByText('เว็บไซต์ต้นแบบ', { exact: false }).first()).toBeVisible();
  await expect(page.locator('footer')).not.toContainText('©');
  await expect(page.locator('body')).not.toContainText(/ประมาณ 3 นาที|About 3 minutes|และแก้ไขคำตอบได้ทุกเมื่อ|and edit your answers at any time/i);
});

test('all desktop header anchors navigate in Thai and English', async ({ page }, testInfo) => {
  desktopOnly(testInfo);

  for (const [homePath, navLabel, links] of [
    ['/', 'เมนูหลัก', thaiHeaderLinks],
    ['/en', 'Primary navigation', englishHeaderLinks],
  ] as const) {
    for (const [label, destination] of links) {
      await page.goto(homePath);
      const navigation = page.getByRole('navigation', { name: navLabel });
      await clickAnchorAndExpectPath(page, navigation.getByRole('link', { name: label, exact: true }), destination);
    }
  }
});

test('all footer anchors navigate in Thai and English', async ({ page }, testInfo) => {
  test.slow();
  desktopOnly(testInfo);

  for (const [homePath, links] of [
    ['/', thaiFooterLinks],
    ['/en', englishFooterLinks],
  ] as const) {
    for (const [label, destination] of links) {
      await page.goto(homePath);
      const footer = page.locator('footer');
      await clickAnchorAndExpectPath(page, footer.getByRole('link', { name: label, exact: true }), destination);
    }
  }
});

test('the logo returns to the correct language homepage', async ({ page }) => {
  await page.goto('/solar-guide');
  await clickAnchorAndExpectPath(page, page.getByRole('link', { name: 'SolarMatch Thailand หน้าหลัก' }), '/');

  await page.goto('/en/solar-guide');
  await clickAnchorAndExpectPath(page, page.getByRole('link', { name: 'SolarMatch Thailand home' }), '/en');
});

test('representative homepage CTAs navigate in both languages', async ({ page }) => {
  test.slow();
  for (const [homePath, label, destination] of [
    ['/', 'ดูว่าเราทำงานอย่างไร', '/how-it-works'],
    ['/', 'ประเมินจากค่าไฟของฉัน', '/estimate'],
    ['/', 'เริ่มประเมินฟรี', '/estimate'],
    ['/en', 'See how it works', '/en/how-it-works'],
    ['/en', 'Estimate from my bill', '/en/estimate'],
    ['/en', 'Start free estimate', '/en/estimate'],
  ] as const) {
    await page.goto(homePath);
    await clickAnchorAndExpectPath(page, page.getByRole('link', { name: label, exact: true }), destination);
  }
});

test('language switching keeps the current content route', async ({ page }) => {
  await page.goto('/solar-guide');
  await page.getByRole('link', { name: 'View this page in English' }).click();
  await expectPath(page, '/en/solar-guide');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Rooftop solar starts');

  await page.getByRole('link', { name: 'View this page in Thai' }).click();
  await expectPath(page, '/solar-guide');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Solar Rooftop เริ่ม');
});

test('the mobile details menu opens and every navigation anchor works', async ({ page }, testInfo) => {
  test.slow();
  mobileOnly(testInfo);

  for (const [homePath, menuLabel, links] of [
    ['/', 'เมนูมือถือ', thaiHeaderLinks],
    ['/en', 'Mobile navigation', englishHeaderLinks],
  ] as const) {
    for (const [label, destination] of links) {
      await page.goto(homePath);
      const menu = page.locator('details.mobile-menu');
      await expect(menu).not.toHaveAttribute('open', '');
      await menu.locator('summary').click();
      await expect(menu).toHaveAttribute('open', '');
      const navigation = page.getByRole('navigation', { name: menuLabel });
      await clickAnchorAndExpectPath(page, navigation.getByRole('link', { name: label, exact: true }), destination);
    }
  }
});

for (const estimate of [
  { locale: 'th', path: '/estimate', exit: 'ออกจากแบบประเมิน', language: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' },
  { locale: 'en', path: '/en/estimate', exit: 'Exit estimate', language: 'View this estimate in Thai' },
] as const) {
  test(`${estimate.locale.toUpperCase()} estimator uses focused chrome and one eight-segment progress treatment`, async ({ page }) => {
    await page.goto(estimate.path);
    const header = page.locator('header');
    await expect(header.getByRole('link', { name: estimate.exit })).toBeVisible();
    await expect(header.getByRole('link', { name: estimate.language })).toBeVisible();
    await expect(header.getByRole('navigation')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(page.locator('aside')).toHaveCount(0);

    const progress = page.getByRole('progressbar');
    await expect(progress).toHaveCount(1);
    await expect(progress.locator(':scope > span')).toHaveCount(8);
    await expect(progress).not.toContainText('%');
    await expect(page.locator('body')).not.toContainText(/ประมาณ 3 นาที|About 3 minutes|และแก้ไขคำตอบได้ทุกเมื่อ|and edit your answers at any time/i);
  });
}

test('a mid-estimate refresh and contextual language switch restore the current answer', async ({ page }) => {
  await page.goto('/estimate');
  await chooseAndContinue(page, 'กรุงเทพมหานคร', 'ถัดไป');
  await page.getByRole('spinbutton').fill('4500');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByRole('radio', { name: /^มาก/ }).click();

  await expect.poll(async () => page.evaluate(() => {
    const saved = JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft') ?? '{}');
    return `${saved.step}:${saved.answers?.daytimeUsage}`;
  })).toBe('2:high');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ใช้ไฟช่วงกลางวัน');
  await expect(page.getByRole('radio', { name: /^มาก/ })).toBeChecked();

  await page.getByRole('link', { name: 'ดูแบบประเมินนี้เป็นภาษาอังกฤษ' }).click();
  await expectPath(page, '/en/estimate');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('use during the day');
  await expect(page.getByRole('radio', { name: /^High/ })).toBeChecked();
});

test('estimator radios support arrow keys and restart clears saved progress', async ({ page }) => {
  await page.goto('/en/estimate');
  const bangkok = page.getByRole('radio', { name: 'Bangkok' });
  await expect(bangkok).toBeEnabled();
  await bangkok.focus();
  await bangkok.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Nonthaburi' })).toBeChecked();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect.poll(async () => page.evaluate(() => Boolean(sessionStorage.getItem('solarmatch:estimate-draft')))).toBe(true);

  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('province');
  await expect.poll(async () => page.evaluate(() => {
    const saved = JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft') ?? '{}');
    return `${saved.version}:${saved.step}:${Object.keys(saved.answers ?? {}).length}`;
  })).toBe('1:0:0');
});

test('invalid saved estimator state fails safely and back restores heading focus', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('solarmatch:estimate-draft', JSON.stringify({ answers: {}, step: 'broken' })));
  await page.goto('/estimate');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('จังหวัด');
  await chooseAndContinue(page, 'กรุงเทพมหานคร', 'ถัดไป');
  await page.getByRole('spinbutton').fill('4500');
  await page.getByRole('button', { name: 'ถัดไป', exact: true }).click();
  await page.getByRole('button', { name: 'ย้อนกลับ' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});

test('the complete Thai estimate journey reaches a transparent result', async ({ page }) => {
  test.slow();
  await completeEstimate(page, 'th');
});

test('the complete English estimate journey reaches a translated result', async ({ page }) => {
  test.slow();
  await completeEstimate(page, 'en');
});

test('the prototype lead form validates LINE details and discards a valid submission', async ({ page }) => {
  const leadRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/leads') leadRequests.push(request.url());
  });
  await page.addInitScript(() => {
    sessionStorage.setItem('solarmatch:estimate', JSON.stringify({
      province: 'bangkok',
      monthlyBillThb: 4500,
      daytimeUsage: 'medium',
      authority: 'owner',
      propertyType: 'detached',
      roofKnown: false,
      shade: 'unknown',
      timing: 'research',
      energyInterest: 'solar',
    }));
  });
  await page.goto('/en/estimate/results');
  await expect(page.getByRole('heading', { name: 'Would you like to know when matching is ready to test?' })).toBeVisible();

  await page.getByRole('button', { name: 'Test the form' }).click();
  await expect(page.locator('#lead-name-error')).toHaveText('Please enter your name.');
  await expect(page.getByLabel(/Name/)).toBeFocused();
  await page.getByLabel(/Name/).fill('Test Homeowner');
  await page.getByLabel(/Thai phone number/).fill('081 234 5678');
  await page.getByLabel(/Preferred contact method/).selectOption('line');
  await expect(page.getByLabel(/LINE ID/)).toBeVisible();
  await page.getByLabel(/LINE ID/).fill('prototype-test');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Test the form' }).click();
  await expect(page.getByText('Prototype form test completed')).toBeVisible();
  await expect(page.getByText('without sending or storing it', { exact: false })).toBeVisible();
  expect(leadRequests).toEqual([]);
});

test('legal and contact routes expose prototype boundaries in both languages', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'นโยบายความเป็นส่วนตัว' })).toBeVisible();
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'ช่องทางติดต่อยังไม่เปิดใช้งาน' })).toBeVisible();

  await page.goto('/en/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await page.goto('/en/contact');
  await expect(page.getByRole('heading', { name: 'Contact channels are not active yet' })).toBeVisible();
});
