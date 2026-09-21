# Plan-2: Task Statement

## AI-Assisted Product Planning for TEZG — Pokémon TCG Marketplace and Collection Management Platform

**Course Activity:** pairs (4–6 hours) · **AI-Assisted (BMad & WDS Workflows)**

**Deliverable:** Complete Module Planning Package (PRD, UX Design, Architecture, Readiness Gate, and AI Decision Log).

> This is the Plan-2 course statement adapted from its default case study (the *Academic AI Compute Fabric*) to **TEZG**, the project this repository plans. Activities, phases, deliverables, constraints and grading rubric are unchanged in intent; only the domain, the reference material, the module Annex and the tool paths are TEZG-specific. Appendix A maps every default-to-TEZG substitution.

---

## 1. Executive Summary & Project Framing

### The Shared Scenario: TEZG

Colombian Pokémon TCG collectors, buyers, individual sellers and small businesses stitch together eBay, PriceCharting and Collectr by hand for every purchase, absorbing months-long international shipping and import fees of up to ~20% of card value. The only local alternative is informal WhatsApp/Telegram groups with no search and no structure.

**TEZG** ("TCG, but EZ") is a **collection tracker with a local marketplace attached**: one COP-priced view of catalog, price, listings and a collector's own collection, growing into a place to buy, sell and trade directly with other Colombian collectors. Its fixed design parameters are Colombia-only scope, the collection tracker, the virtual binder and the trading system.

The platform is designed as a **modular monolith** (one deployable, hexagonal modules, in-process domain events). Nine domain modules — `catalog`, `listings`, `trading`, `orders`, `commission`, `collections`, `reviews`, `messaging`, `identity` — sit on a `shared-kernel` (ids, money, `DomainError` enum, event bus). In the intended stack, Next.js exposes typed tRPC procedures over Prisma/PostgreSQL. The platform never holds funds: business purchases settle **peer-to-peer** and are confirmed by an uploaded *comprobante* plus mutual confirmation. Businesses pay commission from a **prepaid balance**. Individual-seller sales complete **off-platform**.

The whole-system planning already exists (`SPEC.md` CAP-1..28, `ARCHITECTURE-SPINE.md` AD-1..13) and the Plan-1 Buyer and Seller/Business tracks extend it (AD-14..19). **Plan-2 goes one level deeper:** each pair takes **one subsystem module** and plans it to implementation-ready depth — state machines, formulas, concurrency rules, error models — which the product-level Plan-1 PRDs deliberately did not.

Each student pair works exclusively on **ONE standalone subsystem module** (assigned from the Annex). Your project must operate completely independently, using local fixtures, seed data, mock adapters, fake neighbouring modules or a simulated clock.

### What You DO NOT Need to Do

- You do not need to integrate with another team's module code.
- You do not need to share a database or coordinate distributed migrations.
- You do not need to negotiate cross-team API contracts for this task.
- You do not need to build or deploy the full TEZG application (Next.js UI, Better Auth, Supabase, Vercel).
- You do not need to participate in a monolithic, multi-module joint demo.
- You must **not** build a payment gateway or any funds-holding flow — that is a rejected design, not a deferred feature (see §5, Constraint 8).

### What You MUST Prove

- Your assigned subsystem is **semantically coherent, mathematically sound, defensively specified, and independently testable.**
- You can direct the AI council (BMad + WDS) — specialised personas — to transform raw intent into correct engineering specifications.
- **Verifiable evidence** that human engineering judgment directed and audited every AI-generated decision.

---

## 2. Case Study Sources & Baseline References

Review the following materials before starting Phase 1. Paths are relative to the repository root.

| Source Document | Core Content & System Context |
| --- | --- |
| `_bmad-output/A-Product-Brief/project-brief.md` | Mission, positioning ("collection tracker with a marketplace attached"), business model, payments/trust/trading mechanics, constraints, tone of voice. *(Replaces the university platform brief.)* |
| `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` (+ `companion-files/`, `stakeholders.md`) | Canonical capability contract: **CAP-1..28**, constraints, non-goals, success signals, risky/safe assumptions. Every FR you write must trace to a CAP. |
| `_bmad-output/specs/spec-pokemon-tcg-marketplace/ARCHITECTURE-SPINE.md` | Adopted whole-system invariants **AD-1..13**: module dependency graph, table ownership, event rules, inventory ownership, `DomainError` ownership, moderation. |
| `_bmad-output/project-context.md` | Implementation rules distilled from the ADs (money, ids, dates, error handling, anti-patterns). |
| `docs/plan-1-buyer-track/` and `docs/plan-1-seller-track/` | Finalised Plan-1 packages: PRDs, `DESIGN.md` ("Trusted Ledger" identity), `EXPERIENCE.md`, scenarios, `ARCHITECTURE.md` (AD-14..19), review reports, readiness reports, decision logs. **Reference and format precedent — not deliverables to redo.** |
| `docs/peer-review-remediation.md` | What went wrong in an earlier spec (elastic language, non-atomic capabilities, unverifiable claims) and how it was fixed. Read it before writing NFRs. |
| Reference Seed Profile *(below)* | Course-scale fixture volumes and actors. |
| Technology Baseline *(below)* | How a module must be runnable standalone. |
| BMad & WDS Skill Guides | Personas: Product (`bmad-agent-pm`, John) · UX (`bmad-agent-ux-designer`, Sally / `wds-agent-freya-ux`, Freya) · Architecture (`bmad-agent-architect`, Winston) · Testing (`bmad-tea`, Murat) · Review (`bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`). |

### Reference Seed Profile

TEZG has no production data and the brief deliberately sets no hard numbers, so these are **proposed exercise defaults** consistent with SPEC.md's "a few thousand to tens of thousands of catalog entries" scale. A module may scale them up or down but **must state its own seed size in the PRD**.

| Dimension | Default seed |
| --- | --- |
| Catalog | 10,000 `CatalogEntry` rows across ~50 sets (fixture — no real Pokémon TCG API). |
| Accounts | 300 users: 60 individual sellers with a completed profile step; 12 business accounts (8 Approved, 3 Pending, 1 Rejected); 3 admins. Buyer and individual-seller roles coexist on one account. |
| Listings | 1,500: ~1,000 individual-seller and ~500 business, including bundles and sealed products. |
| Locations | Coordinates spread over four Colombian cities (Bogotá, Medellín, Cali, Barranquilla). |
| Orders / trades | ~200 historical business orders in mixed confirmation states; ~50 trade offers in mixed states. |
| Prices | Reference prices as USD/COP pairs plus a fixture FX rate with an as-of date. |
| Time | An **injectable virtual clock**. Timestamps stored UTC; rendered in `America/Bogota` only at the presentation layer. |

### Technology Baseline

- **Runtime:** Linux, Docker Compose (or a clean local virtual environment).
- **Language:** **TypeScript (Node)**, matching the project's planned stack (`project-context.md`). Choosing another language is allowed only through a logged, justified decision.
- **Persistence:** **PostgreSQL via Docker Compose is required** for any module whose invariants depend on row-level concurrency semantics (atomic conditional `UPDATE`, interactive transactions): M1, M4, M6, M7, M8. Other modules may use SQLite or in-memory stores.
- **Module shape:** the module exposes a **public application-service interface** (AD-1) that could drop into the monolith. Its neighbours are replaced by **fakes of their public interfaces**, never by their internals.
- **Simulated externals:** fixture price/catalog feed, fake object storage (comprobante and `legalIdentity` files), fake event bus/publisher, virtual clock, no real messaging app.
- **Dev surfaces:** the Annex names a prototype per module; where relevant, an OpenAPI/Swagger explorer, a CLI dashboard, or a simulator with fault/time controls.

