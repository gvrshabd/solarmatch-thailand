import {readFileSync} from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {expect,test,type Page} from '@playwright/test';

// Explicitly opt in only against the isolated, loopback installer preview.
test.skip(process.env.INSTALLER_E2E!=='1','Run only with INSTALLER_E2E=1 against the isolated local preview.');
test.use({trace:'off',screenshot:'off',video:'off'});

// Export only request lifecycle metadata: never bodies, headers, cookies, console
// message text, input values or token-bearing URLs from an authenticated run.
const diagnosticRuns=new WeakMap<Page,{events:unknown[];pending:Set<string>}>();
test.beforeEach(async({page})=>{
  if(process.env.ADMIN_DIAGNOSTICS!=='1')return;
  const events:unknown[]=[];
  const pending=new Set<string>();
  diagnosticRuns.set(page,{events,pending});
  const safePath=(url:string)=>{
    const pathname=new URL(url).pathname;
    const paths=new Set(['/admin','/admin/','/admin/local-access','/admin/api/session','/admin/api/installer-platform','/admin/api/config','/admin/api/leads','/admin/api/media','/api/assessment/config']);
    return paths.has(pathname)?pathname:'[asset-or-other]';
  };
  page.on('request',request=>{if(safePath(request.url())==='[asset-or-other]')return;const key=`${request.method()} ${safePath(request.url())}`;pending.add(key);events.push({event:'request',key,at:Date.now()});});
  page.on('response',response=>{if(safePath(response.url())!=='[asset-or-other]')events.push({event:'response',path:safePath(response.url()),status:response.status(),at:Date.now()});});
  page.on('requestfinished',request=>{pending.delete(`${request.method()} ${safePath(request.url())}`);});
  page.on('requestfailed',request=>{const key=`${request.method()} ${safePath(request.url())}`;pending.delete(key);events.push({event:'failed',key,at:Date.now()});});
  page.on('console',message=>{if(message.type()==='error')events.push({event:'console-error',at:Date.now()});});
  page.on('pageerror',()=>events.push({event:'page-error',at:Date.now()}));
});
test.afterEach(async({page},testInfo)=>{
  const run=diagnosticRuns.get(page);
  if(run){
    const summary={project:testInfo.project.name,status:testInfo.status,events:run.events,pending:[...run.pending]};
    await testInfo.attach('safe-request-lifecycle',{body:JSON.stringify(summary),contentType:'application/json'});
    console.log('SAFE_ADMIN_LIFECYCLE '+JSON.stringify(summary));
  }
});

function localAdminPassword() {
  const vars=readFileSync(path.resolve('.installer-test/.dev.vars'),'utf8');
  const line=vars.split(/\r?\n/u).find(value=>/^\s*LOCAL_ADMIN_PASSWORD\s*=/u.test(value));
  if(!line)throw new Error('Missing isolated local admin password configuration.');
  const raw=line.slice(line.indexOf('=')+1).trim();
  const password=raw.startsWith('"')&&raw.endsWith('"')||raw.startsWith("'")&&raw.endsWith("'")?raw.slice(1,-1):raw;
  if(password.length<32)throw new Error('Invalid isolated local admin password configuration.');
  return password;
}

async function signIn(page:Page) {
  await page.goto('/admin/local-access');
  await expect(page.getByRole('heading',{name:'Synthetic local test administrator'})).toBeVisible();
  await page.getByLabel('Local test password').fill(localAdminPassword());
  await Promise.all([
    page.waitForURL(/\/admin\/?$/u),
    page.getByRole('button',{name:'Sign in'}).click(),
  ]);
  await expect(page.getByRole('navigation',{name:'Administration sections'})).toBeVisible();
}

test('isolated admin sign-in loads installer operations and populated company controls',async({page,request})=>{
  const unauthenticated=await request.get('/admin/api/installer-platform',{headers:{'cf-access-authenticated-user-email':'forged@example.test'}});
  expect(unauthenticated.status()).toBe(401);
  await page.goto('/admin');
  await expect(page.getByRole('heading',{name:'Access denied'})).toBeVisible();

  await signIn(page);
  await page.getByRole('navigation',{name:'Administration sections'}).getByRole('button',{name:'Installer operations'}).click();
  await expect(page.getByRole('heading',{name:'Installer operations'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Processing health'})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Installer records'}).getByRole('button',{name:/^companies \(/iu})).toBeVisible();

  const operation=page.getByLabel('Operation');
  await operation.selectOption('approve-company');
  const company=page.getByRole('combobox',{name:'Company',exact:true});
  await expect(page.getByRole('button',{name:'Record operation'})).toBeEnabled();
  await expect.poll(()=>company.locator('option').count(),{message:'The populated company selector must finish loading.'}).toBeGreaterThan(1);
  const selected=await company.locator('option').nth(1).getAttribute('value');
  expect(selected).toBeTruthy();
  await company.selectOption(selected!);
  await expect(company).toHaveValue(selected!);

  // Read-only action: if CSRF failed open, this still cannot change a company.
  const missingCsrf=await page.evaluate(async()=>{
    const response=await fetch('/admin/api/installer-platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview-retention'})});
    return {status:response.status,body:await response.json()};
  });
  expect(missingCsrf).toEqual({status:403,body:{error:'invalid_request_verification'}});
  await page.goto('/admin/local-access');
  await expect(page.getByRole('heading',{name:'Synthetic local test administrator'})).toBeVisible();
});

