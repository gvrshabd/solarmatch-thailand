export const featureFlags = {
  SITE_MODE: 'prototype',
  FEATURE_ANALYTICS: false,
  FEATURE_LINE_LIVE: false,
  FEATURE_LIVE_LEADS: false,
  FEATURE_OTP: false,
  FEATURE_SOCIAL_PROOF: false,
  FEATURE_INSTALLER_MARKETPLACE: false,
  FEATURE_MULTIPLE_QUOTES: false,
  FEATURE_FIT_CALCULATION: false,
  FEATURE_TAX_ESTIMATE: false,
  FEATURE_LONG_TERM_COST_CHART: false,
  ASK_BUDGET: false,
  ASK_FINANCING: false,
  ASK_ENERGY_INTEREST: true,
} as const;

export function assertProductionConfiguration() {
  if (featureFlags.SITE_MODE !== 'prototype') {
    throw new Error(
      'Production mode is locked until legal identity, calculator assumptions, consent recipients, contact channels, lead endpoint and buyer configuration are validated.',
    );
  }
}