---

## 3. Learning Objectives

By completing Plan-2, your team will be able to:

1. **Extract & Scope a Module PRD:** isolate the functional capabilities, business rules and strict operational constraints of one subsystem from the TEZG narrative and SPEC without scope creep.
2. **Design Grounded UX Journeys:** craft concrete, multi-state interface specifications with **named TEZG protagonists** (collectors, individual sellers, verified businesses, admins) using WDS workflows.
3. **Establish Inviolable Architectural Invariants (AD-n):** formulate durable technical rules with strict *Status, Binds, Prevents, Rule* and *Trade-off* clauses that prevent silent system decay.
4. **Enforce Pre-Implementation Quality Gates:** subject specifications to multi-lens adversarial review to compile an unambiguous readiness sign-off.
5. **Practice Disciplined AI Governance:** command AI agents as subordinate technical specialists, systematically recording prompts, rejecting invalid outputs, and proving human-in-the-loop validation.

---

## 4. Standard AI-Assisted Workflow

All groups must follow this specification-first sequence:

`[1. Understand & Scope]` ➔ `[2. PRD Specification]` ➔ `[3. UX Scenarios & Surfaces]` ➔ `[4. System Architecture]` ➔ `[5. Readiness Gate]`

Step 1 is performed at the start of Phase 1; steps 2–5 map to Phases 1–4 below.

1. **Understand Before Prompting:** analyse your assigned module in the Annex *and* the CAPs and ADs it anchors to. Identify boundary ambiguities, document explicit assumptions, and list non-goals.
2. **Write the Specification Before Code:** define user journeys, measurable NFRs, state machines, domain policies and error models prior to any implementation task.
3. **Design Before Execution:** challenge the AI to present **2–3 architectural alternatives**, critically evaluate trade-offs, select the optimal design, and justify your choice.
4. **Validate Adversarially:** never trust AI outputs by default. Run adversarial and edge-case review lenses to surface race conditions, security flaws and untestable claims.
5. **Maintain an Audit Trail:** document key prompts, agent iterations, and **at least three instances** where your team **rejected, corrected, or substantially improved** an AI recommendation.

---

## 5. Common Constraints Across All 12 Modules

To ensure fair assessment and technical comparability across disparate challenges, all modules share these non-negotiable constraints:

1. **Independent Executability:** the subsystem must be runnable as a standalone unit using Docker Compose or a clean local virtual environment.
2. **External-Dependency Agnosticism:** no real third-party service is required. Systems must accept seed fixtures, a fixture catalog/price feed, a fixture FX rate, fake object storage, fake neighbouring modules, and a virtual clock. *(Replaces "Hardware Agnosticism".)*
3. **Non-Trivial Decision Logic:** the solution cannot be a simple CRUD wrapper. It must implement an explicit algorithm, policy evaluation, optimisation/ranking planner, or state machine. The Annex names the logic each module must own.
4. **Algorithmic Explainability:** every automated decision — a rejection, a gate, a pause, a hide, a price-provenance choice, a placement of a result — must produce a **human-readable, cited justification**: it names the rule (CAP-n, AD-n, or a named policy clause) and the input values that triggered it. Messages follow the brief's tone of voice: plain, specific, never "Operation failed". Define the decision shape once in `ARCHITECTURE.md` (for example `{ outcome, reasonCode, humanMessage, citations[] }`).
5. **Mandatory Non-Happy Paths:** specifications and prototypes must design for **at least two failure states** (for example insufficient quantity, comprobante missing, balance exhausted, subscriber failure, external feed outage, concurrent-write conflict, hidden-content leak attempt).
6. **Defensive Contract Format:** all architectural decisions must adhere strictly to the BMad Architectural Invariant (**AD-n**) format (Phase 3).
7. **Traceability & AI Audit Log:** the submission must include an **AI Decision Log** with documented prompts, including rejected AI proposals.
8. **Inherited Project Invariants (new for TEZG):** these come from the adopted architecture and are non-negotiable. A module may refine them but must never contradict them. Any deviation requires an explicit, logged decision **and** a stated reason.
   - **No payment gateway, no funds-held state, no escrow.** Settlement is peer-to-peer; "completed purchase" means `buyerItemReceivedConfirmedAt IS NOT NULL` (AD-2). Commission is a prepaid-balance deduction, never a post-hoc invoice.
   - **Module boundaries are real (AD-1, AD-8):** you may call a neighbour's public application-service interface only; a module's tables are written only by its own repository; no cross-module raw joins.
   - **Cross-module writes are exactly one of two patterns (AD-6, AD-9, AD-10):** a synchronous command inside the caller's transaction (correctness-critical only), or a post-commit in-process domain event with a self-contained snapshot payload; a subscriber failure is caught and logged, never rolled back into the publisher.
   - **Money is integer COP** (no decimals) for all listing and transaction amounts; USD/COP reference-price pairs are a *distinct* value object and are never merged or coerced with COP.
   - **Dates are stored UTC ISO 8601,** converted to `America/Bogota` only at presentation. IDs are `cuid2` strings.
   - **Errors are `DomainError` codes:** `PascalCase`, exactly one owning module per code; a module that detects another module's condition propagates the error unchanged (AD-11).
   - **Moderation visibility (AD-12):** default reads of `Listing`/`Review` filter `hiddenAt IS NULL`.
   - **Colombia-only:** COP, Colombian coordinates, and Ley 1581 (habeas data) treatment for regulated personal data (AD-13).
9. **CAP Traceability & ID Prefixing (new for TEZG):** every FR cites the CAP(s) it realises (`SPEC.md`), and each of your four scenarios traces to one or more FRs. Because teams work independently, **IDs carry your module code** — `FR-<CODE>-n`, `NFR-<CODE>-n`, `AD-<CODE>-n` (codes are in the Annex) — so nothing collides with the adopted baseline (AD-1..19 already occupy the plain numbers) or with another team's numbering. Baseline ADs are **inherited by reference**: your `AD-<CODE>-n` must add a rule the baseline does not already state, citing the baseline AD it refines where one exists.

---

## Detailed Phase-by-Phase Instructions

All paths below are relative to `docs/plan-2/<module-slug>/` (for example `docs/plan-2/listing-inventory-engine/`). Skill names are the ones installed in this repository.

### Phase 1 — PRD & Capability Scoping (60–75 min)

#### Goal

Produce a comprehensive `prd.md` scoped strictly to your assigned module. The document must define user value, functional requirements (FRs), non-functional requirements (NFRs) with explicit numeric metrics, and system boundaries.

#### Instructions

1. Activate `bmad-prd` (or converse with **John**, `bmad-agent-pm`).
2. Provide the project brief (`project-brief.md`), `SPEC.md`, `ARCHITECTURE-SPINE.md`, `project-context.md`, and **your module profile from the Annex**.
3. **Establish module boundaries.** Specify what your module **owns** (tables, aggregates, events it publishes, `DomainError` codes it throws) and what it **mocks/delegates** (neighbour modules via fakes of their public interfaces, external feeds, storage, clock). Declare out-of-scope capabilities explicitly, including Plan-1 territory you do not restate.
4. **Define named TEZG protagonists.** Avoid generic "the user". Use the Annex protagonists (for example *Valentina, Individual Seller & Collector*; *Andrés, Verified Business owner*; *Sebastián, Platform Admin*). Introduce new named personas only where the module needs them.
5. **Formulate Functional Requirements (FRs).** For each capability define:
   - System responsibility (what the system guarantees).
   - Exact trigger, inputs, validation rules and outputs.
   - A measurable, testable condition, plus the CAP(s) it traces to.
