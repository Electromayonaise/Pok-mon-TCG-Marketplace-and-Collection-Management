# Test Quality Review: the Impl-2 suite, after the remediation

*`bmad-testarch-test-review`, re-run after the remediation that decision log Impl-2 #24 approved (split the long files, reset the shared clock, use the factories, add pure unit tests where a rule was proven only through the database). It overwrites the first Impl-2 review (59 / 100, F, Request Changes; readable with `git show 478e3c6:_bmad-output/test-artifacts/test-review.md`). The review set is every committed test file: 117 files and 1,067 `it`/`test` blocks across the unit, integration, ATDD, NFR, fitness, E2E and k6 levels, plus the harness in `test-support/`. The run data is in `evidence/impl2/30-test-remediation.log`. The severities and the score come from the skill's criteria registry (`steps-c/criteria-registry.md`) and its deduction ledger, never from judgment.*

- **Reviewer:** the agent, for Mateo
- **Date:** 2026-11-04
- **Scope:** `impl1-unit` (`src/**`, `app/**`, `scripts/**` tests), `solu2-atdd`, `solu2-nfr`, `solu2-fitness`, the Playwright journeys (`_bmad-output/test-artifacts/e2e/`), the k6 script (`nfr/k6/`), the lint-rule tests, and `test-support/`
- **How each row was decided:** the mechanical rows (C1–C4, H1, H3, H5, M2, M4) by a scan of all 117 files; H4 by a shuffled run of every Vitest project with five seeds, then by reading each file that keeps state at module level; the judgment rows (M1, M3, M6, L1, L6) by reading every file the remediation added or changed, and the files the first review read.

## Executive Summary

**Score: 100 / 100 (A). Recommendation: Approve.**

0 CRITICAL, 0 HIGH, 0 MEDIUM and 0 LOW findings, plus two 5-point bonuses (deduction ledger: 100 − 0 + 10 = 110, clamped to 100). The eight HIGH findings and the MEDIUM one of the first review are fixed, and so are two more order dependences that only a shuffled run of every project found. The recommendation is computed (`step-03f`): no finding of any severity makes it **Approve**.

### What changed

- **No test file is over 300 lines** (H5). The seven long files became 23 files of 87 to 216 lines; the longest test file of the suite is now `atdd/cat_contracts.test.ts` at 294. Tests were moved, not changed: every assertion and every bracketed id is where it was, `npm run gate:ids:solu2` finds each ATDD id defined once, and `epics.md` and the trace were regenerated for the one ATDD file that moved (`rep_reads.test.ts`).
- **No test depends on its order** (H4). `composition.test.ts`'s shared clock is gone: `test-support/http-app.ts` composes a fresh app before each test, with the clock back at T0, fresh feed, TRM and scanner adapters, and an empty object store. A shuffled run of every project found two more: `atdd/sys_jobs.test.ts` advanced a shared clock too, and `pg-outbox.test.ts` asserted the value of an id from the file-wide id sequence. Both are fixed; `impl1-unit`, `solu2-atdd` and `solu2-fitness` pass shuffled with seeds 1, 2, 3, 42 and 1234, and `solu2-nfr` with seed 3 (one file at a time; Recommendation 2).
- **The factories are used** (M2). The rows the first review named, and four more of the same kind the re-scan found, now go through `test-support/solu2/fixtures.ts` (new: `failedDelivery`, `catalogSet`, `fxRate`; extended: `catalogEntry`'s `numberSort` and `pokemon`, `topUp`'s `submittedAt`).
- **The pyramid's base is wider.** 48 pure unit tests (no database; 45 under 10 ms, and 18–36 ms for the first test of the three files that load the fetch classes) prove rules of the Impl-2 code that only database-backed tests proved: the job runner and the job route, the sign-up and sign-in guard in front of Better Auth, the listing keyset cursor, the moderation-log merge, the destination after sign-in, the binder page's parameters, the API client, and the binder-sort, reorder and read-mark rules (three of them extracted from the services into the domain). Each group was broken once on purpose and its tests failed (§ The pure unit tests). Impl-2's own additions are now 59.1 % unit (43.1 % before).
- **The benchmarks run one file at a time** (agent default, Recommendation 2). Side by side, the order Vitest picked decided whether `[NFR-IDN-1.*]` passed; `solu2-nfr` now has `fileParallelism: false`, and the gate's benchmark step takes about 15 minutes instead of 5.
- **Lint is clean.** The three unused variables of the Impl-1 LOW-2 were removed; `npm run lint` reports 0 warnings.

