import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { FixtureDatabase } from '../installer/fixtures';

const state = vi.hoisted(() => ({ database: null as D1Database | null, env: {} as Record<string, string>, denied: false }));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => state.env, requireDatabase: () => state.database }));
vi.mock('@/lib/server/admin-api', () => ({
  requireAdminRequest: vi.fn(async () => state.denied ? NextResponse.json({ error: 'unauthorized' }, { status: 401 }) : { email: 'synthetic-reviewer' }),
  isAdminError: (value: unknown) => value instanceof NextResponse,
}));
vi.mock('@/lib/server/admin-auth', () => ({ createCsrfToken: vi.fn(async () => 'synthetic-csrf') }));
import { requireAdminRequest } from '@/lib/server/admin-api';
import { getCurrentRelease } from '@/lib/server/releases';
import { GET, POST } from '@/app/admin/api/homeowner-v3-release/route';

const origin = 'https://solarmatch-thailand.deluxejahseh.workers.dev';
const payload = { action: 'publish-homeowner-v3-disabled', expectedCurrentReleaseId: 'residential-release-v8', backupSha256: 'a'.repeat(64) };
const request = (body: unknown = payload, source = origin) => new Request(origin + '/admin/api/homeowner-v3-release', {
  method: 'POST', headers: { 'content-type': 'application/json', origin: source, 'x-csrf-token': 'synthetic-csrf' }, body: JSON.stringify(body),
});
let fixture: FixtureDatabase;
beforeEach(async () => {
  fixture = new FixtureDatabase(); state.database = fixture.d1(); state.denied = false;
  state.env = { INSTALLER_PLATFORM_MODE: 'off', INSTALLER_BASE_URL: origin, LINE_PROVIDER_MODE: 'off' };
  for (const key of ['INSTALLER_TEST_CLOCK_ENABLED', 'INSTALLER_SCHEDULER_EXPECTED', 'OUTBOUND_MESSAGES_ENABLED',
    'CAMPAIGN_ATTRIBUTION_ENABLED', 'CAMPAIGN_ATTRIBUTION_PRIVACY_REVIEWED', 'AUTH_EMAIL_LIVE_ENABLED', 'SMS_LIVE_ENABLED', 'OMISE_LIVE_ENABLED', 'LINE_LIVE_ENABLED']) state.env[key] = 'false';
  for (const key of ['AUTH_EMAIL_PROVIDER_MODE', 'SMS_PROVIDER_MODE', 'OMISE_PROVIDER_MODE']) state.env[key] = 'off';
  await getCurrentRelease(fixture.d1());
  fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.collectionEnabled',0,'$.paymentsEnabled',0,'$.notificationsEnabled',0,'$.platformPaused',1,'$.deliveryPaused',1) WHERE id=1");
});
afterEach(() => { fixture.close(); state.database = null; vi.clearAllMocks(); });

describe('explicit homeowner v3 admin publication', () => {
  it('reads preflight without a database mutation and protects both methods with admin authentication', async () => {
    const batch = vi.spyOn(fixture, 'batch');
    const response = await GET(new Request(origin + '/admin/api/homeowner-v3-release'));
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ currentReleaseId: 'residential-release-v8', csrfToken: 'synthetic-csrf' });
    expect(batch).not.toHaveBeenCalled();
    state.denied = true;
    expect((await GET(new Request(origin + '/admin/api/homeowner-v3-release'))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
    expect(batch).not.toHaveBeenCalled();
  });
  it('publishes with CSRF required, disabled contact and an audited backup reference', async () => {
    const req = request(); const response = await POST(req);
    expect(requireAdminRequest).toHaveBeenCalledWith(req, { csrf: true });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ releaseId: 'residential-release-v9', liveLeadSubmissions: false, kwhContactSupported: true });
    const event = fixture.sqlite.prepare("SELECT next_json FROM audit_events WHERE action='homeowner-design-v3.published-disabled'").get();
    expect(JSON.parse(String(event?.next_json)).backupSha256).toBe(payload.backupSha256);
    expect((await POST(request())).status).toBe(409); // No retry duplicates.
  });
  it('rejects cross-scheme origin, missing backup reference and oversized requests', async () => {
    expect((await POST(request(payload, origin.replace('https:', 'http:')))).status).toBe(403);
    expect((await POST(request({ ...payload, backupSha256: undefined }))).status).toBe(400);
    expect((await POST(request({ ...payload, padding: 'x'.repeat(3000) }))).status).toBe(400);
    expect(fixture.sqlite.prepare('SELECT id FROM public_releases WHERE is_current=1').get()?.id).toBe('residential-release-v8');
  });
  it('fails closed for enabled/missing runtime gates and changed operational holds', async () => {
    state.env.OUTBOUND_MESSAGES_ENABLED = 'true'; expect((await POST(request())).status).toBe(409);
    delete state.env.OUTBOUND_MESSAGES_ENABLED; expect((await POST(request())).status).toBe(409);
    state.env.OUTBOUND_MESSAGES_ENABLED = 'false';
    fixture.sqlite.exec("UPDATE installer_platform_settings SET config_json=json_set(config_json,'$.collectionEnabled',1) WHERE id=1");
    expect((await GET(new Request(origin + '/admin/api/homeowner-v3-release'))).status).toBe(409);
    expect((await POST(request())).status).toBe(409);
    expect(fixture.sqlite.prepare('SELECT id FROM questionnaire_versions WHERE version_number=8').get()).toBeUndefined();
  });
});
