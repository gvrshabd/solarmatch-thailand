import {
  CalendarDays, Check, ClipboardList, FileText, Flag, History, Inbox,
  Link, MessageSquare, NotebookPen, Phone, PhoneMissed, RotateCcw, Sun, Undo2,
} from 'lucide-react';
import type { DeliveryActivity, InstallerDelivery } from '@/lib/installer/portal-contract';
import { assessmentRows } from '@/lib/installer/assessment-display';

export function EnquiryHome({ item, en }: { item: InstallerDelivery; en: boolean }) {
  const t = (th: string, english: string) => en ? english : th;
  const rows = assessmentRows(item.assessment, en);
  const usage = item.assessment.billInputStatus === 'not-supplied';
  const facts = [
    [usage ? 'monthlyConsumptionKwh' : 'monthlyBillThb', usage ? t('หน่วยไฟต่อเดือน', 'monthly use') : t('ค่าไฟต่อเดือน', 'monthly bill')],
    ['airConditionerCount', t('เครื่องปรับอากาศ', 'air-conditioners')],
    ['ownershipStatus', t('ความเป็นเจ้าของ', 'ownership')],
    ['planningTimeframe', t('ช่วงเวลาติดตั้ง', 'timeframe')],
  ];
  const details = rows.filter(row => !facts.some(([key]) => key === row.key));
  const name = item.homeownerName.trim().split(/\s+/)[0];
  const number = (n: number, digits = 0) => n.toLocaleString(en ? 'en-GB' : 'th-TH', { maximumFractionDigits: digits });
  const estimate = item.estimate;
  return <section className="card enquiry-home">
    <h2 className="h3">{t('ข้อมูลบ้าน', 'The home')}</h2>
    <dl className="home-facts">{facts.map(([key, label]) => <div key={key}>
      <dt>{label}</dt><dd>{rows.find(row => row.key === key)?.value || t('ไม่ได้ระบุ', 'Not specified')}</dd>
    </div>)}</dl>
    {estimate && <div className="home-estimate">
      <h3><Sun size={18} aria-hidden="true"/>{name ? t('ผลประเมิน SolarMatch จากคำตอบของคุณ' + name, 'SolarMatch estimate from ' + name + '’s answers') : t('ผลประเมินจาก SolarMatch', 'SolarMatch estimate')}</h3>
      <dl className="home-facts estimate-figures">
        <div><dt>{t('ขนาดระบบ', 'system')}</dt><dd>{number(estimate.systemKw, 2)} kWp</dd></div>
        <div><dt>{t('ราคาประเมิน', 'estimated price')}</dt><dd>฿{number(estimate.installedCostThb)}</dd></div>
        <div><dt>{t('ประหยัด/เดือน', 'saving / month')}</dt><dd>฿{number(estimate.monthlySavingsThb)}</dd></div>
        <div><dt>{t('คืนทุน', 'payback')}</dt><dd>{estimate.paybackYears === null ? t('ไม่มีข้อมูล', 'Unavailable') : number(estimate.paybackYears, 1) + t(' ปี', ' yrs')}</dd></div>
      </dl>
      <p className="hint">{t('ประเมินจากคำตอบของเจ้าของบ้าน ไม่ใช่ใบเสนอราคา', 'An estimate from their answers, not a quote.')}</p>
    </div>}
    {details.length > 0 && <><h3>{t('บ้านและหลังคา', 'Home and roof')}</h3>
      <dl className="roof-details">{details.map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl></>}
  </section>;
}

const activityIcon = {
  received: Inbox, outcome: History, 'call-spoke': Phone, 'call-no-answer': PhoneMissed,
  'call-wrong': PhoneMissed, text: MessageSquare, visit: CalendarDays, quote: FileText,
  won: Check, closed: Flag, reopened: RotateCcw, 'share-link': Link, claim: ClipboardList,
  notes: NotebookPen, undone: Undo2,
} as const;
const reasonLabels: Record<string, [string, string]> = {
  'incorrect-contact': ['ข้อมูลติดต่อไม่ถูกต้อง', 'Incorrect contact details'],
  duplicate: ['คำขอซ้ำ', 'Duplicate'], 'outside-criteria': ['นอกเกณฑ์', 'Outside agreed criteria'],
  'no-request': ['ไม่ได้ขอให้ติดต่อ', 'No contact request'], withdrawn: ['ถอนคำขอแล้ว', 'Withdrawn'],
  'other-company': ['เลือกบริษัทอื่น', 'Chose another company'], price: ['ราคา', 'Price'],
  'not-ready': ['ยังไม่พร้อม', 'Not ready yet'], unreachable: ['ติดต่อไม่ได้', 'Couldn’t reach them'],
  'not-suitable': ['ไม่เหมาะกับโซลาร์', 'Not suitable for solar'],
};
const stageLabels: Record<string, [string, string]> = {
  open: ['ใหม่', 'New'], contacted: ['ติดต่อแล้ว', 'Contacted'], site_visit: ['สำรวจหน้างาน', 'Site visit'],
  quoted: ['เสนอราคาแล้ว', 'Quoted'], won: ['ตกลงซื้อ', 'Won'], lost: ['ไม่ได้งาน', 'Lost'],
  'not-interested': ['ไม่สนใจ', 'Not interested'], 'not-suitable': ['ไม่เหมาะสม', 'Not suitable'],
  unreachable: ['ยังติดต่อไม่ได้', 'Unreachable'],
};
function eventTime(iso: string, en: boolean, now: number, alwaysDate = false) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '—';
  const zone = 'Asia/Bangkok';
  const day = new Intl.DateTimeFormat('en-GB', { timeZone: zone, dateStyle: 'short' });
  const today = day.format(date) === day.format(now);
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone };
  if (alwaysDate || !today) Object.assign(options, { weekday: 'short', day: 'numeric', month: 'short' });
  return date.toLocaleString(en ? 'en-GB' : 'th-TH', options);
}

