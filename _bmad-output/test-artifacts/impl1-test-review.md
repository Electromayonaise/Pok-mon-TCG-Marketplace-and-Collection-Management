# Test Quality Review: the Impl-1 suite

*`bmad-testarch-test-review`, Impl-1 Phase 4 (`853449c:docs/impl-1/task-statement.md` §5). The review set is every committed test file at `949c219`: 80 files, 873 `it` blocks. The run data comes from the same vitest JSON run as `impl1-final-trace.md`. The review is a report only: no test was changed (decision log Impl-1 #39). The four quality dimensions ran inline, not as subagents.*

- **Reviewer:** the agent, for Martín Gómez
- **Date:** 2026-10-30
- **Scope:** the whole suite (`impl1-unit`, `solu2-atdd`, `solu2-nfr`, `solu2-fitness`, the lint-rule tests) and the harness in `test-support/`

## Executive Summary

**Score: 95 / 100 (A). Recommendation: Approve with Comments.**

0 CRITICAL, 0 HIGH, 3 MEDIUM and 4 LOW findings, plus one 5-point bonus (deduction ledger: 100 − 3 × 2 − 4 × 1 + 5 = 95). None of the findings makes a test pass when its behaviour is broken in a way the suite would otherwise catch, and none blocks the Impl-1 close. Each has an owner in `deferred-work.md`.

### Key Strengths

- **Deterministic by construction.** Every project runs behind the NFR-SYS-3 network guard (`test-support/solu2/network-guard.ts`), on a `VirtualClock` and sequential ids. No test reads the wall clock for a business decision: the only `performance.now()` calls time the NFR benchmarks, and `[SYS-6.R1]` fails the build on any `Date.now()` or `new Date()` in `src/`.
- **Isolated by construction.** Each test file gets its own PostgreSQL database cloned from a template migrated once per run (`test-support/global-setup.ts`), so files run in parallel and any file runs alone.
- **Concurrency is proven on a real database.** The MEC proofs race real connections with a barrier (`race()`), 100 repetitions each, and use row locks, not mocks.
- **The red tests fail for the right reason.** `gate:atdd-red:impl1` requires every test of a done story to pass and every other one to fail on `NotImplementedError`, so a reserved story's test can neither pass vacuously nor fail on a broken Given.
- **No skipped, focused or todo test** (`tools/lint/tezg-plugin.test.mjs:16` assigns `RuleTester.itOnly`, a test-harness hook, and focuses nothing). Every `it` block holds an assertion.
- **Names state behaviour.** Each acceptance test starts with its bracketed id and then says what must hold, for example `[REP-3.MEC] ...`.

### Key Weaknesses

- Two lock-wait tests wait 200 ms of real time and then assert that a statement is still blocked.
- One watchdog helper is copied into seven files.
- The three VAL benchmarks take 313 of the suite's 675 test-seconds.

## Quality Criteria Assessment

| Criterion | Status | Notes |
|---|---|---|
| No hard waits | WARN | Two 200 ms waits (MEDIUM-1); the 1–2 ms waits of `db.test.ts` interleave two async contexts on purpose |
| Determinism (clock, ids, network) | PASS | Virtual clock, sequential ids, network guard on every project |
| Isolation (per-file database, no order dependence) | PASS with one LOW | `composition.test.ts` shares one composed app across its tests (LOW-3) |
| Explicit assertions | PASS | 873 / 873 `it` blocks assert |
| No skip, only, todo | PASS | 0 |
| Fixtures and factories | PASS | The Reference Seed Profile and `test-support/solu2/fixtures.ts` helpers build the Givens |
| File size (≤ 300 lines) | WARN | 4 files over 300 lines (LOW-1) |
| Lint clean | WARN | 3 unused-variable warnings in ATDD files (LOW-2) |
| Run time | WARN | `solu2-nfr` 314 s wall, 21 s for `impl1-unit` (LOW-4) |

## Quality Score Breakdown

| Item | Count | Points |
|---|---|---|
| Starting score | | 100 |
| CRITICAL × 10 | 0 | 0 |
| HIGH × 5 | 0 | 0 |
| MEDIUM × 2 | 3 | −6 |
| LOW × 1 | 4 | −4 |
| Bonus: excellent BDD (every test name states behaviour) | | +5 |
| Bonus: comprehensive fixtures, data factories, network-first, perfect isolation, test ids | | 0 (the watchdog duplication, inline literals, no network in scope, LOW-3, no UI in scope) |
| **Total** | | **95 (A)** |

## Critical Issues (Must Fix)

None.

## Recommendations (Should Fix)

### MEDIUM-1 and MEDIUM-2. A lock wait asserted after a 200 ms sleep (determinism)

- **Where:** `src/modules/identity/application/ver.v2.test.ts:549` and `src/modules/listings/application/inv.v2.test.ts:293`.
- **What:** each test starts a statement that must block on a lock, sleeps 200 ms, and asserts the statement has not finished. If the statement has not reached the server within 200 ms, the assertion passes without the lock having been tested. The opposite failure (a slow machine) cannot happen, so the test is never flaky red; it can only be weakly green.
- **Fix:** wait until `pg_stat_activity` shows the second backend with `wait_event_type = 'Lock'`, then assert. This makes the test prove the block instead of a timing window.
- **Owner:** Impl-2 test hardening (`deferred-work.md`).

### MEDIUM-3. The deadlock watchdog is copied into seven files (maintainability)

- **Where:** the `watchdog` / "deadlock: a second connection was requested" block in `atdd/sys_contracts.test.ts`, `contact.v2.test.ts`, `inv.v2.test.ts`, `msg.v2.test.ts`, `ord.v2.test.ts`, `trd.v2.test.ts` (twice) and `composition.test.ts`.
- **Fix:** one `withSingleConnectionWatchdog()` helper in `test-support/`.
- **Owner:** Impl-2 test hardening.

### LOW-1. Four test files exceed 300 lines

`src/server/composition.test.ts` (892), `ver.v2.test.ts` (558), `cat.v2.test.ts` (369), `inv.v2.test.ts` (318). Each groups one module's use cases; split by procedure when they next change.

### LOW-2. Three unused variables in ATDD files

`atdd/com_supporting.test.ts:23` (`ledger`), `atdd/inv_contracts.test.ts:9` (`admin`), `atdd/ver_supporting.test.ts:17` (`application`). ESLint reports them as warnings on every `npm run test:ci`.

### LOW-3. `composition.test.ts` shares one composed app across its tests

`app`, the virtual clock and a session counter are module-level. The tests do not depend on their order today: each inserts its own `"Session"` row, and none advances the shared clock. A later test that advances it, or that changes the shared database's rows another test reads, would leak into the tests after it.

### LOW-4. The VAL benchmarks dominate the run time

`[NFR-VAL-2.history]` 143 s, `[NFR-VAL-2.trend]` 114 s and `[NFR-VAL-2.current]` 55 s: 313 of 675 test-seconds. The PRD §7 protocol fixes 50 warm-up and 500 measured calls, so the count stays. A nightly job could run `solu2-nfr` instead of every push; decide it with the CI owner.

## Best Practices Found

1. **Red for the right reason, mechanically.** `scripts/check-atdd-red.mjs` reads the JSON report and fails on a premature pass or a wrong failure.
2. **Real races, counted.** The MEC proofs record their runtime in the story files (TG-7), and the `race()` barrier starts all callers together.
3. **A seed with a profile.** `[SEED.profile]` proves the fixture's shape, so a Given that depends on the seed fails loudly when the seed changes.
4. **Probes for the scanners.** Each static fitness rule has a `.probe` test that proves it flags what it should (`[SYS-6.R1.probe]`, `[SYS-AD1.probe]`, `[SYS-AD8.probe]`).

## Test File Analysis

| Project | Files | Tests | Passed | Failed | Wall time |
|---|---|---|---|---|---|
| `impl1-unit` | 46 | 582 | 582 | 0 | 21 s |
| `solu2-atdd` | 19 | 352 | 324 | 28 (the 7 reserved Impl-2 stories, `NotImplementedError`) | 28 s |
| `solu2-nfr` | 12 | 23 | 23 | 0 | 314 s |
| `solu2-fitness` | 2 | 12 | 12 | 0 | 18 s |
| Lint-rule tests (`node --test`) | 1 | see `walkthrough-impl1.md` §17 | all | 0 | < 5 s |

## Next Steps

- **Before the merge:** none.
- **Follow-up (Impl-2 test hardening, `deferred-work.md`):** MEDIUM-1 to MEDIUM-3, LOW-1 to LOW-3. LOW-4 goes to the CI owner.
- **Re-review:** at the Impl-2 close.

## Decision

**Approve with Comments.** The suite proves what the trace says it proves. The findings are about how two tests wait and how the suite is organized, not about what it covers.
