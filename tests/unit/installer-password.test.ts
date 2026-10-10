import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from 'better-auth/crypto';

describe('maintained installer password implementation', () => {
  it('salts each password hash and rejects incorrect passwords', async () => {
    const password = 'synthetic-test-password-only';
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword({ hash: first, password })).toBe(true);
    expect(await verifyPassword({ hash: first, password: 'incorrect-test-password' })).toBe(false);
  });
});
