import { describe, expect, it } from 'vitest';
// Reviewed operational helper exports pure validation; importing cannot run CLI.
import { comparePreservation, assertHeldFlags } from '../../scripts/homeowner-v3-production-release.mjs';

describe('release preservation checks', () => {
  it('requires exact historical business records and rejects additions/deletions/changes', () => {
    const rows = [{ id: 'fixture', amount: 10 }];
    expect(comparePreservation('installer_credit_ledger', rows, rows)).toEqual({ preserved: 1, added: 0 });
    expect(() => comparePreservation('installer_credit_ledger', rows, [])).toThrow('missing');
    expect(() => comparePreservation('installer_credit_ledger', rows, [{ id: 'fixture', amount: 11 }])).toThrow('changed');
    expect(() => comparePreservation('leads', [], rows)).toThrow('Unplanned');
  });
  it('permits only the reviewed release current-flag transition', () => {
    const before = [{ id: 'residential-release-v8', is_current: 1 }];
    expect(comparePreservation('public_releases', before, [{ ...before[0], is_current: 0 }],
      { published: true, previousReleaseId: before[0].id })).toEqual({ preserved: 1, added: 0 });
    expect(() => comparePreservation('public_releases', before, [{ ...before[0], is_current: 0 }])).toThrow('changed');
    expect(() => comparePreservation('audit_events', [], [{ action: 'unrelated' }], { published: true })).toThrow('Unplanned');
    expect(comparePreservation('installer_auth_session', [{ id: 'expired' }], [])).toEqual({ volatileMetadataChanged: true });
  });
  it('does not accept omitted disabled flags as a safe runtime', () => {
    expect(() => assertHeldFlags({ INSTALLER_PLATFORM_MODE: 'off', INSTALLER_BASE_URL: 'https://solarmatch-thailand.deluxejahseh.workers.dev' },
      { mode: 'off', worker: 'solarmatch-thailand' })).toThrow('not disabled');
  });
});
