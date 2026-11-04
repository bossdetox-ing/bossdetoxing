import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default ts.config(
  {
    ignores: [
      'node_modules/**',
      'website/**',
      'pwa/dist/**',
      '.wxt/**',
      '.output/**',
      'test-results/**',
      'playwright-report/**',
      'BOSSDETOX_ING_V1_HANDOFF/**',
      'docs-v1-old/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['scripts/*.mjs'], languageOptions: { globals: { console: 'readonly' } } },
  {
    files: ['src/**/*.tsx'],
    plugins: { 'react-hooks': hooks },
    rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'error' },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
);
