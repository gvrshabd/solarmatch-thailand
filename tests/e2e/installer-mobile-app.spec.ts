import { expect, test, type Locator } from '@playwright/test';
import type { InstallerPortalData } from '../../lib/installer/portal-contract';
import { signalGroup } from '../../components/installers/signal-state';
import { mockSignalPortal, signalId, SIGNAL_NOW } from './signal-fixtures';

const app = '/installers/app';

// Intercepted routes must never be bypassed by an installed service worker.
// Disable traces as the opt-in real-D1 case creates a synthetic cookie session.
test.use({ serviceWorkers: 'block', trace: 'off', screenshot: 'off', video: 'off' });

for (const lang of ['th', 'en'] as const) {
  test(`installer app opens a scoped enquiry and preserves ${lang} in mobile navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { data } = await mockSignalPortal(page, 'approved', lang);
    const delivery = data.deliveries.find(item => item.id === signalId(39))!;
    await page.goto(`${app}?lang=${lang}`);
    const row = page.getByRole('link').filter({ hasText: delivery.homeownerName });
    await expect(row).toHaveAttribute('href', new RegExp(`^${app}/enquiry/`));
    await row.click();
    await expect(page).toHaveURL(new RegExp(`${app}/enquiry/${delivery.id}`));
    await expect(page.getByRole('heading', { level: 1, name: delivery.homeownerName })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('a[href^="tel:"]').first()).toHaveAttribute('href', `tel:${delivery.phone}`);
    await page.goBack();
    await expect(row).toBeVisible();
    const credits = page.getByRole('navigation').getByRole('link', { name: lang === 'en' ? 'Credits' : 'เครดิต', exact: true });
    await credits.click();
    await expect(page).toHaveURL(new RegExp(`${app}\\?view=credits&lang=${lang}`));
    await page.goBack();
    await expect(row).toBeVisible();
  });
}

test('an unanswered call opens an editable text and a wrong number prepares a claim without submitting it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { actions } = await mockSignalPortal(page, 'approved', 'en');
  await page.addInitScript(() => document.addEventListener('click', event => {
    if ((event.target as Element).closest('a[href^="tel:"]')) event.preventDefault();
  }));
  const id = signalId(39);
  await page.goto(`${app}/enquiry/${id}?lang=en`);
  const card = page.getByRole('region', { name: 'Next step' });
  const call = card.locator('a[href^="tel:"]');
  await call.click();
  await card.getByRole('button', { name: 'No answer' }).click();
  const message = card.getByRole('textbox');
  await expect(message).toHaveValue(/tried to call/i);
  await message.fill('Synthetic edited message');
  await expect(card.getByRole('link', { name: 'Open Messages' })).toHaveAttribute('href', /body=Synthetic%20edited%20message/);
  await card.getByRole('button', { name: /Skip|Cancel/ }).click();
  await call.click();
  await card.getByRole('button', { name: 'Wrong number' }).click();
  await expect(page.getByLabel('Reason', {exact:true})).toHaveValue('incorrect-contact');
  await expect(page.getByLabel('Supporting information')).toBeFocused();
  expect(actions).toEqual([
    {action:'log-activity', deliveryId:id, revision:0, kind:'call-no-answer'},
    {action:'log-activity', deliveryId:id, revision:0, kind:'call-wrong'},
  ]);
});

const decisions = [
  ['Chose another company', 'other-company', 'lost'], ['Price', 'price', 'lost'],
  ['Not ready yet', 'not-ready', 'lost'], ['Couldn’t reach them', 'unreachable', 'lost'],
  ['Not suitable for solar', 'not-suitable', 'not-suitable'],
] as const;

for (const [label, closeReason, outcome] of decisions) {
  test(`the decision card records ${closeReason} and reopens the quoted stage`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const { data, actions } = await mockSignalPortal(page, 'approved', 'en');
    const id = signalId(28);
    const delivery = data.deliveries.find(item => item.id === id)!;
    delivery.workflowRevision = 3;
    delivery.reopenOutcome = 'quoted';
    await page.goto(`${app}/enquiry/${id}?lang=en&tab=active`);
    const card = page.getByRole('region', { name: 'Next step' });
    await card.getByRole('button', { name: 'Not this time' }).click();
    await card.getByRole('radio', { name: label, exact: true }).check();
    await card.getByRole('button', { name: 'Close enquiry', exact: true }).click();
    const reopen = card.getByRole('button', { name: 'Reopen' });
    await expect(reopen).toBeVisible();
    expect(actions).toEqual([{action:'report-outcome', outcome, deliveryId:id, closeReason, revision:3}]);
    await reopen.click();
    await expect(card.getByRole('button', { name: 'They agreed' })).toBeVisible();
    expect(actions.at(-1)).toEqual({action:'report-outcome', outcome:'quoted', deliveryId:id, revision:3});
  });
}

test('They agreed marks the enquiry won and Undo restores the decision', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { data } = await mockSignalPortal(page, 'approved', 'en');
  const id = signalId(28), undoId = signalId(700);
  const delivery = data.deliveries.find(item => item.id === id)!;
  delivery.workflowRevision = 3;
  const writes: unknown[] = [];
  await page.route('**/api/installer/portal**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({json:data});
    const body = route.request().postDataJSON();
    writes.push(body);
    delivery.outcome = body.action === 'undo-activity' ? 'quoted' : body.outcome;
    return route.fulfill({ json: { ok: true, undoId, undoExpiresAt: new Date(SIGNAL_NOW + 6000).toISOString() } });
  });
  await page.goto(`${app}/enquiry/${id}?lang=en&tab=active`);
  const card = page.getByRole('region', { name: 'Next step' });
  await card.getByRole('button', { name: 'They agreed' }).click();
  await expect(card.getByRole('heading', { name: 'Sale agreed' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(card.getByRole('button', { name: 'They agreed' })).toBeVisible();
  expect(writes).toEqual([
    {action:'report-outcome', outcome:'won', deliveryId:id, revision:3},
    {action:'undo-activity', deliveryId:id, undoId},
  ]);
});

test('desktop previous and next stay in the tab and Next waiting opens the oldest waiting enquiry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 930 });
  await mockSignalPortal(page, 'approved', 'en');
  // The active fixture is ordered Ploy, Somsak, Wichai. The oldest waiting enquiry is Kanya.
  await page.goto(`${app}/enquiry/${signalId(30)}?tab=active&lang=en`);
  const pager = page.getByRole('navigation', { name: 'Browse enquiries' });
  await expect(pager).toContainText('2 of 3');
  await pager.getByRole('link', { name: 'Previous enquiry' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ploy' })).toBeVisible();
  await expect(pager.getByRole('button', { name: 'Previous enquiry' })).toBeDisabled();
  await pager.getByRole('link', { name: 'Next enquiry' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Somsak' })).toBeVisible();
  const waiting = page.getByRole('link', { name: /^Next waiting: Kanya/ });
  await expect(waiting).toHaveAttribute('href', new RegExp(`${app}/enquiry/${signalId(36)}.*tab=waiting`));
  await waiting.click();
  await expect(page.getByRole('heading', { level: 1, name: 'Kanya' })).toBeVisible();
  await expect(pager).toContainText('1 of 3');
});

test('a denied delivery detail removes contact data from an older list projection', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const { data } = await mockSignalPortal(page, 'approved', 'en');
  const delivery = data.deliveries.find(item => item.id === signalId(39))!;
  await page.route('**/api/installer/portal?deliveryId=*', route => route.fulfill({ status: 404, json: { error: 'not_found' } }));
  await page.goto(`${app}/enquiry/${delivery.id}?lang=en`);
  await expect(page.getByRole('heading', { name: 'This enquiry is not available to your company.' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(delivery.homeownerName);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(page.locator('textarea')).toHaveCount(0);
});

test('interrupted launch offers retry in either language', async ({ page }) => {
  await page.route('**/api/installer/portal**', route => route.abort('connectionfailed'));
  await page.goto(app);
  await expect(page.getByRole('heading', { name: 'เชื่อมต่อไม่สำเร็จ' })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page.getByRole('heading', { name: 'Connection interrupted' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await page.unroute('**/api/installer/portal**');
  await mockSignalPortal(page, 'approved', 'en');
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Enquiries', exact: true })).toBeVisible();
});

// Run after docs/installer-demo-local.md against a disposable local D1 store.
// This case signs in and verifies server writes, so it has stricter prerequisites
// than the deterministic browser fixtures above.
test('synthetic installer signs in, logs a call, books a visit, records and undoes a quote', async ({ page, baseURL }) => {
  test.skip(process.env.INSTALLER_E2E !== '1' || !process.env.INSTALLER_DEMO_PASSWORD, 'Requires the local synthetic demo.');
  const origin = new URL(baseURL!);
  expect(['localhost', '127.0.0.1', '[::1]']).toContain(origin.hostname);
  expect(origin.protocol).toBe('http:');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${app}?lang=en`);
  await page.getByLabel('Email', { exact: true }).fill('preview-installer@example.test');
  await page.locator('#auth-password').fill(process.env.INSTALLER_DEMO_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Enquiries', exact: true })).toBeVisible();
  const read = async (id?: string) => {
    const response = await page.request.get('/api/installer/portal' + (id ? `?deliveryId=${encodeURIComponent(id)}` : ''));
    expect(response.ok()).toBe(true);
    return await response.json() as InstallerPortalData;
  };
  const portal = await read();
  expect(portal.integrations.mode).toBe('local-test');
  expect(portal.company?.name).toBe('Synthetic Preview Solar');
  const delivery = portal.deliveries.find(item => signalGroup(item) === 'waiting');
  expect(delivery, 'Seed a fresh disposable demo with at least one new enquiry').toBeDefined();
  const id = delivery!.id;
  const scoped = async () => (await read(id)).deliveries.find(item => item.id === id)!;
  const initial = await scoped();
  await page.locator(`a[href^="${app}/enquiry/${id}"]`).click();
  // Prevent opening an OS dialler during the test. The React call handler still runs.
  await page.evaluate(() => document.addEventListener('click', event => {
    if ((event.target as Element).closest('a[href^="tel:"]')) event.preventDefault();
  }));
  const call = page.locator('a[href^="tel:"]:visible').first();
  await call.click();
  await expect(page.getByRole('heading', { name: 'How did the call go?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Spoke with them' })).toBeVisible();
  const browserStorage = await page.evaluate(() => [...Object.values(sessionStorage), ...Object.values(localStorage)].join('\n'));
  expect(browserStorage).not.toContain(delivery!.phone);
  expect(browserStorage).not.toContain(delivery!.homeownerName);
  const save = async (button: Locator) => {
    const [response] = await Promise.all([page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/installer/portal'), button.click()]);
    expect(response.ok()).toBe(true);
  };
  try {
    await save(page.getByRole('button', { name: 'Spoke with them' }));
    await expect(page.getByRole('heading', { name: 'Book a site visit' })).toBeVisible();
    expect((await scoped()).outcome).toBe('contacted');
    await save(page.getByRole('button', { name: 'Save visit' }));
    const booked = await scoped();
    expect(booked.outcome).toBe('site_visit');
    expect(booked.siteVisitAt).toBeTruthy();
    await page.getByRole('button', { name: 'Quote sent', exact: true }).click();
    await page.getByLabel(/Quote amount/).fill('123456');
    await save(page.getByRole('button', { name: 'Save quote' }));
    expect((await scoped()).quoteAmountThb).toBe(123456);
    await save(page.getByRole('button', { name: 'Undo', exact: true }));
    const restored = await scoped();
    expect(restored.outcome).toBe('site_visit');
    expect(restored.siteVisitAt).toBe(booked.siteVisitAt);
    expect(restored.quoteAmountThb).toBe(initial.quoteAmountThb);
  } finally {
    // The public API preserves visit/quote values on stage changes. Restore them
    // explicitly if needed so separate browser projects can reuse this fixture.
    let latest = await scoped();
    const restore = async (outcome: string, fields = {}) => {
      const response = await page.request.post('/api/installer/portal', {
        headers: { Origin: origin.origin },
        data: { action: 'report-outcome', deliveryId: id, outcome, revision: latest.workflowRevision, ...fields },
      });
      expect(response.ok()).toBe(true);
      latest = await scoped();
    };
    if (latest.quoteAmountThb !== initial.quoteAmountThb) await restore('quoted', { quoteAmountThb: initial.quoteAmountThb ?? null });
    if (latest.siteVisitAt !== initial.siteVisitAt) await restore('site_visit', { siteVisitAt: initial.siteVisitAt ?? null });
    if (signalGroup(latest) !== 'waiting') await restore('open');
  }
});

test('a failed save keeps the step open and explains why inside the card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSignalPortal(page, 'approved', 'en');
  await page.addInitScript(() => document.addEventListener('click', event => {
    if ((event.target as Element).closest('a[href^="tel:"]')) event.preventDefault();
  }));
  await page.goto(`${app}/enquiry/${signalId(39)}?lang=en`);
  const card = page.getByRole('region', { name: 'Next step' });
  await card.locator('a[href^="tel:"]').click();
  await expect(card.getByText('Your phone is calling 081 234 5678. Come back here when you hang up.')).toBeVisible();
  await page.route('**/api/installer/portal**', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, json: { error: 'temporarily_unavailable' } }) : route.fallback());
  await card.getByRole('button', { name: 'Spoke with them' }).click();
  await expect(card.getByRole('alert')).toHaveText('The service is temporarily unavailable. Please try again later.');
  await expect(card.getByRole('heading', { name: 'How did the call go?' })).toBeVisible();
  await page.unroute('**/api/installer/portal**');
  await mockSignalPortal(page, 'approved', 'en');
  await card.getByRole('button', { name: 'Spoke with them' }).click();
  await expect(card.getByRole('alert')).toHaveCount(0);
});

