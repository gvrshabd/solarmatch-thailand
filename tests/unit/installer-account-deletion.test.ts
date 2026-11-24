import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state=vi.hoisted(()=>({db:null as D1Database|null,userId:'owner1'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:'local-test',INSTALLER_BASE_URL:'http://localhost:3000',INSTALLER_AUTH_SECRET:'synthetic-signing-secret-at-least-32-characters'}),requireDatabase:()=>state.db}));
vi.mock('@/lib/installer/auth',()=>({getInstallerSession:async()=>({user:{id:state.userId,name:'Synthetic person',email:`${state.userId}@example.test`,emailVerified:true},session:{id:'session-'+state.userId}})}));
// The real hash check is Better Auth's; a fixture hash keeps this test fast and deterministic.
vi.mock('better-auth/crypto',()=>({verifyPassword:async({hash,password}:{hash:string;password:string})=>hash==='fixture-hash:'+password}));
import { FixtureDatabase, seedFixture } from '../installer/fixtures';
import { POST } from '@/app/api/installer/portal/route';
import { deletedInstallerEmail } from '@/lib/installer/account-deletion';

const company='synthetic-company-1';
let fixture:FixtureDatabase;
const post=(body:unknown)=>POST(new Request('http://localhost:3000/api/installer/portal?lang=en',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify(body)}));
const one=(sql:string,...args:unknown[])=>fixture.sqlite.prepare(sql).get(...args as never[]) as Record<string,unknown>|undefined;
const count=(sql:string,...args:unknown[])=>Number(one(sql,...args)?.n);

beforeEach(async()=>{
  fixture=new FixtureDatabase();state.db=fixture.d1();state.userId='owner1';
  await seedFixture(state.db);
  for(const [user,id,role] of [['owner1',company,'owner'],['owner2','synthetic-company-2','owner'],['member',company,'member']]) {
    fixture.sqlite.prepare('INSERT INTO installer_auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(user,'Synthetic '+user,`${user}@example.test`,1,Date.now(),Date.now());
    fixture.sqlite.prepare("INSERT INTO installer_auth_account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,'credential',?,?,?,?)").run('account-'+user,user,user,'fixture-hash:correct horse battery',Date.now(),Date.now());
    fixture.sqlite.prepare('INSERT INTO installer_auth_session(id,expiresAt,token,createdAt,updatedAt,userId) VALUES(?,?,?,?,?,?)').run('session-'+user,Date.now()+86400000,'token-'+user,Date.now(),Date.now(),user);
    fixture.sqlite.prepare('INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,?)').run(`membership-${user}`,id,user,role);
  }
  fixture.sqlite.prepare("INSERT INTO installer_auth_verification(id,identifier,value,expiresAt,createdAt,updatedAt) VALUES('reset-1','reset-password:synthetic','owner2',?,?,?)").run(Date.now()+3600000,Date.now(),Date.now());
  fixture.sqlite.prepare('UPDATE solar_company_partners SET paused=0,line_user_id=?,updated_by=? WHERE id=?').run(`U${'c'.repeat(32)}`,'owner2@example.test','synthetic-company-2');
  fixture.sqlite.prepare("INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,created_at) VALUES('audit-1','owner2@example.test','installer.company-updated','installer_platform','synthetic-company-2',?)").run(new Date().toISOString());
});
afterEach(()=>{fixture.close();state.db=null;});

describe('self-service installer account deletion',()=>{
  it('requires the current password and changes nothing when it is wrong',async()=>{
    state.userId='owner2';
    const wrong=await post({action:'delete-account',password:'not the password'});
    expect(wrong.status).toBe(403);
    expect(await wrong.json()).toEqual({error:'password_incorrect'});
    expect((await post({action:'delete-account'})).status).toBe(400);
    expect(one('SELECT email FROM installer_auth_user WHERE id=?','owner2')?.email).toBe('owner2@example.test');
    expect(count('SELECT COUNT(*) AS n FROM installer_auth_session WHERE userId=?','owner2')).toBe(1);
    expect(count('SELECT COUNT(*) AS n FROM installer_account_deletions')).toBe(0);
  });

  it('erases the last member’s sign-in, pauses the company and marks it for operator review',async()=>{
    state.userId='owner2';
    const response=await post({action:'delete-account',password:'correct horse battery'});
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ok:true,companyReviewRequired:true});
    expect(one('SELECT name,email,emailVerified FROM installer_auth_user WHERE id=?','owner2')).toEqual({name:'',email:deletedInstallerEmail('owner2'),emailVerified:0});
    for(const table of ['installer_auth_session','installer_auth_account']) expect(count(`SELECT COUNT(*) AS n FROM ${table} WHERE userId=?`,'owner2')).toBe(0);
    expect(count("SELECT COUNT(*) AS n FROM installer_auth_verification WHERE value='owner2'")).toBe(0);
    expect(count('SELECT COUNT(*) AS n FROM installer_memberships WHERE user_id=?','owner2')).toBe(0);
    expect(one('SELECT paused,line_user_id,updated_by FROM solar_company_partners WHERE id=?','synthetic-company-2')).toEqual({paused:1,line_user_id:null,updated_by:'installer-user:owner2'});
    expect(count("SELECT COUNT(*) AS n FROM audit_events WHERE actor_email='owner2@example.test'")).toBe(0);
    const record=one('SELECT * FROM installer_account_deletions WHERE user_id=?','owner2')!;
    expect(record).toMatchObject({company_id:'synthetic-company-2',company_review_required:1,reviewed_at:null});
    expect(JSON.stringify(record)).not.toContain('@');
    expect(count("SELECT COUNT(*) AS n FROM audit_events WHERE action='installer.account-deleted' AND actor_email='installer-user:owner2'")).toBe(1);
    // Other people are untouched.
    expect(one('SELECT email FROM installer_auth_user WHERE id=?','owner1')?.email).toBe('owner1@example.test');
    expect(count('SELECT COUNT(*) AS n FROM installer_auth_session WHERE userId<>?','owner2')).toBe(2);
  });

  it('leaves a company with remaining members running',async()=>{
    fixture.sqlite.prepare('UPDATE solar_company_partners SET paused=0 WHERE id=?').run(company);
    state.userId='member';
    const response=await post({action:'delete-account',password:'correct horse battery'});
    expect(await response.json()).toEqual({ok:true,companyReviewRequired:false});
    expect(one('SELECT paused FROM solar_company_partners WHERE id=?',company)?.paused).toBe(0);
    expect(count('SELECT COUNT(*) AS n FROM installer_memberships WHERE company_id=?',company)).toBe(1);
    expect(one('SELECT company_review_required FROM installer_account_deletions WHERE user_id=?','member')?.company_review_required).toBe(0);
  });

  it('limits repeated password attempts',async()=>{
    state.userId='owner2';
    for(let attempt=0;attempt<5;attempt++) expect((await post({action:'delete-account',password:'wrong '+attempt})).status).toBe(403);
    expect((await post({action:'delete-account',password:'correct horse battery'})).status).toBe(429);
    expect(one('SELECT email FROM installer_auth_user WHERE id=?','owner2')?.email).toBe('owner2@example.test');
  });
});
