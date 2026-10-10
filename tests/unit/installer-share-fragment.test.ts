import { describe, expect, it, vi } from 'vitest';
import { consumeShareFragment } from '@/lib/installer/share-fragment';
describe('share page fragment privacy', () => {
  const token = 'a'.repeat(48);
  it('consumes a fragment and immediately removes it from the visible URL', () => {
    const replace = vi.fn();
    expect(consumeShareFragment({ href: 'https://example.com/enquiry?lang=en#token=' + token }, replace)).toBe(token);
    expect(replace).toHaveBeenCalledWith('/enquiry?lang=en');
  });
  it('rejects query tokens and removes them from URL history', () => {
    const replace = vi.fn();
    expect(consumeShareFragment({ href: 'https://example.com/enquiry?token=' + token + '&lang=en' }, replace)).toBeNull();
    expect(replace).toHaveBeenCalledWith('/enquiry?lang=en');
  });
  it('rejects malformed fragments', () => {
    expect(consumeShareFragment({ href: 'https://example.com/enquiry#token=short' }, vi.fn())).toBeNull();
  });
});
