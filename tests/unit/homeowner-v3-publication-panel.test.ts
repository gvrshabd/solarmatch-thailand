import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeownerV3ReleasePanel } from '@/components/admin/homeowner-v3-release-panel';
import { readFileSync } from 'node:fs';

describe('homeowner publication panel', () => {
  it('uses the established native navigation link for the protected return route', () => {
    const source=readFileSync('app/admin/homeowner-v3-release/page.tsx','utf8');
    expect(source).toContain("from '@/components/site/internal-link'");
    expect(source).not.toContain("from 'next/link'");
    expect(source).toContain('href="/admin"');
  });
  it('starts read-only with explicit backup confirmation and disabled publication', () => {
    const html = renderToStaticMarkup(createElement(HomeownerV3ReleasePanel));
    expect(html).toContain('Read current release and holds');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(html).toMatch(/<input(?=[^>]*name="backupSha256")(?=[^>]*disabled="")[^>]*>/);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled=""/);
    expect(html).toContain('kWh contact remains unavailable');
    expect(html).toContain('This page cannot verify your local encrypted backup');
    expect(html).not.toContain('csrfToken');
  });
});
