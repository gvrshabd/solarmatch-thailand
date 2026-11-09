const consentVersion = 1;
const consentKey = 'solarmatch-campaign-consent';

export type CampaignConsent = {
  version: typeof consentVersion;
  choice: 'accepted' | 'rejected';
  decidedAt: string;
};

export function readCampaignConsent(storage: Pick<Storage, 'getItem'>): CampaignConsent | undefined {
  try {
    const record = JSON.parse(storage.getItem(consentKey) ?? 'null');
    if (record?.version !== consentVersion || !['accepted', 'rejected'].includes(record.choice)) return;
    if (typeof record.decidedAt !== 'string' || new Date(record.decidedAt).toISOString() !== record.decidedAt) return;
    return { version: consentVersion, choice: record.choice, decidedAt: record.decidedAt };
  } catch {
    return undefined;
  }
}

export function saveCampaignConsent(
  storage: Pick<Storage, 'setItem' | 'removeItem'>,
  choice: CampaignConsent['choice'],
): CampaignConsent | undefined {
  const record = { version: consentVersion, choice, decidedAt: new Date().toISOString() } as const;
  try {
    // Revoke a prior opt-in even if saving the replacement record fails.
    if (choice === 'rejected') storage.removeItem(consentKey);
    storage.setItem(consentKey, JSON.stringify(record));
    return record;
  } catch {
    return undefined;
  }
}
