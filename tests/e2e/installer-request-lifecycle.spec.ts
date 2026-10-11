import {expect,test} from '@playwright/test';

test.skip(process.env.INSTALLER_E2E!=='1','Isolated loopback installer preview only.');
test.use({trace:'off',screenshot:'off',video:'off'});

// No database operation, login/session or credential is needed for this reduced
// request-lifecycle reproduction. Preserve rejection and subsequent navigation.
test('an unauthenticated rejected POST does not block the following document request',async({page})=>{
  await page.goto('/admin/local-access');
  await expect(page.getByRole('heading',{name:'Synthetic local test administrator'})).toBeVisible();
  const rejected=await page.evaluate(async()=>{
    const response=await fetch('/admin/api/installer-platform',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'preview-retention'})});
    return {status:response.status,body:await response.json()};
  });
  expect(rejected).toEqual({status:401,body:{error:'unauthorized'}});
  await page.goto('/admin/local-access');
  await expect(page.getByRole('heading',{name:'Synthetic local test administrator'})).toBeVisible();
});
