'use client';

import { deliveryLocation } from '@/lib/installer/presentation';
import { BrandMark } from '@/components/site/brand-mark';
import { useState } from 'react';
import { Building2, ChevronRight, CircleDollarSign, Inbox, LayoutGrid, MapPin, Search, Wallet } from 'lucide-react';
import type { InstallerDelivery, InstallerPortalData } from '@/lib/installer/portal-contract';

export type PortalView = 'overview' | 'inbox' | 'credits' | 'profile' | 'terms' | 'claims';
export type EnquiryGroup = 'new' | 'progress' | 'closed';

/** Display state only: never infer a completed call from opening a record. */
export function enquiryGroup(item: InstallerDelivery): EnquiryGroup {
  if (item.withdrawn || ['won', 'lost', 'not-suitable', 'not-interested'].includes(item.outcome || '')) return 'closed';
  return item.outcome && item.outcome !== 'not-recorded' ? 'progress' : 'new';
}

export function enquiryHref(item: InstallerDelivery, en: boolean) {
  return '/installers/enquiry/' + encodeURIComponent(item.id) + '?lang=' + (en ? 'en' : 'th');
}

export function PortalBrand() { return <span className="v2-installer-brand"><BrandMark/><small>FOR INSTALLERS</small></span>; }

export function PortalNavigation({ view, en, count, navigate }: { view: PortalView; en: boolean; count: number; navigate: (view: PortalView) => void }) {
  const items = [
    { key: 'overview', th: 'วันนี้', en: 'Today', icon: LayoutGrid },
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
    {!item.withdrawn && <><p className="installer-location"><MapPin size={14} aria-hidden="true" />{deliveryLocation(item,en)}</p><div className="installer-enquiry-metrics"><div><strong>฿{number(item.assessment.monthlyBillThb)}</strong><small>{en ? 'monthly electricity bill' : 'ค่าไฟต่อเดือน'}</small></div><div><strong>{number(item.assessment.airConditionerCount)}</strong><small>{en ? 'installed air conditioners' : 'เครื่องปรับอากาศที่ติดตั้ง'}</small></div></div></>}
    {item.withdrawn && <p>{en ? 'Financial record and claims only. Personal details are hidden.' : 'ดูได้เฉพาะบันทึกเครดิตและคำร้อง ไม่แสดงข้อมูลส่วนบุคคล'}</p>}
    <div className="installer-enquiry-bottom"><span><span className={'installer-status-dot ' + enquiryGroup(item)} />{groupLabel(enquiryGroup(item), en)}</span><span>{en ? 'Received' : 'ได้รับเมื่อ'} {waitingTime(item.deliveredAt,en)}</span></div>
  </a>;
}

export function waitingTime(deliveredAt: string, en: boolean, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(deliveredAt).getTime()) / 60000));
  if (!Number.isFinite(minutes)) return '—';
  return minutes < 60 ? `${minutes} ${en?'min':'นาที'}` : minutes < 1440 ? `${Math.floor(minutes/60)} ${en?'hr':'ชั่วโมง'}` : `${Math.floor(minutes/1440)} ${en?'days':'วัน'}`;
}
export function PortalOverview({ data, en, navigate }: { data: InstallerPortalData; en: boolean; navigate: (view: PortalView) => void }) {
  const fresh = data.deliveries.filter(item=>enquiryGroup(item)==='new').sort((a,b)=>a.deliveredAt.localeCompare(b.deliveredAt));
  const next=fresh[0], c=data.company;
  const reasons = [
    !data.session.user.emailVerified && (en?'Verify your email before using company controls.':'กรุณายืนยันอีเมลก่อนใช้ข้อมูลบริษัท'),
    !c && (en?'Complete your company profile.':'กรอกข้อมูลบริษัทให้ครบ'),
    c&&c.approvalStatus!=='approved'&&(en?`Company status: ${c.approvalStatus}. New deliveries are unavailable.`:`สถานะบริษัท: ${c.approvalStatus} ยังไม่พร้อมรับคำขอใหม่`),
    c?.paused&&(en?'Your company preference is paused.':'บริษัทของคุณพักรับคำขออยู่'),
    !data.terms.acceptedAt&&(en?'Accept the current installer terms.':'กรุณายอมรับข้อตกลงผู้ติดตั้งฉบับปัจจุบัน'),
    (data.availability?.platformPaused||data.availability?.allocationPaused)&&(en?'New deliveries are paused by SolarMatch. Your preference does not override this.':'SolarMatch พักการส่งคำขอใหม่ การตั้งค่าของบริษัทไม่สามารถเปลี่ยนสถานะนี้ได้'),
    (data.balance.debt>0||(data.balance.available<(data.commercial?.sharedCredits??2)&&data.balance.trialRemaining===0))&&(en?'No spendable entitlement for a new enquiry.':'ยังไม่มีเครดิตหรือสิทธิ์ทดลองที่พร้อมใช้รับคำขอใหม่'),
  ].filter(Boolean);
  const enough=data.balance.debt>0?0:Math.floor(data.balance.available/(data.commercial?.sharedCredits??2));
  return <>{reasons.length>0&&<div className="installer-notice" role="status">{reasons.map((r,i)=><p key={i}>{r}</p>)}</div>}
    {c?.approvalStatus!=='approved'&&<div className="card"><h2>{en?'Your next steps':'ขั้นตอนถัดไป'}</h2><ul className="checklist2">{[
      [data.session.user.emailVerified,en?'Verify email':'ยืนยันอีเมล'],[c?.approvalStatus==='approved',en?'Company approval':'การอนุมัติบริษัท'],[!!c?.serviceAreas.length,en?'Choose service areas':'เลือกพื้นที่บริการ'],[!!c?.lineLinked,en?'Connect LINE alerts':'เชื่อมต่อ LINE'],[!!data.terms.acceptedAt,en?'Accept installer terms':'ยอมรับข้อตกลงผู้ติดตั้ง'],
    ].map(([done,label],i)=><li key={i} className={done?'done':''}><span aria-hidden="true">{done?'✓':'○'}</span>{label}</li>)}</ul><button onClick={()=>navigate('profile')}>{en?'Company settings':'ตั้งค่าบริษัท'}</button></div>}
    <div className="pgrid"><div className="col">{next?<section className="callnext"><div className="top"><span className="eyebrow">{en?'CALL NEXT':'ติดต่อรายถัดไป'}</span><span className="wait">{en?'Waiting':'รอมาแล้ว'} {waitingTime(next.deliveredAt,en)}</span></div><div className="person"><span className="avatar">{Array.from(next.homeownerName)[0]||'—'}</span><div><b>{next.homeownerName}</b><small>{deliveryLocation(next,en)}</small></div></div><div className="cfacts"><span className="chip chip-dark">฿{Number(next.assessment.monthlyBillThb||0).toLocaleString()} / {en?'mo':'เดือน'}</span><span className="chip chip-dark">{String(next.assessment.airConditionerCount??'—')} {en?'air conditioners':'เครื่องปรับอากาศ'}</span></div><div className="btns">{next.phone&&<a className="btn btn-lime" href={'tel:'+next.phone}>{en?'Call':'โทร'} {next.homeownerName}</a>}<a className="btn btn-ghost-dark" href={enquiryHref(next,en)}>{en?'Open enquiry':'เปิดคำขอ'}</a></div><p className="note">{en?'Opening or calling does not record a successful contact.':'การเปิดคำขอหรือกดโทรไม่ได้บันทึกว่าติดต่อสำเร็จ'}</p></section>:<div className="card empty"><Inbox/><h2>{en?'No new enquiries':'ไม่มีคำขอใหม่'}</h2><p>{en?'Existing enquiries remain available in your inbox.':'ยังดูคำขอเดิมได้ในหน้าคำขอ'}</p></div>}
    {fresh.length>1&&<div><p className="eyebrow">{en?'ALSO WAITING':'กำลังรอเช่นกัน'}</p><div className="list">{fresh.slice(1).map(item=><a key={item.id} href={enquiryHref(item,en)}><span className="avatar">{Array.from(item.homeownerName)[0]||'—'}</span><span className="grow"><b>{item.homeownerName} · {deliveryLocation(item,en)}</b><small>{en?'Waiting':'รอมาแล้ว'} {waitingTime(item.deliveredAt,en)}</small></span><ChevronRight className="chev"/></a>)}</div></div>}
    {data.deliveries.some(d=>enquiryGroup(d)==='progress')&&<div className="list"><a href={'/installers?view=inbox&lang='+(en?'en':'th')}><span className="tile"><Inbox/></span><span className="grow"><b>{en?'Enquiries in progress':'คำขอที่กำลังดำเนินการ'}</b><small>{en?'Record an outcome when known.':'บันทึกผลเมื่อทราบผลแล้ว'}</small></span><ChevronRight/></a></div>}</div>
    <div className="col"><div className="list"><a href={'/installers?view=credits&lang='+(en?'en':'th')}><span className="tile dark"><Wallet/></span><span className="grow"><b>{data.balance.available} {en?'credits':'เครดิต'} · {en?'enough for':'รับได้'} {enough} {en?'shared enquiries':'คำขอแบบแชร์'}</b><small>{data.balance.trialRemaining} {en?'trial enquiries remaining, separately':'สิทธิ์ทดลองคงเหลือ แยกจากเครดิต'}</small></span><ChevronRight/></a></div><div className="list"><a href={'/installers?view=profile&lang='+(en?'en':'th')}><span className="tile"><MapPin/></span><span className="grow"><b>{en?'Service areas':'พื้นที่บริการ'}</b><small>{en?'Company capacity and LINE settings':'จำนวนคำขอและการตั้งค่า LINE'}</small></span><ChevronRight/></a></div></div></div></>;
}

