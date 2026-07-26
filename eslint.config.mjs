// @ts-check

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [tseslint.configs.strict],
  },
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    '.heroui-docs/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
