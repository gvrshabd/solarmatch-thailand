-- Owner-only private-development submissions remain operationally distinct
-- from genuine public enquiries and can never be distributed to a partner.
ALTER TABLE leads ADD COLUMN submission_environment TEXT NOT NULL DEFAULT 'production'
  CHECK (submission_environment IN ('production', 'private_development_preview'));
ALTER TABLE leads ADD COLUMN is_test_submission INTEGER NOT NULL DEFAULT 0
  CHECK (is_test_submission IN (0, 1));
ALTER TABLE leads ADD COLUMN distribution_allowed INTEGER NOT NULL DEFAULT 1
  CHECK (distribution_allowed IN (0, 1));

CREATE INDEX idx_leads_test_submission
ON leads(is_test_submission, created_at DESC);

PRAGMA optimize;
