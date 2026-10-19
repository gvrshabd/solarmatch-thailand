import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['th', 'en'] as const) {
  const english = locale === 'en';
  const url = english ? '/en/quotation-comparison' : '/quotation-comparison';
  const quoteA = english ? 'Quote A' : 'ใบเสนอราคา A';
  const quoteC = english ? 'Quote C' : 'ใบเสนอราคา C';
  const company = english ? 'Contracting company' : 'บริษัทที่ทำสัญญา';

  test(`${locale}: slow hydration cannot accept and lose early worksheet entries`,async({page})=>{
    let release=()=>{};
    const gate=new Promise<void>(resolve=>{release=resolve;});
    let blocked=false;
    await page.route('**/_next/static/chunks/quotation-comparison-*.js',async route=>{blocked=true;await gate;await route.continue();});
    try{
      await page.goto(url,{waitUntil:'commit'});
      const field=page.getByRole('textbox',{name:`${quoteA}: ${company}`});
      await expect.poll(()=>blocked).toBe(true);
      await expect(field).toBeDisabled();
      release();
      await expect(field).toBeEnabled();
      await field.fill('Synthetic preserved entry');
      await page.getByRole('checkbox',{name:english?'Add Quote C':'เพิ่มใบเสนอราคา C'}).check();
      await expect(field).toHaveValue('Synthetic preserved entry');
    }finally{release();}
  });

  test(`${locale}: missing fields, fictional example, optional C, print and unsaved entry`, async ({ page },info) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.method() !== 'GET') requests.push(`${request.method()} ${request.url()}`); });
    await page.goto(url);
    const fieldA = page.getByRole('textbox', { name: `${quoteA}: ${company}` });
    await expect(fieldA).toHaveAttribute('placeholder', english ? 'Not specified' : 'ไม่ระบุ (Not specified)');
    await expect(page.getByRole('textbox', { name: `${quoteC}: ${company}` })).toHaveCount(0);

    const originalStorage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    await fieldA.fill('บริษัททดสอบชื่อยาวมากสำหรับตรวจข้อความภาษาไทยและการตัดบรรทัด');
    await page.getByRole('checkbox', { name: english ? 'Add Quote C' : 'เพิ่มใบเสนอราคา C' }).check();
    await expect(page.getByRole('textbox', { name: `${quoteC}: ${company}` })).toBeVisible();
    for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await expect(page.locator('.quote-worksheet-row').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
    await page.setViewportSize({width:info.project.name.includes('mobile')?390:1440,height:900});
    expect((await new AxeBuilder({page}).include('.quote-worksheet').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.skip-link')).toBeHidden();
    await expect(page.locator('.terrace-public')).toHaveCSS('background-color','rgb(255, 255, 255)');
    await expect(page.locator('.quote-worksheet-print-value').filter({ hasText: 'บริษัททดสอบชื่อยาวมาก' })).toBeVisible();
    await expect(page.locator('.quote-worksheet-print-missing').first()).toBeVisible();
    await page.emulateMedia({ media: 'screen' });

    await page.getByRole('button', { name: english ? 'Replace entries with fictional example' : 'แทนข้อมูลที่กรอกด้วยตัวอย่างสมมติ' }).click();
    await expect(page.getByRole('textbox',{name:`${quoteC}: ${company}`})).toBeVisible();
    await expect(fieldA).toHaveValue(/Example A Co/);
    await expect(page.getByText(english ? 'Every company, model, price' : 'ตัวอย่างทั้งหมดเป็นเรื่องสมมติ', { exact: false })).toBeVisible();
    expect((await new AxeBuilder({page}).include('.quote-worksheet').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
    if(process.env.HOMEOWNER_GUIDE_SCREENSHOTS){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({path:`${process.env.HOMEOWNER_GUIDE_SCREENSHOTS}/worksheet-${locale}-${info.project.name}.png`});}
    await page.getByRole('button', { name: english ? 'Clear entries' : 'ล้างข้อมูล' }).click();
    await expect(fieldA).toBeEmpty();
    await expect(page.getByRole('textbox', { name: `${quoteC}: ${company}` })).toHaveCount(0);
    expect(await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }))).toEqual(originalStorage);
    expect(requests).toEqual([]);
    await page.reload();
    await expect(fieldA).toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
  test(`${locale}: buying guide links to the worksheet and explains warranties`,async({page},info)=>{
    await page.goto(english?'/en/solar-guide':'/solar-guide');
    await expect(page.getByRole('link',{name:english?'Open the quotation comparison worksheet':'เปิดแบบเทียบใบเสนอราคา'})).toHaveAttribute('href',url);
    await expect(page.locator('main')).toContainText(english?'warranties':'การรับประกัน');
    expect((await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
    if(process.env.HOMEOWNER_GUIDE_SCREENSHOTS)await page.screenshot({path:`${process.env.HOMEOWNER_GUIDE_SCREENSHOTS}/guide-${locale}-${info.project.name}.png`});
  });
}
