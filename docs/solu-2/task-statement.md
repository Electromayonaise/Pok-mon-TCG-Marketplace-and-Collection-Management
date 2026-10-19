# Solu-2: Task Statement

## TEZG — From Module Architecture to a Sprint-Ready Backlog (all 12 modules, one package)

| | |
|---|---|
| **Course Module** | Unit 4 — Contracts, Internal Design, Data Modeling, and Architecture Implementation |
| **Target Outcome (RAA4)** | Derive code interfaces, technical criteria, and data schemas from a plan to subsequently implement software components consistent with the system's functional intent. |
| **Delivery** | Pair (Martín Gómez, Mateo Rubio — the Plan-2 pair), AI Governance Level 3. Architect-lead Phases 0–2: Mateo. Test-lead Phase 3: Martín (his decisions are relayed by Mateo in session and attributed to him). |
| **Prerequisites** | The Plan-2 package (`docs/plan-2/`: `prd.md`, `addendum.md`, `DESIGN.md`, `EXPERIENCE.md`, `ARCHITECTURE.md` with AD-SYS-1..8 and AD-<CODE>-n), and Solu-1 (`docs/solu-1/`) as the worked pattern. |
| **Deliverable** | Detailed Architecture Package + Test Preparation Package + `epics.md` + `sprint-status.yaml` with a certified readiness gate. |

