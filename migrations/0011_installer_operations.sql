-- Additive operational state; historical delivery and consent facts are unchanged.
ALTER TABLE installer_enquiries ADD COLUMN allocation_attempts INTEGER NOT NULL DEFAULT 0 CHECK(allocation_attempts>=0);
ALTER TABLE installer_enquiries ADD COLUMN next_allocation_at TEXT;
ALTER TABLE installer_enquiries ADD COLUMN last_allocation_at TEXT;
ALTER TABLE installer_enquiries ADD COLUMN allocation_lease_until TEXT;
ALTER TABLE installer_enquiries ADD COLUMN allocation_error_code TEXT;
CREATE INDEX installer_enquiries_allocation_due ON installer_enquiries(status,next_allocation_at,created_at);
CREATE TABLE installer_job_runs (
 id TEXT PRIMARY KEY,
 job_name TEXT NOT NULL CHECK(job_name IN('allocation','notifications','scheduled')),
 actor TEXT NOT NULL,
 started_at TEXT NOT NULL,
 finished_at TEXT,
 status TEXT NOT NULL CHECK(status IN('running','succeeded','failed')),
 summary_json TEXT CHECK(summary_json IS NULL OR json_valid(summary_json)),
 error_code TEXT
);
CREATE INDEX installer_job_runs_recent ON installer_job_runs(job_name,started_at);
CREATE TRIGGER installer_global_allocation_pause BEFORE INSERT ON lead_recipient_deliveries
WHEN NEW.delivery_channel='portal' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM installer_platform_settings WHERE id=1 AND json_extract(config_json,'$.platformPaused')=1)
 THEN RAISE(ABORT,'platform is paused') END;
END;
-- Managed canonical enquiries can only be delivered through the funded portal path.
-- This protection also covers callers using a legacy endpoint or stale application.
CREATE TRIGGER installer_no_legacy_managed_delivery BEFORE INSERT ON lead_recipient_deliveries
WHEN NEW.delivery_channel<>'portal' AND EXISTS(
 SELECT 1 FROM installer_enquiries e LEFT JOIN installer_enquiry_leads a ON a.enquiry_id=e.id
 WHERE (e.id=NEW.enquiry_id OR a.lead_id=NEW.lead_id)
 AND (e.duplicate_state<>'legacy' OR e.verification_state='verified')
) BEGIN
 SELECT RAISE(ABORT,'managed enquiry requires portal allocation');
END;
