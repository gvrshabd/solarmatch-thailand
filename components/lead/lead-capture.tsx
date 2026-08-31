'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import Link from '@/components/site/internal-link';
import { assessmentContextStorageKey } from '@/components/estimate/estimate-shell';
import { localizedPath, type Locale } from '@/config/i18n';
import type { EstimateAnswers } from '@/lib/calculator/types';
import type { PublicAssessmentConfig } from '@/lib/questionnaire/types';
import { leadSchema } from '@/lib/validation/lead';
import { track } from '@/lib/analytics/track';

type Fields = {
  legalFirstName: string;
  legalLastName: string;
  phone: string;
  contactMethod: 'phone' | 'line';
  lineId?: string;
  website?: string;
  consent: boolean;
};

function readContext() {
  try { return JSON.parse(sessionStorage.getItem(assessmentContextStorageKey) ?? 'null') as PublicAssessmentConfig | null; } catch { return null; }
}

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export function LeadCapture({ locale = 'th', answers }: { locale?: Locale; answers: EstimateAnswers }) {
  const english = locale === 'en';
  const [decision, setDecision] = useState<'yes' | 'no' | null>(null);
  const [configuration, setConfiguration] = useState<PublicAssessmentConfig | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [method, setMethod] = useState<'phone' | 'line'>('phone');
  const [submissionError, setSubmissionError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const successRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, setFocus, formState: { errors } } = useForm<Fields>({
    defaultValues: { contactMethod: 'phone', consent: false, website: '' },
  });

  useEffect(() => {
    queueMicrotask(() => setIdempotencyKey(newIdempotencyKey()));
    const stored = readContext();
    if (stored) queueMicrotask(() => setConfiguration(stored));
    fetch('/api/assessment/config', { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<PublicAssessmentConfig> : Promise.reject(new Error('unavailable')))
      .then((next) => {
        setConfiguration(next);
        try { sessionStorage.setItem(assessmentContextStorageKey, JSON.stringify(next)); } catch { /* Submission still works for this view. */ }
      })
      .catch(() => { /* Stored configuration, if present, remains authoritative for this browser session. */ });
  }, []);

  useEffect(() => {
    if (state === 'sent') successRef.current?.focus();
  }, [state]);

  async function submit(raw: Fields) {
    if (!configuration?.assessmentToken || !configuration.receivingCompany || !configuration.liveLeadSubmissions) {
      setSubmissionError(english ? 'Site-assessment requests are temporarily unavailable.' : 'ขณะนี้ยังไม่สามารถส่งคำขอนัดประเมินหน้างานได้');
      return;
    }
    const payload = {
      ...raw,
      locale,
      answers,
      assessmentToken: configuration.assessmentToken,
      idempotencyKey,
    };
    const parsed = leadSchema.safeParse(payload);
    if (!parsed.success) {
      let firstField: keyof Fields | null = null;
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof Fields;
        if (!['legalFirstName', 'legalLastName', 'phone', 'lineId', 'consent'].includes(field)) return;
        firstField ??= field;
        const messages: Record<string, { en: string; th: string }> = {
          legalFirstName: { en: 'Enter your legal first name.', th: 'กรอกชื่อตามเอกสารทางราชการ' },
          legalLastName: { en: 'Enter your legal last name.', th: 'กรอกนามสกุลตามเอกสารทางราชการ' },
          phone: { en: 'Enter a valid Thai phone number.', th: 'กรอกเบอร์โทรศัพท์ไทยให้ถูกต้อง' },
          lineId: { en: 'Enter your LINE ID.', th: 'กรอก LINE ID' },
          consent: { en: 'Confirm your consent before submitting.', th: 'กรุณายืนยันความยินยอมก่อนส่งคำขอ' },
        };
        setError(field, { message: messages[field]?.[locale] ?? (english ? 'Check this field.' : 'ตรวจสอบข้อมูลในช่องนี้') });
      });
      if (firstField) queueMicrotask(() => setFocus(firstField!));
      return;
    }

    setState('sending');
    setSubmissionError('');
    track('lead_form_submitted', { contactMethod: parsed.data.contactMethod });
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { code?: string } | null;
        if (body?.code === 'assessment_version_expired' || body?.code === 'invalid_assessment_session') {
          setSubmissionError(english ? 'Your secure assessment session expired. Refresh this page and try once more.' : 'เซสชันแบบประเมินหมดอายุ กรุณารีเฟรชหน้าแล้วลองอีกครั้ง');
        } else if (body?.code === 'rate_limited') {
          setSubmissionError(english ? 'Please wait a minute before trying again.' : 'กรุณารอสักครู่แล้วลองอีกครั้ง');
        } else {
          setSubmissionError(english ? 'We could not save your request. Your details were not accepted; please try again.' : 'ยังไม่สามารถบันทึกคำขอได้ ระบบยังไม่ได้รับข้อมูลของคุณ กรุณาลองอีกครั้ง');
        }
        setState('failed');
        return;
      }
      setState('sent');
      setIdempotencyKey(newIdempotencyKey());
    } catch {
      setState('failed');
      setSubmissionError(english ? 'The connection was interrupted. Please try again.' : 'การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง');
    }
  }

  if (!configuration?.liveLeadSubmissions || !configuration.receivingCompany) {
    return <section className="lead-panel lead-unavailable" aria-labelledby="lead-title"><div className="lead-copy"><p className="eyebrow">{english ? 'Site assessment' : 'การประเมินหน้างาน'}</p><h2 id="lead-title">{english ? 'Contact requests are temporarily unavailable' : 'ขณะนี้ยังไม่เปิดรับคำขอติดต่อ'}</h2><p>{english ? 'Your estimate remains available without entering personal information. You can continue with the solar guide or return later.' : 'คุณยังดูผลประเมินได้โดยไม่ต้องกรอกข้อมูลส่วนบุคคล และสามารถอ่านคู่มือโซลาร์หรือกลับมาใหม่ภายหลังได้'}</p><Link className="text-link" href={localizedPath('/solar-guide', locale)}>{english ? 'Continue to the solar guide' : 'อ่านคู่มือโซลาร์ต่อ'} <ArrowRight size={18} /></Link></div></section>;
  }

  if (state === 'sent') return <div className="lead-success" role="status" aria-live="polite" tabIndex={-1} ref={successRef}><strong>{english ? 'Your request has been received' : 'ได้รับคำขอของคุณแล้ว'}</strong><p>{english ? `${configuration.receivingCompany.en} may contact you using your selected method. Your estimate remains available on this device.` : `${configuration.receivingCompany.th} อาจติดต่อคุณผ่านช่องทางที่เลือก โดยผลประเมินยังคงแสดงอยู่บนอุปกรณ์นี้`}</p></div>;

  return <section className="lead-panel" aria-labelledby="lead-title">
    <div className="lead-copy">
      <p className="eyebrow">{english ? 'Optional next step' : 'ขั้นตอนถัดไป (ไม่บังคับ)'}</p>
      <h2 id="lead-title">{english ? 'Would you like a solar company to contact you to arrange a site assessment?' : 'ต้องการให้บริษัทโซลาร์ติดต่อเพื่อนัดประเมินหรือสำรวจหน้างานไหม?'}</h2>
      <p>{english ? 'Your results are already available. Choose yes only if you would like the named company to contact you.' : 'คุณดูผลประเมินได้แล้ว เลือก “ต้องการให้ติดต่อ” เฉพาะเมื่อคุณต้องการให้บริษัทที่ระบุติดต่อกลับ'}</p>
      <div className="lead-decision-actions"><button type="button" className={`button ${decision === 'yes' ? '' : 'button-secondary'}`} onClick={() => setDecision('yes')}>{english ? 'Yes, I would like to be contacted' : 'ต้องการให้ติดต่อ'}</button><button type="button" className={`button ${decision === 'no' ? '' : 'button-secondary'}`} onClick={() => setDecision('no')}>{english ? 'Not right now' : 'ยังไม่ต้องการตอนนี้'}</button></div>
    </div>

    {decision === 'no' && <div className="lead-decline" role="status"><strong>{english ? 'Your results remain available' : 'คุณยังดูผลประเมินต่อได้'}</strong><p>{english ? 'You do not need to provide personal information. You can review the guide or change your mind later.' : 'คุณไม่จำเป็นต้องให้ข้อมูลส่วนบุคคล สามารถอ่านคู่มือเพิ่มเติมหรือกลับมาเลือกให้ติดต่อภายหลังได้'}</p><button type="button" className="text-link" onClick={() => setDecision('yes')}>{english ? 'I would like to reconsider' : 'เปลี่ยนใจและขอให้ติดต่อ'}</button></div>}

    {decision === 'yes' && <form className="lead-form" noValidate onSubmit={handleSubmit(submit)}>
      <div className="form-grid">
        <label htmlFor="lead-first-name">{english ? 'Legal first name' : 'ชื่อตามเอกสารทางราชการ'}<span aria-hidden="true">*</span><input id="lead-first-name" autoComplete="given-name" required aria-invalid={Boolean(errors.legalFirstName)} aria-describedby={errors.legalFirstName ? 'lead-first-name-error' : undefined} {...register('legalFirstName')} />{errors.legalFirstName && <small className="field-error" id="lead-first-name-error">{errors.legalFirstName.message}</small>}</label>
        <label htmlFor="lead-last-name">{english ? 'Legal last name' : 'นามสกุลตามเอกสารทางราชการ'}<span aria-hidden="true">*</span><input id="lead-last-name" autoComplete="family-name" required aria-invalid={Boolean(errors.legalLastName)} aria-describedby={errors.legalLastName ? 'lead-last-name-error' : undefined} {...register('legalLastName')} />{errors.legalLastName && <small className="field-error" id="lead-last-name-error">{errors.legalLastName.message}</small>}</label>
        <label htmlFor="lead-phone">{english ? 'Thai phone number' : 'เบอร์โทรศัพท์ไทย'}<span aria-hidden="true">*</span><input id="lead-phone" inputMode="tel" autoComplete="tel" placeholder="08X XXX XXXX" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'lead-phone-error' : undefined} {...register('phone')} />{errors.phone && <small className="field-error" id="lead-phone-error">{errors.phone.message}</small>}</label>
        <label htmlFor="lead-method">{english ? 'Preferred contact method' : 'ช่องทางที่สะดวกให้ติดต่อ'}<span aria-hidden="true">*</span><select id="lead-method" required {...register('contactMethod', { onChange: (event) => setMethod(event.target.value as 'phone' | 'line') })}><option value="phone">{english ? 'Phone' : 'โทรศัพท์'}</option><option value="line">LINE</option></select></label>
        {method === 'line' && <label htmlFor="lead-line">LINE ID<span aria-hidden="true">*</span><input id="lead-line" autoComplete="off" required aria-invalid={Boolean(errors.lineId)} aria-describedby={errors.lineId ? 'lead-line-error' : undefined} {...register('lineId')} />{errors.lineId && <small className="field-error" id="lead-line-error">{errors.lineId.message}</small>}</label>}
        <label className="honeypot-field" aria-hidden="true" htmlFor="lead-website">Website<input id="lead-website" tabIndex={-1} autoComplete="off" {...register('website')} /></label>
      </div>
      <label className="consent-check" htmlFor="lead-consent"><input id="lead-consent" type="checkbox" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'lead-consent-error' : undefined} {...register('consent')} /><span>{english ? `I consent to SolarMatch Thailand storing this request and sharing it with ${configuration.receivingCompany.en} so that the company may contact me about a residential solar site assessment. I understand that SolarMatch is not the installer and may be paid by the receiving company.` : `ข้าพเจ้ายินยอมให้ SolarMatch Thailand จัดเก็บคำขอนี้และส่งต่อให้ ${configuration.receivingCompany.th} เพื่อให้บริษัทดังกล่าวติดต่อเกี่ยวกับการประเมินหน้างานโซลาร์สำหรับที่พักอาศัย และเข้าใจว่า SolarMatch ไม่ใช่ผู้ติดตั้งและอาจได้รับค่าตอบแทนจากบริษัทผู้รับข้อมูล`}</span></label>
      {errors.consent && <small className="field-error" id="lead-consent-error">{errors.consent.message}</small>}
      <div className="privacy-inline"><LockKeyhole size={17} /><span>{english ? 'Read the ' : 'อ่าน '}<Link href={localizedPath('/privacy', locale)}>{english ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว'}</Link>{english ? ' before submitting.' : ' ก่อนส่งคำขอ'}</span></div>
      {submissionError && <div className="form-error form-error-summary" role="alert">{submissionError}</div>}
      <button className="button" disabled={state === 'sending'} type="submit">{state === 'sending' ? (english ? 'Sending securely…' : 'กำลังส่งอย่างปลอดภัย…') : (english ? 'Request a site assessment' : 'ขอให้ติดต่อเพื่อนัดประเมินหน้างาน')} <ArrowRight size={18} /></button>
    </form>}
  </section>;
}
