import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  Eye,
  FileSearch,
  Mail,
  MessageCircle,
  MessagesSquare,
  Phone,
  Scale,
  ShieldCheck,
  SunMedium,
  Zap,
} from 'lucide-react';
import { HeroEstimator } from '@/components/home/hero-estimator';
import { EstimateShell } from '@/components/estimate/estimate-shell';
import { ResultsShell } from '@/components/results/results-shell';
import { PrototypeNotice } from '@/components/site/prototype-notice';
import { SectionHeading } from '@/components/ui/section-heading';
import { PageHero } from '@/components/content/page-hero';
import { LegalShell } from '@/components/content/legal-shell';
import { solarAssumptions } from '@/config/solar-assumptions';

const en = (path = '') => `/en${path}`;

function EnglishHome() {
  const trustItems = ['See results before entering a phone number', 'No bill upload required', 'Free for homeowners'];
  return (
    <main>
      <section className="hero" id="top">
        <div className="site-shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow"><SunMedium size={16} aria-hidden="true" /> Rooftop solar estimates for homes in Thailand</p>
            <h1>How suitable is your home<br /><em>for rooftop solar?</em></h1>
            <p className="hero-lede">See an initial system-size and possible savings range before deciding whether to speak with an installer.</p>
            <PrototypeNotice compact locale="en" />
            <HeroEstimator locale="en" />
            <ul className="trust-list" aria-label="Important information">
              {trustItems.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}
            </ul>
          </div>
          <div className="hero-visual" aria-label="Illustration of a modern Thai home with rooftop solar">
            <div className="sun-orbit" aria-hidden="true" />
            <div className="visual-caption"><span>Start with information you already have</span><strong>Electricity bill + usage pattern</strong></div>
            <div className="roof-form" aria-hidden="true"><div className="roof-plane roof-plane-one" /><div className="roof-plane roof-plane-two" /><div className="house-wall" /></div>
            <div className="result-peek"><span>Example estimate</span><strong>3–5 <small>kW</small></strong><p>Shown as a range, not a guaranteed figure</p></div>
          </div>
        </div>
      </section>

      <section className="value-intro" id="how">
        <div className="site-shell value-grid">
          <div><p className="eyebrow">Before requesting a quote</p><h2>First understand what your home may actually need</h2></div>
          <div className="value-copy"><p>SolarMatch organizes the basics in plain language, helping you ask better questions and avoid starting from zero when speaking with installers.</p><Link className="text-link" href={en('/how-it-works')}>See how it works <ArrowRight size={18} aria-hidden="true" /></Link></div>
        </div>
      </section>

      <section className="home-process">
        <div className="site-shell">
          <SectionHeading eyebrow="A few simple minutes" title="From one electricity bill to better questions" align="center"><p>This tool organizes initial information. It does not replace a site survey or engineering advice.</p></SectionHeading>
          <div className="process-grid">
            <article><span>01</span><ClipboardCheck /><h3>Answer from what you know</h3><p>Province, electricity bill, and daytime use. No document upload required.</p></article>
            <article><span>02</span><FileSearch /><h3>See a range</h3><p>View system size, production, and possible savings as ranges that reflect uncertainty.</p></article>
            <article><span>03</span><MessageCircle /><h3>Choose whether to continue</h3><p>You always see the result first. Contact is separate and remains disabled in this prototype.</p></article>
          </div>
        </div>
      </section>

      <section className="principles-section">
        <div className="site-shell principles-grid">
          <div className="principles-visual" aria-hidden="true"><div className="energy-line line-one" /><div className="energy-line line-two" /><div className="principle-orb"><SunMedium /><strong>Understand</strong><span>before deciding</span></div></div>
          <div>
            <SectionHeading eyebrow="Designed for homeowners" title="Figures with assumptions you can inspect"><p>Assumptions, limitations, and confidence are kept close to each result.</p></SectionHeading>
            <ul className="principle-list">
              <li><ShieldCheck /><span><strong>No manufactured urgency</strong><small>No countdown timers or pressure to submit contact details.</small></span></li>
              <li><Zap /><span><strong>No hiding what remains unknown</strong><small>Export income, tax benefits, and payback are excluded until the inputs are validated.</small></span></li>
              <li><Check /><span><strong>Assumptions can change cleanly</strong><small>The calculator and content are modular, ready to be updated after research.</small></span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="site-shell faq-grid">
          <SectionHeading eyebrow="Frequently asked questions" title="Start without already knowing solar" />
          <div className="faq-list">
            <details open><summary>How accurate is this estimate?</summary><p>It is an initial screen based on electricity cost and usage patterns. Accuracy improves with roof, load, and site-survey information.</p></details>
            <details><summary>Do I need to enter a phone number before seeing results?</summary><p>No. You see the estimate first. The contact form appears afterwards and currently validates then discards submissions.</p></details>
            <details><summary>Is SolarMatch an installer?</summary><p>No. This prototype is testing a tool that helps homeowners understand their needs before speaking with service providers.</p></details>
            <details><summary>Why is payback not calculated yet?</summary><p>Installation price, warranty structure, maintenance, and policy all matter. We will not publish a payback figure until the market assumptions are validated.</p></details>
          </div>
        </div>
      </section>

      <section className="final-cta"><div className="site-shell final-cta-inner"><div><p className="eyebrow">About 3 minutes</p><h2>Start understanding what kind of system your home may need</h2><p>See results before entering contact information, and edit your answers at any time.</p></div><Link className="button button-gold" href={en('/estimate')}>Start free estimate <ArrowRight size={18} /></Link></div></section>
    </main>
  );
}

