import { describe, expect, it } from 'vitest';
import { activeResidentialTariff, calculateResidentialBill, electricityAuthorityForProvince, estimateKwhFromBill, selectResidentialTariff, september2026ResidentialTariff } from '@/config/electricity-tariffs';

describe('Thai residential tariff model', () => {
  it('applies progressive tiers, Ft, service charge and VAT', () => {
    const expectedBeforeVat = 24.62 + (200 * 3) + (200 * 0.1623);
    expect(calculateResidentialBill(200)).toBeCloseTo(expectedBeforeVat * 1.07, 6);
  });

  it('inverts the modeled bill back to monthly consumption', () => {
    const tariff = selectResidentialTariff('bangkok', new Date('2026-09-02T12:00:00Z'));
    const bill = calculateResidentialBill(725, tariff);
    expect(estimateKwhFromBill(bill, tariff)).toBeCloseTo(725, 4);
  });

  it('never creates a negative bill for zero use', () => {
    expect(calculateResidentialBill(0)).toBeCloseTo(activeResidentialTariff.serviceChargeThb * 1.07, 6);
  });

  it('selects the published September 2026 tariff only from its effective date', () => {
    expect(selectResidentialTariff(new Date('2026-08-31T12:00:00Z')).id).toBe(activeResidentialTariff.id);
    expect(selectResidentialTariff(new Date('2026-09-01T12:00:00Z')).id).toBe(september2026ResidentialTariff.id);
    const expectedBeforeVat = 24.62 + (200 * 3) + (50 * 4.1584) + (250 * 0.1623);
    expect(calculateResidentialBill(250, september2026ResidentialTariff)).toBeCloseTo(expectedBeforeVat * 1.07, 6);
  });

  it('uses MEA for its three-province service area and PEA elsewhere', () => {
    expect(electricityAuthorityForProvince('bangkok')).toBe('MEA');
    expect(electricityAuthorityForProvince('nonthaburi')).toBe('MEA');
    expect(electricityAuthorityForProvince('samut-prakan')).toBe('MEA');
    expect(electricityAuthorityForProvince('pathum-thani')).toBe('PEA');
    expect(electricityAuthorityForProvince('other')).toBe('PEA');
  });
});
