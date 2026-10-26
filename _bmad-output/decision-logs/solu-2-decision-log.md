# Decision Log — Solu-2 (All 12 Modules, Single Package)

**Scope:** TEZG Solu-2: detailed design, test preparation and backlog for all 12 Plan-2 modules (`468acd9:docs/solu-2/task-statement.md`). The Plan-2 entries stay in `_bmad-output/decision-logs/plan-2-decision-log.md`, and Solu-1's in `_bmad-output/decision-logs/solu-1-decision-log.md`.
**Pair:** Martín Gómez, Mateo Rubio.
- **Architect-lead (Phases 0–2):** Mateo.
- **Test-lead (Phase 3):** Martín. His decisions are relayed by Mateo in session and attributed to Martín (#5).

**Operating rule (inherited from Plan-2 and Solu-1).** The agent drafts and recommends. A partner decides at a per-phase gate, through a choice menu or in his own words. This log records exactly what was decided and by whom. It never records an agent-inferred decision, and prompts are not reconstructed after the fact.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed · **Decided by**. AI proposals that were rejected, corrected or improved are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome | Decided by |
| --- | --- | --- | --- | --- |
| #1 | `[REJECTED]` | Scope Solu-2 to the INV+ORD+COM "purchase spine" | All 12 modules | Mateo |
| #7 | `[CORRECTED]` | "39 core operations"; review G-07's "two incompatible codes" | 37 operations; G-07 restated | Mateo |
| #8 | `[CORRECTED]` | Refinement R-7: `commission` refuses with identity's `NotBusinessAccount` | New code `CommissionAccountNotOpen`; R-7 amended | Mateo |
| #9 | `[REJECTED]` | Review E-3: add the H-console `dev.*` procedures to the registry and the OpenAPI | Kept out; the consoles are mapped to the operations they drive | Mateo |
| #9 | `[REJECTED]` | Review E-4: narrow `ContactRequestLog.kind` to `'purchase'` | Kept as Plan-2 defines it | Mateo |

---

### 1. `[REJECTED]` Solu-2 covers all 12 modules, not the recommended purchase spine (Phase 0 — Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Mateo directs: analyse Task 2 and implement everything it asks for, for the Pokémon project.
- **AI output (summary):** Solu-2 asks for 3+ core operations and 9–16 stories for **one** module, and Plan-2 covered 12. The agent recommended scoping Solu-2 to the purchase spine INV + ORD + COM: three Advanced modules with three mandatory edge cases, one shared walking skeleton (Camila → Andrés → Sebastián), and the rubric's 3–4 epics / 9–16 stories as written. The alternatives offered were "INV only" and "ORD + COM + TRD".
- **Human decision:** REJECT. Mateo first accepted the recommendation. Then, while scoping Solu-1, he stated the rule for both packages in his own words: *"these solus are made for that solar project which has various modules and each group should only focus on one but we are doing a completely different project … so instead of doing just one module of our project we want to cover all its modules, do it in a way it is complete and follows each solu intent."* Asked whether that applied to Solu-2 too, he chose "Solu-2 also all 12 modules" over "keep the spine".
- **Reason:** TEZG is the pair's own 12-module product. A spine-only Solu-2 would leave 9 modules with no detailed design, test plan or backlog, which contradicts the Plan-2 single-package decision (Plan-2 log #1). The cost, a much larger package, is accepted. The rubric's counts are read per module (Appendix B of the statement).
- **Artifact changed:** `468acd9:docs/solu-2/task-statement.md` (Appendix B).
- **Decided by:** Mateo.

### 2. 39 core operations approved (Phase 0.1) — *the count was wrong: 37, see #7*

- **Phase:** 0.
- **Persona/Skill:** Winston.
- **AI output (summary):** For each module, 3–4 operations that between them cover a raced, repeated or interrupted mutation (R), an explainable decision (E) and the Plan-2 Mandatory Edge Case (MEC); listed in Annex A of the statement. ORD has 4, so that the MEC's out-of-order half, deferred from Solu-1 (review F-7), has its own operations: `confirmPaymentReceived` and `confirmItemReceived`. DSC and VAL keep Solu-1's reading of the R slot as a concurrency-safe read (Solu-1 #4). The alternatives offered: ORD with 3 operations; free swaps.
- **Human decision:** ACCEPT as proposed.
- **Reason:** About half the operations differ from Solu-1's, because Solu-2's selection criteria (R, E, MEC) differ from Solu-1's (guard, contended mutation, resolver).
- **Artifact changed:** `task-statement.md` Annex A.
- **Decided by:** Mateo.

### 3. Every FR traces through a supporting contract (Phase 0 — scope of check 1)

- **Phase:** 0.
- **Persona/Skill:** Winston, with John.
- **AI output (summary):** Readiness check 1 requires all 96 PRD FRs to trace to a story, and every story needs an ATDD path. The core operations bind only part of them. Options:
  - **supporting contracts** *(recommended)*: compact P/Q/I, typed errors and AD binding, plus one happy and one failure red test for each FR the core operations do not bind;
  - **contract-bound traceability only**, as in Solu-1, with the deviation logged.
- **Human decision:** ACCEPT supporting contracts.
- **Reason:** It complies with check 1 literally, and it keeps "no story without a contract", the Solu-1 rule.
- **Artifact changed:** `task-statement.md` Appendix B; Phase 1 and Phase 4 scope.
- **Decided by:** Mateo.

### 4. A walking-skeleton epic plus one epic per module (Phase 0 — backlog shape)

- **Phase:** 0 (for Phase 4).
- **Persona/Skill:** John.
- **AI output (summary):** Options:
  - **Epic 1 as a cross-module walking skeleton** *(recommended)*: seed fixtures plus Camila buying Andrés's card end to end through IDN → INV → ORD → COM with simulated adapters. Epics 2–13 are one vertical epic per module, with 3–6 stories, a dedicated MEC story and ≥ 2 failure-state stories each;
  - 12 module epics, with the skeleton folded into IDN.
- **Human decision:** ACCEPT the skeleton plus 12 module epics.
- **Reason:** The statement wants the skeleton end to end through all layers. Inside IDN it would not reach orders or commission.
- **Artifact changed:** `task-statement.md` §7, Appendix B.
- **Decided by:** Mateo.

### 5. Martín's Phase 3 decisions are relayed by Mateo (Phase 0 — pair attribution)

- **Phase:** 0 (for Phase 3).
- **AI output (summary):** Martín, the Phase 3 Test-lead, is not in the session. Options: Mateo relays Martín's calls, attributed to Martín; or Mateo decides as Reviewer, and Martín adds his own entries later.
- **Human decision:** "I relay Martín's calls".
- **Reason:** It keeps the pair attribution true to who made each call.
- **Artifact changed:** this log's attribution rule.
- **Decided by:** Mateo.

### 6. Implementability gaps: 17 found, all accepted; `audit_events` and timestamps chosen; ARCHITECTURE v2 is a delta (Phase 0 gate)

- **Phase:** 0.
- **Persona/Skill:** `bmad-review-adversarial-general` (report 1 of 3), limited to implementability; Winston for the stack declaration.
- **Prompt (summary):** Mateo directs: *"adversarial review limited to implementability of the 39 core operations and of the Solu-2 deliverables (OpenAPI, events with schemaVersion, audit_events, ErrorBody/ExplanationDTO, updatedAt); list where a developer agent would have to invent a decision; carry Solu-1's deferred findings (E-15, T-07, F-7, F-12)."*
- **AI output (summary):** 17 gaps in `reviews/review-arch-implementability.md`, each with a resolution, a phase and an owner (A/B). Five are deliverables Plan-2 never had to define: the event envelope, the wire contract, `ErrorBody`, `audit_events`, timestamps. Seven leave a core operation open. Examples:
  - the business-before-paid code (G-07, Solu-1 F-7);
  - the buyer-cancel `cancelReason`, which Solu-1's own CHECK makes mandatory (G-08);
  - the source of AD-TRD-1's `version = :v`, without which the stale-tab guarantee is silently void (G-09);
  - a top-up confirmed before the commission account exists, which throws `'Unexpected'` (G-10).

  Two are stack and repository gaps (Prisma vs SQL; Solu-1 and Solu-2 sharing `src/`). Three carry Solu-1's deferrals E-15, T-07 and F-12. The agent also drafted the 5-line "Stack Decisions" in `planning/ARCHITECTURE.md`.
- **Human decision:** ACCEPT all 17 as recommended, plus three gate choices:
  - G-04: a `shared-kernel` `audit_events` table written through an `AuditLog` port, over "a view over the 10 module tables" and "replace the module tables";
  - G-05: `updatedAt` on mutable tables only, over "both columns on every table";
  - ARCHITECTURE v2: a delta document, over "full copy, then edit".
- **Reason:**
  - The view would cover admin actions only and is not a table. Replacing the module tables would discard their domain snapshots (EC-35).
  - An `updatedAt` on a table whose grants forbid `UPDATE` is a column that cannot mean anything.
  - A delta keeps Plan-2 as the signed-off baseline, with one place to read what changed.
- **Artifact changed:** `reviews/review-arch-implementability.md` (triaged); `planning/ARCHITECTURE.md` (Stack Decisions; refinements R-1..R-9).
- **Decided by:** Mateo.

### 7. `[CORRECTED]` Two of the agent's own Phase 0 errors: the operation count and review G-07 (Phase 1 gate)

- **Phase:** 1.
- **Persona/Skill:** Winston, while deriving `contracts.md`.
- **What was wrong:**
  - **(a) The count.** Entry #2, the statement (§1, Appendix B), the deliverable map and the implementability review all said "39 core operations". Annex A lists 11 modules × 3 plus ORD × 4, which is **37**. The agent found it when the assembled `contracts.md` had 37 `### Operation:` sections, not 39. Nothing was missing: the table was always 37 rows, and the total was miscounted when it was first written.
  - **(b) Review G-07.** It claimed the ORD edge case "business confirms before paid" had "two incompatible codes". While writing ORD-3, the agent read PRD FR-ORD-4, which already states `OrderNotVisibleToCaller`. Only ARCHITECTURE is silent, so the finding overstated the ambiguity. Its resolution (R-4) was right and is unchanged.
- **Human decision:** "Log both as `[CORRECTED]`", over "fix silently".
- **What changed:** "39" → "37" in `task-statement.md`, `853449c:docs/solu-2.md`, `reviews/review-arch-implementability.md` and `contracts.md`. G-07 carries a correction note. Entry #2's heading points here, and its body stays as written. The memlog keeps its original line plus a correction line.
- **Reason:** a decision log that silently rewrites its own numbers cannot be audited. The miscount had not yet reached any count-dependent artifact (stories, audit thresholds), so correcting it now costs nothing downstream.
- **Decided by:** Mateo.

### 8. Contracts approved; four contract gaps adopted, one of them `[CORRECTED]`s accepted refinement R-7 (Phase 1 gate)

- **Phase:** 1.
- **Persona/Skill:** Winston (`bmad-agent-architect`).
- **Prompt (summary):** Mateo directs: *"derive the Solu-2 contracts for the 37 core operations in the full template (Layer, P with typed error and HTTP, Q1–Q4 and Q-fail, I bound to AD, concurrency, time, latency), the typed error catalog, an invariant binding table covering every AD, and supporting contracts so all 96 FRs trace."*
- **AI output (summary):** `planning/detailed-design/contracts.md`, with:
  - the 37 operations, 17 of them restated from Solu-1;
  - an error catalog of 88 codes plus `'Unexpected'`, each with an es-CO template and a retryable flag;
  - a binding table with one row for each of the 60 ADs plus R-2;
  - 39 supporting contracts covering the 38 FRs the core operations leave unbound (FR-TRD-2's withdraw and reject get their own).

  Four gaps went to the gate:
  - C-GAP-1 `AccountNotFound`;
  - C-GAP-2 `InvalidAcquiredDate`, because the parser cannot read the `Clock`;
  - C-GAP-4 a business's mute as an explained no-op;
  - **C-GAP-3**, which says the agent's own R-7, accepted at the Phase 0 gate, would make `commission` raise `NotBusinessAccount`, an `identity` code. AD-SYS-1 rule 2 and lint `tezg/error-owner` forbid that.
- **Human decision:**
  - C-GAP-3: "new commission code" (`CommissionAccountNotOpen`, `CONFLICT`, retryable), over "open the account on demand" (it would break AD-COM-1 rule 5) and over "keep R-7".
  - C-GAP-1, C-GAP-2 and C-GAP-4: ACCEPT.
  - Contracts: approved for Phase 2.
- **Reason:** R-7 as first worded would have failed CI's owner check on the first implementation. Opening accounts on demand would give `commission` a second account-creation path that AD-COM-1 rule 5 exists to prevent.
- **Artifact changed:** `planning/detailed-design/contracts.md` (final); `src/shared-kernel/codes.ts` (the ADD-§3.1 rows the contracts cite, plus the three new codes); `planning/ARCHITECTURE.md` (R-7 amended, R-10, R-11); `reviews/review-arch-implementability.md` (G-10 note).
- **Decided by:** Mateo.

### 9. Detailed design approved: 12 review findings accepted, 2 `[REJECTED]` (Phase 1–2 gate)

- **Phase:** 2.
- **Persona/Skill:** Winston (`bmad-architecture`) for the design. Report 2 of 3 ran three passes: `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`, and Amelia (`bmad-agent-dev`) auditing the simulated adapters.
- **Prompt (summary):** Mateo directs: *"build the Phase 2 detailed design for all 12 modules (hexagonal map with every component once, one schema with every Plan-2 entity, DTOs with ErrorBody and ExplanationDTO, events with eventId, occurredAt and schemaVersion, OpenAPI for every ingress procedure and error), the interface stubs and the simulated adapters; then review it adversarially and for edge cases, and have Amelia audit the adapters."*
- **AI output (summary):**
  - `001_tezg_schema.sql`: 55 tables, 271 CHECKs, applied twice to Postgres 16 without error.
  - `schemas/operations.json`, the single source for `openapi.yaml`, `dto.ts`, the v2 stubs and the neighbour ports (`scripts/gen-solu2-api.mjs`, with `--check` for drift). After this gate it holds 142 operations, 111 procedures and 159 schemas.
  - `events.md`, `ports-and-adapters.md`, the external ports and their simulated adapters, and `check-domain-purity.mjs`.
  - `ui-states.md`, generated by `check-ui-states.mjs`. Its first run showed that 16 Plan-2 read procedures (for example the top-up queue, `trading.mine` and `reasons.list`) were missing from the registry, and that two reads the UI needs (`collections.list`, `reputation.eligibility`) are named nowhere in Plan-2. All 18 were added with contracts (§15.12).

  The review raised 14 findings (count corrected in Phase 4, when the readiness audit cross-checked the triage table: this entry first said 16 findings and 14 accepted):
  - 5 adapter defects, 3 of them reproduced: a scanner that called a PNG without `IEND` clean after truncating it to 7 bytes; a feed whose fault switches contradicted ADD-§8.3; a float-parsed TRM;
  - 5 adversarial: contract/DTO name drift; an OpenAPI without value constraints; audited reads over GET; raw `Sql` in application services; Better Auth IP tracking;
  - 4 edge cases: shared operations without fixed inputs; a UI classifier that failed open; `dev.*`; a dead enum value.
- **Human decision:** ACCEPT the triage as recommended, with three gate choices:
  - A-2: JSDoc constraint tags now, over "defer to zod";
  - A-4: a repository port per module, over "keep `Sql` in deps";
  - E-3: keep `dev.*` out, over "add them".
- `[REJECTED]` **E-3, add the `dev.*` H-console procedures to the registry and the OpenAPI.** The `dev` router is mounted only when `TEZG_DEV_SURFACES=true`, and a build test asserts that production has no `dev.*` key (ARCH §9.2, S-11). `openapi.yaml` describes the deployment's ingress. Listing test tooling there would document endpoints that must not exist in production, and invite clients to call them. The 8 console pages stay mapped to the core operations they drive (`dev: true` in `ui-states.json`), which is what their states render.
- `[REJECTED]` **E-4, narrow `ContactRequestLog.kind` to `'purchase'`.** The column mirrors Plan-2's data model (§6.9). Narrowing it would make the schema diverge from Plan-2 for no safety gain: a stray `'trade'` row would only be counted under the same per-requester limits.
- **Reason:** each Accept closes a gap a developer agent would otherwise have filled by guessing (S-1, E-1), or a test double that would have let a test pass for the wrong reason (S-3).
- **Artifact changed:** `reviews/review-detailed-design.md` (triaged); `test-support/simulated/index.ts`; `src/shared-kernel/events.ts`; `scripts/gen-solu2-api.mjs`; `scripts/check-ui-states.mjs`; `schemas/{operations,ui-states}.json` and the generated files; `contracts.md`; `ports-and-adapters.md`; `ARCHITECTURE.md` (R-12..R-14).
- **Decided by:** Mateo.

### 10. Test preparation scope: full ATDD, red NFR benchmarks, a separate Solu-2 CI gate (Phase 3, pre-draft)

- **Phase:** 3.
- **Persona/Skill:** Murat (`bmad-tea`), with `bmad-testarch-test-design`, `-atdd` and `-ci` scoping.
- **Prompt (summary):** Mateo relays Martín's direction: *"scope the Solu-2 test preparation: ATDD depth, how NFR evidence is produced, and where the CI gate runs."*
- **AI output (summary):** Three options went to the gate:
  - **(a) ATDD scope:** *full*, meaning core operations (happy, precondition violation, invariant under concurrency, repetition or boundary) + 12 MECs + 1 happy and 1 failure test per supporting contract, about 290 red tests *(recommended)*; or core and MEC only, about 125, with the supporting tests left for the stories.
  - **(b) NFR evidence:** a plan plus red benchmarks for three representative NFRs (latency, reliability, security) *(recommended)*; or a plan only.
  - **(c) CI:** a new Solu-2 workflow *(recommended)*; or extending Solu-1's.
- **Human decision:** ACCEPT (a) full, (b) plan + red benchmarks, and (c) a new workflow.
- **Reason:** with the full scope, every test id that `contracts.md` §14 and §15 cite exists, so the trace can prove "no AD without a red test" mechanically instead of by promise. Red benchmarks make the three NFR rows executable evidence rather than prose. A separate workflow keeps Solu-1's gate exactly as it was signed off.
- **Artifact changed:** the Phase 3 plan (`test/test-design.md`, `test/atdd/`, `test/nfr-evidence.md`, `.github/workflows/solu2-quality-gate.yml`).
- **Decided by:** Martín (Test-lead), relayed by Mateo.

### 11. Test-review triage: all 19 findings accepted; oversize suites split into core and supporting (Phase 3 gate)

- **Phase:** 3.
- **Persona/Skill:** Murat (`bmad-testarch-test-review`, Create mode), over the 18 Solu-2 test files.
- **Prompt (summary):** Mateo relays Martín's direction: *"review _bmad-output/test-artifacts/ plus the Solu-2 test support for determinism, isolation, assertion depth, tautologies, hidden assertions, red-for-the-right-reason quality, race flakiness and length; score it and list findings for triage at the Phase 3 gate."*
- **AI output (summary):** 32/100 (F). The computed verdict was Request Changes. The findings:
  - **12 HIGH:**
    - 5 conditional assertions, each able to pass on broken behaviour once implemented: `[REP-1.MEC]` gated on `i === 0`, `[COM-3.Q4]`, `[DSC-1.I4]`, `[IDN-3.I3]`, `[MSG-2.MEC]`;
    - 1 module-level map mutated by `[REP-3.MEC]`;
    - 6 files over 300 lines.
  - **6 MEDIUM:** request literals repeated inline.
  - **1 LOW:** a magic constant.

  No critical finding: the C4/C5 scan was clean over all 366 test bodies. Three options went to the gate, each with a recommendation:
  - **(a) H3/H4:** fix now *(recommended)*, defer to the story DoD, or reject.
  - **(b) H5:** split supporting contracts into `<module>_supporting.test.ts` *(recommended)*, accept oversize, or split per operation.
  - **(c) M2/L6:** fix now *(recommended)*, defer, or reject.
- **Human decision:** ACCEPT (a) fix now, (b) split the supporting contracts, and (c) fix now.
- **Reason:** the H3 findings sit in P0 MEC tests (R-12, R-09, R-04), so a false pass there would hide exactly the edge case the module was chosen to prove. The split keeps the statement's `<module>_contracts.test.ts` path for the core operations and leaves every test id unchanged, so the trace and the red check need no edit. Builders cost minutes now, and save every Phase 4 story from editing six copies of a request.
- **Outcome:**
  - 351 tests in 19 files, all red for the right reason;
  - re-review 100/100 (A, Approve);
  - `gate:ids:solu2` and `gate:trace:solu2` unchanged at 370 ids, 96/96 FRs, 61/61 ADs, 15/15 P0 risks.
- **Artifact changed:** `_bmad-output/test-artifacts/atdd/` (fixes; six new `*_supporting.test.ts`); `contracts.md` §0, §14 (both test paths); `test/test-design.md`; `test/traceability-matrix.md`; `reviews/review-test-quality.md` (triage and re-review).
- **Decided by:** Martín (Test-lead), relayed by Mateo.

### 12. Backlog design approved: walking skeleton plus 12 module epics, MSG ordered before TRD (Phase 4 design gate)

- **Phase:** 4.
- **Persona/Skill:** John (`bmad-agent-pm`) with `bmad-create-epics-and-stories`, steps 1–2.
- **Prompt (summary):** Mateo directs: *"derive the Solu-2 backlog from contracts.md per decision #4: Epic 1 a cross-module walking skeleton, Epics 2–13 one vertical epic per module in AD-1 order, each with 3–6 stories, a MEC story and ≥ 2 failure-state stories, and no forward dependency. Every story carries the Annex B fields, all 96 FRs trace to a story, and every §14 AD appears in a story with a red test."*
- **AI output (summary):** 13 epics and 69 stories, each binding exact registry operations and red test ids (each id to exactly one story). Two dependency problems the module order would hide surfaced before writing:
  - `TRD-1`'s accept calls the contact handoff (`MSG-2`, hosted in `listings`), so TRD before MSG would point forward. AD-1 has no `trading`↔`messaging` edge, so MSG can precede TRD. Proposed order: IDN, VER, CAT, INV, DSC, ORD, COM, MSG, TRD, COL, VAL, REP.
  - `[IDN-1.MEC]` raced VER's `submitApplication`, a cycle across Epics 2 and 3 hidden in a test. Fixed by racing at the claim level, as the IDN-1 clause states, and moving the end-to-end race to `[VER-2.I2]` (commit `66059fb`).

  Three questions went to the gate:
  - **(a) order:** MSG before TRD *(recommended)*, or keep the PRD order with a waived forward dependency;
  - **(b) design:** approve *(recommended)*, merge failure stories into fewer, larger ones, or change it;
  - **(c) inputs:** complete *(recommended)*, or add documents.
- **Human decision:** ACCEPT (a) MSG before TRD, (b) approve the design as proposed, and (c) the input set is complete.
- **Reason:** every Depends-on can point backward, so "no forward dependency" holds by construction rather than by waiver. One-story-per-test-set makes "done" a precise, gate-checked fact.
- **Artifact changed:** `planning/epics.source.mjs`, `scripts/gen-solu2-epics.mjs`, `planning/epics.md` (generated), `test/atdd/{idn,ver}_contracts.test.ts`, `contracts.md` (VER-2 concurrency clause).
- **Decided by:** Mateo.

### 13. Backlog review triaged: 9 accepted, 2 `[REJECTED]`; readiness IR-PASS (Phase 4 gate)

- **Phase:** 4.
- **Persona/Skill:** John (`bmad-agent-pm`) and Amelia (`bmad-agent-dev`), backlog implementability review; `bmad-sprint-planning` with the readiness-audit prepend.
- **Prompt (summary):** Mateo directs: *"have John and Amelia review the backlog for implementability, then extend the readiness audit to the docs/solu-2 package (the statement's six checks), run sprint planning and write the gate report with a drill."*
- **AI output (summary):** 11 findings (`reviews/review-epics.md`), 9 applied as recommended:
  - B-1: the red check now marks Solu-2 stories done by ATDD path id;
  - B-2: the DoD points at `npm run gate:atdd-red:solu2`;
  - B-3: five real port dependencies are declared;
  - B-4: the IDN MEC is re-scoped;
  - B-7 to B-11: documented, with B-11 correcting decision #9's count from 16 to 14 findings.

  Two went to the gate (B-5, B-6, below). The new Solu-2 audit returned IR-PASS:
  - C1 96/96 FRs;
  - C2 43/43 pages;
  - C3 61/61 AD rows;
  - C4 94 backward dependencies;
  - C5, C6 and C7 pass.

  Sprint planning wrote `sprint-status.yaml` (13 epics, 69 stories). A 3-defect drill turned each planted defect into IR-FAIL.
- **Human decision:**
- `[REJECTED]` **B-5, create each table in the first story that needs it** (the epics skill's step 4 rule). One SQL-first `001_tezg_schema.sql` stays (R-8, Appendix B). It was approved in Phase 2, and its 271 CHECKs are proven by Phase 3's fitness and seed tests. Re-cutting it into per-story migrations would re-sequence the harness for no new guarantee. Stories name the tables they read and write.
- `[REJECTED]` **B-6, split Story 7.2 (the ORD MEC).** The MEC is about the three order facts in any order. They share one visibility predicate and one conditional-update pattern, so a split would spread one invariant across two stories.
- **Sign-off:** Mateo signed off the Solu-2 readiness gate (`planning/readiness-gate-report.md` §6). In the same gate he signed off Solu-1's readiness report, which had been pending since that package; its gate still passes (32 green, 131 red).
- **Reason:** both rejections keep a single source of truth (one schema, one MEC story per invariant) over a generic rule of the skill. The accepted fixes close the gaps through which a finished story could still have read as unfinished.
- **Artifact changed:** `reviews/review-epics.md`; `scripts/check-atdd-red.mjs`, `scripts/readiness-audit{,-solu2}.mjs`, `scripts/gen-solu2-trace.mjs`; `package.json`; `implementation-artifacts/sprint-status.yaml`; `planning/readiness-gate-report.md`; the triage status lines of the four reviews; decision #9 corrected.
- **Decided by:** Mateo.
