'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Locale } from '@/config/i18n';
import { formatMoney } from '@/lib/format/numbers';

export function SavingsChart({ currentBill, estimatedBill, locale = 'th' }: { currentBill: number; estimatedBill: number; locale?: Locale }) {
  const english = locale === 'en';
  const before = english ? 'Before solar' : 'ก่อนติดโซลาร์';
  const after = english ? 'After solar (mid-range)' : 'หลังติดโซลาร์ (ช่วงกลาง)';
  const data = [{ name: english ? 'Monthly bill' : 'ค่าไฟต่อเดือน', [before]: currentBill, [after]: estimatedBill }];
  return (
    <div className="chart-wrap" aria-hidden="true">
      <ResponsiveContainer width="100%" height={270}>
        <BarChart accessibilityLayer={false} data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d8e2dc" />
          <XAxis dataKey="name" tick={{ fill: '#617169', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => formatMoney(Number(value), locale)} tick={{ fill: '#617169', fontSize: 11 }} width={72} />
          <Tooltip formatter={(value) => formatMoney(Number(value), locale)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey={before} fill="#b8c6bd" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey={after} fill="#137a50" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
