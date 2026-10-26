---
title: "TEZG Solu-2 — NFR evidence plan"
phase: "3 — Test Preparation (TEA)"
deliverable: "3.4 (task-statement.md §6)"
skill: "bmad-testarch-nfr (planning mode: thresholds, measurement and artifact before any implementation)"
---

# NFR evidence plan

Every one of the PRD's 56 NFRs has a row below. Each row gives four things:

- the metric and its threshold, from the PRD and never invented;
- how it is measured;
- the artifact that produces the evidence;
- the status of that evidence today.

`scripts/gen-solu2-trace.mjs` reads the *Artifact* column. Every bracketed test id must be defined, and the NFR matrix of `traceability-matrix.md` §3 shows the result.

**Measurement protocol (PRD §7).** Every latency NFR is measured the same way:

- Docker Postgres 16.6 holding the §3 seed (`seed_marketplace`);
- 50 warm-up calls, then 500 measured calls;
- server-side handler time at N = 1;
- the nearest-rank p95 (`test-support/solu2/bench.ts`).

Concurrency proofs are a separate measure: 50 real connections × 100 repetitions (NFR-SYS-10). The benchmark harness is shared, so a story whose DoD names a latency NFR adds one file next to `nfr/ord1_latency.test.ts` that composes the real services the same way.

**Status values.**

| Status | Meaning |
|---|---|
| **Red — benchmark** | The benchmark exists and fails on `NotImplementedError`. It asserts the threshold once its story is done. |
| **Red — ATDD** | The proof is an acceptance test that fails on `NotImplementedError` today. |
| **Green — gate** | A static gate or a green test proves it on every push. |
| **Planned — story DoD** | No artifact exists yet. The story's Definition of Done adds the benchmark with the shared harness (Phase 4 names the story). |
| **Deferred — launch** | It depends on the deployed system (a browser, a real network or a WCAG audit), and is tracked to the launch checklist. |

**Minimums of the statement.** At least one performance, one reliability and one security NFR must have a concrete artifact now:

- **Performance:** NFR-ORD-2 (`[NFR-ORD-2.p95]`).
- **Reliability:** NFR-SYS-6 (`[NFR-SYS-6.sweep]`).
- **Security:** NFR-SYS-2 (`[NFR-SYS-8.canary]`, `[SYS-8.R4]`).

All three are red, and each fails for the right reason (`npm run gate:nfr-red:solu2`).

