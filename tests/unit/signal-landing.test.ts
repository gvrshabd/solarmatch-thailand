import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { InstallerLanding } from '@/components/installers/landing';
import { signalLandingFaq } from '@/components/installers/signal-landing-copy';

const commercial = { creditValueMinor: 17550, sharedCredits: 4, trialDeliveries: 5, claimDays: 11, recipientLimit: 6 };
const noop = () => {};

describe('Signal installer landing safeguards', () => {
  it('keeps existing sign-in enabled when new applications are independently unavailable',()=>{
    const html=renderToStaticMarkup(createElement(InstallerLanding,{en:true,config:{accountsAvailable:true,registrationAvailable:false,recoveryAvailable:false,commercial},apply:noop,signIn:noop,setLanguage:noop}));
    const buttons=html.match(/<button\b[^>]*>.*?<\/button>/g)||[];
    expect(buttons.filter(button=>button.includes('Sign in'))).toHaveLength(3);
    expect(buttons.filter(button=>button.includes('Applications unavailable'))).toHaveLength(2);
    expect(buttons.filter(button=>button.includes('Sign in')).every(button=>!button.includes('disabled=""'))).toBe(true);
    expect(buttons.filter(button=>button.includes('Applications unavailable')).every(button=>button.includes('disabled=""'))).toBe(true);
  });
  it('preserves satang instead of truncating the configured enquiry price', () => {
    for (const en of [true, false]) expect(signalLandingFaq(en, { ...commercial, creditValueMinor: 17551 })[0][1]).toContain('702.04');
  });
  for (const en of [true, false]) {
    it(`uses configured commercial values in ${en ? 'English' : 'Thai'}`, () => {
      const faq = signalLandingFaq(en, commercial);
      expect(faq[0][1]).toContain('฿702');
      expect(faq[0][1]).toContain(en ? 'No subscription and no automatic billing.' : 'ไม่มีค่าสมาชิกและไม่มีการเรียกเก็บเงินอัตโนมัติ');
      expect(faq[1][1]).toContain(en ? '6 at most, including you.' : 'ไม่เกิน 6 บริษัท รวมคุณด้วย');
      expect(faq[2][1]).toContain(en ? 'first 5 enquiries' : 'คำขอ 5 รายการแรก');
      expect(faq[3][1]).toContain(en ? 'within 11 days' : 'ภายใน 11 วัน');
      expect(faq[3][1]).toContain(en ? 'If the details are wrong, you get your credits back.' : 'หากข้อมูลผิดจริง คุณจะได้เครดิตคืน');
      expect(faq).toHaveLength(4);
    });

    it(`disables every account entry point when unavailable in ${en ? 'English' : 'Thai'}`, () => {
      const html = renderToStaticMarkup(createElement(InstallerLanding, { en, config: { accountsAvailable: false, commercial: null }, apply: noop, signIn: noop, setLanguage: noop }));
      const buttons = html.match(/<button\b[^>]*>.*?<\/button>/g) || [];
      expect(buttons).toHaveLength(8);
      expect(buttons.filter(button => button.includes('disabled=""'))).toHaveLength(5);
      expect(html).toContain(en ? 'Applications unavailable' : 'ยังไม่เปิดรับสมัคร');
      expect(signalLandingFaq(en, null).every(([, answer]) => answer.includes('—'))).toBe(true);
      expect(html.match(/<details class="qa">/g)).toHaveLength(4);
      expect(html).not.toContain('<details class="qa" open');
      expect(html).not.toContain('href="tel:');
      expect(html).toContain(en ? 'Examples' : 'ตัวอย่าง');
      expect(html.match(/<article class="pc"/g)).toHaveLength(12);
      expect(html.match(/<article class="pc" aria-hidden="true"/g)).toHaveLength(6);
      expect(html).toContain('loading="eager"');
      expect(html).toContain('Photo: Kindel Media / Pexels');
      expect(html).toContain(`<a class="sr skip" href="#installer-landing-main">${en ? 'Skip to content' : 'ข้ามไปเนื้อหา'}</a>`);
      expect(html.match(/<main\b/g)).toHaveLength(1);
      expect(html).toContain('<main id="installer-landing-main" tabindex="-1">');
    });
  }

  it('replaces the inert example with the supplied real auth panel', () => {
    const html = renderToStaticMarkup(createElement(InstallerLanding, { en: true, config: { accountsAvailable: true, commercial }, apply: noop, signIn: noop, setLanguage: noop, auth: createElement('section', { className: 'auth' }, 'Real auth panel') }));
    expect(html).toContain('class="hero authing"');
    expect(html).toContain('Real auth panel');
    expect(html).not.toContain('class="feed"');
  });
});
