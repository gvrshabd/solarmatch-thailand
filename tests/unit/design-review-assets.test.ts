import {it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {exampleLink} from '../../scripts/design-v2-review-assets.mjs';
import {restoreSharedEstimate} from '@/lib/design-v2/share-estimate';
it('keeps every original handoff file frozen',()=>{
 const manifest=JSON.parse(readFileSync('docs/design-v2/REVIEW_MANIFEST.json','utf8'));
 for(const file of manifest.files)expect(createHash('sha256').update(readFileSync('docs/design-v2/'+file.path)).digest('hex')).toBe(file.sha256);
 expect(manifest.files).toHaveLength(39);
});
it('review example links round trip only permitted synthetic inputs, without consent or contact',()=>{
 for(const lang of ['en','th']){
  const url=new URL(exampleLink(lang),'https://solarmatch-installer-staging.deluxejahseh.workers.dev');
  const answers=restoreSharedEstimate(url.hash);expect(answers.monthlyBillThb).toBe(6000);expect(answers.quoteContactRequested).toBe(false);expect(answers.quoteConsentAccepted).toBeUndefined();expect(url.search).toBe('');
 }
});
it('does not package review assets through production public routes or its Worker',()=>{
 expect(existsSync('public/design-review')).toBe(false);expect(existsSync('app/design-review')).toBe(false);
 expect(readFileSync('worker.ts','utf8')).not.toContain('staging-design-review');
 const packager=readFileSync('scripts/design-v2-review-assets.mjs','utf8');expect(packager).toContain("'.wrangler/design-v2-staging-assets'");expect(packager).not.toContain("cp(path.join(root,'docs/design-v2-comparison')");
});
