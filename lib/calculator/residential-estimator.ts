import {
  calculateResidentialBill,
  estimateKwhFromBill,
  selectResidentialTariff,
} from '@/config/electricity-tariffs';
import { solarAssumptions } from '@/config/solar-assumptions';
import type { EstimateAnswers, EstimateResult, Estimator, LifetimeCostPoint, Range } from './types';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function point(value: number): Range {
  return { min: value, max: value };
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
  if (answers.daytimeLoads.some((load) => ['other-high-use', 'ev'].includes(load))) score += 1;
  if (score <= 1) return 'low';
  if (score >= 4) return 'high';
  return 'medium';
}

function roofCapacity(answers: EstimateAnswers) {
  if (answers.exactRoofAreaSqm) return Math.max(1, Math.floor((answers.exactRoofAreaSqm / solarAssumptions.squareMetresPerKwp) * 2) / 2);
  if (!answers.roofArea) return null;
  return solarAssumptions.roofAreaCapacityKwp[answers.roofArea];
}

export const residentialEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    const tariff = selectResidentialTariff(answers.province);
    const monthlyConsumptionKwh = estimateKwhFromBill(answers.monthlyBillThb, tariff);
    const annualLoadKwh = monthlyConsumptionKwh * 12;
    const loadProfile = classifyLoad(answers);
    const provinceYield = solarAssumptions.provinceYieldKwhPerKwp[answers.province as keyof typeof solarAssumptions.provinceYieldKwhPerKwp]
      ?? solarAssumptions.provinceYieldKwhPerKwp.other;
    const direction = answers.roofDirection ?? 'unsure';
    const slope = answers.roofSlope ?? 'unsure';
    const orientationFactor = solarAssumptions.slopeFactor[direction][slope];
    const shadeFactor = solarAssumptions.shadeFactor[answers.shade];
    const futureLoadAdjustment = answers.futureLoads?.some((load) => !['none', 'unsure'].includes(load)) ? 0.04 : 0;
    const targetShare = clamp(
      solarAssumptions.sizingTargetAnnualLoadShare[answers.daytimePattern] + futureLoadAdjustment,
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
    const loadBonus = answers.daytimeLoads.some((load) => ['other-high-use', 'ev'].includes(load)) ? 0.03 : 0;
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
    const modeledAnnualBill = answers.monthlyBillThb * 12;

    const assumedPhase = answers.electricityPhase === 'three' ? 'three' : 'single';
    const marketPlanningCost = planningPrice(systemKw, assumedPhase);
    const comparableQuote = Boolean(answers.quoteCashPriceThb && answers.quoteSystemKw && !answers.quoteBatteryIncluded);
    const planningCost = round(comparableQuote ? answers.quoteCashPriceThb! : marketPlanningCost, 5000);
    const annualReserve = planningCost * solarAssumptions.annualMaintenanceAndComponentReserveRate;
    const firstYearNetValue = annualAvoidedBill - annualReserve;
    const payback = firstYearNetValue > 0 ? planningCost / firstYearNetValue : null;

    const lifetimeCostSeries: LifetimeCostPoint[] = [{ year: 0, withoutSolarThb: 0, withSolarThb: planningCost }];
    let cumulativeAvoidedBill = 0;
    for (let year = 1; year <= solarAssumptions.analysisYears; year += 1) {
      const degradation = (1 - solarAssumptions.annualPanelDegradationRate) ** (year - 1);
      const avoided = annualAvoidedBill * degradation;
      cumulativeAvoidedBill += avoided;
      const withoutSolar = modeledAnnualBill * year;
      const withSolar = planningCost + withoutSolar - cumulativeAvoidedBill + annualReserve * year;
      lifetimeCostSeries.push({
        year,
        withoutSolarThb: round(withoutSolar, 100),
        withSolarThb: round(withSolar, 100),
      });
    }

    const finalWithoutSolar = modeledAnnualBill * solarAssumptions.analysisYears;
    const finalWithSolar = planningCost + finalWithoutSolar - cumulativeAvoidedBill + annualReserve * solarAssumptions.analysisYears;
    const lifetimeNet = round(finalWithoutSolar - finalWithSolar, 1000);
    const monthlySavings = round(annualAvoidedBill / 12);
    const annualSavings = round(annualAvoidedBill);
    const afterSolarMonthlyBill = round(Math.max(0, answers.monthlyBillThb - monthlySavings));
    const billReductionPct = round((annualAvoidedBill / Math.max(1, modeledAnnualBill)) * 100, 0.1);
    const selectedRoofLimited = capacity !== null && capacity + 0.01 < billLedSystemKw;
    const roofFeasibility = capacity === null ? 'unconfirmed' : selectedRoofLimited ? 'limited' : 'likely';
    const recommendation = answers.shade === 'a-lot' || (selectedRoofLimited && systemKw < billLedSystemKw * 0.6)
      ? 'site-check-first'
      : lifetimeNet > 0 && payback !== null && payback <= 15
        ? 'strong-fit'
        : 'worth-comparing';

    const roundedSystem = round(systemKw, 0.1);
    const roundedProduction = round(annualProduction, 100);
    const roundedSelfConsumed = round(annualSelfConsumed, 100);
    const roundedExported = round(annualExported, 100);
    const roundedCost = round(planningCost, 1000);
    const roundedPayback = payback === null ? null : round(payback, 0.1);

    return {
      currentMonthlyBillThb: answers.monthlyBillThb,
      estimatedMonthlyConsumptionKwh: round(monthlyConsumptionKwh),
      planningSystemKw: roundedSystem,
      planningAnnualProductionKwh: roundedProduction,
      planningMonthlySavingsThb: monthlySavings,
      planningAnnualSavingsThb: annualSavings,
      planningAfterSolarMonthlyBillThb: afterSolarMonthlyBill,
      planningInstalledCostThb: roundedCost,
      planningAnnualMaintenanceReserveThb: round(annualReserve),
      planningPaybackYears: roundedPayback,
      planningAnnualSelfConsumedKwh: roundedSelfConsumed,
      planningAnnualExportedKwh: roundedExported,
      planningTwentyFiveYearNetBenefitThb: lifetimeNet,
      planningBillReductionPct: billReductionPct,
      roofFeasibility,
      recommendation,
      loadProfile,
      tariffVersion: tariff.id,
      tariffLabelEn: `${tariff.authorityLabelEn} · ${tariff.labelEn}`,
      tariffLabelTh: `${tariff.authorityLabelTh} · ${tariff.labelTh}`,
      assumptionVersion: solarAssumptions.version,
      calculatedAt: new Date().toISOString(),
      assumptionsUsed: [
        `Monthly consumption is reverse-calculated from the entered bill using the applicable ${tariff.authority} residential tariff schedule.`,
        'System sizing is led by the bill, property type, and stated daytime-use band, then constrained by optional usable roof-area information when supplied.',
        'Production uses province-level solar yield and the stated shade, direction and slope information; no clear-sky assumption is used.',
        'The base result values self-consumed electricity only and excludes export payments, tax relief, finance and tariff escalation.',
        'The 25-year figure subtracts installation cost and a 1.02% annual maintenance/component reserve, including inverter-related risk, and applies 0.5% annual module degradation.',
      ],
      trace: [
        { labelEn: 'Monthly bill', labelTh: 'ค่าไฟต่อเดือน', value: `฿${round(answers.monthlyBillThb).toLocaleString('en-US')}`, basisEn: 'Your answer', basisTh: 'คำตอบของคุณ' },
        { labelEn: 'Tariff', labelTh: 'อัตราค่าไฟ', value: `${tariff.authority} · ${tariff.effectiveFrom}–${tariff.effectiveTo}`, basisEn: `${tariff.authorityLabelEn}, including the applicable residential tiers, Ft and VAT.`, basisTh: `${tariff.authorityLabelTh} รวมอัตราขั้นบันได ค่า Ft และ VAT ที่ใช้บังคับ`, sourceUrl: tariff.source, sourceLabelEn: `${tariff.authority} residential tariff source`, sourceLabelTh: `แหล่งอัตราค่าไฟบ้านของ ${tariff.authority}` },
        { labelEn: 'Estimated monthly use', labelTh: 'การใช้ไฟต่อเดือนโดยประมาณ', value: `${round(monthlyConsumptionKwh).toLocaleString('en-US')} kWh`, basisEn: 'Reverse-calculated from your bill using the stated residential tariff.', basisTh: 'คำนวณย้อนกลับจากยอดค่าไฟของคุณด้วยอัตราค่าไฟบ้านที่ระบุ' },
        { labelEn: 'Estimated starting system size', labelTh: 'ขนาดระบบเริ่มต้นโดยประมาณ', value: `${roundedSystem} kWp`, basisEn: 'Monthly bill, daytime use, property type and any optional roof-area details.', basisTh: 'ค่าไฟต่อเดือน การใช้ไฟช่วงกลางวัน ประเภทบ้าน และข้อมูลพื้นที่หลังคาเสริม (ถ้ามี)' },
        { labelEn: 'Estimated first-year solar generation', labelTh: 'การผลิตไฟโซลาร์ปีแรกโดยประมาณ', value: `${roundedProduction.toLocaleString('en-US')} kWh`, basisEn: 'Province, solar resource, visible shade and any optional roof details.', basisTh: 'จังหวัด ข้อมูลพลังงานแสงอาทิตย์ เงาบังที่มองเห็น และข้อมูลหลังคาเสริม (ถ้ามี)' },
        { labelEn: 'Planning price', labelTh: 'ราคาเพื่อวางแผน', value: `฿${roundedCost.toLocaleString('en-US')}`, basisEn: comparableQuote ? 'Your comparable cash quote.' : 'Current Thai planning-price evidence; not a quotation.', basisTh: comparableQuote ? 'ใบเสนอราคาเงินสดที่เปรียบเทียบได้ของคุณ' : 'หลักฐานราคาเพื่อวางแผนในไทยปัจจุบัน ไม่ใช่ใบเสนอราคา' },
        { labelEn: 'Annual maintenance/component reserve', labelTh: 'เงินสำรองค่าบำรุงรักษา/อุปกรณ์ต่อปี', value: `฿${round(annualReserve).toLocaleString('en-US')}/year`, basisEn: '1.02% of the planning price each year.', basisTh: '1.02% ของราคาเพื่อวางแผนในแต่ละปี' },
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
