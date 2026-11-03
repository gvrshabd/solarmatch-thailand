import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { designExampleResult } from '@/config/design-example-result';
import { designText } from '@/config/design-v2-copy';
import { homeFaq, homeownerText } from '@/config/homeowner-v3-copy';
import { HomeLifetimeChart } from '@/components/home/home-lifetime-chart';
import { SunPath, sunPathLitSteps, sunPathProgress } from '@/components/shared/sun-path';
import { LandingSunPath, sunPathLitSteps as installerLit, sunPathProgress as installerProgress } from '@/components/installers/landing-sun-path';
import { ARM_FRACTION, COUNT_MS, DRAW_MS, REVEAL_RATIO, countUpValue, drawWidth, easeOutCubic, startsBelowFold } from '@/lib/home/motion';

describe('home page count-up and chart-draw arithmetic', () => {
  it('starts exactly at from and ends exactly at to', () => {
    expect(countUpValue(6000, 3244.84, 0)).toBe(6000);
    expect(countUpValue(6000, 3244.84, 1)).toBe(3244.84);
    expect(countUpValue(6000, 3244.84, 1.5)).toBe(3244.84);
    expect(countUpValue(0, 170130, 0)).toBe(0);
    expect(countUpValue(0, 170130, 1)).toBe(170130);
    expect(countUpValue(0, 100, -1)).toBe(0);
  });
  it('eases out and stays between its endpoints', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(.5)).toBeCloseTo(.875, 10);
    const mid = countUpValue(6000, 3245, .5);
    expect(mid).toBeLessThan(6000);
    expect(mid).toBeGreaterThan(3245);
    expect(countUpValue(6000, 3245, .25)).toBeGreaterThan(countUpValue(6000, 3245, .75));
  });
  it('grows the chart clip from zero to exactly the full width', () => {
    expect(drawWidth(528, 0)).toBe(0);
    expect(drawWidth(528, 1)).toBe(528);
    expect(drawWidth(528, .5)).toBeGreaterThan(0);
    expect(drawWidth(528, .5)).toBeLessThan(528);
  });
  it('keeps the specified durations and thresholds', () => {
    expect(COUNT_MS).toBe(1400);
    expect(DRAW_MS).toBe(1600);
    expect(REVEAL_RATIO).toBe(.35);
    expect(ARM_FRACTION).toBe(.9);
    expect(startsBelowFold(900, 1000)).toBe(false);
    expect(startsBelowFold(901, 1000)).toBe(true);
    expect(startsBelowFold(120, 1000)).toBe(false);
  });
});

describe('shared SunPath', () => {
  it('is the same module the installer landing uses', () => {
    expect(installerProgress).toBe(sunPathProgress);
    expect(installerLit).toBe(sunPathLitSteps);
    expect(sunPathProgress(575, 1000)).toBe(.5);
    expect(sunPathLitSteps(.5)).toEqual([true, true, false]);
  });
  it('renders the homeowner titles with no note under step 2', () => {
    for (const locale of ['en', 'th'] as const) {
      const titles = homeownerText(locale).steps;
      const html = renderToStaticMarkup(createElement(SunPath, { titles: [titles[0], titles[1], titles[2]] }));
      expect((html.match(/<h3>/g) ?? []).length).toBe(3);
      for (const title of titles) expect(html).toContain(title);
      expect(html).not.toContain('st-ic');
      expect(html).toContain('<li class="earn">');
      expect(html).toContain('d="M120,218 Q500,-26 880,218"');
    }
    expect(homeownerText('en').steps).toEqual(['Answer a few questions', 'See your savings', 'Get real quotes from real installers.']);
  });
  it('keeps the installer landing output: titles plus the LINE / email note under step 2', () => {
    const html = renderToStaticMarkup(createElement(LandingSunPath, { en: true }));
    expect((html.match(/<h3>/g) ?? []).length).toBe(3);
    expect(html).toContain('class="st-ic"');
    expect(html).toContain('chip-line');
    expect(html).toContain('chip-mail');
    expect(html.indexOf('st-ic')).toBeGreaterThan(html.indexOf('</h3>'));
  });
});

describe('home lifetime chart', () => {
  const series = designExampleResult.lifetimeCostSeries;
  const render = (data = series, net = designExampleResult.planningTwentyFiveYearNetBenefitThb, locale: 'en' | 'th' = 'en') =>
    renderToStaticMarkup(createElement(HomeLifetimeChart, { data: [...data], net, locale }));

  it('draws exactly one svg role=img with the accessible label', () => {
    const html = render();
    expect((html.match(/<svg[^>]*role="img"/g) ?? []).length).toBe(1);
    expect(html).toContain(`aria-label="${designText('en').cTitle}.`);
    expect(html).toContain('฿575k saved');
    expect(html).toContain(designText('en').cWithout);
    expect(html).toContain(designText('en').cWith);
  });
  it('shows the crossing only when the lines cross', () => {
    const crossing = render();
    expect(crossing).toContain('data-testid="lifetime-crossing"');
    expect(crossing).toContain(designText('en').cCross.replace('{y}', '5'));
    const neverCross = series.map(point => ({ ...point, withSolarThb: point.withoutSolarThb + 1000 }));
    expect(render(neverCross, -25000)).not.toContain('data-testid="lifetime-crossing"');
  });
  it('labels a negative net with the costs-more wording and the danger colour', () => {
    const neverCross = series.map(point => ({ ...point, withSolarThb: point.withoutSolarThb + 1000 }));
    const html = render(neverCross, -25000);
    expect(html).toContain(designText('en').cGapNeg.replace('{a}', '฿25k'));
    expect(html).toContain('var(--sm-danger)');
    expect(html).not.toContain('saved');
    expect(render(series, designExampleResult.planningTwentyFiveYearNetBenefitThb, 'th')).toContain(designText('th').cGap.replace('{a}', '฿575k'));
  });
  it('keeps the lines inside a clip rectangle that starts at full width in the server HTML', () => {
    const html = render();
    expect(html).toMatch(/<clipPath id="home-reveal-[^"]+"><rect[^>]*width="528"/);
  });
});

describe('home copy', () => {
  it('serves five FAQ pairs, keeps the questions and leaves answer 5 word for word', () => {
    for (const locale of ['en', 'th'] as const) {
      const faq = homeFaq(locale), existing = designText(locale).faq;
      expect(faq).toHaveLength(5);
      expect(faq.map(pair => pair[0])).toEqual(existing.map(pair => pair[0]));
      expect(faq[4][1]).toBe(existing[4][1]);
      for (const i of [0, 1, 2, 3]) expect(faq[i][1]).not.toBe(existing[i][1]);
    }
  });
  it('lists three included rows and two separate scenarios with accessible labels', () => {
    for (const locale of ['en', 'th'] as const) {
      const rows = homeownerText(locale).rows;
      expect(rows.map(row => row.mark)).toEqual(['yes', 'yes', 'yes', 'no', 'no']);
      for (const row of rows) expect(row.aria.length).toBeGreaterThan(0);
    }
    expect(homeownerText('en').rows[0].aria).toBe('Modelled');
    expect(homeownerText('en').rows[3].aria).toBe('Separate conditional scenario');
  });
});
