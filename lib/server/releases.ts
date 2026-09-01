import { initialQuestionnaire, legacyQuestionnaireV1, legacyQuestionnaireV2 } from '@/config/assessment';
import { contactContent } from '@/config/contact-content';
import { legalLaunchDraft } from '@/config/legal-content';
import { initialLoadingFactSet } from '@/config/loading-facts';
import type { LoadingFactReference, PublicLoadingFact } from '@/lib/loading-facts/types';
import { initialScoringConfiguration, legacyScoringConfigurationV1, legacyScoringConfigurationV2, type ScoringConfiguration } from '@/lib/qualification/scoring';
import type { PublicAssessmentConfig, QuestionnaireDocument } from '@/lib/questionnaire/types';
import { publicContactConfiguration, restrictedOperationalContactConfiguration, type ContactConfigurationRow } from './contact-mode';
import { createAssessmentToken } from './assessment-token';
import { requireDatabase } from './runtime';

const seedActor = 'system:initial-migration';
const questionnaireId = legacyQuestionnaireV1.id;
const rulesId = legacyScoringConfigurationV1.id;
const contentId = 'residential-content-v1';
const legalId = 'legal-placeholder-v1';
const releaseId = 'residential-release-v1';
const contactConfigurationId = 'contact-configuration-v1';
const factSetId = initialLoadingFactSet.id;

export const initialPublicContent = contactContent;

export type ReleaseRow = ContactConfigurationRow & {
  release_id: string;
  questionnaire_version_id: string;
  rule_version_id: string;
  questionnaire_json: string;
  rules_json: string;
  live_lead_submissions: number;
  fact_set_version_id: string | null;
};

type FactRow = {
  stable_fact_id: string;
  title_en: string;
  title_th: string;
  fact_copy_en: string;
  fact_copy_th: string;
  alt_en: string;
  alt_th: string;
  sketch_source_type: 'built-in' | 'r2-media';
  built_in_sketch_id: string | null;
  media_asset_id: string | null;
  short_citation: string;
  reference_json: string;
  resources_anchor: string;
  enabled: number;
  weight: number;
  source_reviewed_on: string;
};

export async function ensureInitialRelease(database = requireDatabase()) {
  const existing = await database.prepare('SELECT id FROM public_releases LIMIT 1').first<{ id: string }>();
  if (existing) return;

  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO questionnaire_versions
      (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', 4, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireId, JSON.stringify(legacyQuestionnaireV1), seedActor, seedActor),
    database.prepare(`INSERT INTO rule_versions
      (id, version_number, state, configuration_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(rulesId, JSON.stringify(legacyScoringConfigurationV1), seedActor, seedActor),
    database.prepare(`INSERT INTO content_versions
      (id, version_number, state, content_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contentId, JSON.stringify(initialPublicContent), seedActor, seedActor),
    database.prepare(`INSERT INTO legal_document_versions
      (id, version_number, state, documents_json, is_complete, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, 0, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(legalId, JSON.stringify({ operator: null, privacyContact: null, privacy: null, terms: null }), seedActor, seedActor),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, contact_configuration_version_id, fact_set_version_id, created_by, published_by, published_at)
      VALUES (?, 1, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(releaseId, questionnaireId, rulesId, contentId, legalId, contactConfigurationId, factSetId, seedActor, seedActor),
  ];

  legacyQuestionnaireV1.questions.forEach((question, questionIndex) => {
    const questionRowId = `${questionnaireId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionRowId, questionnaireId, question.id, questionIndex, question.type, question.required ? 1 : 0,
        question.title.en, question.title.th, question.help.en, question.help.th,
        question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => {
      statements.push(database.prepare(`INSERT INTO assessment_options
        (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${questionRowId}:${option.value}`, questionRowId, option.value, optionIndex,
          option.label.en, option.label.th, option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0));
    });
  });

  const factorMaximums: Record<string, number> = {
    ownership: 10, 'air-conditioners': 18, 'monthly-bill': 15, 'daytime-use': 12, 'daytime-loads': 5,
    'roof-area': 10, shade: 10, 'roof-material': 5, 'property-type': 5, location: 5, timeframe: 5,
  };
  Object.entries(factorMaximums).forEach(([key, maximum]) => {
    statements.push(database.prepare(`INSERT INTO scoring_rules
      (id, rule_version_id, factor_key, maximum_points, configuration_json) VALUES (?, ?, ?, ?, ?)`)
      .bind(`${rulesId}:${key}`, rulesId, key, maximum, JSON.stringify({ implementation: 'residential-rules-v1', factor: key })));
  });
  statements.push(
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'ownership-status', 'equals', ?)`)
      .bind(`${rulesId}:ownership-status`, rulesId, JSON.stringify('owner')),
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'air-conditioner-count', 'greater-than-or-equal', ?)`)
      .bind(`${rulesId}:air-conditioner-count`, rulesId, JSON.stringify(4)),
  );
  await database.batch(statements);
}

