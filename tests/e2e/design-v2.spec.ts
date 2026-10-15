import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import type {InstallerPortalData} from '../../lib/installer/portal-contract';
import {designV2Example as designV2ExampleAnswers} from '../../config/design-v2-example';
import {initialQuestionnaire} from '../../config/assessment';

const fixed='2026-10-15T03:00:00.000Z';
const id='00000000-0000-4000-8000-000000000039';
function fixture():InstallerPortalData {
 const names=['Arun','Natee','Ploy','Wichai'],mins=[12,64,1560,5760],districts=['prawet','sathon','bang-na','mueang-samut-prakan'];
 return {
 session:{user:{id:'design-owner',name:'Somchai',email:'design@example.test',emailVerified:true}},
 company:{id:'design-company',name:'Suriya Solar',approvalStatus:'approved',contactName:'Somchai',phone:'021234567',serviceAreas:['bangkok','samut-prakan'],supportedProducts:['shared_residential'],dailyLimit:3,paused:false,lineLinked:false,termsAcceptedVersion:'fixture'},
 products:[],packages:[{id:'credits-20',nameEn:'20 credits',nameTh:'20 เครดิต',credits:20,amountMinor:400000,currency:'THB',taxLabel:'[TAX TREATMENT TO BE CONFIRMED]'}],
 balance:{available:18,reserved:2,trialRemaining:1,debt:0},
 deliveries:names.map((name,i)=>({id:i===0?id:`00000000-0000-4000-8000-0000000000${[39,41,33,28][i]}`,enquiryId:'synthetic-'+i,reference:'SM-2610-'+[39,41,33,28][i].toString().padStart(3,'0'),product:'shared_residential',fundingSource:i%2?'trial':'purchased',creditCost:i%2?0:2,deliveredAt:new Date(Date.parse(fixed)-mins[i]*60000).toISOString(),notificationStatus:'pending',claimDeadline:new Date(Date.parse(fixed)-mins[i]*60000+7*86400000).toISOString(),withdrawn:false,homeownerName:name,phone:['+66812345678','+66898765432','+66865550199','+66823004411'][i],province:i===3?'samut-prakan':'bangkok',district:districts[i],location:'',requestedAt:fixed,assessment:{propertyType:i===1?'townhouse':i===2?'large-home':'detached-home',ownershipStatus:'owner',monthlyBillThb:[7200,6000,9500,5200][i],daytimePattern:i===0?'high':i===2?'very-high':'moderate',daytimeLoads:i===0?['air-conditioning','pump']:i===2?['air-conditioning','pump','ev']:i===1?['air-conditioning','home-office-equipment']:['air-conditioning'],airConditionerCount:[6,5,8,4][i],roofMaterial:i===1?'clay-tile':i===2?'metal-sheet':'concrete-tile',shade:i===1?'little':i===3?'some':'almost-none',planningTimeframe:i===1?'three-six-months':i===3?'six-twelve-months':'within-3-months',projectType:i===1?'solar-with-battery':'new-rooftop'},qualification:'',outcome:i<2?'not-recorded':i===2?'contacted':'quoted',teamNotes:'',notesRevision:0})),
 orders:[{id:'order-fixture',status:'paid',amountMinor:400000,currency:'THB',credits:20,createdAt:'2026-10-08T03:00:00.000Z',receiptReference:'R-0001'}],
 ledger:[{id:'purchase-fixture',kind:'purchase',sourceId:'order-fixture',units:20,availableDelta:20,reservedDelta:0,trialDelta:0,debtDelta:0,reason:'Confirmed provider payment',createdAt:'2026-10-08T03:00:00.000Z'},{id:'delivery-fixture',kind:'delivery',units:-2,availableDelta:-2,reservedDelta:0,trialDelta:0,debtDelta:0,reason:'Portal enquiry available',createdAt:'2026-10-14T03:00:00.000Z'}],claims:[],
 terms:{version:'fixture',textEn:'Synthetic terms for local comparison only.',textTh:'ข้อตกลงสมมติสำหรับเปรียบเทียบในเครื่องเท่านั้น',acceptedAt:fixed},
 integrations:{paymentsEnabled:false,paymentMethods:['promptpay','credit_card'],lineConfigured:false,mode:'local-test'},
 availability:{platformPaused:false,allocationPaused:false,notificationsEnabled:false,canManage:true},
 commercial:{creditValueMinor:20000,sharedCredits:2,trialDeliveries:2,claimDays:7,recipientLimit:3},
 };
}
async function audit(page:Page) {
 await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
 expect(results.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);
}
for(const lang of ['en','th'] as const) {
 test(`${lang}: immediately prepared results cannot remain behind an outgoing loader`,async({page})=>{
  await page.clock.setFixedTime(new Date(fixed));
  await page.addInitScript(answers=>{sessionStorage.setItem('solarmatch:estimate',JSON.stringify(answers));sessionStorage.removeItem('solarmatch:result-view-state');},designV2ExampleAnswers);
  for(let attempt=0;attempt<8;attempt++){
   await page.goto(lang==='en'?'/en/estimate/results':'/estimate/results');
   await expect(page.locator('.rbig')).toHaveText('฿1,665');
   await expect(page.locator('.calculation-loading-page')).toHaveCount(0);
   await expect(page.locator('.journey-transition-surface')).toHaveCSS('opacity','1');
  }
 });
 test(`${lang}: eligibility and error states stay truthful at narrow and desktop widths`,async({page},info)=>{
  const folder=path.resolve('docs/design-v2-comparison');const en=lang==='en';
  let data=fixture(),status=200;
  await page.route('**/api/installer/portal**',route=>route.fulfill({status,json:status===200?data:{error:'portal_unavailable'}}));
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:900});
   for(const state of ['pending','rejected','paused','unverified','terms-required','platform-paused','zero-credit','empty','error']){
    data=fixture();data.deliveries=[];status=200;
    if(state==='pending'||state==='rejected')data.company!.approvalStatus=state;
    if(state==='paused')data.company!.paused=true;
    if(state==='unverified')data.session.user.emailVerified=false;
    if(state==='terms-required')data.terms.acceptedAt=null;
    if(state==='platform-paused')data.availability!.platformPaused=true;
    if(state==='zero-credit')data.balance={available:0,reserved:0,trialRemaining:0,debt:0};
    if(state==='error')status=503;
    await page.goto('/installers?lang='+lang);
    if(state==='error'){await expect(page.getByRole('button',{name:en?'Retry':'ลองอีกครั้ง',exact:true})).toBeVisible();await expect(page.locator('.installer-workspace')).toHaveCount(0);}
    else{await expect(page.locator('.installer-workspace')).toBeVisible();await expect(page.locator('.callnext')).toHaveCount(0);await expect(page.getByText(en?'No new enquiries':'ไม่มีคำขอใหม่',{exact:true})).toBeVisible();}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if(info.project.name==='desktop-chromium')await page.screenshot({path:path.join(folder,`implementation-state-${state}-${lang}-${width}.png`),scale:'css'});
   }
  }
  // An expired installer session on a genuine enquiry URL still offers sign-in.
  status=401;await page.goto('/installers/enquiry/'+id+'?lang='+lang);
  await expect(page.getByRole('heading',{name:en?'Sign in':'เข้าสู่ระบบ',exact:true})).toBeVisible();
  await expect(page.getByLabel(en?'Email':'อีเมล',{exact:true})).toBeVisible();
 });
 test(`${lang}: an approved empty inbox does not falsely request company approval`,async({page})=>{
  const data=fixture();data.deliveries=[];await page.route('**/api/installer/portal**',route=>route.fulfill({json:data}));
  await page.goto('/installers?view=inbox&lang='+lang);await page.getByRole('button',{name:lang==='en'?/^All /:/^ทั้งหมด /}).click();
  await expect(page.getByText(lang==='en'?'New enquiries appear here when available. Review your service areas and receiving status in Company.':'คำขอใหม่จะแสดงที่นี่เมื่อพร้อมรับ ตรวจสอบพื้นที่บริการและสถานะการรับคำขอได้ที่หน้าบริษัท',{exact:true})).toBeVisible();
 });
 test(`${lang}: conditional household answers remain editable without accidental advance`,async({context},info)=>{
  const folder=path.resolve('docs/design-v2-comparison');
  const cases=[
   {name:'other-location',step:0,answers:{province:'other',customProvince:'Chonburi',district:'Bang Lamung'},selector:'#estimate-custom-province'},
   {name:'other-property',step:4,answers:{propertyType:'other-residential',customPropertyType:'Synthetic residential property'},selector:'#conditional-customPropertyType'},
   {name:'owner-permission',step:5,answers:{ownershipStatus:'renter',ownerPermission:'not-yet'},selector:'.inline-followup'},
   {name:'other-appliance',step:7,answers:{daytimeLoads:['other-high-use'],customDaytimeLoad:'Synthetic household equipment',airConditionerCount:undefined},selector:'#conditional-customDaytimeLoad'},
   {name:'other-roof',step:9,answers:{roofMaterial:'other',customRoofMaterial:'Synthetic roof'},selector:'#conditional-customRoofMaterial'},
  ];
  for(const width of [390,1440])for(const scenario of cases){
   const candidate=await context.newPage();await candidate.setViewportSize({width,height:900});
   await candidate.addInitScript(({answers,step})=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,step,answers})),{answers:{...designV2ExampleAnswers,...scenario.answers},step:scenario.step});
   await candidate.goto(lang==='en'?'/en/estimate':'/estimate');await expect(candidate.locator(scenario.selector)).toBeVisible();await expect(candidate.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(scenario.step+1));
   await expect(candidate.locator('.question-stage')).toHaveCSS('opacity','1');
   if(info.project.name==='desktop-chromium')await candidate.screenshot({path:path.join(folder,`implementation-conditional-${scenario.name}-${lang}-${width}.png`),scale:'css'});
   await candidate.close();
  }
 });
 test(`${lang}: supplied screens at mobile and desktop, with real calculation and safe sharing`,async({page,context},info)=>{
  test.setTimeout(240000);
  const data=fixture();
  const capture=info.project.name==='desktop-chromium';
  await page.clock.setFixedTime(new Date(fixed));
  await page.route('**/api/installer/portal**',route=>route.fulfill({json:data}));
  await page.addInitScript(answers=>sessionStorage.setItem('solarmatch:estimate',JSON.stringify(answers)),designV2ExampleAnswers);
  const folder=path.resolve('docs/design-v2-comparison');await mkdir(folder,{recursive:true});
  const reference=await context.newPage();await reference.clock.setFixedTime(new Date(fixed));
  await reference.addInitScript(({lang,answers})=>{localStorage.setItem('sm-lang',lang);sessionStorage.setItem('sm-answers',JSON.stringify({...answers,activelyPlanningSolar:answers.planningTimeframe}));sessionStorage.setItem('sm-refine','{}');},{lang,answers:designV2ExampleAnswers});
  for(const width of [390,1440]) {
   await page.setViewportSize({width,height:900});await reference.setViewportSize({width,height:900});
   const routes=[['home',lang==='en'?'/en':'/'],['results',lang==='en'?'/en/estimate/results':'/estimate/results'],['installers','/installers?lang='+lang],['portal','/installers?lang='+lang],['enquiries','/installers?view=inbox&lang='+lang],['enquiry-e39','/installers/enquiry/'+id+'?lang='+lang],['credits','/installers?view=credits&lang='+lang],['company','/installers?view=profile&lang='+lang]];
   for(const [name,url]of routes) {
    if(name==='installers')await page.route('**/api/installer/portal**',r=>r.fulfill({status:401,json:{error:'unauthorized'}}));
    if(name==='portal'){await page.unroute('**/api/installer/portal**');await page.route('**/api/installer/portal**',r=>r.fulfill({json:data}));}
    await page.goto(url);await expect(page.locator('main h1').first()).toBeVisible();
    if(name==='home'){await page.locator('#hero-monthly-bill').fill('6000');await page.locator('main h1').click();}
    if(name==='results'){await expect(page.locator('.rbig')).toHaveText('฿1,665');await expect(page.locator('.rstats>div')).toHaveCount(3);await expect(page.locator('.journey-transition-surface')).toHaveCSS('opacity','1');}
    await audit(page);if(capture)await page.screenshot({path:path.join(folder,`implementation-${name}-${lang}-${width}.png`),fullPage:true,scale:'css'});
    await reference.goto('http://127.0.0.1:4174/#'+name);await reference.evaluate(()=>document.fonts.ready);
    if(capture)await reference.screenshot({path:path.join(folder,`prototype-${name}-${lang}-${width}.png`),fullPage:true,scale:'css'});
    const chrome=await reference.locator('.proto').evaluate(el=>Math.ceil(el.getBoundingClientRect().height));
    await page.evaluate(()=>window.scrollTo(0,0));await reference.evaluate(()=>window.scrollTo(0,0));
    if(capture)await page.screenshot({path:path.join(folder,`viewport-implementation-${name}-${lang}-${width}.png`),clip:{x:0,y:0,width,height:900-chrome},scale:'css'});
    if(capture)await reference.screenshot({path:path.join(folder,`viewport-prototype-${name}-${lang}-${width}.png`),clip:{x:0,y:chrome,width,height:900-chrome},scale:'css'});
   }
  }
  for(const width of [390,1440]) {
   await page.setViewportSize({width,height:900});await reference.setViewportSize({width,height:900});
   for(let step=0;step<11;step++){
    // Seed before mounting, not into an active prior question whose pending
    // effects may still persist its old step. This is fixture setup, not a user edit.
    const questionPage=await context.newPage();await questionPage.setViewportSize({width,height:900});
    await questionPage.addInitScript(({answers,step})=>{sessionStorage.removeItem('solarmatch:assessment-context');sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,answers,step}));},{answers:designV2ExampleAnswers,step});
    await reference.evaluate(step=>sessionStorage.setItem('sm-step',JSON.stringify(step)),step);
    await questionPage.goto(lang==='en'?'/en/estimate':'/estimate');await expect(questionPage.getByRole('progressbar')).toHaveAttribute('aria-valuenow',String(step+1));
    await expect(questionPage.locator('.question-stage')).toHaveCSS('opacity','1');await questionPage.evaluate(()=>document.fonts.ready);
    expect(await questionPage.evaluate(()=>JSON.parse(sessionStorage.getItem('solarmatch:estimate-draft')!).step)).toBe(step);
    await reference.goto('http://127.0.0.1:4174/#estimate');await reference.reload();await reference.evaluate(()=>document.fonts.ready);
    await expect(reference.locator('#qh')).toContainText(initialQuestionnaire.questions[step].title[lang].slice(0,18));
    const chrome=await reference.locator('.proto').evaluate(el=>Math.ceil(el.getBoundingClientRect().height));
    await questionPage.evaluate(()=>window.scrollTo(0,0));await reference.evaluate(()=>window.scrollTo(0,0));
    if(capture)await questionPage.screenshot({path:path.join(folder,`implementation-question-${step+1}-${lang}-${width}.png`),clip:{x:0,y:0,width,height:900-chrome},scale:'css'});
    if(capture)await reference.screenshot({path:path.join(folder,`prototype-question-${step+1}-${lang}-${width}.png`),clip:{x:0,y:chrome,width,height:900-chrome},scale:'css'});
    await questionPage.close();
   }
  }
  await reference.close();
  // Shared URL restores permitted inputs only, in a fresh browsing context.
  await page.goto(lang==='en'?'/en/estimate/results':'/estimate/results');
  await context.grantPermissions(['clipboard-write','clipboard-read']);
  await page.getByRole('button',{name:lang==='en'?'Copy link':'คัดลอกลิงก์',exact:true}).click();
  const link=await page.evaluate(()=>navigator.clipboard.readText());expect(new URL(link).hash).toMatch(/^#sm-estimate=/);expect(new URL(link).search).toBe('');
  const shared=await context.newPage();await shared.goto(link);await expect(shared.locator('.rbig')).toHaveText('฿1,665');await expect(shared.locator('input[autocomplete=tel]')).toHaveCount(0);await shared.close();
 });
 test(`${lang}: preferences, outcomes and team notes report successful persistence and failures`,async({page})=>{
  const data=fixture(),posts:Record<string,unknown>[]=[];let fail=false;
  await page.route('**/api/installer/portal**',async route=>{
   if(route.request().method()==='GET'){await route.fulfill({json:data});return;}
   const body=route.request().postDataJSON();posts.push(body);
   if(fail){await route.fulfill({status:409,json:{error:'notes_changed_or_unavailable'}});return;}
   if(body.action==='set-accepting')data.company!.paused=!body.accepting;
   if(body.action==='report-outcome')data.deliveries[0].outcome=body.outcome;
   if(body.action==='save-team-notes'){data.deliveries[0].teamNotes=body.notes;data.deliveries[0].notesRevision=(data.deliveries[0].notesRevision??0)+1;data.deliveries[0].notesUpdatedAt=fixed;}
   await route.fulfill({json:{ok:true}});
  });
  await page.goto('/installers?view=profile&lang='+lang);
  const name=page.getByLabel(lang==='en'?'Company name':'ชื่อบริษัท',{exact:true});await name.fill('Unsaved company edit');
  await page.getByRole('switch',{name:lang==='en'?'Accepting enquiries preference':'ตั้งค่ารับคำขอ',exact:true}).click();
  await expect(name).toHaveValue('Unsaved company edit');expect(posts[0]).toEqual({action:'set-accepting',accepting:false});
  await page.goto('/installers/enquiry/'+id+'?lang='+lang);
  await page.getByRole('button',{name:lang==='en'?'Contacted':'ติดต่อแล้ว',exact:true}).click();
  await expect(page.getByRole('button',{name:lang==='en'?'Contacted':'ติดต่อแล้ว',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByLabel(lang==='en'?'Team notes':'บันทึกสำหรับทีม').fill('Synthetic persistent note');
  await page.getByRole('button',{name:lang==='en'?'Save notes':'บันทึกโน้ต',exact:true}).click();
  await page.reload();await expect(page.getByLabel(lang==='en'?'Team notes':'บันทึกสำหรับทีม')).toHaveValue('Synthetic persistent note');
  fail=true;await page.getByLabel(lang==='en'?'Team notes':'บันทึกสำหรับทีม').fill('Unsaved revised note');
  await page.getByRole('button',{name:lang==='en'?'Save notes':'บันทึกโน้ต',exact:true}).click();
  await expect(page.getByLabel(lang==='en'?'Team notes':'บันทึกสำหรับทีม')).toHaveValue('Unsaved revised note');
  await expect(page.getByText(lang==='en'?'Unsaved changes':'ยังไม่บันทึก',{exact:true})).toBeVisible();
 });
}
