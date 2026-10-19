import Link from '@/components/site/internal-link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Calculator,
  ClipboardList,
  MessagesSquare,
} from 'lucide-react';
import { HomePage } from '@/components/home/home-page';
import { MethodologyContent } from '@/components/pages/methodology-content';
import { ResourcesContent } from '@/components/pages/resources-content';
import { SolarGuideContent } from '@/components/pages/solar-guide-content';
import { QuotationComparison } from '@/components/pages/quotation-comparison';
import { ContactContent } from '@/components/pages/contact-content';
import { EstimateShell } from '@/components/estimate/estimate-shell';
import { ResultsShell } from '@/components/results/results-shell';
import { PageHero } from '@/components/content/page-hero';
import { PublishedLegalDocument } from '@/components/content/published-legal-document';
import { prelaunchNotice } from '@/config/legal-review';

const en = (path = '') => `/en${path}`;

function EnglishHowItWorks() {
  return <main><PageHero eyebrow="How it works" title="How SolarMatch works"><p>SolarMatch breaks complicated information into three stages, showing what is known, what still needs checking, and what to ask an installer.</p></PageHero>
    <section className="site-shell numbered-sections">
      <article><span>01</span><ClipboardList /><div><h2>Start with available information</h2><p>Answer what you know about province, bills, usage, and the roof. There is no need to guess or upload documents.</p></div></article>
      <article><span>02</span><Calculator /><div><h2>Prepare a practical planning figure</h2><p>Your assessment answers produce a starting system size, production, price, savings, and payback with a method and source trail you can inspect.</p></div></article>
      <article><span>03</span><MessagesSquare /><div><h2>Prepare your next step</h2><p>View the full estimate without contact details and prepare questions for a professional assessment.</p><p>{prelaunchNotice.en}</p></div></article>
    </section>
    <section className="content-cta"><div className="site-shell"><h2>Ready to try it with your electricity bill?</h2><Link className="button" href={en('/estimate')}>Start estimate <ArrowRight size={18} /></Link></div></section>
  </main>;
}

function EnglishSolarGuide() {
  return <SolarGuideContent locale="en" />;
}

function EnglishMethodology() {
  return <MethodologyContent locale="en" />;
}

function EnglishContact() {
  return <ContactContent locale="en" />;
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
  { name: 'European Commission JRC · PVGIS', note: 'Long-run monthly solar reference for Bangkok; hourly timing and other locations remain approximations', href: 'https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en' },
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
    case 'quotation-comparison': return <QuotationComparison locale="en" />;
    case 'methodology': return <EnglishMethodology />;
    case 'contact': return <EnglishContact />;
    case 'resources': return <EnglishResources />;
    case 'privacy': return <EnglishPrivacy />;
    case 'terms': return <EnglishTerms />;
    case 'cookies': return <EnglishCookies />;
    default: notFound();
  }
}
