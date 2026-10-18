---
title: "TEZG Solu-1 — Sprint readiness gate report"
gateVerdict: IR-PASS
created: 2026-10-18
skill: bmad-sprint-planning (with the readiness-audit prepend of _bmad/custom/bmad-sprint-planning.toml)
audit: scripts/readiness-audit.mjs --package docs/solu-1
directed_by: Mateo Rubio
signoff: pending
---

# Sprint readiness gate report

## 1. How the gate works

The installed `bmad-sprint-planning` only parses `epics.md` and writes `sprint-status.yaml`; it has no readiness audit. At the Phase 4 gate, Mateo chose a deterministic audit wired in through BMAD's supported team override (decision log #18).

`_bmad/custom/bmad-sprint-planning.toml` adds an activation prepend that runs `scripts/readiness-audit.mjs --package docs/solu-1`. On IR-FAIL the skill must HALT without writing the status file, and must name the skill that fixes each finding.

The audit checks:

| Check | What it proves |
|---|---|
| C1 story completeness | Every story has the Solu-1 template fields plus Traceability and Depends on, a Given/When/Then, and a failure, missing-data or edge-case criterion |
| C2 contract binding | Every story names a contract that exists, and every one of the 37 contracts has a story |
| C3 schema/DTO binding | Every Target DTO is exported by a source file; every table, and every named column, exists in a migration |
| C4 invariant binding | Every AD a contract binds in its Invariant clauses appears in its story's Contract Reference |
| C5 FR traceability | Every FR a contract binds reaches its story, and every FR a story traces exists in the PRD |
| C6 ATDD link | Every story's ATDD file exists and has a `describe` block for each of its contracts |
| C7 dependency order | A story depends only on earlier stories |
| C8 executable gates | The GREEN schema suite passes, and the ATDD suite is red for the right reason (status-aware) |
| C9 consumed ports | Every neighbour port a module declares is listed by a story, and resolves to an earlier story or a referenced fake |
| C10 code citations | Every `Code` (HTTP n, owner) in the contracts and stories matches the registry |

## 2. Gate run — terminal output (verbatim)

`bmad-sprint-planning` for `docs/solu-1`, step 2 (activation prepend), 2026-10-18:

```text
+------------------------------------------------------------------------------------------------------+
| SPRINT READINESS AUDIT RESULT                                                                        |
+------------------------------------------------------------------------------------------------------+
| Package: docs/solu-1   Epics: 12   Stories: 37   Contracts: 37                                       |
| Status: IR-PASS (Autonomous Green Light)                                                             |
| Cross-Document Traceability: 100% (56/56 contract-bound FRs -> stories -> AD -> DTOs/Tables)         |
| Contract Coverage: 100% (37/37 contracts bound to a story and an ATDD block)                         |
| Invariant Enforceability: 100% (47/47 ADs bound to a story, a contract and a red test)               |
| Consumed ports: 19 listed, each backed by an earlier story or a referenced fake                      |
| Error-code citations: 87 code citations checked, 0 problems                                          |
| GREEN schema suite: 32 passed (32)                                                                   |
| ATDD: solu1-atdd: 131 tests in 12 files; 131 red for the right reason; 0 green for done stories (0 c |
| Action: Sprint tracking file may be generated. System ready for implementation.                      |
+------------------------------------------------------------------------------------------------------+
  Invariants bound: AD-1, AD-11, AD-12, AD-15, AD-16, AD-18, AD-2, AD-3, AD-5, AD-6, AD-7, AD-8, AD-9, AD-CAT-1, AD-CAT-2, AD-COL-1, AD-COL-2, AD-COM-1, AD-COM-2, AD-COM-3, AD-DSC-1, AD-DSC-2, AD-IDN-1, AD-IDN-2, AD-INV-1, AD-INV-2, AD-INV-3, AD-MSG-2, AD-MSG-3, AD-ORD-2, AD-ORD-3, AD-REP-1, AD-REP-2, AD-REP-3, AD-SYS-2, AD-SYS-3, AD-SYS-4, AD-SYS-5, AD-SYS-7, AD-SYS-8, AD-TRD-1, AD-TRD-2, AD-TRD-3, AD-VAL-1, AD-VAL-2, AD-VER-1, AD-VER-3
exit=0
```

The ATDD row is truncated by the box width. The full line is `solu1-atdd: 131 tests in 12 files; 131 red for the right reason; 0 green for done stories (0 contracts done); 0 not as expected`.

