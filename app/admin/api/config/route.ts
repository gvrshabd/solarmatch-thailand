import { NextResponse } from 'next/server';
import { z } from 'zod';
import { builtInLoadingSketchIds } from '@/config/loading-facts';
import type { LoadingFact, LoadingFactSet } from '@/lib/loading-facts/types';
import { validateScoringConfiguration } from '@/lib/qualification/scoring';
import type { ContactCollectionMode, QuestionnaireDocument } from '@/lib/questionnaire/types';
import { questionnaireDocumentSchema, scoringConfigurationSchema } from '@/lib/questionnaire/validation';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { assessContactReadiness, type ContactConfigurationRow } from '@/lib/server/contact-mode';
import { restrictedSiteAccessConfiguration } from '@/lib/server/private-preview-auth';
import { ensureInitialRelease, ensureLegalLaunchRelease, ensureLockedConsentRelease } from '@/lib/server/releases';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const localizedTextSchema = z.object({ en: z.string().trim().min(1).max(5000), th: z.string().trim().min(1).max(5000) });
const referenceSchema = z.object({
  citation: z.string().trim().min(1).max(300),
  fullReference: z.string().trim().min(1).max(5000),
  url: z.url().refine((value) => value.startsWith('https://'), 'Reference URLs must use HTTPS.'),
  context: localizedTextSchema,
});
const loadingFactSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(80),
  title: localizedTextSchema,
  copy: localizedTextSchema,
  alt: localizedTextSchema,
  sketchSource: z.enum(['built-in', 'media']),
  sketchId: z.string().max(80).nullable(),
  mediaId: z.string().uuid().nullable(),
  resourcesAnchor: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(80),
  reference: referenceSchema,
  enabled: z.boolean(),
  weight: z.number().int().min(1).max(20),
  reviewedOn: z.iso.date(),
});
const loadingFactSetSchema = z.object({ id: z.string().max(100), schemaVersion: z.literal(1), facts: z.array(loadingFactSchema).min(1).max(30) }).superRefine((value, context) => {
  const ids = new Set<string>(); const anchors = new Set<string>();
  value.facts.forEach((fact, index) => {
    if (ids.has(fact.id)) context.addIssue({ code: 'custom', path: ['facts', index, 'id'], message: 'Fact IDs must be unique.' });
    if (anchors.has(fact.resourcesAnchor)) context.addIssue({ code: 'custom', path: ['facts', index, 'resourcesAnchor'], message: 'Resources anchors must be unique.' });
    ids.add(fact.id); anchors.add(fact.resourcesAnchor);
    if (fact.sketchSource === 'built-in' && (!fact.sketchId || !builtInLoadingSketchIds.has(fact.sketchId))) context.addIssue({ code: 'custom', path: ['facts', index, 'sketchId'], message: 'Choose a known built-in sketch.' });
    if (fact.sketchSource === 'built-in' && fact.mediaId) context.addIssue({ code: 'custom', path: ['facts', index, 'mediaId'], message: 'Built-in sketches cannot also use media.' });
    if (fact.sketchSource === 'media' && (!fact.mediaId || fact.sketchId)) context.addIssue({ code: 'custom', path: ['facts', index, 'mediaId'], message: 'Media facts require one media ID and no built-in sketch.' });
  });
});
const contactDraftSchema = z.object({
  mode: z.enum(['disabled', 'validation_interest', 'named_installer_handoff', 'shared_solar_company_handoff']),
  enabled: z.boolean(),
  restrictedSiteCollectionEnabled: z.boolean(),
  publicCollectionEnabled: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650).nullable(),
  distributionWindowDays: z.number().int().min(1).max(365).nullable(),
  recipientCategory: z.string().trim().max(200).nullable(),
  adultConfirmationVersionId: z.string().trim().max(100).nullable(),
  consentVersionId: z.string().trim().max(100).nullable(),
  privacyNoticeVersionId: z.string().trim().max(100).nullable(),
  termsVersionId: z.string().trim().max(100).nullable(),
  cookiePolicyVersionId: z.string().trim().max(100).nullable(),
  internalRecipientCap: z.number().int().min(1).max(20).nullable(),
  receivingCompanyEn: z.string().trim().max(300).nullable(),
  receivingCompanyTh: z.string().trim().max(300).nullable(),
  receivingCompanyPrivacyUrl: z.union([z.url().refine((value) => value.startsWith('https://')), z.literal(''), z.null()]),
  permittedContactMethods: z.array(z.enum(['phone', 'line'])).min(1).max(2),
  sharedFields: z.array(z.enum(['legalFirstName', 'legalLastName', 'phone', 'preferredContactMethod', 'lineId', 'assessmentAnswers'])).min(1).max(6),
}).superRefine((value, context) => {
  if (value.mode === 'disabled' && value.enabled) context.addIssue({ code: 'custom', path: ['enabled'], message: 'Disabled mode cannot be enabled.' });
  if (!value.enabled && (value.restrictedSiteCollectionEnabled || value.publicCollectionEnabled)) context.addIssue({ code: 'custom', path: ['enabled'], message: 'Collection switches require the contact configuration to be enabled.' });
  if (value.mode === 'validation_interest' && (value.receivingCompanyEn || value.receivingCompanyTh || value.receivingCompanyPrivacyUrl)) context.addIssue({ code: 'custom', path: ['mode'], message: 'Validation mode cannot name an installer.' });
  if (value.mode === 'shared_solar_company_handoff' && value.recipientCategory !== 'participating_residential_solar_companies') context.addIssue({ code: 'custom', path: ['recipientCategory'], message: 'Shared mode must use the disclosed participating residential solar-company category.' });
});

