/** Pure arithmetic for the home page reveals; the components only schedule frames and apply these values. */
export const COUNT_MS = 1400;
export const DRAW_MS = 1600;
/** A reveal plays once this fraction of the element is on screen. */
export const REVEAL_RATIO = .35;
/** An element that starts below this fraction of the viewport height waits in its before-state. */
export const ARM_FRACTION = .9;

export const easeOutCubic = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

/** Value of a count-up at progress k (0–1): exactly `from` at 0 and exactly `to` at 1. */
export function countUpValue(from: number, to: number, k: number): number {
  if (k <= 0) return from;
  if (k >= 1) return to;
  return from + (to - from) * easeOutCubic(k);
}

/** Width of the chart's clip rectangle at progress k: 0 at the start, exactly `full` at the end. */
export function drawWidth(full: number, k: number): number {
  if (k <= 0) return 0;
  if (k >= 1) return full;
  return full * easeOutCubic(k);
}

/** True when an element starts so far below the fold that it should wait in its before-state. */
export const startsBelowFold = (top: number, viewportHeight: number) => top > viewportHeight * ARM_FRACTION;
