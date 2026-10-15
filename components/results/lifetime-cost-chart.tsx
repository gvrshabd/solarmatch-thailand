'use client';
import {LifetimePlot} from '@/components/design-v2/lifetime-plot';
import type {Locale} from '@/config/i18n';
import type {LifetimeCostPoint} from '@/lib/calculator/types';
export function LifetimeCostChart({data,locale='th',netBenefit}:{data:LifetimeCostPoint[];locale?:Locale;netBenefit?:number}) {
  const last=data.at(-1),net=netBenefit??(last?last.withoutSolarThb-last.withSolarThb:0);
  return <div className="lifetime-chart"><LifetimePlot data={data} net={net} locale={locale}/></div>;
}
