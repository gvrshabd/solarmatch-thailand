ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_site_visit_at TEXT;
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_quote_amount_thb INTEGER CHECK (portal_quote_amount_thb >= 0);
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_close_reason TEXT CHECK (portal_close_reason IN ('other-company','price','not-ready','unreachable','not-suitable'));
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_last_open_stage TEXT CHECK (portal_last_open_stage IN ('open','contacted','site_visit','quoted'));
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_workflow_revision INTEGER NOT NULL DEFAULT 0;
-- Only the most recent reversible edit is retained. Never store notes or contact information here.
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_undo_json TEXT CHECK (json_valid(portal_undo_json) OR portal_undo_json IS NULL);

-- The established 0019 privacy triggers clear the note timestamp and advance its
-- revision on all three withdrawal paths, even when the delivery has no notes.
CREATE TRIGGER installer_workflow_redact AFTER UPDATE OF portal_team_notes,portal_notes_revision ON lead_recipient_deliveries
WHEN NEW.withdrawal_suppressed=1 OR EXISTS (
  SELECT 1 FROM leads l JOIN installer_enquiries e ON e.id=NEW.enquiry_id WHERE l.id=NEW.lead_id
  AND (l.suppressed=1 OR l.consent_withdrawn_at IS NOT NULL OR l.purged_at IS NOT NULL OR l.deleted_at IS NOT NULL OR e.suppressed_at IS NOT NULL)
) BEGIN
  UPDATE lead_recipient_deliveries SET portal_site_visit_at=NULL,portal_quote_amount_thb=NULL,
    portal_close_reason=NULL,portal_last_open_stage=NULL,portal_undo_json=NULL,portal_workflow_revision=portal_workflow_revision+1 WHERE id=NEW.id;
  UPDATE audit_events SET next_json=NULL,previous_json=NULL WHERE entity_type='installer_platform' AND entity_id=NEW.id
    AND action IN ('installer.outcome','installer.contact-activity','installer.workflow-undo','installer.claim-submitted');
END;

-- Admin edits can also change an outcome. Invalidate stale portal revisions and
-- do not allow Undo to overwrite an intervening administrative decision.
CREATE TRIGGER installer_workflow_external_edit AFTER UPDATE OF outcome_status ON lead_recipient_deliveries
WHEN NEW.outcome_status<>OLD.outcome_status AND NEW.portal_workflow_revision=OLD.portal_workflow_revision BEGIN
  UPDATE lead_recipient_deliveries SET portal_workflow_revision=portal_workflow_revision+1,
    portal_progress_stage=NULL,portal_close_reason=NULL,portal_undo_json=NULL WHERE id=NEW.id;
END;

CREATE INDEX installer_activity_undo ON audit_events(entity_id,json_extract(next_json,'$.undid'))
  WHERE entity_type='installer_platform' AND action='installer.workflow-undo';

-- Historic claims already contain the submission time and delivery, but had no
-- delivery audit. Backfill only the event and recognised enumerated reasons.
INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json,created_at)
SELECT 'claim-submitted:'||c.id,'installer','installer.claim-submitted','installer_platform',c.delivery_id,
  CASE WHEN c.reason IN ('incorrect-contact','duplicate','outside-criteria','no-request','withdrawn')
    THEN json_object('reason',c.reason) ELSE '{}' END,c.submitted_at
FROM installer_claims c JOIN lead_recipient_deliveries d ON d.id=c.delivery_id JOIN leads l ON l.id=d.lead_id
JOIN installer_enquiries e ON e.id=d.enquiry_id WHERE c.company_id=d.partner_id AND d.delivery_channel='portal'
  AND d.withdrawal_suppressed=0 AND l.suppressed=0 AND l.consent_withdrawn_at IS NULL AND l.purged_at IS NULL
  AND l.deleted_at IS NULL AND e.suppressed_at IS NULL AND l.archived_at IS NULL AND d.delivery_status IN ('delivered','accepted');
