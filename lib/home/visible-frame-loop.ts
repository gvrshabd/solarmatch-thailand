/** Keeps an animation idle until it is visible and enabled. Resuming starts with zero elapsed time. */
export function createVisibleFrameLoop(
  tick: (time: number, elapsed: number) => void,
  request: (callback: FrameRequestCallback) => number,
  cancel: (id: number) => void,
) {
  let frame = 0, active = false, last: number | null = null;
  const run = (time: number) => {
    frame = 0;
    if (!active) return;
    const elapsed = last === null ? 0 : Math.max(0, time - last);
    last = time;
    tick(time, elapsed);
    if (active) frame = request(run);
  };
  return {
    setActive(next: boolean) {
      if (next === active) return;
      active = next;
      last = null;
      if (active) frame = request(run);
      else { cancel(frame); frame = 0; }
    },
    dispose() { active = false; cancel(frame); frame = 0; last = null; },
  };
}
