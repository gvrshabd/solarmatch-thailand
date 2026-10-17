/**
 * Optional, pure post-estimate scenarios. These types deliberately do not extend
 * EstimateAnswers. In particular, tax income belongs only in transient React
 * memory: never serialize it to drafts, links, analytics, leads, or requests.
 */
export const SOLAR_TAX_RULE_VERSION = 'th-personal-solar-2026-03-03-v1' as const;
export const SCENARIO_SOURCES_VERIFIED_ON = '2026-10-17';

export type ScenarioEligibility = 'compatible' | 'ineligible' | 'insufficient-information';
export interface SolarTaxEligibilityInput {
  ruleVersion?: string;
  /** Prospective facts are intentions/assumptions, never evidence of entitlement. */
  mode: 'completed' | 'prospective';
  personalTaxpayer?: boolean;
  residentialType1?: boolean;
  qualifyingBuilding?: boolean;
  claimantMatchesElectricityAccount?: boolean;
  claimantMatchesGridApplicant?: boolean;
  claimantMatchesGridApproval?: boolean;
  /** Full qualifying e-Tax invoice from an eligible VAT-registered supplier. */
  qualifyingETaxInvoice?: boolean;
  claimantMatchesInvoice?: boolean;
  notPreviouslyClaimed?: boolean;
  singleSystem?: boolean;
  notUsedOtherTaxRelief?: boolean;
  notUsedInputVat?: boolean;
  utilityTaxNotification?: boolean;
  /** Total installed capacity at the dwelling; the source does not specify DC/AC. */
  totalInstalledCapacityKw?: number;
  /** Gregorian YYYY-MM-DD dates (actual, or explicitly planned in prospective mode). */
  contractDate?: string;
  paymentDate?: string;
  installationDate?: string;
  gridApplicationDate?: string;
  gridConnectionDate?: string;
}

export interface SolarTaxEligibilityResult {
  status: ScenarioEligibility;
  ruleVersion: typeof SOLAR_TAX_RULE_VERSION;
  mode: SolarTaxEligibilityInput['mode'];
  reasonCodes: string[];
  missingFields: string[];
  /** Connection completion determines the claim year, not the quotation/payment year. */
  claimYear: number | null;
  conditional: true;
}

const taxRequiredFlags = [
  'personalTaxpayer', 'residentialType1', 'qualifyingBuilding',
  'claimantMatchesElectricityAccount', 'claimantMatchesGridApplicant',
  'claimantMatchesGridApproval', 'qualifyingETaxInvoice', 'claimantMatchesInvoice',
  'notPreviouslyClaimed', 'singleSystem', 'notUsedOtherTaxRelief',
  'notUsedInputVat', 'utilityTaxNotification',
] as const;
const taxRequiredDates = [
  'contractDate', 'paymentDate', 'installationDate', 'gridApplicationDate', 'gridConnectionDate',
] as const;
const taxWindowStart = '2026-03-03';
const taxWindowEnd = '2028-12-31';

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** A checklist compatibility assessment, not RD approval or a tax filing service. */
export function assessSolarTaxEligibility(input: SolarTaxEligibilityInput): SolarTaxEligibilityResult {
  const reasonCodes: string[] = [];
  const missingFields: string[] = [];
  if (input.ruleVersion !== undefined && input.ruleVersion !== SOLAR_TAX_RULE_VERSION) {
    missingFields.push('supportedRuleVersion');
  }
  if (input.mode !== 'completed' && input.mode !== 'prospective') missingFields.push('mode');
  for (const key of taxRequiredFlags) {
    if (input[key] === false) reasonCodes.push(key);
    else if (input[key] !== true) missingFields.push(key);
  }
  if (!nonnegative(input.totalInstalledCapacityKw) || input.totalInstalledCapacityKw === 0) {
    missingFields.push('totalInstalledCapacityKw');
  } else if (input.totalInstalledCapacityKw > 10) {
    reasonCodes.push('installed-capacity-over-10kw');
  }
  for (const key of taxRequiredDates) {
    const date = input[key];
    if (!validDate(date)) missingFields.push(key);
    else if (date < taxWindowStart || date > taxWindowEnd) reasonCodes.push(`${key}-outside-window`);
  }
  if (validDate(input.gridApplicationDate) && validDate(input.gridConnectionDate)
    && input.gridConnectionDate < input.gridApplicationDate) missingFields.push('consistentGridDates');
  if (validDate(input.installationDate) && validDate(input.gridConnectionDate)
    && input.gridConnectionDate < input.installationDate) missingFields.push('consistentInstallationDates');
  return {
    status: reasonCodes.length ? 'ineligible' : missingFields.length ? 'insufficient-information' : 'compatible',
    ruleVersion: SOLAR_TAX_RULE_VERSION,
    mode: input.mode,
    reasonCodes,
    missingFields,
    claimYear: validDate(input.gridConnectionDate) ? Number(input.gridConnectionDate.slice(0, 4)) : null,
    conditional: true,
  };
}

