import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('protected review package works on a narrow phone with both languages and safe links',async({page})=>{
 const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
 await page.setViewportSize({width:360,height:800});await page.goto('http://127.0.0.1:4174/design-review/');
 await expect(page.getByRole('heading',{name:'SolarMatch Design v2',exact:true})).toBeVisible();
 for(const lang of ['en','th']){
  await page.getByLabel('Language',{exact:true}).selectOption(lang);
  for(const screen of ['home','results','credits','question-11']){
   await page.getByLabel('Page',{exact:true}).selectOption(screen);
   for(const side of ['prototype','implementation'])await expect.poll(()=>page.locator('#'+side+'-img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   await expect(page.locator('#interactive')).toHaveAttribute('href',lang==='en'?/\/en|lang=en/:/lang=th|\/estimate|\/$/);
  }
 }
 await page.getByRole('button',{name:'Implementation',exact:true}).click();await expect(page.locator('figure[data-side=prototype]')).toBeHidden();
 await page.getByLabel('Zoom',{exact:true}).selectOption('200');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Compare',exact:true}).click();await page.getByLabel('Zoom',{exact:true}).selectOption('100');
 await page.getByLabel('Reference size',{exact:true}).selectOption('1440');await expect(page.locator('#implementation-full')).toHaveAttribute('href',/1440\.png$/);
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);expect(failures).toEqual([]);
 for(const width of [320,375,414,430,768]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});
test('reference mock is isolated from application APIs',async({page})=>{
 const requests:string[]=[];page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push(request.url());});
 const response=await page.goto('http://127.0.0.1:4174/design-review/prototype/?lang=th#installers');
 expect(response?.headers()['content-security-policy']).toContain("connect-src 'none'");
 await expect(page.locator('main h1').first()).toBeVisible();expect(requests).toEqual([]);
 expect(await page.locator('html').getAttribute('lang')).toBe('th');
 await page.goto('http://127.0.0.1:4174/design-review/prototype/?lang=en#enquiry-e39');
 await expect(page.locator('a[href^="tel:"]')).toBeVisible();await page.locator('a[href^="tel:"]').click();expect(page.url()).toContain('#enquiry-e39');expect(requests).toEqual([]);
});
