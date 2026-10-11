-- Privacy-reviewed opt-in capture only. No historical backfill or anonymous events.
CREATE TABLE campaign_attribution_catalog (
 campaign_code TEXT PRIMARY KEY NOT NULL, source_code TEXT NOT NULL, medium_code TEXT NOT NULL,
 UNIQUE(campaign_code,source_code,medium_code)
);
INSERT INTO campaign_attribution_catalog VALUES
 ('direct','direct','none'),('unknown','unknown','unknown'),
 ('pilot-search','google','cpc'),('pilot-social','facebook','paid-social'),('pilot-line','line','messaging');
CREATE TABLE lead_campaign_attribution (
 lead_id TEXT PRIMARY KEY NOT NULL REFERENCES leads(id),
 campaign_code TEXT, source_code TEXT, medium_code TEXT,
 capture_state TEXT NOT NULL CHECK(capture_state IN('captured','redacted')),
 submission_mode TEXT NOT NULL CHECK(submission_mode IN('production','sandbox','local-test','restricted-preview')),
 submitted_at TEXT NOT NULL,
 original_qualified INTEGER NOT NULL CHECK(original_qualified IN(0,1)),
 CHECK((capture_state='captured' AND campaign_code IS NOT NULL AND source_code IS NOT NULL AND medium_code IS NOT NULL)
   OR (capture_state='redacted' AND campaign_code IS NULL AND source_code IS NULL AND medium_code IS NULL)),
 FOREIGN KEY(campaign_code,source_code,medium_code) REFERENCES campaign_attribution_catalog(campaign_code,source_code,medium_code)
);
CREATE INDEX lead_campaign_attribution_period ON lead_campaign_attribution(submission_mode,submitted_at,campaign_code);
CREATE TRIGGER lead_campaign_attribution_guard BEFORE INSERT ON lead_campaign_attribution BEGIN
 SELECT CASE WHEN NEW.capture_state<>'captured' OR NOT EXISTS(SELECT 1 FROM campaign_attribution_catalog
   WHERE campaign_code=NEW.campaign_code AND source_code=NEW.source_code AND medium_code=NEW.medium_code)
   THEN RAISE(ABORT,'unapproved campaign codes') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leads WHERE id=NEW.lead_id AND submission_mode=NEW.submission_mode
   AND created_at=NEW.submitted_at AND purged_at IS NULL AND ((NEW.submission_mode='production' AND is_test_submission=0) OR (NEW.submission_mode<>'production' AND is_test_submission=1)))
   THEN RAISE(ABORT,'campaign submission context mismatch') END;
END;
CREATE TRIGGER lead_campaign_attribution_redaction_only BEFORE UPDATE ON lead_campaign_attribution BEGIN
 SELECT CASE WHEN NEW.lead_id<>OLD.lead_id OR NEW.submission_mode<>OLD.submission_mode OR NEW.submitted_at<>OLD.submitted_at
   OR NEW.original_qualified<>OLD.original_qualified OR NEW.capture_state<>'redacted'
   OR NEW.campaign_code IS NOT NULL OR NEW.source_code IS NOT NULL OR NEW.medium_code IS NOT NULL
   OR NOT EXISTS(SELECT 1 FROM leads WHERE id=OLD.lead_id AND purged_at IS NOT NULL)
   THEN RAISE(ABORT,'campaign snapshot is immutable except privacy redaction') END;
END;
CREATE TABLE campaign_ad_spend (
 id TEXT PRIMARY KEY NOT NULL,
 campaign_code TEXT NOT NULL REFERENCES campaign_attribution_catalog(campaign_code),
 spend_day TEXT NOT NULL CHECK(length(spend_day)=10 AND spend_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(spend_day)=spend_day),
 submission_mode TEXT NOT NULL CHECK(submission_mode IN('production','sandbox','local-test','restricted-preview')),
 amount_minor INTEGER NOT NULL CHECK(typeof(amount_minor)='integer' AND amount_minor BETWEEN 1 AND 100000000),
 recorded_at TEXT NOT NULL, recorded_by TEXT NOT NULL
);
CREATE INDEX campaign_ad_spend_period ON campaign_ad_spend(submission_mode,spend_day,campaign_code);
