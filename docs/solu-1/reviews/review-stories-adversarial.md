---
title: Adversarial review — Solu-1 epics and stories
reviewed: docs/solu-1/planning/epics.md (against contracts.md, docs/solu-1/tests/atdd/, scripts/readiness-audit.mjs, docs/plan-2/planning/prd.md)
skill: bmad-review-adversarial-general
date: 2026-10-18
status: triaged — Phase 4 gate, 2026-10-18 (decision log #19)
---

# Adversarial review — Solu-1 epics and stories

**Report 4 of 4** (task statement §7). The review hunted for what the readiness audit cannot see. The audit's first run passed (IR-PASS, 37/37 contracts, 56/56 FRs, 47/47 ADs), which is exactly when a reviewer should distrust it. It is a self-review under the skill's adversarial brief; Mateo decides the triage at the Phase 4 gate.

## Findings

- **F-1 Story 3.1's value statement is an engineering goal, not user value.** "…without `catalog` depending on `identity`, so that the module stays independently testable" is the reason for the placement (review E-23). It is not what Sebastián gains. The user value is that nobody but an admin can start or alter catalog ingestion.
- **F-2 Story 1.1 under-specifies the citation.** The acceptance criterion cites `{ applicationId, reapplyNotBefore }`. The contract cites `{ applicationId, reapplyNotBefore, barred }`, and `barred` is what tells the applicant "never" from "on date X". A developer following the story would omit it.
- **F-3 "Laura" is an invented protagonist.** Stories 2.2 and 12.2 introduce a second admin named Laura. Plan-2's protagonists are Valentina, Andrés, Sebastián, Camila and Julián, and new personas enter only through the Annex.
- **F-4 Stories consume neighbour commands that no story produces, and the audit cannot see it.** The fakes keep every story testable in isolation, but in the composed monolith these stories cannot run end-to-end until their providers exist. Nothing in the backlog says so:
  - 6.2 needs `listings.releaseReservation` (FR-INV-5, outside the contract set);
  - 8.2 needs `listings.getTradeability`, `reserveForTrade` and `generateContactMessage` (FR-INV-3 trade side, FR-MSG-1);
  - 7.2 needs an opened `CommissionAccount` (FR-COM-1);
  - 12.1 needs `identity.getReviewTarget`.
- **F-5 The red check breaks the moment the first story is implemented, and no Definition of Done exists.** `scripts/check-atdd-red.mjs` demands that **every** ATDD test fails. Implementing Story 1.1 turns its tests green, and the gate then fails. As written, the gate punishes progress. The backlog also never states when a story is done.
- **F-6 Several dependencies are spurious.** They serialize independent work:
  - 3.4 on 3.3 (a price read needs no upsert);
  - 6.3 on 6.2 (`hasClosedPurchase` needs no `confirmPaid`);
  - 7.3 on 7.2, 8.3 on 8.2, 9.3 on 9.2, 12.3 on 12.2 (each resolver reads seeded rows).

  Each was chained "on the previous story" rather than derived from a real call or data dependency.
- **F-7 The ORD mandatory edge case is only half covered.** The Annex's edge case is "confirmations arriving **out of order** or twice". Story 6.2 covers "twice" and the expiry race, but the out-of-order case (the business confirms before the buyer's "paid") lives in `confirmPaymentReceived` and `confirmItemReceived`, which have no Solu-1 contract (FR-ORD-4 and FR-ORD-5 are outside the set). The epic text claims the edge case without qualification.
- **F-8 Story 1.2 contradicts NFR-IDN-2.** The story, and its red test, say 25 repetitions. NFR-IDN-2 says 100. Two artifacts state different numbers for one requirement, which is the contradiction Solu-2's readiness check 5 names.
- **F-9 Story 9.2's last clause omits the HTTP status** of `BusinessCannotInitiate`. Every other refusal in the backlog states one.
- **F-10 The audit does not verify the error codes cited in the stories.** `check-code-citations.mjs` passes on `epics.md` today (29/29), but the readiness audit never runs it, so a renamed or mistyped code in an acceptance criterion would pass the gate.
- **F-11 Sprint keys will be long.** `bmad-sprint-planning` kebab-cases each full title (for example `1-1-answer-listing-eligibility-from-derived-capabilities`).
- **F-12 Stories name the consuming UX surface inconsistently.** Some name the page (7.3 "page 7.1", 10.3 "page 9.1"), and most do not. A developer cannot tell which UI state each contract result backs.

## Triage

Mateo adopted the recommendation below in full at the Phase 4 gate on 2026-10-18 (decision log #19). The accepts are applied in `epics.md` (commits "Apply story review fixes to the backlog", "List each story's consumed neighbour ports", "Add a Definition of Done to the backlog"), in the IDN ATDD file, in `scripts/check-atdd-red.mjs` and in `scripts/readiness-audit.mjs` (C9, C10).

| # | Recommendation | Fix / reason |
|---|---|---|
| F-1 | **Accept** | Rewrite the "so that" around Sebastián's need |
| F-2 | **Accept** | Cite `{ applicationId, reapplyNotBefore, barred }` |
| F-3 | **Accept** | "a second admin" in the prose; the fixture id may stay |
| F-4 | **Accept** | Add a **Consumed ports** line to each story that calls a neighbour, naming the provider story or "faked; provider outside Solu-1 (FR-x)". New audit check **C9**: every neighbour port a story's module declares is either backed by a story or annotated |
| F-5 | **Accept** | (a) A backlog **Definition of Done** that applies to every story. (b) The red check becomes status-aware: it reads `sprint-status.yaml` and expects red only for the ATDD blocks of stories not yet `done`; blocks of `done` stories must pass. With every story in `backlog` today, the result is unchanged |
| F-6 | **Accept** | Derive dependencies from real calls and data only |
| F-7 | **Defer** | Out of order needs the two other confirmation contracts, which Solu-2 adds. The epic text is qualified now ("twice and the expiry race; out of order is Solu-2's") |
| F-8 | **Accept** | Raise the red test and the story to 100 repetitions (NFR-IDN-2) |
| F-9 | **Accept** | Add "(HTTP 409)" |
| F-10 | **Accept** | Audit check **C10** runs the code-citation check over `epics.md` and `contracts.md` |
| F-11 | **Reject** | Keys are generated once and never typed; a full title is self-describing in `sprint-status.yaml`. Shortening titles to shorten keys would make the backlog worse at its main job |
| F-12 | **Defer** | Every UI state having a backing contract and DTO is Solu-2's readiness check 2, applied with the UX package. Adding page names to 25 stories now, without that check, would be decoration |
