---
title: "TEZG Solu-2 — Risk-based test design"
phase: "3 — Test Preparation (TEA)"
deliverable: "3.1 (task-statement.md §6)"
test-lead: "Martín Gómez (decisions relayed by Mateo Rubio, decision log Solu-2 #10)"
skill: "bmad-testarch-test-design (system level)"
inputs:
  - _bmad-output/planning-artifacts/prd.md (FRs, NFRs, §3 seed, §7 measurement protocol)
  - _bmad-output/planning-artifacts/detailed-design/contracts.md (37 core operations, 39 supporting contracts, §14 AD bindings)
  - _bmad-output/planning-artifacts/ARCHITECTURE-v2-delta.md (refinements R-1..R-14)
---

# Risk-based test design

This plan decides **what is tested first, at which level, and against which threshold**. It covers all 12 modules. Each module's Mandatory Edge Case (MEC, task statement Annex A) is a P0 risk. The cross-cutting risks of the architecture are scored the same way.

`npm run gate:trace:solu2` parses the register in §2. It fails if any of these is missing a test that turns red when the guarded behaviour is removed:

- a P0 risk;
- an AD of the §14 binding table;
- an FR.

## 1. Scoring

| | 1 | 2 | 3 |
|---|---|---|---|
| **Probability (P)** | Needs an unusual sequence | Plausible under normal load or a common mistake | Happens by default unless something prevents it (races, retries, boundaries) |
| **Impact (I)** | Cosmetic or recoverable by the user | Wrong data that support can repair | Money, stock or a regulated value is wrong or exposed; a trust rule is broken |

**Score** = P × I.

- **P0:** a score of 6 or more, or any MEC.
- **P1:** a score of 4.
- **P2:** anything lower.

A P0 risk must have:

- a red test before Phase 4;
- a dedicated story in Phase 4;
- a gate in CI.

A P1 risk must have a red test. A P2 risk is covered by the module suites.

## 2. Risk register

The *Red tests* column lists the test ids that turn red when the mitigation is removed. "Level" is the level of that proof (§3).

