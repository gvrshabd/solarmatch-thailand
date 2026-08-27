'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/components/site/internal-link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { leadSchema, type LeadInput } from '@/lib/validation/lead';
import { track } from '@/lib/analytics/track';
import { localizedPath, type Locale } from '@/config/i18n';

type Fields = {
  name: string;
  phone: string;
  contactMethod: 'phone' | 'line';
  lineId?: string;
  convenientTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
  consent: boolean;
};

export function LeadCapture({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [method, setMethod] = useState<'phone' | 'line'>('phone');
  const successRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, setFocus, formState: { errors } } = useForm<Fields>({ defaultValues: { contactMethod: 'phone', convenientTime: 'anytime', consent: false } });

  useEffect(() => {
    if (state === 'sent') successRef.current?.focus();
  }, [state]);

  function submit(raw: Fields) {
    const parsed = leadSchema.safeParse(raw);
    if (!parsed.success) {
      let firstField: keyof Fields | null = null;
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof Fields;
        firstField ??= field;
        const englishMessages: Partial<Record<keyof Fields, string>> = {
          name: 'Please enter your name.',
          phone: 'Please enter a valid Thai phone number.',
          lineId: 'Please enter your LINE ID.',
          consent: 'Please confirm your consent.',
        };
        setError(field, { message: english ? englishMessages[field] ?? 'Please check this field.' : issue.message });
      });
      if (firstField) {
        const fieldToFocus = firstField;
        queueMicrotask(() => setFocus(fieldToFocus));
      }
      return;
    }
    setState('sending');
    const validated = parsed.data satisfies LeadInput;
    track('lead_form_submitted', { contactMethod: validated.contactMethod, prototype: true, localOnly: true });
    queueMicrotask(() => setState('sent'));
  }

  if (state === 'sent') return <div className="lead-success" role="status" aria-live="polite" tabIndex={-1} ref={successRef}><strong>{english ? 'Prototype form test completed' : 'ทดสอบแบบฟอร์มสำเร็จ'}</strong><p>{english ? 'The prototype validated the information in this browser, then discarded it without sending or storing it.' : 'ระบบต้นแบบตรวจข้อมูลภายในเบราว์เซอร์นี้แล้วทิ้งทันที โดยไม่ส่งหรือบันทึกข้อมูล'}</p></div>;

  const errorMessages = (Object.values(errors) as Array<{ message?: unknown }>)
    .map((item) => typeof item.message === 'string' ? item.message : '')
    .filter(Boolean);

  return (
    <section className="lead-panel" aria-labelledby="lead-title">
      <div className="lead-copy">
        <p className="eyebrow">{english ? 'Possible next step (prototype)' : 'ขั้นตอนถัดไป (ต้นแบบ)'}</p>
        <h2 id="lead-title">{english ? 'Would you like to know when matching is ready to test?' : 'อยากให้แจ้งเมื่อระบบจับคู่พร้อมทดลอง?'}</h2>
        <p>{english ? 'This form tests the interface only. Information is validated locally in this browser and immediately discarded; it is not transmitted.' : 'แบบฟอร์มนี้ใช้ทดสอบหน้าจอเท่านั้น ข้อมูลจะถูกตรวจภายในเบราว์เซอร์และทิ้งทันที โดยไม่มีการส่งออก'}</p>
        <div className="privacy-inline"><LockKeyhole size={17} /><span>{english ? 'Nothing is stored · Read the ' : 'ไม่มีการบันทึกข้อมูล · อ่าน '}<Link href={localizedPath('/privacy', locale)}>{english ? 'draft privacy notice' : 'ร่างนโยบายความเป็นส่วนตัว'}</Link></span></div>
      </div>
      <form className="lead-form" noValidate onSubmit={handleSubmit(submit)} onFocus={() => track('lead_form_started', { contactMethod: method })}>
        <div className="form-grid">
          <label htmlFor="lead-name">{english ? 'Name' : 'ชื่อ'}<span aria-hidden="true">*</span><input id="lead-name" autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'lead-name-error' : undefined} {...register('name')} />{errors.name && <small className="field-error" id="lead-name-error">{errors.name.message}</small>}</label>
          <label htmlFor="lead-phone">{english ? 'Thai phone number' : 'เบอร์โทรศัพท์ไทย'}<span aria-hidden="true">*</span><input id="lead-phone" inputMode="tel" autoComplete="tel" placeholder="08X XXX XXXX" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'lead-phone-error' : undefined} {...register('phone')} />{errors.phone && <small className="field-error" id="lead-phone-error">{errors.phone.message}</small>}</label>
          <label htmlFor="lead-method">{english ? 'Preferred contact method' : 'ช่องทางที่สะดวก'}<span aria-hidden="true">*</span><select id="lead-method" required {...register('contactMethod', { onChange: (event) => setMethod(event.target.value as 'phone' | 'line') })}><option value="phone">{english ? 'Phone' : 'โทรศัพท์'}</option><option value="line">LINE</option></select></label>
          {method === 'line' && <label htmlFor="lead-line">LINE ID<span aria-hidden="true">*</span><input id="lead-line" autoComplete="off" required aria-invalid={Boolean(errors.lineId)} aria-describedby={errors.lineId ? 'lead-line-error' : undefined} {...register('lineId')} />{errors.lineId && <small className="field-error" id="lead-line-error">{errors.lineId.message}</small>}</label>}
          <label htmlFor="lead-time">{english ? 'Convenient time' : 'ช่วงเวลาที่สะดวก'}<span aria-hidden="true">*</span><select id="lead-time" required {...register('convenientTime')}><option value="anytime">{english ? 'Any time' : 'เวลาใดก็ได้'}</option><option value="morning">09:00–12:00</option><option value="afternoon">12:00–17:00</option><option value="evening">17:00–20:00</option></select></label>
        </div>
        <label className="consent-check" htmlFor="lead-consent"><input id="lead-consent" type="checkbox" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'lead-consent-error' : undefined} {...register('consent')} /><span>{english ? 'I consent to this information being used only for this local contact-flow test under the draft privacy notice.' : 'ฉันยินยอมให้ใช้ข้อมูลนี้เฉพาะการทดสอบขั้นตอนการติดต่อภายในเบราว์เซอร์ ตามร่างนโยบายความเป็นส่วนตัว'}</span></label>
        {errors.consent && <small className="field-error" id="lead-consent-error">{errors.consent.message}</small>}
        {errorMessages.length > 0 && <div className="form-error form-error-summary" role="alert"><strong>{english ? 'Please check the highlighted fields.' : 'กรุณาตรวจสอบช่องที่ระบุ'}</strong><ul>{errorMessages.map((message) => <li key={message}>{message}</li>)}</ul></div>}
        <button className="button" disabled={state === 'sending'} type="submit">{state === 'sending' ? (english ? 'Validating…' : 'กำลังตรวจสอบ…') : (english ? 'Test the form' : 'ทดลองส่งแบบฟอร์ม')} <ArrowRight size={18} /></button>
      </form>
    </section>
  );
}
