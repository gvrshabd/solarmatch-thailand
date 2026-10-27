import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { companyDraft, mergeCompanyDraft, InstallerCompanySettings } from '@/components/installers/company';
import { InstallerCredits, orderCanReconcile, statementAmount } from '@/components/installers/credits';
import type { InstallerPortalData } from '@/lib/installer/portal-contract';

const fixture=():InstallerPortalData=>({
  session:{user:{id:'user',name:'Owner',email:'owner@example.com',emailVerified:true}},
  company:{id:'company',name:'Solar Company',contactName:'Owner',phone:'0812345678',serviceAreas:['bangkok'],supportedProducts:['shared_residential'],dailyLimit:4,paused:true,lineLinked:false,approvalStatus:'approved',termsAcceptedVersion:'v1'},
  products:[],packages:[{id:'pack',nameEn:'Credits',nameTh:'เครดิต',credits:30,amountMinor:900000,currency:'THB',taxLabel:'[TAX TREATMENT TO BE CONFIRMED]'}],
  balance:{available:30,reserved:6,trialRemaining:5,debt:0},deliveries:[],orders:[],ledger:[],claims:[],
  terms:{version:'v1',textEn:'Terms',textTh:'ข้อตกลง',acceptedAt:'2026-10-02T00:00:00Z'},
  integrations:{paymentsEnabled:true,paymentMethods:['promptpay'],lineConfigured:true,mode:'local'},
  availability:{platformPaused:false,allocationPaused:false,notificationsEnabled:true,canManage:true},
  commercial:{creditValueMinor:30000,sharedCredits:3,claimDays:9,trialDeliveries:5,recipientLimit:4},
});
const action=async()=>({ok:true as const});
const credits=(data:InstallerPortalData,props:Partial<Parameters<typeof InstallerCredits>[0]>={})=>renderToStaticMarkup(createElement(InstallerCredits,{data,en:true,busy:false,action,...props}));
const entry=(delta:Partial<InstallerPortalData['ledger'][number]>)=>({id:'event',kind:'purchase',units:0,createdAt:'2026-10-02T00:00:00Z',reason:'provider',availableDelta:0,...delta});

describe('Signal company editing',()=>{
  it('preserves changed fields while refreshing untouched fields from the server',()=>{
    const base=companyDraft(fixture());
    const draft={...base,name:'Still typing',areas:['bangkok','phuket']};
    const refreshed={...base,name:'Remote name',phone:'0899999999',limit:9};
    expect(mergeCompanyDraft(draft,base,refreshed)).toEqual({...draft,phone:'0899999999',limit:9});
  });
  it('preserves edits made after the submitted snapshot is acknowledged',()=>{
    const submitted=companyDraft(fixture());
    const later={...submitted,contactName:'Another edit'};
    expect(mergeCompanyDraft(later,submitted,{...submitted,name:'Normalized company'})).toEqual({...later,name:'Normalized company'});
  });
  it('keeps create controls locked for unverified accounts',()=>{
    const data=fixture();data.company=null;data.session.user.emailVerified=false;
    const html=renderToStaticMarkup(createElement(InstallerCompanySettings,{data,en:true,busy:false,action,navigate:()=>{}}));
    expect(html).toContain('Create company');
    expect(html).not.toContain('savebar');
    expect(html.match(/<input[^>]*name="name"[^>]*>/)?.[0]).toContain('disabled=""');
    expect(html).not.toContain('Accepting enquiries preference');
  });
});

describe('Signal credits financial presentation',()=>{
  it('uses configured prices and entitlements without mixing reserved or free allowances into available',()=>{
    const html=credits(fixture());
    expect(html).toContain('Enough for 10 enquiries');
    expect(html).toContain('5 free trials left');
    expect(html).toContain('6 reserved');
    expect(html).toContain('10 enquiries at ฿900 each');
    expect(html).not.toContain('[TAX TREATMENT TO BE CONFIRMED]');
    const debt=fixture();debt.balance.debt=7;
    expect(credits(debt)).toContain('Enough for 0 enquiries');
    expect(credits(debt)).toContain('7 owed');
    expect(credits(debt)).toContain('Purchased credits and purchased-credit restorations offset debt first');
  });
  it('renders unknown commercial data as unknown instead of guessing a price or cost',()=>{
    const data=fixture();delete data.commercial;
    const html=credits(data);
    expect(html).toContain('Enough for — enquiries');
    expect(html).toContain('— enquiries at — each');
  });
  it('shows only the entitlement that changed, retaining paid-credit precision',()=>{
    expect(statementAmount(entry({availableDelta:12,reservedDelta:-3}),true)).toBe('+12');
    expect(statementAmount(entry({kind:'trial-grant',trialDelta:5}),true)).toBe('+5 free');
    expect(statementAmount(entry({kind:'delivery',trialDelta:-1}),true)).toBe('Free');
    expect(statementAmount(entry({reservedDelta:-3}),true)).toBe('−3 reserved');
    expect(statementAmount(entry({debtDelta:7,units:-7}),true)).toBe('+7 owed');
    expect(statementAmount(undefined,true)).toBe('—');
  });
  it('reconciles every non-final state and never offers payment again while the real QR is present',()=>{
    for(const status of ['pending','authorizing','reconciliation-required'])expect(orderCanReconcile(status)).toBe(true);
    for(const status of ['paid','failed','cancelled','refunded','reversed'])expect(orderCanReconcile(status)).toBe(false);
    const data=fixture();
    data.orders=[{id:'order',status:'authorizing',amountMinor:12345,currency:'THB',credits:30,createdAt:'2026-10-02T00:00:00Z',receiptReference:null}];
    const html=credits(data,{qrImage:'https://provider.example/qr.png',qrOrderId:'order',qrAmountMinor:900000});
    expect(html).toContain('Payment QR code');
    expect(html).toContain('฿123.45');
    expect(html).not.toContain('Pay with');
    expect(html).toContain('Credits are issued after provider confirmation.');
    expect(html).toContain('Check status');
    data.orders[0].status='paid';
    expect(credits(data)).not.toContain('Check status');
  });
  it('shows configured tax copy and disables checkout without verified owner access',()=>{
    const data=fixture();data.packages[0].taxLabel='VAT included';data.availability!.canManage=false;
    const html=credits(data);
    expect(html).toContain('VAT included');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Pay with/);
  });
});
