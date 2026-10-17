import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const origin=process.env.PLAYWRIGHT_BASE_URL??'http://127.0.0.1:3000';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))throw Error('Loopback only');
const output=path.resolve(process.env.ASSESSMENT_CAPTURE_DIR??'docs/design-v3-comparison');
await mkdir(output,{recursive:true});
const exports={};
vm.runInNewContext(ts.transpile(await readFile('config/assessment.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),{exports,structuredClone});
const questions=exports.homeownerDesignV3Questionnaire.questions;
const legacyFlow=['monthlyBillThb','province','activelyPlanningSolar','projectType','propertyType','ownershipStatus','daytimePattern','daytimeLoads','shade','roofMaterial','quoteContactRequested'];
const cases=[['bill','monthlyBillThb'],['location','province'],['planning','activelyPlanningSolar'],['project','projectType'],['choice','propertyType'],['ownership','ownershipStatus'],['daytime','daytimePattern'],['multiple','daytimeLoads'],['shade','shade'],['roof-material','roofMaterial'],['contact','quoteContactRequested'],['roof-extension','roofArea']];
const requested=process.env.ASSESSMENT_CASES?.split(',');
const widths=process.env.ASSESSMENT_WIDTHS?.split(',').map(Number)??[360,390,768,1440];
const answers={estimateModelVersion:'energy-v3',calculationReferenceDate:'2026-10-17',billDate:'2026-10-17',consumptionInput:'bill',monthlyBillThb:6000,province:'bangkok',district:'sathon',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',activelyPlanningSolar:true,planningTimeframe:'within-3-months',roofArea:'60-100',exactRoofAreaSqm:60,daytimePattern:'high',daytimeLoads:['none'],roofMaterial:'concrete-tile',shade:'almost-none',quoteContactRequested:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
  for(const locale of ['en','th'])for(const width of widths)for(const [name,id] of cases){
    if(requested&&!requested.includes(name))continue;
    const extension=name.endsWith('-extension');
    for(const surface of extension?['implementation']:['prototype','implementation']){
      const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();
      await page.addInitScript(({locale,answers,prototypeStep,actualStep})=>{
        localStorage.setItem('sm-lang',locale);
        sessionStorage.setItem('sm-answers',JSON.stringify({...answers,activelyPlanningSolar:answers.planningTimeframe,quoteContactRequested:'no'}));
        sessionStorage.setItem('sm-step',JSON.stringify(prototypeStep));
        sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:11,step:actualStep,answers}));
      },{locale,answers,prototypeStep:legacyFlow.indexOf(id),actualStep:questions.findIndex(q=>q.id===id)});
      if(surface==='implementation')await page.route('**/api/**',r=>r.fulfill({status:503,json:{error:'synthetic_offline'}}));
      await page.goto(surface==='prototype'?'http://127.0.0.1:4175/#estimate':origin+(locale==='en'?'/en/estimate':'/estimate'));
      const heading=page.locator(surface==='prototype'?'#qh':'#estimate-question');
      await heading.waitFor();
      if(surface==='implementation'){
        await page.waitForFunction(()=>!document.querySelector('.hydration-fieldset')?.disabled);
        await expect(heading).toHaveText(questions.find(q=>q.id===id).title[locale]);
        await expect(page.locator('.question-stage')).toHaveCSS('opacity','1');
        await expect(page.locator('.estimate-actions button').last()).toBeEnabled();
      }
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
      if(surface==='prototype')await page.locator('.proto').evaluate(e=>e.style.display='none');
      const metrics=await page.evaluate(()=>{
        const values={};
        for(const selector of ['.flow-hdr','.assessment-flow-header','.bar','.segment-progress','.q','.focus-card','.aside','.assessment-summary','h1','.money-input.big','.bill-direct-input','.pair','.location-pair','.opts','.choice-grid']){
          const e=document.querySelector(selector);if(!e)continue;
          const b=e.getBoundingClientRect(),s=getComputedStyle(e);values[selector]={x:b.x,y:b.y,width:b.width,height:b.height,display:s.display,fontSize:s.fontSize,padding:s.padding,gap:s.gap};
        }
        return {values,viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth};
      });
      await page.screenshot({path:path.join(output,`${surface}-estimate-${name}-${locale}-${width}.png`),fullPage:true,animations:'disabled'});
      await page.screenshot({path:path.join(output,`viewport-${surface}-estimate-${name}-${locale}-${width}.png`),animations:'disabled'});
      records.push({surface,locale,width,name,questionId:id,extension,metrics});
      await context.close();
    }
  }
}finally{await browser.close();}
await writeFile(path.join(output,'assessment-metrics.json'),JSON.stringify({note:'Common controls compare identical question IDs and synthetic answers. Project/roof are modern-energy extensions; current counts, energy details and consent remain authoritative.',records},null,2));
console.log(`Assessment comparison: ${records.length} state captures at ${output}`);
