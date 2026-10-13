'use client';

import { useState } from 'react';
import { ArrowRight, Building2, ChevronRight, CircleDollarSign, Inbox, LayoutGrid, MapPin, Search, Sun, Wallet } from 'lucide-react';
import type { InstallerDelivery, InstallerPortalData } from '@/lib/installer/portal-contract';

export type PortalView = 'overview' | 'inbox' | 'credits' | 'profile' | 'terms' | 'claims';
export type EnquiryGroup = 'new' | 'progress' | 'closed';

/** Display state only: never infer a completed call from opening a record. */
export function enquiryGroup(item: InstallerDelivery): EnquiryGroup {
  if (item.withdrawn || ['won', 'lost', 'not-suitable', 'not-interested'].includes(item.outcome || '')) return 'closed';
  return item.outcome ? 'progress' : 'new';
}

export function enquiryHref(item: InstallerDelivery, en: boolean) {
  return '/installers/enquiry/' + encodeURIComponent(item.id) + '?lang=' + (en ? 'en' : 'th');
}

export function PortalBrand() {
  return <span className="installer-brand-lockup"><span className="installer-brand-symbol" aria-hidden="true"><Sun /><span /></span><span>SolarMatch<small>FOR INSTALLERS</small></span></span>;
}

export function PortalNavigation({ view, en, count, navigate }: { view: PortalView; en: boolean; count: number; navigate: (view: PortalView) => void }) {
  const items = [
    { key: 'overview', th: 'ภาพรวม', en: 'Overview', icon: LayoutGrid },
    { key: 'inbox', th: 'คำขอ', en: 'Enquiries', icon: Inbox },
    { key: 'credits', th: 'เครดิต', en: 'Credits', icon: Wallet },
    { key: 'profile', th: 'บริษัท', en: 'Company', icon: Building2 },
  ] as const;
  return <nav className="installer-nav" aria-label={en ? 'Installer navigation' : 'เมนูผู้ติดตั้ง'}>
    <a className="installer-sidebar-brand" href={'/installers?lang=' + (en ? 'en' : 'th')}><PortalBrand /></a>
    {items.map(({ key, th, en: label, icon: Icon }) => <button key={key} aria-current={(view === key || (key === 'profile' && ['terms', 'claims'].includes(view))) ? 'page' : undefined} onClick={() => navigate(key)}><span className="installer-nav-icon"><Icon size={20} aria-hidden="true" />{key === 'inbox' && count > 0 && <span className="installer-nav-count" aria-hidden="true">{count}</span>}</span><span>{en ? label : th}</span></button>)}
    <p className="installer-sidebar-note">{en ? 'Your next connection starts here.' : 'เริ่มต้นโอกาสใหม่ของคุณที่นี่'}</p>
  </nav>;
}

function groupLabel(group: EnquiryGroup, en: boolean) {
  return ({ new: ['ยังไม่เริ่ม', 'Not started'], progress: ['อยู่ระหว่างดำเนินการ', 'In progress'], closed: ['ปิดแล้ว', 'Closed'] })[group][en ? 1 : 0];
}

export function EnquiryCard({ item, en }: { item: InstallerDelivery; en: boolean }) {
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(en ? 'en-GB' : 'th-TH').format(value) : '—';
  return <a className={'installer-enquiry-card' + (item.withdrawn ? ' is-withdrawn' : '')} href={enquiryHref(item, en)}>
    <div className="installer-enquiry-top"><span className="installer-avatar" aria-hidden="true">{item.withdrawn ? '—' : Array.from(item.homeownerName)[0] || '—'}</span><div><strong>{item.withdrawn ? (en ? 'Access withdrawn' : 'ถอนสิทธิ์แล้ว') : item.homeownerName}</strong><small>{item.reference}</small></div><span className="installer-chip"><CircleDollarSign size={13} aria-hidden="true" />{item.fundingSource === 'trial' ? (en ? 'Free trial' : 'ทดลองฟรี') : `${item.creditCost} ${en ? 'cr' : 'เครดิต'}`}</span></div>
    {!item.withdrawn && <><p className="installer-location"><MapPin size={14} aria-hidden="true" />{item.location}</p><div className="installer-enquiry-metrics"><div><strong>฿{number(item.assessment.monthlyBillThb)}</strong><small>{en ? 'monthly electricity bill' : 'ค่าไฟต่อเดือน'}</small></div><div><strong>{number(item.assessment.airConditionerCount)}</strong><small>{en ? 'installed air conditioners' : 'เครื่องปรับอากาศที่ติดตั้ง'}</small></div></div></>}
    {item.withdrawn && <p>{en ? 'Financial record and claims only. Personal details are hidden.' : 'ดูได้เฉพาะบันทึกเครดิตและคำร้อง ไม่แสดงข้อมูลส่วนบุคคล'}</p>}
    <div className="installer-enquiry-bottom"><span><span className={'installer-status-dot ' + enquiryGroup(item)} />{groupLabel(enquiryGroup(item), en)}</span><span>{en ? 'Open enquiry' : 'เปิดคำขอ'}<ChevronRight size={16} aria-hidden="true" /></span></div>
  </a>;
}

