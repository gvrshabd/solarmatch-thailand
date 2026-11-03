import { describe, expect, it } from 'vitest';
import { feedAdvance, wrapFeedPosition } from '@/components/installers/landing-examples';
import { sunPathLitSteps, sunPathProgress } from '@/components/installers/landing-sun-path';

describe('Pulse animation boundaries', () => {
  it('keeps the specified speed when Safari delivers frames more than 50ms apart', () => {
    expect(feedAdvance(1000, false)).toBe(26);
    expect(feedAdvance(1000, true)).toBe(32);
    expect(feedAdvance(500, false) * 2).toBe(feedAdvance(1000, false));
    expect(feedAdvance(0, true)).toBe(0);
    expect(feedAdvance(-100, true)).toBe(0);
  });
  it('loops at the exact repeated-list boundary without discarding overshoot', () => {
    expect(wrapFeedPosition(499.5, 1000)).toBe(499.5);
    expect(wrapFeedPosition(500, 1000)).toBe(0);
    expect(wrapFeedPosition(501.25, 1000)).toBe(1.25);
    expect(wrapFeedPosition(1501.25, 1000)).toBe(1.25);
    expect(wrapFeedPosition(100, 0)).toBe(0);
    expect(wrapFeedPosition(-1, 1000)).toBe(499);
  });
  it('clamps scroll progress and completes immediately with reduced motion', () => {
    expect(sunPathProgress(1000, 1000)).toBe(0);
    expect(sunPathProgress(850, 1000)).toBe(0);
    expect(sunPathProgress(575, 1000)).toBe(.5);
    expect(sunPathProgress(300, 1000)).toBe(1);
    expect(sunPathProgress(-1000, 1000)).toBe(1);
    expect(sunPathProgress(1000, 1000, true)).toBe(1);
    expect(sunPathProgress(0, 0)).toBe(0);
  });
  it('lights each circle at the specified thresholds', () => {
    expect(sunPathLitSteps(.019)).toEqual([false, false, false]);
    expect(sunPathLitSteps(.02)).toEqual([true, false, false]);
    expect(sunPathLitSteps(.499)).toEqual([true, false, false]);
    expect(sunPathLitSteps(.5)).toEqual([true, true, false]);
    expect(sunPathLitSteps(.979)).toEqual([true, true, false]);
    expect(sunPathLitSteps(.98)).toEqual([true, true, true]);
  });
});
