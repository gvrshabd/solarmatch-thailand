import { initialQuestionnaire } from '@/config/assessment';
import { initialScoringConfiguration, type ScoringConfiguration } from '@/lib/qualification/scoring';
import type { PublicAssessmentConfig, QuestionnaireDocument } from '@/lib/questionnaire/types';
import { createAssessmentToken } from './assessment-token';
import { requireDatabase } from './runtime';

const seedActor = 'system:initial-migration';
const questionnaireId = initialQuestionnaire.id;
const rulesId = initialScoringConfiguration.id;
const contentId = 'residential-content-v1';
const legalId = 'legal-placeholder-v1';
const releaseId = 'residential-release-v1';

export const initialPublicContent = {
  contactQuestion: {
    en: 'Would you like a solar company to contact you to arrange a site assessment?',
    th: 'ต้องการให้บริษัทโซลาร์ติดต่อเพื่อนัดประเมินหรือสำรวจหน้างานไหม?',
  },
  contactHelp: {
    en: 'If you choose yes, we will show exactly which company may receive your details before you submit them.',
    th: 'หากเลือกว่าต้องการติดต่อ เราจะแจ้งชื่อบริษัทที่จะได้รับข้อมูลของคุณอย่างชัดเจนก่อนส่งแบบฟอร์ม',
  },
  contactYes: { en: 'Yes, I would like to be contacted', th: 'ต้องการให้ติดต่อ' },
  contactNo: { en: 'Not right now', th: 'ยังไม่ต้องการตอนนี้' },
  declineTitle: { en: 'Your results remain available', th: 'คุณยังดูผลประเมินต่อได้' },
  declineBody: {
    en: 'You do not need to provide personal information. You can review the guide or change your mind later.',
    th: 'คุณไม่จำเป็นต้องให้ข้อมูลส่วนบุคคล สามารถอ่านคู่มือเพิ่มเติมหรือกลับมาเลือกให้ติดต่อภายหลังได้',
  },
  submitLabel: { en: 'Request a site assessment', th: 'ขอให้ติดต่อเพื่อนัดประเมินหน้างาน' },
  successTitle: { en: 'Your request has been received', th: 'ได้รับคำขอของคุณแล้ว' },
  successBody: {
    en: 'The named solar company may contact you using your selected method. Your assessment results remain available on this device.',
    th: 'บริษัทโซลาร์ที่ระบุอาจติดต่อคุณผ่านช่องทางที่เลือก โดยผลประเมินยังคงแสดงอยู่บนอุปกรณ์นี้',
  },
};

type ReleaseRow = {
  release_id: string;
  questionnaire_version_id: string;
  rule_version_id: string;
  questionnaire_json: string;
  rules_json: string;
  live_lead_submissions: number;
  receiving_company_en: string | null;
  receiving_company_th: string | null;
  receiving_company_privacy_url: string | null;
  retention_days: number | null;
  legal_complete: number;
};

