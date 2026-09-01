import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isLegacyExportCompatible, resolveAdministratorReviewSelection, type LegacyExportScope } from '@/lib/admin/lead-selection';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { sha256 } from '@/lib/server/crypto';
import { ensureInitialRelease, getCurrentRelease, parseScoringConfiguration } from '@/lib/server/releases';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set-selection'), leadId: z.string().uuid(), selection: z.enum(['selected', 'deselected', 'automatic']) }),
  z.object({ action: z.enum(['archive', 'restore', 'soft-delete']), leadIds: z.array(z.string().uuid()).min(1).max(200) }),
  z.object({ action: z.literal('mark-exported'), leadIds: z.array(z.string().uuid()).min(1).max(200), exportScope: z.enum(['solar_match_validation_followup', 'named_installer_handoff']), recipientKey: z.string().max(100).default('') }),
  z.object({ action: z.literal('purge'), leadIds: z.array(z.string().uuid()).min(1).max(50), confirmation: z.literal('PERMANENTLY DELETE') }),
]);

type LeadRow = {
  id: string;
  created_at: string;
  legal_first_name: string;
  legal_last_name: string;
  phone_display: string | null;
  phone_e164: string | null;
  preferred_contact_method: 'phone' | 'line';
  line_id: string | null;
  province: string;
  custom_location: string | null;
  ownership_status: string;
  air_conditioner_count: number;
  monthly_bill_thb: number;
  daytime_pattern: string;
  actively_planning_solar: number | null;
  quote_contact_requested: number | null;
  quality_score: number;
  raw_score: number;
  hard_eligible: number;
  high_quality: number;
  scoring_explanation_json: string;
  status: string;
  selection_override: string | null;
  exported_at: string | null;
  archived_at: string | null;
  contact_collection_mode: 'validation_interest' | 'named_installer_handoff' | 'shared_solar_company_handoff';
  contact_configuration_version_id: string;
  consent_scope: 'solar_match_validation_followup' | 'named_installer_site_assessment' | 'shared_residential_solar_referral';
  solar_match_followup_authorized: number;
  third_party_disclosure_authorized: number;
  recipient_snapshot_json: string | null;
  submission_environment: 'production' | 'private_development_preview' | 'restricted_site_operational';
  is_test_submission: number;
  distribution_allowed: number;
  suppressed: number;
};

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const database = requireDatabase();
  await ensureInitialRelease(database);
  const url = new URL(request.url);
  const exportScope: LegacyExportScope = url.searchParams.get('exportScope') === 'named_installer_handoff' ? 'named_installer_handoff' : 'solar_match_validation_followup';
  const recipientKey = url.searchParams.get('recipientKey')?.slice(0, 100) ?? '';
  const clauses: string[] = [];
  const values: unknown[] = [];
  const score = Number(url.searchParams.get('score'));
  if (score >= 1 && score <= 5) { clauses.push('quality_score = ?'); values.push(score); }
  const eligibility = url.searchParams.get('eligibility');
  if (eligibility === 'sellable' || eligibility === 'non-sellable') { clauses.push('hard_eligible = ?'); values.push(eligibility === 'sellable' ? 1 : 0); }
  const ownership = url.searchParams.get('ownership');
  if (['owner', 'renter', 'other'].includes(ownership ?? '')) { clauses.push('ownership_status = ?'); values.push(ownership); }
  const location = url.searchParams.get('location');
  if (location) { clauses.push('province = ?'); values.push(location); }
  const minimumAc = Number(url.searchParams.get('minimumAc'));
  if (Number.isInteger(minimumAc) && minimumAc > 0) { clauses.push('air_conditioner_count >= ?'); values.push(minimumAc); }
  const status = url.searchParams.get('status');
  if (status === 'archived') clauses.push("status = 'archived'");
  else if (status === 'deleted') clauses.push("status = 'deleted'");
  else if (status === 'exported') clauses.push('exported_at IS NOT NULL');
  else clauses.push("status NOT IN ('archived', 'deleted')");
  const submissionType = url.searchParams.get('submissionType');
  if (submissionType === 'test') clauses.push('is_test_submission = 1');
  if (submissionType === 'production') clauses.push('is_test_submission = 0');
  const from = url.searchParams.get('from');
  if (from && /^\d{4}-\d{2}-\d{2}$/u.test(from)) { clauses.push('created_at >= ?'); values.push(`${from}T00:00:00.000Z`); }
  const to = url.searchParams.get('to');
  if (to && /^\d{4}-\d{2}-\d{2}$/u.test(to)) { clauses.push('created_at < ?'); values.push(`${to}T23:59:59.999Z`); }
  const query = url.searchParams.get('query')?.trim();
  if (query) {
    const escaped = query.replace(/[\\%_]/gu, '\\$&');
    clauses.push("(legal_first_name LIKE ? ESCAPE '\\' OR legal_last_name LIKE ? ESCAPE '\\' OR COALESCE(phone_display, '') LIKE ? ESCAPE '\\' OR COALESCE(phone_e164, '') LIKE ? ESCAPE '\\' OR COALESCE(line_id, '') LIKE ? ESCAPE '\\')");
    const pattern = `%${escaped}%`;
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  const order = url.searchParams.get('sort') === 'score' ? 'quality_score DESC, created_at DESC' : 'created_at DESC';
  const result = await database.prepare(`SELECT id, created_at, legal_first_name, legal_last_name, phone_display, phone_e164,
      preferred_contact_method, line_id, province, custom_location, ownership_status, air_conditioner_count,
      monthly_bill_thb, daytime_pattern, actively_planning_solar, quote_contact_requested,
      quality_score, raw_score, hard_eligible, high_quality,
      scoring_explanation_json, status, selection_override, exported_at, archived_at,
      COALESCE(contact_collection_mode_v2, contact_collection_mode) AS contact_collection_mode,
      contact_configuration_version_id, COALESCE(consent_scope_v2, consent_scope) AS consent_scope,
      COALESCE(solar_match_followup_authorized_v2, solar_match_followup_authorized) AS solar_match_followup_authorized,
      COALESCE(third_party_disclosure_authorized_v2, third_party_disclosure_authorized) AS third_party_disclosure_authorized,
      recipient_snapshot_json, submission_environment, is_test_submission, distribution_allowed, suppressed
    FROM leads WHERE ${clauses.length ? clauses.join(' AND ') : '1 = 1'} ORDER BY ${order} LIMIT 200`).bind(...values).all<LeadRow>();
  const release = await getCurrentRelease(database);
  const threshold = release ? parseScoringConfiguration(release).automaticSelectionThreshold : 4;
  return NextResponse.json({
    leads: result.results.map((lead) => {
      const compatible = isLegacyExportCompatible(lead, exportScope, recipientKey);
      const reviewSelection = resolveAdministratorReviewSelection(lead, threshold);
      return ({
      ...lead,
      explanation: JSON.parse(lead.scoring_explanation_json),
      selected: reviewSelection.selected,
      selectionCompatible: true,
      exportCompatible: compatible,
      selectionReason: reviewSelection.reason,
      exportReason: lead.is_test_submission ? 'Historical test record — external delivery is permanently blocked' : !lead.distribution_allowed || lead.suppressed ? 'External delivery is suppressed' : compatible ? 'Compatible with the selected legacy export scope' : lead.contact_collection_mode === 'shared_solar_company_handoff' ? 'Use Legal launch → Manual shared-lead distribution to choose and record each recipient' : exportScope === 'solar_match_validation_followup' ? 'Consent does not authorize SolarMatch validation follow-up' : 'Consent does not authorize this named-recipient export',
    }); }),
    automaticSelectionThreshold: threshold,
    exportScope,
    recipientKey,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  let parsedBody: z.infer<typeof actionSchema>;
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    parsedBody = parsed.data;
  } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const database = requireDatabase();
  const requestId = crypto.randomUUID();

  if (parsedBody.action === 'set-selection') {
    const lead = await database.prepare('SELECT id FROM leads WHERE id = ? LIMIT 1').bind(parsedBody.leadId).first<{ id: string }>();
    if (!lead) return NextResponse.json({ error: 'lead_not_found' }, { status: 404 });
    const selectionStatement = parsedBody.selection === 'automatic'
      ? database.prepare('UPDATE leads SET selection_override = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(parsedBody.leadId)
      : database.prepare('UPDATE leads SET selection_override = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(parsedBody.selection, parsedBody.leadId);
    await database.batch([
      selectionStatement,
      auditStatement(database, { actorEmail: identity.email, action: 'lead.review-selection.changed', entityType: 'lead', entityId: parsedBody.leadId, next: { selection: parsedBody.selection }, requestId }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (parsedBody.action === 'purge') {
    const rows = await database.prepare(`SELECT id, request_fingerprint FROM leads WHERE id IN (${parsedBody.leadIds.map(() => '?').join(',')})`).bind(...parsedBody.leadIds).all<{ id: string; request_fingerprint: string }>();
    const statements: D1PreparedStatement[] = [];
    for (const row of rows.results) {
      const tombstoneHash = await sha256(`purged:${row.request_fingerprint}`);
      statements.push(database.prepare(`INSERT INTO purge_tombstones
        (id, entity_type, non_personal_reference_hash, purged_by, reason) VALUES (?, 'lead', ?, ?, 'administrator-permanent-purge')`)
        .bind(crypto.randomUUID(), tombstoneHash, identity.email));
      statements.push(auditStatement(database, { actorEmail: identity.email, action: 'lead.permanently-purged', entityType: 'lead', entityId: row.id, requestId }));
      // Export snapshots contain contact details and must not survive a permanent
      // purge. The export-batch header remains as a non-PII operational audit.
      statements.push(database.prepare('DELETE FROM export_batch_items WHERE lead_id = ?').bind(row.id));
      statements.push(database.prepare('DELETE FROM leads WHERE id = ?').bind(row.id));
    }
    if (statements.length) await database.batch(statements);
    return NextResponse.json({ ok: true, purged: rows.results.length });
  }

  const placeholders = parsedBody.leadIds.map(() => '?').join(',');
  if (parsedBody.action === 'mark-exported') {
    const rows = await database.prepare(`SELECT id, legal_first_name, legal_last_name, phone_display, preferred_contact_method, line_id, province, custom_location, quality_score, ownership_status, air_conditioner_count,
      COALESCE(contact_collection_mode_v2, contact_collection_mode) AS contact_collection_mode,
      contact_configuration_version_id, COALESCE(consent_scope_v2, consent_scope) AS consent_scope,
      COALESCE(solar_match_followup_authorized_v2, solar_match_followup_authorized) AS solar_match_followup_authorized,
      COALESCE(third_party_disclosure_authorized_v2, third_party_disclosure_authorized) AS third_party_disclosure_authorized,
      recipient_snapshot_json, submission_environment, is_test_submission, distribution_allowed, suppressed
      FROM leads WHERE id IN (${placeholders}) AND status <> 'deleted'`).bind(...parsedBody.leadIds).all<LeadRow>();
    const incompatible = rows.results.filter((lead) => !isLegacyExportCompatible(lead, parsedBody.exportScope, parsedBody.recipientKey));
    if (incompatible.length || rows.results.length !== parsedBody.leadIds.length) return NextResponse.json({ error: 'consent_scope_mismatch', incompatibleLeadIds: incompatible.map((lead) => lead.id) }, { status: 409 });
    const batchId = crypto.randomUUID();
    const recipientSnapshot = parsedBody.exportScope === 'named_installer_handoff' ? rows.results[0]?.recipient_snapshot_json ?? null : null;
    const statements: D1PreparedStatement[] = [database.prepare(`INSERT INTO export_batches
      (id, created_by, lead_count, format_version, export_scope, contact_collection_mode, recipient_snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(batchId, identity.email, rows.results.length, 'clipboard-v2', parsedBody.exportScope, parsedBody.exportScope === 'named_installer_handoff' ? 'named_installer_handoff' : 'validation_interest', recipientSnapshot)];
    rows.results.forEach((row) => statements.push(database.prepare('INSERT INTO export_batch_items (export_batch_id, lead_id, snapshot_json) VALUES (?, ?, ?)').bind(batchId, String(row.id), JSON.stringify(row))));
    rows.results.forEach((row) => statements.push(database.prepare(`INSERT INTO lead_status_events
      (id, lead_id, previous_status, new_status, reason, actor_email)
      SELECT ?, id, status, 'exported', 'clipboard-export-confirmed', ? FROM leads WHERE id = ?`)
      .bind(crypto.randomUUID(), identity.email, String(row.id))));
    statements.push(database.prepare(`UPDATE leads SET status = 'exported', exported_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).bind(...parsedBody.leadIds));
    statements.push(auditStatement(database, { actorEmail: identity.email, action: 'leads.marked-exported', entityType: 'export-batch', entityId: batchId, next: { leadIds: parsedBody.leadIds, exportScope: parsedBody.exportScope, recipientKey: parsedBody.recipientKey }, requestId }));
    await database.batch(statements);
    return NextResponse.json({ ok: true, exportBatchId: batchId });
  }

  const transition = {
    archive: { status: 'archived', timestamp: 'archived_at = CURRENT_TIMESTAMP', action: 'leads.archived' },
    restore: { status: 'new', timestamp: 'archived_at = NULL', action: 'leads.restored' },
    'soft-delete': { status: 'deleted', timestamp: 'deleted_at = CURRENT_TIMESTAMP', action: 'leads.soft-deleted' },
  }[parsedBody.action];
  const transitionStatements: D1PreparedStatement[] = parsedBody.leadIds.map((leadId) => database.prepare(`INSERT INTO lead_status_events
    (id, lead_id, previous_status, new_status, reason, actor_email)
    SELECT ?, id, status, ?, ?, ? FROM leads WHERE id = ?`)
    .bind(crypto.randomUUID(), transition.status, transition.action, identity.email, leadId));
  transitionStatements.push(
    database.prepare(`UPDATE leads SET status = ?, ${transition.timestamp}, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).bind(transition.status, ...parsedBody.leadIds),
    auditStatement(database, { actorEmail: identity.email, action: transition.action, entityType: 'lead-batch', entityId: requestId, next: { leadIds: parsedBody.leadIds }, requestId }),
  );
  await database.batch(transitionStatements);
  return NextResponse.json({ ok: true });
}
