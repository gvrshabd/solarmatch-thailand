export type TariffTier = {
  upToKwh: number | null;
  rateThbPerKwh: number;
};

// A checked planning reference, never an implicit claim about an undated bill.
export const TARIFF_REFERENCE_DATE = '2026-10-17';
export const TARIFF_CHECKED_AT = '2026-10-17';
/** New calculations use today's Thai calendar date; saved references stay explicit. */
export function currentCalculationDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: 'year' | 'month' | 'day') => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export type ResidentialTariffCategory = 'ordinary-1.1' | 'ordinary-1.2' | 'tou';
export type OrdinaryResidentialTariffCategory = Exclude<ResidentialTariffCategory, 'tou'>;
export type TariffPurpose = 'historical-bill' | 'future-reference';
const PEA_FT_SOURCE = 'https://www.pea.co.th/our-services/tariff/ft';
const MEA_RESIDENTIAL_SOURCE = 'https://www.mea.or.th/our-services/service-rates/other/D5xEaEwgU';
const PEA_HISTORICAL_COMPARISON_SOURCE = 'https://www.pea.co.th/sites/default/files/users/user34/attachments/ประชาสัมพันธ์อัตราค่าไฟฟ้า%20บ้านอยู่อาศัย.pdf';

export type ResidentialTariff = {
  id: string;
  label: string;
  labelTh: string;
  labelEn: string;
  effectiveFrom: string;
  effectiveTo: string;
  serviceChargeThb: number;
  ftThbPerKwh: number;
  vatRate: number;
  tiers: TariffTier[];
  authority: 'MEA' | 'PEA';
  authorityLabelEn: string;
  authorityLabelTh: string;
  serviceAreaSource: string;
  source: string;
  category?: OrdinaryResidentialTariffCategory;
  checkedAt?: string;
  expiresAt?: string;
  ftSource?: string;
};

export function electricityAuthorityForProvince(province: string): 'MEA' | 'PEA' {
  return ['bangkok', 'nonthaburi', 'samut-prakan'].includes(province) ? 'MEA' : 'PEA';
}

// Legacy export name retained: this historical snapshot is valid only May-Aug 2026.
export const activeResidentialTariff: ResidentialTariff = {
  id: 'pea-residential-over-150-may-2023-ft-may-aug-2026',
  label: 'อัตราบ้านอยู่อาศัย >150 หน่วย · รอบบิลถึง ส.ค. 2569',
  labelTh: 'อัตราบ้านอยู่อาศัย >150 หน่วย · รอบบิลถึง ส.ค. 2569',
  labelEn: 'Residential tariff above 150 kWh · bills through August 2026',
  effectiveFrom: '2026-05-01',
  effectiveTo: '2026-08-31',
  serviceChargeThb: 24.62,
  ftThbPerKwh: 0.1623,
  vatRate: 0.07,
  tiers: [
    { upToKwh: 150, rateThbPerKwh: 3.2484 },
    { upToKwh: 400, rateThbPerKwh: 4.2218 },
    { upToKwh: null, rateThbPerKwh: 4.4217 },
  ],
  authority: 'PEA',
  authorityLabelEn: 'Provincial Electricity Authority (PEA)',
  authorityLabelTh: 'การไฟฟ้าส่วนภูมิภาค (กฟภ.)',
  serviceAreaSource: 'https://www.pea.co.th/about-pea/pea-service',
  source: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf',
  category: 'ordinary-1.2',
  checkedAt: TARIFF_CHECKED_AT,
  expiresAt: '2026-08-31',
  ftSource: 'https://www.pea.co.th/our-services/tariff/ft/view/5212aa59-b788-45ba-a5bd-9a4d3d947ece',
};

export const september2026ResidentialTariff: ResidentialTariff = {
  id: 'pea-residential-september-2026-ft-sep-dec-2026',
  label: 'อัตราบ้านอยู่อาศัย 1.2 · รอบบิล ก.ย.–ธ.ค. 2569',
  labelTh: 'อัตราบ้านอยู่อาศัย 1.2 · รอบบิล ก.ย.–ธ.ค. 2569',
  labelEn: 'Ordinary residential 1.2 · September–December 2026 bills',
  effectiveFrom: '2026-09-01',
  effectiveTo: '2026-12-31',
  serviceChargeThb: 24.62,
  ftThbPerKwh: 0.1623,
  vatRate: 0.07,
  tiers: [
    { upToKwh: 200, rateThbPerKwh: 3 },
    { upToKwh: 400, rateThbPerKwh: 4.1584 },
    { upToKwh: null, rateThbPerKwh: 4.3583 },
  ],
  authority: 'PEA',
  authorityLabelEn: 'Provincial Electricity Authority (PEA)',
  authorityLabelTh: 'การไฟฟ้าส่วนภูมิภาค (กฟภ.)',
  serviceAreaSource: 'https://www.pea.co.th/about-pea/pea-service',
  source: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf',
  category: 'ordinary-1.2',
  checkedAt: TARIFF_CHECKED_AT,
  expiresAt: '2026-12-31',
  ftSource: PEA_FT_SOURCE,
};

