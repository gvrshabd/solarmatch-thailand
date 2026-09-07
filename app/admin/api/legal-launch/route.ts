import { NextResponse } from 'next/server';
import { z } from 'zod';
import { interpolateLegalDocuments, legalLaunchDraft, operatorProfileComplete } from '@/config/legal-content';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const nullableDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable();
const operatorSchema = z.object({
  legalBusinessNameEn: z.string().trim().max(200), legalBusinessNameTh: z.string().trim().max(200),
  legalEntityType: z.string().trim().max(160), registrationOrTaxNumber: z.string().trim().max(80),
  registeredAddressEn: z.string().trim().max(1000), registeredAddressTh: z.string().trim().max(1000),
  publicBusinessPhone: z.string().trim().max(80), publicBusinessEmail: z.string().trim().max(254),
  privacyContactEmail: z.string().trim().max(254), privacyRightsRequestUrl: z.string().trim().max(2048),
  leadRetentionDays: z.number().int().min(1).max(3650).nullable(), leadDistributionWindowDays: z.number().int().min(1).max(365).nullable(),
  privacyNoticeEffectiveDate: nullableDate, termsEffectiveDate: nullableDate, cookiePolicyEffectiveDate: nullableDate,
  dataHostingAndProcessorDetails: z.string().trim().max(4000), operatorRepresentativeName: z.string().trim().max(200),
  operatorRepresentativeTitle: z.string().trim().max(200),
}).strict();

const documentSchema = z.object({
  type: z.enum(['privacy', 'terms', 'cookies']),
  title: z.object({ en: z.string().min(1).max(200), th: z.string().min(1).max(200) }),
  lastUpdatedLabel: z.object({ en: z.string().min(1).max(100), th: z.string().min(1).max(100) }),
  effectiveDate: nullableDate,
  pendingLegalReview: z.boolean(),
  sections: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/u).max(80),
    title: z.object({ en: z.string().min(1).max(300), th: z.string().min(1).max(300) }),
    paragraphs: z.array(z.object({ en: z.string().min(1).max(8000), th: z.string().min(1).max(8000) })).min(1).max(30),
    bullets: z.array(z.object({ en: z.string().min(1).max(2000), th: z.string().min(1).max(2000) })).max(50).optional(),
  })).min(1).max(40),
}).strict();

const partnerSchema = z.object({
  id: z.string().uuid().optional(), legalNameEn: z.string().trim().min(1).max(200), legalNameTh: z.string().trim().min(1).max(200),
  tradingName: z.string().trim().max(200).nullable(), registrationNumber: z.string().trim().max(100).nullable(),
  privacyNoticeUrl: z.string().url().max(2048), operationalContact: z.record(z.string(), z.string().max(500)).default({}),
  serviceProvinces: z.array(z.string().max(100)).max(77), serviceAreas: z.array(z.string().max(200)).max(300),
  active: z.boolean(), contractState: z.enum(['pending', 'active', 'expired', 'suspended', 'terminated']),
  contractEffectiveDate: nullableDate, contractExpiryDate: nullableDate,
  acceptedLeadCriteria: z.record(z.string(), z.unknown()).default({}),
  deliveryMethod: z.enum(['manual-copy', 'manual-email', 'manual-line']).default('manual-copy'),
  operationalCapacity: z.number().int().min(0).max(100000).nullable(), internalLeadPriceThb: z.number().int().min(0).nullable(),
  internalNotes: z.string().trim().max(5000).nullable(),
}).strict().superRefine((value, context) => {
  if (value.active && value.contractState !== 'active') context.addIssue({ code: 'custom', path: ['contractState'], message: 'An active partner requires an active contract.' });
  if (value.contractEffectiveDate && value.contractExpiryDate && value.contractExpiryDate < value.contractEffectiveDate) context.addIssue({ code: 'custom', path: ['contractExpiryDate'], message: 'Contract expiry cannot precede its effective date.' });
});

