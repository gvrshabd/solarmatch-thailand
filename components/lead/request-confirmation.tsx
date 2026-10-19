import type { Locale } from '@/config/i18n';
import { siteConfig } from '@/config/site';

/** A saved request is not evidence that an installer has received it. */
export type RequestConfirmationState =
  | { kind: 'received' }
  | { kind: 'checking' }
  | { kind: 'shared'; deliveredCompanyNames: string[] }
  | { kind: 'none-available' };

export function RequestConfirmation({ locale, state, policy }: { locale: Locale; state: RequestConfirmationState;policy?:{recipientLimit:number;startHour:number;endHour:number;timezone:'Asia/Bangkok'} }) {
  const en = locale === 'en';
  const names = state.kind === 'shared' ? state.deliveredCompanyNames.filter(Boolean) : [];
  // A caller cannot display a sharing claim without a named delivery record.
  const kind = state.kind === 'shared' && names.length === 0 ? 'checking' : state.kind;
  const title = kind === 'received' ? (en ? 'Request received' : 'ได้รับคำขอแล้ว')
    : kind === 'checking' ? (en ? 'Checking your request' : 'กำลังตรวจสอบคำขอ')
    : kind === 'shared' ? (en ? 'Shared with an installer' : 'ส่งคำขอให้บริษัทติดตั้งแล้ว')
    : (en ? 'No suitable installer currently available' : 'ขณะนี้ยังไม่มีบริษัทติดตั้งที่เหมาะสม');
  const helpEmail = siteConfig.contact.email.trim();
  const helpPhone = siteConfig.contact.phone.trim();

  return <section className="card request-confirmation" role="status" aria-live="polite" aria-label={title}>
    <h2>{title}</h2>
    {kind === 'received' && <p>{en
      ? 'Your contact request was saved. It is awaiting eligibility checks and matching. No installer receipt is confirmed yet.'
      : 'บันทึกคำขอติดต่อของคุณแล้ว และรอตรวจสอบคุณสมบัติและจับคู่ ขณะนี้ยังไม่มีหลักฐานยืนยันว่าบริษัทติดตั้งได้รับคำขอ'}</p>}
    {kind === 'checking' && <p>{en
      ? 'Eligibility and matching are in progress. This does not mean an installer has received your request.'
      : 'กำลังตรวจสอบคุณสมบัติและจับคู่ ขั้นตอนนี้ไม่ได้หมายความว่าบริษัทติดตั้งได้รับคำขอแล้ว'}</p>}
    {kind === 'shared' && <><p>{en ? 'Delivery records confirm that these companies can access your request:' : 'บันทึกการส่งมอบยืนยันว่าบริษัทต่อไปนี้เข้าถึงคำขอของคุณได้:'}</p><ul>{names.map((name) => <li key={name}>{name}</li>)}</ul></>}
    {kind === 'none-available' && <p>{en
      ? 'Matching found no suitable installer currently available. Your request was not shared on that basis; this is not a judgment that solar cannot work for your home.'
      : 'การจับคู่ยังไม่พบบริษัทติดตั้งที่เหมาะสมในขณะนี้ จึงไม่ได้ส่งต่อคำขอด้วยเหตุนี้ ซึ่งไม่ได้หมายความว่าบ้านของคุณติดตั้งโซลาร์ไม่ได้'}</p>}
    <p className="note">{en
      ? 'A request may be made available to no more than three distinct companies, and the configured limit may be lower. Installer delivery is limited to SolarMatch’s configured Bangkok-time business hours. A match, response, or quotation is not guaranteed.'
      : 'คำขอหนึ่งรายการอาจส่งให้บริษัทที่แตกต่างกันได้ไม่เกินสามราย และค่าที่ตั้งไว้จริงอาจต่ำกว่านั้น การส่งมอบให้บริษัทติดตั้งจำกัดตามเวลาทำการที่ SolarMatch กำหนดในเวลาไทย ไม่รับประกันว่าจะจับคู่ ได้รับการติดต่อ หรือได้รับใบเสนอราคา'}</p>
    {policy&&<p>{en?`For this request: at most ${policy.recipientLimit} companies; delivery hours ${String(policy.startHour).padStart(2,'0')}:00–${String(policy.endHour).padStart(2,'0')}:00, Bangkok time.`:`สำหรับคำขอนี้ ส่งให้บริษัทได้ไม่เกิน ${policy.recipientLimit} ราย ช่วงเวลาส่งมอบ ${String(policy.startHour).padStart(2,'0')}:00–${String(policy.endHour).padStart(2,'0')}:00 น. ตามเวลาไทย`}</p>}
    {(helpEmail || helpPhone) ? <p>{en ? 'For help, a correction, or withdrawal, contact SolarMatch: ' : 'หากต้องการความช่วยเหลือ แก้ไขข้อมูล หรือถอนคำขอ โปรดติดต่อ SolarMatch: '}
      {helpEmail && <a href={`mailto:${helpEmail}`}>{helpEmail}</a>}{helpEmail && helpPhone && ' · '}{helpPhone && <a href={`tel:${helpPhone}`}>{helpPhone}</a>}
    </p> : <p className="note">{en
      ? 'A verified homeowner help channel has not been published yet. Correction and withdrawal cannot be completed from this page; do not use installer staff links for your request.'
      : 'ยังไม่ได้เผยแพร่ช่องทางช่วยเหลือเจ้าของบ้านที่ยืนยันแล้ว หน้านี้ยังไม่สามารถแก้ไขข้อมูลหรือถอนคำขอได้ และลิงก์สำหรับพนักงานบริษัทติดตั้งไม่ใช่ช่องทางสำหรับเจ้าของบ้าน'}</p>}
  </section>;
}
