import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:'local-test',PHONE_VERIFICATION_SECRET:'fixture-secret-at-least-32-characters'})}));
import {defaultInstallerSettings,installerSettingsSchema,installerTermsFor,materialTermsChanged,withinDeliveryHours} from '@/lib/installer/settings';
import {normalizeServiceArea} from '@/lib/installer/service-areas';
import {FixtureDatabase,seedFixture} from '../installer/fixtures';
import {getPortalData} from '@/lib/installer/portal-data';
import {allocateEnquiry,grantTrial} from '@/lib/installer/deliveries';
import {seedLead} from '../installer/fixtures';
describe('validated commercial configuration',()=>{
 it('preserves launch defaults and permits bounded changes',()=>{expect(defaultInstallerSettings).toMatchObject({creditValueMinor:20000,sharedCredits:2,packageCredits:20,claimDays:7,trialDeliveries:2,startHour:9,endHour:17});expect(installerSettingsSchema.parse({sharedCredits:3,creditValueMinor:30000,claimDays:14,startHour:8,endHour:18}).sharedCredits).toBe(3);});
 it('rejects invalid money, trial permissions, sharing caps and delivery hours',()=>{for(const value of [{creditValueMinor:0},{packageCredits:1.5},{trialDeliveries:3},{recipientLimit:4},{exclusiveEnabled:true},{startHour:17,endHour:9},{startHour:9,endHour:9}])expect(installerSettingsSchema.safeParse(value).success).toBe(false);});
 it('uses configured Bangkok business hours',()=>{expect(withinDeliveryHours(new Date('2026-10-11T01:00:00Z'),{startHour:8,endHour:18})).toBe(true);expect(withinDeliveryHours(new Date('2026-10-11T01:00:00Z'))).toBe(false);});
 it('renders configured commercial values in both languages and detects material changes',()=>{const changed=installerSettingsSchema.parse({...defaultInstallerSettings,creditValueMinor:30000,sharedCredits:3,packageCredits:30,packageAmountMinor:900000,claimDays:14});const terms=installerTermsFor(changed);expect(terms.en).toContain('฿300');expect(terms.en).toContain('30 credits for ฿9,000');expect(terms.th).toContain('14 วัน');expect(materialTermsChanged(defaultInstallerSettings,changed)).toBe(true);});
 it('normalizes Thai/English provinces while retaining custom areas',()=>{expect(normalizeServiceArea('Bangkok')).toBe('bangkok');expect(normalizeServiceArea('กรุงเทพมหานคร')).toBe('bangkok');expect(normalizeServiceArea('Pathum Thani')).toBe('pathum-thani');expect(normalizeServiceArea(' Custom Area ')).toBe('custom area');});
});
describe('configuration snapshots and portal projection',()=>{
 let fixture:FixtureDatabase;
 beforeEach(async()=>{fixture=new FixtureDatabase();await seedFixture(fixture.d1());});afterEach(()=>fixture.close());
 it('requires a new terms version for material changes and reflects configured prices',async()=>{
  const changed={...defaultInstallerSettings,sharedCredits:3,packageCredits:30,packageAmountMinor:600000,termsVersion:'installer-terms-v2'};
  expect(()=>fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...changed,termsVersion:defaultInstallerSettings.termsVersion}))).toThrow('new terms version');
  fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify(changed));
  const portal=await getPortalData(fixture.d1(),{user:{id:'no-membership',email:'synthetic@example.test',emailVerified:true,name:'Synthetic'}});
  expect(portal.products[0].creditCost).toBe(3);expect(portal.packages[0]).toMatchObject({credits:30,amountMinor:600000});expect(portal.terms.textEn).toContain('30 credits');
 });
 it('grants configured trial units and rejects missing contract dates at allocation',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));
  try{
   const config={...defaultInstallerSettings,collectionEnabled:true,deliveryPaused:false,trialDeliveries:1,termsVersion:'configured-trial-v2'};
   fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify(config));
   fixture.sqlite.prepare('UPDATE solar_company_partners SET terms_version=?').run(config.termsVersion);
   await grantTrial(fixture.d1(),'synthetic-company-1','fixture');
   expect(fixture.sqlite.prepare('SELECT trial_remaining FROM installer_credit_accounts WHERE company_id=?').get('synthetic-company-1')?.trial_remaining).toBe(1);
   const lead=await seedLead(fixture.d1());
   fixture.sqlite.prepare('UPDATE solar_company_partners SET contract_expiry_date=NULL WHERE id=?').run('synthetic-company-1');
   expect((await allocateEnquiry(fixture.d1(),lead.enquiryId,'fixture',['synthetic-company-1'])).allocated).toHaveLength(0);
  }finally{vi.useRealTimers();}
 });
 it('atomically rejects a retired terms version while permitting same-version nonmaterial updates',async()=>{
  const versionOne={...defaultInstallerSettings,termsVersion:'recorded-version-one'};
  const versionTwo={...defaultInstallerSettings,termsVersion:'recorded-version-two',sharedCredits:3};
  await fixture.d1().batch([
   fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify(versionOne)),
   fixture.d1().prepare('INSERT INTO installer_settings_revisions(id,config_json,actor,created_at) VALUES(?,?,?,?)').bind('revision-one',JSON.stringify(versionOne),'fixture',new Date().toISOString()),
  ]);
  await fixture.d1().batch([
   fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify(versionTwo)),
   fixture.d1().prepare('INSERT INTO installer_settings_revisions(id,config_json,actor,created_at) VALUES(?,?,?,?)').bind('revision-two',JSON.stringify(versionTwo),'fixture',new Date().toISOString()),
  ]);
  fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({...versionTwo,deliveryPaused:false}));
  await expect(fixture.d1().batch([
   fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({...versionTwo,termsVersion:versionOne.termsVersion})),
   fixture.d1().prepare('INSERT INTO installer_settings_revisions(id,config_json,actor,created_at) VALUES(?,?,?,?)').bind('bad-revision',JSON.stringify(versionOne),'fixture',new Date().toISOString()),
  ])).rejects.toThrow('historical terms version');
  expect(fixture.sqlite.prepare('SELECT id FROM installer_settings_revisions WHERE id=?').get('bad-revision')).toBeUndefined();
  expect(JSON.parse(String(fixture.sqlite.prepare('SELECT config_json FROM installer_platform_settings WHERE id=1').get()?.config_json)).termsVersion).toBe(versionTwo.termsVersion);
 });
});
