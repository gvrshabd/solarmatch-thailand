import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {designV2Example} from '../../config/design-v2-example';
import {calculateEstimate} from '../../lib/calculator';
import {baht} from '../../lib/design-v2/figures';

for(const locale of ['en','th'] as const){
  const route=locale==='en'?'/en':'/';
  test(`${locale}: final homeowner home composition and accessible phone action`,async({page})=>{
    for(const width of [360,390,768,1180,1440]){
      await page.setViewportSize({width,height:844});
      await page.goto(route);
      await page.evaluate(()=>document.fonts.ready);
      await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
      await expect(page.locator('.hero3 .trust>span')).toHaveCount(2);
      await expect(page.locator('[data-testid=home-example]')).toHaveCount(1);
      await expect(page.locator('.faq details[open]')).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      if(width===360||width===390){
        for(const selector of ['.hero3 h1','#hero-monthly-bill','.hero3 input[type=range]','.hero3 button[type=submit]']){
          const box=await page.locator(selector).boundingBox();
          expect(box?.y).toBeGreaterThanOrEqual(0);
          expect(box!.y+box!.height).toBeLessThanOrEqual(844);
        }
      }
    }
    const result=calculateEstimate(designV2Example);
    await page.locator('.excard').scrollIntoViewIfNeeded();
    await expect(page.locator('.excard .was')).toHaveText(baht(result.currentMonthlyBillThb));
    await expect(page.locator('.excard .now')).toHaveText(baht(result.planningAfterSolarMonthlyBillThb));
    await expect(page.locator('.excard svg[role=img]')).toHaveCount(1);
  });
  test(`${locale}: hero fills the first screen on iPad landscape and desktop`,async({page})=>{
    for(const [width,height] of [[1180,820],[1440,900]] as const){
      await page.setViewportSize({width,height});
      await page.goto(route);
      const box=await page.locator('.hero3').boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(height-72);
      expect(box!.y).toBeLessThan(80);
    }
  });
  test(`${locale}: reduced motion shows the final state straight away`,async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setViewportSize({width:1440,height:900});
    await page.goto(route);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    await expect(page.locator('#how .path li.lit')).toHaveCount(3);
    const result=calculateEstimate(designV2Example);
    await expect(page.locator('.excard .now')).toHaveText(baht(result.planningAfterSolarMonthlyBillThb));
    await expect(page.locator('[data-reveal]')).toHaveCount(0);
    await expect(page.locator('.home-chart clipPath rect')).toHaveAttribute('width',/^5\d\d/);
  });
  test(`${locale}: example counts down, chart draws, and both replay on the way back down`,async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:1440,height:900});
    await page.goto(route);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    const result=calculateEstimate(designV2Example),final=baht(result.planningAfterSolarMonthlyBillThb),now=page.locator('.excard .now'),clip=page.locator('.home-chart clipPath rect');
    const width=async()=>Number(await clip.getAttribute('width'));
    for(const pass of [1,2]){
      await expect(page.locator('.excard')).toHaveAttribute('data-reveal','pre');
      await expect(now).toHaveText(baht(result.currentMonthlyBillThb));
      await expect(page.locator('.excard .rstats b').nth(1)).toHaveText('฿0');
      expect(await width()).toBe(0);
      await page.locator('.excard').scrollIntoViewIfNeeded();
      await expect(page.locator('.excard')).toHaveAttribute('data-reveal','play');
      await expect.poll(width,{timeout:4000}).toBeGreaterThan(0);
      await expect(now).toHaveText(final,{timeout:4000});
      await expect.poll(width,{timeout:4000}).toBeGreaterThan(520);
      await expect(page.locator('.excard .rstats b').nth(1)).toHaveText(baht(result.planningInstalledCostThb));
      await page.evaluate(()=>window.scrollTo(0,0));
      expect(pass).toBeGreaterThan(0);
    }
  });
  test(`${locale}: sun path circles sit on the arc and light as the page scrolls`,async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:1440,height:900});
    await page.goto(route);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    await expect(page.locator('#how .path li.lit')).toHaveCount(0);
    await page.locator('#how .path').scrollIntoViewIfNeeded();
    await page.evaluate(()=>window.scrollBy(0,500));
    await expect(page.locator('#how .path li.lit')).toHaveCount(3);
    const path=(await page.locator('#how .path').boundingBox())!;
    const points=[[.12,218],[.5,96],[.88,218]];
    for(const [index,[fx,y]] of points.entries()){
      const circle=(await page.locator('#how .path .n').nth(index).boundingBox())!;
      expect(Math.abs(circle.x+circle.width/2-(path.x+path.width*fx))).toBeLessThanOrEqual(1);
      expect(Math.abs(circle.y+circle.height/2-(path.y+y))).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('#how .path p')).toHaveCount(0);
  });
  test(`${locale}: on phones the sun starts on circle 1 and stops on circle 3`,async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:390,height:844});
    await page.goto(route);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    const centre=async(selector:string)=>{const box=(await page.locator(selector).boundingBox())!;return [box.x+box.width/2,box.y+box.height/2];};
    const scrollPath=(fraction:number)=>page.evaluate(f=>{const top=document.querySelector('#how .path')!.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:top-innerHeight*f,behavior:'instant'});},fraction);
    for(const [fraction,circle,lit] of [[.85,0,0],[.2,2,3]] as const){
      await scrollPath(fraction);
      await expect(page.locator('#how .path li.lit')).toHaveCount(lit);
      await expect.poll(async()=>{const [sx,sy]=await centre('#how .sun'),[cx,cy]=await centre(`#how .path li:nth-child(${circle+1}) .n`);return Math.hypot(sx-cx,sy-cy);}).toBeLessThanOrEqual(2);
    }
  });
  test(`${locale}: trust marks and questions are accessible with all questions closed and one open`,async({page})=>{
    await page.setViewportSize({width:390,height:844});
    await page.goto(route);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    await expect(page.locator('#trust .rows li')).toHaveCount(5);
    await expect(page.locator('#trust .rows .yes')).toHaveCount(3);
    await expect(page.locator('#trust .rows .no')).toHaveCount(2);
    const tags=['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'];
    for(const open of [false,true]){
      if(open){await page.locator('.faq summary').first().click();await expect(page.locator('.faq details[open]')).toHaveCount(1);}
      const audit=await new AxeBuilder({page}).include('.homeowner-home-v3').withTags(tags).analyze();
      expect(audit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
    }
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
