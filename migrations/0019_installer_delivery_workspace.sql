-- Additive portal workspace fields. Preserve the historic outcome CHECK and all
-- financial/delivery rows. New intermediate stages project alongside legacy open.
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_progress_stage TEXT
  CHECK(portal_progress_stage IS NULL OR portal_progress_stage IN('contacted','site_visit','quoted'));
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_team_notes TEXT NOT NULL DEFAULT '' CHECK(length(portal_team_notes)<=2000);
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_notes_revision INTEGER NOT NULL DEFAULT 0 CHECK(portal_notes_revision>=0);
ALTER TABLE lead_recipient_deliveries ADD COLUMN portal_notes_updated_at TEXT;

CREATE TRIGGER installer_workspace_delivery_redaction AFTER UPDATE OF withdrawal_suppressed ON lead_recipient_deliveries
WHEN NEW.withdrawal_suppressed=1 BEGIN
 UPDATE lead_recipient_deliveries SET portal_team_notes='',portal_progress_stage=NULL,
 portal_notes_revision=portal_notes_revision+1,portal_notes_updated_at=NULL WHERE id=NEW.id;
END;
CREATE TRIGGER installer_workspace_lead_redaction AFTER UPDATE OF suppressed,consent_withdrawn_at,purged_at,deleted_at ON leads
WHEN NEW.suppressed=1 OR NEW.consent_withdrawn_at IS NOT NULL OR NEW.purged_at IS NOT NULL OR NEW.deleted_at IS NOT NULL BEGIN
 UPDATE lead_recipient_deliveries SET portal_team_notes='',portal_progress_stage=NULL,
 portal_notes_revision=portal_notes_revision+1,portal_notes_updated_at=NULL WHERE lead_id=NEW.id;
END;
CREATE TRIGGER installer_workspace_enquiry_redaction AFTER UPDATE OF suppressed_at ON installer_enquiries
WHEN NEW.suppressed_at IS NOT NULL BEGIN
 UPDATE lead_recipient_deliveries SET portal_team_notes='',portal_progress_stage=NULL,
 portal_notes_revision=portal_notes_revision+1,portal_notes_updated_at=NULL WHERE enquiry_id=NEW.id;
END;
