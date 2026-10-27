---
title: 'Story 5.3: Refuse invalid listings'
type: 'feature'
created: '2026-10-27'
status: 'done'
baseline_commit: 'ab3430b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 5.3 is in `impl2_scope`, but its 6 bound tests check the refusals of INV-2 (P1–P5), and Story 5.1 must build those anyway. P1 propagates `SellerNotVerified` from the eligibility call that 5.1 makes first. P2–P5 are the checks of the same contract. Once 5.1 is done, the 6 tests turn green and the red gate fails, because 5.3 is not `done`. Built without the checks, they would fail for a reason other than NotImplemented, and the gate fails as well.

**Approach:** A proof-only story, like Stories 3.3 and 4.3 (decisions #23, #27, #29). It has no files of its own in `epics.md`. It runs the 6 tests against 5.1's code, fixes any gap they expose in 5.1's files, and marks 5.3 `done` in the commit right after 5.1. It leaves `impl2_scope` with a note.

## Boundaries & Constraints

**Always:**
- The bound tests are the spec: `[INV-2.P1]`, `[INV-2.P2]`, `[INV-2.I4]`, `[INV-2.P3]`, `[INV-2.P4]`, `[INV-2.P5]`.
- Each refusal writes nothing: no `"InventoryUnit"`, no `"Listing"`, no audit row.
- No business listing is ever open to trade. P2 refuses before the schema's `listing_trade_individual_only` CHECK is reached.
- Each code cites its rule:
  - `OpenToTradeNotAllowed` → `AD-4` with `{ listingKind, openToTrade }`;
  - `InvalidItemRef` → `FR-INV-1` with `{ itemRef, kind }`;
  - `InvalidPrice` → `FR-INV-1` with `{ priceCop }`;
  - `InvalidLocation` → `FR-INV-1` with `{ lat, lng }`.
- Remove 5.3 from `impl2_scope` in `sprint-status.yaml`, with a comment.

**Ask First:** a fix that changes the shape of 5.1's response.

**Never:** a change to the bound tests; a new production file.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Rejected business | eligibility throws | nothing written | `SellerNotVerified` 409, unchanged |
| Business open to trade | `openToTrade: true` | nothing written | `OpenToTradeNotAllowed` 409 |
| Sealed with NM | `etb`, `NM` | nothing written | `InvalidItemRef` 400 |
| Price 999 | — | nothing written | `InvalidPrice` 400 |
| (0, 0) | — | nothing written | `InvalidLocation` 400 |

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/inv_contracts.test.ts` -- the 6 bound tests
- `src/modules/listings/application/inv.v2.ts`, `domain/inv.ts` -- where any gap is fixed
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- `impl2_scope`

## Tasks & Acceptance

**Execution:**
- [x] run the 6 tests on the 5.1 tree; fix any gap in 5.1's files
- [x] `sprint-status.yaml` -- 5.3 `done`, out of `impl2_scope`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 5.1 and 5.3 `done`, when `npm run gate:atdd-red:impl1` runs, then the INV-2 tests are green and nothing is unexpected.

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/inv_contracts.test.ts -t "INV-2"` -- expected: the 11 INV-2 tests pass

## Implementation Notes

- Code review is batched with the rest of Epic 5 at its close (decision #22).
- The 6 bound tests passed on the Story 5.1 tree (commit `75b2be6`) with no change. No gap needed a fix in 5.1's files.
- Where each refusal is built, all in `createListing` before its transaction (Story 5.1):
  - `[INV-2.P1]`: the eligibility call is the first statement, and its `DomainError` propagates.
  - `[INV-2.P2]`/`[INV-2.I4]`: `OpenToTradeNotAllowed` is raised before the catalog call, so the schema's `listing_trade_individual_only` CHECK is never the refusal.
  - `[INV-2.P3]`: `conditionFitsKind` over `catalog.resolveItemRefs`.
  - `[INV-2.P4]`/`[INV-2.P5]`: `isValidPrice` and `isValidLocation` (the `COLOMBIA_BBOX` of the shared kernel).
- 5.3 leaves `impl2_scope` with a note in `sprint-status.yaml`. Like 2.4, 3.3, 3.4 and 4.3, it is `done` early and does not count toward the 43 Impl-1 stories.
