-- Self-service installer account deletion (App Store 5.1.1(v), Google Play account deletion).
-- The sign-in account is erased immediately by the application. This record holds no name or
-- email: only the pseudonymous user ID, the former company and whether an operator must review
-- the company (its last member left, so intake is paused and billing records await the owner's
-- retention and refund decision).
CREATE TABLE installer_account_deletions(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  company_id TEXT REFERENCES solar_company_partners(id),
  company_review_required INTEGER NOT NULL CHECK(company_review_required IN (0,1)),
  requested_at TEXT NOT NULL CHECK(julianday(requested_at) IS NOT NULL),
  reviewed_at TEXT CHECK(reviewed_at IS NULL OR julianday(reviewed_at) IS NOT NULL),
  reviewed_by TEXT
);
CREATE INDEX installer_account_deletion_review ON installer_account_deletions(requested_at)
  WHERE company_review_required=1 AND reviewed_at IS NULL;
