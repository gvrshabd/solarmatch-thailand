-- This migration is deliberately additive. Migration 0002 rebuilt tables that
-- are now referenced by published releases and historic leads; rebuilding them
-- again would violate those foreign keys during a rolling Worker deployment.
-- The *_v2 columns are authoritative for new shared-recipient records, while
-- the original constrained columns remain as compatibility values for old code.
ALTER TABLE contact_configuration_versions ADD COLUMN contact_collection_mode_v2 TEXT
  CHECK (contact_collection_mode_v2 IS NULL OR contact_collection_mode_v2 IN ('disabled', 'validation_interest', 'named_installer_handoff', 'shared_solar_company_handoff'));
ALTER TABLE contact_configuration_versions ADD COLUMN distribution_window_days INTEGER
  CHECK (distribution_window_days IS NULL OR distribution_window_days BETWEEN 1 AND 365);
ALTER TABLE contact_configuration_versions ADD COLUMN recipient_category TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN adult_confirmation_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN consent_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN privacy_notice_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN terms_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN cookie_policy_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN operator_profile_version_id TEXT;
ALTER TABLE contact_configuration_versions ADD COLUMN internal_recipient_cap INTEGER
  CHECK (internal_recipient_cap IS NULL OR internal_recipient_cap BETWEEN 1 AND 20);
ALTER TABLE contact_configuration_versions ADD COLUMN readiness_state TEXT NOT NULL DEFAULT 'incomplete'
  CHECK (readiness_state IN ('incomplete', 'ready', 'active'));
ALTER TABLE contact_configuration_versions ADD COLUMN readiness_issues_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(readiness_issues_json));

UPDATE contact_configuration_versions
SET contact_collection_mode_v2 = contact_collection_mode
WHERE contact_collection_mode_v2 IS NULL;

-- Structured, versioned legal/operator metadata augments the existing document
-- JSON without invalidating the pre-launch placeholder version.
ALTER TABLE legal_document_versions ADD COLUMN schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE legal_document_versions ADD COLUMN operator_profile_json TEXT CHECK (operator_profile_json IS NULL OR json_valid(operator_profile_json));
ALTER TABLE legal_document_versions ADD COLUMN effective_date TEXT;
ALTER TABLE legal_document_versions ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending-legal-review' CHECK (review_status IN ('pending-legal-review', 'reviewed', 'approved'));
ALTER TABLE legal_document_versions ADD COLUMN retention_days INTEGER CHECK (retention_days IS NULL OR retention_days BETWEEN 1 AND 3650);
ALTER TABLE legal_document_versions ADD COLUMN distribution_window_days INTEGER CHECK (distribution_window_days IS NULL OR distribution_window_days BETWEEN 1 AND 365);
ALTER TABLE legal_document_versions ADD COLUMN restored_from_id TEXT REFERENCES legal_document_versions(id);
ALTER TABLE legal_document_versions ADD COLUMN updated_by TEXT;
ALTER TABLE legal_document_versions ADD COLUMN updated_at TEXT;

-- The v2 mode/scope columns let new code express shared consent without
-- violating migration 0002's historic CHECK constraints. New v2 assessments
-- write a documented sentinel into the old non-null timing field.
ALTER TABLE leads ADD COLUMN contact_collection_mode_v2 TEXT
  CHECK (contact_collection_mode_v2 IS NULL OR contact_collection_mode_v2 IN ('validation_interest', 'named_installer_handoff', 'shared_solar_company_handoff'));
ALTER TABLE leads ADD COLUMN consent_scope_v2 TEXT
  CHECK (consent_scope_v2 IS NULL OR consent_scope_v2 IN ('solar_match_validation_followup', 'named_installer_site_assessment', 'shared_residential_solar_referral'));
ALTER TABLE leads ADD COLUMN solar_match_followup_authorized_v2 INTEGER
  CHECK (solar_match_followup_authorized_v2 IS NULL OR solar_match_followup_authorized_v2 IN (0, 1));
