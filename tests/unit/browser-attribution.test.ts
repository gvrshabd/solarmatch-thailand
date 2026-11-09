import {describe,it,expect} from 'vitest';
import {ATTRIBUTION_CATALOG} from '@/lib/analytics/attribution';
import {campaignStorageKey,readCampaign,rememberCampaign} from '@/lib/analytics/browser-attribution';
import {readCampaignConsent,saveCampaignConsent} from '@/lib/analytics/campaign-consent';
const config={enabled:true,catalog:ATTRIBUTION_CATALOG};
function storage(){const values=new Map<string,string>();return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};}
describe('safe tab-session campaign context',()=>{
  it('carries safe landing codes across calculator/language routes without raw query or identity',()=>{
    const state = storage();
    const consent = saveCampaignConsent(storage(), 'accepted');
    rememberCampaign(state,new URLSearchParams('utm_campaign=pilot-search&utm_source=google&utm_medium=cpc&phone=0931111111&token=private'),config,consent);
    rememberCampaign(state,new URLSearchParams(),config,consent);expect(readCampaign(state,config,consent)).toEqual(ATTRIBUTION_CATALOG[2]);
    expect([...state.values.values()].join()).not.toMatch(/0931111111|private|phone|token|utm_/);
  });
  it('default-off stores nothing and disabling erases a previous safe context',()=>{
    const state=storage();
    const consent = saveCampaignConsent(storage(), 'accepted');
    rememberCampaign(state,new URLSearchParams(),config,consent);
    expect(readCampaign(state,config,consent)).toEqual(ATTRIBUTION_CATALOG[0]);
    rememberCampaign(state,new URLSearchParams(),{enabled:false,catalog:[]},consent);
    expect(state.values.size).toBe(0);expect(readCampaign(state,{enabled:false,catalog:[]})).toBeUndefined();
  });
  it('tampered session values and unknown free text never enter a payload',()=>{
    const state=storage();
    const consent = saveCampaignConsent(storage(), 'accepted')!;
    state.setItem(campaignStorageKey,JSON.stringify({consentAt:consent.decidedAt,codes:{campaign:'person-name',source:'https://example.test',medium:'phone'}}));
    expect(readCampaign(state,config,consent)).toBeUndefined();
    rememberCampaign(state,new URLSearchParams('utm_campaign=someone&utm_source=google&utm_medium=cpc'),config,consent);
    expect(readCampaign(state,config,consent)).toEqual(ATTRIBUTION_CATALOG[1]);
  });
  it('requires a recorded opt-in and does not revive a prior choice’s campaign context',()=>{
    const state = storage();
    const choices = storage();
    const search = new URLSearchParams('utm_campaign=pilot-search&utm_source=google&utm_medium=cpc');
    rememberCampaign(state,search,config);
    expect(state.getItem(campaignStorageKey)).toBeNull();
    const accepted = saveCampaignConsent(choices, 'accepted')!;
    expect(readCampaignConsent(choices)).toEqual(accepted);
    rememberCampaign(state,search,config,accepted);
    expect(readCampaign(state,config,accepted)).toEqual(ATTRIBUTION_CATALOG[2]);
    const rejected = saveCampaignConsent(choices, 'rejected');
    expect(readCampaign(state,config,rejected)).toBeUndefined();
    expect(readCampaign(state,config,{ ...accepted, decidedAt: '2030-01-01T00:00:00.000Z' })).toBeUndefined();
    rememberCampaign(state,search,config,rejected);
    expect(state.getItem(campaignStorageKey)).toBeNull();
  });
  it('denied storage cannot break the calculator',()=>{const state={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');},removeItem:()=>{throw new Error('denied');}};expect(()=>rememberCampaign(state,new URLSearchParams(),config)).not.toThrow();expect(readCampaign(state,config)).toBeUndefined();});
});