## Cross-cutting (SYS)

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-SYS-1 | Explainability | 100 % of decisions cite ≥ 1 rule and observed inputs | `explainAssert` over every decision; every registry code formatted with a cited decision | `[SYS-1.R6]`, `[SYS-1.R6.s2]`; every `.Q4` decision test | Red — ATDD |
| NFR-SYS-2 | Security | 0 regulated values in logs, errors, citations, payloads | Canary scan over the §3 seed with canaries in every regulated column | `[NFR-SYS-8.canary]`, `[SYS-8.R4]`, `[SYS-8.R4.redact]`, `[SYS-8.R4.error]` | Red — benchmark |
| NFR-SYS-3 | Determinism | 0 sockets except the test Postgres | Network guard set up for every Solu-2 project; probe connect | `[SYS-6.R4]` | Green — gate |
| NFR-SYS-4 | Determinism | 0 direct system-clock reads in domain and application code | Static scan of `src/` and the schema | `[SYS-6.R1]`, `[SYS-6.R1.probe]` | Green — gate |
| NFR-SYS-5 | Correctness (money) | 0 floating-point money operations; COP values are `bigint` | BigInt reference sums; rounding CHECK | `[VAL-1.I1]`, `[COM-1.I3]` | Red — ATDD |
| NFR-SYS-6 | Reliability | 0 lost events; each subscriber effect exactly once after a crash between commit and dispatch | 500 undispatched events + 20 half-attempted deliveries drained by the sweeper alone | `[NFR-SYS-6.sweep]`, `[SYS-2.R6]`, `[SYS-2.R4]` | Red — benchmark |
| NFR-SYS-7 | Security | Every non-public procedure derives the actor from the session; 0 client-claimed roles | Router introspection against the registry; static OpenAPI scan | `[SYS-8.R2]`, `[SYS-8.R2.static]` | Red — ATDD |
| NFR-SYS-8 | Security (audit) | 100 % of admin actions write an append-only record | Audit-row assertions in each admin contract; revoked UPDATE/DELETE grants | `[IDN-3.Q1]`, `[REP-2.Q1]`, `[SYS-R2]`, `[SYS-R2.grants]` | Red — ATDD |
| NFR-SYS-9 | Performance | Commands p95 ≤ 800 ms; interactive reads p95 ≤ 1,000 ms at N = 1 | PRD §7 protocol, one benchmark per command family | `[NFR-ORD-2.p95]` (the first); the rest per story DoD | Red — benchmark |
| NFR-SYS-10 | Reliability | Concurrency proofs on Postgres, ≥ 50 connections, 100 repetitions | Test pool of 60 connections; `race()` barrier; real `FOR UPDATE` | `[INV-1.I1]`, `[TRD-1.MEC]`, `[REP-3.MEC]` | Red — ATDD |
| NFR-SYS-11 | Accessibility | WCAG 2.2 AA on R and D surfaces | axe-core + a keyboard walk on the built pages | — | Deferred — launch |
| NFR-SYS-12 | Compliance | No account without a recorded consent and its version | `User.signupConsentAt` / `signupConsentVersion` NOT NULL; the seed proves every account carries both | `[SEED.profile]` | Green — gate |
| NFR-SYS-13 | Maintainability | Every code has one owner and a full error body; every cited code exists | Code-citation gate; owner-checked raiser; formatter over the registry | `[SYS-1.R2]`, `[SYS-1.R6]`; `gate:codes:solu2` | Red — ATDD |
| NFR-SYS-14 | Security (abuse) | Throttles at the OQ-11 values: sign-in, contact handoff | Burst tests against the throttle tables | `[S-FR-IDN-7.f]`, `[MSG-2.R1]` | Red — ATDD |

