'use client';
import type { InstallerPortalData } from '@/lib/installer/portal-contract';
import { portalMoney } from '@/lib/installer/presentation';
import type { InstallerAction } from './action-result';

/** One row per ledger event; order metadata attaches to its purchase posting only. */
export function creditStatement(data: Pick<InstallerPortalData,'orders'|'ledger'>) {
  const linked=new Set<string>();
  const rows=data.ledger.map(entry=>{
    const order=entry.kind==='purchase'?data.orders.find(o=>o.id===entry.sourceId):undefined;
    if(order)linked.add(order.id);
    return {id:'ledger-'+entry.id,createdAt:entry.createdAt,entry,order};
  });
  for(const order of data.orders)if(!linked.has(order.id))rows.push({id:'order-'+order.id,createdAt:order.createdAt,entry:undefined as unknown as InstallerPortalData['ledger'][number],order});
  return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
const signed=(value:number)=>value>0?'+'+value:value<0?'−'+Math.abs(value):'0';
/** Preserve which entitlement moved; trials and debt are never spendable credits. */
export function statementAmount(entry:InstallerPortalData['ledger'][number]|undefined,en:boolean) {
  if(!entry) return '—';
  const available=entry.availableDelta??entry.units, trial=entry.trialDelta??0, reserved=entry.reservedDelta??0, debt=entry.debtDelta??0;
  if(available) return signed(available);
  if(trial) return entry.kind==='delivery'&&trial<0?(en?'Free':'ฟรี'):signed(trial)+' '+(en?'free':'ฟรี');
  if(reserved) return signed(reserved)+' '+(en?'reserved':'สำรอง');
  if(debt) return signed(debt)+' '+(en?'owed':'ค้างชำระ');
  return '0';
}
export function orderCanReconcile(status:string) {
  return ['pending','authorizing','reconciliation-required'].includes(status);
}
export function InstallerCredits({data,en,busy,action,qrImage,qrOrderId,qrAmountMinor}:{data:InstallerPortalData;en:boolean;busy:boolean;action:InstallerAction;qrImage?:string;qrOrderId?:string;qrAmountMinor?:number}) {
  // Signal Thai copy is a draft and needs native review.
  const t=(th:string,english:string)=>en?english:th;
  const shared=data.commercial?.sharedCredits;
  const enough=data.balance.debt>0?0:shared&&shared>0?Math.floor(data.balance.available/shared):'—';
  const date=(value:string)=>new Date(value).toLocaleString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'});
  const methods:Record<string,string>={promptpay:'PromptPay',credit_card:en?'Card':'บัตร',mobile_banking_bbl:'Bangkok Bank',mobile_banking_kbank:'K PLUS',mobile_banking_ktb:'Krungthai NEXT',mobile_banking_bay:'Krungsri',mobile_banking_scb:'SCB EASY',truemoney_jumpapp:'TrueMoney'};
  const states:Record<string,[string,string]>={pending:['รอชำระ','Pending'],authorizing:['กำลังอนุมัติการชำระ','Authorizing'],paid:['ชำระแล้ว','Paid'],failed:['ไม่สำเร็จ','Failed'],cancelled:['ยกเลิก','Cancelled'],refunded:['คืนเงินแล้ว','Refunded'],reversed:['ยกเลิกยอดชำระแล้ว','Reversed'],'reconciliation-required':['กำลังตรวจสอบยอด','Reconciliation required']};
  const kinds:Record<string,[string,string]>={purchase:['ซื้อเครดิต','Credit purchase'],delivery:['รับคำขอ','Enquiry delivery'],'trial-grant':['ได้รับสิทธิ์ทดลอง','Trial allowance'],'claim-restoration':['คืนเครดิตตามคำร้อง','Claim restoration'],'payment-reversal':['หักเครดิตจากการคืนเงิน','Payment reversal'],reservation:['สำรองเครดิต','Reservation'],release:['คืนเครดิตที่สำรอง','Reservation released']};
  const paymentLocked=busy||!data.session.user.emailVerified||data.availability?.canManage===false;
  const qrOrder=data.orders.find(order=>order.id===qrOrderId);
  const qrAmount=qrOrder?.amountMinor??qrAmountMinor;
  const perEnquiry=data.commercial&&shared?data.commercial.creditValueMinor*shared:undefined;
  const chargingNote=t('คิดเครดิตเมื่อคำขอพร้อมใช้ในพอร์ทัล ไม่คิดเพิ่มเมื่อเปิดดูหรือโทร ไม่มีการเติมเครดิตอัตโนมัติ','Credits are charged when an enquiry becomes available in the portal—not again when you open it or call. No automatic top-up.');
  const packages=data.packages.map(pack=><section className="card pkg" key={pack.id}>
    <div className="pr"><b>{pack.credits} {t('เครดิต','credits')}</b><b>{portalMoney(pack.amountMinor,pack.currency,en,pack.amountMinor%100===0)}</b></div>
    <p className="muted">{t((shared&&shared>0?pack.credits/shared:'—')+' คำขอ คำขอละ '+(perEnquiry===undefined?'—':portalMoney(perEnquiry,pack.currency,en,perEnquiry%100===0)),(shared&&shared>0?pack.credits/shared:'—')+' enquiries at '+(perEnquiry===undefined?'—':portalMoney(perEnquiry,pack.currency,en,perEnquiry%100===0))+' each')}</p>
    <div className="methods">{data.integrations.paymentMethods.map(method=><button type="button" className="btn primary block" key={method} disabled={paymentLocked||!data.integrations.paymentsEnabled||data.company?.approvalStatus!=='approved'} onClick={()=>void action({action:'checkout',packageId:pack.id,method})}>{t('ชำระผ่าน','Pay with')} {methods[method]||method}</button>)}</div>
    {!data.integrations.paymentsEnabled?<p className="note">{t('การชำระเงินออนไลน์จะเปิดเร็วๆ นี้ ยังไม่มีการเรียกเก็บเงิน','Online payment opens soon. You won’t be charged.')}</p>:data.company?.approvalStatus!=='approved'&&<p className="note">{t('ใช้ได้หลังได้รับอนุมัติ','Available after approval.')}</p>}
    <p className="note">{chargingNote}</p>{pack.taxLabel&&pack.taxLabel.trim()!=='[TAX TREATMENT TO BE CONFIRMED]'&&<p className="note">{pack.taxLabel}</p>}
  </section>);
  return <>
    <div className="a-two">
      <section className="bal" aria-label={t('เครดิตพร้อมใช้','Available credits')}><span>{t('เครดิตพร้อมใช้','Available')}</span><b>{data.balance.available}<small> {t('เครดิต','credits')}</small></b><p>{t('พอสำหรับ '+enough+' คำขอ','Enough for '+enough+' enquiries')}</p>
        {(data.balance.trialRemaining!==0||data.balance.reserved!==0||data.balance.debt!==0)&&<div className="sub">
          {data.balance.trialRemaining!==0&&<em>{t('เหลือสิทธิ์ทดลองฟรี '+data.balance.trialRemaining,data.balance.trialRemaining+(data.balance.trialRemaining===1?' free trial left':' free trials left'))}</em>}
          {data.balance.reserved!==0&&<em>{t('สำรองไว้ '+data.balance.reserved,data.balance.reserved+' reserved')}</em>}
          {data.balance.debt!==0&&<em className="owe">{t('ค้างชำระ '+data.balance.debt,data.balance.debt+' owed')}</em>}
        </div>}
        {data.balance.debt>0&&<p className="sm">{t('บริษัทจะยังรับคำขอใหม่ไม่ได้จนกว่าจะชำระยอดนี้ เครดิตที่ซื้อเพิ่มหรือได้รับคืนจะหักยอดค้างก่อน ส่วนที่เหลือจึงเป็นเครดิตพร้อมใช้ สิทธิ์ทดลองแยกจากยอดนี้','New deliveries are blocked until this debt is cleared. Purchased credits and purchased-credit restorations offset debt first; only the remainder becomes available. Trial entitlements are separate.')}</p>}
      </section>
      {qrImage?<section className="card qr"><h2 className="h3">{t('สแกนชำระเงิน','Scan to pay')}</h2><div className="code">{/* Provider-created QR only; credits require server confirmation. */}<img src={qrImage} alt={t('คิวอาร์โค้ดสำหรับชำระเงิน','Payment QR code')} width={168} height={168}/></div><b className="amt2">{qrAmount===undefined?'—':portalMoney(qrAmount,qrOrder?.currency||'THB',en,qrAmount%100===0)}</b><p className="note">{t('เครดิตจะเข้าเมื่อผู้ให้บริการยืนยันการชำระเงินแล้ว ตรวจสอบสถานะในประวัติการซื้อ','Credits are issued after provider confirmation. Check the purchase history for payment status.')}</p><button type="button" className="btn soft block" disabled={paymentLocked||!qrOrderId||(!!qrOrder&&!orderCanReconcile(qrOrder.status))} onClick={()=>{if(qrOrderId)void action({action:'reconcile-order',orderId:qrOrderId});}}>{t('ตรวจสอบสถานะ','Check status')}</button></section>:packages.length===1?packages:<div className="pkg">{packages}</div>}
    </div>
    <section className="card"><h2 className="h3">{t('รายการเคลื่อนไหว','Statement')}</h2><div className="stmt">{creditStatement(data).map(row=>{
      const available=row.entry?.availableDelta??row.entry?.units??0;
      const amount=statementAmount(row.entry,en);
      const sourceDeliveryId=row.entry?.kind==='claim-restoration'?data.claims.find(claim=>claim.id===row.entry?.sourceId)?.deliveryId:row.entry?.sourceId;
      const reference=data.deliveries.find(delivery=>delivery.id===sourceDeliveryId)?.reference;
      const label=row.entry?.kind==='delivery'&&reference?t('รับคำขอ','Enquiry')+' '+reference:row.entry?(kinds[row.entry.kind]?.[en?1:0]||row.entry.kind):t('ซื้อเครดิต','Credit purchase');
      return <div key={row.id}><span><b>{label}{row.order&&(!row.entry||row.entry.kind==='purchase')?' · '+row.order.credits+' '+t('เครดิต','credits'):row.entry?.kind==='trial-grant'?' · '+Math.abs(row.entry.trialDelta??0)+' '+t('คำขอฟรี','free enquiries'):row.entry?.kind==='claim-restoration'&&reference?' · '+reference:row.entry?.kind==='delivery'&&(row.entry.trialDelta??0)<0?' · '+t('ทดลองฟรี','Free trial'):''}</b><small>{date(row.createdAt)}{row.order&&<> · <span className={'pill st '+(row.order.status==='paid'?'ok':'st-new')}>{states[row.order.status]?.[en?1:0]||row.order.status}</span> · {portalMoney(row.order.amountMinor,row.order.currency,en,row.order.amountMinor%100===0)}{orderCanReconcile(row.order.status)&&<button type="button" className="lnk3" disabled={paymentLocked} onClick={()=>void action({action:'reconcile-order',orderId:row.order!.id})}>{t('ตรวจสอบสถานะ','Check status')}</button>}</>}</small>{row.order&&!!row.order.refundedMinor&&<small>{t('คืนเงินแล้ว','Refunded')}: {portalMoney(row.order.refundedMinor,row.order.currency,en)}</small>}</span><span className={'amt'+(available>0?' plus':available===0?' free':'')}>{amount}</span></div>;
    })}</div>{!data.ledger.length&&!data.orders.length&&<p className="empty">{t('ยังไม่มีรายการ','No activity yet.')}</p>}</section>
  </>;
}