6. **Formulate Non-Functional Requirements (NFRs)** with numbers and explicit tolerances. Examples: *"Catalog filter queries return within 2 s at p95 over a 10,000-entry seed"*; *"Under 50 concurrent `reserveInventory` calls for the last unit, exactly one succeeds and 49 receive the same explainable rejection"*; *"Zero occurrences of a comprobante URL or `legalIdentity` value in debug logs"*. Elastic words ("fast", "secure", "appropriately") are defects.
7. **Review Gate.** Run the adversarial review:
   ```
   /bmad-review-adversarial-general docs/plan-2/<module-slug>/planning/prd.md
   ```
   *(This is the "`bmad-review --lens adversarial`" of the default statement; the installed skill is `bmad-review-adversarial-general`.)*
   Triage **every** finding: **Accept** (fix in PRD), **Defer** (post-V1), or **Reject** (document why the AI critique is invalid).

#### Deliverables — Phase 1

- `planning/prd.md` (complete, scoped to your module)
- `reviews/review-prd-adversarial.md` (review report with triaged responses)
- Phase 1 entries in your AI Decision Log

---

### Phase 2 — UX Design, Scenarios & Surfaces (60–75 min)

#### Goal

Produce the visual design spine (`DESIGN.md`), the behavioural experience spine (`EXPERIENCE.md`), **4 structured user-scenario outlines**, and detailed page/surface specifications for your standalone prototype.

#### Part A — Design & Experience Spines with `bmad-ux`

1. Activate `bmad-ux` (or converse with **Sally**, `bmad-agent-ux-designer`, or **Freya**, `wds-agent-freya-ux`).
2. **Declare target form factors and interfaces.** TEZG's brief fixes *responsive web, equal priority for desktop/tablet/mobile*, with no native app, no offline mode and no native-device features. Choose per **task shape**, not per persona:
   - **Collector-/buyer-facing modules** (browse, discovery, collections, valuation, reviews, contact): responsive web, clear action states, friction-free forms.
   - **Admin / back-office surfaces** (verification queue, ledger, moderation, order confirmation for a business): desktop-first, data-dense.
   - **Headless / engine modules** (inventory engine, ledger, state-machine simulators): developer console, interactive API explorer (Swagger/OpenAPI) and CLI dashboard.
   - The Annex lists a default form factor per module; a per-page override is allowed as a logged decision (Plan-1 resolved its seller-track device split the same way).
