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
| **Green — ATDD** | Every acceptance test the row names belongs to a done story, so `npm run gate:atdd-red:impl1` requires it to pass on every push. |
| **Green — gate** | A static gate or a green test proves it on every push. |
| **Green — benchmark** | Its story is done, and the benchmark asserts the PRD threshold in `npm run gate:nfr-red:impl1`. The last measured figures are under *Measured* below. |
| **Planned — story DoD** | No artifact exists yet. The story's Definition of Done adds the benchmark with the shared harness (Phase 4 names the story). |
| **Deferred — launch** | It depends on the deployed system (a browser, a real network or a WCAG audit), and is tracked to the launch checklist. |

**Minimums of the statement.** At least one performance, one reliability and one security NFR must have a concrete artifact now:

- **Performance:** NFR-ORD-2 (`[NFR-ORD-2.p95]`).
- **Reliability:** NFR-SYS-6 (`[NFR-SYS-6.sweep]`).
- **Security:** NFR-SYS-2 (`[NFR-SYS-8.canary]`, `[SYS-8.R4]`).

All three were red when this plan was written (`npm run gate:nfr-red:solu2`). NFR-SYS-6 and NFR-SYS-2 are now green with Epic 1; NFR-ORD-2 stays red until Story 7.1.

**Refresh.** The table was refreshed as a whole on 2026-10-27 (Epic 4; the Epic 3 review deferral): every row whose named tests all belong to done stories moved off "Red". Each later epic refreshes the rows its stories turn green.

