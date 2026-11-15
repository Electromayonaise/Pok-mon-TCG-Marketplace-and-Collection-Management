---
title: "TEZG Solu-2 — Sprint readiness gate report"
gateVerdict: IR-PASS
created: 2026-10-19
skill: bmad-sprint-planning (with the readiness-audit prepend of _bmad/custom/bmad-sprint-planning.toml)
audit: scripts/readiness-audit.mjs --package docs/solu-2 (implemented in scripts/readiness-audit-solu2.mjs)
directed_by: Mateo Rubio
signoff: "Mateo Rubio, 2026-10-19"
---

# Sprint readiness gate report

## 1. How the gate works

`bmad-sprint-planning` writes `sprint-status.yaml` only after the team override's prepend has run the readiness audit and it has returned IR-PASS (`_bmad/custom/bmad-sprint-planning.toml`, carried over from Solu-1, decision log Solu-1 #18). On IR-FAIL the skill halts and names the skill that fixes each finding.

The Solu-2 audit parses the committed `epics.md` on its own, without the generator that wrote it, so the two cross-check each other. It runs the six checks the statement requires (task statement §7), Annex B's story structure, and the executable gates:

| Check | What it proves |
|---|---|
| S0 Annex B structure | Every story has Kind, Description, Contracts, Depends on, Traceability, Binding invariants, Files, Schema/DTO, ATDD path, a happy and a failure Given/When/Then, and DoD. Epic 1 is the walking skeleton. Epics 2–13 have 3–6 stories, a MEC story and ≥ 2 failure-state stories |
| C1 FR ↔ story | Every PRD FR is traced by a story, and every FR a story traces exists. Only Epic 1 may be FR-less |
| C2 UI states | `check-ui-states.mjs --check` passes: 327 states each backed by a DTO, a code or a client rule. Every operation a page uses is bound to a story |
| C3 AD → story → red test | Every `contracts.md` §14 row is listed under Binding invariants by the story that owns one of its red tests, and those tests exist |
| C4 No forward dependency | Every Depends-on names an earlier story |
| C5 No contradictions | Each registry operation and each test id is bound by exactly one story. ATDD ids live in the named file. Tables exist in the schema, DTOs are exported, files exist or are marked new. `epics.md`, the trace, the generated API surface, the cited test ids and the error-code citations are all current |
| C6 Review triage | Every review states `Triage status: n findings — a accepted, r rejected, d deferred, 0 open`, the counts add up, and the triage table holds exactly n finding ids |
| C7 Executable gates | The GREEN fitness project passes. The ATDD suite and the NFR benchmarks are red for the right reason, status-aware: a `done` story's ATDD path ids must pass |

## 2. Gate run — terminal output (verbatim)

`node scripts/readiness-audit.mjs --package docs/solu-2 --json .vitest-results/readiness-solu-2.json`, run as the skill's prepend step on 2026-10-19. Exit 0. Long lines are cut at the box edge by the script itself.

```text
+--------------------------------------------------------------------------------------------------------------+
| SPRINT READINESS AUDIT RESULT                                                                                |
+--------------------------------------------------------------------------------------------------------------+
| Package: docs/solu-2   Epics: 13   Stories: 69   Operations: 142/142   Test ids: 371/371                     |
| Status: IR-PASS (Autonomous Green Light)                                                                     |
| C1 FR <-> story: 100% (96/96 PRD FRs in a story; every story FR is a PRD FR)                                 |
| C2 UI states: 43/43 pages backed by bound operations; 43 pages, 327 states (138 data, 77 refusal, 112 client |
| C3 AD -> story -> red test: 100% (61/61 §14 rows listed by the story that owns their red test)               |
| C4 No forward dependency: PASS (94 dependencies, all backward)                                               |
| C5 No contradictions: PASS (each operation and test id in one story; tables, DTOs, files and generators cons |
|    generated API surface: 142 operations, 111 ingress procedures, 159 schemas, 37 core operations checked ag |
|    epics.md current with its source: _bmad-output/planning-artifacts/epics.md is current: 13 epics, 69 stories          |
|    traceability matrix (FR, AD, P0 -> test, story): trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clause |
|    cited test ids: 190 test ids cited by contracts.md; 371 defined under _bmad-output/test-artifacts; 37 core operation |
|    error-code citations: 194 code citations checked, 0 problems                                              |
| C6 Review triage: PASS (56 findings across 4 reviews, 0 open)                                                |
| C7 GREEN fitness: 12 passed (12)                                                                             |
| C7 ATDD: solu2-atdd: 352 tests in 19 files; 352 red for the right reason; 0 green for done stories (0 contra |
| C7 NFR: solu2-nfr: 3 tests in 3 files; 3 red for the right reason; 0 green for done stories (0 contracts or  |
| Action: Sprint tracking file may be generated. System ready for implementation.                              |
+--------------------------------------------------------------------------------------------------------------+
```

