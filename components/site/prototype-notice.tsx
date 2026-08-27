import { FlaskConical } from 'lucide-react';

export function PrototypeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'prototype-notice compact' : 'prototype-notice'} role="note">
      <FlaskConical size={18} aria-hidden="true" />
      <div>
        <strong>ต้นแบบเพื่อทดสอบประสบการณ์ใช้งาน</strong>
        {!compact && <span>สมมติฐานยังอยู่ระหว่างตรวจสอบ และระบบนี้ยังไม่ส่งข้อมูลให้ผู้ติดตั้ง</span>}
      </div>
    </div>
  );
}
