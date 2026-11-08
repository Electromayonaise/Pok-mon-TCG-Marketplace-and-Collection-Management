# Test Quality Review: the Impl-2 suite at the end of the re-audit

*`bmad-testarch-test-review` (Murat), re-run over the whole suite at `efa178c`, as decision log Impl-2 #38 decided. The last review scored 100 / 100 at `727c74f` (readable with `git show 727c74f:_bmad-output/test-artifacts/test-review.md`); it predates the cursor list tag (#26), Story 4.6's circuit breaker (#32), the axe-core scans (#33), Winston's fixes F1–F9 (#35), the pool timeout and the starved run (#36), and the configurable pool (#39). The first Impl-2 review (59 / 100, F) is `git show 478e3c6:_bmad-output/test-artifacts/test-review.md`. This file overwrites both; it is the one review artifact. The review set is every committed test file: 120 files and 1,105 `it`/`test` blocks at `efa178c` (121 files after the split below) across the unit, integration, ATDD, NFR, fitness, E2E and k6 levels, plus the 8 page objects and the harness in `test-support/`. The run data is in `evidence/impl2/40-test-review-rerun.log`. The severities and the score come from the skill's criteria registry (`steps-c/criteria-registry.md`) and its deduction ledger, never from judgment, exactly as #24 and #25 applied them.*

