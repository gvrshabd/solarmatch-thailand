import { solarAssumptions } from '@/config/solar-assumptions';
import type { EstimateAnswers, EstimateResult, Estimator, Range } from './types';

function round(value: number, step = 1) {
  return Math.round(value / step) * step;
}

function normalizeRange(center: number, width: number, step: number): Range {
  return {
    min: Math.max(step, round(center * (1 - width), step)),
    max: Math.max(step, round(center * (1 + width), step)),
  };
}

export const prototypeEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    const bill = Math.max(500, Math.min(50000, answers.monthlyBillThb));
    const estimatedMonthlyKwh = answers.monthlyKwh ?? bill / solarAssumptions.simplifiedRetailValueThbPerKwh;
    const daytimeShare = solarAssumptions.daytimeShare[answers.daytimeUsage];
    const shade = solarAssumptions.shadeFactor[answers.shade ?? 'unknown'];
    const targetKw = Math.max(1.5, Math.min(15, (estimatedMonthlyKwh * 12 * daytimeShare) / solarAssumptions.referenceAnnualYieldKwhPerKwp));
    const unknownRoof = !answers.roofKnown || !answers.shade || answers.shade === 'unknown';
    const width = unknownRoof ? 0.28 : 0.18;
    const system = normalizeRange(targetKw, width, 0.5);
    const production: Range = {
      min: round(system.min * solarAssumptions.referenceAnnualYieldKwhPerKwp * shade, 50),
      max: round(system.max * solarAssumptions.referenceAnnualYieldKwhPerKwp * Math.min(1, shade + 0.06), 50),
    };
    const monthlySavingsCenter = Math.min(
      bill * 0.78,
      (targetKw * solarAssumptions.referenceAnnualYieldKwhPerKwp * daytimeShare * solarAssumptions.simplifiedRetailValueThbPerKwh) / 12,
    );
    const savings = normalizeRange(monthlySavingsCenter, width, 50);
    savings.max = Math.min(round(bill * 0.85, 50), savings.max);
    const billReduction: Range = {
      min: round((savings.min / bill) * 100),
      max: round((savings.max / bill) * 100),
    };

    return {
      recommendedSystemKw: system,
      estimatedAnnualProductionKwh: production,
      estimatedMonthlySavingsThb: savings,
      estimatedBillReductionPct: billReduction,
      estimatedPaybackYears: null,
      estimatedExportRevenueThb: null,
      estimatedTaxBenefitThb: null,
      confidence: unknownRoof ? 'low' : answers.daytimeUsage === 'unknown' ? 'medium' : 'high',
      assumptionsUsed: [
        'ค่าไฟถูกแปลงเป็นการใช้ไฟด้วยอัตราอย่างง่ายสำหรับต้นแบบ',
        `ผลผลิตอ้างอิง ${solarAssumptions.referenceAnnualYieldKwhPerKwp.toLocaleString('th-TH')} kWh ต่อ kWp ต่อปี`,
        'ไม่รวมรายได้จากการขายไฟส่วนเกิน',
        'ไม่รวมสิทธิประโยชน์ทางภาษี',
      ],
      assumptionVersion: solarAssumptions.version,
      calculatedAt: new Date().toISOString(),
      currentMonthlyBillThb: bill,
    };
  },
};
