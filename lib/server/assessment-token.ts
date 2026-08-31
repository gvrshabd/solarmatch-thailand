import { decodeBase64Url, encodeBase64Url, hmacSha256, constantTimeEqual } from './crypto';
import { getRuntimeEnv } from './runtime';

export type AssessmentTokenPayload = {
  releaseId: string;
  questionnaireVersionId: string;
  ruleVersionId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export async function createAssessmentToken(payload: Omit<AssessmentTokenPayload, 'issuedAt' | 'expiresAt' | 'nonce'>) {
  const secret = getRuntimeEnv().ASSESSMENT_SIGNING_SECRET;
  if (!secret) return null;
  const issuedAt = Date.now();
  const complete: AssessmentTokenPayload = {
    ...payload,
    issuedAt,
    expiresAt: issuedAt + 2 * 60 * 60 * 1000,
    nonce: crypto.randomUUID(),
  };
  const encoded = encodeBase64Url(JSON.stringify(complete));
  const signature = encodeBase64Url(await hmacSha256(encoded, secret));
  return { token: `${encoded}.${signature}`, expiresAt: new Date(complete.expiresAt).toISOString() };
}

export async function verifyAssessmentToken(token: string): Promise<AssessmentTokenPayload | null> {
  const secret = getRuntimeEnv().ASSESSMENT_SIGNING_SECRET;
  if (!secret) return null;
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  const expected = encodeBase64Url(await hmacSha256(encoded, secret));
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(decodeBase64Url(encoded)) as AssessmentTokenPayload;
    if (!payload.releaseId || !payload.questionnaireVersionId || !payload.ruleVersionId) return null;
    if (!Number.isFinite(payload.issuedAt) || !Number.isFinite(payload.expiresAt)) return null;
    if (payload.issuedAt > Date.now() + 60_000 || payload.expiresAt < Date.now()) return null;
    if (payload.expiresAt - payload.issuedAt > 2 * 60 * 60 * 1000 + 60_000) return null;
    return payload;
  } catch {
    return null;
  }
}
