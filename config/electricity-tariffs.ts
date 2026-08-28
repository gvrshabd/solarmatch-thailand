export type TariffTier = {
  upToKwh: number | null;
  rateThbPerKwh: number;
};

export type ResidentialTariff = {
  id: string;
  label: string;
  effectiveFrom: string;
  effectiveTo: string;
  serviceChargeThb: number;
  ftThbPerKwh: number;
  vatRate: number;
  tiers: TariffTier[];
  source: string;
};

// Active reference on the site's 28 August 2026 verification date. This is the
// standard residential schedule for homes using more than 150 kWh per month.
export const activeResidentialTariff: ResidentialTariff = {
  id: 'pea-mea-residential-over-150-may-2023-ft-may-aug-2026',
  label: 'อัตราบ้านอยู่อาศัย >150 หน่วย · รอบบิลถึง ส.ค. 2569',
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
  source: 'https://www.pea.co.th/sites/default/files/documents/tariff/Electricity_Tariff_MAY_2023.pdf',
};

export const september2026ResidentialTariff: ResidentialTariff = {
  id: 'pea-mea-residential-september-2026-ft-sep-dec-2026',
  label: 'อัตราบ้านอยู่อาศัย · รอบบิลตั้งแต่ ก.ย. 2569',
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
  source: 'https://www.pea.co.th/sites/default/files/users/user34/attachments/Electricity_Tariff_SEP_2026_3.pdf',
};

export const residentialTariffs = [activeResidentialTariff, september2026ResidentialTariff] as const;

export function selectResidentialTariff(billingDate = new Date()) {
  const isoDate = billingDate.toISOString().slice(0, 10);
  return [...residentialTariffs].reverse().find((tariff) => isoDate >= tariff.effectiveFrom && isoDate <= tariff.effectiveTo)
    ?? (isoDate > september2026ResidentialTariff.effectiveTo ? september2026ResidentialTariff : activeResidentialTariff);
}

export function calculateResidentialBill(kwh: number, tariff = activeResidentialTariff) {
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

export function estimateKwhFromBill(billThb: number, tariff = activeResidentialTariff) {
  const target = Math.max(0, billThb);
  let low = 0;
  let high = 20000;
  for (let index = 0; index < 60; index += 1) {
    const middle = (low + high) / 2;
    if (calculateResidentialBill(middle, tariff) < target) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
