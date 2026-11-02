import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {homeownerDesignV3Questionnaire as questionnaire} from '../../config/assessment';
import {contactContent} from '../../config/contact-content';
import type {PublicAssessmentConfig} from '../../lib/questionnaire/types';

function enabledConfig():PublicAssessmentConfig {
 return {calculatorModelVersion:'energy-v3',calculationReferenceDate:'2026-11-03',
 contactInputSupport:{policyVersion:'residential-consumption-v1',bill:true,kwh:true},
 releaseId:'synthetic-readiness',questionnaireVersionId:questionnaire.id,ruleVersionId:'residential-rules-v4',questionnaire,
 assessmentToken:'a'.repeat(96),assessmentTokenExpiresAt:'2099-01-01T00:00:00Z',liveLeadSubmissions:true,
 privatePreview:true,accessRestrictedSession:false,restrictedSiteCollectionEnabled:false,publicCollectionEnabled:true,
 receivingCompany:null,loadingFactSetVersionId:'synthetic-none',loadingFacts:[],
 contact:{...contactContent.contactModes.shared_solar_company_handoff,...contactContent.contactModes.common,
 enabled:true,mode:'shared_solar_company_handoff',preview:false,restrictedSiteCollectionEnabled:false,
 publicCollectionEnabled:true,operationalDistributionEnabled:false,permittedContactMethods:['phone'],
 sharedFields:['legalFirstName','legalLastName','phone','assessmentAnswers'],
 contactConfigurationVersionId:'synthetic-contact',contentVersionId:'synthetic-content',privacyVersion:'synthetic-privacy',
 consentVersionId:'synthetic-consent',adultConfirmationVersionId:'synthetic-adult',
 privacyNoticeVersionId:'synthetic-privacy',termsVersionId:'synthetic-terms',cookiePolicyVersionId:'synthetic-cookie',
 retentionDays:180,distributionWindowDays:7,recipientCategory:'solar_service_recipients',recipient:null}} as PublicAssessmentConfig;
}
const answers={province:'bangkok',district:'sathon',monthlyBillThb:6000,consumptionInput:'bill',billingPeriodDays:30,
 tariffCategory:'ordinary-1.2',activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',
 propertyType:'detached-home',ownershipStatus:'owner',roofArea:'100-200',daytimePattern:'high',
 daytimeLoads:['air-conditioning'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'almost-none'};
async function quoteStep(page:Page,locale:'en'|'th') {
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,step:0,answers:value})),answers);
 await page.goto((locale==='en'?'/en':'')+'/estimate');
 for(const question of questionnaire.questions.slice(2)){
  await expect(page.locator('#estimate-question')).toHaveText(question.title[locale]);
  if(question.id==='quoteContactRequested')break;
  await page.locator('.estimate-actions .button').last().click();
 }
}
async function contactForm(page:Page,locale:'en'|'th') {
 const en=locale==='en';
 await page.getByRole('radio',{name:questionnaire.questions.at(-1)!.options!.find(o=>o.value==='yes')!.label[locale],exact:true}).click();
 await expect(page.locator('.quote-consent-check input')).not.toBeChecked();
 await page.locator('.quote-consent-check input').check();
 await page.locator('.estimate-actions .button').last().click();
 await expect(page.locator('.contact-form-step')).toBeVisible();
 if(process.env.READINESS_SCREENSHOTS)await page.locator('.contact-form-step').screenshot({path:`${process.env.READINESS_SCREENSHOTS}/form-${locale}-${(page.viewportSize()?.width??0)>600?'desktop':'mobile'}-chromium.png`});
 await page.locator('input[autocomplete="given-name"]').fill('Synthetic');
 await page.locator('input[autocomplete="family-name"]').fill('Review');
 await page.locator('input[autocomplete="tel"]').fill('0812345678');
 await page.locator('.contact-adult-confirmation input').check();
 await page.getByRole('button',{name:en?'Send SMS code':'ส่งรหัส SMS',exact:true}).click();
 await page.getByRole('textbox',{name:en?'SMS verification code':'รหัสยืนยันจาก SMS'}).fill('123456');
 await page.getByRole('button',{name:en?'Verify number':'ยืนยันหมายเลข',exact:true}).click();
}

