import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { appendSignalReviewAssets, buildSignalCatalog, historicalHomeownerCatalog, signalImplementationPath } from '../../scripts/signal-review-assets.mjs';
import { reviewContentSecurityPolicy, stagingDesignAsset } from '@/lib/server/staging-design-review';

const capture=()=>({fixedNow:'2026-10-27T03:00:00.000Z',cases:[{name:'credits-payment-en-phone.png',route:'credits',lang:'en',state:'payment',menu:'',original:{width:780,height:1688},captures:{prototype:{filename:'prototype-credits-payment-en-phone.png',width:780,height:1688,url:'http://localhost:3000/?secret=PRIVATE_RAW_REPORT',metrics:{private:'PRIVATE_RAW_REPORT'}},implementation:{filename:'implementation-credits-payment-en-phone.png',width:780,height:1700}},errors:[]}]});

describe('protected Signal review assets',()=>{
  it('keeps the original supplied handoff frozen',()=>{
    const manifest=JSON.parse(readFileSync('docs/design-signal-review/SOURCE_MANIFEST.json','utf8'));
    expect(manifest.screenshots).toBe(52);
    const references=readdirSync('docs/design-signal/solarmatch-installer-signal/reference').filter(name=>name.endsWith('.png'));
    expect(references).toHaveLength(52);
    expect(manifest.files.filter((file:{path:string})=>file.path.startsWith('reference/'))).toHaveLength(52);
    for(const file of manifest.files)expect(createHash('sha256').update(readFileSync('docs/design-signal/solarmatch-installer-signal/'+file.path)).digest('hex'),file.path).toBe(file.sha256);
  });
  it('packages a small synthetic catalog without raw URLs, metrics or error reports',()=>{
    const catalog=buildSignalCatalog(capture());
    expect(catalog.syntheticOnly).toBe(true);
    expect(catalog.cases[0].original.file).toBe('reference-credits-payment-en-phone.png');
    expect(catalog.cases[0].implementation).toBe('/installers?lang=en&view=credits');
    expect(JSON.stringify(catalog)).not.toContain('PRIVATE_RAW_REPORT');
    expect(JSON.stringify(catalog)).not.toContain('localhost');
    expect(catalog.cases[0].notes.join(' ')).toContain('fictional illustration');
  });
  it('requires paired captures and rejects traversal, menu injection and incomplete evidence',()=>{
    const missing=capture();delete (missing.cases[0].captures as Partial<typeof missing.cases[0]['captures']>).implementation;
    expect(()=>buildSignalCatalog(missing)).toThrow('Complete paired');
    const traversal=capture();traversal.cases[0].captures.implementation.filename='../private.png';
    expect(()=>buildSignalCatalog(traversal)).toThrow('Complete paired');
    const badName=capture();badName.cases[0].name='../credits-payment-en-phone.png';
    expect(()=>buildSignalCatalog(badName)).toThrow('Invalid or duplicate');
    const badMenu=capture();badMenu.cases[0].menu='PRIVATE_RAW_REPORT';expect(()=>buildSignalCatalog(badMenu)).toThrow('Invalid Signal menu');
  });
  it('uses only an explicitly supplied existing enquiry and never a screenshot fixture UUID',()=>{
    expect(signalImplementationPath('e39','th')).toBe('/installers?lang=th&view=inbox');
    expect(signalImplementationPath('e39','en','00000000-0000-4000-8000-000000000039')).toBe('/installers?lang=en&view=inbox');
    expect(signalImplementationPath('e39','en','../api/installer')).toBe('/installers?lang=en&view=inbox');
    expect(signalImplementationPath('e39','en','existing-staging-enquiry')).toBe('/installers/enquiry/existing-staging-enquiry?lang=en');
    expect(signalImplementationPath('company','th','existing-staging-enquiry')).toBe('/installers?lang=th&view=profile');
  });
  it('cannot append into production public assets and uses no-connect compatible scripts',async()=>{
    await expect(appendSignalReviewAssets(process.cwd(),'public/design-review')).rejects.toThrow('private .wrangler');
    expect(existsSync('public/design-review')).toBe(false);
    const html=readFileSync('staging/signal-review/index.html','utf8'),viewer=readFileSync('staging/signal-review/viewer.js','utf8'),guard=readFileSync('staging/signal-review/guard.js','utf8');
    expect(html).toContain('<script src="catalog.js" defer>');expect(html).not.toMatch(/<script(?![^>]*src=)[^>]*>/);
    expect(viewer).not.toContain('fetch(');expect(viewer).not.toContain('innerHTML');
    expect(guard).toContain('event.preventDefault()');expect(guard).toContain('window.XMLHttpRequest.prototype.open=blocked');expect(guard).toContain('window.WebSocket=blocked');
    expect(readFileSync('scripts/signal-review-assets.mjs','utf8')).toContain("from './homeowner-v3-review-assets.mjs'");
  });
  it('keeps the staging allowlist exact and excludes raw reports and private files',()=>{
    const paths=JSON.parse(readFileSync('staging/signal-review/allowed-paths.json','utf8')) as string[];
    expect(paths).toHaveLength(273);expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every(value=>value.startsWith('/design-review/signal'))).toBe(true);
    expect(paths.join('\n')).not.toMatch(/comparison\.json|SOURCE_MANIFEST|trace|\.env|\/api\/|allowed-paths\.json/);
    for(const item of ['index.html','viewer.js','viewer.css','catalog.js','prototype/index.html','prototype/guard.js'])expect(paths).toContain('/design-review/signal/'+item);
  });
  it('serves every exact Signal path and fails closed on unknown names, encoded traversal and private reports',()=>{
    const paths=JSON.parse(readFileSync('staging/signal-review/allowed-paths.json','utf8')) as string[];
    for(const path of paths)expect(stagingDesignAsset(path),path).toBe(true);
    for(const path of ['/design-review/signal/comparison.json','/design-review/signal/allowed-paths.json','/design-review/signal/SOURCE_MANIFEST.json','/design-review/signal/.env','/design-review/signal/prototype/../../comparison.json','/design-review/signal/prototype/%2e%2e/comparison.json','/design-review/signal/images/implementation-real-customer-en-phone.png','/design-review/signal/images/implementation-credits-en-phone.png/extra','/design-review/signal/images/implementation-credits-en-phone.png?secret=yes','/design-review/signal/viewer.js.bak','/design-review/signal/prototype/secret.js','/design-review/signal-other/viewer.js','/api/installer/portal'])expect(stagingDesignAsset(path),path).toBe(false);
    for(const directive of ["script-src 'self'","connect-src 'none'","form-action 'none'","object-src 'none'","frame-ancestors 'self'"])expect(reviewContentSecurityPolicy).toContain(directive);
  });
  it('clarifies only the served historical homeowner catalog and preserves its other evidence',()=>{
    const catalog={notes:['Original homeowner evidence','Only homeowner pages adopt v3. Installer landing and workspace retain their existing design.'],images:[{name:'original.png',sha256:'original'}]};
    const adjusted=historicalHomeownerCatalog(catalog);
    expect(adjusted.notes[1]).toContain('/design-review/signal/');expect(adjusted.notes[1]).toContain('historical');
    expect(adjusted.notes[0]).toBe(catalog.notes[0]);expect(adjusted.images).toEqual(catalog.images);expect(catalog.notes[1]).toContain('retain their existing design');
  });
});
