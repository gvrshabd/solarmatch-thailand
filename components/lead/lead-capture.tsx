'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';
import { track } from '@/lib/analytics/track';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { leadSchema, thaiPhonePattern } from '@/lib/validation/lead';

type ContactOutcome = 'submitted' | 'skipped';
type Fields = {
  legalFirstName: string;
  legalLastName: string;
  phone: string;
  contactMethod: '' | 'phone' | 'line';
  lineId: string;
  adultConfirmed: boolean;
  website: string;
};
type FieldErrors = Partial<Record<'legalFirstName' | 'legalLastName' | 'phone' | 'contactMethod' | 'lineId' | 'adultConfirmed', string>>;

const initialFields: Fields = {
  legalFirstName: '', legalLastName: '', phone: '', contactMethod: '', lineId: '', adultConfirmed: false, website: '',
};

function nextIdempotencyKey() {
  return crypto.randomUUID();
}

export function LeadCapture({
  locale = 'th', answers, configuration, active, resetKey, onBack, onContinue, onConfigurationChanged,
}: {
  locale?: Locale;
  answers: EstimateAnswers;
  configuration: PublicAssessmentConfig;
  active: boolean;
  resetKey: number;
  onBack: () => void;
  onContinue: (outcome: ContactOutcome) => void;
  onConfigurationChanged: (configuration: PublicAssessmentConfig) => void;
}) {
  const english = locale === 'en';
  const contact = configuration.contact;
  const [fields, setFields] = useState<Fields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState('');
  const [sending, setSending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(nextIdempotencyKey);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousResetKey = useRef(resetKey);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setFields(initialFields);
    setErrors({});
    setSubmissionError('');
    setIdempotencyKey(nextIdempotencyKey());
  }, [resetKey]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => headingRef.current?.focus(), 300);
    return () => window.clearTimeout(timer);
  }, [active]);

  function setValue<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmissionError('');
  }

  function chooseMethod(method: 'phone' | 'line') {
    setFields((current) => ({ ...current, contactMethod: method, phone: method === 'phone' ? current.phone : '', lineId: method === 'line' ? current.lineId : '' }));
    setErrors((current) => ({ ...current, contactMethod: undefined, phone: undefined, lineId: undefined }));
    setSubmissionError('');
  }

  function validate() {
    const next: FieldErrors = {};
    if (!fields.legalFirstName.trim()) next.legalFirstName = english ? 'Enter your first name.' : 'กรุณากรอกชื่อ';
    if (!fields.legalLastName.trim()) next.legalLastName = english ? 'Enter your last name.' : 'กรุณากรอกนามสกุล';
    if (!fields.contactMethod) next.contactMethod = english ? 'Choose phone or LINE.' : 'เลือกช่องทางติดต่อทางโทรศัพท์หรือ LINE';
    if (fields.contactMethod === 'phone' && !thaiPhonePattern.test(fields.phone.replace(/[\s()-]/gu, ''))) {
      next.phone = english ? 'Enter a valid Thai mobile number, such as 081 234 5678.' : 'กรอกหมายเลขโทรศัพท์มือถือไทยที่ถูกต้อง เช่น 081 234 5678';
    }
    if (fields.contactMethod === 'line' && fields.lineId.trim().length < 2) {
      next.lineId = english ? 'Enter your LINE ID or choose phone instead.' : 'กรอก LINE ID หรือเลือกให้ติดต่อทางโทรศัพท์';
    }
    if (!fields.adultConfirmed) next.adultConfirmed = english ? 'Confirm your age and authority to request contact.' : 'กรุณายืนยันอายุและอำนาจในการขอรับการติดต่อ';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit() {
    if (sending || !validate()) return;
    if (!configuration.assessmentToken || !configuration.liveLeadSubmissions || !fields.contactMethod) {
      setSubmissionError(english ? 'Contact requests are temporarily unavailable. You can still continue to your estimate.' : 'ขณะนี้ยังไม่สามารถส่งคำขอติดต่อได้ คุณยังดูผลประเมินต่อได้');
      return;
    }
    const payload = {
      legalFirstName: fields.legalFirstName,
      legalLastName: fields.legalLastName,
      phone: fields.contactMethod === 'phone' ? fields.phone : undefined,
      contactMethod: fields.contactMethod,
      lineId: fields.contactMethod === 'line' ? fields.lineId : undefined,
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
    setSending(true);
    setSubmissionError('');
    try {
      const response = await fetch('/api/leads', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
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
      track('contact_form_completed', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale, contactMethod: fields.contactMethod });
      setIdempotencyKey(nextIdempotencyKey());
      onContinue('submitted');
    } catch {
      setSubmissionError(contact.failureBody[locale]);
      setSending(false);
    }
  }

  if (!contact.enabled || contact.mode === 'disabled') return null;

  const adultConfirmation = answers.ownershipStatus === 'owner'
    ? (english
      ? 'I confirm that I am at least 20 years old and that I own this property.'
      : 'ฉันยืนยันว่ามีอายุอย่างน้อย 20 ปี และเป็นเจ้าของอสังหาริมทรัพย์นี้')
    : (english
      ? 'I confirm that I am at least 20 years old and have the property owner’s permission to request contact about solar for this property.'
      : 'ฉันยืนยันว่ามีอายุอย่างน้อย 20 ปี และได้รับอนุญาตจากเจ้าของอสังหาริมทรัพย์ให้ขอรับการติดต่อเกี่ยวกับโซลาร์สำหรับอสังหาริมทรัพย์นี้');

  return <section hidden={!active} className="contact-form-step" aria-labelledby="contact-form-title" aria-hidden={!active}>
    <div className="contact-form-panel">
      <>
        <div className="contact-form-heading">
          <p className="eyebrow">{english ? 'Contact details' : 'ข้อมูลติดต่อ'}</p>
          <h1 id="contact-form-title" ref={headingRef} tabIndex={-1}>{english ? 'Where should installers contact you?' : 'ต้องการให้ผู้ติดตั้งติดต่อคุณผ่านช่องทางใด?'}</h1>
          <p>{english ? 'Complete the details below in one step. Your estimate is already calculated.' : 'กรอกข้อมูลด้านล่างในขั้นตอนเดียว ผลประเมินของคุณคำนวณไว้แล้ว'}</p>
        </div>
        <div className="contact-form-grid">
          <label><span>{english ? 'First name' : 'ชื่อ'}</span>
            <input autoComplete="given-name" maxLength={80} value={fields.legalFirstName} aria-invalid={Boolean(errors.legalFirstName)} aria-describedby={errors.legalFirstName ? 'contact-first-error' : undefined} onChange={(event) => setValue('legalFirstName', event.target.value)} />
            {errors.legalFirstName && <small id="contact-first-error" className="field-error" role="alert">{errors.legalFirstName}</small>}
          </label>
          <label><span>{english ? 'Last name' : 'นามสกุล'}</span>
            <input autoComplete="family-name" maxLength={80} value={fields.legalLastName} aria-invalid={Boolean(errors.legalLastName)} aria-describedby={errors.legalLastName ? 'contact-last-error' : undefined} onChange={(event) => setValue('legalLastName', event.target.value)} />
            {errors.legalLastName && <small id="contact-last-error" className="field-error" role="alert">{errors.legalLastName}</small>}
          </label>
          <fieldset className="contact-method-field">
            <legend>{english ? 'Preferred contact method' : 'ช่องทางที่สะดวกให้ติดต่อ'}</legend>
            <div className="contact-method-options">
              <label><input type="radio" name="contact-method" checked={fields.contactMethod === 'phone'} onChange={() => chooseMethod('phone')} /><span>{english ? 'Phone' : 'โทรศัพท์'}</span></label>
              <label><input type="radio" name="contact-method" checked={fields.contactMethod === 'line'} onChange={() => chooseMethod('line')} /><span>LINE</span></label>
            </div>
            {errors.contactMethod && <small className="field-error" role="alert">{errors.contactMethod}</small>}
          </fieldset>
          <div className="contact-conditional-field">
            {!fields.contactMethod && <p>{english ? 'Choose a contact method to continue.' : 'เลือกช่องทางที่สะดวกให้ติดต่อ'}</p>}
            {fields.contactMethod === 'phone' && <label><span>{english ? 'Mobile phone number' : 'หมายเลขโทรศัพท์มือถือ'}</span>
              <small>{english ? 'Enter a number solar companies can use to contact you.' : 'กรอกหมายเลขที่บริษัทโซลาร์สามารถใช้ติดต่อคุณได้'}</small>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="081 234 5678" value={fields.phone} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'contact-phone-error' : undefined} onChange={(event) => setValue('phone', event.target.value)} />
              {errors.phone && <small id="contact-phone-error" className="field-error" role="alert">{errors.phone}</small>}
            </label>}
            {fields.contactMethod === 'line' && <label><span>LINE ID</span>
              <small>{english ? 'Enter your LINE ID, not your display name. Make sure people can add you by ID.' : 'กรอก LINE ID ไม่ใช่ชื่อที่แสดง และตรวจสอบว่าเปิดให้ผู้อื่นเพิ่มเพื่อนด้วย ID ได้'}</small>
              <input autoComplete="off" maxLength={80} value={fields.lineId} aria-invalid={Boolean(errors.lineId)} aria-describedby={errors.lineId ? 'contact-line-error' : undefined} onChange={(event) => setValue('lineId', event.target.value)} />
              {errors.lineId && <small id="contact-line-error" className="field-error" role="alert">{errors.lineId}</small>}
            </label>}
          </div>
        </div>
        <label className="contact-adult-confirmation">
          <input type="checkbox" checked={fields.adultConfirmed} onChange={(event) => setValue('adultConfirmed', event.target.checked)} />
          <span>{adultConfirmation}</span>
        </label>
        {errors.adultConfirmed && <p className="field-error" role="alert">{errors.adultConfirmed}</p>}
        <div className="privacy-inline"><LockKeyhole size={17} aria-hidden="true" /><span>{english ? 'Your request is stored securely under the ' : 'คำขอของคุณจะจัดเก็บอย่างปลอดภัยตาม '}<Link href={localizedPath('/privacy', locale)} target="_blank" rel="noopener">{english ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว'}</Link></span></div>
        <input className="website-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={fields.website} onChange={(event) => setValue('website', event.target.value)} />
        {submissionError && <div className="form-error form-error-summary" role="alert"><strong>{contact.failureTitle[locale]}</strong><p>{submissionError}</p></div>}
        <div className="contact-form-actions">
          <button type="button" className="button button-secondary" disabled={sending} onClick={onBack}><ArrowLeft size={18} />{english ? 'Back' : 'ย้อนกลับ'}</button>
          <button type="button" className="button" disabled={sending} onClick={() => void submit()}>{sending ? (english ? 'Sending securely…' : 'กำลังส่งอย่างปลอดภัย…') : submissionError ? (english ? 'Try again' : 'ลองอีกครั้ง') : (english ? 'Submit my request' : 'ส่งคำขอติดต่อ')}<ArrowRight size={18} /></button>
        </div>
        {submissionError && <button type="button" className="text-link contact-skip" disabled={sending} onClick={() => onContinue('skipped')}>{english ? 'Continue to my estimate without submitting' : 'ดูผลประเมินต่อโดยไม่ส่งข้อมูลติดต่อ'}</button>}
      </>
    </div>
  </section>;
}
