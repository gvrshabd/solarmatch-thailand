import {describe,it,expect} from 'vitest';
import {designV2Example} from '@/config/design-v2-example';
import {calculateEstimate} from '@/lib/calculator';
import {lifetimeCrossing,payback} from '@/lib/design-v2/figures';
import {permittedEstimateInputs,restoreSharedEstimate,sharedEstimateUrl} from '@/lib/design-v2/share-estimate';
describe('Design v2 real calculator presentation',()=>{
 it('retains the full Sathon example and negative-net model without rewriting verdicts',()=>{
  const normal=calculateEstimate(designV2Example),low=calculateEstimate({...designV2Example,monthlyBillThb:2000});
  expect(normal.planningMonthlySavingsThb).toBe(1665);expect(normal.planningInstalledCostThb).toBe(165000);expect(normal.planningSystemKw).toBe(4.5);
  expect(low.planningTwentyFiveYearNetBenefitThb).toBe(-9000);expect(low.recommendation).toBe('worth-comparing');expect(lifetimeCrossing(low.lifetimeCostSeries)).toBeNull();
  const crossing=lifetimeCrossing(normal.lifetimeCostSeries);expect(crossing?.year).toBeGreaterThan(normal.planningPaybackYears!);expect(payback(null)).toBe('—');
 });
 it('round-trips allowed answers/refinements without contact or consent',()=>{
  const source={...designV2Example,roofDirection:'east' as const,exactRoofAreaSqm:62,electricityPhase:'three' as const,quoteContactRequested:true,quoteConsentAccepted:true};
  const url=new URL(sharedEstimateUrl(source,'https://example.test','en')),restored=restoreSharedEstimate(url.hash);
  expect(url.search).toBe('');expect(restored.quoteContactRequested).toBe(false);expect(restored.quoteConsentAccepted).toBeUndefined();
  expect(calculateEstimate(restored).planningMonthlySavingsThb).toBe(calculateEstimate(source).planningMonthlySavingsThb);
 });
 it('never includes arbitrary personal/contact/text/map/token fields',()=>{
  const source={...designV2Example,district:'my private address',customLocation:'secret address',customPropertyType:'private name',phone:'0812345678',email:'secret@example.test',token:'secret',location:{address:'private exact address',latitude:13.7,longitude:100.5,province:'bangkok',source:'manual-map' as const,confirmed:true}};
  const encoded=JSON.stringify(permittedEstimateInputs(source));
  for(const value of ['secret','0812345678','private','latitude','longitude','quoteConsentAccepted'])expect(encoded).not.toContain(value);
 });
 it('rejects malformed, oversized, future versions, unknown fields and unconfigured districts',()=>{
  for(const fragment of ['#sm-estimate=%xx','#sm-estimate='+encodeURIComponent('{"version":9}'),'#sm-estimate='+'a'.repeat(6000)])expect(()=>restoreSharedEstimate(fragment)).toThrow();
  const payload=permittedEstimateInputs(designV2Example);
  expect(()=>restoreSharedEstimate('#sm-estimate='+encodeURIComponent(JSON.stringify({...payload,token:'not-allowed'})))).toThrow();
  expect(()=>restoreSharedEstimate('#sm-estimate='+encodeURIComponent(JSON.stringify({...payload,inputs:{...payload.inputs,district:'not-real'}})))).toThrow();
 });
});
