import { featureFlags } from '@/config/feature-flags';
import { prototypeEstimator } from './prototype-estimator';
import { productionEstimator } from './production-estimator';
import type { EstimateAnswers } from './types';

export function calculateEstimate(answers: EstimateAnswers) {
  return (featureFlags.SITE_MODE === 'prototype' ? prototypeEstimator : productionEstimator).calculate(answers);
}

export { prototypeEstimator } from './prototype-estimator';
export { productionEstimator } from './production-estimator';
export type { EstimateAnswers, EstimateResult, Estimator, Range } from './types';
