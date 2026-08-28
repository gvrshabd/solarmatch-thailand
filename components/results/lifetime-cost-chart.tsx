'use client';

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '@/config/i18n';
import type { LifetimeCostPoint } from '@/lib/calculator/types';
import { formatCompactMoney, formatMoney, formatNumber } from '@/lib/format/numbers';

export function LifetimeCostChart({ data, locale = 'th' }: { data: LifetimeCostPoint[]; locale?: Locale }) {
  const english = locale === 'en';
  const labels = {
    without: english ? 'Without solar' : 'ไม่ติดโซลาร์',
    low: english ? 'With solar · planning path' : 'ติดโซลาร์ · ตัวเลขวางแผน',
    high: english ? 'With solar · higher-cost sensitivity' : 'ติดโซลาร์ · กรณีต้นทุนสูง',
  };
  return (
    <div className="lifetime-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height={360}>
        <LineChart accessibilityLayer={false} data={data} margin={{ top: 12, right: 18, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d8e2dc" />
          <XAxis dataKey="year" ticks={[0, 5, 10, 15, 20, 25]} tick={{ fill: '#617169', fontSize: 11 }} tickFormatter={(value) => english ? `Year ${formatNumber(Number(value), locale)}` : `ปี ${formatNumber(Number(value), locale)}`} />
          <YAxis tick={{ fill: '#617169', fontSize: 11 }} width={72} tickFormatter={(value) => formatCompactMoney(Number(value), locale)} />
          <Tooltip
            labelFormatter={(value) => english ? `Year ${formatNumber(Number(value), locale)}` : `ปีที่ ${formatNumber(Number(value), locale)}`}
            formatter={(value, name) => [formatMoney(Number(value), locale), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
          <Line name={labels.without} type="monotone" dataKey="withoutSolarThb" stroke="#7f8d85" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line name={labels.low} type="monotone" dataKey="withSolarLowThb" stroke="#137a50" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line name={labels.high} type="monotone" dataKey="withSolarHighThb" stroke="#e2a62b" strokeWidth={2} strokeDasharray="7 5" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
