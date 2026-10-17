import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {modelRecovery,ModelRecovery} from '@/components/results/model-recovery';
import {designV2Example} from '@/config/design-v2-example';
import type {EstimateResult} from '@/lib/calculator/types';

const blocked=(...codes:string[])=>({modelStatus:'unsupported',warnings:codes.map(code=>({code,en:code,th:code}))} as EstimateResult);
describe('model recovery explanations do not remove calculation safeguards',()=>{
  for(const locale of ['en','th'] as const){
    it(`explains battery and expansion separately and offers opt-in only: ${locale}`,()=>{
      const battery=modelRecovery({...designV2Example,projectType:'solar-with-battery'},blocked('unsupported-project'),locale);
      const expansion=modelRecovery({...designV2Example,projectType:'expand-existing'},blocked('unsupported-project'),locale);
      expect(battery.title).not.toBe(expansion.title);
      expect(battery.illustrate).toBe(true);expect(expansion.illustrate).toBe(false);
      const html=renderToStaticMarkup(createElement(ModelRecovery,{guidance:battery,locale,onIllustrate:()=>{throw Error('must not auto-accept');},onReviewQuotation:()=>{}}));
      expect(html).toContain('type="button"');expect(html).not.toContain('checkbox');
      expect(html).toContain(locale==='en'?'See my solar-only estimate':'ดูผลประเมินเฉพาะโซลาร์ของฉัน');
      if(locale==='en')expect(html).toContain('We can estimate your solar panels. Battery costs, savings and backup performance aren’t included yet.');
      expect(html).toContain(locale==='en'?'href="/en/estimate#projectType"':'href="/estimate#projectType"');
      expect(html).not.toContain('rstats');
    });
  }
  it.each(['quote-scope-unknown','unsupported-quote','unsupported-tariff','residential-boundary'])('prioritizes %s over an illustration that cannot resolve it',code=>{
    const guidance=modelRecovery({...designV2Example,projectType:'solar-with-battery'},blocked('unsupported-project',code),'en');
    expect(guidance.illustrate).toBe(false);
    expect(guidance.quotation).toBe(code.includes('quote'));
    expect(guidance.body.length).toBeGreaterThan(50);
  });
  it('does not fabricate an alternative for an unknown blocker',()=>{
    expect(modelRecovery(designV2Example,blocked(),'en').illustrate).toBe(false);
  });
});