export function PortalOverview({ data, en, navigate }: { data: InstallerPortalData; en: boolean; navigate: (view: PortalView) => void }) {
  const fresh = data.deliveries.filter(item => enquiryGroup(item) === 'new').sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));
  return <>
    <div className="installer-overview-grid">
      <section className="installer-hero-card"><p className="installer-eyebrow">{en ? 'YOUR NEXT STEP' : 'ขั้นตอนถัดไปของคุณ'}</p><h2><span className="installer-hero-number">{fresh.length}</span> {en ? (fresh.length === 1 ? 'new enquiry' : 'new enquiries') : 'คำขอใหม่'}</h2><p>{en ? 'A little context. A better conversation.' : 'เข้าใจความต้องการก่อนเริ่มพูดคุย'}</p>{fresh[0] ? <a className="installer-lime-action" href={enquiryHref(fresh[0], en)}>{en ? 'Open next enquiry' : 'เปิดคำขอถัดไป'}<ArrowRight size={18} aria-hidden="true" /></a> : <button className="installer-lime-action" onClick={() => navigate('inbox')}>{en ? 'View enquiries' : 'ดูคำขอทั้งหมด'}<ArrowRight size={18} aria-hidden="true" /></button>}<small>{en ? 'Existing enquiries, oldest unstarted first.' : 'แสดงคำขอที่ยังไม่เริ่มดำเนินการ โดยเรียงจากรายการเก่าสุด'}</small></section>
      <section className="installer-next-up"><p className="installer-eyebrow">{en ? 'NEXT UP' : 'รายการถัดไป'}</p>{fresh[0] ? <EnquiryCard item={fresh[0]} en={en} /> : <div className="installer-empty"><Inbox aria-hidden="true" /><h2>{en ? 'You’re all caught up' : 'ไม่มีคำขอใหม่ในขณะนี้'}</h2><p>{en ? 'Your existing enquiries remain in the inbox.' : 'คุณยังดูคำขอที่ผ่านมาได้ในหน้าคำขอ'}</p></div>}</section>
    </div>
    <div className="installer-quick-links">
      <button onClick={() => navigate('credits')}><Wallet aria-hidden="true" /><span>{en ? 'Credits' : 'เครดิต'}<small>{en ? 'Available balance' : 'ยอดพร้อมใช้'}</small></span><strong>{data.balance.available} {en ? 'cr' : 'เครดิต'}</strong><ChevronRight aria-hidden="true" /></button>
      <button onClick={() => navigate('profile')}><MapPin aria-hidden="true" /><span>{en ? 'Service areas' : 'พื้นที่บริการ'}<small>{en ? 'Manage your coverage' : 'จัดการพื้นที่รับคำขอ'}</small></span><ChevronRight aria-hidden="true" /></button>
      <button onClick={() => navigate('profile')}><Building2 aria-hidden="true" /><span>{en ? 'Company & preferences' : 'บริษัทและการตั้งค่า'}<small>{en ? 'Capacity, LINE and delivery preferences' : 'จำนวนคำขอ LINE และการรับคำขอ'}</small></span><ChevronRight aria-hidden="true" /></button>
    </div>
    <div className="installer-summary"><section><span>{en ? 'Free enquiries remaining' : 'สิทธิ์ทดลองคงเหลือ'}</span><strong>{data.balance.trialRemaining}</strong><small>{en ? 'Separate from purchased credits' : 'แยกจากเครดิตที่ซื้อ'}</small></section><section><span>{en ? 'Reserved credits' : 'เครดิตที่สำรอง'}</span><strong>{data.balance.reserved}</strong><small>{en ? 'Not part of your available balance' : 'ไม่รวมในยอดพร้อมใช้'}</small></section></div>
  </>;
}

