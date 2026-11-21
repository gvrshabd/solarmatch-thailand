'use client';

import { useEffect, useRef, type FormEventHandler, type ReactNode } from 'react';
import { CloudOff, LockKeyhole, Mail, RefreshCw } from 'lucide-react';
import { SignalLogo } from './landing';

export type AuthMode = 'login' | 'register' | 'recovery' | 'reset';
type EntryState = 'ready' | 'loading' | 'closed' | 'unavailable' | 'disconnected';

export function InstallerAppEntry({ en, setLanguage, state, advice, children }: {
  en: boolean; setLanguage: (en: boolean) => void; state: EntryState; advice?: string; children?: ReactNode;
}) {
  const t = (th: string, english: string) => en ? english : th;
  const status = {
    loading: [t('กำลังโหลดพื้นที่ทำงาน', 'Loading your workspace'), ''],
    closed: [t('ยังไม่เปิดให้เข้าใช้งาน', 'Installer access is closed'), t('ขณะนี้ยังไม่เปิดให้เข้าสู่ระบบหรือลงทะเบียน กรุณากลับมาตรวจสอบอีกครั้งภายหลัง', 'Sign-in and registration are currently closed. Check again later.')],
    unavailable: [t('พื้นที่ทำงานไม่พร้อมใช้งาน', 'Workspace unavailable'), t('ขณะนี้ระบบไม่พร้อมให้บริการ กรุณาลองอีกครั้ง', 'The installer service is temporarily unavailable. Please try again.')],
    disconnected: [t('เชื่อมต่อไม่สำเร็จ', 'Connection interrupted'), t('ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง', 'Check your internet connection and try again.')],
  };
  const Icon = state === 'closed' ? LockKeyhole : CloudOff;
  return <div className="signal installer-entry" lang={en ? 'en' : 'th'}>
    <a className="sr skip" href="#installer-entry-main">{t('ข้ามไปเนื้อหา', 'Skip to content')}</a>
    <header className="entry-bar">
      <div className="entry-brand"><SignalLogo/><span>SolarMatch</span></div>
      <div className="entry-language" role="group" aria-label={t('ภาษา', 'Language')}>
        <button type="button" lang="th" aria-label="Switch to Thai" aria-pressed={!en} onClick={()=>setLanguage(false)}>ไทย</button>
        <button type="button" lang="en" aria-label="Switch to English" aria-pressed={en} onClick={()=>setLanguage(true)}>EN</button>
      </div>
    </header>
    <main id="installer-entry-main" tabIndex={-1}>
      <div className="entry-cover">
        <h1>{t('พื้นที่ทำงานของผู้ติดตั้ง', 'Installer workspace')}</h1>
      </div>
      <div className="entry-panel">
        {advice && <p role="alert">{advice}</p>}
        {state === 'ready' ? children : <section aria-live="polite" className="entry-state">
          {state !== 'loading' && <Icon aria-hidden="true" size={28}/>}
          <h2>{status[state][0]}</h2>
          {status[state][1] && <p>{status[state][1]}</p>}
          {state !== 'loading' && <button type="button" className="btn primary" onClick={()=>window.location.reload()}>
            <RefreshCw aria-hidden="true" size={18}/>{t('ลองอีกครั้ง', 'Retry')}
          </button>}
        </section>}
      </div>
    </main>
  </div>;
}

export function InstallerAppAuth({ en, mode, sent, error, message, busy, registration, recovery, select, onSubmit }: {
  en: boolean; mode: AuthMode; sent: boolean; error: string; message: string; busy: boolean;
  registration: boolean; recovery: boolean; select: (mode: AuthMode) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  const t = (th: string, english: string) => en ? english : th;
  const title = {login:t('เข้าสู่ระบบ','Sign in'), register:t('สร้างบัญชีบริษัท','Create a company account'), recovery:t('กู้คืนบัญชี','Recover your account'), reset:t('ตั้งรหัสผ่านใหม่','Set a new password')}[mode];
  const intro = {login:t('ใช้อีเมลและรหัสผ่านของบัญชีผู้ติดตั้ง SolarMatch', 'Use the email and password for your SolarMatch installer account.'), register:t('เราจะส่งอีเมลให้คุณยืนยันบัญชีก่อนกรอกข้อมูลบริษัท', 'We’ll email you a verification link before you set up your company.'), recovery:t('กรอกอีเมลที่ใช้สมัครเพื่อรับลิงก์ตั้งรหัสผ่านใหม่', 'Enter your installer email to request a password reset link.'), reset:t('เลือกรหัสผ่านใหม่สำหรับบัญชีของคุณ', 'Choose a new password for your installer account.')}[mode];
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef({ mode, sent });
  useEffect(() => {
    if (previousStep.current.mode !== mode || previousStep.current.sent !== sent) heading.current?.focus();
    previousStep.current = { mode, sent };
  }, [mode, sent]);
  return <section className="entry-auth" id="installer-auth" aria-labelledby="auth-heading">
    {sent && <Mail size={28} aria-hidden="true"/>}
    <h2 ref={heading} id="auth-heading" tabIndex={-1}>{sent ? t('ตรวจสอบอีเมลของคุณ','Check your email') : title}</h2>
    {sent ? <>
      <p role="status">{message}</p>
      <button type="button" className="btn soft" onClick={()=>select('login')}>{t('กลับไปเข้าสู่ระบบ','Back to sign in')}</button>
    </> : <>
      <p>{intro}</p>
      <form key={mode} onSubmit={onSubmit} className="entry-fields">
        {mode === 'register' && <label htmlFor="auth-name">{t('ชื่อผู้ติดต่อ','Your name')}<input className="tx" name="name" id="auth-name" autoComplete="name" maxLength={120} required/></label>}
        {mode !== 'reset' && <label htmlFor="auth-email">{t('อีเมล','Email')}<input className="tx" name="email" id="auth-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} required/></label>}
        {mode !== 'recovery' && <label htmlFor="auth-password">{mode === 'login' ? t('รหัสผ่าน','Password') : t('รหัสผ่าน (อย่างน้อย 12 ตัวอักษร)','Password (at least 12 characters)')}<input className="tx" name="password" id="auth-password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={12} maxLength={128} required/></label>}
        {error && <p className="entry-error" role="alert">{error}</p>}
        {message && !error && <p role="status">{message}</p>}
        <button className="btn primary" disabled={busy}>{busy ? t('กำลังดำเนินการ…','Working…') : mode === 'recovery' ? t('ส่งลิงก์ตั้งรหัสผ่าน','Send reset link') : title}</button>
      </form>
      <div className="entry-links">
        {mode === 'login' ? <>
          {recovery && <button type="button" disabled={busy} onClick={()=>select('recovery')}>{t('ลืมรหัสผ่าน','Forgot password')}</button>}
          {registration && <button type="button" disabled={busy} onClick={()=>select('register')}>{t('สร้างบัญชีบริษัท','Create a company account')}</button>}
        </> : <button type="button" disabled={busy} onClick={()=>select('login')}>{t('กลับไปเข้าสู่ระบบ','Back to sign in')}</button>}
      </div>
    </>}
  </section>;
}