3. **Author `DESIGN.md`:** colour tokens, typography, hierarchy and status colour states. **Extend the existing "Trusted Ledger" identity** (`docs/plan-1-buyer-track/DESIGN.md`) — TEZG is one app, not many. Map your module's states onto its muted semantic tokens (`status-pending`, `status-confirmed`, `status-error`, plus neutrals for paused/hidden/inert) rather than the default statement's traffic-light greens/blues. Introduce a new token only through a logged decision.
4. **Author `EXPERIENCE.md`:** **Loading, Empty, Error and Success** states; **explainability banners** for denied, paused, hidden or deferred actions (the equivalent of the default statement's "denied/deferred" banners); accessibility to **WCAG 2.1 AA**; UI microcopy per the brief's tone of voice (plain, specific, Colombian-first; COP formatting; `America/Bogota` time).

#### Part B — Scenarios & Page Specs with `wds-3-scenarios` & `wds-4-ux-design`

1. Run `wds-3-scenarios` to structure the **4 primary scenario outlines** required for your module (see Annex).
2. For each scenario run the design loop in `wds-4-ux-design`:
   - **[C] Conceptualise:** layout wireframes and key screen elements.
   - **[P] Write Specifications:** detailed component specs, spacing, button triggers and dynamic feedback.
   - **[V] Validate:** ensure every error state, rejection banner and edge condition is visually addressed.
3. Produce **at least two key-screen wireframes/mocks** (ASCII diagram, Mermaid UI layout, or SVG/PNG asset).
4. **Review Gate.** Run the edge-case review across UX artifacts:
   ```
   /bmad-review-edge-case-hunter docs/plan-2/<module-slug>/ux/
   ```
   *(The default statement's "`--lens edge-case-hunter`".)* Triage every finding as Accept / Defer / Reject.

#### Deliverables — Phase 2

- `ux/DESIGN.md` and `ux/EXPERIENCE.md`
- `ux/C-UX-Scenarios/00-ux-scenarios.md` + 4 scenario outline files
- Per-page specifications for all core surfaces
- Key-screen wireframes / UI mockups (`ux/wireframes/`)
- `reviews/review-ux-edge-cases.md` with triaged decisions

---

### Phase 3 — Technical Architecture & Invariants (60–80 min)

#### Goal

Produce `ARCHITECTURE.md` establishing the internal components, data schemas, integration points and **machine-enforceable Architectural Invariants (AD-n)**.

#### Instructions

1. Activate `bmad-architecture` (or converse with **Winston**, `bmad-agent-architect`).
2. Provide `prd.md`, `EXPERIENCE.md`, the adopted baseline (`ARCHITECTURE-SPINE.md`, `project-context.md`), and your standalone/mock constraints (§2 Technology Baseline).
3. **Define the core architecture:**
   - **Component Topology:** your module's hexagonal shape (domain core, application service, tRPC/HTTP adapter, persistence adapter) and its external boundaries — neighbour modules as fakes, event-bus adapter, storage adapter, external feed adapter, clock.
   - **Data Model & Schemas:** high-level entities and context (tables you own, keys, ownership per AD-8).
   - **API / Event Contracts:** high-level procedures/routes and the domain events you publish or subscribe to, with **self-contained snapshot payloads** (AD-9). Add a **DomainError additions** table for the codes you throw (PascalCase, one owner).
   - **Mermaid Architecture Diagrams:** at minimum a **Context Diagram** and one **High-Level Component Interaction Diagram** illustrating the core non-trivial algorithm or state machine.
   - **Alternatives:** record the **2–3 architectural alternatives** you asked the AI for, and why you chose yours (§4 step 3).
4. **Review and refine Architectural Invariants (`AD-<CODE>-n`).** Every invariant must adhere to the mandatory 5-part structure:
   - **Status:** `[ADOPTED]`
   - **Binds:** specific submodules, routers, database models, or workers (and the FRs/CAPs it protects).
   - **Prevents:** the exact architectural bug, race condition, data corruption, or unauthorised leak permanently blocked.
   - **Rule:** a precise technical rule written with **ZERO elastic words** (no "efficiently", "appropriately", "securely"). It must be checkable by an automated test, a lint rule, or a SQL/constraint.
   - **Trade-off:** what is explicitly sacrificed, deferred or limited to guarantee this invariant.

   The repository's optional extended clauses (Context & Problem, Decision Taken, Rejected Alternatives) may be added beneath the five mandatory ones. *Recommended:* ask **Murat** (`bmad-tea`) whether each Rule can be turned into a deterministic test — that is your evidence for "independently testable".
5. **Review Gate.** Run both reviews:
   ```
   /bmad-review-adversarial-general docs/plan-2/<module-slug>/planning/ARCHITECTURE.md
   /bmad-review-edge-case-hunter    docs/plan-2/<module-slug>/planning/ARCHITECTURE.md
   ```
   Triage every finding.

#### Deliverables — Phase 3

- `planning/ARCHITECTURE.md` (complete, with 6–8 `AD-<CODE>-n` invariants)
- Mermaid diagrams (Context and Component Interaction) inside `ARCHITECTURE.md`
- `reviews/review-arch-adversarial.md` and `reviews/review-arch-edge-cases.md` with documented triage

---

### Phase 4 — Implementation Readiness Gate Check (20–30 min)

#### Goal

Execute the formal pre-implementation quality gate to verify that all planning artifacts are **100% aligned, self-consistent, and free of blocking contradictions** before coding begins.

#### Instructions

1. Activate `bmad-check-implementation-readiness`.
2. Provide all four finalised artifact sets: `prd.md`, `DESIGN.md` + `EXPERIENCE.md`, the scenario and page specs, and `ARCHITECTURE.md`.
3. **Before running this check, ensure all review findings from Phases 1, 2 and 3 have been triaged** — the readiness check will flag untriaged findings as blockers.
4. **Evaluate the Gate Status:**
   - **PASS:** specifications certified 100% complete and consistent.
   - **CONCERNS:** minor non-blocking gaps; proceed only with documented mitigation.
   - **FAIL:** critical collision detected; must refactor the conflicting clauses before sign-off.
5. Capture the terminal readiness audit report and complete the sign-off block.

Epics and stories are **outside this exercise's deliverable scope** (as in Plan-1); the check's "missing epics" finding is recorded as *not applicable*, not as a blocker.

#### Deliverables — Phase 4

- `planning/readiness-gate-report.md` (full terminal output, blocker resolution log, and formal sign-off)

---

## 6. Submission Package Checklist

Your team repository should contain the following standardised structure under `docs/plan-2/<module-slug>/`:

```
docs/plan-2/<module-slug>/
├── planning/
│   ├── prd.md                       # Final Scoped PRD
│   ├── ARCHITECTURE.md              # Technical Architecture & AD-<CODE>-1..n
│   └── readiness-gate-report.md     # Readiness Audit Output (PASS sign-off)
├── ux/
│   ├── DESIGN.md                    # Visual Identity & Design Tokens (extends Trusted Ledger)
│   ├── EXPERIENCE.md                # Behavioral Spine & State Machine
│   ├── C-UX-Scenarios/
│   │   ├── 00-ux-scenarios.md       # Scenarios Index & Coverage Matrix
│   │   ├── scenario-1.md            # Scenario 1 Outline & Page Spec
│   │   ├── scenario-2.md            # Scenario 2 Outline & Page Spec
│   │   ├── scenario-3.md            # Scenario 3 Outline & Page Spec
│   │   └── scenario-4.md            # Scenario 4 Outline & Page Spec
│   └── wireframes/                  # Key screen mocks / UI diagrams
├── reviews/
│   ├── review-prd-adversarial.md    # Triaged PRD Adversarial Review
│   ├── review-ux-edge-cases.md      # Triaged UX Edge Cases Review
│   ├── review-arch-adversarial.md   # Triaged Architecture Adversarial Review
│   └── review-arch-edge-cases.md    # Triaged Architecture Edge Cases Review
└── ai-log/
    └── decision-log.md              # AI Prompts, Decisions & Rejected Proposals
```

### AI Decision Log Requirements (`decision-log.md`)

1. **Significant Entries:** document moments where human judgment directed, corrected or constrained the AI. Each entry records the **decision**, the **alternatives considered**, and the **rationale** (the format the Plan-1 logs use), plus the key prompt or an excerpt of it and the persona/skill that produced the proposal.
2. **Rejected AI Proposals:** specifically highlight **at least three** suggestions generated by the AI that your team **rejected, corrected, or substantially improved**, explaining your technical rationale. Tag each `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

---

## 7. Assessment & Grading Rubric

| Criterion | Weight | Outstanding (4) | Proficient (3) | Developing (2) | Beginning (1) |
| --- | --- | --- | --- | --- | --- |
| **Problem Scoping & PRD Rigor** | 20% | Scoped strictly to module boundaries; all 4 scenarios traced to FRs and every FR to a CAP; NFRs testable with explicit numbers; named TEZG protagonists throughout; zero vague elastic language. | Scoped to module; minor NFR metric omissions; 3–4 scenarios traced; protagonists present but occasional generic terms. | Scope leaks into other modules; several untestable NFRs; abstract user roles ("the user"); vague requirements. | PRD is a generic copy of the brief/SPEC; untestable; missing functional depth. |
| **UX Design & Scenario Quality** | 20% | `DESIGN.md` and `EXPERIENCE.md` complete; all 4 screen states (Loading/Empty/Error/Success) specified; explainability for rejections/pauses/hides designed; clear wireframes; WCAG accessibility addressed; extends Trusted Ledger coherently. | Both spines present; minor state omissions (e.g., missing empty state); wireframes present; solid UX flow. | One spine thin or missing; wireframes unclear; error states and explainability banners neglected. | Spines missing or generic; no screen specifications; purely abstract text. |
| **Architecture & Invariants (AD-n)** | 20% | 6–8 robust `AD-<CODE>-n` invariants with complete Status/Binds/Prevents/Rule/Trade-off; each Rule machine-checkable; security boundaries and data models explicit; valid Mermaid diagrams; explainability architecture clear; consistent with inherited AD-1..19. | 5–6 invariants; 1–2 have minor vague phrasing; data model and component diagrams present; solid technical reasoning. | No invariants or formulated as generic tips; diagrams missing or uninformative; data model incomplete; contradicts an inherited AD. | Invariants absent; architecture is an ungrounded high-level essay without technical contracts. |
| **Readiness Gate** | 10% | Implementation readiness check executed with verified PASS and clean triage. | Readiness check executed with minor unresolved concerns documented. | Readiness check reports unhandled failures. | Readiness check was never run or ignored. |
| **AI Governance & Decision Log** | 15% | More than 7 detailed entries demonstrating proactive human leadership; several documented AI rejections with deep technical reasoning; clear proof that human judgment guided every step. | 6–7 entries; documented AI rejections; good evidence of critical evaluation and oversight. | 4–5 entries; passive acceptance of most AI recommendations; weak rationale for accepted suggestions. | No documented entries; uncritical copy-paste of raw AI output; zero evidence of oversight. |
| **Adversarial Review & Triage** | 15% | All 4 specialised review reports executed; every single finding triaged with clear Accept/Defer/Reject justification; accepted findings visibly fixed in artifacts. | All reviews executed; most findings triaged with reasonable explanations; key blockers addressed. | Partial reviews run (2–3); superficial triage; several critical warnings left unaddressed. | Reviews omitted or findings ignored without triage. |

---

## Annex: The 12 Independent Engineering Modules

Each team is assigned **one** subsystem from the matrix below. Every module is a realistic, mission-critical component of TEZG's modular monolith. Each maps to one or more of the nine architecture modules (a few are cut from a larger module so that every one carries real decision logic).

**How to read a module entry**

- **Code** — the prefix for your `FR-`, `NFR-` and `AD-` IDs.
- **Anchors** — the SPEC capabilities you must trace to, and the adopted baseline ADs you inherit.
- **Owns / Mocks** — the boundary you must confirm and refine in the PRD.
- **Form factor** — the default from Phase 2 (`R` responsive web, `D` desktop-first back-office, `H` headless/developer console). Override per page only with a logged decision.

Protagonists marked *(new)* are introduced by this Annex on their first appearance (Camila, Sebastián, Julián); *Valentina* and *Andrés* already exist in the TEZG personas and Plan-1 tracks and are reused as they are.

| # | Module | Code | Tier | Core logic |
| --- | --- | --- | --- | --- |
| 1 | User, Role & Seller-Type Access Manager | `IDN` | Foundation | Derived capabilities + atomic exclusivity guard |
| 2 | Catalog & Price Reference Service | `CAT` | Foundation | Price provenance + feed ingestion/freshness policy |
| 3 | Marketplace Browse & Location Discovery Engine | `DSC` | Intermediate | Geodesic filter + ranking + derived flags |
| 4 | Listing & Shared Inventory Engine | `INV` | Advanced | Shared-pool reservation under concurrency |
| 5 | Business Verification Workflow | `VER` | Intermediate | Application state machine + regulated-data access policy |
| 6 | Order & Comprobante Confirmation State Machine | `ORD` | Advanced | Three-fact confirmation machine |
| 7 | Commission Ledger & Purchasability Engine | `COM` | Advanced | Atomic ledger + pause/resume events |
| 8 | Trade Offer Negotiation Engine | `TRD` | Advanced | Negotiation state machine + shared reservation |
| 9 | Collection, Binder & Wishlist Manager | `COL` | Intermediate | Tagged-union entries + layout/ordering + prompt idempotency |
| 10 | Collection Valuation & Trend Engine | `VAL` | Intermediate | Valuation math + trend formula + money-shape safety |
| 11 | Reviews, Reputation & Moderation Console | `REP` | Foundation | Purchase-gate policy + aggregate + visibility |
| 12 | Messaging & External Contact Handoff | `MSG` | Foundation | Eligibility policy + deterministic message rendering |

---

### Module 1: User, Role & Seller-Type Access Manager — `IDN`

- **Tier:** Foundation · **Form factor:** H (RBAC/capability API explorer) + D (admin account inspector)
- **Core Problem:** TEZG has no fixed role enum. What an account can do is *derived* from independent facts — buyer by default, `isIndividualSellerProfileComplete`, `businessId` or an open business application, `isAdmin` — and SPEC requires that a seller is exclusively an individual seller **or** a verified business. Every other module needs one trustworthy answer to "what can this account do right now, and why?", and that answer must survive concurrent, conflicting actions without hand-written role checks scattered across callers.
- **Named Protagonists:** *Valentina* (collector who buys and sells from one account); *Andrés* (shop owner starting a business application); *Sebastián* (Platform Admin, *new*).
- **Anchors:** CAP-19 (profile-step gate); inherited AD-16 (dual-role derived server-side), AD-18 (seller-type exclusivity), AD-11.
- **Owns / Mocks:** owns the account flag set and capability derivation; mocks the Better Auth session (a fixture session carrying `userId`), the business-application review (Module 5 stub) and the listing-creation caller.
- **4 Mandatory Scenarios:**
  1. **Dual-Role Derivation:** Valentina buys and lists from one account; the module derives *buyer + individual seller* from flags server-side, never from a client-asserted role.
  2. **First-Listing Profile Gate:** Valentina tries to create a listing before the profile step; it is rejected with `IndividualSellerProfileIncomplete` and a plain explanation; after completing the step it succeeds. A business account is exempt from this specific gate.
  3. **Seller-Type Exclusivity:** a user who completed the individual-seller profile tries to submit a business application (and vice versa); the second state-granting action is rejected outright with an explainable reason — no silent "graduation".
  4. **Capability Audit Query:** Sebastián asks "what can account X do, and why?" and receives a derived-capability trace citing the flags behind each capability.
- **Standalone Prototype:** RBAC/Capability API Explorer (OpenAPI) + Account State Inspector over mock identity fixtures.
- **Mandatory Edge Case:** two truly simultaneous requests for the same account — completing the individual-seller profile and submitting a business application — must result in **exactly one** succeeding, never both.

### Module 2: Catalog & Price Reference Service — `CAT`

- **Tier:** Foundation · **Form factor:** R
- **Core Problem:** a card must exist **once**, independently of any listing (CAP-2), and be browsable by set, era, Pokémon, colour, style and artist (CAP-1). Its card detail must show three distinct price values that never collapse into one number: listing price (COP), last-transaction price (a single USD/COP reference point) and historical trend (`period`, `changePercent`, `referencePriceAtStart`). Reference prices come from an **external feed** — never derived from platform volume — which can be down, stale or wrong.
- **Named Protagonists:** *Valentina* (release-driven collector sanity-checking a price); *Sebastián* (Platform Admin maintaining catalog integrity).
- **Anchors:** CAP-1 (attribute filters), CAP-2, CAP-3; inherited AD-7, AD-8, AD-11.
- **Owns / Mocks:** owns `CatalogEntry`, reference prices and trend values; mocks the external catalog/price feed (fixture adapter with fault switch) and the `listings` public query (listing price, `hasActiveListings`).
- **4 Mandatory Scenarios:**
  1. **Set-First Browse & Filter:** Valentina filters the catalog by set, artist and colour; results include entries with zero listings, marked `hasActiveListings=false`.
  2. **Three Distinct Prices:** the card detail renders listing price, last-transaction reference and trend delta as separately labelled values, each with provenance.
  3. **Feed Ingestion & Idempotent Upsert:** Sebastián ingests a 10,000-entry fixture feed; re-running it creates no duplicates and malformed rows are quarantined with a reason per row.
  4. **Stale or Unavailable Feed:** the feed is down or older than the freshness threshold; the detail view shows the last known reference with an explicit staleness label — never a blank, a fabricated number, or a merged value.
- **Standalone Prototype:** Catalog Browser + Price-Provenance Card Detail + Feed Ingestion Console with a fault injector.
- **Mandatory Edge Case:** a feed row whose external attributes change (renamed card, reprint, corrected artist) must update the existing entry **without changing its `catalogEntryId`** or orphaning listings and binder entries that reference it.

### Module 3: Marketplace Browse & Location Discovery Engine — `DSC`

- **Tier:** Intermediate · **Form factor:** R
- **Core Problem:** buyers need to find who is selling a card near them. One filter path (lat/lng/radius) must serve both seller types (AD-5); the pickup-versus-convenience distinction is a **derived** `pickupAvailable` flag (true only for individual sellers), never a second filter branch or stored column; hidden listings must never appear (AD-12). Distance must be mathematically correct and results ordered deterministically.
- **Named Protagonists:** *Camila* (casual buyer in Medellín looking for a local seller, *new*); *Valentina* (individual seller in Bogotá).
- **Anchors:** CAP-1 (location/distance), CAP-2; inherited AD-5, AD-12, AD-8.
- **Owns / Mocks:** owns the browse query, distance computation and ranking; mocks catalog entries (public query), seller type (`identity`), and the moderation `hiddenAt` flag.
- **4 Mandatory Scenarios:**
  1. **Radius Filter Across Seller Types:** Camila filters to listings within 15 km; one query path returns individual-seller and business listings together.
  2. **Pickup Semantics:** individual-seller results are marked as supporting in-person pickup; business results are not — computed on read, so a seller-type change is reflected immediately.
  3. **Deterministic Ranking:** results sort by distance then price with a stable tie-break; every row explains itself ("12.4 km away · pickup available").
  4. **Moderation Exclusion:** a listing hidden by an admin vanishes from browse at once while its record stays retained.
- **Standalone Prototype:** Discovery Console with location picker, result list/map, and a query-plan/explanation inspector.
- **Mandatory Edge Case:** a listing exactly on the radius boundary, a listing with missing or out-of-Colombia coordinates, and a catalog entry whose every listing is filtered out by location (it must still return with `hasActiveListings=false` and an empty listings array, never absent or errored).

### Module 4: Listing & Shared Inventory Engine — `INV`

- **Tier:** Advanced · **Form factor:** H (developer console + reservation race simulator)
- **Core Problem:** sellers publish cards, bundles and sealed products. A bundle's component card and the same seller's individual listing of that card share **one** `InventoryUnit` quantity, so a sale through either path decrements the same count. Sealed products are always listed individually and never bundle components. `reserveInventory` must atomically check-and-decrement **at reservation time** inside the caller's transaction, so concurrent buyers, and trades, can never oversell the last unit (AD-6).
- **Named Protagonists:** *Andrés* (verified business selling bundles and sealed boxes); *Valentina* (individual seller with one copy of a card listed twice).
- **Anchors:** CAP-4, CAP-16; inherited AD-6, AD-3, AD-4 (`openToTrade` ownership), AD-1, AD-8.
- **Owns / Mocks:** owns `Listing`, `Bundle`, `BundleComponent`, `InventoryUnit` and `reserveInventory`; mocks catalog entries, `identity` seller state, and the `commission` events (fixture publisher).
- **4 Mandatory Scenarios:**
  1. **Publish Card, Bundle and Sealed Listings:** Andrés lists a bundle of three cards and a sealed product; a bundle component list accepts only cards (a sealed product is rejected with an explanation).
  2. **Shared-Quantity Reconciliation:** Valentina holds one copy of a card listed individually and as a bundle component; a sale through the bundle makes the individual listing unavailable — one decrement, never two.
  3. **Concurrent Last-Unit Reservation:** two buyers reserve the last unit simultaneously; exactly one succeeds and the other receives an explainable insufficient-quantity rejection.
  4. **Seller-Type Listing Rules:** a business can create listings while its application is Pending and regardless of balance; purchasability pauses only on `CommissionBalanceExhausted` (listings stay visible and editable); `openToTrade` defaults false and setting it true on a business listing is rejected at the `Listing` aggregate.
- **Standalone Prototype:** Inventory & Listing Console with a reservation race simulator (fires N concurrent `reserveInventory` calls) and pool inspector.
- **Mandatory Edge Case:** the caller's transaction **aborts after** `reserveInventory` succeeded (for example the `Order` insert fails); the quantity must be fully restored by the shared transaction itself, with no compensating write and no ghost reservation.

### Module 5: Business Verification Workflow — `VER`

- **Tier:** Intermediate · **Form factor:** D (admin review queue) + R (applicant form)
- **Core Problem:** a business is represented as verified only after an admin approves its application; until then it stays `Pending`. The application carries `legalIdentity` and external-presence data (Instagram or website), which is **regulated personal data under Ley 1581**: timestamped consent at submission, a published privacy notice, and access scoped to the admin-review path only (AD-13). Review is a manual, human action — but the module must make its state transitions and data access provably safe.
- **Named Protagonists:** *Andrés* (applicant); *Sebastián* (Platform Admin reviewer).
- **Anchors:** CAP-5, CAP-15; inherited AD-13, AD-18 (guard at submission), AD-11.
- **Owns / Mocks:** owns `BusinessApplication`, its status machine and consent fields; mocks object storage for `legalIdentity` documents, `identity` flags (Module 1 stub), and the verified badge consumed by `listings`.
- **4 Mandatory Scenarios:**
  1. **Submit Application:** Andrés submits legal identity and an Instagram link; consent is timestamped; the application enters `Pending`; invalid or missing fields produce specific, field-level errors.
  2. **Admin Approval:** Sebastián approves; only then is Andrés represented as verified — a listing he created earlier stays unverified until that moment.
  3. **Rejection & Explanation:** Sebastián rejects with a reason that Andrés sees in plain language. Whether reapplication is allowed is **not defined in SPEC** — you must decide it in the PRD and log the decision.
  4. **Legal-Identity Access Denial:** any read of `legalIdentity` outside the admin-review path is denied, explained and audited.
- **Standalone Prototype:** Application Form + Admin Review Queue with a state-machine inspector and an access-audit log.
- **Mandatory Edge Case:** two admins act on the same `Pending` application at once (one approves, one rejects) — exactly one terminal transition wins and the other gets an explainable conflict, with no half-applied state.

### Module 6: Order & Comprobante Confirmation State Machine — `ORD`

- **Tier:** Advanced · **Form factor:** R (buyer) + D (business order detail)
- **Core Problem:** a business purchase is settled peer-to-peer and tracked by **three independently-timestamped confirmation facts**: `buyerPaidConfirmedAt` (only once a comprobante file reference exists and the buyer confirms), `sellerReceivedConfirmedAt` (only the business), and `buyerItemReceivedConfirmedAt` (the **only** fact that closes the order). The platform never models funds held. Purchasing against an individual-seller listing must fail with `NotBusinessListing`. Inventory is reserved **at creation** (AD-6), and events are published only after commit (AD-9/AD-10).
- **Named Protagonists:** *Camila* (buyer purchasing from a verified business); *Andrés* (business confirming payment).
- **Anchors:** CAP-17, CAP-20, CAP-22, CAP-27 (trigger side); inherited AD-2, AD-6, AD-9, AD-10, AD-14, AD-15.
- **Owns / Mocks:** owns `Order`, the comprobante file reference, the three facts, the `OrderPaymentConfirmedByBusiness` and `OrderClosed` events, and read-ownership rules; mocks `listings.reserveInventory`, `identity`, object storage and the event bus.
- **4 Mandatory Scenarios:**
  1. **Purchase & Reserve:** Camila purchases Andrés's listing; an `OrderId` is returned and quantity is decremented at creation, not at close.
  2. **Comprobante & Paid Confirmation:** Camila uploads a comprobante and confirms she paid; "paid" appears only after both; Andrés confirms received separately; each state is independently queryable.
  3. **Purchase Against an Individual-Seller Listing:** rejected with `NotBusinessListing` and a plain explanation; no order and no reservation are created.
  4. **Item Received & Close:** Camila confirms the item arrived; the order closes; `OrderClosed` fires with a snapshot payload; the add-to-collection prompt is *suggested*, never created automatically.
- **Standalone Prototype:** Order Timeline Simulator with a buyer/business actor switcher, a comprobante fixture uploader and a state-machine viewer.
- **Mandatory Edge Case:** confirmations arriving **out of order or twice** — Andrés confirms receipt before Camila's paid confirmation or before any comprobante exists; a double-click or retry — must be rejected or idempotent with an explainable message. A stalled order (paid, never confirmed) has **no auto-escalation** (an accepted, documented gap).

### Module 7: Commission Ledger & Purchasability Engine — `COM`

- **Tier:** Advanced · **Form factor:** D (ledger console) + H (concurrent-deduction simulator)
- **Core Problem:** a verified business keeps a **prepaid commission balance**. Each confirmed sale deducts commission, triggered only by `OrderPaymentConfirmedByBusiness`, as a **single atomic conditional decrement** — never a read-modify-write (AD-19); a transiently negative balance is allowed so a completed sale is never refused. Reaching zero pauses purchasability (listings stay visible and editable, never deleted) until a top-up resumes it. The commission rate is an explicit Non-Goal in SPEC, so it is a configurable parameter, but the **rounding rule** for a percentage of integer COP is yours to define and prove: the ledger identity `balance = Σ top-ups − Σ deductions` must hold exactly.
- **Named Protagonists:** *Andrés* (business owner); *Sebastián* (Platform Admin auditing the ledger).
- **Anchors:** CAP-21; inherited AD-3, AD-19, AD-9, AD-10.
- **Owns / Mocks:** owns `CommissionAccount`, the append-only ledger, and the `CommissionBalanceExhausted`/`Replenished` events; mocks `orders` events (fixture publisher), `listings` as subscriber, and the top-up confirmation mechanism (declare your assumption in the PRD).
- **4 Mandatory Scenarios:**
  1. **Top-Up & Funded State:** Andrés tops up his balance; his listings are purchasable.
  2. **Deduction on Confirmed Sale:** `OrderPaymentConfirmedByBusiness` triggers one atomic deduction; a redelivered event does not charge twice (dedupe by `orderId`).
  3. **Exhaustion → Pause:** the balance reaches zero; `CommissionBalanceExhausted` fires; listings pause but stay visible and editable.
  4. **Replenish → Resume:** a top-up fires `CommissionBalanceReplenished`; listings resume without being recreated.
- **Standalone Prototype:** Ledger Console + event log + concurrent-deduction simulator.
- **Mandatory Edge Case:** two orders confirmed at the same instant against a balance that covers only one, plus a duplicate event delivery — each order must be charged **exactly once**, the balance ledger must reconcile exactly, and `CommissionBalanceExhausted` must fire **exactly once** (no flapping).

### Module 8: Trade Offer Negotiation Engine — `TRD`

- **Tier:** Advanced · **Form factor:** R
- **Core Problem:** buyers can offer cards, product and/or money against an **individual-seller** listing flagged `openToTrade` (default false, never available on business listings). The seller can accept, reject or counter; an accepted trade reserves inventory through the same `reserveInventory` call orders use (AD-6) and hands off via the shared contact-message service. A trade is "completed" only when **both** parties independently confirm — a computed property, never a stored status. Plan-1 only *assumed* (SPEC is silent) that once one offer is accepted, the listing's other pending offers become "unfulfillable" and are surfaced to their proposers; this module must turn that assumption into a specified state-machine transition, or replace it with a logged, justified alternative.
- **Named Protagonists:** *Valentina* (seller); *Julián* (collector offering a trade, *new*).
- **Anchors:** CAP-25, CAP-26; inherited AD-4, AD-6, AD-1.
- **Owns / Mocks:** owns `TradeOffer`, its negotiation/state machine and the two confirmation facts; mocks `listings` (the `openToTrade` flag, `reserveInventory`, the contact-message service) and `identity`.
- **4 Mandatory Scenarios:**
  1. **Offer on an Open-to-Trade Listing:** Julián offers a card plus COP 20,000; an offer on a listing that is not open to trade is rejected with an explanation.
  2. **Reject or Counter:** Valentina rejects or counters; Julián sees the recorded action, and turn-taking rules prevent out-of-turn actions.
  3. **Accept & Reserve:** Valentina accepts; inventory is reserved; the external-contact handoff message is generated; the listing's competing pending offers transition per the rule your PRD specifies (Plan-1's assumption: marked unfulfillable and surfaced to their proposers).
  4. **Mutual Completion:** trade shows "completed" only after both confirm; a one-sided confirmation leaves it open.
- **Standalone Prototype:** Trade Negotiation Timeline + state viewer with a two-actor switcher.
- **Mandatory Edge Case:** two pending offers compete for the last unit and Valentina accepts both from two tabs at the same time — exactly one reservation wins; the other acceptance fails with an explanation and its offer ends in the state your PRD specifies for a competing offer.

### Module 9: Collection, Binder & Wishlist Manager — `COL`

- **Tier:** Intermediate · **Form factor:** R
- **Core Problem:** a collector keeps several named collections; every entry carries a required `source` (`PlatformPurchase` or `Manual`); the binder is organised however the collector chooses (layout, page grid, ordering by date, value, set, Pokémon, artist, colour); a card with no catalog entry can be added by external link (`BinderEntry.cardRef` is a tagged union, never a synthetic catalog row); the wishlist is separate from collections and sortable by price and availability; and closing a business order only ever triggers a **dismissible prompt**, not an automatic entry.
- **Named Protagonists:** *Valentina* (collector); *Camila* (wishlist-driven buyer).
- **Anchors:** CAP-8, CAP-10, CAP-11, CAP-12, CAP-13, CAP-14, CAP-24, CAP-27 (prompt side); inherited AD-7, AD-9, AD-10, AD-1.
- **Owns / Mocks:** owns `Collection`, `CollectionEntry`, `BinderEntry`, wishlist and the prompt inbox; mocks catalog entries (public query), `listings` availability/price query (for wishlist sort) and the `OrderClosed` publisher.
- **4 Mandatory Scenarios:**
  1. **Binder Layout & Sort:** Valentina builds a 3×3 binder with pagination and sorts it by set then Pokémon; the layout and completion progress render deterministically.
  2. **Link-Added Entry:** she adds a promo card by external link with no catalog entry; it displays correctly and no placeholder `CatalogEntry` is ever created.
  3. **Wishlist vs Collection:** Camila adds to her wishlist without creating a collection entry, then sorts it by price and availability against current listings.
  4. **Post-Purchase Prompt:** `OrderClosed` produces a dismissible prompt; accepting creates a `PlatformPurchase` entry, declining or ignoring creates none, and the order's closed state is unaffected either way.
- **Standalone Prototype:** Binder Grid UI + Wishlist + Prompt Inbox with a fixture `OrderClosed` publisher.
- **Mandatory Edge Case:** `OrderClosed` delivered twice, then the prompt accepted twice (double-click or two tabs) — exactly **one** prompt and exactly **one** entry result.

### Module 10: Collection Valuation & Trend Engine — `VAL`

- **Tier:** Intermediate · **Form factor:** R
- **Core Problem:** a collector needs the **current total value** of a collection (COP) and how it **changed over a prior period**, derived from constituent reference prices — plus a value history series that is non-empty and COP-denominated once a priced item is added. Reference prices arrive as USD/COP pairs from a fixture feed with a fixture FX rate; the two money shapes must **never** be merged or coerced (project rule). The conversion source and refresh mechanism are SPEC Non-Goals, so your PRD declares its assumption. This is the module where arithmetic must be provably right: rounding policy, missing prices, zero baselines.
- **Named Protagonists:** *Valentina* (tracks her collection's value); *Camila* (tracks a small starter collection).
- **Anchors:** CAP-9, CAP-3 (trend shape), CAP-12; inherited AD-7 and the money rules in `project-context.md`.
- **Owns / Mocks:** owns the valuation read model, the trend formula and the history series; mocks collection entries (via `collections`' public query) and reference prices/FX (via `catalog`' public query and a fixture rate table with as-of dates).
- **4 Mandatory Scenarios:**
  1. **Current Value:** total = Σ (entry price × quantity) in integer COP, with the rounding rule stated and tested.
  2. **Period Trend:** a 30-day delta is reported as `period`, `changePercent`, `referencePriceAtStart`, with a defined formula for a zero or missing starting value.
  3. **Unpriced or Stale Items:** items with no reference price are excluded from the total and listed as "not valued" with a reason; stale prices are labelled as such.
  4. **Value History Series:** a priced item added mid-period produces a step at its acquisition date in a non-empty COP series.
- **Standalone Prototype:** Valuation Dashboard + trend chart with a price-feed time-travel slider and FX fixture editor.
- **Mandatory Edge Case:** an empty or zero-valued baseline (division by zero) **and** rounding drift over a 500-entry collection — the sum of per-item rounded values versus the rounded total must be defined and reconciled, not left to floating-point luck.

### Module 11: Reviews, Reputation & Moderation Console — `REP`

- **Tier:** Foundation · **Form factor:** R (review form, profile) + D (moderation queue)
- **Core Problem:** reputation is review-based. A review of a **verified business** requires a *completed* purchase against it — `buyerItemReceivedConfirmedAt IS NOT NULL`, not merely "paid" — and fails with `NotVerifiedPurchaser`; a review of an **individual seller** has no such gate (an accepted, flagged risk). An admin can **hide** (never delete) a listing or review; every default read filters `hiddenAt IS NULL`, and hidden reviews must leave the aggregate rating at once. Anti-abuse beyond the purchase gate is a Non-Goal.
- **Named Protagonists:** *Camila* (buyer reviewing); *Andrés* (reviewed business); *Sebastián* (Platform Admin moderator).
- **Anchors:** CAP-7, CAP-28; inherited AD-12, AD-2 (definition of the closed state), AD-11.
- **Owns / Mocks:** owns `Review`, the aggregate rating computation and the moderation hide/unhide commands on `Review`; mocks `orders`' public query (closed-purchase check), and the `Listing` hide flag owned by `listings`.
- **4 Mandatory Scenarios:**
  1. **Gated Review of a Business:** Camila reviews Andrés after the order closes and it is accepted; before close it fails with `NotVerifiedPurchaser` and an explanation that "paid" is not enough.
  2. **Ungated Individual-Seller Review:** a review of an individual seller succeeds without the purchase check.
  3. **Aggregate Reputation:** rating average and count are computed with a stated rounding rule; hidden reviews are excluded.
  4. **Admin Hide & Audit:** Sebastián hides a review and a listing; both vanish from default reads immediately, are retained with a reason for audit, and can be unhidden.
- **Standalone Prototype:** Reputation Profile + Moderation Queue with an audit view.
- **Mandatory Edge Case:** a review submitted while the order is paid but not yet closed, and a review hidden at the same moment another is posted — the aggregate must stay consistent, never counting a hidden review or dropping a new one.

### Module 12: Messaging & External Contact Handoff — `MSG`

- **Tier:** Foundation · **Form factor:** H (API explorer) + R (composer and inbox)
- **Core Problem:** two different contact paths exist. Individual-seller listings are reachable only through a **generated external message** — pre-filled text with product name and listed price, as a link or copyable text for an external messaging app that the platform never calls (CAP-6). **In-app messaging exists only for verified businesses**; the same action against a non-business account fails with `NotBusinessAccount` (CAP-18). `trading` reuses the same contact-message service for an accepted trade. The module must render messages deterministically and apply the eligibility policy without ambiguity.
- **Named Protagonists:** *Camila* (buyer); *Valentina* (individual seller); *Andrés* (verified business).
- **Anchors:** CAP-6, CAP-18; inherited AD-4 (reuse by `trading`), AD-8, AD-11.
- **Owns / Mocks:** owns the contact-message service, `Conversation` and `Message` records; mocks `identity` (account/verification state), `listings` (product and price), and the external messaging app (a link is generated, never called).
- **4 Mandatory Scenarios:**
  1. **Contact an Individual Seller:** Camila gets message text containing the product name and COP price, with a correctly encoded external link.
  2. **In-App Message to a Verified Business:** delivered in-app; the thread tracks read/unread state.
  3. **Ineligible Recipient:** a message to a non-business account fails with `NotBusinessAccount` and a plain explanation. Whether a business whose application is still `Pending` counts as "verified" is **not defined in SPEC** — decide it in the PRD and log it.
  4. **Trade Handoff Reuse:** `trading` calls this same service on an accepted trade and the message carries the trade summary; nothing is reimplemented.
- **Standalone Prototype:** Contact Composer + Inbox + API Explorer with a message-preview pane.
- **Mandatory Edge Case:** a very long or special-character product name (accents, `ñ`, emoji, link-length limits), COP price formatting, and a business whose verified state changes between composing and sending the message.

---

## Appendix A — Adaptation Map (Default Statement → TEZG)

| Element | Default statement | This statement |
| --- | --- | --- |
| Shared scenario | Academic AI Compute Fabric (31 workstations + 1 server, K8s/vLLM/Kubeflow) | TEZG marketplace + collection tracker (Colombia, modular monolith, peer-to-peer settlement) |
| Source documents | University platform brief; fleet topology | TEZG `project-brief.md`, `SPEC.md` (CAP-1..28), `ARCHITECTURE-SPINE.md` (AD-1..13), `project-context.md`, Plan-1 tracks |
| "Fleet Topology Profile" | Node/GPU inventory | Reference Seed Profile (catalog, accounts, listings, locations, orders, prices, virtual clock) |
| Technology baseline | Linux, Docker Compose/K8s, FastAPI or Node, simulated Prometheus | Linux, Docker Compose, TypeScript (Node), PostgreSQL where concurrency invariants need it, fakes of neighbour modules and a virtual clock |
| Constraint 2 | Hardware Agnosticism | External-Dependency Agnosticism |
| Constraint 4 | Cited justifications | Same; citations name the CAP/AD/rule and the input values; TEZG tone of voice |
| Constraint 5 examples | OOM, timeout, quota breach, node failure | Insufficient quantity, missing comprobante, balance exhausted, subscriber failure, feed outage, write conflict |
| Constraints 8–9 | — | **New:** Inherited Project Invariants; CAP traceability and module-code ID prefixing (`FR-<CODE>-n`, `AD-<CODE>-n`) |
| Protagonists | Professors, students, lab engineers (Dr. Aris Thorne, Mateo, Elena…) | Collectors, individual sellers, businesses and admins (Valentina, Andrés, Sebastián, Camila, Julián) |
| Design tokens | Green / Amber / Blue / Red traffic-light statuses | Extend the muted "Trusted Ledger" tokens (`status-pending`, `status-confirmed`, `status-error`) |
| Form factors | Admin/observability, student/chat, headless | Collector-facing responsive, back-office desktop-first, headless developer console — chosen by task shape |
| Review commands | `/bmad-review … --lens adversarial` / `--lens edge-case-hunter` | `/bmad-review-adversarial-general` / `/bmad-review-edge-case-hunter` (installed skills) |
| Module Annex | 12 modules of the compute fabric (identity, policy engine, digital twin, reservations, model catalog, …) | 12 TEZG modules cut from the nine architecture modules (identity, catalog, discovery, inventory, verification, orders, commission, trading, collections, valuation, reviews/moderation, messaging), each with Owns/Mocks, Anchors and Form factor added |
| Submission root | Repository root | `docs/plan-2/<module-slug>/` |
| Unchanged | Phases, durations, deliverables, AD-n 5-part format, ≥3 rejected-AI-proposal rule, PASS/CONCERNS/FAIL gate, rubric weights and descriptors | — |