test('installer admin panel remains operable at 320px with no serious accessibility violations',async({page})=>{
  await page.setViewportSize({width:320,height:800});
  await signIn(page);
  await page.getByRole('navigation',{name:'Administration sections'}).getByRole('button',{name:'Installer operations'}).click();
  await expect(page.getByRole('heading',{name:'Installer operations'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Record operation'})).toBeEnabled();
  await page.getByRole('navigation',{name:'Installer records'}).getByRole('button',{name:/^orders \(/iu}).click();
  await expect(page.getByRole('navigation',{name:'Installer records'}).getByRole('button',{name:/^orders \(/iu})).toHaveClass(/active/u);
  const audit=await new AxeBuilder({page}).include('section.admin-section').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  const blocking=audit.violations.filter(violation=>['serious','critical'].includes(violation.impact??''));
  expect(blocking.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)}))).toEqual([]);
});

test('protected readiness, campaign reports and shutdown export remain read-only review surfaces',async({page,request})=>{
  for(const report of ['campaign','shutdown']){
    const denied=await request.get(`/admin/api/installer-platform?report=${report}&format=csv`);
    expect(denied.status()).toBe(401);
  }
  await signIn(page);
  await page.getByRole('navigation',{name:'Administration sections'}).getByRole('button',{name:'Installer operations'}).click();
  await expect(page.getByRole('button',{name:'Record operation'})).toBeEnabled();
  // The preserved review demo is dated October 2026. Select its reporting
  // period explicitly instead of relying on the browser's current day.
  await page.getByLabel('From Bangkok day').fill('2026-10-01');
  await page.getByLabel('Through Bangkok day').fill('2026-10-31');
  await page.getByRole('button',{name:'Load campaign report'}).click();
  await expect(page.getByRole('link',{name:'Export campaign CSV'})).toBeVisible();
  await page.getByRole('combobox',{name:'Submission environment',exact:true}).selectOption('local-test');
  // Changing filters invalidates the displayed report/export until the new snapshot loads.
  await expect(page.getByRole('link',{name:'Export campaign CSV'})).toHaveCount(0);
  await page.getByRole('button',{name:'Load campaign report'}).click();
  await expect(page.getByRole('region',{name:'Campaign report table'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Campaign report table'}).getByText('Not recorded',{exact:true}).first()).toBeVisible();
  const csvUrl=await page.getByRole('link',{name:'Export campaign CSV'}).getAttribute('href');
  expect(csvUrl).toContain('submissionMode=local-test');
  const csv=await page.request.get(csvUrl!);expect(csv.ok()).toBe(true);expect(csv.headers()['cache-control']).toBe('no-store');
  expect(await csv.text()).not.toMatch(/legal_first_name|phone_number|assessment_answers|provider_order_id/);
  await page.getByRole('button',{name:'Calculate review snapshot'}).click();
  await expect(page.getByRole('region',{name:'Shutdown liability table'})).toBeVisible();
  await expect(page.getByText('Provider reconciliation remains required.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:/approve refund|send refund|activate|send alert/iu})).toHaveCount(0);
  await page.getByRole('button',{name:'Capture / resolve local health alerts'}).click();
  await expect(page.getByRole('button',{name:'Capture / resolve local health alerts'})).toBeEnabled();
  await page.getByText('Configuration preflight (names only)',{exact:true}).click();
  await expect(page.getByText('company-tax-and-contract-facts',{exact:false})).toBeVisible();
  await page.getByRole('combobox',{name:'Report language',exact:true}).selectOption('th');
  await expect(page.getByRole('heading',{name:'รายงานคำขอจากแคมเปญ'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Campaign report table'}).getByText('ยังไม่มีบันทึก',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'คำนวณข้อมูลเพื่อการตรวจสอบ'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
