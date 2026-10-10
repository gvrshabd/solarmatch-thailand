import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ INSTALLER_PLATFORM_MODE: 'local-test', INSTALLER_BASE_URL: 'http://localhost:3000', DB: undefined as D1Database | undefined }));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => runtime, requireDatabase: () => runtime.DB! }));
vi.mock('@/lib/server/admin-api', () => ({ requireAdminRequest: async () => ({ email: 'synthetic-administrator@example.test' }), isAdminError: () => false }));
import { POST } from '@/app/admin/api/installer-platform/route';
import { FixtureDatabase, seedFixture } from '../installer/fixtures';

describe('admin privacy acknowledgement evidence', () => {
  let fixture: FixtureDatabase;
  beforeEach(async () => { fixture = new FixtureDatabase(); runtime.DB = fixture.d1(); await seedFixture(fixture.d1()); });
  afterEach(() => fixture.close());

  it('approval activates a pending company without unpausing it, and rejection disables it', async () => {
    const companyId='f0000000-0000-4000-8000-000000000001';
    fixture.sqlite.prepare("INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,created_by,updated_by,active,paused,approval_status,registration_number,privacy_notice_url,contract_state,contract_effective_date,contract_expiry_date) VALUES(?,'Synthetic pending company','บริษัททดสอบ','fixture','fixture',0,1,'pending','SYNTHETIC-TEST','https://example.test/privacy','active','2026-01-01','2030-12-31')").run(companyId);
    const request=(approve?:boolean)=>new Request('http://localhost:3000/admin/api/installer-platform',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({action:'approve-company',companyId,approve})});
    expect((await POST(request())).status).toBe(409);
    expect((await POST(request(true))).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT approval_status,active,paused FROM solar_company_partners WHERE id=?').get(companyId)).toMatchObject({approval_status:'approved',active:1,paused:1});
    expect((await POST(request(false))).status).toBe(200);
    expect(fixture.sqlite.prepare('SELECT approval_status,active,paused FROM solar_company_partners WHERE id=?').get(companyId)).toMatchObject({approval_status:'rejected',active:0,paused:1});
    fixture.sqlite.prepare('UPDATE solar_company_partners SET archived_at=? WHERE id=?').run(new Date().toISOString(),companyId);
    expect((await POST(request(true))).status).toBe(409);
  });

  it('records evidence only when an action-required withdrawal task actually changes state', async () => {
    const now = new Date().toISOString();
    fixture.sqlite.prepare("INSERT INTO installer_outbox(id,kind,state,next_attempt_at,created_at,updated_at) VALUES('withdrawal-task','withdrawal','action-required',?,?,?)").run(now,now,now);
    const request = (outboxId: string) => new Request('http://localhost:3000/admin/api/installer-platform', { method: 'POST', headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'acknowledge-privacy-notification', outboxId, notes: 'Synthetic responsible person confirmed recipient follow-up.' }) });
    expect((await POST(request('missing-task'))).status).toBe(409);
    expect(fixture.sqlite.prepare("SELECT count(*) AS total FROM audit_events WHERE action='installer.privacy-recipient-notified'").get()).toMatchObject({ total: 0 });
    expect((await POST(request('withdrawal-task'))).status).toBe(200);
    expect(fixture.sqlite.prepare("SELECT state FROM installer_outbox WHERE id='withdrawal-task'").get()).toMatchObject({ state: 'accepted' });
    expect((await POST(request('withdrawal-task'))).status).toBe(409);
    expect(fixture.sqlite.prepare("SELECT count(*) AS total FROM audit_events WHERE action='installer.privacy-recipient-notified'").get()).toMatchObject({ total: 1 });
  });
});
