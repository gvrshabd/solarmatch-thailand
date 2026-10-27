import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InstallerLanding } from '@/components/installers/landing';
import { signalLandingFaq } from '@/components/installers/signal-landing-copy';

const commercial = { creditValueMinor: 17550, sharedCredits: 4, trialDeliveries: 5, claimDays: 11, recipientLimit: 6 };
const noop = () => {};

describe('Signal installer landing safeguards', () => {
  for (const en of [true, false]) {
    it(`uses configured commercial values in ${en ? 'English' : 'Thai'}`, () => {
      const faq = signalLandingFaq(en, commercial);
      expect(faq[0][1]).toContain('฿702');
      expect(faq[0][1]).toContain(en ? '(4 credits)' : '(4 เครดิต)');
      expect(faq[0][1]).toContain(en ? 'first 5 enquiries' : 'คำขอ 5 รายการแรก');
      expect(faq[1][1]).toContain(en ? 'At most 5 others' : 'ไม่เกินอีก 5 แห่ง');
      expect(faq[1][1]).toContain(en ? '6 companies' : '6 แห่ง');
      expect(faq[2][1]).toContain(en ? 'within 11 days of its original portal availability' : 'ภายใน 11 วันนับจากพร้อมใช้ในพอร์ทัลครั้งแรก');
      expect(faq[2][1]).toContain(en ? 'Claims are reviewed; a credit restoration is not a cash refund.' : 'คำร้องต้องผ่านการตรวจสอบ การคืนเครดิตไม่ใช่การคืนเงินสด');
      expect(faq[2][1]).toContain(en ? 'No answer or no purchase does not automatically make an enquiry invalid.' : 'การไม่รับสายหรือไม่ซื้อ ไม่ถือเป็นคำขอที่ไม่ถูกต้องโดยอัตโนมัติ');
      expect(faq[4][1]).toBe(en ? 'No. A shared enquiry is a request for contact, not a guaranteed sale. You provide your own advice, quotation and installation agreement.' : 'ไม่รับประกัน คำขอแบบแชร์เป็นคำขอรับการติดต่อ ไม่ใช่ยอดขายที่รับประกัน บริษัทของคุณเป็นผู้ให้คำแนะนำ ใบเสนอราคา และสัญญาติดตั้งเอง');
    });

    it(`disables every account entry point when unavailable in ${en ? 'English' : 'Thai'}`, () => {
      const html = renderToStaticMarkup(createElement(InstallerLanding, { en, config: { accountsAvailable: false, commercial: null }, apply: noop, signIn: noop, setLanguage: noop }));
      const buttons = html.match(/<button\b[^>]*>.*?<\/button>/g) || [];
      expect(buttons).toHaveLength(7);
      expect(buttons.filter(button => button.includes('disabled=""'))).toHaveLength(5);
      expect(html).toContain(en ? 'Applications unavailable' : 'ยังไม่เปิดรับสมัคร');
      expect(html.match(/<b>—<\/b>/g)).toHaveLength(4);
      expect(html.match(/<details class="qa">/g)).toHaveLength(5);
      expect(html).not.toContain('<details class="qa" open');
      expect(html).not.toContain('href="tel:');
      expect(html).toContain('<span class="btn primary">');
      expect(html).toContain('loading="eager"');
      expect(html).toContain('Photo: Kindel Media / Pexels');
      expect(html).toContain(`<a class="sr skip" href="#installer-landing-main">${en ? 'Skip to content' : 'ข้ามไปเนื้อหา'}</a>`);
      expect(html.match(/<main\b/g)).toHaveLength(1);
      expect(html).toContain('<main id="installer-landing-main" tabindex="-1">');
    });
  }

  it('replaces the inert example with the supplied real auth panel', () => {
    const html = renderToStaticMarkup(createElement(InstallerLanding, { en: true, config: { accountsAvailable: true, commercial }, apply: noop, signIn: noop, setLanguage: noop, auth: createElement('section', { className: 'auth' }, 'Real auth panel') }));
    expect(html).toContain('class="a-hero authing"');
    expect(html).toContain('Real auth panel');
    expect(html).not.toContain('class="stack"');
  });
});
