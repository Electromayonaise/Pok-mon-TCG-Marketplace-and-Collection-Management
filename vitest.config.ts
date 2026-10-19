import { defineConfig } from 'vitest/config';

// Test projects (bmad-testarch-framework, Solu-1 Phase 3):
//   solu1-schema — GREEN: proves the migrations physically enforce the invariants.
//   solu1-atdd   — RED: contract scaffolds that call NotImplemented stubs.
// Both run against Docker Compose PostgreSQL 16 (ARCH §4), one database per test file
// cloned from a template migrated once per run.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'solu1-schema',
          include: ['docs/solu-1/tests/schema/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          provide: { migrationsDir: 'docs/solu-1/planning/schemas', templateDb: 'tezg_tpl_solu1' },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        test: {
          name: 'solu1-atdd',
          include: ['docs/solu-1/tests/atdd/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          provide: { migrationsDir: 'docs/solu-1/planning/schemas', templateDb: 'tezg_tpl_solu1' },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      // Solu-2 (docs/solu-2/test/): the detailed-design schema, with the NFR-SYS-3 network guard.
      {
        test: {
          name: 'solu2-atdd',
          include: ['docs/solu-2/test/atdd/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: 'docs/solu-2/planning/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      // GREEN: static fitness functions of the cross-cutting ADs; they must stay green.
      {
        test: {
          name: 'solu2-fitness',
          include: ['docs/solu-2/test/fitness/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: 'docs/solu-2/planning/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        test: {
          name: 'solu2-nfr',
          include: ['docs/solu-2/test/nfr/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: 'docs/solu-2/planning/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 300_000,
          hookTimeout: 300_000,
        },
      },
    ],
  },
});
