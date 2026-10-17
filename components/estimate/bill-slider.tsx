'use client';

import type { Locale } from '@/config/i18n';

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
  const textValue=value?String(value):'';

  const numericValue = Number(textValue) || 0;
  const maximum = 25000;
  const step = 100;

  function updateText(next: string) {
    if (next !== '' && !/^\d+$/.test(next)) return;
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
          value={textValue?Number(textValue).toLocaleString('en-US'):''}
          aria-label={english ? 'Monthly electricity bill amount' : 'ยอดค่าไฟต่อเดือน'}
          placeholder="4,000"
          onChange={(event) => updateText(event.target.value.replaceAll(',', '').trim())}
        />
        <small>{english ? 'per month' : 'ต่อเดือน'}</small>
      </label>
      <input
        className="bill-range"
        aria-label={english ? 'Typical monthly electricity bill' : 'ค่าไฟต่อเดือนโดยเฉลี่ย'}
        type="range"
        min="500"
        max={maximum}
        step={step}
        value={Math.max(500, Math.min(numericValue, maximum))}
        onChange={(event) => updateText(event.target.value)}
      />
      <div className="bill-range-labels" aria-hidden="true">
        <span>฿500</span>
        <span>{english ? 'Type a larger amount if needed' : 'พิมพ์ยอดที่สูงกว่านี้ได้'}</span>
        <span>฿{maximum.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}
