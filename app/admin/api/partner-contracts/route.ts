import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { sha256 } from '@/lib/server/crypto';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';
const metadataSchema = z.object({ partnerId: z.string().uuid(), effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable(), expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable() });

function pdfMagic(bytes: Uint8Array) {
  return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const url = new URL(request.url); const id = url.searchParams.get('id');
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'invalid_document' }, { status: 400 });
  const database = requireDatabase();
  const row = await database.prepare('SELECT object_key, original_filename, byte_size FROM partner_contract_documents WHERE id=? AND deleted_at IS NULL').bind(id).first<{ object_key: string; original_filename: string; byte_size: number }>();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const object = await getRuntimeEnv().MEDIA?.get(row.object_key);
  if (!object) return NextResponse.json({ error: 'object_not_found' }, { status: 404 });
  await database.batch([auditStatement(database, { actorEmail: identity.email, action: 'partner-contract.downloaded', entityType: 'partner-contract-document', entityId: id })]);
  return new NextResponse(object.body, { headers: { 'Content-Type': 'application/pdf', 'Content-Length': String(row.byte_size), 'Content-Disposition': `attachment; filename="${row.original_filename.replace(/["\r\n]/gu, '_')}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  const bucket = getRuntimeEnv().MEDIA;
  if (!bucket) return NextResponse.json({ error: 'private_storage_unavailable' }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'invalid_form' }, { status: 400 }); }
  const file = form.get('file');
  const parsed = metadataSchema.safeParse({ partnerId: form.get('partnerId'), effectiveDate: form.get('effectiveDate') || null, expiryDate: form.get('expiryDate') || null });
  if (!parsed.success || !(file instanceof File) || file.type !== 'application/pdf' || file.size < 5 || file.size > 10_485_760) return NextResponse.json({ error: 'invalid_contract_pdf' }, { status: 400 });
  const database = requireDatabase();
  if (!await database.prepare('SELECT id FROM solar_company_partners WHERE id=? AND archived_at IS NULL').bind(parsed.data.partnerId).first()) return NextResponse.json({ error: 'partner_not_found' }, { status: 404 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!pdfMagic(bytes)) return NextResponse.json({ error: 'invalid_pdf_content' }, { status: 400 });
  const id = crypto.randomUUID(); const objectKey = `partner-contracts/${parsed.data.partnerId}/${id}.pdf`; const digest = await sha256(bytes);
  await bucket.put(objectKey, bytes, { httpMetadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' }, customMetadata: { documentId: id, partnerId: parsed.data.partnerId } });
  try {
    await database.batch([
      database.prepare(`INSERT INTO partner_contract_documents
        (id, partner_id, object_key, original_filename, content_type, byte_size, sha256, contract_effective_date, contract_expiry_date, uploaded_by)
        VALUES (?, ?, ?, ?, 'application/pdf', ?, ?, ?, ?, ?)`)
        .bind(id, parsed.data.partnerId, objectKey, file.name.slice(0, 200), file.size, digest, parsed.data.effectiveDate, parsed.data.expiryDate, identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'partner-contract.uploaded', entityType: 'partner-contract-document', entityId: id, next: { partnerId: parsed.data.partnerId, byteSize: file.size, digest } }),
    ]);
  } catch {
    await bucket.delete(objectKey);
    return NextResponse.json({ error: 'contract_record_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, documentId: id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  const parsed = z.object({ id: z.string().uuid(), confirmation: z.literal('DELETE CONTRACT') }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_confirmation' }, { status: 400 });
  const database = requireDatabase();
  const row = await database.prepare('SELECT object_key FROM partner_contract_documents WHERE id=? AND deleted_at IS NULL').bind(parsed.data.id).first<{ object_key: string }>();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  await getRuntimeEnv().MEDIA?.delete(row.object_key);
  await database.batch([
    database.prepare('UPDATE partner_contract_documents SET deleted_at=CURRENT_TIMESTAMP WHERE id=?').bind(parsed.data.id),
    auditStatement(database, { actorEmail: identity.email, action: 'partner-contract.deleted', entityType: 'partner-contract-document', entityId: parsed.data.id }),
  ]);
  return NextResponse.json({ ok: true });
}