**Steps 1–5 of the skill then ran.** Its step 5 summary: *Sprint Status Generated Successfully. File location `docs/solu-1/implementation-artifacts/sprint-status.yaml`. Total epics 12; total stories 37; epics in progress 0; stories completed 0.* Its validation checklist passed:

- every epic and every story is present;
- 12 retrospective entries exist;
- there are no extra items;
- all statuses are legal;
- the YAML is valid (`js-yaml`);
- there was no prior `action_items` section.

**Scope of "100 %".** Traceability is measured over the **56 FRs the 37 contracts bind**, out of the PRD's 96 FRs (decision log #18). The other 40 FRs are listed by id in `epics.md` and are carried into Solu-2.

## 3. Gate drill — proving the gate is a real control

Mateo chose the drill: rename a DTO in one story but not in `dto.ts` (decision log #19).

| Step | Action | Result | Time |
|---|---|---|---|
| 1 | In `epics.md`, Story 4.2's Target DTO `ReserveForPurchaseRequestDTO` → `ReserveForPurchaseInputDTO`, a name no source exports | — | — |
| 2 | Re-run the gate (`readiness-audit.mjs --package docs/solu-1`, the sprint-planning prepend) | **IR-FAIL**, exit 1, one blocking finding (below). The status file was **not** regenerated: `sha256` identical before and after | 8 s |
| 3 | Fix with the named skill (`bmad-create-epics-and-stories`, story fields): restore the Target DTO; `git diff` on `epics.md` is empty again | — | — |
| 4 | Re-run the gate | **IR-PASS**, exit 0 | 8 s |

Drill output at step 2 (verbatim):

```text
| Status: IR-FAIL (1 blocking finding)                                                                 |
| Cross-Document Traceability: 100% (56/56 contract-bound FRs -> stories -> AD -> DTOs/Tables)         |
| Contract Coverage: 100% (37/37 contracts bound to a story and an ATDD block)                         |
| Invariant Enforceability: 100% (47/47 ADs bound to a story, a contract and a red test)               |
| Consumed ports: 19 listed, each backed by an earlier story or a referenced fake                      |
| Error-code citations: 87 code citations checked, 0 problems                                          |
| GREEN schema suite: 32 passed (32)                                                                   |
| ATDD: solu1-atdd: 131 tests in 12 files; 131 red for the right reason; 0 green for done stories (0 c |
| Action: HALT. Do not generate sprint-status.yaml; fix the findings below.                            |
+------------------------------------------------------------------------------------------------------+
  ✗ [C3 schema/DTO binding] Story 4.2 names DTO ReserveForPurchaseInputDTO, which no src file exports
exit=1 seconds=8
sprint-status unchanged: yes
```

**Earlier, unplanned evidence that the gate bites.**

- The audit's first run after review 4's text fixes reported **IR-FAIL with 140 findings**. A real defect in the audit caused it: CRLF line endings broke its parsers. The audit was fixed to normalize line endings (commit "Make the readiness audit line-ending agnostic").
- C9 was verified separately: removing Story 6.2's Consumed ports line produced `IR-FAIL: [C9 consumed ports] src/modules/orders/ports/ord.ts declares listings.releaseReservation, but no story of epic 6 lists it`.
- The status-aware red check was verified with a scratch status that marked Story 11.1 `done`. Its two still-unimplemented tests were reported as "must pass".

## 4. Findings resolved before the gate

All four review reports are triaged, and every Accept is applied:

| Report | Findings | Accept | Defer | Reject |
|---|---|---|---|---|
| `reviews/review-contracts-adversarial.md` | 24 | 21 | 0 | 3 |
| `reviews/review-schema-edge-cases.md` | 23 | 20 | 1 (E-15 → Solu-2) | 2 |
| `reviews/review-atdd-test-quality.md` | 8 | 6 | 1 (T-07 → Solu-2) | 1 |
| `reviews/review-stories-adversarial.md` | 12 | 9 | 2 (F-7, F-12 → Solu-2) | 1 |
| **Total** | **67** | **56** | **4** | **7** |

For review 4, the 9 accepts (F-1 to F-6, F-8 to F-10) are applied in `epics.md`, the ATDD suite, `scripts/check-atdd-red.mjs` and the audit (C9, C10). F-7 is deferred, with the epic text qualified now.

## 5. Sign-off

*Pending Mateo Rubio's sign-off at the Phase 4 gate.*
