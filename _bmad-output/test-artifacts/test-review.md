# Test Quality Review: the Impl-2 suite

*`bmad-testarch-test-review` at the Impl-2 close (decision log Impl-2 #5: `impl1-test-review.md` became this file, and this review overwrites it; the Impl-1 version is `git show 31999bc:_bmad-output/test-artifacts/impl1-test-review.md`). The review set is every committed test file at the close: 97 files and 1,014 `it`/`test` blocks across the unit, integration, ATDD, NFR, fitness, E2E and k6 levels, plus the harness in `test-support/`. The run data comes from the run recorded in `traceability-matrix.md` §10. The severities and the score come from the skill's criteria registry (`steps-c/criteria-registry.md`) and its deduction ledger, never from judgment. The review is a report: it changed no test.*

- **Reviewer:** the agent, for Mateo
- **Date:** 2026-11-04
- **Scope:** `impl1-unit` (`src/**`, `app/**`, `scripts/**` tests), `solu2-atdd`, `solu2-nfr`, `solu2-fitness`, the Playwright journeys (`e2e/`), the k6 script (`nfr/k6/`), the lint-rule tests, and `test-support/`
- **How each row was decided:** the mechanical rows (C1–C4, H1, H3, H5, M2, M4) by a scan of all 97 files; the judgment rows (H4, M1, M3, M6, L1, L6) by reading every test Impl-2 added or changed (`git diff a7c5d81..HEAD`) and the Impl-1 findings' files. Impl-1 tests outside those files were not re-read for the judgment rows.

## Executive Summary

**Score: 59 / 100 (F). Recommendation: Request Changes.**

0 CRITICAL, 8 HIGH, 3 MEDIUM and 0 LOW findings, plus one 5-point bonus (deduction ledger: 100 − 8 × 5 − 3 × 2 + 5 = 59). Seven HIGH findings are files over 300 lines (H5); the eighth is a real order dependence in `composition.test.ts` (H4), proven by a shuffled run. No finding is a test that cannot fail, and no bound test is wrong: the CRITICAL rows (disabled, focused, tautological, assertion-free, self-mocking, unreachable) and the hard-wait and conditional-assertion rows fire nowhere. The recommendation is computed: any HIGH makes it **Request Changes**. All eight HIGH fixes are mechanical (split seven files, reset one clock); with them, the score would be 99 (A), **Approve with Comments**.

### Key Strengths

- **No timed wait anywhere.** `npm run gate:no-sleep` checks 319 files on every push and first proves each of its 7 rules on a planted violation. Lock waits read `pg_stat_activity` (`test-support/locks.ts`), races start on a barrier (`test-support/concurrency.ts`), the E2E journeys use web-first assertions only, and k6 runs at a fixed arrival rate with no `sleep()`.
- **Red for the right reason, mechanically.** `gate:atdd-red:impl1` and `gate:nfr-red:impl1` read the JSON reports: every test of a `done` story must pass, and every other one must fail on `NotImplementedError`. Every Impl-2 Flow A story recorded that red run before its code (`evidence/impl2/*-red.log`).
- **Every domain core is covered, file by file.** `test:unit` fails if any file of `src/modules/*/domain/**` is under 90 % branches (96.48 % overall in this run).
- **Real databases, real races.** The ATDD and colocated integration tests run on PostgreSQL 16 with one database per file, truncated before each test; the concurrency proofs race 50 real connections; nothing under test is faked (fakes stand only at module seams and external ports).
- **Page Objects only.** The 4 specs reach the DOM only through the 7 Page Objects in `e2e/pages/`, with role and label locators; `gate:no-sleep` refuses a locator built in a spec.
- **No skipped, focused or todo test** in any project (`tools/lint/tezg-plugin.test.mjs:16` assigns `RuleTester.itOnly = it.only`, a harness hook that focuses nothing).

### Key Weaknesses

- **Seven test files exceed 300 lines** (H5, HIGH under the registry), against four at the Impl-1 close. The Impl-1 review graded this LOW, which the registry does not allow: its severity is fixed at HIGH. That correction alone moves the score by 35 points.
- **One file depends on its test order** (H4, HIGH): Story 13.5's HTTP test advances the shared clock of `composition.test.ts`, and a shuffled run fails 3 tests.
- Three files build the same domain rows inline although a factory exists or the shape repeats (M2).
- The suite is integration-heavy: by `it` blocks, 23.8 % / 75.6 % / 0.6 % for unit / integration / E2E (§ The pyramid).

## Quality Criteria Assessment

| Criterion | Registry rows | Status | Notes |
|---|---|---|---|
| BDD format | L5 | ✅ PASS | Each acceptance test starts with its bracketed id and states what must hold; each journey title is a user story |
| Test ids | L3 | ✅ PASS | The ATDD and NFR ids are bound to stories in `epics.md`; the E2E locators are role- and label-based, which satisfies L1/L3 |
| Priority markers | L2 | ✅ PASS (n/a) | The repo uses no in-test priority convention; priorities live in the risk register (0 of 97 files) |
| Hard waits | H1 | ✅ PASS | 0 (`gate:no-sleep`, and a scan for `setTimeout`, `waitForTimeout`, `pg_sleep`, `sleep(`) |
| Determinism | H2, H3, C6 | ✅ PASS | A virtual clock and sequential ids in every project; the only `Date.now()` / `new Date()` in a test are the scanner probe's input strings (`sys_fitness.test.ts:81`); 0 conditional assertions (the one Impl-1 instance was fixed in #9); every loop that asserts runs over a literal or over a list whose length is asserted first |
| Isolation | H4, C5 | ❌ FAIL | H4 in `composition.test.ts` (HIGH-8): a shared virtual clock advanced in one test leaks into others when the order changes. Every other file builds its fixtures per test on a database truncated before each test; no test asserts against a mock it configured (C5) |
| Fixture patterns | M2, M5 | ⚠️ WARN | M2 in 3 files (MEDIUM-1) |
| Data factories | M2 | ⚠️ WARN | The same 3 files |
| Network-first | M1 | ✅ PASS | Each journey seeds its rows before it navigates, and reads data-dependent content only through a web-first assertion, which retries until the server-rendered data is present; no step acts on data before such an assertion |
| Explicit assertions | C3, C4, M6 | ✅ PASS | 0 tautologies; every block asserts (`expect`, `explainAssert`, or a web-first `expect`); no unawaited `.rejects`/`.resolves` |
| Test length (≤ 300 lines) | H5 | ❌ FAIL | 7 files (HIGH-1 to HIGH-7) |
| Test duration | H1, M1 | ✅ PASS | No row fires; the slow tests are the PRD §7 benchmarks (LOW-4 of Impl-1, re-reviewed below) |
| Flakiness patterns | H1–H4, M1, M6 | ❌ FAIL | Only H4 (HIGH-8); no hard wait, wall-clock fixture or conditional assertion |
| Disabled or focused tests | C1, C2 | ✅ PASS | 0 |

## Quality Score Breakdown

| Item | Count | Points |
|---|---|---|
| Starting score | | 100 |
| CRITICAL × 10 | 0 | 0 |
| HIGH × 5 | 8 | −40 |
| MEDIUM × 2 | 3 | −6 |
| LOW × 1 | 0 | 0 |
| Bonus: excellent BDD (every test name states behaviour) | | +5 |
| Bonus: comprehensive fixtures, data factories, network-first, perfect isolation, all test ids | | 0 (M2 in 3 files; inline seed rows; real network by design; HIGH-8; role locators, not test ids) |
| **Total** | | **59 (F)** |

The recommendation is computed (`step-03f`): a HIGH violation makes it **Request Changes** whatever the score.

## Critical Issues (Must Fix)

None.

## Recommendations (Should Fix)

### HIGH-1 to HIGH-7. Seven test files exceed 300 lines (H5)

| File | Lines | At the Impl-1 close |
|---|---|---|
| `src/server/composition.test.ts` | 1,038 | 892 |
| `src/modules/identity/application/ver.v2.test.ts` | 559 | 558 |
| `src/modules/listings/application/inv.v2.test.ts` | 429 | 318 |
| `src/modules/commission/application/com.v2.test.ts` | 407 | 253 |
| `src/modules/catalog/application/cat.v2.test.ts` | 369 | 369 |
| `_bmad-output/test-artifacts/atdd/rep_contracts.test.ts` | 324 | 289 |
| `src/modules/collections/application/col.v2.test.ts` | 312 | 107 |

Each groups one module's use cases (`composition.test.ts` groups the HTTP wiring of every story). The fix is mechanical: split each by procedure or story into files under 300 lines, with the shared setup in a helper next to them; no assertion changes. **Owner:** to decide at the close (the main agent's menu).

