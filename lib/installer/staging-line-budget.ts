import type {SolarMatchRuntimeEnv} from '@/lib/server/runtime';
import {sha256} from '@/lib/server/crypto';
/** Hard cap for this explicitly isolated exercise, including invitations/retries. */
export function stagingLineBudget(db:D1Database,env:SolarMatchRuntimeEnv){
  if(!env.STAGING_LINE_MAX_MESSAGES)return undefined;
  if(env.STAGING_LINE_MAX_MESSAGES!=='3'||env.INSTALLER_PLATFORM_MODE!=='sandbox'||env.INSTALLER_BASE_URL!=='https://solarmatch-installer-staging.deluxejahseh.workers.dev')throw Error('invalid_staging_message_budget');
  return async(retryKey:string,recipient:string)=>{
    const id=`staging-line-attempt:${retryKey}`,recipientHash=await sha256(recipient);
    const existing=await db.prepare("SELECT attribution_json FROM installer_operational_events WHERE id=? AND event_type='staging-line-test-budget'").bind(id).first<{attribution_json:string}>();
    if(existing){if(JSON.parse(existing.attribution_json).recipientHash!==recipientHash)throw Error('staging_retry_recipient_mismatch');return;}
    const result=await db.prepare(`INSERT OR IGNORE INTO installer_operational_events(id,event_type,attribution_json,created_at)
      SELECT ?,'staging-line-test-budget',?,? WHERE (SELECT COUNT(*) FROM installer_operational_events WHERE event_type='staging-line-test-budget')<3`)
      .bind(id,JSON.stringify({recipientHash}),new Date().toISOString()).run();
    if(result.meta.changes!==1){
      const raced=await db.prepare("SELECT attribution_json FROM installer_operational_events WHERE id=? AND event_type='staging-line-test-budget'").bind(id).first<{attribution_json:string}>();
      if(!raced||JSON.parse(raced.attribution_json).recipientHash!==recipientHash)throw Error('staging_message_cap_reached');
    }
  };
}
