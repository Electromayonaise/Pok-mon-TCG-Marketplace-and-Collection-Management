---
title: 'Story 11.5: Use the binder, add external cards, move entries and wishlist cards'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '711ff4b'
review_loop_iteration: 0
flow: 'Impl-2 Flow B + D + E (test-design.md §7.1): the 4 Solu-2 bound tests were already red; unit and integration tests written with the code; the NFR-COL-2 benchmark written with the code; the binder pages with a Playwright journey. Lands together with Story 11.6 (proof-only), whose red commit 7c78cb1 came first; one code review per epic batch (decision log Impl-2 #4)'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/C-UX-Scenarios/09-col-collections/9.1-collections-binder/9.1-collections-binder.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/C-UX-Scenarios/09-col-collections/9.2-add-entry/9.2-add-entry.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** collectors can create collections and add catalog cards (Stories 11.1–11.3), but the binder, link-added promos, move and copy, and the wishlist throw NotImplemented (`addExternalEntry`, `moveOrCopyEntry`, `getBinder`, `setBinderLayout`, `reorderEntries`, `addWishlist`, `removeWishlist`, `listWishlist`, `completionPercent`), their nine procedures are unwired, and the app has no collection page.

**Approach:** the eight use cases over COL's own tables, the pure rules (link, binder order, completion, wishlist order) in the domain, the procedures, and a UI slice. Decisions approved by Mateo (decision log Impl-2 #17):
- **Batch identity port:** P-INV.availability, which the wishlist composes, stops reading each business seller's verification one call at a time: `IdentityForInv` gains `getSellerKinds` (S-FR-IDN-6.kinds), plus AD-INV-3 rule 2's parity test of the batch and the single form. This closes the Epic 5 deferral.
- **New tests:** `[S-FR-COL-3.f2]` red before any code (Story 11.6, R-28), and the NFR-COL-2 benchmark bound to this story (a 500-entry binder read on a 3-key sort at p95 ≤ 800 ms, a 200-card wishlist list at p95 ≤ 1,000 ms).
- **Binder journey (UX 9.1):** sign in through `/ingresar`, open a seeded binder, switch the sort (the order changes and is identical after a reload), add a promo by an https link (it lands in a pocket), and see an `http://` link refused on its field in es-CO.

## Boundaries & Constraints

**Always:** a link is validated by the pure rule before any read or write, and refused with `InvalidExternalLink` citing its field (AD-COL-1 rule 4); `collections` never fetches a link and never writes `"CatalogEntry"` (AD-7, AD-8); the binder order ends on `entryId` (AD-COL-1 rule 5); completion is `floor(owned × 100 / cardEntryCount)`, or null when the count is 0; a foreign entry is `CollectionEntryNotFound` and a foreign collection `CollectionNotFound`, with the body of an unknown id; the wishlist asks listings for at most 500 ids per call. **Ask First:** a server fetch or unfurl of a link; a new sort key or a saved sort. **Never:** an http image in the page; a write to another module's table.

</frozen-after-approval>

## Code Map

