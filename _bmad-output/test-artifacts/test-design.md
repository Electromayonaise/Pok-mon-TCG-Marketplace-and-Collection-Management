---
title: "TEZG — Risk-based test design (Solu-2 system level, extended for Impl-2 in §7)"
phase: "3 — Test Preparation (TEA)"
deliverable: "3.1 (task-statement.md §6)"
test-lead: "Martín Gómez (decisions relayed by Mateo Rubio, decision log Solu-2 #10)"
skill: "bmad-testarch-test-design (system level; Impl-2 epic level in §7, decided by Mateo Rubio, decision log Impl-2 #1–#7)"
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
| R-21 | A job runs without the `JOBS_SECRET` bearer, or two runs of one job overlap and apply an expiry twice (Impl-2, Story 1.6) | SYS | Security | 2 | 3 | 6 | P0 | Constant-time bearer check before any write; `pg_try_advisory_xact_lock(job:<name>)` held for the run; one JobRun row per run | `[S-SYS.jobs.auth]`, `[S-SYS.jobs.single]`, `[S-SYS.jobs.C1]` | Integration (race) |
| R-22 | The 11th failed sign-in in 15 min is not refused, a sign-up burst from one IP is not throttled, or a throttle row stores a raw IP or an empty key (Impl-2, Story 2.6) | IDN | Security | 3 | 3 | 9 | P0 | The auth guard checks `checkAuthThrottle` before Better Auth; one `AuthThrottleEvent` per known key after a failure; keys are account ids or `ipHmac` | `[S-FR-IDN-7.signin.throttle]`, `[S-FR-IDN-7.signup.throttle]`, `[S-FR-IDN-7.signin.unknown]` | Integration |
| R-23 | Reconcile reports a false discrepancy while deductions commit, writes to an account, or two nightly runs both run; drift over many operations (Impl-2, Story 8.5) | COM | Money | 3 | 3 | 9 | P0 | `FOR SHARE` on the account before the sums, one transaction per account; one run row and nothing else; `job:commission-reconcile` in COM-3 P2 | `[COM-3.C1]`, `[COM-3.C2]`, `[NFR-COM-2.drift]`, `[COM-3.Q2]` | Integration (race) + NFR |

Twenty risks were registered in Solu-2, and Impl-2 adds its own (§7.2) as each story's red tests land:

- Solu-2: 15 are P0 (the 12 MECs plus R-13, R-14 and R-15) and 5 are P1.
- Impl-2: R-21 onward.

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

## 7. Impl-2 test design (epic level)

