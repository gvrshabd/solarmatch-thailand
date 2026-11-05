'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pause, Phone, Play } from 'lucide-react';
import { landingExamples, landingExampleTimeframes } from './landing-example-data';
import { signalLandingText } from './signal-landing-copy';
import { createVisibleFrameLoop } from '@/lib/home/visible-frame-loop';

export function wrapFeedPosition(position: number, scrollSize: number): number {
  const half = scrollSize / 2;
  return half > 0 ? ((position % half) + half) % half : 0;
}

export function feedAdvance(elapsedMs: number, sideways: boolean): number {
  return Math.max(0, elapsedMs) * (sideways ? .032 : .026);
}

function subscribeMotion(change: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}
const motionSnapshot = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const serverMotionSnapshot = () => false;

export function LandingExamples({ en }: { en: boolean }) {
  const t = signalLandingText(en);
  const viewport = useRef<HTMLDivElement>(null);
  const reduced = useSyncExternalStore(subscribeMotion, motionSnapshot, serverMotionSnapshot);
  const [manualPaused, setManualPaused] = useState<boolean | null>(null);
  const paused = manualPaused ?? reduced;

  useEffect(() => {
    const v = viewport.current;
    if (!v) return;
    const mq = window.matchMedia('(max-width:959px)');
    let sideways = mq.matches;
    let position = sideways ? v.scrollLeft : v.scrollTop;
    let holdUntil = 0;
    let visible = true;
    let hover = false;
    const loop = createVisibleFrameLoop((time, elapsed) => {
      // Use elapsed visible time. A 50ms cap makes a delayed Safari frame slow
      // the feed itself, on top of the rendering delay (e.g. 26px/s becomes 2px/s).
      const dt = Math.max(0, Math.min(elapsed, time - holdUntil));
      if (sideways !== mq.matches) {
        sideways = mq.matches;
        position = sideways ? v.scrollLeft : v.scrollTop;
      }
      if (!paused && !hover && time > holdUntil && !document.hidden) {
        position = wrapFeedPosition(position + feedAdvance(dt, sideways), sideways ? v.scrollWidth : v.scrollHeight);
        if (sideways) v.scrollLeft = position;
        else v.scrollTop = position;
      }
    }, callback => requestAnimationFrame(callback), id => cancelAnimationFrame(id));
    const sync = () => loop.setActive(!paused && !hover && visible && !document.hidden);
    const user = () => { holdUntil = performance.now() + 3500; };
    const scroll = () => {
      // Safari may deliver a programmatic scroll asynchronously and round it to
      // whole pixels. Only user-initiated scrolling may reset our subpixel position.
      // Otherwise each delayed event can erase the fractional advance and stall.
      if (performance.now() > holdUntil) return;
      const current = mq.matches ? v.scrollLeft : v.scrollTop;
      position = wrapFeedPosition(current, mq.matches ? v.scrollWidth : v.scrollHeight);
      if (current !== position) {
        if (mq.matches) v.scrollLeft = position;
        else v.scrollTop = position;
      }
      holdUntil = performance.now() + 3500;
    };
    // Touch browsers synthesize mouseenter on tap and may never send mouseleave.
    // Their temporary hold is handled by user(), not a permanent hover pause.
    const enter = () => { hover = window.matchMedia('(hover: hover)').matches; sync(); };
    const leave = () => { hover = false; sync(); };
    // rAF may be suspended in a background tab. Never catch up that hidden time.
    const visibility = sync;
    // Stop the loop entirely below the fold; preserve position and speed on return.
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      sync();
    });
    observer?.observe(v);
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    v.addEventListener('scroll', scroll, { passive: true });
    events.forEach(event => v.addEventListener(event, user, { passive: true }));
    v.addEventListener('mouseenter', enter);
    v.addEventListener('mouseleave', leave);
    document.addEventListener('visibilitychange', visibility);
    sync();
    return () => {
      loop.dispose();
      observer?.disconnect();
      v.removeEventListener('scroll', scroll);
      events.forEach(event => v.removeEventListener(event, user));
      v.removeEventListener('mouseenter', enter);
      v.removeEventListener('mouseleave', leave);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [paused]);

  const locale = en ? 0 : 1;
  return <div className="feed" role="region" aria-label={t.examplesLabel}>
    <div className="feed-h"><span className="live" aria-hidden="true"/><b>{t.examples}</b>
      <button type="button" className="btn ghostd sm fp" aria-pressed={paused} aria-label={paused ? t.play : t.pause} onClick={() => setManualPaused(!paused)}>{paused ? <Play className="i" aria-hidden="true"/> : <Pause className="i" aria-hidden="true"/>}</button>
    </div>
    <div className="feed-v" ref={viewport} tabIndex={0} role="group" aria-label={t.examplesLabel}><div className="feed-l">
      {[false, true].flatMap(duplicate => landingExamples.map(example => <article className="pc" key={`${duplicate}-${example.n[0]}`} aria-hidden={duplicate || undefined}>
        <span className="av" aria-hidden="true">{Array.from(example.n[locale])[0]}</span><b>{example.n[locale]}</b><time>{example.t[locale]}</time>
        <small>{example.a[locale]}</small><span className="call" aria-hidden="true"><Phone className="i"/></span>
        <span className="tags"><span>฿{example.bill.toLocaleString('en-US')}</span><span>{t.acs.replace('{n}', String(example.ac))}</span><span>{landingExampleTimeframes[example.w][locale]}</span></span>
      </article>))}
    </div></div>
  </div>;
}
