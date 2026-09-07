-- Operational owner-only collection remains independently controllable from
-- future public collection. Both switches default to off for older releases.
ALTER TABLE contact_configuration_versions ADD COLUMN restricted_site_collection_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (restricted_site_collection_enabled IN (0, 1));
ALTER TABLE contact_configuration_versions ADD COLUMN public_collection_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (public_collection_enabled IN (0, 1));

-- Rebuild leads without renaming the original table. With foreign-key checks
-- temporarily disabled, child-table references continue to target `leads`
-- after the replacement is renamed into place.
PRAGMA foreign_keys = OFF;

-- D1 may execute migrations inside a transaction where changing
-- `foreign_keys` is deferred. Snapshot every child table before replacing the
-- parent so ON DELETE actions cannot erase history even in that environment.
CREATE TABLE migration_0005_score_history_backup AS SELECT * FROM lead_score_history;
CREATE TABLE migration_0005_status_events_backup AS SELECT * FROM lead_status_events;
CREATE TABLE migration_0005_notes_backup AS SELECT * FROM lead_notes;
CREATE TABLE migration_0005_export_items_backup AS SELECT * FROM export_batch_items;
CREATE TABLE migration_0005_selections_backup AS SELECT * FROM lead_export_selections;
CREATE TABLE migration_0005_deliveries_backup AS SELECT * FROM lead_recipient_deliveries;
CREATE TABLE migration_0005_privacy_requests_backup AS SELECT * FROM privacy_rights_requests;

