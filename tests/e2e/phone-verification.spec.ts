import { expect, test } from '@playwright/test';

test('contact review has only phone and never calls OTP or collection', async ({page}) => {
  const calls:string[]=[];
  await page.route('**/api/phone-verification',route=>{calls.push('otp');return route.abort();});
  await page.route('**/api/leads',route=>{calls.push('lead');return route.abort();});
  await page.addInitScript(()=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,step:10,answers:{province:'bangkok',district:'sathon',monthlyBillThb:6000,activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',daytimePattern:'high',daytimeLoads:['air-conditioning'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'almost-none'}})));
  await page.goto('/en/estimate');
  await page.getByRole('radio',{name:/^Test/}).click();
  await page.locator('.quote-consent-check input').check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  const form=page.locator('.contact-form-step');
  await expect(form.getByRole('textbox',{name:/LINE ID/})).toHaveCount(0);
  await form.getByRole('textbox',{name:/^First name/}).fill('Synthetic');
  await form.getByRole('textbox',{name:/^Last name/}).fill('Reviewer');
  await form.locator('input[type="tel"]').fill('0812345678');
  await form.locator('.contact-adult-confirmation input').check();
  await expect(form).toContainText('No code is sent');
  await form.getByRole('button',{name:'Finish test and view my estimate',exact:true}).click();
  await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5,{timeout:15_000});
  expect(calls).toEqual([]);
});
