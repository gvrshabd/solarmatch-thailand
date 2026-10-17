/** Finite installer-published configurations, not an interpolated THB/kWp price curve. */
export type SolarPackage = {
  id: string;
  labelEn: string;
  labelTh: string;
  supplier: string;
  dcKwp: number;
  moduleCount: number;
  moduleWp: number;
  moduleDescription: string;
  inverterAcKw: number;
  inverterDescription: string;
  phase: 'single' | 'three';
  publishedRoofAreaSqm: number;
  requiredRoofAreaSqm: number;
  referencePriceThb: number;
  planningPriceThb: number;
  priceBasis: 'published-starting-price-plus-7pct-contingency';
  vatStatus: 'not-stated';
  batteryIncluded: false;
  sourceUrl: string;
  sourceDate: string;
  verifiedDate: string;
  validUntil: string | null;
  scope: readonly string[];
  limitations: readonly string[];
};

const supplier = 'CX ENERTECH';
const common = {
  supplier,
  priceBasis: 'published-starting-price-plus-7pct-contingency' as const,
  vatStatus: 'not-stated' as const,
  batteryIncluded: false as const,
  sourceDate: '2026-09-27',
  verifiedDate: '2026-10-17',
  validUntil: null, // Supplier does not publish an expiry; not an indefinite quotation.
  scope: ['Modules and inverter', 'Mounting, DC/AC wiring and protection', 'Monitoring and earthing', 'Installation, testing and handover', 'Drawings and application documents'],
  limitations: [
    'Installer catalogue starting price, explicitly not a binding quotation; availability and site scope require confirmation.',
    'No supplier expiry is stated. Obtain a current site quotation; this is a dated reference, not an indefinitely valid offer.',
    'VAT is not stated on the package page. A 7% planning contingency is added once, not represented as confirmed tax.',
    'Published equipment data are installer claims, not a verified string/MPPT design or utility approval.',
    'Roof allowance is max(published area, DC kWp × 5.5 m²/kWp); actual access, setbacks, structure and layout need a survey.',
    'Roof repairs, structural strengthening, switchboard upgrades and utility fees are not confirmed in this price.',
  ],
};

/** Do not shrink or scale these configurations to fit a small roof or low bill. */
export const solarPackages: readonly SolarPackage[] = [
  {
    ...common,
    id: 'cx-og-hw-3-1p-aik550', labelEn: '3.30 kWp DC / 3 kW AC · single phase', labelTh: '3.30 kWp DC / 3 kW AC · 1 เฟส',
    moduleCount: 6, moduleWp: 550, dcKwp: 3.3, moduleDescription: 'AIKO ABC N-type 550 Wp (installer catalogue)',
    inverterAcKw: 3, inverterDescription: 'Huawei LB0 3 kW single phase (installer catalogue)', phase: 'single',
    publishedRoofAreaSqm: 16.8, requiredRoofAreaSqm: 18.15,
    referencePriceThb: 105000, planningPriceThb: 112350,
    sourceUrl: 'https://www.cxenertech.com/solar/rooftop/packages/cx-og-hw-3-1p-aik550',
  },
  {
    ...common,
    id: 'cx-og-sgg-5-1p', labelEn: '5.005 kWp DC / 5 kW AC · single phase', labelTh: '5.005 kWp DC / 5 kW AC · 1 เฟส',
    moduleCount: 7, moduleWp: 715, dcKwp: 5.005, moduleDescription: 'JA Solar N-type bifacial 715 Wp (installer catalogue)',
    inverterAcKw: 5, inverterDescription: 'Sigenergy SigenStor EC 5.0 SP', phase: 'single',
    publishedRoofAreaSqm: 19.6, requiredRoofAreaSqm: 27.5275,
    referencePriceThb: 159000, planningPriceThb: 170130,
    sourceUrl: 'https://www.cxenertech.com/solar/rooftop/packages/cx-og-sgg-5-1p',
  },
  {
    ...common,
    id: 'cx-og-hw-5-3p-aik550', labelEn: '5.50 kWp DC / 5 kW AC · three phase', labelTh: '5.50 kWp DC / 5 kW AC · 3 เฟส',
    moduleCount: 10, moduleWp: 550, dcKwp: 5.5, moduleDescription: 'AIKO ABC N-type 550 Wp (installer catalogue)',
    inverterAcKw: 5, inverterDescription: 'Huawei 5 kW three phase (installer catalogue)', phase: 'three',
    publishedRoofAreaSqm: 28, requiredRoofAreaSqm: 30.25,
    referencePriceThb: 153000, planningPriceThb: 163710,
    sourceUrl: 'https://www.cxenertech.com/solar/rooftop/packages/cx-og-hw-5-3p-aik550',
  },
  {
    ...common,
    id: 'cx-og-hw-10-3p-aik550', labelEn: '10.45 kWp DC / 10 kW AC · three phase', labelTh: '10.45 kWp DC / 10 kW AC · 3 เฟส',
    moduleCount: 19, moduleWp: 550, dcKwp: 10.45, moduleDescription: 'AIKO ABC N-type 550 Wp (installer catalogue)',
    inverterAcKw: 10, inverterDescription: 'Huawei 10 kW three phase (installer catalogue)', phase: 'three',
    publishedRoofAreaSqm: 53.2, requiredRoofAreaSqm: 57.475,
    referencePriceThb: 256000, planningPriceThb: 273920,
    sourceUrl: 'https://www.cxenertech.com/solar/rooftop/packages/cx-og-hw-10-3p-aik550',
  },
];

export const SOLAR_PACKAGE_CATALOG_VERSION = 'installer-reference-2026-10-17-v3';