export function PortalInbox({ data, en }: { data: InstallerPortalData; en: boolean }) {
  const [filter, setFilter] = useState<EnquiryGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const visible = data.deliveries.filter(item => (filter === 'all' || enquiryGroup(item) === filter) && (item.withdrawn ? item.reference : `${item.homeownerName} ${item.location} ${item.reference}`).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));
  return <section aria-label={en ? 'Homeowner enquiries' : 'คำขอจากเจ้าของบ้าน'}>
    <div className="installer-inbox-tools"><div className="installer-segments" role="group" aria-label={en ? 'Enquiry status' : 'สถานะคำขอ'}>{(['all', 'new', 'progress', 'closed'] as const).map(key => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === 'all' ? (en ? 'All' : 'ทั้งหมด') : key === 'new' ? (en ? 'New' : 'ใหม่') : groupLabel(key, en)} <span>{key === 'all' ? data.deliveries.length : data.deliveries.filter(item => enquiryGroup(item) === key).length}</span></button>)}</div><label className="installer-search"><span>{en ? 'Search by name, area or reference' : 'ค้นหาชื่อ พื้นที่ หรือเลขอ้างอิง'}</span><span><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? 'Find an enquiry' : 'ค้นหาคำขอ'} /></span></label></div>
    <p className="installer-muted">{en ? `${visible.length} results · Oldest first` : `${visible.length} รายการ · เรียงจากเก่าสุด`}</p>
    <div className="installer-enquiry-grid">{visible.map(item => <EnquiryCard key={item.id} item={item} en={en} />)}</div>
    {!visible.length && <div className="installer-empty"><Inbox aria-hidden="true" /><h2>{en ? 'No enquiries to show' : 'ไม่พบคำขอ'}</h2><p>{query || filter !== 'all' ? (en ? 'Try another search or status.' : 'ลองเปลี่ยนคำค้นหาหรือสถานะ') : (en ? 'Your company needs approval and service-area settings before receiving enquiries.' : 'บริษัทต้องผ่านการอนุมัติและตั้งค่าพื้นที่บริการก่อนรับคำขอ')}</p></div>}
  </section>;
}

export function CreditBalance({ data, en }: { data: InstallerPortalData; en: boolean }) {
  return <section className="installer-hero-card installer-credit-balance"><p className="installer-eyebrow">{en ? 'AVAILABLE CREDITS' : 'เครดิตพร้อมใช้'}</p><h2><span className="installer-hero-number">{data.balance.available}</span> <span>{en ? 'cr' : 'เครดิต'}</span></h2><div className="installer-balance-details"><div><span>{en ? 'Reserved' : 'สำรอง'}</span><strong>{data.balance.reserved} {en ? 'cr' : 'เครดิต'}</strong></div><div><span>{en ? 'Free enquiries left' : 'สิทธิ์ทดลองคงเหลือ'}</span><strong>{data.balance.trialRemaining}</strong></div></div><p>{en ? 'No automatic top-up' : 'ไม่มีการเติมเครดิตอัตโนมัติ'}</p><small>{en ? 'Trial allowances are separate from purchased credits.' : 'สิทธิ์ทดลองแยกจากเครดิตที่ซื้อ'}</small></section>;
}

/** Original code-native illustration; no external photography or requests. */
export function SolarCity() {
  return <svg className="installer-city" viewBox="0 0 600 320" aria-hidden="true"><defs><linearGradient id="installer-sky" x2="1" y2="1"><stop stopColor="#315c46" /><stop offset="1" stopColor="#162b21" /></linearGradient></defs><rect width="600" height="320" fill="url(#installer-sky)" /><circle cx="455" cy="98" r="48" fill="#d9eda9" /><path d="M0 270V180H35V126H61V175H82V145H114V93H140V160H167V138H199V217H226V164H259V197H298V245H330V198H363V273Z" fill="#416952" /><path d="M0 320V222H46V254H86V209H125V273H160V234H191V294H234V246H267V320" fill="#1b372a" /><g fill="#244c38" stroke="#9cb98e" strokeWidth="1.5"><path d="m340 182 210-27-48 140-216 19Z" /><path d="m393 175-50 134m103-141-50 137m102-145-49 140M323 226l212-24m-228 69 212-20" /></g></svg>;
}