ALTER TABLE leads ADD COLUMN third_party_disclosure_authorized_v2 INTEGER
  CHECK (third_party_disclosure_authorized_v2 IS NULL OR third_party_disclosure_authorized_v2 IN (0, 1));
ALTER TABLE leads ADD COLUMN distribution_window_days_snapshot INTEGER
  CHECK (distribution_window_days_snapshot IS NULL OR distribution_window_days_snapshot BETWEEN 1 AND 365);
ALTER TABLE leads ADD COLUMN distribution_expires_at TEXT;
ALTER TABLE leads ADD COLUMN recipient_category_snapshot TEXT;
ALTER TABLE leads ADD COLUMN disclosed_fields_snapshot_json TEXT
  CHECK (disclosed_fields_snapshot_json IS NULL OR json_valid(disclosed_fields_snapshot_json));
ALTER TABLE leads ADD COLUMN adult_confirmation_version TEXT;
ALTER TABLE leads ADD COLUMN adult_confirmation_text_en TEXT;
ALTER TABLE leads ADD COLUMN adult_confirmation_text_th TEXT;
ALTER TABLE leads ADD COLUMN adult_confirmed_at TEXT;
ALTER TABLE leads ADD COLUMN privacy_notice_version_id TEXT;
ALTER TABLE leads ADD COLUMN terms_version_id TEXT;
ALTER TABLE leads ADD COLUMN cookie_policy_version_id TEXT;
ALTER TABLE leads ADD COLUMN suppressed INTEGER NOT NULL DEFAULT 0 CHECK (suppressed IN (0, 1));
ALTER TABLE leads ADD COLUMN suppression_reason TEXT;
ALTER TABLE leads ADD COLUMN suppressed_at TEXT;
ALTER TABLE leads ADD COLUMN consent_withdrawn_at TEXT;
ALTER TABLE leads ADD COLUMN legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0, 1));
ALTER TABLE leads ADD COLUMN purged_at TEXT;

UPDATE leads
SET contact_collection_mode_v2 = contact_collection_mode,
    consent_scope_v2 = consent_scope,
    solar_match_followup_authorized_v2 = solar_match_followup_authorized,
    third_party_disclosure_authorized_v2 = third_party_disclosure_authorized
WHERE contact_collection_mode_v2 IS NULL OR consent_scope_v2 IS NULL
   OR solar_match_followup_authorized_v2 IS NULL OR third_party_disclosure_authorized_v2 IS NULL;

CREATE INDEX leads_distribution_expiry ON leads(distribution_expires_at, suppressed);

CREATE TABLE solar_company_partners (
  id TEXT PRIMARY KEY,
  legal_name_en TEXT NOT NULL,
  legal_name_th TEXT NOT NULL,
  trading_name TEXT,
  registration_number TEXT,
  privacy_notice_url TEXT NOT NULL,
  operational_contact_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(operational_contact_json)),
  service_provinces_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(service_provinces_json)),
  service_areas_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(service_areas_json)),
  active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
  contract_state TEXT NOT NULL DEFAULT 'pending' CHECK (contract_state IN ('pending', 'active', 'expired', 'suspended', 'terminated')),
  contract_effective_date TEXT,
  contract_expiry_date TEXT,
  accepted_lead_criteria_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(accepted_lead_criteria_json)),
  delivery_method TEXT NOT NULL DEFAULT 'manual-copy' CHECK (delivery_method IN ('manual-copy', 'manual-email', 'manual-line')),
  operational_capacity INTEGER CHECK (operational_capacity IS NULL OR operational_capacity BETWEEN 0 AND 100000),
  internal_lead_price_thb INTEGER CHECK (internal_lead_price_thb IS NULL OR internal_lead_price_thb >= 0),
  internal_notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT,
  CHECK (active = 0 OR contract_state = 'active')
);

CREATE INDEX solar_company_partners_status ON solar_company_partners(active, contract_state, archived_at);

