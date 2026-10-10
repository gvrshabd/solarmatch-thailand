-- Retain verification evidence after short-lived OTP secrets are deleted.
-- Historical records stay NULL/unverified; never infer prior verification.
ALTER TABLE leads ADD COLUMN phone_verified_at TEXT;
CREATE TRIGGER installer_verified_phone_required BEFORE INSERT ON lead_recipient_deliveries
WHEN NEW.delivery_channel='portal' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leads WHERE id=NEW.lead_id AND phone_verified_at IS NOT NULL
   AND preferred_contact_method='phone' AND phone_e164 IS NOT NULL)
 THEN RAISE(ABORT,'verified phone evidence required') END;
END;
