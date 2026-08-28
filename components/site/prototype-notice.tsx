import { FlaskConical } from 'lucide-react';
import type { Locale } from '@/config/i18n';

export function PrototypeNotice({ compact = false, locale = 'th' }: { compact?: boolean; locale?: Locale }) {
  const english = locale === 'en';
  return (
    <div className={compact ? 'prototype-notice compact' : 'prototype-notice'} role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>{english ? 'Installer matching is in pre-launch testing' : 'ระบบจับคู่ผู้ติดตั้งอยู่ระหว่างทดสอบก่อนเปิดใช้'}</strong>
        {!compact && <span>{english ? 'No contact details are currently stored or sent.' : 'ขณะนี้ยังไม่มีการบันทึกหรือส่งข้อมูลติดต่อ'}</span>}
      </div>
    </div>
  );
}
