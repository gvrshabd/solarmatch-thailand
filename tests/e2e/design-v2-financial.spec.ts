import {test,expect} from '@playwright/test';
import {designV2Example} from '../../config/design-v2-example';
import {calculateEstimate} from '../../lib/calculator';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';

for(const lang of ['en','th'] as const)for(const bill of [6000,2000,1])test(`${lang}: ${bill} baht financial verdict, payback and crossing stay truthful`,async({page},info)=>{
 const answers={...designV2Example,monthlyBillThb:bill},result=calculateEstimate(answers);
 await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(value)),answers);
 await page.goto(lang==='en'?'/en/estimate/results':'/estimate/results');
 await expect(page.locator('.rbig')).toBeVisible();
 const verdict=page.locator('.rhero .verdict');
 if(result.planningTwentyFiveYearNetBenefitThb<0){
  await expect(verdict).toHaveText(lang==='en'?'At this bill, solar costs more over 25 years than it saves. Compare carefully before deciding.':'ที่ค่าไฟระดับนี้ โซลาร์มีค่าใช้จ่ายรวม 25 ปีมากกว่าที่ประหยัดได้ ควรเปรียบเทียบอย่างรอบคอบก่อนตัดสินใจ');
  await expect(page.getByTestId('lifetime-crossing')).toHaveCount(0);
 }else{await expect(verdict).not.toHaveClass(/negative/);await expect(page.getByTestId('lifetime-crossing').first()).toBeAttached();}
 if(result.planningPaybackYears===null){await expect(page.locator('.rstats>div').last().locator('b')).toHaveText('—');await expect(page.locator('.rstats')).not.toContainText('0 yrs');}
 await page.reload();await expect(verdict).toBeVisible();
 const reference=bill!==6000&&info.project.name==='desktop-chromium'?await page.context().newPage():null;
 if(reference)await reference.addInitScript(({answers,lang})=>{localStorage.setItem('sm-lang',lang);sessionStorage.setItem('sm-answers',JSON.stringify({...answers,activelyPlanningSolar:answers.planningTimeframe}));},{answers,lang});
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  if(reference&&[390,1440].includes(width)){
   const name=`financial-${bill===1?'unavailable':'negative'}-${lang}-${width}.png`;
   await mkdir('docs/design-v2-comparison',{recursive:true});await page.screenshot({path:path.resolve('docs/design-v2-comparison/implementation-'+name),fullPage:true,scale:'css'});
   await reference.setViewportSize({width,height:900});await reference.goto('http://127.0.0.1:4174/#results');await reference.evaluate(()=>document.fonts.ready);
   await reference.screenshot({path:path.resolve('docs/design-v2-comparison/prototype-'+name),fullPage:true,scale:'css'});
  }
 }
 await reference?.close();
});
test('a negative financial verdict preserves independent site warnings',async({page})=>{
 await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(value)),{...designV2Example,monthlyBillThb:2000,shade:'a-lot'});
 await page.goto('/en/estimate/results');await expect(page.locator('.v2-negative-verdict')).toBeVisible();await expect(page.locator('.v2-site-warning')).toBeVisible();
});
