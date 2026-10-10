import { describe, expect, it } from 'vitest';
import current from '@/config/installer-commercial-copy';
import historical from '@/config/legal-review-copy.json';

const textOf = (type: 'privacy' | 'terms', locale: 'en' | 'th') =>
  current.documents[type].sections.flatMap(section => [
    ...section.paragraphs.map(paragraph => paragraph[locale]),
    ...('bullets' in section && section.bullets ? section.bullets.map(bullet => bullet[locale]) : []),
  ]).join(' ');

describe('current bilingual legal review copy', () => {
  it('keeps historical source intact while using a new revision', () => {
    expect(current.contentVersion).not.toBe(historical.contentVersion);
    expect(historical.documents.privacy.sections.find(section => section.id === 'sharing')?.paragraphs[0].en).toContain('chosen contact details');
  });

  it('uses the verified mobile and trial model consistently in both languages', () => {
    const enPrivacy = textOf('privacy', 'en');
    const thPrivacy = textOf('privacy', 'th');
    const enTerms = textOf('terms', 'en');
    const thTerms = textOf('terms', 'th');
    expect(enPrivacy).toContain('verified mobile number');
    expect(enPrivacy).toContain('free trial or pay');
    expect(enPrivacy).not.toContain('chosen contact details');
    expect(thPrivacy).toContain('หมายเลขโทรศัพท์มือถือที่ยืนยันแล้ว');
    expect(thPrivacy).toContain('สิทธิ์ทดลองฟรีหรือชำระ');
    expect(enTerms).toContain('verified by SMS');
    expect(enTerms).toContain('free trial or pay');
    expect(thTerms).toContain('ยืนยันด้วย SMS');
    expect(thTerms).toContain('สิทธิ์ทดลองฟรีหรือชำระ');
    expect(current.contactLaunch.shortDisclosure.en).toContain('verified mobile number');
    expect(current.contactLaunch.shortDisclosure.en).toContain('free trial or pay');
    expect(current.contactLaunch.shortDisclosure.th).toContain('หมายเลขโทรศัพท์มือถือที่ยืนยันแล้ว');
    expect(current.contactLaunch.shortDisclosure.th).toContain('สิทธิ์ทดลองฟรีหรือชำระ');
    expect(current.contactLaunch.recipientConfirmation.en).toContain('by telephone');
    expect(current.contactLaunch.recipientConfirmation.th).toContain('ทางโทรศัพท์');
  });

  it('leaves the retention period for owner review and explains scoped staff access', () => {
    expect(textOf('privacy', 'en')).toContain('retention period for identifiable homeowner enquiry records is pending review');
    expect(textOf('privacy', 'th')).toContain('ระยะเวลาเก็บบันทึกคำขอของเจ้าของบ้าน');
    expect(textOf('privacy', 'en')).toContain('at most three distinct companies, including trial deliveries');
    expect(textOf('privacy', 'en')).toContain('limited-access link to its individual enquiry');
    expect(textOf('privacy', 'th')).toContain('จำกัดการเข้าถึงคำขอเฉพาะรายการ');
  });
});
