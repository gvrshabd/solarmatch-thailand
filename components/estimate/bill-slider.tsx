'use client';

import { useMemo, useState } from 'react';
import type { Locale } from '@/config/i18n';

function sliderMaximum(value: number) {
  if (value <= 10000) return 10000;
  if (value <= 50000) return Math.ceil(value / 10000) * 10000;
  if (value <= 250000) return Math.ceil(value / 25000) * 25000;
  return Math.ceil(value / 100000) * 100000;
}

export function BillSlider({
  value,
  onChange,
  locale = 'th',
  id = 'monthly-bill',
  invalid = false,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  locale?: Locale;
  id?: string;
  invalid?: boolean;
}) {
  const english = locale === 'en';
  const [textValue, setTextValue] = useState(value ? String(value) : '');

  const numericValue = Number(textValue) || 0;
  const maximum = useMemo(() => sliderMaximum(numericValue), [numericValue]);
  const step = maximum <= 10000 ? 100 : maximum <= 50000 ? 500 : 1000;

  function updateText(next: string) {
    if (next !== '' && !/^\d+$/.test(next)) return;
    setTextValue(next);
    onChange(next === '' ? undefined : Number(next));
  }

  return (
    <div className="bill-slider" data-testid="bill-slider">
      <label className="bill-direct-input" htmlFor={id}>
        <span>฿</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={invalid}
          value={textValue}
          placeholder="3,500"
          onChange={(event) => updateText(event.target.value.replaceAll(',', '').trim())}
        />
        <small>{english ? 'per month' : 'ต่อเดือน'}</small>
      </label>
      <input
        className="bill-range"
        aria-label={english ? 'Typical monthly electricity bill' : 'ค่าไฟต่อเดือนโดยเฉลี่ย'}
        type="range"
        min="0"
        max={maximum}
        step={step}
        value={Math.min(numericValue, maximum)}
        onChange={(event) => updateText(event.target.value)}
      />
      <div className="bill-range-labels" aria-hidden="true">
        <span>฿0</span>
        <span>{english ? 'Slider expands for larger bills' : 'สไลเดอร์ขยายตามยอดที่สูงขึ้น'}</span>
        <span>฿{maximum.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}