CREATE TABLE partner_contract_documents (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES solar_company_partners(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type = 'application/pdf'),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  sha256 TEXT NOT NULL,
  contract_effective_date TEXT,
  contract_expiry_date TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE INDEX partner_contract_documents_partner ON partner_contract_documents(partner_id, deleted_at, created_at DESC);

CREATE TABLE lead_recipient_deliveries (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  partner_id TEXT NOT NULL REFERENCES solar_company_partners(id),
  consent_version TEXT NOT NULL,
  privacy_notice_version_id TEXT NOT NULL,
  disclosure_purpose TEXT NOT NULL CHECK (disclosure_purpose = 'residential_solar_site_survey_and_quotation'),
  fields_disclosed_json TEXT NOT NULL CHECK (json_valid(fields_disclosed_json)),
  delivered_at TEXT NOT NULL,
  delivered_by TEXT NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('manual-copy', 'manual-email', 'manual-line')),
  distribution_expires_at TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'delivered' CHECK (delivery_status IN ('delivered', 'accepted', 'rejected', 'withdrawal-notified', 'deleted-notified')),
  rejection_reason TEXT,
  copy_export_status TEXT NOT NULL DEFAULT 'confirmed' CHECK (copy_export_status IN ('confirmed', 'failed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'not-recorded' CHECK (payment_status IN ('not-recorded', 'pending', 'paid', 'waived', 'disputed')),
  survey_status TEXT NOT NULL DEFAULT 'not-recorded' CHECK (survey_status IN ('not-recorded', 'scheduled', 'completed', 'cancelled')),
  quotation_status TEXT NOT NULL DEFAULT 'not-recorded' CHECK (quotation_status IN ('not-recorded', 'requested', 'provided', 'declined')),
  outcome_status TEXT NOT NULL DEFAULT 'not-recorded' CHECK (outcome_status IN ('not-recorded', 'open', 'won', 'lost', 'not-suitable')),
  withdrawal_suppressed INTEGER NOT NULL DEFAULT 0 CHECK (withdrawal_suppressed IN (0, 1)),
  deletion_notification_state TEXT NOT NULL DEFAULT 'not-required' CHECK (deletion_notification_state IN ('not-required', 'required', 'sent', 'acknowledged')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lead_id, partner_id)
);

CREATE INDEX lead_recipient_deliveries_lead ON lead_recipient_deliveries(lead_id, delivered_at DESC);
CREATE INDEX lead_recipient_deliveries_partner ON lead_recipient_deliveries(partner_id, delivery_status, delivered_at DESC);

CREATE TABLE privacy_rights_requests (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'correction', 'deletion', 'restriction', 'objection', 'withdrawal', 'stop-contact')),
  received_channel TEXT NOT NULL CHECK (received_channel IN ('email', 'phone', 'rights-page', 'other')),
  received_at TEXT NOT NULL,
  identity_verification_state TEXT NOT NULL DEFAULT 'pending' CHECK (identity_verification_state IN ('pending', 'verified', 'failed', 'not-required')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'verifying', 'in-progress', 'completed', 'rejected')),
  due_at TEXT,
  resolution_notes TEXT,
  suppression_applied INTEGER NOT NULL DEFAULT 0 CHECK (suppression_applied IN (0, 1)),
  partner_notification_required INTEGER NOT NULL DEFAULT 0 CHECK (partner_notification_required IN (0, 1)),
  partner_notification_completed INTEGER NOT NULL DEFAULT 0 CHECK (partner_notification_completed IN (0, 1)),
  legal_hold INTEGER NOT NULL DEFAULT 0 CHECK (legal_hold IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE INDEX privacy_rights_requests_status ON privacy_rights_requests(status, received_at DESC);
CREATE INDEX privacy_rights_requests_lead ON privacy_rights_requests(lead_id, received_at DESC);

-- Existing selection/export rows remain valid. New shared exports are tracked by
-- recipient delivery records rather than broadening historic export scopes.
