import { describe, expect, it } from 'vitest';
import { formatMoney, formatMoneyRange, formatNumber, formatPaybackYears } from '@/lib/format/numbers';

describe('centralized number formatting', () => {
  it('removes floating-point noise and negative zero', () => {
    expect(formatPaybackYears({ min: 4, max: 21.700000000000003 }, 'en')).toBe('4.0–21.7 years');
    expect(formatNumber(-0, 'en')).toBe('0');
    expect(formatMoney(-0, 'en')).toBe('฿0');
  });

  it('expresses values beyond the 25-year analysis horizon honestly', () => {
    expect(formatPaybackYears({ min: 4.5, max: 26.3 }, 'en', 25)).toBe('4.5 to more than 25 years');
    expect(formatPaybackYears({ min: 26, max: 40 }, 'th', 25)).toBe('มากกว่า 25 ปี');
  });

  it('fails safely for invalid payback values and groups currency consistently', () => {
    expect(formatPaybackYears(null, 'en')).toBe('Not available');
    expect(formatPaybackYears({ min: Number.NaN, max: 10 }, 'th')).toBe('ยังคำนวณไม่ได้');
    expect(formatPaybackYears({ min: 12, max: 8 }, 'en')).toBe('Not available');
    expect(formatMoneyRange({ min: 130000, max: 287000 }, 'en')).toBe('฿130,000–฿287,000');
  });
});
