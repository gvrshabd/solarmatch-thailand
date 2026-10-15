'use client';
import { Wallet, Receipt, Inbox } from 'lucide-react';
import type { InstallerPortalAction, InstallerPortalData } from '@/lib/installer/portal-contract';
import { portalMoney } from '@/lib/installer/presentation';

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
export function InstallerCredits({data,en,busy,action}:{data:InstallerPortalData;en:boolean;busy:boolean;action:(body:InstallerPortalAction)=>Promise<boolean|undefined>}) {
 const t=(th:string,english:string)=>en?english:th;
 const enough=data.balance.debt>0?0:Math.floor(data.balance.available/(data.commercial?.sharedCredits??2));
 const date=(v:string)=>new Date(v).toLocaleString(en?'en-GB':'th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'});
 const signed=(v:number)=>v>0?'+'+v:String(v);
 const methods:Record<string,string>={promptpay:'PromptPay',credit_card:en?'Card':'บัตร',mobile_banking_bbl:'Bangkok Bank',mobile_banking_kbank:'K PLUS',mobile_banking_ktb:'Krungthai NEXT',mobile_banking_bay:'Krungsri',mobile_banking_scb:'SCB EASY',truemoney_jumpapp:'TrueMoney'};
 const kinds:Record<string,[string,string]>={purchase:['ซื้อเครดิต','Credit purchase'],delivery:['รับคำขอ','Enquiry delivery'],'trial-grant':['ได้รับสิทธิ์ทดลอง','Trial allowance'],'claim-restoration':['คืนเครดิตตามคำร้อง','Claim restoration'],'payment-reversal':['หักเครดิตจากการคืนเงิน','Payment reversal'],reservation:['สำรองเครดิต','Reservation'],release:['คืนเครดิตที่สำรอง','Reservation released']};
 return <div className="pgrid"><div className="col"><section className="balance"><span className="eyebrow">{t('เครดิตพร้อมใช้','AVAILABLE CREDITS')}</span><div><span className="big">{data.balance.available}</span> <span>{t('เครดิต','credits')}</span></div><p>{t('รับคำขอแบบแชร์ได้','Enough for')} {enough} {t('รายการ','shared enquiries')} · {data.balance.trialRemaining} {t('สิทธิ์ทดลองแยกต่างหาก','trial enquiries separately')}</p><p className="note">{data.balance.reserved} {t('เครดิตที่สำรอง ไม่รวมในยอดพร้อมใช้','reserved credits, excluded from available')} · {data.balance.debt} {t('เครดิตค้างชำระ','credit debt')}</p></section>
 <section className="card"><h3>{t('รายการเคลื่อนไหว','Statement')}</h3><div className="statement">{creditStatement(data).map(row=><div key={row.id}><span className="tile">{row.order?<Receipt/>:row.entry?.kind==='delivery'?<Inbox/>:<Wallet/>}</span><span className="grow"><b>{row.entry?(kinds[row.entry.kind]?.[en?1:0]||row.entry.kind):t('รายการสั่งซื้อ','Purchase order')}</b><small>{date(row.createdAt)}{row.order&&' · '+row.order.status+' · '+portalMoney(row.order.amountMinor,row.order.currency,en)}</small>{row.order&&!!row.order.refundedMinor&&<small>{t('คืนเงินแล้ว','Refunded')}: {portalMoney(row.order.refundedMinor,row.order.currency,en)}</small>}{row.entry&&<small>{t('พร้อมใช้','Available')} {signed(row.entry.availableDelta??row.entry.units)} · {t('สำรอง','Reserved')} {signed(row.entry.reservedDelta??0)} · {t('ทดลอง','Trial')} {signed(row.entry.trialDelta??0)} · {t('ค้างชำระ','Debt')} {signed(row.entry.debtDelta??0)}</small>}{row.order&&<button className="btn btn-ghost btn-sm" disabled={busy} onClick={()=>void action({action:'reconcile-order',orderId:row.order!.id})}>{t('ตรวจสอบสถานะ','Check status')}</button>}</span><span className={'amt'+((row.entry?.units??0)>0?' plus':'')}>{row.entry?signed(row.entry.units):'—'}</span></div>)}</div>{!data.ledger.length&&!data.orders.length&&<p>{t('ยังไม่มีรายการ','No activity yet.')}</p>}</section></div>
 <div className="col">{data.packages.map(pack=><section className="card pkg" key={pack.id}><span className="chip chip-gold">{t('แพ็กเกจเครดิต','CREDIT PACKAGE')}</span><div className="price"><b>{pack.credits} {t('เครดิต','credits')}</b><b>{portalMoney(pack.amountMinor,pack.currency,en,pack.amountMinor%100===0)}</b></div><p className="muted">{t('คำขอแบบแชร์ใช้','A shared enquiry uses')} {data.commercial?.sharedCredits??2} {t('เครดิต','credits')}</p>{data.integrations.paymentMethods.map(method=><button className="btn btn-primary btn-block" key={method} disabled={busy||!data.integrations.paymentsEnabled||data.company?.approvalStatus!=='approved'} onClick={()=>void action({action:'checkout',packageId:pack.id,method})}>{t('ชำระผ่าน','Pay with')} {methods[method]||method}</button>)}{!data.integrations.paymentsEnabled&&<p role="status">{t('ยังไม่เปิดรับชำระเงิน','Payments are not enabled.')}</p>}<p className="note">{t('คิดเครดิตเมื่อคำขอพร้อมใช้ในพอร์ทัล ไม่คิดเพิ่มเมื่อเปิดดูหรือโทร ไม่มีการเติมเครดิตอัตโนมัติ','Credits are charged when an enquiry becomes available in the portal—not again when you open it or call. No automatic top-up.')}</p><p className="note">{pack.taxLabel}</p></section>)}</div></div>;
}
