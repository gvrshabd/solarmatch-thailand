import type { EstimateAnswers, EstimateResult, Estimator } from './types';

export const productionEstimator: Estimator = {
  calculate(answers: EstimateAnswers): EstimateResult {
    void answers;
    throw new Error('Production estimator is disabled until assumptions are validated.');
  },
};