/** Ordinary progressive PIT only; excludes alternative minimum tax, credits and filing adjustments. */
export function calculateThaiProgressiveIncomeTax(netTaxableIncomeBaht: number): number {
  if (!nonnegative(netTaxableIncomeBaht)) throw new RangeError('Net taxable income must be finite and nonnegative');
  const brackets = [
    [150_000, 0], [300_000, 0.05], [500_000, 0.10], [750_000, 0.15],
    [1_000_000, 0.20], [2_000_000, 0.25], [5_000_000, 0.30], [Infinity, 0.35],
  ] as const;
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of brackets) {
    tax += Math.max(0, Math.min(netTaxableIncomeBaht, upper) - lower) * rate;
    if (netTaxableIncomeBaht <= upper) break;
    lower = upper;
  }
  return tax;
}

export interface SolarTaxScenarioInput {
  eligibility: SolarTaxEligibilityInput;
  /** Unknown or complex filings cannot receive a precise ordinary-bracket saving. */
  taxCalculationBasis?: 'ordinary-progressive' | 'complex-or-unsure';
  /** Net taxable income after expenses and other allowances, before this solar exemption. Not gross salary. */
  netTaxableIncomeBeforeSolarBaht?: number;
  /** Qualifying actual expenditure, or clearly identified prospective expenditure. */
  qualifyingSpendBaht?: number;
}
export interface SolarTaxScenarioResult {
  eligibility: SolarTaxEligibilityResult;
  status: ScenarioEligibility;
  deductionBaht: number | null;
  taxBeforeBaht: number | null;
  taxAfterBaht: number | null;
  taxSavingBaht: number | null;
  missingFields: string[];
  conditional: true;
  cashRebate: false;
}

export function calculateSolarTaxScenario(input: SolarTaxScenarioInput): SolarTaxScenarioResult {
  const eligibility = assessSolarTaxEligibility(input.eligibility);
  const missingFields = [...eligibility.missingFields];
  if (input.taxCalculationBasis !== 'ordinary-progressive') missingFields.push('taxCalculationBasis');
  if (!nonnegative(input.netTaxableIncomeBeforeSolarBaht)) missingFields.push('netTaxableIncomeBeforeSolarBaht');
  if (!nonnegative(input.qualifyingSpendBaht)) missingFields.push('qualifyingSpendBaht');
  const status = eligibility.status === 'ineligible' ? 'ineligible'
    : missingFields.length ? 'insufficient-information' : 'compatible';
  const unavailable: SolarTaxScenarioResult = {
    eligibility, status, deductionBaht: null, taxBeforeBaht: null, taxAfterBaht: null,
    taxSavingBaht: null, missingFields, conditional: true, cashRebate: false,
  };
  if (status !== 'compatible') return unavailable;
  const income = input.netTaxableIncomeBeforeSolarBaht!;
  const deductionBaht = Math.min(input.qualifyingSpendBaht!, 200_000, income);
  const taxBeforeBaht = calculateThaiProgressiveIncomeTax(income);
  const taxAfterBaht = calculateThaiProgressiveIncomeTax(Math.max(0, income - deductionBaht));
  return { ...unavailable, deductionBaht, taxBeforeBaht, taxAfterBaht, taxSavingBaht: taxBeforeBaht - taxAfterBaht };
}

