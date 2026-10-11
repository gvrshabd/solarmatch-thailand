import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ restricted: false }));
const runtime = vi.hoisted(() => ({ INSTALLER_PLATFORM_MODE: 'production', INSTALLER_BASE_URL: 'https://solar.example.test', PHONE_VERIFICATION_SECRET: 'synthetic-phone-secret-more-than-thirty-two', ASSESSMENT_SIGNING_SECRET: 'synthetic-assessment-secret-more-than-thirty-two', DB: undefined as D1Database | undefined }));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => runtime, requireDatabase: () => runtime.DB! }));
vi.mock('@/lib/server/private-preview-auth', () => ({ authenticateRestrictedSiteOwner: async () => state.restricted ? { email: 'owner@example.test' } : null }));
vi.mock('@/lib/server/contact-mode', async (original) => {
  const actual = await original<typeof import('@/lib/server/contact-mode')>();
  const ready = (row: Parameters<typeof actual.publicContactConfiguration>[0]) => actual.publicContactConfiguration({ ...row, contact_collection_mode: 'shared_solar_company_handoff', contact_collection_enabled: 1, public_collection_enabled: 1, restricted_site_collection_enabled: 1, legal_complete: 1, retention_days: 180, distribution_window_days: 7, recipient_category: 'solar_service_recipients', active_partner_count: 1, adult_confirmation_version_id: 'synthetic-adult', consent_version_id: 'synthetic-consent', privacy_notice_version_id: 'synthetic-privacy', terms_version_id: 'synthetic-terms', cookie_policy_version_id: 'synthetic-cookies' });
  return { ...actual, publicContactConfiguration: ready, restrictedOperationalContactConfiguration: ready };
});
import { NextRequest } from 'next/server';
import { FixtureDatabase, seedFixture, syntheticAnswers } from '../installer/fixtures';
import { getCurrentRelease } from '@/lib/server/releases';
import { createAssessmentToken } from '@/lib/server/assessment-token';
import { sha256 } from '@/lib/server/crypto';
import { verificationBindings } from '@/lib/installer/phone-verification';
import { getPlatformSettings } from '@/lib/installer/settings';
import { POST } from '@/app/api/leads/route';

