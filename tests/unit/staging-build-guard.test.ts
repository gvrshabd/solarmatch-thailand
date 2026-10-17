import {afterEach,expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {assertProtectedStagingBuild} from '../../scripts/installer-staging-build-guard.mjs';

const roots:string[]=[];
const markers='console.log("SolarMatch HTTPS staging", "Access denied", "Collection disabled");';
async function fixture(entry:string,files:Record<string,string>={}){
  const root=await mkdtemp(path.join(tmpdir(),'solarmatch-staging-build-'));
  roots.push(root);
  const server=path.join(root,'dist/server');await mkdir(server,{recursive:true});
  const expected={name:'solarmatch-installer-staging',account_id:'staging-account',assets:{binding:'ASSETS',run_worker_first:true},
    vars:{INSTALLER_PLATFORM_MODE:'sandbox',STAGING_ACCESS_AUD:'site-audience',ACCESS_AUD:'admin-audience'},
    d1_databases:[{binding:'DB',database_name:'separate-staging',database_id:'staging-db-id'}],r2_buckets:[{binding:'MEDIA',bucket_name:'separate-staging'}]};
  const built={...structuredClone(expected),topLevelName:expected.name,configPath:path.join(root,'staging/wrangler.jsonc'),main:'index.js',no_bundle:true,preview_urls:false,triggers:{crons:[] as string[]}};
  await writeFile(path.join(server,'wrangler.json'),JSON.stringify(built));
  await writeFile(path.join(server,'index.js'),entry);
  for(const[name,source]of Object.entries(files)){const filename=path.join(server,name);await mkdir(path.dirname(filename),{recursive:true});await writeFile(filename,source);}
  return {root,server,expected,built};
}
afterEach(async()=>{
  for(const root of roots.splice(0)){
    const target=path.resolve(root);
    if(path.dirname(target)!==path.resolve(tmpdir())||!path.basename(target).startsWith('solarmatch-staging-build-'))throw Error('Unsafe fixture cleanup target.');
    await rm(target,{recursive:true,force:true});
  }
});

it('accepts inline protection and a cyclic reachable split static/export/dynamic module graph',async()=>{
  const inline=await fixture(markers+'console.log("STAGING_ACCESS_AUD");');
  expect((await assertProtectedStagingBuild(inline.root,inline.expected)).modules).toBe(1);
  const split=await fixture(markers+'import "./chunks/entry.js";',{
    'chunks/entry.js':'export {audience} from "./access.mjs"; import(`./lazy.js`);',
    'chunks/access.mjs':'import "./entry.js"; export const audience="STAGING_ACCESS_AUD";',
    'chunks/lazy.js':'export default true;',
  });
  expect(await assertProtectedStagingBuild(split.root,split.expected)).toEqual({modules:4,audienceModules:[path.join('chunks','access.mjs')]});
});
it('rejects a stale unimported chunk and imports mentioned only in comments or strings',async()=>{
  const f=await fixture(markers+'// import "./stale.js";\nconst fake=\'import "./stale.js"\';',{'stale.js':'console.log("STAGING_ACCESS_AUD");'});
  await expect(assertProtectedStagingBuild(f.root,f.expected)).rejects.toThrow('audience verification');
});
it('fails closed on missing reachable chunks',async()=>{
  const f=await fixture(markers+'import "./missing.js";console.log("STAGING_ACCESS_AUD");');
  await expect(assertProtectedStagingBuild(f.root,f.expected)).rejects.toThrow();
});
it('rejects an import escaping the built server directory',async()=>{
  const f=await fixture(markers+'import "../outside.js";',{'../outside.js':'console.log("STAGING_ACCESS_AUD");'});
  await expect(assertProtectedStagingBuild(f.root,f.expected)).rejects.toThrow('escapes');
});
it('requires entrypoint protection even when another chunk contains all marker strings',async()=>{
  const f=await fixture('import "./other.js";',{'other.js':markers+'console.log("STAGING_ACCESS_AUD");'});
  await expect(assertProtectedStagingBuild(f.root,f.expected)).rejects.toThrow('entrypoint');
});
it.each(['name','account','source-config','audience','database','bucket','collection-gate','cron'])('rejects mismatched built %s',async change=>{
  const f=await fixture(markers+'console.log("STAGING_ACCESS_AUD");');
  const b=f.built;
  if(change==='name')b.name='production';
  if(change==='account')b.account_id='other';
  if(change==='source-config')b.configPath=path.join(f.root,'wrangler.jsonc');
  if(change==='audience')b.vars.STAGING_ACCESS_AUD='different';
  if(change==='database')b.d1_databases[0].database_id='production-db';
  if(change==='bucket')b.r2_buckets[0].bucket_name='production-bucket';
  if(change==='collection-gate')b.assets.run_worker_first=false;
  if(change==='cron')b.triggers.crons=['* * * * *'];
  await writeFile(path.join(f.server,'wrangler.json'),JSON.stringify(b));
  await expect(assertProtectedStagingBuild(f.root,f.expected)).rejects.toThrow('configuration mismatch');
});
