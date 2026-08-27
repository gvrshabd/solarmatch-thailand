import { expect, test } from '@playwright/test';

test('homepage explains the prototype and starts an estimate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ค่าไฟบ้านคุณ');
  await expect(page.getByText('เว็บไซต์ต้นแบบ', { exact: false }).first()).toBeVisible();
  await expect(page.locator('footer')).not.toContainText('©');
  await page.getByRole('combobox').first().selectOption('bangkok');
  await page.getByRole('spinbutton').fill('4200');
  await page.getByRole('button', { name: /ดูผลประเมินเบื้องต้น/ }).click();
  await expect(page).toHaveURL(/\/estimate$/);
});

test('the estimator can reach a transparent result', async ({ page }) => {
  await page.goto('/estimate');
  await page.getByRole('radio', { name: 'กรุงเทพมหานคร' }).click(); await page.getByRole('button', { name: /ถัดไป/ }).click();
  await page.getByRole('spinbutton').fill('4500'); await page.getByRole('button', { name: /ถัดไป/ }).click();
  for (const label of ['มาก', 'เป็นเจ้าของบ้าน', 'บ้านเดี่ยว']) { await page.getByRole('radio', { name: new RegExp(label) }).click(); await page.getByRole('button', { name: /ถัดไป/ }).click(); }
  await page.getByRole('button', { name: 'ไม่แน่ใจ / ข้ามได้' }).click(); await page.getByRole('button', { name: /ถัดไป/ }).click();
  await page.getByRole('radio', { name: 'ตอนนี้แค่ศึกษาข้อมูล' }).click(); await page.getByRole('button', { name: /ถัดไป/ }).click();
  await page.getByRole('radio', { name: 'Solar Rooftop' }).click(); await page.getByRole('button', { name: /ดูผลประเมิน/ }).click();
  await expect(page).toHaveURL(/\/estimate\/results$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('บ้านของคุณอาจเหมาะ');
  await expect(page.getByText('ยังไม่รวมรายได้ขายไฟและสิทธิภาษี')).toBeVisible();
});

test('legal and contact routes expose prototype boundaries', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'นโยบายความเป็นส่วนตัว' })).toBeVisible();
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'ช่องทางติดต่อยังไม่เปิดใช้งาน' })).toBeVisible();
});

test('language switch opens the complete English homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'View this page in English' }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('How suitable is your home');
  await expect(page.getByRole('link', { name: 'View this page in Thai' })).toBeVisible();
  await expect(page.locator('footer')).toContainText('All figures are prototype estimates');
  await expect(page.locator('footer')).not.toContainText('©');
});

test('English estimator reaches a fully translated result', async ({ page }) => {
  await page.goto('/en/estimate');
  await page.getByRole('radio', { name: 'Bangkok' }).click(); await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('spinbutton').fill('4500'); await page.getByRole('button', { name: /Next/ }).click();
  for (const label of ['High', 'I own the home', 'Detached house']) { await page.getByRole('radio', { name: new RegExp(label) }).click(); await page.getByRole('button', { name: /Next/ }).click(); }
  await page.getByRole('button', { name: 'Not sure / skip details' }).click(); await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('radio', { name: 'I am only researching for now' }).click(); await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('radio', { name: 'Rooftop solar' }).click(); await page.getByRole('button', { name: /See estimate/ }).click();
  await expect(page).toHaveURL(/\/en\/estimate\/results$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your home may suit');
  await expect(page.getByText('Export income and tax benefits are not included')).toBeVisible();
});

test('English legal and contact routes retain prototype boundaries', async ({ page }) => {
  await page.goto('/en/privacy');
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await page.goto('/en/contact');
  await expect(page.getByRole('heading', { name: 'Contact channels are not active yet' })).toBeVisible();
});
