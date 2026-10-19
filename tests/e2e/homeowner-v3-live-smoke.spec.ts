import {test,expect} from '@playwright/test';
import {homeownerDesignV3Questionnaire as questionnaire} from '../../config/assessment';
import {attributionFixture} from '../../scripts/calculator-benefit-attribution-v3';
import {calculateEstimate} from '../../lib/calculator';

// Explicit opt-in, fresh browser contexts, no lead/provider writes or fake records.
test.skip(process.env.HOMEOWNER_V3_LIVE_SMOKE!=='1','Requires the reviewed release and explicit non-submitting live verification.');
for(const locale of ['en','th'] as const){
  test(`published v3 homeowner journey and frozen/negative result ${locale}`,async({page,request,baseURL},testInfo)=>{
    test.setTimeout(180000);
    expect(['https://solarmatch-thailand.deluxejahseh.workers.dev','http://127.0.0.1:3000']).toContain(baseURL);
    const prefix=locale==='en'?'/en':'';
    const screenshotRoot=process.env.HOMEOWNER_GUIDE_SCREENSHOTS??testInfo.outputPath('live');
    const writes:string[]=[],failures:string[]=[];
    await page.route('**/*',route=>{const req=route.request();if(!['GET','HEAD','OPTIONS'].includes(req.method())){writes.push(new URL(req.url()).pathname);return route.abort();}return route.continue();});
    page.on('response',response=>{if(response.status()>=400&&new URL(response.url()).origin===baseURL)failures.push(`${response.status()} ${new URL(response.url()).pathname}`);});
    const config=await(await request.get('/api/assessment/config')).json();
    expect(config.questionnaire.id).toBe(questionnaire.id);
    expect(config.questionnaire.schemaVersion).toBe(11);
    expect(config.assessmentToken).toBeNull();
    expect(config.contactInputSupport).toMatchObject({kwh:true,policyVersion:'residential-consumption-v1'});
    const home=await page.goto(prefix||'/');
    expect(home?.status()).toBe(200);
    await expect(page.locator('#hero-monthly-bill')).toBeEnabled();
    for(const width of [390,1440]){
      await page.setViewportSize({width,height:844});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      await expect(page.locator('.homeowner-home-v3')).toBeVisible();
    }
    const answers={...attributionFixture,estimateModelVersion:'energy-v3' as const,quoteContactRequested:false,quoteConsentAccepted:undefined};
    await page.evaluate(value=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:11,step:0,answers:value})),answers);
    await page.goto(prefix+'/estimate');
    for(const question of questionnaire.questions){
      await expect(page.locator('#estimate-question')).toHaveText(question.title[locale]);
      if(question.id==='quoteContactRequested'){
        await expect(page.getByRole('radio',{name:/Test|ทดสอบ/})).toHaveCount(0);
        await expect(page.locator('.quote-consent-check')).toHaveCount(0);
      }
      await page.locator('.estimate-actions .button').last().click();
    }
    await expect(page).toHaveURL(/estimate\/results/);
    await expect(page.locator('.rhero')).toBeVisible();
    const before=await page.locator('.rhero').innerText();
    await page.reload();
    await expect.poll(()=>page.locator('.rhero').innerText()).toBe(before);
    await page.screenshot({path:`${screenshotRoot}/live-production-results-${locale}-1440.png`});
    const negative={...answers,quoteSystemKw:5.005,quoteModuleCount:7,quoteModuleWp:715,quoteInverterAcKw:5,quoteBatteryIncluded:false,quoteCashPriceThb:900000};
    expect(calculateEstimate(negative).planningTwentyFiveYearNetBenefitThb).toBeLessThan(0);
    await page.evaluate(value=>{sessionStorage.removeItem('solarmatch:result-view-state');sessionStorage.setItem('solarmatch:estimate',JSON.stringify(value));},negative);
    await page.reload();
    await expect(page.locator('.v2-negative-verdict')).toBeVisible();
    await page.setViewportSize({width:390,height:844});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    await page.screenshot({path:`${screenshotRoot}/live-production-negative-${locale}-390.png`});
    for(const path of ['/methodology','/resources','/contact','/privacy','/terms','/cookies']){
      const response=await page.goto(prefix+path);expect(response?.status()).toBe(200);await expect(page.locator('main')).toBeVisible();
    }
    expect(failures).toEqual([]);
    const portalResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/installer/portal');
    await page.goto('/installers?lang='+locale);
    const heldPortal=await portalResponse;
    expect(heldPortal.status()).toBe(503);
    // Browser response-body retrieval timed out in the live harness. Keep the
    // real browser status check, and verify the endpoint body independently.
    const heldBody=await request.get('/api/installer/portal');
    expect(heldBody.status()).toBe(503);
    expect(await heldBody.json()).toEqual({error:'portal_unavailable'});
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('button',{name:locale==='en'?'Applications unavailable':'ยังไม่เปิดรับสมัคร',exact:true}).first()).toBeDisabled();
    expect(writes).toEqual([]);expect(failures).toEqual(['503 /api/installer/portal']);
  });
}

test('production authentication and review isolation',async({request,baseURL})=>{
  for(const path of ['/design-review/','/design-review/catalog.json','/design-review/prototype/','/admin/local-access']){
    let response=await request.get(path,{maxRedirects:0});
    if(response.status()===308){
      const target=new URL(response.headers().location,baseURL);
      expect(target.origin).toBe(baseURL);
      expect(target.pathname).toBe(path.replace(/\/$/,''));
      response=await request.get(target.href,{maxRedirects:0});
    }
    expect([302,303,401,403,404]).toContain(response.status());
  }
  const admin=await request.get('/admin',{maxRedirects:0});
  expect([302,303,401,403]).toContain(admin.status());
  const portal=await request.get('/api/installer/portal',{maxRedirects:0});
  expect([401,403,503]).toContain(portal.status());
  expect(Object.keys(await portal.json())).toEqual(['error']);
});