let fixture: FixtureDatabase;
beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T03:00:00Z'));
  runtime.INSTALLER_PLATFORM_MODE = 'production'; runtime.INSTALLER_BASE_URL = 'https://solar.example.test'; state.restricted = false;
  fixture = new FixtureDatabase(); runtime.DB = fixture.d1(); await seedFixture(runtime.DB);
});
afterEach(() => { fixture.close(); runtime.DB = undefined; vi.useRealTimers(); });
async function verifiedRequest() {
  const db = fixture.d1(), release = (await getCurrentRelease(db))!;
  const settings = await getPlatformSettings(db);
  // Approved configuration fixture, never production data or activation.
  await db.prepare('UPDATE contact_configuration_versions SET public_collection_enabled=1 WHERE id=?').bind(release.contact_configuration_version_id).run();
  await db.prepare("UPDATE public_releases SET live_lead_submissions=1,receiving_company_en='Synthetic',receiving_company_th='ทดสอบ',receiving_company_privacy_url='https://example.test/privacy',retention_days=180 WHERE id=?").bind(release.release_id).run();
  await db.prepare('UPDATE legal_document_versions SET is_complete=1 WHERE id=?').bind(release.legal_document_version_id).run();
  const token = (await createAssessmentToken({ releaseId: release.release_id, questionnaireVersionId: release.questionnaire_version_id, ruleVersionId: release.rule_version_id }))!.token;
  const challengeId = crypto.randomUUID(), proof = 'p'.repeat(43), bindings = await verificationBindings('0812345678', token);
  await db.prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,session_hash,code_hash,expires_at,resend_after,mode,send_state,verified_at,proof_hash,created_at)
    VALUES(?,?,?,?,?,?,?,?,'accepted',?,?,?)`).bind(challengeId, bindings.phoneHash, '+66812345678', bindings.sessionHash, 'synthetic-unused', '2026-10-11T03:05:00Z', '2026-10-11T03:01:00Z', runtime.INSTALLER_PLATFORM_MODE, '2026-10-11T03:00:00Z', await sha256(proof), '2026-10-11T03:00:00Z').run();
  vi.advanceTimersByTime(2000);
  return { settings, challengeId, body: { legalFirstName: 'Synthetic', legalLastName: 'Review', phone: '0812345678', contactMethod: 'phone', adultConfirmed: true, consent: true, locale: 'en', assessmentToken: token, phoneVerificationId: challengeId, phoneVerificationProof: proof, idempotencyKey: crypto.randomUUID(), website: '', answers: syntheticAnswers } };
}
function request(body: unknown) { return new NextRequest(`${runtime.INSTALLER_BASE_URL}/api/leads`, { method: 'POST', headers: { Origin: runtime.INSTALLER_BASE_URL, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
function counts() { return fixture.sqlite.prepare('SELECT (SELECT count(*) FROM leads) leads,(SELECT count(*) FROM installer_enquiries) enquiries').get(); }

describe('trusted final submission classification and pause boundary', () => {
  it('labels an approved production request as production, not a historical test', async () => {
    const { body } = await verifiedRequest();
    // Trusted approved publication; the test deliberately does not exercise legal activation.
    const response = await POST(request(body)); expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ testSubmission: false, submissionMode: 'production' });
    expect(fixture.sqlite.prepare('SELECT submission_environment,is_test_submission,submission_mode FROM leads').get()).toMatchObject({ submission_environment: 'production', is_test_submission: 0, submission_mode: 'production' });
  });
  it.each(['sandbox', 'local-test', 'restricted-preview'] as const)('records accurate %s metadata from trusted context', async mode => {
    runtime.INSTALLER_PLATFORM_MODE = mode === 'restricted-preview' ? 'production' : mode;
    runtime.INSTALLER_BASE_URL = mode === 'local-test' ? 'http://localhost:3000' : 'https://solar.example.test';
    state.restricted = mode === 'restricted-preview';
    const { body } = await verifiedRequest();
    const response = await POST(request(body)); expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ testSubmission: true, submissionMode: mode });
    const row = fixture.sqlite.prepare('SELECT submission_mode,is_test_submission,submission_environment,distribution_allowed FROM leads').get();
    expect(row).toMatchObject({ submission_mode: mode, is_test_submission: 1, submission_environment: mode === 'restricted-preview' ? 'restricted_site_operational' : 'private_development_preview' });
    if (mode === 'restricted-preview') expect(row?.distribution_allowed).toBe(0);
    expect(counts()).toMatchObject({ leads: 1, enquiries: 1 });
  });
  it('rejects client-forged mode and score rather than trusting them', async () => {
    const { body } = await verifiedRequest();
    expect((await POST(request({ ...body, submissionMode: 'production', testSubmission: false, qualityScore: 5 }))).status).toBe(400);
    expect(counts()).toMatchObject({ leads: 0, enquiries: 0 });
  });
  it('rejects proof issued in a different runtime mode', async () => {
    const { body, challengeId } = await verifiedRequest();
    fixture.sqlite.prepare("UPDATE installer_phone_challenges SET mode='sandbox' WHERE id=?").run(challengeId);
    expect((await POST(request(body))).status).toBe(403);
    expect(counts()).toMatchObject({ leads: 0, enquiries: 0 });
  });
  it('preserves classification on repeated requests and consumes proof only once', async () => {
    runtime.INSTALLER_PLATFORM_MODE = 'local-test'; runtime.INSTALLER_BASE_URL = 'http://localhost:3000';
    const { body, challengeId } = await verifiedRequest();
    expect((await POST(request(body))).status).toBe(201);
    const response = await POST(request(body)); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ duplicate: true, testSubmission: true, submissionMode: 'local-test' });
    expect(counts()).toMatchObject({ leads: 1, enquiries: 1 });
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).not.toBeNull();
  });
  it('rejects a verified final request after global pause without consuming proof or writing an enquiry', async () => {
    const { body, settings, challengeId } = await verifiedRequest();
    await fixture.d1().prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').bind(JSON.stringify({ ...settings, platformPaused: true })).run();
    const response = await POST(request(body)); expect(response.status).toBe(503);
    expect(counts()).toMatchObject({ leads: 0, enquiries: 0 });
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
  it('does not commit or consume proof if pause intervenes just before the write batch', async () => {
    runtime.INSTALLER_PLATFORM_MODE = 'local-test'; runtime.INSTALLER_BASE_URL = 'http://localhost:3000';
    const { body, settings, challengeId } = await verifiedRequest();
    const original = fixture.batch.bind(fixture);
    fixture.batch = async statements => {
      if (statements.length > 3) fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({ ...settings, platformPaused: true }));
      return original(statements);
    };
    const response = await POST(request(body)); expect(response.status).toBe(503);
    expect(counts()).toMatchObject({ leads: 0, enquiries: 0 });
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
  it('a resumed eligible request can use the unconsumed proof', async () => {
    const { body, settings, challengeId } = await verifiedRequest();
    fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({ ...settings, platformPaused: true }));
    expect((await POST(request(body))).status).toBe(503);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
    fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({ ...settings, platformPaused: false }));
    expect((await POST(request(body))).status).toBe(201);
    expect(counts()).toMatchObject({ leads: 1, enquiries: 1 });
  });
  it('an intervening restricted-owner pause creates no audit, score or canonical writes', async () => {
    state.restricted = true;
    const { body, settings, challengeId } = await verifiedRequest();
    const before = fixture.sqlite.prepare('SELECT count(*) n FROM audit_events').get()?.n;
    const original = fixture.batch.bind(fixture);
    fixture.batch = async statements => {
      if (statements.length > 3) fixture.sqlite.prepare('UPDATE installer_platform_settings SET config_json=? WHERE id=1').run(JSON.stringify({ ...settings, platformPaused: true }));
      return original(statements);
    };
    expect((await POST(request(body))).status).toBe(503);
    expect(counts()).toMatchObject({ leads: 0, enquiries: 0 });
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM audit_events').get()?.n).toBe(before);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM lead_score_history').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT count(*) n FROM installer_enquiry_leads').get()?.n).toBe(0);
    expect(fixture.sqlite.prepare('SELECT consumed_at FROM installer_phone_challenges WHERE id=?').get(challengeId)?.consumed_at).toBeNull();
  });
});