| ID | Risk | Module | Category | P | I | Score | Priority | Mitigation (enforcement point) | Red tests | Level |
|---|---|---|---|---|---|---|---|---|---|---|
| R-01 | A user completes the individual profile and submits a business application at once, and ends up both seller kinds (MEC) | IDN | Data integrity | 3 | 3 | 9 | P0 | Conditional `UPDATE "User"."sellerTrack"`; composite FKs to `User(id, sellerTrack)` | `[IDN-1.MEC]`, `[IDN-1.I1]` | Integration (race) |
| R-02 | Approve and reject race, leaving two decisions, two events or a half state (MEC) | VER | Data integrity | 3 | 3 | 9 | P0 | `WHERE status='Pending'`; unique decision log | `[VER-1.MEC]` | Integration (race) |
| R-03 | A renamed or reprinted card gets a new id and orphans its listings and binder entries (MEC) | CAT | Data integrity | 2 | 3 | 6 | P0 | `UNIQUE externalKey` and an upsert that keeps `id` | `[CAT-2.MEC]`, `[CAT-2.I1]` | Integration |
| R-04 | Radius boundary, missing coordinates or an entry whose listings are all filtered are mishandled (MEC) | DSC | Correctness | 3 | 2 | 6 | P0 | One SQL builder; haversine bound; counted exclusions | `[DSC-2.MEC]`, `[DSC-2.MEC2]` | Integration (boundary) |
| R-05 | A caller aborts after a reserve and the stock is not restored; the last unit is oversold (MEC) | INV | Money/stock | 3 | 3 | 9 | P0 | `CHECK (quantity >= 0)`; conditional decrement in the caller's `tx` | `[INV-1.MEC]`, `[INV-1.I1]`, `[INV-1.I3]` | Integration (race, abort) |
| R-06 | A business confirms payment before the buyer's "paid", or a double confirmation publishes twice (MEC) | ORD | Trust rule | 3 | 3 | 9 | P0 | Fact CHECKs; `IS NULL` predicates; one visibility predicate | `[ORD-3.MEC]`, `[ORD-4.MEC]`, `[ORD-2.MEC]` | Integration (race) |
| R-07 | Two orders at one instant against one order's balance, plus a duplicate event, charge twice or skip "Exhausted" (MEC) | COM | Money | 3 | 3 | 9 | P0 | Partial unique `(orderId) WHERE kind='Deduction'`; rounding CHECK; `FOR UPDATE` on the account | `[COM-1.MEC]`, `[COM-1.MEC2]` | Integration (race, repeat) |
| R-08 | Two offers for the last unit are accepted from two tabs, and both hold stock (MEC) | TRD | Money/stock | 3 | 3 | 9 | P0 | `trd:seller` advisory lock; reservation CHECKs; partial unique open offer | `[TRD-1.MEC]` | Integration (race, 100 ×) |
| R-09 | Long, accented or emoji product names break the contact message; the verification state changes between compose and send (MEC) | MSG | Correctness/trust | 3 | 2 | 6 | P0 | NFC normalisation and a code-point cap; re-check at send | `[MSG-2.MEC]`, `[MSG-3.MEC]` | Integration (boundary, race) |
| R-10 | `OrderClosed` is delivered twice and the prompt accepted twice, duplicating binder entries (MEC) | COL | Data integrity | 3 | 2 | 6 | P0 | `UNIQUE orderId`; conditional `Pending → Accepted` | `[COL-1.MEC]` | Integration (repeat, race) |
| R-11 | Valuation divides by a zero baseline or drifts over 500 entries (MEC) | VAL | Correctness | 3 | 2 | 6 | P0 | BigInt arithmetic; `null` + `ValuationNoBaseline`; drift bound | `[VAL-1.MEC]`, `[VAL-2.I1]`, `[VAL-2.I3]` | Integration + pure |
| R-12 | A paid-but-not-closed review is accepted; a hide racing a new review leaves an inconsistent aggregate (MEC) | REP | Trust rule | 3 | 3 | 9 | P0 | `review_business_iff_verified`; one-statement aggregate; conditional hide | `[REP-1.MEC]`, `[REP-3.MEC]` | Integration (race, 100 ×) |
| R-13 | A regulated value (phone, legal identity, document or comprobante key, message body) reaches a log, an error body, a citation or a payload | SYS | Security | 2 | 3 | 6 | P0 | `regulated.ts` + redactor at the logger, the formatter and the outbox | `[SYS-8.R4]`, `[SYS-8.R4.error]`, `[NFR-SYS-8.canary]` | Integration + NFR scan |
| R-14 | An event is lost between commit and dispatch, or a crashed delivery retries forever | SYS | Reliability | 2 | 3 | 6 | P0 | Transactional outbox; attempt-counting step; sweeper; replay only on `failed` | `[SYS-2.R6]`, `[SYS-2.R4]`, `[NFR-SYS-6.sweep]` | Integration + NFR drain |
| R-15 | A client sends a role-like key or another user's id and gains a capability | SYS | Security | 2 | 3 | 6 | P0 | Actor fields from the session only; no role-like input key; admin builder | `[SYS-8.R2]`, `[SYS-8.R2.static]` | Router introspection + static |
| R-16 | A non-owner module raises another module's code, so errors lose their owner and HTTP family | SYS | Maintainability | 2 | 2 | 4 | P1 | `raiserFor(module)`; lint `tezg/error-owner` | `[SYS-1.R2]`, `[SYS-1.R6]` | Unit |
| R-17 | A module imports a neighbour past its `index.ts`, or along an edge AD-1 forbids | SYS | Maintainability | 2 | 2 | 4 | P1 | Import-graph fitness function | `[SYS-AD1]` | Static (fitness) |
| R-18 | A module writes another module's tables, or the app role rewrites an append-only log | SYS | Data integrity | 2 | 2 | 4 | P1 | Table-ownership scan; revoked grants | `[SYS-AD8]`, `[SYS-R2]`, `[SYS-R2.grants]` | Static + integration |
| R-19 | A wall-clock read makes a test or a deadline non-deterministic | SYS | Determinism | 2 | 2 | 4 | P1 | `Clock` port; no `now()` in SQL; socket guard | `[SYS-6.R1]`, `[SYS-6.R4]` | Static (fitness) |
| R-20 | Purchase (`createOrder`) misses its 800 ms p95 under the §3 seed | ORD | Performance | 2 | 2 | 4 | P1 | One transaction; ascending unit locks; indexed visibility | `[NFR-ORD-2.p95]` | NFR benchmark |

Twenty risks are registered:

- 15 are P0: the 12 MECs plus R-13, R-14 and R-15.
- 5 are P1.

Every P0 and P1 risk has at least one red test. The test-id gate (`npm run gate:ids:solu2`) and the trace gate prove that each id exists.

## 3. Level allocation

| Level | What it proves | Where | Runs | Red/green now |
|---|---|---|---|---|
| Pure (domain) | Formulas and value rules (`averageTenths`, `commissionFor`, `changePercentHundredths`, `bogotaDate`) | `domain/*.ts` exercised through the ATDD files | Every push | Red (through the stubs) |
| Integration (contract ATDD) | Each operation's P, Q and I against real Postgres 16.6, with fakes for neighbours and simulated external adapters. Races use 50 real connections × 100 repetitions where the contract names them (NFR-SYS-10) | `_bmad-output/test-artifacts/atdd/*_contracts.test.ts` and `*_supporting.test.ts` (19 files, 352 tests) | Every push | Red: `NotImplemented` |
| Static (fitness) | Architecture rules that hold on every commit: AD-1, AD-8, AD-9, AD-SYS-6, AD-SYS-8 rule 2, R-2 grants | `_bmad-output/test-artifacts/fitness/` | Every push, 5 × burn-in | Green (each proven first by a planted violation) |
| Fixture proof | The §3 seed profile, count by count | `_bmad-output/test-artifacts/fixtures/` | Every push | Green |
| NFR benchmark | Latency (PRD §7 protocol), reliability under a crash, and leak scanning | `_bmad-output/test-artifacts/nfr/` | Every push for the red check; the thresholds are asserted by the same files once the stories are done | Red: `NotImplemented` |
| UI state (static) | Every one of the 327 states of the 43 page specs is backed by a DTO, a code or a client rule | `scripts/check-ui-states.mjs` | Every push | Green |
| End-to-end (browser) | Page flows over the real app | — | Deferred to implementation (TG-4) | — |

