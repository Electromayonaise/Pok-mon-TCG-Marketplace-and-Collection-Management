---
title: "TEZG Solu-2 — TEA skill matrix"
phase: "3 — Test Preparation (TEA)"
deliverable: "3.7 (task-statement.md §6)"
test-lead: "Martín Gómez (decisions relayed by Mateo Rubio)"
---

# TEA skill matrix

This matrix lists, for each TEA skill used in Phase 3, the artifact it produced and the defects it caught. Only real catches are listed. Each one is traceable to a commit on `solu-2` or to a recorded gate result. "Caught in" names the artifact where the defect lived. Several catches are defects in the **design**: Phase 2 artifacts that the test work exposed. Those are the catches that justify the phase.

| Skill | Artifact produced | Defect caught | Caught in | Resolution |
|---|---|---|---|---|
| `bmad-testarch-test-design` | `test/test-design.md`: 20 risks (15 P0, 5 P1), level allocation, thresholds, 8 testability gaps | Risk R-05 cited `[INV-1.I2]`, a test that does not exist (the race is `[INV-1.I1]`). Caught by the trace gate parsing the register | The register itself | Cites `[INV-1.MEC]`, `[INV-1.I1]`, `[INV-1.I3]` |
| `bmad-testarch-test-design` | (same) | A P0 risk with no MEC test (planted probe) fails the gate: "IDN: no P0 risk with a MEC test" | Gate self-test | Probe reverted; gate proven |
| `bmad-testarch-framework` | `test-support/solu2/seed-marketplace.ts` (`seed_marketplace`), `fitness.ts`, `bench.ts`; `fixtures/README.md`; the `solu2-fitness` project | The SQL-first seed hit "operator is not unique: unknown + unknown". Untyped bind parameters in set-based inserts | The new seed | Explicit `::int` casts; the profile is then proven count by count (`[SEED.profile]`) |
| `bmad-testarch-framework` | (same) | `OutboxDispatcherV2` had no transaction or clock dependency, and no `replay`, so AD-SYS-2 rules 4–7 could not be implemented as stubbed | Phase 2 stub (`src/shared-kernel/dispatcher.ts`) | Stub takes `{ transactions, clock }`; handlers receive `(tx, envelope)`; `replay` added; SYS deps gain `dispatcher` through a new `Type@file.ts` registry form |
| `bmad-testarch-framework` (fitness functions) | `test/fitness/sys_fitness.test.ts`: 10 green proofs, each with a planted-violation probe | **AD-1 violated:** the generated `trading` port imported `ResolveItemRefs*` from `catalog`, the very edge OQ-6 forbids | Phase 2 generator output (`trading/ports/trd.v2.ts`) | `listings` re-offers `ItemRefsRequest`/`ItemRefsResponse`; registry updated (commit `660268c`) |
| `bmad-testarch-framework` (fitness functions) | (same) | **AD-SYS-8 rule 2 / NFR-IDN-3 violated:** `trading.mine` accepted an input key named `role` | Phase 2 DTO (`ListMyOffersRequest`) | Renamed `side: sent \| received \| any` (commit `de8535d`) |
| `bmad-testarch-atdd` | 19 suites, 351 red tests (`atdd/*_contracts`, `*_supporting`, `sys_contracts`) and the walking-skeleton stubs (`raiserFor`, `toErrorBody`, `describeProceduresV2`, `redact`/`createLogger`, `PgAuditLog`) | `[SYS-4.R9]` failed for the wrong reason (SASL: password missing from a pool copied from `pool.options`). The red-for-the-right-reason gate flagged it | The test's Given step | The pool is built from the harness `PG` settings |
| `bmad-testarch-atdd` | (same) | `[REP-2.I1]`'s title claimed "DELETE is refused" with no assertion on it | The test | Asserts `has_table_privilege('tezg_app', 'Review', 'DELETE') = false` |
| `bmad-testarch-atdd` (test-id gate) | `scripts/check-test-ids.mjs` (`gate:ids:solu2`) | `contracts.md` §0 cited `[IDN-1.P1]` and `[IDN-1.Q2]` as examples; neither test exists | Phase 1 contracts | The example cites ids that exist |
| `bmad-testarch-ci` | `.github/workflows/solu2-quality-gate.yml` (mirrored at `test/ci/quality-gate.yml`); `npm run gate:solu2` | The workflow could drift from its deliverable copy | CI design | First step `cmp`s the two files |
| `bmad-testarch-nfr` | `test/nfr-evidence.md` (56 NFR rows); 3 red benchmarks: `[NFR-ORD-2.p95]`, `[NFR-SYS-6.sweep]`, `[NFR-SYS-8.canary]` | 21 of 56 NFRs were bound to no contract clause or test, including NFR-IDN-3, NFR-REP-3 and NFR-COL-3 | Phase 1 contracts (NFR binding) | Every NFR has an evidence row naming its artifact or owner phase; the trace gate enforces it |
| `bmad-testarch-nfr` | (same) | The hand-written status summary said 8 green and 13 planned; the generator counted 7 and 12 | The evidence plan | Summary corrected from the generated counts |
| `bmad-testarch-test-review` | `reviews/review-test-quality.md`: 32/100 → 100/100 after triage | 5 conditional assertions that could pass on broken behaviour (`[REP-1.MEC]`, `[COM-3.Q4]`, `[DSC-1.I4]`, `[IDN-3.I3]`, `[MSG-2.MEC]`); 1 shared map mutated by `[REP-3.MEC]`; 6 files over 300 lines; 6 inline request literals; 1 magic constant | ATDD suites | All 19 fixed (Martín, gate #11); files split into core and supporting; ids unchanged |
| `bmad-testarch-trace` | `scripts/gen-solu2-trace.mjs`; `test/traceability-matrix.md` (generated; `gate:trace:solu2`) | FR ranges such as `FR-DSC-1..6` made 5 FRs look unbound. That was a parser gap in the tool, not a design gap | The trace tool | Ranges are expanded for FRs and NFRs; 96/96 FRs, 61/61 ADs, 15/15 P0 risks bound |

## Gate result

| Phase 3 exit criterion | Evidence |
|---|---|
| No P0 risk without a red test | 15/15 (`gate:trace:solu2`) |
| No AD without a test that turns red on violation | 61/61 §14 rows. ATDD tests are red now; fitness tests are proven by planted violations |
| Every MEC has a P0 risk, a contract invariant, a physical enforcement and a red test | 12/12 |
| Red for the right reason | 351 ATDD tests (19 files) and 3 NFR benchmarks (`gate:atdd-red:solu2`, `gate:nfr-red:solu2`) |
| CI gate | `solu2-quality-gate.yml`, locally `npm run gate:solu2` |
| Test review triaged | 19/19 findings accepted and fixed; re-review 100/100 |
