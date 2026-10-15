'use client';
import { thaiPhone } from '@/lib/installer/presentation';
import { assessmentRows, sharedResidentialLabel } from '@/lib/installer/assessment-display';
import { useEffect, useRef, useState } from 'react';
import { consumeShareFragment } from '@/lib/installer/share-fragment';
type Share = { expiresAt: string; delivery: { reference: string; product: string; homeownerName: string; phone: string; location: string; locationTh?: string; requestedAt: string; assessment: Record<string, unknown>; qualification: string } };
export function SharedEnquiry() {
  const [en, setEn] = useState(false);
  const [data, setData] = useState<Share | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const t = (th: string, english: string) => en ? english : th;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    queueMicrotask(() => setEn(new URLSearchParams(window.location.search).get('lang') === 'en'));
    const token = consumeShareFragment(window.location, (url) => window.history.replaceState({}, '', url));
    if (!token) { queueMicrotask(() => setFailed(true)); return; }
    fetch('/api/installer/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(async (response) => { if (!response.ok) throw new Error('Unavailable'); setData(await response.json() as Share); }).catch(() => setFailed(true));
  }, []);
  useEffect(() => { document.documentElement.lang = en ? 'en' : 'th'; }, [en]);
  const formatDate = (value: string) => new Date(value).toLocaleString(en ? 'en-GB' : 'th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short' });
  return <main className="installer-shell" lang={en ? 'en' : 'th'}><header className="installer-header"><span className="installer-brand">SolarMatch <span>for Installers</span></span><button onClick={() => { setEn(!en); const url = new URL(window.location.href); url.searchParams.set('lang', en ? 'th' : 'en'); window.history.replaceState({}, '', url.pathname + url.search); }}>{en ? 'ไทย' : 'English'}</button></header>
    {failed ? <section className="installer-card" role="alert"><h1>{t('ไม่สามารถเปิดคำขอนี้ได้', 'This enquiry is unavailable')}</h1><p>{t('ลิงก์อาจหมดอายุหรือถูกเพิกถอน กรุณาขอลิงก์ใหม่จากบริษัทผู้รับคำขอ', 'The link may have expired or been revoked. Ask the receiving company for a replacement link.')}</p></section> : !data ? <p role="status">{t('กำลังเปิดคำขอ…', 'Opening enquiry…')}</p> : <section className="installer-card"><p className="installer-eyebrow">{t('ข้อมูลสำหรับทีมงานผู้รับคำขอ', 'Enquiry for receiving company staff')}</p><h1>{data.delivery.reference}</h1><h2>{data.delivery.homeownerName}</h2><a href={'tel:' + data.delivery.phone}>{thaiPhone(data.delivery.phone)}</a><p>{en?data.delivery.location:data.delivery.locationTh||data.delivery.location}</p><p>{t('วันที่ร้องขอ', 'Request date')}: {formatDate(data.delivery.requestedAt)}</p><p>{['shared-residential', 'shared_residential'].includes(data.delivery.product) ? sharedResidentialLabel(en) : data.delivery.product}</p><h3>{t('ข้อมูลบ้านและการประเมิน', 'Property and assessment')}</h3><dl>{assessmentRows(data.delivery.assessment, en).map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl><p className="installer-muted">{t('ลิงก์หมดอายุ', 'Link expires')}: {formatDate(data.expiresAt)}</p><p>{t('การส่งต่อลิงก์ให้สิทธิ์เข้าถึงข้อมูลคำขอนี้ ใช้เฉพาะทีมงานที่ดูแลคำขอให้บริษัทผู้รับ ลิงก์ไม่ได้ยืนยันตัวตนผู้เปิดและไม่ป้องกันการส่งต่อ', 'Forwarding this link grants access to this enquiry. Use it only for staff handling the enquiry for the receiving company. It does not verify the viewer’s identity or prevent further forwarding.')}</p></section>}
  </main>;
}
