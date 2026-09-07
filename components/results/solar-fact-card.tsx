'use client';

import Image from 'next/image';
import Link from '@/components/site/internal-link';
import { localizedPath, type Locale } from '@/config/i18n';
import type { PublicLoadingFact } from '@/lib/loading-facts/types';

export function SolarFactCard({ fact, locale, recall = false }: {
  fact: PublicLoadingFact;
  locale: Locale;
  recall?: boolean;
}) {
  const english = locale === 'en';
  return (
    <article className={`solar-fact-card${recall ? ' solar-fact-recall' : ''}`}>
      {recall && <p className="eyebrow">{english ? 'Fact shown while preparing your result' : 'เกร็ดที่แสดงระหว่างเตรียมผลประเมิน'}</p>}
      <div className="solar-fact-layout">
        <Image src={fact.imageUrl} width={320} height={220} alt={fact.alt[locale]} priority={!recall} />
        <div>
          <h2>{fact.title[locale]}</h2>
          <p>{fact.copy[locale]}</p>
          <p className="solar-fact-source">{english ? 'Source:' : 'แหล่งข้อมูล:'} {fact.reference.citation}</p>
          <Link className="text-link" href={`${localizedPath('/resources', locale)}#${fact.resourcesAnchor}`}>
            {english ? 'View the source and research context' : 'ดูแหล่งข้อมูลและบริบทของงานวิจัย'}
          </Link>
        </div>
      </div>
    </article>
  );
}
