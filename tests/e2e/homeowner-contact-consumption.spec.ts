import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {homeownerDesignV3Questionnaire as questionnaire} from '../../config/assessment';
import {contactContent} from '../../config/contact-content';
import {contactLaunchReviewCopy} from '../../config/legal-review';
import type {PublicAssessmentConfig} from '../../lib/questionnaire/types';

for(const locale of ['en','th'] as const)for(const mode of ['bill','kwh'] as const){
 test(`controlled ${mode} optional contact, retry and received receipt ${locale}`,async({page},info)=>{
  const en=locale==='en';
  const configuration={calculatorModelVersion:'energy-v3',calculationReferenceDate:'2026-10-19',contactInputSupport:{policyVersion:'residential-consumption-v1',bill:true,kwh:true},requestPolicy:{recipientLimit:3,startHour:9,endHour:17,timezone:'Asia/Bangkok'},releaseId:'synthetic-q8',questionnaireVersionId:questionnaire.id,ruleVersionId:'residential-rules-v4',questionnaire,assessmentToken:'a'.repeat(96),assessmentTokenExpiresAt:'2099-01-01T00:00:00Z',liveLeadSubmissions:true,privatePreview:true,accessRestrictedSession:true,restrictedSiteCollectionEnabled:true,publicCollectionEnabled:false,receivingCompany:null,loadingFactSetVersionId:'synthetic-none',loadingFacts:[],contact:{...contactContent.contactModes.shared_solar_company_handoff,...contactContent.contactModes.common,enabled:true,mode:'shared_solar_company_handoff',preview:false,restrictedSiteCollectionEnabled:true,publicCollectionEnabled:false,operationalDistributionEnabled:false,permittedContactMethods:['phone'],sharedFields:['legalFirstName','legalLastName','phone','assessmentAnswers'],contactConfigurationVersionId:'synthetic-contact',contentVersionId:'synthetic-content',privacyVersion:'synthetic-privacy',consentVersionId:'synthetic-consent',adultConfirmationVersionId:'synthetic-adult',privacyNoticeVersionId:'synthetic-privacy',termsVersionId:'synthetic-terms',cookiePolicyVersionId:'synthetic-cookie',retentionDays:180,distributionWindowDays:7,recipientCategory:'solar_service_recipients',recipient:null}} as PublicAssessmentConfig;
  const answers={province:'bangkok',district:'sathon',monthlyBillThb:mode==='bill'?6000:0,consumptionInput:mode,monthlyConsumptionKwh:mode==='kwh'?1200:undefined,billingPeriodDays:30,tariffCategory:'ordinary-1.2',activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',roofArea:'100-200',daytimePattern:'high',daytimeLoads:['air-conditioning'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'almost-none'};
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/assessment/config',route=>route.fulfill({json:configuration}));
  await page.route('**/api/phone-verification',route=>route.fulfill({json:route.request().postDataJSON().code?{ok:true,proof:'p'.repeat(43)}:{ok:true,challengeId:'00000000-0000-4000-8000-000000000001'}}));
  const submitted:Record<string,unknown>[]=[];
  await page.route('**/api/leads',async route=>{submitted.push(route.request().postDataJSON());await route.fulfill(submitted.length===1?{status:503,json:{code:'submission_failed'}}:{status:201,json:{ok:true,testSubmission:true}});});
  // Restore ordinary pre-v3 answers, then accept the explicit modern contract.
  // This does not restore consent or obtain authorization from browser storage.
  await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,step:0,answers:value})),answers);
  const response=page.waitForResponse('**/api/assessment/config');await page.goto((en?'/en':'')+'/estimate');await response;
  for(const question of questionnaire.questions.slice(2)){
   await expect(page.locator('#estimate-question')).toHaveText(question.title[locale]);
   if(question.id==='quoteContactRequested')break;
   await page.locator('.estimate-actions .button').last().click();
  }
  const yes=page.getByRole('radio',{name:questionnaire.questions.find(q=>q.id==='quoteContactRequested')!.options!.find(o=>o.value==='yes')!.label[locale],exact:true});await expect(yes).toHaveAttribute('aria-checked','false');await yes.click();
  await expect(page.locator('.quote-consent-check')).toHaveText(contactLaunchReviewCopy.consent[locale]);
  const consent=page.locator('.quote-consent-check input');await expect(consent).not.toBeChecked();
  await page.locator('.estimate-actions .button').last().click();await expect(page.getByRole('alert')).toBeVisible();
  await consent.check();await page.locator('.estimate-actions .button').last().click();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:result-view-state')!)?.resultSnapshot?.assumptionVersion)).toBeTruthy();
  await page.locator('input[autocomplete="given-name"]').fill('Synthetic');await page.locator('input[autocomplete="family-name"]').fill('Review');await page.locator('input[autocomplete="tel"]').fill('0812345678');
  const adult=page.locator('.contact-adult-confirmation input');await expect(adult).not.toBeChecked();await adult.check();
  await page.getByRole('button',{name:en?'Send SMS code':'ส่งรหัส SMS',exact:true}).click();
  await page.getByRole('textbox',{name:en?'SMS verification code':'รหัสยืนยันจาก SMS'}).fill('123456');
  await page.getByRole('button',{name:en?'Verify number':'ยืนยันหมายเลข',exact:true}).click();
  await page.getByRole('button',{name:en?'Submit my request':'ส่งคำขอติดต่อ',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText(en?'could not confirm':'ยังยืนยัน');
  await expect(page.locator('.request-confirmation')).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:result-view-state')!)?.contactOutcome)).not.toBe('submitted');
  await expect(page.locator('input[autocomplete="given-name"]')).toHaveValue('Synthetic');
  await page.getByRole('button',{name:en?'Try again':'ลองอีกครั้ง',exact:true}).click();
  await expect(page).toHaveURL(/estimate\/results/);await expect(page.locator('.rstats')).toBeVisible();
  await expect(page.locator('.request-confirmation h2')).toHaveText(en?'Request received':'ได้รับคำขอแล้ว');
  await expect(page.locator('.request-confirmation')).toContainText('09:00–17:00');
  expect(submitted).toHaveLength(2);expect(submitted[0].idempotencyKey).toBe(submitted[1].idempotencyKey);
  expect(submitted[1].answers).toMatchObject({consumptionInput:mode,monthlyBillThb:mode==='bill'?6000:0,billingPeriodDays:30});
  if(mode==='kwh')expect(submitted[1].answers).toMatchObject({monthlyConsumptionKwh:1200});
  await page.reload();await expect(page.locator('.request-confirmation h2')).toHaveText(en?'Request received':'ได้รับคำขอแล้ว');
  expect((await new AxeBuilder({page}).include('.request-confirmation').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>JSON.stringify({...sessionStorage}))).not.toContain('0812345678');
  if(process.env.HOMEOWNER_GUIDE_SCREENSHOTS){await page.locator('.request-confirmation').screenshot({path:`${process.env.HOMEOWNER_GUIDE_SCREENSHOTS}/request-${locale}-${mode}-${info.project.name}.png`});}
 });
}