Impl-2 implements the 7 reserved stories and two new ones (decision log Impl-2 #1, #7), and pairs each with a testing flow of the Impl-2 statement. This section decides the flow, the new red tests and the thresholds **before any production code**. Each planned risk enters the register in §2 together with its red tests, in the story's red commit (decision log Impl-2 #6), because `gate:trace:solu2` refuses a risk citing an id that does not exist yet.

### 7.1 Flow per story

| Story | Kind | Highest risk | Flow | Why this flow |
|---|---|---|---|---|
| 1.6 Run scheduled jobs single-flight behind `JOBS_SECRET` (new) | Skeleton | An unauthenticated caller runs a job, or two runs overlap (S-9, AD-SYS-4 rule 7) | **A** ATDD-first | Security boundary and single-flight are strict contracts |
| 2.6 Sign up, sign in and throttle failed attempts (new) | Failure-state | Brute force: the 11th failed sign-in is not refused (AD-IDN-3) | **A** ATDD-first | Security contract; the throttle is a numeric rule |
| 8.5 Reconcile ledgers and report, never repair | Failure-state | A false discrepancy while deductions commit, or a "repair" write (AD-COM-1) | **A** + **D** | Atomic read contract; concurrency hammer against live deductions |
| 8.6 Set commission rates and read the ledger | Supporting | A rate applied retroactively, or at the wrong boundary | **B** test-along | Well-understood rule; unit tests of the boundary written with the code |
| 9.6 Read the inbox, mark threads read and mute | Supporting | A stale tab lowers `lastReadSeq` (AD-MSG-3) | **A** + **D** + **E** | Monotonic state under concurrent tabs; interactive inbox |
| 11.5 Binder, external cards, moves and wishlist | Supporting | An unstable binder order; a wishlist price from a non-purchasable listing | **B** + **E** | Read-model logic built with its unit tests; interactive binder |
| 11.6 Refuse unsafe links, foreign entries and unknown wishlist cards | Failure-state | An unsafe URL stored and rendered (XSS) | **A** | Pure refusal contracts |
| 13.5 Profiles, moderation logs and listing hides | Supporting | Profile aggregate and first page disagree around a hide; p95 over 300 ms | **D** + **E** | NFR-REP-2 latency and snapshot consistency under load; public profile page |
| 13.6 Refuse invalid moderation and bad aggregate requests | Failure-state | `100%` matches everything (LIKE wildcard); a double hide logs twice | **A** | Pure refusal contracts |
| Impl-1 code | — | Weakly-green lock tests that sleep 200 ms (test review MEDIUM-1/2) | **C** test-after | Backfill and hardening of existing code |

### 7.2 Planned risks (enter §2 with their red tests)

| Planned id | Story | Risk | P × I | Priority | Planned red tests (new ids marked *) |
|---|---|---|---|---|---|
| R-21 | 1.6 | A job runs without the `JOBS_SECRET` bearer, or two runs of one job overlap | 2 × 3 | P0 | `[S-SYS.jobs.auth]`*, `[S-SYS.jobs.single]`* |
| R-22 | 2.6 | The 11th failed sign-in in 15 min is not refused, or the IP is stored in clear | 3 × 3 | P0 | `[S-FR-IDN-7.signin.throttle]`*, `[S-FR-IDN-7.signin.h]`* |
| R-23 | 8.5 | Reconcile reports a false discrepancy while deductions commit, or writes to an account | 3 × 3 | P0 | `[COM-3.Q1]`, `[COM-3.I1]`, `[COM-3.C1]`* |
| R-24 | 8.5 | Two job runs of reconcile both run | 2 × 2 | P1 | `[COM-3.P2]`, `[COM-3.C2]`* |
| R-25 | 8.6 | A new rate applies before its `effectiveFrom`, or a past-dated rate is accepted | 2 × 3 | P0 | `[S-FR-COM-7.h]`, `[S-FR-COM-7.f]` |
| R-26 | 9.6 | Concurrent or stale `markRead` calls lower `lastReadSeq`, or a reader sees the other side's read state | 3 × 2 | P0 | `[S-FR-MSG-7.f]`, `[S-FR-MSG-7.C1]`* |
| R-27 | 11.5 | The binder order differs between two reads with ties | 3 × 1 | P2 | `[S-FR-COL-5.h]`, `[S-FR-COL-5.f]` |
| R-28 | 11.6 | A non-https or scripted link (`javascript:`, `data:`, an `HTTP://` spoof) is stored | 2 × 3 | P0 | `[S-FR-COL-3.f]`, `[S-FR-COL-3.f2]`* |
| R-29 | 13.5 | A profile's aggregate and its first page come from different snapshots around a hide | 3 × 3 | P0 | `[S-FR-REP-7.h]`, `[S-FR-REP-7.C1]`* |
| R-30 | 13.5 | The profile read misses p95 ≤ 300 ms (NFR-REP-2) | 2 × 2 | P1 | `[NFR-REP-2.profile]`* (benchmark), k6 `reputation-profile` |
| R-31 | 13.6 | A search for `100%` matches everything, or two concurrent hides log twice | 3 × 2 | P0 | `[S-FR-REP-6.f]`, `[S-FR-REP-5.f]`, `[S-FR-REP-5.C1]`* |

Every P0 risk keeps the §1 rule: a red test before code, a story, and a CI gate.

### 7.3 Levels and the 70 / 20 / 10 + NFR pyramid

| Level | Impl-2 content | Where | Target share of new tests |
|---|---|---|---|
| Unit (pure, < 10 ms, no I/O) | Domain rules: rate resolution, reconcile arithmetic, binder sort and completion, link validation, LIKE escaping, read-state clamp, throttle window | colocated `src/modules/*/domain/*.test.ts` | ≈ 70 % |
| Integration | ATDD contracts over real Postgres 16, repository adapters, job route handlers, concurrency hammers (50 connections) | `_bmad-output/test-artifacts/atdd/`, colocated `application/*.test.ts` | ≈ 20 % |
| E2E (browser) | Three journeys through Page Objects: public seller profile, inbox read and mute, binder sort and add | `_bmad-output/test-artifacts/e2e/` (Playwright) | ≈ 10 % |
| NFR | k6 burst on the public profile and catalog reads (p95, p99, error rate); PRD §7 benchmarks for NFR-REP-2 and NFR-COL-2 | `_bmad-output/test-artifacts/nfr/` | Separate layer |

The share is counted on the tests Impl-2 adds and reported in `walkthrough-impl2.md`. Coverage: ≥ 90 % branches over `src/modules/*/domain/**`, enforced by the Vitest coverage threshold in `npm test`.

### 7.4 Thresholds added for Impl-2

| Kind | Threshold | Source | Proof |
|---|---|---|---|
| Load (k6) | p95 ≤ 300 ms and p99 ≤ 800 ms for `reputation.profile`; p95 ≤ 1,000 ms for `catalog.browse`; 0 % 5xx; error rate < 1 % under a 50 VU burst | NFR-REP-2, NFR-SYS-9 | `npm run nfr:k6`, its summary in `nfr-evidence.md` |
| Concurrency | 50 connections: 0 false discrepancies, `lastReadSeq` equal to the highest seq, exactly one log row per hide, exactly one job run | NFR-SYS-10, AD-COM-1, AD-MSG-3, AD-REP-3, AD-SYS-4 rule 7 | the `.C*` tests above |
| Determinism | 0 `waitForTimeout`, 0 sleep-as-synchronization (`setTimeout` resolving a promise, `pg_sleep`) in tests | Impl-2 statement checklist | `npm run gate:no-sleep` |
| E2E | Page Objects only (no locator in a spec), web-first assertions, `trace: 'on-first-retry'` | Impl-2 statement §3 | `gate:no-sleep` also refuses `page.locator(` in `*.spec.ts` |

### 7.5 The four testing traps, as rules

- **Ice cream cone:** a behaviour is proven at the lowest level that can prove it; E2E specs assert journeys, never business rules already proven below.
- **Flaky sleeper:** waits are on a condition (`pg_stat_activity` lock wait, a barrier, a web-first assertion), never on time.
- **Mocking mirage:** the unit under test is never faked. Fakes stand only at module seams and external ports; contract tests run on real Postgres.
- **Blindly green:** every test asserts an observable outcome (a value, a row count, a code); the red run proves each new test can fail.
