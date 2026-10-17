import {readdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const root='docs/design-v3-comparison';
const files=(await readdir(`${root}/installer-before`)).filter(file=>file.endsWith('.png')).sort();
const rows=[];
for(const file of files){
  const before=await sharp(`${root}/installer-before/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const after=await sharp(`${root}/installer-after/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const dimensionsMatch=before.info.width===after.info.width&&before.info.height===after.info.height;
  let differingPixels=0,maxChannelDifference=0;
  let minX=Infinity,minY=Infinity,maxX=-1,maxY=-1;
  const diff=Buffer.alloc(before.data.length);
  if(dimensionsMatch){
    for(let i=0;i<before.data.length;i+=4){
      let changed=false;
      for(let channel=0;channel<4;channel++){
        const delta=Math.abs(before.data[i+channel]-after.data[i+channel]);
        if(delta)changed=true;
        maxChannelDifference=Math.max(maxChannelDifference,delta);
      }
      if(changed){
        differingPixels++;diff[i]=255;diff[i+3]=255;
        const pixel=i/4,x=pixel%before.info.width,y=Math.floor(pixel/before.info.width);
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
  }
  const row={file,before:{width:before.info.width,height:before.info.height},after:{width:after.info.width,height:after.info.height},dimensionsMatch,differingPixels:dimensionsMatch?differingPixels:null,maxChannelDifference,bounds:differingPixels?{minX,minY,maxX,maxY}:null};
  rows.push(row);
  if(dimensionsMatch&&differingPixels)await sharp(diff,{raw:{width:before.info.width,height:before.info.height,channels:4}}).png().toFile(`${root}/installer-after/diff-${file}`);
}
await writeFile(`${root}/installer-pixel-comparison.json`,JSON.stringify({method:'Decoded RGBA, exact per-pixel comparison, no tolerance or masking',rows},null,2));
console.log(JSON.stringify(rows,null,2));
