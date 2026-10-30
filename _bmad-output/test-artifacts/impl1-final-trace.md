# Impl-1 final trace and quality gate

*`bmad-testarch-trace`, Impl-1 Phase 4 (`853449c:docs/impl-1/task-statement.md` §5, §6.1 item 2, §6.2 "Test coverage"). The oracle is each story's Gherkin as bound in `epics.md`: its **ATDD path** names the acceptance tests that prove it. Every result below comes from one run of the code at `949c219` on 2026-10-30, with vitest's JSON reporter (`.vitest-results/*.json`, local PostgreSQL 16). `traceability-matrix.md` is the generated Solu-2 design trace (FR, NFR, AD, risk and clause rows); this file adds what that one does not: the per-story result of the implementation.*

## 1. Gate decision

**PASS.** All 43 Impl-1 stories are `done`, and every test bound to them passes, with at least two per story. All 15 P0 risks are covered by passing tests of done stories. The 19 stories pulled forward from `impl2_scope` pass too. The 7 reserved Impl-2 stories stay red for the right reason (`NotImplementedError`), and the red gate reports them apart, as §6.1 item 2 asks. No test is skipped, focused or marked todo.

| Criterion (task statement, skill rule) | Required | Actual | Status |
|---|---|---|---|
| Impl-1 stories `done` in `sprint-status.yaml` | 43 / 43 | 43 / 43 | MET |
| Impl-1 stories whose bound tests all pass | 43 / 43 (≥ 90 %, target 100 %) | 43 / 43 (100 %) | MET |
| Impl-1 stories with ≥ 2 distinct bound tests (§6.2) | 43 / 43 | 43 / 43 (fewest: 2) | MET |
| Stories pulled forward whose bound tests all pass | 19 / 19 | 19 / 19 | MET |
| P0 risks covered by a passing test of a done story | 100 % | 15 / 15 (100 %) | MET |
| P1 risks covered | ≥ 90 % | 5 / 5 (100 %) | MET |
| FRs with a passing test of a done story | informative (the rest is Impl-2) | 85 / 96 (88.5 %) | — |
| Binding ADs with a passing test of a done story | informative | 60 / 60 (100 %) | — |
| Skipped, focused or todo tests | 0 | 0 | MET |
| Reserved Impl-2 stories red for the right reason | reported apart | 7 stories, 28 tests, 28 failing on `NotImplementedError` | reported apart |

## 2. Suite totals

| Project | Files | Tests | Passed | Failed | Skipped / todo | Meaning of a failure |
|---|---|---|---|---|---|---|
| `impl1-unit` (src tests) | 46 | 582 | 582 | 0 | 0 | A defect |
| `solu2-atdd` (acceptance) | 19 | 352 | 324 | 28 | 0 | All 28 failures are tests of the 7 reserved Impl-2 stories, on `NotImplementedError` (`gate:atdd-red:impl1`: 0 not as expected) |
| `solu2-nfr` (benchmarks, scans) | 12 | 23 | 23 | 0 | 0 | A missed threshold |
| `solu2-fitness` (architecture) | 2 | 12 | 12 | 0 | 0 | A broken AD |

Lint-rule tests (`node --test tools/lint/tezg-plugin.test.mjs`) and the static gates run in the same `npm run test:ci`; their output is in `walkthrough-impl1.md` §17.

## 3. Per-story trace

