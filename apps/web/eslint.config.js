import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'output/**', 'public/ruffle/**', 'public/original/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['src/**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
