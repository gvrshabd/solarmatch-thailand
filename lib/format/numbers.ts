import type { Locale } from '@/config/i18n';
import type { Range } from '@/lib/calculator/types';

type NumberOptions = {
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  useGrouping?: boolean;
};

const localeTag: Record<Locale, string> = {
  th: 'th-TH',
  en: 'en-US',
};

function normalized(value: number) {
  return Object.is(value, -0) ? 0 : value;
}

export function formatNumber(value: number, locale: Locale, options: NumberOptions = {}) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(localeTag[locale], {
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    useGrouping: options.useGrouping ?? true,
  }).format(normalized(value));
}

export function formatMoney(value: number, locale: Locale, options: NumberOptions = {}) {
  if (!Number.isFinite(value)) return '—';
  const sign = normalized(value) < 0 ? '−' : '';
  return `${sign}฿${formatNumber(Math.abs(normalized(value)), locale, options)}`;
}

export function formatRange(range: Range, locale: Locale, options: NumberOptions = {}) {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return '—';
  return `${formatNumber(range.min, locale, options)}–${formatNumber(range.max, locale, options)}`;
}

export function formatMoneyRange(range: Range, locale: Locale, options: NumberOptions = {}) {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) return '—';
  return `${formatMoney(range.min, locale, options)}–${formatMoney(range.max, locale, options)}`;
}

export function formatPaybackYears(range: Range | null, locale: Locale, horizonYears = 25) {
  const unavailable = locale === 'en' ? 'Not available' : 'ยังคำนวณไม่ได้';
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || range.min < 0 || range.max < range.min) {
    return unavailable;
  }

  const year = (value: number) => formatNumber(value, locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const horizon = formatNumber(horizonYears, locale);

  if (range.min > horizonYears) {
    return locale === 'en' ? `More than ${horizon} years` : `มากกว่า ${horizon} ปี`;
  }
  if (range.max > horizonYears) {
    return locale === 'en'
      ? `${year(range.min)} to more than ${horizon} years`
      : `${year(range.min)} ถึงมากกว่า ${horizon} ปี`;
  }
  return locale === 'en'
    ? `${year(range.min)}–${year(range.max)} years`
    : `${year(range.min)}–${year(range.max)} ปี`;
}

export function formatCompactMoney(value: number, locale: Locale) {
  if (!Number.isFinite(value)) return '—';
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) {
    return `${formatMoney(value / 1_000_000, locale, { maximumFractionDigits: 1 })}m`;
  }
  return `${formatMoney(Math.round(value / 1_000), locale)}k`;
}