test('closing asks for a reason instead of silently doing nothing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { actions } = await mockSignalPortal(page, 'approved', 'th');
  await page.goto(`${app}/enquiry/${signalId(28)}?lang=th&tab=active`);
  const card = page.getByRole('region', { name: 'ขั้นต่อไป' });
  await expect(card.getByRole('heading', { name: 'รอคุณวิชัย ตัดสินใจ' })).toBeVisible();
  await card.getByRole('button', { name: 'ยังไม่ตกลง' }).click();
  await card.getByRole('button', { name: 'ปิดคำขอ', exact: true }).click();
  await expect(card.getByRole('alert')).toHaveText('เลือกเหตุผลก่อนปิดคำขอ');
  await expect(card.getByRole('radio').first()).toBeFocused();
  expect(actions).toEqual([]);
  await card.getByRole('radio', { name: 'ราคา' }).check();
  await expect(card.getByRole('alert')).toHaveCount(0);
});

test('a won enquiry shows every stage done and when it was won', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { data } = await mockSignalPortal(page, 'approved', 'en');
  const won = data.deliveries.find(item => item.id === signalId(22))!;
  won.activity = [{ at: '2026-10-25T05:00:00.000Z', kind: 'won' }];
  await page.goto(`${app}/enquiry/${won.id}?lang=en&tab=closed`);
  const card = page.getByRole('region', { name: 'Next step' });
  await expect(card.getByText('Marked as won Sun 25 Oct.')).toBeVisible();
  await expect(card.locator('.ns-track button[data-state=done]')).toHaveCount(5);
});

