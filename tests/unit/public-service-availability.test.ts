import {beforeEach, expect, it, vi} from 'vitest';
import {phoneCollectionReady} from '@/lib/installer/collection-readiness';
import {supportChannels} from '@/config/support';
import type {PublicAssessmentConfig} from '@/lib/questionnaire/types';
const published = vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/releases',()=>({getPublicAssessmentConfig:published}));
import {GET} from '@/app/api/service-status/route';

const config = {assessmentToken:'synthetic-only',liveLeadSubmissions:true,contact:{enabled:true,mode:'shared_solar_company_handoff'}} as PublicAssessmentConfig;
beforeEach(()=>{published.mockReset();});
it('projects public availability without token, legal versions, internal settings or private preview',async()=>{
  published.mockResolvedValue(config);
  const response=await GET();
  expect(await response.json()).toEqual({contactAvailable:true});
  expect(published).toHaveBeenCalledWith(); // no restricted session/request inherited
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
it('fails closed for disabled collection, absent token and configuration outages',async()=>{
  for(const value of [{...config,liveLeadSubmissions:false},{...config,assessmentToken:null},{...config,contact:{...config.contact,enabled:false}}]){
    published.mockResolvedValue(value);expect(await (await GET()).json()).toEqual({contactAvailable:false});
  }
  published.mockRejectedValue(new Error('internal configuration diagnostic'));
  expect(await (await GET()).json()).toEqual({contactAvailable:false});
});
it('requires compatible phone provider gates before offering phone-only collection',()=>{
  const live={INSTALLER_PLATFORM_MODE:'production',OUTBOUND_MESSAGES_ENABLED:'true',SMS_PROVIDER_MODE:'live',SMS_LIVE_ENABLED:'true',SMS_ACCOUNT_SID:'AC'+'a'.repeat(32),SMS_AUTH_TOKEN:'synthetic',SMS_FROM:'+66812345678'};
  expect(phoneCollectionReady(live)).toBe(true);
  for(const changes of [{INSTALLER_PLATFORM_MODE:'off'},{OUTBOUND_MESSAGES_ENABLED:'false'},{SMS_PROVIDER_MODE:'off'},{SMS_LIVE_ENABLED:'false'},{SMS_CREDENTIALS_ARE_TEST:'true'},{SMS_AUTH_TOKEN:''},{SMS_FROM:''}]){
    expect(phoneCollectionReady({...live,...changes})).toBe(false);
  }
  expect(phoneCollectionReady({...live,INSTALLER_PLATFORM_MODE:'sandbox',SMS_PROVIDER_MODE:'sandbox',SMS_LIVE_ENABLED:'false',SMS_CREDENTIALS_ARE_TEST:'true'})).toBe(true);
  expect(phoneCollectionReady({INSTALLER_PLATFORM_MODE:'local-test'})).toBe(true);
});
it('never builds public support links from placeholders, header injection or invalid numbers',()=>{
  expect(supportChannels()).toMatchObject({email:'',phone:''});
  for(const email of ['[GENERAL_EMAIL]','help@example.invalid','help@example.test','help@example.com\r\nBcc:other@example.com','javascript:alert(1)']){
    expect(supportChannels({email}).emailHref).toBe('');
  }
  expect(supportChannels({email:'help@solarmatch.co.th',phone:'081 234 5678'})).toMatchObject({emailHref:'mailto:help@solarmatch.co.th',phoneHref:'tel:0812345678'});
  expect(supportChannels({phone:'[PHONE]'}).phoneHref).toBe('');
});
