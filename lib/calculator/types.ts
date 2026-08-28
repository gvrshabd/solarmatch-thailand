export type Range = { min: number; max: number };

export type PropertyType =
  | 'detached-home'
  | 'townhouse'
  | 'large-home'
  | 'shophouse'
  | 'warehouse'
  | 'apartment-building'
  | 'other';

export type DaytimePattern = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
export type DaytimeLoad =
  | 'air-conditioning'
  | 'pump'
  | 'ev'
  | 'office-equipment'
  | 'business-equipment'
  | 'laundry-cooking'
  | 'other-high-use'
  | 'none';
export type RoofShade = 'almost-none' | 'little' | 'some' | 'a-lot' | 'unsure';
export type RoofDirection = 'south-group' | 'east' | 'west' | 'north' | 'flat' | 'several' | 'unsure';
export type RoofSlope = 'flat' | 'gentle' | 'steep' | 'unsure';
export type RoofArea = 'under-30' | '30-60' | '60-100' | '100-200' | 'over-200' | 'unsure';
export type ElectricityPhase = 'single' | 'three' | 'unsure';
export type FutureLoad = 'ev' | 'air-conditioning' | 'pump' | 'business-equipment' | 'none' | 'unsure';

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
  monthlyBillThb: number;
  propertyType: PropertyType;
  roofArea: RoofArea;
  daytimePattern: DaytimePattern;
  daytimeLoads: DaytimeLoad[];
  roofMaterial: string;
  shade: RoofShade;

  // Optional precision inputs. These are never needed to unlock a complete result.
  location?: EstimateLocation;
  exactRoofAreaSqm?: number;
  roofDirection?: RoofDirection;
  roofSlope?: RoofSlope;
  electricityPhase?: ElectricityPhase;
  futureLoads?: FutureLoad[];
  quoteSystemKw?: number;
  quoteCashPriceThb?: number;
  quoteBatteryIncluded?: boolean;
  quoteIncludesUtilityApplication?: boolean;
};

export type CalculationTrace = {
  labelEn: string;
  labelTh: string;
  value: string;
  valueTh?: string;
  basisEn: string;
  basisTh: string;
};

export type EstimateResult = {
  currentMonthlyBillThb: number;
  estimatedMonthlyConsumptionKwh: number;
  planningSystemKw: number;
  planningAnnualProductionKwh: number;
  planningMonthlySavingsThb: number;
  planningAnnualSavingsThb: number;
  planningInstalledCostThb: number;
  planningPaybackYears: number | null;
  planningAnnualSelfConsumedKwh: number;
  planningAnnualExportedKwh: number;
  planningTwentyFiveYearNetBenefitThb: number;
  planningBillReductionPct: number;
  roofFeasibility: 'likely' | 'limited' | 'unconfirmed';
  recommendation: 'strong-fit' | 'worth-comparing' | 'site-check-first';
  loadProfile: 'low' | 'medium' | 'high';
  tariffVersion: string;
  tariffLabelEn: string;
  tariffLabelTh: string;
  assumptionVersion: string;
  calculatedAt: string;
  assumptionsUsed: string[];
  trace: CalculationTrace[];
  lifetimeCostSeries: LifetimeCostPoint[];

  // Compatibility fields for existing chart helpers. Each collapses to the same
  // conservative planning figure; the public UI no longer shows wide ranges.
  recommendedSystemKw: Range;
  estimatedAnnualProductionKwh: Range;
  estimatedMonthlySavingsThb: Range;
  estimatedBillReductionPct: Range;
  estimatedPaybackYears: Range | null;
  estimatedInstalledCostThb: Range;
  estimatedAnnualSelfConsumedKwh: Range;
  estimatedAnnualExportedKwh: Range;
  estimatedLifetimeNetBenefitThb: Range;
};

export type LifetimeCostPoint = {
  year: number;
  withoutSolarThb: number;
  withSolarThb: number;
};

export interface Estimator {
  calculate(answers: EstimateAnswers): EstimateResult;
}
