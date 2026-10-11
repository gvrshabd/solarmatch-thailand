import { z } from 'zod';
import { constantTimeEqual, encodeBase64Url, hmacSha256, sha256 } from '@/lib/server/crypto';
import { getRuntimeEnv } from '@/lib/server/runtime';
import { normalizeThaiPhone, thaiPhonePattern } from '@/lib/validation/lead';

export const PHONE_CODE_TTL_MS = 300_000;
export const PHONE_RESEND_MS = 60_000;
export const PHONE_MAX_ATTEMPTS = 5;
export class RequestTooLarge extends Error {}
export async function limitedJsonBody(request:Request,maximumBytes:number):Promise<unknown> {
  if (Number(request.headers.get('content-length')??0)>maximumBytes) throw new RequestTooLarge();
  const reader=request.body?.getReader();
  if (!reader) throw new SyntaxError('Missing body');
  const chunks:Uint8Array[]=[];
  let size=0;
  while (true) {
    const {done,value}=await reader.read();
    if (done) break;
    size+=value.byteLength;
    if (size>maximumBytes) {await reader.cancel();throw new RequestTooLarge();}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size);
  let offset=0;
  for (const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
export const phoneChallengeSchema = z.object({
  phone: z.string().max(40).refine((value) => thaiPhonePattern.test(value.replace(/[\s()-]/gu, ''))).transform(normalizeThaiPhone),
  assessmentToken: z.string().min(40).max(4096),
}).strict();
export const phoneVerifySchema = phoneChallengeSchema.extend({ challengeId: z.string().uuid(), code: z.string().regex(/^\d{6}$/u) });

function secret() {
  const value = (getRuntimeEnv() as unknown as Record<string, unknown>).PHONE_VERIFICATION_SECRET;
  if (typeof value !== 'string' || value.length < 32) throw new Error('Phone verification is unavailable.');
  return value;
}

export function randomPhoneCode() {
  // Rejection sampling avoids modulo bias.
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 4_294_000_000);
  return String(value[0] % 1_000_000).padStart(6, '0');
}
export async function phoneCodeHash(id: string, code: string) {
  return encodeBase64Url(await hmacSha256(`otp:${id}:${code}`, secret()));
}
export async function phoneHash(phone: string) {
  return encodeBase64Url(await hmacSha256(`phone:${normalizeThaiPhone(phone)}`, secret()));
}
export async function verificationBindings(phone: string, assessmentToken: string) {
  return { phoneHash: await phoneHash(phone), sessionHash: await sha256(assessmentToken) };
}
export async function allowPhoneAttempt(database: D1Database, address: string, phone: string, kind: 'send' | 'verify') {
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString();
  const keys = await Promise.all([sha256(`otp:${kind}:ip:${address}`), phoneHash(phone).then((value) => sha256(`otp:${kind}:phone:${value}`))]);
  const results = await database.batch(keys.map((key) => database.prepare(`INSERT INTO public_request_limits(key_hash,window_start,request_count) VALUES(?,?,1)
    ON CONFLICT(key_hash,window_start) DO UPDATE SET request_count=request_count+1 RETURNING request_count`).bind(key, windowStart)));
  return results.every((result) => Number((result.results[0] as {request_count?:number})?.request_count ?? 999) <= (kind === 'send' ? 5 : 25));
}

export async function verifyPhoneCode(database: D1Database, challengeId: string, phone: string, assessmentToken: string, code: string) {
  const bindings = await verificationBindings(phone, assessmentToken);
  const now = new Date().toISOString();
  // Atomically charge the attempt before comparing a secret; parallel requests cannot bypass the cap.
  const challenge = await database.prepare(`UPDATE installer_phone_challenges SET attempts=attempts+1
    WHERE id=? AND phone_hash=? AND session_hash=? AND expires_at>? AND attempts<? AND verified_at IS NULL AND consumed_at IS NULL AND send_state='accepted'
    RETURNING code_hash,attempts`).bind(challengeId, bindings.phoneHash, bindings.sessionHash, now, PHONE_MAX_ATTEMPTS).first<{code_hash:string;attempts:number}>();
  if (!challenge || !constantTimeEqual(challenge.code_hash, await phoneCodeHash(challengeId, code))) return null;
  const proof = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const proofHash = await sha256(proof);
  const won = await database.prepare(`UPDATE installer_phone_challenges SET verified_at=?,proof_hash=?
    WHERE id=? AND verified_at IS NULL AND consumed_at IS NULL AND expires_at>? RETURNING id`).bind(now, proofHash, challengeId, now).first();
  return won ? proof : null;
}

export async function phoneProof(database: D1Database, id: string, proof: string, phone: string, assessmentToken: string) {
  const bindings = await verificationBindings(phone, assessmentToken);
  const proofHash = await sha256(proof);
  const row = await database.prepare(`SELECT verified_at,mode FROM installer_phone_challenges WHERE id=? AND proof_hash=? AND phone_hash=? AND session_hash=?
    AND verified_at IS NOT NULL AND consumed_at IS NULL AND expires_at>?`).bind(id, proofHash, bindings.phoneHash, bindings.sessionHash, new Date().toISOString()).first<{verified_at:string;mode:string}>();
  return row ? { ...bindings, proofHash, verifiedAt: row.verified_at, mode: row.mode } : null;
}
