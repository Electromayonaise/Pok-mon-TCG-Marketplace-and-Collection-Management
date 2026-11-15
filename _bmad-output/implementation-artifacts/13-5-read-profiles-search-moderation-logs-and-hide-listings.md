---
title: 'Story 13.5: Read profiles, search moderation logs and hide listings'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: 'a440983'
review_loop_iteration: 0
flow: 'Impl-2 Flow A + D + E (test-design.md §7.1, decision log Impl-2 #18): [S-FR-REP-7.C1] (with 13.6''s [S-FR-REP-5.C1]) committed red (f8f2b62) before any 13.5/13.6 code; the NFR-REP-2 profile benchmark and the k6 burst written with the code; the public profile page with a Playwright journey. Lands together with Story 13.6 (proof-only) and closes Epic 13; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/C-UX-Scenarios/11-rep-reputation-moderation/11.2-seller-reputation-profile/11.2-seller-reputation-profile.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/microcopy-es-CO.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** reviews can be written, hidden and aggregated (Stories 13.1–13.4), but nobody can read a seller's profile, an admin cannot hide a listing, search reviews or read either moderation log: `setListingHidden`, `listListingModerationLog`, `searchReviews`, `listReviewModerationLog` and `getProfile` throw NotImplemented, their six procedures are unwired, and the app has no profile page.