export function PortalInbox({ data, en }: { data: InstallerPortalData; en: boolean }) {
  const [filter, setFilter] = useState<EnquiryGroup | 'all'>('new');
  const [query, setQuery] = useState('');
  const visible = data.deliveries.filter(item => (filter === 'all' || enquiryGroup(item) === filter) && (item.withdrawn ? item.reference : `${item.homeownerName} ${deliveryLocation(item,en)} ${item.reference}`).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => a.deliveredAt.localeCompare(b.deliveredAt));
  return <section aria-label={en ? 'Homeowner enquiries' : 'คำขอจากเจ้าของบ้าน'}>
    <div className="installer-inbox-tools"><div className="installer-segments" role="group" aria-label={en ? 'Enquiry status' : 'สถานะคำขอ'}>{(['new', 'progress', 'closed', 'all'] as const).map(key => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === 'all' ? (en ? 'All' : 'ทั้งหมด') : key === 'new' ? (en ? 'New' : 'ใหม่') : groupLabel(key, en)} <span>{key === 'all' ? data.deliveries.length : data.deliveries.filter(item => enquiryGroup(item) === key).length}</span></button>)}</div><label className="installer-search"><span>{en ? 'Search by name, area or reference' : 'ค้นหาชื่อ พื้นที่ หรือเลขอ้างอิง'}</span><span><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={en ? 'Find an enquiry' : 'ค้นหาคำขอ'} /></span></label></div>
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
