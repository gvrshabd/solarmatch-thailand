import { describe, expect, it } from 'vitest';
import { activeResidentialTariff, calculateResidentialBill, estimateKwhFromBill } from '@/config/electricity-tariffs';

describe('Thai residential tariff model', () => {
  it('applies progressive tiers, Ft, service charge and VAT', () => {
    const expectedBeforeVat = 24.62 + (150 * 3.2484) + (50 * 4.2218) + (200 * 0.1623);
    expect(calculateResidentialBill(200)).toBeCloseTo(expectedBeforeVat * 1.07, 6);
  });

  it('inverts the modeled bill back to monthly consumption', () => {
    const bill = calculateResidentialBill(725, activeResidentialTariff);
    expect(estimateKwhFromBill(bill)).toBeCloseTo(725, 4);
  });

  it('never creates a negative bill for zero use', () => {
    expect(calculateResidentialBill(0)).toBeCloseTo(activeResidentialTariff.serviceChargeThb * 1.07, 6);
  });
});
