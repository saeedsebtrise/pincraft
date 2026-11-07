import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// Introduce linting on the Autopilot slice; legacy editor files remain type-checked.
export default defineConfig(
  { ignores: ['node_modules/**', 'dist/**', 'output/**'] },
  {
    files: ['autopilot/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^_', caughtErrors: 'none' }] },
  },
  {
    files: ['autopilot/**/*.gs'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'script', globals: {
      PropertiesService: 'readonly', SpreadsheetApp: 'readonly', ContentService: 'readonly',
      LockService: 'readonly', Utilities: 'readonly', UrlFetchApp: 'readonly', ScriptApp: 'readonly',
    } },
    // Apps Script invokes these public entry points by name outside this file.
    rules: { 'no-unused-vars': ['error', { varsIgnorePattern: '^(setup|doPost|tick|installTimer)$', caughtErrors: 'none' }] },
  },
  {
    files: ['src/dashboard/AutopilotPage.tsx', 'src/test/autopilot*.test.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
