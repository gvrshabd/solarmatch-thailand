import { describe, expect, it } from 'vitest';
import { creditStatement } from '@/components/installers/credits';
import { deliveryLocation, portalMoney, thaiPhone } from '@/lib/installer/presentation';
import { enquiryGroup } from '@/components/installers/workspace';
import type { InstallerDelivery } from '@/lib/installer/portal-contract';
describe('Design v2 installer display integrity',()=>{
 it('localises structured area IDs without changing the stored values',()=>{
   const item={province:'bangkok',district:'sathon',location:'bangkok / sathon'};
   expect(deliveryLocation(item,true)).toBe('Sathon, Bangkok');
   expect(deliveryLocation(item,false)).toBe('สาทร, กรุงเทพมหานคร');
   expect(thaiPhone('+66812345678')).toBe('081 234 5678');
 });
 it('converts satang once and retains sub-baht refunds',()=>{
   expect(portalMoney(400000,'THB',true,true)).toMatch(/4,000/);
   expect(portalMoney(12345,'THB',true)).toMatch(/123\.45/);
 });
 it('never interprets not-recorded or legacy open as a completed call',()=>{
   expect(enquiryGroup({outcome:'not-recorded'} as InstallerDelivery)).toBe('new');
   expect(enquiryGroup({outcome:'open'} as InstallerDelivery)).toBe('progress');
   expect(enquiryGroup({outcome:'lost'} as InstallerDelivery)).toBe('closed');
 });
 it('combines an order with its purchase only, retaining reversals and unpaid orders',()=>{
   const order={id:'paid',status:'reversed',amountMinor:400000,currency:'THB',credits:20,createdAt:'2026-10-10',receiptReference:null,refundedMinor:12345};
   const entry={id:'purchase',kind:'purchase',sourceId:'paid',units:20,availableDelta:20,reservedDelta:0,trialDelta:0,debtDelta:0,reason:'provider',createdAt:'2026-10-10'};
   const rows=creditStatement({orders:[order,{...order,id:'pending',status:'pending'}],ledger:[entry,{...entry,id:'reversal',kind:'payment-reversal',units:-20},{...entry,id:'trial',sourceId:'trial',kind:'trial-grant',units:0,trialDelta:2}]});
   expect(rows).toHaveLength(4);
   expect(rows.filter(x=>x.order?.id==='paid')).toHaveLength(1);
   expect(rows.some(x=>x.order?.status==='pending')).toBe(true);
   expect(rows.some(x=>x.entry?.kind==='payment-reversal')).toBe(true);
   expect(rows.some(x=>x.entry?.trialDelta===2)).toBe(true);
 });
});
