export function auditStatement(database: D1Database, input: {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  previous?: unknown;
  next?: unknown;
  requestId?: string;
}) {
  return database.prepare(`INSERT INTO audit_events
    (id, actor_email, action, entity_type, entity_id, previous_json, next_json, request_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), input.actorEmail, input.action, input.entityType, input.entityId,
      input.previous === undefined ? null : JSON.stringify(input.previous),
      input.next === undefined ? null : JSON.stringify(input.next), input.requestId ?? null);
}