## Cross-cutting (SYS)

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-SYS-1 | Explainability | 100 % of decisions cite ≥ 1 rule and observed inputs | `explainAssert` over every decision; every registry code formatted with a cited decision | `[SYS-1.R6]`, `[SYS-1.R6.s2]`; every `.Q4` decision test | Green — ATDD |
| NFR-SYS-2 | Security | 0 regulated values in logs, errors, citations, payloads | Canary scan over the §3 seed with canaries in every regulated column | `[NFR-SYS-8.canary]`, `[SYS-8.R4]`, `[SYS-8.R4.redact]`, `[SYS-8.R4.error]` | Green — benchmark |
| NFR-SYS-3 | Determinism | 0 sockets except the test Postgres | Network guard set up for every Solu-2 project; probe connect | `[SYS-6.R4]` | Green — gate |
| NFR-SYS-4 | Determinism | 0 direct system-clock reads in domain and application code | Static scan of `src/` and the schema | `[SYS-6.R1]`, `[SYS-6.R1.probe]` | Green — gate |
| NFR-SYS-5 | Correctness (money) | 0 floating-point money operations; COP values are `bigint` | BigInt reference sums; rounding CHECK | `[VAL-1.I1]`, `[COM-1.I3]` | Red — ATDD |
| NFR-SYS-6 | Reliability | 0 lost events; each subscriber effect exactly once after a crash between commit and dispatch | 500 undispatched events + 20 half-attempted deliveries drained by the sweeper alone | `[NFR-SYS-6.sweep]`, `[SYS-2.R6]`, `[SYS-2.R4]` | Green — benchmark |
| NFR-SYS-7 | Security | Every non-public procedure derives the actor from the session; 0 client-claimed roles | Router introspection against the registry; static OpenAPI scan | `[SYS-8.R2]`, `[SYS-8.R2.static]` | Green — ATDD |
| NFR-SYS-8 | Security (audit) | 100 % of admin actions write an append-only record | Audit-row assertions in each admin contract; revoked UPDATE/DELETE grants | `[IDN-3.Q1]`, `[REP-2.Q1]`, `[SYS-R2]`, `[SYS-R2.grants]` | Green — ATDD (identity, VER, the grants); Red — ATDD (`[REP-2.Q1]`) |
| NFR-SYS-9 | Performance | Commands p95 ≤ 800 ms; interactive reads p95 ≤ 1,000 ms at N = 1 | PRD §7 protocol, one benchmark per command family | `[NFR-ORD-2.p95]` (the first); the rest per story DoD | Red — benchmark |
| NFR-SYS-10 | Reliability | Concurrency proofs on Postgres, ≥ 50 connections, 100 repetitions | Test pool of 60 connections; `race()` barrier; real `FOR UPDATE` | `[INV-1.I1]`, `[TRD-1.MEC]`, `[REP-3.MEC]` | Green — ATDD (`[INV-1.I1]`); Red — ATDD (`[TRD-1.MEC]`, `[REP-3.MEC]`) |
| NFR-SYS-11 | Accessibility | WCAG 2.2 AA on R and D surfaces | axe-core + a keyboard walk on the built pages | — | Deferred — launch |
| NFR-SYS-12 | Compliance | No account without a recorded consent and its version | `User.signupConsentAt` / `signupConsentVersion` NOT NULL; the seed proves every account carries both | `[SEED.profile]` | Green — gate |
| NFR-SYS-13 | Maintainability | Every code has one owner and a full error body; every cited code exists | Code-citation gate; owner-checked raiser; formatter over the registry | `[SYS-1.R2]`, `[SYS-1.R6]`; `gate:codes:solu2` | Green — ATDD |
| NFR-SYS-14 | Security (abuse) | Throttles at the OQ-11 values: sign-in, contact handoff | Burst tests against the throttle tables | `[S-FR-IDN-7.f]`, `[MSG-2.R1]` | Green — ATDD (`[S-FR-IDN-7.f]`, the count only: no sign-in records a failure yet, decision log Impl-1 #26); Red — ATDD (`[MSG-2.R1]`) |

## Modules

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-IDN-1 | Performance | Capability reads (500 ids) p95 ≤ 50 ms | PRD §7 protocol on `getCapabilities` / `getSellerKinds` | — | Planned — story DoD |
| NFR-IDN-2 | Reliability (MEC) | 100 repetitions: one success, one explained rejection | Race on a fresh account each repetition | `[IDN-1.MEC]`, `[IDN-1.I1]` | Green — ATDD |
| NFR-IDN-3 | Security | 0 procedures accept a role, seller-kind or capability field | Schema scan of every tRPC input | `[SYS-8.R2.static]`, `[SYS-8.R2]` | Green — gate |
| NFR-VER-1 | Reliability (MEC) | 100 repetitions: one transition, one event, no half state | Approve and reject raced by two admins | `[VER-1.MEC]` | Green — ATDD |
| NFR-VER-2 | Security (audit) | 100 % of legal-identity reads and denials audited | Access-log count vs instrumented reads | `[VER-3.I1]`, `[VER-3.I2]`, `[IDN-3.I1]` | Green — ATDD |
| NFR-VER-3 | Performance | Review queue (1,000 pending) p95 ≤ 1,000 ms; signed URL p95 ≤ 300 ms | PRD §7 protocol over the §3 seed topped up to 1,000 Pending applications; the signed-URL figure times the whole `getApplicationForReview` call, with the in-memory storage double until the production adapter lands (a provider's signing latency is not in it) | `[NFR-VER-3.queue]`, `[NFR-VER-3.sign]` | Green — benchmark |
| NFR-VER-4 | Performance / security | ≤ 5 MB per file, ≤ 3 files; upload + validation p95 ≤ 10 s at 10 Mbps | Quarantine validation tests; the transfer time needs a shaped network | `[VER-2.P3]`, `[VER-2.P5]` | Green — ATDD (size); Deferred — launch (transfer) |
| NFR-CAT-1 | Performance | Browse over 10,000 entries p95 ≤ 1,000 ms; provenance for 48 p95 ≤ 300 ms | PRD §7 protocol on the §3 catalog | `[NFR-CAT-1.provenance]`, `[NFR-CAT-1.browse]` | Green — benchmark |
| NFR-CAT-2 | Performance / integrity | 10,000-row run ≤ 120 s; a rerun creates 0 duplicates | Unique `externalKey`; convergent rerun | `[CAT-2.I1]`, `[CAT-2.MEC]` | Green — ATDD |
| NFR-CAT-3 | Correctness | 0 fabricated prices under `down`, `stale`, `malformedRows` | Fault switches on the fixture feed; byte-equal to stored observations | `[CAT-3.I1]`, `[CAT-3.Q4]`, `[S-FR-CAT-8.f]` | Green — ATDD |
| NFR-CAT-4 | Reliability | The TRM job runs off request paths and never invents a rate | Job contract with the virtual clock; covered-day no-op | `[S-FR-CAT-8.h]`, `[S-FR-CAT-8.f]` | Green — ATDD |
| NFR-INV-1 | Reliability | 100 repetitions: 1 reservation, 49 `InsufficientQuantity` | 50-way race on the last unit | `[INV-1.I1]` | Green — ATDD |
| NFR-INV-2 | Reliability | A mixed purchase/trade race gives the NFR-INV-1 result | Shared-unit race, bundle vs single | `[INV-1.I3]`, `[TRD-1.MEC]` | Green — ATDD (`[INV-1.I3]`); Red — ATDD (`[TRD-1.MEC]`) |
| NFR-INV-3 | Reliability (MEC) | 100 repetitions of reserve-then-abort restore the quantity | Abort inside the caller's transaction | `[INV-1.MEC]` | Green — ATDD |
| NFR-INV-4 | Performance | Reservation p95 ≤ 150 ms (bundle of 20 ≤ 300 ms); listing creation ≤ 800 ms | PRD §7 protocol | `[NFR-INV-4.reserve]`, `[NFR-INV-4.bundle]`, `[NFR-INV-4.create]` | Green — benchmark |
| NFR-DSC-1 | Performance | `view=listings`, 15 km, p95 ≤ 1,000 ms (§3 seed), ≤ 1,500 ms at 50,000 listings | PRD §7 protocol on the §3 seed, and on the §3 seed grown to 50,000 listings (`view=listings`; the DTO has no `view=entries`) | `[NFR-DSC-1.seed]`, `[NFR-DSC-1.scale]` | Green — benchmark |
| NFR-DSC-2 | Correctness | Distance error ≤ 1 m vs haversine | SQL vs TypeScript reference | `[DSC-1.I4]` | Green — ATDD |
| NFR-DSC-3 | Determinism | 10 identical runs, 0 ordering differences | Repeated and concurrent equal searches | `[DSC-1.R1]` | Green — ATDD |
| NFR-ORD-1 | Reliability (MEC) | Out-of-order and duplicate confirmations safe, 100 repetitions | Confirmation sequences and races | `[ORD-3.MEC]`, `[ORD-4.MEC]`, `[ORD-2.MEC]` | Red — ATDD |
| NFR-ORD-2 | Performance | `createOrder` incl. reservation p95 ≤ 800 ms; comprobante upload ≤ 10 s at 10 Mbps | PRD §7 protocol on composed services over the §3 seed | `[NFR-ORD-2.p95]` | Red — benchmark |
| NFR-ORD-3 | Security / scope | 0 funds-held states or gateway calls | Schema check; network guard | `[ORD-1.I4]`, `[SYS-6.R4]` | Green — gate (`[SYS-6.R4]`); Red — ATDD (`[ORD-1.I4]`) |
| NFR-ORD-4 | Usability | A paid order unconfirmed for 7 days shows the waiting state and the support contact | UI-state gate (page states backed by the order view); support-contact read | `[S-FR-ORD-10.h]`; `gate:ui:solu2` | Red — ATDD |
| NFR-COM-1 | Reliability (MEC) | 100 repetitions: each order charged once, Exhausted published once | Two orders at one instant plus a duplicate event | `[COM-1.MEC]`, `[COM-1.MEC2]` | Red — ATDD |
| NFR-COM-2 | Correctness | Reconciliation difference 0 pesos over 10,000 operations, 20 % duplicates | Reconcile over the ledger; seq-gap detection | `[COM-3.Q1]`, `[COM-3.I1]` | Red — ATDD |
| NFR-COM-3 | Performance | Deduction handler p95 ≤ 200 ms; top-up confirmation ≤ 800 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-COM-4 | Correctness (money) | 0 floating-point operations on COP in commission | BigInt reference; rounding CHECK | `[COM-1.I3]` | Red — ATDD |
| NFR-TRD-1 | Reliability (MEC) | 100 repetitions: one Accepted, one Unfulfillable | Two accepts for the last unit | `[TRD-1.MEC]` | Red — ATDD |
| NFR-TRD-2 | Performance | Accept p95 ≤ 800 ms; other actions ≤ 500 ms | PRD §7 protocol | — | Planned — story DoD |
| NFR-TRD-3 | Reliability | Trade vs purchase on a shared unit never oversells | Mixed race | `[INV-1.I3]`, `[TRD-1.I1]` | Green — ATDD (`[INV-1.I3]`); Red — ATDD (`[TRD-1.I1]`) |
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
| Green — benchmark | 6 (NFR-SYS-2, NFR-SYS-6, NFR-VER-3, NFR-CAT-1, NFR-INV-4, NFR-DSC-1) |
| Green — ATDD (wholly or in part) | 21 (NFR-SYS-1, -7, -8, -10, -13, -14, NFR-IDN-2, NFR-VER-1, -2, -4, NFR-CAT-2, -3, -4, NFR-INV-1, -2, -3, NFR-DSC-2, -3, NFR-TRD-3; NFR-SYS-8, -10, -14, NFR-INV-2 and NFR-TRD-3 in part) |
| Green — gate (wholly or in part) | 8 (NFR-SYS-3, NFR-SYS-4, NFR-SYS-12, NFR-IDN-3, NFR-MSG-3, NFR-COL-3, NFR-REP-3, NFR-ORD-3) |
| Red — benchmark | 2 (NFR-SYS-9, NFR-ORD-2) |
| Red — ATDD (wholly or in part) | 22 |
| Planned — story DoD (wholly or in part) | 8: the latency NFRs without a benchmark yet. Each gets one in its story, with the shared harness |
| Deferred — launch | 2: NFR-SYS-11 (WCAG audit), and NFR-VER-4's transfer time on a shaped 10 Mbps link |

Rows marked "in part" are counted under each of their statuses, so the summary adds up to more than 56. No NFR is left without a named artifact or an owner phase.

## Measured

Each benchmark writes its figures (milliseconds, n = 500) to `.vitest-results/`. Run one with `npx vitest run --project solu2-nfr <file>`, or all of them with `npm run gate:nfr-red:impl1`.

| NFR | Benchmark | Result file | p50 | p95 | Threshold | Measured |
|---|---|---|---|---|---|---|
| NFR-VER-3 | `[NFR-VER-3.queue]` | `nfr-ver-3-queue.json` | 3.3 | 6.1 | p95 ≤ 1,000 | 2026-10-26, Epic 3 review, local Docker Postgres 16 |
| NFR-VER-3 | `[NFR-VER-3.sign]` | `nfr-ver-3-sign.json` | 4.9 | 8.2 | p95 ≤ 300 | 2026-10-26, Epic 3 review (signing inside the grant transaction), local Docker Postgres 16, in-memory storage |
| NFR-CAT-1 | `[NFR-CAT-1.provenance]` | `nfr-cat-1-provenance.json` | 4.9 | 11.9 | p95 ≤ 300 | 2026-10-27, Story 4.4, 48 priced ids over 30 days, local Postgres 16 |
| NFR-CAT-1 | `[NFR-CAT-1.browse]` | `nfr-cat-1-browse.json` | 2.1 | 9.9 | p95 ≤ 1,000 | 2026-10-27, Story 4.5, the 10,000-entry §3 catalog (no filter, one set, a name prefix), local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.reserve]` | `nfr-inv-4-reserve.json` | 2.9 | 4.3 | p95 ≤ 150 | 2026-10-27, Story 5.2, funded single listings of the §3 seed, each reserve in a transaction rolled back after the call, local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.bundle]` | `nfr-inv-4-bundle.json` | 5.8 | 10.4 | p95 ≤ 300 | 2026-10-27, Story 5.2, a 20-component bundle on the §3 seed, rolled back after each call, local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.create]` | `nfr-inv-4-create.json` | 2.1 | 4.3 | p95 ≤ 800 | 2026-10-27, Story 5.1, individual sellers and funded businesses on the §3 seed, half new units and half links, local Postgres 16 |
| NFR-DSC-1 | `[NFR-DSC-1.seed]` | `nfr-dsc-1-seed.json` | 12.1 | 19.0 | p95 ≤ 1,000 | 2026-10-27, Epic 6 review, 15 km around Bogotá, pages 1–3, the §3 seed, local Postgres 16 |
| NFR-DSC-1 | `[NFR-DSC-1.scale]` | `nfr-dsc-1-scale.json` | 57.7 | 97.2 | p95 ≤ 1,500 | 2026-10-27, Epic 6 review, the same searches on the §3 seed grown to 50,000 listings around the four cities, local Postgres 16 |
