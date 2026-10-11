import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Package committed source only. Ignored runtime data, backups and keys never enter it.
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
if(git('remote','get-url','origin').trim()!=='https://github.com/gvrshabd/solarmatch-thailand.git')throw new Error('Wrong repository.');
if(git('branch','--show-current').trim()!=='feature/installer-shared-workflow')throw new Error('Wrong branch.');
if(git('status','--porcelain').trim())throw new Error('Commit reviewed changes locally before packaging.');
const files=git('ls-files','-z').split('\0').filter(Boolean);
const safeTestConfigs=new Set(['.installer-test/preview-ipv4.jsonc','.installer-test/preview.jsonc','.installer-test/wrangler.jsonc']);
if(files.some(name=>/(^|\/)(?:\.dev\.vars(?:$|\.)|\.env(?:$|\.)|\.wrangler\/|\.installer-test\/|node_modules\/|dist\/|test-results\/)/u.test(name)&&!safeTestConfigs.has(name)&&!/(?:example|template)$/u.test(name)))throw new Error('Private runtime path is tracked; review before packaging.');
const output=process.argv[2];
if(!output||!path.isAbsolute(output)||!/^SolarMatch-installer-autonomous-review-[\w-]+$/u.test(path.basename(output)))throw new Error('Provide a new absolute SolarMatch review folder.');
await mkdir(output); // deliberately refuses to overwrite an existing review package
const commit=git('rev-parse','HEAD').trim(),main=git('rev-parse','main').trim();
const focusedBase='43d1304ab9c4222dfb9cdf36ad412e29185cc6e7';
execFileSync('git',['archive','--format=zip','--prefix=solarmatch-thailand/','-o',path.join(output,'SolarMatch-source.zip'),commit]);
await writeFile(path.join(output,'against-main.diff'),git('diff','--binary',main,commit));
await writeFile(path.join(output,'focused-autonomous-work.diff'),git('diff','--binary',focusedBase,commit));
await writeFile(path.join(output,'CHANGED_FILES.txt'),git('diff','--name-status',focusedBase,commit));
const copies={
  'IMPLEMENTATION_STATUS.md':'docs/INSTALLER_IMPLEMENTATION_STATUS.md',
  'REMAINING_WORK.md':'docs/INSTALLER_REMAINING_WORK.md',
  'PROVIDER_SETUP.md':'docs/INSTALLER_PROVIDER_SETUP.md',
  'TEST_RESULTS.txt':'docs/installer-autonomous-test-results.txt',
  'BEFORE_LEAVING_LOCAL_MODE.txt':'docs/BEFORE_LEAVING_LOCAL_MODE.txt',
  'PROVIDER_DOMAIN_RESEARCH.txt':'docs/installer-provider-domain-research.txt',
  'RECOVERY_INCIDENT_RUNBOOK.txt':'docs/installer-recovery-incident-runbook.txt',
  'CLAIM_SHUTDOWN_REVIEW.txt':'docs/installer-claim-shutdown-review.txt',
};
for(const [target,source] of Object.entries(copies))await copyFile(source,path.join(output,target));
await writeFile(path.join(output,'READ_ME.txt'),`SolarMatch autonomous local preparation\nRepository: gvrshabd/solarmatch-thailand\nBranch: feature/installer-shared-workflow\nCommit: ${commit}\nPreserved main: ${main}\nFocused base: ${focusedBase}\n\nNo push/deployment/remote migration/provider send/charge/domain purchase occurred.\nSource ZIP is git archive of committed files only, not a backup of private data.\nBoth new migrations are local only. Read TEST_RESULTS and BEFORE_LEAVING_LOCAL_MODE.\nDo not substitute the fictitious installer configuration for production bindings.\nLocal admin: http://127.0.0.1:3000/admin/local-access\nInstaller portal: http://127.0.0.1:3000/installers\nCalculator: http://127.0.0.1:3000/estimate or /en/estimate\nSigning keys/captures/private databases are intentionally absent.\nThe loopback preview stops if the computer shuts down; its private persisted data remains.\n`);
const names=['SolarMatch-source.zip','against-main.diff','focused-autonomous-work.diff','CHANGED_FILES.txt','READ_ME.txt',...Object.keys(copies)];
const manifest=[];
for(const name of names){const file=path.join(output,name);manifest.push({file:name,bytes:(await stat(file)).size,sha256:createHash('sha256').update(await readFile(file)).digest('hex')});}
const document=JSON.stringify({repository:'gvrshabd/solarmatch-thailand',branch:'feature/installer-shared-workflow',commit,main,focusedBase,createdAt:new Date().toISOString(),source:'committed-git-archive',privateRuntimeExcluded:true,files:manifest},null,2)+'\n';
await writeFile(path.join(output,'MANIFEST.json'),document);
await writeFile(path.join(output,'SHA256SUMS.txt'),manifest.map(item=>`${item.sha256}  ${item.file}`).join('\n')+`\n${createHash('sha256').update(document).digest('hex')}  MANIFEST.json\n`);
console.log(JSON.stringify({output,commit,main,files:manifest.length,zip:manifest[0],privateRuntimeExcluded:true}));
