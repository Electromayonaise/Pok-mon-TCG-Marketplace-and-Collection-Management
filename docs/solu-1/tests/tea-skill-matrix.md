---
title: "TEZG Solu-1 — Enterprise TEA skill matrix and test package"
phase: "Solu-1 Phase 3"
persona: "Murat (bmad-tea / bmad-testarch-*)"
directed_by: "Mateo Rubio"
created: 2026-10-18
---

# Enterprise TEA skill matrix (Exercise 3.2)

| Quality / Test Workflow | BMad TEA Skill | Action executed for TEZG | Run in Solu-1? |
|---|---|---|---|
| **Risk-Based Test Strategy** | `bmad-testarch-test-design` (`TD`) | Maps P0–P3 risks per module and sets the coverage threshold. Each module's mandatory edge case is P0 | Mapped. Executed in Solu-2 (`test-design.md`, risk register ≥ 8) |
| **Framework Initialization** | `bmad-testarch-framework` (`TF`) | Vitest 5 projects `solu1-schema` and `solu1-atdd`. The `test-support/` fixtures: `db` (one Postgres database per file, cloned from a migrated template), `fake_clock` (`VirtualClock`), deterministic `SequentialIds` / `id()`, `seed_marketplace` (data factories), `SqlOutbox`, `race()` barrier | **Yes, in Validate mode.** The harness was first built as the ATDD workflow's prerequisite step. At Mateo's request (decision log #17), `bmad-testarch-framework` then validated it (`framework-validation-report.md`): PASS after fixing 2 WARN sections (`.env.example`, test README; JUnit reporter added) |
| **CI Quality Gate Scaffold** | `bmad-testarch-ci` (`CI`) | `.github/workflows/solu1-quality-gate.yml`: typecheck → GREEN schema suite → RED-for-the-right-reason check → code-citation check; burn-in of the GREEN suite × 10; `.nvmrc` = 22 | **Yes** (invoked, Create mode). The local gate run passes. The workflow runs on GitHub after the branch is pushed |
| **ATDD Test Generation** | `bmad-testarch-atdd` (`AT`) | 12 files, 131 red-phase tests for 37 contracts, `docs/solu-1/tests/atdd/<code>-contracts.test.ts` | **Yes** (invoked, Create mode) |
| **NFR Evidence Audit** | `bmad-testarch-nfr` (`NR`) | Audits the PRD's latency, concurrency and isolation NFRs against evidence | Mapped. The concurrency NFRs are already exercised as ATDD race tests (below). The full evidence plan is in Solu-2 (`nfr-evidence.md`) |
| **Traceability Matrix & Gate** | `bmad-testarch-trace` (`TR`) | Generates the FR → contract → test → story matrix and certifies pass/fail | Mapped. Coverage is checked at the Phase 4 readiness gate; the full matrix is in Solu-2 (`traceability-matrix.md`) |
| **Test Quality Review** | `bmad-testarch-test-review` (`RV`) | Reviews the ATDD suite for determinism, isolation, assertion depth and tautologies | **Yes**: review 3 of 4, `docs/solu-1/reviews/review-atdd-test-quality.md` |

## What "red for the right reason" means here, and how it is enforced

A red test is valid only if it fails on the stub's `NotImplementedError`. If it fails on a broken Given step, a fixture collision or a harness error, the test proves nothing. If it passes, it is a tautology or an implementation slipped past the stop-point. `scripts/check-atdd-red.mjs` enforces this mechanically:

- it runs the suite with the JSON reporter;
- it fails the gate if any test passes, or if any failure message does not name `NotImplemented`.

It caught four defects of this package on its first run. Three were fixture-id collisions (`id('r1')` = `id('r10')`), fixed by an injective id encoding. The fourth was a fast-check wrapper hiding the stub's error, fixed by a concrete example before the property.

To keep the checker meaningful, a test that asserts a refusal reads the code first (`codeOf(error)`), which is `NotImplementedError` today. A race test asserts the losers' codes first. Either way, the failure message names `NotImplemented` until the contract is implemented, and the deeper assertions on state, events and non-effects run once it is.

## Test package

| Suite | Path | Count | Expected today |
|---|---|---|---|
| Physical invariants (GREEN) | `docs/solu-1/tests/schema/physical-invariants.test.ts` | 32 | all pass: each names the constraint it relies on, so removing that constraint turns exactly that test red |
| Contract ATDD (RED) | `docs/solu-1/tests/atdd/*-contracts.test.ts` | 131 | all fail with `NotImplementedError` |

```bash
npm run db:up                 # Postgres 16 on :55432
npm run gate:solu1            # typecheck + GREEN + RED-check + code citations
```

## ATDD coverage per contract

Categories: **S** success (Q holds) · **P** precondition violation (typed error, HTTP status, zero mutation) · **I** invariant under concurrency, repetition or boundary · **E** the module's mandatory edge case.

| Module | Contract | S | P | I | E | Tests |
|---|---|---|---|---|---|---|
| IDN | `requireListingEligibility` | ✓ | ✓ (2 codes) | — | — | 4 |
| IDN | `claimSellerTrack` | ✓ | ✓ (3 codes) | ✓ race × 25 | ✓ NFR-IDN-2 | 5 |
| IDN | `getSellerVerification` | ✓ | — (missing → `'none'`) | ✓ latest wins | — | 3 |
| VER | `assertCanSubmitApplication` | ✓ | ✓ (4 codes) | ✓ cooldown boundary | — | 5 |
| VER | `decideApplication` | ✓ approve, reject | ✓ (2 codes) | ✓ race | ✓ NFR-VER-1 | 5 |
| VER | `getBusinessPaymentInstructions` | ✓ | — (missing → `null`) | — | — | 2 |
| CAT | `assertCatalogAdmin` | ✓ | ✓ propagation identity | — | — | 2 |
| CAT | `startFeedRun` | ✓ | ✓ | ✓ race × 5, 24 h abandon | — | 4 |
| CAT | `upsertCatalogEntry` | ✓ | — | ✓ rerun converges | ✓ rename keeps id | 3 |
| CAT | `getReferencePriceAsOf` | ✓ | — (missing → `null`) | ✓ stale, tie-break | — | 4 |
| DSC | `assertSearchArea` | ✓ bounds | ✓ | — | — | 2 |
| DSC | `search` | ✓ | ✓ too broad | ✓ determinism, ≤ 3 calls, 1 mm boundary | ✓ exclusions | 5 |
| DSC | `getCardDetail` | ✓ | ✓ propagation | ✓ ≤ 3 calls | ✓ empty-by-location | 3 |
| INV | `assertListingOwner` | ✓ | ✓ (2 codes) | — | — | 3 |
| INV | `reserveForPurchase` | ✓ single, bundle | ✓ (4 codes) | ✓ 50-way race | ✓ caller abort | 9 |
| INV | `getAvailabilitySummary` | ✓ | — (missing → zero row) | — | — | 2 |
| ORD | `assertOrderVisible` | ✓ | ✓ (3 actors) | — | — | 2 |
| ORD | `confirmPaid` | ✓ | ✓ (4 codes) | ✓ double click, expiry boundary | ✓ repeated / out of order | 7 |
| ORD | `hasClosedPurchase` | ✓ | — (missing → `false/null`) | ✓ paid ≠ closed | — | 3 |
| COM | `assertTopUpVisible` | ✓ | ✓ | — | — | 2 |
| COM | `applyOrderDeduction` | ✓ | — (never refused) | ✓ redelivery, crossing, rate at trigger | ✓ NFR-COM-1 | 5 |
| COM | `findCommissionAccount` | ✓ | — (missing → `null`) | — | — | 2 |
| TRD | `assertActorTurn` | ✓ | ✓ (3 codes) | — | — | 3 |
| TRD | `acceptOffer` | ✓ | ✓ (2 codes) | ✓ handoff failure, round cap | ✓ NFR-TRD-1 | 6 |
| TRD | `findOpenOffer` | ✓ | — (missing → `null`) | ✓ expired | — | 2 |
| MSG | `assertConversationParticipant` | ✓ | ✓ | — | — | 2 |
| MSG | `sendMessage` | ✓ | ✓ (2 codes) | ✓ retry, concurrent start, reply by role | — | 7 |
| MSG | `findConversation` | ✓ | — (missing → `null`) | — | — | 2 |
| COL | `assertCollectionOwner` | ✓ | ✓ | — | — | 2 |
| COL | `acceptPrompt` | ✓ | ✓ (2 codes) | — | ✓ NFR-COL-1 | 4 |
| COL | `getSetCompletion` | ✓ | — (missing → `null`) | ✓ zero-card set | — | 2 |
| VAL | `assertValuationPeriod` | ✓ | ✓ | — | — | 2 |
| VAL | `valueCollection` | ✓ | ✓ | ✓ snapshot asOf, determinism | ✓ 500-entry drift | 4 |
| VAL | `changePercent` | ✓ vectors | — (zero → `null`) | ✓ property × 1,000 | — | 3 |
| REP | `assertVerifiedPurchaser` | ✓ | ✓ (2 codes) | — | ✓ paid-not-closed | 4 |
| REP | `hideReview` | ✓ | ✓ | ✓ race | — | 4 |
| REP | `getAggregates` | ✓ | — (missing → `null/0`) | ✓ rounding 4.3 | — | 2 |
| **Total** | **37 contracts** | | | | | **131** |