function activityLabel(event: DeliveryActivity, item: InstallerDelivery, en: boolean, now: number) {
  const t = (th: string, english: string) => en ? english : th;
  const data = event.detail;
  const reason = reasonLabels[String(data?.closeReason || data?.reason)]?.[en ? 1 : 0];
  const stage = stageLabels[String(data?.outcome)]?.[en ? 1 : 0];
  const name = item.homeownerName.trim().split(/\s+/)[0];
  switch (event.kind) {
    case 'received': return t('ได้รับคำขอ', 'Enquiry received') + ' · ' + (item.fundingSource === 'trial' ? t('ทดลองฟรี', 'Free trial') : item.creditCost + t(' เครดิต', ' credits'));
    case 'call-spoke': return name ? t('โทรแล้ว · ได้คุยกับคุณ' + name, 'Called · spoke with ' + name) : t('โทรแล้ว · ได้คุยกับเจ้าของบ้าน', 'Called · spoke with homeowner');
    case 'call-no-answer': return t('โทรแล้ว · ไม่รับสาย', 'Called · no answer');
    case 'call-wrong': return t('โทรแล้ว · เบอร์ผิด', 'Called · wrong number');
    case 'text': return t('เปิดแอปข้อความ', 'Opened Messages');
    case 'outcome': return stage ? t('เปลี่ยนเป็น ', 'Moved to ') + stage : t('อัปเดตความคืบหน้า', 'Progress updated');
    case 'visit': return t('นัดสำรวจหน้างาน', 'Site visit booked') + (typeof data?.siteVisitAt === 'string' ? ' · ' + eventTime(data.siteVisitAt, en, now, true) : '');
    case 'quote': return t('ส่งใบเสนอราคา', 'Quote sent') + (typeof data?.quoteAmountThb === 'number' ? ' · ฿' + data.quoteAmountThb.toLocaleString(en ? 'en-GB' : 'th-TH') : '');
    case 'won': return t('บันทึกว่าตกลงซื้อ', 'Marked as won');
    case 'closed': return t('ปิดคำขอ', 'Closed') + (reason ? ' · ' + reason : '');
    case 'reopened': return t('เปิดคำขออีกครั้ง', 'Reopened');
    case 'share-link': return t('สร้างลิงก์ทีมงาน', 'Staff link created');
    case 'claim': return t('แจ้งปัญหา', 'Problem reported') + (reason ? ' · ' + reason : '');
    case 'notes': return t('บันทึกโน้ตสำหรับทีม', 'Team notes saved');
    case 'undone': return t('เลิกทำรายการก่อนหน้า', 'Previous change undone');
  }
}

export function EnquiryActivity({ item, en, now }: { item: InstallerDelivery; en: boolean; now: number }) {
  const fallback: DeliveryActivity[] = [{ kind: 'received', at: item.deliveredAt }];
  if (item.notesUpdatedAt) fallback.unshift({ kind: 'notes', at: item.notesUpdatedAt });
  const events = item.activity ?? fallback;
  return <section className="card enquiry-activity">
    <h2 className="h3">{en ? 'Activity' : 'ความเคลื่อนไหว'}</h2>
    {item.activityHasMore && <p className="hint">{en ? 'Latest 100 activities' : '100 รายการล่าสุด'}</p>}
    <ol>{events.map((event, i) => {
      const Icon = activityIcon[event.kind] || History;
      return <li key={event.at + event.kind + i}>
        <span className={'event-icon event-' + event.kind}><Icon size={17} aria-hidden="true"/></span>
        <div><b>{activityLabel(event, item, en, now)}</b><p><time dateTime={event.at}>{eventTime(event.at, en, now)}</time>{event.isYou || event.actor ? ' · ' + (event.isYou ? en ? 'You' : 'คุณ' : event.actor) : ''}</p></div>
      </li>;
    })}</ol>
  </section>;
}