> This is the Solu-2 course statement adapted from its default case study (the *University AI Compute Fabric*) to **TEZG**, the project this repository plans. The phases, outputs, rules and rubric are unchanged in intent. The domain, the Annex A seed table, the fixtures and the scope (Appendix B) are TEZG-specific, and Appendix A maps every substitution. The verbatim course statement is kept outside version control (`task2.md`), as Plan-2 and Solu-1 did.
>
> **Scope (decided by Mateo Rubio, 2026-10-18, decision log Solu-2 #1–#4).** The default statement has each pair take one module of a system split across many groups. TEZG is the pair's own 12-module project, so Solu-2 covers **all 12 modules** in one package. That means 37 core operations in the full contract template, supporting contracts so that every one of the PRD's 96 FRs traces to a story, a walking-skeleton epic plus one vertical epic per module, and one readiness gate.

> **The Solutioning Stop-Point Rule (same as Solu-1).** Solutioning halts at Epic/Story creation and the Sprint Readiness Audit (`bmad-sprint-planning`). Autonomous implementation agents (`bmad-dev-story`, `bmad-dev-auto`, `bmad-quick-dev`, the installed equivalents of `bmad-build`) are **not** invoked. Interface stubs and failing tests only; no production logic.

---

## 1. Overview

| | Solu-1 (this repo) | Solu-2 (this package) |
|---|---|---|
| **Team** | Individual (Mateo) | Pair (Architect-lead + Test-lead, roles swap in Phase 3) |
| **Starting point** | Plan-2 PRD + architecture | Plan-2 package + Solu-1's contracts, schemas, harness and backlog |
| **What you choose** | 3 functions per module (guard, contended mutation, resolver) | ≥ 3 core operations per module (raced mutation, explainable decision, mandatory edge case), guided by Annex A |
| **Stack** | TypeScript / Vitest / PostgreSQL 16 | Same (Plan-2 baseline: TypeScript; PostgreSQL wherever concurrency invariants matter); all externals simulated |
| **Output** | Contracts, DDL, DTOs, ATDD, stories | Full detailed design, risk-based test preparation, skeleton + 12 epics, `sprint-status.yaml` |

**Council:** Winston (`bmad-agent-architect`, `bmad-architecture`), Amelia (`bmad-agent-dev`), Murat (`bmad-tea`, `bmad-testarch-*`), John (`bmad-agent-pm`), Sally / Freya (`bmad-agent-ux-designer`, `wds-agent-freya-ux`) for the UX consistency checks.

### Workshop outline

| Phase | Work | Skills |
|---|---|---|
| 0 Intake & gap audit | Select the core operations (Annex A); run an implementability review of the architecture (≥ 6 gaps); declare the stack | `bmad-review-adversarial-general` |
| 1 Contracts | 37 core operations × P/Q/I, a typed error catalog, an invariant binding table, supporting contracts for the remaining FRs | `bmad-architecture` / `bmad-agent-architect` |
| 2 Ports, schemas, DTOs, events | Hexagonal map, one complete schema, `dto.ts`, `events.md`, `openapi.yaml`; Amelia audits the simulated adapters | `bmad-architecture`, `bmad-agent-dev` |
| 3 Test preparation | Risk register, fixtures, ATDD suite, CI gate, NFR evidence plan, traceability matrix, test review | `bmad-testarch-test-design`, `-framework`, `-atdd`, `-ci`, `-nfr`, `-test-review`, `-trace` |
| 4 Backlog & gate | `epics.md`, readiness audit → `sprint-status.yaml`, gate drill | `bmad-create-epics-and-stories`, `bmad-sprint-planning` |
| 5 Wrap-up | ARCHITECTURE v2 links, decision log, final trace, tag `solu2-ready` | `bmad-testarch-trace` |

---

## 2. Source Materials & Required Inputs

| # | Input | Source | Used in |
|---|---|---|---|
| 1 | `_bmad-output/A-Product-Brief/project-brief.md` | TEZG brief (replaces the university platform brief) | Phase 0 |
| 2 | `docs/plan-2/planning/prd.md` + `addendum.md` (96 FRs, NFRs, non-goals) | Plan-2 Phase 1 | Phases 1, 3, 4 |
| 3 | `docs/plan-2/ux/DESIGN.md`, `EXPERIENCE.md`, 48 scenarios, page specs | Plan-2 Phase 2 | Phases 2, 4 (every UI state needs a backend contract) |
| 4 | `docs/plan-2/planning/ARCHITECTURE.md` (AD-SYS-1..8, AD-<CODE>-n, component and sequence diagrams, data model) | Plan-2 Phase 3 | All phases |
| 5 | `docs/plan-2/reviews/review-*.md` | Plan-2 | Phase 0 (unresolved Defer items) |
| 6 | Unit 4 slides | Course | Reference |
| 7 | `docs/solu-1/` (contracts → DDL/DTO → ATDD → stories → gate), including its deferred findings (E-15, T-07, F-7, F-12) | Solu-1 | Worked pattern; Phase 0 gaps |

> **External-dependency agnosticism** (TEZG's form of "hardware agnosticism", Plan-2 constraint 2). Every adapter that touches the catalog/price feed, the TRM source, object storage, the malware scanner, the top-up confirmation provider, the event bus or the system clock is an outbound port with a simulated driven adapter: fixtures, fault switches, a virtual clock.

---

## 3. Phase 0 — Intake & Architecture Gap Audit

- **0.1** Select ≥ 3 core operations per module that together cover:
  - a mutation that can be raced, repeated or interrupted;
  - an automated decision with an explainable, cited justification (Plan-2 constraint 4);
  - the module's Mandatory Edge Case (Annex A).
- **0.2** Run an adversarial review limited to implementability: what does `ARCHITECTURE.md` decide by "nothing", where an agent would have to invent? List at least 6 gaps, with the phase that resolves each and its owner (A = Mateo, B = Martín).
- **0.3** Declare the stack (5 lines) in `ARCHITECTURE.md` under "Stack Decisions". A `Clock` port is mandatory.

**Output:** `reviews/review-arch-implementability.md` (triaged) and the stack section.

## 4. Phase 1 — Formal Behavioral Contracts

`planning/detailed-design/contracts.md` contains:

- the core-operation template below, for each core operation;
- a **Typed Error Catalog**: `CODE | HTTP | trigger | explanation template | retryable`;
- an **Invariant Binding Table**: `Invariant | AD-n | enforcement point | test that turns RED if removed`;
- **supporting contracts** for every FR the core operations do not bind (Appendix B).

Banned words in a contract: efficiently, appropriately, securely, quickly, gracefully, reasonable, robust, properly, as needed, scalable, user-friendly, "etc.".

```markdown
### Operation: `<name>(<typed parameters>)`
- **Layer:** Inbound Port | Core Domain | Outbound Port
- **Precondition (P):** P1 … -> violation: <TYPED_ERROR, HTTP>; P2 …
- **Postcondition (Q):** Q1 return schema; Q2 state predicate; Q3 event / audit; Q4 explanation (rule IDs + values); Q-fail what is unchanged
- **Invariant (I):** I1 … Bound to: AD-<n>
- **Concurrency / idempotency:** …
- **Time:** which Clock; boundary semantics
- **Latency budget (NFR):** p95 < X ms at N concurrent (PRD NFR-n)
```

## 5. Phase 2 — Internal Interfaces, Schemas & Contracts

- `planning/detailed-design/ports-and-adapters.md`: every component exactly once, plus a Mermaid diagram with layer tags. The hard rules:
  1. `domain/` imports no web framework, DB driver, wall clock, random or network.
  2. Time and ids enter only through `Clock` and `IdGenerator`.
  3. Every external interaction is behind an outbound port with a simulated adapter.
  4. DTOs are primitive-typed.
- `planning/detailed-design/schemas/`:
  - `001_tezg_schema.sql`: every Plan-2 entity, with `createdAt`/`updatedAt`, an `audit_events` table and at least 2 physically enforced invariants;
  - `dto.ts`: request + response per operation, `ErrorBody`, `ExplanationDTO`;
  - `events.md`: `eventId`, `occurredAt`, `schemaVersion`;
  - `openapi.yaml`: every ingress procedure and every error response.
- Phase 1–2 gate: `reviews/review-detailed-design.md`, from the adversarial review plus the edge-case hunter.

## 6. Phase 3 — Test Preparation (TEA)

Pair roles swap: Martín is Test-lead (Murat), Mateo is Reviewer.

| Step | Output |
|---|---|
| 3.1 Risk-based test design | `test/test-design.md`: risk register (≥ 8; each module's MEC is P0), level allocation, thresholds, testability gaps |
| 3.2 Framework | Fixtures `fake_clock`, `seed_marketplace` (Plan-2 Reference Seed Profile), `sim_events` (fault injector), `db`, `explain_assert` |
| 3.3 ATDD | `test/atdd/<module>_contracts.test.ts`; per operation: happy, P-violation, invariant under concurrency/repetition/boundary; per module: the MEC; ≥ 1 explainability test. Red for the right reason |
| 3.4 NFR evidence | `test/nfr-evidence.md`: NFR, metric, measurement, artifact, status. At least one performance, one reliability and one security NFR |
| 3.6 Review & trace | `reviews/review-test-quality.md`; `test/traceability-matrix.md` (FR/NFR, scenario, AD, contract clause, test, story, status) |
| 3.7 TEA skill matrix | Artifact produced and defect caught, per skill |

Phase 3 gate: no P0 risk without a red test, and no AD without a test that goes red.

## 7. Phase 4 — `epics.md` and Sprint Planning

- Structure: Epic 1 is the walking skeleton. Epics 2–13 are one vertical epic per module, each with 3–6 stories, a dedicated MEC story and ≥ 2 failure-state stories. No forward dependency (Appendix B).
- Every story carries: Traceability, Binding invariants, Files, Schema/DTO, ATDD path, Gherkin (happy + failure), DoD (Annex B).
- `bmad-sprint-planning`, with the readiness audit as its prepend, gives PASS → `sprint-status.yaml`. Output: `planning/readiness-gate-report.md` with the terminal output, sign-off and gate drill.
- The audit checks the 6 points of the default statement: FR↔story both ways; every UI state backed by a contract and a DTO; every AD in a story and a red test; no forward dependency; no contradictions; every review finding triaged.

## 8. Phase 5 — Wrap-up

ARCHITECTURE v2 links; `ai-log/decision-log-solu2.md`; a final trace (100 % of P0 linked to a story and a red test); tag `solu2-ready`.

## 9. Submission Package

The tree of the default statement, rooted at `docs/solu-2/`. Code-shaped artifacts (stubs, harness) live at the repository root, where Solu-1 put them. **`docs/solu-2.md` maps every deliverable to its path and says how to run or reach it.**

### AI Decision Log (Solu-2) — Requirements

- ≥ 6 new entries covering Phases 1–4, of which ≥ 2 rejected or corrected AI proposals.
- Every entry records: `Phase | Persona/Skill | Prompt (summary) | AI output (summary) | Human decision | Reason | Artifact changed`.
- Pair attribution on every entry.

## 10. Evaluation Rubric

| Component | Weight | Full marks |
|---|---|---|
| 1. Contract Derivation | 20% | 3+ operations with complete P/Q/I, a typed error catalog, concurrency/idempotency/time clauses, zero elastic language, every invariant bound to an AD-n and an enforcement point |
| 2. Ports & Adapters, Schemas & DTOs | 20% | Hexagonal placement, domain purity (injected Clock, simulated adapters), SQL with ≥ 2 physical invariants, primitive DTOs, error/explanation DTOs, OpenAPI and events consistent with the contracts |
| 3. Test Preparation | 20% | Risk register with the P0 edge case; fixtures; a red suite with deep assertions; CI gate; NFR plan; traceability with no orphan AD |
| 4. epics.md & Sprint Planning | 20% | Vertical epics, contract-bound stories, Given-When-Then (happy + failure), DoD, a documented gate drill, real PASS output, valid `sprint-status.yaml` |
| 5. AI Governance & Decision Log | 10% | ≥ 6 entries, ≥ 2 deep rejections, pair attribution, proof of human direction |
| 6. Adversarial Review & Triage | 10% | All 3 reviews executed; every finding triaged with a reason; accepted findings fixed |

Automatic deductions: production logic −20; tautological tests −5 each; a gate verdict without output −10; a cross-module dependency introduced −10.

---

## Annex A — TEZG Seed Table (the approved core operations)

Approved by Mateo at the Phase 0 gate (decision log Solu-2 #2). "R" is a raced/repeated/interrupted mutation, "E" an explainable decision, "MEC" the Plan-2 Mandatory Edge Case.

| # | Module | Core operations | Seed invariant to make physical | Enforcement point | MEC red test |
|---|---|---|---|---|---|
| 1 | IDN | `claimSellerTrack` (R, MEC) · `requireListingEligibility` (E) · `traceCapabilities` (E) | A seller is individual **or** business, never both | Conditional `UPDATE "User"."sellerTrack"`; composite FKs to `User(id, sellerTrack)` | Simultaneous profile completion and application → exactly one wins, 100 × |
| 2 | VER | `decideApplication` (R, MEC) · `submitApplication` (R, E) · `getApplicationForReview` (E, audited) | One terminal decision per application; one Pending per business | `WHERE status='Pending'`; partial unique `(businessId) WHERE status='Pending'` | Approve and reject at once → one transition, one event, no half state |
| 3 | CAT | `startFeedRun` (R) · `upsertCatalogEntry` (R, MEC) · `getPriceProvenance` (E) | One `externalKey` ⇔ one `catalogEntryId`; one running run | `UNIQUE externalKey` + upsert keeping `id`; partial unique `((true)) WHERE status='Running'` | A renamed or reprinted card keeps its id; listings and binder entries untouched |
| 4 | DSC | `search` (E, repeat-safe) · `getCardDetail` (MEC) · `assertSearchArea` (E) | One query path; hidden never returned | One SQL builder; default predicate | Boundary at 15.0002 km excluded and 4.99 km included; missing coordinates counted; entry with all listings filtered out still returned |
| 5 | INV | `reserveForPurchase` (R, MEC) · `createListing` (E) · `applyCommissionProjection` (R) | Stock never negative; one pool per (seller, item, condition) | `CHECK (quantity >= 0)`; conditional decrement | Caller aborts after reserve → quantity fully restored |
| 6 | ORD | `createOrder` (R) · `confirmPaid` (R, E) · `confirmPaymentReceived` (MEC) · `confirmItemReceived` (MEC) | Facts set once and in order; paid never expires | Fact CHECKs; `IS NULL` predicates | Business confirms before "paid" → refused; double confirmation → idempotent |
| 7 | COM | `applyOrderDeduction` (R, MEC) · `confirmTopUp` (R) · `reconcile` (E) | One deduction per order; amount = the rounding rule; balance = Σ top-ups − Σ deductions | Partial unique `(orderId) WHERE kind='Deduction'`; rounding CHECK | Two orders at one instant against one order's balance + a duplicate → each charged once, Exhausted once |
| 8 | TRD | `acceptOffer` (R, MEC) · `counterOffer` (R, E) · `cancelTrade` (R) | One Open offer per proposer and listing; only accepted offers hold stock | Partial unique; reservation CHECKs; `trd:seller` lock | Two offers for the last unit accepted from two tabs → one Accepted, one Unfulfillable |
| 9 | MSG | `sendMessage` (R) · `generateContactMessage` (E, MEC) · `requireMessagingEligibility` (E, MEC) | One conversation per pair; idempotent send | `UNIQUE (buyerId, businessId)`; `UNIQUE (conversationId, senderId, clientMessageId)` | Long, accented and emoji product names; verified state changing between compose and send |
| 10 | COL | `acceptPrompt` (R, MEC) · `onOrderClosed` (R) · `addEntry` (E) | One prompt per closed order; tagged-union entries | `UNIQUE orderId`; `cardKind` CHECKs | `OrderClosed` delivered twice and the prompt accepted twice → one prompt, one entry set |
| 11 | VAL | `valueCollection` (MEC) · `valuationTrend` (E) · `valuationHistory` (E) | Exact BigInt total; no division by zero | Pure functions + type brands | Zero baseline and rounding drift over 500 entries |
| 12 | REP | `writeReview` (R, E) · `hideReview` (R) · `getAggregates` (MEC) | Business reviews purchase-verified; hidden never counted | `review_business_iff_verified`; `WHERE "hiddenAt" IS NULL` | Paid-not-closed review refused; hide racing a new review → aggregate consistent |

DSC and VAL own no state. Their "R" slot is a concurrency-safe, repeat-safe read, the same reading Solu-1 decision #4 made.

## Annex B — Readiness Checklist (before `bmad-sprint-planning`)

- [ ] Core operations have complete P/Q/I; zero banned words
- [ ] The typed error catalog covers every P-violation and failure state
- [ ] Every AD-n has an enforcement point and a red test
- [ ] `domain/` has no framework, DB, network, wall-clock or random imports
- [ ] Schema contains ≥ 2 physical invariants; contended writes are atomic
- [ ] DTOs, OpenAPI and events are consistent (no field-name drift)
- [ ] The ATDD suite is executable, red for the right reason, and covers every MEC
- [ ] P0 risks ↔ tests ↔ stories are linked in the traceability matrix
- [ ] `epics.md` has no forward dependencies
- [ ] Every story has Traceability, Binding invariants, Files, Schema/DTO, ATDD path, Gherkin (happy + failure), DoD
- [ ] All review findings are triaged; Accepted ones fixed
- [ ] The decision log meets the minimums, with pair attribution
- [ ] No `bmad-build` / production logic was run or written

---

## Appendix A — Adaptation Map

| Element | Default statement | This statement |
|---|---|---|
| System | University AI Compute Fabric (one module per pair) | TEZG, all 12 modules (Appendix B) |
| Brief | `university_ai_compute_management_platform_brief.pdf` | `_bmad-output/A-Product-Brief/project-brief.md` |
| Hardware agnosticism | Simulated GPU, Prometheus/DCGM, K8s, vLLM | Simulated feed, TRM, storage, scanner, top-up provider, event bus, clock (Plan-2 constraint 2) |
| `seed_fleet` | 31 × (1 × 24 GB) + 1 × (2 × 48 GB) | `seed_marketplace`: the Plan-2 Reference Seed Profile (10,000 catalog entries, 300 users, 1,500 listings, 4 cities, ~200 orders, ~50 trades, a USD/COP fixture rate) |
| `sim_telemetry` | GPU/heartbeat fault injector | `sim_events`: an outbox-event fault injector (duplicate delivery, out-of-order delivery, subscriber failure) plus the feed's fault switches (ADD-§8.3) |
| `explain_assert` | Decision has ≥ 1 rule ID and observed values | Same, over the AD-SYS-1 `Decision` (`reasonCode`, `citations[].rule`, `citations[].inputs`, `humanMessage`, `occurredAt`) |
| Annex A seed table | 12 compute modules | Annex A above (TEZG modules, approved operations) |
| `/bmad-review … --lens …` | Generic review command | `bmad-review-adversarial-general` / `bmad-review-edge-case-hunter` (installed) |
| `/bmad-walkthrough` | Optional rehearsal | `bmad-checkpoint-preview` (optional) |
| Stack | Python/FastAPI or TS/Node; Postgres or SQLite | TypeScript/Node + Vitest + PostgreSQL 16 (Plan-2 baseline forbids SQLite where concurrency matters) |
| Submission root | Repository root | `docs/solu-2/` for documents; repository root for code (`src/`, `test-support/`) |

## Appendix B — Single-Package Reading of the Rules

| Default rule | Reading in this package |
|---|---|
| 3 core operations of *your module* | ≥ 3 per module: 37 core operations (Annex A) in the full template |
| Every FR traces to a story | All 96 PRD FRs. FRs the core operations do not bind get **supporting contracts** (compact P/Q/I, typed errors, AD binding, one happy and one failure red test), so every story has a contract and an ATDD path (decision log Solu-2 #3) |
| 3–4 epics, 9–16 stories | Epic 1 is a cross-module walking skeleton. Epics 2–13 are one vertical epic per module with 3–6 stories, each with a dedicated MEC story and ≥ 2 failure-state stories (decision log Solu-2 #4) |
| Mandatory Edge Case of *your module* | All 12 MECs (Annex A), each with a contract invariant, a physical enforcement, a P0 risk, a red test and a story |
| Pair roles | Mateo leads Phases 0–2. Martín leads Phase 3, and his decisions are relayed by Mateo and attributed to Martín (decision log Solu-2 #5) |
| One `001_<module>_schema.sql` | One `001_tezg_schema.sql` with every Plan-2 entity, in sections per owning module |
