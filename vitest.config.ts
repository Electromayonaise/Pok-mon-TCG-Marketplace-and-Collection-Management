import { defineConfig } from 'vitest/config';

// Test projects (bmad-testarch-framework). Every project runs against Docker Compose
// PostgreSQL 16 (ARCH §4), one database per test file cloned from a template migrated once
// per run. The Solu-1 projects were retired with the Solu-1 artifacts (git 853449c).
export default defineConfig({
  test: {
    projects: [
      // Solu-2 (_bmad-output/test-artifacts/): the detailed-design schema, with the NFR-SYS-3 network guard.
      {
        test: {
          name: 'solu2-atdd',
          include: ['_bmad-output/test-artifacts/atdd/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: '_bmad-output/planning-artifacts/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
      // GREEN: static fitness functions of the cross-cutting ADs; they must stay green.
      {
        test: {
          name: 'solu2-fitness',
          include: ['_bmad-output/test-artifacts/fitness/**/*.test.ts', '_bmad-output/test-artifacts/fixtures/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: '_bmad-output/planning-artifacts/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        test: {
          name: 'solu2-nfr',
          include: ['_bmad-output/test-artifacts/nfr/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: '_bmad-output/planning-artifacts/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 300_000,
          hookTimeout: 300_000,
        },
      },
      // Impl-1: the unit and integration tests colocated with the code they prove (statement §4.1).
      {
        test: {
          name: 'impl1-unit',
          include: ['src/**/*.test.ts', 'app/**/*.test.ts', 'scripts/**/*.test.ts'],
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: '_bmad-output/planning-artifacts/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
