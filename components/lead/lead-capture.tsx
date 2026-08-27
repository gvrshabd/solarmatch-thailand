'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { leadSchema, type LeadInput } from '@/lib/validation/lead';
import { track } from '@/lib/analytics/track';

type Fields = {
  name: string;
  phone: string;
  contactMethod: 'phone' | 'line';
  lineId?: string;
  convenientTime: 'morning' | 'afternoon' | 'evening' | 'anytime';
  consent: boolean;
};

export function LeadCapture() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [serverError, setServerError] = useState('');
  const [method, setMethod] = useState<'phone' | 'line'>('phone');
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Fields>({ defaultValues: { contactMethod: 'phone', convenientTime: 'anytime', consent: false } });

  async function submit(raw: Fields) {
    const parsed = leadSchema.safeParse(raw);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => setError(issue.path[0] as keyof Fields, { message: issue.message }));
      return;
    }
    setState('sending');
    setServerError('');
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(parsed.data satisfies LeadInput) });
    if (!response.ok) {
      setState('idle');
      setServerError('ไม่สามารถส่งแบบฟอร์มต้นแบบได้ กรุณาลองใหม่');
      return;
    }
    track('lead_form_submitted', { contactMethod: parsed.data.contactMethod, prototype: true });
    setState('sent');
  }

  if (state === 'sent') return <div className="lead-success" role="status"><strong>ทดสอบแบบฟอร์มสำเร็จ</strong><p>ระบบต้นแบบตรวจข้อมูลแล้ว แต่ไม่ได้บันทึกหรือส่งข้อมูลของคุณให้บุคคลใด</p></div>;

  return (
    <section className="lead-panel" aria-labelledby="lead-title">
      <div className="lead-copy">
        <p className="eyebrow">ขั้นตอนถัดไป (ต้นแบบ)</p>
        <h2 id="lead-title">อยากให้แจ้งเมื่อระบบจับคู่พร้อมทดลอง?</h2>
        <p>แบบฟอร์มนี้ใช้ทดสอบหน้าจอเท่านั้น ข้อมูลจะถูกตรวจสอบแล้วทิ้งทันที ไม่มีผู้ติดตั้งได้รับข้อมูล</p>
        <div className="privacy-inline"><LockKeyhole size={17} /><span>ไม่มีการบันทึกข้อมูล · อ่าน <Link href="/privacy">ร่างนโยบายความเป็นส่วนตัว</Link></span></div>
      </div>
      <form className="lead-form" onSubmit={handleSubmit(submit)} onFocus={() => track('lead_form_started', { contactMethod: method })}>
        <div className="form-grid">
          <label>ชื่อ<span>*</span><input autoComplete="name" {...register('name')} />{errors.name && <small className="field-error">{errors.name.message}</small>}</label>
          <label>เบอร์โทรศัพท์ไทย<span>*</span><input inputMode="tel" autoComplete="tel" placeholder="08X XXX XXXX" {...register('phone')} />{errors.phone && <small className="field-error">{errors.phone.message}</small>}</label>
          <label>ช่องทางที่สะดวก<span>*</span><select {...register('contactMethod', { onChange: (event) => setMethod(event.target.value as 'phone' | 'line') })}><option value="phone">โทรศัพท์</option><option value="line">LINE</option></select></label>
          {method === 'line' && <label>LINE ID<span>*</span><input autoComplete="off" {...register('lineId')} />{errors.lineId && <small className="field-error">{errors.lineId.message}</small>}</label>}
          <label>ช่วงเวลาที่สะดวก<span>*</span><select {...register('convenientTime')}><option value="anytime">เวลาใดก็ได้</option><option value="morning">09:00–12:00</option><option value="afternoon">12:00–17:00</option><option value="evening">17:00–20:00</option></select></label>
        </div>
        <label className="consent-check"><input type="checkbox" {...register('consent')} /><span>ฉันยินยอมให้ใช้ข้อมูลนี้เพื่อทดสอบขั้นตอนการติดต่อ ตามร่างนโยบายความเป็นส่วนตัว</span></label>
        {errors.consent && <small className="field-error">{errors.consent.message}</small>}
        {serverError && <p className="form-error" role="alert">{serverError}</p>}
        <button className="button" disabled={state === 'sending'} type="submit">{state === 'sending' ? 'กำลังตรวจสอบ…' : 'ทดลองส่งแบบฟอร์ม'} <ArrowRight size={18} /></button>
      </form>
    </section>
  );
}
