import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['node_modules/**', '.wxt/**', '.output/**', 'test-results/**', 'playwright-report/**', 'BOSSDETOX_ING_V1_HANDOFF/**', 'docs-v1-old/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], languageOptions: { globals: { chrome: 'readonly', window: 'readonly', document: 'readonly', navigator: 'readonly', console: 'readonly', Blob: 'readonly', URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' } } },
);
