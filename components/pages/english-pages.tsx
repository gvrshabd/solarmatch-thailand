import Link from '@/components/site/internal-link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Calculator,
  ClipboardList,
  MessagesSquare,
  ShieldCheck,
} from 'lucide-react';
import { HomePage } from '@/components/home/home-page';
import { AboutContent } from '@/components/pages/about-content';
import { MethodologyContent } from '@/components/pages/methodology-content';
import { ResourcesContent } from '@/components/pages/resources-content';
import { EstimateShell } from '@/components/estimate/estimate-shell';
import { ResultsShell } from '@/components/results/results-shell';
import { PageHero } from '@/components/content/page-hero';
import { PublishedLegalDocument } from '@/components/content/published-legal-document';
import { OperatorDisclosure } from '@/components/content/operator-disclosure';
import { solarAssumptions } from '@/config/solar-assumptions';

const en = (path = '') => `/en${path}`;

function EnglishAbout() {
  return <AboutContent locale="en" />;
}

function EnglishHowItWorks() {
  return <main><PageHero eyebrow="How it works" title="Understand your home before requesting quotes"><p>SolarMatch breaks complicated information into three stages, showing what is known, what still needs checking, and what to ask an installer.</p></PageHero>
    <section className="site-shell numbered-sections">
      <article><span>01</span><ClipboardList /><div><h2>Start with available information</h2><p>Answer what you know about province, bills, usage, and the roof. There is no need to guess or upload documents.</p></div></article>
      <article><span>02</span><Calculator /><div><h2>Prepare a practical planning figure</h2><p>Your assessment answers produce a starting system size, production, price, savings, and payback with a method and source trail you can inspect.</p></div></article>
      <article><span>03</span><MessagesSquare /><div><h2>Choose whether to request quotes</h2><p>Request real quotes and provide your preferred contact method, or continue straight to the full result without sharing contact details.</p></div></article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>Ready to try it with your electricity bill?</h2><Link className="button" href={en('/estimate')}>Start estimate <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishSolarGuide() {
  return <main><PageHero eyebrow="Solar guide" title="Rooftop solar starts with electricity use—not roof area alone"><p>The right system depends on several factors. This guide introduces the key ideas without promoting a brand or installer.</p></PageHero>
    <section className="site-shell guide-layout"><nav className="guide-index" aria-label="Contents"><strong>On this page</strong><a href="#daytime">Daytime electricity</a><a href="#roof">Roof and shade</a><a href="#size">System size</a><a href="#quotes">Comparing quotes</a></nav>
      <article className="prose guide-prose"><section id="daytime"><p className="eyebrow">01 · Behaviour</p><h2>Daytime electricity use matters</h2><p>Panels generate while the sun is shining. Homes using air conditioning, pumps, or work-from-home equipment during the day may consume more solar energy directly than homes whose main demand occurs at night.</p></section><section id="roof"><p className="eyebrow">02 · Site conditions</p><h2>Area does not tell the whole story</h2><p>Orientation, pitch, material, shade from trees or buildings, and structural strength all matter. A professional survey is still required before a real design.</p></section><section id="size"><p className="eyebrow">03 · Sizing</p><h2>Bigger is not always more suitable</h2><p>A system much larger than the home’s usage pattern may produce energy that creates less value than expected, particularly where export rules and rates are limited.</p></section><section id="quotes"><p className="eyebrow">04 · Comparing</p><h2>Ask quotations to explain the same things</h2><p>Compare DC and AC size, equipment models, warranties, production assumptions, structural work, installation standards, monitoring, and exclusions—not only the total on the first page.</p><div className="callout"><strong>Important</strong><p>SolarMatch has not vetted or endorsed any installer and does not yet operate a live quote-comparison service.</p></div></section></article>
    </section><section className="content-cta"><div className="site-shell"><h2>Turn your bill into a practical starting system size</h2><Link className="button" href={en('/estimate')}>Start estimate <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishMethodology() {
  const legacyMethodology = (
    <main>
      <PageHero eyebrow="Methodology" title="We show assumptions because useful figures should be traceable">
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
  void legacyMethodology;
  return <MethodologyContent locale="en" />;
}

function EnglishContact() {
  return <main><PageHero eyebrow="Contact" title="Contact channels will open after accountable details are complete"><p>SolarMatch will not display or activate LINE, phone, or email until the legal operator, privacy channel, recipient category, and distribution terms have been correctly confirmed.</p></PageHero><section className="site-shell contact-status-card"><ShieldCheck /><div><h2>The assessment remains available</h2><p>You can see results without providing personal information. When contact requests open, the site will clearly explain that more than one participating residential solar company may receive the enquiry, then request separate explicit consent.</p><Link className="text-link" href={en('/privacy')}>Read the Privacy Notice <ArrowRight /></Link><OperatorDisclosure locale="en" /></div></section></main>;
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
  { name: 'European Commission JRC · PVGIS', note: 'Solar-resource evidence used to establish the province-level production anchors', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en' },
  { name: 'OpenStreetMap · Tile policy', note: 'Terms for the map used to confirm a location without sending typed address text to a geocoder', href: 'https://operations.osmfoundation.org/policies/tiles/' },
  { name: 'Greener Bangkok · Home solar installation guide', note: 'Reference information on production, roof review, and installation steps', href: 'https://greener.bangkok.go.th/en/solarcity/solar-installation-guide-for-homes/' },
  { name: 'GRoof · May 2026 package brochure (PDF)', note: 'Package-price input used to build a planning anchor; not an installer endorsement', href: 'https://groof-public.s3.ap-southeast-1.amazonaws.com/pdfs/GRoofPackage_Brochure_May2026.pdf' },
  { name: 'PEA Shopping · 5 kW Standard package', note: 'One observed market-price reference for a 5 kW system', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-standard-package/' },
  { name: 'PEA Shopping · 5 kW Premium package', note: 'Another observed market-price reference for a 5 kW system', href: 'https://peashopping.com/product/pea-solar-5kw-1-phase-premium-package/' },
  { name: 'PEA Shopping · 10 kW Standard package', note: 'One observed market-price reference for a 10 kW system', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-standard-package/' },
  { name: 'PEA Shopping · 10 kW Premium package', note: 'Another observed market-price reference for a 10 kW system', href: 'https://peashopping.com/product/pea-solar-10kw-3-phase-premium-package/' },
];

function EnglishResources() {
  void resources;
  return <ResourcesContent locale="en" />;
}

function EnglishPrivacy() {
  return <PublishedLegalDocument type="privacy" locale="en" />;
}

function EnglishTerms() {
  return <PublishedLegalDocument type="terms" locale="en" />;
}

function EnglishCookies() {
  return <PublishedLegalDocument type="cookies" locale="en" />;
}

export function EnglishPage({ slug }: { slug: string }) {
  switch (slug) {
    case '': return <HomePage locale="en" />;
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
