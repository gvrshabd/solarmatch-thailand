import { prepareReviewAssets as prepareHomeownerV3ReviewAssets } from './homeowner-v3-review-assets.mjs';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const screenshotName=/^([a-z0-9]+(?:-[a-z0-9]+)*)-(en|th)-(phone|desktop)\.png$/;
const routes=new Set(['landing','signin','inbox','credits','company','claims','terms','e22','e25','e39','e41']);
const states=new Set(['approved','empty','paused','platform','unverified','terms','nocredits','debt','payment','pending','nocompany']);
const safeId=value=>typeof value==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(value)&&!/^00000000-0000-4000-8000-/i.test(value);
export const signalReviewNotes=[
  'All screenshots and prototype records are synthetic. The working staging portal uses its existing account and history; its live state may differ from a screenshot. These links never create an account, preload credentials, submit a payment or change a company.',
  'Prototype means the original supplied handoff PNG. The separate rendered-prototype link shows the unchanged source running in the capture environment. Font rendering can differ between the supplied image and the new browser capture.',
  'Phone references are 780 physical pixels wide at a 390 CSS pixel viewport and scale 2. Desktop references use 1440 CSS pixels at scale 1. Overlay images share their top edge and width; no screenshot is cropped, masked or retouched.',
  'Matched captures use the supplied PNG height divided by device scale. Full-page companion links show extra implementation content when present. A matched screenshot is not a substitute for the separate real 844/900-height interaction and overflow checks.',
  'Real actions, server-confirmed payments, owner permissions, notes revisions, claim deadlines, withdrawal redaction and existing legal text remain. The reference prototype is a mock: its balances, QR illustration, calls and saved messages do not perform real operations.',
  'Thai copy still needs native review. Browser screenshots do not claim physical-device, screen-reader, native-speaker or legal acceptance.',
];

export function signalImplementationPath(route,lang,enquiryId) {
  const query=new URLSearchParams({lang:lang==='th'?'th':'en'});
  if(/^e\d+$/.test(route)&&safeId(enquiryId))return '/installers/enquiry/'+encodeURIComponent(enquiryId)+'?'+query;
  if(route==='signin')query.set('auth','login');
  else if(route!=='landing')query.set('view',({company:'profile',credits:'credits',claims:'claims',terms:'terms'})[route]||'inbox');
  return '/installers?'+query;
}

function differences(item) {
  const notes=[];
  if(item.route==='inbox')notes.push('The implementation opens the oldest waiting enquiry on desktop. The original prototype initially selects Arun even when Kanya is first in its waiting-time sort.');
  if(item.route==='company')notes.push('The portal contract has one company name. The source header and source company form use different names.');
  if(/^e\d+$/.test(item.route))notes.push('Existing assessment labels and legal, claim and notes text are preserved; their wording and line lengths can exceed the abbreviated reference.');
  if(item.route==='credits'&&item.state==='payment')notes.push('The captured QR is a fictional illustration returned by a local mocked checkout. The real portal displays only a provider QR and waits for server confirmation.');
  if(item.route==='terms'||item.route==='claims')notes.push('Existing full terms and claim wording come from the real contract and can be longer than simplified prototype copy.');
  if(item.menu)notes.push('This capture intentionally has the '+item.menu+' menu open. The interactive links start with menus closed.');
  if(item.state!=='approved')notes.push('Screenshot state: '+item.state+'. Opening the working portal does not simulate or change that account state.');
  return notes;
}

/** A deliberately small public catalog: no raw metrics, captured URLs or error logs. */
export function buildSignalCatalog(report,options={}) {
  if(!Array.isArray(report.cases)||!report.cases.length)throw Error('Signal comparison cases are missing');
  const names=new Set(),cases=[];
  for(const item of report.cases) {
    const match=typeof item.name==='string'&&item.name.match(screenshotName);
    if(!match||names.has(item.name))throw Error('Invalid or duplicate Signal screenshot name');
    names.add(item.name);
    const [,stem,lang,device]=match,route=stem.split('-')[0];
    if(!routes.has(route)||!states.has(item.state)||item.route!==route||item.lang!==lang)throw Error('Invalid Signal screenshot route, language or state');
    if(!['','account','close'].includes(item.menu||''))throw Error('Invalid Signal menu state');
    const captures={};
    for(const side of ['prototype','implementation']) {
      const capture=item.captures?.[side];
      if(!capture||capture.filename!==side+'-'+item.name)throw Error('Complete paired Signal captures are required: '+item.name);
      if(!Number.isSafeInteger(capture.width)||capture.width<=0||!Number.isSafeInteger(capture.height)||capture.height<=0)throw Error('Invalid Signal screenshot dimensions');
      captures[side]={file:capture.filename,width:capture.width,height:capture.height};
      if(capture.fullPageCompanion) {
        const full=capture.fullPageCompanion;
        if(full.filename!==side+'-fullpage-'+item.name||!Number.isSafeInteger(full.width)||full.width<=0||!Number.isSafeInteger(full.height)||full.height<=0)throw Error('Invalid Signal full-page companion');
        captures[side].fullPage={file:full.filename,width:full.width,height:full.height};
      }
    }
    if(!item.original||!Number.isSafeInteger(item.original.width)||!Number.isSafeInteger(item.original.height)||item.original.width<=0||item.original.height<=0)throw Error('Original Signal screenshot dimensions are missing');
    if(item.errors?.length)throw Error('Signal capture errors remain: '+item.name);
    const entry={id:stem+'-'+lang+'-'+device,page:stem,title:stem.replaceAll('-',' '),route,lang,device,state:item.state,menu:item.menu||'',cssWidth:device==='phone'?390:1440,original:{file:'reference-'+item.name,width:item.original.width,height:item.original.height},captures,implementation:signalImplementationPath(route,lang,options.enquiryId),prototype:'prototype/?'+new URLSearchParams({lang,state:item.state})+'#'+route,notes:differences(item)};
    if(/^e\d+$/.test(route)&&!safeId(options.enquiryId))entry.notes.push('No existing staging enquiry was supplied for a detail link. The working link opens your Enquiries list.');
    cases.push(entry);
  }
  return {version:1,syntheticOnly:true,fixedNow:typeof report.fixedNow==='string'?report.fixedNow:null,referenceViewport:report.referenceViewport===true,cases,notes:signalReviewNotes};
}