**Approach:** S-FR-REP-5 in the `listings` host, S-FR-REP-6 and -7 in `reviews`, the procedures, and a UI slice, with Flow A, D and E. Decisions approved by Mateo (decision log Impl-2 #18):
- **New red tests before any code:** `[S-FR-REP-7.C1]` (this story: 100 rounds of profile reads racing hides and unhides of one seller's ≤ 20 reviews, the aggregate always counting exactly the reviews it lists, R-29) and `[S-FR-REP-5.C1]` (Story 13.6: 20 concurrent hides of one listing, one log row, R-31); and the NFR-REP-2 profile benchmark `[NFR-REP-2.profile]` written with the code (p95 ≤ 300 ms, PRD §7 protocol).
- **k6 (Flow D), local and a blocking CI job:** `npm run nfr:k6` seeds the §3 marketplace into `tezg_k6` through a `k6-seed` Vitest project that asserts the seed's counts, serves the production build on port 3200 and runs `grafana/k6:1.4.2` (50 VUs for a minute, no sleep; profile p95 < 300 and p99 < 800, browse p95 < 1,000, errors < 1 %, 0 5xx); the `nfr-k6` job in `impl2-quality-gate.yml` gates `release`.
- **Profile journey (UX 11.2):** with no sign-in, a visitor sees a seeded seller's rating, count and first page of visible reviews; a hidden review is neither shown nor counted; an unknown seller gets the es-CO Not-available page.

## Boundaries & Constraints

**Always:** the profile's aggregate and its page of 20 come from one `REPEATABLE READ` read-only transaction (AD-REP-2 rule 2); a hide or unhide is the conditional update plus one log row with its snapshot and an admin audit row, and a second hide is an explained no-op with no log row (AD-REP-3 rules 1–2); a hidden listing leaves discovery on the next request and its reservations are untouched (rule 3); the admin search escapes `\`, `%` and `_` before `LIKE … ESCAPE '\'` on `tezg_unaccent_lower` (rule 4); each log reads 50 per page by `(at desc, id)` (rule 5); hide, never delete (AD-12). **Ask First:** an export of the search or the logs; a cache in front of the profile. **Never:** a weakened bound test; a module reading the other's moderation table (AD-8).

</frozen-after-approval>

## Code Map

- `src/modules/listings/application/inv.v2.ts` -- `setListingHidden` (admin in the service, the conditional flip, the locked re-read, the title snapshot through `catalog.getEntries` on the ambient connection, the log row and the audit row), `listListingModerationLog`, `checkModerationNote`; `inv.v2.test.ts` -- hide and unhide through the public read on a pool of 1, the bundle title, the no-ops, the note and admin refusals, the log's pages and reason filter
- `src/modules/listings/ports/inv.v2.ts` -- `InvRepository = InvTablesRepository & AdminFactsReader`, `ModeratedListing`, `NewListingModerationLog`; `infra/pg.ts` -- `hideVisibleListing`, `unhideHiddenListing` (one `WITH … UPDATE … RETURNING` joined to the unit's catalog entry), `readListingHide` (`FOR UPDATE`), `insertListingModerationLog`, `listListingModerationLog`
- `src/modules/reviews/domain/rep.ts` -- `escapeLike`, `encodeReviewCursor` / `decodeReviewCursor` (tagged per list); `rep-domain.test.ts` -- a LIKE reference and a 1,000-run property that the escaped pattern is exactly a substring test, the cursors' refusals
- `src/modules/reviews/application/rep.v2.ts` -- `searchReviews`, `listReviewModerationLog`, `getProfile` (the identity reads, the aggregate and the page in one REPEATABLE READ transaction), `aggregateOf` (shared with `getAggregates`); `rep.v2.test.ts` -- profile paging, the empty aggregate, the search's accent and wildcard cases, the cursors, both pages of 50
- `src/modules/reviews/ports/rep.v2.ts` + `infra/pg.ts` -- `KeysetPage`, `visibleReviewPage`, `searchReviews`, `listReviewModerationLog`; `dto/rep.v2.dto.ts` -- `ProfileSellerDTO`, `GetProfileResponse.seller`
- `contracts.md` §13 -- stored-only `ListingHiddenByAdmin`, `ListingAlreadyHidden`, `ListingUnhiddenByAdmin`, `ListingNotHidden`; §15 S-FR-REP-5 and -7 cite the two new tests
- `src/server/composition.ts` -- the six procedures (`reputation.admin.search`, `reputation.admin.log`, `reputation.profile`, `inventory.admin.hide`, `.unhide`, `.log`) and `WIRED_PROCEDURES`; `src/server/moderation-log.ts` -- `mergeModerationLogs` for the 11.4 view; `composition.test.ts` -- the profile with no session, a listing hide, the search and the merged audit over HTTP, and "the whole registry is wired"
- `app/perfil/[userId]/page.tsx` (the public profile), `app/perfil/profile.ts` (+ `profile.test.ts`: decimal comma, stars, count, provenance, the Bogotá date, `?pagina=`)
- `_bmad-output/test-artifacts/atdd/rep_contracts.test.ts` (`[S-FR-REP-6.h]`, `[S-FR-REP-7.h]`, `[S-FR-REP-7.C1]`), `atdd/inv_supporting.test.ts` (`[S-FR-REP-5.h]`), `nfr/rep2_latency.test.ts` (`[NFR-REP-2.profile]`)
- `_bmad-output/test-artifacts/nfr/k6/reputation-profile.js`, `nfr/k6/seed.k6.ts`, `scripts/nfr-k6.mjs`, `vitest.config.ts` (`k6-seed`), `package.json` (`nfr:k6`), `.github/workflows/impl2-quality-gate.yml` (`nfr-k6`, `release` needs it)
- `_bmad-output/test-artifacts/e2e/profile.spec.ts`, `e2e/pages/SellerProfilePage.ts`, `e2e/support/profile-seed.ts`

## Tasks & Acceptance

**Execution:**
- [x] red first: `[S-FR-REP-7.C1]` and `[S-FR-REP-5.C1]`, bound and cited, R-29 and R-31, 13.5 and 13.6 `in-progress` (commit `f8f2b62`, `evidence/impl2/23-story-13.5-13.6-red.log`)
- [x] the listing hide and its log in `listings`, the search, the log and the profile in `reviews`, with their domain and integration tests
- [x] the six procedures, one HTTP test, and the merged audit
- [x] `[NFR-REP-2.profile]` and R-30; `npm run nfr:k6` green locally (`evidence/impl2/24-k6.log`), the `nfr-k6` CI job gating `release`
- [x] the `/perfil/<userId>` page, its page object and journey; `npx playwright test` green (`evidence/impl2/25-story-13.5-e2e.log`)
- [x] `contracts.md`, `test-design.md`, `nfr-evidence.md`, `deferred-work.md`, `sprint-status.yaml` (13.5, 13.6 and Epic 13 `done`), `traceability-matrix.md`
- [x] `npm run test:ci` green with 13.5 and 13.6 `done`

**Acceptance Criteria:**
- Given a seller with a visible and a hidden review, when a buyer opens the profile, then it lists and counts only the visible one (`[S-FR-REP-7.h]`).
- Given 100 rounds of three readers and four admins hiding and unhiding the seller's reviews, then every read's count and average are those of the reviews it lists (`[S-FR-REP-7.C1]`).
- Given a listing, when an admin hides it, then it leaves the public read, one `"ListingModerationLog"` row snapshots its title, and the decision is `hidden` under FR-REP-5 (`[S-FR-REP-5.h]`).
- Given three review log rows an hour apart, then the log reads newest first, and merged with the listing log the rows interleave by time (`[S-FR-REP-6.h]`, `composition.test.ts`).
- Given the §3 seed, then 500 profile reads are p95 ≤ 300 ms (`[NFR-REP-2.profile]`), and the 50-user k6 burst passes every threshold.
- Given no session, when a visitor opens Lucía's profile, then "4,5 de 5", "2 reseñas · Las reseñas no están ligadas a compras" and her two visible reviews show, and the hidden text does not; an id that is no seller shows "No encontramos este perfil.".

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd rep_contracts.test.ts inv_supporting.test.ts -t "S-FR-REP-[567]"` -- expected: 8 passed
- `npx vitest run --project impl1-unit src/modules/reviews src/modules/listings src/server app/perfil` -- expected: pass
- `npx vitest run --project solu2-nfr rep2_latency.test.ts` -- expected: 3 passed
- `npm run nfr:k6` -- expected: every threshold passes, exit 0
- `npx playwright test` -- expected: 6 passed
- `npm run test:ci` -- expected: exit 0

**Red phase (Flow A):** commit `f8f2b62`, `evidence/impl2/23-story-13.5-13.6-red.log`: the 6 bound tests and the 2 new ones fail on `NotImplemented`; `gate:atdd-red:impl1` 0 not as expected.

**Green phase:** `evidence/impl2/26-story-13.5-13.6-green.log` (`test:ci`), `24-k6.log` and `k6-summary.json` (k6), `25-story-13.5-e2e.log` (Playwright). `[S-FR-REP-7.C1]` was mutation-checked: with the profile in a READ COMMITTED transaction it fails in 3 of 3 runs.

## Implementation Notes

- **`[S-FR-REP-7.C1]` was strengthened in the green phase.** Its red version (one burst per round of three single reads and four single moderations) still passed with the profile read in READ COMMITTED, so it could not fail. The committed version runs, per round, four admins each hiding then unhiding one review while four readers each read three times, and asserts all 12 reads; under READ COMMITTED it fails every run, under REPEATABLE READ it passes. Its id, binding and claim are unchanged.
- **Listing hide:** `requireAdmin` in the service (AD-16), as REP-2 does, so `InvRepository` now carries identity's `AdminFactsReader`. The flip is one statement that returns the seller, a bundle's title and a single's catalog entry; the title snapshot of a single is its catalog name (INV-1 Q2's rule), read through `catalog.getEntries` on the transaction's own connection (proven on a pool of 1). On 0 rows the listing is re-read `FOR UPDATE`; a state that changed back lets the action apply under the lock. The note rule is REP-2's (Other: 10–500, else ≤ 500). Hiding bumps `version`, so a stale owner edit is refused.
- **Search and logs:** the query is trimmed, 1–200 characters with no NUL, then escaped and matched as `'%' || tezg_unaccent_lower($1) || '%'`, hidden reviews included. Pages are keysets of `("createdAt", id)` descending with 51 rows read; a cursor carries its list's tag, so a log cursor is refused by the search. The listing log reuses listings' existing keyset cursor.
- **Profile:** P is REP-1's target rule, so a buyer, an unverified shop and an unknown id share `TargetNotFound` (404). The identity reads (`getReviewTarget`, `getDisplayNames`) run inside the REPEATABLE READ transaction on its connection (AD-SYS-4 rule 9), which halved the profile's p95 at N = 1 when run alone (14 → 7 ms) and made each profile one connection under load. `page` is 1–1,000.
- **k6:** closed-loop, so latency under the burst follows the one Node server's throughput; three local runs gave profile p95 177–279 ms (recorded in `deferred-work.md`). On Linux the container runs on the host network as the runner's uid, so it can write the summary; elsewhere it reaches `host.docker.internal`.
- **Test infrastructure:** `solu2-atdd` runs 3 files at a time (`maxWorkers`): with 16 local workers the 60-connection pools reached Postgres's 200 connections and done races failed with 53300 (on HEAD too).
- **Deferred** (`deferred-work.md`): pages 11.1, 11.3 and 11.4 and the merged view's deep paging; the profile's write action and the author's tombstone; the shop's business name and city; keyset paging of the profile; a trigram index for the search; k6's closed-loop sensitivity.
