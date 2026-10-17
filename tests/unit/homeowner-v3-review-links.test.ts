import {describe,it,expect} from 'vitest';
import {exampleLink} from '../../scripts/homeowner-v3-review-assets.mjs';
import {restoreSharedEstimate,permittedEstimateInputs} from '@/lib/design-v2/share-estimate';
import {attributionFixture} from '../../scripts/calculator-benefit-attribution-v3';
import {calculateEstimate} from '@/lib/calculator';
describe('v3 protected comparison links',()=>{
  it('opens exactly the captured fixture without contact, consent or arbitrary fields',()=>{
    const url=new URL(exampleLink('th'),'https://example.test');
    const parsed=JSON.parse(decodeURIComponent(url.hash.split('=')[1]));
    expect(parsed).toEqual(permittedEstimateInputs({...attributionFixture,estimateModelVersion:'energy-v3'}));
    expect(parsed.inputs.quoteConsentAccepted).toBeUndefined();
    expect(parsed.inputs.quoteContactRequested).toBeUndefined();
    expect(calculateEstimate(restoreSharedEstimate(url.hash)).planningTwentyFiveYearNetBenefitThb).toBeCloseTo(574776.422557525,2);
  });
  it('links to actual negative, unavailable and unsupported states, not a positive substitute',()=>{
    const model=(state:string)=>calculateEstimate(restoreSharedEstimate(new URL(exampleLink('en',state),'https://example.test').hash));
    expect(model('results-negative').planningTwentyFiveYearNetBenefitThb).toBeLessThan(0);
    expect(model('results-no-payback').planningPaybackYears).toBeNull();
    expect(model('results-no-feasible').modelStatus).toBe('no-feasible-option');
    expect(model('results-unsupported').modelStatus).toBe('unsupported');
    expect(model('results-exact-quote').planningInstalledCostThb).toBe(150123.45);
  });
});