test('the store apps show credit balances and history without purchasing', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 SolarMatchInstallers/iOS' });
  const page = await context.newPage();
  await mockSignalPortal(page, 'nocredits', 'en');
  await page.goto(`${app}?view=credits&lang=en`);
  await expect(page.getByText('Credits can’t be bought in this app.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Statement' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay with/ })).toHaveCount(0);
  await page.goto(`${app}?lang=en`);
  await expect(page.getByRole('button', { name: 'Top up' })).toHaveCount(0);
  await context.close();
});

test('an installer can delete their account from the app after confirming their password', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { data } = await mockSignalPortal(page, 'approved', 'en');
  const attempts: unknown[] = [];
  let deleted = false;
  await page.route('**/api/installer/portal**', async route => {
    if (route.request().method() === 'GET' && deleted) return route.fulfill({ status: 401, json: { error: 'unauthorized' } });
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON() as { action: string; password?: string };
    if (body.action !== 'delete-account') return route.fallback();
    attempts.push(body);
    if (body.password !== 'synthetic correct password') return route.fulfill({ status: 403, json: { error: 'password_incorrect' } });
    deleted = true;
    return route.fulfill({ json: { ok: true, companyReviewRequired: true } });
  });
  await page.goto(`${app}?lang=en`);
  await page.locator('details.acct:visible summary').first().click();
  await page.getByRole('button', { name: 'Account and deletion' }).first().click();
  await expect(page).toHaveURL(/view=profile/);
  const section = page.getByRole('region', { name: 'Your account' });
  await expect(section.getByText(data.session.user.email)).toBeVisible();
  await section.getByText('Delete account', { exact: true }).click();
  await section.getByRole('button', { name: 'Delete my account permanently' }).click();
  await expect(section.getByRole('alert')).toHaveText('Enter your current password to confirm.');
  expect(attempts).toEqual([]);
  await section.getByLabel('Current password').fill('wrong synthetic password');
  await section.getByRole('button', { name: 'Delete my account permanently' }).click();
  await expect(section.getByRole('alert')).toHaveText('That password isn’t right. Your account has not been deleted.');
  await section.getByLabel('Current password').fill('synthetic correct password');
  await section.getByRole('button', { name: 'Delete my account permanently' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Your account has been deleted.')).toBeVisible();
  expect(attempts).toHaveLength(2);
});

test('the public deletion page explains the steps in both languages without sign-in', async ({ page }) => {
  for (const [lang, heading, step] of [['en', 'Delete your SolarMatch Installers account', 'Delete my account permanently'], ['th', 'ลบบัญชี SolarMatch Installers', 'ลบบัญชีถาวร']] as const) {
    const response = await page.goto(`/installers/delete-account?lang=${lang}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText(step, { exact: false })).toBeVisible();
    await expect(page.locator('form, input')).toHaveCount(0);
  }
});

test.describe('installed workspace', () => {
  test.use({ serviceWorkers: 'allow' });
  test('offline relaunch shows the retry page without storing private responses', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Playwright offline emulation for a service worker uses Chromium.');
    await page.goto(`${app}?lang=en`);
    const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifest).toBeTruthy();
    const metadata = await page.request.get(manifest!);
    expect(metadata.ok()).toBe(true);
    expect(await metadata.json()).toMatchObject({ start_url: app, scope: app, display: 'standalone' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
    await context.setOffline(true);
    const offline = await page.reload();
    expect(offline?.status()).toBe(503);
    await expect(page.getByRole('heading', { name: 'Check your connection' })).toBeVisible();
    await context.setOffline(false);
    await page.getByRole('link', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'Installer workspace' })).toBeVisible();
    expect(await page.evaluate(() => caches.keys())).toEqual([]);
  });
});