**Why integration first.** Most P0 risks are races, retries and boundaries that only the database can arbitrate, such as conditional updates, partial unique indexes and `FOR UPDATE` order. A unit test over a mock would pass on code that oversells. The ATDD files therefore run every contract against the real schema, and use fakes only at module seams and external ports.

## 4. Thresholds

| Kind | Threshold | Source | Proof |
|---|---|---|---|
| Latency, commands | p95 ≤ 800 ms at N = 1 (create order includes the reservation) | NFR-SYS-9, NFR-ORD-2 | `[NFR-ORD-2.p95]`; every contract's latency clause |
| Latency, interactive reads | p95 ≤ 1,000 ms at N = 1; profile read ≤ 300 ms; signed URL ≤ 300 ms | NFR-SYS-9, NFR-REP-2, NFR-VER-3 | Contract latency clauses; `nfr-evidence.md` |
| Concurrency | 50 connections × 100 repetitions: exactly one winner; zero duplicate side effects | NFR-SYS-10 | Every `.MEC` and race test |
| Reliability | 0 deliveries left `pending` after the sweeper drains; each subscriber effect exactly once | NFR-SYS-6 | `[NFR-SYS-6.sweep]`, `[SYS-2.R6]` |
| Security | 0 canary occurrences in logs, error bodies, citations and payloads | AD-SYS-8 rule 4, NFR-SYS-2 | `[NFR-SYS-8.canary]`, `[SYS-8.R4]` |
| Explainability | Every decision has ≥ 1 citation whose rule matches `^(AD\|FR\|NFR)-…`, and observed inputs | NFR-SYS-1, AD-SYS-1 | `explainAssert` in every `.Q4`/decision test; `[SYS-1.R6]` |
| Determinism | 0 wall-clock reads in `src/`; 0 sockets except the test Postgres | AD-SYS-6, NFR-SYS-3 | `[SYS-6.R1]`, `[SYS-6.R4]` |
| Coverage of the design | 100 % of cited test ids defined; 100 % of core operations tested; 100 % of ADs and FRs bound to a red test | Phase 3 gate | `gate:ids:solu2`, `gate:trace:solu2` |

## 5. Testability gaps

| ID | Gap | Consequence | How it is handled |
|---|---|---|---|
| TG-1 | Only simulated adapters exist for the feed, the TRM source, storage, the scanner and the top-up provider | Real-adapter failure modes are unproven | Each adapter story adds a contract test against its port; the simulated adapters keep the fault switches (`down`, `stale`, `malformedRows`) the contracts name |
| TG-2 | The latency NFRs can only be measured after the stories are done | p95 values are unknown in Solu-2 | Benchmarks exist and are red. The same files assert the thresholds once green (`nfr-evidence.md`) |
| TG-3 | Better Auth sessions and the throttle (S-FR-IDN-7) are not exercised by service-level tests | Builder checks could regress unseen | Router introspection (`[SYS-8.R2]`) and the static OpenAPI scan cover the shape; Epic 1 adds a session-level test |
| TG-4 | No browser end-to-end suite | Page-level regressions are not caught | The UI-state gate backs every state statically; Playwright is scoped to implementation |
| TG-5 | The hourly tick is best-effort (GitHub Actions schedule) | Real scheduling gaps cannot be reproduced | The tick-silence read model is tested with the virtual clock (`[S-SYS.tick.h]`); every contract is correct without the job (AD-SYS-6 rule 5) |
| TG-6 | The PDF branch of the upload pipeline (G-5) depends on a scanner not chosen yet | Malicious-PDF behaviour is unproven | The simulated scanner rejects truncated files; the gap stays open in the readiness report |
| TG-7 | The 50 × 100 race proofs take minutes, and the red suite cannot be burned in until it is green | Flakiness in races shows up only after implementation | The green project is burned in 5 × now; each story's DoD adds the burn-in of its own race tests |
| TG-8 | The lint rules (`tezg/error-owner`, `tezg/table-owner`, `tezg/regulated-select`) do not exist yet | Static enforcement waits for Epic 1 | The runtime raiser and the fitness scans give the same signal meanwhile |

## 6. Entry and exit criteria (Phase 3 gate)

- **Entry:** the contracts, schema, DTOs and stubs of Phase 2 are approved and generated, and `gate:api:solu2` is current.
- **Exit:**
  - `npm run gate:solu2` passes, as does its CI mirror;
  - every P0 risk has a red test;
  - every AD in §14 has a test that turns red when the AD is violated;
  - every FR traces to a contract and a test (`gate:trace:solu2`);
  - the test-quality review is triaged.

**Martín's scope (decision log Solu-2 #10).** Full ATDD: the core operations plus the supporting contracts. The plan above, red NFR benchmarks, and a new Solu-2 CI workflow.