- `src/modules/collections/domain/col.ts` -- `completionPercent`, `isSafeHttpsUrl`, `invalidLinkField`, `MAX_URL_LENGTH`, `MAX_SORT_KEYS`, `isLayoutSize`, `binderOrder` (with `BinderSortable`, `BinderOrderKey`), `AVAILABILITY_BATCH`, `chunks`, `wishlistOrder`; unit tests in `src/modules/collections/col-domain.test.ts` (100 % branches)
- `src/modules/collections/application/col.v2.ts` -- `addExternalEntry`, `moveOrCopyEntry`, `getBinder`, `setBinderLayout`, `reorderEntries`, `addWishlist`, `removeWishlist`, `listWishlist`; `col.v2.test.ts` -- the binder with the real catalog (set filter, completion, link order), link, move/copy, layout, reorder and wishlist edges
- `src/modules/collections/ports/col.v2.ts` + `infra/pg.ts` -- `NewExternalEntry`, `BinderEntryRow`, `WishlistRow`; `PgColBinderRepository` (extended by `PgColRepository`): `insertExternalEntry`, `lockOwnedEntry`, `moveEntry`, `copyEntry`, `readBinderLayout`, `readBinderEntries`, `updateBinderLayout`, `setManualPositions`, `insertWishlistEntry`, `deleteWishlistEntry`, `readWishlist`
- `src/modules/collections/dto/col.v2.dto.ts` -- `BinderEntryDTO` gains `externalUrl`, `imageUrl` and `orderId` (the pocket's badge, image and order link)
- `src/modules/listings/application/inv.v2.ts` -- P-INV.availability through `identity.getSellerKinds`, in 500s; `ports/inv.v2.ts` (generated) -- `IdentityForInv.getSellerKinds`; `inv.v2.test.ts` -- the parity test over the seed
- `schemas/operations.json` -- `S-FR-IDN-6.kinds` consumed by `INV`; `contracts.md` §13 -- stored-only `CollectionEntryMoved`, `CollectionEntryCopied`, and `CollectionEntryAdded` for S-FR-COL-3
- `src/server/composition.ts` -- the nine procedures; `src/server/composition.test.ts` -- all nine over HTTP
- `app/coleccion/` -- the collections list, `[collectionId]/page.tsx` (the binder), `[collectionId]/agregar/` (the link form), `binder.ts` (sort keys, badges, the https image rule); `app/ingresar/` -- `?siguiente=`; `app/layout.tsx` -- "Mi colección"
- `_bmad-output/test-artifacts/atdd/col_supporting.test.ts` (4 bound tests), `atdd/inv_supporting.test.ts` (its identity fake gains `getSellerKinds`), `nfr/col2_latency.test.ts` (`[NFR-COL-2.binder]`, `[NFR-COL-2.wishlist]`)
- `_bmad-output/test-artifacts/e2e/binder.spec.ts`, `e2e/pages/BinderPage.ts`, `e2e/pages/AddLinkPage.ts`, `e2e/support/binder-seed.ts`, `e2e/support/db.ts` (shared with `inbox-seed.ts`)

## Tasks & Acceptance

**Execution:**
- [x] Story 11.6's red commit first (`7c78cb1`, `[S-FR-COL-3.f2]`, R-28); 11.5 and 11.6 `in-progress` together
- [x] domain rules and their unit tests (`domain/col.ts` at 100 % branches), the repository, the service and its integration tests
- [x] the batch identity port, the generated `IdentityForInv`, the parity test, and the Epic 5 deferrals closed
- [x] the nine procedures in the composition root, one HTTP test
- [x] the NFR-COL-2 benchmark, its figures in `nfr-evidence.md`
- [x] the UI slice `/coleccion`, `/coleccion/<id>`, `/coleccion/<id>/agregar`, the page objects and the journey; `npx playwright test` green (`evidence/impl2/21-story-11.5-e2e.log`)
- [x] `contracts.md`, `deferred-work.md`, `nfr-evidence.md`, `sprint-status.yaml` (11.5, 11.6 and Epic 11 `done`), `traceability-matrix.md`
- [x] `npm run test:ci` green with 11.5 and 11.6 `done`

**Acceptance Criteria:**
- Given Valentina's collection, when she adds two promos by link, then two `cardKind = 'external'` entries exist and `"CatalogEntry"` is unchanged.
- Given Camila's PlatformPurchase entry, when she copies it to another collection, then the copy keeps `source = PlatformPurchase` and its `orderId`.
- Given three entries with the same acquisition date, when the binder is read twice sorted by it, then both reads give the same order, by `entryId`.
- Given Camila wishlists a card, then the list shows its lowest purchasable price and available count from listings.
- Given the seed's 500-entry collection, then a binder read on 3 keys is p95 ≤ 800 ms; given a 200-card wishlist, then its list is p95 ≤ 1,000 ms.
- Given Julián signs in from his binder, when he sorts by name, then the order changes and a reload shows it again; when he adds an `http://` link, then the link field shows "El enlace debe empezar por https:// y tener menos de 2.048 caracteres." and his text is kept; with `https://`, the promo lands in a pocket with "Agregado por enlace · promos.example".

## Verification

**Commands:**
- `npx vitest run --project solu2-atdd col_supporting.test.ts col_links.test.ts inv_supporting.test.ts` -- expected: the 8 bound tests of 11.5/11.6 and `[S-FR-COL-3.f2]` pass (the two `[S-FR-REP-5.*]` of Story 13.5 stay red)
- `npx vitest run --project impl1-unit src/modules/collections src/modules/listings src/server/composition.test.ts` -- expected: pass
- `npx vitest run --project solu2-nfr col2_latency.test.ts` -- expected: 2 passed
- `npx playwright test` -- expected: 4 passed
- `npm run test:ci` -- expected: exit 0

**Red phase:** Story 11.6's commit `7c78cb1`, `evidence/impl2/20-story-11.6-red.log`: this story's 4 bound tests, 11.6's 4 and `[S-FR-COL-3.f2]` fail on `NotImplemented`; `gate:atdd-red:impl1` 0 not as expected.

**Green phase:** `evidence/impl2/22-story-11.5-11.6-green.log` (`test:ci`), `evidence/impl2/21-story-11.5-e2e.log` (Playwright, first run green). The parity test was mutation-checked: counting every seller as verified fails it.

## Implementation Notes

- **Link rule (`isSafeHttpsUrl`):** the value must start with the lowercase `https://` the `CollectionEntry` CHECK requires, hold at most 2,048 code points and no whitespace, control character or backslash, have a non-empty authority with no `@` (userinfo), and parse as an https URL with a host. `invalidLinkField` checks `url`, then `imageUrl` (optional); the title is checked with the shared `textIssue` (1–120, not blank, no NUL) and refused as `InvalidExternalLink` on `title` too (FR-COL-3: "citing the failing field"). `qty` and `acquiredAt` (a real day, not after today in Bogotá) are `RequestValidationFailed`, because the procedure declares no `InvalidAcquiredDate`.
- **Binder:** one read-only transaction reads the owner's layout (none: `CollectionNotFound`) and every entry; catalog attributes come from `catalog.getEntries` in 500s. `binderOrder` sorts ascending on each key, then `entryId`; no key means `manual`. `setNumber` puts link-added entries after the catalog ones by title, and a card the catalog no longer has after its set (titled "Carta fuera del catálogo"); names compare accent- and case-blind with numbers as read (`Intl.Collator('es-CO', { numeric: true })`); a missing price paid sorts last. With a `setId`, the entries are filtered to the set, and completion counts distinct owned `kind = card` entries of the set; an unknown set has `completion: null`.
- **Move and copy:** under `col:owner`, the owner's entry `FOR UPDATE OF e` (a foreign one is `CollectionEntryNotFound`), then the owner's target (`CollectionNotFound`). Move sets the target and `max(manualPosition) + 1`; copy is one `INSERT … SELECT` of every column, so `source`, `orderId` and the link fields carry over. New stored-only decisions `CollectionEntryMoved` and `CollectionEntryCopied`.
- **Layout and reorder:** rows and cols 1–5 (`RequestValidationFailed` otherwise); reorder runs under `col:owner` and needs each entry of the collection exactly once (`RequestValidationFailed` otherwise), then one `UPDATE … FROM unnest($2) WITH ORDINALITY`. Both audit.
- **Wishlist:** add validates `maxPriceCop` (1,000–100,000,000) and `note` (≤ 200, no NUL), then the catalog id (`InvalidCatalogEntry`), then `ON CONFLICT DO NOTHING` (a second add keeps the first row); add and remove return the list and audit only a real change. The list asks `getAvailabilitySummary` in 500s with `area: null` and orders by lowest price, unavailable last, then catalog id.
- **Batch identity port:** `S-FR-IDN-6.kinds` now lists `INV` as a consumer, so `npm run gen:api:solu2` adds `getSellerKinds` to `IdentityForInv`; the composition root already binds `identity: idn`. P-INV.availability asks it for the distinct business sellers of the candidates, 500 per call. The parity test seeds the §3 marketplace, unpauses a funded Pending shop so only the verification term excludes it, and compares the batch summary of 500 listed cards with the single form (each business listing admitted by `getSellerVerification`), plus both identity forms over 16 accounts of every kind.
- **UI:** the binder is a server component: `collections.binder` with the sort in `?orden=` (a GET form, so a reload keeps it), pages of `rows × cols` pockets (`?pagina=`), and `?entrada=` after an add opens the page holding the new entry and announces it. Pockets show the source badge in words; an image is rendered only when it is https, with `referrerPolicy="no-referrer"` and `loading="lazy"` (S-12). The link form posts `collections.addExternal` and maps both the parser's issues and `InvalidExternalLink`'s field to the §8 copy under the field, keeping what was typed. `/ingresar?siguiente=` returns to the page that sent the visitor (a same-site path only).
- **Deferred** (`deferred-work.md`): directions, more sort keys and a saved sort; sets ordered by id; wishlist sorts and area; the parser's `RequestValidationFailed` for `http://` before `InvalidExternalLink`; the rest of pages 9.1–9.3; server paging past 500 entries; ARCHITECTURE §6.10's route form.
