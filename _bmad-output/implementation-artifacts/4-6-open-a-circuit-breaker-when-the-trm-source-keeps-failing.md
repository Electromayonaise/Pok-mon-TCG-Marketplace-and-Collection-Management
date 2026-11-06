---
title: 'Story 4.6: Open a circuit breaker when the TRM source keeps failing'
type: 'feature'
created: '2026-11-06'
status: 'in-progress'
baseline_commit: '0a29548'
review_loop_iteration: 0
flow: 'Impl-2 Flow A, ATDD-first (test-design.md §7.1): red tests committed before any breaker code (decision log Impl-2 #31)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** rubric 1 asks for graceful degradation and circuit breakers under failure states. The TRM (COP/USD) source is the system's only outbound dependency. Today `fetchTrm` degrades gracefully: a down source answers `sourceUnavailable`, and `getFxRate` carries the last stored rate forward, stale (Story 4.4). But nothing remembers that the source keeps failing. Every hourly tick and every admin retry calls it again, and concurrent callers all call it at once. Decision log Impl-2 #31 found this gap at the re-audit.

**Approach:** a circuit breaker around the `FxRateSource` call in `fetchTrm`. Mateo approved this design (decision log Impl-2 #31):
- a pure state machine in `src/modules/catalog/domain/breaker.ts`, on `Clock` instants:
  - `closed` opens after N consecutive source failures;
  - `open` short-circuits, with no source call, until a cool-down has passed;
  - `half-open` lets one probe through: its success closes the breaker, and its failure reopens it for a new cool-down;
- the state lives in one Postgres row owned by catalog (AD-8), shared by every instance. Each transition is atomic, so a job run racing an admin retry cannot both probe, and no failure count is lost. A concurrency hammer proves it with the barrier and the lock helpers, never with timing;
- while the breaker is open, `fetchTrm` answers a degraded outcome. It keeps the last stored rate and never fabricates one;
- admins see the breaker on page 2.3, next to the tick health.

## Boundaries & Constraints

**Always:**
- **Time and ids:** every instant comes from `Clock` and every token from `IdGenerator`. The source call runs outside any transaction, as in Story 4.4.
- **Order:** a covered day answers `alreadyCovered` before the breaker is read.
- **Decisions:** every outcome is explained. The new codes are stored-only §13 rows, citing `NFR-CAT-4`.

**Ask First:**
- a cool-down that skips scheduled ticks, which would amend NFR-CAT-4's one attempt per hour;
- letting the admin retry bypass the breaker.

**Never:**
- a rate written or invented while the breaker is open;
- a breaker kept in process memory;
- a wait on time in a test.

</frozen-after-approval>

## Agent defaults (not frozen; reported for decision log Impl-2 #31's follow-up)

- **N = 3** failures in a row, and a **30 min** cool-down. The hourly tick (07:17–20:17 Bogotá) always finds the cool-down over, so the breaker never removes a scheduled attempt (NFR-CAT-4: one attempt per hour). It short-circuits the admin retries and the concurrent calls between ticks.
- **The half-open probe** holds a 60 s lease. A probe that never reports back (a crashed instance) is taken over by the next fetch once the lease ends.
- **A failure** is any `sourceUnavailable` result: a thrown error, `null`, or a row that does not cover today. Any row covering today is a success, including one that ends in `mismatchKept` or `alreadyCovered`.
- **The outcome** is a new `circuitOpen`, with `FxRateCircuitOpen` (`allowedWithNotice`). It is not folded into `sourceUnavailable`, so the job result, the admin retry and the tests can tell "the source failed" from "we did not call it".
- **The table** is `"FxSourceBreaker"`: one row per guarded port, and no row reads `closed`. Migration `002_fx_source_breaker.sql` adds it, because 001 is never edited in place.
- **Visibility:** a new admin query, `catalog.fx.breaker` (S-FR-CAT-8.breaker), on page 2.3. S-SYS.tick lives in shared-kernel, which may not read a catalog table (AD-8, AD-1), so the breaker does not ride on `admin.jobs.tickHealth`.

## Code Map

- `src/modules/catalog/domain/breaker.ts` -- the pure state machine; `src/modules/catalog/breaker-domain.test.ts` -- its unit tests
- `src/modules/catalog/ports/cat.v2.ts` + `infra/pg.ts` -- `lockFxSourceBreaker`, `saveFxSourceBreaker`, `readFxSourceBreaker`
- `src/modules/catalog/application/cat.v2.ts` -- `fetchTrm` behind the breaker; `getFxSourceBreaker`
- `_bmad-output/planning-artifacts/detailed-design/schemas/002_fx_source_breaker.sql` -- `"FxSourceBreaker"`; `prisma/schema.prisma` regenerated
- `tools/lint/tezg-plugin.mjs`, `_bmad-output/test-artifacts/fitness/sys_fitness.test.ts`, `scripts/gen-solu2-epics.mjs` -- read every migration
- `contracts.md` -- the S-FR-CAT-8 breaker clause, §13 `FxRateCircuitOpen`, `FxSourceHealthy`, `FxSourceProbing`, and the §15 row S-FR-CAT-8.breaker
- `operations.json`, `ui-states.json` (page 2.3), the DTOs, and `src/server/composition.ts` (`catalog.fx.breaker`)
- `_bmad-output/test-artifacts/atdd/cat_breaker.test.ts` -- the 6 bound tests (red first)

## Tasks & Acceptance

**Execution:**
- [x] red: the 6 bound tests, the contract clause and the codes, the registry row, the DTOs, the migration, the `getFxSourceBreaker` stub; R-32 in `test-design.md` §2; red run in `evidence/impl2/33-story-4.6.log`
- [ ] green: the domain machine and its unit tests, the repository, `fetchTrm` behind the breaker, the read
- [ ] `npm run test:ci` green with 4.6 `done`

**Acceptance Criteria:**
- Given a down source, when 3 hourly fetches fail, then the breaker opens. A fetch 10 min later answers `circuitOpen`, with no source call and no write, and today's rate stays yesterday's, stale.
- Given an open breaker whose cool-down has passed, when fetches arrive, then exactly one probes the source. Its failure reopens the breaker for 30 min, and its success closes it and stores the rate.
- Given 50 concurrent fetches on an expired breaker, then 1 probe and 49 `circuitOpen`. Given 3 concurrent failures from `closed`, 20 rounds, then each round opens the breaker with exactly 3 failures counted.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_breaker.test.ts` -- expected: 6 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/33-story-4.6.log` (red section).
