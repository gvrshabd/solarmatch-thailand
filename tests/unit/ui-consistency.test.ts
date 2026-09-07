import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe('UI consistency guardrails', () => {
  it('does not introduce emoji glyphs in application component source', () => {
    const emoji = /\p{Extended_Pictographic}/u;
    const violations = ['app', 'components'].flatMap(sourceFiles)
      .filter((path) => emoji.test(readFileSync(path, 'utf8')));
    expect(violations).toEqual([]);
  });
});
