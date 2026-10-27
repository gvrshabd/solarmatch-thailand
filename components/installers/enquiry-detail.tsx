'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, Clock, Copy, Phone } from 'lucide-react';
import type { InstallerDelivery } from '@/lib/installer/portal-contract';
import { assessmentRows } from '@/lib/installer/assessment-display';
import { deliveryLocation, thaiPhone } from '@/lib/installer/presentation';
import { waitingTime } from './workspace';
import type { InstallerAction, NotesNavigationGuard } from './action-result';
import { clearInstallerNotesDrafts, installerNotesEditor } from './team-notes';

// Signal Thai copy is a draft and needs native review. Legal paragraphs remain unchanged.
export function EnquiryDetail({ item, en, busy, action, share, clearShare, now, tab, recipientLimit, claimSubmitted = false, emailVerified = true, canManage = true, companyId = '', registerNotesGuard }: {
  item: InstallerDelivery; en: boolean; busy: boolean; action: InstallerAction;
  share: string; clearShare: () => void; now: number; companyId?: string;
  tab?: 'waiting' | 'active' | 'closed'; recipientLimit?: number; claimSubmitted?: boolean;
  emailVerified?: boolean; canManage?: boolean; registerNotesGuard?: (guard: NotesNavigationGuard) => () => void;
}) {
  const t = (th: string, english: string) => en ? english : th;
  const router = useRouter();
  const disabled = busy || !emailVerified || !canManage;
  const notesKey = JSON.stringify([companyId, item.id]);
  const [editor] = useState(() => installerNotesEditor(notesKey, {text: item.withdrawn ? '' : item.teamNotes || '', revision: item.notesRevision ?? 0}, (notes, revision) => action({action: 'save-team-notes', deliveryId: item.id, notes, revision})));
  const notes = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const [copyStatus, setCopyStatus] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const [shareCopyStatus, setShareCopyStatus] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const closeMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    editor.configure((text, revision) => item.withdrawn || !emailVerified || !canManage
      ? Promise.resolve({ok: false, message: en ? 'Notes are unavailable.' : 'ไม่สามารถใช้บันทึกได้'})
      : action({action: 'save-team-notes', deliveryId: item.id, notes: text, revision}));
  }, [action, canManage, editor, emailVerified, en, item.id, item.withdrawn]);
  useEffect(() => {
    if (item.withdrawn) { clearInstallerNotesDrafts(notesKey); clearShare(); }
    else editor.receive(item.teamNotes || '', item.notesRevision ?? 0);
  }, [clearShare, editor, item.notesRevision, item.teamNotes, item.withdrawn, notesKey]);
  useEffect(() => { heading.current?.focus(); }, [item.id, item.withdrawn]);
  useEffect(() => registerNotesGuard?.(() => item.withdrawn ? Promise.resolve(true) : editor.flush()), [editor, item.withdrawn, registerNotesGuard]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (editor.getSnapshot().dirty && !item.withdrawn) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [editor, item.withdrawn]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && closeMenu.current?.open) { closeMenu.current.open = false; closeMenu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, []);
  const fmt = (value: string) => { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toLocaleString(en ? 'en-GB' : 'th-TH', {timeZone: 'Asia/Bangkok', dateStyle: 'medium', timeStyle: 'short'}) : '—'; };
  const stages = [
    {value: 'open', key: 'new', th: 'ใหม่', en: 'New'},
    {value: 'contacted', key: 'contacted', th: 'ติดต่อแล้ว', en: 'Contacted'},
    {value: 'site_visit', key: 'visit', th: 'สำรวจ', en: 'Site visit'},
    {value: 'quoted', key: 'quoted', th: 'เสนอราคา', en: 'Quoted'},
    {value: 'won', key: 'won', th: 'ตกลงซื้อ', en: 'Won'},
  ];
  const current = !item.outcome || item.outcome === 'not-recorded' ? 'open' : item.outcome;
  const closed = ['won', 'lost', 'not-suitable', 'not-interested'].includes(current);
  const lost = closed && current !== 'won';
  const index = closed ? 4 : Math.max(0, stages.findIndex(stage => stage.value === current));
  const currentStage = stages.find(stage => stage.value === current);
  const stageName = currentStage ? t(currentStage.th, currentStage.en) : current === 'lost' ? t('ไม่ได้งาน', 'Lost') : current === 'not-interested' ? t('ไม่สนใจ', 'Not interested') : current === 'unreachable' ? t('ติดต่อไม่ได้', 'Unreachable') : t('ไม่เหมาะสม', 'Not suitable');
  const groupTab = closed || item.withdrawn ? 'closed' : current === 'open' ? 'waiting' : 'active';
  const backHref = `/installers?view=inbox&tab=${tab || groupTab}&lang=${en ? 'en' : 'th'}`;
  const rows = assessmentRows(item.assessment, en);
  const factKeys = [item.assessment.billInputStatus === 'not-supplied' ? 'monthlyConsumptionKwh' : 'monthlyBillThb', 'airConditionerCount', 'ownershipStatus', 'planningTimeframe'];
  const factLabels = [item.assessment.billInputStatus === 'not-supplied' ? t('หน่วยไฟต่อเดือน', 'monthly use') : t('ค่าไฟต่อเดือน', 'monthly bill'), t('เครื่องปรับอากาศ', 'air-conditioners'), t('ความเป็นเจ้าของ', 'ownership'), t('ช่วงเวลาติดตั้ง', 'timeframe')];
  const claimOpen = Number.isFinite(new Date(item.claimDeadline).getTime()) && now <= new Date(item.claimDeadline).getTime();
  const copyPhone = async () => {
    if (disabled) return;
    try { await navigator.clipboard.writeText(item.phone); setCopyStatus(t('คัดลอกเบอร์แล้ว', 'Number copied')); setManualCopy(false); }
    catch { setManualCopy(true); setCopyStatus(t('คัดลอกอัตโนมัติไม่ได้ เลือกหมายเลขเพื่อคัดลอกเอง', 'Automatic copy failed. Select the number to copy manually.')); }
  };
  const setStage = async (outcome: string) => {
    if (disabled) return;
    if (closeMenu.current) closeMenu.current.open = false;
    await action({action: 'report-outcome', deliveryId: item.id, outcome});
  };
  const claimDisclosure = <details className="disc"><summary>{t('คำขอมีปัญหาหรือไม่?', 'Problem with this enquiry?')}</summary><div className="in">
    <p>{t('ยื่นได้ถึง', 'Submit by')} {fmt(item.claimDeadline)}. {t('การไม่รับสายหรือไม่ซื้อ ไม่ถือเป็นคำขอที่ไม่ถูกต้องโดยอัตโนมัติ', 'No answer or no purchase does not automatically make an enquiry invalid.')}</p>
    {claimSubmitted ? <p className="pill ok"><Check size={16} aria-hidden="true"/>{t('ส่งคำร้องแล้ว', 'Claim submitted')}</p> : claimOpen ? <form className="claimf" onSubmit={event => {
      event.preventDefault(); if (disabled) return;
      const form = new FormData(event.currentTarget);
      void action({action: 'create-claim', deliveryId: item.id, reason: String(form.get('reason')), notes: String(form.get('notes'))});
    }}><div className="field"><label htmlFor={`claim-reason-${item.id}`}>{t('เหตุผล', 'Reason')}</label><select id={`claim-reason-${item.id}`} name="reason" disabled={disabled}>{[['incorrect-contact', 'ข้อมูลติดต่อไม่ถูกต้อง', 'Incorrect contact details'], ['duplicate', 'คำขอซ้ำ', 'Duplicate'], ['outside-criteria', 'นอกเกณฑ์', 'Outside agreed criteria'], ['no-request', 'ไม่ได้ขอให้ติดต่อ', 'No contact request'], ['withdrawn', 'ถอนคำขอแล้ว', 'Withdrawn']].map(([value, th, english]) => <option key={value} value={value}>{t(th, english)}</option>)}</select></div>
      <div className="field"><label htmlFor={`claim-notes-${item.id}`}>{t('ข้อมูลสนับสนุน', 'Supporting information')}</label><textarea className="ta" id={`claim-notes-${item.id}`} name="notes" required maxLength={2000} disabled={disabled}/></div><button className="btn ghost sm" disabled={disabled}>{t('ส่งคำร้อง', 'Submit claim')}</button></form>
      : <p>{t('พ้นกำหนดยื่นคำร้องสำหรับคำขอนี้แล้ว', 'The claim submission window has closed for this enquiry.')}</p>}
  </div></details>;
  const noteStatus = !emailVerified ? t('ยืนยันอีเมลเพื่อแก้ไขบันทึก', 'Verify your email to edit notes.')
    : notes.status === 'saving' ? t('กำลังบันทึก…', 'Saving…')
    : notes.status === 'conflict' ? notes.message || t('โน้ตถูกแก้ไขจากที่อื่นหรือคำขอไม่พร้อมใช้งาน ข้อความที่คุณแก้ยังอยู่ โปรดโหลดใหม่ก่อนแทนที่โน้ตฉบับใหม่', 'The note changed elsewhere or the enquiry is unavailable. Your edit is still here; reload before replacing a newer note.')
    : notes.status === 'error' ? notes.message
    : notes.dirty ? t('ยังไม่บันทึก', 'Unsaved changes')
    : notes.status === 'saved' && notes.savedAt ? t('บันทึกแล้ว ', 'Saved ') + new Date(notes.savedAt).toLocaleTimeString(en ? 'en-GB' : 'th-TH', {timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false})
    : t('บันทึกอัตโนมัติ', 'Saved automatically.');
  return <section className="a-detail" aria-label={item.withdrawn ? item.reference : item.homeownerName.trim() || item.reference}>
    <div className="dtop"><a className="back" href={backHref} onClick={event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.withdrawn) return;
      event.preventDefault(); void editor.flush().then(ok => { if (ok) router.push(backHref); });
    }}><ArrowLeft size={18} aria-hidden="true"/>{t('คำขอ', 'Enquiries')}</a><span className="ref">{item.reference}</span></div>
    {item.withdrawn ? <><div className="card wdcard"><h1 ref={heading} id="installer-page-title" tabIndex={-1}>{t('ถอนสิทธิ์แล้ว', 'Access withdrawn')}</h1><p className="muted" role="status">{t('ถอนหรือระงับสิทธิ์เข้าถึงข้อมูลแล้ว ห้ามติดต่อเจ้าของบ้านจากคำขอนี้ ข้อมูลส่วนบุคคลและลิงก์ทีมงานไม่พร้อมใช้งาน บันทึกการคิดเครดิตยังคงอยู่ และสามารถยื่นคำร้องได้ภายในกำหนดเดิม', 'Access withdrawn or suppressed. Do not contact the homeowner about this enquiry. Personal details and staff links are unavailable. The financial record remains, and eligible claims can be submitted within the original deadline.')}</p></div><div className="card discs">{claimDisclosure}</div></> : <>
      <div className="dperson"><span className="av lg" aria-hidden="true">{Array.from(item.homeownerName)[0] || '—'}</span><div><h1 ref={heading} id="installer-page-title" tabIndex={-1}>{item.homeownerName.trim() || item.reference}</h1><p>{deliveryLocation(item, en)}{item.phone && <span className="ph-only"> · <span className="num">{thaiPhone(item.phone)}</span></span>}</p></div><span className="wait"><Clock size={15} aria-hidden="true"/>{current === 'open' ? t('รอมาแล้ว ', 'Waiting ') : t('ได้รับเมื่อ ', 'Received ')}{waitingTime(item.deliveredAt, en, now)}{current !== 'open' && t('ที่แล้ว', ' ago')}</span></div>
      {item.phone && <div className="dact"><a className="btn primary lg" href={'tel:' + item.phone.replace(/\s/g, '')} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} onClick={event => { if (disabled) event.preventDefault(); }}><Phone size={18} aria-hidden="true"/><span className="num">{thaiPhone(item.phone)}</span></a><button type="button" className="btn soft lg" disabled={disabled} onClick={() => void copyPhone()}><Copy size={18} aria-hidden="true"/>{t('คัดลอก', 'Copy')}</button></div>}
      {copyStatus && <div className="manual"><p className="note" role="status">{copyStatus}</p>{manualCopy && <input className="tx" aria-label={t('หมายเลขสำหรับคัดลอก', 'Number to copy')} readOnly value={item.phone} onFocus={event => event.target.select()}/>}</div>}
      <div className="facts4">{factKeys.map((key, idx) => <div key={key}><b className={key === 'monthlyConsumptionKwh' ? 'kwh' : undefined}>{rows.find(row => row.key === key)?.value || t('ไม่ได้ระบุ', 'Not specified')}</b><span>{factLabels[idx]}</span></div>)}</div>
      <div className="card"><div className="prog"><div className="prog-top"><h2 className="h3">{t('ความคืบหน้า', 'Progress')}</h2><span className={'pill st-' + (lost ? current === 'lost' ? 'lost' : 'notsuitable' : currentStage?.key || 'contacted')}>{stageName}</span></div>
        <div className="segbar" aria-hidden="true">{stages.map((stage, idx) => <i key={stage.value} className={idx <= index ? lost ? 'lost' : 'on' : ''}/>)}</div>
        <div className="seglabels" role="group" aria-label={t('เลือกขั้นตอน', 'Set the stage')}>{stages.map(stage => <button key={stage.value} type="button" aria-pressed={current === stage.value} disabled={disabled} onClick={() => void setStage(stage.value)}>{t(stage.th, stage.en)}</button>)}</div>
        {closed ? <p className="closed-line">{current === 'won' ? t('ตกลงซื้อแล้ว แตะขั้นตอนด้านบนเพื่อเปลี่ยน', 'Sale agreed. Tap a stage to change it.') : t(`ปิดเป็น “${stageName}” แตะขั้นตอนด้านบนเพื่อเปิดอีกครั้ง`, `Closed as “${stageName}”. Tap a stage to reopen.`)}</p> : <div className="prog-act"><button className="btn primary" type="button" disabled={disabled} onClick={() => void setStage(stages[Math.min(index + 1, 4)].value)}>{[t('บันทึกว่าติดต่อแล้ว', 'Mark as contacted'), t('นัดสำรวจหน้างานแล้ว', 'Site visit booked'), t('ส่งใบเสนอราคาแล้ว', 'Quote sent'), t('บันทึกว่าตกลงซื้อ', 'Mark as won')][Math.min(index, 3)]}</button><details ref={closeMenu} className="menu"><summary className="btn ghost" aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }}>{t('ปิดคำขอ', 'Close')}<ChevronDown size={16} aria-hidden="true"/></summary><div className="pop" role="group" aria-label={t('ปิดคำขอเป็น', 'Close as')}><button type="button" disabled={disabled} onClick={() => void setStage('lost')}>{t('ไม่ได้งาน', 'Lost')}</button><button type="button" disabled={disabled} onClick={() => void setStage('not-suitable')}>{t('ไม่เหมาะสม', 'Not suitable')}</button></div></details></div>}
      </div></div>
      <div className="card"><div className="field"><label htmlFor={`team-notes-${item.id}`}>{t('บันทึกสำหรับทีม', 'Notes for your team')}</label><textarea id={`team-notes-${item.id}`} className="ta" value={notes.text} maxLength={2000} disabled={disabled} aria-describedby={`notes-status-${item.id}`} onChange={event => editor.edit(event.target.value)} onBlur={() => { if (!disabled) void editor.flush(); }} placeholder={t('บันทึกเฉพาะข้อมูลที่จำเป็นต่อคำขอนี้', 'Only record information necessary for this enquiry')}/><span className="hint" id={`notes-status-${item.id}`} role="status">{noteStatus}</span>{['error', 'conflict'].includes(notes.status) && <button className="btn ghost sm" type="button" disabled={disabled} onClick={() => void editor.retry()}>{t('ลองบันทึกอีกครั้ง', 'Retry saving')}</button>}</div></div>
      <div className="card discs"><details className="disc"><summary>{t('ข้อมูลเพิ่มเติมเกี่ยวกับบ้าน', 'More about the home')}</summary><div className="kv">{rows.filter(row => !factKeys.includes(row.key)).map(row => <div key={row.key}><span>{row.label}</span><b>{row.value}</b></div>)}</div></details>
        <details className="disc"><summary>{t('แชร์กับทีมงาน', 'Share with a team member')}</summary><div className="in"><p>{t('ผู้ที่ได้รับลิงก์สามารถอ่านข้อมูลคำขอนี้ได้ ใช้สำหรับพนักงานที่ดูแลคำขอของบริษัทเท่านั้น ลิงก์ไม่ได้ยืนยันตัวตนผู้เปิดและสามารถส่งต่อได้', 'Anyone with the link can read this enquiry. Forward only to staff handling it for your company. It does not verify the viewer’s identity and can be forwarded again.')}</p>
          {share ? <><div className="share-out"><label className="hint" htmlFor={`share-link-${item.id}`}>{t('ลิงก์สำหรับทีมงาน', 'Staff access link')}</label><div className="row2"><input className="tx" id={`share-link-${item.id}`} readOnly value={share} onFocus={event => event.target.select()}/><button className="btn soft sm" type="button" onClick={async () => { try { await navigator.clipboard.writeText(share); setShareCopyStatus(t('คัดลอกลิงก์แล้ว', 'Link copied')); } catch { setShareCopyStatus(t('เลือกลิงก์เพื่อคัดลอกเอง', 'Select the link to copy it manually.')); } }}><Copy size={16} aria-hidden="true"/>{t('คัดลอกลิงก์', 'Copy link')}</button></div>{shareCopyStatus && <p className="hint" role="status">{shareCopyStatus}</p>}</div><div className="btnrow"><button className="btn ghost sm" type="button" disabled={disabled} onClick={() => void action({action: 'rotate-share-link', deliveryId: item.id})}>{t('สร้างลิงก์ใหม่', 'Create replacement link')}</button><button className="btn ghost sm" type="button" disabled={disabled} onClick={async () => { const result = await action({action: 'revoke-share-link', deliveryId: item.id}); if (result.ok) { clearShare(); setShareCopyStatus(''); } }}>{t('เพิกถอนลิงก์', 'Revoke link')}</button></div></> : <button className="btn soft sm" type="button" disabled={disabled} onClick={() => void action({action: 'rotate-share-link', deliveryId: item.id})}>{t('สร้างลิงก์', 'Create link')}</button>}
        </div></details>{claimDisclosure}</div>
      {item.phone && <div className="mcall"><a className="btn primary lg" href={'tel:' + item.phone.replace(/\s/g, '')} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} onClick={event => { if (disabled) event.preventDefault(); }}><Phone size={18} aria-hidden="true"/>{t('โทรหา ', 'Call ') + (item.homeownerName.trim() || item.reference)}</a><button className="btn soft lg" type="button" aria-label={t('คัดลอก', 'Copy')} disabled={disabled} onClick={() => void copyPhone()}><Copy size={18} aria-hidden="true"/></button></div>}
    </>}
    <p className="meta">{t('พร้อมใช้ในพอร์ทัล ', 'Available in portal ')}{fmt(item.deliveredAt)} · {item.fundingSource === 'trial' ? t('ทดลองฟรี', 'Free trial') : `${item.creditCost} ${t('เครดิต', 'credits')}`} · {t(`อาจมีบริษัทอื่นติดต่ออีกไม่เกิน ${recipientLimit === undefined ? '—' : Math.max(0, recipientLimit - 1)} แห่ง`, `up to ${recipientLimit === undefined ? '—' : Math.max(0, recipientLimit - 1)} other companies may also call`)}</p>
  </section>;
}
