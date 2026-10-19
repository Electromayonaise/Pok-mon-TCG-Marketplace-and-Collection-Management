---
title: Edge-case review — Solu-1 schemas, DTOs and ports
reviewed: docs/solu-1/planning/schemas/*.sql, src/modules/*/dto/*.ts, src/modules/*/ports/*.ts (against docs/solu-1/planning/contracts.md)
skill: bmad-review-edge-case-hunter
date: 2026-10-18
status: triaged — Phase 2 gate, 2026-10-18 (decision log #14)
---

# Edge-case review — Solu-1 schemas, DTOs and ports

**Report 2 of 4** (task statement §7). The skill walks every branch and boundary and reports only unhandled paths, with no severity. It ran in the session that wrote the files, so it is a self-review under the skill's path-tracing method. Mateo decides the triage at the Phase 2 gate.

## Raw output (the skill's JSON, verbatim)

```json
[
{"location":"001_create_identity_user_and_profile.sql:\"User\".email","trigger_condition":"Two sign-ups with emails differing only in letter case","guard_snippet":"CREATE UNIQUE INDEX user_email_ci ON \"User\"(lower(email))","potential_consequence":"Two accounts for one mailbox; duplicate seller tracks for one person"},
{"location":"002_create_identity_business_application.sql:\"BusinessProfile\"","trigger_condition":"BusinessProfile row inserted for an individual-track user","guard_snippet":"add \"sellerTrack\" TEXT NOT NULL DEFAULT 'business' + composite FK to User(id,\"sellerTrack\")","potential_consequence":"Payment instructions stored for an individual seller account"},
{"location":"002_create_identity_business_application.sql:business_application_only_rejection_has_policy","trigger_condition":"rejectionNote written on a Pending or Approved application","guard_snippet":"CHECK (status = 'Rejected' OR \"rejectionNote\" IS NULL)","potential_consequence":"Applicant sees a rejection note on an approved application"},
{"location":"003_create_catalog.sql:\"CatalogEntry\".kind","trigger_condition":"An upsert's DO UPDATE SET list includes kind","guard_snippet":"exclude kind from DO UPDATE SET; contract states the column list","potential_consequence":"A card becomes sealedProduct under existing bundle components"},
{"location":"004_create_listings_inventory.sql:\"Listing\".\"inventoryUnitId\"","trigger_condition":"Listing.sellerId differs from its InventoryUnit.sellerId","guard_snippet":"UNIQUE (id,\"sellerId\") on InventoryUnit; FK (\"inventoryUnitId\",\"sellerId\") REFERENCES InventoryUnit(id,\"sellerId\")","potential_consequence":"A purchase decrements another seller's stock"},
{"location":"004_create_listings_inventory.sql:\"BundleComponent\"","trigger_condition":"Component unit belongs to another seller or copied attributes drift","guard_snippet":"composite FK (\"inventoryUnitId\",\"catalogEntryId\",condition) to InventoryUnit unique triple + seller check","potential_consequence":"Bundle sells a unit it does not own; display shows wrong card"},
{"location":"005_create_orders.sql:\"cancelReason\"","trigger_condition":"cancelReason set while order is neither cancelled nor expired","guard_snippet":"CHECK ((\"cancelReason\" IS NULL) = (\"cancelledAt\" IS NULL AND \"expiredAt\" IS NULL))","potential_consequence":"An active order displays a cancellation reason"},
{"location":"005_create_orders.sql:fact timestamps","trigger_condition":"sellerReceivedConfirmedAt earlier than buyerPaidConfirmedAt, or comprobante uploaded after paid","guard_snippet":"CHECK (\"sellerReceivedConfirmedAt\" >= \"buyerPaidConfirmedAt\") etc.; CHECK (\"comprobanteUploadedAt\" <= \"buyerPaidConfirmedAt\")","potential_consequence":"Commission trigger instant computed from an impossible fact order"},
{"location":"005_create_orders.sql:\"reservedUnitIds\"","trigger_condition":"reservedUnitIds differs from the unit ids inside reservationRef","guard_snippet":"derive reservedUnitIds from reservationRef in one write; or GENERATED column from jsonb","potential_consequence":"Expiry pre-step misses an order; stock never reclaimed"},
{"location":"007_create_trading.sql:\"roundCount\" + TradeOfferRound","trigger_condition":"markedUnfulfillable round appended to an offer already at roundCount 10","guard_snippet":"state: markedUnfulfillable uses round = max(round)+1 and never increments roundCount","potential_consequence":"CHECK roundCount <= 10 aborts the winning accept"},
{"location":"007_create_trading.sql:\"TradeOffer\".\"expiresAt\"","trigger_condition":"expiresAt not after createdAt","guard_snippet":"CHECK (\"expiresAt\" > \"createdAt\")","potential_consequence":"Offer born expired; first action fails TradeOfferNotOpen"},
{"location":"008_create_messaging.sql:\"Message\".\"senderId\"","trigger_condition":"Message inserted by a user who is not a participant","guard_snippet":"FOREIGN KEY (\"conversationId\",\"senderId\") REFERENCES \"ConversationParticipant\"(\"conversationId\",\"userId\")","potential_consequence":"Third party message stored inside someone else's thread"},
{"location":"008_create_messaging.sql:\"Message\".body","trigger_condition":"Body stored without NFC normalization","guard_snippet":"CHECK (body IS NFC NORMALIZED)","potential_consequence":"Same text stored twice in different byte forms; search mismatches"},
{"location":"009_create_collections.sql:\"manualPosition\"","trigger_condition":"Two writers skip the col:owner lock and pick the same position","guard_snippet":"UNIQUE (\"collectionId\",\"manualPosition\") DEFERRABLE INITIALLY DEFERRED","potential_consequence":"Binder order ambiguous; reorder swaps the wrong cards"},
{"location":"009_create_collections.sql:CollectionEntry ON DELETE CASCADE","trigger_condition":"Collection deleted after its prompt was Accepted into it","guard_snippet":"ON DELETE RESTRICT for source='PlatformPurchase' rows, or move them to General before delete","potential_consequence":"Purchase entries lost; prompt Accepted so they cannot be re-created"},
{"location":"009_create_collections.sql:\"acceptedIntoCollectionId\"","trigger_condition":"Collection id dangles after its collection is deleted","guard_snippet":"keep id as history; document no FK by design","potential_consequence":"Prompt history links to a missing collection"},
{"location":"004/010:\"hiddenReason\"","trigger_condition":"hiddenReason set to a value outside the ADD-§9.2 reason list","guard_snippet":"CHECK (\"hiddenReason\" IN ('Harassment','PersonalData','Spam','OffTopic','Other'))","potential_consequence":"Author sees an unlisted reason; audit and row disagree"},
{"location":"099_grants_append_only.sql:GRANT ON ALL TABLES","trigger_condition":"A later migration creates a table","guard_snippet":"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tezg_app","potential_consequence":"App role has no access to new tables; or grants forgotten"},
{"location":"src/modules/listings/dto/dsc.dto.ts:SearchRequestDTO.page","trigger_condition":"page = 10^9","guard_snippet":"page: integer 1..417 (10,000 rows / 24)","potential_consequence":"OFFSET of billions scans the table; latency NFR broken"},
{"location":"src/modules/collections/dto/val.dto.ts:ValuationDTO.totalCop","trigger_condition":"BigInt total exceeds Number.MAX_SAFE_INTEGER","guard_snippet":"assertSafeInteger(total) -> 'Unexpected' (AD-SYS-7 rule 1), stated in the contract","potential_consequence":"Silent precision loss in the displayed collection value"},
{"location":"src/modules/messaging/dto/msg.dto.ts:SendMessageTargetDTO","trigger_condition":"Object carries both recipientId and conversationId","guard_snippet":"zod: z.union([z.object({recipientId}).strict(), z.object({conversationId}).strict()])","potential_consequence":"Path ambiguity: message lands in a different conversation than intended"},
{"location":"src/modules/reviews/dto/rep.dto.ts, src/modules/listings/dto/inv.dto.ts:id arrays","trigger_condition":"sellerIds or catalogEntryIds contain duplicates","guard_snippet":"zod refine: new Set(ids).size === ids.length","potential_consequence":"Response has duplicate rows; one-row-per-id contract breaks"},
{"location":"src/modules/catalog/ports/cat.ts:IdentityForCatalog","trigger_condition":"catalog calls identity.requireAdmin at runtime","guard_snippet":"move the admin check to adminProcedure in server/trpc; catalog keeps zero module deps","potential_consequence":"AD-1 violated: catalog gains a dependency on identity"}
]
```

## Triage

Mateo adopted the recommendation below in full at the Phase 2 gate on 2026-10-18 (decision log #14). Each Accept is applied, and marked `review E-nn` at its location in the migrations, DTOs or `contracts.md`. The two Rejects are documented in the migration comments, and the Defer (E-15) is carried to Solu-2's gap audit.

| # | Finding | Recommendation | Reason |
|---|---|---|---|
| E-01 | Case-insensitive email uniqueness | **Accept** | Better Auth stores the email as given; one mailbox must be one account, or AD-IDN-2 exclusivity is bypassed with a second account |
| E-02 | `BusinessProfile` lacks the track guard | **Accept** | Same composite-FK pattern as P-1, at no cost |
| E-03 | `rejectionNote` on a non-rejected application | **Accept** | One CHECK |
| E-04 | `kind` mutable by the upsert | **Accept** | State the `DO UPDATE SET` column list in `upsertCatalogEntry` (excludes `kind`, `externalKey`, `id`) |
| E-05 | Listing points at another seller's unit | **Accept** | A real oversell vector: composite FK `(inventoryUnitId, sellerId)` |
| E-06 | Bundle component unit ownership and drift | **Accept** | `BundleComponent` gains `sellerId`; composite FK to `InventoryUnit(id, sellerId, catalogEntryId, condition)` |
| E-07 | `cancelReason` without a terminal state | **Accept** | One CHECK |
| E-08 | Fact timestamps out of order | **Accept** | Physical backstop to AD-ORD-2: `seller ≥ paid`, `item ≥ paid`, `comprobanteUploadedAt ≤ paid` |
| E-09 | `reservedUnitIds` drift from `reservationRef` | **Accept** | `GENERATED ALWAYS AS` cannot read jsonb arrays into `text[]` portably, so the contract states both are written from the same `reservationRef` value in the one insert, and a CHECK asserts `cardinality(reservedUnitIds) = jsonb_array_length(reservationRef->'units')` |
| E-10 | Unfulfillable round vs `roundCount ≤ 10` | **Accept** | State in `acceptOffer`: the `markedUnfulfillable` round takes `max(round) + 1` and never increments `roundCount` |
| E-11 | Offer born expired | **Accept** | One CHECK |
| E-12 | Non-participant sender | **Accept** | Composite FK to `ConversationParticipant` |
| E-13 | Body not NFC | **Accept** | `CHECK (body IS NFC NORMALIZED)` (PostgreSQL ≥ 13) |
| E-14 | `manualPosition` uniqueness | **Reject** | Binder order already has a deterministic final tie-break on `entryId` (AD-COL-1 rule 5), so a duplicate position is never ambiguous. A deferrable unique on a column that `reorder` rewrites in bulk adds a deferred-check cost to every move for no observable gain, and review F-13's owner lock already serializes the writers |
| E-15 | Deleting a collection drops purchase entries forever | **Defer** | Real, but the decision belongs to FR-COL-1 (delete semantics) in Plan-2's PRD, not to Solu-1's DDL. Routed to Solu-2's gap audit as E-15 |
| E-16 | `acceptedIntoCollectionId` dangles | **Reject** | The prompt keeps history of where it was accepted; a dangling id is the intended record (the row is never read to navigate). Documented in the migration |
| E-17 | `hiddenReason` unconstrained | **Accept** | Two CHECKs (listing reasons and review reasons of ADD-§9.2) |
| E-18 | Grants not applied to future tables | **Accept** | `ALTER DEFAULT PRIVILEGES` |
| E-19 | Unbounded `page` | **Accept** | Cap `page` at 1..417 (10,000 seeded listings / 24) — Plan-2 states no cap; the bound follows the PRD §3 seed |
| E-20 | `totalCop` above the safe-integer range | **Accept** | State AD-SYS-7 rule 1 in `valueCollection`: `'Unexpected'` above `Number.MAX_SAFE_INTEGER` |
| E-21 | Ambiguous message target | **Accept** | Strict union in the DTO comment and zod schema |
| E-22 | Duplicate ids in batch requests | **Accept** | Distinctness enforced by the input parser |
| E-23 | `catalog → identity` edge (AD-1) | **Accept** | The guard moves to the driving adapter: `adminProcedure` (server/trpc) calls `identity.requireAdmin`; `assertCatalogAdmin` becomes the contract of that procedure-builder check for the catalog router. The raw output lists it last (E-23). This corrects review F-01's fix, which put the call inside `catalog` |
