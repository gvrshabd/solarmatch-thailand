import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { calculateEstimate } from '@/lib/calculator';
import { attributionFixture } from '../../scripts/calculator-benefit-attribution-v3';
import { hasResultRefinements, resultsPresentation } from '@/components/results/results-presentation';
import { OptionalScenarios } from '@/components/results/optional-scenarios';

const result = calculateEstimate({ ...attributionFixture, estimateModelVersion: 'energy-v3' });

describe('homeowner v3 result presentation boundaries', () => {
  it('uses the model reference bill and reveals the actual high self-use ratio', () => {
    const view = resultsPresentation(result);
    expect(view.beforeBill).toBe(result.baselineFutureMonthlyBillThb);
    expect(view.selfUsePercent).toBeCloseTo(97.6711, 4);
    expect(view.hasPayback).toBe(true);
  });

  it.each(['unsupported', 'no-economic-option', 'no-feasible-option'] as const)('suppresses saving and payback claims for %s', modelStatus => {
    const view = resultsPresentation({ ...result, modelStatus });
    expect(view.available).toBe(false);
    expect(view.hasPayback).toBe(false);
  });

  it('preserves increased bills, zero savings and unavailable payback', () => {
    expect(resultsPresentation({ ...result, planningMonthlySavingsThb: -100 }).savingDirection).toBe('more');
    const empty = resultsPresentation({ ...result, planningMonthlySavingsThb: 0, planningPaybackYears: null, planningAnnualProductionKwh: 0 });
    expect(empty.savingDirection).toBe('unchanged');
    expect(empty.hasPayback).toBe(false);
    expect(empty.selfUsePercent).toBeNull();
  });

  it('keeps common-path roof and phase answers closed, opening supplied optional refinements', () => {
    const { exactRoofAreaSqm: _area, panelTiltDegrees: _tilt, panelAzimuthDegrees: _azimuth, ...common } = attributionFixture;
    void _area; void _tilt; void _azimuth;
    expect(hasResultRefinements(common)).toBe(false);
    expect(hasResultRefinements({ ...common, panelTiltDegrees: 0 })).toBe(true);
    expect(hasResultRefinements({ ...common, quoteCashPriceThb: 169999.99 })).toBe(true);
  });

  it.each(['en', 'th'] as const)('%s extras retain substantive controls with closed disclosures', locale => {
    const markup = renderToStaticMarkup(createElement(OptionalScenarios, {
      locale, installationPriceThb: result.planningInstalledCostThb,
      annualBillSavingsThb: result.planningAnnualSavingsThb,
      annualReserveThb: result.planningAnnualMaintenanceReserveThb,
      lifetimeBenefitThb: result.planningTwentyFiveYearNetBenefitThb,
      systemDcKwp: 5.005, inverterAcKw: 5,
    }));
    expect(markup.match(/<details/g)).toHaveLength(3);
    expect(markup).not.toMatch(/<details[^>]*\sopen/);
    expect(markup).toContain('type="date"');
    expect(markup).toContain('step="any"');
    expect(markup).toContain('dg470A.pdf');
    expect(markup).toContain(locale === 'en' ? 'ordinary progressive income tax' : 'ภาษีเงินได้อัตราก้าวหน้าปกติ');
    expect(markup).toContain(locale === 'en' ? 'Flat (original principal)' : 'คงที่ (คิดจากเงินต้นเริ่มต้น)');
    expect(markup).toContain(locale === 'en' ? 'Contract AC export limit (kW)' : 'เพดานกำลังไฟส่งออก AC ตามสัญญา');
  });
});
