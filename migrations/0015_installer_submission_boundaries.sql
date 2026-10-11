-- Additive classification: retain all historical labels and the legacy environment CHECK.
-- NULL means historical context is unknown; never relabel historic test records as production.
ALTER TABLE leads ADD COLUMN submission_mode TEXT CHECK(submission_mode IS NULL OR submission_mode IN('production','sandbox','local-test','restricted-preview'));
CREATE INDEX idx_leads_submission_mode ON leads(submission_mode,created_at);
ALTER TABLE lead_recipient_deliveries ADD COLUMN allocation_environment TEXT CHECK(allocation_environment IS NULL OR allocation_environment IN('production','sandbox','local-test'));

-- Namespace historical test hashes, preserving enquiry IDs, recipient slots and labels.
-- A historic test hash must not occupy the unchanged production identity namespace.
UPDATE installer_enquiries SET canonical_key = (
 SELECT CASE WHEN l.submission_mode IN('sandbox','local-test','restricted-preview') THEN l.submission_mode
   WHEN l.submission_environment='restricted_site_operational' THEN 'restricted-preview' ELSE 'local-test' END
 FROM leads l WHERE l.id=installer_enquiries.lead_id
) || ':' || canonical_key
WHERE canonical_key NOT LIKE '%:%' AND EXISTS(SELECT 1 FROM leads l
 WHERE l.id=installer_enquiries.lead_id AND l.is_test_submission=1);

CREATE TRIGGER installer_final_collection_guard BEFORE INSERT ON leads WHEN NEW.submission_mode IS NOT NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM installer_platform_settings WHERE id=1
   AND json_extract(config_json,'$.collectionEnabled')=1 AND COALESCE(json_extract(config_json,'$.platformPaused'),0)=0)
   THEN RAISE(ABORT,'installer collection is paused') END;
 SELECT CASE WHEN (NEW.submission_mode='production' AND (NEW.is_test_submission<>0 OR NEW.submission_environment<>'production'))
   OR (NEW.submission_mode<>'production' AND NEW.is_test_submission<>1)
   OR (NEW.submission_mode='restricted-preview' AND NEW.distribution_allowed<>0)
   THEN RAISE(ABORT,'inconsistent submission classification') END;
END;

CREATE TRIGGER installer_allocation_environment_guard BEFORE INSERT ON lead_recipient_deliveries WHEN NEW.delivery_channel='portal' BEGIN
 SELECT CASE WHEN NEW.allocation_environment IS NULL OR NOT EXISTS(SELECT 1 FROM leads l WHERE l.id=NEW.lead_id AND (
   (NEW.allocation_environment='production' AND l.is_test_submission=0 AND l.submission_environment='production' AND COALESCE(l.submission_mode,'production')='production')
   OR (NEW.allocation_environment='sandbox' AND l.is_test_submission=1 AND l.submission_mode='sandbox')
   OR (NEW.allocation_environment='local-test' AND l.is_test_submission=1 AND (l.submission_mode='local-test' OR (l.submission_mode IS NULL AND l.submission_environment='private_development_preview')))
 )) THEN RAISE(ABORT,'allocation environment mismatch') END;
END;

CREATE TRIGGER installer_delivery_environment_lock BEFORE UPDATE OF allocation_environment ON lead_recipient_deliveries WHEN OLD.delivery_channel='portal' BEGIN
 SELECT RAISE(ABORT,'delivery allocation environment is immutable');
END;
