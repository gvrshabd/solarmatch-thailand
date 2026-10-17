import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminRequest, isAdminError } from '@/lib/server/admin-api';
import { createCsrfToken } from '@/lib/server/admin-auth';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { getPublishedRelease, publishHomeownerDesignV3Release } from '@/lib/server/releases';

const headers = { 'Cache-Control': 'no-store' };
const bodySchema = z.object({
  action: z.literal('publish-homeowner-v3-disabled'),
  expectedCurrentReleaseId: z.string().regex(/^residential-release-v[0-9]+$/),
  // Operator-supplied backup reference for the audit trail, not a claim that a
  // remote endpoint can independently verify a local encrypted backup.
  backupSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

async function publicationBody(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error('invalid_content_type');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('missing_body');
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length;
      if (total > 2048) { await reader.cancel(); throw new Error('request_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function heldRuntime(request: Request) {
  const env = getRuntimeEnv();
  const origin = new URL(request.url).origin;
  const staging = origin === 'https://solarmatch-installer-staging.deluxejahseh.workers.dev';
  if (!staging && origin !== 'https://solarmatch-thailand.deluxejahseh.workers.dev') return false;
  if (env.INSTALLER_BASE_URL !== origin || env.INSTALLER_PLATFORM_MODE !== (staging ? 'sandbox' : 'off')) return false;
  for (const key of ['INSTALLER_TEST_CLOCK_ENABLED', 'INSTALLER_SCHEDULER_EXPECTED', 'OUTBOUND_MESSAGES_ENABLED',
    'CAMPAIGN_ATTRIBUTION_ENABLED', 'CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED', 'AUTH_EMAIL_LIVE_ENABLED',
    'SMS_LIVE_ENABLED', 'OMISE_LIVE_ENABLED', 'LINE_LIVE_ENABLED'] as const) if (env[key] !== 'false') return false;
  for (const key of ['AUTH_EMAIL_PROVIDER_MODE', 'SMS_PROVIDER_MODE', 'OMISE_PROVIDER_MODE'] as const) if (env[key] !== 'off') return false;
  return env.LINE_PROVIDER_MODE === (staging ? 'sandbox' : 'off');
}

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  if (!heldRuntime(request)) return NextResponse.json({ error: 'release_runtime_not_held' }, { status: 409, headers });
  const held = await requireDatabase().prepare(`SELECT 1 held FROM installer_platform_settings WHERE id=1
    AND json_extract(config_json,'$.collectionEnabled')=0 AND json_extract(config_json,'$.paymentsEnabled')=0
    AND json_extract(config_json,'$.notificationsEnabled')=0 AND json_extract(config_json,'$.platformPaused')=1
    AND json_extract(config_json,'$.deliveryPaused')=1
    AND EXISTS(SELECT 1 FROM installer_test_clock WHERE id=1 AND fixed_at IS NULL)`).first();
  if (!held) return NextResponse.json({ error: 'release_database_not_held' }, { status: 409, headers });
  const current = await getPublishedRelease(); // Read-only: never bootstraps versions.
  return NextResponse.json({ currentReleaseId: current?.release_id ?? null,
    csrfToken: await createCsrfToken(identity), publication: 'explicit-disabled-only' }, { headers });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403, headers });
  }
  if (!heldRuntime(request)) return NextResponse.json({ error: 'release_runtime_not_held' }, { status: 409, headers });
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await publicationBody(request)); }
  catch { return NextResponse.json({ error: 'invalid_publication_request' }, { status: 400, headers }); }
  try {
    const result = await publishHomeownerDesignV3Release(requireDatabase(), {
      actor: identity.email, expectedCurrentReleaseId: body.expectedCurrentReleaseId,
      backupSha256: body.backupSha256, requireOperationalHolds: true,
    });
    return NextResponse.json({ ok: true, ...result, liveLeadSubmissions: false, kwhContactSupported: false }, { headers });
  } catch {
    // Do not leak database errors, actor data or source documents. A stale source,
    // occupied version or changed hold requires a fresh read and human review.
    return NextResponse.json({ error: 'release_publication_conflict' }, { status: 409, headers });
  }
}
