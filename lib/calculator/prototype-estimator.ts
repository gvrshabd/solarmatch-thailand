import {
  calculateResidentialBill,
  estimateKwhFromBill,
  selectResidentialTariff,
  smallGeneralServiceTariff,
} from '@/config/electricity-tariffs';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { EstimateAnswers, EstimateResult, Estimator, LifetimeCostPoint, Range } from './types';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function roundDown(value: number, step = 1) {
  return Math.floor(value / step) * step;
}

function point(value: number): Range {
  return { min: value, max: value };
}

function isBusinessProperty(propertyType: EstimateAnswers['propertyType']) {
  return ['shophouse', 'warehouse', 'apartment-building'].includes(propertyType);
}

function planningPrice(sizeKwp: number, phase: EstimateAnswers['electricityPhase']) {
  const anchors = solarAssumptions.planningPriceAnchorsThb;
  const priceKey = phase === 'three' ? 'three' : 'single';
  if (sizeKwp <= anchors[0].kwp) return anchors[0][priceKey];
  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];
    if (sizeKwp <= right.kwp) {
      const ratio = (sizeKwp - left.kwp) / (right.kwp - left.kwp);
      return round(left[priceKey] + (right[priceKey] - left[priceKey]) * ratio, 5000);
    }
  }
  const left = anchors[anchors.length - 2];
  const right = anchors[anchors.length - 1];
  const evidencedMarginalPrice = (right[priceKey] - left[priceKey]) / (right.kwp - left.kwp);
  return round(right[priceKey] + (sizeKwp - right.kwp) * evidencedMarginalPrice, 5000);
}

function classifyLoad(answers: EstimateAnswers): EstimateResult['loadProfile'] {
  const index = ['very-low', 'low', 'moderate', 'high', 'very-high'].indexOf(answers.daytimePattern);
  let score = index;
  if (answers.daytimeLoads.some((load) => ['business-equipment', 'other-high-use'].includes(load))) score += 1;
  if (isBusinessProperty(answers.propertyType)) score += 1;
  if (score <= 1) return 'low';
  if (score >= 4) return 'high';
  return 'medium';
}

function roofCapacity(answers: EstimateAnswers) {
  if (answers.exactRoofAreaSqm) return Math.max(1, Math.floor((answers.exactRoofAreaSqm / solarAssumptions.squareMetresPerKwp) * 2) / 2);
  return solarAssumptions.roofAreaCapacityKwp[answers.roofArea];
}

