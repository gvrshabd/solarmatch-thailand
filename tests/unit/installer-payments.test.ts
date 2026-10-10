import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>({INSTALLER_PLATFORM_MODE:'local-test',LINE_CHANNEL_SECRET:'fixture-secret'})}));
import { applyConfirmedPayment, type StoredPaymentOrder } from '@/lib/installer/payments';
import type { ProviderPayment } from '@/lib/installer/providers/payment';
import { beginLineLink,processLineWebhook } from '@/lib/installer/line-linking';
import {base64,hmac} from '@/lib/installer/providers/common';
import {sha256} from '@/lib/server/crypto';

function fixture() {
  const sqlite=new DatabaseSync(':memory:');
  for(const name of readdirSync('migrations').filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(`migrations/${name}`,'utf8'));
  sqlite.prepare("INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,created_by,updated_by,approval_status) VALUES('company','Fixture','ทดสอบ','https://example.test/privacy','test','test','approved')").run();
  sqlite.prepare("INSERT INTO installer_credit_accounts(company_id) VALUES('company')").run();
  function prepare(sql:string) {
    let parameters: unknown[]=[];
    const execute=()=>sqlite.prepare(sql).run(...parameters as (string|number|null)[]);
    return {bind(...values:unknown[]){parameters=values;return this;},async run(){const result=execute();return {meta:{changes:Number(result.changes)}};},async first(){return sqlite.prepare(sql).get(...parameters as (string|number|null)[])??null;}, execute};
  }
  const db={prepare,async batch(statements:Array<ReturnType<typeof prepare>>){sqlite.exec('BEGIN');try{const results=statements.map(statement=>({meta:{changes:Number(statement.execute().changes)}}));sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
  function order(id='order'):StoredPaymentOrder {
    sqlite.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,provider_order_id,created_at,updated_at) VALUES(?,'company','credits-20',20,400000,'thb','pending','omise',?,'2026-10-11','2026-10-11')").run(id,`chrg_test_${id}`);
    return sqlite.prepare('SELECT * FROM installer_payment_orders WHERE id=?').get(id) as unknown as StoredPaymentOrder;
  }
  function payment(row:StoredPaymentOrder):ProviderPayment{return {provider:'omise',chargeId:row.provider_order_id!,providerOrderId:row.provider_order_id!,amountMinor:row.amount_minor,currency:'thb',status:'paid',refundedMinor:0,receiptReference:'fixture'};}
  function account(){return sqlite.prepare("SELECT * FROM installer_credit_accounts WHERE company_id='company'").get()!;}
  return {sqlite,db,order,payment,account};
}
describe('atomic payment ledger SQL',()=>{
  it('issues credits once across repeated/out-of-order events',async()=>{
    const f=fixture(),row=f.order();
    await applyConfirmedPayment(f.db,row,f.payment(row),'event1');
    await applyConfirmedPayment(f.db,row,f.payment(row),'event1');
    await applyConfirmedPayment(f.db,row,{...f.payment(row),status:'failed'},'event2');
    expect(f.account().available).toBe(20);
    expect(f.sqlite.prepare('SELECT COUNT(*) n FROM installer_credit_ledger').get()?.n).toBe(1);
    expect(f.sqlite.prepare('SELECT status FROM installer_payment_orders').get()?.status).toBe('paid');
    f.sqlite.close();
  });
  it('claws available credit once and records spent value as debt without negative balance',async()=>{
    const f=fixture(),row=f.order();await applyConfirmedPayment(f.db,row,f.payment(row));
    f.sqlite.prepare("INSERT INTO installer_credit_ledger(id,company_id,kind,available_delta,idempotency_key,reason,actor,created_at) VALUES('spend','company','delivery',-18,'spend','fixture','test','now')").run();
    const reversed={...f.payment(row),status:'reversed' as const,refundedMinor:400000};
    await applyConfirmedPayment(f.db,row,reversed,'reverse1');await applyConfirmedPayment(f.db,row,reversed,'reverse1');
    await applyConfirmedPayment(f.db,row,f.payment(row),'latepaid');
    await applyConfirmedPayment(f.db,row,{...f.payment(row),refundedMinor:80000},'latepartial');
    expect(f.account().available).toBe(0);expect(f.account().debt).toBe(18);
    expect(f.sqlite.prepare('SELECT status FROM installer_payment_orders').get()?.status).toBe('reversed');
    const later=f.order('later');await applyConfirmedPayment(f.db,later,f.payment(later));
    expect(f.account().available).toBe(2);expect(f.account().debt).toBe(0);f.sqlite.close();
  });
  it('applies only the increase of cumulative partial refunds and rejects mismatched money',async()=>{
    const f=fixture(),row=f.order();await applyConfirmedPayment(f.db,row,f.payment(row));
    await applyConfirmedPayment(f.db,row,{...f.payment(row),refundedMinor:80000});
    await applyConfirmedPayment(f.db,row,{...f.payment(row),refundedMinor:160000});
    await applyConfirmedPayment(f.db,row,{...f.payment(row),refundedMinor:80000});
    expect(f.account().available).toBe(12);
    expect(f.sqlite.prepare('SELECT reversed_credits FROM installer_payment_orders').get()?.reversed_credits).toBe(8);
    await expect(applyConfirmedPayment(f.db,row,{...f.payment(row),amountMinor:1})).rejects.toThrow('payment_order_mismatch');f.sqlite.close();
  });
  it('rejects mismatched provider and package before issuing credit',async()=>{
    const f=fixture(),row=f.order();
    await expect(applyConfirmedPayment(f.db,row,{...f.payment(row),provider:'local-test'})).rejects.toThrow('payment_order_mismatch');
    await expect(applyConfirmedPayment(f.db,{...row,package_id:'other-package'},f.payment(row))).rejects.toThrow('payment_order_mismatch');
    expect(f.sqlite.prepare('SELECT COUNT(*) n FROM installer_credit_ledger').get()?.n).toBe(0);
    f.sqlite.close();
  });
});
describe('secure LINE linking SQL',()=>{
  async function webhook(event:unknown){const raw=JSON.stringify({events:[event]});const signature=base64(await hmac(new TextEncoder().encode('fixture-secret'),raw));return {raw,request:new Request('http://localhost:3000/api/installer/webhooks/line',{method:'POST',headers:{'x-line-signature':signature},body:raw})};}
  it('atomically limits concurrent signed invitation events to three per recipient',async()=>{
    const f=fixture(),user=`U${'d'.repeat(32)}`;
    try {
      const events=await Promise.all(Array.from({length:8},(_,index)=>webhook({type:'follow',webhookEventId:`burst-${index}`,timestamp:Date.now(),source:{type:'user',userId:user}})));
      await Promise.all(events.map(event=>processLineWebhook(f.db,event.request,event.raw)));
      expect(f.sqlite.prepare('SELECT COUNT(*) n FROM installer_line_invitations WHERE line_user_id=?').get(user)?.n).toBe(3);
      expect(f.sqlite.prepare('SELECT COUNT(*) n FROM installer_test_messages').get()?.n).toBe(3);
    } finally { f.sqlite.close(); }
  });
  it('requires matching signed user and nonce; consumes once and ignores replay',async()=>{
    const f=fixture(),nonce='fixture-unpredictable-nonce',user=`U${'a'.repeat(32)}`;
    f.sqlite.prepare('INSERT INTO installer_line_links(id,company_id,nonce_hash,line_user_id,expires_at,created_at) VALUES(?,?,?,?,?,?)').run('link','company',await sha256(nonce),user,'2099-01-01','now');
    const bad=await webhook({type:'accountLink',webhookEventId:'bad-user',timestamp:Date.now(),source:{type:'user',userId:`U${'b'.repeat(32)}`},link:{result:'ok',nonce}});
    await processLineWebhook(f.db,bad.request,bad.raw);
    expect(f.sqlite.prepare('SELECT line_user_id FROM solar_company_partners').get()?.line_user_id).toBeNull();
    const good=await webhook({type:'accountLink',webhookEventId:'good-user',timestamp:Date.now(),source:{type:'user',userId:user},link:{result:'ok',nonce}});
    await processLineWebhook(f.db,good.request,good.raw);await processLineWebhook(f.db,good.request,good.raw);
    expect(f.sqlite.prepare('SELECT line_user_id FROM solar_company_partners').get()?.line_user_id).toBe(user);
    expect(f.sqlite.prepare('SELECT consumed_at FROM installer_line_links').get()?.consumed_at).toBeTruthy();f.sqlite.close();
  });
  it('signed follow captures invitation; approved company can claim only once',async()=>{
    const f=fixture(),user=`U${'c'.repeat(32)}`;
    const follow=await webhook({type:'follow',webhookEventId:'follow-fixture',timestamp:Date.now(),source:{type:'user',userId:user}});
    await processLineWebhook(f.db,follow.request,follow.raw);
    const stored=f.sqlite.prepare('SELECT body FROM installer_test_messages').get();
    const capture=JSON.parse(String(stored?.body));
    const url=capture.messages[0].text.split('\n')[1];const token=new URL(url).searchParams.get('linkRequest')!;
    expect(f.sqlite.prepare('SELECT token_hash FROM installer_line_invitations').get()?.token_hash).not.toBe(token);
    const result=await beginLineLink(f.db,'company',new Request('http://localhost:3000/installers'),token);
    expect(result.authorizationUrl).toContain('https://access.line.me/dialog/bot/accountLink?');
    await expect(beginLineLink(f.db,'company',new Request('http://localhost:3000/installers'),token)).rejects.toThrow('line_invitation_expired');f.sqlite.close();
  });
  it('signed unfollow unlinks the company once',async()=>{
    const f=fixture(),user=`U${'e'.repeat(32)}`;
    f.sqlite.prepare('UPDATE solar_company_partners SET line_user_id=? WHERE id=?').run(user,'company');
    const unfollow=await webhook({type:'unfollow',webhookEventId:'unfollow-fixture',timestamp:Date.now(),source:{type:'user',userId:user}});
    await processLineWebhook(f.db,unfollow.request,unfollow.raw);
    await processLineWebhook(f.db,unfollow.request,unfollow.raw);
    expect(f.sqlite.prepare("SELECT line_user_id FROM solar_company_partners WHERE id='company'").get()?.line_user_id).toBeNull();
    expect(f.sqlite.prepare("SELECT COUNT(*) n FROM installer_webhook_events WHERE id='line:unfollow-fixture'").get()?.n).toBe(1);
    f.sqlite.close();
  });
});
