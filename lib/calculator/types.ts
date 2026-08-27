export type Range = { min: number; max: number };
export type Confidence = 'low' | 'medium' | 'high';

export type EstimateAnswers = {
  province: string;
  monthlyBillThb: number;
  monthlyKwh?: number;
  daytimeUsage: 'high' | 'medium' | 'low' | 'unknown';
  authority: string;
  propertyType: string;
  roofKnown: boolean;
  roofMaterial?: string;
  shade?: 'none' | 'partial' | 'high' | 'unknown';
  timing: string;
  energyInterest?: string;
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
