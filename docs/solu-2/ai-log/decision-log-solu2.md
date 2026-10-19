# Decision Log — Solu-2 (All 12 Modules, Single Package)

**Scope:** TEZG Solu-2: detailed design, test preparation and backlog for all 12 Plan-2 modules (`docs/solu-2/task-statement.md`). The Plan-2 entries stay in `docs/plan-2/ai-log/decision-log.md`, and Solu-1's in `docs/solu-1/ai-log/decision-log-solu1.md`.
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

---

### 1. `[REJECTED]` Solu-2 covers all 12 modules, not the recommended purchase spine (Phase 0 — Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Mateo directs: analyse Task 2 and implement everything it asks for, for the Pokémon project.
- **AI output (summary):** Solu-2 asks for 3+ core operations and 9–16 stories for **one** module, and Plan-2 covered 12. The agent recommended scoping Solu-2 to the purchase spine INV + ORD + COM: three Advanced modules with three mandatory edge cases, one shared walking skeleton (Camila → Andrés → Sebastián), and the rubric's 3–4 epics / 9–16 stories as written. The alternatives offered were "INV only" and "ORD + COM + TRD".
- **Human decision:** REJECT. Mateo first accepted the recommendation. Then, while scoping Solu-1, he stated the rule for both packages in his own words: *"these solus are made for that solar project which has various modules and each group should only focus on one but we are doing a completely different project … so instead of doing just one module of our project we want to cover all its modules, do it in a way it is complete and follows each solu intent."* Asked whether that applied to Solu-2 too, he chose "Solu-2 also all 12 modules" over "keep the spine".
- **Reason:** TEZG is the pair's own 12-module product. A spine-only Solu-2 would leave 9 modules with no detailed design, test plan or backlog, which contradicts the Plan-2 single-package decision (Plan-2 log #1). The cost, a much larger package, is accepted. The rubric's counts are read per module (Appendix B of the statement).
- **Artifact changed:** `docs/solu-2/task-statement.md` (Appendix B).
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
- **What changed:** "39" → "37" in `task-statement.md`, `docs/solu-2.md`, `reviews/review-arch-implementability.md` and `contracts.md`. G-07 carries a correction note. Entry #2's heading points here, and its body stays as written. The memlog keeps its original line plus a correction line.
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
