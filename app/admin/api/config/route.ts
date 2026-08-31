import { NextResponse } from 'next/server';
import { z } from 'zod';
import { validateScoringConfiguration } from '@/lib/qualification/scoring';
import type { QuestionnaireDocument } from '@/lib/questionnaire/types';
import { questionnaireDocumentSchema, scoringConfigurationSchema } from '@/lib/questionnaire/validation';
import { isAdminError, requireAdminRequest } from '@/lib/server/admin-api';
import { auditStatement } from '@/lib/server/audit';
import { ensureInitialRelease } from '@/lib/server/releases';
import { requireDatabase } from '@/lib/server/runtime';

export const dynamic = 'force-dynamic';

const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save-questionnaire-draft'), document: questionnaireDocumentSchema }),
  z.object({ action: z.literal('save-rules-draft'), configuration: scoringConfigurationSchema }),
  z.object({ action: z.literal('publish'), kind: z.enum(['questionnaire', 'rules']), versionId: z.string().min(1).max(100) }),
  z.object({ action: z.literal('restore'), kind: z.enum(['questionnaire', 'rules']), versionId: z.string().min(1).max(100) }),
]);

async function insertQuestionRows(database: D1Database, versionId: string, document: QuestionnaireDocument) {
  const statements: D1PreparedStatement[] = [];
  document.questions.forEach((question, index) => {
    const questionId = `${versionId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionId, versionId, question.id, index, question.type, question.required ? 1 : 0,
        question.title.en, question.title.th, question.help.en, question.help.th,
        question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => statements.push(database.prepare(`INSERT INTO assessment_options
      (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(`${questionId}:${option.value}`, questionId, option.value, optionIndex, option.label.en, option.label.th,
        option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0)));
  });
  if (statements.length) await database.batch(statements);
}

