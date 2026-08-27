import { leadSchema } from '@/lib/validation/lead';

export async function POST(request: Request) {
  let data: unknown;
  try { data = await request.json(); } catch { return Response.json({ ok: false, code: 'INVALID_JSON' }, { status: 400 }); }
  const parsed = leadSchema.safeParse(data);
  if (!parsed.success) return Response.json({ ok: false, code: 'INVALID_INPUT' }, { status: 422 });
  // Prototype only: intentionally do not log, store, forward or return submitted PII.
  return Response.json({ ok: true, prototype: true, persisted: false });
}
