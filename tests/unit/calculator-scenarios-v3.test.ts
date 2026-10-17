import { describe, expect, it } from 'vitest';
import {
  assessSolarTaxEligibility, calculateSolarTaxScenario, calculateThaiProgressiveIncomeTax,
  calculateExportScenario, calculateFinanceScenario, SOLAR_TAX_RULE_VERSION,
  type SolarTaxEligibilityInput,
} from '@/lib/calculator/scenarios';

const eligible: SolarTaxEligibilityInput = {
  mode: 'completed', personalTaxpayer: true, residentialType1: true, qualifyingBuilding: true,
  claimantMatchesElectricityAccount: true, claimantMatchesGridApplicant: true,
  claimantMatchesGridApproval: true, qualifyingETaxInvoice: true, claimantMatchesInvoice: true,
  notPreviouslyClaimed: true, singleSystem: true, notUsedOtherTaxRelief: true,
  notUsedInputVat: true, utilityTaxNotification: true, totalInstalledCapacityKw: 10,
  contractDate: '2026-03-03', paymentDate: '2026-05-01', installationDate: '2026-05-15',
  gridApplicationDate: '2026-04-01', gridConnectionDate: '2026-06-01',
};
const contract = { verified: true as const, rateBahtPerKwh: 2.2,
  startDate: '2027-01-01', endDate: '2027-12-31', acExportCapKw: 5 };
const finance = { systemCostBaht: 200_000, depositBaht: 20_000, termMonths: 60,
  annualRatePercent: 6, rateBasis: 'flat' as const, monthlyBenefitBaht: 2_000 };

