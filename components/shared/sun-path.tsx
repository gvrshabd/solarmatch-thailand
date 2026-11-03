'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Scroll progress of the sun along the path: 0 until the box rises into view, 1 once it has passed. */
export function sunPathProgress(top: number, viewportHeight: number, reduced = false): number {
  if (reduced) return 1;
  if (viewportHeight <= 0) return 0;
  return Math.max(0, Math.min(1, (.85 * viewportHeight - top) / (.55 * viewportHeight)));
}
export function sunPathLitSteps(progress: number): boolean[] {
  return [.02, .5, .98].map(threshold => progress >= threshold);
}

/**
 * The "How it works" sun path, shared by the installer landing and the homeowner home page.
 * `note` is an optional element rendered under step 2 (only the installer page uses it).
 */
export function SunPath({ titles, note }: { titles: readonly [string, string, string]; note?: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const sunRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const box = boxRef.current, arc = arcRef.current, done = progressRef.current, sun = sunRef.current, list = listRef.current;
    if (!box || !arc || !done || !sun || !list) return;
    const wide = window.matchMedia('(min-width:860px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const length = arc.getTotalLength();
    let frameId = 0;
    const update = () => {
      frameId = 0;
      const progress = sunPathProgress(box.getBoundingClientRect().top, window.innerHeight, reduced.matches);
      sun.style.left = wide.matches ? '0px' : '8px';
      sun.style.top = '0px';
      if (wide.matches) {
        const point = arc.getPointAtLength(progress * length);
        sun.style.transform = `translate(${point.x * box.clientWidth / 1000}px,${point.y}px)`;
      } else sun.style.transform = `translate(0,${10 + progress * (list.offsetHeight - 20)}px)`;
      done.style.strokeDashoffset = String(1 - progress);
      const lit = sunPathLitSteps(progress);
      Array.from(list.children).forEach((step, index) => step.classList.toggle('lit', lit[index]));
    };
    const schedule = () => { if (!frameId) frameId = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    reduced.addEventListener('change', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(list);
    update();
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      reduced.removeEventListener('change', schedule);
      observer.disconnect();
    };
  }, []);

  return <div className="path" ref={boxRef}>
    <svg viewBox="0 0 1000 240" preserveAspectRatio="none" aria-hidden="true">
      <path ref={arcRef} d="M120,218 Q500,-26 880,218" fill="none" stroke="#CDD3C6" strokeWidth="2" strokeDasharray="6 9" vectorEffect="non-scaling-stroke"/>
      <path ref={progressRef} d="M120,218 Q500,-26 880,218" pathLength="1" fill="none" stroke="#E2A62B" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 1" strokeDashoffset="1"/>
    </svg>
    <span className="sun" ref={sunRef} aria-hidden="true"/>
    <ol ref={listRef}>
      <li><span className="n" aria-hidden="true">1</span><h3>{titles[0]}</h3></li>
      <li><span className="n" aria-hidden="true">2</span><h3>{titles[1]}</h3>{note}</li>
      <li className="earn"><span className="n" aria-hidden="true">3</span><h3>{titles[2]}</h3></li>
    </ol>
  </div>;
}