CREATE TABLE leads_operational (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  phone_e164 TEXT,
  phone_display TEXT,
  preferred_contact_method TEXT NOT NULL CHECK (preferred_contact_method IN ('phone', 'line')),
  line_id TEXT,
  province TEXT NOT NULL,
  custom_location TEXT,
  ownership_status TEXT NOT NULL CHECK (ownership_status IN ('owner', 'renter', 'other')),
  property_type TEXT NOT NULL,
  custom_property_type TEXT,
  daytime_loads_json TEXT NOT NULL CHECK (json_valid(daytime_loads_json)),
  custom_daytime_load TEXT,
  air_conditioner_count INTEGER NOT NULL CHECK (air_conditioner_count BETWEEN 0 AND 100),
  monthly_bill_thb INTEGER NOT NULL CHECK (monthly_bill_thb > 0),
  roof_material TEXT NOT NULL,
  custom_roof_material TEXT,
  roof_shade TEXT NOT NULL,
  roof_area TEXT NOT NULL,
  daytime_pattern TEXT NOT NULL,
  installation_timeframe TEXT NOT NULL,
  actively_planning_solar INTEGER CHECK (actively_planning_solar IS NULL OR actively_planning_solar IN (0, 1)),
  quote_contact_requested INTEGER CHECK (quote_contact_requested IS NULL OR quote_contact_requested IN (0, 1)),
  answers_json TEXT NOT NULL CHECK (json_valid(answers_json)),
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
  release_id TEXT NOT NULL REFERENCES public_releases(id),
  raw_score INTEGER NOT NULL CHECK (raw_score BETWEEN 0 AND 100),
  quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 5),
  hard_eligible INTEGER NOT NULL CHECK (hard_eligible IN (0, 1)),
  high_quality INTEGER NOT NULL CHECK (high_quality IN (0, 1)),
  scoring_explanation_json TEXT NOT NULL CHECK (json_valid(scoring_explanation_json)),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'exported', 'archived', 'deleted')),
  selection_override TEXT CHECK (selection_override IS NULL OR selection_override IN ('selected', 'deselected')),
  exported_at TEXT,
  archived_at TEXT,
  deleted_at TEXT,
  consent_version TEXT NOT NULL,
  consent_text_en TEXT NOT NULL,
  consent_text_th TEXT NOT NULL,
  consented_at TEXT NOT NULL,
  receiving_company_en TEXT,
  receiving_company_th TEXT,
  source_locale TEXT NOT NULL CHECK (source_locale IN ('en', 'th')),
  user_agent_summary TEXT,
  contact_collection_mode TEXT NOT NULL DEFAULT 'named_installer_handoff' CHECK (contact_collection_mode IN ('validation_interest', 'named_installer_handoff')),
  contact_configuration_version_id TEXT NOT NULL DEFAULT 'contact-configuration-legacy-v0' REFERENCES contact_configuration_versions(id),
  content_version_id TEXT NOT NULL DEFAULT 'residential-content-v1' REFERENCES content_versions(id),
  privacy_version TEXT NOT NULL DEFAULT 'legacy',
  consent_scope TEXT NOT NULL DEFAULT 'named_installer_site_assessment' CHECK (consent_scope IN ('solar_match_validation_followup', 'named_installer_site_assessment')),
  solar_match_followup_authorized INTEGER NOT NULL DEFAULT 0 CHECK (solar_match_followup_authorized IN (0, 1)),
  third_party_disclosure_authorized INTEGER NOT NULL DEFAULT 1 CHECK (third_party_disclosure_authorized IN (0, 1)),
  recipient_privacy_url TEXT,
  recipient_snapshot_json TEXT CHECK (recipient_snapshot_json IS NULL OR json_valid(recipient_snapshot_json)),
  retention_days_snapshot INTEGER CHECK (retention_days_snapshot IS NULL OR retention_days_snapshot BETWEEN 1 AND 3650),
  contact_collection_mode_v2 TEXT CHECK (contact_collection_mode_v2 IS NULL OR contact_collection_mode_v2 IN ('validation_interest', 'named_installer_handoff', 'shared_solar_company_handoff')),
  consent_scope_v2 TEXT CHECK (consent_scope_v2 IS NULL OR consent_scope_v2 IN ('solar_match_validation_followup', 'named_installer_site_assessment', 'shared_residential_solar_referral')),
  solar_match_followup_authorized_v2 INTEGER CHECK (solar_match_followup_authorized_v2 IS NULL OR solar_match_followup_authorized_v2 IN (0, 1)),
  third_party_disclosure_authorized_v2 INTEGER CHECK (third_party_disclosure_authorized_v2 IS NULL OR third_party_disclosure_authorized_v2 IN (0, 1)),
  distribution_window_days_snapshot INTEGER CHECK (distribution_window_days_snapshot IS NULL OR distribution_window_days_snapshot BETWEEN 1 AND 365),
  distribution_expires_at TEXT,
  recipient_category_snapshot TEXT,
  disclosed_fields_snapshot_json TEXT CHECK (disclosed_fields_snapshot_json IS NULL OR json_valid(disclosed_fields_snapshot_json)),
  adult_confirmation_version TEXT,
  adult_confirmation_text_en TEXT,
  adult_confirmation_text_th TEXT,
  adult_confirmed_at TEXT,
  privacy_notice_version_id TEXT,
  terms_version_id TEXT,
  cookie_policy_version_id TEXT,
  suppressed INTEGER NOT NULL DEFAULT 0 CHECK (suppressed IN (0, 1)),
  suppression_reason TEXT,
  suppressed_at TEXT,
  consent_withdrawn_at TEXT,
  legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0, 1)),
  purged_at TEXT,
  submission_environment TEXT NOT NULL DEFAULT 'production'
    CHECK (submission_environment IN ('production', 'private_development_preview', 'restricted_site_operational')),
  is_test_submission INTEGER NOT NULL DEFAULT 0 CHECK (is_test_submission IN (0, 1)),
  distribution_allowed INTEGER NOT NULL DEFAULT 1 CHECK (distribution_allowed IN (0, 1)),
  access_restricted_at_submission INTEGER NOT NULL DEFAULT 0 CHECK (access_restricted_at_submission IN (0, 1)),
  CHECK (
    (preferred_contact_method = 'phone' AND phone_e164 IS NOT NULL AND length(phone_e164) > 0 AND phone_display IS NOT NULL AND length(phone_display) > 0 AND line_id IS NULL)
    OR
    (preferred_contact_method = 'line' AND line_id IS NOT NULL AND length(line_id) > 0 AND phone_e164 IS NULL AND phone_display IS NULL)
    OR
    -- Historical rows may contain a phone number alongside a LINE preference.
    (is_test_submission = 1 AND preferred_contact_method = 'line' AND line_id IS NOT NULL AND length(line_id) > 0)
  ),
  CHECK (
    (contact_collection_mode = 'validation_interest' AND consent_scope = 'solar_match_validation_followup' AND solar_match_followup_authorized = 1 AND third_party_disclosure_authorized = 0 AND receiving_company_en IS NULL AND receiving_company_th IS NULL AND recipient_privacy_url IS NULL AND recipient_snapshot_json IS NULL)
    OR
    (contact_collection_mode = 'named_installer_handoff' AND consent_scope = 'named_installer_site_assessment' AND third_party_disclosure_authorized = 1 AND receiving_company_en IS NOT NULL AND receiving_company_th IS NOT NULL AND recipient_snapshot_json IS NOT NULL AND (contact_configuration_version_id = 'contact-configuration-legacy-v0' OR recipient_privacy_url IS NOT NULL))
  )
);

