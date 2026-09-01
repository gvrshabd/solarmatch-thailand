'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from '@/components/site/internal-link';
import type { Locale } from '@/config/i18n';
import { localizedPath } from '@/config/i18n';
import { track } from '@/lib/analytics/track';
import { loadingDurationMs, loadingFactHistoryKey, nextFactHistory, selectLoadingFact } from '@/lib/loading-facts/selection';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';

function readHistory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(loadingFactHistoryKey) ?? '[]') as unknown;
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch { return []; }
}

export function CalculationLoading({
  facts, locale, initialFact = null, initialDurationMs, initialStartedAt,
  onStarted, onComplete,
}: {
  facts: PublicLoadingFact[];
  locale: Locale;
  initialFact?: PublicLoadingFact | null;
  initialDurationMs?: number;
  initialStartedAt?: number;
  onStarted: (fact: PublicLoadingFact | null, durationMs: number, startedAt: number) => void;
  onComplete: (fact: PublicLoadingFact | null) => void;
}) {
  const english = locale === 'en';
  const [duration] = useState(() => initialDurationMs ?? loadingDurationMs());
  const [startedAt] = useState(() => initialStartedAt ?? Date.now());
  const [fact] = useState<PublicLoadingFact | null>(() => initialFact ?? selectLoadingFact(facts, readHistory()));
  const [progress, setProgress] = useState(0.015);
  const startedRef = useRef(false);

  useLayoutEffect(() => {
    document.body.classList.add('calculation-loading-active');
    return () => document.body.classList.remove('calculation-loading-active');
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastProgress = 0.015;
    const seedSource = `${fact?.id ?? 'generic'}:${startedAt}:${duration}`;
    let seed = 0;
    for (let index = 0; index < seedSource.length; index += 1) seed = Math.imul(seed ^ seedSource.charCodeAt(index), 16777619);
    const firstBreakpoint = 0.18 + (Math.abs(seed) % 7) / 100;
    const secondBreakpoint = 0.65 + (Math.abs(seed >>> 3) % 9) / 100;
    const firstFill = 0.24 + (Math.abs(seed >>> 5) % 8) / 100;
    const secondFill = 0.76 + (Math.abs(seed >>> 7) % 9) / 100;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const update = () => {
      const elapsedRatio = Math.max(0, Math.min(1, (Date.now() - startedAt) / duration));
      let next: number;
      if (elapsedRatio <= firstBreakpoint) {
        next = 0.015 + (firstFill - 0.015) * (elapsedRatio / firstBreakpoint);
      } else if (elapsedRatio <= secondBreakpoint) {
        next = firstFill + (secondFill - firstFill) * ((elapsedRatio - firstBreakpoint) / (secondBreakpoint - firstBreakpoint));
      } else {
        const tail = (elapsedRatio - secondBreakpoint) / (1 - secondBreakpoint);
        next = secondFill + (1 - secondFill) * (1 - Math.pow(1 - tail, 1.65));
      }
      if (elapsedRatio >= 1) next = 1;
      lastProgress = Math.max(lastProgress, next);
      setProgress(reducedMotion && elapsedRatio < 1 ? Math.floor(lastProgress * 4) / 4 : lastProgress);
      if (elapsedRatio < 1) frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, fact?.id, startedAt]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (fact) {
      try { sessionStorage.setItem(loadingFactHistoryKey, JSON.stringify(nextFactHistory(readHistory(), fact.id))); } catch { /* Optional non-PII history. */ }
      track('calculation_fact_shown', { factId: fact.id, language: locale, durationMs: duration });
    }
    track('calculation_loading_started', { language: locale, durationMs: duration });
    onStarted(fact, duration, startedAt);
  }, [duration, fact, locale, onStarted, startedAt]);

  useEffect(() => {
    const remaining = Math.max(0, startedAt + duration - Date.now());
    const timer = window.setTimeout(() => {
      track('calculation_loading_completed', { language: locale, durationMs: duration });
      onComplete(fact);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [duration, fact, locale, onComplete, startedAt]);

  return (
    <main className="calculation-loading-page">
      <section className="calculation-loading-content" role="status" aria-live="polite" aria-labelledby="preparing-title" aria-busy="true">
        <h1 id="preparing-title" className="calculation-loading-sr-title" tabIndex={-1}>
          {english ? 'Preparing your solar estimate' : 'กำลังเตรียมผลประเมินโซลาร์ของคุณ'}
        </h1>
        <span className="solar-loading-indicator solar-loading-progress" aria-hidden="true">
          <svg viewBox="0 0 52 52" focusable="false">
            <circle className="solar-loading-track" cx="26" cy="26" r="20" />
            <circle className="solar-loading-arc solar-loading-indicator-progress" cx="26" cy="26" r="20" pathLength="1" style={{ strokeDashoffset: 1 - progress }} />
            <circle className="solar-loading-core" cx="26" cy="26" r="5" />
          </svg>
        </span>
        {fact && <div className="calculation-fact">
          <Image src={fact.imageUrl} width={320} height={220} alt={fact.alt[locale]} priority />
          <p className="calculation-fact-label">{english ? 'DID YOU KNOW?' : 'รู้หรือไม่?'}</p>
          <h2>{fact.title[locale]}</h2>
          <p className="calculation-fact-copy">{fact.copy[locale]}</p>
          <p className="calculation-fact-source">
            {english ? 'Source:' : 'แหล่งข้อมูล:'} {fact.reference.citation} <span aria-hidden="true">—</span>{' '}
            <Link href={`${localizedPath('/resources', locale)}#${fact.resourcesAnchor}`}>
              {english ? 'View reference' : 'ดูเอกสารอ้างอิง'}
            </Link>
          </p>
        </div>}
        {!fact && <p className="calculation-generic-copy">{english ? 'Preparing your result…' : 'กำลังเตรียมผลประเมิน…'}</p>}
      </section>
    </main>
  );
}
