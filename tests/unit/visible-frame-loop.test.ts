import { describe, expect, it } from 'vitest';
import { createVisibleFrameLoop } from '@/lib/home/visible-frame-loop';

describe('visible animation scheduling', () => {
  it('queues no frames while idle and resumes without catching up offscreen time', () => {
    let next = 0;
    const pending = new Map<number, FrameRequestCallback>();
    const ticks: number[] = [];
    const loop = createVisibleFrameLoop((_, elapsed) => ticks.push(elapsed), callback => {
      pending.set(++next, callback); return next;
    }, id => { pending.delete(id); });
    const advance = (time: number) => {
      const [id, callback] = [...pending][0]; pending.delete(id); callback(time);
    };
    expect(pending.size).toBe(0);
    loop.setActive(true); loop.setActive(true);
    expect(pending.size).toBe(1);
    advance(100); advance(116);
    expect(ticks).toEqual([0, 16]);
    loop.setActive(false);
    expect(pending.size).toBe(0);
    loop.setActive(true); advance(10000); advance(10016);
    expect(ticks).toEqual([0, 16, 0, 16]);
    const lateCallback = [...pending.values()][0];
    loop.dispose(); expect(pending.size).toBe(0);
    lateCallback(20000);
    expect(ticks).toEqual([0, 16, 0, 16]);
    expect(pending.size).toBe(0);
  });
});
