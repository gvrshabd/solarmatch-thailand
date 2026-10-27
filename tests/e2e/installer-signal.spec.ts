import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockSignalPortal, signalId, signalReady, SIGNAL_STATES } from './signal-fixtures';

// Entirely synthetic route fixtures. These tests never submit a real account or payment.
for (const lang of ['en', 'th'] as const) {
  const en = lang === 'en';
  test.describe('Signal installer ' + lang, () => {
    test('signed-out skip link is first in keyboard order and focuses main', async ({ page, browserName }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route('**/api/**', route => route.fulfill({ status: 401, json: { error: 'unauthorized' } }));
      await page.goto('/installers?lang=' + lang);
      await signalReady(page);
      const skip = page.getByRole('link', { name: en ? 'Skip to content' : 'ข้ามไปเนื้อหา', exact: true });
      await expect(skip).toHaveCount(1);
      if (browserName === 'webkit') {
        // Bundled Windows WebKit skips plain links on Tab even in minimal HTML.
        // Verify app order independently, then retain actual focus and Enter checks.
        expect(await skip.evaluate(element => element.tabIndex)).toBe(0);
        expect(await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).find(element => element.tabIndex >= 0 && !element.hasAttribute('disabled') && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden')?.className)).toBe('sr skip');
        await skip.focus();
      } else await page.keyboard.press('Tab');
      await expect(skip).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#installer-landing-main')).toBeFocused();
    });

    for (const state of SIGNAL_STATES) test(`${state}: responsive shell, notices and accessible landmarks`, async ({ page }) => {
      test.setTimeout(120_000);
      await mockSignalPortal(page, state, lang);
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/installers?view=inbox&lang=' + lang);
        await signalReady(page);
        await expect(page.locator('.signal.portal > .a-app > header.a-rail')).toHaveCount(1);
        await expect(page.locator('.signal.portal > .a-app > main.a-main')).toHaveCount(1);
        await expect(page.locator('.signal h1')).toHaveCount(1);
        if (width >= 1000 && !['empty', 'pending', 'nocompany'].includes(state)) await expect(page).toHaveURL(new RegExp('/enquiry/' + signalId(36)));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${lang}/${state}/${width} must not overflow`).toBe(true);
        const notices = page.locator('.signal .notice');
        if (['platform', 'unverified', 'terms', 'nocredits', 'debt'].includes(state)) await expect(notices).toHaveCount(1);
        else await expect(notices).toHaveCount(0);
        if (state === 'unverified') {
          await expect(page.getByRole('switch')).toBeDisabled();
          // Truthful wording does not claim a verification email was just sent.
          await expect(notices).toHaveAttribute('data-warning', 'verify');
          await expect(notices).toContainText('somchai@suriyasolar.co.th');
          if (width >= 1000) {
            await expect(page.locator('.seglabels button')).toHaveCount(5);
            for (const button of await page.locator('.seglabels button').all()) await expect(button).toBeDisabled();
          }
        }
        if (state === 'paused') await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
        if (state === 'pending' || state === 'nocompany') {
          await expect(page.getByRole('switch')).toHaveCount(0);
          await expect(page.locator('.seg3')).toHaveCount(0);
        } else {
          await expect(page.locator('.seg3 button')).toHaveCount(3);
          await expect(page.locator('.a-list .row')).toHaveCount(state === 'empty' ? 0 : 3);
          if (width >= 1000 && state !== 'empty') await expect(page).toHaveURL(new RegExp('/enquiry/' + signalId(36)));
        }
        const result = await new AxeBuilder({ page }).include('.signal').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
        expect(result.violations, JSON.stringify(result.violations, null, 2)).toEqual([]);
      }
    });

    test('all boundary widths and legacy overview resolve to the waiting inbox', async ({ page }) => {
      test.setTimeout(120_000);
      await mockSignalPortal(page, 'approved', lang);
      for (const width of [360, 390, 768, 859, 860, 899, 900, 959, 960, 999, 1000, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/installers?view=overview&lang=' + lang);
        await signalReady(page);
        await expect(page.locator('.seg3 button[aria-pressed="true"]')).toContainText(en ? 'Waiting' : 'รอติดต่อ');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), String(width)).toBe(true);
      }
    });

    test('waiting order, segment URL, search, kWh fallback and withdrawal privacy', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const fixture = await mockSignalPortal(page, 'approved', lang);
      const withdrawn = fixture.data.deliveries.find(item => item.withdrawn)!;
      withdrawn.homeownerName = 'WITHDRAWN_PRIVATE_NAME'; withdrawn.phone = '0899999999'; withdrawn.location = 'WITHDRAWN_PRIVATE_AREA'; withdrawn.teamNotes = 'WITHDRAWN_PRIVATE_NOTES';
      await page.goto('/installers?view=inbox&lang=' + lang);
      await signalReady(page);
      await expect(page.locator('.a-list .row').first()).toContainText(en ? 'Kanya' : 'กัญญา');
      await expect(page.locator('.a-list .row').nth(1)).toContainText('620');
      await page.getByRole('searchbox').fill('SM-2610-039');
      await expect(page.locator('.a-list .row')).toHaveCount(1);
      await page.getByRole('searchbox').fill('');
      await page.locator('.seg3 button').filter({ hasText: en ? 'Active' : 'ดำเนินการ' }).click();
      await expect(page).toHaveURL(/tab=active/);
      await expect(page.locator('.a-list .row')).toHaveCount(3);
      await page.locator('.seg3 button').filter({ hasText: en ? 'Closed' : 'ปิดแล้ว' }).click();
      await expect(page).toHaveURL(/tab=closed/);
      await expect(page.locator('.a-list .row')).toHaveCount(2);
      await expect(page.locator('.signal')).not.toContainText('WITHDRAWN_PRIVATE');
      await page.getByRole('searchbox').fill('WITHDRAWN_PRIVATE');
      await expect(page.locator('.a-list .row')).toHaveCount(0);
      await page.goto('/installers/enquiry/' + signalId(25) + '?lang=' + lang);
      await signalReady(page);
      await expect(page.locator('.signal')).not.toContainText('WITHDRAWN_PRIVATE');
      await expect(page.locator('.signal')).not.toContainText('0899999999');
      await expect(page.locator('.a-detail a[href^="tel:"]')).toHaveCount(0);
      await expect(page.locator('.signal')).toContainText(en ? 'Do not contact the homeowner' : 'ห้ามติดต่อเจ้าของบ้าน');
    });

    test('combined notices expose one priority at a time', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const fixture = await mockSignalPortal(page, 'combined', lang);
      await page.goto('/installers?view=inbox&lang=' + lang);
      await signalReady(page);
      const notice = page.locator('.signal .notice');
      await expect(notice).toHaveCount(1);
      await expect(notice).toHaveAttribute('data-warning', 'verify');
      await expect(notice).toContainText('somchai@suriyasolar.co.th');
      fixture.data.session.user.emailVerified = true;
      await page.reload(); await signalReady(page);
      await expect(notice).toHaveAttribute('data-warning', 'terms');
      fixture.data.terms.acceptedAt = new Date().toISOString();
      fixture.data.company!.termsAcceptedVersion = fixture.data.terms.version;
      await page.reload(); await signalReady(page);
      await expect(notice).toContainText(en ? 'New deliveries are paused by SolarMatch' : 'SolarMatch พักการส่งคำขอ');
      await expect(notice).toHaveAttribute('data-warning', 'platform');
      fixture.data.availability!.platformPaused = false;
      await page.reload(); await signalReady(page);
      await expect(notice).toHaveAttribute('data-warning', 'debt');
      await expect(notice).toContainText('4');
      fixture.data.balance.debt = 0;
      await page.reload(); await signalReady(page);
      await expect(notice).toHaveAttribute('data-warning', 'empty');
    });

    test('notes save on blur with revision and preserve typed text on a conflict', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const fixture = await mockSignalPortal(page, 'approved', lang);
      await page.goto('/installers/enquiry/' + signalId(39) + '?lang=' + lang);
      await signalReady(page);
      const notes = page.getByRole('textbox', { name: en ? 'Notes for your team' : 'บันทึกสำหรับทีม' });
      await notes.fill('Synthetic note for the team');
      expect(fixture.actions).toHaveLength(0);
      await notes.blur();
      await expect.poll(() => fixture.actions.filter(action => action.action === 'save-team-notes')).toHaveLength(1);
      expect(fixture.actions[0]).toEqual({ action: 'save-team-notes', deliveryId: signalId(39), notes: 'Synthetic note for the team', revision: 1 });
      await expect(notes).toHaveValue('Synthetic note for the team');
      fixture.data.deliveries.find(item => item.id === signalId(39))!.notesRevision = 99;
      await notes.fill('Keep this unsaved text after conflict');
      await notes.blur();
      await expect(page.locator('.signal')).toContainText(en ? 'The note changed elsewhere or the enquiry is unavailable.' : 'โน้ตถูกแก้ไขจากที่อื่นหรือคำขอไม่พร้อมใช้งาน');
      await expect(notes).toHaveValue('Keep this unsaved text after conflict');
    });

    test('payment QR comes only from mocked checkout and stays unconfirmed', async ({ page }) => {
      const fixture = await mockSignalPortal(page, 'payment', lang);
      await page.goto('/installers?view=credits&lang=' + lang);
      await signalReady(page);
      await page.getByRole('button', { name: (en ? 'Pay with ' : 'ชำระผ่าน ') + 'PromptPay', exact: true }).click();
      await expect(page.locator('.qr img')).toBeVisible();
      expect(fixture.actions).toContainEqual({ action: 'checkout', packageId: signalId(3), method: 'promptpay' });
      await expect(page.locator('.bal > b')).toContainText('8');
      await page.locator('.qr').getByRole('button', { name: en ? 'Check status' : 'ตรวจสอบสถานะ', exact: true }).click();
      await expect.poll(() => fixture.actions.filter(action => action.action === 'reconcile-order')).toHaveLength(1);
      expect(fixture.actions.at(-1)).toEqual({ action: 'reconcile-order', orderId: signalId(201) });
      await expect(page.locator('.bal > b')).toContainText('8');
    });

    test('every secondary view has one heading and retains language', async ({ page }) => {
      await mockSignalPortal(page, 'approved', lang);
      for (const view of ['credits', 'profile', 'claims', 'terms']) {
        await page.goto('/installers?view=' + view + '&lang=' + lang);
        await signalReady(page);
        await expect(page.locator('.signal h1')).toHaveCount(1);
        await expect(page.locator('.signal')).toHaveAttribute('lang', lang);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
    });
  });
}
