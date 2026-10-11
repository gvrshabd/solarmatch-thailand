import { approvedAttribution, attributionEnabled, ATTRIBUTION_CATALOG, type AttributionGate } from './attribution';
import type { SubmissionMode } from '@/lib/installer/enquiries';

/** Append to the final guarded lead/proof/canonical D1 batch, never a second write. */
export function submissionAttributionStatements(db:D1Database,leadId:string,input:unknown,env:AttributionGate,
  context:{submissionMode:SubmissionMode;originalQualified:boolean}):D1PreparedStatement[] {
  if(!attributionEnabled(env))return [];
  const codes=input===undefined?ATTRIBUTION_CATALOG[1]:approvedAttribution(input);
  if(!codes)throw new Error('unapproved_campaign_codes');
  return [db.prepare(`INSERT INTO lead_campaign_attribution(lead_id,campaign_code,source_code,medium_code,capture_state,submission_mode,submitted_at,original_qualified)
    SELECT id,?,?,?,'captured',submission_mode,created_at,? FROM leads WHERE id=? AND submission_mode=? AND purged_at IS NULL`)
    .bind(codes.campaign,codes.source,codes.medium,context.originalQualified?1:0,leadId,context.submissionMode)];
}
