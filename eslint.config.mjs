// ESLint for the whole repository. The packages live in the isolated toolchain under tools/lint
// (decision log #7); run it with `npm run lint`. The `tezg/*` rules (Story 1.4) guard product
// code; tests seed foreign tables and plant violations by design, so they are exempt.
import { base } from './tools/lint/base.mjs';
import tezg from './tools/lint/tezg-plugin.mjs';

export default [
  ...base,
  {
    files: ['src/**/*.{ts,tsx,mts,cts}'],
    ignores: ['src/**/*.test.{ts,tsx,mts,cts}'],
    plugins: { tezg },
    rules: { 'tezg/error-owner': 'error', 'tezg/table-owner': 'error', 'tezg/regulated-select': 'error' },
  },
];
