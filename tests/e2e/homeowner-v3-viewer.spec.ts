import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('actual homeowner v3 comparison viewer is mobile usable and reference isolated',async({page,request})=>{
  test.skip(!process.env.REVIEW_BASE_URL,'Requires the separately assembled staging-only assets and local viewer server.');
  test.setTimeout(120000);
  const base=process.env.REVIEW_BASE_URL!;
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/design-review/');
  await expect(page.getByRole('heading',{name:'Homeowner Design v3',exact:true})).toBeVisible();
  const catalog=await (await request.get(base+'/design-review/catalog.json')).json();
  expect(catalog.pages.some((p:{id:string})=>p.id==='results')).toBe(true);
  expect(catalog.pages.some((p:{id:string})=>p.id==='estimate-location')).toBe(true);
  for(const lang of ['th','en']){
    await page.getByRole('combobox',{name:'Language',exact:true}).selectOption(lang);
    for(const entry of catalog.pages){
      await page.getByRole('combobox',{name:'Page',exact:true}).selectOption(entry.id);
      await page.getByRole('combobox',{name:'Viewport',exact:true}).selectOption('390');
      for(const side of entry.hasPrototype?['prototype','implementation']:['implementation']){
        await expect.poll(()=>page.locator('#'+side+'-img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    }
  }
  await page.getByRole('combobox',{name:'Page',exact:true}).selectOption('home');
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('200');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.getByRole('combobox',{name:'Zoom',exact:true}).selectOption('100');
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  const response=await page.goto(base+'/design-review/prototype/?lang=th#estimate');
  expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'");
  expect(response?.headers()['content-security-policy']).toContain("form-action 'none'");
  await expect(page.locator('#qh')).toBeVisible();
  expect(await page.locator('html').getAttribute('lang')).toBe('th');
  expect((await request.get(base+'/design-review/private.sql')).status()).toBe(404);
});