/**
 * Seeds the legal-launch questionnaire and scoring release after migration 0003.
 * The legal documents remain an unpublished, pending-review draft and contact
 * collection remains disabled. This is intentionally idempotent.
 */
export async function ensureLegalLaunchRelease(database = requireDatabase()) {
  const existing = await database.prepare('SELECT id FROM public_releases WHERE id = ? LIMIT 1')
    .bind('residential-release-v2').first<{ id: string }>();
  if (existing) return;

  const actor = 'system:legal-launch-v2';
  const questionnaireVersionId = legacyQuestionnaireV2.id;
  const ruleVersionId = legacyScoringConfigurationV2.id;
  const contentVersionId = 'residential-content-v2';
  const legalDraftId = 'legal-launch-draft-v2';
  const contactVersionId = 'contact-configuration-v2';
  const legalLaunchFactSetId = 'solar-facts-v2';
  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO questionnaire_versions
      (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
      VALUES (?, 2, 'published', 5, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireVersionId, JSON.stringify(legacyQuestionnaireV2), actor, actor),
    database.prepare(`INSERT INTO rule_versions
      (id, version_number, state, configuration_json, created_by, published_by, published_at)
      VALUES (?, 2, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(ruleVersionId, JSON.stringify(legacyScoringConfigurationV2), actor, actor),
    database.prepare(`INSERT INTO content_versions
      (id, version_number, state, content_json, created_by, published_by, published_at)
      VALUES (?, 2, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contentVersionId, JSON.stringify(contactContent), actor, actor),
    database.prepare(`INSERT INTO legal_document_versions
      (id, version_number, state, documents_json, is_complete, created_by, schema_version, operator_profile_json,
       review_status, updated_by, updated_at)
      VALUES (?, 2, 'draft', ?, 0, ?, 2, ?, 'pending-legal-review', ?, CURRENT_TIMESTAMP)`)
      .bind(legalDraftId, JSON.stringify(legalLaunchDraft), actor, JSON.stringify(legalLaunchDraft.operator), actor),
    database.prepare(`INSERT INTO contact_configuration_versions
      (id, version_number, state, contact_collection_mode, contact_collection_mode_v2, contact_collection_enabled, permitted_contact_methods_json,
       shared_fields_json, readiness_state, readiness_issues_json, created_by, published_by, published_at)
      VALUES (?, 2, 'published', 'disabled', 'disabled', 0, '["phone","line"]',
       '["legalFirstName","legalLastName","phone","preferredContactMethod","lineId","assessmentAnswers"]',
       'incomplete', '["operator and legal configuration is incomplete","no active contracted solar company is available"]', ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contactVersionId, actor, actor),
    database.prepare(`INSERT INTO loading_fact_set_versions
      (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
      VALUES (?, 2, 'published', 1, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(legalLaunchFactSetId, JSON.stringify({ ...initialLoadingFactSet, id: legalLaunchFactSetId }), actor, actor),
  ];

  initialLoadingFactSet.facts.forEach((fact, factIndex) => {
    statements.push(database.prepare(`INSERT INTO loading_facts
      (id, fact_set_version_id, stable_fact_id, display_order, title_en, title_th, fact_copy_en, fact_copy_th,
       alt_en, alt_th, sketch_source_type, built_in_sketch_id, media_asset_id, short_citation, reference_json,
       resources_anchor, enabled, weight, source_reviewed_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(`${legalLaunchFactSetId}:${fact.id}`, legalLaunchFactSetId, fact.id, factIndex,
        fact.title.en, fact.title.th, fact.copy.en, fact.copy.th, fact.alt.en, fact.alt.th,
        fact.sketchSource, fact.sketchId, fact.mediaId, fact.reference.citation, JSON.stringify(fact.reference),
        fact.resourcesAnchor, fact.enabled ? 1 : 0, fact.weight, fact.reviewedOn));
  });

  legacyQuestionnaireV2.questions.forEach((question, questionIndex) => {
    const questionRowId = `${questionnaireVersionId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionRowId, questionnaireVersionId, question.id, questionIndex, question.type, question.required ? 1 : 0,
        question.title.en, question.title.th, question.help.en, question.help.th,
        question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => {
      statements.push(database.prepare(`INSERT INTO assessment_options
        (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${questionRowId}:${option.value}`, questionRowId, option.value, optionIndex,
          option.label.en, option.label.th, option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0));
    });
  });

  const factorMaximums: Record<string, number> = {
    ownership: 10, 'air-conditioners': 18, 'monthly-bill': 17, 'daytime-use': 13, 'daytime-loads': 5,
    'roof-area': 11, shade: 11, 'roof-material': 5, 'property-type': 5, location: 5,
  };
  Object.entries(factorMaximums).forEach(([key, maximum]) => {
    statements.push(database.prepare(`INSERT INTO scoring_rules
      (id, rule_version_id, factor_key, maximum_points, configuration_json) VALUES (?, ?, ?, ?, ?)`)
      .bind(`${ruleVersionId}:${key}`, ruleVersionId, key, maximum, JSON.stringify({ implementation: ruleVersionId, factor: key })));
  });
  statements.push(
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'ownership-status', 'equals', ?)`)
      .bind(`${ruleVersionId}:ownership-status`, ruleVersionId, JSON.stringify('owner')),
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'air-conditioner-count', 'greater-than-or-equal', ?)`)
      .bind(`${ruleVersionId}:air-conditioner-count`, ruleVersionId, JSON.stringify(4)),
    database.prepare('UPDATE public_releases SET is_current = 0 WHERE is_current = 1'),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, contact_configuration_version_id, fact_set_version_id, created_by, published_by, published_at)
      VALUES ('residential-release-v2', 2, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireVersionId, ruleVersionId, contentVersionId, legalId, contactVersionId, legalLaunchFactSetId, actor, actor),
  );
  await database.batch(statements);
}

/**
 * Publishes the operational Access-restricted assessment release. Public lead
 * collection remains independently disabled until an administrator publishes
 * a legally ready contact configuration with public collection enabled.
 */
export async function ensureOperationalContactRelease(database = requireDatabase()) {
  const existing = await database.prepare('SELECT id FROM public_releases WHERE id = ? LIMIT 1')
    .bind('residential-release-v3').first<{ id: string }>();
  if (existing) return;

  const actor = 'system:operational-contact-v3';
  const questionnaireVersionId = initialQuestionnaire.id;
  const ruleVersionId = initialScoringConfiguration.id;
  const contentVersionId = 'residential-content-v3';
  const contactVersionId = 'contact-configuration-v3';
  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO questionnaire_versions
      (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
      VALUES (?, 3, 'published', 6, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireVersionId, JSON.stringify(initialQuestionnaire), actor, actor),
    database.prepare(`INSERT INTO rule_versions
      (id, version_number, state, configuration_json, created_by, published_by, published_at)
      VALUES (?, 3, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(ruleVersionId, JSON.stringify(initialScoringConfiguration), actor, actor),
    database.prepare(`INSERT INTO content_versions
      (id, version_number, state, content_json, created_by, published_by, published_at)
      VALUES (?, 3, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contentVersionId, JSON.stringify(contactContent), actor, actor),
    database.prepare(`INSERT INTO contact_configuration_versions
      (id, version_number, state, contact_collection_mode, contact_collection_mode_v2, contact_collection_enabled,
       restricted_site_collection_enabled, public_collection_enabled, permitted_contact_methods_json,
       shared_fields_json, recipient_category, adult_confirmation_version_id, consent_version_id,
       privacy_notice_version_id, readiness_state, readiness_issues_json, created_by, published_by, published_at)
      VALUES (?, 3, 'published', 'validation_interest', 'shared_solar_company_handoff', 1,
       1, 0, '["phone","line"]',
       '["legalFirstName","legalLastName","phone","preferredContactMethod","lineId","assessmentAnswers"]',
       'participating_residential_solar_companies', 'restricted-operational-adult-v1',
       'restricted-operational-consent-v1', 'legal-placeholder-v1', 'incomplete',
       '["qualified Thai legal review is pending","public collection is disabled","no active contracted partner is configured"]',
       ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contactVersionId, actor, actor),
  ];

  initialQuestionnaire.questions.forEach((question, questionIndex) => {
    const questionRowId = `${questionnaireVersionId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionRowId, questionnaireVersionId, question.id, questionIndex, question.type, question.required ? 1 : 0,
        question.title.en, question.title.th, question.help.en, question.help.th,
        question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => statements.push(database.prepare(`INSERT INTO assessment_options
      (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(`${questionRowId}:${option.value}`, questionRowId, option.value, optionIndex,
        option.label.en, option.label.th, option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0)));
  });

  const factorMaximums: Record<string, number> = {
    ownership: 10, 'active-planning': 10, 'air-conditioners': 16, 'monthly-bill': 15,
    'daytime-use': 12, 'daytime-loads': 5, 'roof-area': 10, shade: 10,
    'roof-material': 4, 'property-type': 4, location: 4,
  };
  Object.entries(factorMaximums).forEach(([key, maximum]) => statements.push(database.prepare(`INSERT INTO scoring_rules
    (id, rule_version_id, factor_key, maximum_points, configuration_json) VALUES (?, ?, ?, ?, ?)`)
    .bind(`${ruleVersionId}:${key}`, ruleVersionId, key, maximum, JSON.stringify({ implementation: ruleVersionId, factor: key }))));
  statements.push(
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'ownership-status', 'equals', ?)`)
      .bind(`${ruleVersionId}:ownership-status`, ruleVersionId, JSON.stringify('owner')),
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'air-conditioner-count', 'greater-than-or-equal', ?)`)
      .bind(`${ruleVersionId}:air-conditioner-count`, ruleVersionId, JSON.stringify(4)),
    database.prepare('UPDATE public_releases SET is_current = 0 WHERE is_current = 1'),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, contact_configuration_version_id, fact_set_version_id,
       created_by, published_by, published_at)
      VALUES ('residential-release-v3', 3, ?, ?, ?, 'legal-placeholder-v1', 0, 1, ?, 'solar-facts-v2', ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireVersionId, ruleVersionId, contentVersionId, contactVersionId, actor, actor),
  );
  await database.batch(statements);
}

/**
 * Publishes an immutable content/contact release for the locked bilingual
 * consent wording. The assessment and scoring versions remain unchanged, and
 * previously accepted consent snapshots continue to reference their original
 * wording/version.
 */
export async function ensureLockedConsentRelease(database = requireDatabase()) {
  await ensureOperationalContactRelease(database);
  const releaseId = 'residential-release-v4';
  const existing = await database.prepare('SELECT id FROM public_releases WHERE id = ? LIMIT 1')
    .bind(releaseId).first<{ id: string }>();
  if (existing) return;

  const source = await database.prepare(`SELECT id, questionnaire_version_id, rule_version_id,
      legal_document_version_id, live_lead_submissions, contact_configuration_version_id, fact_set_version_id
    FROM public_releases WHERE is_current = 1 LIMIT 1`).first<{
      id: string;
      questionnaire_version_id: string;
      rule_version_id: string;
      legal_document_version_id: string;
      live_lead_submissions: number;
      contact_configuration_version_id: string;
      fact_set_version_id: string | null;
    }>();
  if (!source) throw new Error('The current SolarMatch release is unavailable.');

  const actor = 'system:locked-consent-v2';
  const contentVersionId = 'residential-content-consent-v2';
  const contactVersionId = 'contact-configuration-consent-v2';
  const contentVersion = await database.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS value FROM content_versions').first<{ value: number }>();
  const contactVersion = await database.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS value FROM contact_configuration_versions').first<{ value: number }>();
  const releaseVersion = await database.prepare('SELECT COALESCE(MAX(release_number), 0) + 1 AS value FROM public_releases').first<{ value: number }>();

  await database.batch([
    database.prepare(`INSERT INTO content_versions
      (id, version_number, state, content_json, created_by, published_by, published_at)
      VALUES (?, ?, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contentVersionId, contentVersion?.value ?? 4, JSON.stringify(contactContent), actor, actor),
    database.prepare(`INSERT INTO contact_configuration_versions
      (id, version_number, state, contact_collection_mode, contact_collection_enabled, retention_days,
       receiving_company_en, receiving_company_th, receiving_company_privacy_url,
       permitted_contact_methods_json, shared_fields_json, created_by, published_by, published_at,
       restored_from_id, contact_collection_mode_v2, distribution_window_days, recipient_category,
       adult_confirmation_version_id, consent_version_id, privacy_notice_version_id, terms_version_id,
       cookie_policy_version_id, operator_profile_version_id, internal_recipient_cap, readiness_state,
       readiness_issues_json, restricted_site_collection_enabled, public_collection_enabled)
      SELECT ?, ?, 'published', contact_collection_mode, contact_collection_enabled, retention_days,
       receiving_company_en, receiving_company_th, receiving_company_privacy_url,
       permitted_contact_methods_json, shared_fields_json, ?, ?, CURRENT_TIMESTAMP,
       id, contact_collection_mode_v2, distribution_window_days, recipient_category,
       adult_confirmation_version_id, 'restricted-operational-consent-v2', privacy_notice_version_id, terms_version_id,
       cookie_policy_version_id, operator_profile_version_id, internal_recipient_cap, readiness_state,
       readiness_issues_json, restricted_site_collection_enabled, public_collection_enabled
      FROM contact_configuration_versions WHERE id = ?`)
      .bind(contactVersionId, contactVersion?.value ?? 4, actor, actor, source.contact_configuration_version_id),
    database.prepare('UPDATE public_releases SET is_current = 0 WHERE is_current = 1'),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id,
       legal_document_version_id, live_lead_submissions, is_current, contact_configuration_version_id,
       fact_set_version_id, created_by, published_by, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(releaseId, releaseVersion?.value ?? 4, source.questionnaire_version_id, source.rule_version_id,
        contentVersionId, source.legal_document_version_id, source.live_lead_submissions,
        contactVersionId, source.fact_set_version_id, actor, actor),
  ]);
}

export async function getCurrentRelease(database = requireDatabase()) {
  await ensureInitialRelease(database);
  await ensureLegalLaunchRelease(database);
  await ensureLockedConsentRelease(database);
  return database.prepare(`SELECT
      r.id AS release_id, r.questionnaire_version_id, r.rule_version_id,
      q.document_json AS questionnaire_json, rv.configuration_json AS rules_json,
      r.live_lead_submissions, r.contact_configuration_version_id, r.fact_set_version_id,
      r.content_version_id, r.legal_document_version_id, c.content_json,
      COALESCE(cc.contact_collection_mode_v2, cc.contact_collection_mode) AS contact_collection_mode,
      cc.contact_collection_enabled, cc.retention_days,
      cc.restricted_site_collection_enabled, cc.public_collection_enabled,
      cc.distribution_window_days, cc.recipient_category, cc.adult_confirmation_version_id,
      cc.consent_version_id, cc.privacy_notice_version_id, cc.terms_version_id,
      cc.cookie_policy_version_id, cc.readiness_state,
      cc.receiving_company_en, cc.receiving_company_th, cc.receiving_company_privacy_url,
      cc.permitted_contact_methods_json, cc.shared_fields_json,
      l.is_complete AS legal_complete,
      (SELECT COUNT(*) FROM solar_company_partners p
       WHERE p.active = 1 AND p.contract_state = 'active' AND p.archived_at IS NULL
       AND (p.contract_effective_date IS NULL OR p.contract_effective_date <= date('now'))
       AND (p.contract_expiry_date IS NULL OR p.contract_expiry_date >= date('now'))
       AND (json_array_length(p.service_provinces_json) > 0 OR json_array_length(p.service_areas_json) > 0)) AS active_partner_count
    FROM public_releases r
    JOIN questionnaire_versions q ON q.id = r.questionnaire_version_id
    JOIN rule_versions rv ON rv.id = r.rule_version_id
    JOIN content_versions c ON c.id = r.content_version_id
    JOIN legal_document_versions l ON l.id = r.legal_document_version_id
    LEFT JOIN contact_configuration_versions cc ON cc.id = r.contact_configuration_version_id
    WHERE r.is_current = 1 AND q.state = 'published' AND rv.state = 'published' AND c.state = 'published' AND l.state = 'published'
    LIMIT 1`).first<ReleaseRow>();
}

export async function getPublishedLoadingFacts(factSetVersionId: string, database = requireDatabase()): Promise<PublicLoadingFact[]> {
  const version = await database.prepare("SELECT id FROM loading_fact_set_versions WHERE id = ? AND state = 'published' LIMIT 1").bind(factSetVersionId).first();
  if (!version) return [];
  const rows = await database.prepare(`SELECT stable_fact_id, title_en, title_th, fact_copy_en, fact_copy_th,
      alt_en, alt_th, sketch_source_type, built_in_sketch_id, media_asset_id, short_citation,
      reference_json, resources_anchor, enabled, weight, source_reviewed_on
    FROM loading_facts WHERE fact_set_version_id = ? AND enabled = 1 ORDER BY display_order, stable_fact_id`)
    .bind(factSetVersionId).all<FactRow>();
  return rows.results.map((row) => {
    const reference = JSON.parse(row.reference_json) as LoadingFactReference;
    const sketchId = row.built_in_sketch_id;
    return {
      id: row.stable_fact_id,
      title: { en: row.title_en, th: row.title_th },
      copy: { en: row.fact_copy_en, th: row.fact_copy_th },
      alt: { en: row.alt_en, th: row.alt_th },
      sketchSource: row.sketch_source_type === 'r2-media' ? 'media' : 'built-in',
      sketchId,
      mediaId: row.media_asset_id,
      imageUrl: row.sketch_source_type === 'built-in' && sketchId ? `/images/loading-facts/${sketchId}.svg` : `/media/${row.media_asset_id}`,
      resourcesAnchor: row.resources_anchor,
      reference: { ...reference, citation: row.short_citation },
      enabled: Boolean(row.enabled),
      weight: row.weight,
      reviewedOn: row.source_reviewed_on,
    };
  });
}

export async function getPublicAssessmentConfig(options: { restrictedAccess?: boolean } = {}): Promise<PublicAssessmentConfig> {
  const release = await getCurrentRelease();
  if (!release) throw new Error('No published SolarMatch release is available.');
  const accessRestrictedSession = Boolean(options.restrictedAccess);
  const configuredContact = accessRestrictedSession
    ? restrictedOperationalContactConfiguration(release)
    : publicContactConfiguration(release);
  const shouldIssueToken = configuredContact.enabled && (
    (accessRestrictedSession && configuredContact.restrictedSiteCollectionEnabled)
    || (!accessRestrictedSession && configuredContact.publicCollectionEnabled && Boolean(release.live_lead_submissions))
  );
  const token = shouldIssueToken
    ? await createAssessmentToken({
      releaseId: release.release_id,
      questionnaireVersionId: release.questionnaire_version_id,
      ruleVersionId: release.rule_version_id,
    })
    : null;
  const liveLeadSubmissions = Boolean(shouldIssueToken && token);
  const contact = liveLeadSubmissions ? configuredContact : { ...configuredContact, enabled: false };
  const loadingFactSetVersionId = release.fact_set_version_id ?? factSetId;
  const loadingFacts = await getPublishedLoadingFacts(loadingFactSetVersionId);
  return {
    privatePreview: false,
    accessRestrictedSession,
    restrictedSiteCollectionEnabled: configuredContact.restrictedSiteCollectionEnabled,
    publicCollectionEnabled: configuredContact.publicCollectionEnabled,
    releaseId: release.release_id,
    questionnaireVersionId: release.questionnaire_version_id,
    ruleVersionId: release.rule_version_id,
    questionnaire: JSON.parse(release.questionnaire_json) as QuestionnaireDocument,
    assessmentToken: token?.token ?? null,
    assessmentTokenExpiresAt: token?.expiresAt ?? null,
    liveLeadSubmissions,
    receivingCompany: contact.recipient?.name ?? null,
    contact,
    loadingFactSetVersionId,
    loadingFacts,
  };
}

export function parseScoringConfiguration(row: Pick<ReleaseRow, 'rules_json'>) {
  return JSON.parse(row.rules_json) as ScoringConfiguration;
}
