'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/config/i18n';

let pending: Promise<boolean> | undefined;
function status() {
  // Deduplicate mounted public sections. Nothing is persisted in browser storage.
  return pending ??= fetch('/api/service-status', {cache:'no-store', headers:{Accept:'application/json'}, signal:AbortSignal.timeout(5000)})
    .then(async response => {
      if (!response.ok) return false;
      const body = await response.json() as {contactAvailable?: unknown};
      return body.contactAvailable === true;
    })
    .catch(() => false)
    .finally(() => { pending = undefined; });
}
function useAvailability(override?: boolean) {
  const [available, setAvailable] = useState<boolean | null>(override ?? null);
  useEffect(() => {
    if (override !== undefined) return;
    let active = true;
    const refresh = () => { void status().then(value => { if (active) setAvailable(value); }); };
    refresh();
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => { active = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visible); };
  }, [override]);
  return override ?? available;
}

export function ServiceAvailabilityNotice({locale, available}: {locale:Locale; available?:boolean}) {
  const enabled = useAvailability(available);
  return <span>{enabled
    ? locale === 'en' ? 'Installer contact is optional. Request it during your assessment with your explicit consent. Contact and quotations are not guaranteed.' : 'เลือกขอให้ผู้ติดตั้งติดต่อกลับได้ระหว่างทำแบบประเมิน โดยต้องให้ความยินยอมโดยชัดแจ้ง ไม่รับประกันการติดต่อหรือใบเสนอราคา'
    : locale === 'en' ? 'The free calculator is available. Installer contact requests are currently unavailable; you can still receive your full estimate without contact details.' : 'คุณใช้เครื่องคำนวณได้ฟรี ขณะนี้ยังไม่เปิดรับคำขอให้ผู้ติดตั้งติดต่อกลับ แต่คุณยังดูผลประเมินทั้งหมดได้โดยไม่ต้องให้ข้อมูลติดต่อ'}</span>;
}

export function ContactAvailabilityBadge({locale}: {locale:Locale}) {
  const enabled = useAvailability();
  if (enabled === null || enabled) return null;
  return <span className="chip chip-gold">{locale === 'en' ? 'Currently unavailable' : 'ยังไม่เปิดให้บริการ'}</span>;
}