export interface VerifiedExportContract {
  verified: true;
  rateBahtPerKwh: number;
  /** Inclusive contract calendar dates in Thailand (UTC+07:00), never an assumed term. */
  startDate: string;
  endDate: string;
  acExportCapKw: number;
}
export interface ExportSurplusInterval {
  /** ISO timestamp with explicit Z or UTC offset. Surplus is after on-site consumption. */
  startDateTime: string;
  durationHours: number;
  surplusKwh: number;
}
export interface ExportScenarioInput {
  contract?: VerifiedExportContract;
  intervals: readonly ExportSurplusInterval[];
}
export interface ExportScenarioResult {
  status: 'modelled' | 'insufficient-information';
  exportKwh: number;
  exportIncomeBaht: number;
  excludedSurplusKwh: number;
  reasonCodes: string[];
  /** Interval energy assumes a constant average within each supplied interval. */
  intervalAverageAssumption: true;
}

function intervalTimestamp(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    || !validDate(value.slice(0, 10))) return NaN;
  return Date.parse(value);
}

/** No verified contract means no modelled export revenue, regardless of programme announcements. */
export function calculateExportScenario(input: ExportScenarioInput): ExportScenarioResult {
  const unavailable = (reason: string): ExportScenarioResult => ({
    status: 'insufficient-information', exportKwh: 0, exportIncomeBaht: 0,
    excludedSurplusKwh: 0, reasonCodes: [reason], intervalAverageAssumption: true,
  });
  const contract = input.contract;
  if (!contract || contract.verified !== true) return unavailable('verified-contract-required');
  if (!input.intervals.length) return unavailable('surplus-intervals-required');
  if (!nonnegative(contract.rateBahtPerKwh) || !nonnegative(contract.acExportCapKw)
    || !validDate(contract.startDate) || !validDate(contract.endDate) || contract.endDate < contract.startDate) {
    return unavailable('complete-valid-contract-terms-required');
  }
  const start = Date.parse(`${contract.startDate}T00:00:00+07:00`);
  const end = Date.parse(`${contract.endDate}T00:00:00+07:00`) + 86_400_000;
  const intervals = input.intervals.map(interval => ({ ...interval, start: intervalTimestamp(interval.startDateTime) }));
  if (intervals.some(interval => !Number.isFinite(interval.start)
    || !nonnegative(interval.durationHours) || interval.durationHours === 0
    || !Number.isFinite(interval.start + interval.durationHours * 3_600_000)
    || !nonnegative(interval.surplusKwh))) return unavailable('valid-surplus-intervals-required');
  intervals.sort((a, b) => a.start - b.start);
  if (intervals.some((interval, i) => i > 0
    && interval.start < intervals[i - 1].start + intervals[i - 1].durationHours * 3_600_000)) {
    return unavailable('non-overlapping-surplus-intervals-required');
  }
  let exportKwh = 0;
  let excludedSurplusKwh = 0;
  const reasonCodes: string[] = [];
  for (const interval of intervals) {
    const intervalEnd = interval.start + interval.durationHours * 3_600_000;
    const overlapHours = Math.max(0, Math.min(end, intervalEnd) - Math.max(start, interval.start)) / 3_600_000;
    const inTermSurplus = interval.surplusKwh * overlapHours / interval.durationHours;
    const accepted = Math.min(inTermSurplus, contract.acExportCapKw * overlapHours);
    exportKwh += accepted;
    excludedSurplusKwh += interval.surplusKwh - accepted;
    if (overlapHours > 0 && overlapHours < interval.durationHours
      && !reasonCodes.includes('contract-boundary-interval-prorated')) reasonCodes.push('contract-boundary-interval-prorated');
  }
  return { status: 'modelled', exportKwh, exportIncomeBaht: exportKwh * contract.rateBahtPerKwh,
    excludedSurplusKwh, reasonCodes, intervalAverageAssumption: true };
}

export interface FinanceScenarioInput {
  systemCostBaht: number;
  depositBaht: number;
  termMonths: number;
  annualRatePercent: number;
  rateBasis: 'flat' | 'reducing';
  upfrontFeesBaht?: number;
  financedFeesBaht?: number;
  /** Actual fixed instalment from a quote, if known. No lender/product is inferred. */
  actualMonthlyPaymentBaht?: number;
  /** Supplied scenario benefit. Keep tax and export separate unless explicitly included by the caller. */
  monthlyBenefitBaht: number;
}
export interface FinanceScenarioResult {
  status: 'modelled' | 'insufficient-information';
  principalBaht: number | null;
  calculatedMonthlyPaymentBaht: number | null;
  monthlyPaymentBaht: number | null;
  paymentSource: 'calculated' | 'actual-quote' | null;
  modelInterestBaht: number | null;
  scheduledPaymentsTotalBaht: number | null;
  upfrontCashBaht: number | null;
  monthlyBenefitBaht: number | null;
  monthlyNetCashFlowBaht: number | null;
  /** Unknown/omitted fees are not a verified zero-fee offer. */
  feeInputsComplete: boolean;
  reasonCodes: string[];
}

