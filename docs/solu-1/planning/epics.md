---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/solu-1/planning/contracts.md
  - docs/solu-1/planning/ports-and-adapters.md
  - docs/solu-1/planning/schemas/README.md
  - docs/solu-1/tests/tea-skill-matrix.md
  - docs/plan-2/planning/prd.md
  - docs/plan-2/planning/ARCHITECTURE.md
skill: bmad-create-epics-and-stories (John — PM, Amelia — Dev review)
directed_by: Mateo Rubio
status: draft — pending review 4 and the Phase 4 gate
---

# TEZG Solu-1 — Epic Breakdown (contract-bound)

## Overview

This backlog derives **one technical story per behavioral contract**: 37 stories in 12 epics, one epic per Plan-2 module, in AD-1 dependency order (decision log #18). Every story binds a contract of `contracts.md`, its DTOs (`src/modules/*/dto/`), its tables (`schemas/*.sql`) and its red ATDD block (`docs/solu-1/tests/atdd/`). A developer agent can therefore implement it without inventing a decision. Following the contracts-before-stories rule, no story exists without a contract.

**Story format.** Each story uses the Solu-1 template (Description, Contract Reference, Target DTO, Database Tables, ATDD Test File, Given-When-Then) plus two lines the readiness audit parses: **Traceability** (the FRs the contract binds) and **Depends on** (earlier stories only).

## Requirements Inventory

### Functional Requirements

The 37 contracts bind **56 of the PRD's 96 FRs** (decision log #18; contract-bound traceability scope). Each is listed with the story that covers it in the coverage map below.

**Outside Solu-1's contract set (40 FRs).** These are carried into Solu-2, whose readiness rules require every FR to trace:

FR-IDN-1, FR-IDN-5, FR-VER-2, FR-VER-5, FR-VER-7, FR-VER-8, FR-CAT-1, FR-CAT-6, FR-CAT-8, FR-INV-1, FR-INV-2, FR-INV-4, FR-INV-5, FR-INV-8, FR-ORD-1, FR-ORD-2, FR-ORD-4, FR-ORD-5, FR-ORD-7, FR-ORD-8, FR-ORD-10, FR-COM-1, FR-COM-2, FR-COM-7, FR-COM-9, FR-TRD-7, FR-TRD-8, FR-TRD-9, FR-MSG-1, FR-MSG-2, FR-MSG-3, FR-MSG-8, FR-COL-2, FR-COL-3, FR-COL-4, FR-VAL-4, FR-VAL-5, FR-REP-5, FR-REP-6, FR-REP-7.

### NonFunctional Requirements

These are the mandatory edge cases and concurrency NFRs exercised by the stories' red tests: NFR-IDN-2, NFR-VER-1, NFR-INV-1, NFR-INV-3, NFR-ORD-1, NFR-COM-1, NFR-TRD-1, NFR-COL-1 and NFR-REP-1. Latency NFRs are planned in Solu-2's NFR evidence plan.

### Additional Requirements

- PostgreSQL 16, with the SQL-first migrations of `schemas/` (decision log #11). Ids are cuid2 from `IdGenerator`, and time comes from `Clock` (decision log #9).
- Each module's tests use fakes of its neighbours' public ports (`test-support/`, NFR-SYS-3).
- No production logic before this backlog is implemented (the stop-point rule). The stubs throw `NotImplementedError`.

### UX Design Requirements

Out of Solu-1's scope. The UI states of every surface are specified in `docs/plan-2/ux/`, and their backend contracts are checked in Solu-2.

### FR Coverage Map

| FR | Story | FR | Story | FR | Story |
|---|---|---|---|---|---|
| FR-IDN-2 | 1.2 | FR-DSC-5 | 5.2 | FR-TRD-4 | 8.2 |
| FR-IDN-3 | 1.1 | FR-DSC-6 | 5.2 | FR-TRD-5 | 8.2 |
| FR-IDN-4 | 1.2 | FR-DSC-7 | 5.3 | FR-TRD-6 | 8.2 |
| FR-IDN-6 | 1.3 | FR-INV-3 | 4.2 | FR-MSG-4 | 9.2, 9.3 |
| FR-IDN-7 | 3.1 | FR-INV-6 | 4.2 | FR-MSG-5 | 9.2 |
| FR-VER-1 | 1.2, 2.1 | FR-INV-7 | 1.3 | FR-MSG-6 | 9.2 |
| FR-VER-3 | 2.2 | FR-INV-9 | 4.1 | FR-MSG-7 | 9.1 |
| FR-VER-4 | 2.2 | FR-INV-10 | 4.1 | FR-COL-1 | 10.1 |
| FR-VER-6 | 2.1 | FR-ORD-3 | 6.2 | FR-COL-5 | 10.3 |
| FR-VER-9 | 2.3 | FR-ORD-6 | 6.1 | FR-COL-6 | 4.3 |
| FR-CAT-2 | 3.3 | FR-ORD-9 | 6.3 | FR-COL-7 | 10.2 |
| FR-CAT-3 | 3.1, 3.2 | FR-COM-3 | 7.1 | FR-VAL-1 | 11.2 |
| FR-CAT-4 | 3.3 | FR-COM-4 | 7.2 | FR-VAL-2 | 11.1, 11.3 |
| FR-CAT-5 | 3.4 | FR-COM-5 | 7.2 | FR-VAL-3 | 11.2 |
| FR-CAT-7 | 3.4 | FR-COM-6 | 7.2 | FR-REP-1 | 12.1 |
| FR-DSC-1 | 5.1, 5.2 | FR-COM-8 | 7.3 | FR-REP-2 | 12.1 |
| FR-DSC-2 | 5.2 | FR-TRD-1 | 8.3 | FR-REP-3 | 12.3 |
| FR-DSC-3 | 5.2 | FR-TRD-2 | 8.1 | FR-REP-4 | 12.2 |
| FR-DSC-4 | 5.2 | FR-TRD-3 | 8.1 | | |

## Epic List

| Epic | Module | Protagonist | Value delivered | Stories |
|---|---|---|---|---|
| 1 | IDN | Valentina | One trustworthy answer to "what may this account do?", with exclusive seller tracks | 3 |
| 2 | VER | Andrés, Sebastián | A business becomes verified only through one explained admin decision | 3 |
| 3 | CAT | Sebastián, Valentina | One stable identity per card and reference prices served verbatim, with freshness | 4 |
| 4 | INV | Andrés, Camila | Stock that cannot be oversold and listings only their seller can change | 3 |
| 5 | DSC | Camila | Nearby listings of both seller kinds, ranked deterministically and never leaking hidden ones | 3 |
| 6 | ORD | Camila, Andrés | Payment facts set once, in order, and visible to the business only after "paid" | 3 |
| 7 | COM | Andrés, Sebastián | Commission charged exactly once per order, with an exact ledger and one pause per crossing | 3 |
| 8 | TRD | Valentina, Julián | Turn-based trades where the last unit goes to exactly one accepted offer | 3 |
| 9 | MSG | Camila, Andrés | Buyer-to-business messaging with explained eligibility and idempotent sends | 3 |
| 10 | COL | Camila, Valentina | Post-purchase entries created exactly once, and honest set completion | 3 |
| 11 | VAL | Valentina | Exact collection value and trend math, with no float and no division by zero | 3 |
| 12 | REP | Camila, Sebastián | Purchase-gated business reviews, moderation that never deletes, honest aggregates | 3 |

---

## Epic 1: Identity and seller-type access (IDN)

Valentina buys and sells from one account. TEZG derives what she may do from stored facts, never from a client role, and keeps her individual-seller track and any business track mutually exclusive, even under simultaneous requests.

### Story 1.1: Answer listing eligibility from derived capabilities

- **Description:** As Valentina, an individual seller, I want the platform to tell me whether I may list, and why not when I may not, so that I never see a listing form I cannot submit.
- **Contract Reference:** `requireListingEligibility` (AD-IDN-1, AD-16, AD-11)
- **Target DTO:** `RequireListingEligibilityRequestDTO`, `ListingEligibilityResponseDTO`
- **Database Tables:** `"User"."sellerTrack"`, `"BusinessApplication".status`
- **ATDD Test File:** `docs/solu-1/tests/atdd/idn-contracts.test.ts`
- **Traceability:** FR-IDN-3
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Valentina's `"User"."sellerTrack" = 'individual'`.
  - **When:** `listings` calls `identity.requireListingEligibility({ userId })` before `inventory.create`.
  - **Then:** the guard reads the facts in one statement and returns `{ listingKind: 'individual', verified: false }`, with zero writes.
  - **Failure — Given:** Andrés's latest `"BusinessApplication"` is `Rejected` with `reapplyNotBefore = 2026-10-08T15:00Z`. **When:** the same call is made for him. **Then:** `SellerNotVerified` (HTTP 409) citing `{ applicationId, reapplyNotBefore }`, never `IndividualSellerProfileIncomplete`, and zero writes.

### Story 1.2: Claim exactly one seller track per account

- **Description:** As Valentina, I want completing the individual-seller profile and submitting a business application to be mutually exclusive, so that my account is never both kinds of seller.
- **Contract Reference:** `claimSellerTrack` (AD-IDN-2, AD-18)
- **Target DTO:** `ClaimSellerTrackRequestDTO`, `ClaimSellerTrackResponseDTO`
- **Database Tables:** `"User"."sellerTrack"`, `"IndividualSellerProfile"`, `"BusinessApplication"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/idn-contracts.test.ts`
- **Traceability:** FR-IDN-2, FR-IDN-4, FR-VER-1
- **Depends on:** Story 1.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** a fresh account with `"sellerTrack" IS NULL`.
  - **When:** `access.completeIndividualProfile` and `verification.submit` call `claimSellerTrack` at the same instant, on two connections.
  - **Then:** exactly one conditional `UPDATE "User" SET "sellerTrack" … WHERE …` affects 1 row. The loser rolls back with `IndividualSellerProfileAlreadyComplete` or `BusinessApplicationOnFile` (HTTP 409). The composite FK `individual_profile_user_track_fk` / `business_application_user_track_fk` makes the other state physically impossible, and the result holds in 25 out of 25 repetitions.
  - **Failure — Given:** Valentina already completed her profile. **When:** she submits a business application. **Then:** `IndividualSellerProfileAlreadyComplete` and `"sellerTrack"` stays `'individual'`.

### Story 1.3: Resolve a seller's verification status

- **Description:** As a buyer, I want every listing's verification state to come from the seller's latest application, so that a badge is never stale.
- **Contract Reference:** `getSellerVerification` (AD-IDN-1)
- **Target DTO:** `GetSellerVerificationRequestDTO`, `SellerVerificationResponseDTO`
- **Database Tables:** `"BusinessApplication".status`, `"BusinessApplication"."submittedAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/idn-contracts.test.ts`
- **Traceability:** FR-IDN-6, FR-INV-7
- **Depends on:** Story 1.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés reapplied after a rejection, so his latest application is `Pending`.
  - **When:** `listings.reserveForPurchase` calls `getSellerVerification({ sellerId })` in its transaction.
  - **Then:** it returns `{ status: 'Pending' }` from the latest row by `("submittedAt" DESC, id DESC)`.
  - **Missing data — Given:** an id with no account. **When:** it is resolved. **Then:** `{ status: 'none' }`, silently, with zero writes.

## Epic 2: Business verification workflow (VER)

Andrés applies once at a time. Sebastián's decision is the only path to verified, and two admins can never both decide the same application.

### Story 2.1: Gate business (re)applications by the snapshot policy

- **Description:** As Andrés, a rejected business, I want to know exactly when I may reapply, so that I am neither blocked forever by mistake nor allowed in early.
- **Contract Reference:** `assertCanSubmitApplication` (AD-VER-3, AD-VER-1)
- **Target DTO:** `AssertCanSubmitApplicationRequestDTO`
- **Database Tables:** `"BusinessApplication"."reapplyNotBefore"`, `"BusinessApplication"."reapplyBarred"`, `"BusinessApplication".status`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ver-contracts.test.ts`
- **Traceability:** FR-VER-1, FR-VER-6
- **Depends on:** Story 1.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés's latest application is `Rejected` with `reapplyNotBefore = 2026-10-08T15:00:00Z`.
  - **When:** `verification.submit` runs the guard at virtual time `2026-10-08T14:59:59Z`, and again at `2026-10-08T15:00:00Z`.
  - **Then:** the first call throws `ReapplicationCooldownActive` (HTTP 409) citing the instant, and the second passes (half-open boundary). The guard writes nothing.
  - **Failure — Given:** an application is `Pending`. **When:** Andrés submits again. **Then:** `ApplicationAlreadyPending` (HTTP 409); the partial unique index `business_application_one_pending` backs it physically.

### Story 2.2: Decide an application exactly once

- **Description:** As Sebastián, an admin, I want my approve or reject decision to be the only one recorded, so that a business never ends up half-approved.
- **Contract Reference:** `decideApplication` (AD-VER-1, AD-SYS-5, AD-SYS-2)
- **Target DTO:** `DecideApplicationRequestDTO`, `DecideApplicationResponseDTO`
- **Database Tables:** `"BusinessApplication"`, `"ApplicationDecisionLog"`, `"RejectionReason"`, `"OutboxEvent"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ver-contracts.test.ts`
- **Traceability:** FR-VER-3, FR-VER-4
- **Depends on:** Story 2.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés's application is `Pending` and `DataMismatch` is an active reason with a 7-day cooldown.
  - **When:** Sebastián approves and Laura rejects at the same instant.
  - **Then:** exactly one `UPDATE … WHERE status='Pending'` affects 1 row. One `"ApplicationDecisionLog"` row and one `OutboxEvent` of the winner's type (`BusinessApplicationApproved` or `BusinessApplicationRejected`) are written. The loser gets `ApplicationNotPending` (HTTP 409) citing the winning decision.
  - **Failure — Given:** an unknown application id. **When:** it is decided. **Then:** `ApplicationNotFound` (HTTP 404) comes before any reason check, with zero writes.

### Story 2.3: Snapshot payment instructions for orders

- **Description:** As Camila, a buyer, I want the bank details I pay to come only from an approved business, so that I never transfer money to an unverified shop.
- **Contract Reference:** `getBusinessPaymentInstructions` (AD-9, AD-15)
- **Target DTO:** `GetBusinessPaymentInstructionsRequestDTO`, `GetBusinessPaymentInstructionsResponseDTO`
- **Database Tables:** `"BusinessProfile"`, `"BusinessApplication".status`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ver-contracts.test.ts`
- **Traceability:** FR-VER-9
- **Depends on:** Story 2.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés is `Approved` with a savings account at Bancolombia.
  - **When:** `orders.create` calls `getBusinessPaymentInstructions({ businessId })`.
  - **Then:** it returns `{ bankName, accountType: 'savings', accountNumber, holderName, qrObjectKey: null }`, and `orders` stores it as a snapshot.
  - **Missing data — Given:** the business is `Pending`. **When:** it is resolved. **Then:** `null`, silently.

## Epic 3: Catalog and price reference (CAT)

Sebastián ingests the catalog feed without ever creating a second identity for the same card. Valentina sees prices exactly as observed, labelled stale when they are.

### Story 3.1: Gate catalog administration in the procedure builder

- **Description:** As Sebastián, I want catalog administration to be reachable only by admins, without `catalog` depending on `identity`, so that the module stays independently testable.
- **Contract Reference:** `assertCatalogAdmin` (AD-16, AD-SYS-8)
- **Target DTO:** `AssertCatalogAdminRequestDTO`
- **Database Tables:** `"User"."isAdmin"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/cat-contracts.test.ts`
- **Traceability:** FR-CAT-3, FR-IDN-7
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Sebastián is an admin.
  - **When:** the `adminProcedure` guard in `src/server/trpc/admin-guard.ts` runs `assertCatalogAdmin({ actorId })`.
  - **Then:** it passes with zero writes, and no `catalog` code ran before it.
  - **Failure — Given:** Camila is not an admin. **When:** she calls `catalog.feed.start`. **Then:** `identity`'s `AdminOnly` (HTTP 403) propagates as the same error instance.

### Story 3.2: Start one feed run at a time

- **Description:** As Sebastián, I want a second "start ingestion" to be refused while a run is active, so that two runs never race on the same cursor.
- **Contract Reference:** `startFeedRun` (AD-CAT-1)
- **Target DTO:** `StartFeedRunRequestDTO`, `StartFeedRunResponseDTO`
- **Database Tables:** `"FeedIngestionRun"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/cat-contracts.test.ts`
- **Traceability:** FR-CAT-3
- **Depends on:** Story 3.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** no run is `Running`.
  - **When:** five starts arrive at the same instant.
  - **Then:** the partial unique index `feed_run_single_running` lets exactly one insert commit. Four calls get `FeedRunInProgress` (HTTP 409) citing the running run.
  - **Failure-recovery — Given:** a run abandoned for more than 24 h. **When:** a new start arrives. **Then:** the old run becomes `Failed` and the new one `Running`.

### Story 3.3: Upsert a feed row without ever reassigning its identity

- **Description:** As Valentina, I want a renamed or corrected card to keep its identity, so that my binder entries and listings never point at a ghost.
- **Contract Reference:** `upsertCatalogEntry` (AD-CAT-1, AD-7)
- **Target DTO:** `UpsertCatalogEntryRequestDTO`, `UpsertCatalogEntryResponseDTO`, `ValidFeedRowDTO`
- **Database Tables:** `"CatalogEntry"."externalKey"`, `"CatalogEntryRevision"`, `"FeedIngestionRun"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/cat-contracts.test.ts`
- **Traceability:** FR-CAT-2, FR-CAT-4
- **Depends on:** Story 3.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** entry `pikachu` with `externalKey='sv1-025'` named "Pikachu".
  - **When:** a batch of the running run upserts the row renamed "Pikachu ex".
  - **Then:** `ON CONFLICT ("externalKey") DO UPDATE` keeps the same `catalogEntryId` and leaves `kind` unchanged. It writes one `"CatalogEntryRevision"` with `changedFields = ['name']`, and returns `outcome: 'updated'`.
  - **Rerun — Given:** an identical row. **When:** it is upserted again. **Then:** `outcome: 'unchanged'`, zero revisions.

### Story 3.4: Serve a reference price as of an instant, with freshness

- **Description:** As Valentina, I want the reference price exactly as observed, with its date and a stale label when it is old, so that I can sanity-check a listing price honestly.
- **Contract Reference:** `getReferencePriceAsOf` (AD-CAT-2, AD-SYS-7)
- **Target DTO:** `GetReferencePriceAsOfRequestDTO`, `GetReferencePriceAsOfResponseDTO`, `ReferencePriceDTO`
- **Database Tables:** `"ReferencePriceObservation"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/cat-contracts.test.ts`
- **Traceability:** FR-CAT-5, FR-CAT-7
- **Depends on:** Story 3.3
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** observations at 2026-09-29 (40,000 COP) and 2026-10-01 12:00 (45,000 COP), plus a later 99,000 one.
  - **When:** VAL asks for the price as of 2026-10-01 15:00.
  - **Then:** it returns the 45,000 observation verbatim with `stale: false`, ordered by `("observedAt" DESC, source ASC, id ASC)`.
  - **Missing data — Given:** no observation at or before `asOf`. **When:** resolved. **Then:** `null`, never a blank or an interpolated value.

## Epic 4: Listings and shared inventory (INV)

Andrés sells his last Pikachu ex once, however many buyers press "Comprar" at the same moment. Only Valentina can change her own listings.

### Story 4.1: Guard listing changes by ownership

- **Description:** As Valentina, I want only me to edit, restock or deactivate my listings, and moderated listings to stay invisible to others, so that nobody tampers with my stock.
- **Contract Reference:** `assertListingOwner` (AD-SYS-8, AD-8, AD-SYS-5)
- **Target DTO:** `AssertListingOwnerRequestDTO`, `AssertListingOwnerResponseDTO`
- **Database Tables:** `"Listing"."sellerId"`, `"Listing"."hiddenAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/inv-contracts.test.ts`
- **Traceability:** FR-INV-9, FR-INV-10
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Valentina's listing is hidden by moderation.
  - **When:** she opens it for editing.
  - **Then:** the guard passes and returns her `hiddenAt`.
  - **Failure — Given:** Camila targets the same hidden listing. **When:** she calls an edit. **Then:** `ListingNotFound` (HTTP 404), the same code as an unknown id. On a visible listing she gets `ListingNotOwnedByCaller` (HTTP 403).

### Story 4.2: Reserve stock atomically inside the caller's transaction

- **Description:** As Camila, a buyer, I want my purchase to hold the card the moment I order it, so that nobody else can buy the same last unit.
- **Contract Reference:** `reserveForPurchase` (AD-6, AD-INV-1, AD-INV-2, AD-SYS-5, AD-SYS-4)
- **Target DTO:** `ReserveForPurchaseRequestDTO`, `ReserveForPurchaseResponseDTO`, `ReservationRefDTO`
- **Database Tables:** `"InventoryUnit".quantity`, `"Listing"`, `"BundleComponent"`, `"SellerCommissionState"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/inv-contracts.test.ts`
- **Traceability:** FR-INV-3, FR-INV-6
- **Depends on:** Story 1.3
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés is `Approved` and unpaused, and has one unit of Pikachu ex.
  - **When:** 50 buyers call `reserveForPurchase(tx, { listingId, qty: 1, buyerId })` at once, each in its own `orders.create` transaction.
  - **Then:** exactly 1 conditional `UPDATE … WHERE quantity >= 1` succeeds, 49 get `InsufficientQuantity` (HTTP 409) citing `{ requested, available }`, and the stock ends at 0 (`CHECK (quantity >= 0)`). No other table is written.
  - **Mandatory edge case — Given:** a reserve succeeded. **When:** the caller's `"Order"` insert fails and its transaction rolls back. **Then:** the unit is back at 1, with no compensating write.
  - **Failure — Given:** an individual-seller listing. **When:** reserved. **Then:** `NotBusinessListing` (HTTP 409) and no decrement.

### Story 4.3: Summarize availability per catalog entry for the wishlist

- **Description:** As Camila, I want my wishlist to show the lowest current price and the number available, so that I can see what I can actually buy.
- **Contract Reference:** `getAvailabilitySummary` (AD-INV-1, AD-12)
- **Target DTO:** `GetAvailabilitySummaryRequestDTO`, `GetAvailabilitySummaryResponseDTO`, `AvailabilitySummaryRowDTO`
- **Database Tables:** `"Listing"`, `"InventoryUnit".quantity`
- **ATDD Test File:** `docs/solu-1/tests/atdd/inv-contracts.test.ts`
- **Traceability:** FR-COL-6
- **Depends on:** Story 4.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Pikachu ex is listed by a `Pending` business (not purchasable) and by Valentina at 60,000.
  - **When:** `collections.wishlist` asks for `[charizard, pikachu]`.
  - **Then:** one row per id in request order: Charizard `{ null, 0 }` and Pikachu `{ 60000, 1 }`. The Pending business listing is not counted.
  - **Missing data — Given:** an unknown id. **When:** resolved. **Then:** `{ lowestPriceCop: null, availableCount: 0 }`, present and silent.

## Epic 5: Location discovery (DSC)

Camila in Medellín finds nearby listings from individual sellers and shops in one query, ranked the same way every time, with hidden listings gone at once.

### Story 5.1: Validate the search area

- **Description:** As Camila, I want an invalid radius or a point outside Colombia to be refused with an explanation, so that I never get an empty page without knowing why.
- **Contract Reference:** `assertSearchArea` (AD-DSC-1, AD-5)
- **Target DTO:** `AssertSearchAreaRequestDTO`, `SearchAreaDTO`
- **Database Tables:** none (pure guard)
- **ATDD Test File:** `docs/solu-1/tests/atdd/dsc-contracts.test.ts`
- **Traceability:** FR-DSC-1
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Medellín's centre with radii 1, 15 and 300 km.
  - **When:** the area is checked.
  - **Then:** all pass.
  - **Failure — Given:** radius 0, radius 301, or a centre in Madrid. **When:** checked. **Then:** `InvalidSearchArea` (HTTP 400).

### Story 5.2: Search nearby listings in one deterministic query

- **Description:** As Camila, I want nearby listings from both seller kinds, nearest first, each telling me whether pickup is available, so that I can choose a local seller.
- **Contract Reference:** `search` (AD-5, AD-DSC-1, AD-12, AD-DSC-2)
- **Target DTO:** `SearchRequestDTO`, `SearchResponseDTO`, `SearchRowDTO`
- **Database Tables:** `"Listing"`, `"InventoryUnit"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/dsc-contracts.test.ts`
- **Traceability:** FR-DSC-1, FR-DSC-2, FR-DSC-3, FR-DSC-4, FR-DSC-5, FR-DSC-6
- **Depends on:** Story 5.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Valentina 0.66 km away and Andrés 6.33 km away, plus hidden, sold-out, 15.0002 km-away and unusable-location listings.
  - **When:** Camila searches 15 km around Medellín.
  - **Then:** one statement returns `[Valentina (pickup), Andrés (verified)]` in distance order, with `excluded.unusableLocation = 2`, at most 3 neighbour calls, and byte-identical results on a second call.
  - **Failure — Given:** catalog filters matching more than 20,000 entries. **When:** searched. **Then:** `SearchFilterTooBroad` (HTTP 400).

### Story 5.3: Compose the card detail even when nothing is nearby

- **Description:** As Camila, I want a card's page to load even when no seller is nearby, so that I can still see its reference price and add it to my wishlist.
- **Contract Reference:** `getCardDetail` (AD-SYS-7, AD-1, AD-DSC-2)
- **Target DTO:** `GetCardDetailRequestDTO`, `CardDetailResponseDTO`
- **Database Tables:** `"Listing"`, `"InventoryUnit"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/dsc-contracts.test.ts`
- **Traceability:** FR-DSC-7
- **Depends on:** Story 5.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Pikachu ex is listed only in Bogotá.
  - **When:** Camila opens it with a 15 km Medellín area.
  - **Then:** the entry is returned with `listingPriceCop: null`, `hasActiveListings: false` and `listings: []` (the DSC mandatory edge case).
  - **Failure — Given:** an unknown entry. **When:** opened. **Then:** `catalog`'s `CatalogEntryNotFound` (HTTP 404) propagates unchanged, and no further neighbour call is made.

## Epic 6: Orders and comprobante confirmation (ORD)

Camila confirms she paid only once a comprobante exists. Andrés sees the order only after that, and a stale or double confirmation is explained, never applied twice.

### Story 6.1: Show an order only to whoever may see it

- **Description:** As Andrés, I want to see Camila's order only after she confirms she paid, and nobody else to see it at all, so that payment details never leak.
- **Contract Reference:** `assertOrderVisible` (AD-15, AD-ORD-3)
- **Target DTO:** `AssertOrderVisibleRequestDTO`, `AssertOrderVisibleResponseDTO`
- **Database Tables:** `"Order"."buyerId"`, `"Order"."businessId"`, `"Order"."buyerPaidConfirmedAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ord-contracts.test.ts`
- **Traceability:** FR-ORD-6
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Camila's order is paid.
  - **When:** Camila and then Andrés open it.
  - **Then:** the roles are `buyer` and `business`.
  - **Failure — Given:** the order is not yet paid. **When:** Andrés, Julián or anyone with an unknown id opens it. **Then:** `OrderNotVisibleToCaller` (HTTP 403) with an identical body.

### Story 6.2: Confirm "I paid" exactly once, before expiry

- **Description:** As Camila, I want my "I paid" confirmation recorded once and only while the order is still active, so that a double click or a late click never corrupts the order.
- **Contract Reference:** `confirmPaid` (AD-ORD-2, AD-SYS-5, AD-2, AD-ORD-3)
- **Target DTO:** `ConfirmPaidRequestDTO`, `ConfirmPaidResponseDTO`
- **Database Tables:** `"Order"."buyerPaidConfirmedAt"`, `"Order"."comprobanteObjectKey"`, `"Order"."expiresAt"`, `"Order"."expiredAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ord-contracts.test.ts`
- **Traceability:** FR-ORD-3
- **Depends on:** Story 6.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Camila uploaded a comprobante, and the order expires at seed + 48 h.
  - **When:** she confirms twice at the same instant, one hour after creation.
  - **Then:** exactly one conditional `UPDATE … WHERE "buyerPaidConfirmedAt" IS NULL … AND "expiresAt" > :now` commits. The other gets `OrderAlreadyConfirmedByRole` (HTTP 409) citing the original instant, and no event is enqueued.
  - **Failure — Given:** `now ≥ expiresAt` and the expiry is not yet materialized. **When:** she confirms. **Then:** `OrderNoLongerActive`. The expiry is materialized once (`"expiredAt"`, `cancelReason='Unpaid'`) and `listings.releaseReservation` is called once with the stored ref.

### Story 6.3: Answer whether a buyer completed a purchase

- **Description:** As Camila, I want only a closed purchase to count as "verified buyer", so that a review of a shop means I actually received my card.
- **Contract Reference:** `hasClosedPurchase` (AD-2, AD-ORD-3)
- **Target DTO:** `HasClosedPurchaseRequestDTO`, `HasClosedPurchaseResponseDTO`
- **Database Tables:** `"Order"."buyerItemReceivedConfirmedAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/ord-contracts.test.ts`
- **Traceability:** FR-ORD-9
- **Depends on:** Story 6.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Camila's order with Andrés is paid but not closed.
  - **When:** `reviews` asks `hasClosedPurchase({ buyerId, businessId })`.
  - **Then:** `{ closed: false, latestState: 'Paid' }`. Once she confirms the item arrived, `{ closed: true, latestState: 'Closed' }`.
  - **Missing data — Given:** no order between the pair. **When:** asked. **Then:** `{ closed: false, latestState: null }`.

## Epic 7: Commission ledger and purchasability (COM)

Andrés's prepaid balance is charged exactly once per sale, at the rate in force when the sale happened. Reaching zero pauses his shop once, never twice.

### Story 7.1: Keep top-up requests private to their business

- **Description:** As Andrés, I want only my shop to see my top-up requests and proofs, so that my transfer data stays private.
- **Contract Reference:** `assertTopUpVisible` (AD-COM-3, AD-SYS-8)
- **Target DTO:** `AssertTopUpVisibleRequestDTO`
- **Database Tables:** `"TopUpRequest"."businessId"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/com-contracts.test.ts`
- **Traceability:** FR-COM-3
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés's pending top-up request.
  - **When:** he opens its proof.
  - **Then:** the guard passes with zero writes.
  - **Failure — Given:** Tienda Paisa asks for Andrés's request or an unknown id. **When:** the guard runs. **Then:** `TopUpNotVisibleToCaller` (HTTP 403), with an identical body.

### Story 7.2: Deduct commission exactly once per order

- **Description:** As Andrés, I want each sale charged once at the advertised rate, even if the order event arrives twice, so that my balance is always exact.
- **Contract Reference:** `applyOrderDeduction` (AD-COM-2, AD-SYS-3, AD-COM-1)
- **Target DTO:** `OrderCommissionEventDTO`, `ApplyOrderDeductionResponseDTO`
- **Database Tables:** `"CommissionAccount"`, `"CommissionLedgerEntry"`, `"CommissionRateSetting"`, `"OutboxEvent"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/com-contracts.test.ts`
- **Traceability:** FR-COM-4, FR-COM-5, FR-COM-6
- **Depends on:** Story 7.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés's balance is 4,000. Orders A and B, each of 45,007 COP, are confirmed at the same instant, and A's event is delivered twice.
  - **When:** the three deliveries run their handler transactions at once.
  - **Then:** two `Deduction` entries of 3,601 are written (`ledger_deduction_rounding_rule`, `ledger_one_deduction_per_order`) and the duplicate returns `'duplicate'` through `ROLLBACK TO SAVEPOINT`. The balance ends at −3,202 with seqs exactly 1..2, and one `CommissionBalanceExhausted` is enqueued (the COM mandatory edge case).
  - **Trigger rule — Given:** the buyer closed before the business confirmed. **When:** charged. **Then:** `trigger='buyerClosed'` and the rate in force at that instant applies.

### Story 7.3: Resolve a business's commission account

- **Description:** As Andrés, I want my balance page to show my account, or say plainly that it opens on approval, so that I understand why I cannot sell yet.
- **Contract Reference:** `findCommissionAccount` (AD-COM-1, AD-3, AD-INV-3)
- **Target DTO:** `FindCommissionAccountRequestDTO`, `FindCommissionAccountResponseDTO`
- **Database Tables:** `"CommissionAccount"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/com-contracts.test.ts`
- **Traceability:** FR-COM-8
- **Depends on:** Story 7.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés's account holds 12,500 COP at seq 3.
  - **When:** page 7.1 loads.
  - **Then:** `{ businessId, balanceCop: 12500, state: 'Funded', ledgerSeq: 3 }`.
  - **Missing data — Given:** no account yet. **When:** loaded. **Then:** `null`, and no account is created by the read.

## Epic 8: Trade offer negotiation (TRD)

Julián and Valentina negotiate turn by turn. When she accepts, the last unit goes to exactly one offer and every competing offer is told it is no longer possible.

### Story 8.1: Enforce whose turn it is

- **Description:** As Julián, I want the platform to tell me when it is not my turn, or when the offer has expired, so that I never act on a stale offer.
- **Contract Reference:** `assertActorTurn` (AD-TRD-1, AD-SYS-5)
- **Target DTO:** `AssertActorTurnRequestDTO`, `AssertActorTurnResponseDTO`
- **Database Tables:** `"TradeOffer".turn`, `"TradeOffer".version`, `"TradeOffer"."expiresAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/trd-contracts.test.ts`
- **Traceability:** FR-TRD-2, FR-TRD-3
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Julián's offer is `Open` with the turn on the seller and version 2.
  - **When:** Valentina opens it.
  - **Then:** `{ role: 'seller', version: 2 }`, with zero writes.
  - **Failure — Given:** the same offer. **When:** Julián tries to act. **Then:** `NotYourTurn` (HTTP 409). A stranger gets `TradeOfferNotVisibleToCaller` (HTTP 403). After `expiresAt`, `TradeOfferNotOpen`, and the status is not written.

### Story 8.2: Accept one offer per last unit

- **Description:** As Valentina, I want accepting an offer to reserve my card and close every competing offer, so that I never promise the same card twice.
- **Contract Reference:** `acceptOffer` (AD-TRD-2, AD-6, AD-TRD-3)
- **Target DTO:** `AcceptOfferRequestDTO`, `AcceptOfferResponseDTO`, `TradeReservationRefDTO`
- **Database Tables:** `"TradeOffer"`, `"TradeOfferRound"`, `"OutboxEvent"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/trd-contracts.test.ts`
- **Traceability:** FR-TRD-4, FR-TRD-5, FR-TRD-6
- **Depends on:** Story 8.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** two `Open` offers (Julián's and another proposer's) compete for Valentina's last unit.
  - **When:** she accepts both from two tabs at the same instant.
  - **Then:** under `pg_advisory_xact_lock(trd:seller:<id>)`, exactly one offer becomes `Accepted` with its `reservationRef`. The other ends `Unfulfillable` (`ListingNoLongerAvailable`) with a `markedUnfulfillable` round (actor `seller`, `roundCount` unchanged). One `TradeAccepted` event is enqueued and the contact handoff is generated once (the TRD mandatory edge case).
  - **Failure — Given:** the listing is no longer open to trade. **When:** accepted. **Then:** `listings`' `ListingNotOpenToTrade` propagates unchanged and her own offer becomes `Unfulfillable`.

### Story 8.3: Find a proposer's live offer

- **Description:** As Julián, I want the offer form to show my existing open offer, so that I do not submit a duplicate.
- **Contract Reference:** `findOpenOffer` (AD-TRD-1)
- **Target DTO:** `FindOpenOfferRequestDTO`, `FindOpenOfferResponseDTO`
- **Database Tables:** `"TradeOffer"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/trd-contracts.test.ts`
- **Traceability:** FR-TRD-1
- **Depends on:** Story 8.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Julián has one `Open` offer on the listing.
  - **When:** page 8.1 loads.
  - **Then:** `{ offerId, version, turn, expiresAt }`. `trade_offer_one_open_per_proposer` guarantees at most one.
  - **Missing data — Given:** no live offer, or only an expired one. **When:** loaded. **Then:** `null`, and the expiry is not materialized.

## Epic 9: In-app business messaging (MSG)

Camila messages a verified shop. A pending one is flagged, a rejected one is explained, and a network retry never duplicates a message.

### Story 9.1: Show a conversation only to its two participants

- **Description:** As Camila, I want my conversation with a shop visible only to the two of us, so that what I write stays private.
- **Contract Reference:** `assertConversationParticipant` (AD-MSG-3, AD-SYS-8)
- **Target DTO:** `AssertConversationParticipantRequestDTO`, `AssertConversationParticipantResponseDTO`
- **Database Tables:** `"ConversationParticipant"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/msg-contracts.test.ts`
- **Traceability:** FR-MSG-7
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** the conversation between Camila and Andrés.
  - **When:** Andrés opens it.
  - **Then:** `{ role: 'business' }`.
  - **Failure — Given:** Julián, or an unknown id. **When:** opened. **Then:** `ConversationNotVisibleToCaller` (HTTP 403).

### Story 9.2: Send a message once, with explained eligibility

- **Description:** As Camila, I want my message delivered once even if my connection retries, and to be told when a shop cannot receive it, so that I am never confused about what was sent.
- **Contract Reference:** `sendMessage` (AD-MSG-2)
- **Target DTO:** `SendMessageRequestDTO`, `SendMessageResponseDTO`, `SendMessageTargetDTO`
- **Database Tables:** `"Conversation"`, `"ConversationParticipant"`, `"Message"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/msg-contracts.test.ts`
- **Traceability:** FR-MSG-4, FR-MSG-5, FR-MSG-6
- **Depends on:** Story 9.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Andrés is `Approved`.
  - **When:** Camila sends `clientMessageId='c1'` and the browser retries it.
  - **Then:** one `"Conversation"` (`conversation_one_per_pair`), two participants and one `"Message"` at seq 1 (`message_idempotent_send`); the retry returns the original message.
  - **Failure — Given:** the business is `Rejected`. **When:** Camila sends. **Then:** `identity`'s `NotBusinessAccount` (HTTP 409) propagates unchanged and nothing is stored. A business opening a conversation gets `BusinessCannotInitiate`.

### Story 9.3: Find an existing conversation

- **Description:** As Camila, I want "Contact the shop" to reopen our existing thread, so that the history is not split across threads.
- **Contract Reference:** `findConversation` (AD-MSG-2)
- **Target DTO:** `FindConversationRequestDTO`, `FindConversationResponseDTO`
- **Database Tables:** `"Conversation"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/msg-contracts.test.ts`
- **Traceability:** FR-MSG-4
- **Depends on:** Story 9.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** a conversation between Camila and Andrés.
  - **When:** the composer opens.
  - **Then:** `{ conversationId, lastSeq, lastMessageAt }`.
  - **Missing data — Given:** none exists. **When:** it opens. **Then:** `null`, and none is created.

## Epic 10: Collections, binder and post-purchase prompt (COL)

Camila's purchase becomes collection entries exactly once, whatever the double clicks. Valentina's set completion counts only real catalog cards.

### Story 10.1: Keep collections private to their owner

- **Description:** As Valentina, I want only me to see and change my collections, so that my binder is mine.
- **Contract Reference:** `assertCollectionOwner` (AD-COL-1, AD-SYS-8)
- **Target DTO:** `AssertCollectionOwnerRequestDTO`
- **Database Tables:** `"Collection"."ownerId"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/col-contracts.test.ts`
- **Traceability:** FR-COL-1
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Camila's collection.
  - **When:** Camila opens it.
  - **Then:** the guard passes.
  - **Failure — Given:** Valentina opens Camila's collection, or an unknown id. **When:** the guard runs. **Then:** `CollectionNotFound` (HTTP 404).

### Story 10.2: Accept a post-purchase prompt exactly once

- **Description:** As Camila, I want accepting "Add to my collection" to create my purchased cards once, even if I click twice, so that my collection count is exact.
- **Contract Reference:** `acceptPrompt` (AD-COL-2, AD-SYS-5, AD-COL-1)
- **Target DTO:** `AcceptPromptRequestDTO`, `AcceptPromptResponseDTO`
- **Database Tables:** `"PostPurchasePrompt"`, `"CollectionEntry"`, `"Collection"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/col-contracts.test.ts`
- **Traceability:** FR-COL-7
- **Depends on:** Story 10.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** a `Pending` prompt for an order closed at 2026-10-02T03:00Z, with two lines.
  - **When:** Camila accepts it from two tabs at the same instant.
  - **Then:** under `pg_advisory_xact_lock(col:owner:<id>)`, exactly one accept commits. It creates two `PlatformPurchase` entries dated 2026-10-01 (the Bogotá date) after the existing positions. The other tab gets `PromptAlreadyResolved` (HTTP 409) (the COL mandatory edge case).
  - **Failure — Given:** another buyer's prompt, or an unknown id. **When:** accepted. **Then:** `PromptNotFound` (HTTP 404), and the prompt stays `Pending`.

### Story 10.3: Compute set completion honestly

- **Description:** As Valentina, I want my set completion to count only distinct catalog cards of that set, so that link-added promos and sealed boxes never inflate it.
- **Contract Reference:** `getSetCompletion` (AD-7, AD-COL-1)
- **Target DTO:** `GetSetCompletionRequestDTO`, `GetSetCompletionResponseDTO`
- **Database Tables:** `"CollectionEntry"."cardKind"`, `"CollectionEntry"."catalogEntryId"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/col-contracts.test.ts`
- **Traceability:** FR-COL-5
- **Depends on:** Story 10.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Valentina owns two of SV1's three cards (one in two copies), a booster box and a link-added promo.
  - **When:** page 9.1 loads SV1.
  - **Then:** `{ ownedDistinct: 2, cardEntryCount: 3, completionPercent: 66 }`.
  - **Missing data — Given:** a set with no cards, or an unknown set. **When:** loaded. **Then:** `completionPercent: null`, or `null` for the unknown set.

## Epic 11: Collection valuation and trend (VAL)

Valentina's collection value is an exact peso sum, explained entry by entry, and its trend never divides by zero.

### Story 11.1: Validate the valuation period

- **Description:** As Valentina, I want only the supported periods (7, 30, 90, 365 days), so that every trend I see uses a defined baseline.
- **Contract Reference:** `assertValuationPeriod` (AD-VAL-2)
- **Target DTO:** `AssertValuationPeriodRequestDTO`
- **Database Tables:** none (pure guard)
- **ATDD Test File:** `docs/solu-1/tests/atdd/val-contracts.test.ts`
- **Traceability:** FR-VAL-2
- **Depends on:** none
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** periods 7, 30, 90 and 365.
  - **When:** each is checked.
  - **Then:** each passes.
  - **Failure — Given:** period 31. **When:** checked. **Then:** `InvalidValuationPeriod` (HTTP 400).

### Story 11.2: Value a collection from one snapshot

- **Description:** As Valentina, I want my collection's value to be the exact sum of what each card is worth, with unpriced and link-added cards listed apart, so that I trust the number.
- **Contract Reference:** `valueCollection` (AD-VAL-1, AD-SYS-7)
- **Target DTO:** `ValueCollectionRequestDTO`, `ValuationDTO`, `NotValuedEntryDTO`
- **Database Tables:** `"CollectionEntry"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/val-contracts.test.ts`
- **Traceability:** FR-VAL-1, FR-VAL-3
- **Depends on:** Story 11.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** 500 entries priced at an FX-derived 401 COP.
  - **When:** the collection is valued.
  - **Then:** `totalCop = 200,500` exactly (BigInt) and `conversionDriftBoundCop = 250`, reported and never applied (the VAL mandatory edge case). With 501 distinct cards, every 500-id chunk uses the same `asOf` inside one `REPEATABLE READ` snapshot.
  - **Failure — Given:** Camila targets Valentina's collection. **When:** valued. **Then:** `CollectionNotFound` (HTTP 404), and `catalog` is never called.

### Story 11.3: Compute the period change without division by zero

- **Description:** As Valentina, I want a trend that is exact to the hundredth of a percent and says "no baseline" instead of dividing by zero, so that a new collection never shows nonsense.
- **Contract Reference:** `changePercent` (AD-VAL-2, AD-SYS-7)
- **Target DTO:** `ChangePercentRequestDTO`, `ChangePercentResponseDTO`
- **Database Tables:** none (pure function)
- **ATDD Test File:** `docs/solu-1/tests/atdd/val-contracts.test.ts`
- **Traceability:** FR-VAL-2
- **Depends on:** Story 11.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** the ADD-§2.2 vectors.
  - **When:** each change is computed.
  - **Then:** 40,000 → 45,000 is 1250 hundredths, 3 → 4 is 3333, and 30,000 → 29,999 is 0 (never −0). The result is sign-symmetric over 1,000 seeded random pairs.
  - **Missing data — Given:** a zero baseline. **When:** computed. **Then:** `null`, with no division attempted.

## Epic 12: Reviews, reputation and moderation (REP)

Camila reviews Andrés's shop only after her purchase closed. Sebastián hides abuse without deleting anything, and aggregates never count hidden reviews.

### Story 12.1: Gate business reviews by a closed purchase

- **Description:** As Camila, I want only buyers whose order closed to review a shop, so that shop ratings mean something.
- **Contract Reference:** `assertVerifiedPurchaser` (AD-2, AD-REP-1)
- **Target DTO:** `AssertVerifiedPurchaserRequestDTO`, `AssertVerifiedPurchaserResponseDTO`
- **Database Tables:** `"Review"."purchaseVerified"`, `"Review"."targetKind"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/rep-contracts.test.ts`
- **Traceability:** FR-REP-1, FR-REP-2
- **Depends on:** Story 6.3
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** Camila's order with Andrés is closed.
  - **When:** she starts a review.
  - **Then:** `{ targetKind: 'business', purchaseVerified: true }`; `review_business_iff_verified` backs it physically.
  - **Failure — Given:** the order is paid but not closed. **When:** she reviews. **Then:** `NotVerifiedPurchaser` (HTTP 409) citing `latestState: 'Paid'` (the REP mandatory edge case), and nothing is written.

### Story 12.2: Hide a review exactly once, never deleting it

- **Description:** As Sebastián, I want hiding a review to be recorded once with its content, so that moderation is auditable and reversible.
- **Contract Reference:** `hideReview` (AD-12, AD-REP-2, AD-REP-3)
- **Target DTO:** `HideReviewRequestDTO`, `HideReviewResponseDTO`
- **Database Tables:** `"Review"."hiddenAt"`, `"ReviewModerationLog"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/rep-contracts.test.ts`
- **Traceability:** FR-REP-4
- **Depends on:** Story 12.1
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** a visible spam review.
  - **When:** Sebastián and Laura hide it at the same instant.
  - **Then:** exactly one `UPDATE … WHERE "hiddenAt" IS NULL` commits with one `"ReviewModerationLog"` row carrying the rating and text snapshot. The other gets `allowedWithNotice` citing the existing hide. `DELETE` is revoked for `tezg_app`.
  - **Failure — Given:** an unknown review id. **When:** hidden. **Then:** `ReviewNotFound` (HTTP 404).

### Story 12.3: Aggregate reputation from visible reviews

- **Description:** As Camila, I want a shop's rating computed from visible reviews with a stated rounding rule, so that 4.25 shows as 4.3 everywhere.
- **Contract Reference:** `getAggregates` (AD-12, AD-REP-2)
- **Target DTO:** `GetAggregatesRequestDTO`, `GetAggregatesResponseDTO`, `AggregateDTO`
- **Database Tables:** `"Review".rating`, `"Review"."hiddenAt"`
- **ATDD Test File:** `docs/solu-1/tests/atdd/rep-contracts.test.ts`
- **Traceability:** FR-REP-3
- **Depends on:** Story 12.2
- **Acceptance Criteria (Given-When-Then):**
  - **Given:** 12 visible reviews summing 51 and one hidden 1-star review.
  - **When:** page 2.2 loads the aggregates.
  - **Then:** `{ averageTenths: 43, count: 12 }` (half away from zero, ADD-§2.9). The hidden review is excluded.
  - **Missing data — Given:** a seller with no visible review. **When:** loaded. **Then:** `{ averageTenths: null, count: 0 }`, in request order.
