import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
  INSTALLER_PLATFORM_MODE: 'local-test',
  INSTALLER_BASE_URL: 'http://localhost:3000',
  LOCAL_ADMIN_PASSWORD: 'synthetic-random-password-at-least-32-characters',
  LOCAL_ADMIN_SESSION_SECRET: 'synthetic-random-session-secret-at-least-32-characters',
  CSRF_SECRET: 'synthetic-random-csrf-secret-at-least-32-characters',
}));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => runtime }));
import { authenticateAdmin, createCsrfToken, createLocalAdminSession, localAdminAvailable, verifyCsrfToken, LOCAL_ADMIN_COOKIE } from '@/lib/server/admin-auth';
import { POST as localSessionPost } from '@/app/admin/api/local-session/route';

describe('synthetic local administrator boundary', () => {
  beforeEach(() => { runtime.INSTALLER_PLATFORM_MODE = 'local-test'; runtime.INSTALLER_BASE_URL = 'http://localhost:3000'; });

  it('accepts only signed, unexpired loopback sessions and retains CSRF binding', async () => {
    const session = await createLocalAdminSession('localhost:3000', runtime.LOCAL_ADMIN_PASSWORD);
    expect(session).toBeTruthy();
    const headers = new Headers({ host: 'localhost:3000', cookie: `${LOCAL_ADMIN_COOKIE}=${session}` });
    const identity = await authenticateAdmin(headers);
    expect(identity).toMatchObject({ email: 'synthetic-administrator@example.test' });
    const csrf = await createCsrfToken(identity!);
    expect(await verifyCsrfToken(identity!, csrf)).toBe(true);
    expect(await verifyCsrfToken(identity!, 'altered')).toBe(false);
    headers.set('cookie', `${LOCAL_ADMIN_COOKIE}=${session!.slice(0, -1)}x`);
    expect(await authenticateAdmin(headers)).toBeNull();
  });

  it('rejects wrong password, other host, sandbox mode and expired session', async () => {
    expect(await createLocalAdminSession('localhost:3000', 'wrong')).toBeNull();
    expect(localAdminAvailable('example.com')).toBe(false);
    const session = await createLocalAdminSession('localhost:3000', runtime.LOCAL_ADMIN_PASSWORD);
    expect(await authenticateAdmin(new Headers({ host: 'example.com', cookie: `${LOCAL_ADMIN_COOKIE}=${session}` }))).toBeNull();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(Date.now() + 3601_000);
      expect(await authenticateAdmin(new Headers({ host: 'localhost:3000', cookie: `${LOCAL_ADMIN_COOKIE}=${session}` }))).toBeNull();
    } finally { vi.useRealTimers(); }
    runtime.INSTALLER_PLATFORM_MODE = 'sandbox';
    expect(await authenticateAdmin(new Headers({ host: 'localhost:3000', cookie: `${LOCAL_ADMIN_COOKIE}=${session}` }))).toBeNull();
  });

  it('issues an HttpOnly cookie only for the exact local origin and form request', async () => {
    const body = new URLSearchParams({ password: runtime.LOCAL_ADMIN_PASSWORD }).toString();
    const makeRequest = (origin: string) => new Request('http://localhost:3000/admin/api/local-session', { method: 'POST', headers: { host: 'localhost:3000', origin, 'content-type': 'application/x-www-form-urlencoded' }, body });
    const rejected = await localSessionPost(makeRequest('https://example.test'));
    expect(rejected.status).toBe(404);
    expect(rejected.headers.get('set-cookie')).toBeNull();
    const accepted = await localSessionPost(makeRequest('http://localhost:3000'));
    expect(accepted.status).toBe(303);
    expect(accepted.headers.get('set-cookie')).toContain('HttpOnly');
    expect(accepted.headers.get('set-cookie')).toContain('SameSite=strict');
    expect(accepted.headers.get('set-cookie')).toContain('Path=/admin');
  });
});