export async function ensureInitialRelease(database = requireDatabase()) {
  const existing = await database.prepare('SELECT id FROM public_releases LIMIT 1').first<{ id: string }>();
  if (existing) return;

  const statements: D1PreparedStatement[] = [
    database.prepare(`INSERT INTO questionnaire_versions
      (id, version_number, state, schema_version, document_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', 4, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(questionnaireId, JSON.stringify(initialQuestionnaire), seedActor, seedActor),
    database.prepare(`INSERT INTO rule_versions
      (id, version_number, state, configuration_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(rulesId, JSON.stringify(initialScoringConfiguration), seedActor, seedActor),
    database.prepare(`INSERT INTO content_versions
      (id, version_number, state, content_json, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(contentId, JSON.stringify(initialPublicContent), seedActor, seedActor),
    database.prepare(`INSERT INTO legal_document_versions
      (id, version_number, state, documents_json, is_complete, created_by, published_by, published_at)
      VALUES (?, 1, 'published', ?, 0, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(legalId, JSON.stringify({ operator: null, privacyContact: null, privacy: null, terms: null }), seedActor, seedActor),
    database.prepare(`INSERT INTO public_releases
      (id, release_number, questionnaire_version_id, rule_version_id, content_version_id, legal_document_version_id,
       live_lead_submissions, is_current, created_by, published_by, published_at)
      VALUES (?, 1, ?, ?, ?, ?, 0, 1, ?, ?, CURRENT_TIMESTAMP)`)
      .bind(releaseId, questionnaireId, rulesId, contentId, legalId, seedActor, seedActor),
  ];

  initialQuestionnaire.questions.forEach((question, questionIndex) => {
    const questionRowId = `${questionnaireId}:${question.id}`;
    statements.push(database.prepare(`INSERT INTO assessment_questions
      (id, questionnaire_version_id, question_key, display_order, question_type, required, title_en, title_th, help_en, help_th, conditional_json, relevance_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(questionRowId, questionnaireId, question.id, questionIndex, question.type, question.required ? 1 : 0,
        question.title.en, question.title.th, question.help.en, question.help.th,
        question.conditionalFields ? JSON.stringify(question.conditionalFields) : null, JSON.stringify(question.relevance)));
    question.options?.forEach((option, optionIndex) => {
      statements.push(database.prepare(`INSERT INTO assessment_options
        (id, question_id, option_value, display_order, label_en, label_th, description_en, description_th, exclusive)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(`${questionRowId}:${option.value}`, questionRowId, option.value, optionIndex,
          option.label.en, option.label.th, option.description?.en ?? null, option.description?.th ?? null, option.exclusive ? 1 : 0));
    });
  });

  const factorMaximums: Record<string, number> = {
    ownership: 10, 'air-conditioners': 18, 'monthly-bill': 15, 'daytime-use': 12, 'daytime-loads': 5,
    'roof-area': 10, shade: 10, 'roof-material': 5, 'property-type': 5, location: 5, timeframe: 5,
  };
  Object.entries(factorMaximums).forEach(([key, maximum]) => {
    statements.push(database.prepare(`INSERT INTO scoring_rules
      (id, rule_version_id, factor_key, maximum_points, configuration_json) VALUES (?, ?, ?, ?, ?)`)
      .bind(`${rulesId}:${key}`, rulesId, key, maximum, JSON.stringify({ implementation: 'residential-rules-v1', factor: key })));
  });
  statements.push(
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'ownership-status', 'equals', ?)`)
      .bind(`${rulesId}:ownership-status`, rulesId, JSON.stringify('owner')),
    database.prepare(`INSERT INTO qualification_rules
      (id, rule_version_id, rule_key, operator, expected_value_json) VALUES (?, ?, 'air-conditioner-count', 'greater-than-or-equal', ?)`)
      .bind(`${rulesId}:air-conditioner-count`, rulesId, JSON.stringify(4)),
  );
  await database.batch(statements);
}

export async function getCurrentRelease(database = requireDatabase()) {
  await ensureInitialRelease(database);
  return database.prepare(`SELECT
      r.id AS release_id, r.questionnaire_version_id, r.rule_version_id,
      q.document_json AS questionnaire_json, rv.configuration_json AS rules_json,
      r.live_lead_submissions, r.receiving_company_en, r.receiving_company_th,
      r.receiving_company_privacy_url, r.retention_days, l.is_complete AS legal_complete
    FROM public_releases r
    JOIN questionnaire_versions q ON q.id = r.questionnaire_version_id
    JOIN rule_versions rv ON rv.id = r.rule_version_id
    JOIN legal_document_versions l ON l.id = r.legal_document_version_id
    WHERE r.is_current = 1 AND q.state = 'published' AND rv.state = 'published' AND l.state = 'published'
    LIMIT 1`).first<ReleaseRow>();
}

export async function getPublicAssessmentConfig(): Promise<PublicAssessmentConfig> {
  const release = await getCurrentRelease();
  if (!release) throw new Error('No published SolarMatch release is available.');
  const liveLeadSubmissions = Boolean(release.live_lead_submissions && release.legal_complete && release.receiving_company_en && release.receiving_company_th && release.receiving_company_privacy_url && release.retention_days);
  const token = liveLeadSubmissions
    ? await createAssessmentToken({
      releaseId: release.release_id,
      questionnaireVersionId: release.questionnaire_version_id,
      ruleVersionId: release.rule_version_id,
    })
    : null;
  return {
    releaseId: release.release_id,
    questionnaireVersionId: release.questionnaire_version_id,
    ruleVersionId: release.rule_version_id,
    questionnaire: JSON.parse(release.questionnaire_json) as QuestionnaireDocument,
    assessmentToken: token?.token ?? null,
    assessmentTokenExpiresAt: token?.expiresAt ?? null,
    liveLeadSubmissions,
    receivingCompany: release.receiving_company_en && release.receiving_company_th
      ? { en: release.receiving_company_en, th: release.receiving_company_th }
      : null,
  };
}

export function parseScoringConfiguration(row: Pick<ReleaseRow, 'rules_json'>) {
  return JSON.parse(row.rules_json) as ScoringConfiguration;
}
