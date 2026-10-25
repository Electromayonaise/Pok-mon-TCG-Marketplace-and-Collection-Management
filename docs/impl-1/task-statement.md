# Impl-1: Task Statement

## TEZG — AI-Assisted Implementation & Foundation Build (all 12 modules, Full Ceremony)

| | |
|---|---|
| **Course Module** | Unit 5, Part 2 — the BMad Build Full Ceremony |
| **Target Outcome** | Turn the upstream specification spine into running, automatically tested code that conforms to its contracts, schemas and architectural invariants. |
| **Delivery** | Pair (Martín Gómez, Mateo Rubio), BMad Method, Full Ceremony Build. In this task, Martín takes the decisions the AI decision log records. |
| **Prerequisites** | Plan-2 (`docs/plan-2/`) and Solu-2 (`docs/solu-2/`, merged in PR #1): the PRD, DESIGN/EXPERIENCE, `ARCHITECTURE.md` with AD-SYS-1..8, AD-<CODE>-n and refinements R-1..R-n, `contracts.md`, `001_tezg_schema.sql`, `dto.ts`, `events.md`, `openapi.yaml`, the 352-test red ATDD suite, `epics.md` (13 epics, 69 stories) and a certified readiness gate. |
| **Deliverable** | Working codebase, automated test suite, scaffold infrastructure, `sprint-status.yaml`, AI decision log and implementation walkthrough report. |

> This is the Impl-1 course statement, adapted from its default case study (the *Academic AI Compute Fabric*) to **TEZG**, the Pokémon TCG marketplace and collection tracker this repository builds. The ceremony, the deliverables, the engineering rules and the rubric keep their intent. The domain, the fixtures, the stack and the scope (Appendix B) are TEZG's, and Appendix A maps every substitution. The verbatim course statement is kept outside version control, as in Plan-2 and Solu-2.
>
> **Scope (decided by Martín Gómez, 2026-10-24, decision log Impl-1 #1–#5).** The default statement gives each triad one module and 3 core stories, and leaves failure recovery and advanced testing to Impl-2. TEZG is the pair's own 12-module product and must end up complete. So Impl-1 builds the walking skeleton plus the Core and MEC stories of **all 12 modules**, with the prerequisite stories they need: **43 of the 69 stories**. The other 26 (the remaining Failure-state and Supporting stories) are Impl-2's. The front end is deferred to a phase after Impl-2.
>
> **Delivery cut (decided by Martín Gómez, 2026-10-25, decision log Impl-1 #22).** The Impl-1 delivery is the foundation (the scaffold and Stories 1.1–1.3) plus the Identity module's Stories 2.1 (Core), 2.2 (MEC) and 2.3 (Failure-state), as the default statement's "scaffold + 3 core stories". The other 37 stories of the 43 continue after the delivery, epic by epic (§3, Appendix B.0). Until then they stay `backlog`, and their ATDD tests stay red for the right reason, reported apart like the Impl-2 ones.

> **The Solutioning stop-point is lifted.** Solu-2 forbade production logic. Impl-1 writes it, but only through the Full Ceremony: no unconstrained "build my app" prompts.

---

## 1. Overview

| | Default Impl-1 | TEZG Impl-1 |
|---|---|---|
| **Team** | Triad, one module | Pair, all 12 modules |
| **Starting point** | Plan-2 PRD, OpenAPI, AD-n, epics | Plan-2 + Solu-2 package, including a red ATDD suite and a certified backlog |
| **Scope** | Scaffold + 3 core stories | Delivered: scaffold + Stories 1.1–1.3 (foundation) + Identity 2.1–2.3 (#22). Planned: 43 stories, Epic 1 (walking skeleton) and every module's Core and MEC stories, plus 8 prerequisite stories (Appendix B) |
| **Stack** | Python/FastAPI or Node/TS, Postgres or SQLite | Fixed by the Solu-2 Stack Decisions: TypeScript 7 strict, Node 22, Next.js 16 App Router + tRPC 11, Prisma 7.10 (decision log #8), Better Auth, PostgreSQL 16.6, Vitest 5 + fast-check |
| **Fixtures** | 32 GPU nodes (31 × 24 GB, 1 × 2 × 48 GB) | The Plan-2 Reference Seed Profile (`seed_marketplace`) |
| **Runs** | `docker-compose up` or `pytest` | Local only: `docker compose up` + one `npm` command (decision log #4) |
| **UI** | Not required | Not built in Impl-1 or Impl-2; deferred (decision log #3) |

**Council:** Amelia (`bmad-agent-dev`, `bmad-dev-story`), story preparation (`bmad-create-story`), a fresh-context reviewer (`bmad-code-review`), Murat (`bmad-tea`, `bmad-testarch-*`) for test review and trace, Winston (`bmad-agent-architect`) when an invariant is in question.

---

## 2. Learning Objectives

1. **Operationalize the sprint backlog:** `bmad-sprint-planning` turns `epics.md` into an Impl-1 `sprint-status.yaml`.
2. **Run the Full Ceremony per story:** every story goes through context ingestion, repository inspection, task breakdown, concurrent code + tests, DoD verification and a review report.
3. **Keep the boundaries:** hexagonal modules where `domain/` imports no framework, driver, wall clock, randomness or network (`gate:purity`).
4. **Implement to contract:** procedures, payloads, error codes and HTTP statuses match `openapi.yaml`, `contracts.md` and `001_tezg_schema.sql`, with no invented endpoints or columns.
5. **Verify test-first:** the Solu-2 ATDD tests of each story turn green, and each story adds the unit and integration tests its tasks need.
6. **Govern the AI:** audit every diff against the ADs, reject unvetted dependencies and boilerplate, and record provenance in the AI decision log.

---

## 3. The Full Ceremony, per Story

No unconstrained "code generation" prompt is allowed. Every story goes through the default statement's cycle: **plan, prepare (DoR), test design, create story, build solution, review, verify and gate.**

| Cycle stage | TEZG execution |
|---|---|
| Plan | `bmad-sprint-planning` puts the story in the Impl-1 `sprint-status.yaml` (Phase 0). |
| Prepare (DoR) | A story is ready only if (a) every story it depends on is `done`, (b) its epic entry is complete (contracts, binding invariants, schema/DTO, ATDD path, Gherkin, DoD), and (c) its bound ATDD tests exist and fail on `NotImplementedError`. `bmad-create-story` runs its validation against this checklist before the story moves to `ready-for-dev`. |
| Test design | Solu-2 already designed the acceptance tests: `test-design.md` plus the red ATDD suite. Per story, the DoR confirms those tests cover both Gherkin scenarios, and the task breakdown adds the unit and integration tests the tasks need. If a scenario has no bound test, `bmad-testarch-atdd` writes one before any code. |
| Create story | `bmad-create-story` |
| Build solution, verify | `bmad-dev-story`, steps 1–5 below |
| Review | `bmad-code-review`, step 6 below |
| Gate | The epic gate below |

The default statement's 6-step `bmad-build` sequence maps onto the installed skills:

| Default step | TEZG execution |
|---|---|
| 1. Context ingestion | `bmad-create-story` writes the story file from `epics.md`, binding its PRD requirements, contracts, ADs, schema tables, DTOs and ATDD path. The story moves `backlog → ready-for-dev`. |
| 2. Repository inspection | `bmad-dev-story` (Amelia) reads the existing modules, shared kernel, schema, lint rules and tests before touching a file. |
| 3. Task breakdown | Amelia orders the work: domain → ports → infra adapter → tRPC procedure → tests. |
| 4. Concurrent code + tests | Production code is written only against a failing test: the story's ATDD tests plus new unit and integration tests. |
| 5. DoD verification | The test runner (`vitest`) and the linter (`eslint`) run, together with `typecheck`, `gate:purity` and the red gate. 100 % of the story's acceptance criteria must pass. Then the story moves `in-progress → review`. |
| 6. Review report and status promotion | The story file's Dev Agent Record holds the review report: a concise walkthrough of the changes, the diff evidence (`git diff --stat` and the commit hashes) and the commands run with their output. `bmad-code-review` then runs in a fresh context. Its findings are fixed or triaged, and the story moves to `done`. |

The installed BMad status values are `backlog → ready-for-dev → in-progress → review → done`. The default statement's `ready-for-review` is `review` here.

**Epic gate (decision log #5).** The agents take each story through the whole ceremony, including the code review. When an epic's Impl-1 stories are all `done`, Martín triages the review findings, accepts or rejects corrections, and signs the epic off. A short `bmad-retrospective` may follow. These sign-offs are where his decision-log entries come from.

**Two-Sentence Rule.** No Impl-1 story is a compact change. Each one creates or extends shared domain models, tables and public procedures, so all 43 follow the Full Ceremony. The walkthrough states the business goal, blast radius and verification of each story, citing its epic entry.

**Compact ceremony and epic batches (decision log #22).** Stories 2.1–2.3 keep every step above in compact form: a short story file, `bmad-dev-story` test-first, `bmad-code-review` in a fresh-context subagent within the same session, and triage of its High and Medium findings. After the delivery, the remaining stories run one epic at a time: `bmad-quick-dev` takes the bound ATDD tests as the spec, one `bmad-code-review` covers the epic, and each story keeps its own commit and `sprint-status.yaml` entry. The red gate stays the net: a story marked `done` must turn its ATDD tests green.

---

## 4. Technical Baseline & Scaffolding Standards

### 4.1 Project organization

The default tree is a single-module layout. TEZG keeps the modular hexagonal layout fixed in Plan-2 §3 and Solu-2 `ports-and-adapters.md`:

| Default | TEZG |
|---|---|
| `README.md` (quick-start, setup commands, architecture summary), `docker-compose.yml`, `.env.example`, `package.json` (approved dependency manifest) | Same files at the repository root. `docker-compose.yml` gains the app service next to Postgres. The README is rewritten for Impl-1: quick-start, setup commands, architecture summary. |
| `docs/prd.md` | `docs/plan-2/planning/prd.md` + `addendum.md` |
| `docs/contracts/` | `docs/solu-2/planning/detailed-design/` (`contracts.md`, `schemas/openapi.yaml`, `dto.ts`, `events.md`, `001_tezg_schema.sql`) |
| `docs/sprint-status.yaml` | `docs/impl-1/implementation-artifacts/sprint-status.yaml` |
| `docs/ai-decision-log.md` | `docs/impl-1/ai-log/ai-decision-log.md` |
| `src/domain/`, `src/ports/` | `src/modules/<module>/domain/`, `src/modules/<module>/ports/`, plus `src/shared-kernel/` |
| `src/adapters/inbound/` | `app/api/trpc/[trpc]/route.ts`, `src/server/trpc/` (routers, error formatter, admin guard) and `src/modules/<module>/dto/` |
| `src/adapters/outbound/` | `src/modules/<module>/infra/` (SQL repositories on the `Sql`/`Tx` port per R-14, simulated adapters) |
| `src/config.py` | `src/shared-kernel/config.ts`: environment validation at start-up |
| `tests/fixtures/` | `test-support/fixtures/` (seed data generated by `test-support/solu2/seed-marketplace.ts`) |
| `tests/unit/`, BDD-mapped tests | `docs/solu-2/test/atdd/*.test.ts` (the Gherkin-mapped suite) plus colocated unit and integration tests |

### 4.2 Scaffold (before Epic 1's stories)

- Next.js 16 App Router app that serves `/api/trpc` on the non-batched wire (R-9) and no pages. Every procedure's input is a zod schema, which refuses bad shapes as `RequestValidationFailed` (`contracts.md`, AD-SYS-1 rule 7). This is the TypeScript track's Zod.
- Migrations (`001_tezg_schema.sql`) applied by one command. The Prisma 7.10 model (decision log #8) is generated from the migrated schema (R-8) and gated against drift; it backs Better Auth, while repositories stay on SQL (R-14; decision log #6).
- Better Auth wired to `"User"`, `"Session"`, `"Account"`, `"Verification"` through the Prisma adapter, with cuid2 ids and IP tracking disabled (R-12).
- Configuration validated at start-up from `.env`, with `.env.example` documenting every variable.
- Simulated fixtures: the Reference Seed Profile under `test-support/fixtures/`, and the simulated outbound adapters (§4.3).
- Dependency validation: a `gate:deps` script fails the build when a manifest entry is not pinned to an exact version or is not on the approved list (the Stack Decisions plus decision-log entries). It also fails when `npm audit --omit=dev` reports a high or critical vulnerability.
- Health probes: liveness and readiness (database reachable, migrations current). They are added to the API contract through `operations.json` and the generator, so the OpenAPI stays the single list of endpoints.
- One command brings everything up from a clean clone and launches the service. Another runs the full suite.
- ESLint's base configuration, run from an isolated toolchain in `tools/lint/` because TypeScript 7 has no JavaScript API for `typescript-eslint` (decision log #7). Story 1.4 adds the `tezg/*` rules, including R-17's `tezg/error-owner`.
- README rewritten: quick-start, setup commands, architecture summary.

### 4.3 Non-negotiable engineering rules

- **Zero hallucinated endpoints.** Every procedure, field, error code and HTTP status matches `openapi.yaml` (`gate:api:solu2`) and `contracts.md` (`gate:codes:solu2`). A contract change goes through the generator and the decision log, never through code alone.
- **Dependency safety.** Only the packages named in the Stack Decisions, pinned to exact versions and checked by `gate:deps`. Any other package needs a decision-log entry.
- **Fixtures.** `test-support/fixtures/` holds the Reference Seed Profile; tests run on the virtual clock seeded at `2026-10-01T15:00:00Z` and behind the network guard.
- **Determinism.** Time and ids come only from the `Clock` and `IdGenerator` ports; every external system is a simulated adapter.
- **Git hygiene.** Incremental conventional commits per story: `feat(scaffold): …`, `feat(story-2.1): …`, `test(story-2.2): …`, `fix(story-7.2): …`.

---

## 5. Workshop Outline

| Phase | Work | Skills |
|---|---|---|
| 0 Sprint planning | Impl-1 `sprint-status.yaml`: the 43 stories in scope, the 26 Impl-2 stories kept as `backlog`. Point the red gate at it. | `bmad-sprint-planning`, `bmad-sprint-status` |
| 1 Scaffold | §4.2, committed as `feat(scaffold)`; the whole existing gate stays green | `bmad-agent-dev` |
| 2 Epic 1 | Walking skeleton 1.1–1.5: error body, audit + redaction, outbox delivery, determinism, admin health | Full Ceremony |
| 2b Delivery cut (#22) | Identity 2.1–2.3 in the compact ceremony, then Phase 4's walkthrough and README check | Compact ceremony |
| 3 Epics 2–13 | After the delivery, in epic batches (§3). In epic order, which respects every dependency: IDN, VER, CAT, INV, DSC, ORD, COM, MSG, TRD, COL, VAL, REP. One epic gate each | Full Ceremony; Martín's sign-off |
| 4 Wrap-up | Final trace, `walkthrough-impl1.md`, README check from a clean clone, decision log, `docs/impl-1.md` deliverable map, tag `impl1-done` | `bmad-testarch-trace`, `bmad-testarch-test-review` |

---

## 6. Deliverables & Acceptance Checklist

### 6.1 Required deliverables

1. **Functional source code:** the scaffold and the 43 Impl-1 stories, running locally.
2. **Automated test suite.** It covers every acceptance criterion of the 43 stories, with ≥ 90 % passing (target: 100 %) and zero skipped tests (no `.skip`, `.only` or `.todo`).
   - The ATDD tests of the 26 Impl-2 stories stay red for the right reason (`NotImplementedError`). The red gate checks them, and they are reported apart: they are pending scope, not failures or skips.
   - For the delivery cut (#22), items 1 and 2 read "the 6 delivered stories" (Appendix B.0). The ATDD tests of the 37 stories that continue after it are reported apart in the same way.
3. **`sprint-status.yaml`:** each Impl-1 story's real progression `ready-for-dev → in-progress → review → done`.
4. **`docs/impl-1/walkthrough-impl1.md`:**
   - the module architecture and directory layout;
   - for each story: the goal, the procedures implemented, the database changes and the test evidence;
   - the terminal output of the passing suite and gates.
5. **`docs/impl-1/ai-log/ai-decision-log.md`:** ≥ 6 documented AI interactions, including ≥ 2 where the team corrected an AI hallucination, fixed an invalid assumption or refactored AI code to satisfy an AD.
6. **Scaffold infrastructure and `README.md`:** `docker-compose.yml`, `.env.example`, the approved dependency manifest, and a README with the quick-start, the setup commands and an architecture summary.

### 6.2 Self-assessment checklist

- [ ] **Execution.** A clean clone works with only the README's instructions, and no external files or configuration. `docker compose up` launches the database and the service, with both health probes green. One `npm` command runs the suite.
- [ ] **Scaffold integrity.** Hexagonal separation holds, and `gate:purity` passes. No domain code imports tRPC, Next.js, Prisma, `pg` or the wall clock.
- [ ] **Stories implemented.** All 43 stories have working domain models, repository adapters and tRPC procedures.
- [ ] **Contract compliance.** Request and response payloads match `openapi.yaml` and `dto.ts`.
- [ ] **Test coverage.** Every story has ≥ 2 distinct automated tests that validate its Gherkin (the trace proves it).
- [ ] **Error handling.** Every refusal returns `{ error: ErrorBody }` with its typed code and HTTP status (400, 403, 404, 409, 422, 429), never a stack trace.
- [ ] **BMad traceability.** `sprint-status.yaml` reflects the real state.
- [ ] **AI governance.** The decision log records prompts, outputs and Martín's decisions.

---

## 7. Evaluation Rubric (100 points)

The four levels are the default statement's. "3 stories" reads as "the 43 Impl-1 stories".

| Dimension | Weight | Outstanding (90–100 %) | Competent (75–89 %) | Developing (60–74 %) | Beginning (< 60 %) |
|---|---|---|---|---|---|
| 1. Architecture & Scaffolding | 20 % | Clear Ports & Adapters per module, with dependency injection through ports, modular validated settings, automated migrations from the DDL, and the domain kept free of the framework | Clear structure with minor leakage across layers (for example, logic inside a router); good configuration and setup instructions | Monolithic organization; framework objects tightly coupled to business models; hard to run locally without troubleshooting | Non-runnable project; chaotic folders; missing dependencies or broken start-up |
| 2. Functional Code Delivery (43 stories) | 25 % | Every story implemented, running and verified; business logic solves the module problem; invariants strictly upheld; zero placeholder stubs in Impl-1 scope | Every story implemented; minor edge conditions unhandled (for example, a missing typed error body); core flows work | Some stories not functional, or relying on in-memory hardcoding where Postgres is required | Incomplete code; procedures crash; core business rules not implemented |
| 3. Automated Testing & Verification | 20 % | Unit and integration tests mapped to the Gherkin; fast and deterministic; they assert domain invariants and failure states | Every story has passing happy-path tests; minor gaps in edge-case or error-response testing | Minimal tests (for example, one per story); assertions only on a 200 without checking the body | No tests, a broken suite, or tests that pass vacuously |
| 4. BMad Full Ceremony & Governance | 20 % | Six-step ceremony evidenced per story; `sprint-status.yaml` clean and accurate; the decision log documents ≥ 2 critical corrections of AI code | Build sequence followed; `sprint-status.yaml` maintained; the log records prompts with basic review notes | Superficial ceremony; `sprint-status.yaml` updated as an afterthought; the log lacks critical analysis of AI outputs | No evidence of the BMad workflow; uncontrolled AI copy-paste without an audit trail |
| 5. Code Craft, Cleanliness & Docs | 15 % | Idiomatic strict TypeScript with typed interfaces and zod schemas; informative logging; no dead code; a crisp README and walkthrough | Clean, readable code with minor lint or typing oversights; a clear README with reproducible setup | Inconsistent naming, missing types, sparse documentation or a cluttered repository | Spaghetti or unformatted code; missing README; no comments or explanation |

---

## Appendix A — Adaptation Map

| Element | Default statement | This statement |
|---|---|---|
| System | Academic AI Compute Fabric, one module per triad | TEZG, all 12 modules |
| Scope | Scaffold + 3 recommended core stories (Annex) | Delivered: scaffold + foundation 1.1–1.3 + Identity 2.1–2.3 (#22). Planned: 43 stories from the certified `epics.md` (Appendix B) |
| Annex stories | Per-module user stories with REST endpoints | The Solu-2 story entries: Gherkin, contract bindings, DoD, ATDD path |
| Hardware agnosticism | Simulated GPUs, telemetry, drivers | Simulated catalog feed, TRM, object storage, malware scanner, top-up provider, event bus, clock |
| Fleet fixtures | 32 compute nodes | `seed_marketplace`: 10,000 catalog entries, 300 users, 1,500 listings, 4 cities, ~200 orders, ~50 trades, a USD/COP fixture rate |
| Endpoints | `POST /api/v1/...` REST | tRPC 11 procedures: `GET /api/trpc/{path}?input=` and `POST /api/trpc/{path}` (R-9) |
| Error payload | Structured JSON | `{ error: ErrorBody }`, `ErrorBody = { code, httpStatus, decision, issues? }` |
| Stack | Python/FastAPI + Pydantic, or Node/Express + Zod; SQLAlchemy/Prisma; Pytest/Vitest | The Solu-2 Stack Decisions (§1); zod for procedure inputs |
| Zero cross-team blocking | Each subsystem runs alone | One repository; modules talk only through in-process ports and the outbox (AD-SYS-2), so no external service has to be deployed |
| Cycle "plan, prepare (DoR), test design, …" | Named, not detailed | §3: DoR checklist; test design inherited from Solu-2 and extended per story |
| Dependency validation | Part of the scaffold | `gate:deps` (§4.2) |
| `bmad-build` | One skill | `bmad-create-story` → `bmad-dev-story` → `bmad-code-review` |
| Status `ready-for-review` | — | `review` |
| Linter | flake8/ruff or eslint | ESLint |
| Deployment | `docker-compose up` | Local only; no Vercel or Supabase deployment in Impl-1 (decision log #4) |

## Appendix B — Scope

### B.0 The delivery cut (decision log #22)

| Story | Module | Kind | Role in the delivery |
|---|---|---|---|
| 1.1 | SYS | Skeleton | Foundation: one typed, explained error body |
| 1.2 | SYS | Skeleton | Foundation: audit trail and redaction at every egress |
| 1.3 | SYS | Skeleton | Foundation: outbox delivery, exactly once in effect |
| 2.1 | IDN | Core | Core story 1: complete the individual-seller profile |
| 2.2 | IDN | MEC | Core story 2: exactly one seller track wins a race |
| 2.3 | IDN | Failure-state | Core story 3: explain why an account may not list |

The other 37 stories of B.1 continue after the delivery, in epic batches (§3).

### B.1 Impl-1: 43 stories

Dependency-closed: no Impl-1 story depends on an Impl-2 story. The last column says why each story is in: its kind, or the in-scope stories it is a prerequisite of.

| Story | Module | Kind | Title | Depends on | Why in Impl-1 |
|---|---|---|---|---|---|
| 1.1 | SYS | Skeleton | Refuse every request with one typed, explained error body | none | Skeleton |
| 1.2 | SYS | Skeleton | Record an audit trail and keep regulated data out of every egress | 1.1 | Skeleton |
| 1.3 | SYS | Skeleton | Deliver every committed event exactly once in effect | 1.2 | Skeleton |
| 1.4 | SYS | Skeleton | Keep time, sockets and module boundaries deterministic | 1.1 | Skeleton |
| 1.5 | SYS | Skeleton | Show admins the delivery and tick health | 1.3 | Skeleton |
| 2.1 | IDN | Core | Complete the individual-seller profile and claim the track | 1.1, 1.2 | Core |
| 2.2 | IDN | MEC | Let exactly one seller track win a race | 2.1 | MEC |
| 2.3 | IDN | Failure-state | Explain why an account may not list | 2.1 | Prerequisite of 2.5, 5.1, 8.1 |
| 2.5 | IDN | Supporting | Trace capabilities for admins and answer neighbours' identity queries | 2.3 | Prerequisite of 6.2, 9.2, 9.3, 13.1 |
| 3.1 | VER | Core | Submit a business application with its legal identity | 2.2, 1.2 | Core |
| 3.2 | VER | MEC | Decide an application exactly once | 3.1, 1.3 | MEC |
| 3.5 | VER | Supporting | Run the review queue, the rejection policy and payment instructions | 3.2 | Prerequisite of 7.1, 8.1, 9.2 |
| 4.1 | CAT | Core | Start and continue a catalog feed run | 1.2 | Core |
| 4.2 | CAT | MEC | Keep a card's id through renames and reprints | 4.1 | MEC |
| 4.4 | CAT | Failure-state | Never fabricate a price | 4.2 | Prerequisite of 6.3, 12.1 |
| 4.5 | CAT | Supporting | Browse the catalog and answer neighbours' catalog queries | 4.2 | Prerequisite of 5.1, 6.2, 11.2, 12.1 |
| 5.1 | INV | Core | List a card and share one stock pool | 2.3, 4.5 | Core |
| 5.2 | INV | MEC | Reserve stock in the caller's transaction and restore it on abort | 5.1 | MEC |
| 5.6 | INV | Supporting | Manage my listings, bundles and stock | 5.2 | Prerequisite of 10.1 |
| 6.1 | DSC | Failure-state | Refuse invalid search areas | 1.1 | Prerequisite of 6.2 |
| 6.2 | DSC | Core | Search listings by area with an explained ranking | 6.1, 5.1, 4.5, 2.5 | Core |
| 6.3 | DSC | MEC | Show a card's detail at the area boundaries | 6.2, 4.4 | MEC |
| 7.1 | ORD | Core | Buy a listing and attach the comprobante | 5.2, 3.5 | Core |
| 7.2 | ORD | MEC | Confirm paid and close orders safely in any order | 7.1, 1.3 | MEC |
| 7.5 | ORD | Supporting | Cancel, expire, read and support orders | 7.2 | Prerequisite of 13.1 |
| 8.1 | COM | Core | Open the commission account and request top-ups | 3.2, 1.3, 2.3, 3.5 | Core |
| 8.2 | COM | MEC | Charge each order exactly once | 8.1, 7.2 | MEC |
| 8.3 | COM | Core | Confirm or reject a top-up | 8.1 | Core |
| 9.1 | MSG | Core | Answer messaging eligibility from current verification | 3.2 | Core |
| 9.2 | MSG | MEC | Send messages while verification changes | 9.1, 2.5, 3.5 | MEC |
| 9.3 | MSG | MEC | Generate the contact handoff for every product name | 5.1, 2.5 | MEC |
| 10.1 | TRD | Core | Make, read and withdraw a trade offer | 5.6 | Core |
| 10.2 | TRD | Core | Counter an offer turn by turn | 10.1 | Core |
| 10.3 | TRD | MEC | Accept the last unit from two sessions | 10.2, 9.3 | MEC |
| 11.1 | COL | Core | Organize my collections | 1.2 | Core |
| 11.2 | COL | Core | Add catalog cards to a collection | 11.1, 4.5 | Core |
| 11.3 | COL | MEC | Turn a closed order into one prompt and one entry set | 11.2, 7.2 | MEC |
| 12.1 | VAL | Core | Value a collection exactly | 11.2, 4.5, 4.4 | Core |
| 12.2 | VAL | Core | Show the valuation trend and daily history | 12.1 | Core |
| 12.3 | VAL | MEC | Value 500 mixed entries with zero drift and a zero baseline | 12.2 | MEC |
| 13.1 | REP | Core | Write, edit and check eligibility for a review | 7.5, 2.5 | Core |
| 13.2 | REP | Core | Hide and unhide reviews with logged snapshots | 13.1 | Core |
| 13.3 | REP | MEC | Keep reputation honest: paid is not enough, and a racing hide never skews the aggregate | 13.2 | MEC |

Totals: 5 Skeleton, 17 Core, 13 MEC, 8 prerequisites (3 Failure-state, 5 Supporting).

### B.2 Impl-2: the remaining 26 stories

The rest of the Failure-state and Supporting stories. This matches what the default statement leaves to Impl-2 (failure recovery and advanced testing). Every dependency they have is in Impl-1 or earlier in this list.

| Story | Module | Kind | Title | Depends on |
|---|---|---|---|---|
| 2.4 | IDN | Failure-state | Refuse unverified buyers and throttle failed sign-ins | 1.1 |
| 3.3 | VER | Failure-state | Refuse incomplete, unsafe and premature applications | 3.2 |
| 3.4 | VER | Failure-state | Guard and audit every legal-identity read | 3.1 |
| 4.3 | CAT | Failure-state | Refuse a second live run and quarantine changed kinds | 4.2 |
| 5.3 | INV | Failure-state | Refuse invalid listings | 5.1 |
| 5.4 | INV | Failure-state | Refuse unpurchasable and over-quantity reservations | 5.2 |
| 5.5 | INV | Supporting | Pause, withdraw and restore listings from commission and verification events | 5.1, 3.2 |
| 6.4 | DSC | Failure-state | Explain excluded listings, too-broad filters and unknown cards | 6.3 |
| 7.3 | ORD | Failure-state | Refuse self-purchase, open-order overflow and listing refusals | 7.1 |
| 7.4 | ORD | Failure-state | Refuse out-of-role, repeated and expired confirmations | 7.2 |
| 8.4 | COM | Failure-state | Refuse invalid top-ups and decided requests | 8.3 |
| 8.5 | COM | Failure-state | Reconcile ledgers and report, never repair, discrepancies | 8.2 |
| 8.6 | COM | Supporting | Set commission rates and read the ledger | 8.2 |
| 9.4 | MSG | Failure-state | Refuse outsiders and businesses that initiate | 9.2 |
| 9.5 | MSG | Failure-state | Refuse hidden or business listings and rate-limit contact | 9.3 |
| 9.6 | MSG | Supporting | Read the inbox, mark threads read and mute | 9.2 |
| 10.4 | TRD | Failure-state | Refuse stale, out-of-turn and duplicate offer actions | 10.3 |
| 10.5 | TRD | Failure-state | Cancel, complete and expire trades exactly once | 10.3 |
| 11.4 | COL | Failure-state | Refuse foreign, resolved and invalid collection actions | 11.3 |
| 11.5 | COL | Supporting | Use the binder, add external cards, move entries and wishlist cards | 11.2, 5.6 |
| 11.6 | COL | Failure-state | Refuse unsafe links, foreign entries and unknown wishlist cards | 11.5 |
| 12.4 | VAL | Failure-state | Refuse foreign collections and invalid periods | 12.2 |
| 12.5 | VAL | Failure-state | Explain empty series and rounding edges | 12.2 |
| 13.4 | REP | Failure-state | Refuse self, unknown and duplicate reviews | 13.1 |
| 13.5 | REP | Supporting | Read profiles, search moderation logs and hide listings | 13.2, 5.1 |
| 13.6 | REP | Failure-state | Refuse invalid moderation and bad aggregate requests | 13.5 |

### B.3 After Impl-2: the front end

The 43 Plan-2 pages (DESIGN.md, EXPERIENCE.md, `ui-states.json`) are a phase of their own after Impl-2, whether or not the course asks for one (decision log #3). Pages show the error states too, so building them before Impl-2's refusals exist would mean rebuilding them.
