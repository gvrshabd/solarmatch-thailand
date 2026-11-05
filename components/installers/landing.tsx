'use client';

import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { InstallerPublicConfig } from '@/lib/installer/public-config';
import { LandingExamples } from './landing-examples';
import { LandingSunPath } from './landing-sun-path';
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
  const available = config.accountsAvailable;
  const canApply = available && config.registrationAvailable === true;
  const faq = signalLandingFaq(en, config.commercial);
  return <div className="signal landing" lang={en ? 'en' : 'th'}>
    <a className="sr skip" href="#installer-landing-main">{t.skip}</a>
    <header className="hdr"><div className="wrap">
      <SignalBrand en={en}/>
      <nav className="hnav" aria-label={t.navMain}><a href="#how">{t.navHow}</a><a href="#faq">{t.navFaq}</a></nav>
      <div className="r">
        <div className="lang" role="group" aria-label={en ? 'Language' : 'ภาษา'}><button type="button" lang="th" aria-label="Switch to Thai" aria-pressed={!en} onClick={() => setLanguage(false)}>ไทย</button><button type="button" lang="en" aria-label="Switch to English" aria-pressed={en} onClick={() => setLanguage(true)}>EN</button></div>
        <button type="button" className="btn ghost sm signin" disabled={!available} onClick={signIn}>{t.signIn}</button>
        <button type="button" className="btn primary sm" disabled={!canApply} onClick={apply}>{canApply ? t.apply : t.unavailable}</button>
      </div>
    </div></header>
    <main id="installer-landing-main" tabIndex={-1}>
      <div className="top">
        <div className="glow" aria-hidden="true"><span className="blob b1"/><span className="blob b2"/><span className="blob b3"/><span className="blob b4"/><span className="grain"/></div>
        <section className={'hero' + (auth ? ' authing' : '')}><div className="wrap">
          <div className="copy"><p className="eyebrow">{t.eyebrow}</p><h1 aria-label={t.h1a + t.h1b}><span aria-hidden="true">{t.headlineLines.map((line, i) => <span className={i >= 2 ? "headline-line accent" : "headline-line"} key={line}>{line}</span>)}</span></h1><div className="btns">
            <button type="button" className="btn primary lg" disabled={!canApply} onClick={apply}>{canApply ? t.applyLong : t.unavailable}<ArrowRight className="i arr" aria-hidden="true"/></button>
            <button type="button" className="btn ghost lg" disabled={!available} onClick={signIn}>{t.signIn}</button>
          </div></div>
          {auth || <LandingExamples en={en}/>}
        </div></section>
      </div>
      <section className="how" id="how"><div className="wrap"><h2>{t.howH}</h2><LandingSunPath en={en}/></div></section>
      <section className="faq" id="faq"><div className="wrap"><div className="band">
        <img src="/design-v3/palms-roof.jpg" alt={t.photoAlt} width={1600} height={1200} loading="lazy" decoding="async"/>
        <span className="credit">Photo: Kindel Media / Pexels</span><div className="wrap"><h2>{t.faqH}</h2></div>
      </div></div><div className="wrap"><div className="qas">{faq.map(([question, answer]) => <details className="qa" key={question}><summary>{question}<span className="pm" aria-hidden="true"/></summary><p>{answer}</p></details>)}</div></div></section>
    </main>
    <footer className="foot"><div className="wrap">
      <SignalBrand en={en}/>
      <nav aria-label={t.footer}><a href="#how">{t.navHow}</a><a href="#faq">{t.navFaq}</a><button type="button" className="tlink" disabled={!available} onClick={signIn}>{t.signIn}</button><a href={en ? '/en' : '/'}>{t.homeSite}</a><a href={en ? '/en/privacy' : '/privacy'}>{t.privacy}</a><a href={en ? '/en/terms' : '/terms'}>{t.terms}</a></nav>
      <p className="fine">{t.footFine}</p>
    </div></footer>
  </div>;
}
