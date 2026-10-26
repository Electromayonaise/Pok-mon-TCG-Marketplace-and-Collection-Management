# Decision Log — Solu-1 (All 12 Modules, Single Package)

**Scope:** TEZG Solu-1, contract-driven solutioning for all 12 Plan-2 modules (`468acd9:docs/solu-1/task-statement.md`).
**Author and decision-maker:** Mateo Rubio (Solu-1 is individual work).
**AI council:** Winston (`bmad-agent-architect`), Amelia (`bmad-agent-dev`), Murat (`bmad-tea`, `bmad-testarch-*`), John (`bmad-agent-pm`), and the review skills. All run in Claude Code (Claude Opus 5.5).

**Operating rule (inherited from the Plan-2 log).** The agent drafts each phase and presents its proposals, review findings and gaps with a recommendation. Mateo decides at a per-phase gate, through a choice menu or in his own words. This log records exactly what Mateo decided and how it was presented. It never records an agent-inferred decision, and prompts are not reconstructed after the fact. **Prompt** gives the direction Mateo gave for the step. **Source** names the gate, or quotes Mateo where he wrote his own answer.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed. AI proposals that Mateo rejected, corrected or improved carry the tag `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome |
| --- | --- | --- | --- |
| #1 | `[IMPROVED]` | The agent framed Solu-1 as possibly done elsewhere and offered "skip", "implement one feature" or "fold into Solu-2" | Mateo chose to implement it here for all 12 modules |
| #8 | `[REJECTED]` ×3 | Review findings F-22, F-23, F-24 on the contracts | Rejected with reasons at the Phase 1 gate |
| #8 | `[CORRECTED]` | AD-COM-2 rule 3 (Plan-2, AI-drafted): "roll back the transaction" on a duplicate deduction | Corrected to a savepoint (review F-03) |
| #13 | `[IMPROVED]` | AD-IDN-2 Alternatives: "cross-table exclusivity cannot be expressed without triggers" | Composite FK kept as defense-in-depth |
| #14 | `[REJECTED]` ×2 | Schema review findings E-14 (deferrable unique positions), E-16 (FK on prompt history) | Rejected with reasons |
| #15 | `[CORRECTED]` | The agent's own F-01 fix, which broke AD-1 (`catalog → identity`) | Guard moved to `adminProcedure` |
| #16 | `[CORRECTED]` / `[REJECTED]` | Tests asserting the test double's subscriber list (T-05); split `seed.ts` (T-08) | Assertions replaced; split rejected |
| #18 | `[CORRECTED]` | The agent's "46 of ~99 FRs" estimate | Counted: 56 of 96 |
| #19 | `[REJECTED]` | Story review F-11 (shorten titles for shorter sprint keys) | Rejected with reason |

---

### 1. `[IMPROVED]` Solu-1 is implemented here, for all 12 modules (Phase 0 — Scope)

- **Phase:** 0 (intake).
- **Persona/Skill:** none (session intake).
- **Prompt (summary):** Mateo directs: analyse the repository, check that Task 1 (Solu-1) is implemented and its deliverables exist, then start Task 2.
- **AI output (summary):** The repository scan found no Solu-1 deliverable anywhere: no contracts, DDL, DTOs, ATDD tests, `epics.md` or `sprint-status.yaml`. The agent asked what to do and offered three options: *done elsewhere, skip it* (Solu-1's own text says it was done individually on Smart Solar Flow); *implement it for TEZG*; *fold it into Task 2 with a coverage map*.
- **Human decision:** MODIFY. Mateo chose to implement it for TEZG, and then widened the scope beyond any offered option to cover all 12 modules. Asked which reading he meant, he wrote: *"these solus are made for that solar project which has various modules and each group should only focus on one but we are doing a completely different project as you know so there are various modules we need to also complete so instead of doing just one module of our project we want to cover all its modules, do it in a way it is complete and follows each solu intent."*
- **Reason:** TEZG is the team's own 12-module project, and Plan-2 already planned all 12 modules as one package (Plan-2 decision log #1). Doing one module would leave 11 without contracts, schemas or tests.
- **Artifact changed:** `468acd9:docs/solu-1/task-statement.md` (adapted statement; Appendix B records the single-package reading of every rule).

### 2. Solu-1 before Solu-2, branch per package, one commit per phase (Phase 0 — Workflow)

- **Phase:** 0.
- **Persona/Skill:** none.
- **Prompt (summary):** Mateo directs: plan the work, Solu-1 first, then Solu-2.
- **AI output (summary):** The agent recommended Solu-1 first, because it sets up the shared harness and stub layout that Solu-2 builds on. It also recommended working on a branch with one commit per phase and no push without asking.
- **Human decision:** ACCEPT, at the choice menu ("Solu-1 first (Recommended)"; "Branch + commit per phase (Recommended)").
- **Reason:** The course order, and a per-phase history that an auditor can follow.
- **Artifact changed:** branch `solu-1`.

### 3. Phase 1 directed to Winston, bound to the Plan-2 registry (Phase 1 — Contracts)

- **Phase:** 1.
- **Persona/Skill:** Winston (`bmad-agent-architect`).
- **Prompt (summary):** Mateo directs: *"derive Design-by-Contract P/Q/I for 3 core functions per Plan-2 module (36 total) of TEZG, per 468acd9:docs/solu-1/task-statement.md §3, bound to the Plan-2 ARCHITECTURE.md AD-n and the ADD-§3 DomainError registry."*
- **AI output (summary):** Winston proposed a guard, a contended mutation and a resolver for each module (the table in §0 of `contracts.md`). He flagged that DSC and VAL have no state (see #4).
- **Human decision:** ACCEPT the direction. The selection itself is #5.
- **Reason:** Binding every clause to an existing code, column and AD keeps Solu-1 from inventing a second, conflicting design next to Plan-2.
- **Artifact changed:** `853449c:docs/solu-1/planning/contracts.md`.

### 4. DSC and VAL fill the contended slot with a concurrency-safe read (Phase 1 — pre-draft gate)

- **Phase:** 1.
- **Persona/Skill:** Winston.
- **AI output (summary):** Plan-2 deliberately gave DSC and VAL no tables and no writes (ARCH §6.5, §6.11), so Solu-1's "contended mutation" slot has no natural candidate. Options presented:
  - (a) a concurrency-safe read, stated with one-outcome and repeat-safe clauses — `search` and `valueCollection` *(recommended)*;
  - (b) borrow a host-module mutation (listing hide for DSC, prompt accept for VAL);
  - (c) invent new state (saved searches, stored valuations).
- **Human decision:** ACCEPT (a), at the choice menu.
- **Reason:** (b) would contract REP's and COL's commands a second time under another module's name. (c) contradicts Plan-2: ARCH §6.11 *Alternatives* rejects stored valuations because they go stale against edits.
- **Artifact changed:** `contracts.md` §4 (`search`), §11 (`valueCollection`).

### 5. The 36-function selection approved (Phase 1 — pre-draft gate)

- **Phase:** 1.
- **Persona/Skill:** Winston.
- **AI output (summary):** The 12 × 3 table. The agent also offered to swap CAT's guard `assertCatalogAdmin` for a module-specific `assertFeedLeaseHolder`.
- **Human decision:** ACCEPT as proposed. The CAT guard was kept.
- **Reason:** Mateo's choice at the menu ("Approve as proposed").
- **Artifact changed:** `contracts.md` §0 summary.

### 6. Gaps GAP-1, GAP-2 and GAP-3 adopted (Phase 1 gate)

- **Phase:** 1.
- **Persona/Skill:** Winston (gaps found while deriving the contracts).
- **AI output (summary):**
  - GAP-1: Plan-2 has no error code for an unknown or foreign prompt id, and reusing `PromptAlreadyResolved` would leak another buyer's prompt state. New code `PromptNotFound` (collections, 404).
  - GAP-2: a valuation over more than 500 cards reads prices in several statements, so a concurrent ingestion can be half-visible. Read in one `REPEATABLE READ` read-only transaction.
  - GAP-3: Plan-2 names the idempotency key `clientMessageId` but no format. Fix it as 1–64 characters of `[A-Za-z0-9_-]`.
- **Human decision:** ACCEPT all three (multi-select at the gate).
- **Reason:** Each closes a decision that an implementing agent would otherwise have had to invent: an error code, an isolation level, a format.
- **Artifact changed:** `contracts.md` §6.3 (`acceptPrompt`), §11 (`valueCollection`), §9 (`sendMessage`), §14, §15.

### 7. A supplementary fourth CAT contract for the mandatory edge case (Phase 1 gate — review F-10)

- **Phase:** 1.
- **Persona/Skill:** `bmad-review-adversarial-general` (finding F-10); Winston (options).
- **AI output (summary):** The CAT mandatory edge case (a renamed or reprinted card keeps its `catalogEntryId`) was attached as an invariant to `startFeedRun`, which never touches `"CatalogEntry"`, so no test of that contract could turn red. Options:
  - add a fourth contract `upsertCatalogEntry` *(recommended)*;
  - swap `startFeedRun` out;
  - cover the edge case with a story only.
- **Human decision:** ACCEPT the fourth contract.
- **Reason:** Swapping would drop the contract for "one running feed run". A story-only cover gives the operation the edge case is about no P/Q/I.
- **Artifact changed:** `contracts.md` §3 (`upsertCatalogEntry`), §0, §13. It raised GAP-4 (`KindChanged`), routed to the Phase 2 gate.

### 8. Contract review triage: 21 Accept, 3 `[REJECTED]`, one Plan-2 rule `[CORRECTED]` (Phase 1 gate)

- **Phase:** 1.
- **Persona/Skill:** `bmad-review-adversarial-general` (report 1 of 4, a self-review under the adversarial brief, since the same session drafted the contracts).
- **Prompt (summary):** Mateo directs: *"adversarial review of the 36 P/Q/I contracts against Plan-2 ARCHITECTURE.md/addendum.md; hunt elastic language, unbound invariants, wrong error codes/HTTP statuses, missing failure states, contradictions with AD-n."*
- **AI output (summary):** 24 findings, with a recommended Accept or Reject for each. Four expose defects inherited from Plan-2, not from the draft:
  - F-02: `NotBusinessAccount` is "propagated" by `messaging`, but `identity` returns a `Decision` and never throws it;
  - F-03: AD-COM-2 rule 3 rolls back the whole handler transaction on a duplicate deduction, which also discards the `EventDelivery` row's `delivered` update;
  - F-04: Better Auth's default ids are not cuid2;
  - F-06: FR-INV-3 cites withdrawn and deactivated under `ListingNotPurchasable`, which FR-INV-10 makes unreachable.
- **Human decision:** ACCEPT the triage in full ("Adopt in full (Recommended)"). Mateo did not take the offered alternative of overturning the F-23 rejection.
- **The three rejected AI findings:**
  - `[REJECTED]` **F-22** — "`(0, 0)` is redundant in `assertSearchArea`." True for the DSC bounding box. But the same predicate serves INV and IDN, where `(0, 0)` is the sentinel for a missing meeting point (ADD-§2.4 lists it explicitly). Removing the clause would make the three modules' checks diverge.
  - `[REJECTED]` **F-23** — "`changePercent` is a weak fit for the resolver slot." The template asks for explicit behaviour when data is missing. A zero baseline means no value to divide by, and the contract returns `null` with `ValuationNoBaseline` instead of throwing or dividing. Mateo had approved this selection at #5, and the offered alternative of reopening it was not taken.
  - `[REJECTED]` **F-24** — "`explanation: string` is untyped." The typed parts are FR-DSC-5's rendering concern. A contract test asserts order and inclusion, not prose, so typing the string adds nothing a test can check.
- `[CORRECTED]` **AD-COM-2 rule 3** (Plan-2, AI-drafted): "the transaction rolls back … the handler returns success" becomes `SAVEPOINT apply_deduction` / `ROLLBACK TO SAVEPOINT`, so the delivery row still commits as `delivered`. Without the fix, two racing deliveries of one order event could exhaust the 3 automatic attempts (AD-SYS-2 rule 4) and leave a correctly charged order looking like a failed delivery on the admin's Entregas tab.
- **Artifact changed:** `contracts.md` (each fix marked `review F-nn`); `reviews/review-contracts-adversarial.md` (status: triaged).

---

### 9. The Solu-1 DDL template's id and timestamp defaults are not used (Phase 2 — pre-draft gate)

- **Phase:** 2.
- **Persona/Skill:** Winston (`bmad-agent-architect`).
- **Prompt (summary):** Mateo directs: *"write the SQL migration DDL for the tables that enforce the contracts"* (task statement §4.2.A).
- **AI output (summary):** Before drafting, Winston flagged a conflict between the course template and the project's inherited rules:
  - the template prescribes `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` and `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`;
  - `project-context.md` says "cuid2 string primary keys everywhere — never auto-increment ints or UUIDs";
  - AD-SYS-6 rule 1 bans SQL `now()`.

  Options: (a) reject the defaults *(recommended)*; (b) follow the template literally; (c) a hybrid that keeps `DEFAULT NOW()` as a "safety net".
- **Human decision:** ACCEPT (a), at the choice menu.
- **Reason:**
  - A `DEFAULT NOW()` on `createdAt` silently stamps wall-clock time whenever code forgets to pass the `Clock` value. Under the virtual clock seeded at `2026-10-01T15:00:00Z`, that produces rows dated in the real present, and every test that orders or ages rows becomes time-of-day dependent, exactly what AD-SYS-6 prevents. Without the default, a forgotten value fails `NOT NULL` at once.
  - `gen_random_uuid()` contradicts the cuid2 rule. The id is still "generated", by the `IdGenerator` port, and `CHECK (tezg_is_cuid(id))` keeps it physically valid.
  - The hybrid (c) keeps the hidden failure mode of (b).
- **Artifact changed:** every file in `853449c:docs/solu-1/planning/schemas/`; conventions in `schemas/README.md`.

### 10. Test runner: Vitest + fast-check (Phase 2 — pre-draft gate)

- **Phase:** 2 (it carries into Phase 3 and Solu-2).
- **Persona/Skill:** Winston, citing `project-context.md` ("test framework/runner … not yet decided").
- **AI output (summary):** Options: Vitest + fast-check *(recommended)*, Jest + ts-jest, `node:test`.
- **Human decision:** ACCEPT Vitest + fast-check.
- **Reason:** native TypeScript/ESM, a JSON reporter for the "red for the right reason" check, and fast-check for the AD-SYS-7 property tests over 10,000 random inputs. Solu-2 names the same pair.
- **Artifact changed:** `package.json` (exact pins: `vitest@5.0.5`, `fast-check@4.10.2`, `typescript@7.0.2`, `pg@8.23.1`).

### 11. SQL-first migrations are the authoritative DDL (Phase 2 — pre-draft gate)

- **Phase:** 2.
- **Persona/Skill:** Winston.
- **AI output (summary):** Partial unique indexes, CHECKs and exclusion constraints carry most of the invariants, and `schema.prisma` cannot express them. Options: SQL-first, with Prisma introspected later *(recommended)*; or Prisma-first, with hand-patched migrations.
- **Human decision:** ACCEPT SQL-first.
- **Reason:** One source of truth per constraint. With Prisma-first, every partial index would exist twice and could drift.
- **Artifact changed:** `853449c:docs/solu-1/planning/schemas/*.sql`; the harness applies them with `pg`.

### 12. GAP-4: a feed row that changes `kind` is quarantined as `KindChanged` (Phase 2 — pre-draft gate)

- **Phase:** 2.
- **Persona/Skill:** Winston, surfaced while writing `upsertCatalogEntry` (#7).
- **AI output (summary):** Plan-2 does not say what happens when a feed row's `kind` differs from the stored entry's. Options: quarantine with `KindChanged` *(recommended)*; apply the new kind; fail the whole run.
- **Human decision:** ACCEPT `KindChanged`.
- **Reason:** Applying the new kind could turn a card that sits in `BundleComponent` rows into a sealed product, which AD-INV-1 rule 5 forbids. Failing the run would block 9,999 good rows for one bad one.
- **Artifact changed:** `003_create_catalog.sql` (`QuarantinedFeedRow.reasonCode`); `catalog/domain/cat.ts` (`QuarantineReason`).

### 13. `[IMPROVED]` Seller-track exclusivity made physical with a composite foreign key (Phase 2 gate)

- **Phase:** 2.
- **Persona/Skill:** Winston (DDL draft).
- **AI output (summary):** AD-IDN-2's *Alternatives* block (Plan-2, AI-drafted) rejected a cross-table guard because "Postgres cannot express a uniqueness constraint that spans two tables without triggers". Winston's draft shows that it can, for this invariant:
  - `"User"` gets `UNIQUE (id, "sellerTrack")`;
  - `IndividualSellerProfile(userId, sellerTrack = 'individual')` and `BusinessApplication(businessId, sellerTrack = 'business')` reference it `ON UPDATE RESTRICT`.

  This was verified on `postgres:16.6`: an application insert for an individual-track user fails with `business_application_user_track_fk`, and a track change under an existing profile fails with `individual_profile_user_track_fk`.
- **Human decision:** ACCEPT, as defense-in-depth. AD-IDN-2's conditional `UPDATE` stays the primary guard.
- **Reason:** With only the conditional write, the invariant depends on every future writer remembering the `WHERE "sellerTrack" IS NULL` predicate. The FK makes the database refuse the forbidden state whatever the code does. It also enforces AD-IDN-2 rule 4 ("`sellerTrack` is never cleared") physically. The cost is one constant discriminator column per table.
- **Artifact changed:** `001_…sql`, `002_…sql`; `schemas/README.md` P-1. Review E-02 later extended the same pattern to `BusinessProfile`.

### 14. Schema review triage: 20 Accept, 2 `[REJECTED]`, 1 Defer (Phase 2 gate)

- **Phase:** 2.
- **Persona/Skill:** `bmad-review-edge-case-hunter` (report 2 of 4, a self-review by path tracing).
- **Prompt (summary):** Mateo directs: *"walk every boundary and branch of the Solu-1 DDL and DTOs against contracts.md; report only unhandled edge cases."*
- **AI output (summary):** 23 unhandled paths, each with a recommendation. Among them:
  - a listing could point at **another seller's** `InventoryUnit`, so a purchase would decrement someone else's stock (E-05, E-06);
  - order facts were ordered in presence but not in time (E-08);
  - a message could be stored by a non-participant (E-12).
- **Human decision:** ACCEPT the triage in full. The offered alternatives (accept E-14; decide E-15 now) were not taken.
- **The two rejected AI findings:**
  - `[REJECTED]` **E-14** — *"add `UNIQUE (collectionId, manualPosition) DEFERRABLE INITIALLY DEFERRED`"*. The binder order already ends in a deterministic `entryId` tie-break (AD-COL-1 rule 5), so equal positions are never ambiguous. Review F-13's `col:owner` lock already serializes every writer of positions. A deferred unique on a column that `reorder` rewrites in bulk adds a deferred check to every move, and a mid-reorder violation could only surface at commit, as an opaque error, with no user-visible gain.
  - `[REJECTED]` **E-16** — *"`acceptedIntoCollectionId` dangles after the collection is deleted"*. The column is history: where the buyer accepted the prompt. It is never dereferenced, and an FK would force either blocking collection deletion or nulling the history, both worse than a documented dangling id.
- **Deferred:** E-15 (deleting a collection cascades its purchase entries, and the prompt, already `Accepted`, cannot re-create them). This is an FR-COL-1 product decision, not a DDL one, and it is carried to Solu-2's gap audit.
- **Artifact changed:** migrations 001, 002, 004, 005, 007, 008, 010, 099; DTOs `dsc`, `inv`, `msg`, `rep`, `val`; `contracts.md` (marked `review E-nn`); `reviews/review-schema-edge-cases.md` (status: triaged).

### 15. `[CORRECTED]` The agent's own Phase 1 fix broke AD-1; the admin guard moves to `adminProcedure` (Phase 2 gate — review E-23)

- **Phase:** 2.
- **Persona/Skill:** `bmad-review-edge-case-hunter` (E-23), on code written by the agent at #8.
- **AI output (summary):** Review F-01 (#8) moved the admin check into `identity.requireAdmin`. But `assertCatalogAdmin` still lived in `catalog` and called it, which gave `catalog` a runtime dependency on `identity`. AD-1's graph gives `catalog` **no** module dependencies (ARCH §6.3). Options: move the guard to the `adminProcedure` driving adapter *(recommended)*; or amend AD-1 with a `catalog → identity` edge.
- **Human decision:** ACCEPT moving it to `src/server/trpc/admin-guard.ts`.
- **Reason:** Amending an inherited invariant needs "an explicit, logged decision and a stated reason" (Plan-2 constraint 8). There is no reason to pay that cost, because admin gating is a transport concern that the procedure builder already owns (AD-SYS-8 rule 1). `catalog` stays testable with no `identity` fake.
- **Artifact changed:** `src/server/trpc/admin-guard.ts` (new); `catalog/ports/cat.ts`, `application/cat.ts`, `index.ts`, `dto/cat.dto.ts` (port removed); `contracts.md` §3; `ports-and-adapters.md` §3.

---

### 16. Test-quality review triage: 6 Accept (one `[CORRECTED]` test design), 1 Defer, 1 `[REJECTED]` (Phase 3 gate)

- **Phase:** 3.
- **Persona/Skill:** Murat (`bmad-testarch-test-review`, report 3 of 4, a self-review scored by the skill's deduction ledger).
- **Prompt (summary):** Mateo directs: *"review 853449c:docs/solu-1/tests/atdd/ (12 files, 130 red tests) plus test-support/ for determinism, isolation, assertion depth, tautologies (assertions on fakes we configured), hidden assertions, length; score and list findings for triage."*
- **AI output (summary):** **65/100, grade D, verdict Request Changes.** The deductions:
  - one CRITICAL C3 tautology the agent itself had written in `dsc` (`expect([valentina, andres]).toHaveLength(2)`, which cannot fail);
  - two M2 repeated-payload findings;
  - one M3 two-scenarios-in-one-test finding.

  Four further findings, outside the registry, came with recommendations.
- **Human decision:** ACCEPT the triage in full ("Adopt in full (Recommended)"). The offered alternative of building the Decision-shape assertions (T-07) now was not taken.
- `[CORRECTED]` **T-05: assertions on the test double.** Four contract tests asserted the `EventDelivery` subscriber list. That list is produced by `test-support/outbox.ts`'s `SUBSCRIBERS` table, so those assertions checked the double, not the code under test. They were replaced by event-type and payload assertions, which the code under test does decide.
- **Deferred:** T-07 (full AD-SYS-1 `Decision` shape on every refusal) goes to Solu-2's mandatory `explain_assert` fixture, built once instead of patched into 130 tests.
- `[REJECTED]` **T-08:** *"split `test-support/seed.ts` (341 lines)"*. H5's 300-line rule targets test files. `seed.ts` is a flat vocabulary of 25 independent single-table factories, each under 25 lines. Splitting it per module would scatter the Given steps every module needs at once: an ORD test needs users, listings and units.
- **Result:** rescored **100/100, grade A, Approve**. The red check reports 131/131 red for the right reason; the M3 split added one test.
- **Artifact changed:** `dsc`, `inv`, `ver`, `com`, `trd` ATDD files; `reviews/review-atdd-test-quality.md` (triaged and rescored); `package.json` and CI (minimum 131 tests).

### 17. The framework skill is run in Validate mode, so the TEA matrix reports a real run (Phase 3 gate)

- **Phase:** 3.
- **Persona/Skill:** Murat (`bmad-testarch-framework`, Validate mode).
- **AI output (summary):** The agent flagged its own process gap before writing the TEA matrix. The harness had been built inside the ATDD workflow's prerequisite step, but `bmad-testarch-framework` was never invoked. The matrix row was therefore written as "applied in the ATDD prerequisite step; skill not invoked separately". Options: run the skill in Validate mode now *(recommended)*; leave the row as documented.
- **Human decision:** ACCEPT, run it now.
- **Reason:** A matrix row in which a skill is claimed without a run is the same failure the rubric penalizes as "gate verdict claimed without output". The validation found two real gaps, a missing `.env.example` and a missing test README, plus no JUnit reporter for CI. All three were fixed in the same run.
- **Artifact changed:** `853449c:docs/solu-1/tests/framework-validation-report.md` (PASS after fixes); `.env.example`; `test-support/README.md`; `.github/workflows/solu1-quality-gate.yml`; `tests/tea-skill-matrix.md` (TF row).

---

### 18. `[CORRECTED]` A deterministic readiness audit gates sprint planning; 12 epics × 37 stories; traceability scoped to contract-bound FRs (Phase 4 — pre-draft gate)

- **Phase:** 4.
- **Persona/Skill:** John and Amelia (`bmad-create-epics-and-stories`); Winston for the gate mechanism.
- **Prompt (summary):** Mateo directs: *"derive contract-bound technical stories from contracts.md using the Solu-1 story template; one epic per module in AD-1 dependency order; John (PM) + Amelia (Dev) review for implementability."*
- **AI output (summary):** Three items went to the gate.
  - **(a) The gate.** The agent found at intake that the installed `bmad-sprint-planning` has no readiness audit, while the statement requires it to print IR-PASS. Options: a deterministic audit script wired in through BMAD's supported `_bmad/custom` override *(recommended)*; `bmad-check-implementation-readiness` as an LLM verdict; or both.
  - **(b) Epic design.** 12 epics (one per module) and 37 stories (one per contract) *(recommended)*, or 9 host-module epics.
  - **(c) Traceability scope.** "100 %" measured over the FRs the contracts bind *(recommended)*, or stories for every PRD FR without contracts.
- **Human decision:** ACCEPT (a), (b) and (c), at the choice menus.
- `[CORRECTED]` **The agent's own figure.** The agent first told Mateo that the contracts bind "46 of ~99 FRs". That was an estimate. A script then counted **56 of 96**: the first pass had matched `FR-INV-1` inside `NFR-INV-1` and missed a second header line. The decision stands; the backlog, the audit and the report carry the exact numbers, and the 40 out-of-scope FRs are listed by id.
- **Reason:**
  - (a) A gate is only evidence if it is reproducible and can fail. An LLM verdict cannot be re-run with the same result, and the gate drill would depend on the model noticing.
  - (b) A 1:1 contract → story → ATDD-block map is exactly what the audit checks.
  - (c) Stories without P/Q/I would break the rule "contracts before stories".
- **Artifact changed:** `scripts/readiness-audit.mjs`; `_bmad/custom/bmad-sprint-planning.toml`; `853449c:docs/solu-1/planning/epics.md`; `853449c:docs/solu-1/planning/readiness-gate-report.md`.

### 19. Story review triage: 9 Accept, 2 Defer, 1 `[REJECTED]`; gate drill by DTO rename (Phase 4 gate)

- **Phase:** 4.
- **Persona/Skill:** `bmad-review-adversarial-general` (report 4 of 4) on `epics.md`, run after the audit's first IR-PASS so that it could hunt what the audit cannot see.
- **AI output (summary):** 12 findings. Two of them showed the first IR-PASS was blind:
  - **F-4:** stories consumed neighbour commands (`listings.releaseReservation`, `reserveForTrade`, `identity.getReviewTarget`, …) that no story produces;
  - **F-5:** the red check demanded that *every* ATDD test fail, so implementing the first story would have broken the gate.
- **Human decision:** ACCEPT the triage in full. For the drill, ACCEPT "rename a DTO in one story (Recommended)".
- `[REJECTED]` **F-11:** *"sprint keys will be long"*. Keys are generated once and never typed, and a full title is self-describing in `sprint-status.yaml`. Shortening titles to shorten keys would make the backlog worse at its main job.
- **What the accepted fixes changed:**
  - a Consumed ports line on 11 stories, plus audit check C9, which was verified to fail when one line is removed;
  - a status-aware red check (tests of `done` stories must pass), verified with a scratch status;
  - a backlog Definition of Done;
  - audit check C10 (code citations);
  - real dependencies only;
  - NFR-IDN-2's 100 repetitions.
- **The drill (§3 of the gate report):** Story 4.2's Target DTO was renamed and the gate re-run, giving **IR-FAIL** in 8 s (`[C3 schema/DTO binding] Story 4.2 names DTO ReserveForPurchaseInputDTO, which no src file exports`), with `sprint-status.yaml` byte-identical. After the name was restored, the gate returned **IR-PASS** in 8 s.
- **Artifact changed:** `epics.md`; `idn-contracts.test.ts`; `scripts/check-atdd-red.mjs`; `scripts/readiness-audit.mjs`; `reviews/review-stories-adversarial.md` (triaged); `implementation-artifacts/sprint-status.yaml` (generated after IR-PASS).

### 20. Commits are atomic, with short summary titles (process — Mateo's own instruction)

- **Phase:** process (Phase 4 onward).
- **Source:** Mateo's words, mid-Phase 4: *"from now on keep the commit names more atomic without the solu-# and phase #, just a short summary of what was made."*
- **Human decision:** a new rule, not an AI proposal. From that point every commit is one logical change, with a title such as "Add the readiness gate report" or "Make the red check follow sprint status".
- **Reason:** the history should read as what changed, not as course bookkeeping.
- **Artifact changed:** git history from commit `4cf53eb` ("Add contract-bound epics and stories") onward.

**Open at the time of writing:** the readiness gate report's sign-off (§5) is pending Mateo's explicit sign-off. It is not inferred from his instruction to push the branch.
