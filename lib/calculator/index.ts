import { residentialEstimator } from './residential-estimator';
import type { EstimateAnswers } from './types';

export function calculateEstimate(answers: EstimateAnswers) {
  return residentialEstimator.calculate(answers);
}

export { residentialEstimator } from './residential-estimator';
export type { EstimateAnswers, EstimateResult, Estimator, LifetimeCostPoint, Range } from './types';
