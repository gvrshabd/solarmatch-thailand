-- Incoming purchased credit may become spendable only after debt is repaid.
-- The inserting statement records both deltas atomically; the immutable ledger
-- and historical entries are retained. Trial entitlements do not repay debt.
CREATE TRIGGER installer_incoming_credit_debt_first BEFORE INSERT ON installer_credit_ledger
WHEN NEW.available_delta>0 BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM installer_credit_accounts
   WHERE company_id=NEW.company_id AND debt+NEW.debt_delta>0)
 THEN RAISE(ABORT,'incoming credits must repay debt first') END;
END;
