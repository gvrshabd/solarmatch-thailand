import {expect,test} from '@playwright/test';
import {ATTRIBUTION_CATALOG} from '../../lib/analytics/attribution';
for(const locale of ['th','en']){
  test(`safe campaign codes survive ${locale} landing to calculator without identity capture`,async({page,request})=>{
    const submissions:string[]=[];page.on('request',request=>{if(request.url().endsWith('/api/leads'))submissions.push(request.postData()??'');});
    const response=await request.get('/api/assessment/config');expect(response.ok()).toBe(true);const body=await response.json();
    await page.route('**/api/assessment/config',route=>route.fulfill({json:{...body,attribution:{enabled:true,catalog:ATTRIBUTION_CATALOG}}}));
    const prefix=locale==='en'?'/en':'';
    await page.goto(`${prefix}/?utm_campaign=pilot-search&utm_source=google&utm_medium=cpc&phone=0931111111&token=private-fixture`);
    await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('solarmatch-campaign-codes-v1'))).toContain('pilot-search');
    await page.goto(`${prefix}/estimate`);
    await expect(page.locator('#estimate-question')).toBeVisible();
    const stored=await page.evaluate(()=>sessionStorage.getItem('solarmatch-campaign-codes-v1'));
    expect(JSON.parse(stored!)).toEqual(ATTRIBUTION_CATALOG[2]);expect(stored).not.toMatch(/0931111111|private-fixture|token|phone|utm_/);
    expect(submissions).toEqual([]);
  });
}
test('actual default-off public configuration never stores campaign parameters',async({page})=>{
  await page.goto('/en/estimate?utm_campaign=pilot-social&utm_source=facebook&utm_medium=paid-social');
  await expect(page.locator('#estimate-question')).toBeVisible();
  const config=await page.request.get('/api/assessment/config');expect(config.ok()).toBe(true);
  expect((await config.json()).attribution).toEqual({enabled:false,catalog:[]});
  expect(await page.evaluate(()=>sessionStorage.getItem('solarmatch-campaign-codes-v1'))).toBeNull();
});
