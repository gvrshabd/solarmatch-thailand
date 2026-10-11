'use client';
import { useEffect, useState } from 'react';

interface PaymentStatusOrder {id:string;status:string;amountMinor:number;currency:string;credits:number;credited:boolean;receiptReference:string|null}
export function InstallerPaymentStatus() {
  const [en,setEn]=useState(false),[orderId,setOrderId]=useState(''),[order,setOrder]=useState<PaymentStatusOrder|null>(null);
  const [busy,setBusy]=useState(true),[message,setMessage]=useState('');
  const t=(th:string,english:string)=>en?english:th;
  async function check(id:string,english:boolean) {
    const text=(th:string,enText:string)=>english?enText:th;
    setBusy(true);setMessage('');
    try {
      // Redirect query values never determine status or credits. The authenticated
      // server verifies an associated charge through its existing provider adapter.
      const response=await fetch('/api/installer/payment-status',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:id})});
      if(response.status===401){setMessage(text('กรุณาเข้าสู่ระบบด้วยบัญชีบริษัทที่ยืนยันอีเมลแล้ว แล้วตรวจสอบอีกครั้ง','Sign in with your verified company account, then check again.'));return;}
      if(response.status===404){setOrder(null);setMessage(text('ไม่พบรายการชำระเงินในบัญชีบริษัทนี้','This payment order is not available to your company.'));return;}
      if(!response.ok) {
        // A provider outage leaves the last server-confirmed state visible.
        const stored=await fetch('/api/installer/payment-status?orderId='+encodeURIComponent(id),{credentials:'same-origin',cache:'no-store'});
        if(stored.ok)setOrder((await stored.json() as {order:PaymentStatusOrder}).order);
        setMessage(text('ยังตรวจสอบกับผู้ให้บริการไม่สำเร็จ กรุณาตรวจสอบอีกครั้ง เครดิตจะเพิ่มเมื่อยืนยันการชำระเงินแล้วเท่านั้น','Provider verification is unavailable. Please check again. Credits are issued only after confirmed payment.'));return;
      }
      setOrder((await response.json() as {order:PaymentStatusOrder}).order);
    } catch {setMessage(text('ระบบยังไม่พร้อมใช้งาน กรุณาตรวจสอบอีกครั้ง','The service is unavailable. Please check again.'));}
    finally {setBusy(false);}
  }
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search),english=params.get('lang')==='en',id=params.get('orderId')??'';
    document.documentElement.lang=english?'en':'th';
    queueMicrotask(()=>{setEn(english);setOrderId(id);if(id)void check(id,english);else {setBusy(false);setMessage(english?'No payment order was specified.':'ไม่ได้ระบุรายการชำระเงิน');}});
  },[]);
  const labels:Record<string,[string,string]>={paid:['ชำระเงินสำเร็จ','Payment successful'],failed:['ชำระเงินไม่สำเร็จ','Payment failed'],cancelled:['ยกเลิกการชำระเงิน','Payment cancelled'],reversed:['ยกเลิกยอดชำระเงินแล้ว','Payment reversed'],refunded:['คืนเงินแล้ว','Payment refunded']};
  const status=order?(labels[order.status]?.[en?1:0]??t('รอยืนยันการชำระเงิน','Payment pending')):'';
  const portal='/installers?view=credits&lang='+(en?'en':'th');
  return <main className="installer-shell"><section className="installer-card">
    <a href={portal}>← {t('กลับไปที่เครดิตและการซื้อ','Back to credits and purchases')}</a>
    <h1>{t('สถานะการชำระเงิน','Payment status')}</h1>
    {order&&<><h2>{status}</h2><p>{new Intl.NumberFormat(en?'en-GB':'th-TH',{style:'currency',currency:order.currency}).format(order.amountMinor/100)} · {order.credits} {t('เครดิต','credits')}</p><p>{t('รายการ','Order')}: {order.id}</p>{order.receiptReference&&<p>{t('ใบเสร็จอ้างอิง','Receipt reference')}: {order.receiptReference}</p>}<p>{order.status==='paid'&&order.credited?t('ยืนยันจากผู้ให้บริการแล้ว เครดิตที่ซื้อจะหักหนี้เครดิตก่อนเพิ่มยอดพร้อมใช้','Confirmed by the provider. Purchased credits first offset credit debt, then increase your available balance.'):t('หน้านี้แสดงสถานะที่ตรวจสอบโดยเซิร์ฟเวอร์ การกลับจากหน้าชำระเงินไม่ได้ยืนยันความสำเร็จ','This page shows the server-verified status. Returning from payment does not confirm success.')}</p></>}
    <p role="status" aria-live="polite">{busy?t('กำลังตรวจสอบสถานะการชำระเงิน…','Checking payment status…'):message}</p>
    <button disabled={busy||!orderId} onClick={()=>void check(orderId,en)}>{t('ตรวจสอบสถานะอีกครั้ง','Check status again')}</button>
    {!order&&<p><a href={portal}>{t('เข้าสู่ระบบบริษัท','Sign in to your company')}</a></p>}
  </section></main>;
}
