import { verifyPassword } from 'better-auth/crypto';
import { installerAuditActor } from './enquiry-workflow';
import { unlinkLine } from './line-linking';

/** A unique address in the reserved .invalid domain, so nothing can be sent to a deleted account. */
export const deletedInstallerEmail = (userId: string) => `deleted-${userId.replace(/[^a-z0-9-]/gi, '')}@deleted.invalid`;

type Verify = (input: { hash: string; password: string }) => Promise<boolean>;

/**
 * Deletes an installer's sign-in account at their own request (App Store 5.1.1(v), Google Play
 * account deletion). Immediately and in one batch: the password, sessions and recovery tokens are
 * removed, the name and email are erased, the membership ends, and operational records that stored
 * the email are re-labelled with the pseudonymous user ID. The deletion record holds no email.
 *
 * When the requester was the company's last member, the company stops receiving new enquiries and
 * its LINE alerts are disconnected. Company billing records (orders, credit ledger, claims) are not
 * erased here: their retention period, and any refund of unused purchased credits, need the owner's
 * legal and finance decision, so the deletion record is marked for operator review.
 */
export async function deleteInstallerAccount(db: D1Database, user: { id: string; email: string }, password: string, verify: Verify = verifyPassword) {
  const credential = await db.prepare("SELECT password FROM installer_auth_account WHERE userId=? AND providerId='credential' AND password IS NOT NULL")
    .bind(user.id).first<{ password: string }>();
  let valid = false;
  try { valid = !!credential && password.length > 0 && await verify({ hash: credential.password, password }); } catch { valid = false; }
  if (!valid) return { error: 'password_incorrect' } as const;

  const member = await db.prepare('SELECT company_id,role FROM installer_memberships WHERE user_id=?').bind(user.id).first<{ company_id: string; role: string }>();
  const others = member
    ? (await db.prepare('SELECT COUNT(*) AS n FROM installer_memberships WHERE company_id=? AND user_id<>?').bind(member.company_id, user.id).first<{ n: number }>())?.n ?? 0
    : 0;
  const lastMember = !!member && others === 0;
  const pseudonym = installerAuditActor(user.id);
  const now = new Date();
  const at = now.toISOString();
  const id = crypto.randomUUID();
  // LINE alerts belong to the person who linked them. Disconnect before the company loses its last member.
  if (lastMember) await unlinkLine(db, member.company_id, pseudonym);

  await db.batch([
    db.prepare(`INSERT INTO installer_account_deletions(id,user_id,company_id,company_review_required,requested_at)
      VALUES(?,?,?,?,?)`).bind(id, user.id, member?.company_id ?? null, lastMember ? 1 : 0, at),
    ...(lastMember ? [db.prepare('UPDATE solar_company_partners SET paused=1,updated_at=?,updated_by=? WHERE id=?').bind(at, pseudonym, member.company_id)] : []),
    db.prepare('DELETE FROM installer_memberships WHERE user_id=?').bind(user.id),
    db.prepare('DELETE FROM installer_auth_session WHERE userId=?').bind(user.id),
    db.prepare('DELETE FROM installer_auth_account WHERE userId=?').bind(user.id),
    db.prepare('DELETE FROM installer_auth_verification WHERE value=? OR identifier=?').bind(user.id, user.email),
    db.prepare('UPDATE solar_company_partners SET created_by=CASE WHEN created_by=? THEN ? ELSE created_by END,updated_by=CASE WHEN updated_by=? THEN ? ELSE updated_by END WHERE created_by=? OR updated_by=?')
      .bind(user.email, pseudonym, user.email, pseudonym, user.email, user.email),
    db.prepare('UPDATE installer_share_tokens SET created_by=? WHERE created_by=?').bind(pseudonym, user.email),
    db.prepare('UPDATE audit_events SET actor_email=? WHERE actor_email=?').bind(pseudonym, user.email),
    db.prepare("UPDATE installer_auth_user SET name='',email=?,emailVerified=0,image=NULL,updatedAt=? WHERE id=?").bind(deletedInstallerEmail(user.id), now.getTime(), user.id),
    db.prepare(`INSERT INTO audit_events(id,actor_email,action,entity_type,entity_id,next_json,created_at) VALUES(?,?,'installer.account-deleted','installer_platform',?,?,?)`)
      .bind(crypto.randomUUID(), pseudonym, member?.company_id ?? user.id, JSON.stringify({ companyReviewRequired: lastMember }), at),
  ]);
  return { ok: true, companyReviewRequired: lastMember } as const;
}
