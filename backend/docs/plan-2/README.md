# Plan-2: All 12 modules, one package (2026-09-21 – 09-27)

**Goal.** Plan the 12 subsystem modules of TEZG as one integrated package, to launch rigor: identity (IDN), business verification (VER), catalog and price reference (CAT), listings and shared inventory (INV), location discovery (DSC), orders and comprobante (ORD), commission balance (COM), trading (TRD), messaging (MSG), collections (COL), valuation (VAL), and reputation and moderation (REP). Pair work by Martín Gómez and Mateo Rubio, with a team gate at the end of each phase.

## What was done

- **Phase 1, PRD**: one PRD for the 12 modules, in dependency order, with 96 FRs and 56 NFRs. Its shared part holds the vision, protagonists, cross-module journeys, the reference seed profile, the 12→9 module map, and the ownership registry for tables, events and errors. An addendum holds the cross-cutting detail.
- **Phase 2, UX**: per module, four scenario outlines (S1–S4) and the key page specs, 43 pages in all. Also an es-CO microcopy guide, two Excalidraw wireframes and 12 interactive HTML key-screen mocks, one per module.
- **Phase 3, architecture**: the system ADs AD-SYS-1..8 and per-module ADs AD-&lt;CODE&gt;-n on top of the inherited AD-1..19. They cover the transactional outbox, uploads through quarantine and sanitized viewers, idempotent commission deduction and the concurrency rules.
- **Phase 4, readiness gate**: CONCERNS at first, PASS after remediation R-1..R-6. Launch gates LG-1..LG-5 were added with `launchReady: false`: the PASS covers the planning package, not a production launch.
- **Review rounds after the gate**: a human review round (#26–#45), a follow-up round, and a pre-submission round (#46–#54). They redesigned outbox delivery per subscriber, aligned commission payload facts, applied a tú/usted rule by rendering surface, and added `unitPriceCop` to `OrderClosed`.
- **Decision log**: 54 entries. Rejected, corrected or improved AI proposals carry a tag (`[REJECTED]`, `[CORRECTED]`, `[IMPROVED]`).

## Result

The PRD, UX and architecture every later task builds on. The Solu tasks, the Impl-1 code and its gates read `prd.md` and the UX scenarios directly.

## Artifacts

"Last commit" is the last commit that changed the artifact before the reorganization. Every removed or merged artifact is intact in commit [`853449c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/853449c) under its path there.

| Artifact | Path at `853449c` | Now | Last commit |
|---|---|---|---|
| PRD, addendum | 2 files, `docs/plan-2/planning/` | **Current:** [`_bmad-output/planning-artifacts/prd.md`](../../_bmad-output/planning-artifacts/prd.md), [`_bmad-output/planning-artifacts/addendum.md`](../../_bmad-output/planning-artifacts/addendum.md) | [`ca66d6e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ca66d6e) |
| Architecture | `docs/plan-2/planning/ARCHITECTURE.md` | **Current:** [`_bmad-output/planning-artifacts/ARCHITECTURE.md`](../../_bmad-output/planning-artifacts/ARCHITECTURE.md). Now also quotes the inherited AD-14..AD-19 in full (Appendix A) | [`65741c1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/65741c1) |
| Readiness gate report | `docs/plan-2/planning/readiness-gate-report.md` | **Current:** [`_bmad-output/planning-artifacts/implementation-readiness-report.md`](../../_bmad-output/planning-artifacts/implementation-readiness-report.md) (renamed from `readiness-gate-report.md`, which Solu-2 also had) | [`62d8026`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/62d8026) |
| UX: scenarios, page specs, DESIGN, EXPERIENCE, microcopy, mockups, wireframes | `docs/plan-2/ux/` | **Current:** [`_bmad-output/planning-artifacts/ux/`](../../_bmad-output/planning-artifacts/ux/). `DESIGN.md` now holds the 13 Plan-1 components, and the inherited orders-list page sits in `C-UX-Scenarios/06-ord-order-comprobante/` | [`2589280`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2589280) |
| Reviews | `docs/plan-2/reviews/` | **Current:** in [`_bmad-output/planning-artifacts/reviews/`](../../_bmad-output/planning-artifacts/reviews/), together with the Solu-2 reviews (no file names collide) | [`5b49ea3`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5b49ea3) |
| Process log (`.memlog.md`) | `docs/plan-2/planning/.memlog.md` | **Current:** [`_bmad-output/planning-artifacts/.memlog.md`](../../_bmad-output/planning-artifacts/.memlog.md) | [`ca66d6e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ca66d6e) |
| Decision log | `docs/plan-2/ai-log/decision-log.md` | **Current:** [`_bmad-output/decision-logs/plan-2-decision-log.md`](../../_bmad-output/decision-logs/plan-2-decision-log.md) | [`62d8026`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/62d8026) |

**Every artifact of this task is current.** Its version before the reorganization can still be read with `git show 853449c:<path>`, using the path in the table. For example:

```bash
git show 853449c:docs/plan-2/planning/prd.md
```

<details><summary>All 25 commits that changed this task's files</summary>

| Commit | Date | Message |
|---|---|---|
| [`09b1719`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/09b1719) | 2026-09-21 | upload adapted plan2 task statement |
| [`795a7dc`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/795a7dc) | 2026-09-26 | Add Plan-2 PRD for all 12 modules (Phase 1 + gate) |
| [`d706ec0`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d706ec0) | 2026-09-27 | Add Plan-2 UX for all 12 modules (Phase 2 + gate) |
| [`9a6b872`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9a6b872) | 2026-09-27 | Add Plan-2 architecture for all 12 modules (Phase 3 + gate) |
| [`9c2a3a6`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/9c2a3a6) | 2026-09-27 | Add Plan-2 readiness gate report (Phase 4 + gate) |
| [`5a705a5`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5a705a5) | 2026-09-27 | Tag rejected AI proposals and apply post-gate fixes (Plan-2) |
| [`d193714`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/d193714) | 2026-09-27 | Redesign Plan-2 outbox delivery per subscriber (human review #26, #42, #43) |
| [`b6de440`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/b6de440) | 2026-09-27 | Align commission payload facts and keep the prompt close date (human review #27, #45) |
| [`e6388f2`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/e6388f2) | 2026-09-27 | Route Plan-2 uploads through quarantine and sanitized viewers (human review #28, #36, #44) |
| [`c45738b`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/c45738b) | 2026-09-27 | Harden Plan-2 operations and add launch gates (human review #29, #30, #32, #33, #37-#39) |
| [`790f31f`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/790f31f) | 2026-09-27 | Apply the surface-based tú/usted rule (human review #34, #40) |
| [`94954f6`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/94954f6) | 2026-09-27 | Record the Plan-2 human review rounds in the decision trail (#26-#45) |
| [`5b49ea3`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5b49ea3) | 2026-09-27 | Record the PRD triage adoption and correct Appendix A (pre-submission review #46, #47, #50) |
| [`5e7389e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/5e7389e) | 2026-09-27 | Carry unitPriceCop on OrderClosed lines and fix the close metric (pre-submission review #48, #49) |
| [`6d7e6f8`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/6d7e6f8) | 2026-09-27 | Add interactive HTML key-screen mocks for all 12 Plan-2 modules (#52) |
| [`dd11276`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/dd11276) | 2026-09-27 | Record the Plan-2 pre-submission review in the decision trail (#46-#52) |
| [`79aef7c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/79aef7c) | 2026-09-27 | Align four page specs, microcopy §10 and the mocks with the pre-submission findings (#53) |
| [`38e621c`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/38e621c) | 2026-09-27 | List ux/mockups/ in the task statement's Phase 2 deliverables and package tree (#53) |
| [`98ece00`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/98ece00) | 2026-09-27 | Record the team's decisions on the pre-submission findings in the decision trail (#53) |
| [`ca66d6e`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/ca66d6e) | 2026-09-27 | State in FR-COL-2 that acquiredPriceCop is the price of one copy (#54) |
| [`2589280`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/2589280) | 2026-09-27 | Add usted rows to microcopy §10 and open page 3.1 on the Cartas view (#54) |
| [`afb28e4`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/afb28e4) | 2026-09-27 | Map the added ux/mockups/ folder in the task statement's Appendix A (#54) |
| [`62d8026`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/62d8026) | 2026-09-27 | Record the closing of the last pre-submission flags in the decision trail (#54) |
| [`7fa61bd`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/7fa61bd) | 2026-10-19 | remove extra docs |
| [`65741c1`](https://github.com/Electromayonaise/Pok-mon-TCG-Marketplace-and-Collection-Management/commit/65741c1) | 2026-10-25 | feat(story-1.3): deliver every committed event exactly once in effect |

</details>
