import type {SolarMatchRuntimeEnv} from '@/lib/server/runtime';
import type {InstallerSettings} from './settings';
type Check={id:string;status:'ready'|'blocked'|'held';missing:string[]};
/** Presence checks are not credential verification, provider approval or launch approval.
 * Never return a configured value, URL, recipient, key, or secret from this report. */
export function reportInstallerLaunchPreflight(env:SolarMatchRuntimeEnv,settings:InstallerSettings) {
  const checks:Check[]=[];
  const present=(id:string,names:(keyof SolarMatchRuntimeEnv)[])=>{const missing=names.filter(name=>!env[name]).map(String);checks.push({id,status:missing.length?'blocked':'ready',missing});};
  const originValid=(()=>{try{const url=new URL(env.INSTALLER_BASE_URL??'');return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!/(^|\.)(invalid|test|example)$/.test(url.hostname)&&!url.hostname.endsWith('.example.com');}catch{return false;}})();
  checks.push({id:'production-origin',status:originValid?'ready':'blocked',missing:originValid?[]:['INSTALLER_BASE_URL']});
  present('storage-bindings',['DB','MEDIA']);
  for(const name of ['INSTALLER_AUTH_SECRET','PHONE_VERIFICATION_SECRET','CSRF_SECRET','ASSESSMENT_SIGNING_SECRET'] as const){checks.push({id:`secret-${name.toLowerCase()}`,status:(env[name]?.length??0)>=32?'ready':'blocked',missing:(env[name]?.length??0)>=32?[]:[name]});}
  present('admin-access',['ACCESS_TEAM_DOMAIN','ACCESS_AUD','ADMIN_EMAILS']);
  present('email-configuration-presence',['AUTH_EMAIL_PROVIDER_TOKEN','AUTH_EMAIL_FROM']);
  present('sms-configuration-presence',['SMS_ACCOUNT_SID','SMS_AUTH_TOKEN']);
  checks.push({id:'sms-sender-presence',status:env.SMS_FROM||env.SMS_MESSAGING_SERVICE_SID?'ready':'blocked',missing:env.SMS_FROM||env.SMS_MESSAGING_SERVICE_SID?[]:['SMS_FROM or SMS_MESSAGING_SERVICE_SID']});
  present('payment-configuration-presence',['OMISE_PUBLIC_KEY','OMISE_SECRET_KEY','OMISE_WEBHOOK_SECRET']);
  present('line-configuration-presence',['LINE_CHANNEL_SECRET','LINE_CHANNEL_ACCESS_TOKEN']);
  // These checks cannot be satisfied by environment values alone. They intentionally
  // remain blocked until operator evidence and an explicit reviewed activation.
  for(const id of ['provider-sandbox-live-approval','thai-sms-delivery-and-consent','payment-settlement-refund-rehearsal','line-official-account-webhooks','company-tax-and-contract-facts','legal-retention-credit-refund-policies','scheduler-deployment-and-alert-routing','backup-restore-and-access-review','installer-origin-auth-cookie-design'])checks.push({id,status:'blocked',missing:[]});
  const held=env.INSTALLER_PLATFORM_MODE!=='production'&&env.OUTBOUND_MESSAGES_ENABLED!=='true'&&env.AUTH_EMAIL_LIVE_ENABLED!=='true'&&env.SMS_LIVE_ENABLED!=='true'&&env.OMISE_LIVE_ENABLED!=='true'&&env.LINE_LIVE_ENABLED!=='true';
  checks.push({id:'activation-held',status:held?'held':'blocked',missing:[]});
  checks.push({id:'commercial-controls-held',status:settings.platformPaused||(!settings.collectionEnabled&&!settings.paymentsEnabled&&settings.deliveryPaused&&!settings.notificationsEnabled)?'held':'blocked',missing:[]});
  return {scope:'technical-preparation' as const,ready:false,ownerReviewRequired:true,localSafetyHeld:held,checks};
}
