export const featureFlags = {
  FEATURE_ANALYTICS: false,
} as const;

export function assertProductionConfiguration() {
  return true;
}
