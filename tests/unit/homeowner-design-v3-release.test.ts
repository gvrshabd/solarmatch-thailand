import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatorV3Questionnaire, homeownerDesignV3Questionnaire, initialQuestionnaire } from '@/config/assessment';
import { assessmentReleaseContract, submissionMatchesAssessmentContract } from '@/lib/questionnaire/release-contract';
import { questionnaireDocumentSchema } from '@/lib/questionnaire/validation';
import { calculateLeadAssessment, initialScoringConfiguration } from '@/lib/qualification/scoring';
import { FixtureDatabase, syntheticAnswers } from '../installer/fixtures';

const state = vi.hoisted(() => ({ database: null as D1Database | null }));
vi.mock('@/lib/server/runtime', () => ({
  getRuntimeEnv: () => ({ INSTALLER_PLATFORM_MODE: 'off' }),
  requireDatabase: () => { if (!state.database) throw new Error('missing test database'); return state.database; },
}));
vi.mock('@/lib/server/admin-api', () => ({
  requireAdminRequest: vi.fn(async () => ({ email: 'synthetic-reviewer' })),
  isAdminError: () => false,
}));
import { getCurrentRelease, getPublishedRelease, getPublicAssessmentConfig, homeownerDesignV3ContactId,
  homeownerDesignV3ReleaseId, publishHomeownerDesignV3Release } from '@/lib/server/releases';
import { POST as publishAdminConfiguration } from '@/app/admin/api/config/route';
import { requireAdminRequest } from '@/lib/server/admin-api';

let fixture: FixtureDatabase;
beforeEach(() => { fixture = new FixtureDatabase(); state.database = fixture.d1(); });
afterEach(() => { vi.restoreAllMocks(); fixture.close(); state.database = null; });
const publish = () => publishHomeownerDesignV3Release(fixture.d1(), { actor: 'synthetic-reviewer', expectedCurrentReleaseId: 'residential-release-v8' });
const rows = (table: string) => fixture.sqlite.prepare(`SELECT * FROM ${table} ORDER BY id`).all();

describe('bill-first questionnaire contract', () => {
  it('adds schema11 without mutating qv6/qv7 and preserves installed-AC and planning semantics', () => {
    expect(initialQuestionnaire).toMatchObject({ id: 'residential-questionnaire-v6', schemaVersion: 9 });
    expect(calculatorV3Questionnaire).toMatchObject({ id: 'residential-questionnaire-v7', schemaVersion: 10 });
    expect(calculatorV3Questionnaire.questions[0].id).toBe('projectType');
    expect(homeownerDesignV3Questionnaire).toMatchObject({ id: 'residential-questionnaire-v8', schemaVersion: 11 });
    expect(questionnaireDocumentSchema.safeParse(homeownerDesignV3Questionnaire).success).toBe(true);
    expect(homeownerDesignV3Questionnaire.questions.map(q => q.id)).toEqual([
      'monthlyBillThb', 'projectType', 'province', 'daytimePattern', 'roofArea', 'shade', 'propertyType',
      'ownershipStatus', 'activelyPlanningSolar', 'daytimeLoads', 'roofMaterial', 'quoteContactRequested',
    ]);
    for (const question of homeownerDesignV3Questionnaire.questions) {
      const original = calculatorV3Questionnaire.questions.find(q => q.id === question.id);
      expect(question).toEqual(original);
      expect(question).not.toBe(original);
    }
    expect(calculateLeadAssessment({ ...syntheticAnswers, airConditionerCount: 4, daylightAcUnits: 1, daylightAcHours: 1 }, initialScoringConfiguration).hardEligible).toBe(true);
    expect(calculateLeadAssessment({ ...syntheticAnswers, airConditionerCount: 3 }, initialScoringConfiguration).hardEligible).toBe(false);
  });

  it('rejects reordered or optionalized required facts and unsupported modern release pairs', () => {
    expect(questionnaireDocumentSchema.safeParse({ ...homeownerDesignV3Questionnaire,
      questions: [...homeownerDesignV3Questionnaire.questions].reverse() }).success).toBe(false);
    expect(questionnaireDocumentSchema.safeParse({ ...homeownerDesignV3Questionnaire,
      questions: homeownerDesignV3Questionnaire.questions.map(q => q.id === 'roofArea' ? { ...q, required: false } : q) }).success).toBe(false);
    expect(assessmentReleaseContract(homeownerDesignV3Questionnaire, homeownerDesignV3Questionnaire.id, 'residential-rules-v4'))
      .toMatchObject({ calculatorModelVersion: 'energy-v3', contactInputSupport: { bill: true, kwh: false, policyVersion: 'actual-bill-v1' } });
    expect(() => assessmentReleaseContract(homeownerDesignV3Questionnaire, homeownerDesignV3Questionnaire.id, 'residential-rules-v3')).toThrow('incompatible');
    expect(() => assessmentReleaseContract({ ...homeownerDesignV3Questionnaire, schemaVersion: 10 }, homeownerDesignV3Questionnaire.id, 'residential-rules-v4')).toThrow('incompatible');
    expect(() => assessmentReleaseContract(homeownerDesignV3Questionnaire, calculatorV3Questionnaire.id, 'residential-rules-v4')).toThrow('mismatch');
  });

  it('prevents model omission from bypassing required roof facts without changing legacy submissions', () => {
    expect(submissionMatchesAssessmentContract(syntheticAnswers, initialQuestionnaire)).toBe(true);
    expect(submissionMatchesAssessmentContract(syntheticAnswers, homeownerDesignV3Questionnaire)).toBe(false);
    expect(submissionMatchesAssessmentContract({ ...syntheticAnswers, estimateModelVersion: 'energy-v3' }, homeownerDesignV3Questionnaire)).toBe(false);
    expect(submissionMatchesAssessmentContract({ ...syntheticAnswers, estimateModelVersion: 'energy-v3', roofArea: 'unsure' }, homeownerDesignV3Questionnaire)).toBe(true);
  });
});

