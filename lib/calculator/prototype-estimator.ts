import { activeResidentialTariff, calculateResidentialBill, estimateKwhFromBill } from '@/config/electricity-tariffs';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { EstimateAnswers, EstimateResult, Estimator, LifetimeCostPoint, Range } from './types';

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function range(min: number, max: number, step = 1): Range {
  return { min: round(Math.min(min, max), step), max: round(Math.max(min, max), step) };
}

function interpolateCost(sizeKwp: number, band: 'low' | 'high') {
  const anchors = solarAssumptions.installedCostAnchorsThb;
  if (sizeKwp <= anchors[0].kwp) {
    const fixedMobilisation = band === 'low' ? 50000 : 65000;
    return fixedMobilisation + (anchors[0][band] - fixedMobilisation) * (sizeKwp / anchors[0].kwp);
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];
    if (sizeKwp <= right.kwp) {
      const ratio = (sizeKwp - left.kwp) / (right.kwp - left.kwp);
      return left[band] + (right[band] - left[band]) * ratio;
    }
  }
  return anchors[anchors.length - 1][band];
}

function paybackRange(cost: Range, annualValue: Range, annualOm: Range): Range | null {
  const optimisticNet = annualValue.max - annualOm.min;
  const conservativeNet = annualValue.min - annualOm.max;
  if (optimisticNet <= 0 || conservativeNet <= 0) return null;
  return range(cost.min / optimisticNet, cost.max / conservativeNet, 0.1);
}

