import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const config=JSON.parse(await readFile('.installer-test/preview.jsonc','utf8'));
if(config.name!=='solarmatch-installer-local-test'||config.d1_databases?.[0]?.database_id!=='00000000-0000-0000-0000-000000000006'||config.r2_buckets?.[0]?.bucket_name!=='solarmatch-installer-local-test-private')throw new Error('Fictitious local bindings required.');
const name=process.argv[2];if(!/^objects[a-z0-9-]{1,24}$/.test(name??''))throw new Error('Choose a fresh short objects-prefixed rehearsal name.');
const directory=path.resolve('.wrangler',name);let exists=false;try{await access(directory);exists=true;}catch{}if(exists)throw new Error('Preserve existing rehearsal; choose another name.');
await mkdir(directory,{recursive:true});
const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare'),hash=value=>createHash('sha256').update(value).digest('hex');
const original=new Miniflare({modules:true,script:'export default {}',r2Persist:path.join(directory,'source'),r2Buckets:['MEDIA']});
const restore=new Miniflare({modules:true,script:'export default {}',r2Persist:path.join(directory,'restored'),r2Buckets:['MEDIA']});
try{
  const source=await original.getR2Bucket('MEDIA'),target=await restore.getR2Bucket('MEDIA');
  const key='synthetic/recovery/contract-fixture.pdf';
  const fixture=Buffer.from('%PDF-1.4\n% Synthetic recovery fixture only, not a real contract.\n%%EOF\n');
  await source.put(key,fixture,{httpMetadata:{contentType:'application/pdf'},customMetadata:{synthetic:'true'}});
  const inventory=await source.list();if(inventory.truncated||inventory.objects.length!==1)throw new Error('Unexpected rehearsal inventory.');
  const entries=[];
  for(const item of inventory.objects){const object=await source.get(item.key);const bytes=Buffer.from(await object.arrayBuffer());
    const blob=hash(bytes)+'.bin';await writeFile(path.join(directory,blob),bytes,{flag:'wx',mode:0o600});
    entries.push({key:item.key,size:bytes.length,sha256:hash(bytes),blob,httpMetadata:object.httpMetadata,customMetadata:object.customMetadata});
  }
  await writeFile(path.join(directory,'manifest.json'),JSON.stringify({syntheticOnly:true,realCloudflareRecovery:false,entries},null,2),{flag:'wx',mode:0o600});
  for(const entry of entries){const bytes=await readFile(path.join(directory,entry.blob));if(hash(bytes)!==entry.sha256||bytes.length!==entry.size)throw new Error('Backup checksum mismatch.');if(await target.head(entry.key))throw new Error('Refusing object overwrite.');
    await target.put(entry.key,bytes,{httpMetadata:entry.httpMetadata,customMetadata:entry.customMetadata});
    const recovered=await target.get(entry.key);if(hash(Buffer.from(await recovered.arrayBuffer()))!==entry.sha256||JSON.stringify(recovered.httpMetadata)!==JSON.stringify(entry.httpMetadata)||JSON.stringify(recovered.customMetadata)!==JSON.stringify(entry.customMetadata))throw new Error('Object recovery differs.');
  }
  console.log(JSON.stringify({passed:true,objectsCompared:entries.length,metadataCompared:true,checksumCompared:true,sourcePreserved:true,syntheticOnly:true,realCloudflareRecovery:false,privateDirectory:directory}));
}finally{await original.dispose();await restore.dispose();}
