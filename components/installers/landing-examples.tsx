'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pause, Phone, Play } from 'lucide-react';
import { landingExamples, landingExampleTimeframes } from './landing-example-data';
import { signalLandingText } from './signal-landing-copy';

export function wrapFeedPosition(position: number, scrollSize: number): number {
  const half = scrollSize / 2;
  return half > 0 ? ((position % half) + half) % half : 0;
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
    let last = 0, holdUntil = 0, frameId = 0;
    let hover = false;
    const frame = (time: number) => {
      const dt = last ? Math.min(50, time - last) : 16;
      last = time;
      if (sideways !== mq.matches) {
        sideways = mq.matches;
        position = sideways ? v.scrollLeft : v.scrollTop;
      }
      if (!paused && !hover && time > holdUntil && !document.hidden) {
        position = wrapFeedPosition(position + dt * (sideways ? .032 : .026), sideways ? v.scrollWidth : v.scrollHeight);
        if (sideways) v.scrollLeft = position;
        else v.scrollTop = position;
      }
      frameId = requestAnimationFrame(frame);
    };
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
    const enter = () => { hover = window.matchMedia('(hover: hover)').matches; };
    const leave = () => { hover = false; };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    v.addEventListener('scroll', scroll, { passive: true });
    events.forEach(event => v.addEventListener(event, user, { passive: true }));
    v.addEventListener('mouseenter', enter);
    v.addEventListener('mouseleave', leave);
    frameId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(frameId);
      v.removeEventListener('scroll', scroll);
      events.forEach(event => v.removeEventListener(event, user));
      v.removeEventListener('mouseenter', enter);
      v.removeEventListener('mouseleave', leave);
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
