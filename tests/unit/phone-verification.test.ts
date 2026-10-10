import { beforeEach, describe, expect, it, vi } from 'vitest';
const runtime=vi.hoisted(()=>({PHONE_VERIFICATION_SECRET:'synthetic-local-secret-at-least-32-characters',INSTALLER_PLATFORM_MODE:'off',INSTALLER_BASE_URL:'https://sandbox.example.test'}));
vi.mock('@/lib/server/runtime', () => ({ getRuntimeEnv: () => runtime }));
import { phoneChallengeSchema, randomPhoneCode, phoneCodeHash, verifyPhoneCode } from '@/lib/installer/phone-verification';
import { canonicalEnquiryKey,canonicalEnquiryStatements } from '@/lib/installer/enquiries';
import type { EstimateAnswers } from '@/lib/calculator/types';
import { localTestContact } from '@/lib/installer/local-collection';
import type { ReleaseRow } from '@/lib/server/releases';

describe('phone verification', () => {
  beforeEach(() => vi.clearAllMocks());
  it('normalizes Thai mobile numbers and rejects LINE and unknown fields', () => {
    expect(phoneChallengeSchema.parse({phone:'081 234 5678',assessmentToken:'a'.repeat(50)}).phone).toBe('+66812345678');
    expect(phoneChallengeSchema.safeParse({phone:'021234567',assessmentToken:'a'.repeat(50)}).success).toBe(false);
    expect(phoneChallengeSchema.safeParse({phone:'0812345678',assessmentToken:'a'.repeat(50),lineId:'legacy'}).success).toBe(false);
  });
  it('creates six digit random codes and salted keyed hashes', async () => {
    for (let i=0;i<30;i++) expect(randomPhoneCode()).toMatch(/^\d{6}$/u);
    expect(await phoneCodeHash('challenge-a','123456')).not.toBe(await phoneCodeHash('challenge-b','123456'));
    expect(await phoneCodeHash('challenge-a','123456')).not.toContain('123456');
  });
  it('rejects expired, exhausted, used or mismatched bindings before issuing proof', async () => {
    const first = vi.fn().mockResolvedValue(null);
    const prepare = vi.fn().mockReturnValue({bind:vi.fn().mockReturnValue({first})});
    expect(await verifyPhoneCode({prepare} as unknown as D1Database,crypto.randomUUID(),'+66812345678','a'.repeat(50),'123456')).toBeNull();
    expect(prepare.mock.calls[0][0]).toContain('attempts<?');
    expect(prepare.mock.calls[0][0]).toContain('session_hash=?');
    expect(prepare.mock.calls[0][0]).toContain('consumed_at IS NULL');
  });
  it('never returns a proof on wrong code or lost concurrent verification', async () => {
    const id=crypto.randomUUID();
    const first=vi.fn().mockResolvedValueOnce({code_hash:await phoneCodeHash(id,'123456')}).mockResolvedValueOnce(null);
    const database={prepare:vi.fn().mockReturnValue({bind:vi.fn().mockReturnValue({first})})} as unknown as D1Database;
    expect(await verifyPhoneCode(database,id,'0812345678','a'.repeat(50),'123456')).toBeNull();
  });
});

describe('request-scoped local collection',()=>{
  const release={content_json:'{}',contact_collection_mode:'disabled',contact_collection_enabled:0,public_collection_enabled:0,legal_complete:0,content_version_id:'synthetic',legal_document_version_id:'synthetic',contact_configuration_version_id:'synthetic'} as ReleaseRow;
  const database=(enabled:boolean)=>({prepare:()=>({first:async()=>({config_json:JSON.stringify({collectionEnabled:enabled})})})}) as unknown as D1Database;
  it('requires explicit local mode, loopback, request and collection flag',async()=>{
    runtime.INSTALLER_PLATFORM_MODE='off';
    expect(await localTestContact(new Request('http://localhost/'),release,database(true))).toBeNull();
    runtime.INSTALLER_PLATFORM_MODE='local-test';
    expect(await localTestContact(undefined,release,database(true))).toBeNull();
    expect(await localTestContact(new Request('https://public.example.test/'),release,database(true))).toBeNull();
    expect(await localTestContact(new Request('http://localhost/'),release,database(false))).toBeNull();
    const contact=await localTestContact(new Request('http://localhost/'),release,database(true));
    expect(contact?.enabled).toBe(true);
    expect(contact?.publicCollectionEnabled).toBe(false);
    expect(contact?.consentVersionId).toMatch(/^local-test:/u);
    expect(release.contact_collection_enabled).toBe(0);
    expect(release.public_collection_enabled).toBe(0);
    runtime.INSTALLER_PLATFORM_MODE='off';
  });
});

describe('canonical enquiry registration',()=>{
  const answers={province:'bangkok',district:'sathon',propertyType:'detached-home',planningTimeframe:'within-3-months',monthlyBillThb:6000} as EstimateAnswers;
  it('keeps repeated projects canonical despite formatting, timing and scoring changes',async()=>{
    const key=await canonicalEnquiryKey('081 234 5678',answers);
    expect(await canonicalEnquiryKey('+66812345678',{...answers,district:' SATHON ',planningTimeframe:'researching',monthlyBillThb:10000})).toBe(key);
    expect(await canonicalEnquiryKey('0812345678',{...answers,district:'bang-rak'})).not.toBe(key);
    expect(await canonicalEnquiryKey('0892345678',answers)).not.toBe(key);
  });
  it('guards all writes by lead identity and never renews expiry or sharing slots',async()=>{
    const queries:string[]=[];
    const database={prepare:(sql:string)=>{queries.push(sql);return {bind:()=>({})};}} as unknown as D1Database;
    await canonicalEnquiryStatements(database,'lead','0812345678',answers,{distributionWindowDays:7,duplicateWindowDays:30,minimumQuality:4,recipientLimit:3});
    expect(queries[0]).toContain('INSERT OR IGNORE');
    expect(queries[1]).toContain('EXISTS(SELECT 1 FROM leads WHERE id=?)');
    expect(queries[2]).toContain('outside-window-review');
    expect(queries[2]).not.toContain('request_expires_at=');
    expect(queries[2]).not.toContain('recipient_limit=');
  });
});