export const meaActiveResidentialTariff: ResidentialTariff = {
  ...activeResidentialTariff,
  id: 'mea-residential-over-150-may-2023-ft-may-aug-2026',
  authority: 'MEA',
  authorityLabelEn: 'Metropolitan Electricity Authority (MEA)',
  authorityLabelTh: 'การไฟฟ้านครหลวง (กฟน.)',
  serviceAreaSource: 'https://mapapi.mea.or.th/v2/home',
  source: MEA_RESIDENTIAL_SOURCE,
};

export const meaSeptember2026ResidentialTariff: ResidentialTariff = {
  ...september2026ResidentialTariff,
  id: 'mea-residential-september-2026-ft-sep-dec-2026',
  authority: 'MEA',
  authorityLabelEn: 'Metropolitan Electricity Authority (MEA)',
  authorityLabelTh: 'การไฟฟ้านครหลวง (กฟน.)',
  serviceAreaSource: 'https://mapapi.mea.or.th/v2/home',
  source: MEA_RESIDENTIAL_SOURCE,
};

const historicalSmallMeterTiers: TariffTier[] = [
  { upToKwh: 15, rateThbPerKwh: 2.3488 },
  { upToKwh: 25, rateThbPerKwh: 2.9882 },
  { upToKwh: 35, rateThbPerKwh: 3.2405 },
  { upToKwh: 100, rateThbPerKwh: 3.6237 },
  { upToKwh: 150, rateThbPerKwh: 3.7171 },
  { upToKwh: 400, rateThbPerKwh: 4.2218 },
  { upToKwh: null, rateThbPerKwh: 4.4217 },
];
const currentSmallMeterTiers: TariffTier[] = [
  { upToKwh: 15, rateThbPerKwh: 2.3488 },
  { upToKwh: 25, rateThbPerKwh: 2.9882 },
  { upToKwh: 200, rateThbPerKwh: 3 },
  { upToKwh: 400, rateThbPerKwh: 4.1584 },
  { upToKwh: null, rateThbPerKwh: 4.3583 },
];

function smallMeterTariff(tariff: ResidentialTariff): ResidentialTariff {
  return {
    ...tariff,
    id: `${tariff.id}-ordinary-1.1`,
    category: 'ordinary-1.1',
    label: `อัตราบ้านอยู่อาศัย 1.1 · ${tariff.effectiveFrom}–${tariff.effectiveTo}`,
    labelTh: `อัตราบ้านอยู่อาศัย 1.1 · ${tariff.effectiveFrom}–${tariff.effectiveTo}`,
    labelEn: `Ordinary residential 1.1 · ${tariff.effectiveFrom}–${tariff.effectiveTo}`,
    serviceChargeThb: 8.19,
    tiers: tariff.effectiveFrom < '2026-09-01' ? historicalSmallMeterTiers : currentSmallMeterTiers,
  };
}

export const residentialTariffs: readonly ResidentialTariff[] = [
  activeResidentialTariff, september2026ResidentialTariff, meaActiveResidentialTariff, meaSeptember2026ResidentialTariff,
  ...[activeResidentialTariff, september2026ResidentialTariff, meaActiveResidentialTariff, meaSeptember2026ResidentialTariff].map(smallMeterTariff),
];

export type TariffResolutionMetadata = {
  authority: 'MEA' | 'PEA';
  category: ResidentialTariffCategory | 'unknown';
  purpose: TariffPurpose;
  requestedDate: string | null;
  resolvedDate: string | null;
  dateBasis: 'bill-date' | 'explicit-reference' | 'assumed-reference';
  checkedAt: string;
  expiresAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  sourceUrls: string[];
  assumptions: string[];
};
export type TariffResolution = {
  status: 'resolved'; tariff: ResidentialTariff; metadata: TariffResolutionMetadata; warnings: string[];
} | {
  status: 'unsupported' | 'out-of-period' | 'invalid-date'; tariff: null; metadata: TariffResolutionMetadata; warnings: string[];
};
export type ResolveResidentialTariffOptions = {
  province?: string;
  utility?: 'MEA' | 'PEA' | 'unknown';
  billingDate?: string | Date;
  category?: ResidentialTariffCategory | 'unknown';
  referenceDate?: string | Date;
  purpose?: TariffPurpose;
};

// Strings represent the bill's calendar date, not a browser-dependent timezone.
// Date objects use their UTC calendar date for compatibility with the legacy API.
export function tariffIsoDate(value: string | Date): string | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}

