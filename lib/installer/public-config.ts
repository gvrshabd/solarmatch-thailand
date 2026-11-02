import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { getPlatformSettings } from './settings';
import { validateInstallerAuthConfig } from './auth';
import {authEmailReady,installerRegistrationReady} from './collection-readiness';

/** Explicit public allowlist. Never serialize portal/company settings here. */
export type InstallerPublicConfig = {
  accountsAvailable: boolean;
  registrationAvailable?: boolean;
  recoveryAvailable?: boolean;
  commercial: { creditValueMinor: number; sharedCredits: number; trialDeliveries: number; claimDays: number; recipientLimit: number } | null;
};
export async function installerPublicConfig(): Promise<InstallerPublicConfig> {
  try {
    const settings = await getPlatformSettings(requireDatabase());
    const env = getRuntimeEnv();
    let accountsAvailable = false;
    try { validateInstallerAuthConfig(env.INSTALLER_PLATFORM_MODE, env.INSTALLER_BASE_URL, env.INSTALLER_AUTH_SECRET); accountsAvailable = true; } catch { /* fail closed */ }
    return { accountsAvailable, registrationAvailable:accountsAvailable&&installerRegistrationReady(env), recoveryAvailable:accountsAvailable&&authEmailReady(env), commercial: { creditValueMinor: settings.creditValueMinor, sharedCredits: settings.sharedCredits, trialDeliveries: settings.trialDeliveries, claimDays: settings.claimDays, recipientLimit: settings.recipientLimit } };
  } catch { return { accountsAvailable: false, registrationAvailable:false, recoveryAvailable:false, commercial: null }; }
}
