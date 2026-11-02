import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

/** Only known non-PII synthetic public-screen captures enter the protected viewer. */
export async function appendReadinessReview(root,target) {
 const source=path.resolve(root,'.wrangler/readiness-images');
 let names;try{names=await readdir(source);}catch(error){if(error.code==='ENOENT')return;throw error;}
 const images=names.filter(name=>/^(?:form-(?:en|th)|availability-(?:en|th)-(?:true|false)|refresh-(?:en|th)-(?:terms|disabled|questionnaire))-(?:desktop|mobile)-chromium\.png$/.test(name)).sort();
 if(!images.length)return;
 if(!path.resolve(target).startsWith(path.resolve(root,'.wrangler')+path.sep))throw Error('Private staging asset tree required');
 const review=path.join(target,'design-review/readiness');await mkdir(path.join(review,'images'),{recursive:true});
 for(const name of images){
  const bytes=await readFile(path.join(source,name));
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('PNG required');
  await writeFile(path.join(review,'images',name),bytes);
 }
 await writeFile(path.join(review,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SolarMatch launch readiness review</title>
 <style>body{font:16px system-ui;background:#f6f5ef;color:#18392b;margin:0 auto;padding:24px;max-width:1000px}a{color:inherit;text-underline-offset:3px}nav{display:flex;gap:20px;flex-wrap:wrap}summary{padding:18px 0;cursor:pointer;min-height:44px}img{display:block;width:100%;height:auto}details{border-bottom:1px solid #c3ccbd}p{line-height:1.6}</style>
 <h1>Launch readiness review</h1><p>3 November 2026 · Synthetic local browser captures. Enabled examples are intercepted test fixtures, not active staging collection. No screenshot proves external message delivery or provider approval.</p>
 <nav><a href="/en/estimate">English calculator</a><a href="/estimate">เครื่องคำนวณภาษาไทย</a><a href="/design-review/signal/">Installer comparison</a><a href="/design-review/">Homeowner comparison</a></nav>
 <p>Availability follows the server; restored answers require the exact questionnaire/rules; changed terms require fresh consent. Changed questionnaire versions close submission while preserving results. Support channels and real provider acceptance remain outstanding. Approved design, calculations and legal wording are preserved.</p>
 ${images.map(name=>`<details><summary>${name.replace('.png','').replaceAll('-',' ')}</summary><p><a href="images/${name}">Open full-size image / zoom</a></p><a href="images/${name}"><img src="images/${name}" loading="lazy" alt="${name.replace('.png','').replaceAll('-',' ')}"></a></details>`).join('')}</html>`);
}
