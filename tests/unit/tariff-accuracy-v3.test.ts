import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateResidentialBill, estimateKwhFromBill, residentialTariffs, resolveResidentialTariff,
  selectResidentialTariff, tariffIsoDate, TARIFF_REFERENCE_DATE,
} from '@/config/electricity-tariffs';

afterEach(() => vi.useRealTimers());

describe('v3 verified residential tariff resolution', () => {
  it('keeps verified September–December 2026 base tiers, Ft and service charges', () => {
    const result = resolveResidentialTariff({ utility: 'PEA', billingDate: '2026-10-17', category: 'ordinary-1.2' });
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') throw new Error('Expected verified tariff');
    expect(result.tariff.tiers).toEqual([
      { upToKwh: 200, rateThbPerKwh: 3 }, { upToKwh: 400, rateThbPerKwh: 4.1584 }, { upToKwh: null, rateThbPerKwh: 4.3583 },
    ]);
    expect(result.tariff.ftThbPerKwh).toBe(0.1623);
    expect(calculateResidentialBill(500, result.tariff)).toBeCloseTo((24.62 + 200 * 3 + 200 * 4.1584 + 100 * 4.3583 + 500 * 0.1623) * 1.07, 8);
    expect(result.metadata).toMatchObject({ dateBasis: 'bill-date', effectiveFrom: '2026-09-01', effectiveTo: '2026-12-31', checkedAt: '2026-10-17', expiresAt: '2026-12-31' });
    expect(result.metadata.sourceUrls.some((url) => url.includes('pea.co.th'))).toBe(true);
  });

  it.each(['2026-04-30', '2027-01-01', '2025-10-17'])('has no indefinite or backwards fallback for %s', (billingDate) => {
    expect(resolveResidentialTariff({ billingDate }).status).toBe('out-of-period');
    expect(() => selectResidentialTariff('bangkok', new Date(`${billingDate}T12:00:00Z`))).toThrow(RangeError);
  });

  it('includes both boundaries and changes the base schedule only at the September billing month', () => {
    const first = resolveResidentialTariff({ billingDate: '2026-05-01' });
    const old = resolveResidentialTariff({ billingDate: '2026-08-31' });
    const current = resolveResidentialTariff({ billingDate: '2026-09-01' });
    const last = resolveResidentialTariff({ billingDate: '2026-12-31' });
    expect([first.status, old.status, current.status, last.status]).toEqual(['resolved', 'resolved', 'resolved', 'resolved']);
    if (old.status !== 'resolved' || current.status !== 'resolved') throw new Error('Expected tariffs');
    expect(old.tariff.tiers[0]).toEqual({ upToKwh: 150, rateThbPerKwh: 3.2484 });
    expect(current.tariff.tiers[0]).toEqual({ upToKwh: 200, rateThbPerKwh: 3 });
  });

  it.each(['PEA', 'MEA'] as const)('supports explicit ordinary small-meter category for %s without monthly-use auto-switching', (utility) => {
    const result = resolveResidentialTariff({ utility, billingDate: '2026-09-01', category: 'ordinary-1.1' });
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') throw new Error('Expected tariff');
    expect(result.tariff.serviceChargeThb).toBe(8.19);
    expect(result.tariff.authority).toBe(utility);
    expect(calculateResidentialBill(100, result.tariff)).toBeCloseTo((8.19 + 15 * 2.3488 + 10 * 2.9882 + 75 * 3 + 100 * 0.1623) * 1.07, 8);
    expect(calculateResidentialBill(500, result.tariff)).toBeCloseTo((8.19 + 15 * 2.3488 + 10 * 2.9882 + 175 * 3 + 200 * 4.1584 + 100 * 4.3583 + 500 * 0.1623) * 1.07, 8);
  });

  it('uses the bill-date schedule for inversion separately from an explicit future reference', () => {
    const historical = resolveResidentialTariff({ utility: 'MEA', billingDate: '2026-08-20', referenceDate: '2026-10-17', category: 'ordinary-1.2' });
    const future = resolveResidentialTariff({ utility: 'MEA', billingDate: '2026-08-20', referenceDate: '2026-10-17', category: 'ordinary-1.2', purpose: 'future-reference' });
    if (historical.status !== 'resolved' || future.status !== 'resolved') throw new Error('Expected tariffs');
    const oldBill = calculateResidentialBill(600, historical.tariff);
    expect(estimateKwhFromBill(oldBill, historical.tariff)).toBeCloseTo(600, 8);
    expect(estimateKwhFromBill(oldBill, future.tariff)).not.toBeCloseTo(600, 2);
    expect(historical.metadata.resolvedDate).toBe('2026-08-20');
    expect(future.metadata).toMatchObject({ resolvedDate: '2026-10-17', dateBasis: 'explicit-reference', purpose: 'future-reference' });
    expect(future.metadata.assumptions.some((text) => text.includes('not a forecast'))).toBe(true);
  });

  it('marks missing historical dates as a frozen assumption independent of wall clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2035-01-01T00:00:00Z'));
    const missing = resolveResidentialTariff();
    expect(missing.metadata).toMatchObject({ requestedDate: null, resolvedDate: TARIFF_REFERENCE_DATE, dateBasis: 'assumed-reference' });
    expect(missing.warnings).toContain('bill-date-missing-reference-assumed');
    expect(missing.warnings).toContain('tariff-category-assumed-ordinary-1.2');
    expect(selectResidentialTariff().effectiveTo).toBe('2026-12-31');
  });

  it.each(['tou', 'unknown'] as const)('does not treat explicit %s as an ordinary tariff', (category) => {
    expect(resolveResidentialTariff({ billingDate: '2026-10-17', category })).toMatchObject({ status: 'unsupported', tariff: null, metadata: { category } });
  });

  it.each(['2026-02-30', '2026-10-17T00:00:00Z', '', '2026-13-01'])('rejects malformed calendar date %s', (billingDate) => {
    expect(tariffIsoDate(billingDate)).toBeNull();
    expect(resolveResidentialTariff({ billingDate }).status).toBe('invalid-date');
  });

  it('rejects invalid Date objects without throwing and records explicit utility override', () => {
    expect(resolveResidentialTariff({ billingDate: new Date(NaN) }).status).toBe('invalid-date');
    expect(resolveResidentialTariff({ province: 'bangkok', utility: 'PEA', billingDate: '2026-10-17' }).metadata.authority).toBe('PEA');
  });

  it('round-trips all schedules at their progressive boundaries', () => {
    for (const tariff of residentialTariffs) {
      const boundaries = [0, 12.5, 50, 150, 200, 400, 401, 1000, ...tariff.tiers.flatMap((tier) => tier.upToKwh === null ? [] : [tier.upToKwh - 0.001, tier.upToKwh, tier.upToKwh + 0.001])];
      for (const usage of boundaries) expect(estimateKwhFromBill(calculateResidentialBill(usage, tariff), tariff)).toBeCloseTo(usage, 7);
    }
  });
});
