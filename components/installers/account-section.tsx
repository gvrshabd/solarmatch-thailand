'use client';
import { useState } from 'react';
import { LogOut, Trash2 } from 'lucide-react';

export type DeleteAccountResult = { ok: true } | { ok: false; message: string };

/**
 * Sign-out and self-service account deletion, reachable from the Company screen and the account
 * menu (App Store 5.1.1(v), Google Play account deletion). Thai copy is a draft for native review.
 */
export function InstallerAccountSection({ en, email, hasCompany, busy, onSignOut, onDelete }: {
  en: boolean; email: string; hasCompany: boolean; busy: boolean;
  onSignOut: () => void; onDelete: (password: string) => Promise<DeleteAccountResult>;
}) {
  const t = (th: string, english: string) => en ? english : th;
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const disabled = busy || working;
  return <section className="card account-section" id="installer-account" aria-labelledby="installer-account-heading">
    <h2 className="h3" id="installer-account-heading">{t('บัญชีของคุณ', 'Your account')}</h2>
    <p className="muted">{t('เข้าสู่ระบบด้วย', 'Signed in as')} <b className="account-email">{email}</b></p>
    <button type="button" className="btn ghost" disabled={disabled} onClick={onSignOut}><LogOut size={18} aria-hidden="true"/>{t('ออกจากระบบ', 'Sign out')}</button>
    <details className="disc account-delete">
      <summary><Trash2 className="i" aria-hidden="true"/><span>{t('ลบบัญชี', 'Delete account')}</span></summary>
      <div className="in">
        <p>{t('การลบบัญชีจะลบชื่อ อีเมล และรหัสผ่านของคุณทันที คุณจะออกจากระบบในทุกอุปกรณ์และเข้าสู่ระบบด้วยบัญชีนี้อีกไม่ได้ การลบนี้ย้อนกลับไม่ได้',
          'Deleting your account erases your name, email and password straight away. You’ll be signed out on every device and can’t sign in with this account again. This can’t be undone.')}</p>
        {hasCompany && <p>{t('หากคุณเป็นสมาชิกคนสุดท้ายของบริษัท บริษัทจะหยุดรับคำขอใหม่และยกเลิกการแจ้งเตือน LINE ทีม SolarMatch จะตรวจสอบเครดิตที่ซื้อแล้วแต่ยังไม่ได้ใช้ ประวัติการซื้อ การใช้เครดิต และคำร้องของบริษัทจะเก็บไว้ตามที่กฎหมายและบัญชีกำหนด หากยังมีสมาชิกคนอื่น บริษัทจะใช้งานต่อได้ตามปกติ',
          'If you’re your company’s last member, the company stops receiving new enquiries and its LINE alerts are disconnected. SolarMatch will review any purchased credits that haven’t been used. The company’s purchase, credit and claim records are kept where law and accounting require. If other members remain, the company carries on as normal.')}</p>}
        <form className="form" onSubmit={async event => {
          event.preventDefault();
          if (disabled) return;
          if (!password) { setError(t('ใส่รหัสผ่านปัจจุบันเพื่อยืนยัน', 'Enter your current password to confirm.')); return; }
          setWorking(true); setError('');
          const result = await onDelete(password);
          setWorking(false);
          if (!result.ok) setError(result.message);
        }}>
          <div className="field"><label htmlFor="delete-account-password">{t('รหัสผ่านปัจจุบัน', 'Current password')}</label>
            <input className="tx" id="delete-account-password" type="password" autoComplete="current-password" autoCapitalize="none" spellCheck={false} maxLength={128} value={password} disabled={disabled} onChange={event => setPassword(event.target.value)}/></div>
          {error && <p className="notice" role="alert">{error}</p>}
          <button type="submit" className="btn danger" disabled={disabled}>{working ? t('กำลังลบบัญชี…', 'Deleting your account…') : t('ลบบัญชีถาวร', 'Delete my account permanently')}</button>
        </form>
      </div>
    </details>
  </section>;
}