describe('optional Thai solar tax scenario', () => {
  it('uses marginal brackets before and after, not one marginal rate times cost', () => {
    const result = calculateSolarTaxScenario({ eligibility: eligible, taxCalculationBasis: 'ordinary-progressive',
      netTaxableIncomeBeforeSolarBaht: 800_000, qualifyingSpendBaht: 200_000 });
    expect(result.status).toBe('compatible');
    expect(result.taxBeforeBaht).toBe(75_000);
    expect(result.taxAfterBaht).toBe(42_500);
    expect(result.taxSavingBaht).toBe(32_500);
    expect(result.cashRebate).toBe(false);
    expect(result.conditional).toBe(true);
  });
  it.each([[0, 0], [150_000, 0], [300_000, 7_500], [500_000, 27_500],
    [750_000, 65_000], [1_000_000, 115_000], [2_000_000, 365_000],
    [5_000_000, 1_265_000], [6_000_000, 1_615_000]])('taxes net income %i at %i', (income, tax) => {
    expect(calculateThaiProgressiveIncomeTax(income)).toBe(tax);
  });
  it('does not equate exemption or installation price with money returned', () => {
    const low = calculateSolarTaxScenario({ eligibility: eligible, taxCalculationBasis: 'ordinary-progressive',
      netTaxableIncomeBeforeSolarBaht: 100_000, qualifyingSpendBaht: 400_000 });
    expect(low.deductionBaht).toBe(100_000);
    expect(low.taxSavingBaht).toBe(0);
    const capped = calculateSolarTaxScenario({ eligibility: eligible, taxCalculationBasis: 'ordinary-progressive',
      netTaxableIncomeBeforeSolarBaht: 800_000, qualifyingSpendBaht: 400_000 });
    expect(capped.deductionBaht).toBe(200_000);
  });
  it.each([undefined, 'complex-or-unsure'] as const)('does not show precise tax amounts for unsupported calculation basis %s', taxCalculationBasis => {
    const result = calculateSolarTaxScenario({ eligibility: eligible, taxCalculationBasis,
      netTaxableIncomeBeforeSolarBaht: 800_000, qualifyingSpendBaht: 200_000 });
    expect(result.eligibility.status).toBe('compatible');
    expect(result.status).toBe('insufficient-information');
    expect(result.missingFields).toContain('taxCalculationBasis');
    expect(result.taxBeforeBaht).toBeNull();
    expect(result.taxAfterBaht).toBeNull();
    expect(result.taxSavingBaht).toBeNull();
  });
  it('keeps missing facts unknown, including income and zero/invalid capacity', () => {
    expect(assessSolarTaxEligibility({ mode: 'prospective' }).status).toBe('insufficient-information');
    expect(assessSolarTaxEligibility({ ...eligible, totalInstalledCapacityKw: 0 }).status).toBe('insufficient-information');
    const unknown = calculateSolarTaxScenario({ eligibility: { ...eligible, qualifyingETaxInvoice: undefined }, taxCalculationBasis: 'ordinary-progressive',
      netTaxableIncomeBeforeSolarBaht: 800_000, qualifyingSpendBaht: 200_000 });
    expect(unknown.taxSavingBaht).toBeNull();
    expect(unknown.missingFields).toContain('qualifyingETaxInvoice');
    expect(calculateSolarTaxScenario({ eligibility: eligible, taxCalculationBasis: 'ordinary-progressive', qualifyingSpendBaht: 200_000 }).taxSavingBaht).toBeNull();
  });
  it.each(['claimantMatchesElectricityAccount', 'claimantMatchesGridApplicant', 'claimantMatchesGridApproval',
    'claimantMatchesInvoice', 'notPreviouslyClaimed', 'singleSystem', 'notUsedOtherTaxRelief', 'notUsedInputVat',
    'qualifyingETaxInvoice', 'utilityTaxNotification'] as const)('rejects failed requirement %s', field => {
    expect(assessSolarTaxEligibility({ ...eligible, [field]: false }).status).toBe('ineligible');
  });
  it('checks inclusive dates, impossible dates, capacity and unsupported rule versions', () => {
    expect(assessSolarTaxEligibility({ ...eligible, gridConnectionDate: '2028-12-31' }).status).toBe('compatible');
    expect(assessSolarTaxEligibility({ ...eligible, contractDate: '2026-03-02' }).status).toBe('ineligible');
    expect(assessSolarTaxEligibility({ ...eligible, gridConnectionDate: '2029-01-01' }).status).toBe('ineligible');
    expect(assessSolarTaxEligibility({ ...eligible, installationDate: '2026-02-30' }).status).toBe('insufficient-information');
    expect(assessSolarTaxEligibility({ ...eligible, totalInstalledCapacityKw: 10.01 }).status).toBe('ineligible');
    expect(assessSolarTaxEligibility({ ...eligible, ruleVersion: 'future' }).status).toBe('insufficient-information');
    expect(assessSolarTaxEligibility(eligible).ruleVersion).toBe(SOLAR_TAX_RULE_VERSION);
  });
  it('marks prospective facts conditional and claims only in connection year', () => {
    const result = assessSolarTaxEligibility({ ...eligible, mode: 'prospective', gridConnectionDate: '2027-01-02' });
    expect(result.status).toBe('compatible');
    expect(result.conditional).toBe(true);
    expect(result.claimYear).toBe(2027);
  });
  it('does not mutate inputs and refuses non-finite arithmetic', () => {
    const frozen = Object.freeze({ ...eligible });
    expect(assessSolarTaxEligibility(frozen).status).toBe('compatible');
    expect(() => calculateThaiProgressiveIncomeTax(NaN)).toThrow(RangeError);
    expect(() => calculateThaiProgressiveIncomeTax(-1)).toThrow(RangeError);
    expect(calculateSolarTaxScenario({ eligibility: frozen, taxCalculationBasis: 'ordinary-progressive',
      netTaxableIncomeBeforeSolarBaht: Infinity, qualifyingSpendBaht: 200_000 }).taxSavingBaht).toBeNull();
  });
});

