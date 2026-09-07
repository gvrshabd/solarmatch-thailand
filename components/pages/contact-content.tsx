'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';

type PublicOperator = { publicBusinessPhone: string; publicBusinessEmail: string; privacyContactEmail: string; privacyRightsRequestUrl: string };

export function ContactContent({ locale }: { locale: Locale }) {
  const english = locale === 'en';
  const [operator, setOperator] = useState<PublicOperator | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/public/operator', { signal: controller.signal }).then(async (response) => response.ok ? response.json() as Promise<{ operator?: PublicOperator }> : null)
      .then((payload) => setOperator(payload?.operator ?? null)).catch(() => undefined);
    return () => controller.abort();
  }, []);
  const email = operator?.publicBusinessEmail || '[PUBLIC BUSINESS EMAIL]';
  const phone = operator?.publicBusinessPhone || '[PUBLIC BUSINESS PHONE]';
  const privacyEmail = operator?.privacyContactEmail || '[PRIVACY CONTACT EMAIL]';
  const rightsUrl = operator?.privacyRightsRequestUrl || '';
  const emailValue = (value: string) => operator ? <a href={`mailto:${value}`}>{value}</a> : <span>{value}</span>;
  return <main>
    <PageHero eyebrow={english ? 'Contact' : 'ติดต่อ'} title={english ? 'Contact SolarMatch' : 'ติดต่อ SolarMatch'}><p>{english ? 'Questions about SolarMatch, your assessment or your personal data can be sent through the contact details below.' : 'หากมีคำถามเกี่ยวกับ SolarMatch ผลประเมิน หรือข้อมูลส่วนบุคคล สามารถติดต่อได้ผ่านช่องทางด้านล่าง'}</p></PageHero>
    <section className="site-shell contact-status-card"><Mail aria-hidden="true" /><div><h2>{english ? 'General enquiries' : 'สอบถามทั่วไป'}</h2><p>{english ? 'Email:' : 'อีเมล:'} {emailValue(email)}</p><p>{english ? 'Phone:' : 'โทรศัพท์:'} {operator ? <a href={`tel:${phone.replace(/[^+\d]/gu, '')}`}>{phone}</a> : <span>{phone}</span>}</p></div></section>
    <section className="site-shell contact-status-card"><Phone aria-hidden="true" /><div><h2>{english ? 'Privacy and personal-data requests' : 'คำขอเกี่ยวกับความเป็นส่วนตัวและข้อมูลส่วนบุคคล'}</h2><p>{english ? 'For requests relating to access, correction, deletion, withdrawal of consent or other privacy rights:' : 'สำหรับคำขอเข้าถึง แก้ไข ลบ ถอนความยินยอม หรือใช้สิทธิด้านความเป็นส่วนตัวอื่น ๆ:'}</p><p>{english ? 'Email:' : 'อีเมล:'} {emailValue(privacyEmail)}</p>{rightsUrl ? <a className="text-link" href={rightsUrl}>{english ? 'Submit a privacy-rights request' : 'ยื่นคำขอใช้สิทธิด้านความเป็นส่วนตัว'} <ArrowRight aria-hidden="true" /></a> : <p>[PRIVACY RIGHTS REQUEST LINK]</p>}</div></section>
    <section className="content-cta"><div className="site-shell"><h2>{english ? 'Looking for solar quotes?' : 'ต้องการใบเสนอราคาโซลาร์?'}</h2><p>{english ? 'Complete the SolarMatch assessment and choose whether you want to request quotes at the end.' : 'ทำแบบประเมิน SolarMatch และเลือกได้ในขั้นตอนสุดท้ายว่าต้องการขอใบเสนอราคาหรือไม่'}</p><p>{english ? 'SolarMatch does not issue solar quotations itself.' : 'SolarMatch ไม่ได้เป็นผู้ออกใบเสนอราคาติดตั้งโซลาร์เอง'}</p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start the assessment' : 'เริ่มทำแบบประเมิน'} <ArrowRight aria-hidden="true" /></Link></div></section>
  </main>;
}