/** Fixed-rate, equal-monthly-payment arithmetic. Not a credit offer or effective APR. */
export function calculateFinanceScenario(input: FinanceScenarioInput): FinanceScenarioResult {
  const reasonCodes: string[] = [];
  const feeInputsComplete = input.upfrontFeesBaht !== undefined && input.financedFeesBaht !== undefined;
  if (!feeInputsComplete) reasonCodes.push('omitted-fees-assumed-zero-for-arithmetic');
  const invalid = !nonnegative(input.systemCostBaht) || !nonnegative(input.depositBaht)
    || input.depositBaht > input.systemCostBaht || !Number.isInteger(input.termMonths) || input.termMonths <= 0
    || !nonnegative(input.annualRatePercent) || !nonnegative(input.monthlyBenefitBaht)
    || (input.rateBasis !== 'flat' && input.rateBasis !== 'reducing')
    || (input.upfrontFeesBaht !== undefined && !nonnegative(input.upfrontFeesBaht))
    || (input.financedFeesBaht !== undefined && !nonnegative(input.financedFeesBaht))
    || (input.actualMonthlyPaymentBaht !== undefined && !nonnegative(input.actualMonthlyPaymentBaht));
  const unavailable: FinanceScenarioResult = {
    status: 'insufficient-information', principalBaht: null, calculatedMonthlyPaymentBaht: null,
    monthlyPaymentBaht: null, paymentSource: null, modelInterestBaht: null,
    scheduledPaymentsTotalBaht: null, upfrontCashBaht: null, monthlyBenefitBaht: null,
    monthlyNetCashFlowBaht: null, feeInputsComplete, reasonCodes: [...reasonCodes, 'valid-finance-terms-required'],
  };
  if (invalid) return unavailable;
  const principalBaht = input.systemCostBaht - input.depositBaht + (input.financedFeesBaht ?? 0);
  const monthlyRate = input.annualRatePercent / 1200;
  const calculatedMonthlyPaymentBaht = input.rateBasis === 'flat'
    ? principalBaht * (1 + input.annualRatePercent / 100 * input.termMonths / 12) / input.termMonths
    : monthlyRate === 0 ? principalBaht / input.termMonths
      : principalBaht * monthlyRate / -Math.expm1(-input.termMonths * Math.log1p(monthlyRate));
  const monthlyPaymentBaht = input.actualMonthlyPaymentBaht ?? calculatedMonthlyPaymentBaht;
  const upfrontCashBaht = input.depositBaht + (input.upfrontFeesBaht ?? 0);
  const modelInterestBaht = Math.max(0, calculatedMonthlyPaymentBaht * input.termMonths - principalBaht);
  const scheduledPaymentsTotalBaht = monthlyPaymentBaht * input.termMonths;
  if (![principalBaht, calculatedMonthlyPaymentBaht, monthlyPaymentBaht, upfrontCashBaht, modelInterestBaht,
    scheduledPaymentsTotalBaht].every(Number.isFinite)) return unavailable;
  if (input.actualMonthlyPaymentBaht !== undefined
    && Math.abs(input.actualMonthlyPaymentBaht - calculatedMonthlyPaymentBaht) > 0.01) {
    reasonCodes.push('actual-quote-payment-differs-check-final-payment-and-fees');
  }
  return { status: 'modelled', principalBaht, calculatedMonthlyPaymentBaht, monthlyPaymentBaht,
    paymentSource: input.actualMonthlyPaymentBaht === undefined ? 'calculated' : 'actual-quote',
    modelInterestBaht, scheduledPaymentsTotalBaht, upfrontCashBaht, monthlyBenefitBaht: input.monthlyBenefitBaht,
    monthlyNetCashFlowBaht: input.monthlyBenefitBaht - monthlyPaymentBaht, feeInputsComplete, reasonCodes };
}