const versionKindSchema = z.enum(['questionnaire', 'rules', 'contact', 'facts']);

function legacyContactMode(mode: ContactCollectionMode) {
  // Migration 0002's column cannot represent shared handoff. The v2 column is
  // authoritative; validation_interest is the harmless fail-closed legacy value.
  return mode === 'shared_solar_company_handoff' ? 'validation_interest' : mode;
}
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save-questionnaire-draft'), document: questionnaireDocumentSchema }),
  z.object({ action: z.literal('save-rules-draft'), configuration: scoringConfigurationSchema }),
  z.object({ action: z.literal('save-contact-draft'), configuration: contactDraftSchema }),
  z.object({ action: z.literal('save-facts-draft'), factSet: loadingFactSetSchema }),
  z.object({ action: z.literal('publish'), kind: versionKindSchema, versionId: z.string().min(1).max(100) }),
  z.object({ action: z.literal('restore'), kind: versionKindSchema, versionId: z.string().min(1).max(100) }),
]);

type FactRow = {
  stable_fact_id: string; title_en: string; title_th: string; fact_copy_en: string; fact_copy_th: string;
  alt_en: string; alt_th: string; sketch_source_type: 'built-in' | 'r2-media'; built_in_sketch_id: string | null;
  media_asset_id: string | null; short_citation: string; reference_json: string; resources_anchor: string;
  enabled: number; weight: number; source_reviewed_on: string;
};

function factFromRow(row: FactRow): LoadingFact {
  const reference = JSON.parse(row.reference_json) as LoadingFact['reference'];
  return {
    id: row.stable_fact_id, title: { en: row.title_en, th: row.title_th }, copy: { en: row.fact_copy_en, th: row.fact_copy_th },
    alt: { en: row.alt_en, th: row.alt_th }, sketchSource: row.sketch_source_type === 'r2-media' ? 'media' : 'built-in', sketchId: row.built_in_sketch_id,
    mediaId: row.media_asset_id, resourcesAnchor: row.resources_anchor, reference: { ...reference, citation: row.short_citation },
    enabled: Boolean(row.enabled), weight: row.weight, reviewedOn: row.source_reviewed_on,
  };
}

async function readFactSet(database: D1Database, id: string): Promise<LoadingFactSet | null> {
  const version = await database.prepare('SELECT id FROM loading_fact_set_versions WHERE id = ? LIMIT 1').bind(id).first<{ id: string }>();
  if (!version) return null;
  const rows = await database.prepare(`SELECT stable_fact_id, title_en, title_th, fact_copy_en, fact_copy_th, alt_en, alt_th,
    sketch_source_type, built_in_sketch_id, media_asset_id, short_citation, reference_json, resources_anchor, enabled, weight, source_reviewed_on
    FROM loading_facts WHERE fact_set_version_id = ? ORDER BY display_order, stable_fact_id`).bind(id).all<FactRow>();
  return { id, schemaVersion: 1, facts: rows.results.map(factFromRow) };
}