const privacyRequestSchema = z.object({
  leadId: z.string().uuid().nullable(), requestType: z.enum(['access', 'correction', 'deletion', 'restriction', 'objection', 'withdrawal', 'stop-contact']),
  receivedChannel: z.enum(['email', 'phone', 'rights-page', 'other']), receivedAt: z.string().datetime(),
  identityVerificationState: z.enum(['pending', 'verified', 'failed', 'not-required']).default('pending'),
  status: z.enum(['open', 'verifying', 'in-progress', 'completed', 'rejected']).default('open'),
  dueAt: z.string().datetime().nullable(), resolutionNotes: z.string().trim().max(5000).nullable(),
  partnerNotificationRequired: z.boolean().default(false), partnerNotificationCompleted: z.boolean().default(false),
  legalHold: z.boolean().default(false),
}).strict();

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save-legal-draft'), operator: operatorSchema, documents: z.object({ privacy: documentSchema, terms: documentSchema, cookies: documentSchema }), reviewStatus: z.enum(['pending-legal-review', 'reviewed', 'approved']).default('pending-legal-review') }),
  z.object({ action: z.literal('publish-legal'), versionId: z.string().max(100) }),
  z.object({ action: z.literal('restore-legal'), versionId: z.string().max(100) }),
  z.object({ action: z.literal('save-partner'), partner: partnerSchema }),
  z.object({ action: z.literal('archive-partner'), partnerId: z.string().uuid() }),
  z.object({ action: z.literal('save-privacy-request'), request: privacyRequestSchema }),
  z.object({ action: z.literal('update-privacy-request'), requestId: z.string().uuid(),
    identityVerificationState: z.enum(['pending', 'verified', 'failed', 'not-required']),
    status: z.enum(['open', 'verifying', 'in-progress', 'completed', 'rejected']),
    resolutionNotes: z.string().trim().max(5000).nullable(), partnerNotificationCompleted: z.boolean(), legalHold: z.boolean() }),
  z.object({ action: z.literal('update-delivery'), deliveryId: z.string().uuid(),
    deliveryStatus: z.enum(['delivered', 'accepted', 'rejected', 'withdrawal-notified', 'deleted-notified']),
    rejectionReason: z.string().trim().max(1000).nullable(), paymentStatus: z.enum(['not-recorded', 'pending', 'paid', 'waived', 'disputed']),
    surveyStatus: z.enum(['not-recorded', 'scheduled', 'completed', 'cancelled']),
    quotationStatus: z.enum(['not-recorded', 'requested', 'provided', 'declined']),
    outcomeStatus: z.enum(['not-recorded', 'open', 'won', 'lost', 'not-suitable']),
    deletionNotificationState: z.enum(['not-required', 'required', 'sent', 'acknowledged']) }),
  z.object({ action: z.literal('prepare-delivery'), leadId: z.string().uuid(), partnerIds: z.array(z.string().uuid()).min(1).max(20) }),
  z.object({ action: z.literal('confirm-delivery'), leadId: z.string().uuid(), partnerIds: z.array(z.string().uuid()).min(1).max(20), clipboardConfirmed: z.literal(true) }),
]);

