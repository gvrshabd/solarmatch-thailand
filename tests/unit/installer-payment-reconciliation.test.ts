import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';

const runtime=vi.hoisted(()=>({INSTALLER_PLATFORM_MODE:'sandbox',INSTALLER_BASE_URL:'https://installer.example.test',OMISE_PROVIDER_MODE:'sandbox',OMISE_SECRET_KEY:'skey_test_fixture'}));
vi.mock('@/lib/server/runtime',()=>({getRuntimeEnv:()=>runtime}));
import { associateProviderCharge, reconcilePendingPayments } from '../../lib/installer/payments';

const request=new Request('https://installer.example.test/installers');
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  for(const name of readdirSync('migrations').filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(`migrations/${name}`,'utf8'));
  sqlite.prepare("INSERT INTO solar_company_partners(id,legal_name_en,legal_name_th,privacy_notice_url,created_by,updated_by,approval_status) VALUES('company','Fixture','ทดสอบ','https://example.test/privacy','test','test','approved')").run();
  sqlite.prepare("INSERT INTO installer_credit_accounts(company_id) VALUES('company')").run();
  function prepare(sql:string){let parameters:unknown[]=[];const execute=()=>sqlite.prepare(sql).run(...parameters as (string|number|null)[]);return {bind(...values:unknown[]){parameters=values;return this;},async run(){const result=execute();return {meta:{changes:Number(result.changes)}};},async first(){return sqlite.prepare(sql).get(...parameters as (string|number|null)[])??null;},async all(){return {results:sqlite.prepare(sql).all(...parameters as (string|number|null)[])};},execute};}
  const db={prepare,async batch(statements:Array<ReturnType<typeof prepare>>){sqlite.exec('BEGIN');try{const results=statements.map(statement=>({meta:{changes:Number(statement.execute().changes)}}));sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
  function order(id:string,providerId:string|null,status='pending'){
    sqlite.prepare("INSERT INTO installer_payment_orders(id,company_id,package_id,credits,amount_minor,currency,status,provider,provider_order_id,created_at,updated_at) VALUES(?,'company','credits-20',20,400000,'thb',?,'omise',?,'2026-10-11','2026-10-11')").run(id,status,providerId);
  }
  return {sqlite,db,order};
}
function charge(id:string,orderId:string,paid=true){return {id,object:'charge',livemode:false,amount:400000,currency:'THB',paid,capture:true,status:paid?'successful':'pending',refunded_amount:0,metadata:{solarmatch_order_id:orderId},transaction:paid?'trxn_test_fixture':null};}
afterEach(()=>vi.unstubAllGlobals());

describe('bounded payment reconciliation',()=>{
  it('skips missing credentials without any provider request',async()=>{
    const f=fixture();f.order('waiting','chrg_test_waiting');
    const transport=vi.fn();vi.stubGlobal('fetch',transport);
    runtime.OMISE_SECRET_KEY='';
    try {
      expect(await reconcilePendingPayments(f.db,request)).toMatchObject({scanned:0,skipped:'provider_unconfigured'});
      expect(transport).not.toHaveBeenCalled();
    } finally {runtime.OMISE_SECRET_KEY='skey_test_fixture';f.sqlite.close();}
  });
  it('continues after a bad provider response, issues only one purchase, and leaves unknown charge IDs for manual review',async()=>{
    const f=fixture();
    f.order('good','chrg_test_good');f.order('bad','chrg_test_bad');f.order('waiting','chrg_test_waiting');f.order('manual',null,'reconciliation-required');
    const transport=vi.fn(async(url:string)=>{
      const id=url.split('/').at(-1)!;
      return Response.json(id==='chrg_test_bad'?charge(id,'foreign-order'):charge(id,id.replace('chrg_test_',''),id!=='chrg_test_waiting'));
    });vi.stubGlobal('fetch',transport);
    const first=await reconcilePendingPayments(f.db,request);
    expect(first).toMatchObject({scanned:3,reconciled:2,failed:1,failedOrderIds:['bad'],manualAssociationRequired:1,skipped:null});
    expect(f.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='company'").get()?.available).toBe(20);
    expect(f.sqlite.prepare("SELECT reconciliation_error_code FROM installer_payment_orders WHERE id='bad'").get()?.reconciliation_error_code).toBe('payment_order_mismatch');
    await reconcilePendingPayments(f.db,request);
    expect(f.sqlite.prepare("SELECT COUNT(*) AS count FROM installer_credit_ledger WHERE kind='purchase'").get()?.count).toBe(1);
    expect(transport).toHaveBeenCalledTimes(6);
    f.sqlite.close();
  });
  it('validates an operator-supplied charge before linking an ambiguous order',async()=>{
    const f=fixture();f.order('manual',null,'reconciliation-required');
    const transport=vi.fn(async()=>Response.json(charge('chrg_test_manual','foreign-order')));vi.stubGlobal('fetch',transport);
    await expect(associateProviderCharge(f.db,'manual','chrg_test_manual',request)).rejects.toThrow('payment_order_mismatch');
    expect(f.sqlite.prepare("SELECT provider_order_id FROM installer_payment_orders WHERE id='manual'").get()?.provider_order_id).toBeNull();
    transport.mockImplementation(async()=>Response.json(charge('chrg_test_manual','manual')));
    const linked=await associateProviderCharge(f.db,'manual','chrg_test_manual',request);
    expect(linked.status).toBe('paid');
    await expect(associateProviderCharge(f.db,'manual','chrg_test_other',request)).rejects.toThrow('manual_association_unavailable');
    expect(f.sqlite.prepare("SELECT available FROM installer_credit_accounts WHERE company_id='company'").get()?.available).toBe(20);
    f.sqlite.close();
  });
});
