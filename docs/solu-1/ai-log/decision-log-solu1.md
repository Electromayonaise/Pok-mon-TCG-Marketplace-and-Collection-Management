# Decision Log — Solu-1 (All 12 Modules, Single Package)

**Scope:** TEZG Solu-1, contract-driven solutioning for all 12 Plan-2 modules (`docs/solu-1/task-statement.md`).
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

---

### 1. `[IMPROVED]` Solu-1 is implemented here, for all 12 modules (Phase 0 — Scope)

- **Phase:** 0 (intake).
- **Persona/Skill:** none (session intake).
- **Prompt (summary):** Mateo directs: analyse the repository, check that Task 1 (Solu-1) is implemented and its deliverables exist, then start Task 2.
- **AI output (summary):** The repository scan found no Solu-1 deliverable anywhere: no contracts, DDL, DTOs, ATDD tests, `epics.md` or `sprint-status.yaml`. The agent asked what to do and offered three options: *done elsewhere, skip it* (Solu-1's own text says it was done individually on Smart Solar Flow); *implement it for TEZG*; *fold it into Task 2 with a coverage map*.
- **Human decision:** MODIFY. Mateo chose to implement it for TEZG, and then widened the scope beyond any offered option to cover all 12 modules. Asked which reading he meant, he wrote: *"these solus are made for that solar project which has various modules and each group should only focus on one but we are doing a completely different project as you know so there are various modules we need to also complete so instead of doing just one module of our project we want to cover all its modules, do it in a way it is complete and follows each solu intent."*
- **Reason:** TEZG is the team's own 12-module project, and Plan-2 already planned all 12 modules as one package (Plan-2 decision log #1). Doing one module would leave 11 without contracts, schemas or tests.
- **Artifact changed:** `docs/solu-1/task-statement.md` (adapted statement; Appendix B records the single-package reading of every rule).

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
- **Prompt (summary):** Mateo directs: *"derive Design-by-Contract P/Q/I for 3 core functions per Plan-2 module (36 total) of TEZG, per docs/solu-1/task-statement.md §3, bound to the Plan-2 ARCHITECTURE.md AD-n and the ADD-§3 DomainError registry."*
- **AI output (summary):** Winston proposed a guard, a contended mutation and a resolver for each module (the table in §0 of `contracts.md`). He flagged that DSC and VAL have no state (see #4).
- **Human decision:** ACCEPT the direction. The selection itself is #5.
- **Reason:** Binding every clause to an existing code, column and AD keeps Solu-1 from inventing a second, conflicting design next to Plan-2.
- **Artifact changed:** `docs/solu-1/planning/contracts.md`.

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
- **Artifact changed:** every file in `docs/solu-1/planning/schemas/`; conventions in `schemas/README.md`.

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
- **Artifact changed:** `docs/solu-1/planning/schemas/*.sql`; the harness applies them with `pg`.

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
