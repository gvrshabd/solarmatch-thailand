import { NextRequest, NextResponse } from 'next/server';
import { calculateLeadAssessment } from '@/lib/qualification/scoring';
import { consentSnapshot, publicContactConfiguration } from '@/lib/server/contact-mode';
import { verifyAssessmentToken } from '@/lib/server/assessment-token';
import { sha256 } from '@/lib/server/crypto';
import { getCurrentRelease, parseScoringConfiguration } from '@/lib/server/releases';
import { requireDatabase } from '@/lib/server/runtime';
import { leadSchema, normalizeThaiPhone } from '@/lib/validation/lead';

export const dynamic = 'force-dynamic';

function jsonError(code: string, status: number) {
  return NextResponse.json({ ok: false, code }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

async function enforceRateLimit(request: NextRequest, database: D1Database) {
  const address = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const keyHash = await sha256(`lead-submit:${address}`);
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const results = await database.batch([
    database.prepare("DELETE FROM public_request_limits WHERE window_start < datetime('now', '-2 days')"),
    database.prepare(`INSERT INTO public_request_limits (key_hash, window_start, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(key_hash, window_start) DO UPDATE SET request_count = request_count + 1
      RETURNING request_count`).bind(keyHash, windowStart),
  ]);
  const row = results[1]?.results?.[0] as { request_count?: number } | undefined;
  return (row?.request_count ?? 99) <= 5;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError('invalid_origin', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return jsonError('invalid_content_type', 415);
  if (Number(request.headers.get('content-length') ?? 0) > 64_000) return jsonError('request_too_large', 413);

  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError('invalid_json', 400); }
  const parsed = leadSchema.safeParse(raw);
  if (!parsed.success) return jsonError('invalid_submission', 400);
  if (parsed.data.website) return NextResponse.json({ ok: true }, { status: 202 });

  const token = await verifyAssessmentToken(parsed.data.assessmentToken);
  if (!token || Date.now() - token.issuedAt < 1_500) return jsonError('invalid_assessment_session', 403);

  const database = requireDatabase();
  if (!await enforceRateLimit(request, database)) return jsonError('rate_limited', 429);
  const release = await getCurrentRelease(database);
  if (!release || !release.live_lead_submissions || !release.legal_complete) return jsonError('submissions_unavailable', 503);
  const contact = publicContactConfiguration(release);
  if (!contact.enabled || contact.mode === 'disabled') return jsonError('submissions_unavailable', 503);
  if (token.releaseId !== release.release_id || token.questionnaireVersionId !== release.questionnaire_version_id || token.ruleVersionId !== release.rule_version_id) return jsonError('assessment_version_expired', 409);

  const assessment = calculateLeadAssessment(parsed.data.answers, parseScoringConfiguration(release));
  const phoneE164 = normalizeThaiPhone(parsed.data.phone);
  const existing = await database.prepare('SELECT id FROM leads WHERE idempotency_key = ? LIMIT 1').bind(parsed.data.idempotencyKey).first<{ id: string }>();
  if (existing) return NextResponse.json({ ok: true, leadId: existing.id, duplicate: true }, { headers: { 'Cache-Control': 'no-store' } });

  const leadId = crypto.randomUUID();
  const consentedAt = new Date().toISOString();
  const distributionExpiresAt = contact.mode === 'shared_solar_company_handoff' && contact.distributionWindowDays
    ? new Date(Date.now() + contact.distributionWindowDays * 86_400_000).toISOString()
    : null;
  const requestFingerprint = await sha256(`${phoneE164}:${token.nonce}:${release.release_id}`);
  const consent = consentSnapshot(contact);
  const answers = parsed.data.answers;
  const explanation = JSON.stringify({ factors: assessment.factors, eligibilityReasons: assessment.eligibilityReasons });
  const recipientSnapshot = consent.recipient ? JSON.stringify({
    ...consent.recipient,
    sharedFields: contact.sharedFields,
    permittedContactMethods: contact.permittedContactMethods,
  }) : null;
  const sharedMode = consent.contactMode === 'shared_solar_company_handoff';
  const legacyMode = sharedMode ? 'validation_interest' : consent.contactMode;
  const legacyScope = sharedMode ? 'solar_match_validation_followup' : consent.consentScope;
  const legacySolarMatchAuthorization = sharedMode ? 1 : consent.solarMatchFollowupAuthorized ? 1 : 0;
  const legacyThirdPartyAuthorization = sharedMode ? 0 : consent.thirdPartyDisclosureAuthorized ? 1 : 0;
  const leadColumns = [
    'id', 'idempotency_key', 'request_fingerprint', 'legal_first_name', 'legal_last_name', 'phone_e164', 'phone_display',
    'preferred_contact_method', 'line_id', 'province', 'custom_location', 'ownership_status', 'property_type', 'custom_property_type',
    'daytime_loads_json', 'custom_daytime_load', 'air_conditioner_count', 'monthly_bill_thb', 'roof_material', 'custom_roof_material',
    'roof_shade', 'roof_area', 'daytime_pattern', 'installation_timeframe', 'answers_json', 'questionnaire_version_id',
    'rule_version_id', 'release_id', 'raw_score', 'quality_score', 'hard_eligible', 'high_quality', 'scoring_explanation_json',
    'consent_version', 'consent_text_en', 'consent_text_th', 'consented_at', 'receiving_company_en', 'receiving_company_th',
    'source_locale', 'user_agent_summary', 'contact_collection_mode', 'contact_collection_mode_v2',
    'contact_configuration_version_id', 'content_version_id',
    'privacy_version', 'consent_scope', 'consent_scope_v2', 'solar_match_followup_authorized',
    'solar_match_followup_authorized_v2', 'third_party_disclosure_authorized', 'third_party_disclosure_authorized_v2',
    'recipient_privacy_url', 'recipient_snapshot_json', 'retention_days_snapshot',
    'distribution_window_days_snapshot', 'distribution_expires_at', 'recipient_category_snapshot',
    'disclosed_fields_snapshot_json', 'adult_confirmation_version', 'adult_confirmation_text_en',
    'adult_confirmation_text_th', 'adult_confirmed_at', 'privacy_notice_version_id', 'terms_version_id',
    'cookie_policy_version_id',
  ];
  const leadValues = [
    leadId, parsed.data.idempotencyKey, requestFingerprint, parsed.data.legalFirstName, parsed.data.legalLastName,
    phoneE164, parsed.data.phone, parsed.data.contactMethod, parsed.data.lineId ?? null, answers.province,
    answers.customLocation ?? null, answers.ownershipStatus, answers.propertyType, answers.customPropertyType ?? null,
    JSON.stringify(answers.daytimeLoads), answers.customDaytimeLoad ?? null, answers.airConditionerCount ?? 0,
    Math.round(answers.monthlyBillThb), answers.roofMaterial, answers.customRoofMaterial ?? null, answers.shade,
    answers.roofArea, answers.daytimePattern, answers.installationTimeframe ?? 'not-collected-v2', JSON.stringify(answers),
    release.questionnaire_version_id, release.rule_version_id, release.release_id, assessment.rawPoints,
    assessment.qualityScore, assessment.hardEligible ? 1 : 0, assessment.highQuality ? 1 : 0, explanation,
    contact.consentVersionId ?? `content:${contact.contentVersionId}`, consent.consentText.en, consent.consentText.th, consentedAt,
    consent.recipient?.name.en ?? null, consent.recipient?.name.th ?? null, parsed.data.locale,
    request.headers.get('user-agent')?.slice(0, 160) ?? null, legacyMode, consent.contactMode,
    contact.contactConfigurationVersionId, contact.contentVersionId, contact.privacyVersion, legacyScope,
    consent.consentScope, legacySolarMatchAuthorization, consent.solarMatchFollowupAuthorized ? 1 : 0,
    legacyThirdPartyAuthorization, consent.thirdPartyDisclosureAuthorized ? 1 : 0,
    sharedMode ? null : consent.recipient?.privacyUrl ?? null, sharedMode ? null : recipientSnapshot, contact.retentionDays,
    contact.distributionWindowDays, distributionExpiresAt, contact.recipientCategory,
    JSON.stringify(contact.sharedFields), contact.adultConfirmationVersionId,
    consent.adultConfirmationText?.en ?? '', consent.adultConfirmationText?.th ?? '', consentedAt,
    contact.privacyNoticeVersionId, contact.termsVersionId, contact.cookiePolicyVersionId,
  ];

  try {
    await database.batch([
      database.prepare(`INSERT INTO leads (${leadColumns.join(', ')}) VALUES (${leadColumns.map(() => '?').join(', ')})`).bind(...leadValues),
      database.prepare(`INSERT INTO lead_score_history
        (id, lead_id, rule_version_id, raw_score, quality_score, hard_eligible, explanation_json, reason, is_original, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'original-submission', 1, 'system:lead-submission')`)
        .bind(crypto.randomUUID(), leadId, release.rule_version_id, assessment.rawPoints, assessment.qualityScore,
          assessment.hardEligible ? 1 : 0, explanation),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: leads.idempotency_key')) {
      const duplicate = await database.prepare('SELECT id FROM leads WHERE idempotency_key = ? LIMIT 1').bind(parsed.data.idempotencyKey).first<{ id: string }>();
      if (duplicate) return NextResponse.json({ ok: true, leadId: duplicate.id, duplicate: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return jsonError('submission_failed', 500);
  }

  return NextResponse.json({ ok: true, leadId }, { status: 201, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
