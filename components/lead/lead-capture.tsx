'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';
import { track } from '@/lib/analytics/track';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { leadSchema, thaiPhonePattern } from '@/lib/validation/lead';

type ContactOutcome = 'declined' | 'submitted' | 'skipped';
type ContactField = 'firstName' | 'lastName' | 'phone' | 'method' | 'lineId' | 'adult' | 'consent';

type Fields = {
  legalFirstName: string;
  legalLastName: string;
  phone: string;
  contactMethod: '' | 'phone' | 'line';
  lineId: string;
  adultConfirmed: boolean;
  consent: boolean;
  website: string;
};

const initialFields: Fields = {
  legalFirstName: '', legalLastName: '', phone: '', contactMethod: '', lineId: '', adultConfirmed: false, consent: false, website: '',
};

function nextIdempotencyKey() {
  return crypto.randomUUID();
}

export function LeadCapture({
  locale = 'th', answers, configuration, onContinue, onConfigurationChanged, reconsider = false,
}: {
  locale?: Locale;
  answers: EstimateAnswers;
  configuration: PublicAssessmentConfig;
  onContinue: (outcome: ContactOutcome) => void;
  onConfigurationChanged: (configuration: PublicAssessmentConfig) => void;
  reconsider?: boolean;
}) {
  const english = locale === 'en';
  const contact = configuration.contact;
  const [decision, setDecision] = useState<'yes' | 'declined' | null>(reconsider ? 'yes' : null);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [fields, setFields] = useState<Fields>(initialFields);
  const [error, setError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [configurationNotice, setConfigurationNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(nextIdempotencyKey);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const methodHeadingRef = useRef<HTMLSpanElement>(null);
  const viewedRef = useRef(false);

  const fieldOrder = useMemo<ContactField[]>(() => fields.contactMethod === 'line'
    ? ['firstName', 'lastName', 'phone', 'method', 'lineId', 'adult', 'consent']
    : ['firstName', 'lastName', 'phone', 'method', 'adult', 'consent'], [fields.contactMethod]);
  const currentField = fieldOrder[Math.min(fieldIndex, fieldOrder.length - 1)];

  useEffect(() => {
    if (viewedRef.current || !contact.enabled || contact.mode === 'disabled') return;
    viewedRef.current = true;
    track('contact_interest_question_viewed', { mode: contact.mode, language: locale });
  }, [contact.enabled, contact.mode, locale]);
  useEffect(() => { (currentField === 'method' ? methodHeadingRef.current : headingRef.current)?.focus(); }, [decision, currentField]);

  if (!contact.enabled || contact.mode === 'disabled') return null;

  function chooseYes() {
    setDecision('yes');
    setFieldIndex(0);
    setError('');
    track('contact_interest_yes', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale });
    track('contact_form_started', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale });
  }

  function chooseNo() {
    track('contact_interest_no', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale });
    setDecision('declined');
  }

  function skip() {
    track('contact_form_skipped', { mode: contact.mode as Exclude<typeof contact.mode, 'disabled'>, language: locale });
    onContinue('skipped');
  }

  function setValue<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function validateCurrent() {
    if (currentField === 'firstName' && !fields.legalFirstName.trim()) return english ? 'Enter your legal first name.' : 'กรุณากรอกชื่อจริง';
    if (currentField === 'lastName' && !fields.legalLastName.trim()) return english ? 'Enter your legal last name.' : 'กรุณากรอกนามสกุล';
    if (currentField === 'phone') {
      const compact = fields.phone.replace(/[\s()-]/gu, '');
      if (!thaiPhonePattern.test(compact)) return english ? 'Enter a valid Thai mobile number, such as 081 234 5678.' : 'กรอกหมายเลขโทรศัพท์มือถือไทยที่ถูกต้อง เช่น 081 234 5678';
    }
    if (currentField === 'method' && !fields.contactMethod) return english ? 'Choose phone or LINE.' : 'เลือกช่องทางติดต่อทางโทรศัพท์หรือ LINE';
    if (currentField === 'lineId' && fields.lineId.trim().length < 2) return english ? 'Enter your LINE ID or choose phone instead.' : 'กรอก LINE ID หรือเลือกให้ติดต่อทางโทรศัพท์';
    if (currentField === 'adult' && !fields.adultConfirmed) return english ? 'Confirm your age and authority to request contact.' : 'กรุณายืนยันอายุและอำนาจในการขอรับการติดต่อ';
    if (currentField === 'consent' && !fields.consent) return english ? 'Confirm your consent before submitting.' : 'กรุณายืนยันความยินยอมก่อนส่งคำขอ';
    return '';
  }

  function advance() {
    const issue = validateCurrent();
    if (issue) { setError(issue); return; }
    setFieldIndex((value) => Math.min(value + 1, fieldOrder.length - 1));
  }

  async function submit() {
    const issue = validateCurrent();
    if (issue) { setError(issue); return; }
    if (!configuration.assessmentToken || !configuration.liveLeadSubmissions || !fields.contactMethod) {
      setSubmissionError(english ? 'Contact requests are temporarily unavailable. You can continue to your result.' : 'ขณะนี้ยังไม่สามารถส่งคำขอติดต่อได้ คุณยังดูผลประเมินต่อได้');
      return;
    }
    const payload = {
      legalFirstName: fields.legalFirstName,
      legalLastName: fields.legalLastName,
      phone: fields.phone,
      contactMethod: fields.contactMethod,
      lineId: fields.contactMethod === 'line' ? fields.lineId : undefined,
      adultConfirmed: fields.adultConfirmed,
      consent: fields.consent,
      website: fields.website,
      locale,
      answers,
      assessmentToken: configuration.assessmentToken,
      idempotencyKey,
    };
    const parsed = leadSchema.safeParse(payload);
    if (!parsed.success) {
      setSubmissionError(english ? 'Check the highlighted information and try again.' : 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง');
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
            try { sessionStorage.setItem('solarmatch:assessment-context', JSON.stringify(latestConfiguration)); } catch { /* Current page still receives the fresh configuration. */ }
            onConfigurationChanged(latestConfiguration);
            setDecision(null);
            setFieldIndex(0);
            setFields(initialFields);
            setConfigurationNotice(english ? 'The contact terms were updated. Please review the current wording before choosing again.' : 'มีการอัปเดตเงื่อนไขการติดต่อ กรุณาตรวจสอบข้อความล่าสุดก่อนเลือกอีกครั้ง');
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

  if (!decision) return (
      <section className="site-shell contact-journey-card" aria-labelledby="contact-interest-title">
        <p className="eyebrow">{english ? 'Optional next step' : 'ขั้นตอนถัดไป (ไม่บังคับ)'}</p>
        <h1 id="contact-interest-title" ref={headingRef} tabIndex={-1}>{contact.question?.[locale]}</h1>
        <p>{contact.help?.[locale]}</p>
        {configurationNotice && <p className="contact-configuration-notice" role="status">{configurationNotice}</p>}
        {contact.mode === 'named_installer_handoff' && contact.recipient && <p className="recipient-disclosure"><strong>{english ? 'Named recipient:' : 'ผู้รับข้อมูลที่ระบุ:'}</strong> {contact.recipient.name[locale]}</p>}
        <div className="lead-decision-actions">
          <button type="button" className="button" onClick={chooseYes}>{contact.yesLabel?.[locale]}</button>
          <button type="button" className="button button-secondary" onClick={chooseNo}>{contact.noLabel?.[locale]}</button>
        </div>
        <p className="contact-optional-note">{english ? 'Contact details are optional and are not needed to receive your result.' : 'ข้อมูลติดต่อเป็นทางเลือก และไม่จำเป็นต้องกรอกเพื่อดูผลประเมิน'}</p>
      </section>
  );

  if (decision === 'declined') return (
    <section className="site-shell contact-journey-card" aria-labelledby="contact-decline-title">
      <p className="eyebrow">{english ? 'Optional next step' : 'ขั้นตอนถัดไป (ไม่บังคับ)'}</p>
      <h1 id="contact-decline-title" ref={headingRef} tabIndex={-1}>{contact.declineTitle[locale]}</h1>
      <p>{contact.declineBody[locale]}</p>
      <div className="lead-decision-actions">
        <button type="button" className="button" onClick={() => onContinue('declined')}>{contact.declineContinueLabel[locale]}<ArrowRight size={18} /></button>
        <button type="button" className="button button-secondary" onClick={() => setDecision(null)}><ArrowLeft size={18} />{english ? 'Back' : 'ย้อนกลับ'}</button>
      </div>
    </section>
  );

  const progress = `${fieldIndex + 1} / ${fieldOrder.length}`;
  return (
      <section className="site-shell contact-journey-card" aria-labelledby="contact-field-title">
        <div className="contact-progress"><span>{english ? 'Optional contact details' : 'ข้อมูลติดต่อ (ไม่บังคับ)'}</span><span>{progress}</span></div>
        {currentField === 'firstName' && <label className="contact-single-field"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>{english ? 'What is your legal first name?' : 'ชื่อจริงของคุณคืออะไร?'}</h1><span>{english ? 'Enter your first name as it appears on official documents.' : 'กรอกชื่อจริงตามเอกสารทางการ'}</span><input autoFocus autoComplete="given-name" maxLength={80} value={fields.legalFirstName} onChange={(event) => setValue('legalFirstName', event.target.value)} /></label>}
        {currentField === 'lastName' && <label className="contact-single-field"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>{english ? 'What is your legal last name?' : 'นามสกุลของคุณคืออะไร?'}</h1><span>{english ? 'Enter your family name as it appears on official documents.' : 'กรอกนามสกุลตามเอกสารทางการ'}</span><input autoFocus autoComplete="family-name" maxLength={80} value={fields.legalLastName} onChange={(event) => setValue('legalLastName', event.target.value)} /></label>}
        {currentField === 'phone' && <label className="contact-single-field"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>{english ? 'What Thai mobile number should be used?' : 'ต้องการให้ติดต่อที่หมายเลขโทรศัพท์มือถือใด?'}</h1><span>{english ? 'Use a Thai mobile number, such as 081 234 5678.' : 'กรอกหมายเลขโทรศัพท์มือถือไทย เช่น 081 234 5678'}</span><input autoFocus inputMode="tel" autoComplete="tel" placeholder="081 234 5678" value={fields.phone} onChange={(event) => setValue('phone', event.target.value)} /></label>}
        {currentField === 'method' && <fieldset className="contact-choice-field"><legend><span id="contact-field-title" ref={methodHeadingRef} tabIndex={-1}>{english ? 'How would you prefer to be contacted?' : 'สะดวกให้ติดต่อผ่านช่องทางใด?'}</span></legend>{contact.permittedContactMethods.map((method) => <label key={method}><input type="radio" name="contact-method" checked={fields.contactMethod === method} onChange={() => { setFields((current) => ({ ...current, contactMethod: method, lineId: method === 'line' ? current.lineId : '' })); setError(''); }} /><span>{method === 'phone' ? (english ? 'Phone' : 'โทรศัพท์') : 'LINE'}</span></label>)}</fieldset>}
        {currentField === 'lineId' && <label className="contact-single-field"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>LINE ID</h1><span>{contact.mode === 'shared_solar_company_handoff' ? (english ? 'Enter the LINE ID you would like the solar companies to use.' : 'กรอก LINE ID ที่ต้องการให้บริษัทโซลาร์ใช้ติดต่อ') : (english ? 'Enter the LINE ID you would like us to use.' : 'กรอก LINE ID ที่ต้องการให้ใช้ติดต่อ')}</span><input autoFocus autoComplete="off" maxLength={80} value={fields.lineId} onChange={(event) => setValue('lineId', event.target.value)} /></label>}
        {currentField === 'adult' && <div className="contact-consent-review"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>{english ? 'Confirm your age and authority' : 'ยืนยันอายุและอำนาจ'}</h1><label className="consent-check"><input type="checkbox" checked={fields.adultConfirmed} onChange={(event) => setValue('adultConfirmed', event.target.checked)} /><span>{contact.adultConfirmation?.[locale]}</span></label></div>}
        {currentField === 'consent' && <div className="contact-consent-review"><h1 id="contact-field-title" ref={headingRef} tabIndex={-1}>{english ? 'Review and consent' : 'ตรวจสอบและให้ความยินยอม'}</h1>{(contact.mode === 'named_installer_handoff' || contact.mode === 'shared_solar_company_handoff') && <div><strong>{english ? 'Information covered by this consent' : 'ข้อมูลที่อยู่ภายใต้ความยินยอมนี้'}</strong><ul>{contact.sharedFields.map((field) => <li key={field}>{field}</li>)}</ul></div>}<label className="consent-check"><input type="checkbox" checked={fields.consent} onChange={(event) => setValue('consent', event.target.checked)} /><span><strong>{contact.consent?.[locale]}</strong></span></label>{contact.recipient && <a href={contact.recipient.privacyUrl} target="_blank" rel="noopener noreferrer">{english ? `Read ${contact.recipient.name.en}’s Privacy Notice` : `อ่านประกาศความเป็นส่วนตัวของ ${contact.recipient.name.th}`}</a>}<div className="privacy-inline"><LockKeyhole size={17} aria-hidden="true" /><span>{english ? 'Read the ' : 'อ่าน '}<Link href={localizedPath('/privacy', locale)}>{english ? 'SolarMatch Privacy Notice' : 'ประกาศความเป็นส่วนตัวของ SolarMatch'}</Link></span></div></div>}
        {error && <p className="field-error" role="alert">{error}</p>}
        {submissionError && <div className="form-error form-error-summary" role="alert"><strong>{contact.failureTitle[locale]}</strong><p>{submissionError}</p></div>}
        <div className="contact-step-actions">
          <button type="button" className="button button-secondary" onClick={() => fieldIndex > 0 ? setFieldIndex((value) => value - 1) : setDecision(null)}><ArrowLeft size={18} />{english ? 'Back' : 'ย้อนกลับ'}</button>
          {currentField === 'consent' ? <button type="button" className="button" disabled={sending} onClick={() => void submit()}>{sending ? (english ? 'Sending securely…' : 'กำลังส่งอย่างปลอดภัย…') : (english ? 'Submit my request' : 'ส่งคำขอติดต่อ')}<ArrowRight size={18} /></button> : <button type="button" className="button" onClick={advance}>{english ? 'Continue' : 'ถัดไป'}<ArrowRight size={18} /></button>}
        </div>
        <button type="button" className="text-link contact-skip" onClick={skip}>{contact.skipLabel[locale]}</button>
      </section>
  );
}