### Key Strengths

- **No timed wait anywhere.** `npm run gate:no-sleep` checks 346 files on every push and first proves each of its 7 rules on a planted violation. Lock waits read `pg_stat_activity` (`test-support/locks.ts`), races start on a barrier (`test-support/concurrency.ts`), the E2E journeys use web-first assertions only, and k6 runs at a fixed arrival rate with no `sleep()`.
- **Red for the right reason, mechanically.** `gate:atdd-red:impl1` and `gate:nfr-red:impl1` read the JSON reports: every test of a `done` story must pass, and every other one must fail on `NotImplementedError`.
- **Every domain core is covered, file by file.** `test:unit` fails if any file of `src/modules/*/domain/**` is under 90 % branches (97.48 % overall in this run).
- **Real databases, real races; and now isolation proven by shuffling.** The ATDD and colocated integration tests run on PostgreSQL 16 with one database per file, truncated before each test; the concurrency proofs race 50 real connections; nothing under test is faked. Every Vitest project passes in shuffled orders (five seeds; the benchmarks with one, one file at a time).
- **Page Objects only.** The 4 specs reach the DOM only through the 7 Page Objects in `e2e/pages/`, with role and label locators.
- **No skipped, focused or todo test** in any project.

### Key Weaknesses

- None the registry scores. Two observations without a registry row are under Recommendations: the listing keyset cursor carries no list tag, and the NFR benchmarks, which ran side by side and now run one file at a time.

## Quality Criteria Assessment

