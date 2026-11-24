'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Check, Copy, MessageSquare, Phone, PhoneMissed, PhoneOff, Users } from 'lucide-react';
import type { InstallerDelivery, InstallerPortalAction } from '@/lib/installer/portal-contract';
import { thaiPhone } from '@/lib/installer/presentation';
import type { InstallerAction } from './action-result';
import { calendarFile, clearPendingCall, closeReasons, khun, localizedDate, localizedTime, pendingCall, savePendingCall, stages, textTemplate } from './next-step-helpers';
import { CloseForm, QuoteForm, VisitForm } from './next-step-forms';
import { signalGroup } from './signal-state';

type Flow = 'calling' | 'text' | 'visit' | 'quote' | 'close' | null;
type Props = {
  item: InstallerDelivery; en: boolean; disabled: boolean; action: InstallerAction;
  companyName: string; recipientLimit?: number; now: number; nextWaiting?: ReactNode;
  onWrongNumber: () => void; onTechnician: () => void;
};

export function NextStep({ item, en, disabled, action, companyName, recipientLimit, now, nextWaiting, onWrongNumber, onTechnician }: Props) {
  const [flow, setFlow] = useState<Flow>(null);
  const [attempted, setAttempted] = useState(false);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [undo, setUndo] = useState<{ id: string; until: number; label: string } | null>(null);
  const [manualCopy, setManualCopy] = useState('');
  const card = useRef<HTMLElement>(null);
  const firstName = item.homeownerName.trim().split(/\s+/)[0] || item.reference;
  const t = (th: string, english: string) => en ? english : th;
  const group = signalGroup(item);
  const stage = group === 'waiting' ? 'open' : item.outcome || 'open';
  const closed = group === 'closed';
  const step = flow || stage;
  const currentIndex = stages.findIndex(([id]) => id === stage);
  const phone = item.phone.replace(/[^+\d]/g, '');
  const hasPhone = /^\+?\d{5,16}$/.test(phone);
  const priorCalls = item.activity?.filter(e => e.kind === 'call-no-answer') || [];
  const problemReason = closeReasons.find(([id]) => id === item.closeReason);
  const latestStage = item.activity?.find(e => ['quoted','won','lost','not-suitable'].includes(stage) &&
    (e.kind === 'quote' && stage === 'quoted' || e.kind === 'won' && stage === 'won' || e.kind === 'outcome' && e.detail?.outcome === stage));

  // Persist only the opaque delivery ID and timestamp while the dialer is in front.
  // The question returns even if the phone ended the app during the call.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function restore() {
      const pending = pendingCall(item.id);
      if (pending === 'expired') { setFlow(f => f === 'calling' ? null : f); return; }
      if (!pending) return; // Storage may be unavailable; keep any in-memory question.
      setFlow('calling');
      clearTimeout(timer); timer = setTimeout(restore, pending.remaining + 20);
    }
    restore();
    window.addEventListener('pageshow', restore);
    document.addEventListener('visibilitychange', restore);
    return () => { clearTimeout(timer); window.removeEventListener('pageshow', restore); document.removeEventListener('visibilitychange', restore); };
  }, [item.id]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), Math.max(0, undo.until - Date.now()));
    return () => clearTimeout(timer);
  }, [undo]);

  useEffect(() => {
    if (!flow) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { if (flow === 'calling') clearPendingCall(); setFlow(null); card.current?.focus({preventScroll:true}); }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [flow]);

  function focusCard() {
    requestAnimationFrame(() => { card.current?.focus({preventScroll:true}); card.current?.scrollIntoView({block:'nearest', behavior:'instant'}); });
  }
  function startCall() {
    setFlow('calling'); setFeedback(''); setError(''); setManualCopy('');
    savePendingCall(item.id);
    focusCard();
  }
  function openText(afterCall: boolean) {
    setAttempted(afterCall); setMessage(textTemplate(firstName, companyName, afterCall, en)); setError(''); setFlow('text'); focusCard();
  }
  function changeFlow(next: Flow) { setError(''); setFlow(next); }
  async function save(body: InstallerPortalAction, label: string, after?: () => void) {
    if (disabled) return;
    setError('');
    const result = await action(body);
    if (!result.ok) {
      // Keep the installer in the same step, with the reason beside the button they pressed.
      setError(result.message || t('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง', 'Couldn’t save. Please try again.'));
      return;
    }
    clearPendingCall(); setManualCopy(''); setFlow(null); setFeedback('');
    if (result.undoId && result.undoExpiresAt) setUndo({id:result.undoId, until: Date.parse(result.undoExpiresAt), label});
    else { setUndo(null); setFeedback(label); }
    after?.();
  }
  const revision = item.workflowRevision ?? 0;
  const report = (outcome: string, label: string) => void save({ action:'report-outcome', deliveryId:item.id, revision, outcome }, label);
  const log = (kind: 'call-spoke' | 'call-no-answer' | 'call-wrong' | 'text', label: string, after?: () => void) =>
    void save({action:'log-activity', deliveryId:item.id, revision, kind}, label, after);
  async function undoLast() {
    if (!undo || disabled) return;
    const result = await action({action:'undo-activity', deliveryId:item.id, undoId:undo.id});
    setUndo(null);
    if (result.ok) { clearPendingCall(); setFlow(null); setError(''); setFeedback(t('เลิกทำแล้ว', 'Change undone')); }
    else setError(result.message || t('เลิกทำไม่สำเร็จ ใช้ขั้นตอนด้านล่างเพื่อเปลี่ยนกลับ', 'Couldn’t undo. Use the stages below to change it back.'));
  }
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(label); setManualCopy(''); }
    catch { setManualCopy(value); setFeedback(t('เลือกข้อความเพื่อคัดลอก', 'Select the text to copy it.')); }
  }
  const calendarHref = item.siteVisitAt ? 'solarmatch-calendar://visit?start=' + Math.floor(Date.parse(item.siteVisitAt) / 1000) : '';
  function downloadCalendar(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!item.siteVisitAt) { event.preventDefault(); return; }
    if (/SolarMatchInstallers\/(iOS|Android)/.test(navigator.userAgent)) return;
    event.preventDefault();
    const file = new Blob([calendarFile(item.siteVisitAt, item.id, en, Date.now())], {type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = 'SolarMatch-visit.ics';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  const call = (label: string, className = '') => hasPhone && <a className={className} href={disabled ? undefined : 'tel:' + phone} aria-disabled={disabled} onClick={e => { if (disabled) e.preventDefault(); else startCall(); }}><Phone aria-hidden="true" size={19}/>{label}</a>;
  const closeButton = <button type="button" onClick={() => changeFlow('close')}>{t('ปิดคำขอ…','Close enquiry…')}</button>;
  const active = (content: ReactNode, title: string, help?: string) => <div key={step} className="ns-content"><h2>{title}</h2>{help && <p>{help}</p>}{content}</div>;
  const quotedHelp = (amount: string, sent?: string) => amount
    ? t('ส่งใบเสนอราคา ' + amount + (sent ? ' เมื่อ ' + sent : ''), 'Quote of ' + amount + ' sent' + (sent ? ' ' + sent : '') + '.')
    : t('ส่งใบเสนอราคาแล้ว' + (sent ? ' เมื่อ ' + sent : ''), 'Quote sent' + (sent ? ' ' + sent : '') + '.');
  let content: ReactNode;
  if (step === 'calling') {
    content = active(<><div className="ns-choices">
      <button disabled={disabled} onClick={() => log('call-spoke', t('บันทึกว่าได้คุยแล้ว','Call recorded'))}><Check/>{t('ได้คุยแล้ว','Spoke with them')}</button>
      <button disabled={disabled} onClick={() => log('call-no-answer', t('บันทึกว่าไม่รับสาย','No answer recorded'), () => openText(true))}><PhoneMissed/>{t('ไม่รับสาย','No answer')}</button>
      <button disabled={disabled} onClick={() => log('call-wrong', t('บันทึกว่าเบอร์ผิด','Wrong number recorded'), onWrongNumber)}><PhoneOff/>{t('เบอร์ผิด','Wrong number')}</button>
    </div><div className="ns-links"><button onClick={() => {clearPendingCall(); changeFlow(null);}}>{t('ยังไม่ได้โทร','I didn’t call')}</button></div></>, t('ผลการโทรเป็นอย่างไร?','How did the call go?'), t('กำลังโทรหา ' + thaiPhone(phone) + ' วางสายแล้วกลับมาบันทึกผลที่นี่','Your phone is calling ' + thaiPhone(phone) + '. Come back here when you hang up.'));
  } else if (step === 'text') {
    content = active(<><label className="ns-field">{t('ข้อความ','Message')}<textarea rows={6} value={message} onChange={e => setMessage(e.target.value)} /></label><div className="ns-actions">
      <a className="ns-primary" href={disabled || !hasPhone ? undefined : 'sms:' + phone + '?body=' + encodeURIComponent(message)} aria-disabled={disabled || !hasPhone} onClick={e => { if (disabled || !hasPhone) e.preventDefault(); else log('text', t('เปิดแอปข้อความแล้ว','Opened Messages')); }}><MessageSquare/>{t('เปิดแอปข้อความ','Open Messages')}</a>
      <button onClick={() => void copy(message, t('คัดลอกข้อความแล้ว','Text copied'))}><Copy/>{t('คัดลอกข้อความ','Copy text')}</button></div><div className="ns-links"><button onClick={() => changeFlow(null)}>{attempted ? t('ข้าม','Skip') : t('ยกเลิก','Cancel')}</button></div></>,
      t('ส่ง SMS ถึง' + khun(firstName),'Text ' + firstName), attempted ? t('ไม่มีผู้รับสาย ส่งข้อความสั้น ๆ ให้' + khun(firstName) + 'รู้ว่าใครโทรมา จะได้รับสายครั้งต่อไป','No answer. A short text tells ' + firstName + ' who’s calling, so they pick up next time.') : t('ส่งจากโทรศัพท์ของคุณเอง แก้ไขข้อความได้ก่อนส่ง','Sent from your own phone. Edit it before you send.'));
  } else if (step === 'visit' || step === 'contacted') {
    content = active(<VisitForm en={en} disabled={disabled} saved={item.siteVisitAt} now={now} onCancel={() => changeFlow(null)} onQuote={() => changeFlow('quote')} onClose={() => changeFlow('close')} onSave={siteVisitAt => void save({action:'report-outcome',deliveryId:item.id,outcome:'site_visit',revision,siteVisitAt}, t('บันทึกนัดหมายแล้ว','Visit booked'))}/>,
      t('นัดสำรวจหน้างาน','Book a site visit'), t('เลือกวันและเวลาที่ตกลงกับ' + khun(firstName),'Pick the day and time you agreed with ' + firstName + '.'));
  } else if (step === 'site_visit') {
    const future = item.siteVisitAt && Date.parse(item.siteVisitAt) >= now;
    content = active(<><div className="ns-actions"><button disabled={disabled} className="ns-primary" onClick={() => changeFlow('quote')}>{t('ส่งใบเสนอราคาแล้ว','Quote sent')}</button>
      {item.siteVisitAt && <a href={calendarHref} onClick={downloadCalendar}><CalendarDays/>{t('เพิ่มลงปฏิทิน','Add to calendar')}</a>}
      <button disabled={disabled} onClick={onTechnician}><Users/>{t('ส่งให้ช่าง','Send to a technician')}</button></div><div className="ns-links"><button onClick={() => changeFlow('visit')}>{item.siteVisitAt ? t('เปลี่ยนเวลานัด','Change visit time') : t('เพิ่มวันและเวลา','Add the day and time')}</button>{closeButton}</div></>,
      item.siteVisitAt ? t('นัดสำรวจ ' + localizedTime(item.siteVisitAt,en),'Visit on ' + localizedTime(item.siteVisitAt,en)) : t('นัดสำรวจแล้ว','Site visit booked'), future ? t('เพิ่มนัดหมายในปฏิทินและส่งรายละเอียดให้ทีมงาน','Add it to your calendar and send the details to your technician.') : t('หากสำรวจแล้ว บันทึกใบเสนอราคาเมื่อส่งให้ลูกค้า','Visit done? Record the quote when you send it.'));
  } else if (step === 'quote') {
    content = active(<QuoteForm en={en} disabled={disabled} amount={item.quoteAmountThb} estimate={item.estimate?.installedCostThb} onCancel={() => changeFlow(null)} onSave={quoteAmountThb => void save({action:'report-outcome',deliveryId:item.id,outcome:'quoted',revision,quoteAmountThb}, t('บันทึกใบเสนอราคาแล้ว','Quote recorded'))}/>,
      t('บันทึกใบเสนอราคา','Record the quote'), t('เพิ่มยอดเพื่อดูมูลค่างานที่อยู่ระหว่างติดตาม','Adding the amount shows what’s in your pipeline.'));
  } else if (step === 'quoted') {
    const amount = item.quoteAmountThb == null ? '' : '฿' + item.quoteAmountThb.toLocaleString(en ? 'en-GB' : 'th-TH');
    content = active(<div className="ns-actions"><button disabled={disabled} className="ns-primary" onClick={() => report('won', t('บันทึกว่าตกลงซื้อแล้ว','Marked as won'))}><Check/>{t('ตกลงซื้อแล้ว','They agreed')}</button><button disabled={disabled} onClick={() => changeFlow('close')}>{t('ยังไม่ตกลง','Not this time')}</button></div>,
      t('รอ' + khun(firstName) + ' ตัดสินใจ','Waiting for ' + firstName + '’s decision'), quotedHelp(amount, latestStage && localizedDate(latestStage.at,en)));
  } else if (step === 'close') {
    content = active(<CloseForm en={en} disabled={disabled} onCancel={() => changeFlow(null)} onSave={closeReason => void save({action:'report-outcome',deliveryId:item.id,outcome:closeReason === 'not-suitable' ? 'not-suitable' : 'lost',closeReason,revision}, t('ปิดคำขอแล้ว','Enquiry closed'))}/>, t('เหตุผลที่ปิดคำขอ','Why is it closing?'), t('เฉพาะทีมงานของคุณเท่านั้นที่เห็น','Only your team sees this.'));
  } else if (closed) {
    content = active(<div className="ns-links"><button disabled={disabled} onClick={() => report(item.reopenOutcome || (item.quoteAmountThb != null ? 'quoted' : item.siteVisitAt ? 'site_visit' : 'open'), t('เปิดคำขออีกครั้งแล้ว','Enquiry reopened'))}>{t('เปิดคำขออีกครั้ง','Reopen')}</button></div>,
      stage === 'won' ? t('ตกลงซื้อแล้ว','Sale agreed') : t('ปิดคำขอแล้ว','Closed') + ' · ' + (stage === 'not-suitable' ? t('ไม่เหมาะสม','Not suitable') : t('ไม่ได้งาน','Lost')),
      stage === 'won' ? latestStage && t('บันทึกว่าตกลงซื้อเมื่อ ' + localizedDate(latestStage.at,en),'Marked as won ' + localizedDate(latestStage.at,en) + '.') : problemReason && t('เหตุผล: ' + problemReason[1],'Reason: ' + problemReason[2]));
  } else {
    const others = recipientLimit === undefined ? null : Math.max(0,recipientLimit - 1);
    let help = others ? t(`อาจมีบริษัทอื่นโทรหาอีกไม่เกิน ${others} แห่ง โทรแนะนำตัวและสอบถามความต้องการของเจ้าของบ้าน`,`Up to ${others} other companies may call too. Introduce yourself and ask what the homeowner needs.`) : t('ติดต่อเจ้าของบ้านเพื่อพูดคุยเกี่ยวกับโครงการ','Contact the homeowner to discuss their project.');
    if (priorCalls.length) help = t(`โทรแล้ว ${priorCalls.length} ครั้ง · ล่าสุด ${localizedTime(priorCalls[0].at,en,false)} ไม่มีผู้รับสาย`,`Called ${priorCalls.length}× · last at ${localizedTime(priorCalls[0].at,en,false)}, no answer. Try again or send a text.`);
    content = active(<><div className="ns-actions">{call(t('โทร ','Call ') + thaiPhone(phone),'ns-primary')}{hasPhone && <><button disabled={disabled} onClick={() => openText(priorCalls.length > 0)}><MessageSquare/>{t('ส่ง SMS ก่อน','Text first')}</button><button className="ns-square" disabled={disabled} aria-label={t('คัดลอกเบอร์','Copy number')} onClick={() => void copy(item.phone,t('คัดลอกเบอร์แล้ว','Number copied'))}><Copy/></button></>}</div><div className="ns-links">{closeButton}</div></>,
      hasPhone ? t('โทรหา' + khun(firstName),'Call ' + firstName) : t('ติดตามคำขอ','Follow up on this enquiry'), hasPhone ? help : t('ไม่มีหมายเลขโทรศัพท์สำหรับคำขอนี้','No phone number is available for this enquiry.'));
  }
  return <>{hasPhone && !closed && stage !== 'open' && <div className="ns-desktop-contact">{call(t('โทร','Call'))}<button disabled={disabled} onClick={() => openText(false)}><MessageSquare/>{t('ส่ง SMS','Text')}</button><button disabled={disabled} onClick={() => void copy(item.phone,t('คัดลอกเบอร์แล้ว','Number copied'))}><Copy/>{t('คัดลอกเบอร์','Copy number')}</button></div>}
    <section className="ns-card" tabIndex={-1} ref={card} aria-label={t('ขั้นต่อไป','Next step')}>
      <div className="ns-eyebrow">{t('ขั้นต่อไป','Next step')}</div>{content}
      {error && <p className="ns-error" role="alert">{error}</p>}
      <div className={'ns-track' + (closed && stage !== 'won' ? ' is-closed' : '')} role="group" aria-label={t('ขั้นตอนการติดตาม','Enquiry stages')}>
        {stages.map(([id, th, english], i) => <button key={id} disabled={disabled || stage === id} aria-current={stage === id ? 'step' : undefined} aria-label={t('เปลี่ยนเป็น' + th,'Move to ' + english)} data-state={i < currentIndex || stage === 'won' ? 'done' : i === currentIndex ? 'current' : 'next'} onClick={() => report(id, t('เปลี่ยนเป็น' + th,'Moved to ' + english))}><span>{i < currentIndex || stage === 'won' ? <Check size={15}/> : <i/>}</span>{en ? english : th}</button>)}
      </div>
      {group !== 'waiting' && nextWaiting}
      {manualCopy && <textarea aria-label={t('ข้อความสำหรับคัดลอก','Text to copy')} readOnly value={manualCopy} onFocus={e => e.currentTarget.select()}/>}
      {feedback && !undo && <p role="status">{feedback}</p>}
    </section>
    {undo && <div className="ns-toast" role="status"><span>{undo.label}</span><button disabled={disabled} onClick={() => void undoLast()}>{t('เลิกทำ','Undo')}</button></div>}
    {hasPhone && !closed && <aside className="ns-dock" aria-label={t('ติดต่อเจ้าของบ้าน','Contact homeowner')}>{call(t('โทรหา' + khun(firstName),'Call ' + firstName),'ns-primary')}<button aria-label={t('ส่ง SMS','Text homeowner')} disabled={disabled} onClick={() => openText(false)}><MessageSquare/></button></aside>}
  </>;
}
