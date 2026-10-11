import {describe,it,expect} from 'vitest';
import {ATTRIBUTION_CATALOG} from '@/lib/analytics/attribution';
import {campaignStorageKey,readCampaign,rememberCampaign} from '@/lib/analytics/browser-attribution';
const config={enabled:true,catalog:ATTRIBUTION_CATALOG};
function storage(){const values=new Map<string,string>();return {values,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};}
describe('safe tab-session campaign context',()=>{
  it('carries safe landing codes across calculator/language routes without raw query or identity',()=>{
    const state=storage();rememberCampaign(state,new URLSearchParams('utm_campaign=pilot-search&utm_source=google&utm_medium=cpc&phone=0931111111&token=private'),config);
    rememberCampaign(state,new URLSearchParams(),config);expect(readCampaign(state,config)).toEqual(ATTRIBUTION_CATALOG[2]);
    expect([...state.values.values()].join()).not.toMatch(/0931111111|private|phone|token|utm_/);
  });
  it('default-off stores nothing and disabling erases a previous safe context',()=>{
    const state=storage();rememberCampaign(state,new URLSearchParams(),config);rememberCampaign(state,new URLSearchParams(),{enabled:false,catalog:[]});
    expect(state.values.size).toBe(0);expect(readCampaign(state,{enabled:false,catalog:[]})).toBeUndefined();
  });
  it('tampered session values and unknown free text never enter a payload',()=>{
    const state=storage();state.setItem(campaignStorageKey,JSON.stringify({campaign:'person-name',source:'https://example.test',medium:'phone'}));expect(readCampaign(state,config)).toBeUndefined();
    rememberCampaign(state,new URLSearchParams('utm_campaign=someone&utm_source=google&utm_medium=cpc'),config);expect(readCampaign(state,config)).toEqual(ATTRIBUTION_CATALOG[1]);
  });
  it('denied storage cannot break the calculator',()=>{const state={getItem:()=>{throw new Error('denied');},setItem:()=>{throw new Error('denied');},removeItem:()=>{throw new Error('denied');}};expect(()=>rememberCampaign(state,new URLSearchParams(),config)).not.toThrow();expect(readCampaign(state,config)).toBeUndefined();});
});
