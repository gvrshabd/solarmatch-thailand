-- Provider reads are separate from financial state and must not mutate the ledger.
ALTER TABLE installer_payment_orders ADD COLUMN last_reconciliation_at TEXT;
ALTER TABLE installer_payment_orders ADD COLUMN reconciliation_error_code TEXT;
CREATE INDEX IF NOT EXISTS idx_installer_payment_reconciliation
  ON installer_payment_orders(provider, status, last_reconciliation_at);