describe('optional contracted export scenario', () => {
  it('has no revenue without a complete verified contract and interval surplus', () => {
    expect(calculateExportScenario({ intervals: [] }).exportIncomeBaht).toBe(0);
    expect(calculateExportScenario({ contract, intervals: [] }).status).toBe('insufficient-information');
    expect(calculateExportScenario({ contract: { ...contract, rateBahtPerKwh: NaN }, intervals: [] }).exportIncomeBaht).toBe(0);
  });
  it('caps surplus each interval by AC capacity rather than averaging an annual cap', () => {
    const result = calculateExportScenario({ contract, intervals: [
      { startDateTime: '2027-06-01T12:00:00+07:00', durationHours: 0.5, surplusKwh: 10 },
      { startDateTime: '2027-06-01T12:30:00+07:00', durationHours: 0.5, surplusKwh: 0.5 },
    ] });
    expect(result.exportKwh).toBe(3);
    expect(result.exportIncomeBaht).toBeCloseTo(6.6);
    expect(result.excludedSurplusKwh).toBe(7.5);
  });
  it('respects Thai contract calendar boundaries and never extends term', () => {
    const result = calculateExportScenario({ contract, intervals: [
      { startDateTime: '2026-12-31T23:30:00+07:00', durationHours: 1, surplusKwh: 2 },
      { startDateTime: '2027-12-31T23:30:00+07:00', durationHours: 1, surplusKwh: 2 },
      { startDateTime: '2028-01-01T12:00:00+07:00', durationHours: 1, surplusKwh: 10 },
    ] });
    expect(result.exportKwh).toBe(2);
    expect(result.reasonCodes).toContain('contract-boundary-interval-prorated');
  });
  it('rejects overlapping intervals and unknown timezone to avoid double counting', () => {
    const interval = { startDateTime: '2027-06-01T12:00:00+07:00', durationHours: 1, surplusKwh: 2 };
    expect(calculateExportScenario({ contract, intervals: [interval, interval] }).status).toBe('insufficient-information');
    expect(calculateExportScenario({ contract, intervals: [{ ...interval, startDateTime: '2027-06-01T12:00:00' }] }).status).toBe('insufficient-information');
  });
});

describe('optional quote-based financing scenario', () => {
  it('distinguishes flat interest and reducing balance, keeping repayment out of electricity savings', () => {
    const flat = calculateFinanceScenario(finance);
    const reducing = calculateFinanceScenario({ ...finance, rateBasis: 'reducing' });
    expect(flat.principalBaht).toBe(180_000);
    expect(flat.monthlyPaymentBaht).toBe(3_900);
    expect(flat.modelInterestBaht).toBe(54_000);
    expect(flat.monthlyBenefitBaht).toBe(2_000);
    expect(flat.monthlyNetCashFlowBaht).toBe(-1_900);
    expect(reducing.monthlyPaymentBaht).toBeCloseTo(3_479.9043, 3);
    expect(reducing.modelInterestBaht!).toBeLessThan(flat.modelInterestBaht!);
  });
  it('handles zero rates, deposits, upfront and financed fees explicitly', () => {
    const result = calculateFinanceScenario({ ...finance, annualRatePercent: 0,
      upfrontFeesBaht: 1_000, financedFeesBaht: 6_000 });
    expect(result.principalBaht).toBe(186_000);
    expect(result.monthlyPaymentBaht).toBe(3_100);
    expect(result.modelInterestBaht).toBe(0);
    expect(result.upfrontCashBaht).toBe(21_000);
    expect(result.feeInputsComplete).toBe(true);
    expect(calculateFinanceScenario(finance).feeInputsComplete).toBe(false);
  });
  it('uses an actual quoted payment for cash flow without relabelling modelled interest as quoted interest', () => {
    const result = calculateFinanceScenario({ ...finance, actualMonthlyPaymentBaht: 4_100 });
    expect(result.monthlyPaymentBaht).toBe(4_100);
    expect(result.paymentSource).toBe('actual-quote');
    expect(result.monthlyNetCashFlowBaht).toBe(-2_100);
    expect(result.scheduledPaymentsTotalBaht).toBe(246_000);
    expect(result.modelInterestBaht).toBe(54_000);
    expect(result.reasonCodes).toContain('actual-quote-payment-differs-check-final-payment-and-fees');
  });
  it.each([{ depositBaht: 200_001 }, { termMonths: 0 }, { termMonths: 1.5 },
    { annualRatePercent: NaN }, { upfrontFeesBaht: -1 }, { actualMonthlyPaymentBaht: Infinity }])('rejects invalid terms %o', patch => {
    const result = calculateFinanceScenario({ ...finance, ...patch });
    expect(result.status).toBe('insufficient-information');
    expect(result.monthlyNetCashFlowBaht).toBeNull();
  });
});
