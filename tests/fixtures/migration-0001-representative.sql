PRAGMA foreign_keys = ON;

INSERT INTO questionnaire_versions (id, version_number, state, schema_version, document_json, created_by)
VALUES ('fixture-questionnaire-v1', 1, 'published', 4, '{"id":"fixture-questionnaire-v1","schemaVersion":4,"questions":[]}', 'fixture');
INSERT INTO rule_versions (id, version_number, state, configuration_json, created_by)
VALUES ('fixture-rules-v1', 1, 'published', '{}', 'fixture');
INSERT INTO content_versions (id, version_number, state, content_json, created_by)
VALUES ('residential-content-v1', 1, 'published', '{}', 'fixture');
INSERT INTO legal_document_versions (id, version_number, state, documents_json, is_complete, created_by)
VALUES ('fixture-legal-v1', 1, 'published', '{}', 1, 'fixture');
INSERT INTO public_releases
  (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
   live_lead_submissions, is_current, receiving_company_en, receiving_company_th, receiving_company_privacy_url,
   retention_days, created_by)
VALUES
  ('fixture-release-v1', 1, 'fixture-questionnaire-v1', 'fixture-rules-v1', 'residential-content-v1', 'fixture-legal-v1',
   1, 1, 'Fixture Solar Co., Ltd.', 'บริษัท ฟิกซ์เจอร์ โซลาร์ จำกัด', 'https://example.com/privacy', 180, 'fixture');

INSERT INTO leads
  (id, idempotency_key, request_fingerprint, legal_first_name, legal_last_name, phone_e164, phone_display,
   preferred_contact_method, line_id, province, ownership_status, property_type, daytime_loads_json,
   air_conditioner_count, monthly_bill_thb, roof_material, roof_shade, roof_area, daytime_pattern,
   installation_timeframe, answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
   quality_score, hard_eligible, high_quality, scoring_explanation_json, status, selection_override, archived_at,
   consent_version, consent_text_en, consent_text_th, consented_at, receiving_company_en, receiving_company_th,
   source_locale)
VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'fixture-fingerprint',
   'Somchai', 'Jaidee', '+66812345678', '081 234 5678', 'phone', NULL, 'bangkok', 'owner', 'detached-home',
   '["air-conditioning"]', 8, 12000, 'concrete-tile', 'little', '100-200', 'very-high', 'one-three-months',
   '{"province":"bangkok","monthlyBillThb":12000,"propertyType":"detached-home","ownershipStatus":"owner","roofArea":"100-200","daytimePattern":"very-high","daytimeLoads":["air-conditioning"],"airConditionerCount":8,"roofMaterial":"concrete-tile","shade":"little","installationTimeframe":"one-three-months"}',
   'fixture-questionnaire-v1', 'fixture-rules-v1', 'fixture-release-v1', 92, 5, 1, 1, '{"factors":[]}',
   'archived', 'selected', CURRENT_TIMESTAMP, 'fixture-privacy-v1', 'Fixture consent EN', 'Fixture consent TH',
   CURRENT_TIMESTAMP, 'Fixture Solar Co., Ltd.', 'บริษัท ฟิกซ์เจอร์ โซลาร์ จำกัด', 'th');

INSERT INTO lead_score_history
  (id, lead_id, rule_version_id, raw_score, quality_score, hard_eligible, explanation_json, reason, is_original, created_by)
VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'fixture-rules-v1', 92, 5, 1, '{}', 'original-submission', 1, 'fixture');
INSERT INTO lead_status_events (id, lead_id, previous_status, new_status, reason, actor_email)
VALUES ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'new', 'archived', 'fixture', 'fixture@example.com');
INSERT INTO lead_notes (id, lead_id, note, actor_email)
VALUES ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'Fixture note', 'fixture@example.com');
INSERT INTO export_batches (id, created_by, lead_count, format_version)
VALUES ('66666666-6666-4666-8666-666666666666', 'fixture@example.com', 1, 'clipboard-v1');
INSERT INTO export_batch_items (export_batch_id, lead_id, snapshot_json)
VALUES ('66666666-6666-4666-8666-666666666666', '11111111-1111-4111-8111-111111111111', '{"phone":"081 234 5678"}');
