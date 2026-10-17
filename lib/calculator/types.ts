export type Range = { min: number; max: number };

export type PropertyType =
  | 'detached-home'
  | 'semi-detached-home'
  | 'townhouse'
  | 'large-home'
  | 'other-residential';

export type OwnershipStatus = 'owner' | 'renter' | 'other';
export type InstallationTimeframe = 'asap' | 'one-three-months' | 'three-six-months' | 'over-six-months' | 'researching';
export type PlanningTimeframe = 'within-3-months' | 'three-six-months' | 'six-twelve-months' | 'over-twelve-months' | 'researching';
export type SolarProjectType = 'new-rooftop' | 'solar-with-battery' | 'expand-existing' | 'unsure';
export type OwnerPermission = 'yes' | 'not-yet';

export type DaytimePattern = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
export type DaytimeLoad =
  | 'air-conditioning'
  | 'pump'
  | 'ev'
  | 'home-office-equipment'
  | 'laundry-cooking'
  | 'other-high-use'
  | 'none';
export type RoofShade = 'almost-none' | 'little' | 'some' | 'a-lot' | 'unsure';
export type RoofDirection = 'south-group' | 'east' | 'west' | 'north' | 'flat' | 'several' | 'unsure';
export type RoofSlope = 'flat' | 'gentle' | 'steep' | 'unsure';
export type RoofArea = 'under-30' | '30-60' | '60-100' | '100-200' | 'over-200' | 'unsure';
export type ElectricityPhase = 'single' | 'three' | 'unsure';
export type FutureLoad = 'ev' | 'air-conditioning' | 'pump' | 'none' | 'unsure';

export type EstimateLocation = {
  address: string;
  latitude: number;
  longitude: number;
  province: string;
  source: 'manual-map' | 'current-location';
  confirmed: boolean;
};

export type EstimateAnswers = {
  estimateModelVersion?: 'energy-v3' | 'legacy-v5';
  solarOnlyIllustration?: boolean;
  calculationReferenceDate?: string;
  consumptionInput?: 'bill' | 'kwh';
  monthlyConsumptionKwh?: number;
  billingPeriodDays?: number;
  billDate?: string;
  tariffCategory?: 'ordinary-1.1' | 'ordinary-1.2' | 'tou' | 'unknown';
  utility?: 'MEA' | 'PEA' | 'unknown';
  monthlyRecords?: Array<{ month: number; kwh: number; periodDays: number; billDate?: string }>;
  weekendDaytimePattern?: DaytimePattern;
  daylightAcUnits?: number;
  daylightAcHours?: number;
  acPowerKw?: number;
  existingEvMonthlyKwh?: number;
  evHomeChargingFraction?: number;
  evDaytimeFraction?: number;
  pumpPowerKw?: number;
  pumpHoursPerDay?: number;
  pumpStartHour?: number;
  plannedLoadChanges?: Array<{kind:'ev'|'air-conditioning'|'pump';startDate:string;monthlyKwh?:number;homeChargingFraction?:number;daytimeFraction?:number;powerKw?:number;units?:number;hoursPerDay?:number;startHour?:number}>;
  panelTiltDegrees?: number;
  panelAzimuthDegrees?: number;
  quoteModuleCount?: number;
  quoteModuleWp?: number;
  quoteInverterAcKw?: number;
  budgetThb?: number;
  discountRatePct?: number;
  province: string;
  customLocation?: string;
  customProvince?: string;
  district?: string;
  postcode?: string;
  monthlyBillThb: number;
  activelyPlanningSolar: boolean;
  planningTimeframe?: PlanningTimeframe;
  projectType?: SolarProjectType;
  propertyType: PropertyType;
  customPropertyType?: string;
  ownershipStatus: OwnershipStatus;
  ownerPermission?: OwnerPermission;
  roofArea?: RoofArea;
  daytimePattern: DaytimePattern;
  daytimeLoads: DaytimeLoad[];
  customDaytimeLoad?: string;
  airConditionerCount?: number;
  roofMaterial: string;
  customRoofMaterial?: string;
  shade: RoofShade;
  quoteContactRequested: boolean;
  quoteConsentAccepted?: boolean;
  // Kept only for reading historic v1 assessment records.
  installationTimeframe?: InstallationTimeframe;

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
  sourceUrl?: string;
  sourceLabelEn?: string;
  sourceLabelTh?: string;
};

export type EstimateResult = {
  modelVersion?: string;
  modelStatus?: 'supported'|'conditional'|'unsupported'|'no-feasible-option'|'no-economic-option'|'infeasible-quote';
  calculationReferenceDate?: string;
  warnings?: Array<{code:string;en:string;th:string}>;
  selectedSystem?: CandidateSystem;
  candidateSystems?: CandidateSystem[];
  energy?: {demandKwh:number;generationKwh:number;selfConsumedKwh:number;gridImportKwh:number;surplusKwh:number;futureDemandKwh:number;monthly:Array<{month:number;demandKwh:number;generationKwh:number;selfConsumedKwh:number;gridImportKwh:number;surplusKwh:number}>};
  annualFinancials?: Array<{year:number;generationKwh:number;selfConsumedKwh:number;gridImportKwh:number;surplusKwh:number;grossSavingsThb:number;reserveThb:number;netCashFlowThb:number;baselineBillThb:number;withSolarBillThb:number}>;
  recommendationReason?: {en:string;th:string};
  uncertaintyScenarios?: Array<{id:'lower'|'central'|'higher';annualGenerationKwh:number;annualSavingsThb:number;lifetimeBenefitThb:number;basisEn:string;basisTh:string}>;
  discountedValueThb?: number;
  historicalTariffVersion?: string;
  baselineFutureMonthlyBillThb?: number;
  currentMonthlyBillThb: number;
  estimatedMonthlyConsumptionKwh: number;
  planningSystemKw: number;
  planningAnnualProductionKwh: number;
  planningMonthlySavingsThb: number;
  planningAnnualSavingsThb: number;
  planningAfterSolarMonthlyBillThb: number;
  planningInstalledCostThb: number;
  planningAnnualMaintenanceReserveThb: number;
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

export type CandidateSystem = {
  id:string;labelEn:string;labelTh:string;dcKwp:number;moduleCount:number;moduleWp:number;inverterAcKw:number;
  phase:'single'|'three'|'unknown';requiredRoofAreaSqm:number;priceThb:number;sourceUrl?:string;
  feasible:boolean;conditional:boolean;reasons:string[];annualSavingsThb:number;lifetimeBenefitThb:number;paybackYears:number|null;
};

export type LifetimeCostPoint = {
  year: number;
  withoutSolarThb: number;
  withSolarThb: number;
};

export interface Estimator {
  calculate(answers: EstimateAnswers): EstimateResult;
}
