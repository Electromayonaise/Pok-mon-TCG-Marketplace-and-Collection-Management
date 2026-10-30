# TEZG course tasks

One folder per course task. Each README summarizes what the task did and lists the artifacts it produced or changed: where each one is now (or what replaced it), the commit that last changed it, and all the task's commits. The artifacts themselves are in [`_bmad-output/`](../_bmad-output/README.md), which keeps only the latest version of each.

| # | Task | Dates | What it produced |
|---|---|---|---|
| 1 | [Spec Task 1](spec-task-1/README.md) | 2026-08-08 – 08-09 | The 2-page system spec, from a human draft and an AI kernel |
| 2 | [Plan-1: Buyer/Collector track](plan-1-buyer-track/README.md) | 2026-09-04 – 09-06 | PRD, UX and architecture for the collector who buys |
| 3 | [Plan-1: Seller/Business track](plan-1-seller-track/README.md) | 2026-09-06 | PRD, UX and architecture for individual sellers and verified businesses |
| 4 | [Plan-2](plan-2/README.md) | 2026-09-21 – 09-27 | One PRD, UX and architecture for all 12 modules, through a readiness gate |
| 5 | [Solu-1](solu-1/README.md) | 2026-10-18 – 10-19 | 37 behavioral contracts, SQL migrations, a red ATDD suite and a contract-bound backlog |
| 6 | [Solu-2](solu-2/README.md) | 2026-10-18 – 10-25 | The full detailed design, a 352-test red ATDD suite and the 69-story backlog |
| 7 | [Impl-1](impl-1/README.md) | 2026-10-24 – 10-30 | The running service: all 43 Impl-1 stories (plus 19 pulled forward), the final trace and the walkthrough |

**Superseded versions.** When a later task replaced an artifact, only the later one is kept. Where the later artifact inherited part of the earlier one without restating it, that part was copied into it: Plan-2's `ARCHITECTURE.md` quotes AD-14..AD-19 (Appendix A), its `DESIGN.md` holds the 13 Plan-1 components, and its UX keeps the Plan-1 orders-list page. Every removed file is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/tree/853449c), the last commit before this reorganization, under its old path: `git show 853449c:<path>` reads it and `git checkout 853449c -- <path>` restores it.

**One planning folder.** Plan-2 (the product plan) and Solu-2 (the solution design) used to have separate subfolders. They are now one `_bmad-output/planning-artifacts/` folder, and the Solu-2 tests one `_bmad-output/test-artifacts/` folder. No two files had the same content. Where two different files had the same name, they now have different names:

| Plan-2 file | Solu-2 file | Now |
|---|---|---|
| `ARCHITECTURE.md` (the architecture) | `ARCHITECTURE.md` (v2: stack and refinements over Plan-2) | `ARCHITECTURE.md` and `ARCHITECTURE-v2-delta.md` |
| `readiness-gate-report.md` (planning readiness) | `readiness-gate-report.md` (sprint readiness of the backlog) | `implementation-readiness-report.md` and `sprint-readiness-report.md` |
| `.memlog.md` (PRD process log) | `.memlog.md` (detailed-design process log) | `.memlog.md` and `.memlog-detailed-design.md` |
| `reviews/` (4 reviews) | `reviews/` (4 reviews) | one `reviews/` folder; no file names collided |

The adapted Impl-1 task statement is no longer in `_bmad-output/`, because it is a course document, not a BMAD artifact. It is at `853449c:docs/impl-1/task-statement.md`.

The whole-product groundwork that came between Spec Task 1 and Plan-1 (the WDS product brief and trigger map, the `bmad-spec` kernel and the architecture spine) has no task folder here. It is in `_bmad-output/A-Product-Brief/`, `B-Trigger-Map/` and `specs/spec-pokemon-tcg-marketplace/`.
