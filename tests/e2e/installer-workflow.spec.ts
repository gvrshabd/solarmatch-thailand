import {expect,test,type APIRequestContext,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type TestMessage={id:string;channel:string;recipient:string;body:string};
const enabled=process.env.INSTALLER_E2E==='1';
const origin=(process.env.PLAYWRIGHT_BASE_URL??'http://localhost:3000').replace(/\/$/u,'');
const headers={Origin:origin};
const password='Synthetic-Password-2026!';
const recoveredPassword='Synthetic-Recovered-2026!';

async function seed(request:APIRequestContext) {
  const response=await request.post('/api/installer/test',{headers,data:{action:'seed'}});
  expect(response.status()).toBe(200);
  const data=await response.json() as {mode:string;companyIds:string[];paymentOrderId:string};
  expect(data.mode).toBe('local-test');expect(data.companyIds).toHaveLength(4);
  return data;
}
async function messages(request:APIRequestContext) {
  const response=await request.get('/api/installer/test');expect(response.status()).toBe(200);
  return (await response.json()).messages as TestMessage[];
}
async function emailUrl(request:APIRequestContext,email:string,kind:string) {
  let url='';
  await expect.poll(async()=>{
    const row=(await messages(request)).find(message=>message.channel==='email'&&message.recipient===email&&JSON.parse(message.body).kind===kind);
    url=row?JSON.parse(row.body).url:'';
    return Boolean(url);
  }).toBe(true);
  expect(new URL(url).origin).toBe(origin);
  return url;
}
const answers={province:'bangkok',district:'sathon',monthlyBillThb:6000,activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',daytimePattern:'high',daytimeLoads:['air-conditioning'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'almost-none'};
async function prepareQuote(page:Page) {
  await page.addInitScript(value=>sessionStorage.setItem('solarmatch:estimate-draft',JSON.stringify({version:9,step:10,answers:value})),answers);
  await page.goto('/en/estimate');
}

test.describe('isolated local installer workflow',()=>{
  test.skip(!enabled,'Requires explicit INSTALLER_E2E=1 and an isolated loopback local-test database.');

  test('real signup, email verification, persistent session, pending company, logout and password recovery',async({page,context},testInfo)=>{
    test.setTimeout(120000);
    const email=`installer-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
    await page.goto('/installers?lang=en');
    await page.getByRole('button',{name:'Create a company account',exact:true}).click();
    await page.getByLabel('Your name',{exact:true}).fill('Synthetic Installer');
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByLabel('Password (at least 12 characters)',{exact:true}).fill(password);
    const signupResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/installer-auth/sign-up/email',{timeout:60000});
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    expect((await signupResponse).status()).toBeLessThan(400);
    await expect(page.getByRole('status')).toContainText('Check your email');
    await page.goto(await emailUrl(page.request,email,'verification'));
    await expect(page.getByRole('heading',{name:'Installer portal',exact:true})).toBeVisible();
    const sessionCookies=(await context.cookies()).filter(cookie=>cookie.name.includes('session_token'));
    expect(sessionCookies.length).toBeGreaterThan(0);
    expect(sessionCookies.every(cookie=>cookie.httpOnly&&cookie.expires>Date.now()/1000+86400)).toBe(true);
    await page.reload();
    await expect(page.getByRole('heading',{name:'Installer portal',exact:true})).toBeVisible();
    await page.getByLabel('Company name',{exact:true}).fill('Synthetic Browser Installer');
    await page.getByLabel('Company phone',{exact:true}).fill('0812345678');
    await page.getByLabel('Service areas (comma-separated)',{exact:true}).fill('bangkok');
    await page.getByRole('button',{name:'Save company',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Saved.');
    const portal=await page.request.get('/api/installer/portal');
    expect(portal.status()).toBe(200);
    expect((await portal.json()).company).toMatchObject({approvalStatus:'pending',paused:true});
    await page.setViewportSize({width:320,height:800});
    await page.getByRole('button',{name:'ไทย',exact:true}).click();
    await expect(page.getByRole('heading',{name:'พอร์ทัลผู้ติดตั้ง',exact:true})).toBeVisible();
    await expect(page.getByRole('status')).toContainText('บันทึกแล้ว');
    await expect(page.getByText('รอตรวจสอบ',{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
    expect((await new AxeBuilder({page}).include('.installer-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('installer-portal-320-th.png'),fullPage:true});
    await page.getByRole('button',{name:'English',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Installer portal',exact:true})).toBeVisible();
    await expect(page.getByText('Pending',{exact:true})).toBeVisible();
    await page.screenshot({path:testInfo.outputPath('installer-portal-320-en.png'),fullPage:true});
    await page.route('**/api/installer-auth/sign-out',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"synthetic_unavailable"}'}));
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('You are still signed in.');
    await expect(page.getByRole('heading',{name:'Installer portal',exact:true})).toBeVisible();
    await page.unroute('**/api/installer-auth/sign-out');
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
    expect((await page.request.get('/api/installer/portal')).status()).toBe(401);
    await page.getByRole('button',{name:'Forgot password',exact:true}).click();
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Check your email');
    await page.goto(await emailUrl(page.request,email,'password-reset'));
    await expect(page.getByRole('heading',{name:'Set a new password',exact:true})).toBeVisible();
    await page.getByLabel('Password (at least 12 characters)',{exact:true}).fill(recoveredPassword);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
    const oldPassword=await page.request.post('/api/installer-auth/sign-in/email',{headers,data:{email,password,rememberMe:true}});
    expect(oldPassword.ok()).toBe(false);
    await page.getByLabel('Email',{exact:true}).fill(email);
    await page.getByLabel('Password (at least 12 characters)',{exact:true}).fill(recoveredPassword);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Installer portal',exact:true})).toBeVisible();
  });

  test('No produces full results with zero referrals; real SMS proof permits the optional request',async({page})=>{
    test.setTimeout(120000);
    await seed(page.request);
    const requests:string[]=[];
    page.on('request',request=>{if(['/api/leads','/api/phone-verification'].includes(new URL(request.url()).pathname))requests.push(request.url());});
    await prepareQuote(page);
    await page.getByRole('radio',{name:'No, show my estimate without installer contact',exact:true}).click();
    await page.getByRole('button',{name:'See my estimate',exact:true}).click();
    await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5,{timeout:45000});
    expect(requests).toEqual([]);
    await page.goto('/en/estimate');
    await page.getByRole('radio',{name:'Yes, I would like solar companies to contact me',exact:true}).click();
    await page.locator('.quote-consent-check input').check();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.getByLabel('First name',{exact:true}).fill('Synthetic');
    await page.getByLabel('Last name',{exact:true}).fill('Browser Homeowner');
    const phone=`081${String(Date.now()).slice(-7)}`;
    await page.locator('input[type="tel"]').fill(phone);
    await page.locator('.contact-adult-confirmation input').check();
    await page.getByRole('button',{name:'Submit my request',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('Verify your phone number');
    expect(requests).toEqual([]);
    const challengeResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/phone-verification');
    await page.getByRole('button',{name:'Send SMS code',exact:true}).click();
    const challenge=await challengeResponse;expect(challenge.status()).toBe(201);
    await expect(page.getByRole('status')).toContainText('Enter the SMS code within 5 minutes.');
    const captured=(await messages(page.request)).find(message=>message.channel==='sms'&&message.recipient===`+66${phone.slice(1)}`)!;
    expect(captured.channel).toBe('sms');
    const code=captured.body.match(/SolarMatch: (\d{6})/u)![1];
    await page.getByRole('textbox',{name:/SMS verification code/}).fill(code);
    await page.getByRole('button',{name:'Verify number',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Phone number verified.');
    await page.waitForTimeout(1600);
    const leadResponse=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/leads');
    await page.getByRole('button',{name:'Try again',exact:true}).click();
    const lead=await leadResponse;expect(lead.status()).toBe(201);
    await expect(page.locator('.result-metrics-v3 article')).toHaveCount(5,{timeout:45000});
    expect(requests.filter(url=>new URL(url).pathname==='/api/leads')).toHaveLength(1);
  });

  test('synthetic payment completion is repeat-safe through the dedicated local fixture endpoint',async({request})=>{
    const fixture=await seed(request);
    const confirm=()=>request.post('/api/installer/test',{headers,data:{action:'payment',orderId:fixture.paymentOrderId,status:'paid'}});
    const first=await confirm();expect(first.status()).toBe(200);const initial=await first.json();
    const repeated=await confirm();expect(repeated.status()).toBe(200);const retry=await repeated.json();
    expect(initial.status).toBe('paid');expect(retry.credited_at).toBe(initial.credited_at);
  });
});
