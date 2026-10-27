import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),sharp=createRequire(require.resolve('next/package.json'))('sharp');
const root='docs/design-signal-review',out=path.join(root,'differences');
await mkdir(out,{recursive:true});
async function difference(beforeFile,afterFile,stem,images=true){
 const before=await sharp(beforeFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const after=await sharp(afterFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=before.info;
 if(width!==after.info.width||height!==after.info.height)return {name:stem,dimensionsMatch:false,before:before.info,after:after.info};
 const diff=Buffer.alloc(before.data.length),overlay=Buffer.alloc(before.data.length);let changed=0,above16=0;
 for(let i=0;i<diff.length;i+=4){let delta=0;for(let j=0;j<3;j++){delta=Math.max(delta,Math.abs(before.data[i+j]-after.data[i+j]));overlay[i+j]=Math.round((before.data[i+j]+after.data[i+j])/2);}overlay[i+3]=255;
  if(delta)changed++;if(delta>16)above16++;
  const gray=Math.round((before.data[i]+before.data[i+1]+before.data[i+2])/6);
  diff[i]=delta?255:gray;diff[i+1]=delta?0:gray;diff[i+2]=delta?80:gray;diff[i+3]=255;
 }
 if(images){for(const [kind,bytes]of [['overlay',overlay],['difference',diff]])await sharp(bytes,{raw:{width,height,channels:4}}).png().toFile(path.join(out,kind+'-'+stem));}
 return {name:stem,dimensionsMatch:true,width,height,changedPixels:changed,changedFraction:changed/(width*height),channelDifferenceAbove16Pixels:above16,exactlyEqual:changed===0};
}
const report=JSON.parse(await readFile(path.join(root,'comparison.json'),'utf8')),pairs=[];
for(const item of report.cases)pairs.push(await difference(path.join(root,item.captures.prototype.filename),path.join(root,item.captures.implementation.filename),item.name));
const homeowner=[];
try{for(const name of (await readdir('.wrangler/signal-review/homeowner-before')).filter(n=>n.endsWith('.png')))homeowner.push(await difference('.wrangler/signal-review/homeowner-before/'+name,'.wrangler/signal-review/homeowner-after/'+name,'homeowner-'+name,false));}catch(error){if(error.code!=='ENOENT')throw error;}
const result={unmasked:true,thresholdMeaning:'Exact pixel differences are reported without treating legitimate legal, data, font rendering or accessibility differences as equality.',pairs,homeowner};
await writeFile(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({pairs:pairs.length,dimensionMismatches:pairs.filter(p=>!p.dimensionsMatch).length,homeowner:homeowner.length,homeownerExactlyEqual:homeowner.filter(p=>p.exactlyEqual).length}));
