import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';

/** Presentation guards: unavailable model values must never become a saving claim. */
export function resultsPresentation(result: EstimateResult) {
  const available = !['unsupported', 'no-economic-option', 'no-feasible-option'].includes(result.modelStatus ?? '');
  const saving = result.planningMonthlySavingsThb;
  return {
    available,
    savingDirection: saving > 0 ? 'less' : saving < 0 ? 'more' : 'unchanged',
    beforeBill: result.baselineFutureMonthlyBillThb ?? result.currentMonthlyBillThb,
    selfUsePercent: result.planningAnnualProductionKwh > 0
      ? result.planningAnnualSelfConsumedKwh / result.planningAnnualProductionKwh * 100 : null,
    hasPayback: available && result.planningPaybackYears !== null && Number.isFinite(result.planningPaybackYears) && result.planningPaybackYears > 0,
  };
}

export function hasResultRefinements(answers: EstimateAnswers) {
  return [answers.exactRoofAreaSqm, answers.panelTiltDegrees, answers.panelAzimuthDegrees,
    answers.quoteSystemKw, answers.quoteCashPriceThb, answers.discountRatePct,
    answers.roofDirection, answers.roofSlope].some(value => value !== undefined)
    || Boolean(answers.plannedLoadChanges?.length);
}
