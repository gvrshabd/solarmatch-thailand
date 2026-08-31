PRAGMA foreign_keys = ON;

CREATE TABLE questionnaire_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  schema_version INTEGER NOT NULL,
  document_json TEXT NOT NULL CHECK (json_valid(document_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT,
  restored_from_id TEXT REFERENCES questionnaire_versions(id)
);

CREATE TABLE assessment_questions (
  id TEXT PRIMARY KEY,
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  question_type TEXT NOT NULL,
  required INTEGER NOT NULL CHECK (required IN (0, 1)),
  title_en TEXT NOT NULL,
  title_th TEXT NOT NULL,
  help_en TEXT NOT NULL,
  help_th TEXT NOT NULL,
  conditional_json TEXT CHECK (conditional_json IS NULL OR json_valid(conditional_json)),
  relevance_json TEXT NOT NULL CHECK (json_valid(relevance_json)),
  UNIQUE(questionnaire_version_id, question_key)
);

CREATE TABLE assessment_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  option_value TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  label_en TEXT NOT NULL,
  label_th TEXT NOT NULL,
  description_en TEXT,
  description_th TEXT,
  exclusive INTEGER NOT NULL DEFAULT 0 CHECK (exclusive IN (0, 1)),
  UNIQUE(question_id, option_value)
);

CREATE TABLE rule_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  configuration_json TEXT NOT NULL CHECK (json_valid(configuration_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT,
  restored_from_id TEXT REFERENCES rule_versions(id)
);

CREATE TABLE scoring_rules (
  id TEXT PRIMARY KEY,
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id) ON DELETE CASCADE,
  factor_key TEXT NOT NULL,
  maximum_points INTEGER NOT NULL CHECK (maximum_points >= 0),
  configuration_json TEXT NOT NULL CHECK (json_valid(configuration_json)),
  UNIQUE(rule_version_id, factor_key)
);

CREATE TABLE qualification_rules (
  id TEXT PRIMARY KEY,
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  operator TEXT NOT NULL,
  expected_value_json TEXT NOT NULL CHECK (json_valid(expected_value_json)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  UNIQUE(rule_version_id, rule_key)
);

CREATE TABLE content_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT,
  restored_from_id TEXT REFERENCES content_versions(id)
);

CREATE TABLE legal_document_versions (
  id TEXT PRIMARY KEY,
  version_number INTEGER NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  documents_json TEXT NOT NULL CHECK (json_valid(documents_json)),
  is_complete INTEGER NOT NULL DEFAULT 0 CHECK (is_complete IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  archived_at TEXT
);

CREATE TABLE public_releases (
  id TEXT PRIMARY KEY,
  release_number INTEGER NOT NULL UNIQUE,
  questionnaire_version_id TEXT NOT NULL REFERENCES questionnaire_versions(id),
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
  content_version_id TEXT NOT NULL REFERENCES content_versions(id),
  legal_document_version_id TEXT NOT NULL REFERENCES legal_document_versions(id),
  live_lead_submissions INTEGER NOT NULL DEFAULT 0 CHECK (live_lead_submissions IN (0, 1)),
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  receiving_company_en TEXT,
  receiving_company_th TEXT,
  receiving_company_privacy_url TEXT,
  retention_days INTEGER CHECK (retention_days BETWEEN 1 AND 3650),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_by TEXT,
  published_at TEXT,
  CHECK (live_lead_submissions = 0 OR (receiving_company_en IS NOT NULL AND receiving_company_th IS NOT NULL AND receiving_company_privacy_url IS NOT NULL AND retention_days IS NOT NULL))
);

CREATE UNIQUE INDEX only_one_current_release ON public_releases(is_current) WHERE is_current = 1;

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint TEXT NOT NULL,
  legal_first_name TEXT NOT NULL,
  legal_last_name TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  phone_display TEXT NOT NULL,
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
  receiving_company_en TEXT NOT NULL,
  receiving_company_th TEXT NOT NULL,
  source_locale TEXT NOT NULL CHECK (source_locale IN ('en', 'th')),
  user_agent_summary TEXT
);

CREATE INDEX leads_created_at ON leads(created_at DESC);
CREATE INDEX leads_quality ON leads(quality_score DESC, created_at DESC);
CREATE INDEX leads_eligibility ON leads(hard_eligible, quality_score DESC);
CREATE INDEX leads_owner_ac ON leads(ownership_status, air_conditioner_count);
CREATE INDEX leads_location ON leads(province, created_at DESC);
CREATE INDEX leads_status ON leads(status, created_at DESC);
CREATE INDEX leads_phone ON leads(phone_e164);
CREATE INDEX leads_name ON leads(legal_last_name, legal_first_name);

CREATE TABLE lead_score_history (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  rule_version_id TEXT NOT NULL REFERENCES rule_versions(id),
  raw_score INTEGER NOT NULL,
  quality_score INTEGER NOT NULL,
  hard_eligible INTEGER NOT NULL,
  explanation_json TEXT NOT NULL CHECK (json_valid(explanation_json)),
  reason TEXT NOT NULL,
  is_original INTEGER NOT NULL DEFAULT 0 CHECK (is_original IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_status_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  actor_email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE export_batches (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lead_count INTEGER NOT NULL,
  format_version TEXT NOT NULL
);

CREATE TABLE export_batch_items (
  export_batch_id TEXT NOT NULL REFERENCES export_batches(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES leads(id),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  PRIMARY KEY(export_batch_id, lead_id)
);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL,
  purpose TEXT NOT NULL,
  publication_state TEXT NOT NULL CHECK (publication_state IN ('draft', 'published', 'archived')),
  alt_en TEXT NOT NULL,
  alt_th TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  previous_json TEXT CHECK (previous_json IS NULL OR json_valid(previous_json)),
  next_json TEXT CHECK (next_json IS NULL OR json_valid(next_json)),
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_entity ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX audit_created ON audit_events(created_at DESC);

CREATE TABLE purge_tombstones (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  non_personal_reference_hash TEXT NOT NULL,
  purged_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  purged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public_request_limits (
  key_hash TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY(key_hash, window_start)
);

CREATE TABLE public_settings (
  setting_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
