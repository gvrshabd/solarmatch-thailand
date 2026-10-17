import { prepareReviewAssets as prepareArchivedReview } from './design-v2-review-assets.mjs';
import { readFile, writeFile, readdir, copyFile, cp } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Same coarse, non-personal household fixture as the matched result captures.
// No contact choice, consent, credentials, free text or tax answers enter a link.
export function exampleLink(lang, scenario='results') {
  const inputs={province:'bangkok',district:'sathon',monthlyBillThb:6000,billDate:'2026-10-01',tariffCategory:'ordinary-1.2',utility:'MEA',activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',roofArea:'100-200',exactRoofAreaSqm:100,electricityPhase:'single',daytimePattern:'high',weekendDaytimePattern:'high',daytimeLoads:['air-conditioning'],airConditionerCount:4,roofMaterial:'concrete-tile',shade:'almost-none',panelTiltDegrees:15,panelAzimuthDegrees:180};
  const quote={quoteSystemKw:5.005,quoteModuleCount:7,quoteModuleWp:715,quoteInverterAcKw:5,quoteBatteryIncluded:false};
  if(scenario==='results-negative')Object.assign(inputs,quote,{quoteCashPriceThb:900000});
  if(scenario==='results-no-payback')Object.assign(inputs,quote,{quoteCashPriceThb:4000000});
  if(scenario==='results-exact-quote')Object.assign(inputs,quote,{quoteCashPriceThb:150123.45});
  if(scenario==='results-unsupported')inputs.projectType='solar-with-battery';
  if(scenario==='results-no-feasible')inputs.exactRoofAreaSqm=1;
  return (lang==='en'?'/en':'')+'/estimate/results#sm-estimate='+encodeURIComponent(JSON.stringify({version:2,modelVersion:'residential-hourly-2026-10-17-v3',assumptionsVersion:'residential-hourly-2026-10-17-v3',calculationReferenceDate:'2026-10-17',inputs}));
}

// Staging assembly only. Original references and archived v2 evidence remain intact.
export async function prepareReviewAssets(root = process.cwd(), options = {}) {
  const target = await prepareArchivedReview(root, { ...options, target: '.wrangler/homeowner-v3-staging-assets' });
  const review = path.join(target, 'design-review'), source = path.join(root, 'docs/design-v3/prototype');
  for(const lang of ['en','th'])await writeFile(path.join(review,'estimate-'+lang+'.html'),`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SolarMatch synthetic v3 estimate</title><p>Opening the completed synthetic reference estimate. No contact details are included.</p><a id="example-link" href="${exampleLink(lang)}">Open estimate</a><script src="open-example.js"></script></html>`);
  for (const name of ['index.html', 'app.js', 'app.css', 'engine.min.js']) await copyFile(path.join(source, name), path.join(review, 'prototype', name));
  await cp(path.join(source, 'img'), path.join(review, 'prototype/img'), { recursive: true });
  let html = await readFile(path.join(review, 'prototype/index.html'), 'utf8');
  html = html.replace('<script src="engine.min.js"', '<script src="review-locale.js"></script><script src="engine.min.js"');
  await writeFile(path.join(review, 'prototype/index.html'), html);
  await writeFile(path.join(review, 'prototype/review-locale.js'), `
const reviewParams=new URLSearchParams(location.search),reviewLang=reviewParams.get('lang');
if(['en','th'].includes(reviewLang))localStorage.setItem('sm-lang',reviewLang);
if(reviewParams.has('step')){const step=Number(reviewParams.get('step'));if(Number.isInteger(step)&&step>=0&&step<11)sessionStorage.setItem('sm-step',JSON.stringify(step));}
document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(a){const url=new URL(a.href,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/design-review/prototype/')){event.preventDefault();event.stopImmediatePropagation();}}},true);
`);
  const comparison = path.join(root, 'docs/design-v3-comparison');
  const names = (await readdir(comparison)).filter(name => /^(?:viewport-)?(?:prototype|implementation)-[a-z0-9-]+-(?:en|th)-(?:360|390|768|1440)\.png$/.test(name));
  const images = [];
  for (const name of names) {
    const bytes = await readFile(path.join(comparison, name));
    if (!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Invalid screenshot');
    await writeFile(path.join(review, 'images', name), bytes);
    images.push({name, sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  const pages = [];
  const prototypeSteps = { bill:0, location:1, planning:2, project:3, choice:4, ownership:5, daytime:6, multiple:7, shade:8, 'roof-material':9, contact:10 };
  const ids = [...new Set(names.map(name => name.match(/^(?:viewport-)?(?:prototype|implementation)-(.+)-(?:en|th)-\d+\.png$/)[1]))];
  for (const id of ids) {
    const hasPrototype = names.some(name => name.startsWith(`prototype-${id}-`));
    const widths = [360,390,768,1440].filter(width => ['en','th'].every(lang => (hasPrototype ? ['prototype','implementation'] : ['implementation']).every(side => names.includes(`${side}-${id}-${lang}-${width}.png`))));
    if (!widths.length) continue;
    const result = id.startsWith('results');
    pages.push({id,title:id.replaceAll('-',' '),widths,hasPrototype,prototypeStep:prototypeSteps[id.replace('estimate-','')],prototype:result?'results':id.startsWith('estimate-')?'estimate':id==='loading'?'loading':'home',paths:{en:result?exampleLink('en',id):id==='home'?'/en':'/en/estimate',th:result?exampleLink('th',id):id==='home'?'/':'/estimate'}});
  }
  for (const required of ['home','results']) if (!pages.some(page => page.id===required && page.widths.length===4)) throw Error('Complete actual v3 capture set missing: '+required);
  const notes = [
    'These are actual homeowner Design v3 captures, not archived v2 screenshots. Original prototype source remains byte-for-byte unchanged; the served copy adds locale selection and external-link blocking only. Its mock controls cannot call real APIs.',
    'Only homeowner pages adopt v3. Installer landing and workspace retain their existing design; synthetic before/after regression captures are checked separately.',
    'The current energy calculator replaces the prototype engine. Financial values necessarily differ. Monthly-mean synthetic hourly profiles are uncalibrated; the high self-consumption example is a reference scenario, not measured household performance.',
    'The new bill-first questionnaire is qv8/schema11. Actual kWh, dated bills, project scope, weekend use and optional schedules remain supported. Extra controls extend cards naturally; no fields were hidden to imitate the old prototype.',
    'The existing mobile navigation and language switch remain available. The assessment count uses an additional mobile row where needed; the current question count and required facts replace the prototype\'s fixed eleven-step sequence.',
    'Matched loading screenshots remain unverified: the capture harness timed out while holding navigation, so no loading comparison is presented as passed. The application uses real calculation work rather than the prototype\'s fabricated timed stages or an artificial delay.',
    'Live collection remains disabled. kWh-based contact submissions are explicitly unavailable pending a versioned qualification/storage policy. The protected Test option never submits real consent or contact data.',
    'Existing full legal/consent wording and operator disclosure are preserved. Optional tax/export/finance scenarios retain corrected models and documented eligibility instead of prototype arithmetic. No tax/export/finance benefit enters the base case.',
    'TOU, batteries and expansion remain unsupported for precise financial recommendations. Quotations/VAT/scope, household calibration, independent MEA-page verification, native Thai and qualified legal review remain outstanding.',
    'Supplied photographs were not substituted. Existing source evidence covers the original hero, palm roof and installer photos; exact provenance for all derivative crops/widening and remaining photos is not asserted.',
    'Protected staging and this viewer contain synthetic information only. Actual installer workspace requires its existing account login. Browser emulation is not physical-device or screen-reader acceptance.'
  ];
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  await writeFile(path.join(review,'catalog.json'),JSON.stringify({commit,capturedAt:new Date().toISOString(),pages,notes,images,syntheticOnly:true},null,2));
  for (const file of ['index.html','viewer.js','viewer.css']) await copyFile(path.join(root,'staging/homeowner-v3-review',file),path.join(review,file));
  return target;
}
