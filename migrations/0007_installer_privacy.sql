-- Canonical withdrawal applies to prior and future duplicates and retains lifetime recipient slots.
CREATE TRIGGER installer_lead_privacy_hold BEFORE UPDATE OF purged_at ON leads
WHEN NEW.purged_at IS NOT NULL AND OLD.purged_at IS NULL BEGIN
 SELECT CASE WHEN OLD.legal_hold=1 OR EXISTS(SELECT 1 FROM privacy_rights_requests WHERE lead_id=OLD.id AND legal_hold=1)
 OR EXISTS(SELECT 1 FROM leads l JOIN installer_enquiry_leads el ON el.lead_id=l.id WHERE el.enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=OLD.id) AND (l.legal_hold=1 OR EXISTS(SELECT 1 FROM privacy_rights_requests pr WHERE pr.lead_id=l.id AND pr.legal_hold=1)))
 THEN RAISE(ABORT,'legal hold prevents personal data redaction') END;
END;
CREATE TRIGGER installer_canonical_withdrawal AFTER UPDATE OF suppressed,consent_withdrawn_at,purged_at ON leads
WHEN (NEW.suppressed=1 AND OLD.suppressed=0) OR (NEW.consent_withdrawn_at IS NOT NULL AND OLD.consent_withdrawn_at IS NULL) OR (NEW.purged_at IS NOT NULL AND OLD.purged_at IS NULL) BEGIN
 UPDATE installer_enquiries SET suppressed_at=COALESCE(suppressed_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),suppression_reason='privacy-withdrawal',status='suppressed'
 WHERE id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id);
 UPDATE leads SET suppressed=1,suppressed_at=COALESCE(suppressed_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')),suppression_reason='canonical-withdrawal',distribution_allowed=0
 WHERE id IN(SELECT lead_id FROM installer_enquiry_leads WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id)) AND suppressed=0;
 UPDATE installer_share_tokens SET revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now')) WHERE delivery_id IN(SELECT id FROM lead_recipient_deliveries WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id));
 UPDATE installer_outbox SET state='cancelled',lease_until=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id) AND kind<>'withdrawal' AND state NOT IN('accepted','cancelled');
 UPDATE lead_recipient_deliveries SET withdrawal_suppressed=1 WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id);
 INSERT OR IGNORE INTO installer_outbox(id,delivery_id,enquiry_id,company_id,kind,state,attempts,next_attempt_at,created_at,updated_at)
 SELECT 'privacy-'||id,id,enquiry_id,partner_id,'withdrawal','action-required',0,strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now') FROM lead_recipient_deliveries WHERE enquiry_id IN(SELECT enquiry_id FROM installer_enquiry_leads WHERE lead_id=NEW.id);
END;
