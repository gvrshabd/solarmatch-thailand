'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import type { Locale } from '@/config/i18n';
import { LegalText } from '@/components/content/legal-text';
import { contactLaunchReviewCopy } from '@/config/legal-review';
import { contactReviewCopy } from '@/config/contact-review';
import { track } from '@/lib/analytics/track';
import { currentBrowserCampaign } from '@/lib/analytics/browser-attribution';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { leadSchema, thaiPhonePattern } from '@/lib/validation/lead';

type ContactOutcome = 'submitted' | 'skipped' | 'reviewed';
type Fields = {
  legalFirstName: string;
  legalLastName: string;
  phone: string;
  adultConfirmed: boolean;
  website: string;
};
type FieldErrors = Partial<Record<'legalFirstName' | 'legalLastName' | 'phone' | 'adultConfirmed', string>>;

const initialFields: Fields = {
  legalFirstName: '', legalLastName: '', phone: '', adultConfirmed: false, website: '',
};

function nextIdempotencyKey() {
  return crypto.randomUUID();
}

export function LeadCapture({
  locale = 'th', answers, configuration, active, resetKey, reviewOnly = false, onBack, onContinue, onConfigurationChanged, onProcessingStart, onProcessingFailed,
}: {
  locale?: Locale;
  answers: EstimateAnswers;
  configuration: PublicAssessmentConfig;
  active: boolean;
  resetKey: number;
  reviewOnly?: boolean;
  onBack: () => void;
  onContinue: (outcome: ContactOutcome) => void;
  onConfigurationChanged: (configuration: PublicAssessmentConfig) => void;
  onProcessingStart: () => void;
  onProcessingFailed: () => void;
}) {
  const english = locale === 'en';
  const contact = configuration.contact;
  const [fields, setFields] = useState<Fields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState('');
  const [sending, setSending] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [verificationProof, setVerificationProof] = useState('');
  const [code, setCode] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [otpNotice, setOtpNotice] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(nextIdempotencyKey);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousResetKey = useRef(resetKey);
  const reviewCompletedRef = useRef(false);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setFields(initialFields);
    setErrors({});
    setSubmissionError('');
    setSending(false);
    setChallengeId(''); setVerificationProof(''); setCode(''); setOtpNotice(''); setResendAt(0);
    reviewCompletedRef.current = false;
    setIdempotencyKey(nextIdempotencyKey());
  }, [resetKey]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => headingRef.current?.focus(), 300);
    return () => window.clearTimeout(timer);
  }, [active]);

  function setValue<K extends keyof Fields>(key: K, value: Fields[K]) {
    if (key === 'phone') { setChallengeId(''); setVerificationProof(''); setCode(''); setOtpNotice(''); }
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmissionError('');
  }

  function validate() {
    const next: FieldErrors = {};
    if (!fields.legalFirstName.trim()) next.legalFirstName = english ? 'Enter your first name.' : 'กรุณากรอกชื่อ';
    if (!fields.legalLastName.trim()) next.legalLastName = english ? 'Enter your last name.' : 'กรุณากรอกนามสกุล';
    if (!thaiPhonePattern.test(fields.phone.replace(/[\s()-]/gu, ''))) {
      next.phone = english ? 'Enter a valid Thai mobile number, such as 081 234 5678.' : 'กรอกหมายเลขโทรศัพท์มือถือไทยที่ถูกต้อง เช่น 081 234 5678';
    }
    if (!fields.adultConfirmed) next.adultConfirmed = english ? 'Confirm your age and authority to request contact.' : 'กรุณายืนยันอายุและอำนาจในการขอรับการติดต่อ';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function phoneVerification(verify: boolean) {
    if (reviewOnly || otpBusy || !configuration.assessmentToken || !configuration.liveLeadSubmissions) return;
    if (!thaiPhonePattern.test(fields.phone.replace(/[\s()-]/gu, ''))) {
      setErrors((current) => ({...current,phone:english?'Enter a valid Thai mobile number.':'กรอกหมายเลขโทรศัพท์มือถือไทยที่ถูกต้อง'})); return;
    }
    if (!verify && Date.now() < resendAt) { setOtpNotice(english?'Please wait 60 seconds before requesting another code.':'กรุณารอ 60 วินาทีก่อนขอรหัสใหม่'); return; }
    const phone = fields.phone;
    setOtpBusy(true); setOtpNotice('');
    try {
      const response = await fetch('/api/phone-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,assessmentToken:configuration.assessmentToken,...(verify?{challengeId,code}:{})})});
      const body = await response.json() as {challengeId?:string;proof?:string;code?:string};
      if (!response.ok) { setOtpNotice(english?'The code could not be sent or verified. Check the code, or wait before trying again.':'ไม่สามารถส่งหรือยืนยันรหัสได้ กรุณาตรวจสอบรหัส หรือรอสักครู่แล้วลองอีกครั้ง'); return; }
      if (verify && body.proof) { setVerificationProof(body.proof); setOtpNotice(english?'Phone number verified.':'ยืนยันหมายเลขโทรศัพท์แล้ว'); }
      else if (body.challengeId) { setChallengeId(body.challengeId); setResendAt(Date.now()+60_000); setOtpNotice(english?'Enter the SMS code within 5 minutes.':'กรอกรหัสจาก SMS ภายใน 5 นาที'); }
    } catch { setOtpNotice(english?'Verification is temporarily unavailable.':'ขณะนี้ยังไม่สามารถยืนยันหมายเลขได้'); }
    finally { setOtpBusy(false); }
  }

  function finishReview() {
    if (reviewCompletedRef.current) return;
    reviewCompletedRef.current = true;
    setFields(initialFields);
    setErrors({});
    setSending(true);
    onContinue('reviewed');
  }

  async function submit() {
    if (sending || reviewCompletedRef.current || !validate()) return;
    // A review must never reach token checks, API calls, analytics, or lead storage,
    // even if the real configuration is enabled while the reviewer uses the form.
    if (reviewOnly) { finishReview(); return; }
    if (!configuration.assessmentToken || !configuration.liveLeadSubmissions) {
      setSubmissionError(english ? 'Contact requests are temporarily unavailable. You can still continue to your estimate.' : 'ขณะนี้ยังไม่สามารถส่งคำขอติดต่อได้ คุณยังดูผลประเมินต่อได้');
      return;
    }
    if (!verificationProof) { setSubmissionError(english?'Verify your phone number with the SMS code first.':'กรุณายืนยันหมายเลขโทรศัพท์ด้วยรหัส SMS ก่อน'); return; }
    const payload = {
      attribution: currentBrowserCampaign(configuration.attribution),
      legalFirstName: fields.legalFirstName,
      legalLastName: fields.legalLastName,
      phone: fields.phone,
      contactMethod: 'phone' as const,
      phoneVerificationId: challengeId,
      phoneVerificationProof: verificationProof,
      adultConfirmed: fields.adultConfirmed,
      consent: true as const,
      website: fields.website,
      locale,
      answers,
      assessmentToken: configuration.assessmentToken,
      idempotencyKey,
    };
    const parsed = leadSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmissionError(english ? 'Check the highlighted information and try again.' : 'กรุณาตรวจสอบข้อมูลที่ระบุแล้วลองอีกครั้ง');
      return;
    }
    onProcessingStart();
    setSending(true);
    setSubmissionError('');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        onProcessingFailed();
        const body = await response.json().catch(() => null) as { code?: string } | null;
        if (body?.code==='phone_verification_required') {
          setVerificationProof('');setChallengeId('');setCode('');
          setOtpNotice(english?'Your verification expired. Request a new SMS code.':'การยืนยันหมดอายุแล้ว กรุณาขอรหัส SMS ใหม่');
        }
        if (body?.code === 'assessment_version_expired') {
          const latest = await fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store' });
          if (latest.ok) {
            const latestConfiguration = await latest.json() as PublicAssessmentConfig;
            onConfigurationChanged(latestConfiguration);
            setSubmissionError(english ? 'The contact terms were updated. Return to the quote question and review the current wording.' : 'มีการอัปเดตเงื่อนไขการติดต่อ กรุณาย้อนกลับไปตรวจสอบข้อความล่าสุด');
            setSending(false);
            return;
          }
        }
        setSubmissionError(body?.code === 'rate_limited'
          ? (english ? 'Please wait a minute before trying again.' : 'กรุณารอสักครู่แล้วลองอีกครั้ง')
          : contact.failureBody[locale]);
        setSending(false);
        return;
      }
      track('contact_form_completed', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale, contactMethod: 'phone' });
      setIdempotencyKey(nextIdempotencyKey());
      onContinue('submitted');
    } catch {
      onProcessingFailed();
      setSubmissionError(contact.failureBody[locale]);
      setSending(false);
    }
  }

  if (!reviewOnly && (!contact.enabled || contact.mode === 'disabled')) return null;

  const adultConfirmation = contactLaunchReviewCopy.adultConfirmation[locale];

  return <section hidden={!active} className="contact-form-step" aria-labelledby="contact-form-title" aria-hidden={!active} data-review-only={reviewOnly || undefined}>
    <div className="contact-form-panel">
      <>
        <div className="contact-form-heading">
          <p className="eyebrow">{reviewOnly ? contactReviewCopy.label[locale] : english ? 'Contact details' : 'ข้อมูลติดต่อ'}</p>
          <h1 id="contact-form-title" ref={headingRef} tabIndex={-1}>{english ? 'What number should installers call?' : 'ต้องการให้ผู้ติดตั้งโทรติดต่อที่หมายเลขใด?'}</h1>
          <p>{english ? 'Enter your details and verify your mobile number. Your estimate is already calculated.' : 'กรอกข้อมูลและยืนยันหมายเลขโทรศัพท์มือถือ ผลประเมินของคุณคำนวณไว้แล้ว'}</p>
        </div>
        {reviewOnly && <p className="contact-review-notice" role="status">{contactReviewCopy.notice[locale]}</p>}
        <div className="contact-form-grid">
          <label><span>{english ? 'First name' : 'ชื่อ'}</span>
            <input autoComplete={reviewOnly ? 'off' : 'given-name'} maxLength={80} value={fields.legalFirstName} aria-invalid={Boolean(errors.legalFirstName)} aria-describedby={errors.legalFirstName ? 'contact-first-error' : undefined} onChange={(event) => setValue('legalFirstName', event.target.value)} />
            {errors.legalFirstName && <small id="contact-first-error" className="field-error" role="alert">{errors.legalFirstName}</small>}
          </label>
          <label><span>{english ? 'Last name' : 'นามสกุล'}</span>
            <input autoComplete={reviewOnly ? 'off' : 'family-name'} maxLength={80} value={fields.legalLastName} aria-invalid={Boolean(errors.legalLastName)} aria-describedby={errors.legalLastName ? 'contact-last-error' : undefined} onChange={(event) => setValue('legalLastName', event.target.value)} />
            {errors.legalLastName && <small id="contact-last-error" className="field-error" role="alert">{errors.legalLastName}</small>}
          </label>
          <div className="contact-conditional-field">
            <label><span>{english ? 'Mobile phone number' : 'หมายเลขโทรศัพท์มือถือ'}</span>
              <small>{english ? 'Enter a number solar companies can use to contact you.' : 'กรอกหมายเลขที่บริษัทโซลาร์สามารถใช้ติดต่อคุณได้'}</small>
              <input type="tel" inputMode="tel" autoComplete={reviewOnly ? 'off' : 'tel'} disabled={otpBusy || sending} placeholder="081 234 5678" value={fields.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'contact-phone-error' : undefined} onChange={(event) => setValue('phone', event.target.value)} />
              {errors.phone && <small id="contact-phone-error" className="field-error" role="alert">{errors.phone}</small>}
            </label>
            {reviewOnly ? <p>{english?'SMS verification is previewed here. No code is sent and no number is verified in this review.':'ส่วนนี้เป็นตัวอย่างการยืนยันด้วย SMS การทดสอบนี้จะไม่ส่งรหัสหรือยืนยันหมายเลขจริง'}</p> : <>
              <button type="button" className="button button-secondary" disabled={otpBusy || sending || Boolean(verificationProof)} onClick={() => void phoneVerification(false)}>{english ? (challengeId?'Send another code':'Send SMS code') : (challengeId?'ส่งรหัสอีกครั้ง':'ส่งรหัส SMS')}</button>
              {challengeId && !verificationProof && <label><span>{english?'SMS verification code':'รหัสยืนยันจาก SMS'}</span><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/gu,''))} /><button type="button" className="button button-secondary" disabled={otpBusy || code.length!==6} onClick={() => void phoneVerification(true)}>{english?'Verify number':'ยืนยันหมายเลข'}</button></label>}
              {otpNotice && <p role="status">{otpNotice}</p>}
            </>}
          </div>
        </div>
        <label className="contact-adult-confirmation">
          <input type="checkbox" checked={fields.adultConfirmed} onChange={(event) => setValue('adultConfirmed', event.target.checked)} />
          <span>{adultConfirmation}</span>
        </label>
        {errors.adultConfirmed && <p className="field-error" role="alert">{errors.adultConfirmed}</p>}
        <div className="privacy-inline"><LockKeyhole size={17} aria-hidden="true" /><span><LegalText text={contactLaunchReviewCopy.termsNotice[locale]} locale={locale} openInNewTab /></span></div>
        <input className="website-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={fields.website} onChange={(event) => setValue('website', event.target.value)} />
        {submissionError && <div className="form-error form-error-summary" role="alert"><strong>{contact.failureTitle[locale]}</strong><p>{submissionError}</p></div>}
        <div className="contact-form-actions">
          <button type="button" className="button button-secondary" disabled={sending} onClick={onBack}><ArrowLeft size={18} />{english ? 'Back' : 'ย้อนกลับ'}</button>
          <button type="button" className="button" disabled={sending} onClick={() => void submit()}>{reviewOnly ? contactReviewCopy.finish[locale] : sending ? (english ? 'Sending securely…' : 'กำลังส่งอย่างปลอดภัย…') : submissionError ? (english ? 'Try again' : 'ลองอีกครั้ง') : (english ? 'Submit my request' : 'ส่งคำขอติดต่อ')}<ArrowRight size={18} /></button>
        </div>
        {reviewOnly && <button type="button" className="text-link contact-skip" disabled={sending} onClick={finishReview}>{contactReviewCopy.skip[locale]}</button>}
        {!reviewOnly && <button type="button" className="text-link contact-skip" disabled={sending} onClick={() => onContinue('skipped')}>{english ? 'Continue to my estimate without submitting' : 'ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ'}</button>}
      </>
    </div>
  </section>;
}
