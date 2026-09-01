'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '@/config/i18n';
import { track } from '@/lib/analytics/track';
import { loadingDurationMs, loadingFactHistoryKey, nextFactHistory, selectLoadingFact } from '@/lib/loading-facts/selection';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';
import { SolarFactCard } from './solar-fact-card';

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
  const startedRef = useRef(false);

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
      <section className="site-shell calculation-loading-card" aria-labelledby="preparing-title" aria-busy="true">
        <div className="calculation-pulse" aria-hidden="true"><span /></div>
        <p className="eyebrow">SolarMatch Thailand</p>
        <h1 id="preparing-title" tabIndex={-1}>{english ? 'Preparing your solar estimate' : 'กำลังเตรียมผลประเมินโซลาร์ของคุณ'}</h1>
        <p aria-live="polite">{english ? 'While we prepare your result, here’s a quick solar fact.' : 'ระหว่างเตรียมผลประเมิน ลองดูเกร็ดน่ารู้เกี่ยวกับพลังงานแสงอาทิตย์'}</p>
        {fact && <SolarFactCard fact={fact} locale={locale} />}
        {!fact && <div className="calculation-generic" aria-hidden="true"><span /><span /><span /></div>}
      </section>
    </main>
  );
}
