'use client';

import { ArrowRight, Mail, Phone } from 'lucide-react';
import { PageHero } from '@/components/content/page-hero';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';
import { legalReviewDisclosures } from '@/config/legal-review';
import {supportChannels} from '@/config/support';
import {ServiceAvailabilityNotice} from '@/components/site/service-availability';

export function ContactContent({ locale }: { locale: Locale }) {
  const english = locale === 'en';
  const support = supportChannels();
  return <main>
    <PageHero eyebrow={english ? 'Contact' : 'ติดต่อ'} title={english ? 'Contact SolarMatch' : 'ติดต่อ SolarMatch'}><p>{english ? 'Questions about SolarMatch, your assessment or your personal data can be sent through the contact details below.' : 'หากมีคำถามเกี่ยวกับ SolarMatch ผลประเมิน หรือข้อมูลส่วนบุคคล สามารถติดต่อได้ผ่านช่องทางด้านล่าง'}</p></PageHero>
    <section className="site-shell contact-status-card"><Mail aria-hidden="true" /><div><h2>{english ? 'General enquiries' : 'สอบถามทั่วไป'}</h2>{support.email&&<p><a href={support.emailHref}>{support.email}</a></p>}{support.phone&&<p><a href={support.phoneHref}>{support.phone}</a></p>}{!support.email&&!support.phone&&<p>{english?'A verified general-enquiry channel is not available yet.':'ขณะนี้ยังไม่มีช่องทางสอบถามทั่วไปที่ยืนยันแล้ว'}</p>}</div></section>
    <section className="site-shell contact-status-card"><Phone aria-hidden="true" /><div><h2>{english ? 'Privacy and personal-data requests' : 'คำขอเกี่ยวกับความเป็นส่วนตัวและข้อมูลส่วนบุคคล'}</h2><p>{legalReviewDisclosures.privacyRequests[locale]}</p><Link className="text-link" href={localizedPath('/privacy', locale)}>{english ? 'Privacy Notice' : 'ประกาศความเป็นส่วนตัว'} <ArrowRight aria-hidden="true" /></Link></div></section>
    <section className="content-cta"><div className="site-shell"><h2>{english ? 'Looking for solar quotes?' : 'ต้องการใบเสนอราคาโซลาร์?'}</h2><p>{english?'SolarMatch does not issue installation quotations itself.':'SolarMatch ไม่ได้ออกใบเสนอราคาติดตั้งด้วยตนเอง'}</p><p><ServiceAvailabilityNotice locale={locale}/></p><Link className="button" href={localizedPath('/estimate', locale)}>{english ? 'Start the assessment' : 'เริ่มทำแบบประเมิน'} <ArrowRight aria-hidden="true" /></Link></div></section>
  </main>;
}
