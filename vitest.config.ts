import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.'), 'cloudflare:workers': path.resolve(__dirname, 'tests/stubs/cloudflare-workers.ts') } },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
