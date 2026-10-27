import {expect, test, type Page} from '@playwright/test';
import type {InstallerPortalData} from '../../lib/installer/portal-contract';

const deliveryId = '00000000-0000-4000-8000-000000000039';
const fixture = (): InstallerPortalData => ({
  session: {user: {id: 'notes-owner', name: 'Synthetic owner', email: 'notes@example.test', emailVerified: true}},
  company: {id: 'notes-company', name: 'Notes test company', approvalStatus: 'approved', contactName: 'Synthetic owner', phone: '0800000000', serviceAreas: ['bangkok'], supportedProducts: ['shared_residential'], dailyLimit: 5, paused: false, lineLinked: false, termsAcceptedVersion: 'synthetic'},
  products: [], packages: [], balance: {available: 10, reserved: 0, trialRemaining: 0, debt: 0},
  deliveries: [{id: deliveryId, enquiryId: 'notes-enquiry', reference: 'SM-NOTES-039', product: 'shared_residential', fundingSource: 'purchased', creditCost: 2, deliveredAt: '2026-10-27T03:00:00Z', notificationStatus: 'pending', claimDeadline: '2099-10-30T03:00:00Z', withdrawn: false, homeownerName: 'Synthetic homeowner', phone: '0800000000', location: 'Bangkok', requestedAt: '2026-10-27T02:00:00Z', assessment: {monthlyBillThb: 7200, airConditionerCount: 6}, qualification: '', outcome: null, teamNotes: 'Original note', notesRevision: 3}],
  orders: [], ledger: [], claims: [], terms: {version: 'synthetic', textTh: 'ข้อตกลงทดสอบ', textEn: 'Synthetic terms.', acceptedAt: '2026-10-01T00:00:00Z'},
  integrations: {paymentsEnabled: false, paymentMethods: [], lineConfigured: false, mode: 'local-test'},
  commercial: {creditValueMinor: 20000, sharedCredits: 2, claimDays: 7, trialDeliveries: 2, recipientLimit: 3},
});
const open = async (page: Page) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(`/installers/enquiry/${deliveryId}?lang=en&tab=waiting`);
  await expect(page.getByLabel('Notes for your team', {exact: true})).toBeVisible();
};

