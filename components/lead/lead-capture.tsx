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
  propertyOwnership: 'owner' | 'decision-maker' | 'tenant' | 'other';
  timeframe: 'asap' | 'one-three-months' | 'three-six-months' | 'researching';
  convenientTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
  consent: boolean;
};

export function LeadCapture({ locale = 'th' }: { locale?: Locale }) {
  const english = locale === 'en';
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [method, setMethod] = useState<'phone' | 'line'>('phone');
  const successRef = useRef<HTMLDivElement>(null);
  const { register, handleSubmit, setError, setFocus, formState: { errors } } = useForm<Fields>({ defaultValues: { contactMethod: 'phone', propertyOwnership: 'owner', timeframe: 'researching', convenientTime: 'anytime', consent: false } });

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

  if (state === 'sent') return <div className="lead-success" role="status" aria-live="polite" tabIndex={-1} ref={successRef}><strong>{english ? 'Your request is complete' : 'ข้อมูลคำขอครบแล้ว'}</strong><p>{english ? 'Matching is not live yet, so this information was checked in your browser and then discarded. Nothing was sent or stored.' : 'ระบบจับคู่ยังไม่เปิดรับข้อมูล จึงตรวจข้อมูลในเบราว์เซอร์แล้วทิ้งทันที โดยไม่มีการส่งหรือบันทึก'}</p></div>;

  const errorMessages = (Object.values(errors) as Array<{ message?: unknown }>)
    .map((item) => typeof item.message === 'string' ? item.message : '')
    .filter(Boolean);

  return (
    <section className="lead-panel" aria-labelledby="lead-title">
      <div className="lead-copy">
        <p className="eyebrow">{english ? 'Compare suitable installers' : 'เปรียบเทียบผู้ติดตั้งที่เหมาะสม'}</p>
        <h2 id="lead-title">{english ? 'Prepare your installer-matching request' : 'เตรียมคำขอจับคู่ผู้ติดตั้ง'}</h2>
        <p>{english ? 'SolarMatch is being built to connect qualified customers with suitable solar companies. Matching is not accepting submissions yet, so this form only checks the experience and discards the details.' : 'SolarMatch กำลังสร้างระบบเชื่อมลูกค้าที่มีความต้องการจริงกับบริษัทโซลาร์ที่เหมาะสม ขณะนี้ยังไม่เปิดรับคำขอจริง แบบฟอร์มจึงตรวจเฉพาะขั้นตอนและทิ้งข้อมูลทันที'}</p>
        <div className="privacy-inline"><LockKeyhole size={17} /><span>{english ? 'Nothing is stored · Read the ' : 'ไม่มีการบันทึกข้อมูล · อ่าน '}<Link href={localizedPath('/privacy', locale)}>{english ? 'draft privacy notice' : 'ร่างนโยบายความเป็นส่วนตัว'}</Link></span></div>
      </div>
      <form className="lead-form" noValidate onSubmit={handleSubmit(submit)} onFocus={() => track('lead_form_started', { contactMethod: method })}>
        <div className="form-grid">
          <label htmlFor="lead-name">{english ? 'Name' : 'ชื่อ'}<span aria-hidden="true">*</span><input id="lead-name" autoComplete="name" required aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'lead-name-error' : undefined} {...register('name')} />{errors.name && <small className="field-error" id="lead-name-error">{errors.name.message}</small>}</label>
          <label htmlFor="lead-phone">{english ? 'Thai phone number' : 'เบอร์โทรศัพท์ไทย'}<span aria-hidden="true">*</span><input id="lead-phone" inputMode="tel" autoComplete="tel" placeholder="08X XXX XXXX" required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'lead-phone-error' : undefined} {...register('phone')} />{errors.phone && <small className="field-error" id="lead-phone-error">{errors.phone.message}</small>}</label>
          <label htmlFor="lead-method">{english ? 'Preferred contact method' : 'ช่องทางที่สะดวก'}<span aria-hidden="true">*</span><select id="lead-method" required {...register('contactMethod', { onChange: (event) => setMethod(event.target.value as 'phone' | 'line') })}><option value="phone">{english ? 'Phone' : 'โทรศัพท์'}</option><option value="line">LINE</option></select></label>
          {method === 'line' && <label htmlFor="lead-line">LINE ID<span aria-hidden="true">*</span><input id="lead-line" autoComplete="off" required aria-invalid={Boolean(errors.lineId)} aria-describedby={errors.lineId ? 'lead-line-error' : undefined} {...register('lineId')} />{errors.lineId && <small className="field-error" id="lead-line-error">{errors.lineId.message}</small>}</label>}
          <label htmlFor="lead-ownership">{english ? 'Your role for this property' : 'บทบาทของคุณต่อสถานที่นี้'}<span aria-hidden="true">*</span><select id="lead-ownership" required {...register('propertyOwnership')}><option value="owner">{english ? 'Owner' : 'เจ้าของ'}</option><option value="decision-maker">{english ? 'Decision-maker' : 'ผู้ตัดสินใจ'}</option><option value="tenant">{english ? 'Tenant' : 'ผู้เช่า'}</option><option value="other">{english ? 'Other' : 'อื่น ๆ'}</option></select></label>
          <label htmlFor="lead-timeframe">{english ? 'When are you considering installation?' : 'วางแผนติดตั้งเมื่อไร'}<span aria-hidden="true">*</span><select id="lead-timeframe" required {...register('timeframe')}><option value="asap">{english ? 'As soon as possible' : 'เร็วที่สุด'}</option><option value="one-three-months">{english ? 'Within 1–3 months' : 'ภายใน 1–3 เดือน'}</option><option value="three-six-months">{english ? 'Within 3–6 months' : 'ภายใน 3–6 เดือน'}</option><option value="researching">{english ? 'Researching for now' : 'กำลังศึกษาข้อมูล'}</option></select></label>
          <label htmlFor="lead-time">{english ? 'Convenient time' : 'ช่วงเวลาที่สะดวก'}<span aria-hidden="true">*</span><select id="lead-time" required {...register('convenientTime')}><option value="anytime">{english ? 'Any time' : 'เวลาใดก็ได้'}</option><option value="morning">09:00–12:00</option><option value="afternoon">12:00–17:00</option><option value="evening">17:00–20:00</option></select></label>
        </div>
        <label className="consent-check" htmlFor="lead-consent"><input id="lead-consent" type="checkbox" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'lead-consent-error' : undefined} {...register('consent')} /><span>{english ? 'I understand matching is not live and consent to this local form check under the privacy notice.' : 'ฉันเข้าใจว่าระบบจับคู่ยังไม่เปิดใช้งาน และยินยอมให้ตรวจแบบฟอร์มภายในเบราว์เซอร์ตามนโยบายความเป็นส่วนตัว'}</span></label>
        {errors.consent && <small className="field-error" id="lead-consent-error">{errors.consent.message}</small>}
        {errorMessages.length > 0 && <div className="form-error form-error-summary" role="alert"><strong>{english ? 'Please check the highlighted fields.' : 'กรุณาตรวจสอบช่องที่ระบุ'}</strong><ul>{errorMessages.map((message) => <li key={message}>{message}</li>)}</ul></div>}
        <button className="button" disabled={state === 'sending'} type="submit">{state === 'sending' ? (english ? 'Checking…' : 'กำลังตรวจสอบ…') : (english ? 'Check my request' : 'ตรวจคำขอของฉัน')} <ArrowRight size={18} /></button>
      </form>
    </section>
  );
}
