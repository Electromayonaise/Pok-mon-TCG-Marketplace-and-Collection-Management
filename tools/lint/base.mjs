// The base ESLint configuration, resolved from this toolchain's own node_modules (decision log #7).
// Parse-only typescript-eslint: no rule needs type information, so TypeScript 5.9 only parses.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const base = tseslint.config(
  // Agent tooling (.agents, .claude, .cline, _bmad) and the Plan-2 UX prototypes are not product code.
  { ignores: ['**/node_modules/**', '.*/**', '_bmad/**', '_bmad-output/**', 'docs/plan-2/**', '.next/**', 'generated/**', 'next-env.d.ts'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { process: 'readonly', console: 'readonly', URL: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', structuredClone: 'readonly', globalThis: 'readonly', Response: 'readonly', Request: 'readonly', Headers: 'readonly', fetch: 'readonly', AbortController: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly', performance: 'readonly', queueMicrotask: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', setImmediate: 'readonly' } },
    rules: {
      // `_`-prefixed parameters are the stubs' unused inputs until each story implements them.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // Each module's repository port is an empty interface until its stories add methods
      // (ports-and-adapters.md §2), and so is a service's empty deps bag.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
    },
  },
  {
    // The Solu-2 red suites keep Given helpers their stories have not called yet.
    files: ['docs/solu-*/test/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }] },
  },
);