function publicSafeError(code: string, status: number, details?: unknown) {
  return NextResponse.json({ error: code, details }, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function nextVersion(database: D1Database, table: string) {
  const row = await database.prepare(`SELECT COALESCE(MAX(version_number), 0) + 1 AS value FROM ${table}`).first<{ value: number }>();
  return row?.value ?? 1;
}

type DistributionLead = {
  id: string; created_at: string; legal_first_name: string; legal_last_name: string; phone_e164: string | null;
  preferred_contact_method: string; line_id: string | null; province: string; custom_location: string | null;
  property_type: string; custom_property_type: string | null; ownership_status: string; air_conditioner_count: number;
  monthly_bill_thb: number; daytime_pattern: string; roof_area: string; roof_material: string; custom_roof_material: string | null;
  roof_shade: string; quality_score: number; hard_eligible: number; consent_version: string; consented_at: string;
  privacy_notice_version_id: string | null; distribution_expires_at: string | null; recipient_category_snapshot: string | null;
  disclosed_fields_snapshot_json: string | null; contact_collection_mode: string; third_party_disclosure_authorized: number;
  suppressed: number; consent_withdrawn_at: string | null; contact_configuration_version_id: string;
  is_test_submission: number; distribution_allowed: number;
};

type DistributionPartner = {
  id: string; legal_name_en: string; legal_name_th: string; trading_name: string | null; privacy_notice_url: string;
  service_provinces_json: string; service_areas_json: string; active: number; contract_state: string;
  contract_effective_date: string | null; contract_expiry_date: string | null; delivery_method: 'manual-copy' | 'manual-email' | 'manual-line';
  accepted_lead_criteria_json: string;
};

async function validatedDistribution(database: D1Database, leadId: string, partnerIds: string[]) {
  const lead = await database.prepare(`SELECT id, created_at, legal_first_name, legal_last_name, phone_e164, preferred_contact_method,
      line_id, province, custom_location, property_type, custom_property_type, ownership_status, air_conditioner_count,
      monthly_bill_thb, daytime_pattern, roof_area, roof_material, custom_roof_material, roof_shade, quality_score,
      hard_eligible, consent_version, consented_at, privacy_notice_version_id, distribution_expires_at,
      recipient_category_snapshot, disclosed_fields_snapshot_json,
      COALESCE(contact_collection_mode_v2, contact_collection_mode) AS contact_collection_mode,
      COALESCE(third_party_disclosure_authorized_v2, third_party_disclosure_authorized) AS third_party_disclosure_authorized,
      suppressed, consent_withdrawn_at, contact_configuration_version_id, is_test_submission, distribution_allowed
    FROM leads WHERE id = ? AND status NOT IN ('deleted', 'archived') LIMIT 1`).bind(leadId).first<DistributionLead>();
  if (!lead) throw new Error('lead_not_found');
  if (lead.is_test_submission || !lead.distribution_allowed) throw new Error('historical_test_distribution_blocked');
  if (lead.contact_collection_mode !== 'shared_solar_company_handoff' || !lead.third_party_disclosure_authorized) throw new Error('consent_scope_mismatch');
  if (!lead.hard_eligible) throw new Error('lead_not_commercially_eligible');
  if (lead.suppressed || lead.consent_withdrawn_at) throw new Error('lead_suppressed');
  if (lead.recipient_category_snapshot !== 'participating_residential_solar_companies') throw new Error('recipient_category_mismatch');
  if (!lead.distribution_expires_at || Date.parse(lead.distribution_expires_at) <= Date.now()) throw new Error('distribution_window_expired');
  const configuration = await database.prepare('SELECT internal_recipient_cap FROM contact_configuration_versions WHERE id = ?')
    .bind(lead.contact_configuration_version_id).first<{ internal_recipient_cap: number | null }>();
  const existing = await database.prepare('SELECT partner_id FROM lead_recipient_deliveries WHERE lead_id = ?').bind(leadId).all<{ partner_id: string }>();
  if ((configuration?.internal_recipient_cap ?? 20) < existing.results.length + partnerIds.length) throw new Error('recipient_cap_exceeded');
  const placeholders = partnerIds.map(() => '?').join(',');
  const partners = await database.prepare(`SELECT id, legal_name_en, legal_name_th, trading_name, privacy_notice_url,
      service_provinces_json, service_areas_json, active, contract_state, contract_effective_date, contract_expiry_date,
      delivery_method, accepted_lead_criteria_json
    FROM solar_company_partners WHERE id IN (${placeholders}) AND archived_at IS NULL`).bind(...partnerIds).all<DistributionPartner>();
  if (partners.results.length !== partnerIds.length) throw new Error('partner_not_found');
  const already = new Set(existing.results.map((item) => item.partner_id));
  for (const partner of partners.results) {
    if (!partner.active || partner.contract_state !== 'active') throw new Error('partner_not_active');
    if (partner.contract_effective_date && partner.contract_effective_date > new Date().toISOString().slice(0, 10)) throw new Error('partner_contract_not_effective');
    if (partner.contract_expiry_date && partner.contract_expiry_date < new Date().toISOString().slice(0, 10)) throw new Error('partner_contract_expired');
    if (already.has(partner.id)) throw new Error('duplicate_delivery');
    const criteria = JSON.parse(partner.accepted_lead_criteria_json) as { minimumQualityScore?: number; hardEligibleOnly?: boolean };
    if (criteria.hardEligibleOnly && !lead.hard_eligible) throw new Error('partner_lead_criteria_mismatch');
    if (typeof criteria.minimumQualityScore === 'number' && lead.quality_score < criteria.minimumQualityScore) throw new Error('partner_lead_criteria_mismatch');
    const provinces = JSON.parse(partner.service_provinces_json) as string[];
    const areas = JSON.parse(partner.service_areas_json) as string[];
    const areaMatch = lead.province === 'other' && lead.custom_location
      ? areas.some((area) => area.localeCompare(lead.custom_location!, undefined, { sensitivity: 'base' }) === 0)
      : provinces.includes(lead.province);
    if (!areaMatch) throw new Error('partner_service_area_mismatch');
  }
  return { lead, partners: partners.results };
}

function deliveryCopy(lead: DistributionLead, partner: DistributionPartner) {
  const name = partner.trading_name || partner.legal_name_en;
  const allowed = new Set<string>(JSON.parse(lead.disclosed_fields_snapshot_json ?? '[]') as string[]);
  const lines = [
    'SOLARMATCH RESIDENTIAL ENQUIRY', `Recipient: ${name}`, `Lead ID: ${lead.id}`, `Submitted: ${lead.created_at}`, '',
  ];
  if (allowed.has('legalFirstName') || allowed.has('legalLastName')) lines.push(`Name: ${allowed.has('legalFirstName') ? lead.legal_first_name : ''} ${allowed.has('legalLastName') ? lead.legal_last_name : ''}`.trim());
  if (allowed.has('phone')) lines.push(`Thai mobile: ${lead.phone_e164 || 'NOT PROVIDED'}`);
  if (allowed.has('preferredContactMethod')) lines.push(`Preferred contact: ${lead.preferred_contact_method.toUpperCase()}`);
  if (allowed.has('lineId')) lines.push(`LINE ID: ${lead.line_id || 'NOT PROVIDED'}`);
  if (allowed.has('assessmentAnswers')) lines.push(
    `Area: ${lead.custom_location || lead.province}`, '', `Property: ${lead.custom_property_type || lead.property_type}`,
    `Owner status: ${lead.ownership_status}`, `AC units: ${lead.air_conditioner_count}`, `Typical monthly bill: ฿${lead.monthly_bill_thb.toLocaleString('en-US')}`,
    `Daytime use: ${lead.daytime_pattern}`, `Roof area: ${lead.roof_area}`, `Roof material: ${lead.custom_roof_material || lead.roof_material}`,
    `Shade: ${lead.roof_shade}`, '', `Lead quality: ${lead.quality_score}/5`, `Hard eligible: ${lead.hard_eligible ? 'YES' : 'NO'}`,
  );
  lines.push(`Consent version: ${lead.consent_version}`, `Contact requested: ${lead.consented_at}`, `Distribution expires: ${lead.distribution_expires_at}`);
  return lines.join('\n');
}

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const database = requireDatabase();
  const [legal, partners, contracts, requests, deliveries, sharedLeads] = await Promise.all([
    database.prepare(`SELECT id, version_number, state, documents_json, is_complete, schema_version, operator_profile_json,
      effective_date, review_status, retention_days, distribution_window_days, created_by, created_at, published_by,
      published_at, archived_at, restored_from_id, updated_by, updated_at
      FROM legal_document_versions ORDER BY version_number DESC`).all(),
    database.prepare(`SELECT id, legal_name_en, legal_name_th, trading_name, registration_number, privacy_notice_url,
      operational_contact_json, service_provinces_json, service_areas_json, active, contract_state,
      contract_effective_date, contract_expiry_date, accepted_lead_criteria_json, delivery_method,
      operational_capacity, internal_lead_price_thb, internal_notes, created_at, updated_at, archived_at
      FROM solar_company_partners ORDER BY active DESC, updated_at DESC`).all(),
    database.prepare(`SELECT id, partner_id, original_filename, byte_size, sha256, contract_effective_date,
      contract_expiry_date, uploaded_by, created_at FROM partner_contract_documents
      WHERE deleted_at IS NULL ORDER BY created_at DESC`).all(),
    database.prepare(`SELECT id, lead_id, request_type, received_channel, received_at, identity_verification_state,
      status, due_at, resolution_notes, suppression_applied, partner_notification_required,
      partner_notification_completed, legal_hold, created_at, updated_at, completed_at
      FROM privacy_rights_requests ORDER BY received_at DESC LIMIT 200`).all(),
    database.prepare(`SELECT d.id, d.lead_id, d.partner_id, p.trading_name, p.legal_name_en, d.delivered_at,
      d.delivery_status, d.payment_status, d.survey_status, d.quotation_status, d.outcome_status,
      d.withdrawal_suppressed, d.deletion_notification_state
      FROM lead_recipient_deliveries d JOIN solar_company_partners p ON p.id = d.partner_id
      ORDER BY d.delivered_at DESC LIMIT 500`).all(),
    database.prepare(`SELECT id, legal_first_name, legal_last_name, province, custom_location, created_at,
      distribution_expires_at, suppressed, consent_withdrawn_at, is_test_submission, distribution_allowed
      FROM leads WHERE COALESCE(contact_collection_mode_v2, contact_collection_mode)='shared_solar_company_handoff'
      AND hard_eligible=1 AND is_test_submission=0 AND distribution_allowed=1 AND status NOT IN ('deleted','archived')
      ORDER BY created_at DESC LIMIT 200`).all(),
  ]);
  return NextResponse.json({ legal: legal.results, partners: partners.results, contracts: contracts.results, privacyRequests: requests.results, deliveries: deliveries.results, sharedLeads: sharedLeads.results, defaultLegalDraft: legalLaunchDraft }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  let body: z.infer<typeof actionSchema>;
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return publicSafeError('invalid_action', 400, parsed.error.flatten());
    body = parsed.data;
  } catch { return publicSafeError('invalid_json', 400); }
  const database = requireDatabase();

  if (body.action === 'save-legal-draft') {
    const version = await nextVersion(database, 'legal_document_versions');
    const id = `legal-launch-v${version}`;
    const complete = operatorProfileComplete(body.operator) && body.reviewStatus !== 'pending-legal-review';
    const resolvedDocuments = interpolateLegalDocuments(body.documents, body.operator);
    const completeWithoutTokens = complete && !/\[[A-Z][A-Z _-]+\]/u.test(JSON.stringify(resolvedDocuments));
    const document = { schemaVersion: 2, operator: body.operator, documents: resolvedDocuments, pendingLegalReview: body.reviewStatus === 'pending-legal-review' };
    await database.batch([
      database.prepare("UPDATE legal_document_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare(`INSERT INTO legal_document_versions
        (id, version_number, state, documents_json, is_complete, created_by, schema_version, operator_profile_json,
         review_status, retention_days, distribution_window_days, updated_by, updated_at)
        VALUES (?, ?, 'draft', ?, ?, ?, 2, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(id, version, JSON.stringify(document), completeWithoutTokens ? 1 : 0, identity.email, JSON.stringify(body.operator), body.reviewStatus,
          body.operator.leadRetentionDays, body.operator.leadDistributionWindowDays, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'legal.saved-draft', entityType: 'legal-document-version', entityId: id, next: { reviewStatus: body.reviewStatus, complete: completeWithoutTokens } }),
    ]);
    return NextResponse.json({ ok: true, versionId: id, complete: completeWithoutTokens });
  }

  if (body.action === 'publish-legal') {
    const row = await database.prepare("SELECT id, is_complete, review_status, documents_json FROM legal_document_versions WHERE id = ? AND state = 'draft'").bind(body.versionId).first<{ id: string; is_complete: number; review_status: string; documents_json: string }>();
    if (!row) return publicSafeError('legal_draft_not_found', 404);
    if (!row.is_complete || row.review_status === 'pending-legal-review') return publicSafeError('legal_review_or_operator_details_incomplete', 409);
    const current = await database.prepare('SELECT * FROM public_releases WHERE is_current=1 LIMIT 1').first<Record<string, unknown>>();
    if (!current) return publicSafeError('release_not_found', 409);
    const releaseNumber = Number(current.release_number) + 1;
    const releaseId = `residential-release-v${releaseNumber}`;
    await database.batch([
      database.prepare("UPDATE legal_document_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'published' AND id <> ?").bind(row.id),
      database.prepare("UPDATE legal_document_versions SET state = 'published', published_by = ?, published_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(identity.email, identity.email, row.id),
      database.prepare('UPDATE public_releases SET is_current=0 WHERE is_current=1'),
      database.prepare(`INSERT INTO public_releases
        (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
         live_lead_submissions, is_current, receiving_company_en, receiving_company_th, receiving_company_privacy_url,
         retention_days, contact_configuration_version_id, fact_set_version_id, created_by, published_by, published_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, NULL, NULL, NULL, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(releaseId, releaseNumber, current.questionnaire_version_id, current.rule_version_id, current.content_version_id,
          row.id, current.retention_days ?? null, current.contact_configuration_version_id, current.fact_set_version_id,
          identity.email, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'legal.published', entityType: 'legal-document-version', entityId: row.id }),
    ]);
    return NextResponse.json({ ok: true, releaseId });
  }

  if (body.action === 'restore-legal') {
    const source = await database.prepare('SELECT documents_json, operator_profile_json, review_status, retention_days, distribution_window_days FROM legal_document_versions WHERE id = ?').bind(body.versionId).first<Record<string, unknown>>();
    if (!source) return publicSafeError('legal_version_not_found', 404);
    const version = await nextVersion(database, 'legal_document_versions');
    const id = `legal-launch-v${version}`;
    await database.batch([
      database.prepare("UPDATE legal_document_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare(`INSERT INTO legal_document_versions
        (id, version_number, state, documents_json, is_complete, created_by, schema_version, operator_profile_json,
         review_status, retention_days, distribution_window_days, restored_from_id, updated_by, updated_at)
        VALUES (?, ?, 'draft', ?, 0, ?, 2, ?, 'pending-legal-review', ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(id, version, source.documents_json, identity.email, source.operator_profile_json, source.retention_days, source.distribution_window_days, body.versionId, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'legal.restored-to-draft', entityType: 'legal-document-version', entityId: id, previous: { source: body.versionId } }),
    ]);
    return NextResponse.json({ ok: true, versionId: id });
  }

  if (body.action === 'save-partner') {
    const partner = body.partner;
    const id = partner.id ?? crypto.randomUUID();
    const existing = partner.id ? await database.prepare('SELECT id, active, contract_state FROM solar_company_partners WHERE id = ?').bind(id).first() : null;
    const values = [partner.legalNameEn, partner.legalNameTh, partner.tradingName, partner.registrationNumber, partner.privacyNoticeUrl,
      JSON.stringify(partner.operationalContact), JSON.stringify(partner.serviceProvinces), JSON.stringify(partner.serviceAreas), partner.active ? 1 : 0,
      partner.contractState, partner.contractEffectiveDate, partner.contractExpiryDate, JSON.stringify(partner.acceptedLeadCriteria), partner.deliveryMethod,
      partner.operationalCapacity, partner.internalLeadPriceThb, partner.internalNotes, identity.email];
    const statement = existing
      ? database.prepare(`UPDATE solar_company_partners SET legal_name_en=?, legal_name_th=?, trading_name=?, registration_number=?, privacy_notice_url=?,
          operational_contact_json=?, service_provinces_json=?, service_areas_json=?, active=?, contract_state=?, contract_effective_date=?,
          contract_expiry_date=?, accepted_lead_criteria_json=?, delivery_method=?, operational_capacity=?, internal_lead_price_thb=?,
          internal_notes=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values, id)
      : database.prepare(`INSERT INTO solar_company_partners
          (id, legal_name_en, legal_name_th, trading_name, registration_number, privacy_notice_url, operational_contact_json,
           service_provinces_json, service_areas_json, active, contract_state, contract_effective_date, contract_expiry_date,
           accepted_lead_criteria_json, delivery_method, operational_capacity, internal_lead_price_thb, internal_notes, created_by, updated_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, ...values.slice(0, -1), identity.email, identity.email);
    await database.batch([statement, auditStatement(database, { actorEmail: identity.email, action: existing ? 'partner.updated' : 'partner.created', entityType: 'solar-company-partner', entityId: id, previous: existing, next: { active: partner.active, contractState: partner.contractState, serviceProvinces: partner.serviceProvinces } })]);
    return NextResponse.json({ ok: true, partnerId: id });
  }

  if (body.action === 'archive-partner') {
    await database.batch([
      database.prepare("UPDATE solar_company_partners SET active=0, archived_at=CURRENT_TIMESTAMP, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(identity.email, body.partnerId),
      auditStatement(database, { actorEmail: identity.email, action: 'partner.archived', entityType: 'solar-company-partner', entityId: body.partnerId }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'save-privacy-request') {
    const value = body.request; const id = crypto.randomUUID();
    const suppress = value.leadId && ['verified', 'not-required'].includes(value.identityVerificationState)
      && ['withdrawal', 'stop-contact', 'objection', 'restriction', 'deletion'].includes(value.requestType);
    const statements: D1PreparedStatement[] = [database.prepare(`INSERT INTO privacy_rights_requests
      (id, lead_id, request_type, received_channel, received_at, identity_verification_state, status, due_at, resolution_notes,
       suppression_applied, partner_notification_required, partner_notification_completed, legal_hold, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, value.leadId, value.requestType, value.receivedChannel, value.receivedAt, value.identityVerificationState,
        value.status, value.dueAt, value.resolutionNotes, suppress ? 1 : 0, value.partnerNotificationRequired ? 1 : 0,
        value.partnerNotificationCompleted ? 1 : 0, value.legalHold ? 1 : 0, identity.email, identity.email)];
    if (suppress) statements.push(database.prepare(`UPDATE leads SET suppressed=1, suppression_reason=?, suppressed_at=CURRENT_TIMESTAMP,
      consent_withdrawn_at=CASE WHEN ?='withdrawal' THEN CURRENT_TIMESTAMP ELSE consent_withdrawn_at END, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(value.requestType, value.requestType, value.leadId));
    statements.push(auditStatement(database, { actorEmail: identity.email, action: 'privacy-request.created', entityType: 'privacy-rights-request', entityId: id, next: { type: value.requestType, leadId: value.leadId, suppressionApplied: Boolean(suppress) } }));
    await database.batch(statements);
    return NextResponse.json({ ok: true, requestId: id });
  }

  if (body.action === 'update-privacy-request') {
    const current = await database.prepare('SELECT id, lead_id, request_type, suppression_applied, partner_notification_required FROM privacy_rights_requests WHERE id=?').bind(body.requestId)
      .first<{ id: string; lead_id: string | null; request_type: string; suppression_applied: number; partner_notification_required: number }>();
    if (!current) return publicSafeError('privacy_request_not_found', 404);
    const verified = body.identityVerificationState === 'verified' || body.identityVerificationState === 'not-required';
    const suppress = Boolean(current.lead_id) && verified && ['withdrawal', 'stop-contact', 'objection', 'restriction', 'deletion'].includes(current.request_type);
    const priorRecipients = current.lead_id ? Number((await database.prepare('SELECT COUNT(*) AS count FROM lead_recipient_deliveries WHERE lead_id=?').bind(current.lead_id).first<{ count: number }>())?.count ?? 0) : 0;
    const partnerNotificationRequired = Boolean(current.partner_notification_required) || (suppress && priorRecipients > 0);
    const completedAt = body.status === 'completed' || body.status === 'rejected' ? new Date().toISOString() : null;
    const statements: D1PreparedStatement[] = [database.prepare(`UPDATE privacy_rights_requests SET
      identity_verification_state=?, status=?, resolution_notes=?, suppression_applied=?, partner_notification_completed=?,
      partner_notification_required=?, legal_hold=?, completed_at=?, updated_by=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(body.identityVerificationState, body.status, body.resolutionNotes, suppress || current.suppression_applied ? 1 : 0,
        body.partnerNotificationCompleted ? 1 : 0, partnerNotificationRequired ? 1 : 0, body.legalHold ? 1 : 0, completedAt, identity.email, body.requestId)];
    if (suppress && current.lead_id) statements.push(database.prepare(`UPDATE leads SET suppressed=1, suppression_reason=?, suppressed_at=COALESCE(suppressed_at,CURRENT_TIMESTAMP),
      consent_withdrawn_at=CASE WHEN ?='withdrawal' THEN COALESCE(consent_withdrawn_at,CURRENT_TIMESTAMP) ELSE consent_withdrawn_at END,
      legal_hold=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(current.request_type, current.request_type, body.legalHold ? 1 : 0, current.lead_id));
    if (suppress && current.lead_id) statements.push(database.prepare(`UPDATE lead_recipient_deliveries SET withdrawal_suppressed=1,
      deletion_notification_state=CASE WHEN ?='deletion' AND deletion_notification_state='not-required' THEN 'required' ELSE deletion_notification_state END,
      updated_at=CURRENT_TIMESTAMP WHERE lead_id=?`).bind(current.request_type, current.lead_id));
    statements.push(auditStatement(database, { actorEmail: identity.email, action: 'privacy-request.updated', entityType: 'privacy-rights-request', entityId: body.requestId, next: { status: body.status, verification: body.identityVerificationState, suppressionApplied: suppress || Boolean(current.suppression_applied), partnerNotificationCompleted: body.partnerNotificationCompleted } }));
    await database.batch(statements);
    return NextResponse.json({ ok: true, suppressionApplied: suppress || Boolean(current.suppression_applied) });
  }

  if (body.action === 'update-delivery') {
    const current = await database.prepare('SELECT id, lead_id, partner_id FROM lead_recipient_deliveries WHERE id=?').bind(body.deliveryId).first();
    if (!current) return publicSafeError('delivery_not_found', 404);
    await database.batch([
      database.prepare(`UPDATE lead_recipient_deliveries SET delivery_status=?, rejection_reason=?, payment_status=?,
        survey_status=?, quotation_status=?, outcome_status=?, deletion_notification_state=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(body.deliveryStatus, body.rejectionReason, body.paymentStatus, body.surveyStatus, body.quotationStatus,
          body.outcomeStatus, body.deletionNotificationState, body.deliveryId),
      auditStatement(database, { actorEmail: identity.email, action: 'lead-delivery.updated', entityType: 'lead-recipient-delivery', entityId: body.deliveryId,
        previous: current, next: { deliveryStatus: body.deliveryStatus, paymentStatus: body.paymentStatus, surveyStatus: body.surveyStatus, quotationStatus: body.quotationStatus, outcomeStatus: body.outcomeStatus } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'prepare-delivery' || body.action === 'confirm-delivery') {
    let resolved: Awaited<ReturnType<typeof validatedDistribution>>;
    try { resolved = await validatedDistribution(database, body.leadId, body.partnerIds); }
    catch (error) { return publicSafeError(error instanceof Error ? error.message : 'distribution_not_allowed', 409); }
    const prepared = resolved.partners.map((partner) => ({ partnerId: partner.id, recipient: partner.trading_name || partner.legal_name_en, text: deliveryCopy(resolved.lead, partner) }));
    if (body.action === 'prepare-delivery') return NextResponse.json({ ok: true, prepared }, { headers: { 'Cache-Control': 'no-store' } });
    const disclosed = resolved.lead.disclosed_fields_snapshot_json ?? '[]';
    const statements = resolved.partners.flatMap((partner) => [
      database.prepare(`INSERT INTO lead_recipient_deliveries
        (id, lead_id, partner_id, consent_version, privacy_notice_version_id, disclosure_purpose,
         fields_disclosed_json, delivered_at, delivered_by, delivery_method, distribution_expires_at, copy_export_status)
        VALUES (?, ?, ?, ?, ?, 'residential_solar_site_survey_and_quotation', ?, CURRENT_TIMESTAMP, ?, ?, ?, 'confirmed')`)
        .bind(crypto.randomUUID(), resolved.lead.id, partner.id, resolved.lead.consent_version,
          resolved.lead.privacy_notice_version_id ?? 'unavailable', disclosed, identity.email, partner.delivery_method, resolved.lead.distribution_expires_at),
      auditStatement(database, { actorEmail: identity.email, action: 'lead.delivered-to-partner', entityType: 'lead-recipient-delivery', entityId: `${resolved.lead.id}:${partner.id}`, next: { leadId: resolved.lead.id, partnerId: partner.id, fields: JSON.parse(disclosed) } }),
    ]);
    await database.batch(statements);
    return NextResponse.json({ ok: true, delivered: resolved.partners.length });
  }

  return publicSafeError('unsupported_action', 400);
}
