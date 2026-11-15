---
title: 'Story 11.6: Refuse unsafe links, foreign entries and unknown wishlist cards'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '711ff4b'
review_loop_iteration: 0
flow: 'Impl-2 Flow A (test-design.md §7.1): proof-only. [S-FR-COL-3.f2] committed red (7c78cb1) before any Story 11.5/11.6 code; the operations are Story 11.5''s, so both stories turn done in one green commit (the red gate fails if 11.5 is done while 11.6''s tests already pass); one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** S-FR-COL-3..6 must refuse what is unsafe or not the caller's, and say why on the field, with nothing written: an unsafe link (stored and later rendered, an XSS or tracking risk, R-28), another owner's entry, a set with no card entries (a division by zero), and an unknown catalog id on the wishlist.

**Approach:** proof-only: the refusals are Story 11.5's operations, and this story's tests prove them. Decisions approved by Mateo (decision log Impl-2 #17):
- **New test:** `[S-FR-COL-3.f2]`, written and committed red before any 11.5/11.6 production code: `javascript:`, `data:`, an uppercase `HTTP://` spoof, `https://user:pass@host` userinfo, a scheme-relative `//host` and a 2,049-character URL are each `InvalidExternalLink` citing `url`, and a non-https `imageUrl` citing `imageUrl`, with zero writes; R-28 enters `test-design.md` §2.
- **Landing:** 11.5 and 11.6 are `done` in the same green commit, with Epic 11.

## Boundaries & Constraints

**Always:** the link rule runs before any read or write; a refusal cites the failing field and writes no entry and no audit row; a foreign entry gets the body of an unknown id; completion is null, never a division, when the set has 0 card entries. **Ask First:** loosening the link rule (another scheme, an uppercase `HTTPS://`). **Never:** a weakened bound test.

</frozen-after-approval>

## Code Map

- `_bmad-output/test-artifacts/atdd/col_links.test.ts` -- `[S-FR-COL-3.f2]` (new); `atdd/col_supporting.test.ts` -- `[S-FR-COL-3.f]`, `[S-FR-COL-4.f]`, `[S-FR-COL-5.f]`, `[S-FR-COL-6.f]` (Solu-2)
- `src/modules/collections/domain/col.ts` -- `isSafeHttpsUrl`, `invalidLinkField`, `completionPercent` (Story 11.5); `col-domain.test.ts` -- every spoof and the 2,048 / 2,049 boundary at the pure level
- `src/modules/collections/application/col.v2.ts` -- `addExternalEntry` (the rule first), `moveOrCopyEntry` (`lockOwnedEntry` joins the owner), `getBinder` (completion), `addWishlist` (`catalog.getEntries` first)
- `epics.source.mjs` (11.6 binds `[S-FR-COL-3.f2]`), `contracts.md` (S-FR-COL-3 cites it), `test-design.md` §2 (R-28)

## Tasks & Acceptance

**Execution:**
- [x] red: `[S-FR-COL-3.f2]`, bound and cited, R-28, 11.5 and 11.6 `in-progress`; red run in `evidence/impl2/20-story-11.6-red.log` (commit `7c78cb1`)
- [x] green with Story 11.5's operations; 11.5, 11.6 and Epic 11 `done`
- [x] `npm run test:ci` green

**Acceptance Criteria:**
- Given an `http://` URL, or any of `javascript:`, `data:`, `HTTP://`, userinfo, `//host` or 2,049 characters, then `InvalidExternalLink` (400) citing `url`, and no entry or audit row; a non-https `imageUrl` cites `imageUrl`.
- Given another owner's entry, when Julián moves it, then `CollectionEntryNotFound`.
- Given a set with 0 card entries, then the binder's completion is `{ completionPercent: null }`.
- Given an unknown catalog id, when Camila wishlists it, then `InvalidCatalogEntry` and no `"WishlistEntry"` row.
- The contrast case: an `https://` promo link is added (`[S-FR-COL-3.h]`, Story 11.5).

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd col_links.test.ts col_supporting.test.ts -t "S-FR-COL-[3-6]"` -- expected: 9 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** `evidence/impl2/20-story-11.6-red.log`: `[S-FR-COL-3.f2]` fails on `expected 'NotImplementedError' to be 'InvalidExternalLink'` at its first spoof, and the 8 bound tests of 11.5/11.6 on `NotImplemented`; `gate:atdd-red:impl1`: 15 red for the right reason, 0 not as expected.

**Green phase:** `evidence/impl2/22-story-11.5-11.6-green.log` (`test:ci`, shared with Story 11.5).

## Implementation Notes

- The spoof test asserts each case on its own line (`expect(…, label)`), so a red run names the failing case and its reason, and a green run cannot pass on a partial list.
- Over HTTP, the parser's `@pattern ^https://` on `AddExternalEntryRequest.url` and `.imageUrl` refuses `http://`, `HTTP://`, `javascript:`, `data:` and `//host` as `RequestValidationFailed` on the field before the service runs; userinfo and over-long links reach the service and get `InvalidExternalLink` (`composition.test.ts`). The service proves the full rule for every caller, internal ones included. Recorded in `deferred-work.md` (Story 11.5).
- The database CHECK `externalUrl ~ '^https://'` stays behind the rule, so an uppercase `HTTPS://` is refused by the rule rather than failing as a 500.
