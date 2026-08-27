'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function SavingsChart({ currentBill, estimatedBill }: { currentBill: number; estimatedBill: number }) {
  const data = [{ name: 'ค่าไฟต่อเดือน', 'ก่อนติดโซลาร์': currentBill, 'หลังติดโซลาร์ (ช่วงกลาง)': estimatedBill }];
  return (
    <div className="chart-wrap" aria-hidden="true">
      <ResponsiveContainer width="100%" height={270}>
        <BarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d8e2dc" />
          <XAxis dataKey="name" tick={{ fill: '#617169', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `฿${Number(value).toLocaleString('th-TH')}`} tick={{ fill: '#617169', fontSize: 11 }} width={72} />
          <Tooltip formatter={(value) => `฿${Number(value).toLocaleString('th-TH')}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="ก่อนติดโซลาร์" fill="#b8c6bd" radius={[6, 6, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="หลังติดโซลาร์ (ช่วงกลาง)" fill="#137a50" radius={[6, 6, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
