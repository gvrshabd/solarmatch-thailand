-- Representative pre-0005 record used to prove that the operational lead-table
-- rebuild preserves existing rows and their child score history.
INSERT INTO questionnaire_versions
  (id, version_number, state, schema_version, document_json, created_by)
VALUES ('residential-questionnaire-v1', 1, 'published', 4, '{}', 'system:test');

INSERT INTO rule_versions
  (id, version_number, state, configuration_json, created_by)
VALUES ('residential-rules-v1', 1, 'published', '{}', 'system:test');

INSERT INTO content_versions
  (id, version_number, state, content_json, created_by)
VALUES ('residential-content-v1', 1, 'published', '{}', 'system:test');

INSERT INTO legal_document_versions
  (id, version_number, state, documents_json, is_complete, created_by)
VALUES ('legal-placeholder-v1', 1, 'published', '{}', 0, 'system:test');

INSERT INTO public_releases (
  id, release_number, questionnaire_version_id, rule_version_id,
  content_version_id, legal_document_version_id, live_lead_submissions,
  is_current, created_by, contact_configuration_version_id, fact_set_version_id
) VALUES (
  'residential-release-v1', 1, 'residential-questionnaire-v1',
  'residential-rules-v1', 'residential-content-v1', 'legal-placeholder-v1',
  0, 1, 'system:test', 'contact-configuration-v1', 'solar-facts-v1'
);

INSERT INTO leads (
  id, idempotency_key, request_fingerprint, legal_first_name, legal_last_name,
  phone_e164, phone_display, preferred_contact_method, province, ownership_status,
  property_type, daytime_loads_json, air_conditioner_count, monthly_bill_thb,
  roof_material, roof_shade, roof_area, daytime_pattern, installation_timeframe,
  answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
  quality_score, hard_eligible, high_quality, scoring_explanation_json,
  consent_version, consent_text_en, consent_text_th, consented_at,
  receiving_company_en, receiving_company_th, source_locale,
  contact_collection_mode, contact_configuration_version_id, content_version_id,
  privacy_version, consent_scope, solar_match_followup_authorized,
  third_party_disclosure_authorized, recipient_snapshot_json,
  submission_environment, is_test_submission, distribution_allowed
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'migration-fixture-idempotency', 'migration-fixture-fingerprint',
  'Migration', 'Fixture', '+66812345678', '081 234 5678', 'phone',
  'bangkok', 'owner', 'detached-home', '["air-conditioning"]', 5, 6000,
  'concrete-tile', 'almost-none', '60-100', 'high', 'one-three-months',
  '{"province":"bangkok","monthlyBillThb":6000}',
  'residential-questionnaire-v1', 'residential-rules-v1', 'residential-release-v1',
  80, 5, 1, 1, '{"factors":[],"eligibilityReasons":[]}',
  'migration-fixture-consent', 'Fixture consent', 'ความยินยอมสำหรับการทดสอบ',
  '2026-09-01T00:00:00.000Z', 'Fixture Solar Co.', 'บริษัทโซลาร์สำหรับทดสอบ', 'en',
  'named_installer_handoff', 'contact-configuration-legacy-v0', 'residential-content-v1',
  'migration-fixture-consent', 'named_installer_site_assessment', 0, 1,
  '{"name":{"en":"Fixture Solar Co.","th":"บริษัทโซลาร์สำหรับทดสอบ"}}',
  'private_development_preview', 1, 0
);

INSERT INTO lead_score_history (
  id, lead_id, rule_version_id, raw_score, quality_score, hard_eligible,
  explanation_json, reason, is_original, created_by
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'residential-rules-v1', 80, 5, 1,
  '{"factors":[],"eligibilityReasons":[]}', 'migration-fixture', 1, 'system:test'
);
