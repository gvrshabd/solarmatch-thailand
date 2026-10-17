import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {designV2Example} from '../../config/design-v2-example';
import {calculateEstimate} from '../../lib/calculator';
import {baht} from '../../lib/design-v2/figures';

for(const locale of ['en','th'] as const){
  const route=locale==='en'?'/en':'/';
  test(`${locale}: final homeowner home composition and accessible phone action`,async({page})=>{
    for(const width of [360,390,768,1440]){
      await page.setViewportSize({width,height:844});
      await page.goto(route);
      await page.evaluate(()=>document.fonts.ready);
      await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
      await expect(page.locator('.hero3 .trust>span')).toHaveCount(2);
      await expect(page.locator('[data-testid=home-example]')).toHaveCount(1);
      await expect(page.locator('.faq details[open]')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      if(width===390){
        for(const selector of ['.hero3 h1','#hero-monthly-bill','.hero3 input[type=range]','.hero3 button[type=submit]']){
          const box=await page.locator(selector).boundingBox();
          expect(box?.y).toBeGreaterThanOrEqual(0);
          expect(box!.y+box!.height).toBeLessThanOrEqual(844);
        }
        const audit=await new AxeBuilder({page}).include('.homeowner-home-v3').withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
        expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
      }
    }
    const result=calculateEstimate(designV2Example);
    await expect(page.locator('.excard .was')).toHaveText(baht(result.currentMonthlyBillThb));
    await expect(page.locator('.excard .now')).toHaveText(baht(result.planningAfterSolarMonthlyBillThb));
    await expect(page.locator('.excard svg[role=img]')).toHaveCount(1);
  });
  test(`${locale}: homeowner bill slider retains larger typed bills and validated starter`,async({page})=>{
    await page.goto(route);
    const input=page.locator('#hero-monthly-bill'),slider=page.locator('.hero3 input[type=range]');
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('4,000');await expect(slider).toHaveValue('4000');
    await input.fill('37500');await expect(input).toHaveValue('37,500');await expect(slider).toHaveValue('25000');
    await slider.focus();await page.keyboard.press('ArrowLeft');await expect(input).toHaveValue('24,900');
    await input.fill('0');await page.locator('.hero3 button[type=submit]').click();
    await expect(page.locator('#hero-bill-error')).toBeVisible();
    expect(await page.evaluate(()=>sessionStorage.getItem('solarmatch:starter'))).toBeNull();
    await input.fill('37500');
    await page.route('**/estimate',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Starter destination</title>'}));
    await page.locator('.hero3 button[type=submit]').click();
    await page.waitForURL(/\/estimate$/);
    const starter=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:starter')??'null'));
    expect(starter.answers.monthlyBillThb).toBe(37500);
  });
}
