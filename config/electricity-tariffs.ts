export type TariffTier = {
  upToKwh: number | null;
  rateThbPerKwh: number;
};

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
};

export function electricityAuthorityForProvince(province: string): 'MEA' | 'PEA' {
  return ['bangkok', 'nonthaburi', 'samut-prakan'].includes(province) ? 'MEA' : 'PEA';
}

// Active reference on the site's 28 August 2026 verification date. This is the
// standard residential schedule for homes using more than 150 kWh per month.
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
};

export const september2026ResidentialTariff: ResidentialTariff = {
  id: 'pea-residential-september-2026-ft-sep-dec-2026',
  label: 'อัตราบ้านอยู่อาศัย · รอบบิลตั้งแต่ ก.ย. 2569',
  labelTh: 'อัตราบ้านอยู่อาศัย · รอบบิลตั้งแต่ ก.ย. 2569',
  labelEn: 'Residential tariff · bills from September 2026',
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
};

export const meaActiveResidentialTariff: ResidentialTariff = {
  ...activeResidentialTariff,
  id: 'mea-residential-over-150-may-2023-ft-may-aug-2026',
  authority: 'MEA',
  authorityLabelEn: 'Metropolitan Electricity Authority (MEA)',
  authorityLabelTh: 'การไฟฟ้านครหลวง (กฟน.)',
  serviceAreaSource: 'https://mapapi.mea.or.th/v2/home',
  source: 'https://www.mea.or.th/our-services/tariff-calculation/other/evlowpriority',
};

export const meaSeptember2026ResidentialTariff: ResidentialTariff = {
  ...september2026ResidentialTariff,
  id: 'mea-residential-september-2026-ft-sep-dec-2026',
  authority: 'MEA',
  authorityLabelEn: 'Metropolitan Electricity Authority (MEA)',
  authorityLabelTh: 'การไฟฟ้านครหลวง (กฟน.)',
  serviceAreaSource: 'https://mapapi.mea.or.th/v2/home',
  source: 'https://www.mea.or.th/our-services/tariff-calculation/other/evlowpriority',
};

export const residentialTariffs = [activeResidentialTariff, september2026ResidentialTariff, meaActiveResidentialTariff, meaSeptember2026ResidentialTariff] as const;

export function selectResidentialTariff(provinceOrDate: string | Date = 'other', billingDate = new Date()) {
  const province = provinceOrDate instanceof Date ? 'other' : provinceOrDate;
  const effectiveDate = provinceOrDate instanceof Date ? provinceOrDate : billingDate;
  const authority = electricityAuthorityForProvince(province);
  const authorityTariffs = authority === 'MEA'
    ? [meaActiveResidentialTariff, meaSeptember2026ResidentialTariff]
    : [activeResidentialTariff, september2026ResidentialTariff];
  const isoDate = effectiveDate.toISOString().slice(0, 10);
  return [...authorityTariffs].reverse().find((tariff) => isoDate >= tariff.effectiveFrom && isoDate <= tariff.effectiveTo)
    ?? (isoDate > authorityTariffs[1].effectiveTo ? authorityTariffs[1] : authorityTariffs[0]);
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
