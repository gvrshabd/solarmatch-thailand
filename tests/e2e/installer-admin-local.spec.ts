import {readFileSync} from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import {expect,test,type Page} from '@playwright/test';

// Explicitly opt in only against the isolated, loopback installer preview.
test.skip(process.env.INSTALLER_E2E!=='1','Run only with INSTALLER_E2E=1 against the isolated local preview.');
test.use({trace:'off',screenshot:'off',video:'off'});

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
    return response.status;
  });
  expect(missingCsrf).toBe(403);
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
