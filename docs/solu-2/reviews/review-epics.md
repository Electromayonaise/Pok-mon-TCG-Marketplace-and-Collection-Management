---
title: Backlog implementability review — docs/solu-2/planning/epics.md
reviewed:
  - docs/solu-2/planning/epics.md (generated) and its source epics.source.mjs
  - scripts/gen-solu2-epics.mjs, scripts/check-atdd-red.mjs, scripts/gen-solu2-trace.mjs
  - the neighbour-port interfaces src/modules/*/ports/*.v2.ts against each story's dependencies
skills: John (bmad-agent-pm) for value, structure and scope · Amelia (bmad-agent-dev) for implementability
date: 2026-10-19
status: triaged — Phase 4 design gate, 2026-10-19 (decision log Solu-2 #13)
---

# Backlog implementability review

**Report 4 of 4.** John asked of every epic whether it delivers user value and respects the statement's structure: Epic 1 a walking skeleton; Epics 2–13 with 3–6 stories, a MEC story and ≥ 2 failure-state stories. Amelia asked of every story whether a developer agent can take it alone, in order, and know exactly when it is done. Both read the generated `epics.md` and the tooling that turns "story done" into gate results.

Every story binds an exact set of registry operations and red test ids, each to exactly one story. The generator refuses a gap, a double binding or a forward dependency, so the review looked for what that guard cannot see.

## Findings

| # | By | Finding | Evidence |
|---|---|---|---|
| B-1 | Amelia | The red check decided "story done" from Solu-1's `Contract Reference` line. Solu-2 stories bind test ids through **ATDD path**, so a finished Solu-2 story would still have its tests required to fail, and the gate would block the very work it should accept | `scripts/check-atdd-red.mjs` read only `Contract Reference` |
| B-2 | Amelia | Each story's DoD hard-coded `check-atdd-red.mjs solu2-atdd 352 --status … --epics …`. The count goes stale as soon as a test is added, and the command is duplicated 69 times | every story's DoD line |
| B-3 | Amelia | Five stories call a neighbour port whose provider story they do not declare: 6.2 (`getSellerKinds`, 2.5), 6.3 (`getPriceProvenance`, 4.4), 8.1 (`getCapabilities` 2.3, `getBusinessName` 3.5), 9.2 (`getDisplayNames` 2.5, `getBusinessName` 3.5), 12.1 (prices and FX, 4.4). Every provider is earlier, so nothing points forward, but the composed monolith needs the provider bound first | per-operation check of each module's `ports/*.v2.ts` against the owning stories |
| B-4 | Amelia | `[IDN-1.MEC]` raced IDN's profile completion against VER's `submitApplication`, so the IDN MEC story (Epic 2) silently needed Story 3.1 (Epic 3). VER-2 in turn calls IDN's claim: a cycle across epics, hidden inside a test | `idn_contracts.test.ts` imported `VerServiceV2` |
| B-5 | John | The epics skill (step 4) wants each table created by the first story that needs it. Solu-2 has one SQL-first `001_tezg_schema.sql` (R-8, Appendix B), built in Phase 2 and proven by Phase 3's tests and seed | `bmad-create-epics-and-stories` step 4 §2 |
| B-6 | John | Story 7.2, the ORD MEC, binds 11 tests across `confirmPaid`, `confirmPaymentReceived` and `confirmItemReceived`, the largest story. A split would move `confirmItemReceived` into a core story of its own | Story 7.2 |
| B-7 | Amelia | Several epics touch the same host files: `listings/infra/pg.ts` in Epics 5, 6, 9 and 13; `identity/infra/pg.ts` in Epics 2, 3 and 9 (the skill's file-churn check) | the Files lines |
| B-8 | John | Epic 1's stories trace no FR. They are cross-cutting by design, and they trace NFRs and §14 ADs instead | Stories 1.1–1.5 |
| B-9 | Amelia | Story 1.4's bound tests (fitness and seed) are already green, so turning them green proves nothing for it. Its real deliverable is the three lint rules (TG-8) | Story 1.4 |
| B-10 | John | Story 5.5 subscribes to commission events whose publisher comes in Epic 8 | Story 5.5 |
| B-11 | Amelia | Decision log #9 said the detailed-design review raised 16 findings with 14 accepted; its triage table holds 14 findings, 12 accepted and 2 rejected. A contradiction the readiness audit's triage cross-check would trip on | `decision-log-solu2.md` #9 vs `review-detailed-design.md` |

## Triage

**Triage status:** 11 findings — 9 accepted, 2 rejected, 0 deferred, 0 open (decision log Solu-2 #13).

Mateo decided B-5 and B-6 at the Phase 4 design gate. The other nine were accepted as recommended and are applied.

| # | Decision | Applied |
|---|---|---|
| B-1 | **Accept** | `check-atdd-red.mjs` also reads **ATDD path** ids: a test is "done" when any id in its title belongs to a done story. Drill: marking Story 6.1 `done` makes the gate demand its 4 tests pass (exit 1). Solu-1 is unchanged (131 red) |
| B-2 | **Accept** | `gate:atdd-red:solu2` now passes `--status` and `--epics` itself; every DoD says "`npm run gate:atdd-red:solu2` stays green with this story `done`" |
| B-3 | **Accept** | The five dependencies are declared in `epics.source.mjs`. The 13 remaining module-level matches are deliberate: that operation never calls that port (for example, `makeOffer` in 10.1 does not call the handoff, while 10.3's accept does and declares 9.3) |
| B-4 | **Accept** | `[IDN-1.MEC]` now races at the claim level, as the IDN-1 concurrency clause states. The end-to-end race through `submitApplication` is `[VER-2.I2]` in Story 3.1, cited by the VER-2 clause (commit `66059fb`) |
| B-5 | `[REJECTED]` the per-story table rule | One upfront schema stays. Stories name the tables they read and write (Schema/DTO); the migration, its 271 CHECKs and its grants are Phase 2's, proven by the green fitness and seed tests. Splitting would re-cut an approved, test-proven schema and re-sequence the Phase 3 harness for no new guarantee |
| B-6 | `[REJECTED]` the split | Story 7.2 stays whole. The MEC is about the three facts in any order: they share one visibility predicate and one conditional-update pattern, and a split would spread one invariant across two stories |
| B-7 | **Accept as is** | AD-1 hosts 12 planning modules on 9 code modules. Each epic adds distinct repository methods and SQL, and no epic rewrites another's. No change |
| B-8 | **Accept** | The readiness audit allows FR-less stories in Epic 1 only, and requires each to own §14 red tests |
| B-9 | **Accept** | Story 1.4's DoD requires the three lint rules to exist and to fail on the fitness probes' planted violations |
| B-10 | **Accept** | Story 5.5's DoD records the fail-closed default (AD-INV-3 rule 3): until Epic 8 publishes, business listings stay paused. The payload types are shared-kernel (AD-9), so the story's tests deliver events directly |
| B-11 | **Accept** | Log #9, `docs/solu-2.md` and the memlog now say 14 findings (12 accepted, 2 rejected), with the correction noted in place |
