import snapshot from './design-example-snapshot.json';
import type { EstimateResult } from '@/lib/calculator/types';

type DesignExampleResult = Pick<EstimateResult,
  'currentMonthlyBillThb' | 'planningAfterSolarMonthlyBillThb' |
  'planningMonthlySavingsThb' | 'planningSystemKw' |
  'planningInstalledCostThb' | 'planningPaybackYears' |
  'planningTwentyFiveYearNetBenefitThb' | 'lifetimeCostSeries'>;

/**
 * Static synthetic example only: no request-time calculator or real answers.
 * Full-precision fixture/model provenance lives beside the consumed eight fields.
 * Refresh and staleness gate: tests/unit/design-example-snapshot.test.ts.
 * Runtime freezing guards the shared module's data without cloning or computing.
 */
for (const point of snapshot.result.lifetimeCostSeries) Object.freeze(point);
Object.freeze(snapshot.result.lifetimeCostSeries);
export const designExampleResult: Readonly<DesignExampleResult> = Object.freeze(snapshot.result);
