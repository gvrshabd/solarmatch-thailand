import {randomBytes,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {betterAuth} from 'better-auth';
import {readFile,writeFile} from 'node:fs/promises';
import {stagingState,stagingQuery,cloudflare} from './installer-staging-cloudflare.mjs';

// Management CLI only. No fixture route, shared password, email bypass or local
// admin mode exists remotely. Provision exactly the verified account owner.
const state=await stagingState();
const owner=await cloudflare('user');
if(owner.email?.toLowerCase()!==state.ownerEmail||owner.email_verified===false)throw Error('Verified Cloudflare owner identity required.');
const privateDirectory='.wrangler/installer-staging-management';
const existing=(await stagingQuery('SELECT id FROM installer_auth_user WHERE email=?',[state.ownerEmail]))[0].results;
if(existing.length)throw Error('Preserve existing staging account; do not reset credentials.');
const secrets=JSON.parse(await readFile(`${privateDirectory}/secrets.json`,'utf8'));
const password=randomBytes(32).toString('base64url');
const local=new DatabaseSync(':memory:');
local.exec((await readFile('migrations/0006_installer_platform.sql','utf8')).split('CREATE TABLE installer_phone_challenges')[0]);
let verification;
const auth=betterAuth({database:local,secret:secrets.INSTALLER_AUTH_SECRET,baseURL:state.origin,
  user:{modelName:'installer_auth_user'},account:{modelName:'installer_auth_account'},session:{modelName:'installer_auth_session'},verification:{modelName:'installer_auth_verification'},
  emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:12},
  emailVerification:{sendOnSignUp:true,autoSignInAfterVerification:false,sendVerificationEmail:async({url})=>{verification=url;}},logger:{disabled:true}});
try{
  const created=await auth.api.signUpEmail({body:{name:'Synthetic staging installer owner',email:state.ownerEmail,password}});
  if(!created.user||!verification)throw Error('Supported account creation did not generate a verification challenge.');
  const token=new URL(verification).searchParams.get('token');if(!token)throw Error('No private verification challenge.');
  await auth.api.verifyEmail({query:{token}}); // Private management approval, not an inbox delivery claim.
  const user=local.prepare('SELECT * FROM installer_auth_user WHERE id=?').get(created.user.id);
  const account=local.prepare('SELECT * FROM installer_auth_account WHERE userId=?').get(created.user.id);
  if(!user?.emailVerified||!account?.password)throw Error('Supported verification/password provisioning failed.');
  // Persist recovery material privately before uploading any account rows.
  await writeFile(`${privateDirectory}/owner-account.json`,JSON.stringify({email:state.ownerEmail,password,userId:user.id,companyId:'staging-synthetic-owner-company',origin:state.origin,administrativelyVerified:true},null,2)+'\n',{flag:'wx',mode:0o600});
  for(const [table,row] of [['installer_auth_user',user],['installer_auth_account',account]]){
    const columns=Object.keys(row);await stagingQuery(`INSERT INTO ${table}(${columns.map(name=>'"'+name+'"').join(',')}) VALUES(${columns.map(()=>'?').join(',')})`,Object.values(row));
  }
  const now=new Date().toISOString(),companyId='staging-synthetic-owner-company';
  await stagingQuery(`INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,trading_name,privacy_notice_url,service_provinces_json,active,contract_state,contract_effective_date,contract_expiry_date,created_by,updated_by,approval_status,paused,daily_limit,terms_version,terms_accepted_at,internal_notes)
    VALUES(?,?,?,?,?,'["bangkok"]',1,'active',date('now'),date('now','+30 days'),'staging-management','staging-management','approved',1,1,'installer-terms-draft-v1',?,'SYNTHETIC TEST ONLY — no real company or contract')`,[companyId,'Synthetic SolarMatch staging company','บริษัทจำลองสำหรับทดสอบ SolarMatch','SYNTHETIC STAGING ONLY',state.origin+'/privacy',now]);
  await stagingQuery("INSERT INTO installer_memberships(id,company_id,user_id,role) VALUES(?,?,?,'owner')",[randomUUID(),companyId,user.id]);
  await stagingQuery('INSERT INTO installer_credit_accounts(company_id) VALUES(?)',[companyId]);
  await stagingQuery("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES(?,?,'staging-fixture',4,?,'Synthetic non-cash test credits — not purchased','staging-management',?)",[randomUUID(),companyId,'staging-fixture-initial',now]);
  console.log(JSON.stringify({ownerAccount:'privately provisioned via supported Better Auth signup/verification',companyId,syntheticCredits:4,messagesSent:0,payments:0,credentialFile:`${privateDirectory}/owner-account.json`}));
}finally{local.close();}
