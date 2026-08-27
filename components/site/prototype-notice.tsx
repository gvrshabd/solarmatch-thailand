import { FlaskConical } from 'lucide-react';
import type { Locale } from '@/config/i18n';

export function PrototypeNotice({ compact = false, locale = 'th' }: { compact?: boolean; locale?: Locale }) {
  const english = locale === 'en';
  return (
    <div className={compact ? 'prototype-notice compact' : 'prototype-notice'} role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>{english ? 'Prototype for experience testing' : 'ต้นแบบเพื่อทดสอบประสบการณ์ใช้งาน'}</strong>
        {!compact && <span>{english ? 'Assumptions are still being validated, and this system does not send data to installers.' : 'สมมติฐานยังอยู่ระหว่างตรวจสอบ และระบบนี้ยังไม่ส่งข้อมูลให้ผู้ติดตั้ง'}</span>}
      </div>
    </div>
  );
}