## Modules

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-IDN-1 | Performance | Capability reads (500 ids) p95 ≤ 50 ms | PRD §7 protocol on `getCapabilities` / `getSellerKinds` | — | Planned — story DoD |
| NFR-IDN-2 | Reliability (MEC) | 100 repetitions: one success, one explained rejection | Race on a fresh account each repetition | `[IDN-1.MEC]`, `[IDN-1.I1]` | Red — ATDD |
| NFR-IDN-3 | Security | 0 procedures accept a role, seller-kind or capability field | Schema scan of every tRPC input | `[SYS-8.R2.static]`, `[SYS-8.R2]` | Green — gate |
| NFR-VER-1 | Reliability (MEC) | 100 repetitions: one transition, one event, no half state | Approve and reject raced by two admins | `[VER-1.MEC]` | Red — ATDD |
| NFR-VER-2 | Security (audit) | 100 % of legal-identity reads and denials audited | Access-log count vs instrumented reads | `[VER-3.I1]`, `[VER-3.I2]`, `[IDN-3.I1]` | Red — ATDD |
| NFR-VER-3 | Performance | Review queue (1,000 pending) p95 ≤ 1,000 ms; signed URL p95 ≤ 300 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-VER-4 | Performance / security | ≤ 5 MB per file, ≤ 3 files; upload + validation p95 ≤ 10 s at 10 Mbps | Quarantine validation tests; the transfer time needs a shaped network | `[VER-2.P3]`, `[VER-2.P5]` | Red — ATDD (size); Deferred — launch (transfer) |
| NFR-CAT-1 | Performance | Browse over 10,000 entries p95 ≤ 1,000 ms; provenance for 48 p95 ≤ 300 ms | PRD §7 protocol on the §3 catalog | — | Planned — story DoD |
| NFR-CAT-2 | Performance / integrity | 10,000-row run ≤ 120 s; a rerun creates 0 duplicates | Unique `externalKey`; convergent rerun | `[CAT-2.I1]`, `[CAT-2.MEC]` | Red — ATDD |
| NFR-CAT-3 | Correctness | 0 fabricated prices under `down`, `stale`, `malformedRows` | Fault switches on the fixture feed; byte-equal to stored observations | `[CAT-3.I1]`, `[CAT-3.Q4]`, `[S-FR-CAT-8.f]` | Red — ATDD |
| NFR-CAT-4 | Reliability | The TRM job runs off request paths and never invents a rate | Job contract with the virtual clock; covered-day no-op | `[S-FR-CAT-8.h]`, `[S-FR-CAT-8.f]` | Red — ATDD |
| NFR-INV-1 | Reliability | 100 repetitions: 1 reservation, 49 `InsufficientQuantity` | 50-way race on the last unit | `[INV-1.I1]` | Red — ATDD |
| NFR-INV-2 | Reliability | A mixed purchase/trade race gives the NFR-INV-1 result | Shared-unit race, bundle vs single | `[INV-1.I3]`, `[TRD-1.MEC]` | Red — ATDD |
| NFR-INV-3 | Reliability (MEC) | 100 repetitions of reserve-then-abort restore the quantity | Abort inside the caller's transaction | `[INV-1.MEC]` | Red — ATDD |
| NFR-INV-4 | Performance | Reservation p95 ≤ 150 ms (bundle of 20 ≤ 300 ms); listing creation ≤ 800 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-DSC-1 | Performance | `view=listings`, 15 km, p95 ≤ 1,000 ms (§3 seed), ≤ 1,500 ms at 50,000 listings | PRD §7 protocol; `seedMarketplace({ scale })` for the larger seed | — | Planned — story DoD |
| NFR-DSC-2 | Correctness | Distance error ≤ 1 m vs haversine | SQL vs TypeScript reference | `[DSC-1.I4]` | Red — ATDD |
| NFR-DSC-3 | Determinism | 10 identical runs, 0 ordering differences | Repeated and concurrent equal searches | `[DSC-1.R1]` | Red — ATDD |
| NFR-ORD-1 | Reliability (MEC) | Out-of-order and duplicate confirmations safe, 100 repetitions | Confirmation sequences and races | `[ORD-3.MEC]`, `[ORD-4.MEC]`, `[ORD-2.MEC]` | Red — ATDD |
| NFR-ORD-2 | Performance | `createOrder` incl. reservation p95 ≤ 800 ms; comprobante upload ≤ 10 s at 10 Mbps | PRD §7 protocol on composed services over the §3 seed | `[NFR-ORD-2.p95]` | Red — benchmark |
| NFR-ORD-3 | Security / scope | 0 funds-held states or gateway calls | Schema check; network guard | `[ORD-1.I4]`, `[SYS-6.R4]` | Red — ATDD |
| NFR-ORD-4 | Usability | A paid order unconfirmed for 7 days shows the waiting state and the support contact | UI-state gate (page states backed by the order view); support-contact read | `[S-FR-ORD-10.h]`; `gate:ui:solu2` | Red — ATDD |
| NFR-COM-1 | Reliability (MEC) | 100 repetitions: each order charged once, Exhausted published once | Two orders at one instant plus a duplicate event | `[COM-1.MEC]`, `[COM-1.MEC2]` | Red — ATDD |
| NFR-COM-2 | Correctness | Reconciliation difference 0 pesos over 10,000 operations, 20 % duplicates | Reconcile over the ledger; seq-gap detection | `[COM-3.Q1]`, `[COM-3.I1]` | Red — ATDD |
| NFR-COM-3 | Performance | Deduction handler p95 ≤ 200 ms; top-up confirmation ≤ 800 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-COM-4 | Correctness (money) | 0 floating-point operations on COP in commission | BigInt reference; rounding CHECK | `[COM-1.I3]` | Red — ATDD |
| NFR-TRD-1 | Reliability (MEC) | 100 repetitions: one Accepted, one Unfulfillable | Two accepts for the last unit | `[TRD-1.MEC]` | Red — ATDD |
| NFR-TRD-2 | Performance | Accept p95 ≤ 800 ms; other actions ≤ 500 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-TRD-3 | Reliability | Trade vs purchase on a shared unit never oversells | Mixed race | `[INV-1.I3]`, `[TRD-1.I1]` | Red — ATDD |
| NFR-MSG-1 | Performance / determinism | Generation p95 ≤ 200 ms; 1 distinct output per input over 1,000 runs | Repeated generation | `[MSG-2.I1]` | Red — ATDD (determinism); Planned — story DoD (latency) |
| NFR-MSG-2 | Performance | Send p95 ≤ 500 ms; visible to the recipient ≤ 35 s at p95 (30 s polling) | PRD §7 protocol; polling interval in the client | `[MSG-1.R1]` | Red — ATDD (ordering); Planned — story DoD (latency) |
| NFR-MSG-3 | Security / scope | 0 outbound calls to messaging services | Network guard | `[SYS-6.R4]` | Green — gate |
| NFR-MSG-4 | Correctness (MEC) | Every fixture name renders (ñ, accents, emoji, 500 chars, URL-like) | Contact-message generation over the fixture names; state change between compose and send | `[MSG-2.MEC]`, `[MSG-3.MEC]` | Red — ATDD |
| NFR-COL-1 | Reliability (MEC) | 100 repetitions: one prompt, one entry set | Duplicate `OrderClosed` and double accept | `[COL-1.MEC]`, `[COL-2.I1]` | Red — ATDD |
| NFR-COL-2 | Performance | Binder page (500 entries, sorted) p95 ≤ 800 ms; wishlist of 200 ≤ 1,000 ms | PRD §7 protocol on the seed's 500-entry collection | — | Planned — story DoD |
| NFR-COL-3 | Integrity | 0 `CatalogEntry` writes from `collections` | Table-ownership scan; count assertion around FR-COL-3 | `[SYS-AD8]`, `[S-FR-COL-3.h]` | Green — gate |
| NFR-VAL-1 | Correctness (MEC) | Zero baseline → null, never NaN; drift over 500 entries bounded | Exact BigInt reference; ⌊Σ qty(fx) / 2⌋ bound | `[VAL-1.MEC]`, `[VAL-2.I1]`, `[VAL-2.I3]` | Red — ATDD |
| NFR-VAL-2 | Performance | Value + 30-day trend (500 entries) p95 ≤ 1,500 ms; 365-day history ≤ 2,500 ms | PRD §7 protocol on the seed's 500-entry collection | — | Planned — story DoD |
| NFR-VAL-3 | Correctness (money) | 0 floating-point COP; exact percentages | BigInt sums; half-away-from-zero rounding | `[VAL-1.I1]`, `[VAL-2.I3]` | Red — ATDD |
| NFR-REP-1 | Reliability (MEC) | Paid-not-closed refused 100/100; hide racing a post keeps the aggregate exact | Repeated refusal; 100-repetition race | `[REP-1.MEC]`, `[REP-3.MEC]` | Red — ATDD |
| NFR-REP-2 | Performance | Profile read p95 ≤ 300 ms; a hide applies on the next read | PRD §7 protocol; next-read assertion | `[S-FR-REP-7.h]` | Red — ATDD (next read); Planned — story DoD (latency) |
| NFR-REP-3 | Integrity | 0 hard deletes of `Review` or `Listing` | `DELETE` revoked from the app role | `[REP-2.I1]`, `[SYS-R2.grants]` | Green — gate (grant); Red — ATDD (behaviour) |

## Summary

| Status | NFRs |
|---|---|
| Red — benchmark | 4 (NFR-SYS-2, NFR-SYS-6, NFR-SYS-9, NFR-ORD-2) |
| Red — ATDD (wholly or in part) | 36 |
| Green — gate (wholly or in part) | 7 (NFR-SYS-3, NFR-SYS-4, NFR-SYS-12, NFR-IDN-3, NFR-MSG-3, NFR-COL-3, NFR-REP-3) |
| Planned — story DoD (wholly or in part) | 12: the latency NFRs without a benchmark yet. Each gets one in its story, with the shared harness |
| Deferred — launch | 2: NFR-SYS-11 (WCAG audit), and NFR-VER-4's transfer time on a shaped 10 Mbps link |

Rows marked "in part" are counted under each of their statuses, so the summary adds up to more than 56. No NFR is left without a named artifact or an owner phase.
