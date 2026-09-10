import { describe, expect, it } from 'vitest';
import { localizedDistrictOptions } from '@/config/districts';

describe('localized district options', () => {
  it('sorts English labels using English collation', () => {
    const labels = localizedDistrictOptions('bangkok', 'en').map((option) => option.label);
    expect(labels).toEqual([...labels].sort(new Intl.Collator('en', { sensitivity: 'base' }).compare));
  });

  it('sorts Thai labels using Thai collation instead of the English source order', () => {
    const thaiOptions = localizedDistrictOptions('bangkok', 'th');
    const labels = thaiOptions.map((option) => option.label);
    expect(labels).toEqual([...labels].sort(new Intl.Collator('th', { sensitivity: 'base' }).compare));
    expect(thaiOptions.map((option) => option.value)).not.toEqual(localizedDistrictOptions('bangkok', 'en').map((option) => option.value));
  });

  it('makes both language names available to the searchable chooser', () => {
    const sathon = localizedDistrictOptions('bangkok', 'th').find((option) => option.value === 'sathon');
    expect(sathon).toMatchObject({ label: 'สาทร' });
    expect(sathon?.searchText).toContain('Sathon');
    expect(sathon?.searchText).toContain('สาทร');
  });
});
