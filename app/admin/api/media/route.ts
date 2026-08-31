import { NextResponse } from 'next/server';
import { imageSize } from 'image-size';
import { z } from 'zod';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { sha256 } from '@/lib/server/crypto';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const result = await requireDatabase().prepare(`SELECT id, original_filename, content_type, byte_size, width, height,
    purpose, publication_state, alt_en, alt_th, uploaded_by, created_at FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC`).all();
  return NextResponse.json({ media: result.results }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  const bucket = getRuntimeEnv().MEDIA;
  if (!bucket) return NextResponse.json({ error: 'media_storage_unavailable' }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }
  const file = form.get('file');
  const purpose = String(form.get('purpose') ?? '').trim();
  const altEn = String(form.get('altEn') ?? '').trim();
  const altTh = String(form.get('altTh') ?? '').trim();
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 5_000_000) return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  if (!purpose || purpose.length > 100 || !altEn || altEn.length > 300 || !altTh || altTh.length > 300) return NextResponse.json({ error: 'invalid_metadata' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let dimensions: ReturnType<typeof imageSize>;
  try { dimensions = imageSize(bytes); } catch { return NextResponse.json({ error: 'invalid_image_content' }, { status: 400 }); }
  if (!dimensions.width || !dimensions.height || dimensions.width > 8000 || dimensions.height > 8000) return NextResponse.json({ error: 'invalid_dimensions' }, { status: 400 });
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp';
  const id = crypto.randomUUID();
  const objectKey = `approved-media/${id}.${extension}`;
  const digest = await sha256(bytes);
  await bucket.put(objectKey, bytes, { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { assetId: id } });
  const database = requireDatabase();
  try {
    await database.batch([
      database.prepare(`INSERT INTO media_assets
        (id, object_key, original_filename, content_type, byte_size, width, height, sha256, purpose, publication_state, alt_en, alt_th, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`)
        .bind(id, objectKey, file.name.slice(0, 200), file.type, file.size, dimensions.width, dimensions.height, digest, purpose, altEn, altTh, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'media.uploaded', entityType: 'media-asset', entityId: id, next: { purpose, contentType: file.type, byteSize: file.size } }),
    ]);
  } catch {
    await bucket.delete(objectKey);
    return NextResponse.json({ error: 'media_record_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

const actionSchema = z.object({ action: z.enum(['publish', 'archive', 'delete']), id: z.string().uuid() });

export async function PATCH(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  let body: z.infer<typeof actionSchema>;
  try {
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    body = parsed.data;
  } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const database = requireDatabase();
  const row = await database.prepare('SELECT object_key, publication_state FROM media_assets WHERE id = ? AND deleted_at IS NULL').bind(body.id).first<{ object_key: string; publication_state: string }>();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (body.action === 'delete') {
    await getRuntimeEnv().MEDIA?.delete(row.object_key);
    await database.batch([
      database.prepare("UPDATE media_assets SET deleted_at = CURRENT_TIMESTAMP, publication_state = 'archived' WHERE id = ?").bind(body.id),
      auditStatement(database, { actorEmail: identity.email, action: 'media.deleted', entityType: 'media-asset', entityId: body.id }),
    ]);
  } else {
    const state = body.action === 'publish' ? 'published' : 'archived';
    await database.batch([
      database.prepare('UPDATE media_assets SET publication_state = ? WHERE id = ?').bind(state, body.id),
      auditStatement(database, { actorEmail: identity.email, action: `media.${body.action}`, entityType: 'media-asset', entityId: body.id, previous: { state: row.publication_state }, next: { state } }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
