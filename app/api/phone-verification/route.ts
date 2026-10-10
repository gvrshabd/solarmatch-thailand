import { NextRequest, NextResponse } from 'next/server';
import { verifyAssessmentToken } from '@/lib/server/assessment-token';
import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { assertPlatformRequest } from '@/lib/installer/platform';
import { getPlatformSettings } from '@/lib/installer/settings';
import {trustedShareAddress} from '@/lib/installer/rate-limit';
import { sendMessage } from '@/lib/installer/providers/sms';
import { allowPhoneAttempt, phoneChallengeSchema, phoneVerifySchema, PHONE_CODE_TTL_MS, PHONE_RESEND_MS, randomPhoneCode, phoneCodeHash, verificationBindings, verifyPhoneCode, limitedJsonBody, RequestTooLarge } from '@/lib/installer/phone-verification';

export const dynamic = 'force-dynamic';
const reply = (body: object, status = 200) => NextResponse.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

export async function POST(request: NextRequest) {
  try {
    const platform = assertPlatformRequest(request);
    const mode=platform.mode==='local-test'?'local-test':'sandbox';
    if (request.headers.get('origin') !== request.nextUrl.origin) return reply({ok:false,code:'invalid_origin'},403);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ok:false,code:'invalid_content_type'},415);
    let raw: unknown;
    try { raw = await limitedJsonBody(request,8192); } catch(error) { return error instanceof RequestTooLarge?reply({ok:false,code:'request_too_large'},413):reply({ok:false,code:'invalid_json'},400); }
    const verifying = Boolean(raw && typeof raw === 'object' && 'code' in raw);
    const parsed = (verifying ? phoneVerifySchema : phoneChallengeSchema).safeParse(raw);
    if (!parsed.success) return reply({ok:false,code:'invalid_submission'},400);
    const token = await verifyAssessmentToken(parsed.data.assessmentToken);
    if (!token) return reply({ok:false,code:'invalid_assessment_session'},403);
    const database = requireDatabase();
    if (!(await getPlatformSettings(database)).collectionEnabled) return reply({ok:false,code:'verification_unavailable'},503);
    const address = trustedShareAddress(request);
    if (!await allowPhoneAttempt(database,address,parsed.data.phone,verifying?'verify':'send')) return reply({ok:false,code:'rate_limited'},429);
    if (verifying) {
      const data = phoneVerifySchema.parse(raw);
      const proof = await verifyPhoneCode(database,data.challengeId,data.phone,data.assessmentToken,data.code);
      return proof ? reply({ok:true,proof}) : reply({ok:false,code:'invalid_or_expired_code'},400);
    }
    const binding = await verificationBindings(parsed.data.phone,parsed.data.assessmentToken);
    const now = new Date();
    const id = crypto.randomUUID();
    const code = randomPhoneCode();
    const inserted = await database.prepare(`INSERT INTO installer_phone_challenges(id,phone_hash,phone_e164,code_hash,session_hash,created_at,expires_at,resend_after,mode,send_state)
      SELECT ?,?,?,?,?,?,?,?,?, 'pending' WHERE NOT EXISTS(SELECT 1 FROM installer_phone_challenges WHERE phone_hash=? AND resend_after>?) RETURNING id`)
      .bind(id,binding.phoneHash,parsed.data.phone,await phoneCodeHash(id,code),binding.sessionHash,now.toISOString(),new Date(now.getTime()+PHONE_CODE_TTL_MS).toISOString(),new Date(now.getTime()+PHONE_RESEND_MS).toISOString(),platform.mode,binding.phoneHash,now.toISOString()).first();
    if (!inserted) return reply({ok:false,code:'resend_cooldown'},429);
    const env = getRuntimeEnv() as unknown as Record<string,string>;
    try {
      const result = await sendMessage({to:parsed.data.phone,body:`SolarMatch: ${code} คือรหัสยืนยันของคุณ ใช้ได้ 5 นาที / Your verification code expires in 5 minutes.`,idempotencyKey:id},{mode,outboundEnabled:env.OUTBOUND_MESSAGES_ENABLED==='true',accountSid:env.SMS_ACCOUNT_SID,authToken:env.SMS_AUTH_TOKEN,credentialsAreTest:env.SMS_CREDENTIALS_ARE_TEST==='true'});
      const statements = [database.prepare("UPDATE installer_phone_challenges SET send_state='accepted' WHERE id=?").bind(id)];
      if (result.captured) statements.push(database.prepare('INSERT INTO installer_test_messages(id,channel,recipient,body,created_at) VALUES(?,?,?,?,?)').bind(id,'sms',result.captured.to,result.captured.body,now.toISOString()));
      await database.batch(statements);
    } catch {
      await database.prepare("UPDATE installer_phone_challenges SET send_state='failed' WHERE id=?").bind(id).run();
      return reply({ok:false,code:'verification_unavailable'},503);
    }
    return reply({ok:true,challengeId:id,expiresInSeconds:300,resendAfterSeconds:60},201);
  } catch { return reply({ok:false,code:'verification_unavailable'},503); }
}
