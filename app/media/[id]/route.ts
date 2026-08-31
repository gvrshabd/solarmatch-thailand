import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const asset = await requireDatabase().prepare(`SELECT object_key, content_type FROM media_assets
    WHERE id = ? AND publication_state = 'published' AND deleted_at IS NULL LIMIT 1`).bind(id).first<{ object_key: string; content_type: string }>();
  if (!asset) return new NextResponse(null, { status: 404 });
  const object = await getRuntimeEnv().MEDIA?.get(asset.object_key);
  if (!object) return new NextResponse(null, { status: 404 });
  return new NextResponse(object.body, { headers: {
    'Content-Type': asset.content_type,
    'Content-Length': String(object.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
  } });
}
