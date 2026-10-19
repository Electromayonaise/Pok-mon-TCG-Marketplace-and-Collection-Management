---
title: Framework validation report — Solu-1 test harness
skill: bmad-testarch-framework (Validate mode)
validated: vitest.config.ts, test-support/*.ts, package.json scripts, docker-compose.yml, .nvmrc, .github/workflows/solu1-quality-gate.yml
date: 2026-10-18
directed_by: Mateo Rubio (Phase 3 gate, decision log #17)
---

# Framework validation report — Solu-1 test harness

**Why this run exists.** The harness was built as the prerequisite step of `bmad-testarch-atdd`, without invoking `bmad-testarch-framework`. Mateo asked for the skill to be run in Validate mode, so that the TEA matrix's "Framework Initialization" row reflects a real run (decision log #17).

**Stack:** `backend` (Node 22.14 / TypeScript 7.0.2 / Vitest 5.0.5 / PostgreSQL 16.6 via Docker Compose). The checklist is written mainly for Playwright and Cypress. Items that only apply to a browser stack are marked **N/A**, and none of them is counted as a pass.

## Results by section

| Section | Result | Evidence / note |
|---|---|---|
| Prerequisites | ✅ PASS | `package.json` manifest; no conflicting framework; Node backend; bundler N/A |
| 1 Preflight | ✅ PASS | Stack `backend`; architecture documents located (`docs/plan-2/planning/ARCHITECTURE.md` §4 names Docker Compose Postgres 16 for tests) |
| 2 Framework selection | ✅ PASS | Vitest + fast-check, chosen by Mateo at the Phase 2 gate (decision log #10), with its rationale recorded |
| 3 Directory structure | ✅ PASS (adapted) | The checklist names `tests/support/`. The harness uses `test-support/` (shared by Solu-1 and Solu-2) and keeps each package's tests in its own tree (`docs/solu-1/tests/{atdd,schema}`), so each submission keeps its statement's literal paths. Page objects N/A |
| 4 Configuration | ✅ PASS (adapted) | `vitest.config.ts`: two projects, TypeScript, test timeout 30 s, hook timeout 60 s, global setup. Base URL, trace, screenshot and video are N/A (no browser). Reporters were console + JSON only, ⚠️ **fixed**: JUnit added in CI |
| 5 Environment | ⚠️ WARN → **fixed** | `.env.example` was missing. Added it with the `TEZG_PG_*` variables `test-support/env.ts` reads. `.nvmrc` = 22 ✅. `BASE_URL` and `API_URL` N/A |
| 6 Fixtures | ✅ PASS | `useTestDatabase()`: per-file database cloned from a migrated template, auto-cleanup (`TRUNCATE` before each test, `DROP DATABASE` after the file). `VirtualClock`, `SequentialIds`, `SqlOutbox`, `wiring()`. `mergeTests` is Playwright-specific (N/A); composition is by plain functions, as `fixture-architecture.md` recommends |
| 7 Data factories | ✅ PASS with a justified deviation | 25 factories in `test-support/seed.ts`, used by every test. **`@faker-js/faker` is deliberately not used:** AD-SYS-6 and `test-quality.md` example 1 require deterministic data, and per-file databases already remove the parallel-collision risk that random data guards against. Cleanup is the per-test `TRUNCATE`, so there is no per-factory `cleanup()` |
| 8 Sample tests | ✅ PASS | The 32 GREEN schema tests are the runnable samples; Given/When/Then comments throughout; selectors N/A |
| 9 Helpers | ✅ PASS | `race()` barrier, `caught()`, `httpOf()`, `citedInputs()`, `codeOf()`: functional, with no assertions inside (`test-quality.md` example 3). Network and auth helpers N/A |
| 10 Documentation | ⚠️ WARN → **fixed** | No test README existed. Added `test-support/README.md`: setup, running, architecture, best practices, CI, knowledge-base references, troubleshooting |
| 11 Scripts | ✅ PASS | `db:up`, `test:schema:solu1`, `test:atdd:solu1`, `gate:atdd-red:solu1`, `gate:codes:solu1`, `gate:solu1`; exact-pinned dev dependencies |
| Output validation | ✅ PASS | Config loads; all paths resolve; the GREEN run produced no warnings; no TODO/FIXME; no `any`; the only credentials are the local Docker defaults (`tezg`/`tezg`), also listed as placeholders in `.env.example` |
| Quality checks | ✅ PASS | Strict TypeScript (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); no hard waits; artifacts uploaded on every CI run (reports, not media). Linting is N/A in Solu-1: no linter configured yet, and Solu-2 adds the domain-purity lint |
| Pact CDC | N/A | `tea_use_pactjs_utils: false` |
| Security | ✅ PASS | No secrets; environment variables carry the connection settings |
| Integration points | ✅ PASS | `ci` (done), `atdd` (done) and `test-design` (Solu-2) can proceed. No sprint status file exists yet; it is generated in Phase 4 |
| Version compatibility | ✅ PASS | Node v22.14.0 = `.nvmrc`; `@types/node@22` pinned to the runtime; Vitest 5 and TypeScript 7 load and typecheck clean |

## Fixes applied in this run

1. `.env.example` — `TEZG_PG_HOST`, `TEZG_PG_PORT`, `TEZG_PG_USER`, `TEZG_PG_PASSWORD`, `TEZG_PG_DB` with the local Docker Compose defaults.
2. `test-support/README.md` — harness documentation.
3. `.github/workflows/solu1-quality-gate.yml` — a JUnit reporter on the GREEN step, uploaded with the other reports.

**Verdict:** PASS after fixes (2 WARN sections fixed in this run; one documented deviation: no faker, for determinism).