### MEDIUM-1. Inline rows where a factory exists or the shape repeats (M2)

- `atdd/cat_contracts.test.ts` builds `CatalogEntry` rows inline 6 times although `catalogEntry()` exists in `test-support/solu2/fixtures.ts`.
- `src/server/composition.test.ts` builds `OutboxEvent` and `EventDelivery` 5 times each, `Collection` 4 times, `Review` and `CollectionEntry` 3 times each.
- `src/modules/catalog/application/cat.v2.test.ts` builds `FxRate` 5 times and `CatalogSet` 3 times.

**Fix:** factories for the repeated shapes in `fixtures.ts`, and `catalogEntry()` where it already applies.

### HIGH-8. `composition.test.ts` depends on its test order: a shared clock is advanced and never reset (H4)

- **Where:** `src/server/composition.test.ts:1015` and `:1032`, Story 13.5's HTTP test (added in Impl-2), call `clock.advance(60_000)` on the module-level `VirtualClock` that every test of the file shares (`:34–:40`), with no `beforeEach` reset. Several earlier tests assert absolute instants derived from `T0`.
- **Proof:** in file order the test runs last and the file passes. Shuffled, it does not: `npx vitest run --project impl1-unit src/server/composition.test.ts --sequence.shuffle --sequence.seed=3` fails 3 of 67 tests (`completeIndividualProfile` at `:90`, `orders.create` at `:509`, the inbox at `:744`), each on an instant 120 s late; seeds 1 and 2 pass. This is the leak Impl-1's LOW-3 predicted ("a later test that advances it … would leak into the tests after it").
- **Fix:** reset the clock to `T0` in a `beforeEach`, or give the Story 13.5 test its own clock and composed app. One line either way; no assertion changes.
- **Owner:** to decide at the close, with HIGH-1 to HIGH-7.

