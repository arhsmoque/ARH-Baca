import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  {
    files: ['resources/js/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-debugger': 'error',
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // Must come last: turns off every core stylistic rule that would conflict
  // with Prettier's own formatting.
  eslintConfigPrettier,
  {
    ignores: ['vendor/**', 'node_modules/**', 'public/**', 'storage/**', 'bootstrap/**', 'dist/**'],
  },
];