*Scope: **Impl-1** is the 43-story cut of Appendix B.1; **Pulled forward** is a story of `impl2_scope` built early with its epic (decision log Impl-1 #26–#38); **Impl-2** is reserved. "Bound" counts the ATDD path's ids; "Pass" counts those whose every test passed in this run.*


### Epic 1: Walking skeleton: errors, audit, outbox and determinism

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 1.1 † | Skeleton | Impl-1 | done | 6 | 6 — all pass | R-15 (P0), R-16 (P1) | — | `SYS-1.R2` `SYS-1.R6` `SYS-1.R6.unexpected` `SYS-1.R6.s2` `SYS-8.R2` `SYS-8.R2.static` |
| 1.2 † | Skeleton | Impl-1 | done | 6 | 6 — all pass | R-13 (P0), R-18 (P1) | — | `SYS-R2` `SYS-8.R4` `SYS-8.R4.redact` `SYS-8.R4.error` `SYS-R2.grants` `NFR-SYS-8.canary` |
| 1.3 † | Skeleton | Impl-1 | done | 8 | 8 — all pass | R-14 (P0) | — | `SYS-2.R4` `SYS-2.R4.code` `SYS-2.R6` `SYS-2.R6.young` `S-SYS.replay.h` `S-SYS.replay.f` `SYS-AD9` `NFR-SYS-6.sweep` |
| 1.4 | Skeleton | Impl-1 | done | 9 | 9 — all pass | R-17 (P1), R-18 (P1), R-19 (P1) | — | `SYS-6.R1` `SYS-6.R1.probe` `SYS-6.R4` `SYS-AD1` `SYS-AD1.probe` `SYS-AD8` `SYS-AD8.probe` `SEED.profile` `SEED.business-history` |
| 1.5 | Skeleton | Impl-1 | done | 3 | 3 — all pass | — | — | `S-SYS.tick.h` `S-SYS.deliveries.h` `S-SYS.health.h` |

### Epic 2: User, role and seller-type access (IDN)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 2.1 † | Core | Impl-1 | done | 3 | 3 — all pass | — | FR-IDN-2, FR-IDN-4, FR-VER-1 | `IDN-1.Q1` `IDN-1.ingress.h` `IDN-1.ingress.f` |
| 2.2 † | MEC | Impl-1 | done | 4 | 4 — all pass | R-01 (P0) | FR-IDN-2, FR-IDN-4, FR-VER-1 | `IDN-1.MEC` `IDN-1.I1` `IDN-1.QF1` `IDN-1.QF2` |
| 2.3 † | Failure-state | Impl-1 | done | 7 | 7 — all pass | — | FR-IDN-1, FR-IDN-3 | `IDN-2.Q1` `IDN-2.QF1` `IDN-2.QF2` `IDN-2.I1` `P-IDN.capabilities.h` `P-IDN.verification.h` `SYS-4.R9` |
| 2.4 | Failure-state | Pulled forward | done | 2 | 2 — all pass | — | FR-IDN-7 | `S-FR-IDN-7.h` `S-FR-IDN-7.f` |
| 2.5 | Supporting | Impl-1 | done | 9 | 9 — all pass | — | FR-IDN-1, FR-IDN-5, FR-IDN-6 | `IDN-3.Q1` `IDN-3.Q2` `IDN-3.P2` `IDN-3.I1` `IDN-3.I3` `S-FR-IDN-6.h` `S-FR-IDN-6.f` `P-IDN.contact.h` `P-IDN.names.h` |

### Epic 3: Business verification workflow (VER)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 3.1 | Core | Impl-1 | done | 4 | 4 — all pass | — | FR-IDN-4, FR-VER-1, FR-VER-6 | `VER-2.Q1` `VER-2.I1` `VER-2.P5` `VER-2.I2` |
| 3.2 | MEC | Impl-1 | done | 4 | 4 — all pass | R-02 (P0) | FR-VER-3, FR-VER-4 | `VER-1.Q1` `VER-1.Q2` `VER-1.I1` `VER-1.MEC` |
| 3.3 | Failure-state | Pulled forward | done | 6 | 6 — all pass | — | FR-IDN-4, FR-VER-1, FR-VER-3, FR-VER-4, FR-VER-6 | `VER-2.P1` `VER-2.P3` `VER-2.P7` `VER-1.P2` `VER-1.P3` `VER-1.P4` |
| 3.4 | Failure-state | Pulled forward | done | 9 | 9 — all pass | — | FR-VER-2, FR-VER-5 | `VER-3.Q1` `VER-3.P1` `VER-3.P2` `VER-3.I1` `VER-3.I2` `VER-3.I3` `S-FR-VER-5.audit.h` `NFR-VER-3.queue` `NFR-VER-3.sign` |
| 3.5 | Supporting | Impl-1 | done | 10 | 10 — all pass | — | FR-VER-2, FR-VER-7, FR-VER-8, FR-VER-9 | `S-FR-VER-2.h` `S-FR-VER-2.f` `S-FR-VER-7.h` `S-FR-VER-7.f` `S-FR-VER-8.h` `S-FR-VER-8.f` `S-FR-VER-8.list.h` `S-FR-VER-9.h` `S-FR-VER-9.f` `P-VER.name.h` |

### Epic 4: Catalog and price reference (CAT)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 4.1 | Core | Impl-1 | done | 5 | 5 — all pass | — | FR-CAT-2, FR-CAT-3, FR-CAT-4 | `CAT-1.Q1` `CAT-1.Q2` `CAT-1.I1` `CAT-2.ingress.h` `CAT-1.runs.h` |
| 4.2 | MEC | Impl-1 | done | 6 | 6 — all pass | R-03 (P0) | FR-CAT-2, FR-CAT-4 | `CAT-2.Q1` `CAT-2.Q2` `CAT-2.I1` `CAT-2.I3` `CAT-2.MEC` `CAT-2.quarantine.h` |
| 4.3 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-CAT-2, FR-CAT-3, FR-CAT-4 | `CAT-1.QF1` `CAT-2.ingress.f` `CAT-2.QF1` |
| 4.4 | Failure-state | Impl-1 | done | 8 | 8 — all pass | — | FR-CAT-5, FR-CAT-6, FR-CAT-7, FR-CAT-8 | `CAT-3.Q1` `CAT-3.Q4` `CAT-3.Q5` `CAT-3.P2` `CAT-3.I1` `S-FR-CAT-8.h` `S-FR-CAT-8.f` `NFR-CAT-1.provenance` |
| 4.5 | Supporting | Impl-1 | done | 10 | 10 — all pass | — | FR-CAT-1 | `S-FR-CAT-1.h` `S-FR-CAT-1.f` `P-CAT.entry.h` `P-CAT.entries.h` `P-CAT.match.h` `P-CAT.refs.h` `P-CAT.asOf.h` `P-CAT.history.h` `P-CAT.sets.h` `NFR-CAT-1.browse` |

### Epic 5: Listings and shared inventory (INV)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 5.1 | Core | Impl-1 | done | 6 | 6 — all pass | — | FR-INV-1, FR-INV-4, FR-INV-7 | `INV-2.Q1` `INV-2.I1` `INV-2.Q2` `INV-2.I2` `INV-2.R1` `NFR-INV-4.create` |
| 5.2 | MEC | Impl-1 | done | 11 | 11 — all pass | R-05 (P0) | FR-INV-3, FR-INV-5, FR-INV-6 | `INV-1.Q1` `INV-1.Q3` `INV-1.I1` `INV-1.I3` `INV-1.MEC` `S-FR-INV-5.h` `S-FR-INV-5.f` `P-INV.purchase.h` `P-INV.units.h` `NFR-INV-4.reserve` `NFR-INV-4.bundle` |
| 5.3 | Failure-state | Pulled forward | done | 6 | 6 — all pass | — | FR-INV-1, FR-INV-4, FR-INV-7 | `INV-2.P1` `INV-2.P2` `INV-2.I4` `INV-2.P3` `INV-2.P4` `INV-2.P5` |
| 5.4 | Failure-state | Pulled forward | done | 4 | 4 — all pass | — | FR-INV-3, FR-INV-6 | `INV-1.P2` `INV-1.P3` `INV-1.P4` `INV-1.P5` |
| 5.5 | Supporting | Pulled forward | done | 6 | 6 — all pass | — | FR-INV-7, FR-INV-8 | `INV-3.Q1` `INV-3.I1` `INV-3.R1` `INV-3.I2` `S-FR-INV-8.h` `S-FR-INV-8.f` |
| 5.6 | Supporting | Impl-1 | done | 12 | 12 — all pass | — | FR-INV-2, FR-INV-4, FR-INV-9, FR-INV-10 | `S-FR-INV-2.h` `S-FR-INV-2.f` `S-FR-INV-4.h` `S-FR-INV-4.f` `S-FR-INV-9.h` `S-FR-INV-9.f` `S-FR-INV-10.h` `S-FR-INV-10.f` `P-INV.trade.h` `P-INV.tradeability.h` `P-INV.availability.h` `P-INV.refs.h` |

### Epic 6: Marketplace browse and location discovery (DSC)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 6.1 | Failure-state | Impl-1 | done | 4 | 4 — all pass | — | FR-DSC-1 | `DSC-3.Q1` `DSC-3.QF1` `DSC-3.QF2` `DSC-3.I1` |
| 6.2 | Core | Impl-1 | done | 7 | 7 — all pass | — | FR-DSC-1, FR-DSC-2, FR-DSC-3, FR-DSC-4, FR-DSC-5, FR-DSC-6 | `DSC-1.Q1` `DSC-1.I1` `DSC-1.I2` `DSC-1.I4` `DSC-1.R1` `NFR-DSC-1.seed` `NFR-DSC-1.scale` |
| 6.3 | MEC | Impl-1 | done | 3 | 3 — all pass | R-04 (P0) | FR-CAT-6, FR-DSC-7 | `DSC-2.Q1` `DSC-2.MEC` `DSC-2.MEC2` |
| 6.4 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-CAT-6, FR-DSC-1, FR-DSC-2, FR-DSC-3, FR-DSC-4, FR-DSC-5, FR-DSC-6, FR-DSC-7 | `DSC-1.Q4` `DSC-1.P2` `DSC-2.P1` |

### Epic 7: Orders and comprobante confirmation (ORD)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 7.1 | Core | Impl-1 | done | 7 | 7 — all pass | R-20 (P1) | FR-ORD-1, FR-ORD-2 | `ORD-1.Q1` `ORD-1.I2` `ORD-1.I4` `S-FR-ORD-2.h` `S-FR-ORD-2.f` `S-FR-ORD-2.url.h` `NFR-ORD-2.p95` |
| 7.2 | MEC | Impl-1 | done | 11 | 11 — all pass | R-06 (P0) | FR-ORD-3, FR-ORD-4, FR-ORD-5 | `ORD-2.Q1` `ORD-2.I2` `ORD-2.MEC` `ORD-3.Q1` `ORD-3.MEC` `ORD-3.I3` `ORD-3.R1` `ORD-3.Q2` `ORD-4.Q1` `ORD-4.Q2` `ORD-4.MEC` |
| 7.3 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-ORD-1 | `ORD-1.P3` `ORD-1.P4` `ORD-1.P5` |
| 7.4 | Failure-state | Pulled forward | done | 7 | 7 — all pass | — | FR-ORD-3, FR-ORD-4, FR-ORD-5 | `ORD-2.P1` `ORD-2.P3` `ORD-2.P4` `ORD-2.P5` `ORD-3.P2` `ORD-4.P2` `ORD-4.P3` |
| 7.5 | Supporting | Impl-1 | done | 10 | 10 — all pass | — | FR-ORD-6, FR-ORD-7, FR-ORD-8, FR-ORD-9, FR-ORD-10 | `S-FR-ORD-6.h` `S-FR-ORD-6.f` `S-FR-ORD-7.h` `S-FR-ORD-7.f` `S-FR-ORD-8.h` `S-FR-ORD-8.f` `S-FR-ORD-9.h` `S-FR-ORD-9.f` `S-FR-ORD-10.h` `S-FR-ORD-10.f` |

### Epic 8: Commission ledger and purchasability (COM)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 8.1 | Core | Impl-1 | done | 6 | 6 — all pass | — | FR-COM-1, FR-COM-2, FR-COM-9 | `S-FR-COM-1.h` `S-FR-COM-1.f` `S-FR-COM-2.h` `S-FR-COM-2.mine.h` `S-FR-COM-2.url.h` `S-FR-COM-9.h` |
| 8.2 | MEC | Impl-1 | done | 8 | 8 — all pass | R-07 (P0) | FR-COM-4, FR-COM-5, FR-COM-6 | `COM-1.Q1` `COM-1.Q3` `COM-1.I1` `COM-1.I3` `COM-1.I4` `COM-1.MEC` `COM-1.MEC2` `NFR-COM-3.deduction` |
| 8.3 | Core | Impl-1 | done | 6 | 6 — all pass | — | FR-COM-3, FR-COM-6 | `COM-2.Q1` `COM-2.Q2` `COM-2.I1` `COM-2.reject.h` `COM-2.queue.h` `NFR-COM-3.topUp` |
| 8.4 | Failure-state | Pulled forward | done | 7 | 7 — all pass | — | FR-COM-2, FR-COM-3, FR-COM-4, FR-COM-5, FR-COM-6, FR-COM-9 | `S-FR-COM-2.f` `S-FR-COM-2.f2` `S-FR-COM-9.f` `COM-2.P2` `COM-2.P3` `COM-2.reject.f` `COM-1.P3` |
| 8.5 | Failure-state | Impl-2 | backlog | 6 | 0 — 6 red (NotImplemented) | — | FR-COM-8 | `COM-3.Q1` `COM-3.Q2` `COM-3.I1` `COM-3.Q4` `COM-3.P2` `COM-3.last.h` |
| 8.6 | Supporting | Impl-2 | backlog | 4 | 0 — 4 red (NotImplemented) | — | FR-COM-7, FR-COM-8 | `S-FR-COM-7.h` `S-FR-COM-7.f` `S-FR-COM-7.list.h` `S-FR-COM-8.ledger.h` |

### Epic 9: Contact handoff and in-app business messaging (MSG)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 9.1 | Core | Impl-1 | done | 2 | 2 — all pass | — | FR-IDN-6, FR-MSG-4, FR-MSG-6 | `MSG-3.Q1` `MSG-3.QF1` |
| 9.2 | MEC | Impl-1 | done | 6 | 6 — all pass | R-09 (P0) | FR-MSG-5, FR-MSG-6 | `MSG-1.Q1` `MSG-1.Q2` `MSG-1.I3` `MSG-1.R1` `MSG-3.MEC` `NFR-MSG-2.send` |
| 9.3 | MEC | Impl-1 | done | 5 | 5 — all pass | R-09 (P0) | FR-MSG-1, FR-MSG-2, FR-MSG-3, FR-TRD-6 | `MSG-2.Q1` `MSG-2.I1` `MSG-2.MEC` `MSG-2.R1` `NFR-MSG-1.contact` |
| 9.4 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-MSG-5, FR-MSG-6 | `MSG-1.P3` `MSG-1.P4` `MSG-1.P5` |
| 9.5 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-MSG-1, FR-MSG-2, FR-MSG-3, FR-TRD-6 | `MSG-2.P2` `MSG-2.P3` `MSG-2.P4` |
| 9.6 | Supporting | Impl-2 | backlog | 4 | 0 — 4 red (NotImplemented) | — | FR-MSG-7, FR-MSG-8 | `S-FR-MSG-7.h` `S-FR-MSG-7.f` `S-FR-MSG-8.h` `S-FR-MSG-8.f` |

### Epic 10: Trade offer negotiation (TRD)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 10.1 | Core | Impl-1 | done | 4 | 4 — all pass | — | FR-TRD-1, FR-TRD-2, FR-TRD-3 | `S-FR-TRD-1.h` `S-FR-TRD-2w.h` `S-FR-TRD-3.h` `S-FR-TRD-3.mine.h` |
| 10.2 | Core | Impl-1 | done | 3 | 3 — all pass | — | FR-TRD-1, FR-TRD-2 | `TRD-2.Q1` `TRD-2.I3` `NFR-TRD-2.counter` |
| 10.3 | MEC | Impl-1 | done | 6 | 6 — all pass | R-08 (P0) | FR-TRD-3, FR-TRD-4, FR-TRD-5, FR-TRD-6 | `TRD-1.Q1` `TRD-1.Q3` `TRD-1.F1` `TRD-1.I1` `TRD-1.MEC` `NFR-TRD-2.accept` |
| 10.4 | Failure-state | Pulled forward | done | 12 | 12 — all pass | — | FR-TRD-1, FR-TRD-2, FR-TRD-3, FR-TRD-4, FR-TRD-5, FR-TRD-6 | `TRD-1.P2` `TRD-1.P3` `TRD-1.P4` `TRD-1.P6` `TRD-2.P2` `TRD-2.P5` `TRD-2.P6` `TRD-2.P7` `TRD-2.P8` `S-FR-TRD-1.f` `S-FR-TRD-2w.f` `S-FR-TRD-3.f` |
| 10.5 | Failure-state | Pulled forward | done | 8 | 8 — all pass | — | FR-TRD-7, FR-TRD-8, FR-TRD-9 | `TRD-3.Q1` `TRD-3.P1` `TRD-3.P2` `TRD-3.I1` `S-FR-TRD-7.h` `S-FR-TRD-7.f` `S-FR-TRD-9.h` `S-FR-TRD-9.f` |

### Epic 11: Collections, binder and wishlist (COL)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 11.1 | Core | Impl-1 | done | 4 | 4 — all pass | — | FR-COL-1 | `S-FR-COL-1.h` `S-FR-COL-1.f` `S-FR-COL-1.list.h` `S-FR-COL-1.delete.h` |
| 11.2 | Core | Impl-1 | done | 4 | 4 — all pass | — | FR-COL-1, FR-COL-2 | `COL-3.Q1` `COL-3.Q2` `COL-3.R1` `COL-3.I2` |
| 11.3 | MEC | Impl-1 | done | 7 | 7 — all pass | R-10 (P0) | FR-COL-7 | `COL-2.Q1` `COL-2.I1` `COL-2.I2` `COL-1.Q1` `COL-1.MEC` `COL-1.dismiss.h` `COL-1.list.h` |
| 11.4 | Failure-state | Pulled forward | done | 7 | 7 — all pass | — | FR-COL-1, FR-COL-2, FR-COL-7 | `COL-1.P1` `COL-1.P2` `COL-1.P3` `COL-1.dismiss.f` `COL-3.P2` `COL-3.P3` `COL-3.P4` |
| 11.5 | Supporting | Impl-2 | backlog | 4 | 0 — 4 red (NotImplemented) | — | FR-COL-3, FR-COL-4, FR-COL-5, FR-COL-6 | `S-FR-COL-3.h` `S-FR-COL-4.h` `S-FR-COL-5.h` `S-FR-COL-6.h` |
| 11.6 | Failure-state | Impl-2 | backlog | 4 | 0 — 4 red (NotImplemented) | — | FR-COL-3, FR-COL-4, FR-COL-5, FR-COL-6 | `S-FR-COL-3.f` `S-FR-COL-4.f` `S-FR-COL-5.f` `S-FR-COL-6.f` |

### Epic 12: Collection valuation and trends (VAL)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 12.1 | Core | Impl-1 | done | 4 | 4 — all pass | — | FR-VAL-1, FR-VAL-3, FR-VAL-5 | `VAL-1.Q1` `VAL-1.I1` `VAL-1.I2` `NFR-VAL-2.current` |
| 12.2 | Core | Impl-1 | done | 5 | 5 — all pass | — | FR-VAL-2, FR-VAL-4 | `VAL-2.Q1` `VAL-3.Q1` `VAL-3.I2` `NFR-VAL-2.trend` `NFR-VAL-2.history` |
| 12.3 | MEC | Impl-1 | done | 2 | 2 — all pass | R-11 (P0) | FR-VAL-1, FR-VAL-2, FR-VAL-3, FR-VAL-5 | `VAL-1.MEC` `VAL-2.I1` |
| 12.4 | Failure-state | Pulled forward | done | 3 | 3 — all pass | — | FR-VAL-1, FR-VAL-2, FR-VAL-3, FR-VAL-4, FR-VAL-5 | `VAL-1.P1` `VAL-2.P2` `VAL-3.P1` |
| 12.5 | Failure-state | Pulled forward | done | 2 | 2 — all pass | R-11 (P0) | FR-VAL-2, FR-VAL-4 | `VAL-3.Q4` `VAL-2.I3` |

### Epic 13: Seller reputation and moderation (REP)

| Story | Kind | Scope | Status | Bound | Pass | Risk | FRs | Tests |
|---|---|---|---|---|---|---|---|---|
| 13.1 | Core | Impl-1 | done | 5 | 5 — all pass | — | FR-REP-1, FR-REP-2 | `REP-1.Q1` `REP-1.Q1i` `REP-1.I1` `REP-1.edit.h` `REP-1.check.h` |
| 13.2 | Core | Impl-1 | done | 8 | 8 — all pass | — | FR-REP-4 | `REP-2.Q1` `REP-2.I1` `REP-2.I2` `REP-2.unhide.h` `REP-2.unhide.f` `REP-2.P2` `REP-2.P3` `NFR-REP-2.nextRead` |
| 13.3 | MEC | Impl-1 | done | 6 | 6 — all pass | R-12 (P0) | FR-REP-3 | `REP-1.MEC` `REP-3.Q1` `REP-3.I1` `REP-3.MEC` `REP-3.P1` `NFR-REP-2.aggregates` |
| 13.4 | Failure-state | Pulled forward | done | 5 | 5 — all pass | — | FR-REP-1, FR-REP-2 | `REP-1.P2` `REP-1.P3` `REP-1.I2` `REP-1.edit.f` `REP-1.check.f` |
| 13.5 | Supporting | Impl-2 | backlog | 3 | 0 — 3 red (NotImplemented) | — | FR-REP-3, FR-REP-5, FR-REP-6, FR-REP-7 | `S-FR-REP-5.h` `S-FR-REP-6.h` `S-FR-REP-7.h` |
| 13.6 | Failure-state | Impl-2 | backlog | 3 | 0 — 3 red (NotImplemented) | — | FR-REP-5, FR-REP-6, FR-REP-7 | `S-FR-REP-5.f` `S-FR-REP-6.f` `S-FR-REP-7.f` |

† The delivery cut of decision log Impl-1 #22 (Appendix B.0).

## 4. Gaps and concerns

None of these blocks the gate: each is outside the Impl-1 cut or a documentation gap with an owner.

1. **FRs without a passing test of a done story (11).** Each is owned only by a reserved Impl-2 story: FR-COM-8 (8.5, 8.6); FR-COM-7 (8.6); FR-MSG-7 (9.6); FR-MSG-8 (9.6); FR-COL-3 (11.5, 11.6); FR-COL-4 (11.5, 11.6); FR-COL-5 (11.5, 11.6); FR-COL-6 (11.5, 11.6); FR-REP-5 (13.5, 13.6); FR-REP-6 (13.5, 13.6); FR-REP-7 (13.5, 13.6).
2. **Binding ADs without a passing test of a done story (0).** None.
3. **Two NFRs have no owning story.** NFR-IDN-1 (capability reads of 500 ids, p95 ≤ 50 ms) and NFR-COL-2 (binder page and wishlist latency) are "Planned — story DoD" in `nfr-evidence.md`, but no story in `epics.md` names them in its Traceability, so no DoD carries their benchmark. NFR-COL-2 measures Story 11.5's binder and wishlist (Impl-2); NFR-IDN-1 measures `getCapabilities` and `getSellerKinds`, which Stories 2.3 and 2.5 built. Martín kept the backlog as certified and gave both an owner in `deferred-work.md` (decision log Impl-1 #39): NFR-COL-2 goes with Story 11.5, and NFR-IDN-1 with Epic 2's Impl-2 completion (Story 2.4's sign-in).
4. **The design trace still reads "red".** `traceability-matrix.md` §2, §4 and §5 give each test's Solu-2 design state (red until its story is built), next to the story and its status. This report holds the implementation result. The generator was left unchanged (decision log Impl-1 #39).
5. **NFR-REP-2's profile read** (Story 13.5) and **NFR-COM-2** (Story 8.5) stay red with their Impl-2 stories.

## 5. How to reproduce

```bash
npm run test:ci                      # writes .vitest-results/solu2-atdd.json and solu2-nfr.json
npx vitest run --project solu2-fitness --reporter=json --outputFile=.vitest-results/solu2-fitness.json
npx vitest run --project impl1-unit --reporter=json --outputFile=.vitest-results/impl1-unit.json
```

Then join each story's ATDD path in `epics.md` to the bracketed ids of the test titles in those files, as `scripts/check-atdd-red.mjs` does.
