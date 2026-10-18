---
title: Test quality review — Solu-1 ATDD suite
reviewed: docs/solu-1/tests/atdd/*.test.ts (12 files, 130 tests); context only, not scored: test-support/*.ts, docs/solu-1/planning/contracts.md
skill: bmad-testarch-test-review (Create mode, sequential execution)
date: 2026-10-18
status: triaged — Phase 3 gate, 2026-10-18 (decision log #16); rescored after fixes: 100/100, grade A, Approve
---

# Test quality review — Solu-1 ATDD suite

**Report 3 of 4** (task statement §7). Murat scored the 12 ATDD files against the skill's criteria registry. The weights are CRITICAL 20, HIGH 10, MEDIUM 5 and LOW 2, and the score is 100 minus the deduction ledger. It is a self-review: the same session wrote the suite. The context files were read to judge intent and were not scored.

**Convention baseline.** The repository had no tests before this package, so `priorityMarkers`, `testIds`, `bddNaming` and `assertionStyle` have 0 % adoption. Rows L2, L3, L5 and L7 are therefore gate-closed: the registry scores a convention only once it exists.

## Score (before fixes)

| Dimension | Rows fired | Deduction |
|---|---|---|
| Determinism | none (no wall clock: `VirtualClock`; no randomness: `SequentialIds`, seeded fast-check) | 0 |
| Isolation | none (one database per file, `TRUNCATE` + seed row before every test, every module-level fake map reset in `beforeEach`) | 0 |
| Maintainability | **C3** ×1, **M2** ×2, **M3** ×1 | −20 −10 −5 |
| Performance | none (full suite ≈ 5 s; no hard waits) | 0 |
| **Overall** | | **65 / 100 — grade D — verdict `Request Changes`** (CRITICAL > 0) |

## Quality criteria assessment

| Criterion | Status | Note |
|---|---|---|
| BDD Format (Given-When-Then) | ✅ PASS (n/a) | No house convention yet. Every test is written Given / When / Then with comments |
| Test IDs | ✅ PASS (n/a) | No DOM |
| Priority Markers | ✅ PASS (n/a) | No house convention yet; priorities arrive with Solu-2's risk register |
| Hard Waits | ✅ PASS | None |
| Determinism (no conditionals) | ✅ PASS | Every loop iterates a non-empty literal array or a fixed count |
| Isolation | ✅ PASS | — |
| Fixture Patterns / Data Factories | ⚠️ WARN | M2 in `inv`, `dsc` |
| Network-First | ✅ PASS (n/a) | No navigation |
| Explicit Assertions | ❌ FAIL | C3 in `dsc` |
| Test Length (≤ 300 lines) | ✅ PASS | Longest test file is 172 lines |
| Test Duration | ✅ PASS | — |
| Flakiness Patterns | ✅ PASS | Race tests use a barrier (`race()`), not timing |
| Disabled or Focused Tests | ✅ PASS | None |

## Findings

| # | Row | File:line | Finding |
|---|---|---|---|
| T-01 | **C3** Tautological assertion (CRITICAL) | `dsc-contracts.test.ts` (search, first test) | `expect([valentina, andres]).toHaveLength(2)` asserts the length of an array the test itself built. It cannot fail, and it was added only to use two otherwise-unused variables |
| T-02 | **M2** Repeated literal payload (MEDIUM) | `inv-contracts.test.ts` | Valentina's "unit + listing" scene is built inline 3 times (`assertListingOwner` ×2, `reserveForPurchase`/individual), bypassing a scene factory |
| T-03 | **M2** Repeated literal payload (MEDIUM) | `dsc-contracts.test.ts` | "unit + listing" for one seller is built inline in 4 tests (boundary, tie-break, card detail ×2) |
| T-04 | **M3** Multi-concern test (MEDIUM) | `inv-contracts.test.ts` ("a Pending seller … a paused one …") | One test proves two scenarios, with a mid-test `TRUNCATE` between them. A failure in the first hides the second |
| T-05 | Not a registry row — assertion on test-double data | `ver-contracts.test.ts` (approve, reject), `com-contracts.test.ts` (crossing), `trd-contracts.test.ts` (accept) | The `EventDelivery` subscriber list (`commission`, `listings`, …) is produced by `test-support/outbox.ts`'s `SUBSCRIBERS` table, not by the system under test. Asserting it checks the test double. The **event type and payload** assertions are valid: the code under test chooses them |
| T-06 | Not a registry row — assertion placement | `dsc-contracts.test.ts` | "At most 3 neighbour calls" (AD-DSC-2 rule 1) is asserted only on the `SearchFilterTooBroad` path, where at most 1 call happens. It is never asserted on a successful search, the path the rule is about |
| T-07 | Not a registry row — explainability depth | all files | No test asserts the full AD-SYS-1 `Decision` shape on a refusal (`citations[0].rule` names the FR, non-empty `humanMessage`, `occurredAt` = virtual now). The tests assert the codes, HTTP statuses and cited inputs only |
| T-08 | Not scored (context file) — size | `test-support/seed.ts` (341 lines) | The fixture module exceeds the 300-line guideline that H5 applies to test files |

## Triage

Mateo adopted the recommendation below in full at the Phase 3 gate on 2026-10-18 (decision log #16).

| # | Recommendation | Reason / fix |
|---|---|---|
| T-01 | **Accept** | Delete the line; the two sellers are already asserted through `sellerKind` on each row |
| T-02 | **Accept** | Add an `individualListing(name, …)` scene helper in the file, used by the 3 tests |
| T-03 | **Accept** | Same helper in `dsc` |
| T-04 | **Accept** | Split into two tests (`ListingUnverified`, `ListingPausedBalanceExhausted`) with no mid-test truncate |
| T-05 | **Accept** | Keep the event type and payload assertions. Replace the subscriber assertions with "exactly N delivery rows were written with the event in the same transaction", which is the SUT-observable property. The subscriber registry itself gets its own test when the real outbox is implemented (shared-kernel story) |
| T-06 | **Accept** | Assert `calls.length ≤ 3` on the first, successful search test |
| T-07 | **Defer** | Solu-2 makes an `explain_assert` fixture mandatory: "a decision carries ≥ 1 rule ID and the observed values". Building it once there, applied to every refusal, beats adding ad-hoc checks to 130 tests now |
| T-08 | **Reject** | H5 targets test files. `seed.ts` is a flat vocabulary of 25 independent factories, one per table, each under 25 lines. Splitting it per module would scatter the Given vocabulary that every module's tests share (an order needs users, listings and units) |

## Rescore after the accepted fixes

| Row | Before | After | Fix |
|---|---|---|---|
| C3 (`dsc`) | −20 | 0 | Tautology removed; `calls.length ≤ 3` asserted on the successful search instead (T-06) |
| M2 (`inv`) | −5 | 0 | `valentinaListing()` scene helper |
| M2 (`dsc`) | −5 | 0 | `individualListing()` scene helper |
| M3 (`inv`) | −5 | 0 | Split into the `ListingUnverified` and `ListingPausedBalanceExhausted` tests (130 → 131 tests) |
| **Score** | **65 (D, Request Changes)** | **100 (A, Approve)** | Non-registry findings: T-05 and T-06 fixed, T-07 deferred to Solu-2's `explain_assert`, T-08 rejected |

The rerun of `scripts/check-atdd-red.mjs`: `solu1-atdd: 131 tests in 12 files; 131 red for the right reason; 0 not`.
