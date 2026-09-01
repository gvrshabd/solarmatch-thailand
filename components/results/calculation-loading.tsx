'use client';

import { useEffect, useRef, useState } from 'react';
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
      <section className="calculation-loading-content" aria-labelledby="preparing-title" aria-busy="true">
        <h1 id="preparing-title" className="calculation-loading-sr-title" tabIndex={-1}>
          {english ? 'Preparing your solar estimate' : 'กำลังเตรียมผลประเมินโซลาร์ของคุณ'}
        </h1>
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
        {!fact && <div className="calculation-generic" aria-hidden="true"><span /><span /><span /></div>}
        <p className="sr-only" aria-live="polite">{english ? 'Your result is being prepared.' : 'กำลังเตรียมผลประเมินของคุณ'}</p>
      </section>
    </main>
  );
}