| Criterion | Registry rows | Status | Notes |
|---|---|---|---|
| BDD format | L5 | ✅ PASS | Each acceptance test starts with its bracketed id and states what must hold; each new unit test names the rule it proves; each journey title is a user story |
| Test ids | L3 | ✅ PASS | The ATDD and NFR ids are bound to stories in `epics.md` (419, each defined once); the E2E locators are role- and label-based |
| Priority markers | L2 | ✅ PASS (n/a) | The repo uses no in-test priority convention (0 of 117 files); priorities live in the risk register |
| Hard waits | H1 | ✅ PASS | 0 (`gate:no-sleep`, and a scan for `setTimeout`, `waitForTimeout`, `pg_sleep`, `sleep(`) |
| Determinism | H2, H3, C6 | ✅ PASS | A virtual clock and sequential ids in every project; 0 conditional assertions; every loop that asserts runs over a literal or over a list whose length is asserted first |
| Isolation | H4, C5 | ✅ PASS | Fixed: `composition-*.test.ts` (a fresh app per test), `atdd/sys_jobs.test.ts` (the clock reset in a `beforeEach`), `pg-outbox.test.ts` (its own id generator). Every module-level mutable value left (`idn_auth`'s capture and clock, the composed app's session counter, `api.test.ts`'s call list) is reset before each test or never read by an assertion. Shuffled with seeds 1, 2, 3, 42 and 1234, `impl1-unit`, `solu2-atdd` and `solu2-fitness` pass; `solu2-nfr` passes shuffled with seed 3 when its files run one at a time. No test asserts against a mock it configured (C5): the new tests assert what the unit returned or wrote |
| Fixture patterns | M2, M5 | ✅ PASS | No file builds a row of a factory's shape inline, and no shape repeats three times in a file. The two inline `CollectionEntry` rows left (`atdd/col_contracts.test.ts:189–190`) are deliberately invalid rows probing a CHECK, which no factory may build |
| Data factories | M2 | ✅ PASS | As above |
| Network-first | M1 | ✅ PASS | Each journey seeds its rows before it navigates, and reads data-dependent content only through a web-first assertion |
| Explicit assertions | C3, C4, M6 | ✅ PASS | 0 tautologies; every block asserts; no unawaited `.rejects`/`.resolves` |
| Test length (≤ 300 lines) | H5 | ✅ PASS | 0 files over 300 lines (the longest is 294) |
| Test duration | H1, M1 | ✅ PASS | No row fires; the slow tests are the PRD §7 benchmarks (LOW-4 of Impl-1, below) |
| Flakiness patterns | H1–H4, M1, M6 | ✅ PASS | No hard wait, wall-clock fixture, conditional assertion or order dependence |
| Disabled or focused tests | C1, C2 | ✅ PASS | 0 |

## Quality Score Breakdown

| Item | Count | Points |
|---|---|---|
| Starting score | | 100 |
| CRITICAL × 10 | 0 | 0 |
| HIGH × 5 | 0 | 0 |
| MEDIUM × 2 | 0 | 0 |
| LOW × 1 | 0 | 0 |
| Bonus: excellent BDD (every test name states behaviour) | | +5 |
| Bonus: perfect isolation (H4 and C5 fire nowhere; every Vitest project passes shuffled) | | +5 |
| Bonus: comprehensive fixtures, data factories, network-first, all test ids | | 0 (inline seed rows of tables with no factory remain, such as `CommissionLedgerEntry`; real network by design; role locators, not test ids) |
| **Total** | | **110, clamped to 100 (A)** |

The recommendation is computed (`step-03f`): 0 CRITICAL, 0 HIGH, a score of at least 70 and no finding make it **Approve**.

## Critical Issues (Must Fix)

None.

## The remediation, finding by finding

### HIGH-1 to HIGH-7. The seven long files, split (H5): fixed

| Was | Lines | Now (lines) |
|---|---|---|
| `src/server/composition.test.ts` | 1,038 | `composition-access` (155), `-verification` (122), `-catalog-listings` (176), `-orders` (116), `-commission` (135), `-messaging-trading` (125), `-collections` (150), `-reputation` (87); the harness `test-support/http-app.ts` (73) |
| `src/modules/identity/application/ver.v2.test.ts` | 559 | `ver.v2-submit` (208), `ver.v2-decide` (174), `ver.v2-reads` (181); `test-support/suites/ver.ts` |
| `src/modules/listings/application/inv.v2.test.ts` | 429 | `inv.v2-reserve` (141), `inv.v2-manage` (216), `inv.v2-moderation` (89); `test-support/suites/inv.ts` |
| `src/modules/commission/application/com.v2.test.ts` | 407 | `com.v2-account` (129), `com.v2-topups` (119), `com.v2-admin` (164); `test-support/suites/com.ts` |
| `src/modules/catalog/application/cat.v2.test.ts` | 369 | `cat.v2-feed` (199), `cat.v2-prices` (169); `test-support/suites/cat.ts` |
| `_bmad-output/test-artifacts/atdd/rep_contracts.test.ts` | 324 | `rep_contracts` (173: REP-1, its mirrors, REP-2), `rep_reads` (134: REP-3, S-FR-REP-6, S-FR-REP-7); `test-support/suites/rep.ts` |
| `src/modules/collections/application/col.v2.test.ts` | 312 | `col.v2-entries` (110), `col.v2-binder` (214) |

Each file is split by procedure or use case. The bodies were moved by a script that copies line ranges and keeps only the imports each file uses; the shared Given steps moved verbatim into a `use<Module>Suite()` factory (it registers the per-file database, so each test body is unchanged). The `it` blocks per group are the same before and after (67, 46, 30, 28, 27, 27 and 18), and so is the whole `impl1-unit` and `solu2-atdd` count. The helpers live in `test-support/`, not next to the services, because a non-test file under `src/` is product code to the `tezg/*` lint rules.

### HIGH-8. `composition.test.ts`'s shared clock (H4): fixed, and two more found

- **The fix.** `useComposedApp()` (`test-support/http-app.ts`) composes the app in a `beforeEach`: the clock is set back to T0, the object store is emptied, and the feed, TRM and scanner adapters (which hold fault switches and call counters) are new. Better Auth is built afresh too. Nothing a test does can reach the next one.
- **Proof.** Before: `npx vitest run --project impl1-unit src/server/composition.test.ts --sequence.shuffle --sequence.seed=3` failed 3 of 67. After: the eight files pass shuffled with seeds 1, 2, 3, 42 and 1234 (71 of 71 with `pg-outbox.test.ts`).
- **Every project, shuffled.** With seed 3, `impl1-unit` failed one more test and `solu2-atdd` one:
  - `src/shared-kernel/infra/pg-outbox.test.ts` asserted that the event id is the first id of a fresh sequence, but `wiring(db)` shares one id sequence per file (by design: a loop's fresh services never reuse a row id), so another test running first moved it. The test now gives the outbox its own `SequentialIds`; the assertion is unchanged.
  - `atdd/sys_jobs.test.ts` shares one virtual clock and two tests advance it by 1 ms; `[S-SYS.jobs.h]` failed with the instants 1 ms late. A `beforeEach` now sets the clock to T0, as `idn_auth.test.ts` already did.
- **After the fixes,** `impl1-unit`, `solu2-atdd` and `solu2-fitness` pass shuffled with each of the five seeds. `solu2-nfr` passes shuffled with seed 3 when its files run one at a time (`--no-file-parallelism`, 30 of 30 in 878 s); with the default file parallelism the shuffled file order put `idn1_latency` beside the heavy benchmarks, and its three p95 thresholds failed (Recommendation 2).

### MEDIUM-1. Inline rows where a factory exists or the shape repeats (M2): fixed

- `atdd/cat_contracts.test.ts`: the 6 `CatalogEntry` rows use `catalogEntry()` (extended with `numberSort` and `pokemon`), the `CatalogSet` row `catalogSet()`, and the 2 `FxRate` rows the new `fxRate()`.
- `composition-*.test.ts`: the 5 `OutboxEvent` + `EventDelivery` pairs use the new `failedDelivery()`; `Collection`, `CollectionEntry` and `Review` use `collection()`, `entry()` and `review()`; the four inline `inventory.create` inputs of `composition-catalog-listings.test.ts` are one `listingInput`.
- `cat.v2-*.test.ts`: the 5 `FxRate` rows use `fxRate()`, the 3 `CatalogSet` rows `catalogSet()`, and the browse entries `catalogEntry()`.
- `com.v2-account.test.ts` and `com.v2-topups.test.ts`: the paging loops' `TopUpRequest` rows use `topUp()` (extended with `submittedAt`).

## The pure unit tests (decision log Impl-2 #24)

*Each group asserts an observable outcome (a return value, a response, the calls a port received) and never fakes the unit under test; the fakes stand at the unit's ports (the job repository and locks, Better Auth's handler, identity's throttle port, `fetch`). Each group was proven able to fail: the code was broken once, the group's tests ran and failed, and the file was restored (`evidence/impl2/30-test-remediation.log`, "Mutation checks").*

| Group | Rule (Impl-2 code) | Tests | File | Broken on purpose | Result |
|---|---|---|---|---|---|
| Job runner | One JobRun row per run; `running` before the work; the outcome, error code and Clock instants it ends with; single-flight; `jobErrorCode` (Story 1.6) | 6 | `src/shared-kernel/job-runner.test.ts` | `jobErrorCode` without the NotImplemented branch; `finishedAt = startedAt` | Failed: 2 of 6, then 1 of 6 |
| Job route | Bearer, method, job name and trigger refused before a run; a failed run is a 500 with no trace of its error (S-9) | 5 | `src/server/jobs.test.ts` | the trigger rule without the job's own triggers; the trailing-slash rule | Failed: 1 of 5, then 1 of 5 |
| Auth guard | Sign-up's consent and body rules, the throttle before the password, what is forwarded and what is counted (AD-IDN-3) | 8 | `src/server/auth-routes.test.ts` | the consent-version check; the stale `content-length`; the 401-only record | Failed: 1 of 8 each time |
| Cursors | The listing keyset (owner list, moderation log) and the top-up keyset round-trip and refuse foreign shapes | 4 | `inv-domain.test.ts`, `com-domain.test.ts` | the extra-part check of `decodeListingCursor` | Failed: 1 of 11 in the file |
| Moderation-log merge | The id breaks a tie across the two logs; a smaller limit keeps the newest rows of both (AD-REP-3 rule 5) | 1 | `src/server/moderation-log.test.ts` | a tie broken by log kind | Failed: 1 of 3 |
| Destination | `?siguiente=` refuses NUL, DEL and C1 controls, and another port (F1) | 2 | `app/ingresar/destination.test.ts` | the control-character class reduced to `\s` | Failed: 1 of 6 |
| Binder and read state | At most 3 distinct sort keys; a reorder names each entry once; a read mark only moves forward; `?orden=`, `?pagina=`, the source badge and the https-only image (S-FR-COL-5, AD-MSG-3) | 7 | `col-domain.test.ts`, `msg-domain.test.ts`, `app/coleccion/binder.test.ts` | the repeat check; the length check; the clamp; the 3-key cut | Failed: 1 of 21, 1 of 21, 1 of 9, 1 of 4 |
| API client | One procedure per request; a refusal keeps its status and body; a lost connection is status 0; `{hora}` in Bogotá | 3 | `app/_client/api.test.ts` | `ok` without a result | Failed: 1 of 3 |
| Identity and other domain rules | `throttleRefusal` and the OQ-11 limits; `rejectionSnapshot`; `detailState` and `ownerCheck`; `observedAtOf`; `isComprobanteUploadKey`; `waMeUrl`; `bogotaDayStart`; `purchaseVerifiedFor` | 12 | the module's `*-domain.test.ts` | the latest-`retryAt` rule; the comprobante key's segment rule; the cooldown | Failed: 1 of 11, 1 of 15, 1 of 30 |

Three rules were extracted from the services into the domain so a pure test can reach them, with the service calling the extracted function and its integration tests unchanged: `isBinderSort` and `isExactOrder` (`collections/domain/col.ts`, from `getBinder` and `reorderEntries`), and `readMarkAdvances` (`messaging/domain/msg.ts`, from `markRead`). The domain purity gate and the per-file 90 % branch rule hold on both files.

## The pyramid (70 / 20 / 10 + NFR)

*Counted as before: `it`/`test` blocks (an `it.each` table counts once; a k6 scenario counts once). Unit = the colocated `*-domain.test.ts` and other pure tests (no database); integration = the database-backed colocated tests, the fitness and fixture proofs, and the ATDD contracts; E2E = Playwright; NFR = the PRD §7 benchmarks and the k6 scenarios. "Added by Impl-2" is the blocks now minus those at `a7c5d81` (no file lost blocks). The counts are by a script this time (a file is integration when it registers a test database); recounted the same way, the first review's state is 236 / 745 / 6 where its hand count said 234 / 744 / 6, so its percentages stand to 0.2 points.*

| Level | Impl-2 before | Impl-2 after | Share before → after | Whole suite before | Whole suite after | Share before → after | Target |
|---|---|---|---|---|---|---|---|
| Unit | 53 | 101 | 43.1 % → 59.1 % | 236 | 284 | 23.9 % → 27.4 % | 70 % |
| Integration | 64 | 64 | 52.0 % → 37.4 % | 745 | 745 | 75.5 % → 72.0 % | 20 % |
| E2E | 6 | 6 | 4.9 % → 3.5 % | 6 | 6 | 0.6 % → 0.6 % | 10 % |
| NFR (separate layer) | 9 | 9 | — | 32 | 32 | — | separate |
| **Total** | **132** | **180** | | **1,019** | **1,067** | | |

**Reading.** Impl-2's own additions moved from 43.1 % to 59.1 % unit; the whole suite from 23.9 % to 27.4 %. Neither reaches 70 %, and the remaining gap is not closed by padding: the integration count did not change, because every integration test proves a clause, a race or a boundary on the real schema (the next section), and a unit copy of it would prove less.

### Deliberate deviation

The suite is integration-first by design, not by neglect. Test-design.md §3 allocates the levels that way: "Most P0 risks are races, retries and boundaries that only the database can arbitrate, such as conditional updates, partial unique indexes and `FOR UPDATE` order. A unit test over a mock would pass on code that oversells." So each contract clause is proven by an ATDD test on PostgreSQL 16, and the 70 / 20 / 10 shape, which assumes the logic lives in code a unit test can reach, does not fit a system whose P0 invariants live in SQL. The base is kept as wide as the code allows: every domain core is held at ≥ 90 % branches per file, and the remediation added pure tests wherever a rule of the Impl-2 code could be reached without a database (and extracted three that could not). It is not an ice-cream cone: E2E stays at 6 journeys (0.6 % of the suite), each proving only that the pages wire rules together, and every rule a journey touches is proven below it. The shape is a diamond with a wide, fast base.

## The four testing traps

| Trap | The rule (test-design.md §7.5) | What enforces it | Instances found or fixed |
|---|---|---|---|
| **Ice cream cone** | A behaviour is proven at the lowest level that can prove it | The E2E specs assert journeys; the rules are bound tests in ATDD or the domain tests; per-file branch coverage | None. 6 E2E tests against 165 unit and integration tests added by Impl-2. The remediation moved the base, not the top |
| **Flaky sleeper** | Waits are on a condition, never on time | `npm run gate:no-sleep` in `test:ci`; `untilBlockedOnLock` and the `race` barrier; web-first assertions; k6 at a constant arrival rate | Fixed in Flow C (#8) and kept out (#22), as the first review recorded. **New:** order dependence is the other source of random failure; three files had it and a five-seed shuffled run now proves none does |
| **Mocking mirage** | The unit under test is never faked; fakes stand only at module seams and external ports | The ATDD projects run on PostgreSQL 16; `gate:atdd-red`; the E2E journeys run the production build | **Kept out:** the new auth-guard tests fake Better Auth's handler and identity's throttle port, the seams around `serveAuth`, and never `serveAuth`; the job-route tests use the real identity gate and the real JobRunner over in-memory ports |
| **Blindly green** | Every test asserts an observable outcome; the red run proves each new test can fail | `gate:atdd-red` / `gate:nfr-red`; per-file branch coverage; "no `if (…) expect`" | **Fixed during the remediation:** a first draft of the sign-up test asserted the forwarded `content-length` without sending one, so it could not fail; it now sends the browser's length and proves it is dropped. Each group of new tests was broken once on purpose (table above) |

## Re-review of the earlier findings

| Finding | First Impl-2 review | Now | What changed |
|---|---|---|---|
| HIGH-1 to HIGH-7, seven files over 300 lines | open | **Fixed** | 23 files of 87–216 lines; no test file over 300 |
| HIGH-8, `composition.test.ts` order dependence | open | **Fixed** | A fresh composed app per test; five shuffled seeds pass |
| MEDIUM-1, inline rows | open | **Fixed** | The factories, three new and two extended |
| Impl-1 LOW-2, three unused variables | open | **Fixed** | Removed; lint has 0 warnings |
| Impl-1 LOW-3, the shared composed app | became HIGH-8 | **Fixed** | As HIGH-8 |
| Impl-1 LOW-4, the VAL benchmarks' run time | open, to the CI owner | **Open, no deduction; longer now** | `solu2-nfr` now runs one file at a time (Recommendation 2), about 15 minutes of the gate instead of 5. The registry has no row for a benchmark's duration |

## Recommendations (no registry row, no deduction)

1. **The listing keyset cursor carries no list tag.** `decodeListingCursor` (`listings/domain/inv.ts`) decodes the cursors of both `inventory.mine` and `inventory.admin.log`, so a cursor of one list is accepted by the other (unlike `encodeReviewCursor`, which tags its list). No data leaks (the admin log is admin-only and keyed by its own columns), but a client can page one list with the other's cursor. A tag, as REP's, would refuse it. **Fixed after this review** (decision log #26, `dc47a0d` red, `58aa73e` green): each list now refuses the other's cursor with `RequestValidationFailed`.
2. **The NFR benchmarks ran side by side, and the order decided whether they passed (fixed here, at a cost in time).** Shuffled with seed 3, `solu2-nfr` failed three p95 thresholds in each of three runs: `[NFR-IDN-1.*]` at 52.8–108.2 ms against 50 ms (4.2–13.1 ms in the close's run), with `NFR-MSG-1.contact` and `NFR-COM-3.deduction` in some runs. Then `test:ci` in file order failed the same way twice, because Vitest's default sequencer runs the files that failed last first, and with no cache at all it orders by size: either way `idn1_latency` started beside the benchmarks seeding the §3 marketplace. The benchmarks share no state, so no H4 row fires; they measured each other's load, which the PRD §7 protocol (an otherwise idle reference machine) excludes. One file at a time the project passes shuffled (30 of 30, 878 s). **Agent default:** `vitest.config.ts` gives `solu2-nfr` `fileParallelism: false`, so the gate's benchmark step takes about 15 minutes instead of 5 (within the `gate` job's 30-minute timeout). The cheaper alternative, for the CI owner to weigh with Impl-1 LOW-4: `maxWorkers: 2` with the heavy benchmarks (`[NFR-COM-2.drift]`, the VAL ones) in a project of their own.

## Best Practices Found

1. **Red for the right reason, mechanically** (`scripts/check-atdd-red.mjs`).
2. **A mutation check for every new group of tests** (`30-test-remediation.log`): each group was proven by breaking the code it guards.
3. **Isolation proven, not assumed**: every Vitest project passes in shuffled orders (five seeds; the benchmarks one file at a time).
4. **Probes for the scanners**: each fitness rule and each `gate:no-sleep` rule first proves it flags a planted violation.
5. **Traces as evidence**: one `trace.zip` per journey (`evidence/impl2/traces/`).

## Test File Analysis

| Project | Files | Tests | Passed | Failed | Skipped / todo | Wall time |
|---|---|---|---|---|---|---|
| `impl1-unit` | 70 | 726 | 726 | 0 | 0 | 29.6 s in `test:ci` (plus coverage: 97.48 % branches) |
| `solu2-atdd` | 25 | 373 | 373 | 0 | 0 | 35.3 s (shuffled, seed 3) |
| `solu2-nfr` | 15 | 30 | 30 | 0 | 0 | 878 s shuffled, one file at a time; `test:ci` in all took 15.5 minutes |
| `solu2-fitness` | 2 | 12 | 12 | 0 | 0 | 11.9 s |
| Playwright (chromium) | 4 | 6 | 6 | 0 (0 flaky) | 0 | 24.0 s |
| k6 (`npm run nfr:k6`, the committed summary) | 1 | 2 scenarios, 12,002 requests | 12,002 checks | 0 | — | 60 s per scenario (not re-run: no code under load changed) |
| Lint-rule tests (`node --test`, `test:lint-rules`) | 1 | — | all | 0 | 0 | < 5 s |

Vitest counts each case of an `it.each` table, so its totals are higher than the block counts of the pyramid. Source: `evidence/impl2/30-test-remediation.log`.

## Next Steps

- **Follow-up (`deferred-work.md`):** the listing cursor's list tag (Recommendation 1, since fixed by #26), Impl-1 LOW-4 (the benchmarks' run time, to the CI owner), and the pyramid's remaining gap, which the deliberate deviation above explains.
- **Re-review:** at the next phase, or after any change to the test harness.

## Decision

**Approve.** The suite proves what the trace says it proves, every bound test passes, no test waits on time, no test depends on the order it runs in, and no test file is over 300 lines. The pyramid is integration-first by the test design's choice and is documented as a deliberate deviation; its base is wider by 48 pure tests that each failed when the code they guard was broken.