- **Reviewer:** the agent (Murat), for Mateo
- **Date:** 2026-11-07
- **Scope:** `impl1-unit` (`src/**`, `app/**`, `scripts/**` tests), `solu2-atdd`, `solu2-nfr`, `solu2-fitness`, the Playwright journeys and page objects (`_bmad-output/test-artifacts/e2e/`), the k6 script (`nfr/k6/`), the lint-rule tests, and `test-support/`
- **How each row was decided:** the mechanical rows (C1–C4, H1, H3, H5, M2, M4) by a scan of all 120 files; H4 by a shuffled run of `impl1-unit`, `solu2-atdd` and `solu2-fitness` with seeds 1, 2, 3 and 42, then by reading each new file that keeps state at module level; the judgment rows (M1, M3, M6, L1, L6) by reading every test file added or changed since `727c74f` (28 files: Story 4.6's `atdd/cat_breaker.test.ts`, `breaker-domain.test.ts` and `cat.v2-breaker.test.ts`; the axe scans in the 4 specs, `BasePage` and the new `CollectionsPage`; the F1–F9 pool, tick-health, binder-race and rate-race tests; the pool-timeout and starved-run tests; `config.test.ts`; the cursor list-tag tests of #26), and the files they share helpers with.

## Executive Summary

**At `efa178c`: 1 HIGH and 2 MEDIUM findings. Score 100 / 100 (A) after clamping; recommendation Request Changes (a HIGH).**
**After this run's mechanical fixes: 0 findings. Score 100 / 100 (A). Recommendation: Approve.**

The ledger at `efa178c` is 100 − (1 × 5 + 2 × 2) + 10 = 101, clamped to 100. The score does not move because the two 5-point bonuses outweigh the 9 points of deductions, but the recommendation is computed from the findings, not from the score (`step-03f`): any HIGH makes it **Request Changes**. All three findings were mechanical (a file to split by moving tests, inline rows to swap for a factory), so this run fixed them without changing an assertion. With 0 findings left the ledger is 100 − 0 + 10 = 110, clamped to 100, and the recommendation is **Approve**.

### What the re-run found

- **One test file over 300 lines (H5, HIGH-1).** `atdd/sys_contracts.test.ts` grew from 278 to 303 lines when F3 added `[S-SYS.tick.jobs]` (#35). It is split in two by moving tests: `sys_contracts.test.ts` (187 lines: SYS-1, SYS-2, SYS-4, SYS-8, SYS-R2) and the new `atdd/sys_admin.test.ts` (98 lines: the admin panel's S-SYS.tick, .deliveries, .health and .replay reads). The shared Given steps moved verbatim into `test-support/suites/sys.ts` (42 lines), as #25 did for the seven long files.
- **JobRun rows built inline four times in one file (M2, MEDIUM-1).** `sys_contracts.test.ts`'s two tick-health tests insert the same `JobRun` shape four times. A `jobRun()` factory now lives in `test-support/solu2/fixtures.ts`; it builds the identical rows, and `admin-events.test.ts`'s local `run` helper calls it too.
- **A local copy of an existing factory (M2, MEDIUM-2).** `src/shared-kernel/admin-events.test.ts` defines its own `failedDelivery()`, which builds exactly the rows of the shared `failedDelivery()` factory (#25 added that factory and swapped the composition files, but not this file). **Self-correction:** the 727c74f review should have found this one; the file has had the copy since before that review. Its helper now calls the shared factory.
- **Nothing else fires.** 0 hard waits (`gate:no-sleep`: 354 files, 7 rules proven on planted violations), 0 conditional assertions, 0 skipped or focused tests, 0 test files without an assertion, 0 tautologies, 0 unawaited `.rejects`/`.resolves`, and no test that depends on its order: every project passes with each of the four shuffled seeds.

### Key Strengths

- **The new races are real and fail when the mechanism is removed.** Story 4.6's `[S-FR-CAT-8.breaker.C1]` starts 50 fetches on a barrier while Postgres reports them blocked on the breaker row (`untilBlockedOnLock`), and holds the probe inside the source until every other fetch has answered, so a second probe would be counted, not hidden. Without `FOR UPDATE` it sees 42 probes (#32). `[S-FR-COL-5.C1]` and `[S-FR-COM-7.C1]` (F8) each failed under a mutation (16 entries at one position without the `col:owner` lock; 20 of 20 settings stored without the `UNIQUE`; #35).
- **Resource bounds proven without a timer.** `[S-SYS.jobs.pool]` runs the four jobs on `boundedPool(db, 2)`, which refuses checkout 3 at once and reports its peak; `[S-SYS.jobs.starved]` is bounded by the runtime pool's own checkout timeout (200 ms in the test), not by a wait of its own. Both take their size from `PG_POOL_MAX`, so a change of the decided default fails them (#39's mutations).
- **The accessibility check cannot be blindly green.** `BasePage.expectNoA11yViolations()` asserts the list of violations equals `[]` and prints each rule, impact and target; a planted `<img>` without `alt` failed it (#33). The 14 scans each follow a web-first assertion.
- **No timed wait anywhere**, **red for the right reason mechanically** (`gate:atdd-red`, `gate:nfr-red`), **every domain core at ≥ 90 % branches per file**, **Page Objects only** (8, role- and label-based), and **no skipped, focused or todo test**: all kept from the last review.

### Key Weaknesses

- None the registry scores after the fixes. Three observations without a registry row are under Recommendations: the shapes that still have no factory, the race test whose reorder may or may not win the lock, and the tests that pin decided constants.

## Quality Criteria Assessment

| Criterion | Registry rows | Status at `efa178c` | Status after the fixes | Notes |
|---|---|---|---|---|
| BDD format | L5 | ✅ PASS | ✅ PASS | Each acceptance test starts with its bracketed id and states what must hold; each new unit test names the rule it proves (the breaker's `admit` and `record`, the job-health rule, `TEZG_PG_POOL_MAX`); each journey title is a user story |
| Test ids | L3 | ✅ PASS | ✅ PASS | The ATDD and NFR ids are bound to stories in `epics.md` (430, each defined once); the E2E locators are role- and label-based |
| Priority markers | L2 | ✅ PASS (n/a) | ✅ PASS (n/a) | The repo uses no in-test priority convention (0 of 120 files); priorities live in the risk register |
| Hard waits | H1 | ✅ PASS | ✅ PASS | 0 (`gate:no-sleep`, and a scan for `setTimeout`, `waitForTimeout`, `pg_sleep`, `sleep(`). The breaker race's gate and the job-pool bounds are promises the test resolves, not timers |
| Determinism | H2, H3, C6 | ✅ PASS | ✅ PASS | A virtual clock and sequential ids in every project; 0 conditional assertions. Every loop that asserts runs over a literal (the breaker's 3 ticks and 20 rounds, the binder's 10 rounds, the config's 8 invalid values) or over a list whose length is asserted first. A ternary or `if` in a new test picks an input (`tick` or `admin`; the first tick's clock step), never the expected value. `race` rejections are rethrown |
| Isolation | H4, C5 | ✅ PASS | ✅ PASS | Shuffled with seeds 1, 2, 3 and 42, `impl1-unit`, `solu2-atdd` and `solu2-fitness` pass. The new module-level state: `sys_jobs.test.ts`'s clock (reset to T0 in a `beforeEach`, #25) and its composed app (its fixture source is never switched by a test; the pool tests build their own). `cat_breaker.test.ts` and `cat.v2-breaker.test.ts` build their source and service per test. No test asserts against a mock it configured (C5): the job-runner tests assert what the runner did through its in-memory ports, the breaker tests what the service returned and stored |
| Fixture patterns | M2, M5 | ❌ FAIL → fixed | ✅ PASS | MEDIUM-1 and MEDIUM-2 (above). The inline rows left are of shapes no factory builds and that repeat fewer than three times in a file: `FxSourceBreaker` (a local helper in `cat_breaker`, once in `composition-catalog-listings`), the pending `OutboxEvent` + `EventDelivery` pair (twice in `sys_jobs`), `CommissionLedgerEntry`, and the two deliberately invalid `CollectionEntry` rows that probe a CHECK |
| Data factories | M2 | ❌ FAIL → fixed | ✅ PASS | As above |
| Network-first | M1 | ✅ PASS | ✅ PASS | Each journey seeds its rows before it navigates, and reads data-dependent content only through a web-first assertion; the new `/coleccion` step asserts `4 cartas` before it scans |
| Explicit assertions | C3, C4, M6 | ✅ PASS | ✅ PASS | 0 tautologies; every block asserts; no unawaited `.rejects`/`.resolves`. The assertions inside the breaker's and the job-lock's transaction callbacks are awaited with the transaction |
| Test length (≤ 300 lines) | H5 | ❌ FAIL → fixed | ✅ PASS | HIGH-1 (above). The longest test file is now `atdd/cat_contracts.test.ts` at 294. H5 applies to test files: the two harness seed builders over 300 lines (`test-support/seed.ts`, 341; `test-support/solu2/seed-marketplace.ts`, 308; both unchanged since before the first review) are not test files, as #24 and #25 also read the row |
| Test duration | H1, M1 | ✅ PASS | ✅ PASS | No row fires (the registry ties the row to H1 and M1). Measured in this run's `test:ci` (§ Test File Analysis): the longest non-benchmark test is `[COM-3.C1]` at 7.0 s (reconcile racing 50 deductions, 20 times), and the new tests stay under it (the breaker races and the F8 races each run in seconds). One test is over 1.5 minutes, the benchmark `[NFR-VAL-2.history]` at 114.1 s (Impl-1 LOW-4, below); `[NFR-COM-2.drift]` takes 85.0 s |
| Flakiness patterns | H1–H4, M1, M6 | ✅ PASS | ✅ PASS | No hard wait, wall-clock fixture, conditional assertion or order dependence |
| Disabled or focused tests | C1, C2 | ✅ PASS | ✅ PASS | 0 |

## Quality Score Breakdown

| Item | At `efa178c` | After the fixes |
|---|---|---|
| Starting score | 100 | 100 |
| CRITICAL × 10 | 0 | 0 |
| HIGH × 5 | 1 (−5) | 0 |
| MEDIUM × 2 | 2 (−4) | 0 |
| LOW × 1 | 0 | 0 |
| Bonus: excellent BDD (every test name states behaviour) | +5 | +5 |
| Bonus: perfect isolation (H4 and C5 fire nowhere; every Vitest project passes shuffled) | +5 | +5 |
| Bonus: comprehensive fixtures, data factories, network-first, all test ids | 0 | 0 (inline seed rows of tables with no factory remain, such as `CommissionLedgerEntry`; real network by design; role locators, not test ids) |
| **Total** | **101, clamped to 100 (A)** | **110, clamped to 100 (A)** |
| **Recommendation (computed, `step-03f`)** | **Request Changes** (HIGH > 0) | **Approve** (no finding) |

## Critical Issues (Must Fix)

None.

## The findings, one by one

### HIGH-1. `atdd/sys_contracts.test.ts` is 303 lines (H5): fixed

| Was | Lines | Now (lines) |
|---|---|---|
| `_bmad-output/test-artifacts/atdd/sys_contracts.test.ts` | 303 | `sys_contracts` (187: SYS-1.R2, SYS-1.R6, SYS-2.R4, SYS-2.R6, SYS-4.R9, SYS-8.R2, SYS-8.R4, SYS-R2; 14 tests), `sys_admin` (98: S-SYS.tick, S-SYS.deliveries, S-SYS.health, S-SYS.replay; 6 tests); the harness `test-support/suites/sys.ts` (42) |

The file grew past 300 when the architecture audit's F3 (#35) added `[S-SYS.tick.jobs]` to it. It is split by procedure, the way #25 split the seven long files: the admin panel's four reads (Story 1.5's page 2.3) move together, and the walking skeleton's platform contracts stay. The test bodies were copied by line range; a diff of the old file against the two new ones shows only the four `JobRun` inserts of MEDIUM-1. The four helpers (`dispatcher`, `publish`, `delivery`, `events`) moved verbatim into `useSysSuite()`, which also registers the per-file database. The 20 `it` blocks are the same before and after, every bracketed id is defined once (`gate:ids:solu2`), and `epics.md` and the trace were regenerated for the moved ids (Stories 1.3 and 1.5 now name `sys_admin.test.ts` for the S-SYS ids).

### MEDIUM-1. `JobRun` rows built inline four times in `sys_contracts.test.ts` (M2): fixed

`[S-SYS.tick.h]` and `[S-SYS.tick.jobs]` built the `JobRun` shape inline four times (M2's three-or-more rule). The new `jobRun(db, { id, job, startedAt?, outcome?, errorCode?, trigger? })` in `test-support/solu2/fixtures.ts` builds the same columns: the tick trigger, `finishedAt` equal to the start unless the run is `running`, and `createdAt`/`updatedAt` at the start (T0 by default, which `ins` used before). The four calls now read `jobRun(db, { id: id('fx1'), job: 'trm-fetch', outcome: 'failed', errorCode: 'NotImplemented' })` and so on. `admin-events.test.ts`'s local `run` helper, which built the same shape once, now delegates to it, so no file bypasses the new factory.

### MEDIUM-2. `admin-events.test.ts` copies the `failedDelivery()` factory (M2): fixed

The file's local `failedDelivery()` inserted the `OutboxEvent` and its failed `EventDelivery` (3 attempts, `DeliveryAttemptsExhausted`, a day ago) column for column as the shared `failedDelivery()` does. M2 fires when "a factory for that shape already exists in the repo and the file bypasses it". The local helper keeps its name and its `admin(db)` step and now calls the shared factory, imported as `failedOutboxDelivery`. The copy predates the `727c74f` review, which missed it.

## Shuffled runs (H4)

| Project | Seed 1 | Seed 2 | Seed 3 | Seed 42 |
|---|---|---|---|---|
| `impl1-unit` (72 files, 767 tests) | pass, 23.8 s | pass, 21.6 s | pass, 21.5 s | pass, 21.3 s |
| `solu2-atdd` (27 files, 384 tests) | pass, 35.8 s | pass, 35.0 s | pass, 34.8 s | pass, 38.2 s |
| `solu2-fitness` (2 files, 12 tests) | pass, 12.2 s | pass, 16.1 s | pass, 12.7 s | pass, 13.5 s |

The runs are on the tree with this review's fixes (the split adds `sys_admin.test.ts`, so `solu2-atdd` has 27 files); the fixes move tests and swap inline rows, so they cannot change an order dependence. `solu2-nfr` stays serial and in file order, as #25 decided: its benchmarks measure on a quiet machine, and they share no state that a shuffle could expose.

## The pyramid (70 / 20 / 10 + NFR)

*Counted with the same rules as before, by the script in `evidence/impl2/38-reaudit-docs.log` §4 (copied verbatim into `40-test-review-rerun.log`): `it`/`test` blocks (an `it.each` table counts once; a k6 scenario counts once). Unit = no test database; integration = a file that registers one (`useTestDatabase`, a `test-support` suite or the composed app), plus the ATDD, fitness and fixture proofs; E2E = Playwright; NFR = the PRD §7 benchmarks and the k6 scenarios. "Added by Impl-2" is the blocks at HEAD minus those at `a7c5d81`. The split of HIGH-1 moves blocks and changes no count. The script gives 282 unit blocks at `727c74f` where that review's own count said 284, so the shares below are compared with the script's recount.*

| Level | Added by Impl-2 at `727c74f` | Added by Impl-2 at HEAD | Share at HEAD | Whole suite at `727c74f` | Whole suite at HEAD | Share at HEAD | Target |
|---|---|---|---|---|---|---|---|
| Unit | 101 | 118 | 55.7 % | 282 | 299 | 27.9 % | 70 % |
| Integration | 65 | 88 | 41.5 % | 745 | 768 | 71.6 % | 20 % |
| E2E | 6 | 6 | 2.8 % | 6 | 6 | 0.6 % | 10 % |
| NFR (separate layer) | 9 | 9 | — | 32 | 32 (30 benchmarks, 2 k6 scenarios) | — | separate |
| **Total** | **181** | **221** | | **1,065** | **1,105** | | |

**Reading.** Since `727c74f`, the re-audit added 17 unit blocks (8 for the breaker's `admit` and `record`, 5 for the job runner's refused checkouts, 3 for `TEZG_PG_POOL_MAX`, 1 for the cursor tags) and 23 integration blocks (6 for the breaker's bound tests, 3 for its version-guarded save, 5 in `admin-events.test.ts` for the job health, 2 pool and starved-run proofs, 2 F8 races, and 5 more: the cursor cases of #26, the lock's `release(last)`, `[S-SYS.tick.jobs]` and the breaker's admin read over HTTP). The three pure job-health tests count as integration because their file registers a test database (the file rule). Impl-2's own additions moved from 58.7 % to 55.7 % unit (the review at `727c74f` said 59.1 % by its own count), because the hardening was mostly races and resource bounds that only a database can prove; the whole suite moved from 27.3 % to 27.9 %. E2E stays at 6 journeys: the axe scans added assertions to them, not tests.

### Deliberate deviation

The suite is integration-first by design, not by neglect. Test-design.md §3 allocates the levels that way: "Most P0 risks are races, retries and boundaries that only the database can arbitrate, such as conditional updates, partial unique indexes and `FOR UPDATE` order. A unit test over a mock would pass on code that oversells." So each contract clause is proven by an ATDD test on PostgreSQL 16, and the 70 / 20 / 10 shape, which assumes the logic lives in code a unit test can reach, does not fit a system whose P0 invariants live in SQL. The re-audit is the clearest case: the breaker's rule is a pure state machine with 8 unit blocks at 100 % branches, but what made it correct across instances, one row moved under `FOR UPDATE` with a version guard, is proven only by its two races and its integration test on the real schema. The base is kept as wide as the code allows: every domain core is held at ≥ 90 % branches per file, and each new rule that could be reached without a database got a pure test. It is not an ice-cream cone: E2E stays at 6 journeys (0.6 % of the suite, 2.8 % of Impl-2's additions), each proving only that the pages wire rules together, and every rule a journey touches is proven below it. The shape is a diamond with a wide, fast base: 299 unit, 768 integration and 6 E2E blocks, with 32 NFR benchmarks and scenarios beside them.

## The four testing traps

| Trap | The rule (test-design.md §7.5) | What enforces it | Instances found or fixed |
|---|---|---|---|
| **Ice cream cone** | A behaviour is proven at the lowest level that can prove it | The E2E specs assert journeys; the rules are bound tests in ATDD or the domain tests; per-file branch coverage | None. 6 E2E tests against 206 unit and integration tests added by Impl-2. The axe scans were added inside the existing journeys, and the breaker's rule went to the domain first |
| **Flaky sleeper** | Waits are on a condition, never on time | `npm run gate:no-sleep` in `test:ci`; `untilBlockedOnLock` and the `race` barrier; web-first assertions; k6 at a constant arrival rate | **Kept out:** the breaker race waits on `pg_stat_activity` and a promise gate; the pool proofs refuse a checkout at once (`boundedPool`) or rely on the pool's own timeout (`[S-SYS.jobs.starved]`), never on a timer of the test's; four shuffled seeds per project find no order dependence |
| **Mocking mirage** | The unit under test is never faked; fakes stand only at module seams and external ports | The ATDD projects run on PostgreSQL 16; `gate:atdd-red`; the E2E journeys run the production build | **Kept out:** the breaker tests fake only the TRM source port (a fixture source with a fault switch, or a source that holds the probe); `cat.v2-breaker.test.ts` wraps the real repository's lock to report a wrong version and asserts the real service's rollback; the job-runner tests fake the lock and pool ports to refuse a checkout, never the runner |
| **Blindly green** | Every test asserts an observable outcome; the red run proves each new test can fail | `gate:atdd-red` / `gate:nfr-red`; per-file branch coverage; "no `if (…) expect`" | **Kept out:** Story 4.6's 6 bound tests went red on `NotImplementedError` first (#32); the F8 races, the pool proofs and the `FOR UPDATE` of the breaker were each broken on purpose and failed (#32, #35, #36, #39); the axe check failed on a planted violation (#33) |

## Re-review of the earlier findings

| Finding | Review that found it | Now | What changed |
|---|---|---|---|
| HIGH-1 to HIGH-7 of the first review, seven files over 300 lines | 59 / 100 (`478e3c6`) | **Fixed, held** | No file of that split has grown past 300 |
| HIGH-8 of the first review, order dependence | 59 / 100 | **Fixed, held** | Four shuffled seeds pass in every project but `solu2-nfr` |
| MEDIUM-1 of the first review, inline rows | 59 / 100 | **Fixed, held; two more found** | MEDIUM-1 and MEDIUM-2 of this review (the `JobRun` rows, the factory copy) |
| Recommendation 1 of `727c74f`, the listing cursor's list tag | 100 / 100 (`727c74f`) | **Fixed** | #26: each list refuses the other's cursor with `RequestValidationFailed`; its tests are reviewed here |
| Recommendation 2 of `727c74f`, the benchmarks side by side | 100 / 100 | **Kept** | `solu2-nfr` runs one file at a time (#25) |
| Impl-1 LOW-4, the benchmarks' run time | open, to the CI owner | **Open, no deduction; shorter** | The indexed price read (#37) cut the VAL-2 benchmarks 3–4.5×; the 365-day history is still the longest test. The registry has no row for a benchmark's duration |

## Recommendations (no registry row, no deduction)

1. **Shapes with no factory yet.** The pending `OutboxEvent` + `EventDelivery` pair (`sys_jobs.test.ts`, twice), `CommissionLedgerEntry` (10 inline inserts over 6 files, at most 2 per file, one of them a deliberately invalid row), and `FxSourceBreaker` (a helper in `cat_breaker.test.ts`, once in `composition-catalog-listings.test.ts`) are built inline. No M2 row fires (no factory exists, and no shape repeats three times in a file), and the "comprehensive fixtures" bonus could not raise a score that is already clamped. Open decision for Mateo (below).
2. **`[S-FR-COL-5.C1]` leaves the reorder's outcome open.** Each round's reorder names only the 3 seeded entries, so it is refused when an add, move or copy takes `col:owner` first, and accepted otherwise. The test asserts `rejected.length ≤ 1`, rethrows any rejection that is not `RequestValidationFailed`, and then asserts unconditionally what the race is about: no two entries of either collection share a position, and the binder holds all 22 entries. Asserting which way the reorder went would need a conditional assertion (H3) or a fixed lock order, which would remove the race. Open decision (below).
3. **Tests that pin decided constants.** `breaker-domain.test.ts` ("the policy"), `admin-events.test.ts` (the 24 h window and 15 min stuck bound), `config.test.ts` and `[S-SYS.jobs.pool]` (`PG_POOL_MAX`) assert that a constant equals the value a decision fixed (#32, #35, #38). They are not tautologies (C3 needs a value compared to itself); each fails when the decided value changes, which is how #39's mutation "a default of 10" was caught. Open decision (below).

## Best Practices Found

1. **Red for the right reason, mechanically** (`scripts/check-atdd-red.mjs`); Story 4.6 used it end to end (#32).
2. **A mutation check for every new mechanism**: the breaker's `FOR UPDATE` (#32), the binder lock and the rate `UNIQUE` (#35), the pool timeout and the run row (#36), the pool default and minimum (#39), the planted WCAG violation (#33).
3. **Resource bounds proven without time**: `boundedPool` refuses checkout n+1 at once and reports its peak.
4. **Isolation proven, not assumed**: four shuffled seeds per project.
5. **Probes for the scanners**: each fitness rule and each `gate:no-sleep` rule first proves it flags a planted violation; `gate:evidence` was proven by three mutations (#38).

## Test File Analysis

| Project | Files | Tests | Passed | Failed | Skipped / todo | Wall time |
|---|---|---|---|---|---|---|
| `impl1-unit` | 72 | 767 | 767 | 0 | 0 | 23.3 s in `test:ci` (plus coverage: 97.56 % branches); 21.3–23.8 s shuffled |
| `solu2-atdd` | 27 | 384 | 384 | 0 | 0 | 34.8–38.2 s shuffled |
| `solu2-nfr` | 15 | 30 | 30 | 0 | 0 | one file at a time in file order; most of `test:ci`, which took 11 min 16 s in all |
| `solu2-fitness` | 2 | 12 | 12 | 0 | 0 | 11.7 s in `test:ci`; 12.2–16.1 s shuffled |
| Playwright (chromium) | 4 | 6 | 6 | 0 (0 flaky) | 0 | not re-run: this review touched no E2E file, page object or runtime setting; the last run is 6 passed (28.2 s) with the 14 axe scans (`39-pool-config-k6.log`) |
| k6 (`npm run nfr:k6`) | 1 | 2 scenarios | PASS | 0 | — | not re-run, for the same reason; the last run is PASS, profile p95 41.25 ms (`39-pool-config-k6.log`) |
| Lint-rule tests (`node --test`, `test:lint-rules`) | 1 | — | all | 0 | 0 | < 5 s |

Vitest counts each case of an `it.each` table, so its totals are higher than the block counts of the pyramid. Source: `evidence/impl2/40-test-review-rerun.log` (`test:ci` exit 0, 2026-11-07T19:57:17Z to 20:08:33Z).

## Next Steps

- **Open decisions** (Recommendations 1–3): for Mateo, by menu.
- **Follow-up (`deferred-work.md`):** Impl-1 LOW-4 (the benchmarks' run time, to the CI owner), and the pyramid's remaining gap, which the deliberate deviation above explains.
- **Re-review:** at the next phase, or after any change to the test harness.

## Decision

**Approve** (after this run's fixes; **Request Changes** at `efa178c`, for HIGH-1). The suite proves what the trace says it proves, every bound test passes, no test waits on time, no test depends on the order it runs in, no test file is over 300 lines, and no file builds a row a factory already builds. The pyramid is integration-first by the test design's choice and is documented as a deliberate deviation; the re-audit's tests widened both levels, its rules at the base and its races and bounds where only the database can prove them.
