import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { sha256 } from '@/lib/server/crypto';
import { ensureInitialRelease, getCurrentRelease, parseScoringConfiguration } from '@/lib/server/releases';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set-selection'), leadId: z.string().uuid(), selection: z.enum(['selected', 'deselected', 'automatic']) }),
  z.object({ action: z.enum(['archive', 'restore', 'soft-delete']), leadIds: z.array(z.string().uuid()).min(1).max(200) }),
  z.object({ action: z.literal('mark-exported'), leadIds: z.array(z.string().uuid()).min(1).max(200) }),
  z.object({ action: z.literal('purge'), leadIds: z.array(z.string().uuid()).min(1).max(50), confirmation: z.literal('PERMANENTLY DELETE') }),
]);

type LeadRow = {
  id: string;
  created_at: string;
  legal_first_name: string;
  legal_last_name: string;
  phone_display: string;
  phone_e164: string;
  preferred_contact_method: 'phone' | 'line';
  line_id: string | null;
  province: string;
  custom_location: string | null;
  ownership_status: string;
  air_conditioner_count: number;
  monthly_bill_thb: number;
  daytime_pattern: string;
  quality_score: number;
  raw_score: number;
  hard_eligible: number;
  high_quality: number;
  scoring_explanation_json: string;
  status: string;
  selection_override: string | null;
  exported_at: string | null;
  archived_at: string | null;
};

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const database = requireDatabase();
  await ensureInitialRelease(database);
  const url = new URL(request.url);
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
  const from = url.searchParams.get('from');
  if (from && /^\d{4}-\d{2}-\d{2}$/u.test(from)) { clauses.push('created_at >= ?'); values.push(`${from}T00:00:00.000Z`); }
  const to = url.searchParams.get('to');
  if (to && /^\d{4}-\d{2}-\d{2}$/u.test(to)) { clauses.push('created_at < ?'); values.push(`${to}T23:59:59.999Z`); }
  const query = url.searchParams.get('query')?.trim();
  if (query) {
    const escaped = query.replace(/[\\%_]/gu, '\\$&');
    clauses.push("(legal_first_name LIKE ? ESCAPE '\\' OR legal_last_name LIKE ? ESCAPE '\\' OR phone_display LIKE ? ESCAPE '\\' OR phone_e164 LIKE ? ESCAPE '\\')");
    const pattern = `%${escaped}%`;
    values.push(pattern, pattern, pattern, pattern);
  }
  const order = url.searchParams.get('sort') === 'score' ? 'quality_score DESC, created_at DESC' : 'created_at DESC';
  const result = await database.prepare(`SELECT id, created_at, legal_first_name, legal_last_name, phone_display, phone_e164,
      preferred_contact_method, line_id, province, custom_location, ownership_status, air_conditioner_count,
      monthly_bill_thb, daytime_pattern, quality_score, raw_score, hard_eligible, high_quality,
      scoring_explanation_json, status, selection_override, exported_at, archived_at
    FROM leads WHERE ${clauses.length ? clauses.join(' AND ') : '1 = 1'} ORDER BY ${order} LIMIT 200`).bind(...values).all<LeadRow>();
  const release = await getCurrentRelease(database);
  const threshold = release ? parseScoringConfiguration(release).automaticSelectionThreshold : 4;
  return NextResponse.json({
    leads: result.results.map((lead) => ({
      ...lead,
      explanation: JSON.parse(lead.scoring_explanation_json),
      selected: lead.selection_override === 'selected' || (lead.selection_override !== 'deselected' && Boolean(lead.hard_eligible) && lead.quality_score >= threshold),
      selectionReason: lead.selection_override === 'selected' ? 'Manually selected' : lead.selection_override === 'deselected' ? 'Manually deselected' : Boolean(lead.hard_eligible) && lead.quality_score >= threshold ? `Automatic: sellable and ${threshold}/5 or above` : 'Not automatically selected',
    })),
    automaticSelectionThreshold: threshold,
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
    const value = parsedBody.selection === 'automatic' ? null : parsedBody.selection;
    await database.batch([
      database.prepare('UPDATE leads SET selection_override = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(value, parsedBody.leadId),
      auditStatement(database, { actorEmail: identity.email, action: 'lead.selection.changed', entityType: 'lead', entityId: parsedBody.leadId, next: { selection: parsedBody.selection }, requestId }),
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
    const rows = await database.prepare(`SELECT id, legal_first_name, legal_last_name, phone_display, preferred_contact_method, line_id, province, custom_location, quality_score, ownership_status, air_conditioner_count FROM leads WHERE id IN (${placeholders}) AND status <> 'deleted'`).bind(...parsedBody.leadIds).all();
    const batchId = crypto.randomUUID();
    const statements: D1PreparedStatement[] = [database.prepare('INSERT INTO export_batches (id, created_by, lead_count, format_version) VALUES (?, ?, ?, ?)').bind(batchId, identity.email, rows.results.length, 'clipboard-v1')];
    rows.results.forEach((row) => statements.push(database.prepare('INSERT INTO export_batch_items (export_batch_id, lead_id, snapshot_json) VALUES (?, ?, ?)').bind(batchId, String(row.id), JSON.stringify(row))));
    rows.results.forEach((row) => statements.push(database.prepare(`INSERT INTO lead_status_events
      (id, lead_id, previous_status, new_status, reason, actor_email)
      SELECT ?, id, status, 'exported', 'clipboard-export-confirmed', ? FROM leads WHERE id = ?`)
      .bind(crypto.randomUUID(), identity.email, String(row.id))));
    statements.push(database.prepare(`UPDATE leads SET status = 'exported', exported_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).bind(...parsedBody.leadIds));
    statements.push(auditStatement(database, { actorEmail: identity.email, action: 'leads.marked-exported', entityType: 'export-batch', entityId: batchId, next: { leadIds: parsedBody.leadIds }, requestId }));
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
