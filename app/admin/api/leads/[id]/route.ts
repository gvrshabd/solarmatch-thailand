import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const database = requireDatabase();
  const lead = await database.prepare('SELECT * FROM leads WHERE id = ? LIMIT 1').bind(id).first<Record<string, unknown>>();
  if (!lead) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const scores = await database.prepare('SELECT * FROM lead_score_history WHERE lead_id = ? ORDER BY created_at DESC').bind(id).all();
  const events = await database.prepare('SELECT * FROM lead_status_events WHERE lead_id = ? ORDER BY created_at DESC').bind(id).all();
  const notes = await database.prepare('SELECT id, note, actor_email, created_at FROM lead_notes WHERE lead_id = ? AND deleted_at IS NULL ORDER BY created_at DESC').bind(id).all();
  return NextResponse.json({
    lead: {
      ...lead,
      answers: JSON.parse(String(lead.answers_json)),
      scoringExplanation: JSON.parse(String(lead.scoring_explanation_json)),
      daytimeLoads: JSON.parse(String(lead.daytime_loads_json)),
    },
    scoreHistory: scores.results,
    statusEvents: events.results,
    notes: notes.results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const schema = z.object({ action: z.literal('add-note'), note: z.string().trim().min(1).max(2000) });
  let body: z.infer<typeof schema>;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_note' }, { status: 400 });
    body = parsed.data;
  } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const database = requireDatabase();
  const noteId = crypto.randomUUID();
  await database.batch([
    database.prepare('INSERT INTO lead_notes (id, lead_id, note, actor_email) VALUES (?, ?, ?, ?)').bind(noteId, id, body.note, identity.email),
    auditStatement(database, { actorEmail: identity.email, action: 'lead.note-added', entityType: 'lead', entityId: id, next: { noteId } }),
  ]);
  return NextResponse.json({ ok: true, noteId });
}