INSERT INTO leads_operational (
  id, created_at, updated_at, idempotency_key, request_fingerprint, legal_first_name, legal_last_name,
  phone_e164, phone_display, preferred_contact_method, line_id, province, custom_location, ownership_status,
  property_type, custom_property_type, daytime_loads_json, custom_daytime_load, air_conditioner_count,
  monthly_bill_thb, roof_material, custom_roof_material, roof_shade, roof_area, daytime_pattern,
  installation_timeframe, answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
  quality_score, hard_eligible, high_quality, scoring_explanation_json, status, selection_override,
  exported_at, archived_at, deleted_at, consent_version, consent_text_en, consent_text_th, consented_at,
  receiving_company_en, receiving_company_th, source_locale, user_agent_summary, contact_collection_mode,
  contact_configuration_version_id, content_version_id, privacy_version, consent_scope,
  solar_match_followup_authorized, third_party_disclosure_authorized, recipient_privacy_url,
  recipient_snapshot_json, retention_days_snapshot, contact_collection_mode_v2, consent_scope_v2,
  solar_match_followup_authorized_v2, third_party_disclosure_authorized_v2,
  distribution_window_days_snapshot, distribution_expires_at, recipient_category_snapshot,
  disclosed_fields_snapshot_json, adult_confirmation_version, adult_confirmation_text_en,
  adult_confirmation_text_th, adult_confirmed_at, privacy_notice_version_id, terms_version_id,
  cookie_policy_version_id, suppressed, suppression_reason, suppressed_at, consent_withdrawn_at,
  legal_hold, purged_at, submission_environment, is_test_submission, distribution_allowed
)
SELECT
  id, created_at, updated_at, idempotency_key, request_fingerprint, legal_first_name, legal_last_name,
  phone_e164, phone_display, preferred_contact_method, line_id, province, custom_location, ownership_status,
  property_type, custom_property_type, daytime_loads_json, custom_daytime_load, air_conditioner_count,
  monthly_bill_thb, roof_material, custom_roof_material, roof_shade, roof_area, daytime_pattern,
  installation_timeframe, answers_json, questionnaire_version_id, rule_version_id, release_id, raw_score,
  quality_score, hard_eligible, high_quality, scoring_explanation_json, status, selection_override,
  exported_at, archived_at, deleted_at, consent_version, consent_text_en, consent_text_th, consented_at,
  receiving_company_en, receiving_company_th, source_locale, user_agent_summary, contact_collection_mode,
  contact_configuration_version_id, content_version_id, privacy_version, consent_scope,
  solar_match_followup_authorized, third_party_disclosure_authorized, recipient_privacy_url,
  recipient_snapshot_json, retention_days_snapshot, contact_collection_mode_v2, consent_scope_v2,
  solar_match_followup_authorized_v2, third_party_disclosure_authorized_v2,
  distribution_window_days_snapshot, distribution_expires_at, recipient_category_snapshot,
  disclosed_fields_snapshot_json, adult_confirmation_version, adult_confirmation_text_en,
  adult_confirmation_text_th, adult_confirmed_at, privacy_notice_version_id, terms_version_id,
  cookie_policy_version_id, suppressed, suppression_reason, suppressed_at, consent_withdrawn_at,
  legal_hold, purged_at, submission_environment, is_test_submission, distribution_allowed
FROM leads;

DROP TABLE leads;
ALTER TABLE leads_operational RENAME TO leads;

-- Restore child history after the replacement parent exists. DELETE first so
-- both CASCADE and SET NULL foreign-key actions are handled deterministically.
DELETE FROM lead_score_history;
INSERT INTO lead_score_history SELECT * FROM migration_0005_score_history_backup;
DELETE FROM lead_status_events;
INSERT INTO lead_status_events SELECT * FROM migration_0005_status_events_backup;
DELETE FROM lead_notes;
INSERT INTO lead_notes SELECT * FROM migration_0005_notes_backup;
DELETE FROM export_batch_items;
INSERT INTO export_batch_items SELECT * FROM migration_0005_export_items_backup;
DELETE FROM lead_export_selections;
INSERT INTO lead_export_selections SELECT * FROM migration_0005_selections_backup;
DELETE FROM lead_recipient_deliveries;
INSERT INTO lead_recipient_deliveries SELECT * FROM migration_0005_deliveries_backup;
DELETE FROM privacy_rights_requests;
INSERT INTO privacy_rights_requests SELECT * FROM migration_0005_privacy_requests_backup;

DROP TABLE migration_0005_score_history_backup;
DROP TABLE migration_0005_status_events_backup;
DROP TABLE migration_0005_notes_backup;
DROP TABLE migration_0005_export_items_backup;
DROP TABLE migration_0005_selections_backup;
DROP TABLE migration_0005_deliveries_backup;
DROP TABLE migration_0005_privacy_requests_backup;

CREATE INDEX leads_created_at ON leads(created_at DESC);
CREATE INDEX leads_quality ON leads(quality_score DESC, created_at DESC);
CREATE INDEX leads_eligibility ON leads(hard_eligible, quality_score DESC);
CREATE INDEX leads_owner_ac ON leads(ownership_status, air_conditioner_count);
CREATE INDEX leads_location ON leads(province, created_at DESC);
CREATE INDEX leads_status ON leads(status, created_at DESC);
CREATE INDEX leads_phone ON leads(phone_e164);
CREATE INDEX leads_name ON leads(legal_last_name, legal_first_name);
CREATE INDEX leads_contact_scope ON leads(contact_collection_mode, consent_scope, third_party_disclosure_authorized);
CREATE INDEX leads_distribution_expiry ON leads(distribution_expires_at, suppressed);
CREATE INDEX idx_leads_test_submission ON leads(is_test_submission, created_at DESC);
CREATE INDEX idx_leads_active_planning ON leads(actively_planning_solar, created_at DESC);
CREATE INDEX idx_leads_quote_requested ON leads(quote_contact_requested, created_at DESC);

PRAGMA foreign_keys = ON;
PRAGMA foreign_key_check;
PRAGMA optimize;