function EnglishAbout() {
  return <main><PageHero eyebrow="About" title="A place for homeowners to think before being asked to decide"><p>SolarMatch Thailand is a prototype exploring whether a neutral explanation of solar needs can improve conversations between homeowners and installers.</p></PageHero>
    <section className="site-shell about-grid"><article><Eye /><h2>Clarity first</h2><p>Show what is known, what is assumed, and what is not ready for real-world use.</p></article><article><Scale /><h2>No conclusion beyond the evidence</h2><p>Use ranges and never claim a system is “best” without a site survey.</p></article><article><ShieldCheck /><h2>Consent before any referral</h2><p>People should see their result first and know exactly what would be sent, to whom, and why.</p></article></section>
    <section className="founder-note"><div className="site-shell"><p className="eyebrow">Project status</p><h2>Being built alongside market interviews</h2><p>Lead qualification, pricing, matching, and installer criteria are intentionally deferred until there is evidence from homeowners and potential buyers.</p><Link className="text-link" href={en('/methodology')}>See how prototype assumptions are separated from validated inputs <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishHowItWorks() {
  return <main><PageHero eyebrow="How it works" title="Understand your home before requesting quotes"><p>SolarMatch breaks complicated information into three stages, showing what is known, what still needs checking, and what to ask an installer.</p></PageHero>
    <section className="site-shell numbered-sections">
      <article><span>01</span><ClipboardList /><div><h2>Start with available information</h2><p>Answer what you know about province, bills, usage, and the roof. There is no need to guess or upload documents.</p></div></article>
      <article><span>02</span><Calculator /><div><h2>View an estimated range</h2><p>The prototype assumptions produce ranges for system size, production, and possible savings, together with a confidence level.</p></div></article>
      <article><span>03</span><MessagesSquare /><div><h2>Choose your own next step</h2><p>Results always come before contact. In the future, data would only be shared when a user actively chooses to continue under clear consent.</p></div></article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>Ready to try it with your electricity bill?</h2><Link className="button" href={en('/estimate')}>Start estimate <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishSolarGuide() {
  return <main><PageHero eyebrow="Solar guide" title="Rooftop solar starts with electricity use—not roof area alone"><p>The right system depends on several factors. This guide introduces the key ideas without promoting a brand or installer.</p></PageHero>
    <section className="site-shell guide-layout"><nav className="guide-index" aria-label="Contents"><strong>On this page</strong><a href="#daytime">Daytime electricity</a><a href="#roof">Roof and shade</a><a href="#size">System size</a><a href="#quotes">Comparing quotes</a></nav>
      <article className="prose guide-prose"><section id="daytime"><p className="eyebrow">01 · Behaviour</p><h2>Daytime electricity use matters</h2><p>Panels generate while the sun is shining. Homes using air conditioning, pumps, or work-from-home equipment during the day may consume more solar energy directly than homes whose main demand occurs at night.</p></section><section id="roof"><p className="eyebrow">02 · Site conditions</p><h2>Area does not tell the whole story</h2><p>Orientation, pitch, material, shade from trees or buildings, and structural strength all matter. A professional survey is still required before a real design.</p></section><section id="size"><p className="eyebrow">03 · Sizing</p><h2>Bigger is not always more suitable</h2><p>A system much larger than the home’s usage pattern may produce energy that creates less value than expected, particularly where export rules and rates are limited.</p></section><section id="quotes"><p className="eyebrow">04 · Comparing</p><h2>Ask quotations to explain the same things</h2><p>Compare DC and AC size, equipment models, warranties, production assumptions, structural work, installation standards, monitoring, and exclusions—not only the total on the first page.</p><div className="callout"><strong>Important</strong><p>SolarMatch has not vetted or endorsed any installer and does not yet operate a live quote-comparison service.</p></div></section></article>
    </section><section className="content-cta"><div className="site-shell"><h2>Turn your bill into a possible system-size range</h2><Link className="button" href={en('/estimate')}>Start estimate <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishMethodology() {
  return <main><PageHero eyebrow="Methodology · Prototype" title="We show assumptions because useful figures should be traceable"><p>The current calculator creates ranges to test the experience. It is not an engineering design or a savings guarantee.</p><p className="updated-date">Assumption version {solarAssumptions.version}</p></PageHero>
    <section className="site-shell methodology-grid"><article className="prose"><h2>Estimation sequence</h2><ol><li>Convert the electricity bill to consumption using a simplified value of ฿{solarAssumptions.simplifiedRetailValueThbPerKwh}/kWh.</li><li>Apply the daytime-use share selected by the user.</li><li>Estimate reference capacity using an annual yield of {solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('en-US')} kWh/kWp.</li><li>Expand the result to ±18%, or ±28% when roof information is unclear.</li><li>Cap possible savings so they do not exceed the electricity bill entered.</li></ol><h2>Intentionally excluded</h2><p>Installation cost, payback, degradation, maintenance, finance, export income, tax, and production guarantees are not part of the main result.</p><h2>Limitations</h2><p>Real tariffs contain several charges. Solar conditions vary by location and site. This calculation is only a starting point for better questions.</p></article><aside className="assumption-table"><h2>Current settings</h2><dl><div><dt>Reference yield</dt><dd>{solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('en-US')} kWh/kWp/year</dd></div><div><dt>Simplified electricity value</dt><dd>฿{solarAssumptions.simplifiedRetailValueThbPerKwh}/kWh</dd></div><div><dt>Reference FiT</dt><dd>฿{solarAssumptions.fit.rateThbPerKwh}/kWh · excluded</dd></div><div><dt>Reference tax cap</dt><dd>฿{solarAssumptions.tax.deductionCapThb.toLocaleString('en-US')} · excluded</dd></div><div><dt>Reference last checked</dt><dd>{solarAssumptions.fit.lastVerified}</dd></div></dl></aside></section>
  </main>;
}

function EnglishContact() {
  return <main><PageHero eyebrow="Contact" title="Contact channels are not active yet"><p>The structure is ready, but no real LINE account, phone number, or email address will be displayed until ownership and consent wording are complete.</p></PageHero>
    <section className="site-shell contact-layout"><div className="contact-cards"><article><MessageCircle /><div><h2>LINE Official Account</h2><p>Waiting for account connection and automated-message review</p></div><button disabled>Not active</button></article><article><Phone /><div><h2>Phone</h2><p>Waiting for service hours and an accountable recipient</p></div><button disabled>Not active</button></article><article><Mail /><div><h2>Email</h2><p>Waiting for an inbox owner and data-handling policy</p></div><button disabled>Not active</button></article></div><aside className="line-placeholder"><PrototypeNotice locale="en" /><div className="qr-placeholder" aria-label="Reserved space for a future LINE QR code"><span>LINE QR</span><small>placeholder</small></div><p>When enabled, the button and QR code will be controlled from one setting in <code>config/site.ts</code>.</p></aside></section>
  </main>;
}

const resources = [
  { name: 'Energy Regulatory Commission (ERC)', note: 'Regulation, licensing, and related official announcements', href: 'https://www.erc.or.th/' },
  { name: 'Metropolitan Electricity Authority (MEA)', note: 'Electricity-system information for Bangkok, Nonthaburi, and Samut Prakan', href: 'https://www.mea.or.th/' },
  { name: 'Provincial Electricity Authority (PEA)', note: 'Electricity-system information for other areas of Thailand', href: 'https://www.pea.co.th/' },
  { name: 'Department of Alternative Energy Development and Efficiency (DEDE)', note: 'Renewable-energy information and public resources', href: 'https://www.dede.go.th/' },
];

function EnglishResources() {
  return <main><PageHero eyebrow="Resources" title="Begin verification with official sources"><p>Policies and conditions can change. Check the latest information with the relevant authority before making a decision.</p></PageHero><section className="site-shell resource-list">{resources.map((resource) => <a key={resource.name} href={resource.href} target="_blank" rel="noreferrer"><div><h2>{resource.name}</h2><p>{resource.note}</p></div><ExternalLink size={20} /></a>)}<div className="callout"><strong>Reference status</strong><p>Policy figures shown on this website are excluded from the main calculation and must be rechecked before any live launch.</p></div></section></main>;
}

function EnglishPrivacy() {
  return <LegalShell locale="en" title="Privacy notice" summary="This page describes the principles intended for any future live system. The current contact form is a prototype and does not store submissions."><h2>1. Prototype status</h2><p>Estimate answers are kept in your browser’s session storage to produce a result on your device. The contact form sends to a test endpoint that validates the format and immediately discards the data. It is not stored, forwarded, or used for marketing.</p><h2>2. Information that may be collected in a live service</h2><p>Name, phone number, preferred contact channel and time, estimate answers, and consent records. A data controller, retention period, and recipients must be defined before this is enabled.</p><h2>3. Intended purposes</h2><p>Producing an estimate, responding to a user request, and—only with explicit consent—sending necessary information to an identified service provider.</p><h2>4. Your rights</h2><p>A live service must provide a channel to request access, correction, consent withdrawal, deletion, or objection under applicable law.</p><h2>5. Still to be defined</h2><p>The responsible legal entity, address, privacy contact, legal bases, processors, retention periods, transfers, and data-subject request procedures.</p></LegalShell>;
}

function EnglishTerms() {
  return <LegalShell locale="en" title="Terms of use" summary="Draft terms for the prototype estimate tool. These are not final terms for a live service."><h2>1. Nature of the service</h2><p>SolarMatch provides educational information and experience testing only. It is not an installer, engineering adviser, financial provider, or licensed broker.</p><h2>2. Estimated results</h2><p>Results come from user-provided information and simplified assumptions. They do not guarantee system size, production, savings, income, returns, or property suitability.</p><h2>3. Checks before making a decision</h2><p>Users should obtain a site survey and check structure, electrical systems, permits, contracts, warranties, and current policy with qualified professionals and relevant authorities.</p><h2>4. Features not active</h2><p>This prototype does not match installers, accept payment, issue quotations, or send real lead information.</p><h2>5. Required before a live launch</h2><p>Legal-entity information, governing law, liability limits, complaint procedures, suspension rules, and partner details require legal review.</p></LegalShell>;
}

function EnglishCookies() {
  return <LegalShell locale="en" title="Cookies and browser storage" summary="The prototype has no analytics or advertising, so it does not display an unnecessary consent banner."><h2>1. What is used now</h2><p>The estimator uses session storage to carry answers from the estimate page to the results page. This information remains in the browser session and is not a SolarMatch database.</p><h2>2. What is not active</h2><p>There are no advertising cookies, analytics pixels, heatmaps, or cross-site tracking tools in this version.</p><h2>3. If this changes</h2><p>Before any non-essential tool is enabled, the website must describe its purpose, duration, provider, and user-choice mechanism.</p><h2>4. Removing temporary information</h2><p>You can close the browser tab or window to clear session storage according to your browser’s behaviour.</p></LegalShell>;
}

export function EnglishPage({ slug }: { slug: string }) {
  switch (slug) {
    case '': return <EnglishHome />;
    case 'estimate': return <EstimateShell locale="en" />;
    case 'estimate/results': return <ResultsShell locale="en" />;
    case 'how-it-works': return <EnglishHowItWorks />;
    case 'solar-guide': return <EnglishSolarGuide />;
    case 'methodology': return <EnglishMethodology />;
    case 'about': return <EnglishAbout />;
    case 'contact': return <EnglishContact />;
    case 'resources': return <EnglishResources />;
    case 'privacy': return <EnglishPrivacy />;
    case 'terms': return <EnglishTerms />;
    case 'cookies': return <EnglishCookies />;
    default: notFound();
  }
}
