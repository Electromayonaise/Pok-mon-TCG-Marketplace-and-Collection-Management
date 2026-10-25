# AI Decision Log — Impl-1 (Foundation Build, all 12 modules)

**Scope:** TEZG Impl-1: the scaffold and 43 of the 69 Solu-2 stories, built through the BMad Full Ceremony (`docs/impl-1/task-statement.md`). Earlier entries stay in `docs/plan-2/ai-log/decision-log.md`, `docs/solu-1/ai-log/decision-log-solu1.md` and `docs/solu-2/ai-log/decision-log-solu2.md`.
**Pair:** Martín Gómez, Mateo Rubio. In Impl-1, Martín takes the decisions this log records.

**Operating rule (inherited).** The agent drafts and recommends. Martín decides, through a choice menu or in his own words, at the scope stage and at each epic gate. This log records exactly what was decided and by whom. It never records an agent-inferred decision, and prompts are not reconstructed after the fact.

**Entry fields:** Phase · Persona/Skill · Prompt (summary) · AI output (summary) · Human decision (ACCEPT / MODIFY / REJECT) · Reason · Artifact changed · **Decided by**. AI proposals that were rejected, corrected or improved are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Outcome | Decided by |
| --- | --- | --- | --- | --- |
| #2 | `[CORRECTED]` | Impl-1 = skeleton + Core, Supporting and one Failure-state per module (41), with every MEC moved to Impl-2 | Not dependency-closed; replaced by the 43-story dependency cut | Martín |
| #3 | `[IMPROVED]` | "API only; pages left for a later task" | The front end gets an owner: its own phase after Impl-2 | Martín |

---

### 1. Impl-1 covers all 12 modules, and the project must end up with every story (Scope)

- **Phase:** 0 (statement adaptation).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Martín attaches the Impl-1 course statement and asks to adapt it to this repository. In his words: *"a diferencia del enunciado nosotros debemos de hacer todos los modulos y todas las hus (es un proyecto solo de los 2, que la idea es que quede completo)"*. He asks for the adaptation in a new folder and for the important decisions to be put to him, because this log must record his decisions.
- **AI output (summary):** The agent explained what Impl-1 asks for: a runnable hexagonal scaffold, 3 core stories of one module, ≥ 90 % passing tests, `sprint-status.yaml`, a walkthrough and this log. It noted that failure recovery and advanced testing are explicitly Impl-2's, then put the open decisions to Martín: the story cut, UI, deployment and gate cadence.
- **Human decision:** All 12 modules and, across Impl-1 and Impl-2, all 69 stories.
- **Reason:** TEZG is the pair's own product, not one module of a shared system, so a one-module slice would leave it incomplete. This is the same reading Plan-2 #1 and Solu-2 #1 made.
- **Artifact changed:** `docs/impl-1/task-statement.md` (scope note, Appendix B).
- **Decided by:** Martín.

### 2. `[CORRECTED]` The Impl-1 story cut: from "3 per module" to the dependency-closed 43 (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning), reading `docs/solu-2/planning/epics.md`.
- **Prompt (summary):** Which stories enter Impl-1, given that the statement leaves failure recovery and advanced testing to Impl-2?
- **AI output (summary):** The agent offered three cuts and recommended **B**: Epic 1 plus 3 stories per module (a Core, a Supporting and a validation Failure-state), 41 in all, with the MEC stories and the remaining Failure-state stories moved to Impl-2. The alternatives were **A**, all 69 now, and **C**, skeleton plus Core and MEC.
  - Martín chose B.
  - Before writing anything, the agent extracted every story's `Depends on` line and found that B is not buildable. Several Core stories depend on MEC stories that B moved out:
    - 3.1 ← 2.2;
    - 8.1 and 9.1 ← 3.2;
    - 4.4 and 4.5 ← 4.2, and 5.1 ← 4.5;
    - 7.1 ← 5.2;
    - 13.1 ← 7.5 ← 7.2.
  - The recommendation had been made without checking dependencies. The corrected proposal is the dependency cut: skeleton + every Core + every MEC, plus the 8 stories those need (2.3, 2.5, 3.5, 4.4, 4.5, 5.6, 6.1, 7.5). That gives 43 stories, and Impl-2 keeps the other 26 Failure-state and Supporting stories. The alternative offered was all 69 now.
- **Human decision:** ACCEPT the dependency cut (43). This replaces his earlier choice of B.
- **Reason:** It is the only cut where no Impl-1 story depends on an Impl-2 story. A script check over `epics.md` found no Impl-1 story with an Impl-2 dependency. What Impl-2 inherits is what the course assigns it: refusals, recovery and advanced testing.
- **Artifact changed:** `docs/impl-1/task-statement.md` Appendix B.
- **Decided by:** Martín.

### 3. `[IMPROVED]` API only in Impl-1 and Impl-2; the front end is its own phase after Impl-2 (Scope)

- **Phase:** 0.
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Do we build UI in Impl-1? Plan-2 specifies 43 pages, but the statement only requires endpoints.
- **AI output (summary):** The agent recommended API only, and left the pages "for a later task".
  - Martín asked: *"aqui si hacemos solo api se cubre el front despues en algun punto? o no sabemos?"*
  - The agent answered that no course statement we have covers the front end. The Impl-1 statement mentions only Impl-2's failure recovery and advanced testing, so the "later task" had no owner.
  - It re-asked with three options: API now with the front end as a phase of its own after Impl-2 *(recommended: pages also render error states, so building them before Impl-2's refusals exist means rebuilding them)*; pages with each Impl-1 story; or all pages inside Impl-2.
- **Human decision:** ACCEPT API now, front end after Impl-2.
- **Reason:** Martín's question turned an open deferral into a planned phase. The project stays complete without the course having to ask for it.
- **Artifact changed:** `docs/impl-1/task-statement.md` (§1, Appendix B.3).
- **Decided by:** Martín.

### 4. Run locally only, through Docker Compose (Scaffold)

- **Phase:** 0 (for Phase 1).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** Where does the app run in Impl-1?
- **AI output (summary):** The agent recommended local only. `docker compose up` brings up Postgres 16 and the app, and one `npm` command runs everything. The reason given: the statement grades a deterministic one-command local run, and a real deployment brings in credentials and external services. The alternative offered: also deploy to Vercel Hobby + Supabase, as Plan-2's ARCHITECTURE describes.
- **Human decision:** ACCEPT local only.
- **Reason:** Determinism and a clean-clone run are what the checklist verifies. A deployment is left for later.
- **Artifact changed:** `docs/impl-1/task-statement.md` (§1, §6.2, Appendix A).
- **Decided by:** Martín.

### 5. One review and sign-off gate per epic (Governance)

- **Phase:** 0 (for Phases 2–3).
- **Persona/Skill:** none (session planning).
- **Prompt (summary):** At which points does Martín review and sign off? This decides where his entries in this log come from.
- **AI output (summary):** The agent recommended a gate per epic. The agents take each story through the whole ceremony, including a fresh-context code review. At each epic's close, Martín triages the findings, accepts or rejects corrections and signs. The alternatives offered: a gate per story (most control, slowest) or per phase (fastest, fewer decisions of his in the log).
- **Human decision:** ACCEPT a gate per epic.
- **Reason:** With 43 stories, a per-story gate slows the build without adding control, because the code review runs on every story anyway. A per-epic gate still gives 13 decision points.
- **Artifact changed:** `docs/impl-1/task-statement.md` §3 (epic gate).
- **Decided by:** Martín.