describe('explicit disabled release publication', () => {
  it('never initializes an empty database or upgrades an existing release on public configuration reads', async () => {
    const batch = vi.spyOn(fixture, 'batch');
    await expect(getPublicAssessmentConfig()).rejects.toThrow('No published');
    expect(batch).not.toHaveBeenCalled();
    expect(rows('public_releases')).toEqual([]);
    await getCurrentRelease(fixture.d1()); // Existing explicit test bootstrap, not public API.
    batch.mockClear();
    const before = rows('public_releases');
    const config = await getPublicAssessmentConfig();
    expect(config).toMatchObject({ questionnaireVersionId: initialQuestionnaire.id, calculatorModelVersion: 'legacy-v5',
      contactInputSupport: { kwh: false }, assessmentToken: null, liveLeadSubmissions: false });
    expect(rows('public_releases')).toEqual(before);
    expect(batch).not.toHaveBeenCalled();
  });

  it('atomically publishes qv8/rulesv4, new disabled contact and audit while preserving legal, scoring and business data', async () => {
    await getCurrentRelease(fixture.d1());
    const preservedTables = ['legal_document_versions', 'content_versions', 'rule_versions', 'scoring_rules',
      'qualification_rules', 'installer_platform_settings', 'leads', 'installer_credit_ledger', 'lead_recipient_deliveries'];
    const before = preservedTables.map(rows);
    const questionnairesBefore = rows('questionnaire_versions');
    const result = await publish();
    expect(result).toEqual({ releaseId: homeownerDesignV3ReleaseId, previousReleaseId: 'residential-release-v8', questionnaireVersionId: homeownerDesignV3Questionnaire.id });
    preservedTables.forEach((table, i) => expect(rows(table), table).toEqual(before[i]));
    for (const historic of questionnairesBefore) expect(rows('questionnaire_versions')).toContainEqual(historic);
    const release = await getPublishedRelease(fixture.d1());
    expect(release).toMatchObject({ release_id: homeownerDesignV3ReleaseId, questionnaire_version_id: homeownerDesignV3Questionnaire.id,
      rule_version_id: 'residential-rules-v4', live_lead_submissions: 0, contact_configuration_version_id: homeownerDesignV3ContactId,
      contact_collection_mode: 'disabled', contact_collection_enabled: 0, restricted_site_collection_enabled: 0, public_collection_enabled: 0 });
    expect(fixture.sqlite.prepare('SELECT count(*) count FROM public_releases WHERE is_current=1').get()?.count).toBe(1);
    expect(fixture.sqlite.prepare('SELECT count(*) count FROM assessment_questions WHERE questionnaire_version_id=?').get(homeownerDesignV3Questionnaire.id)?.count).toBe(12);
    expect(fixture.sqlite.prepare("SELECT count(*) count FROM audit_events WHERE action='homeowner-design-v3.published-disabled'").get()?.count).toBe(1);
    expect(fixture.sqlite.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    const batch = vi.spyOn(fixture, 'batch');
    const config = await getPublicAssessmentConfig({ restrictedAccess: true });
    expect(config).toMatchObject({ questionnaireVersionId: homeownerDesignV3Questionnaire.id, calculatorModelVersion: 'energy-v3',
      contactReviewAvailable: false,
      contactInputSupport: { policyVersion: 'actual-bill-v1', bill: true, kwh: false },
      assessmentToken: null, liveLeadSubmissions: false, restrictedSiteCollectionEnabled: false, publicCollectionEnabled: false,
      contact: { enabled: false, mode: 'disabled', operationalDistributionEnabled: false } });
    expect(config.calculationReferenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(batch).not.toHaveBeenCalled();
    const releasesAfter = rows('public_releases');
    await getCurrentRelease(fixture.d1());
    expect(rows('public_releases')).toEqual(releasesAfter); // Historic initializers do not retarget.
  });

  it('rejects stale expected sources and occupied version numbers without partial rows', async () => {
    await getCurrentRelease(fixture.d1());
    await expect(publishHomeownerDesignV3Release(fixture.d1(), { actor: 'synthetic-reviewer', expectedCurrentReleaseId: 'residential-release-v7' })).rejects.toThrow('source_changed');
    fixture.sqlite.prepare("INSERT INTO questionnaire_versions(id,version_number,state,schema_version,document_json,created_by) VALUES('reserved-q8',8,'draft',11,'{}','synthetic')").run();
    const before = rows('public_releases');
    await expect(publish()).rejects.toThrow('already_allocated');
    expect(rows('public_releases')).toEqual(before);
    expect(fixture.sqlite.prepare('SELECT id FROM contact_configuration_versions WHERE id=?').get(homeownerDesignV3ContactId)).toBeUndefined();
  });

  it('rolls back the entire publication if its final audit fails', async () => {
    await getCurrentRelease(fixture.d1());
    const before = ['public_releases', 'questionnaire_versions', 'contact_configuration_versions', 'assessment_questions', 'assessment_options'].map(rows);
    fixture.sqlite.exec("CREATE TRIGGER synthetic_publication_failure BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END;");
    await expect(publish()).rejects.toThrow('synthetic audit failure');
    ['public_releases', 'questionnaire_versions', 'contact_configuration_versions', 'assessment_questions', 'assessment_options'].forEach((table, i) => expect(rows(table)).toEqual(before[i]));
  });

  it('rejects a concurrent current-release change inside the transaction', async () => {
    await getCurrentRelease(fixture.d1());
    const originalBatch = fixture.batch.bind(fixture);
    vi.spyOn(fixture, 'batch').mockImplementationOnce(async statements => {
      fixture.sqlite.exec("UPDATE public_releases SET is_current=0 WHERE is_current=1; UPDATE public_releases SET is_current=1 WHERE id='residential-release-v7';");
      return originalBatch(statements);
    });
    await expect(publish()).rejects.toThrow(/NOT NULL/);
    expect(fixture.sqlite.prepare('SELECT id FROM public_releases WHERE is_current=1').get()?.id).toBe('residential-release-v7');
    expect(fixture.sqlite.prepare('SELECT id FROM questionnaire_versions WHERE id=?').get(homeownerDesignV3Questionnaire.id)).toBeUndefined();
    expect(fixture.sqlite.prepare('SELECT id FROM contact_configuration_versions WHERE id=?').get(homeownerDesignV3ContactId)).toBeUndefined();
  });

  it('fails closed for an incompatible modern published pairing before issuing a token', async () => {
    await getCurrentRelease(fixture.d1());
    await publish();
    fixture.sqlite.prepare('UPDATE public_releases SET rule_version_id=? WHERE id=?').run('residential-rules-v3', homeownerDesignV3ReleaseId);
    await expect(getPublicAssessmentConfig({ restrictedAccess: true })).rejects.toThrow('incompatible');
  });

  it.each(['questionnaire', 'rules'] as const)('rejects incompatible %s publication before altering any published state', async kind => {
    await getCurrentRelease(fixture.d1());
    let target: string;
    if (kind === 'rules') {
      await publish();
      target = 'residential-rules-v5';
      fixture.sqlite.prepare("INSERT INTO rule_versions(id,version_number,state,configuration_json,created_by) VALUES(?,5,'draft',?,'synthetic')")
        .run(target, JSON.stringify({ ...initialScoringConfiguration, id: target }));
    } else {
      target = homeownerDesignV3Questionnaire.id;
      fixture.sqlite.prepare("UPDATE public_releases SET rule_version_id='residential-rules-v3' WHERE is_current=1").run();
      fixture.sqlite.prepare("INSERT INTO questionnaire_versions(id,version_number,state,schema_version,document_json,created_by) VALUES(?,8,'draft',11,?,'synthetic')")
        .run(target, JSON.stringify(homeownerDesignV3Questionnaire));
    }
    const before = ['public_releases', 'questionnaire_versions', 'rule_versions', 'audit_events'].map(rows);
    const request = new Request('https://example.test/admin/api/config', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish', kind, versionId: target }) });
    const response = await publishAdminConfiguration(request);
    expect(requireAdminRequest).toHaveBeenCalledWith(request, { csrf: true });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'assessment_release_contract_incompatible' });
    ['public_releases', 'questionnaire_versions', 'rule_versions', 'audit_events'].forEach((table, i) => expect(rows(table)).toEqual(before[i]));
  });
});
