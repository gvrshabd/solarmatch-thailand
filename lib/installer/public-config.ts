import { getRuntimeEnv, requireDatabase } from '@/lib/server/runtime';
import { getPlatformSettings } from './settings';
import { validateInstallerAuthConfig } from './auth';

/** Explicit public allowlist. Never serialize portal/company settings here. */
export type InstallerPublicConfig = {
  accountsAvailable: boolean;
  commercial: { creditValueMinor: number; sharedCredits: number; trialDeliveries: number; claimDays: number; recipientLimit: number } | null;
};
export async function installerPublicConfig(): Promise<InstallerPublicConfig> {
  try {
    const settings = await getPlatformSettings(requireDatabase());
    const env = getRuntimeEnv();
    let accountsAvailable = false;
    try { validateInstallerAuthConfig(env.INSTALLER_PLATFORM_MODE, env.INSTALLER_BASE_URL, env.INSTALLER_AUTH_SECRET); accountsAvailable = true; } catch { /* fail closed */ }
    return { accountsAvailable, commercial: { creditValueMinor: settings.creditValueMinor, sharedCredits: settings.sharedCredits, trialDeliveries: settings.trialDeliveries, claimDays: settings.claimDays, recipientLimit: settings.recipientLimit } };
  } catch { return { accountsAvailable: false, commercial: null }; }
}
