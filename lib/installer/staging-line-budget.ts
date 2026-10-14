import type {SolarMatchRuntimeEnv} from '@/lib/server/runtime';
import {sha256} from '@/lib/server/crypto';
/** Hard cap for this explicitly isolated exercise, including invitations/retries. */
export function stagingLineBudget(db:D1Database,env:SolarMatchRuntimeEnv){
  if(!env.STAGING_LINE_MAX_MESSAGES){if(env.STAGING_LINE_TEST_SESSION)throw Error('invalid_staging_message_budget');return undefined;}
  if(env.STAGING_LINE_MAX_MESSAGES!=='3'||env.INSTALLER_PLATFORM_MODE!=='sandbox'||env.INSTALLER_BASE_URL!=='https://solarmatch-installer-staging.deluxejahseh.workers.dev')throw Error('invalid_staging_message_budget');
  if(env.STAGING_LINE_TEST_SESSION&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.STAGING_LINE_TEST_SESSION))throw Error('invalid_staging_session');
  return async(retryKey:string,recipient:string,operation:'invitation'|'enquiry'|'link-token'|'push'='push')=>{
    const id=`staging-line-attempt:${retryKey}`,recipientHash=await sha256(recipient);
    if(env.STAGING_LINE_TEST_SESSION){
      // Explicit fresh authorisation is additive, not a reset of failed history.
      // Count EVERY API attempt, including link tokens and reuse of retry keys.
      const sessionId=env.STAGING_LINE_TEST_SESSION,now=new Date();
      const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',hourCycle:'h23'}).format(now));
      if(hour<9||hour>=17)throw Error('staging_test_outside_hours');
      const row=await db.prepare("SELECT attribution_json FROM installer_operational_events WHERE id=? AND event_type='staging-line-test-session'").bind(sessionId).first<{attribution_json:string}>();
      if(!row)throw Error('staging_session_not_authorised');
      const session=JSON.parse(row.attribution_json) as {active?:boolean;recipientHash?:string;maxNewApiAttempts?:number;priorReservations?:number;expiresAt?:string};
      const prior=session.priorReservations;
      if(session.active!==true||session.maxNewApiAttempts!==5||session.recipientHash!==recipientHash||typeof prior!=='number'||!Number.isSafeInteger(prior)||prior<0||!session.expiresAt||!Number.isFinite(Date.parse(session.expiresAt))||Date.parse(session.expiresAt)<=now.getTime())throw Error('staging_session_invalid_or_expired');
      const attemptId=`staging-line-session-attempt:${crypto.randomUUID()}`;
      const result=await db.prepare(`INSERT INTO installer_operational_events(id,event_type,attribution_json,created_at)
        SELECT ?,'staging-line-test-budget',?,? WHERE
        EXISTS(SELECT 1 FROM installer_operational_events WHERE id=? AND event_type='staging-line-test-session'
          AND json_extract(attribution_json,'$.active')=1 AND julianday(json_extract(attribution_json,'$.expiresAt'))>julianday(?))
        AND (SELECT COUNT(*) FROM installer_operational_events WHERE event_type='staging-line-test-budget' AND json_extract(attribution_json,'$.sessionId')=?)<5
        AND (SELECT COUNT(*) FROM installer_operational_events WHERE event_type='staging-line-test-budget')<?
        AND (SELECT fixed_at FROM installer_test_clock WHERE id=1) IS NULL
        AND EXISTS(SELECT 1 FROM installer_platform_settings WHERE id=1 AND json_extract(config_json,'$.platformPaused')=0 AND json_extract(config_json,'$.notificationsEnabled')=1)`)
        .bind(attemptId,JSON.stringify({sessionId,recipientHash,operation,retryKeyHash:await sha256(retryKey)}),now.toISOString(),sessionId,now.toISOString(),sessionId,prior+5).run();
      if(result.meta.changes!==1)throw Error('staging_session_cap_or_hold');
      return;
    }
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
