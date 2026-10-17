import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'docs/design-v2/**', '.wrangler/design-v2-staging-assets/**', '.wrangler/homeowner-v3-staging-assets/**']),
]);

export default eslintConfig;
