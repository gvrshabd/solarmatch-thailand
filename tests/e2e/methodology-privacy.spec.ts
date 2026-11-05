import { expect, test } from '@playwright/test';

test('retired methodology routes cannot be retrieved or discovered', async ({ request, page }) => {
  for (const path of ['/methodology', '/en/methodology', '/methodology/', '/en/methodology/']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    expect(await response.text()).not.toContain('Synthetic mean-day timing');
  }
  for (const path of ['/sitemap.xml', '/llms.txt']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).not.toContain('/methodology');
  }
  for (const path of ['/', '/en', '/solar-guide', '/en/solar-guide', '/resources', '/en/resources']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('a[href*="/methodology"]')).toHaveCount(0);
  }
});
