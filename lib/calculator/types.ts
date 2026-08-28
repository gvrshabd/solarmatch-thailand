export type Range = { min: number; max: number };
export type Confidence = 'low' | 'medium' | 'high';

export type ElectricityInputKind = 'kwh' | 'bill' | 'help';
export type ConsumptionPeriod = 'average-12' | 'average-3' | 'latest' | 'typical' | 'unknown';
export type TariffType = 'standard' | 'tou' | 'private' | 'unknown';
export type DaytimePattern = 'mostly-empty' | 'light-use' | 'work-or-ac' | 'regular-loads' | 'unknown';
export type DaytimeLoad = 'air-conditioning' | 'pump' | 'ev' | 'home-office' | 'home-business' | 'laundry-cooking' | 'none' | 'unknown';
export type RoofShade = 'none' | 'short' | 'several-hours' | 'heavy' | 'unknown';
export type RoofDirection = 'south-group' | 'east' | 'west' | 'north' | 'flat' | 'several' | 'unknown';
export type RoofSlope = 'flat' | 'gentle' | 'steep' | 'unknown';
export type RoofArea = 'small' | 'medium' | 'large' | 'unknown';
export type ElectricityPhase = 'single' | 'three' | 'unknown';
export type FutureLoad = 'ev' | 'air-conditioning' | 'pump' | 'home-business' | 'none' | 'unknown';

export type EstimateLocation = {
  address: string;
  latitude: number;
  longitude: number;
  province: string;
  source: 'manual-map' | 'current-location';
  confirmed: boolean;
};

export type EstimateAnswers = {
  province: string;
  location: EstimateLocation;
  electricityInputKind: ElectricityInputKind;
  monthlyBillThb?: number;
  monthlyKwh?: number;
  additionalMonthlyValues?: number[];
  consumptionPeriod: ConsumptionPeriod;
  tariffType: TariffType;
  touOnPeakKwh?: number;
  touOffPeakKwh?: number;
  daytimePattern: DaytimePattern;
  daytimeLoads: DaytimeLoad[];
  acDaytimeHours?: 'under-2' | '2-4' | 'over-4' | 'unknown';
  evChargesInDaytime?: 'yes' | 'no' | 'unknown';
  roofMaterial?: string;
  shade: RoofShade;
  roofDirection?: RoofDirection;
  roofSlope?: RoofSlope;
  roofArea?: RoofArea;
  electricityPhase?: ElectricityPhase;
  futureLoads?: FutureLoad[];
  quoteSystemKw?: number;
  quoteCashPriceThb?: number;
  quoteBatteryIncluded?: boolean;
  quoteIncludesUtilityApplication?: boolean;
};

export type EstimateResult = {
  recommendedSystemKw: Range;
  estimatedAnnualProductionKwh: Range;
  estimatedMonthlySavingsThb: Range;
  estimatedBillReductionPct: Range;
  estimatedPaybackYears: null | Range;
  estimatedExportRevenueThb: null | Range;
  conditionalAnnualExportRevenueThb: Range;
  estimatedTaxBenefitThb: null | Range;
  estimatedInstalledCostThb: Range;
  estimatedAnnualSelfConsumedKwh: Range;
  estimatedAnnualExportedKwh: Range;
  estimatedAnnualSelfConsumptionValueThb: Range;
  estimatedAnnualOperationsAndMaintenanceThb: Range;
  estimatedLifetimeNetBenefitThb: Range;
  lifetimeCostSeries: LifetimeCostPoint[];
  tariffVersion: string;
  estimatedMonthlyConsumptionKwh: number;
  confidence: Confidence;
  assumptionsUsed: string[];
  assumptionVersion: string;
  calculatedAt: string;
  currentMonthlyBillThb: number;
  planningSystemKw: number;
  planningAnnualProductionKwh: number;
  planningMonthlySavingsThb: number | null;
  upToMonthlySavingsThb: number | null;
  planningAnnualSavingsThb: number | null;
  planningInstalledCostThb: number;
  planningPaybackYears: number | null;
  planningAnnualSelfConsumedKwh: number;
  planningAnnualExportedKwh: number;
  planningTenYearNetBenefitThb: number | null;
  planningTwentyFiveYearNetBenefitThb: number | null;
  financialResultAvailable: boolean;
  weakEconomics: boolean;
  confidenceScore: number;
  confidenceReasons: string[];
  missingEvidence: string[];
  improvementActions: string[];
  roofFeasibility: 'likely' | 'check' | 'unknown';
  tariffAssumption: 'identified-standard' | 'assumed-standard' | 'tou-withheld' | 'private-withheld';
  loadProfile: 'low' | 'medium' | 'high' | 'unknown';
};

export type LifetimeCostPoint = {
  year: number;
  withoutSolarThb: number;
  withSolarLowThb: number;
  withSolarHighThb: number;
};

export interface Estimator {
  calculate(answers: EstimateAnswers): EstimateResult;
}
