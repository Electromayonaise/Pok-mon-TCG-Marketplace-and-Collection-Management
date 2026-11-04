---
title: 'Story 13.6: Refuse invalid moderation and bad aggregate requests'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: 'a440983'
review_loop_iteration: 0
flow: 'Impl-2 Flow A (test-design.md §7.1): proof-only. [S-FR-REP-5.C1] committed red (f8f2b62) before any Story 13.5/13.6 code; the operations are Story 13.5''s, so both stories turn done in one green commit (the red gate fails if 13.5 is done while 13.6''s tests already pass); one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** S-FR-REP-5, -6 and -7 must refuse or explain what would make the moderation log inexact or a read misleading: a listing hidden twice (two log rows, or an error for an admin who was simply second), a search for `100%` (an unescaped `LIKE` wildcard matching every review, R-31), and a profile for a user who is no seller.

**Approach:** proof-only: the refusals are Story 13.5's operations, and this story's tests prove them. Decisions approved by Mateo (decision log Impl-2 #18):
- **New test:** `[S-FR-REP-5.C1]`, written and committed red before any 13.5/13.6 production code: 20 concurrent hides of one listing give exactly one hide, one `"ListingModerationLog"` row and one audit row, and every other call is the explained no-op, with no error; R-31 enters `test-design.md` §2.
- **Landing:** 13.5 and 13.6 are `done` in the same green commit, with Epic 13.

## Boundaries & Constraints

**Always:** a second hide is `allowedWithNotice` citing `{ hiddenAt, hiddenBy }`, with no log row and no audit row; the search's `\`, `%` and `_` match only themselves; an unknown, buyer or unverified target is `TargetNotFound` (404) with one body. **Ask First:** turning the no-op into an error. **Never:** a weakened bound test.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/inv_supporting.test.ts` -- `[S-FR-REP-5.C1]` (new), `[S-FR-REP-5.f]` (Solu-2); `atdd/rep_contracts.test.ts` -- `[S-FR-REP-6.f]`, `[S-FR-REP-7.f]` (Solu-2)
- `src/modules/listings/application/inv.v2.ts` -- `setListingHidden`: the conditional flip, then the `FOR UPDATE` re-read and `ListingAlreadyHidden` (Story 13.5)
- `src/modules/reviews/domain/rep.ts` -- `escapeLike` (Story 13.5); `rep-domain.test.ts` -- the 1,000-run substring property
- `src/modules/reviews/application/rep.v2.ts` -- `getProfile`'s target rule before any read of `"Review"` (Story 13.5)
- `epics.source.mjs` (13.6 binds `[S-FR-REP-5.C1]`), `contracts.md` (S-FR-REP-5 cites it), `test-design.md` §2 (R-31)

## Tasks & Acceptance

**Execution:**
- [x] red: `[S-FR-REP-5.C1]`, bound and cited, R-31, 13.5 and 13.6 `in-progress`; red run in `evidence/impl2/23-story-13.5-13.6-red.log` (commit `f8f2b62`)
- [x] green with Story 13.5's operations; 13.5, 13.6 and Epic 13 `done`
- [x] `npm run test:ci` green

**Acceptance Criteria:**
- Given a listing hidden once, when an admin hides it again, then the decision is `allowedWithNotice` and there is still one log row (`[S-FR-REP-5.f]`).
- Given 20 admins hiding one listing at once, then one call is `hidden`, 19 are `allowedWithNotice` citing `hiddenBy`, and there is one log row (with the title snapshot), one audit row and the listing hidden for `Counterfeit` (`[S-FR-REP-5.C1]`).
- Given reviews "Precio 100% justo" and "Precio 1000 justo", when an admin searches `100%`, then only the first is found (`[S-FR-REP-6.f]`).
- Given a user who is no review target, when the profile is read, then `TargetNotFound` (404) (`[S-FR-REP-7.f]`).
- The contrast cases: one hide with one log row (`[S-FR-REP-5.h]`), and a known seller's profile (`[S-FR-REP-7.h]`, Story 13.5).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd inv_supporting.test.ts rep_contracts.test.ts -t "S-FR-REP-[567]"` -- expected: 8 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/23-story-13.5-13.6-red.log`: `[S-FR-REP-5.C1]` fails on `NotImplementedError: NotImplemented: listings.setListingHidden` (the race's first rejection, rethrown), and the 6 bound tests of 13.5/13.6 on `NotImplemented`; `gate:atdd-red:impl1`: 8 red for the right reason, 0 not as expected.

**Green phase:** `evidence/impl2/26-story-13.5-13.6-green.log` (`test:ci`, shared with Story 13.5).

## Implementation Notes

- The 19 losers' updates wait on the winner's row lock and then match 0 rows (`"hiddenAt" IS NULL` is re-checked on the committed row under READ COMMITTED); each then re-reads the listing `FOR UPDATE` and returns `ListingAlreadyHidden` with the winner's `hiddenAt` and `hiddenBy`. The race is rethrown on any rejection, so a deadlock or a unique violation would fail it with its real cause.
- `escapeLike` is proven at the pure level against a reference of SQL `LIKE … ESCAPE` semantics (a property over texts and queries made of `a`, `b`, `%`, `_`, `\` and spaces), and in the database by `[S-FR-REP-6.f]` and `rep.v2.test.ts` (`o_j` matches only the literal underscore).
- An unhide of a visible listing is the mirror no-op `ListingNotHidden`, and an unknown listing is `ListingNotFound` (404), both with zero writes (`inv.v2.test.ts`).
