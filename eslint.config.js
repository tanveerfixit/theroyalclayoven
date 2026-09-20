import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Base JS recommended
  js.configs.recommended,

  // TypeScript + React source files
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // TypeScript-aware rules
      ...tsPlugin.configs.recommended.rules,

      // React Hooks — the main reason we added ESLint
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      // Downgraded: some intentional patterns use setState in effects (hydration, CSS animations)
      'react-hooks/set-state-in-effect': 'warn',

      // Relax some TS rules that are too strict for an existing codebase
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',

      // Allow console.warn and console.error, warn on console.log
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Disable base rule — TS version handles this
      'no-unused-vars': 'off',
    },
  },

  // Plain JS files (non-TypeScript)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
  },

  // Ignore build output, node_modules, server (plain JS)
  {
    ignores: ['dist/**', 'node_modules/**', 'server/**', '*.config.*'],
  },
];
