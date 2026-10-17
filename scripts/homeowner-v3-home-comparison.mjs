import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const output=path.resolve('docs/design-v3-comparison');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
for(const locale of ['en','th'])for(const width of [360,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.addInitScript(locale=>localStorage.setItem('sm-lang',locale),locale);
  for(const surface of ['reference','actual']){
    await page.goto(surface==='reference'?'http://127.0.0.1:4175/#home':`http://localhost:3000/${locale==='en'?'en':''}`);
    await page.locator('.hero3 .billcard').waitFor();
    if(surface==='actual')await page.waitForFunction(()=>!document.querySelector('#hero-monthly-bill')?.disabled);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    // Exclude only prototype tooling; the untouched source remains unchanged.
    if(surface==='reference')await page.locator('.proto').evaluate(e=>e.style.display='none');
    const metrics=await page.locator('main').evaluate(main=>{
      const data={};
      for(const selector of ['.hero3','.hero-copy','.hero3 h1','.billcard','.hero3 .lede','.trust','.excard','.steps3','.trustgrid','.faqband']){
        const e=main.querySelector(selector);if(!e)continue;
        const r=e.getBoundingClientRect(),s=getComputedStyle(e);data[selector]={x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,color:s.color,background:s.background,padding:s.padding,gap:s.gap};
      }
      return data;
    });
    const label=surface==='reference'?'prototype':'implementation';
    await page.screenshot({path:path.join(output,`${label}-home-${locale}-${width}.png`),fullPage:true});
    await page.screenshot({path:path.join(output,`viewport-${label}-home-${locale}-${width}.png`)});
    records.push({surface,locale,width,metrics});
  }
  await context.close();
}
await writeFile(path.join(output,'home-metrics.json'),JSON.stringify(records,null,2));
await browser.close();
console.log(`Home reference/actual captures and computed metrics: ${output}`);
