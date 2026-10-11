'use client';
import {useState} from 'react';
import type {CampaignReport} from '@/lib/analytics/campaign-report';
import type {ShutdownLiabilityReport} from '@/lib/installer/shutdown-liabilities';

type Row=Record<string,unknown>;
const display=(value:unknown)=>value==null?'—':typeof value==='object'?JSON.stringify(value):String(value);
const thb=(minor:number)=>new Intl.NumberFormat('en',{style:'currency',currency:'THB'}).format(minor/100);
export function InstallerReadinessPanel({csrfToken,operations,preflight,refresh}:{csrfToken:string;operations?:Row;preflight?:Row;refresh:()=>Promise<void>}){
  const [thai,setThai]=useState(false);
  const t=(en:string,th:string)=>thai?th:en;
  const [fromDay,setFromDay]=useState(()=>new Date(Date.now()+7*3600000).toISOString().slice(0,10));
  const [toDay,setToDay]=useState(fromDay),[mode,setMode]=useState('production');
  const [campaign,setCampaign]=useState<CampaignReport|null>(null),[shutdown,setShutdown]=useState<ShutdownLiabilityReport|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  function reportUrl(kind:'campaign'|'shutdown',csv=false){return '/admin/api/installer-platform?'+new URLSearchParams({report:kind,...(kind==='campaign'?{fromDay,toDay,submissionMode:mode}:{}),...(csv?{format:'csv'}:{})});}
  async function report(kind:'campaign'|'shutdown'){
    if(busy)return;setBusy(true);setError('');
    try{const response=await fetch(reportUrl(kind),{cache:'no-store'});if(!response.ok)throw new Error('Report unavailable; check the date range and migrated local schema.');
      const result=await response.json();if(kind==='campaign')setCampaign(result as CampaignReport);else setShutdown(result as ShutdownLiabilityReport);
    }catch(caught){setError(caught instanceof Error?caught.message:'Report unavailable.');}finally{setBusy(false);}
  }
  async function operation(action:'capture-alerts'|'ack-operation-alert',alertId?:string){
    if(busy)return;setBusy(true);setError('');
    try{const response=await fetch('/admin/api/installer-platform',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrfToken},body:JSON.stringify({action,alertId})});
      if(!response.ok)throw new Error('Health operation refused.');await refresh();
    }catch(caught){setError(caught instanceof Error?caught.message:'Operation refused.');}finally{setBusy(false);}
  }
  const alerts=(operations?.alerts as {recent?:Row[]}|undefined)?.recent??[];
  return <section className="installer-readiness-panel" aria-label="Launch preparation and reports">
    <label>{t('Report language','ภาษาของรายงาน')}<select value={thai?'th':'en'} onChange={event=>setThai(event.target.value==='th')}><option value="en">English</option><option value="th">ไทย</option></select></label>
    {error&&<p className="admin-alert error" role="alert">{error}</p>}
    <h3>{t('Operational readiness','ความพร้อมในการดำเนินงาน')}</h3>
    <p>{t('These checks do not establish provider delivery, legal approval or launch readiness. Alerts are local records only; no external alert is sent.','การตรวจสอบนี้ไม่ใช่การยืนยันการส่งจากผู้ให้บริการ การอนุมัติทางกฎหมาย หรือความพร้อมเปิดใช้งานจริง การแจ้งเตือนบันทึกไว้ในระบบทดสอบเท่านั้น ไม่มีการส่งออกไปภายนอก')}</p>
    <dl>{['scheduler','queue','notificationProblems','reconciliationTasks'].map(key=><div key={key}><dt>{key}</dt><dd>{display(operations?.[key])}</dd></div>)}</dl>
    <details><summary>{t('Configuration preflight (names only)','ตรวจสอบการตั้งค่าก่อนใช้งาน (แสดงเฉพาะชื่อ)')}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(preflight??{},null,2)}</pre></details>
    <button type="button" className="admin-button secondary" disabled={busy||!csrfToken} onClick={()=>void operation('capture-alerts')}>{t('Capture / resolve local health alerts','บันทึก / ตรวจสอบสถานะการแจ้งเตือนในระบบทดสอบ')}</button>
    <ul>{alerts.map(alert=><li key={String(alert.id)}>{display(alert.code)} · {display(alert.status)} · {display(alert.counts_json)} {alert.status==='open'&&<button className="admin-button secondary" type="button" disabled={busy||!csrfToken} onClick={()=>void operation('ack-operation-alert',String(alert.id))}>Acknowledge {display(alert.code)}</button>}</li>)}</ul>
    <h3>{t('Campaign acquisition report','รายงานคำขอจากแคมเปญ')}</h3>
    <p>{t('Aggregate safe campaign codes only. Incoming requests include rejected, unsold and unattributed requests. Trial deliveries and credit purchases are not earned service fees.','สรุปเฉพาะรหัสแคมเปญที่กำหนดไว้ คำขอทั้งหมดรวมคำขอที่ไม่ผ่านเกณฑ์ ยังไม่มีผู้รับ และไม่ทราบแหล่งที่มา การส่งคำขอทดลองและการซื้อเครดิตไม่ถือเป็นรายได้ค่าบริการที่เกิดขึ้นแล้ว')}</p>
    <div className="admin-media-form"><label>{t('From Bangkok day','เริ่มวันที่ (เวลากรุงเทพฯ)')}<input type="date" value={fromDay} onChange={event=>{setFromDay(event.target.value);setCampaign(null);}}/></label><label>{t('Through Bangkok day','ถึงวันที่ (เวลากรุงเทพฯ)')}<input type="date" value={toDay} onChange={event=>{setToDay(event.target.value);setCampaign(null);}}/></label>
      <label>{t('Submission environment','สภาพแวดล้อมของคำขอ')}<select value={mode} onChange={event=>{setMode(event.target.value);setCampaign(null);}}>{['production','sandbox','local-test','restricted-preview'].map(value=><option key={value}>{value}</option>)}</select></label>
      <button type="button" className="admin-button" disabled={busy} onClick={()=>void report('campaign')}>{t('Load campaign report','แสดงรายงานแคมเปญ')}</button>
    </div>
    {campaign&&<><p>{campaign.basis}</p><p>{campaign.qualificationBasis}</p><p>{campaign.unsoldBasis}</p><p>{campaign.estimateNotice}</p>
      <p>Estimated contribution: {thb(campaign.totals.estimatedContributionMinor)}. All-environment unallocated legacy ad spend: {thb(campaign.unallocatedAllEnvironments.legacyAdSpendMinor)}; payment-reversal credits: {campaign.unallocatedAllEnvironments.paymentReversalCredits}. These unallocated amounts are excluded.</p>
      {thai&&<p>จำนวนคำขอนับตามวันที่ส่ง ส่วนการส่งให้ผู้รับและการคืนเครดิตนับตามวันที่เกิดรายการ เวลากรุงเทพฯ ผลต่างโดยประมาณไม่ใช่กำไรหรือเงินที่ธนาคารยืนยันแล้ว ยังไม่รวมต้นทุนผู้ให้บริการ SMS LINE โฮสติ้ง ภาษี และค่าใช้จ่ายดำเนินงาน ข้อมูลเก่าที่ไม่ทราบเกณฑ์จะไม่ถูกคาดเดาใหม่</p>}
      <a className="admin-button secondary" href={reportUrl('campaign',true)}>{t('Export campaign CSV','ส่งออกรายงานแคมเปญ CSV')}</a>
      <div style={{overflowX:'auto'}} role="region" aria-label="Campaign report table" tabIndex={0}><table className="admin-table"><thead><tr>{['Day','Campaign','Requests','Qualified','Rejected','Unknown qualification','Unsold','Unattributed','Paid deliveries','Trials','Credit restorations','Ad spend','Estimated contribution'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{campaign.rows.map(row=><tr key={`${row.day}:${row.campaignCode}`}><td>{row.day}</td><td>{row.campaignCode}</td><td>{row.incomingRequests}</td><td>{row.qualifiedEnquiries}</td><td>{row.rejectedRequests}</td><td>{row.qualificationUnknownRequests}</td><td>{row.unsoldEnquiries}</td><td>{row.unattributedRequests}</td><td>{row.paidDeliveries}</td><td>{row.trialDeliveries}</td><td>{row.claimRestoredPurchasedCredits}</td><td>{thb(row.adSpendMinor)}</td><td>{thb(row.estimatedContributionMinor)}</td></tr>)}</tbody></table></div>{!campaign.rows.length&&<p>No submissions or spend in this period and environment.</p>}</>}
    <h3>{t('Shutdown purchased-credit liability review','ตรวจสอบภาระคืนเงินเครดิตที่ซื้อเมื่อยุติบริการ')}</h3>
    <p>{t('Read-only historical-price calculation, not refund approval or proof that money was returned. Trial, promotional, synthetic, debt and unresolved funding require separate review. No refund action is available here.','คำนวณเพื่อการตรวจสอบจากราคาที่ซื้อจริงในอดีตเท่านั้น ไม่ใช่การอนุมัติคืนเงินหรือหลักฐานว่าคืนเงินแล้ว เครดิตทดลอง โปรโมชั่น ข้อมูลจำลอง หนี้ และแหล่งเครดิตที่ยังไม่ชัดเจนต้องตรวจสอบแยก ไม่มีคำสั่งคืนเงินในหน้านี้')}</p>
    <button type="button" className="admin-button secondary" disabled={busy} onClick={()=>void report('shutdown')}>{t('Calculate review snapshot','คำนวณข้อมูลเพื่อการตรวจสอบ')}</button>
    {shutdown&&<><p>{t('Snapshot generated','เวลาคำนวณ')}: {shutdown.generatedAt}. {t('CSV export calculates a fresh snapshot; compare its timestamp.','การส่งออก CSV จะคำนวณข้อมูลใหม่ โปรดตรวจสอบเวลาในไฟล์')}{!shutdown.totals.complete&&t(' Incomplete subtotal: unresolved companies are excluded.',' ยอดรวมยังไม่ครบ โดยไม่รวมบริษัทที่ยังต้องตรวจสอบ')}</p><p>Recorded live candidate: {thb(shutdown.totals.calculatedLiveLiabilityMinor)} · synthetic candidate: {thb(shutdown.totals.calculatedSyntheticLiabilityMinor)} · companies requiring review: {shutdown.totals.reviewRequiredCompanies}. Provider reconciliation remains required.</p><a className="admin-button secondary" href={reportUrl('shutdown',true)}>{t('Export liability review CSV','ส่งออกข้อมูลตรวจสอบภาระคืนเงิน CSV')}</a>
      <div style={{overflowX:'auto'}} role="region" aria-label="Shutdown liability table" tabIndex={0}><table className="admin-table"><thead><tr><th>Company ID</th><th>Available / reserved / debt</th><th>Trial units</th><th>Unused purchased</th><th>Candidate amount</th><th>Evidence / status</th><th>Review reasons</th></tr></thead><tbody>{shutdown.companies.map(row=><tr key={row.companyId}><td>{row.companyId}</td><td>{row.availableCredits} / {row.reservedCredits} / {row.debtCredits}</td><td>{row.trialEntitlements}</td><td>{display(row.purchasedUnusedCredits)}</td><td>{row.refundCalculationMinor===null?'Not calculated':thb(row.refundCalculationMinor)}</td><td>{row.paymentEvidence} / {row.calculationStatus}</td><td>{row.reviewReasons.join(', ')||'Provider evidence still requires review'}</td></tr>)}</tbody></table></div></>}
  </section>;
}
