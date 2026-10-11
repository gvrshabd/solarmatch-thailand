import {beforeEach,expect,it,vi} from 'vitest';
import {stagingIdentity,stagingRoute,type StagingAccessEnv} from '@/lib/server/staging-access';
import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
import {unstable_splitSqlQuery} from 'wrangler';
import {triggerSafeStatement} from '../../scripts/installer-staging-migration-transport.mjs';
const verify=vi.hoisted(()=>vi.fn());
vi.mock('jose',()=>({jwtVerify:verify,createRemoteJWKSet:vi.fn(()=>({}))}));
const origin='https://solarmatch-installer-staging.deluxejahseh.workers.dev';
const env:StagingAccessEnv={INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:origin,STAGING_ACCESS_AUD:'staging-site',ACCESS_AUD:'staging-admin',ACCESS_TEAM_DOMAIN:'https://team.example.test',ADMIN_EMAILS:'owner@example.test'};
beforeEach(()=>{verify.mockReset();});
it('exempts only the exact LINE path, not its children or other APIs',()=>{
  expect(stagingRoute(new Request(origin+'/api/installer/webhooks/line'),env)).toBe('signed-webhook');
  for(const route of ['/api/installer/webhooks/line/','/api/installer/webhooks/line/admin','/api/leads','/admin','/assets/file'])expect(stagingRoute(new Request(origin+route),env)).toBe('access');
});
it('blocks fixture, local administrator and scheduled routes remotely',()=>{
  for(const path of ['/api/installer/test','/admin/local-access','/admin/api/local-session','/__scheduled'])expect(stagingRoute(new Request(origin+path),env)).toBe('local-only');
  expect(stagingRoute(new Request('https://other.example.test/admin'),env)).toBe('deny');
  expect(stagingRoute(new Request(origin),{...env,INSTALLER_PLATFORM_MODE:'local-test'})).toBe('deny');
});
it('fails closed on missing configuration or assertion and rejects wrong identity',async()=>{
  expect(await stagingIdentity(new Request(origin),env)).toBe(false);
  const request=new Request(origin,{headers:{'cf-access-jwt-assertion':'fixture'}});
  expect(await stagingIdentity(request,{...env,STAGING_ACCESS_AUD:''})).toBe(false);
  verify.mockResolvedValue({payload:{email:'other@example.test'}});expect(await stagingIdentity(request,env)).toBe(false);
  verify.mockImplementation(()=>{throw Error('bad signature');});expect(await stagingIdentity(request,env)).toBe(false);
});
it('verifies issuer and the separate staging audiences before accepting exact owner',async()=>{
  verify.mockResolvedValue({payload:{email:'owner@example.test'}});
  expect(await stagingIdentity(new Request(origin,{headers:{'cf-access-jwt-assertion':'fixture'}}),env)).toBe(true);
  expect(verify.mock.calls[0][2]).toEqual({issuer:'https://team.example.test',audience:['staging-site','staging-admin']});
});
it('applies the complete unchanged migration chain through the staging transport',()=>{
  const original=new DatabaseSync(':memory:'),transport=new DatabaseSync(':memory:');
  try{
    for(const name of readdirSync('migrations').filter(name=>name.endsWith('.sql')).sort()){
      const sql=readFileSync('migrations/'+name,'utf8');original.exec(sql);
      for(const statement of unstable_splitSqlQuery(sql))transport.exec(triggerSafeStatement(statement));
    }
    const objects=(db:DatabaseSync)=>db.prepare("SELECT type,name,tbl_name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all();
    expect(objects(transport)).toEqual(objects(original));
    for(const db of [original,transport]){
      db.exec("INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,created_by,updated_by) VALUES('fixture','Synthetic','ทดสอบ','https://example.test/privacy','fixture','fixture');INSERT INTO installer_credit_accounts(company_id) VALUES('fixture');");
      expect(()=>db.exec("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES('negative','fixture','fixture',-1,'negative','fixture','fixture','2026-10-12T00:00:00Z')")).toThrow(/insufficient credit/);
      db.exec("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES('positive','fixture','fixture',4,'positive','fixture','fixture','2026-10-12T00:00:00Z');");
      expect(()=>db.exec("UPDATE installer_credit_ledger SET available_delta=8 WHERE id='positive'")).toThrow(/immutable/);
      expect(db.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='fixture'").get()).toEqual({available:4});
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    }
  }finally{original.close();transport.close();}
});
