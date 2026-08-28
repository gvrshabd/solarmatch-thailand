import { calculateResidentialBill, estimateKwhFromBill, selectResidentialTariff } from '@/config/electricity-tariffs';
import { solarAssumptions } from '@/config/solar-assumptions';
import type {
  Confidence,
  EstimateAnswers,
  EstimateResult,
  Estimator,
  LifetimeCostPoint,
  Range,
} from './types';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function roundDown(value: number, step = 1) {
  return Math.floor(value / step) * step;
}

function rangeAround(value: number, uncertainty: number, step = 1): Range {
  return {
    min: round(Math.max(0, value * (1 - uncertainty)), step),
    max: round(Math.max(0, value * (1 + uncertainty)), step),
  };
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
  return anchors[anchors.length - 1][priceKey];
}

function classifyLoad(answers: EstimateAnswers): EstimateResult['loadProfile'] {
  if (answers.daytimePattern === 'unknown' && answers.daytimeLoads.includes('unknown')) return 'unknown';
  let score = answers.daytimePattern === 'mostly-empty'
    ? -2
    : answers.daytimePattern === 'light-use'
      ? 0
      : answers.daytimePattern === 'work-or-ac'
        ? 2
        : answers.daytimePattern === 'regular-loads'
          ? 4
          : 0;
  if (answers.daytimeLoads.includes('pump')) score += 1;
  if (answers.daytimeLoads.includes('home-office')) score += 1;
  if (answers.daytimeLoads.includes('home-business')) score += 2;
  if (answers.daytimeLoads.includes('ev') && answers.evChargesInDaytime === 'yes') score += 2;
  if (answers.daytimeLoads.includes('air-conditioning')) {
    if (answers.acDaytimeHours === '2-4') score += 1;
    if (answers.acDaytimeHours === 'over-4') score += 2;
  }
  if (score <= 0) return 'low';
  if (score >= 4) return 'high';
  return 'medium';
}

function monthlyValues(answers: EstimateAnswers, tariff: ReturnType<typeof selectResidentialTariff>) {
  const supplied = answers.electricityInputKind === 'kwh'
    ? [answers.monthlyKwh ?? 0, ...(answers.additionalMonthlyValues ?? [])]
    : [answers.monthlyBillThb ?? 0, ...(answers.additionalMonthlyValues ?? [])].map((bill) => estimateKwhFromBill(bill, tariff));
  const usable = supplied.filter((value) => Number.isFinite(value) && value > 0);
  const average = usable.reduce((sum, value) => sum + value, 0) / Math.max(1, usable.length);
  const months = Array.from({ length: 12 }, () => average);
  usable.slice(0, 12).forEach((value, index) => { months[11 - index] = value; });
  return { months, average };
}

function confidenceFor(answers: EstimateAnswers, systemKw: number) {
  let score = 0;
  const reasons: string[] = [];
  const missing: string[] = [];

  if (answers.electricityInputKind === 'kwh') {
    score += answers.consumptionPeriod === 'average-12' ? 4 : answers.consumptionPeriod === 'average-3' ? 3 : 2;
    reasons.push('actual-kwh');
  } else {
    score += 1;
    reasons.push('bill-derived-load');
    missing.push('more-bills');
  }

  if (answers.tariffType === 'standard') { score += 2; reasons.push('tariff-identified'); }
  else if (answers.tariffType === 'tou') { score -= 4; missing.push('tou-model'); }
  else if (answers.tariffType === 'private') { score -= 4; missing.push('private-rate'); }
  else missing.push('tariff-check');

  if (answers.daytimePattern !== 'unknown') { score += 2; reasons.push('daytime-pattern'); }
  else missing.push('daytime-pattern');

  if (answers.shade !== 'unknown') { score += 2; reasons.push('shade-observed'); }
  else { score -= 2; missing.push('shade-check'); }
  if (answers.shade === 'heavy') { score -= 3; missing.push('site-survey'); }

  const directionKnown = Boolean(answers.roofDirection && answers.roofDirection !== 'unknown');
  const slopeKnown = Boolean(answers.roofSlope && answers.roofSlope !== 'unknown');
  if (directionKnown && slopeKnown) { score += 2; reasons.push('roof-direction-slope'); }
  else missing.push('roof-direction');

  if (answers.electricityPhase && answers.electricityPhase !== 'unknown') { score += 1; reasons.push('phase-known'); }
  else missing.push('electricity-phase');

  if (answers.quoteCashPriceThb && answers.quoteSystemKw && !answers.quoteBatteryIncluded) { score += 3; reasons.push('comparable-quote'); }

  const inputValue = answers.monthlyKwh ?? answers.monthlyBillThb ?? 0;
  if ((answers.monthlyKwh && inputValue > 5000) || (answers.monthlyBillThb && inputValue > 25000)) {
    score -= 2;
    missing.push('outlier-review');
  }
  if (systemKw < 3 && !answers.quoteCashPriceThb) score -= 2;

  const blocking = answers.tariffType === 'tou' || answers.tariffType === 'private' || answers.shade === 'heavy';
  const highGate = score >= 11
    && answers.electricityInputKind === 'kwh'
    && ['average-12', 'average-3'].includes(answers.consumptionPeriod)
    && answers.tariffType === 'standard'
    && answers.shade !== 'unknown'
    && directionKnown
    && slopeKnown;
  const mediumGate = score >= 6 && !blocking && answers.daytimePattern !== 'unknown';
  const confidence: Confidence = highGate ? 'high' : mediumGate ? 'medium' : 'low';
  return { score, confidence, reasons, missing: [...new Set(missing)] };
}