export function resolveResidentialTariff(options: ResolveResidentialTariffOptions = {}): TariffResolution {
  const purpose = options.purpose ?? 'historical-bill';
  const authority = options.utility && options.utility !== 'unknown' ? options.utility : electricityAuthorityForProvince(options.province ?? 'other');
  const category = options.category ?? 'ordinary-1.2';
  const hasBillDate = purpose === 'historical-bill' && options.billingDate !== undefined;
  const requested = hasBillDate ? options.billingDate! : options.referenceDate;
  const dateBasis = hasBillDate ? 'bill-date' : requested !== undefined ? 'explicit-reference' : 'assumed-reference';
  const resolvedDate = tariffIsoDate(requested ?? TARIFF_REFERENCE_DATE);
  const warnings: string[] = [];
  const assumptions: string[] = ['Standard monthly charges exclude welfare credits, arrears, penalties, and utility-specific bill rounding.'];
  if (!hasBillDate && purpose === 'historical-bill') warnings.push('bill-date-missing-reference-assumed');
  if (dateBasis === 'assumed-reference') warnings.push('reference-date-assumed-2026-10-17');
  if (options.category === undefined) warnings.push('tariff-category-assumed-ordinary-1.2');
  if ((!options.utility || options.utility === 'unknown') && (!options.province || options.province === 'other' || options.utility === 'unknown')) warnings.push('utility-inferred-from-province-or-assumed-pea');
  if (authority === 'MEA') {
    warnings.push('mea-primary-page-unavailable-at-check');
    assumptions.push('MEA ordinary rates retain the shared published schedule; MEA primary pages could not be fetched at the verification check. PEA base/Ft publications were verified.');
  }
  if (purpose === 'future-reference') assumptions.push('Reference tariff is a planning scenario held constant, not a forecast or a verified tariff beyond its effective period.');
  const metadata: TariffResolutionMetadata = {
    authority, category, purpose, requestedDate: requested === undefined ? null : tariffIsoDate(requested), resolvedDate, dateBasis,
    checkedAt: TARIFF_CHECKED_AT, expiresAt: null, effectiveFrom: null, effectiveTo: null, sourceUrls: [], assumptions,
  };
  if (!resolvedDate) return { status: 'invalid-date', tariff: null, metadata, warnings: [...warnings, 'invalid-tariff-date'] };
  if (category !== 'ordinary-1.1' && category !== 'ordinary-1.2') {
    return { status: 'unsupported', tariff: null, metadata, warnings: [...warnings, category === 'tou' ? 'tou-calendar-and-interval-loads-required' : 'tariff-category-unknown'] };
  }
  const tariff = residentialTariffs.find((item) => item.authority === authority && item.category === category && resolvedDate >= item.effectiveFrom && resolvedDate <= item.effectiveTo);
  if (!tariff) return { status: 'out-of-period', tariff: null, metadata, warnings: [...warnings, 'tariff-date-outside-verified-period'] };
  return {
    status: 'resolved', tariff, warnings,
    metadata: { ...metadata, effectiveFrom: tariff.effectiveFrom, effectiveTo: tariff.effectiveTo, expiresAt: tariff.expiresAt ?? tariff.effectiveTo,
      sourceUrls: [...new Set([tariff.source, tariff.ftSource ?? PEA_FT_SOURCE, ...(resolvedDate < '2026-09-01' ? [PEA_HISTORICAL_COMPARISON_SOURCE] : []), ...(authority === 'MEA' ? [resolvedDate < '2026-09-01' ? activeResidentialTariff.source : september2026ResidentialTariff.source] : [])])],
    },
  };
}

export function selectResidentialTariff(provinceOrDate: string | Date = 'other', billingDate = new Date(`${TARIFF_REFERENCE_DATE}T00:00:00Z`)): ResidentialTariff {
  const province = provinceOrDate instanceof Date ? 'other' : provinceOrDate;
  const effectiveDate = provinceOrDate instanceof Date ? provinceOrDate : billingDate;
  const resolution = resolveResidentialTariff({ province, billingDate: effectiveDate, category: 'ordinary-1.2' });
  if (resolution.status !== 'resolved') throw new RangeError(`No verified residential tariff: ${resolution.status}`);
  return resolution.tariff;
}

export function calculateResidentialBill(kwh: number, tariff = selectResidentialTariff()) {
  const usage = Math.max(0, kwh);
  let previousLimit = 0;
  let energyCharge = 0;

  for (const tier of tariff.tiers) {
    const tierLimit = tier.upToKwh ?? usage;
    const tierUsage = Math.max(0, Math.min(usage, tierLimit) - previousLimit);
    energyCharge += tierUsage * tier.rateThbPerKwh;
    previousLimit = tierLimit;
    if (usage <= tierLimit) break;
  }

  return (tariff.serviceChargeThb + energyCharge + usage * tariff.ftThbPerKwh) * (1 + tariff.vatRate);
}

export function estimateKwhFromBill(billThb: number, tariff = selectResidentialTariff()) {
  const target = Math.max(0, billThb);
  let remainingPreVatCharge = target / (1 + tariff.vatRate) - tariff.serviceChargeThb;
  if (remainingPreVatCharge <= 0) return 0;
  let previousLimit = 0;

  for (const tier of tariff.tiers) {
    const combinedRate = tier.rateThbPerKwh + tariff.ftThbPerKwh;
    if (tier.upToKwh === null) return previousLimit + remainingPreVatCharge / combinedRate;
    const tierWidth = tier.upToKwh - previousLimit;
    const tierCharge = tierWidth * combinedRate;
    if (remainingPreVatCharge <= tierCharge) return previousLimit + remainingPreVatCharge / combinedRate;
    remainingPreVatCharge -= tierCharge;
    previousLimit = tier.upToKwh;
  }

  return previousLimit;
}
