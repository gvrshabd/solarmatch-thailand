import path from 'node:path';
import {readFile,writeFile,mkdir,copyFile,readdir,cp} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const reviewNotes=[
 'The original prototype source is unchanged. Its served reference adds locale/fixture initialization and external-call blocking. Mock controls are isolated by a no-network, no-form policy and do not submit to SolarMatch APIs.',
 'Existing brand, eleven-question order, phone-only contact/OTP, legal Test mode and full consent remain. Disabled collection and global allocation/payment/messaging holds are preserved. No unapproved shortened consent summary was adopted by the application.',
 'Results use the real calculator. Negative 25-year net benefit now leads with the original bilingual negative-net explanation. Simple payback and cumulative-cost crossing remain distinct; unavailable values are not zero. No tariff or model assumption changed.',
 'Real notes, outcomes, claims, withdrawn-record redaction, tenant security and credit/debt/reserve/trial controls remain. Prototype balances and household fixtures are synthetic; the interactive staging account retains its real synthetic history and paused state.',
 'Reference-only demo chrome is omitted from viewport crops, not edited out of the original source. Live staging adds a synthetic-only banner; matched implementation captures omit that staging-only chrome. Larger legal content, 44px controls, accessible navigation, current answer fields and authentic financial states intentionally change some heights and wrapping.',
 'The supplied photos are unchanged. Exact Pexels sources were visually verified for the hero (12284244), palm roof (9875438) and installer (8853507), covering five JPEG files. The current Pexels license was recorded. Exact source identity remains unresolved for roof-tile.jpg and modern-roof.jpg; no license is invented for them. No native-speaker, lawyer or physical-device approval is claimed.',
 'Only staging hosts this viewer. Screenshots use synthetic fixtures. Raw private reports, backups, credentials and browser traces are not published. The viewer needs owner Access only; actual workspace pages additionally require the existing synthetic installer login.'
];
const initial={province:'bangkok',district:'sathon',monthlyBillThb:6000,activelyPlanningSolar:true,planningTimeframe:'within-3-months',projectType:'new-rooftop',propertyType:'detached-home',ownershipStatus:'owner',daytimePattern:'high',daytimeLoads:['air-conditioning','pump','home-office-equipment'],airConditionerCount:5,roofMaterial:'concrete-tile',shade:'almost-none'};
export function exampleLink(lang){return (lang==='en'?'/en':'')+'/estimate/results#sm-estimate='+encodeURIComponent(JSON.stringify({version:1,inputs:initial}));}
export async function prepareReviewAssets(root=process.cwd(),options={}){
 const target=path.resolve(root,options.target??'.wrangler/design-v2-staging-assets');
 // No removal/overwrite of a workspace directory; this folder contains generated assets only.
 await mkdir(target,{recursive:true});await cp(path.join(root,'dist/client'),target,{recursive:true});
 const review=path.join(target,'design-review');await mkdir(path.join(review,'images'),{recursive:true});
 for(const name of ['index.html','viewer.css','viewer.js','open-example.js'])await copyFile(path.join(root,'staging/design-review',name),path.join(review,name));
 for(const lang of ['en','th'])await writeFile(path.join(review,'estimate-'+lang+'.html'),`<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SolarMatch synthetic estimate</title><p>Opening a completed synthetic estimate. No contact details are included.</p><a id="example-link" href="${exampleLink(lang)}">Open estimate</a><script src="open-example.js"></script></html>`);
 // Source is frozen; only the served copy gets locale bootstrap and a module script for the viewer.
 let viewer=await readFile(path.join(review,'index.html'),'utf8');viewer=viewer.replace('<script src="viewer.js">','<script type="module" src="viewer.js">');await writeFile(path.join(review,'index.html'),viewer);
 const source=path.join(root,'docs/design-v2/prototype');const prototype=path.join(review,'prototype');await mkdir(prototype,{recursive:true});
 for(const name of ['index.html','app.js','app.css','engine.min.js'])await copyFile(path.join(source,name),path.join(prototype,name));
 await cp(path.join(source,'img'),path.join(prototype,'img'),{recursive:true});
 let html=await readFile(path.join(prototype,'index.html'),'utf8');html=html.replace('<script src="engine.min.js"','<script src="review-locale.js"></script><script src="engine.min.js"');await writeFile(path.join(prototype,'index.html'),html);
 await writeFile(path.join(prototype,'review-locale.js'),`const reviewParams=new URLSearchParams(location.search),reviewLang=reviewParams.get('lang');
if(['en','th'].includes(reviewLang))localStorage.setItem('sm-lang',reviewLang);
const reviewBill=Number(reviewParams.get('bill')),reviewInputs=${JSON.stringify({...initial,activelyPlanningSolar:initial.planningTimeframe})};
if([1,2000].includes(reviewBill)){sessionStorage.setItem('sm-answers',JSON.stringify({...reviewInputs,monthlyBillThb:reviewBill}));sessionStorage.setItem('sm-refine','{}');}
const reviewStep=Number(reviewParams.get('step'));if(reviewParams.has('step')&&Number.isInteger(reviewStep)&&reviewStep>=0&&reviewStep<11)sessionStorage.setItem('sm-step',JSON.stringify(reviewStep));
// Reference phone numbers are fictional: never launch a real call or external service.
document.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link){const url=new URL(link.href,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/design-review/prototype/')){event.preventDefault();event.stopImmediatePropagation();}}},true);
`);
 await mkdir(path.join(review,'evidence'),{recursive:true});
 for(const file of ['hero-source.jpg','palms-source.jpg','installer-source.jpg','pexels-license.jpg']){const bytes=await readFile(path.join(root,'docs/design-v2-review/photo-evidence',file));if(!bytes.subarray(0,3).equals(Buffer.from([255,216,255])))throw Error('Invalid evidence JPEG');await writeFile(path.join(review,'evidence',file),bytes);}
 const files=(await readdir(path.join(root,'docs/design-v2-comparison'))).filter(name=>/^(viewport-)?(prototype|implementation)-[a-z0-9-]+-(en|th)-(390|1440)\.png$/.test(name)||/^implementation-live-results-(en|th)-390\.jpg$/.test(name));
 const hashes=[];for(const name of files){const file=await readFile(path.join(root,'docs/design-v2-comparison',name));const magic=name.endsWith('.jpg')?[255,216,255]:[137,80,78,71,13,10,26,10];if(!file.subarray(0,magic.length).equals(Buffer.from(magic)))throw Error('Invalid review image: '+name);await writeFile(path.join(review,'images',name),file);hashes.push({name,sha256:createHash('sha256').update(file).digest('hex')});}
 const enquiryPath=options.enquiryId&&/^[a-zA-Z0-9-]{1,100}$/.test(options.enquiryId)?'/installers/enquiry/'+encodeURIComponent(options.enquiryId):'/installers?view=inbox';
 const entries=[['home','Home','home','/'],['results','Results','results','/estimate/results'],['installers','Installer landing','installers','/installers'],['portal','Today','portal','/installers'],['enquiries','Enquiries','enquiries','/installers?view=inbox'],['enquiry-e39','Enquiry detail','enquiry-e39',enquiryPath],['credits','Credits','credits','/installers?view=credits'],['company','Company','company','/installers?view=profile']];
 const pages=entries.map(([id,title,prototype,p])=>({id,title,prototype,paths:Object.fromEntries(['en','th'].map(lang=>[lang,id==='results'?exampleLink(lang):p.startsWith('/installers')?p+(p.includes('?')?'&':'?')+'lang='+lang:(lang==='en'?'/en':'')+p]))}));
 for(let n=1;n<=11;n++)pages.push({id:'question-'+n,title:'Calculator · question '+n,prototype:'estimate',prototypeStep:n-1,paths:{en:'/en/estimate',th:'/estimate'}});
 for(const [id,title,bill]of [['negative','Negative 25-year net benefit',2000],['unavailable','Unavailable simple payback',1]])pages.push({id:'financial-'+id,title,prototype:'results',prototypeBill:bill,fixedFull:true,paths:Object.fromEntries(['en','th'].map(lang=>[lang,(lang==='en'?'/en':'')+'/estimate/results#sm-estimate='+encodeURIComponent(JSON.stringify({version:1,inputs:{...initial,monthlyBillThb:bill}}))]))});
 for(const page of pages)for(const lang of ['en','th'])for(const width of [390,1440])for(const prefix of page.fixedFull||page.id.startsWith('question-')?['']:['','viewport-'])for(const side of ['prototype','implementation']){
  if(!files.includes(`${prefix}${side}-${page.id}-${lang}-${width}.png`))throw Error('Missing matched capture; do not deploy an incomplete review: '+page.id+' / '+lang+' / '+width);
 }
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 const photos=[{title:'Hero · Robert So',source:'https://www.pexels.com/photo/palm-trees-around-house-12284244/',evidence:'evidence/hero-source.jpg'},{title:'Palm roof · Kindel Media',source:'https://www.pexels.com/photo/solar-panel-on-roof-of-house-in-california-usa-9875438/',evidence:'evidence/palms-source.jpg'},{title:'Installer · Los Muertos Crew',source:'https://www.pexels.com/photo/solar-technician-installing-solar-panel-8853507/',evidence:'evidence/installer-source.jpg'}];
 await writeFile(path.join(review,'catalog.json'),JSON.stringify({commit,capturedAt:options.capturedAt??new Date().toISOString(),captureStatus:options.captureStatus??'Matched reference captures plus separate live synthetic result captures; functional exceptions and verification limits listed below.',syntheticOnly:true,pages,notes:reviewNotes,photos,estimates:{en:exampleLink('en'),th:exampleLink('th')},images:hashes},null,2));
 return target;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(await prepareReviewAssets());