**Steps 1–5 of the skill then ran.** Step 5's summary: *Sprint Status Generated Successfully. File location `853449c:docs/solu-2/implementation-artifacts/sprint-status.yaml`. Total epics 13; total stories 69; epics in progress 0; stories completed 0.* Its validation checklist passed:

- every epic and every story of `epics.md` appears, with one retrospective entry per epic;
- there are no extra or duplicate keys;
- every status is legal (69 stories and 13 epics `backlog`, 13 retrospectives `optional`);
- the file parses.

`check-atdd-red`, run with that status file, still reports 352 red for the right reason.

**Scope of "100 %".** C1 measures all **96 PRD FRs**, not only those a core operation binds. The 39 supporting contracts bind the rest (decision log Solu-2 #3). C3 measures all 61 rows of §14.

## 3. Gate drill — proving the gate is a real control

Three realistic defects were planted one at a time in the committed package, and the audit was run without tests (`--no-tests`). Each planted file was restored with `git checkout`, and the next run returned IR-PASS again. In every case the audit exited 1 and named the defect. A defect usually trips more than one check, because the generators' freshness checks see the hand edit too.

**D1. A forward dependency.** Story 2.1 was made to depend on Story 3.1.

```text
Status: IR-FAIL (2 blocking findings)
|    epics.md current with its source: ✗ _bmad-output/planning-artifacts/epics.md is not current; run npm run gen:epics:s |
  ✗ [C4 no forward dependency] Story 2.1 depends on Story 3.1, which is not earlier
  ✗ [C5 no contradictions] epics.md current with its source: ✗ _bmad-output/planning-artifacts/epics.md is not current; run npm run gen:epics:solu2
exit=1
```

**D2. An open review finding.** `review-epics.md` was made to report one finding still open.

```text
Status: IR-FAIL (2 blocking findings)
  ✗ [C6 review triage] review-epics.md: 1 findings open
  ✗ [C6 review triage] review-epics.md: 8 + 2 + 0 ≠ 11
exit=1
```

**D3. An AD with no story.** `[SYS-AD1]` and its probe were removed from Story 1.4's ATDD path, so AD-1 lost its owning story.

```text
Status: IR-FAIL (5 blocking findings)
|    epics.md current with its source: ✗ _bmad-output/planning-artifacts/epics.md is not current; run npm run gen:epics:s |
  ✗ [C3 AD -> story -> red test] §14 AD-1: no story owns one of its red tests
  ✗ [C5 no contradictions] [SYS-AD1.probe] is bound by no story
  ✗ [C5 no contradictions] [SYS-AD1] is bound by no story
  ✗ [C5 no contradictions] epics.md current with its source: ✗ _bmad-output/planning-artifacts/epics.md is not current; run npm run gen:epics:solu2
  ✗ [C5 no contradictions] traceability matrix (FR, AD, P0 -> test, story): trace: 96 FRs, 56 NFRs, 61 AD rows, 20 risks, 112 clauses, 371 tests; 2 problems |   ✗ §14 AD-1: no story owns its red tests |   ✗ _bmad-output/test-artifacts/traceability-matrix.md is not current; run npm run gen:trace:solu2
exit=1
```

**Earlier, unplanned evidence that the gate bites.**

- The first full audit run reported 40 blocking findings: stories that only *prove* another story's operation were being read as double bindings. The fix was in how `epics.md` presents them ("Also proves", naming the owning story), not in the audit's rule.
- C6 surfaced a real contradiction: decision log #9 counted 16 detailed-design findings with 14 accepted, while the triage table holds 14 (12 accepted, 2 rejected). Corrected, with the correction noted in the log (review B-11).
- `check-atdd-red` drill: marking Story 6.1 `done` in a scratch status file turned its 4 tests from must-fail into must-pass (exit 1, `NotImplemented`), proving that done stories are enforced (review B-1).

## 4. Findings resolved before the gate

All four review reports are triaged. Every Accept is applied, and every Reject is recorded with its reason:

| Report | Findings | Accept | Defer | Reject |
|---|---|---|---|---|
| `reviews/review-arch-implementability.md` | 17 | 17 | 0 | 0 |
| `reviews/review-detailed-design.md` | 14 | 12 | 0 | 2 (E-3, E-4) |
| `reviews/review-test-quality.md` | 14 | 14 | 0 | 0 |
| `reviews/review-epics.md` | 11 | 9 | 0 | 2 (B-5, B-6) |
| **Total** | **56** | **52** | **0** | **4** |

Solu-1's four deferred findings (E-15, T-07, F-7, F-12) were carried into Phase 0 and resolved there (review G-07..G-10).

## 5. Annex B checklist

| Item | Evidence |
|---|---|
| Core operations have complete P/Q/I; zero banned words | `contracts.md` §1–§12, 37 operations; Phase 1 gate (log #7, #8) |
| The typed error catalog covers every P-violation and failure state | `contracts.md` §13; `gate:codes:solu2` (194 citations, 0 problems) |
| Every AD-n has an enforcement point and a red test | §14, 61 rows; C3 61/61; `gate:trace:solu2` |
| `domain/` has no framework, DB, network, wall-clock or random imports | `gate:purity` (12 domain files, 0 problems); `[SYS-6.R1]` |
| Schema contains ≥ 2 physical invariants; contended writes are atomic | `001_tezg_schema.sql`: 55 tables, 271 CHECKs; conditional updates and partial unique indexes, proven by the race tests |
| DTOs, OpenAPI and events are consistent (no field-name drift) | `gate:api:solu2` (one registry generates all three); `[SYS-AD9]` |
| The ATDD suite is executable, red for the right reason, and covers every MEC | 352 red tests in 19 files; 12/12 MEC modules (`gate:trace:solu2`) |
| P0 risks ↔ tests ↔ stories are linked in the traceability matrix | `traceability-matrix.md` §5: 15/15 P0 risks with a red test and a story |
| `epics.md` has no forward dependencies | C4 (94 dependencies, all backward); drill D1 |
| Every story has Traceability, Binding invariants, Files, Schema/DTO, ATDD path, Gherkin (happy + failure), DoD | S0 over 69 stories |
| All review findings are triaged; Accepted ones fixed | §4 above; C6; drill D2 |
| The decision log meets the minimums, with pair attribution | `ai-log/decision-log-solu2.md`: ≥ 6 entries; `[REJECTED]` entries #1, #9 and #13; Martín's Phase 3 decisions attributed (#10, #11) |
| No `bmad-build` / production logic was run or written | Every `*.v2.ts` application method and every skeleton stub throws `NotImplementedError`; the red gate fails on any premature pass |

## 6. Sign-off

**Signed off by Mateo Rubio on 2026-10-19** at the Phase 4 gate (decision log Solu-2 #13):

- the audit is IR-PASS on S0 and C1–C7;
- the drill shows the gate blocks each planted defect;
- `sprint-status.yaml` is generated, with 13 epics and 69 stories, all `backlog`.

The backlog is ready for implementation, starting with Epic 1.
