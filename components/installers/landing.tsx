'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { ArrowRight, Copy, Phone } from 'lucide-react';
import { designText } from '@/config/design-v2-copy';
import type { InstallerPublicConfig } from '@/lib/installer/public-config';
import { portalMoney } from '@/lib/installer/presentation';
import { signalLandingFaq, signalLandingText } from './signal-landing-copy';

export function SignalBrand({ en }: { en: boolean }) {
  const t = signalLandingText(en);
  return <a className="brand" href={'/installers?lang=' + (en ? 'en' : 'th')} aria-label={'SolarMatch ' + t.brandSub}>
    <SignalLogo/>
    <span><b>SolarMatch</b><small>{t.brandSub}</small></span>
  </a>;
}

export function SignalLogo() {
  return <svg className="logo" viewBox="0 0 64 56" aria-hidden="true">
      <g fill="#E2A62B"><path d="M32 0 27.5 8h9L32 0Z"/><path d="m15.5 6.5 1.2 9 7.7-4.5-8.9-4.5Z"/><path d="m48.5 6.5-8.9 4.5 7.7 4.5 1.2-9Z"/><path d="M3 24.5 11.5 29v-9L3 24.5Z"/><path d="m61 24.5-8.5-4.5v9l8.5-4.5Z"/><path d="m9 41 9-1.1-4.5-7.8L9 41Z"/><path d="m55 41-4.5-8.9-4.5 7.8L55 41Z"/></g>
      <path d="M15 37a20.5 20.5 0 1 1 34 0" fill="none" stroke="#E2A62B" strokeWidth="6"/>
      <path d="M10 53 39 30M54 53 25 30" fill="none" stroke="#137A50" strokeLinecap="square" strokeWidth="6"/>
    </svg>;
}

export function InstallerLanding({ en, config, apply, signIn, auth, setLanguage }: {
  en: boolean;
  config: InstallerPublicConfig;
  apply: () => void;
  signIn: () => void;
  auth?: ReactNode;
  setLanguage: (english: boolean) => void;
}) {
  const t = signalLandingText(en);
  const c = config.commercial;
  const available = config.accountsAvailable;
  const price = c ? portalMoney(c.creditValueMinor * c.sharedCredits, 'THB', en, (c.creditValueMinor * c.sharedCredits) % 100 === 0) : '—';
  const faq = signalLandingFaq(en, c);
  const name = en ? 'Arun' : 'อรุณ';
  const exampleFacts = [
    [portalMoney(720000, 'THB', en, true), t.fBill],
    ['6', t.fAc],
    [en ? 'Owner' : 'เจ้าของ', t.fOwn],
    [en ? 'Within 3 months' : 'ภายใน 3 เดือน', t.fWhen],
  ];
  return <div className="signal landing" lang={en ? 'en' : 'th'}>
    <a className="sr skip" href="#installer-landing-main">{en ? 'Skip to content' : 'ข้ามไปเนื้อหา'}</a>
    <header className="a-hdr"><div className="wrap">
      <SignalBrand en={en}/>
      <nav className="a-nav" aria-label={t.navMain}><a href="#how">{t.navHow}</a><a href="#price">{t.navPrice}</a><a href="#faq">{t.navFaq}</a></nav>
      <div className="r">
        <div className="lang"><button type="button" aria-label="Switch to Thai" aria-pressed={!en} onClick={() => setLanguage(false)}>ไทย</button><button type="button" aria-label="Switch to English" aria-pressed={en} onClick={() => setLanguage(true)}>EN</button></div>
        <button type="button" className="btn ghost sm" disabled={!available} onClick={signIn}>{t.signIn}</button>
        <button type="button" className="btn primary sm" disabled={!available} onClick={apply}>{available ? t.apply : t.unavailable}</button>
      </div>
    </div></header>
    <main id="installer-landing-main" tabIndex={-1}>
      <section className={'a-hero' + (auth ? ' authing' : '')}><div className="wrap">
        <div className="copy"><p className="eyebrow">{t.eyebrow}</p><h1>{designText(en ? 'en' : 'th').iH1}</h1><p className="lede">{t.lede}</p><div className="btns">
          <button type="button" className="btn primary lg" disabled={!available} onClick={apply}>{available ? t.applyLong : t.unavailable}<ArrowRight className="i" aria-hidden="true"/></button>
          <button type="button" className="btn ghost lg" disabled={!available} onClick={signIn}>{t.signIn}</button>
        </div></div>
        {auth || <div className="stack" role="group" aria-label={t.exLabel}>
          <div className="notif"><div className="nt"><span className="live" aria-hidden="true"/><b>{t.exNew}</b><span>{t.exNow}</span></div>
            <div className="nb"><span className="av" aria-hidden="true">{name[0]}</span><div><b>{name}</b><small>{en ? 'Prawet, Bangkok' : 'ประเวศ, กรุงเทพมหานคร'}</small></div></div>
            <div className="facts4 mini">{exampleFacts.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div>
            <div className="na"><span className="btn primary"><Phone className="i" aria-hidden="true"/>{en ? `Call ${name}` : `โทรหา${name}`}</span><span className="btn soft"><Copy className="i" aria-hidden="true"/>{t.copy}</span></div>
          </div><span className="ex-tag">{t.exTag}</span>
        </div>}
      </div></section>
      <section className="a-facts" id="price" aria-label={t.navPrice}><div className="wrap"><div className="fgrid">
        <div><b>{price}</b><span>{t.fPrice}</span></div>
        <div><b>{c ? c.recipientLimit : '—'}</b><span>{t.fCos}</span></div>
        <div><b>{c ? c.trialDeliveries : '—'}</b><span>{t.fFree}</span></div>
        <div><b>{c ? `${c.claimDays} ${en ? 'days' : 'วัน'}` : '—'}</b><span>{t.fClaim}</span></div>
      </div><p className="note">{t.fNote}</p></div></section>
      <section className="a-how" id="how"><div className="wrap"><p className="eyebrow">{t.howEyebrow}</p><h2>{t.howH}</h2><ol className="tl">
        {[[t.s1t, t.s1p], [t.s2t, t.s2p], [t.s3t, t.s3p]].map(([heading, text], i) => <li key={heading}><span className="n" aria-hidden="true">{i + 1}</span><h3>{heading}</h3><p>{text}</p></li>)}
      </ol></div></section>
      <section className="a-faq" id="faq"><div className="wrap"><div className="band">
        <Image src="/images/design-v2/palms-roof.jpg" alt={t.photoAlt} width={1600} height={1200} loading="eager"/>
        <span className="credit">Photo: Kindel Media / Pexels</span><h2>{t.faqH}</h2>
      </div><div className="qas">{faq.map(([question, answer]) => <details className="qa" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></div></section>
    </main>
    <footer className="foot"><div className="wrap">
      <div className="fb"><SignalBrand en={en}/><p>{t.footTag}</p></div>
      <div><h2 className="h4">{t.footInst}</h2><a href="#how">{t.navHow}</a><a href="#price">{t.navPrice}</a><button type="button" className="tlink" disabled={!available} onClick={signIn}>{t.signIn}</button></div>
      <div><h2 className="h4">SolarMatch</h2><a href={en ? '/en' : '/'}>{t.homeSite}</a><a href={en ? '/en/privacy' : '/privacy'}>{t.privacy}</a><a href={en ? '/en/terms' : '/terms'}>{t.terms}</a></div>
      <p className="fine">{t.footFine}</p>
    </div></footer>
  </div>;
}