function checkedTarget(root,target) {
  const resolved=path.resolve(target),privateRoot=path.resolve(root,'.wrangler');
  if(!resolved.startsWith(privateRoot+path.sep))throw Error('Signal review assets must stay in the private .wrangler staging asset directory');
  return resolved;
}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function historicalHomeownerCatalog(catalog) {
  return {...catalog,notes:catalog.notes.map(note=>note.startsWith('Only homeowner pages adopt v3.')?'These homeowner Design v3 captures are historical. The current installer design has its own protected Signal review at /design-review/signal/. Original homeowner source and evidence are preserved.':note)};
}
async function copyPng(source,target,expected) {
  const bytes=await readFile(source);
  if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(16)!==expected.width||bytes.readUInt32BE(20)!==expected.height)throw Error('Signal PNG does not match its capture dimensions: '+path.basename(source));
  await writeFile(target,bytes);return hash(bytes);
}

/** Append only allowlisted Signal files; never copy reports or source directories wholesale. */
export async function appendSignalReviewAssets(root,target,options={}) {
  target=checkedTarget(root,target);
  const source=path.join(root,'docs/design-signal/solarmatch-installer-signal'),comparison=path.join(root,'docs/design-signal-review');
  const report=JSON.parse(await readFile(path.join(comparison,'comparison.json'),'utf8'));
  const catalog=buildSignalCatalog(report,options);
  const references=(await readdir(path.join(source,'reference'))).filter(name=>screenshotName.test(name)).sort();
  const captured=catalog.cases.map(item=>item.original.file.replace(/^reference-/,'' )).sort();
  if(JSON.stringify(references)!==JSON.stringify(captured)||references.length!==52)throw Error('All 52 supplied Signal references need complete paired captures');
  const review=path.join(target,'design-review/signal');
  await mkdir(path.join(review,'images'),{recursive:true});await mkdir(path.join(review,'prototype/img'),{recursive:true});
  const images=[];
  for(const item of catalog.cases) {
    const original=item.original;
    images.push({file:original.file,sha256:await copyPng(path.join(source,'reference',original.file.replace(/^reference-/,'')),path.join(review,'images',original.file),original)});
    for(const side of ['prototype','implementation'])for(const image of [item.captures[side],item.captures[side].fullPage].filter(Boolean))images.push({file:image.file,sha256:await copyPng(path.join(comparison,image.file),path.join(review,'images',image.file),image)});
  }
  catalog.images=images;
  // External self-hosted script works with connect-src 'none'; JSON is not fetched.
  const json=JSON.stringify(catalog).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  await writeFile(path.join(review,'catalog.js'),'window.SIGNAL_REVIEW_CATALOG='+json+';\n');
  for(const file of ['index.html','viewer.js','viewer.css'])await copyFile(path.join(root,'staging/signal-review',file),path.join(review,file));
  for(const file of ['signal.js','signal.css'])await copyFile(path.join(source,'prototype',file),path.join(review,'prototype',file));
  await copyFile(path.join(source,'prototype/img/palms-roof.jpg'),path.join(review,'prototype/img/palms-roof.jpg'));
  await copyFile(path.join(root,'staging/signal-review/guard.js'),path.join(review,'prototype/guard.js'));
  const originalHtml=await readFile(path.join(source,'prototype/index.html'),'utf8');
  if(!originalHtml.includes('<script src="signal.js"'))throw Error('Unknown Signal prototype entry point');
  await writeFile(path.join(review,'prototype/index.html'),originalHtml.replace('<script src="signal.js"','<script src="guard.js"></script><script src="signal.js"'));
  // Clarify only the served older viewer. Its source and evidence stay untouched.
  const oldReview=path.join(target,'design-review'),oldCatalog=JSON.parse(await readFile(path.join(oldReview,'catalog.json'),'utf8'));
  await writeFile(path.join(oldReview,'catalog.json'),JSON.stringify(historicalHomeownerCatalog(oldCatalog),null,2));
  let oldHtml=await readFile(path.join(oldReview,'index.html'),'utf8');
  oldHtml=oldHtml.replace('Installer design is unchanged.','These homeowner captures are historical. See the current installer Signal review.');
  if(!oldHtml.includes('id="signal-review-link"'))oldHtml=oldHtml.replace('</nav>','<a id="signal-review-link" href="/design-review/signal/">Current installer Signal review</a></nav>');
  await writeFile(path.join(oldReview,'index.html'),oldHtml);
  return target;
}

/** Preserve the existing homeowner and archived viewers in the same private asset tree. */
export async function prepareReviewAssets(root=process.cwd(),options={}) {
  const target=await prepareHomeownerV3ReviewAssets(root,options);
  return appendSignalReviewAssets(root,target,options);
}