for(const locale of ['en','th'] as const){
 for(const compatible of [true,false])test(`restored modern answers require compatible configuration and fresh consent ${locale} ${compatible}`,async({page})=>{
  await page.route('**/api/assessment/config',route=>{
   const config=enabledConfig();
   if(!compatible)config.questionnaire={...questionnaire,questions:questionnaire.questions.map((q,i)=>i===0?{...q,title:{en:'Changed question',th:'คำถามที่เปลี่ยน'}}:q)};
   return route.fulfill({json:config});
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:11,step:11,answers:{...value,estimateModelVersion:'energy-v3',quoteContactRequested:true,quoteConsentAccepted:true}})),answers);
  const response=page.waitForResponse('**/api/assessment/config');
  await page.goto((locale==='en'?'/en':'')+'/estimate');await response;
  await expect(page.locator('#estimate-question')).toHaveText(questionnaire.questions.at(-1)!.title[locale]);
  const yes=page.getByRole('radio',{name:questionnaire.questions.at(-1)!.options!.find(o=>o.value==='yes')!.label[locale],exact:true});
  if(compatible){
   await expect(yes).toHaveAttribute('aria-checked','false');await yes.click();
   await expect(page.locator('.quote-consent-check input')).not.toBeChecked();
  }else await expect(yes).toHaveCount(0);
 });
 for(const available of [true,false])test(`public capability wording ${locale} ${available}`,async({page},info)=>{
  await page.route('**/api/service-status',route=>route.fulfill({json:{contactAvailable:available}}));
  await page.goto(locale==='en'?'/en':'/');
  const badge=page.locator('#how .chip-gold');
  if(available)await expect(badge).toHaveCount(0);else await expect(badge).toHaveText(locale==='en'?'Currently unavailable':'ยังไม่เปิดให้บริการ');
  await page.locator('.footer-service-details summary').click();
  await expect(page.locator('.footer-service-details')).toContainText(available?(locale==='en'?'Installer contact is optional':'เลือกขอให้ผู้ติดตั้งติดต่อกลับได้'):(locale==='en'?'currently unavailable':'ยังไม่เปิดรับ'));
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  await page.setViewportSize({width:390,height:844});
  expect((await new AxeBuilder({page}).include('#how').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:info.project.name==='desktop-chromium'?1440:390,height:900});
  if(process.env.READINESS_SCREENSHOTS)await page.locator('#how').screenshot({path:`${process.env.READINESS_SCREENSHOTS}/availability-${locale}-${available}-${info.project.name}.png`});
 });
 for(const change of ['terms','disabled','questionnaire','refresh-failure'] as const)test(`contact refresh ${change} preserves results ${locale}`,async({page},info)=>{
  const en=locale==='en';let reads=0,posts=0;
  await page.route('**/api/assessment/config',route=>{
   reads++;const config=enabledConfig();
   if(reads>1){
    if(change==='refresh-failure')return route.abort('failed');
    config.releaseId='synthetic-updated';config.assessmentToken='b'.repeat(96);config.contact.consentVersionId='synthetic-updated-consent';
    if(change==='disabled'){config.contact.enabled=false;config.liveLeadSubmissions=false;config.assessmentToken=null;}
    if(change==='questionnaire')config.questionnaireVersionId='synthetic-new-questionnaire';
   }
   return route.fulfill({json:config});
  });
  await page.route('**/api/phone-verification',route=>route.fulfill({json:route.request().postDataJSON().code?{ok:true,proof:'p'.repeat(43)}:{ok:true,challengeId:'00000000-0000-4000-8000-000000000001'}}));
  await page.route('**/api/leads',route=>{posts++;return route.fulfill({status:409,json:{code:'assessment_version_expired'}});});
  await quoteStep(page,locale);await contactForm(page,locale);
  await page.getByRole('button',{name:en?'Submit my request':'ส่งคำขอติดต่อ',exact:true}).dblclick();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(posts).toBe(1);
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:result-view-state')!).resultSnapshot.assumptionVersion)).toBeTruthy();
  if(change==='refresh-failure'){
   await expect(page.getByRole('alert')).toContainText(en?'The contact terms changed':'เงื่อนไขการติดต่อเปลี่ยนไป');
   await expect(page.getByRole('button',{name:en?'Return to review consent':'ย้อนกลับไปตรวจสอบความยินยอม',exact:true})).toBeDisabled();
   await page.getByRole('button',{name:en?'Continue to my estimate without submitting':'ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ',exact:true}).click();
  }else{
   await expect(page.locator('#estimate-question')).toHaveText(questionnaire.questions.at(-1)!.title[locale]);
   if(change==='terms'){
    await page.getByRole('radio',{name:questionnaire.questions.at(-1)!.options!.find(o=>o.value==='yes')!.label[locale],exact:true}).click();
    await expect(page.locator('.quote-consent-check input')).not.toBeChecked();
   }else await expect(page.locator('.quote-consent-check')).toHaveCount(0);
   if(process.env.READINESS_SCREENSHOTS)await page.screenshot({path:`${process.env.READINESS_SCREENSHOTS}/refresh-${locale}-${change}-${info.project.name}.png`,fullPage:true});
   await page.getByRole('radio',{name:questionnaire.questions.at(-1)!.options!.find(o=>o.value==='no')!.label[locale],exact:true}).click();
   await page.locator('.estimate-actions .button').last().click();
  }
  await expect(page).toHaveURL(/estimate\/results/);
  await expect(page.locator('.rstats')).toBeVisible();
  await page.reload();await expect(page.locator('.rstats')).toBeVisible();
  expect(posts).toBe(1);
  expect(await page.evaluate(()=>JSON.stringify({...sessionStorage}))).not.toContain('0812345678');
 });
}
