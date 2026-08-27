import Link from '@/components/site/internal-link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Calculator,
  Check,
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
          <SectionHeading eyebrow="Start with what you know" title="From one electricity bill to better questions" align="center"><p>This tool organizes initial information. It does not replace a site survey or engineering advice.</p></SectionHeading>
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
            <details><summary>Do I need to enter a phone number before seeing results?</summary><p>No. You see the estimate first. The contact form appears afterwards and currently validates in the browser, then discards the values without transmitting them.</p></details>
            <details><summary>Is SolarMatch an installer?</summary><p>No. This prototype is testing a tool that helps homeowners understand their needs before speaking with service providers.</p></details>
            <details><summary>Why is payback not calculated yet?</summary><p>Installation price, warranty structure, maintenance, and policy all matter. We will not publish a payback figure until the market assumptions are validated.</p></details>
          </div>
        </div>
      </section>

      <section className="final-cta"><div className="site-shell final-cta-inner"><div><h2>Start understanding what kind of system your home may need</h2><p>See results before entering contact information.</p></div><Link className="button button-gold" href={en('/estimate')}>Start free estimate <ArrowRight size={18} /></Link></div></section>
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
  return (
    <main>
      <PageHero eyebrow="Methodology · Prototype" title="We show assumptions because useful figures should be traceable">
        <p>This result is an estimated range for asking better questions before requesting a quotation. It is not an engineering design, quotation, or savings guarantee.</p>
        <p className="updated-date">Assumption version {solarAssumptions.version} · policy sources last checked 2026-08-28</p>
      </PageHero>

      <section className="site-shell methodology-grid">
        <article className="prose">
          <h2>Estimation sequence</h2>
          <ol>
            <li>Estimate monthly consumption from the bill using the versioned progressive residential tariff, fuel-adjustment charge (Ft), service charge, and VAT described below.</li>
            <li>Estimate system capacity from annual consumption, the selected daytime-use share, and reference production of about 1,400 kWh per kWp per year. Widen the range when roof or shade information is unclear.</li>
            <li>Value electricity used by the home first. Avoided cost is the difference between utility bills before and after solar, rather than a flat value for every unit generated.</li>
            <li>Estimate installation cost by interpolating between observed 3, 5, and 10 kW package ranges. This is a market reference, not a quotation.</li>
            <li>The long-term view uses 0.5% annual production degradation, annual operations and maintenance of 0.4–0.8% of installation cost, and no electricity-price escalation in the base case.</li>
          </ol>

          <h2>Electricity tariff used as the base</h2>
          <p>For August 2026, the model uses the residential schedule for consumption above 150 kWh/month that took effect in May 2023: ฿3.2484/kWh for 0–150 kWh, ฿4.2218 for 151–400 kWh, and ฿4.4217 above 400 kWh, plus a ฿24.62 monthly service charge, Ft of ฿0.1623/kWh, and 7% VAT. A household’s actual customer class and bill details may differ.</p>
          <p>The announced September 2026 schedule changes the tiers to ฿3.0000/kWh for 0–200 kWh, ฿4.1584 for 201–400 kWh, and ฿4.3583 above 400 kWh, with the same ฿24.62 service charge, Ft of ฿0.1623/kWh for September–December, and 7% VAT. It is documented for the next model update but is not treated as active before its effective date.</p>

          <h2>Installation-cost references</h2>
          <p>Package observations collected in May–August 2026 suggest roughly ฿115,000–156,000 for 3 kW, ฿145,000–237,000 for 5 kW, and ฿230,000–362,000 for 10 kW. The model interpolates between the lower and upper bounds of those reference points and retains the uncertainty range. Equipment, structural work, cable runs, warranties, and site conditions can materially change a real price.</p>

          <h2>Self-consumption and surplus electricity</h2>
          <p>The base result values solar electricity used within the home first. Surplus-purchase income is excluded from base savings, payback, and the long-term cost chart.</p>
          <p>The surplus-purchase programme opened on 1 July 2026 for Type 1 residential customers. It specifies ฿2.20/kWh for 10 years and limits export to 5 kW AC per meter/applicant. Eligibility remains subject to quota, inspection, technical conditions, and MEA or PEA approval. A system larger than 5 kW may serve self-consumption, but export must be controlled under the utility’s conditions. The purchase rate therefore must not be added automatically to a household result.</p>

          <h2>Tax treatment excluded from the result</h2>
          <p>Royal Decree No. 805 provides a personal-income-tax exemption/deduction based on actual qualifying expenditure, capped at ฿200,000, for an eligible grid-connected system successfully connected by 31 December 2028. Conditions include installed capacity of no more than 10 kWp per meter, a VAT-registered seller, a full electronic tax invoice, and one system per claim. It is not a ฿200,000 refund; the tax effect depends on individual eligibility and taxable income. SolarMatch therefore excludes it from the estimate.</p>

          <h2>Direct sources</h2>
          <ul>
            <li><a href="https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766" target="_blank" rel="noreferrer">PEA surplus-purchase programme details</a></li>
            <li><a href="https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e" target="_blank" rel="noreferrer">MEA programme and technical conditions</a></li>
            <li><a href="https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf" target="_blank" rel="noreferrer">Energy Regulatory Commission programme notice (PDF)</a></li>
            <li><a href="https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf" target="_blank" rel="noreferrer">Royal Decree No. 805 (PDF)</a></li>
            <li><a href="https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf" target="_blank" rel="noreferrer">Electricity tariff used for the August 2026 base (PDF)</a></li>
            <li><a href="https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf" target="_blank" rel="noreferrer">Electricity tariff effective from September 2026 (PDF)</a></li>
            <li><a href="https://www.erc.or.th/th/automatic" target="_blank" rel="noreferrer">ERC fuel-adjustment charge (Ft)</a></li>
          </ul>
        </article>

        <aside className="assumption-table">
          <h2>Current settings</h2>
          <dl>
            <div><dt>Reference production</dt><dd>1,400 kWh/kWp/year</dd></div>
            <div><dt>Base value</dt><dd>Electricity used within the home</dd></div>
            <div><dt>Production degradation</dt><dd>0.5% per year</dd></div>
            <div><dt>Operations and maintenance</dt><dd>0.4–0.8% of installation cost/year</dd></div>
            <div><dt>Base tariff escalation</dt><dd>0%</dd></div>
            <div><dt>Surplus purchase</dt><dd>฿2.20/kWh · conditional · excluded from base</dd></div>
            <div><dt>Export limit</dt><dd>5 kW AC · not a system-size limit</dd></div>
            <div><dt>Purchase term</dt><dd>10 years · subject to quota and approval</dd></div>
            <div><dt>Tax qualifying-spend cap</dt><dd>฿200,000 · not a refund · excluded</dd></div>
            <div><dt>Sources last checked</dt><dd>2026-08-28</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

function EnglishContact() {
  return <main><PageHero eyebrow="Contact" title="Contact channels are not active yet"><p>The structure is ready, but no real LINE account, phone number, or email address will be displayed until ownership and consent wording are complete.</p></PageHero>
    <section className="site-shell contact-layout"><div className="contact-cards"><article><MessageCircle /><div><h2>LINE Official Account</h2><p>Waiting for account connection and automated-message review</p></div><button disabled>Not active</button></article><article><Phone /><div><h2>Phone</h2><p>Waiting for service hours and an accountable recipient</p></div><button disabled>Not active</button></article><article><Mail /><div><h2>Email</h2><p>Waiting for an inbox owner and data-handling policy</p></div><button disabled>Not active</button></article></div><aside className="line-placeholder"><PrototypeNotice locale="en" /><div className="qr-placeholder" aria-label="Reserved space for a future LINE QR code"><span>LINE QR</span><small>placeholder</small></div><p>When enabled, the button and QR code will be controlled from one setting in <code>config/site.ts</code>.</p></aside></section>
  </main>;
}

const resources = [
  { name: 'PEA · Surplus-purchase programme details', note: '฿2.20/kWh rate, 10-year term, 5 kW AC export limit, and programme conditions', href: 'https://ppim.pea.co.th/app/v1/project/solar/detail/6a3df059ee9f0e286c0a1766' },
  { name: 'PEA · Programme opening announcement', note: 'Opening for Type 1 residential applicants from 1 July 2026', href: 'https://www.pea.co.th/news/corporate-news/2137' },
  { name: 'MEA · My Energy programme details', note: 'Application, system, and export-control conditions within the MEA service area', href: 'https://myenergy.mea.or.th/project/6a38ac8d329d02001dd7024e' },
  { name: 'Energy Regulatory Commission · Programme notice (PDF)', note: 'Regulatory framework, quota, and conditions for surplus purchases', href: 'https://erc.or.th/web-upload/200xf869baf82be74c18cc110e974eea8d5c/202606/m_news/9090/3441/file_download/ae5c0f3369d23b692064262036b1725f.pdf' },
  { name: 'Revenue Department · Royal Decree No. 805 (PDF)', note: 'The legal text for the personal-income-tax treatment of qualifying rooftop solar', href: 'https://www.rd.go.th/fileadmin/user_upload/kormor/newlaw/dc805.pdf' },
  { name: 'Revenue Department · Royal Decree register', note: 'Official document register for checking the law and its status', href: 'https://www.rd.go.th/1603.html' },
  { name: 'Revenue Department · Solar tax conditions (PDF)', note: 'Electronic tax-invoice, connection, and qualifying-expenditure conditions', href: 'https://rd.go.th/fileadmin/user_upload/lorkhor/newsbanner/2025/11/solar.pdf' },
  { name: 'PEA · May 2023 electricity tariff (PDF)', note: 'Base residential tariff referenced for August 2026', href: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf' },
  { name: 'PEA · September 2026 electricity tariff (PDF)', note: 'Residential tariff structure announced to take effect from September 2026', href: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf' },
  { name: 'Energy Regulatory Commission · Automatic Ft', note: 'Official source for checking current fuel-adjustment charges and periods', href: 'https://www.erc.or.th/th/automatic' },
  { name: 'Greener Bangkok · Home solar installation guide', note: 'Reference information on production, roof review, and installation steps', href: 'https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/' },
  { name: 'GRoof · May 2026 package brochure (PDF)', note: 'Package-price input used to build a market range; not an installer endorsement', href: 'https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf' },
  { name: 'PEA Shopping · 5 kW Standard package', note: 'One observed market-price reference for a 5 kW system', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/' },
  { name: 'PEA Shopping · 5 kW Premium package', note: 'An upper-range price reference for a 5 kW system', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-premium-package/' },
  { name: 'PEA Shopping · 10 kW Standard package', note: 'One observed market-price reference for a 10 kW system', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-standard-package/' },
  { name: 'PEA Shopping · 10 kW Premium package', note: 'An upper-range price reference for a 10 kW system', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-premium-package/' },
];

function EnglishResources() {
  return (
    <main>
      <PageHero eyebrow="Resources · checked 2026-08-28" title="Check the figures against their primary sources">
        <p>Policy, tariffs, prices, and conditions can change. These are the sources used for the prototype assumptions and should be rechecked before a real decision.</p>
      </PageHero>
      <section className="site-shell resource-list">
        {resources.map((resource) => (
          <a key={resource.name} href={resource.href} target="_blank" rel="noreferrer" aria-label={`${resource.name} (opens in a new tab)`}>
            <div><h2>{resource.name}</h2><p>{resource.note}</p></div>
            <ExternalLink size={20} aria-hidden="true" />
          </a>
        ))}
        <div className="callout">
          <strong>Reference status</strong>
          <p>The base result values electricity used within the home first. Surplus-purchase income and tax treatment are not added because quota, approval, eligibility, and each household’s tax position require separate checks.</p>
        </div>
      </section>
    </main>
  );
}

function EnglishPrivacy() {
  return <LegalShell locale="en" title="Privacy notice" summary="This page describes the principles intended for any future live system. The current contact form is a prototype and does not store submissions."><h2>1. Prototype status</h2><p>Estimate answers are kept in your browser’s session storage to produce a result on your device. The current contact form validates its format locally in the browser and immediately discards the values without sending them to a server. They are not stored, forwarded, or used for marketing.</p><h2>2. Information that may be collected in a live service</h2><p>Name, phone number, preferred contact channel and time, estimate answers, and consent records. A data controller, retention period, and recipients must be defined before this is enabled.</p><h2>3. Intended purposes</h2><p>Producing an estimate, responding to a user request, and—only with explicit consent—sending necessary information to an identified service provider.</p><h2>4. Your rights</h2><p>A live service must provide a channel to request access, correction, consent withdrawal, deletion, or objection under applicable law.</p><h2>5. Still to be defined</h2><p>The responsible legal entity, address, privacy contact, legal bases, processors, retention periods, transfers, and data-subject request procedures.</p></LegalShell>;
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
