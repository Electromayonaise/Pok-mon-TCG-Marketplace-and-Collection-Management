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

### 2. 39 core operations approved (Phase 0.1)

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
