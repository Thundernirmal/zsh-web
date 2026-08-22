import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.astro/**', 'dist/**', '.playwright-mcp/**', 'playwright-report/**', 'test-results/**', '.zsh-config/**'],
  },
  {
    ...js.configs.recommended,
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  ...astro.configs['jsx-a11y-recommended'],
  {
    files: ['src/**/*.{astro,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    ...reactHooks.configs.flat['recommended-latest'],
    files: ['src/**/*.tsx'],
  },
];