function improvementActions(missing: string[]) {
  const ordered = ['tou-model', 'private-rate', 'site-survey', 'more-bills', 'tariff-check', 'roof-direction', 'shade-check', 'electricity-phase', 'daytime-pattern', 'outlier-review'];
  return ordered.filter((item) => missing.includes(item)).slice(0, 2);
}

export const prototypeEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    const tariff = selectResidentialTariff();
    const consumption = monthlyValues(answers, tariff);
    const annualLoadKwh = consumption.months.reduce((sum, value) => sum + value, 0);
    const loadProfile = classifyLoad(answers);
    const provinceYield = solarAssumptions.provinceYieldKwhPerKwp[answers.province as keyof typeof solarAssumptions.provinceYieldKwhPerKwp]
      ?? solarAssumptions.provinceYieldKwhPerKwp.other;
    const direction = answers.roofDirection ?? 'unknown';
    const slope = answers.roofSlope ?? 'unknown';
    const orientationFactor = solarAssumptions.slopeFactor[direction][slope];
    const targetShare = solarAssumptions.sizingTargetAnnualLoadShare[loadProfile];
    // Size from the household load first. Roof direction and shade change the
    // expected production; they do not quietly justify a larger sale.
    const calculatedSystemKw = clamp(round((annualLoadKwh * targetShare) / provinceYield, 0.5), 1.5, solarAssumptions.installedCapacityLimitKwp);
    const systemKw = answers.quoteSystemKw ? clamp(round(answers.quoteSystemKw, 0.1), 1, 30) : calculatedSystemKw;
    const shadeFactor = solarAssumptions.shadeFactor[answers.shade];
    const annualProduction = systemKw * provinceYield * orientationFactor * shadeFactor;
    const pvLoadRatio = annualProduction / Math.max(1, annualLoadKwh);
    const baseSelfConsumption = solarAssumptions.selfConsumptionAtBalancedSize[loadProfile];
    const selfConsumptionRatio = clamp(baseSelfConsumption - Math.max(0, pvLoadRatio - 0.45) * 0.22 + Math.max(0, 0.45 - pvLoadRatio) * 0.1, 0.25, 0.9);

    const monthlyProduction = solarAssumptions.monthlyProductionShare.map((share) => annualProduction * share);
    const monthlySelfConsumed = monthlyProduction.map((production, index) => Math.min(consumption.months[index], production * selfConsumptionRatio));
    const annualSelfConsumed = monthlySelfConsumed.reduce((sum, value) => sum + value, 0);
    const annualExported = Math.max(0, annualProduction - annualSelfConsumed);

    const financialResultAvailable = answers.tariffType === 'standard' || answers.tariffType === 'unknown';
    const annualAvoidedBill = financialResultAvailable
      ? consumption.months.reduce((sum, monthKwh, index) => sum + calculateResidentialBill(monthKwh, tariff) - calculateResidentialBill(Math.max(0, monthKwh - monthlySelfConsumed[index]), tariff), 0)
      : 0;
    const modeledAnnualBill = consumption.months.reduce((sum, monthKwh) => sum + calculateResidentialBill(monthKwh, tariff), 0);
    const currentMonthlyBill = answers.electricityInputKind === 'kwh'
      ? modeledAnnualBill / 12
      : [answers.monthlyBillThb ?? 0, ...(answers.additionalMonthlyValues ?? [])].reduce((sum, value) => sum + value, 0) / (1 + (answers.additionalMonthlyValues?.length ?? 0));

    const marketPlanningCost = planningPrice(systemKw, answers.electricityPhase);
    const comparableQuote = Boolean(answers.quoteCashPriceThb && answers.quoteSystemKw && !answers.quoteBatteryIncluded);
    const planningCost = round(comparableQuote ? answers.quoteCashPriceThb! : marketPlanningCost, 5000);
    const maintenance = systemKw <= 3
      ? solarAssumptions.routineMaintenanceThb.small
      : systemKw <= 5
        ? solarAssumptions.routineMaintenanceThb.medium
        : solarAssumptions.routineMaintenanceThb.large;
    const inverterReplacement = clamp(
      round(planningCost * solarAssumptions.inverterReplacement.costShare, 1000),
      solarAssumptions.inverterReplacement.minimumThb,
      solarAssumptions.inverterReplacement.maximumThb,
    );

    const confidenceResult = confidenceFor(answers, systemKw);
    const planningMonthlySavings = financialResultAvailable ? round(annualAvoidedBill / 12, 50) : null;
    const planningAnnualSavings = financialResultAvailable ? round(annualAvoidedBill, 100) : null;
    const netAnnualValue = annualAvoidedBill - maintenance;
    const rawPayback = financialResultAvailable && netAnnualValue > 0 ? planningCost / netAnnualValue : null;
    const planningPayback = rawPayback !== null && confidenceResult.confidence !== 'low' ? round(rawPayback, 0.1) : null;
    const upToAllowed = financialResultAvailable
      && answers.tariffType === 'standard'
      && confidenceResult.confidence !== 'low'
      && !['heavy', 'unknown'].includes(answers.shade)
      && answers.roofMaterial !== 'unknown';
    const upToFactor = confidenceResult.confidence === 'high' ? 1.08 : 1.15;
    const upToMonthlySavings = upToAllowed && planningMonthlySavings
      ? Math.min(roundDown(planningMonthlySavings * upToFactor, 50), roundDown(planningMonthlySavings * 1.2, 50))
      : null;

    const roofCapacity = answers.roofArea ? solarAssumptions.roofAreaCapacityKwp[answers.roofArea] : null;
    const roofFeasibility = !answers.roofArea || answers.roofArea === 'unknown'
      ? 'unknown'
      : roofCapacity !== null && systemKw > roofCapacity
        ? 'check'
        : 'likely';

    const lifetimeCostSeries: LifetimeCostPoint[] = [];
    let withoutSolar = 0;
    let withSolarPlanning = planningCost;
    const costUncertainty = comparableQuote ? 0 : confidenceResult.confidence === 'low' ? 0.15 : 0.08;
    lifetimeCostSeries.push({
      year: 0,
      withoutSolarThb: 0,
      withSolarLowThb: round(planningCost * (1 - costUncertainty), 100),
      withSolarHighThb: round(planningCost * (1 + costUncertainty), 100),
    });
    let tenYearNetBenefit: number | null = null;
    for (let year = 1; year <= solarAssumptions.analysisYears; year += 1) {
      const degradation = (1 - solarAssumptions.annualPanelDegradationRate) ** (year - 1);
      const avoided = financialResultAvailable ? annualAvoidedBill * degradation : 0;
      withoutSolar += modeledAnnualBill;
      withSolarPlanning += Math.max(0, modeledAnnualBill - avoided) + maintenance;
      if (year === solarAssumptions.inverterReplacement.year) withSolarPlanning += inverterReplacement;
      const spread = comparableQuote ? 0.03 : confidenceResult.confidence === 'low' ? 0.12 : 0.07;
      lifetimeCostSeries.push({
        year,
        withoutSolarThb: round(withoutSolar, 100),
        withSolarLowThb: round(withSolarPlanning * (1 - spread), 100),
        withSolarHighThb: round(withSolarPlanning * (1 + spread), 100),
      });
      if (year === 10 && financialResultAvailable) tenYearNetBenefit = round(withoutSolar - withSolarPlanning, 1000);
    }
    const finalPoint = lifetimeCostSeries[lifetimeCostSeries.length - 1];
    const twentyFiveYearNetBenefit = financialResultAvailable ? round(finalPoint.withoutSolarThb - withSolarPlanning, 1000) : null;
    const uncertainty = confidenceResult.confidence === 'high' ? 0.08 : confidenceResult.confidence === 'medium' ? 0.14 : 0.22;
    const productionRange = rangeAround(annualProduction, uncertainty, 100);
    const selfConsumedRange = rangeAround(annualSelfConsumed, uncertainty, 100);
    const exportedRange = rangeAround(annualExported, uncertainty, 100);
    const savingsRange = financialResultAvailable ? rangeAround(annualAvoidedBill / 12, uncertainty, 50) : { min: 0, max: 0 };
    const installedCostRange = comparableQuote ? { min: planningCost, max: planningCost } : rangeAround(planningCost, costUncertainty, 5000);
    const paybackRange = rawPayback === null ? null : rangeAround(rawPayback, confidenceResult.confidence === 'low' ? 0.25 : 0.12, 0.1);
    const lifetimeBenefitRange = financialResultAvailable ? rangeAround(twentyFiveYearNetBenefit ?? 0, uncertainty, 1000) : { min: 0, max: 0 };
    const weakEconomics = !financialResultAvailable || netAnnualValue <= 0 || (rawPayback ?? 99) > 15;

    return {
      recommendedSystemKw: rangeAround(systemKw, 0.1, 0.5),
      estimatedAnnualProductionKwh: productionRange,
      estimatedMonthlySavingsThb: savingsRange,
      estimatedBillReductionPct: financialResultAvailable ? rangeAround((annualAvoidedBill / Math.max(1, modeledAnnualBill)) * 100, uncertainty, 1) : { min: 0, max: 0 },
      estimatedPaybackYears: paybackRange,
      estimatedExportRevenueThb: null,
      conditionalAnnualExportRevenueThb: rangeAround(annualExported * solarAssumptions.fit.rateThbPerKwh, uncertainty, 100),
      estimatedTaxBenefitThb: null,
      estimatedInstalledCostThb: installedCostRange,
      estimatedAnnualSelfConsumedKwh: selfConsumedRange,
      estimatedAnnualExportedKwh: exportedRange,
      estimatedAnnualSelfConsumptionValueThb: financialResultAvailable ? rangeAround(annualAvoidedBill, uncertainty, 100) : { min: 0, max: 0 },
      estimatedAnnualOperationsAndMaintenanceThb: { min: maintenance, max: maintenance },
      estimatedLifetimeNetBenefitThb: lifetimeBenefitRange,
      lifetimeCostSeries,
      tariffVersion: tariff.id,
      estimatedMonthlyConsumptionKwh: round(consumption.average),
      confidence: confidenceResult.confidence,
      assumptionsUsed: [
        'ใช้ค่าผลผลิตตามจังหวัดและปรับด้วยทิศ ความลาด และเงาบังที่ผู้ใช้ระบุ',
        'คำนวณมูลค่าจากส่วนต่างของบิลอัตราก้าวหน้าก่อนและหลังใช้ไฟโซลาร์เองในแต่ละเดือน',
        'ขนาดเริ่มต้นเน้นการใช้ไฟเอง และไม่เพิ่มขนาดระบบเพื่อชดเชยเงาบัง',
        'ราคาเป็นค่ากลางเพื่อวางแผนและยังไม่ใช่ใบเสนอราคา',
        'ผลหลักไม่รวมรายได้ขายไฟ สิทธิภาษี ดอกเบี้ย หรือการเพิ่มขึ้นของค่าไฟ',
        `มุมมองระยะยาวเผื่อค่าดูแลรายปี การเสื่อมของแผง 0.5% ต่อปี และเงินสำรองเปลี่ยนอินเวอร์เตอร์ปีที่ ${solarAssumptions.inverterReplacement.year}`,
      ],
      assumptionVersion: solarAssumptions.version,
      calculatedAt: new Date().toISOString(),
      currentMonthlyBillThb: round(currentMonthlyBill, 1),
      planningSystemKw: systemKw,
      planningAnnualProductionKwh: round(annualProduction, 100),
      planningMonthlySavingsThb: planningMonthlySavings,
      upToMonthlySavingsThb: upToMonthlySavings,
      planningAnnualSavingsThb: planningAnnualSavings,
      planningInstalledCostThb: planningCost,
      planningPaybackYears: planningPayback,
      planningAnnualSelfConsumedKwh: round(annualSelfConsumed, 100),
      planningAnnualExportedKwh: round(annualExported, 100),
      planningTenYearNetBenefitThb: tenYearNetBenefit,
      planningTwentyFiveYearNetBenefitThb: twentyFiveYearNetBenefit,
      financialResultAvailable,
      weakEconomics,
      confidenceScore: confidenceResult.score,
      confidenceReasons: confidenceResult.reasons,
      missingEvidence: confidenceResult.missing,
      improvementActions: improvementActions(confidenceResult.missing),
      roofFeasibility,
      tariffAssumption: answers.tariffType === 'standard'
        ? 'identified-standard'
        : answers.tariffType === 'unknown'
          ? 'assumed-standard'
          : answers.tariffType === 'tou'
            ? 'tou-withheld'
            : 'private-withheld',
      loadProfile,
    };
  },
};
