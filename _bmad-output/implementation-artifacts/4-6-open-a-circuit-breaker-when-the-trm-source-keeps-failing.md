---
title: 'Story 4.6: Open a circuit breaker when the TRM source keeps failing'
type: 'feature'
created: '2026-11-06'
status: 'done'
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
- [x] green: the domain machine and its unit tests, the repository, `fetchTrm` behind the breaker, the read, an HTTP case
- [x] `npm run test:ci` green with 4.6 `done`

**Acceptance Criteria:**
- Given a down source, when 3 hourly fetches fail, then the breaker opens. A fetch 10 min later answers `circuitOpen`, with no source call and no write, and today's rate stays yesterday's, stale.
- Given an open breaker whose cool-down has passed, when fetches arrive, then exactly one probes the source. Its failure reopens the breaker for 30 min, and its success closes it and stores the rate.
- Given 50 concurrent fetches on an expired breaker, then 1 probe and 49 `circuitOpen`. Given 3 concurrent failures from `closed`, 20 rounds, then each round opens the breaker with exactly 3 failures counted.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/cat_breaker.test.ts` -- expected: 6 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/33-story-4.6.log`, red section. All 6 failed on `NotImplemented: catalog.getFxSourceBreaker`. `gate:atdd-red:impl1`: 6 red for the right reason, 373 green, 0 not as expected. Each test reads the breaker through the admin read before it asserts a breaker effect, so the red reason is the missing read, not a wrong outcome of Story 4.4's `fetchTrm`. In the red state `gate:trace:solu2` reports FAIL by design, because FR-CAT-8, NFR-CAT-4 and R-32 map to a story that is not done.

**Green phase:** `evidence/impl2/33-story-4.6.log`, green section.
- The 6 bound tests pass, and so do the 13 unit tests. `domain/breaker.ts` has 100 % branch coverage.
- A mutation check took `FOR UPDATE` off the breaker read. `[S-FR-CAT-8.breaker.C1]` then failed with 42 probes instead of 1, and `[S-FR-CAT-8.breaker.C2]` failed with a breaker still `closed`, because failure counts were lost. So the hammers prove the lock.
- One test change came after the red commit: `[S-FR-CAT-8.breaker.C1]` waits on a lock for any statement naming `"FxSourceBreaker"`, no longer only on `FROM "FxSourceBreaker"`. In the mutation, the blocked statement was the `UPDATE`, and the narrower fragment made the condition wait end on its probe limit. The fail reason then hid the double probe. The assertions did not change.

## Implementation Notes

- **Domain** (`domain/breaker.ts`, pure): `admit(breaker, now, token, policy)` runs before the source call, and `record(breaker, outcome, probeToken, now, policy)` runs after it.
  - A result moves only the state it was admitted in. A closed-state call that returns after the breaker opened moves nothing, and neither does a probe whose lease another probe took over.
  - An unchanged breaker is returned as the same object, so the service skips the `UPDATE`.
- **Persistence:** the one `"FxSourceBreaker"` row is keyed by `port = 'FxRateSource'`.
  - `lockFxSourceBreaker` first inserts the row closed (`ON CONFLICT DO NOTHING`), then reads it `FOR UPDATE`.
  - The CHECKs tie the state to its columns: `retryAt` and `openedAt` are null only while closed, and `probeToken` is set only while half-open.
  - Every instant is bound from `Clock`. `readFxSourceBreaker` is a read-only read, and no row reads `CLOSED_BREAKER`.
- **Service** (`fetchTrm`):
  - covered day → `alreadyCovered`, as before;
  - admission → one transaction under the row lock. A short-circuit answers `circuitOpen`, with `FxRateCircuitOpen` citing `NFR-CAT-4` and `{ consecutiveFailures, retryAt, trigger }`;
  - the source call → outside any transaction, as in Story 4.4;
  - a failure (thrown, `null`, or a row that does not cover today) → a second locked transaction records it;
  - a success → recorded in the transaction that inserts the row, whatever the insert then finds (`stored`, `alreadyCovered` or `mismatchKept`).
  - `NotImplementedError` from `UNWIRED_FX` is still rethrown and never counted. If it hits a probe, the 60 s lease frees the breaker again.
- **Read** (`getFxSourceBreaker`, `catalog.fx.breaker`, admin): it returns the stored row, with `failureThreshold`, and explains it with one of three codes: `FxSourceHealthy` (`allowed`), `FxRateCircuitOpen` or `FxSourceProbing` (`allowedWithNotice`).
- **Schema readers:** three readers took only `001_tezg_schema.sql` and now read every migration of the folder: `tools/lint/tezg-plugin.mjs` (`readSchemaSql`, which feeds `tezg/table-owner`), the `SYS-AD8` fitness scan and `gen-solu2-epics.mjs`. Without this change, the catalog's write to the new table would be "an unknown table". `prisma/schema.prisma` is regenerated, and its `FxSourceBreaker` model is tagged `@owner catalog`.
- **Tests:**
  - 6 ATDD tests in `atdd/cat_breaker.test.ts`;
  - 13 pure unit tests in `src/modules/catalog/breaker-domain.test.ts`;
  - one HTTP case in `composition-catalog-listings.test.ts`: a non-admin gets 403, an admin reads `closed` and then `open`, and the retry answers `circuitOpen` with no row written.
- **Deferred** (`deferred-work.md`, Story 4.6): the policy in configuration; an AD-CAT-3 rule 7 in ARCHITECTURE.md; the production adapter, whose transport retries form one breaker call.
- **Two registry-wide unit tests followed the new surface.** The first full gate stopped at `test:unit`, on two tests the red commit had left stale:
  - `router.test.ts` counts the non-job procedures, now 109 with catalog 8;
  - `messages.test.ts` allow-lists placeholders, and now also lists `consecutiveFailures` and `failureThreshold`, which are numbers.
  The second run of `npm run test:ci` exited 0: 743 unit tests, `solu2-atdd` 379 green with 0 not as expected, `solu2-nfr` 30 green, and the trace PASS with 425 of 425 ids enforced green.
