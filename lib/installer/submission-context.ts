export type SubmissionMode = 'production' | 'sandbox' | 'local-test' | 'restricted-preview';

/** Called only with the server-validated platform mode and Access/collection context. */
export function submissionContext(platformMode: string, restricted: boolean, operationalDistribution: boolean) {
  if (!['production', 'sandbox', 'local-test'].includes(platformMode)) throw new Error('submissions_unavailable');
  const mode: SubmissionMode = platformMode === 'local-test' ? 'local-test' : platformMode === 'sandbox' ? 'sandbox' : restricted ? 'restricted-preview' : 'production';
  return {
    mode,
    environment: mode === 'production' ? 'production' : mode === 'restricted-preview' ? 'restricted_site_operational' : 'private_development_preview',
    testSubmission: mode !== 'production',
    // Test distribution is allowed only in its corresponding isolated processing mode.
    distributionAllowed: operationalDistribution && mode !== 'restricted-preview',
  } as const;
}
