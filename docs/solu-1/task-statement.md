# Solu-1: Task Statement

## Enterprise Solutioning & Contract-Driven Architecture for TEZG — All 12 Modules, One Package

| | |
|---|---|
| **Course Module** | Unit 4 — Contracts, Internal Design, Data Modeling, and Architecture Implementation |
| **Target Outcome (RAA4)** | Derive code interfaces, technical criteria, and data schemas from a plan to subsequently implement software components consistent with the system's functional intent. |
| **System Context** | TEZG — Pokémon TCG Marketplace and Collection Management (`docs/plan-2/` package, 12 modules) |
| **Delivery** | Individual work (Mateo Rubio) with AI Level 3 |

> This is the Solu-1 course statement adapted from its default framing (one feature of the course's *Smart Solar Flow* system) to **TEZG**, the project this repository plans. Phases, exercises, templates, the stop-point rule and the rubric are unchanged in intent; only the system, the reference material, the scope (Appendix B) and the paths (Appendix C) are TEZG-specific. Appendix A maps every substitution. The verbatim course statement is kept outside version control (`task1.md`, matched by `.gitignore`), as Plan-2 did with its own statement.
>
> **Scope (decided by Mateo Rubio on 2026-10-18, decision log #1).** The default statement assumes each student works on one feature of a system split across many groups. TEZG is the team's own project with 12 modules, so this package covers **all 12 modules** in one package — one contract matrix, one Ports & Adapters map, one migration set, one ATDD suite, one backlog and one readiness gate — each module scoped to its own section. Appendix B lists how every rule of the default statement is read at that scope.

---

## 1. Overview

In this studio task you lead an autonomous AI engineering council — **Winston** (Architect, `bmad-agent-architect` / `bmad-architecture`), **Amelia** (Dev, `bmad-agent-dev`), **Murat** (Test Architect, `bmad-tea` and the `bmad-testarch-*` skills) and **John** (PM, `bmad-agent-pm`) — to turn the Plan-2 specifications of TEZG into inviolable, machine-enforceable contracts, internal Ports & Adapters interfaces, SQL schemas and ATDD test scaffolds.

> **The Solutioning Stop-Point Rule.** Solutioning halts at Story Creation and the Sprint Readiness Audit (`bmad-sprint-planning`). Autonomous implementation agents (`bmad-dev-story`, `bmad-dev-auto`, `bmad-quick-dev` — the installed equivalents of `bmad-build`) are **NOT** invoked. Interface stubs that throw `NotImplementedError`, DTO types, DDL and failing tests are allowed; production logic is not.

```text
+-------------------------------------------------------------------------------+
|                    CONTRACT-DRIVEN SOLUTIONING WORKSHOP PIPELINE              |
+-------------------------------------------------------------------------------+
  |
  [PHASE 1] -----------------> Derivation of Contracts (P, Q, I)
    Skill: bmad-architecture /         - 3 core functions per module (36)
           bmad-agent-architect
  |
  [PHASE 2] -----------------> Ports & Adapters & Data Schemas
    Skill: bmad-architecture           - Hexagonal layer placement per module
                                       - Request / Response DTOs per module
                                       - SQL migration DDL per module
  |
  [PHASE 3] -----------------> Enterprise Test Scaffolding (TEA)
    Skill: bmad-testarch-*             - ATDD red-phase scaffolds (12 files)
                                       - CI pipeline & NFR evidence audit
  |
  [PHASE 4] -----------------> Technical Story Creation & Readiness Gate
    Skill: bmad-create-epics-and-stories   - Contract-bound stories
    Skill: bmad-sprint-planning            - Readiness audit (IR-PASS)
```

---

## 2. Source Materials & Reference Context

| # | Source | Path |
|---|---|---|
| 1 | Product Brief | `_bmad-output/A-Product-Brief/project-brief.md` |
| 2 | PRD with numbered FRs and NFRs (`FR-<CODE>-n`, `NFR-<CODE>-n`, `NFR-SYS-n`) | `docs/plan-2/planning/prd.md` + `docs/plan-2/planning/addendum.md` (ADD-§1..§10) |
| 3 | Architecture with numbered invariants: inherited `AD-1..AD-19`, system `AD-SYS-1..8`, module `AD-<CODE>-n` | `_bmad-output/specs/spec-pokemon-tcg-marketplace/ARCHITECTURE-SPINE.md` (AD-1..13), `docs/plan-1-seller-track/ARCHITECTURE.md` (AD-14..19), `docs/plan-2/planning/ARCHITECTURE.md` (AD-SYS, AD-<CODE>) |
| 4 | Implementation rules (money, ids, dates, errors) | `_bmad-output/project-context.md` |

---

## 3. Phase 1 — Formal Behavioral Contracts (P, Q, I)

**Goal:** formulate Design-by-Contract specifications for the **3 core operational functions of each of the 12 modules**.

### Exercise 1.1: Complete the Behavioral Contract Matrix

Use this template for every function:

```markdown
#### Function: `<functionName>(<param1>, <param2>, ...)`

- **Precondition (P):**
  - `<param>` MUST be <type, format, nullability> matching <existing/active record in `<table>`>.
  - <state / ownership / authorization condition that MUST hold before the call>.
- **Postcondition (Q):**
  - Returns <exact return value or shape> if <success condition>.
  - Throws typed error `<ERROR_CODE>` (HTTP <status>) on <failure condition>.
  - <Exact state mutation, e.g. atomic `UPDATE ... WHERE <predicate> RETURNING *`>.
  - <Side effects dispatched: messages, commands, notifications, with exact destination/format>.
- **Invariant (I):**
  - <Rule that holds before AND after every call> (bound to AD-<n>).
```

Each module's three functions must, between them, include:

- a **guard / authorization predicate** — strictly read-only, throws a typed error on mismatch;
- a **contended mutation** that has exactly one winner — atomic single-winner update, idempotent on repetition;
- a **resolver / lookup** with explicit behaviour when data is missing — for example it returns `null` as a silent no-op instead of throwing.

Every clause is stated with zero elastic language: types, table and column names, `DomainError` codes, HTTP statuses and exact values.

**TEZG bindings.** Error codes are the Plan-2 `DomainError` registry (ADD-§3.1 and ARCHITECTURE §8), each with exactly one owning module (AD-11, AD-SYS-1). The HTTP status is the one tRPC 11 emits for the code's `trpc` family in AD-SYS-1 (`UNAUTHORIZED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `BAD_REQUEST` 400, `CONFLICT` 409, `TOO_MANY_REQUESTS` 429; `'Unexpected'` → `INTERNAL_SERVER_ERROR` 500). Side effects are `OutboxEvent` rows enqueued in the same transaction (AD-SYS-2) with the ADD-§5 payloads.

**Deliverable:** `docs/solu-1/planning/contracts.md`.

---

## 4. Phase 2 — Internal Interface & Data Schema Design

### Exercise 2.1: Ports & Adapters Architecture Mapping

Assign each component of each module to its Hexagonal layer:

| Component Name | Hexagonal Architecture Layer | Governed By Rule |
|---|---|---|
| `<tRPC router / event subscriber / job handler>` | **Driving Adapter** (Inbound tRPC / Event / Job) | <What external input it receives> |
| `I<UseCase>UseCase` | **Inbound Port** (Use Case Interface) | Defines `<useCaseMethod>(dto)` |
| `<domain predicate / rule>` | **Core Domain & Invariants** | AD-<n> <invariant name> |
| `I<Entity>Repository` | **Outbound Port** (Infrastructure Interface) | Defines `<atomicRepositoryMethod>()` |
| `Pg<Entity>Repository` | **Driven Adapter** (Database Driver) | `<NNN>_<migration_name>.sql` |
| `<Outbox / ObjectStorage / Clock / neighbour client>` | **Driven Adapter** (External System / Messaging) | <Port, event, or protocol> |

**Deliverable:** `docs/solu-1/planning/ports-and-adapters.md`.

### Exercise 2.2: Concrete Schema & DTO Authoring

#### A. SQL DDL Migration (`<NNN>_create_<table_name>.sql`)

For the tables that enforce each module's contracts:

- a primary key with a generated ID;
- `NOT NULL` on every mandatory column, `UNIQUE` where the contract demands uniqueness;
- the columns that express state, with comments listing allowed values;
- a `created_at TIMESTAMPTZ NOT NULL` column;
- at least one constraint or partial index that physically enforces an invariant.

The template's ID and timestamp defaults (`UUID … DEFAULT gen_random_uuid()`, `DEFAULT NOW()`) collide with the inherited project invariants (cuid2 ids; time only from the `Clock` port, AD-SYS-6). How they are reconciled is a Phase 2 gate decision (decision log).

**Deliverable:** `docs/solu-1/planning/schemas/<NNN>_create_<tables>.sql`, one migration per planning module that owns tables, applied in AD-1 dependency order.

#### B. DTO Interfaces (`<module>.dto.ts`)

Strictly-typed DTOs for each inbound operation: primitive-typed fields only; enumerations as literal union types; optional fields documented with when they are present.

**Deliverable:** `src/modules/<host>/dto/<code>.dto.ts` (the code's home per ARCHITECTURE §3), indexed from `docs/solu-1/planning/schemas/README.md`.

---

## 5. Phase 3 — Enterprise Test Architecture (TEA)

### Exercise 3.1: ATDD Red-Phase Test Suite

Executable failing test scaffolds derived from the Phase 1 contracts. For each function: the success path (Q holds) and the precondition/invariant violation (typed error, no duplicate side effects). Each contended mutation adds the winner/loser pair (exactly one winner; zero duplicate side effects).

**Deliverable:** `docs/solu-1/tests/atdd/<code>-contracts.test.ts`, one file per module, executable with `npm run test:atdd:solu1`. The tests call interface stubs that throw `NotImplementedError` and therefore fail red for that reason.

### Exercise 3.2: Enterprise TEA Skill Matrix Mapping

| Quality / Test Workflow | BMad TEA Skill | Action Executed |
|---|---|---|
| **Risk-Based Test Strategy** | `bmad-testarch-test-design` (`TD`) | Maps P0–P3 risks and sets coverage threshold. |
| **Framework Initialization** | `bmad-testarch-framework` (`TF`) | Scaffolds the test harness (Vitest). |
| **CI Quality Gate Scaffold** | `bmad-testarch-ci` (`CI`) | Configures the automated CI gate check (GitHub Actions). |
| **ATDD Test Generation** | `bmad-testarch-atdd` (`AT`) | Generates executable red-phase test suites. |
| **NFR Evidence Audit** | `bmad-testarch-nfr` (`NR`) | Audits PRD NFRs (latency thresholds, RBAC isolation). |
| **Traceability Matrix & Gate** | `bmad-testarch-trace` (`TR`) | Generates the final matrix and certifies pass/fail. |

**Deliverable:** `docs/solu-1/tests/tea-skill-matrix.md`.

---

## 6. Phase 4 — Story Creation & Readiness Gate Audit

### Exercise 4.1: Story Breakdown

Run `bmad-create-epics-and-stories` to derive technical user stories from the contracts:

```markdown
### Story <X.Y>: <Story title>
- **Description:** As a <role>, I want to <action> so that <value>.
- **Contract Reference:** `<functionA>`, `<functionB>` (AD-<n>, AD-<m>)
- **Target DTO:** `<Operation>DTO`
- **Database Tables:** `<table>`, `<table.column>`
- **ATDD Test File:** `docs/solu-1/tests/atdd/<code>-contracts.test.ts`
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** <initial state / precondition>.
  - **When:** <actor> <performs action> via <channel>.
  - **Then:** <contract guard passes>, <state mutation>, <side effects with exact destination>,
    and <exact user-visible result>.
```

**Deliverable:** `docs/solu-1/planning/epics.md`.

### Exercise 4.2: Sprint Readiness Audit (`bmad-sprint-planning`)

Run `bmad-sprint-planning` to audit contract completeness, schema binding and ATDD test links. A passing result reports:

```text
+-----------------------------------------------------------------------------------+
| SPRINT READINESS AUDIT RESULT                                                     |
+-----------------------------------------------------------------------------------+
| Status: IR-PASS (Autonomous Green Light)                                          |
| Cross-Document Traceability: 100% (PRD FR-1..n -> ARCH AD-1..n -> DTOs/Tables)    |
| ATDD Test Coverage: 100% contracts scaffolded in tests/atdd/                      |
| Invariant Enforceability: <AD-n list> bound to concrete handlers                  |
| Action: Sprint tracking file generated. System ready for autonomous implementation|
+-----------------------------------------------------------------------------------+
```

**Deliverables:** `docs/solu-1/planning/readiness-gate-report.md` (the audit's real terminal output and sign-off) and `docs/solu-1/implementation-artifacts/sprint-status.yaml`.

---

## 7. Evaluation Rubric & Student Submission Sheet

| Evaluation Component | Weight | Criteria for Full Marks (Exemplary Submission) |
|---|---|---|
| **1. Contract Derivation Matrix** | 20% | Preconditions (P), Postconditions (Q), and Invariants (I) explicitly defined for all 3 core functions of every module with zero elastic language. |
| **2. Ports & Adapters Architecture** | 15% | Correct Hexagonal Layer placement, strict domain isolation, and complete DTO / SQL DDL migration scripts provided. |
| **3. Enterprise TEA Test Scaffolding** | 20% | Executable red-phase ATDD suite (`<code>-contracts.test.ts`) written with valid assertions and TEA skill mapping. |
| **4. Epic, Story & Gate Audit** | 20% | Epics and stories trace directly to DTOs/Schemas, and the sprint readiness audit certifies a clean `IR-PASS`. |
| **5. AI Governance & Decision Log** | 10% | More than 7 detailed entries demonstrating proactive human leadership; several documented AI rejections with deep technical reasoning; clear proof that human judgment guided every step. |
| **6. Adversarial Review & Triage** | 15% | All 4 specialized review reports executed; every single finding triaged with clear Accept/Defer/Reject justification; accepted findings visibly fixed in artifacts. |

The four specialized reviews of this package (rubric 6) are:

| # | Report | Skill | Target |
|---|---|---|---|
| 1 | `reviews/review-contracts-adversarial.md` | `bmad-review-adversarial-general` | `planning/contracts.md` |
| 2 | `reviews/review-schema-edge-cases.md` | `bmad-review-edge-case-hunter` | `planning/schemas/` + DTOs |
| 3 | `reviews/review-atdd-test-quality.md` | `bmad-testarch-test-review` | `tests/atdd/` |
| 4 | `reviews/review-stories-adversarial.md` | `bmad-review-adversarial-general` | `planning/epics.md` |

---

## 8. Summary & Key Takeaways

1. **Contracts Before Stories:** never generate user stories until preconditions, postconditions, invariants and schemas are strictly defined.
2. **Enterprise Test Architecture:** scaffolding ATDD red-phase suites and CI quality pipelines before coding.
3. **The Solutioning Stop-Point:** solutioning stops strictly at story creation with a certified pass. No unverified work goes to implementation agents.

---

## Appendix A — Adaptation Map (Default Statement → TEZG)

| Element | Default statement | This statement |
|---|---|---|
| System | Smart Solar Flow (one feature per student) | TEZG, all 12 Plan-2 modules (Appendix B) |
| Source documents | Product Brief, PRD (FR-1..n), `ARCHITECTURE-SPINE.md` (AD-16..23) | TEZG brief, Plan-2 PRD + addendum (`FR-<CODE>-n`), spine AD-1..13 + Plan-1 AD-14..19 + Plan-2 `AD-SYS-n` / `AD-<CODE>-n` |
| Stack | TypeScript / PostgreSQL / MQTT | TypeScript / PostgreSQL 16 (Docker Compose) / in-process outbox events (AD-SYS-2) — no MQTT |
| Error codes | `<ERROR_CODE>` (HTTP status) | `DomainError` registry codes (PascalCase, one owner, AD-11) with the tRPC family's HTTP status (AD-SYS-1) |
| Side effects | messages, commands, notifications | `OutboxEvent` rows with ADD-§5 snapshot payloads; external links are built, never called (AD-MSG-1) |
| DDL template defaults | `UUID … DEFAULT gen_random_uuid()`, `created_at … DEFAULT NOW()` | Phase 2 gate decision against cuid2 ids and the `Clock` port (decision log) |
| Commands | `/bmad-architecture`, `/bmad-testarch-*`, `/bmad-create-epics-and-stories`, `/bmad-sprint-planning`, `bmad-build` | The installed skills of the same names; `bmad-build` maps to `bmad-dev-story` / `bmad-dev-auto` / `bmad-quick-dev`, none of which is invoked |
| Review reports | "All 4 specialized review reports" (unnamed) | The four reports named in §7 |
| ATDD path | `tests/atdd/<feature>-contracts.test.*` | `docs/solu-1/tests/atdd/<code>-contracts.test.ts` |
| Unchanged | Phases, templates, stop-point rule, rubric weights | — |

## Appendix B — Single-Package Scope

Mateo Rubio's instruction (2026-10-18): *"these solus are made for that solar project which has various modules and each group should only focus on one but we are doing a completely different project … so instead of doing just one module of our project we want to cover all its modules, do it in a way it is complete and follows each solu intent."*

| Default rule | Reading in this package |
|---|---|
| 3 core functions of *your feature* | 3 per module, 36 in total; each module's triple covers guard + contended mutation + resolver, or a logged substitution where the module owns no state (decision log) |
| One Ports & Adapters table | One table per module, in one document |
| One migration | One migration per module that owns tables, applied in AD-1 dependency order; DSC and VAL own no tables (ARCHITECTURE §6.5, §6.11) |
| One `<feature>.dto.ts` | One DTO file per module |
| One ATDD file | One ATDD file per module, one suite |
| Stories from the contracts | One epic per module, stories bound to that module's contracts |
| One readiness gate | One gate over the whole package |
| One decision log | One decision log for the package |

## Appendix C — Path Map

```text
docs/solu-1/
├── task-statement.md                 # this statement
├── planning/
│   ├── .memlog.md                    # working memory of the run (append-only)
│   ├── contracts.md                  # Phase 1 — P/Q/I × 36
│   ├── ports-and-adapters.md         # Phase 2.1
│   ├── schemas/                      # Phase 2.2 — NNN_create_*.sql + README (DTO index)
│   ├── epics.md                      # Phase 4.1
│   └── readiness-gate-report.md      # Phase 4.2 output + sign-off
├── implementation-artifacts/
│   └── sprint-status.yaml            # Phase 4.2
├── tests/
│   ├── atdd/<code>-contracts.test.ts # Phase 3.1 — 12 files
│   └── tea-skill-matrix.md           # Phase 3.2
├── reviews/                          # the 4 reports of §7
└── ai-log/
    └── decision-log-solu1.md
src/modules/<host>/                   # interface stubs + DTOs (no production logic)
test-support/                         # shared harness: Postgres, fake clock, fake outbox
```
