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

All three were red when this plan was written (`npm run gate:nfr-red:solu2`). NFR-SYS-6 and NFR-SYS-2 turned green with Epic 1, and NFR-ORD-2 with Story 7.1.

**Refresh.** The table was refreshed as a whole on 2026-10-27 (Epic 4; the Epic 3 review deferral): every row whose named tests all belong to done stories moved off "Red". Each later epic refreshes the rows its stories turn green.

## Cross-cutting (SYS)

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-SYS-1 | Explainability | 100 % of decisions cite ≥ 1 rule and observed inputs | `explainAssert` over every decision; every registry code formatted with a cited decision | `[SYS-1.R6]`, `[SYS-1.R6.s2]`; every `.Q4` decision test | Green — ATDD |
| NFR-SYS-2 | Security | 0 regulated values in logs, errors, citations, payloads | Canary scan over the §3 seed with canaries in every regulated column | `[NFR-SYS-8.canary]`, `[SYS-8.R4]`, `[SYS-8.R4.redact]`, `[SYS-8.R4.error]` | Green — benchmark |
| NFR-SYS-3 | Determinism | 0 sockets except the test Postgres | Network guard set up for every Solu-2 project; probe connect | `[SYS-6.R4]` | Green — gate |
| NFR-SYS-4 | Determinism | 0 direct system-clock reads in domain and application code | Static scan of `src/` and the schema | `[SYS-6.R1]`, `[SYS-6.R1.probe]` | Green — gate |
| NFR-SYS-5 | Correctness (money) | 0 floating-point money operations; COP values are `bigint` | BigInt reference sums; rounding CHECK | `[VAL-1.I1]`, `[COM-1.I3]` | Green — ATDD (`[COM-1.I3]` with Story 8.2, `[VAL-1.I1]` with Story 12.1) |
| NFR-SYS-6 | Reliability | 0 lost events; each subscriber effect exactly once after a crash between commit and dispatch | 500 undispatched events + 20 half-attempted deliveries drained by the sweeper alone | `[NFR-SYS-6.sweep]`, `[SYS-2.R6]`, `[SYS-2.R4]` | Green — benchmark |
| NFR-SYS-7 | Security | Every non-public procedure derives the actor from the session; 0 client-claimed roles | Router introspection against the registry; static OpenAPI scan | `[SYS-8.R2]`, `[SYS-8.R2.static]` | Green — ATDD |
| NFR-SYS-8 | Security (audit) | 100 % of admin actions write an append-only record | Audit-row assertions in each admin contract; revoked UPDATE/DELETE grants | `[IDN-3.Q1]`, `[REP-2.Q1]`, `[SYS-R2]`, `[SYS-R2.grants]` | Green — ATDD (identity, VER, the grants, and `[REP-2.Q1]` with Story 13.2) |
| NFR-SYS-9 | Performance | Commands p95 ≤ 800 ms; interactive reads p95 ≤ 1,000 ms at N = 1 | PRD §7 protocol, one benchmark per command family | `[NFR-ORD-2.p95]` (the first), then the module benchmarks under *Measured*; the rest per story DoD | Green — benchmark |
| NFR-SYS-10 | Reliability | Concurrency proofs on Postgres, ≥ 50 connections, 100 repetitions | Test pool of 60 connections; `race()` barrier; real `FOR UPDATE` | `[INV-1.I1]`, `[TRD-1.MEC]`, `[REP-3.MEC]` | Green — ATDD (`[INV-1.I1]`, `[TRD-1.MEC]`, and `[REP-3.MEC]` with Story 13.3) |
| NFR-SYS-11 | Accessibility | WCAG 2.2 AA on R and D surfaces | axe-core (`@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) asserts 0 violations at each meaningful state of the Playwright journeys on the production build: home, sign-in (and its refusal), inbox and thread, the collections list, the binder, the add-by-link page (and its field error) and the seller profile (and its Not-available page), `BasePage.expectNoA11yViolations()`; then a manual audit (screen reader, keyboard walk-through, contrast of dynamic states) on the built pages | `e2e/*.spec.ts` (the four journeys, `// Traces: NFR-SYS-11`) | Green — gate (the automated WCAG 2.x A and AA rules, `npx playwright test` in the CI `e2e` job, decision log Impl-2 #31 and #33, evidence `evidence/impl2/34-a11y-axe.log`); Deferred — launch (the manual audit: screen reader, keyboard walk-through, contrast of dynamic states) |
| NFR-SYS-12 | Compliance | No account without a recorded consent and its version | `User.signupConsentAt` / `signupConsentVersion` NOT NULL; the seed proves every account carries both | `[SEED.profile]` | Green — gate |
| NFR-SYS-13 | Maintainability | Every code has one owner and a full error body; every cited code exists | Code-citation gate; owner-checked raiser; formatter over the registry | `[SYS-1.R2]`, `[SYS-1.R6]`; `gate:codes:solu2` | Green — ATDD |
| NFR-SYS-14 | Security (abuse) | Throttles at the OQ-11 values: sign-in, contact handoff | Burst tests against the throttle tables | `[S-FR-IDN-7.f]`, `[MSG-2.R1]` | Green — ATDD (`[S-FR-IDN-7.f]` counts only, since no sign-in records a failure yet, decision log Impl-1 #26, and `[MSG-2.R1]` with Story 9.3) |

## Modules

| NFR | Category | Metric (threshold) | Measurement | Artifact | Status |
|---|---|---|---|---|---|
| NFR-IDN-1 | Performance | Capability reads (500 ids) p95 ≤ 50 ms | PRD §7 protocol on `getCapabilities`, `requireListingEligibility` and `getSellerKinds` (500 known ids) over the §3 seed's accounts | `[NFR-IDN-1.capabilities]`, `[NFR-IDN-1.eligibility]` (Story 2.3), `[NFR-IDN-1.sellerKinds]` (Story 2.5) | Green — benchmark (the Impl-2 test hardening, 2026-11-04) |
| NFR-IDN-2 | Reliability (MEC) | 100 repetitions: one success, one explained rejection | Race on a fresh account each repetition | `[IDN-1.MEC]`, `[IDN-1.I1]` | Green — ATDD |
| NFR-IDN-3 | Security | 0 procedures accept a role, seller-kind or capability field | Schema scan of every tRPC input | `[SYS-8.R2.static]`, `[SYS-8.R2]` | Green — gate |
| NFR-VER-1 | Reliability (MEC) | 100 repetitions: one transition, one event, no half state | Approve and reject raced by two admins | `[VER-1.MEC]` | Green — ATDD |
| NFR-VER-2 | Security (audit) | 100 % of legal-identity reads and denials audited | Access-log count vs instrumented reads | `[VER-3.I1]`, `[VER-3.I2]`, `[IDN-3.I1]` | Green — ATDD |
| NFR-VER-3 | Performance | Review queue (1,000 pending) p95 ≤ 1,000 ms; signed URL p95 ≤ 300 ms | PRD §7 protocol over the §3 seed topped up to 1,000 Pending applications; the signed-URL figure times the whole `getApplicationForReview` call, with the in-memory storage double until the production adapter lands (a provider's signing latency is not in it) | `[NFR-VER-3.queue]`, `[NFR-VER-3.sign]` | Green — benchmark |
| NFR-VER-4 | Performance / security | ≤ 5 MB per file, ≤ 3 files; upload + validation p95 ≤ 10 s at 10 Mbps | Quarantine validation tests; the transfer time needs a shaped network | `[VER-2.P3]`, `[VER-2.P5]` | Green — ATDD (size); Deferred — launch (transfer) |
| NFR-CAT-1 | Performance | Browse over 10,000 entries p95 ≤ 1,000 ms; provenance for 48 p95 ≤ 300 ms | PRD §7 protocol on the §3 catalog | `[NFR-CAT-1.provenance]`, `[NFR-CAT-1.browse]` | Green — benchmark |
| NFR-CAT-2 | Performance / integrity | 10,000-row run ≤ 120 s; a rerun creates 0 duplicates | Unique `externalKey`; convergent rerun | `[CAT-2.I1]`, `[CAT-2.MEC]` | Green — ATDD |
| NFR-CAT-3 | Correctness | 0 fabricated prices under `down`, `stale`, `malformedRows` | Fault switches on the fixture feed; byte-equal to stored observations | `[CAT-3.I1]`, `[CAT-3.Q4]`, `[S-FR-CAT-8.f]` | Green — ATDD |
| NFR-CAT-4 | Reliability | The TRM job runs off request paths and never invents a rate; a failing source is short-circuited by a circuit breaker (3 failures in a row open it for 30 min, then one probe) while the last stored rate is served stale | Job contract with the virtual clock; covered-day no-op; the pure breaker state machine, and races on its shared Postgres row (50 fetches give one probe, 3 concurrent failures lose no count, 20 rounds) | `[S-FR-CAT-8.h]`, `[S-FR-CAT-8.f]`, `[S-FR-CAT-8.breaker.open]`, `[S-FR-CAT-8.breaker.halfOpen]`, `[S-FR-CAT-8.breaker.C1]`, `[S-FR-CAT-8.breaker.C2]` (Story 4.6) | Green — ATDD (the breaker with Story 4.6, decision log Impl-2 #31) |
| NFR-INV-1 | Reliability | 100 repetitions: 1 reservation, 49 `InsufficientQuantity` | 50-way race on the last unit | `[INV-1.I1]` | Green — ATDD |
| NFR-INV-2 | Reliability | A mixed purchase/trade race gives the NFR-INV-1 result | Shared-unit race, bundle vs single | `[INV-1.I3]`, `[TRD-1.MEC]` | Green — ATDD (`[INV-1.I3]` with Story 5.2, `[TRD-1.MEC]` with Story 10.3) |
| NFR-INV-3 | Reliability (MEC) | 100 repetitions of reserve-then-abort restore the quantity | Abort inside the caller's transaction | `[INV-1.MEC]` | Green — ATDD |
| NFR-INV-4 | Performance | Reservation p95 ≤ 150 ms (bundle of 20 ≤ 300 ms); listing creation ≤ 800 ms | PRD §7 protocol | `[NFR-INV-4.reserve]`, `[NFR-INV-4.bundle]`, `[NFR-INV-4.create]` | Green — benchmark |
| NFR-DSC-1 | Performance | `view=listings`, 15 km, p95 ≤ 1,000 ms (§3 seed), ≤ 1,500 ms at 50,000 listings | PRD §7 protocol on the §3 seed, and on the §3 seed grown to 50,000 listings (`view=listings`; the DTO has no `view=entries`) | `[NFR-DSC-1.seed]`, `[NFR-DSC-1.scale]` | Green — benchmark |
| NFR-DSC-2 | Correctness | Distance error ≤ 1 m vs haversine | SQL vs TypeScript reference | `[DSC-1.I4]` | Green — ATDD |
| NFR-DSC-3 | Determinism | 10 identical runs, 0 ordering differences | Repeated and concurrent equal searches | `[DSC-1.R1]` | Green — ATDD |
| NFR-ORD-1 | Reliability (MEC) | Out-of-order and duplicate confirmations safe, 100 repetitions | Confirmation sequences and races | `[ORD-3.MEC]`, `[ORD-4.MEC]`, `[ORD-2.MEC]` | Green — ATDD |
| NFR-ORD-2 | Performance | `createOrder` incl. reservation p95 ≤ 800 ms; comprobante upload ≤ 10 s at 10 Mbps | PRD §7 protocol on composed services over the §3 seed | `[NFR-ORD-2.p95]` | Green — benchmark (creation); Deferred — launch (the upload's transfer time needs the production storage) |
| NFR-ORD-3 | Security / scope | 0 funds-held states or gateway calls | Schema check; network guard | `[ORD-1.I4]`, `[SYS-6.R4]` | Green — gate (`[SYS-6.R4]`); Green — ATDD (`[ORD-1.I4]`) |
| NFR-ORD-4 | Usability | A paid order unconfirmed for 7 days shows the waiting state and the support contact | UI-state gate (page states backed by the order view); support-contact read; the page copy belongs to UI 6.2 | `[S-FR-ORD-10.h]`; `gate:ui:solu2` | Green — ATDD (the support contact and the 7-day notice, `OrderAwaitingBusiness`) |
| NFR-COM-1 | Reliability (MEC) | 100 repetitions: each order charged once, Exhausted published once | Two orders at one instant plus a duplicate event | `[COM-1.MEC]`, `[COM-1.MEC2]` | Green — ATDD |
| NFR-COM-2 | Correctness | Reconciliation difference 0 pesos over 10,000 operations, 20 % duplicates | Reconcile over the ledger; seq-gap detection; 10,000 seeded-random top-ups and deductions with redelivered orders, then one reconcile | `[COM-3.Q1]`, `[COM-3.I1]`, `[COM-3.C1]`, `[NFR-COM-2.drift]` (Story 8.5) | Green — ATDD (`[COM-3.Q1]`, `[COM-3.I1]` and `[COM-3.C1]` with Story 8.5); Green — benchmark (`[NFR-COM-2.drift]`, 2026-11-03, 10,000 operations: 1,988 top-ups, 6,480 orders and 1,532 duplicate deliveries, 19.1 % of deliveries, 0 discrepancies and a difference of 0 pesos, about 170 s on local Postgres 16) |
| NFR-COM-3 | Performance | Deduction handler p95 ≤ 200 ms; top-up confirmation ≤ 800 ms | PRD §7 protocol on the §3 seed, the real identity | `[NFR-COM-3.deduction]` (Story 8.2), `[NFR-COM-3.topUp]` (Story 8.3) | Green — benchmark |
| NFR-COM-4 | Correctness (money) | 0 floating-point operations on COP in commission | BigInt reference; rounding CHECK | `[COM-1.I3]` | Green — ATDD |
| NFR-TRD-1 | Reliability (MEC) | 100 repetitions: one Accepted, one Unfulfillable | Two accepts for the last unit | `[TRD-1.MEC]` (Story 10.3) | Green — ATDD |
| NFR-TRD-2 | Performance | Accept p95 ≤ 800 ms; other actions ≤ 500 ms | PRD §7 protocol | `[NFR-TRD-2.counter]` (Story 10.2), `[NFR-TRD-2.accept]` (Story 10.3) | Green — benchmark |
| NFR-TRD-3 | Reliability | Trade vs purchase on a shared unit never oversells | Mixed race | `[INV-1.I3]`, `[TRD-1.I1]` | Green — ATDD |
| NFR-MSG-1 | Performance / determinism | Generation p95 ≤ 200 ms; 1 distinct output per input over 1,000 runs | Repeated generation; PRD §7 protocol on the §3 seed | `[MSG-2.I1]`, `[NFR-MSG-1.contact]` (Story 9.3) | Green — ATDD (determinism); Green — benchmark (latency) |
| NFR-MSG-2 | Performance | Send p95 ≤ 500 ms; visible to the recipient ≤ 35 s at p95 (30 s polling) | PRD §7 protocol; polling interval in the client (the `/mensajes` inbox polls the inbox and the open thread every 30 s while visible, Story 9.6; the 35 s visibility is not measured here) | `[MSG-1.R1]`, `[NFR-MSG-2.send]` (Story 9.2) | Green — ATDD (ordering); Green — benchmark (send) |
| NFR-MSG-3 | Security / scope | 0 outbound calls to messaging services | Network guard | `[SYS-6.R4]` | Green — gate |
| NFR-MSG-4 | Correctness (MEC) | Every fixture name renders (ñ, accents, emoji, 500 chars, URL-like) | Contact-message generation over the fixture names; state change between compose and send | `[MSG-2.MEC]`, `[MSG-3.MEC]` | Green — ATDD |
| NFR-COL-1 | Reliability (MEC) | 100 repetitions: one prompt, one entry set | Duplicate `OrderClosed` and double accept | `[COL-1.MEC]`, `[COL-2.I1]` | Green — ATDD (`[COL-1.MEC]` and `[COL-2.I1]` with Story 11.3) |
| NFR-COL-2 | Performance | Binder page (500 entries, sorted) p95 ≤ 800 ms; wishlist of 200 ≤ 1,000 ms | PRD §7 protocol on the seed's 500-entry collection (3 sort keys), and a 200-card wishlist over the seed's listings, with the real catalog, listings and identity | `[NFR-COL-2.binder]`, `[NFR-COL-2.wishlist]` (Story 11.5) | Green — benchmark (p95: binder 20.7 ms, wishlist 24.4 ms, local Postgres 16) |
| NFR-COL-3 | Integrity | 0 `CatalogEntry` writes from `collections` | Table-ownership scan; count assertion around FR-COL-3 | `[SYS-AD8]`, `[S-FR-COL-3.h]` | Green — gate (`[SYS-AD8]`); Green — ATDD (`[S-FR-COL-3.h]` with Story 11.5) |
| NFR-VAL-1 | Correctness (MEC) | Zero baseline → null, never NaN; drift over 500 entries bounded | Exact BigInt reference; ⌊Σ qty(fx) / 2⌋ bound; a fast-check property over 1,000 random collections | `[VAL-1.MEC]`, `[VAL-2.I1]`, `[VAL-2.I3]` | Green — ATDD (`[VAL-1.MEC]` and `[VAL-2.I1]` with Story 12.3, `[VAL-2.I3]` with Story 12.5) |
| NFR-VAL-2 | Performance | Value + 30-day trend (500 entries) p95 ≤ 1,500 ms; 365-day history ≤ 2,500 ms | PRD §7 protocol on the seed's 500-entry collection, the real catalog | `[NFR-VAL-2.current]` (Story 12.1), `[NFR-VAL-2.trend]` and `[NFR-VAL-2.history]` (Story 12.2) | Green — benchmark (p95: current 74 ms, current + 30-day trend 281 ms, 365-point history 262 ms, local Postgres 16) |
| NFR-VAL-3 | Correctness (money) | 0 floating-point COP; exact percentages | BigInt sums; half-away-from-zero rounding | `[VAL-1.I1]`, `[VAL-2.I3]` | Green — ATDD (`[VAL-1.I1]` with Story 12.1, `[VAL-2.I3]` with Story 12.5) |
| NFR-REP-1 | Reliability (MEC) | Paid-not-closed refused 100/100; hide racing a post keeps the aggregate exact | Repeated refusal; 100-repetition race | `[REP-1.MEC]`, `[REP-3.MEC]` | Green — ATDD (Story 13.3, 100/100 each on local Postgres 16: `[REP-1.MEC]` 146–161 ms, `[REP-3.MEC]` 446–502 ms) |
| NFR-REP-2 | Performance | Profile read p95 ≤ 300 ms; a hide applies on the next read | PRD §7 protocol on the §3 seed's 400 reviews; next-read assertion; the full profile read (target, aggregate and first page in one `REPEATABLE READ` snapshot) with the real identity; and k6 at a fixed arrival rate of 100 requests/s per endpoint for a minute on the production build (`npm run nfr:k6`, a blocking CI job, decision log Impl-2 #21) | `[NFR-REP-2.nextRead]` (Story 13.2), `[NFR-REP-2.aggregates]` (Story 13.3), `[S-FR-REP-7.h]`, `[NFR-REP-2.profile]` and k6 `reputation-profile` (Story 13.5) | Green — benchmark (the next read, the aggregates and the profile, p95 0.7 ms, 1.8 ms and 34.7 ms at N = 1, and the k6 profile p95 38 ms at 100 requests/s, local Postgres 16, decision log Impl-2 #18 and #21); Green — ATDD (`[S-FR-REP-7.h]` with Story 13.5) |
| NFR-REP-3 | Integrity | 0 hard deletes of `Review` or `Listing` | `DELETE` revoked from the app role | `[REP-2.I1]`, `[SYS-R2.grants]` | Green — gate (grant); Green — ATDD (behaviour, Story 13.2) |

## Summary

Refreshed as a whole at the Impl-1 close (2026-10-30, decision log Impl-1 #39), from the bound tests' results in that run: every row whose named tests all belong to done stories is green. Impl-2 refreshes the rows its stories turn green: NFR-COM-2 with Story 8.5, NFR-COL-2 and NFR-COL-3 with Story 11.5 (2026-11-03), and NFR-REP-2 with Story 13.5 (2026-11-04), which leaves no row red; NFR-IDN-1 with the Impl-2 test hardening (2026-11-04), which leaves no row planned; NFR-SYS-11 with the axe-core scans of the Playwright journeys (2026-11-06, decision log Impl-2 #31 and #33), for its automated rules, which leaves no NFR wholly waived.

| Status | NFRs |
|---|---|
| Green — ATDD (wholly or in part) | 37 (NFR-SYS-1, -5, -7, -8, -10, -13, -14, NFR-IDN-2, NFR-VER-1, -2, -4, NFR-CAT-2, -3, -4, NFR-INV-1, -2, -3, NFR-DSC-2, -3, NFR-ORD-1, -3, -4, NFR-COM-1, -2, -4, NFR-TRD-1, -3, NFR-MSG-1, -2, -4, NFR-COL-1, NFR-VAL-1, -3, NFR-REP-1, -3; NFR-VER-4, NFR-ORD-3, NFR-MSG-1, -2, NFR-COL-3, NFR-REP-2 and NFR-REP-3 in part) |
| Green — benchmark (wholly or in part) | 17 (NFR-SYS-2, -6, -9, NFR-IDN-1, NFR-VER-3, NFR-CAT-1, NFR-INV-4, NFR-DSC-1, NFR-COM-2, -3, NFR-TRD-2, NFR-COL-2, NFR-VAL-2; NFR-ORD-2, NFR-MSG-1, -2 and NFR-REP-2 in part) |
| Green — gate (wholly or in part) | 9 (NFR-SYS-3, -4, -12, NFR-IDN-3, NFR-MSG-3; NFR-SYS-11, NFR-ORD-3, NFR-COL-3 and NFR-REP-3 in part) |
| Red — ATDD (wholly or in part) | 0: NFR-REP-2's `[S-FR-REP-7.h]` turned green with Story 13.5, the last Impl-2 story |
| Planned — story DoD (wholly or in part) | 0: NFR-IDN-1, the last one, turned green with the Impl-2 test hardening (its owner since decision log Impl-1 #39), bound to Stories 2.3 and 2.5. NFR-COL-2 turned green with Story 11.5, and NFR-REP-2's profile benchmark with Story 13.5 |
| Deferred — launch (in part) | 3: NFR-SYS-11 (the manual WCAG audit, its automated rules green since decision log Impl-2 #33), and the transfer times of NFR-VER-4 and NFR-ORD-2 on a shaped 10 Mbps link |

Rows marked "in part" are counted under each of their statuses, so the summary adds up to more than 56. No NFR is left without a named artifact or an owner phase. The *Measured* table keeps each benchmark's figures from its own epic; the close's run is in `walkthrough-impl1.md` §17. Each status cell is one or more `Status (detail)` parts separated by semicolons, with no semicolon inside a detail, because `gen-solu2-trace.mjs` counts the parts.

## Measured

Each benchmark writes its figures (milliseconds, n = 500) to `.vitest-results/`. Run one with `npx vitest run --project solu2-nfr <file>`, or all of them with `npm run gate:nfr-red:impl1`.

| NFR | Benchmark | Result file | p50 | p95 | Threshold | Measured |
|---|---|---|---|---|---|---|
| NFR-IDN-1 | `[NFR-IDN-1.capabilities]` | `nfr-idn-1-capabilities.json` | 1.8 | 4.8 | p95 ≤ 50 | 2026-11-04, the Impl-2 test hardening, `getCapabilities` of the §3 seed's 300 accounts in turn, the real identity, local Postgres 16 |
| NFR-IDN-1 | `[NFR-IDN-1.eligibility]` | `nfr-idn-1-eligibility.json` | 1.9 | 4.2 | p95 ≤ 50 | 2026-11-04, the same, `requireListingEligibility` of the seed's 71 sellers who may list (60 individuals, 8 Approved and 3 Pending businesses) in turn |
| NFR-IDN-1 | `[NFR-IDN-1.sellerKinds]` | `nfr-idn-1-seller-kinds.json` | 4.8 | 13.1 | p95 ≤ 50 | 2026-11-04, the same, `getSellerKinds` of 500 known ids (the seed's 300 accounts and 200 more buyers), the interface maximum |
| NFR-VER-3 | `[NFR-VER-3.queue]` | `nfr-ver-3-queue.json` | 3.3 | 6.1 | p95 ≤ 1,000 | 2026-10-26, Epic 3 review, local Docker Postgres 16 |
| NFR-VER-3 | `[NFR-VER-3.sign]` | `nfr-ver-3-sign.json` | 4.9 | 8.2 | p95 ≤ 300 | 2026-10-26, Epic 3 review (signing inside the grant transaction), local Docker Postgres 16, in-memory storage |
| NFR-CAT-1 | `[NFR-CAT-1.provenance]` | `nfr-cat-1-provenance.json` | 4.9 | 11.9 | p95 ≤ 300 | 2026-10-27, Story 4.4, 48 priced ids over 30 days, local Postgres 16 |
| NFR-CAT-1 | `[NFR-CAT-1.browse]` | `nfr-cat-1-browse.json` | 2.1 | 9.9 | p95 ≤ 1,000 | 2026-10-27, Story 4.5, the 10,000-entry §3 catalog (no filter, one set, a name prefix), local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.reserve]` | `nfr-inv-4-reserve.json` | 2.9 | 4.3 | p95 ≤ 150 | 2026-10-27, Story 5.2, funded single listings of the §3 seed, each reserve in a transaction rolled back after the call, local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.bundle]` | `nfr-inv-4-bundle.json` | 5.8 | 10.4 | p95 ≤ 300 | 2026-10-27, Story 5.2, a 20-component bundle on the §3 seed, rolled back after each call, local Postgres 16 |
| NFR-INV-4 | `[NFR-INV-4.create]` | `nfr-inv-4-create.json` | 2.1 | 4.3 | p95 ≤ 800 | 2026-10-27, Story 5.1, individual sellers and funded businesses on the §3 seed, half new units and half links, local Postgres 16 |
| NFR-DSC-1 | `[NFR-DSC-1.seed]` | `nfr-dsc-1-seed.json` | 12.1 | 19.0 | p95 ≤ 1,000 | 2026-10-27, Epic 6 review, 15 km around Bogotá, pages 1–3, the §3 seed, local Postgres 16 |
| NFR-DSC-1 | `[NFR-DSC-1.scale]` | `nfr-dsc-1-scale.json` | 57.7 | 97.2 | p95 ≤ 1,500 | 2026-10-27, Epic 6 review, the same searches on the §3 seed grown to 50,000 listings around the four cities, local Postgres 16 |
| NFR-ORD-2 | `[NFR-ORD-2.p95]` | `nfr-ord-2.json` | 6.5 | 11.0 | p95 ≤ 800 | 2026-10-27, Epic 7 review, `createOrder` with the real listings and identity on the §3 seed, buyers with no open seed order, one order per buyer and business (decision log Impl-1 #32), local Postgres 16 |
| NFR-COM-3 | `[NFR-COM-3.deduction]` | `nfr-com-3-deduction.json` | 1.9 | 3.3 | p95 ≤ 200 | 2026-10-30, Story 8.2, the handler in its own transaction against the eight seeded accounts, a new order per call, local Postgres 16 |
| NFR-COM-3 | `[NFR-COM-3.topUp]` | `nfr-com-3-topup.json` | 2.0 | 3.1 | p95 ≤ 800 | 2026-10-30, Story 8.3, `confirmTopUp` by the seed's admin, 550 Pending top-ups over the eight seeded accounts, local Postgres 16 |
| NFR-MSG-1 | `[NFR-MSG-1.contact]` | `nfr-msg-1-contact.json` | 2.4 | 4.5 | p95 ≤ 200 | 2026-10-30, Story 9.3, purchase handoffs with the real identity and catalog over the seed's visible individual singles, one buyer per call (≤ 3 calls each) and one IP per call, local Postgres 16 |
| NFR-MSG-2 | `[NFR-MSG-2.send]` | `nfr-msg-2-send.json` | 3.0 | 6.6 | p95 ≤ 500 | 2026-10-30, Story 9.2, `sendMessage` with the real identity, verified seed buyers to the eight Approved businesses, each pair's first call opening its conversation, local Postgres 16 |
| NFR-TRD-2 | `[NFR-TRD-2.counter]` | `nfr-trd-2-counter.json` | 3.0 | 6.0 | p95 ≤ 500 | 2026-10-30, Story 10.2, `counterOffer` by the seller with the real listings, 550 Open offers on three of the seed's trade listings, one per buyer, local Postgres 16 |
| NFR-TRD-2 | `[NFR-TRD-2.accept]` | `nfr-trd-2-accept.json` | 9.3 | 14.3 | p95 ≤ 800 | 2026-10-30, Story 10.3, `acceptOffer` with the real listings and the post-commit handoff, 550 Open offers on three of the seed's trade listings restocked to 999, local Postgres 16 |
| NFR-COL-2 | `[NFR-COL-2.binder]` | `nfr-col-2-binder.json` | 7.8 | 20.7 | p95 ≤ 800 | 2026-11-03, Story 11.5, `getBinder` of the §3 seed's 500-entry collection (480 catalog entries, 20 links) sorted by set and number, acquisition date and name, with the real catalog, local Postgres 16 |
| NFR-COL-2 | `[NFR-COL-2.wishlist]` | `nfr-col-2-wishlist.json` | 8.5 | 24.4 | p95 ≤ 1,000 | 2026-11-03, Story 11.5, `listWishlist` of 200 of the seed's listed cards, one availability call through the real listings and its batch `getSellerKinds`, local Postgres 16 |
| NFR-REP-2 | `[NFR-REP-2.nextRead]` | `nfr-rep-2-next-read.json` | 0.4 | 0.7 | p95 ≤ 300 | 2026-10-30, Epic 13 review, the aggregate read right after each of 550 hides of the §3 seed's visible reviews, each undone after the read (every read reflects its hide), local Postgres 16 |
| NFR-REP-2 | `[NFR-REP-2.aggregates]` | `nfr-rep-2-aggregates.json` | 1.2 | 1.8 | p95 ≤ 300 | 2026-10-30, Epic 13 review, `getAggregates` of 500 sellers (the seed's 68 reviewed sellers and 432 with none), local Postgres 16 |
| NFR-REP-2 | `[NFR-REP-2.profile]` | `nfr-rep-2-profile.json` | 9.1 | 34.7 | p95 ≤ 300 | 2026-11-04, Story 13.5, in the full `npm run test:ci` run (7.4 ms p95 when run alone), `getProfile` page 1 of the §3 seed's 68 reviewed sellers in turn, with the real identity, the target and name reads on the snapshot's connection, local Postgres 16 |

## Load (k6)

`npm run nfr:k6` (Story 13.5, decision log Impl-2 #18 and #21) seeds the PRD §3 marketplace into `tezg_k6`, serves the production build on port 3200 and runs `_bmad-output/test-artifacts/nfr/k6/reputation-profile.js` in `grafana/k6:1.4.2`: two `constant-arrival-rate` scenarios, one per endpoint, each starting 100 iterations a second for 60 s (one request per iteration, 6,000 planned) with 25 VUs pre-allocated and at most 50, no think time, after a `setup()` warm-up of 5 × 25 concurrent reads per endpoint (tagged `endpoint:warmup`, outside the figures below). The load is a set rate, so a slower machine shows as latency or as dropped iterations, and more than 1 % dropped (60 per endpoint) fails the run. The thresholds are test-design.md §7.4's, and the CI job `nfr-k6` blocks the release on them. Figures in milliseconds, from `evidence/impl2/k6-summary.json`; the run's output is `evidence/impl2/24-k6.log`.

| Endpoint | Thresholds | med | p95 | p99 | Error rate | Requests | 5xx | Dropped iterations | Measured |
|---|---|---|---|---|---|---|---|---|---|
| `reputation.profile` (NFR-REP-2) | p95 < 300, p99 < 800, errors < 1 %, 0 5xx, dropped < 60 | 9.8 | 38.3 | 113.7 | 0.00 % | 6,001 | 0 | 0 | 2026-11-04, decision log Impl-2 #21, local Windows laptop, Docker Desktop Postgres 16.6. The run before it on the same tree: p95 34.4, p99 156.2, 2 dropped. Without the warm-up the cold server's first second dropped 63 |
| `catalog.browse` (NFR-SYS-9, NFR-CAT-1) | p95 < 1,000, errors < 1 %, 0 5xx, dropped < 60 | 16.1 | 39.4 | 98.7 | 0.00 % | 6,001 | 0 | 0 | 2026-11-04, the same run (24 entries per page, pages 1–20, no filter). The run before it: p95 36.4, p99 140.3, 1 dropped |