export async function GET(request: Request) {
  const identity = await requireAdminRequest(request);
  if (isAdminError(identity)) return identity;
  const database = requireDatabase();
  await ensureInitialRelease(database);
  const questionnaires = await database.prepare('SELECT id, version_number, state, document_json, created_by, created_at, published_at, restored_from_id FROM questionnaire_versions ORDER BY version_number DESC LIMIT 30').all();
  const rules = await database.prepare('SELECT id, version_number, state, configuration_json, created_by, created_at, published_at, restored_from_id FROM rule_versions ORDER BY version_number DESC LIMIT 30').all();
  const release = await database.prepare('SELECT * FROM public_releases WHERE is_current = 1 LIMIT 1').first();
  const audit = await database.prepare('SELECT id, actor_email, action, entity_type, entity_id, created_at FROM audit_events ORDER BY created_at DESC LIMIT 50').all();
  return NextResponse.json({
    questionnaires: questionnaires.results.map((row) => ({ ...row, document: JSON.parse(String(row.document_json)) })),
    rules: rules.results.map((row) => ({ ...row, configuration: JSON.parse(String(row.configuration_json)) })),
    release,
    audit: audit.results,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const identity = await requireAdminRequest(request, { csrf: true });
  if (isAdminError(identity)) return identity;
  let body: z.infer<typeof requestSchema>;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_configuration', issues: parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) }, { status: 400 });
    body = parsed.data;
  } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  const database = requireDatabase();
  await ensureInitialRelease(database);

  if (body.action === 'save-questionnaire-draft') {
    const current = await database.prepare('SELECT COALESCE(MAX(version_number), 0) AS value FROM questionnaire_versions').first<{ value: number }>();
    const version = (current?.value ?? 0) + 1;
    const versionId = `residential-questionnaire-v${version}`;
    const document = { ...body.document, id: versionId };
    await database.batch([
      database.prepare("UPDATE questionnaire_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare("INSERT INTO questionnaire_versions (id, version_number, state, schema_version, document_json, created_by) VALUES (?, ?, 'draft', 4, ?, ?)").bind(versionId, version, JSON.stringify(document), identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'questionnaire.draft-created', entityType: 'questionnaire-version', entityId: versionId, next: document }),
    ]);
    await insertQuestionRows(database, versionId, document);
    return NextResponse.json({ ok: true, versionId });
  }

  if (body.action === 'save-rules-draft') {
    const errors = validateScoringConfiguration(body.configuration);
    if (errors.length) return NextResponse.json({ error: 'invalid_scoring_configuration', issues: errors }, { status: 400 });
    const current = await database.prepare('SELECT COALESCE(MAX(version_number), 0) AS value FROM rule_versions').first<{ value: number }>();
    const version = (current?.value ?? 0) + 1;
    const versionId = `residential-rules-v${version}`;
    const configuration = { ...body.configuration, id: versionId };
    await database.batch([
      database.prepare("UPDATE rule_versions SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'"),
      database.prepare("INSERT INTO rule_versions (id, version_number, state, configuration_json, created_by) VALUES (?, ?, 'draft', ?, ?)").bind(versionId, version, JSON.stringify(configuration), identity.email),
      auditStatement(database, { actorEmail: identity.email, action: 'rules.draft-created', entityType: 'rule-version', entityId: versionId, next: configuration }),
    ]);
    return NextResponse.json({ ok: true, versionId });
  }

  const table = body.kind === 'questionnaire' ? 'questionnaire_versions' : 'rule_versions';
  const jsonColumn = body.kind === 'questionnaire' ? 'document_json' : 'configuration_json';
  const target = await database.prepare(`SELECT id, state, ${jsonColumn} AS value_json FROM ${table} WHERE id = ? LIMIT 1`).bind(body.versionId).first<{ id: string; state: string; value_json: string }>();
  if (!target) return NextResponse.json({ error: 'version_not_found' }, { status: 404 });

  if (body.action === 'restore') {
    const current = await database.prepare(`SELECT COALESCE(MAX(version_number), 0) AS value FROM ${table}`).first<{ value: number }>();
    const version = (current?.value ?? 0) + 1;
    const prefix = body.kind === 'questionnaire' ? 'residential-questionnaire-v' : 'residential-rules-v';
    const restoredId = `${prefix}${version}`;
    const value = JSON.parse(target.value_json) as Record<string, unknown>;
    value.id = restoredId;
    const schemaColumn = body.kind === 'questionnaire' ? ', schema_version' : '';
    const schemaValue = body.kind === 'questionnaire' ? ', 4' : '';
    await database.batch([
      database.prepare(`UPDATE ${table} SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'draft'`),
      database.prepare(`INSERT INTO ${table} (id, version_number, state, ${jsonColumn}, created_by, restored_from_id${schemaColumn}) VALUES (?, ?, 'draft', ?, ?, ?${schemaValue})`).bind(restoredId, version, JSON.stringify(value), identity.email, target.id),
      auditStatement(database, { actorEmail: identity.email, action: `${body.kind}.restored-to-draft`, entityType: `${body.kind}-version`, entityId: restoredId, previous: { source: target.id }, next: value }),
    ]);
    if (body.kind === 'questionnaire') await insertQuestionRows(database, restoredId, value as unknown as QuestionnaireDocument);
    return NextResponse.json({ ok: true, versionId: restoredId });
  }

  if (target.state !== 'draft') return NextResponse.json({ error: 'only_drafts_can_be_published' }, { status: 409 });
  if (body.kind === 'questionnaire') {
    const validated = questionnaireDocumentSchema.safeParse(JSON.parse(target.value_json));
    if (!validated.success) return NextResponse.json({ error: 'invalid_questionnaire' }, { status: 400 });
  } else {
    const validated = scoringConfigurationSchema.safeParse(JSON.parse(target.value_json));
    if (!validated.success || validateScoringConfiguration(validated.data).length) return NextResponse.json({ error: 'invalid_rules' }, { status: 400 });
  }
  const release = await database.prepare('SELECT * FROM public_releases WHERE is_current = 1 LIMIT 1').first<Record<string, unknown>>();
  if (!release) return NextResponse.json({ error: 'release_not_found' }, { status: 500 });
  const nextReleaseNumber = Number(release.release_number) + 1;
  const nextReleaseId = `residential-release-v${nextReleaseNumber}`;
  const questionnaireVersionId = body.kind === 'questionnaire' ? body.versionId : String(release.questionnaire_version_id);
  const ruleVersionId = body.kind === 'rules' ? body.versionId : String(release.rule_version_id);
  await database.batch([
    database.prepare(`UPDATE ${table} SET state = 'archived', archived_at = CURRENT_TIMESTAMP WHERE state = 'published' AND id <> ?`).bind(body.versionId),
    database.prepare(`UPDATE ${table} SET state = 'published', published_by = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(identity.email, body.versionId),
    database.prepare('UPDATE public_releases SET is_current = 0 WHERE is_current = 1'),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, receiving_company_en, receiving_company_th, receiving_company_privacy_url,
       retention_days, created_by, published_by, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(nextReleaseId, nextReleaseNumber, questionnaireVersionId, ruleVersionId, release.content_version_id,
        release.legal_document_version_id, release.live_lead_submissions, release.receiving_company_en,
        release.receiving_company_th, release.receiving_company_privacy_url, release.retention_days,
        identity.email, identity.email),
    auditStatement(database, { actorEmail: identity.email, action: `${body.kind}.published`, entityType: 'public-release', entityId: nextReleaseId, previous: { releaseId: release.id }, next: { questionnaireVersionId, ruleVersionId } }),
  ]);
  return NextResponse.json({ ok: true, releaseId: nextReleaseId });
}