export const prototypeEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    const bill = Math.max(500, Math.min(50000, answers.monthlyBillThb));
    const monthlyKwh = answers.monthlyKwh ?? estimateKwhFromBill(bill);
    const annualLoadKwh = monthlyKwh * 12;
    const selfConsumptionRatio = solarAssumptions.daytimeShare[answers.daytimeUsage];
    const sizingShare = solarAssumptions.sizingTargetAnnualLoadShare[answers.daytimeUsage];
    const shade = solarAssumptions.shadeFactor[answers.shade ?? 'unknown'];
    const netYield = solarAssumptions.referenceGrossYieldKwhPerKwp * solarAssumptions.systemLossFactor;
    const targetKw = Math.max(1.5, Math.min(
      solarAssumptions.installedCapacityLimitKwp,
      (annualLoadKwh * sizingShare) / (netYield * shade),
    ));
    const unknownRoof = !answers.roofKnown || !answers.shade || answers.shade === 'unknown';
    const width = unknownRoof ? 0.28 : 0.18;
    const system = range(
      Math.max(1.5, targetKw * (1 - width)),
      Math.min(solarAssumptions.installedCapacityLimitKwp, targetKw * (1 + width)),
      0.5,
    );
    const production = range(
      system.min * netYield * shade * solarAssumptions.orientationFactor.min,
      system.max * netYield * Math.min(1, shade + 0.06) * solarAssumptions.orientationFactor.max,
      50,
    );
    const selfConsumed = range(
      Math.min(annualLoadKwh, production.min * Math.max(0.32, selfConsumptionRatio - 0.06)),
      Math.min(annualLoadKwh, production.max * Math.min(0.9, selfConsumptionRatio + 0.06)),
      50,
    );
    const exported = range(
      Math.max(0, production.min - selfConsumed.max),
      Math.max(0, production.max - selfConsumed.min),
      50,
    );

    const modeledMonthlyBill = calculateResidentialBill(monthlyKwh);
    const avoidedValue = range(
      (modeledMonthlyBill - calculateResidentialBill(Math.max(0, monthlyKwh - selfConsumed.min / 12))) * 12,
      (modeledMonthlyBill - calculateResidentialBill(Math.max(0, monthlyKwh - selfConsumed.max / 12))) * 12,
      100,
    );
    const savings = range(avoidedValue.min / 12, avoidedValue.max / 12, 50);
    savings.max = Math.min(round(bill * 0.9, 50), savings.max);
    const billReduction = range((savings.min / bill) * 100, (savings.max / bill) * 100, 1);

    const installedCost = range(interpolateCost(system.min, 'low'), interpolateCost(system.max, 'high'), 1000);
    const annualOm = range(
      installedCost.min * solarAssumptions.annualOperationsAndMaintenanceRate.min,
      installedCost.max * solarAssumptions.annualOperationsAndMaintenanceRate.max,
      100,
    );
    const payback = paybackRange(installedCost, avoidedValue, annualOm);
    const conditionalExport = range(
      exported.min * solarAssumptions.fit.rateThbPerKwh,
      exported.max * solarAssumptions.fit.rateThbPerKwh,
      100,
    );

    const lifetimeCostSeries: LifetimeCostPoint[] = [];
    let withoutSolar = 0;
    let withSolarLow = installedCost.min;
    let withSolarHigh = installedCost.max;
    const annualBill = bill * 12;
    lifetimeCostSeries.push({ year: 0, withoutSolarThb: 0, withSolarLowThb: installedCost.min, withSolarHighThb: installedCost.max });
    for (let year = 1; year <= solarAssumptions.analysisYears; year += 1) {
      const tariffFactor = (1 + solarAssumptions.annualTariffEscalationRate) ** (year - 1);
      const productionFactor = (1 - solarAssumptions.annualPanelDegradationRate) ** (year - 1);
      const noSolarAnnualCost = annualBill * tariffFactor;
      const bestAvoided = avoidedValue.max * productionFactor * tariffFactor;
      const conservativeAvoided = avoidedValue.min * productionFactor * tariffFactor;
      withoutSolar += noSolarAnnualCost;
      withSolarLow += Math.max(0, noSolarAnnualCost - bestAvoided) + annualOm.min;
      withSolarHigh += Math.max(0, noSolarAnnualCost - conservativeAvoided) + annualOm.max;
      lifetimeCostSeries.push({
        year,
        withoutSolarThb: round(withoutSolar, 100),
        withSolarLowThb: round(withSolarLow, 100),
        withSolarHighThb: round(withSolarHigh, 100),
      });
    }
    const finalPoint = lifetimeCostSeries[lifetimeCostSeries.length - 1];
    const lifetimeNetBenefit = range(
      finalPoint.withoutSolarThb - finalPoint.withSolarHighThb,
      finalPoint.withoutSolarThb - finalPoint.withSolarLowThb,
      1000,
    );

    return {
      recommendedSystemKw: system,
      estimatedAnnualProductionKwh: production,
      estimatedMonthlySavingsThb: savings,
      estimatedBillReductionPct: billReduction,
      estimatedPaybackYears: payback,
      estimatedExportRevenueThb: null,
      conditionalAnnualExportRevenueThb: conditionalExport,
      estimatedTaxBenefitThb: null,
      estimatedInstalledCostThb: installedCost,
      estimatedAnnualSelfConsumedKwh: selfConsumed,
      estimatedAnnualExportedKwh: exported,
      estimatedAnnualSelfConsumptionValueThb: avoidedValue,
      estimatedAnnualOperationsAndMaintenanceThb: annualOm,
      estimatedLifetimeNetBenefitThb: lifetimeNetBenefit,
      lifetimeCostSeries,
      tariffVersion: activeResidentialTariff.id,
      estimatedMonthlyConsumptionKwh: round(monthlyKwh),
      confidence: unknownRoof ? 'low' : answers.daytimeUsage === 'unknown' ? 'medium' : 'high',
      assumptionsUsed: [
        'คำนวณมูลค่าจากส่วนต่างของบิลอัตราก้าวหน้าก่อนและหลังใช้ไฟโซลาร์เอง',
        `ผลผลิตอ้างอิงประมาณ ${solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('th-TH')} kWh ต่อ kWp ต่อปี หลังเผื่อการสูญเสียของระบบ`,
        'ราคาติดตั้งเป็นช่วงอ้างอิงแพ็กเกจที่เผยแพร่ ไม่ใช่ใบเสนอราคา',
        'ผลหลักไม่รวมรายได้ขายไฟส่วนเกินหรือสิทธิประโยชน์ทางภาษี',
        'แบบจำลองระยะยาวไม่สมมติว่าค่าไฟเพิ่มขึ้น และเผื่อการเสื่อมของแผง 0.5% ต่อปี',
      ],
      assumptionVersion: solarAssumptions.version,
      calculatedAt: new Date().toISOString(),
      currentMonthlyBillThb: bill,
    };
  },
};