## The four testing traps

| Trap | The rule (test-design.md §7.5) | What enforces it | Instances found or fixed during Impl-2 |
|---|---|---|---|
| **Ice cream cone** | A behaviour is proven at the lowest level that can prove it; a journey proves only that the pages wire rules together | The E2E specs assert journeys; the rules are bound tests in ATDD or the domain tests (each spec's header names them); per-file branch coverage makes the domain tests carry the logic | None. 6 E2E tests against 117 unit and integration tests added by Impl-2: the cone is not inverted. The pyramid's base is narrower than 70 % (below) |
| **Flaky sleeper** | Waits are on a condition, never on time | `npm run gate:no-sleep` in `test:ci` (refuses `waitForTimeout`, `time.sleep`, `pg_sleep`, `sleep(n)`, promise sleeps, and a locator in a spec; each rule proven on a planted violation); `untilBlockedOnLock` and the `race` barrier; web-first assertions; k6 at a constant arrival rate | **Fixed by Flow C (#8):** two 200 ms "still blocked?" sleeps (`ver.v2.test.ts`, `inv.v2.test.ts`) now wait on `pg_stat_activity`, and a mutation check proves the new wait fails when the lock is removed (`evidence/impl2/02-flowC-lock-mutation.log`); three 1–5 ms `setTimeout` interleavings in `db.test.ts` became gates the test opens; the `pg_sleep(0.05)` in `dispatcher.test.ts` became a held lock; the 3 s deadlock watchdog timer in seven files became `test-support/single-connection.ts`. **Kept out (#22):** the k6 script has no `sleep()`; a fixed arrival rate and a `setup()` warm-up replaced a closed-loop burst |
| **Mocking mirage** | The unit under test is never faked; fakes stand only at module seams and external ports; contract tests run on real Postgres | The ATDD projects run on PostgreSQL 16 with no in-memory database; `gate:atdd-red` rejects a failure other than `NotImplementedError`, so a test cannot pass through a fake of the code it names; the E2E journeys run against the production build and a migrated database | **Avoided (#12):** Story 2.6's red tests run through the real Better Auth handler behind the platform's guard, not a fake of it. **Found by the review (#23, F2):** the Story 2.6 deferral said a production sign-up "fails as NotImplemented (500)"; the new test `[S-FR-IDN-7.signup.unwired]`, run through the real handler, got **200** (Better Auth swallowed the email error and committed the account). The claim had been reasoned, not run; the test now proves no `User`, `Account` or throttle row |
| **Blindly green** | Every test asserts an observable outcome; the red run proves each new test can fail | `gate:atdd-red` / `gate:nfr-red` (each bound test failed for the right reason before its story); per-file ≥ 90 % branch coverage of the domain cores; the briefing's rule "no `if (…) expect`" | **Fixed (#9):** an Impl-1 composer test asserted only under a condition that never held; it is two unconditional assertions now. **Fixed (#21):** the first `[S-FR-REP-7.C1]` still passed with the profile read broken to `READ COMMITTED`; it was strengthened (4 admins hiding and unhiding against 4 readers) and fails 3 of 3 runs on the broken code. **Fixed (#8):** `turnVerdict`, dead since Impl-1 #35, was removed rather than given a test that would have padded the coverage. **Fixed (#23, F2):** the sign-up test above replaced a claim with a measurement |

## Re-review of the Impl-1 findings

| Impl-1 finding | Then | Now | What changed |
|---|---|---|---|
| MEDIUM-1 `ver.v2.test.ts:549` lock wait after a 200 ms sleep | open | **Fixed** | Flow C (#8): `untilBlockedOnLock` waits until `pg_stat_activity` shows the blocked statement with `wait_event_type = 'Lock'`, bounded by a probe count; the mutation check proves it fails without the `FOR SHARE` |
| MEDIUM-2 `inv.v2.test.ts:293`, the same | open | **Fixed** | The same helper (6 uses in the suite now) |
| MEDIUM-3 the deadlock watchdog copied into seven files | open | **Fixed** | `test-support/single-connection.ts`, a pool of one connection that refuses a second checkout at once, used by 8 files; 0 copies left |
| LOW-1 four files over 300 lines | open | **Worse, and re-graded HIGH** | Seven files now (HIGH-1 to HIGH-7); the registry fixes H5 at HIGH, so the Impl-1 grade was wrong |
| LOW-2 three unused variables in ATDD files | open | **Open** | Still the same three ESLint warnings (`com_supporting.test.ts:23`, `inv_contracts.test.ts:9`, `ver_supporting.test.ts:17`). The registry has no row for an unused variable, so it is reported here without a deduction (rule 1) |
| LOW-3 `composition.test.ts` shares one composed app | open | **Became HIGH-8** | The shared app stayed; Story 13.5's test now advances the shared clock by 120 s, and a shuffled run fails 3 tests (HIGH-8). The per-test database truncation (`test-support/db.ts`) keeps the rows isolated; the clock and the session counter are the shared state |
| LOW-4 the VAL benchmarks dominate the run time | open, to the CI owner | **Open, no deduction** | In this run `solu2-nfr` took 305 s of wall time; its slowest tests are `[NFR-COM-2.drift]` (141.5 s, new in Story 8.5) and the three VAL benchmarks (106.9, 103.8 and 93.1 s). CI runs it in the `gate` job on every push, which stays under its 30-minute timeout. The registry has no row for a benchmark's duration (H1 and M1 do not fire), so no deduction |

## The pyramid (70 / 20 / 10 + NFR)

*Counted as `it`/`test` blocks (an `it.each` table counts once; a k6 scenario counts once). Unit = the colocated `*-domain.test.ts` and other pure tests (no database); integration = the database-backed colocated tests, the fitness and fixture proofs, and the ATDD contracts; E2E = Playwright; NFR = the PRD §7 benchmarks and the k6 scenarios. "Added by Impl-2" is, per file, the blocks at the close minus those at `a7c5d81` (no file lost blocks).*

| Level | Added by Impl-2 | Share (without NFR) | Whole suite | Share (without NFR) | Target |
|---|---|---|---|---|---|
| Unit | 53 | 43.1 % | 234 | 23.8 % | 70 % |
| Integration | 64 | 52.0 % | 744 | 75.6 % | 20 % |
| E2E | 6 | 4.9 % | 6 | 0.6 % | 10 % |
| NFR (separate layer) | 9 (7 benchmarks, 2 k6 scenarios) | — | 32 (30 benchmarks, 2 k6 scenarios) | — | separate |
| **Total** | **132** | | **1,016** | | |

**Reading.** Impl-2's additions are 43.1 % / 52.0 % / 4.9 % (unit / integration / E2E) plus 9 NFR tests; the whole suite is 23.8 % / 75.6 % / 0.6 %. Neither meets 70 / 20 / 10: the base is narrower than the target and the middle wider. The cause is a Solu-2 design choice that Impl-2 kept: every contract clause is proven by an ATDD test on real Postgres (test-design.md §3), and the colocated `application/*.v2.test.ts` files test each use case through its repository adapter. Many of those integration tests prove domain rules that a pure test could prove faster. The shape is not the ice cream cone (E2E stays at 0.6 %); it is a diamond. The registry has no row for the distribution, so it is reported without a deduction. Moving rule-level cases from `application/*.test.ts` into the domain tests would widen the base; the per-file coverage rule already keeps every core's branches in the unit project.

## Best Practices Found

1. **Red for the right reason, mechanically** (`scripts/check-atdd-red.mjs`): a premature pass or a broken Given fails the gate.
2. **A mutation check for a hardened wait** (`02-flowC-lock-mutation.log`): the fix was proven by breaking the code it guards.
3. **A test that could not fail was caught by breaking the code on purpose** (#21): the race test was strengthened until the broken isolation level failed it every time.
4. **Probes for the scanners**: each fitness rule and each `gate:no-sleep` rule first proves it flags a planted violation.
5. **Traces as evidence**: one `trace.zip` per journey from an evidence run (`evidence/impl2/traces/`, `npx playwright show-trace <file>`), with `trace: 'on-first-retry'` kept for CI.

## Test File Analysis

| Project | Files | Tests | Passed | Failed | Skipped / todo | Wall time |
|---|---|---|---|---|---|---|
| `impl1-unit` | 50 | 678 | 678 | 0 | 0 | 16.0 s (plus coverage: 96.48 % branches) |
| `solu2-atdd` | 24 | 373 | 373 | 0 | 0 | 25.4 s |
| `solu2-nfr` | 15 | 30 | 30 | 0 | 0 | 305.4 s |
| `solu2-fitness` | 2 | 12 | 12 | 0 | 0 | 10.5 s |
| Playwright (chromium, `--trace on`) | 4 | 6 | 6 | 0 (0 flaky) | 0 | 16.3 s |
| k6 (`npm run nfr:k6`, the committed summary) | 1 | 2 scenarios, 12,002 requests | 12,002 checks | 0 | — | 60 s per scenario |
| Lint-rule tests (`node --test`, `test:lint-rules`) | 1 | — | all | 0 | 0 | < 5 s |

Vitest counts each case of an `it.each` table, so its totals are higher than the block counts of the pyramid. Source: `traceability-matrix.md` §10 and `evidence/impl2/28-final-trace.log`.

## Next Steps

- **Decide at the close:** split the seven long files (HIGH-1 to HIGH-7) and reset the shared clock (HIGH-8). With them split and HIGH-8's clock reset, and nothing else changed, the score would be 99 (A) and the recommendation Approve with Comments.
- **Follow-up (`deferred-work.md`):** MEDIUM-1 (factories), LOW-2 (three unused variables), LOW-4 (the benchmarks' run time, to the CI owner) and the pyramid's base.
- **Re-review:** after the split, or at the next phase.

## Decision

**Request Changes.** The suite proves what the trace says it proves: every bound test of all 71 stories passes, each failed for the right reason before its story, and no test waits on time. What the registry asks to change is how the suite is organised (seven long files) and one shared clock that makes `composition.test.ts` depend on its order. Neither is a false green today, but the clock is a latent failure for any reordering. Fixing both is the main agent's call at the close (the menu in its report).
