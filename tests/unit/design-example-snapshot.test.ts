import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateEstimate } from '@/lib/calculator';
import { designV2Example } from '@/config/design-v2-example';
import snapshot from '@/config/design-example-snapshot.json';
import { designExampleResult } from '@/config/design-example-result';

/**
 * Reproducible stdout generator / staleness gate (no new runtime dependency).
 * PowerShell: $env:PRINT_DESIGN_EXAMPLE_SNAPSHOT='1'; pnpm exec vitest run tests/unit/design-example-snapshot.test.ts --reporter=verbose --silent=false
 * Copy the JSON between SNAPSHOT_JSON_BEGIN/END verbatim into
 * config/design-example-snapshot.json, then unset the variable and rerun.
 * Review changed fixture/model provenance and the full-precision values before
 * accepting a refresh. This is ONLY the synthetic designV2Example, never users.
 */
const cpuStarted = process.cpuUsage(), started = performance.now();
const current = calculateEstimate(designV2Example);
const timing = { wallMs: performance.now() - started, cpuMicroseconds: process.cpuUsage(cpuStarted) };
const generated = {
  schemaVersion: 1,
  provenance: {
    syntheticOnly: true,
    fixtureSource: 'config/design-v2-example.ts#designV2Example',
    calculatorSource: 'lib/calculator/index.ts#calculateEstimate',
    modelVersion: current.modelVersion,
    assumptionVersion: current.assumptionVersion,
    tariffVersion: current.tariffVersion,
    calculationReferenceDate: current.calculationReferenceDate,
    fixture: designV2Example,
  },
  result: {
    currentMonthlyBillThb: current.currentMonthlyBillThb,
    planningAfterSolarMonthlyBillThb: current.planningAfterSolarMonthlyBillThb,
    planningMonthlySavingsThb: current.planningMonthlySavingsThb,
    planningSystemKw: current.planningSystemKw,
    planningInstalledCostThb: current.planningInstalledCostThb,
    planningPaybackYears: current.planningPaybackYears,
    planningTwentyFiveYearNetBenefitThb: current.planningTwentyFiveYearNetBenefitThb,
    lifetimeCostSeries: current.lifetimeCostSeries,
  },
};

describe('immutable synthetic design example snapshot', () => {
  it('matches the current calculator and exact fixture without rounding', () => {
    if (process.env.PRINT_DESIGN_EXAMPLE_SNAPSHOT === '1') {
      console.log(`SNAPSHOT_JSON_BEGIN\n${JSON.stringify(generated, null, 2)}\nSNAPSHOT_JSON_END`);
      console.log('SYNTHETIC_CALCULATOR_LOCAL_TIMING', JSON.stringify(timing));
      return;
    }
    expect(snapshot).toEqual(generated);
  });

  it('exposes only the consumed fields and freezes the shared plot deeply', () => {
    expect(Object.keys(designExampleResult).sort()).toEqual(Object.keys(generated.result).sort());
    expect(Object.isFrozen(designExampleResult)).toBe(true);
    expect(Object.isFrozen(designExampleResult.lifetimeCostSeries)).toBe(true);
    for (const point of designExampleResult.lifetimeCostSeries) expect(Object.isFrozen(point)).toBe(true);
    expect(Reflect.set(designExampleResult, 'planningSystemKw', 999)).toBe(false);
    expect(Reflect.set(designExampleResult.lifetimeCostSeries[0], 'year', 999)).toBe(false);
  });

  it('renders both locales and both examples with the calculator unavailable', async () => {
    vi.doMock('@/lib/calculator', () => ({ calculateEstimate: () => { throw new Error('Request-time synthetic calculation is forbidden'); } }));
    try {
      const home = await import('@/components/home/example-result');
      const prior = await import('@/components/design-v2/example-result');
      for (const locale of ['en', 'th'] as const) {
        for (const element of [createElement(home.ExampleResult, { locale }), createElement(prior.ExampleResult, { locale }), createElement(prior.ExampleResult, { locale, mini: true })]) {
          const html = renderToStaticMarkup(element);
          expect(html).toContain('5.005');
          expect(html).toContain('5.4');
          expect(html).toContain('2,755');
        }
      }
    } finally { vi.doUnmock('@/lib/calculator'); }
  });
});