// Every request is intercepted; these tests have no account, messaging, or payment side effects.
test.describe('Signal notes autosave', () => {
  for (const restriction of ['unverified', 'cannot-manage'] as const) test(`disables call and copy on phone and desktop when ${restriction}`, async ({page}) => {
    const data = fixture();
    if (restriction === 'unverified') data.session.user.emailVerified = false;
    else data.availability = {platformPaused: false, allocationPaused: false, notificationsEnabled: true, canManage: false};
    let posts = 0;
    await page.route('**/api/installer/portal**', route => {
      if (route.request().method() === 'POST') posts++;
      return route.fulfill({json: data});
    });
    await open(page);
    for (const width of [390, 1440]) {
      await page.setViewportSize({width, height: 900});
      const contact = page.locator(width < 1000 ? '.mcall' : '.dact');
      const call = contact.locator('a[href^="tel:"]');
      await expect(call).toBeVisible();
      await expect(call).toHaveAttribute('href', 'tel:0800000000');
      await expect(call).toHaveAttribute('aria-disabled', 'true');
      await expect(call).toHaveAttribute('tabindex', '-1');
      expect(await call.evaluate(element => !element.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true})))).toBe(true);
      await expect(contact.getByRole('button', {name: 'Copy', exact: true})).toBeDisabled();
      await expect(page.getByLabel('Notes for your team', {exact: true})).toBeDisabled();
      expect(posts).toBe(0);
    }
  });

  test('keeps edits enabled while pending and serializes later edits with the next revision', async ({page}) => {
    const data = fixture();
    const writes: {notes: string; revision: number}[] = [];
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/installer/portal**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({json: data});
      const body = route.request().postDataJSON();
      expect(body.action).toBe('save-team-notes');
      writes.push({notes: body.notes, revision: body.revision});
      if (writes.length === 1) await held;
      data.deliveries[0].teamNotes = body.notes.trim();
      data.deliveries[0].notesRevision = body.revision + 1;
      await route.fulfill({json: {ok: true}});
    });
    await open(page);
    const notes = page.getByLabel('Notes for your team', {exact: true});
    await notes.fill('  First saved request  ');
    await notes.blur();
    await expect.poll(() => writes.length).toBe(1);
    await expect(notes).toBeEnabled();
    await expect(page.locator('[id^="notes-status-"]')).toHaveText('Saving…');
    await notes.fill('  Newer text while saving  ');
    await notes.blur();
    expect(writes).toHaveLength(1);
    release();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes).toEqual([{notes: '  First saved request  ', revision: 3}, {notes: '  Newer text while saving  ', revision: 4}]);
    await expect(notes).toHaveValue('Newer text while saving');
    await expect(page.locator('[id^="notes-status-"]')).toHaveText(/^Saved \d{2}:\d{2}$/);
    await page.reload();
    await expect(page.getByLabel('Notes for your team',{exact:true})).toHaveValue('Newer text while saving');
    expect(writes).toHaveLength(2);
  });

  test('keeps a conflict visible, preserves the draft, and retries the original revision', async ({page}) => {
    const data = fixture();
    const writes: {notes: string; revision: number}[] = [];
    await page.route('**/api/installer/portal**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({json: data});
      const body = route.request().postDataJSON();
      expect(body.action).toBe('save-team-notes');
      writes.push({notes: body.notes, revision: body.revision});
      await route.fulfill({status: 409, json: {error: 'notes_changed_or_unavailable'}});
    });
    await open(page);
    const notes = page.getByLabel('Notes for your team', {exact: true});
    await notes.fill('My conflicting draft');
    await notes.blur();
    await expect(page.locator('[id^="notes-status-"]')).toContainText('Your edit is still here');
    await expect(notes).toHaveValue('My conflicting draft');
    await page.getByRole('link', {name: 'Enquiries', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`/installers/enquiry/${deliveryId}`));
    expect(writes).toHaveLength(1);
    await page.getByRole('button', {name: 'Retry saving', exact: true}).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes).toEqual([{notes: 'My conflicting draft', revision: 3}, {notes: 'My conflicting draft', revision: 3}]);
    await expect(notes).toHaveValue('My conflicting draft');
  });

  test('withdrawal removes contact, notes and share data and ignores a late notes response', async ({page}) => {
    const data = fixture();
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let notesPending = false;
    await page.route('**/api/installer/portal**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({json: data});
      const body = route.request().postDataJSON();
      if (body.action === 'save-team-notes') { notesPending = true; await held; return route.fulfill({json: {ok: true}}); }
      expect(body.action).toBe('report-outcome');
      data.deliveries[0].withdrawn = true;
      await route.fulfill({json: {ok: true}});
    });
    await open(page);
    await page.getByLabel('Notes for your team', {exact: true}).fill('Private draft that must disappear');
    await page.getByLabel('Notes for your team', {exact: true}).blur();
    await expect.poll(() => notesPending).toBe(true);
    await page.getByRole('button', {name: 'Contacted', exact: true}).click();
    await expect(page.getByRole('heading', {level: 1, name: 'Access withdrawn'})).toBeVisible();
    release();
    await expect(page.locator('textarea[id^="team-notes-"]')).toHaveCount(0);
    await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
    await expect(page.locator('.a-detail')).not.toContainText('Private draft');
    await expect(page.locator('.a-detail')).not.toContainText('080 000 0000');
    await expect(page.locator('.a-detail')).not.toContainText('Share with a team member');
  });

  test('preserves a failed draft across browser Back and Forward without writing browser storage', async ({page}) => {
    const data = fixture();
    await page.route('**/api/installer/portal**', route => route.request().method() === 'GET'
      ? route.fulfill({json: data})
      : route.fulfill({status: 503, json: {error: 'synthetic_unavailable'}}));
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/installers?view=inbox&lang=en');
    await page.locator(`a[href*="${deliveryId}"]`).click();
    const notes = page.getByLabel('Notes for your team', {exact: true});
    await notes.fill('Memory-only draft retained after Back');
    await notes.blur();
    await expect(page.getByRole('button', {name: 'Retry saving', exact: true})).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/view=inbox/);
    await page.goForward();
    await expect(notes).toHaveValue('Memory-only draft retained after Back');
    expect(await page.evaluate(() => [...Object.values(localStorage), ...Object.values(sessionStorage)].join('\n'))).not.toContain('Memory-only draft retained after Back');
  });
});
