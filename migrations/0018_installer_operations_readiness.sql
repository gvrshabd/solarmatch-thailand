-- Local preparation only: this creates no cron or external notification channel.
CREATE TABLE installer_scheduler_leases (
  name TEXT PRIMARY KEY CHECK(name='scheduled'),
  owner_token TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  lease_until TEXT NOT NULL
);
CREATE TABLE installer_operation_alerts (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL CHECK(code IN('scheduler_missed','queue_stale','allocation_failed','notification_attention','reconciliation_attention')),
  severity TEXT NOT NULL CHECK(severity IN('warning','critical')),
  status TEXT NOT NULL CHECK(status IN('open','acknowledged','resolved')),
  counts_json TEXT NOT NULL CHECK(json_valid(counts_json)),
  delivery_mode TEXT NOT NULL DEFAULT 'local-capture' CHECK(delivery_mode='local-capture'),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  acknowledged_at TEXT,
  acknowledged_by TEXT,
  resolved_at TEXT
);
CREATE UNIQUE INDEX installer_operation_alert_active ON installer_operation_alerts(code) WHERE status IN('open','acknowledged');
CREATE INDEX installer_operation_alert_recent ON installer_operation_alerts(last_seen_at DESC);
