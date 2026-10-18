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
    ],
  },
});
