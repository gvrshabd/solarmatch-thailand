'use client';

import {Check,Minus} from 'lucide-react';
import {homeownerText} from '@/config/homeowner-v3-copy';
import type {Locale} from '@/config/i18n';
import {useReveal} from './use-reveal';

/** Five pill rows (3 included, 2 separate scenarios); the marks pop in one after another when scrolled into view. */
export function TrustRows({locale}:{locale:Locale}) {
  const ref=useReveal<HTMLUListElement>();
  return <ul className="rows" ref={ref}>{homeownerText(locale).rows.map(row=><li key={row.label} className={row.mark}><span>{row.label}</span><b role="img" aria-label={row.aria}>{row.mark==='yes'?<Check aria-hidden="true"/>:<Minus aria-hidden="true"/>}</b></li>)}</ul>;
}
