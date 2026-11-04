import { defineConfig } from 'vitest/config';

// Test projects (bmad-testarch-framework). Every project runs against Docker Compose
// PostgreSQL 16 (ARCH §4), one database per test file cloned from a template migrated once
// per run. The Solu-1 projects were retired with the Solu-1 artifacts (git 853449c).
export default defineConfig({
  test: {
    // Impl-2 statement §5: ≥ 90 % branch coverage on the core domain logic, per file, so no weak
    // core hides behind the total (decision log Impl-2 #8). `npm run test:unit` measures it from the
    // impl1-unit project, which holds the pure domain tests and the colocated integration tests.
    coverage: {
      provider: 'v8',
      include: ['src/modules/*/domain/**/*.ts'],
      reporter: ['text', 'json-summary'],
      reportsDirectory: '.coverage',
      thresholds: { perFile: true, branches: 90 },
    },
    projects: [
      // Solu-2 (_bmad-output/test-artifacts/): the detailed-design schema, with the NFR-SYS-3 network guard.
      {
        test: {
          name: 'solu2-atdd',
          include: ['_bmad-output/test-artifacts/atdd/**/*.test.ts'],
          // Each file's pool holds up to 60 connections for the 50-way races (test-support/db.ts), and Postgres allows 200
          // (docker-compose.yml): 3 files at a time stay under it on any machine, as on a 4-core CI runner (Story 13.5).
          maxWorkers: 3,
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
          // One benchmark file at a time (test-review remediation, decision log Impl-2 #24): the PRD §7 protocol measures
          // on an otherwise idle machine. Run side by side, the files measured each other's seeding and load, and the order
          // Vitest picked (a shuffled seed, or its failed-first cache) decided whether [NFR-IDN-1.*] passed its 50 ms p95.
          fileParallelism: false,
          globalSetup: ['test-support/global-setup.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          provide: { migrationsDir: '_bmad-output/planning-artifacts/detailed-design/schemas', templateDb: 'tezg_tpl_solu2' },
          testTimeout: 300_000,
          hookTimeout: 300_000,
        },
      },
      // The k6 load run's seed (Story 13.5): `npm run nfr:k6` runs it once against the `tezg_k6` database it migrated,
      // named by K6_DATABASE_URL. No per-file database: the app under load serves exactly what this test seeds.
      {
        test: {
          name: 'k6-seed',
          include: ['_bmad-output/test-artifacts/nfr/k6/seed.k6.ts'],
          setupFiles: ['test-support/solu2/network-guard.ts'],
          testTimeout: 300_000,
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