function factStatements(database: D1Database, versionId: string, facts: LoadingFact[]) {
  return facts.map((fact, index) => database.prepare(`INSERT INTO loading_facts
    (id, fact_set_version_id, stable_fact_id, display_order, weight, enabled, title_en, title_th, fact_copy_en, fact_copy_th,
     alt_en, alt_th, sketch_source_type, built_in_sketch_id, media_asset_id, short_citation, reference_json,
     source_context_en, source_context_th, resources_anchor, source_reviewed_on)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(`${versionId}:${fact.id}`, versionId, fact.id, index, fact.weight, fact.enabled ? 1 : 0, fact.title.en, fact.title.th,
      fact.copy.en, fact.copy.th, fact.alt.en, fact.alt.th, fact.sketchSource === 'media' ? 'r2-media' : 'built-in', fact.sketchId, fact.mediaId,
      fact.reference.citation, JSON.stringify(fact.reference), fact.reference.context.en, fact.reference.context.th,
      fact.resourcesAnchor, fact.reviewedOn));
}

async function insertQuestionRows(database: D1Database, versionId: string, document: QuestionnaireDocument) {
  const statements: D1PreparedStatement[] = [];
  document.questions.forEach((question, index) => {
    const questionId = `${versionId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionId, versionId, question.id, index, question.type, question.required ? 1 : 0, question.title.en, question.title.th,
        question.help.en, question.help.th, question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => statements.push(database.prepare(`INSERT INTO assessment_options
      (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(`${questionId}:${option.value}`, questionId, option.value, optionIndex, option.label.en, option.label.th,
        option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0)));
  });
  if (statements.length) await database.batch(statements);
}

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const database = requireDatabase(); await ensureInitialRelease(database); await ensureLegalLaunchRelease(database); await ensureLockedConsentRelease(database);
  const [questionnaires, rules, contacts, factVersions, release, audit] = await Promise.all([
    database.prepare('SELECT id, version_number, state, document_json, created_by, created_at, published_at, restored_from_id FROM questionnaire_versions ORDER BY version_number DESC LIMIT 30').all(),
    database.prepare('SELECT id, version_number, state, configuration_json, created_by, created_at, published_at, restored_from_id FROM rule_versions ORDER BY version_number DESC LIMIT 30').all(),
    database.prepare(`SELECT *, COALESCE(contact_collection_mode_v2, contact_collection_mode) AS contact_collection_mode
      FROM contact_configuration_versions ORDER BY version_number DESC LIMIT 30`).all(),
    database.prepare('SELECT id, version_number, state, created_by, created_at, published_at, restored_from_id FROM loading_fact_set_versions ORDER BY version_number DESC LIMIT 30').all(),
    database.prepare('SELECT * FROM public_releases WHERE is_current = 1 LIMIT 1').first(),
    database.prepare('SELECT id, actor_email, action, entity_type, entity_id, created_at FROM audit_events ORDER BY created_at DESC LIMIT 80').all(),
  ]);
  const facts = await Promise.all(factVersions.results.map(async (row) => ({ ...row, factSet: await readFactSet(database, String(row.id)) })));
  return NextResponse.json({
    questionnaires: questionnaires.results.map((row) => ({ ...row, document: JSON.parse(String(row.document_json)) })),
    rules: rules.results.map((row) => ({ ...row, configuration: JSON.parse(String(row.configuration_json)) })),
    contacts: contacts.results.map((row) => ({ ...row, permittedContactMethods: JSON.parse(String(row.permitted_contact_methods_json)), sharedFields: JSON.parse(String(row.shared_fields_json)) })),
    facts, release, audit: audit.results,
    restrictedSiteAccess: { configured: Boolean(restrictedSiteAccessConfiguration()) },
  }, { headers: { 'Cache-Control': 'no-store' } });
}

async function nextNumber(database: D1Database, table: string) {
  const row = await database.prepare(`SELECT COALESCE(MAX(version_number), 0) AS value FROM ${table}`).first<{ value: number }>();
  return (row?.value ?? 0) + 1;
}

async function createRelease(
  database: D1Database,
  identityEmail: string,
  kind: z.infer<typeof versionKindSchema>,
  versionId: string,
  versionTable: 'questionnaire_versions' | 'rule_versions' | 'contact_configuration_versions' | 'loading_fact_set_versions',
) {
  const current = await database.prepare('SELECT * FROM public_releases WHERE is_current = 1 LIMIT 1').first<Record<string, unknown>>();
  if (!current) throw new Error('release_not_found');
  const nextReleaseNumber = Number(current.release_number) + 1;
  const nextReleaseId = `residential-release-v${nextReleaseNumber}`;
  let questionnaire = String(current.questionnaire_version_id); let rules = String(current.rule_version_id);
  let contact = String(current.contact_configuration_version_id); let facts = String(current.fact_set_version_id);
  let live = Number(current.live_lead_submissions);
  let recipientEn = current.receiving_company_en ?? null; let recipientTh = current.receiving_company_th ?? null;
  let recipientUrl = current.receiving_company_privacy_url ?? null; let retention = current.retention_days ?? null;
  if (kind === 'questionnaire') questionnaire = versionId;
  if (kind === 'rules') rules = versionId;
  if (kind === 'facts') facts = versionId;
  if (kind === 'contact') {
    contact = versionId;
    const row = await database.prepare('SELECT * FROM contact_configuration_versions WHERE id = ?').bind(versionId).first<Record<string, unknown>>();
    if (!row) throw new Error('version_not_found');
    const resolvedMode = (row.contact_collection_mode_v2 ?? row.contact_collection_mode) as ContactCollectionMode;
    live = Number(row.public_collection_enabled);
    recipientEn = resolvedMode === 'named_installer_handoff' && row.receiving_company_en ? String(row.receiving_company_en) : null;
    recipientTh = resolvedMode === 'named_installer_handoff' && row.receiving_company_th ? String(row.receiving_company_th) : null;
    recipientUrl = resolvedMode === 'named_installer_handoff' && row.receiving_company_privacy_url ? String(row.receiving_company_privacy_url) : null;
    retention = row.retention_days === null || row.retention_days === undefined ? null : Number(row.retention_days);
  }
  await database.batch([
    database.prepare(`UPDATE ${versionTable} SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'published' AND id <> ?`).bind(versionId),
    database.prepare(`UPDATE ${versionTable} SET state = 'published', published_by = ?, published_at = CURRENT_TIMESTAMP WHERE id = ? AND state = 'draft'`).bind(identityEmail, versionId),
    database.prepare('UPDATE public_releases SET is_current = 0 WHERE is_current = 1'),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, receiving_company_en, receiving_company_th, receiving_company_privacy_url, retention_days,
       contact_configuration_version_id, fact_set_version_id, created_by, published_by, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(nextReleaseId, nextReleaseNumber, questionnaire, rules, current.content_version_id, current.legal_document_version_id,
        live, recipientEn, recipientTh, recipientUrl, retention, contact, facts, identityEmail, identityEmail),
    auditStatement(database, { actorEmail: identityEmail, action: `${kind}.published`, entityType: 'public-release', entityId: nextReleaseId, previous: { releaseId: current.id }, next: { questionnaire, rules, contact, facts, live } }),
  ]);
  return nextReleaseId;
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  let body: z.infer<typeof requestSchema>;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_configuration', issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) }, { status: 400 });
    body = parsed.data;
  } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const database = requireDatabase(); await ensureInitialRelease(database); await ensureLegalLaunchRelease(database); await ensureLockedConsentRelease(database);

  if (body.action === 'save-questionnaire-draft') {
    const version = await nextNumber(database, 'questionnaire_versions'); const id = `residential-questionnaire-v${version}`;
    const document = { ...body.document, id };
    await database.batch([database.prepare("UPDATE questionnaire_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare("INSERT INTO questionnaire_versions (id, version_number, state, schema_version, document_json, created_by) VALUES (?, ?, 'draft', ?, ?, ?)").bind(id, version, document.schemaVersion, JSON.stringify(document), identity.email), auditStatement(database, { actorEmail: identity.email, action: 'questionnaire.draft-created', entityType: 'questionnaire-version', entityId: id, next: document })]);
    await insertQuestionRows(database, id, document); return NextResponse.json({ ok: true, versionId: id });
  }
  if (body.action === 'save-rules-draft') {
    const errors = validateScoringConfiguration(body.configuration); if (errors.length) return NextResponse.json({ error: 'invalid_scoring_configuration', issues: errors }, { status: 400 });
    const version = await nextNumber(database, 'rule_versions'); const id = `residential-rules-v${version}`; const configuration = { ...body.configuration, id };
    await database.batch([database.prepare("UPDATE rule_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare("INSERT INTO rule_versions (id, version_number, state, configuration_json, created_by) VALUES (?, ?, 'draft', ?, ?)").bind(id, version, JSON.stringify(configuration), identity.email), auditStatement(database, { actorEmail: identity.email, action: 'rules.draft-created', entityType: 'rule-version', entityId: id, next: configuration })]);
    return NextResponse.json({ ok: true, versionId: id });
  }
  if (body.action === 'save-contact-draft') {
    const version = await nextNumber(database, 'contact_configuration_versions'); const id = `contact-configuration-v${version}`;
    const value = body.configuration; const validation = value.mode === 'validation_interest' || value.mode === 'shared_solar_company_handoff';
    await database.batch([
      database.prepare("UPDATE contact_configuration_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare(`INSERT INTO contact_configuration_versions
        (id, version_number, state, contact_collection_mode, contact_collection_mode_v2, contact_collection_enabled,
         restricted_site_collection_enabled, public_collection_enabled, retention_days, receiving_company_en,
         receiving_company_th, receiving_company_privacy_url, permitted_contact_methods_json, shared_fields_json,
         distribution_window_days, recipient_category, adult_confirmation_version_id, consent_version_id,
         privacy_notice_version_id, terms_version_id, cookie_policy_version_id, internal_recipient_cap,
         readiness_state, readiness_issues_json, created_by)
        VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'incomplete', '[]', ?)`)
        .bind(id, version, legacyContactMode(value.mode), value.mode, value.mode === 'disabled' ? 0 : value.enabled ? 1 : 0,
          value.restrictedSiteCollectionEnabled ? 1 : 0, value.publicCollectionEnabled ? 1 : 0, value.retentionDays,
          validation ? null : value.receivingCompanyEn || null, validation ? null : value.receivingCompanyTh || null,
          validation ? null : value.receivingCompanyPrivacyUrl || null, JSON.stringify(value.permittedContactMethods), JSON.stringify(value.sharedFields),
          value.distributionWindowDays, value.recipientCategory, value.adultConfirmationVersionId, value.consentVersionId,
          value.privacyNoticeVersionId, value.termsVersionId, value.cookiePolicyVersionId, value.internalRecipientCap, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'contact.draft-created', entityType: 'contact-configuration-version', entityId: id, next: value }),
    ]);
    return NextResponse.json({ ok: true, versionId: id });
  }
  if (body.action === 'save-facts-draft') {
    for (const fact of body.factSet.facts.filter((item) => item.sketchSource === 'media')) {
      const media = await database.prepare("SELECT id FROM media_assets WHERE id = ? AND publication_state = 'published' LIMIT 1").bind(fact.mediaId).first();
      if (!media) return NextResponse.json({ error: 'fact_media_must_be_published', factId: fact.id }, { status: 400 });
    }
    const version = await nextNumber(database, 'loading_fact_set_versions'); const id = `solar-facts-v${version}`; const factSet = { ...body.factSet, id };
    await database.batch([
      database.prepare("UPDATE loading_fact_set_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare("INSERT INTO loading_fact_set_versions (id, version_number, state, schema_version, document_json, created_by) VALUES (?, ?, 'draft', 1, ?, ?)").bind(id, version, JSON.stringify({ id, schemaVersion: 1 }), identity.email),
      ...factStatements(database, id, factSet.facts),
      auditStatement(database, { actorEmail: identity.email, action: 'facts.draft-created', entityType: 'loading-fact-set-version', entityId: id, next: { factCount: factSet.facts.length } }),
    ]);
    return NextResponse.json({ ok: true, versionId: id });
  }

  const mapping = {
    questionnaire: { table: 'questionnaire_versions', json: 'document_json', prefix: 'residential-questionnaire-v' },
    rules: { table: 'rule_versions', json: 'configuration_json', prefix: 'residential-rules-v' },
    contact: { table: 'contact_configuration_versions', json: null, prefix: 'contact-configuration-v' },
    facts: { table: 'loading_fact_set_versions', json: 'document_json', prefix: 'solar-facts-v' },
  } as const;
  const descriptor = mapping[body.kind];
  const target = await database.prepare(`SELECT * FROM ${descriptor.table} WHERE id = ? LIMIT 1`).bind(body.versionId).first<Record<string, unknown>>();
  if (!target) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });

  if (body.action === 'restore') {
    const version = await nextNumber(database, descriptor.table); const id = `${descriptor.prefix}${version}`;
    if (body.kind === 'questionnaire') {
      const document = JSON.parse(String(target.document_json)) as QuestionnaireDocument; document.id = id;
      await database.batch([database.prepare("UPDATE questionnaire_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare("INSERT INTO questionnaire_versions (id, version_number, state, schema_version, document_json, created_by, restored_from_id) VALUES (?, ?, 'draft', ?, ?, ?, ?)").bind(id, version, document.schemaVersion, JSON.stringify(document), identity.email, body.versionId), auditStatement(database, { actorEmail: identity.email, action: 'questionnaire.restored-to-draft', entityType: 'questionnaire-version', entityId: id, previous: { source: body.versionId } })]);
      await insertQuestionRows(database, id, document);
    } else if (body.kind === 'rules') {
      const configuration = JSON.parse(String(target.configuration_json)) as Record<string, unknown>; configuration.id = id;
      await database.batch([database.prepare("UPDATE rule_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare("INSERT INTO rule_versions (id, version_number, state, configuration_json, created_by, restored_from_id) VALUES (?, ?, 'draft', ?, ?, ?)").bind(id, version, JSON.stringify(configuration), identity.email, body.versionId), auditStatement(database, { actorEmail: identity.email, action: 'rules.restored-to-draft', entityType: 'rule-version', entityId: id, previous: { source: body.versionId } })]);
    } else if (body.kind === 'contact') {
      await database.batch([database.prepare("UPDATE contact_configuration_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare(`INSERT INTO contact_configuration_versions
        (id, version_number, state, contact_collection_mode, contact_collection_mode_v2, contact_collection_enabled,
         restricted_site_collection_enabled, public_collection_enabled, retention_days, receiving_company_en,
         receiving_company_th, receiving_company_privacy_url, permitted_contact_methods_json, shared_fields_json,
         distribution_window_days, recipient_category, adult_confirmation_version_id, consent_version_id,
         privacy_notice_version_id, terms_version_id, cookie_policy_version_id, internal_recipient_cap,
         readiness_state, readiness_issues_json, created_by, restored_from_id)
        VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'incomplete', '[]', ?, ?)`)
        .bind(id, version, legacyContactMode((target.contact_collection_mode_v2 ?? target.contact_collection_mode) as ContactCollectionMode),
          target.contact_collection_mode_v2 ?? target.contact_collection_mode, 0,
          target.restricted_site_collection_enabled ?? 0, 0, target.retention_days, target.receiving_company_en,
          target.receiving_company_th, target.receiving_company_privacy_url, target.permitted_contact_methods_json,
          target.shared_fields_json, target.distribution_window_days, target.recipient_category,
          target.adult_confirmation_version_id, target.consent_version_id, target.privacy_notice_version_id,
          target.terms_version_id, target.cookie_policy_version_id, target.internal_recipient_cap,
          identity.email, body.versionId), auditStatement(database, { actorEmail: identity.email, action: 'contact.restored-to-draft', entityType: 'contact-configuration-version', entityId: id, previous: { source: body.versionId } })]);
    } else {
      const factSet = await readFactSet(database, body.versionId); if (!factSet) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });
      await database.batch([database.prepare("UPDATE loading_fact_set_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"), database.prepare("INSERT INTO loading_fact_set_versions (id, version_number, state, schema_version, document_json, created_by, restored_from_id) VALUES (?, ?, 'draft', 1, ?, ?, ?)").bind(id, version, JSON.stringify({ id, schemaVersion: 1 }), identity.email, body.versionId), ...factStatements(database, id, factSet.facts), auditStatement(database, { actorEmail: identity.email, action: 'facts.restored-to-draft', entityType: 'loading-fact-set-version', entityId: id, previous: { source: body.versionId } })]);
    }
    return NextResponse.json({ ok: true, versionId: id });
  }

  if (target.state !== 'draft') return NextResponse.json({ error: 'only_drafts_can_be_published' }, { status: 409 });
  if (body.kind === 'questionnaire' && !questionnaireDocumentSchema.safeParse(JSON.parse(String(target.document_json))).success) return NextResponse.json({ error: 'invalid_questionnaire' }, { status: 400 });
  if (body.kind === 'rules') {
    const parsed = scoringConfigurationSchema.safeParse(JSON.parse(String(target.configuration_json)));
    if (!parsed.success || validateScoringConfiguration(parsed.data).length) return NextResponse.json({ error: 'invalid_rules' }, { status: 400 });
  }
  if (body.kind === 'facts') {
    const factSet = await readFactSet(database, body.versionId);
    if (!factSet || !loadingFactSetSchema.safeParse(factSet).success) return NextResponse.json({ error: 'invalid_fact_set' }, { status: 400 });
  }
  if (body.kind === 'contact') {
    const release = await database.prepare(`SELECT r.content_version_id, r.legal_document_version_id, c.content_json, l.is_complete AS legal_complete
      FROM public_releases r JOIN content_versions c ON c.id = r.content_version_id JOIN legal_document_versions l ON l.id = r.legal_document_version_id WHERE r.is_current = 1`).first<Record<string, unknown>>();
    const row: ContactConfigurationRow = {
      contact_configuration_version_id: String(target.id), contact_collection_mode: (target.contact_collection_mode_v2 ?? target.contact_collection_mode) as ContactCollectionMode,
      contact_collection_enabled: Number(target.contact_collection_enabled), retention_days: target.retention_days === null ? null : Number(target.retention_days),
      restricted_site_collection_enabled: Number(target.restricted_site_collection_enabled ?? 0),
      public_collection_enabled: Number(target.public_collection_enabled ?? 0),
      distribution_window_days: target.distribution_window_days === null ? null : Number(target.distribution_window_days),
      recipient_category: target.recipient_category as string | null,
      adult_confirmation_version_id: target.adult_confirmation_version_id as string | null,
      consent_version_id: target.consent_version_id as string | null,
      privacy_notice_version_id: target.privacy_notice_version_id as string | null,
      terms_version_id: target.terms_version_id as string | null,
      cookie_policy_version_id: target.cookie_policy_version_id as string | null,
      readiness_state: target.readiness_state as 'incomplete' | 'ready' | 'active' | null,
      active_partner_count: Number((await database.prepare(`SELECT COUNT(*) AS count FROM solar_company_partners
        WHERE active=1 AND contract_state='active' AND archived_at IS NULL
        AND (contract_effective_date IS NULL OR contract_effective_date <= date('now'))
        AND (contract_expiry_date IS NULL OR contract_expiry_date >= date('now'))
        AND (json_array_length(service_provinces_json) > 0 OR json_array_length(service_areas_json) > 0)`).first<{ count: number }>())?.count ?? 0),
      receiving_company_en: target.receiving_company_en as string | null, receiving_company_th: target.receiving_company_th as string | null,
      receiving_company_privacy_url: target.receiving_company_privacy_url as string | null, permitted_contact_methods_json: String(target.permitted_contact_methods_json),
      shared_fields_json: String(target.shared_fields_json), legal_complete: Number(release?.legal_complete ?? 0), content_version_id: String(release?.content_version_id ?? ''), legal_document_version_id: String(release?.legal_document_version_id ?? ''), content_json: String(release?.content_json ?? '{}'),
    };
    const readiness = assessContactReadiness(row);
    if (row.public_collection_enabled && !readiness.active) return NextResponse.json({ error: 'contact_configuration_not_ready', issues: readiness.issues }, { status: 409 });
    if (row.restricted_site_collection_enabled && !restrictedSiteAccessConfiguration()) return NextResponse.json({ error: 'restricted_site_access_not_configured' }, { status: 409 });
  }
  try {
    const releaseId = await createRelease(database, identity.email, body.kind, body.versionId, descriptor.table);
    return NextResponse.json({ ok: true, releaseId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'release_publish_failed' }, { status: 500 });
  }
}