export const prototypeEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    const tariff = isBusinessProperty(answers.propertyType) ? smallGeneralServiceTariff : selectResidentialTariff();
    const monthlyConsumptionKwh = estimateKwhFromBill(answers.monthlyBillThb, tariff);
    const annualLoadKwh = monthlyConsumptionKwh * 12;
    const loadProfile = classifyLoad(answers);
    const provinceYield = solarAssumptions.provinceYieldKwhPerKwp[answers.province as keyof typeof solarAssumptions.provinceYieldKwhPerKwp]
      ?? solarAssumptions.provinceYieldKwhPerKwp.other;
    const direction = answers.roofDirection ?? 'unsure';
    const slope = answers.roofSlope ?? 'unsure';
    const orientationFactor = solarAssumptions.slopeFactor[direction][slope];
    const shadeFactor = solarAssumptions.shadeFactor[answers.shade];
    const propertyFloor = solarAssumptions.propertySizingFloor[answers.propertyType];
    const futureLoadAdjustment = answers.futureLoads?.some((load) => !['none', 'unsure'].includes(load)) ? 0.04 : 0;
    const targetShare = clamp(
      Math.max(solarAssumptions.sizingTargetAnnualLoadShare[answers.daytimePattern], propertyFloor) + futureLoadAdjustment,
      0.24,
      0.52,
    );

    const billLedSystemKw = Math.max(1.5, round((annualLoadKwh * targetShare) / provinceYield, 0.5));
    const capacity = roofCapacity(answers);
    const roofLimitedSystemKw = capacity === null ? billLedSystemKw : Math.min(billLedSystemKw, capacity);
    const systemKw = answers.quoteSystemKw
      ? round(answers.quoteSystemKw, 0.1)
      : Math.max(1, round(roofLimitedSystemKw, 0.5));

    const annualProduction = systemKw * provinceYield * orientationFactor * shadeFactor;
    const pvLoadRatio = annualProduction / Math.max(1, annualLoadKwh);
    const selfConsumptionBase = solarAssumptions.selfConsumptionAtBalancedSize[answers.daytimePattern];
    const loadBonus = answers.daytimeLoads.some((load) => ['business-equipment', 'other-high-use', 'ev'].includes(load)) ? 0.03 : 0;
    const selfConsumptionRatio = clamp(
      selfConsumptionBase + loadBonus - Math.max(0, pvLoadRatio - targetShare) * 0.25,
      0.35,
      0.9,
    );

    const monthlyProduction = solarAssumptions.monthlyProductionShare.map((share) => annualProduction * share);
    const monthlySelfConsumed = monthlyProduction.map((production) => Math.min(monthlyConsumptionKwh, production * selfConsumptionRatio));
    const annualSelfConsumed = monthlySelfConsumed.reduce((sum, value) => sum + value, 0);
    const annualExported = Math.max(0, annualProduction - annualSelfConsumed);
    const annualAvoidedBill = monthlySelfConsumed.reduce((sum, selfConsumedKwh) => {
      const before = calculateResidentialBill(monthlyConsumptionKwh, tariff);
      const after = calculateResidentialBill(Math.max(0, monthlyConsumptionKwh - selfConsumedKwh), tariff);
      return sum + before - after;
    }, 0);
    const modeledAnnualBill = calculateResidentialBill(monthlyConsumptionKwh, tariff) * 12;

    const assumedPhase = answers.electricityPhase === 'single' || answers.electricityPhase === 'three'
      ? answers.electricityPhase
      : isBusinessProperty(answers.propertyType) ? 'three' : 'single';
    const marketPlanningCost = planningPrice(systemKw, assumedPhase);
    const comparableQuote = Boolean(answers.quoteCashPriceThb && answers.quoteSystemKw && !answers.quoteBatteryIncluded);
    const planningCost = round(comparableQuote ? answers.quoteCashPriceThb! : marketPlanningCost, 5000);
    const annualReserve = round(planningCost * solarAssumptions.annualMaintenanceAndComponentReserveRate, 100);
    const firstYearNetValue = annualAvoidedBill - annualReserve;
    const payback = firstYearNetValue > 0 ? planningCost / firstYearNetValue : null;

    const lifetimeCostSeries: LifetimeCostPoint[] = [{ year: 0, withoutSolarThb: 0, withSolarThb: planningCost }];
    let withoutSolar = 0;
    let withSolar = planningCost;
    for (let year = 1; year <= solarAssumptions.analysisYears; year += 1) {
      const degradation = (1 - solarAssumptions.annualPanelDegradationRate) ** (year - 1);
      const avoided = annualAvoidedBill * degradation;
      withoutSolar += modeledAnnualBill;
      withSolar += Math.max(0, modeledAnnualBill - avoided) + annualReserve;
      lifetimeCostSeries.push({
        year,
        withoutSolarThb: round(withoutSolar, 100),
        withSolarThb: round(withSolar, 100),
      });
    }

    const lifetimeNet = roundDown(withoutSolar - withSolar, 1000);
    const monthlySavings = roundDown(annualAvoidedBill / 12, 50);
    const annualSavings = roundDown(annualAvoidedBill, 100);
    const billReductionPct = round((annualAvoidedBill / Math.max(1, modeledAnnualBill)) * 100, 1);
    const selectedRoofLimited = capacity !== null && capacity + 0.01 < billLedSystemKw;
    const roofFeasibility = capacity === null ? 'unconfirmed' : selectedRoofLimited ? 'limited' : 'likely';
    const recommendation = answers.shade === 'a-lot' || (selectedRoofLimited && systemKw < billLedSystemKw * 0.6)
      ? 'site-check-first'
      : lifetimeNet > 0 && payback !== null && payback <= 15
        ? 'strong-fit'
        : 'worth-comparing';

    const roundedSystem = round(systemKw, 0.1);
    const roundedProduction = roundDown(annualProduction, 100);
    const roundedSelfConsumed = roundDown(annualSelfConsumed, 100);
    const roundedExported = roundDown(annualExported, 100);
    const roundedCost = round(planningCost, 1000);
    const roundedPayback = payback === null ? null : round(payback, 0.1);

    return {
      currentMonthlyBillThb: answers.monthlyBillThb,
      estimatedMonthlyConsumptionKwh: round(monthlyConsumptionKwh),
      planningSystemKw: roundedSystem,
      planningAnnualProductionKwh: roundedProduction,
      planningMonthlySavingsThb: monthlySavings,
      planningAnnualSavingsThb: annualSavings,
      planningInstalledCostThb: roundedCost,
      planningPaybackYears: roundedPayback,
      planningAnnualSelfConsumedKwh: roundedSelfConsumed,
      planningAnnualExportedKwh: roundedExported,
      planningTwentyFiveYearNetBenefitThb: lifetimeNet,
      planningBillReductionPct: billReductionPct,
      roofFeasibility,
      recommendation,
      loadProfile,
      tariffVersion: tariff.id,
      tariffLabelEn: tariff.labelEn,
      tariffLabelTh: tariff.labelTh,
      assumptionVersion: solarAssumptions.version,
      calculatedAt: new Date().toISOString(),
      assumptionsUsed: [
        'Monthly consumption is reverse-calculated from the entered bill using the selected current PEA/MEA tariff schedule.',
        'System sizing is led by the bill and the stated daytime-use band, then constrained by the stated usable roof area when known.',
        'Production uses province-level solar yield and the stated shade, direction and slope information; no clear-sky assumption is used.',
        'The base result values self-consumed electricity only and excludes export payments, tax relief, finance and tariff escalation.',
        'The 25-year figure subtracts installation cost and a 1.02% annual maintenance/component reserve, including inverter-related risk, and applies 0.5% annual module degradation.',
      ],
      trace: [
        { labelEn: 'Monthly bill', labelTh: 'ค่าไฟต่อเดือน', value: `฿${round(answers.monthlyBillThb).toLocaleString('en-US')}`, basisEn: 'Your answer', basisTh: 'คำตอบของคุณ' },
        { labelEn: 'Tariff', labelTh: 'อัตราค่าไฟ', value: tariff.labelEn, valueTh: tariff.labelTh, basisEn: tariff.source, basisTh: tariff.source },
        { labelEn: 'Estimated monthly use', labelTh: 'การใช้ไฟต่อเดือนโดยประมาณ', value: `${round(monthlyConsumptionKwh).toLocaleString('en-US')} kWh`, basisEn: 'Reverse-calculated from the current tariff', basisTh: 'คำนวณย้อนกลับจากอัตราค่าไฟปัจจุบัน' },
        { labelEn: 'Starting size', labelTh: 'ขนาดระบบเริ่มต้น', value: `${roundedSystem} kWp`, basisEn: 'Bill, daytime use, property type and available roof area', basisTh: 'ค่าไฟ การใช้ไฟกลางวัน ประเภทสถานที่ และพื้นที่หลังคา' },
        { labelEn: 'Annual production', labelTh: 'ผลผลิตต่อปี', value: `${roundedProduction.toLocaleString('en-US')} kWh`, basisEn: 'Province yield, shade and optional roof details', basisTh: 'ผลผลิตอ้างอิงรายจังหวัด เงาบัง และข้อมูลหลังคาเสริม' },
        { labelEn: 'Planning price', labelTh: 'ราคาเพื่อวางแผน', value: `฿${roundedCost.toLocaleString('en-US')}`, basisEn: comparableQuote ? 'Your comparable cash quote' : 'Current PEA and Thai market package evidence', basisTh: comparableQuote ? 'ใบเสนอราคาเงินสดที่เปรียบเทียบได้ของคุณ' : 'ข้อมูลแพ็กเกจปัจจุบันของ PEA และตลาดไทย' },
        { labelEn: 'Lifetime reserve', labelTh: 'เงินสำรองค่าดูแล', value: `฿${annualReserve.toLocaleString('en-US')}/year`, basisEn: 'NREL 1.02% of CAPEX fixed O&M benchmark', basisTh: 'ค่าอ้างอิง NREL สำหรับการดูแลคงที่ 1.02% ของเงินลงทุน' },
      ],
      lifetimeCostSeries,
      recommendedSystemKw: point(roundedSystem),
      estimatedAnnualProductionKwh: point(roundedProduction),
      estimatedMonthlySavingsThb: point(monthlySavings),
      estimatedBillReductionPct: point(billReductionPct),
      estimatedPaybackYears: roundedPayback === null ? null : point(roundedPayback),
      estimatedInstalledCostThb: point(roundedCost),
      estimatedAnnualSelfConsumedKwh: point(roundedSelfConsumed),
      estimatedAnnualExportedKwh: point(roundedExported),
      estimatedLifetimeNetBenefitThb: point(lifetimeNet),
    };
  },
};
