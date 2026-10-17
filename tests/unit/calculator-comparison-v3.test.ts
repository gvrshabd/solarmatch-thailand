import { describe, expect, it } from 'vitest';
import { calculateEstimate } from '@/lib/calculator';
import type { EstimateAnswers, EstimateResult } from '@/lib/calculator/types';

// Synthetic public fixtures only. The legacy model is explicitly frozen to v5;
// changing assumptions, catalogues and tariffs means differences are not an
// empirical accuracy score or a controlled attribution to hourly matching alone.
const base: EstimateAnswers = {
  province: 'bangkok', district: 'sathon', monthlyBillThb: 6000,
  calculationReferenceDate: '2026-10-17', billDate: '2026-10-01', tariffCategory: 'ordinary-1.2', utility: 'MEA',
  activelyPlanningSolar: true, planningTimeframe: 'within-3-months', projectType: 'new-rooftop',
  propertyType: 'detached-home', ownershipStatus: 'owner', roofArea: '100-200', exactRoofAreaSqm: 100,
  electricityPhase: 'single', daytimePattern: 'high', weekendDaytimePattern: 'high',
  daytimeLoads: ['air-conditioning'], airConditionerCount: 4, roofMaterial: 'concrete-tile', shade: 'almost-none',
  panelTiltDegrees: 15, panelAzimuthDegrees: 180, quoteContactRequested: false,
};

const cases: Array<{ name: string; changes: Partial<EstimateAnswers> }> = [
  { name: 'Typical daytime home: THB6000', changes: {} },
  { name: 'Small bill: THB2000', changes: { monthlyBillThb: 2000 } },
  { name: 'Evening home: THB6000', changes: { daytimePattern: 'very-low', weekendDaytimePattern: 'very-low' } },
  { name: 'Tiny roof: 1 square metre', changes: { exactRoofAreaSqm: 1 } },
  { name: 'Exact solar quotation: 5kWp', changes: { quoteSystemKw: 5, quoteCashPriceThb: 169999.99, quoteModuleCount: 10, quoteModuleWp: 500, quoteInverterAcKw: 5, quoteBatteryIncluded: false } },
  { name: 'Future EV: July2027, half home/day', changes: { plannedLoadChanges: [{ kind: 'ev', startDate: '2027-07-01', monthlyKwh: 300, homeChargingFraction: 0.5, daytimeFraction: 0.5 }] } },
];

function figures(result: EstimateResult) {
  return {
    dcKwp: result.planningSystemKw,
    priceThb: result.planningInstalledCostThb,
    annualGenerationKwh: result.planningAnnualProductionKwh,
    annualSelfUseKwh: result.planningAnnualSelfConsumedKwh,
    annualSavingsThb: result.planningAnnualSavingsThb,
    paybackYears: result.planningPaybackYears,
    net25YearsThb: result.planningTwentyFiveYearNetBenefitThb,
  };
}

describe('reproducible legacy-versus-v3 representative report', () => {
  it('prints six comparable synthetic scenarios with physical and financial checks', () => {
    const rows = cases.map(({ name, changes }) => {
      const answers = { ...base, ...changes };
      const legacy = calculateEstimate({ ...answers, estimateModelVersion: 'legacy-v5' });
      const modern = calculateEstimate({ ...answers, estimateModelVersion: 'energy-v3' });
      const before = figures(legacy), after = figures(modern);
      for (const value of [...Object.values(before), ...Object.values(after)]) if (value !== null) expect(Number.isFinite(value)).toBe(true);
      expect(modern.modelVersion).toBe('residential-hourly-2026-10-17-v3');
      expect(modern.calculationReferenceDate).toBe('2026-10-17');
      expect(after.annualSelfUseKwh).toBeLessThanOrEqual(after.annualGenerationKwh + 1e-8);
      expect(modern.energy!.demandKwh).toBeCloseTo(modern.energy!.selfConsumedKwh + modern.energy!.gridImportKwh, 7);
      expect(modern.energy!.generationKwh).toBeCloseTo(modern.energy!.selfConsumedKwh + modern.energy!.surplusKwh, 7);
      if (changes.exactRoofAreaSqm === 1) {
        expect(modern.modelStatus).toBe('no-feasible-option');
        expect(after.dcKwp).toBe(0); expect(after.priceThb).toBe(0); expect(after.paybackYears).toBeNull();
      }
      if (changes.quoteCashPriceThb !== undefined) expect(after.priceThb).toBe(changes.quoteCashPriceThb);
      if (changes.plannedLoadChanges) expect(modern.energy!.futureDemandKwh).toBeCloseTo(900, 8);
      return { scenario: name, before, after, modernStatus: modern.modelStatus, modernYear1FutureDemandKwh: modern.energy!.futureDemandKwh };
    });
    expect(rows).toHaveLength(6);
    console.log('COMPARISON_REFERENCE_DATE=2026-10-17; legacy-v5 vs residential-hourly-2026-10-17-v3; JRC ERA5 monthly reference / synthetic hourly fixtures; no measured-accuracy claim');
    console.log(`COMPARISON_EXACT_JSON=${JSON.stringify(rows)}`);
    // Modern fixtures use the stored JRC E_y=1398.23 and reconciled E_m shares.
    // Frozen legacy columns intentionally retain the earlier engine/calibration.
    const expected = [
      [4.5, 165000, 19975, 263000, 5.005, 170130, 33061.96947034694, 574776.4225575246],
      [1.5, 130000, 6562, -9000, 3.3, 112350, 14377.861740221433, 215249.85697281035],
      [2.5, 130000, 7927, 24000, 3.3, 112350, 10151.18497153595, 110083.97582143827],
      [1, 130000, 4439, -59000, 0, 0, 0, 0],
      [5, 170000, 22045, 306000, 5, 169999.99, 33037.97179984348, 574285.6362197843],
      [4.5, 165000, 19975, 263000, 5.005, 170130, 33130.36886404549, 579672.1652461643],
    ];
    rows.forEach((row, index) => {
      const actual = [row.before.dcKwp, row.before.priceThb, row.before.annualSavingsThb, row.before.net25YearsThb,
        row.after.dcKwp, row.after.priceThb, row.after.annualSavingsThb, row.after.net25YearsThb];
      actual.forEach((value, field) => expect(value).toBeCloseTo(expected[index][field], 6));
    });
    console.table(rows.map(row => ({ scenario: row.scenario, oldDC: row.before.dcKwp, newDC: row.after.dcKwp,
      oldCostTHB: row.before.priceThb, newCostTHB: row.after.priceThb,
      oldSavingsTHBYear: row.before.annualSavingsThb, newSavingsTHBYear: row.after.annualSavingsThb,
      oldNet25THB: row.before.net25YearsThb, newNet25THB: row.after.net25YearsThb, status: row.modernStatus })));
  }, 15000); // Six full 25-year scenarios plus report output can exceed 5s under concurrent checks.
});
