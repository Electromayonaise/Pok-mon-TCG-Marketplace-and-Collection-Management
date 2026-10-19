---
title: "TEZG Solu-1 — Behavioral Contract Matrix (P, Q, I) for 12 modules"
status: final — Phase 1 gate passed 2026-10-18 (decision log #3–#8)
created: 2026-10-18
phase: "Solu-1 Phase 1"
persona: "Winston (bmad-agent-architect)"
directed_by: "Mateo Rubio"
inputs:
  - docs/plan-2/planning/ARCHITECTURE.md
  - docs/plan-2/planning/prd.md
  - docs/plan-2/planning/addendum.md
  - _bmad-output/project-context.md
memlog: docs/solu-1/planning/.memlog.md
---

# Behavioral Contract Matrix — 37 functions, 12 modules

## 0. How to read this matrix

**Scope.** Three core functions for each of the 12 Plan-2 modules (task statement §3, Appendix B). Each module's triple contains one **guard** (strictly read-only, throws a typed error), one **contended mutation** (exactly one winner, idempotent on repetition) and one **resolver** (explicit result when data is missing). DSC and VAL own no tables and no writes (ARCH §6.5, §6.11). Their contended-mutation slot holds a **concurrency-safe read** instead (decision log #4). CAT carries a supplementary fourth contract, `upsertCatalogEntry`, so its mandatory edge case has its own P/Q/I (decision log #7). That makes 37 contracts.

**Shared notation.** Every clause below uses these definitions, and no clause restates them.

| Term | Definition |
|---|---|
| `CuidId` | `string` matching `^[a-z][0-9a-z]{23}$` (cuid2, length 24). Every primary key in the package, including Better Auth's `"User".id`: Better Auth is configured with `advanced.database.generateId = () => createId()` from `@paralleldrive/cuid2`, so its default 32-character ids never occur (review F-04) |
| `Instant` | A UTC instant obtained once per transaction from `Clock.now()` and passed to SQL as a parameter (AD-SYS-6 rules 1–2). No clause reads the wall clock |
| `Tx` | An open interactive PostgreSQL transaction handle (READ COMMITTED, AD-SYS-4 rule 8). A function taking `tx` never opens or commits a transaction (AD-SYS-4 rule 1) |
| `Cop` | An integer number of Colombian pesos, `0 ≤ n ≤ 9,007,199,254,740,991`, stored as `bigint` (AD-SYS-7) |
| `actorId` | The `userId` resolved by `authedProcedure` from the Better Auth session. It is never an input field (AD-SYS-8 rule 1, AD-16) |
| `Decision` | `{ outcome, reasonCode, humanMessage, citations: [{ rule, inputs }] (length ≥ 1), occurredAt }` (AD-SYS-1 rule 3) |
| "zero writes" | The call issues no `INSERT`, `UPDATE` or `DELETE` on any table and enqueues no `OutboxEvent` |
| "rolls back" | The enclosing transaction aborts. Every row it changed returns to its prior value, and no `OutboxEvent` or `EventDelivery` row it inserted survives (AD-SYS-2 rule 1) |

**From contract to code.** Each function is an inbound-port method in `src/modules/<host>/application/<code>.ts`. Its parameters other than `tx` and `now` are the fields of its request DTO (`src/modules/<host>/dto/<code>.dto.ts`), passed as one object. `now` is read once from the injected `Clock` at the start of the transaction and is never a DTO field (AD-SYS-6). Positional parameters in this document are therefore exactly those DTO fields, and the names match one to one.

**Typed errors.** `Code` (HTTP *n*, owner *module*). The HTTP status is the one tRPC 11 emits for the code's family in AD-SYS-1:

| Family | HTTP |
|---|---|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `BAD_REQUEST` | 400 |
| `CONFLICT` | 409 |
| `TOO_MANY_REQUESTS` | 429 |
| `'Unexpected'` | 500 |

A code raised by a module other than its owner is propagated unchanged (AD-11). Every typed error carries a `Decision` whose `citations[0].rule` names the FR or AD that triggered it.

**Shape validation happens before the call.** Every input is first parsed by the procedure's zod schema. A wrong type, length, enum or format is refused as `RequestValidationFailed` (HTTP 400, owner shared-kernel), with one `{ field, issue }` per violation, and the function body never runs (AD-SYS-1 rule 7). The preconditions below that state types are therefore guaranteed by that parser. A violation that reaches a function anyway (an internal caller bypassing the parser) is a programming error and surfaces as `'Unexpected'` (HTTP 500).

**Summary.**

| # | Module (host) | Guard | Contended mutation / concurrency-safe read | Resolver |
|---|---|---|---|---|
| 1 | IDN (`identity`) | `requireListingEligibility` | `claimSellerTrack` | `getSellerVerification` |
| 2 | VER (`identity`) | `assertCanSubmitApplication` | `decideApplication` | `getBusinessPaymentInstructions` |
| 3 | CAT (`catalog`) | `assertCatalogAdmin` | `startFeedRun` + `upsertCatalogEntry` *(supplementary)* | `getReferencePriceAsOf` |
| 4 | DSC (`listings`) | `assertSearchArea` | `search` *(read)* | `getCardDetail` |
| 5 | INV (`listings`) | `assertListingOwner` | `reserveForPurchase` | `getAvailabilitySummary` |
| 6 | ORD (`orders`) | `assertOrderVisible` | `confirmPaid` | `hasClosedPurchase` |
| 7 | COM (`commission`) | `assertTopUpVisible` | `applyOrderDeduction` | `findCommissionAccount` |
| 8 | TRD (`trading`) | `assertActorTurn` | `acceptOffer` | `findOpenOffer` |
| 9 | MSG (`messaging`) | `assertConversationParticipant` | `sendMessage` | `findConversation` |
| 10 | COL (`collections`) | `assertCollectionOwner` | `acceptPrompt` | `getSetCompletion` |
| 11 | VAL (`collections`) | `assertValuationPeriod` | `valueCollection` *(read)* | `changePercent` |
| 12 | REP (`reviews`) | `assertVerifiedPurchaser` | `hideReview` | `getAggregates` |

---

## 1. IDN — User, Role & Seller-Type Access Manager (`identity`)

#### Function: `requireListingEligibility(userId: CuidId): Promise<{ listingKind: 'business' | 'individual'; verified: boolean }>`

*Guard. FR-IDN-3. Called by `listings` before `inventory.create` and `inventory.reactivate`.*

- **Precondition (P):**
  - `userId` MUST be a `CuidId` equal to `actorId` and equal to `"User".id` of an existing row. A missing row is a programming error (`'Unexpected'`, HTTP 500), because the session guarantees the row.
- **Postcondition (Q):**
  - The function reads the facts in one SQL statement, as AD-IDN-1 rule 1 specifies: `"User"."sellerTrack"`, and the latest `"BusinessApplication"` by `("submittedAt" DESC, id DESC)` where `"businessId" = :userId`. It projects them through `deriveCapabilities(facts)`.
  - Returns `{ listingKind: 'individual', verified: false }` when `"sellerTrack" = 'individual'`.
  - Returns `{ listingKind: 'business', verified: status = 'Approved' }` when `"sellerTrack" = 'business'` and the latest application `status ∈ {'Pending', 'Approved'}`.
  - Throws `SellerNotVerified` (HTTP 409, owner identity) when `"sellerTrack" = 'business'` and the latest application `status = 'Rejected'`. Citation: `{ rule: 'FR-IDN-3', inputs: { applicationId, reapplyNotBefore, barred } }`.
  - Throws `IndividualSellerProfileIncomplete` (HTTP 409, owner identity) when `"sellerTrack" IS NULL`. Citation: `{ rule: 'FR-IDN-3', inputs: { sellerKind: 'none' } }`.
  - Throws `'Unexpected'` (HTTP 500) when `"sellerTrack" = 'business'` and no `"BusinessApplication"` row exists for the user. This state is unreachable while AD-IDN-2 rule 2 holds, because `verification.submit` sets the track and inserts the application in one transaction. Reaching it means that invariant was broken, so the guard fails closed rather than allowing a listing (review F-19).
  - Zero writes, success or failure. No `CapabilityAuditRead` row is written; that table belongs only to `traceCapabilities` (AD-IDN-1 rule 5).
- **Invariant (I):**
  - `sellerKind` is a pure function of `"User"."sellerTrack"`: `'business'` → `'business'`, `'individual'` → `'individual'`, `NULL` → `'none'`. No input field and no cache contributes (bound to AD-IDN-1, AD-16).
  - For one fact set exactly one of {allowed, `SellerNotVerified`, `IndividualSellerProfileIncomplete`} results. `SellerNotVerified` never fires when `"sellerTrack" = 'individual'` (bound to AD-IDN-1 rule 6, AD-11).

#### Function: `claimSellerTrack(tx: Tx, userId: CuidId, track: 'individual' | 'business'): Promise<{ claimed: 'individual' | 'business' }>`

*Contended mutation. FR-IDN-2, FR-IDN-4, FR-VER-1 rule 1. The first write of `access.completeIndividualProfile` (`track='individual'`) and of `verification.submit` (`track='business'`). NFR-IDN-2 is the mandatory edge case: a simultaneous profile completion and application submission.*

- **Precondition (P):**
  - `tx` MUST be open, and this call MUST be the first statement of `tx` that locks a row: the `"User"` row is the transaction's target aggregate, lock-order position 2 (AD-SYS-4 rule 5; review F-21).
  - `userId` MUST equal `actorId` and reference an existing `"User"` row.
  - `track` MUST be the literal `'individual'` or `'business'`.
- **Postcondition (Q):**
  - For `track='individual'`, the function runs `UPDATE "User" SET "sellerTrack"='individual' WHERE id=:userId AND "sellerTrack" IS NULL RETURNING id`. One returned row means it returns `{ claimed: 'individual' }`, and the caller inserts `"IndividualSellerProfile"` in the same `tx`.
  - For `track='business'`, it runs `UPDATE "User" SET "sellerTrack"='business' WHERE id=:userId AND "sellerTrack" IS DISTINCT FROM 'individual' RETURNING id`. One returned row means it returns `{ claimed: 'business' }`, and the caller applies the AD-VER-3 steps in the same `tx`.
  - Zero returned rows: the function re-reads `"sellerTrack"` and the latest application inside `tx` and throws:
    - for `track='individual'` with `"sellerTrack"='business'`: `AlreadyVerifiedBusiness` (HTTP 409, identity) when the latest application is `Approved`, otherwise `BusinessApplicationOnFile` (HTTP 409, identity);
    - for `track='individual'` with `"sellerTrack"='individual'`: `IndividualSellerProfileAlreadyComplete` (HTTP 409, identity);
    - for `track='business'`: `IndividualSellerProfileAlreadyComplete` (HTTP 409, identity).
  - On every throw the caller's `tx` rolls back. `"sellerTrack"` keeps its prior value, and no `"IndividualSellerProfile"` or `"BusinessApplication"` row exists from this call.
  - Side effects: none. The function enqueues no event.
- **Invariant (I):**
  - No `"User"` row has `"sellerTrack"='individual'` while any `"BusinessApplication"` row has `"businessId"` = that user. Under two concurrent claims with different `track` values, exactly one `UPDATE` returns 1 row, because the row lock serializes them (bound to AD-IDN-2, AD-18).
  - `"sellerTrack"` is never set back to `NULL` and never changes between `'individual'` and `'business'` (bound to AD-IDN-2 rule 4). Enforced by `CHECK ("sellerTrack" IN ('individual','business'))` and the two `WHERE` predicates.

#### Function: `getSellerVerification(sellerId: CuidId): Promise<{ status: 'Approved' | 'Pending' | 'Rejected' | 'none' }>`

*Resolver. FR-IDN-6, FR-INV-7. Called by `listings.reserveForPurchase` inside the caller's transaction, through `db()` (AD-SYS-4 rule 9).*

- **Precondition (P):**
  - `sellerId` MUST be a `CuidId`. The row MAY not exist.
- **Postcondition (Q):**
  - Returns `{ status }` = `status` of the latest `"BusinessApplication"` where `"businessId" = :sellerId`, ordered by `("submittedAt" DESC, id DESC)`.
  - Returns `{ status: 'none' }` when no application exists or no `"User"` row has `id = :sellerId`. This is a silent result: no error, no log row, no audit row.
  - Zero writes. Inside an open transaction it reads through that transaction's connection and never acquires a second pool connection (AD-SYS-4 rule 9).
- **Invariant (I):**
  - For the same committed facts, `getSellerVerification(x).status` equals the verification status that `getCapabilities(x)` and `getSellerKinds([x])` derive. All three are projections of one `deriveCapabilities` output (bound to AD-IDN-1 rule 2).

---

## 2. VER — Business Verification Workflow (`identity`)

#### Function: `assertCanSubmitApplication(businessId: CuidId, now: Instant): Promise<void>`

*Guard. FR-VER-1 rules 2–4, FR-VER-6. Runs inside the `verification.submit` transaction after `claimSellerTrack(tx, businessId, 'business')` (AD-VER-3 rule 1 steps 2–3).*

- **Precondition (P):**
  - `businessId` MUST equal `actorId`.
  - `claimSellerTrack(tx, businessId, 'business')` MUST have returned `{ claimed: 'business' }` in the same transaction.
- **Postcondition (Q):**
  - Reads the latest `"BusinessApplication"` for `businessId` by `("submittedAt" DESC, id DESC)`.
  - Returns `void` when no application exists, or when the latest has `status='Rejected' AND "reapplyBarred"=false AND :now >= "reapplyNotBefore"`.
  - Throws `ApplicationAlreadyPending` (HTTP 409, identity) when the latest `status='Pending'`. Citation: `{ rule: 'FR-VER-1', inputs: { applicationId, submittedAt } }`.
  - Throws `AlreadyVerifiedBusiness` (HTTP 409, identity) when the latest `status='Approved'`.
  - Throws `ReapplicationBarred` (HTTP 409, identity) when the latest `status='Rejected' AND "reapplyBarred"=true`. Citation: `{ rule: 'FR-VER-6', inputs: { rejectionReasonCode } }`.
  - Throws `ReapplicationCooldownActive` (HTTP 409, identity) when the latest `status='Rejected' AND :now < "reapplyNotBefore"`. Citation: `{ rule: 'FR-VER-6', inputs: { reapplyNotBefore } }`.
  - Zero writes. A throw rolls back the enclosing transaction, including the `claimSellerTrack` update.
- **Invariant (I):**
  - Reapplication is judged only from the snapshot columns `"reapplyBarred"` and `"reapplyNotBefore"` on the decided application, never from the current `"RejectionReason"` row (bound to AD-VER-3, AD-VER-1 rule 5).
  - The cooldown boundary is half-open: refused for `now < reapplyNotBefore`, allowed at `now = reapplyNotBefore` (bound to AD-VER-3 rule 3).
  - This guard is not the physical enforcement of "one pending application". The partial unique index `"BusinessApplication"("businessId") WHERE status='Pending'` is (bound to AD-VER-3 rule 2). A concurrent second submission that passes this guard fails at the insert with `ApplicationAlreadyPending`.

#### Function: `decideApplication(applicationId: CuidId, decision: { kind: 'approve' } | { kind: 'reject'; reasonCode: string; note?: string }, adminId: CuidId, now: Instant): Promise<{ applicationId: CuidId; status: 'Approved' | 'Rejected'; decidedAt: Instant; decidedBy: CuidId }>`

*Contended mutation. FR-VER-3, FR-VER-4. NFR-VER-1 is the mandatory edge case: two admins approve and reject the same `Pending` application at once.*

- **Precondition (P):**
  - `adminId` MUST equal `actorId`, and `getCapabilities(adminId)` MUST include `isAdmin=true`. Otherwise `adminProcedure` throws `AdminOnly` (HTTP 403, identity) before the call.
  - `applicationId` MUST be a `CuidId`.
  - For `kind='reject'`: `note` is 0–500 characters when present.
- **Postcondition (Q):**
  - **Error precedence** (first-fail, review F-20):
    1. No `"BusinessApplication"` with `id = :applicationId` → `ApplicationNotFound` (HTTP 404, identity).
    2. `status ≠ 'Pending'` at the time of the read → `ApplicationNotPending` (HTTP 409, identity).
    3. For `kind='reject'`: `SELECT … FROM "RejectionReason" WHERE code = :reasonCode AND active FOR SHARE` returns no row → `RejectionReasonUnknown` (HTTP 409, identity). The share lock blocks a concurrent deactivation until this transaction commits (AD-VER-1 rule 1).
  - Runs in one transaction: `UPDATE "BusinessApplication" SET status=:to, "decidedBy"=:adminId, "decidedAt"=:now, version=version+1 [, "rejectionReasonCode"=:reasonCode, "rejectionNote"=:note, "reapplyNotBefore"=:now + cooldownDays × 1 day | "reapplyBarred"=true] WHERE id=:applicationId AND status='Pending' RETURNING *`.
  - When 1 row is returned, the same transaction also:
    - inserts one `"ApplicationDecisionLog"` row `{ applicationId, adminId, decision, reasonCode, at: now }`;
    - enqueues exactly one `OutboxEvent`:
      - `BusinessApplicationApproved { applicationId, businessId, businessName, approvedAt, approvedBy }`, with `EventDelivery` rows for subscribers `commission` and `listings`; or
      - `BusinessApplicationRejected { applicationId, businessId, reasonCode, reapplyNotBefore | barred, rejectedAt }`, with one `EventDelivery` row for `listings`.
  - It then returns `{ applicationId, status, decidedAt: now, decidedBy: adminId }`.
  - When 0 rows are returned (a concurrent decision committed between the read in step 2 and this update), it re-reads the row in the same transaction and throws `ApplicationNotPending` (HTTP 409, identity), citing `{ status, decidedBy, decidedAt }` of the winning decision.
    - In both cases no `"ApplicationDecisionLog"` row and no `OutboxEvent` is written.
  - Repeating the same call after a success throws `ApplicationNotPending` and writes nothing (idempotent on repetition).
- **Invariant (I):**
  - Each `"BusinessApplication"` makes at most one transition out of `Pending`, and `CHECK ((status='Pending') = ("decidedAt" IS NULL))` holds before and after every call. The unique `"ApplicationDecisionLog"."applicationId"` is a second physical guard (bound to AD-VER-1, AD-SYS-5).
  - The number of `BusinessApplication*` events for an application equals the number of its decided transitions: 0 or 1 (bound to AD-VER-1 rule 4, AD-SYS-2 rule 1).

#### Function: `getBusinessPaymentInstructions(businessId: CuidId): Promise<{ bankName: string; accountType: 'savings' | 'checking'; /* UX 5.1: Ahorros · Corriente */ accountNumber: string; holderName: string; qrObjectKey: string | null } | null>`

*Resolver. FR-VER-9. Called by `orders.create` inside its transaction to snapshot the instructions (AD-ORD-1 rule 2 step 4).*

- **Precondition (P):**
  - `businessId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - Returns the `"BusinessProfile"` instruction columns of `businessId` when the latest `"BusinessApplication"` for that business has `status='Approved'`.
  - Returns `null` when no `"BusinessProfile"` row exists or the latest application is not `Approved`. This is a silent result: no error and no log row. `orders` never reaches the `null` branch, because `reserveForPurchase` refuses a listing whose seller is not `Approved` first. If it does reach it, `orders` raises `'Unexpected'` (HTTP 500).
  - Zero writes.
- **Invariant (I):**
  - An order holds the instructions as a snapshot in `"Order"."paymentInstructionsSnapshot"`. A later edit of `"BusinessProfile"` never changes an existing order (bound to AD-9, AD-15 via FR-VER-9).

---

## 3. CAT — Catalog & Price Reference Service (`catalog`)

#### Function: `assertCatalogAdmin(actorId: CuidId): Promise<void>`

*Guard. FR-CAT-3, FR-IDN-7. Precedes `catalog.feed.start`, `catalog.feed.continue`, `catalog.feed.runs`, `catalog.feed.quarantine`, `catalog.fx.retry`.*

*Placement (review E-23, decision log #15).* This guard is the `adminProcedure` check that the `catalog` router's procedures are built with, in `src/server/trpc/admin-guard.ts`. That file is a driving adapter, and it may call `identity`. It does **not** live inside `catalog`: AD-1 gives `catalog` no module dependencies, and a call from `catalog` to `identity.requireAdmin` would add one. `catalog`'s own use cases run only after this guard has passed.

- **Precondition (P):**
  - `actorId` MUST be the session's `userId`. A missing session is refused by the procedure builder with `NotAuthenticated` (HTTP 401, identity) before the call.
- **Postcondition (Q):**
  - Calls `identity.requireAdmin(actorId)` once from the procedure builder. That `identity` function reads the `"User"."isAdmin"` fact through `deriveCapabilities` and is the only code that constructs `AdminOnly`. AD-SYS-1 rule 2 and lint `tezg/error-owner` forbid any other module from raising it (review F-01).
  - Returns `void` when `isAdmin = true`.
  - Otherwise `identity.requireAdmin` throws `AdminOnly` (HTTP 403, owner identity), and the guard lets it propagate unchanged, without catching or rewrapping it. No `catalog` code runs. Citation: `{ rule: 'FR-IDN-7', inputs: { userId: actorId } }`.
  - Zero writes.
- **Invariant (I):**
  - Admin status comes only from `"User"."isAdmin"`, read server-side. No procedure input carries a key named `role`, `roles`, `isAdmin` or `capabilities` (bound to AD-16, AD-SYS-8 rules 1–2).

#### Function: `startFeedRun(actorId: CuidId, now: Instant): Promise<{ runId: CuidId; startedAt: Instant }>`

*Contended mutation. FR-CAT-3. Two admins pressing "Iniciar" at once, or the `daily-night` job overlapping an admin start.*

- **Precondition (P):**
  - `assertCatalogAdmin(actorId)` MUST have returned.
- **Postcondition (Q):**
  - Runs in one transaction:
    1. `UPDATE "FeedIngestionRun" SET status='Failed', "endedAt"=:now WHERE status='Running' AND COALESCE("leaseUntil", "startedAt") < :now - interval '24 hours'` fails a run abandoned for more than 24 h.
    2. `INSERT INTO "FeedIngestionRun" (id, status, cursor, created, updated, unchanged, quarantined, "deferredNoFx", "startedAt") VALUES (:id, 'Running', 0, 0, 0, 0, 0, 0, :now)`.
  - Returns `{ runId: id, startedAt: now }`.
  - When the insert violates the partial unique index `ON "FeedIngestionRun"((true)) WHERE status='Running'`, it throws `FeedRunInProgress` (HTTP 409, catalog), citing `{ runId, startedAt }` of the running row. The transaction rolls back, so no new run row exists.
  - Side effects: none. Ingestion batches run only under `catalog.feed.continue` (AD-CAT-1 rule 2).
- **Invariant (I):**
  - At most one `"FeedIngestionRun"` row has `status='Running'` at any instant, physically enforced by the partial unique index (bound to AD-CAT-1 rule 1).

#### Function: `upsertCatalogEntry(tx: Tx, row: ValidFeedRow, runId: CuidId, now: Instant): Promise<{ catalogEntryId: CuidId; outcome: 'created' | 'updated' | 'unchanged'; changedFields: string[] }>` *(supplementary — decision log #7)*

*Contended mutation, the fourth CAT contract, added at the Phase 1 gate (review F-10). FR-CAT-2, FR-CAT-4. It covers the CAT mandatory edge case: a feed row whose external attributes change (a renamed card, a reprint, a corrected artist) updates the existing entry without changing its `catalogEntryId`. Runs inside one `catalog.feed.continue` batch transaction (AD-CAT-1 rule 3).*

`ValidFeedRow = { externalKey: string; setCode: string; number: string; name: string; kind: 'card' | 'sealedProduct'; eraCode: string; pokemon: string | null; colour: string | null; style: string | null; artist: string | null; imageUrl: string | null }`, which has already passed the pure `validateRow` (ADD-§8.1).

- **Precondition (P):**
  - `tx` MUST be the batch transaction that renewed the run's lease with `UPDATE "FeedIngestionRun" SET "leaseUntil" = :now + 90 s WHERE id = :runId AND "leaseToken" = :t` (1 row) as its first statement.
  - `row` MUST satisfy `validateRow(row) = ok`. A row that fails it is written to `"QuarantinedFeedRow"` and never reaches this function.
  - `"CatalogSet"` with `code = row.setCode` MUST exist, inserted earlier by the same run.
- **Postcondition (Q):**
  - Runs `INSERT INTO "CatalogEntry" (id, "externalKey", "setId", kind, name, number, "numberSort", pokemon, colour, style, artist, "imageUrl", "createdAt", "updatedAt") VALUES (:newId, …, :now, :now) ON CONFLICT ("externalKey") DO UPDATE SET "setId", name, number, "numberSort", pokemon, colour, style, artist, "imageUrl" = EXCLUDED.<same>, "updatedAt" = :now WHERE ("CatalogEntry"."setId", name, number, "numberSort", pokemon, colour, style, artist, "imageUrl") IS DISTINCT FROM (EXCLUDED.<same>) RETURNING id, (xmax = 0) AS inserted`.
  - **The `DO UPDATE SET` list is exactly the nine attributes above.** It never contains `id`, `"externalKey"`, `kind` or `"createdAt"`, so an upsert cannot reassign the identity or turn a card into a sealed product. `"nameKey"` is a generated column and follows `name` (review E-04).
  - Returns:
    - `outcome: 'created'` when the row was inserted, with `catalogEntryId = :newId`;
    - `outcome: 'updated'` when an existing row's attributes changed, with `catalogEntryId` = **the existing `id`**. The same `tx` inserts one `"CatalogEntryRevision" { catalogEntryId, runId, changedFields, before, after }`;
    - `outcome: 'unchanged'` when every attribute is equal. The `DO UPDATE … WHERE` returns no row, so the function selects the existing `id` and writes nothing.
  - `kind` is never changed by an update. Plan-2 does not say what happens to a feed row whose `kind` differs from the stored entry's. **[GAP-4]** proposes a new quarantine reason `KindChanged` (an ADD-§8.1 extension), so that a card never silently becomes a sealed product under existing listings and bundle components. It is routed to the Phase 2 gate.
  - No `"Listing"`, `"BundleComponent"`, `"CollectionEntry"` or `"TradeOffer"` row is read or written. Those modules reference the entry by `id` only (AD-8).
- **Invariant (I):**
  - `"CatalogEntry".id` is never reassigned and never deleted. One `"externalKey"` maps to exactly one `id` for the life of the catalog, physically enforced by `UNIQUE ("externalKey")` with the upsert keeping `id` (bound to AD-CAT-1 rule 5, AD-7).
  - Re-running a file converges: a second run over the same rows produces `outcome='unchanged'` for every row and zero `"CatalogEntryRevision"` rows (bound to AD-CAT-1 rule 6).

#### Function: `getReferencePriceAsOf(catalogEntryId: CuidId, asOf: Instant): Promise<ReferencePrice | null>`

*Resolver. FR-CAT-5, FR-CAT-7. The per-entry projection of the batched port `getReferencePricesAsOf(ids ≤ 500, asOf)` used by VAL.*

`ReferencePrice = { usdCents: number | null; cop: Cop; observedAt: Instant; source: string; copDerivation: 'sourceNative' | 'fxDerived'; fxRateDate: string | null; stale: boolean }`

- **Precondition (P):**
  - `catalogEntryId` MUST be a `CuidId`. The entry MAY not exist.
  - `asOf` MUST be an `Instant`.
- **Postcondition (Q):**
  - Returns the first `"ReferencePriceObservation"` row for `catalogEntryId` with `"observedAt" ≤ :asOf`, ordered by `("observedAt" DESC, source ASC, id ASC)`. The tie-break makes the result deterministic when two sources share an instant (review F-11). The row is returned with `stale = (asOf − observedAt) > freshnessThresholdHours` (configuration, default 36 h).
  - Returns `null` when no observation with `"observedAt" ≤ :asOf` exists, including for an unknown `catalogEntryId`. This is a silent result: no error and no log row.
  - Zero writes. `stale` is computed in the query and never stored.
- **Invariant (I):**
  - Every returned field equals a stored observation column byte for byte. No interpolation, averaging or substitution from another source occurs (bound to AD-CAT-2 rule 5, NFR-CAT-3).
  - `ReferencePrice` is not assignable to `Cop` at compile time (bound to AD-SYS-7 rule 2).

---

## 4. DSC — Marketplace Browse & Location Discovery (`listings`, no tables)

#### Function: `assertSearchArea(area: { lat: number; lng: number; radiusKm: number }): void`

*Guard. FR-DSC-1. Pure: no I/O.*

- **Precondition (P):**
  - `area.lat`, `area.lng` and `area.radiusKm` MUST be finite IEEE-754 doubles. The input parser refuses `NaN` and `±Infinity` as `RequestValidationFailed`.
- **Postcondition (Q):**
  - Returns `void` when all of these hold:
    - `1 ≤ radiusKm ≤ 300`;
    - `−4.23 ≤ lat ≤ 13.39`;
    - `−81.73 ≤ lng ≤ −66.85`;
    - `(lat, lng) ≠ (0, 0)`.
  - Throws `InvalidSearchArea` (HTTP 400, listings) otherwise. Citation: `{ rule: 'FR-DSC-1', inputs: { lat, lng, radiusKm } }`.
  - Zero writes and zero reads.
- **Invariant (I):**
  - The bounding box constants are the single ADD-§2.4 constants shared with `InvalidLocation` in INV and the meeting-point CHECK in IDN (bound to AD-DSC-1, AD-5).

#### Function: `search(input: SearchInput, now: Instant): Promise<{ results: SearchRow[]; excluded: { unusableLocation: number } }>` *(concurrency-safe read)*

*Fills the contended slot (decision log #4). FR-DSC-1..6. Concurrent writers are `reserveForPurchase` (availability to 0), `hideListing` (`hiddenAt`) and the commission projection (`pausedAt`).*

`SearchInput = { view: 'listings'; catalogFilters?: CatalogFilters; area?: { lat; lng; radiusKm }; maxPriceCop?: Cop; condition?: Condition[]; purchasableOnly?: boolean; includeSoldOut?: boolean (default false); page: integer 1..417; pageSize: 24 }`. The cap 417 = ⌈10,000 seeded listings / 24⌉ bounds the `OFFSET` (review E-19); a larger `page` is refused as `RequestValidationFailed`.

This contract covers FR-DSC-1's `view: 'listings'`. FR-DSC-1's other view, `entries`, pages over `catalog.browse` with the same predicate and ranking functions (AD-DSC-1 rule 7) and is outside this contract (review F-18).

`SearchRow = { listingId: CuidId; catalogEntryIds: CuidId[]; priceCop: Cop; distanceKm: number | null; sellerKind: 'business' | 'individual'; verified: boolean; pickupAvailable: boolean; purchasable: boolean; explanation: string }`

- **Precondition (P):**
  - When `area` is present, `assertSearchArea(area)` MUST have returned.
- **Postcondition (Q):**
  - When `catalogFilters` is present, the function makes one call to `catalog.matchEntryIds`. If it answers `tooBroad` (more than 20,000 ids), the function throws `SearchFilterTooBroad` (HTTP 400, listings).
  - It runs **one** SQL statement. That statement:
    - selects listings with `"hiddenAt" IS NULL AND "withdrawnAt" IS NULL AND "deactivatedAt" IS NULL`, and availability ≥ 1 unless `includeSoldOut = true`, in which case sold-out rows are included and ranked last;
    - applies a bbox prefilter, then `d ≤ radiusKm + 1e-6`, where `d = 2 × 6371.0088 × asin(sqrt(…))` in double precision;
    - orders by `(d, "priceCop", id)` with an area, or `("priceCop", id)` without one;
    - counts unusable locations with `FILTER`.
  - It then makes one call to `identity.getSellerKinds(distinct sellerIds of the page)`, which derives `sellerKind`, `verified` and `pickupAvailable = (sellerKind = 'individual')`.
  - Neighbour calls per request: at most 3 (AD-DSC-2 rule 1).
  - Zero writes.
  - **Concurrency:**
    - A listing whose hide, withdrawal, deactivation, or decrement to availability 0 committed before the statement began is absent from `results`.
    - A change that commits after the statement began is not visible in that response. The statement reads one READ COMMITTED snapshot, so no row mixes two snapshots.
    - Two calls with equal input against unchanged committed data return byte-identical `results` (FR-DSC-5 acceptance).
- **Invariant (I):**
  - One query path serves both seller kinds. The SQL builder contains no branch on seller kind (bound to AD-5, AD-DSC-1 rule 1).
  - A row with `"hiddenAt" IS NOT NULL` is never returned (bound to AD-12, AD-DSC-1 rule 6).
  - `pickupAvailable` is computed per request and never stored (bound to AD-DSC-2 rule 3).

#### Function: `getCardDetail(catalogEntryId: CuidId, area?: { lat; lng; radiusKm }): Promise<CardDetail>`

*Resolver. FR-DSC-7. Covers the DSC mandatory edge case: an entry whose every listing is filtered out by location.*

`CardDetail = { entry: CatalogEntryDTO; provenance: PriceProvenanceDTO; listingPriceCop: Cop | null; hasActiveListings: boolean; listings: SearchRow[] }`

- **Precondition (P):**
  - `catalogEntryId` MUST be a `CuidId`.
  - When `area` is present, `assertSearchArea(area)` MUST have returned.
- **Postcondition (Q):**
  - Calls `catalog.getEntry(catalogEntryId)` first. An unknown id propagates `CatalogEntryNotFound` (HTTP 404, owner catalog) unchanged, and no further call is made.
  - Calls `catalog.getPriceProvenance([catalogEntryId], 30)` once.
  - Runs the `search` statement restricted to `catalogEntryId`.
  - Returns `listingPriceCop` = the minimum `"priceCop"` over the returned listings; `hasActiveListings = listings.length > 0`; and `listings` ranked as in `search`.
  - **Missing data:** when no listing survives the filters (none exist, or every one is outside `area`), it returns `{ entry, provenance, listingPriceCop: null, hasActiveListings: false, listings: [] }`. The entry is present, and no error is thrown.
  - Zero writes. Neighbour calls: at most 3 (`getEntry`, `getPriceProvenance`, `getSellerKinds`).
- **Invariant (I):**
  - `listingPriceCop` (a `Cop`) and `provenance.lastTransactionReference` (a `ReferencePrice`) are distinct fields. Neither is derived from, summed with, nor averaged with the other (bound to AD-SYS-7, FR-CAT-6).
  - `catalog` is called by `listings`, never the reverse (bound to AD-1, AD-DSC-2 rule 4).

---

## 5. INV — Listing & Shared Inventory Engine (`listings`)

#### Function: `assertListingOwner(listingId: CuidId, actorId: CuidId): Promise<{ sellerId: CuidId; hiddenAt: Instant | null }>`

*Guard. FR-INV-9, FR-INV-10. Precedes `inventory.update`, `restock`, `deactivate` and `reactivate`.*

- **Precondition (P):**
  - `listingId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Reads `"Listing"` columns `"sellerId"`, `"hiddenAt"`, `"withdrawnAt"`, `"deactivatedAt"` for `listingId`.
  - Returns `{ sellerId, hiddenAt }` when `"sellerId" = :actorId`. The owner always passes, including for a hidden listing (FR-INV-10).
  - Throws `ListingNotFound` (HTTP 404, listings) when no row exists, or when `"sellerId" ≠ :actorId` and any of `"hiddenAt"`, `"withdrawnAt"`, `"deactivatedAt"` is non-null. The body is identical to the unknown-id body, so a moderated listing's existence is not disclosed.
  - Throws `ListingNotOwnedByCaller` (HTTP 403, listings) when `"sellerId" ≠ :actorId` and the listing is visible.
  - Zero writes.
- **Invariant (I):**
  - Only the seller identified by the session may change a listing. Ownership is read from `"Listing"."sellerId"` and never from input (bound to AD-SYS-8 rule 1, AD-8).
  - The guard's read is advisory. Each write re-asserts ownership in its own `WHERE "sellerId" = :actorId` predicate (bound to AD-SYS-5 rule 3).

#### Function: `reserveForPurchase(tx: Tx, listingId: CuidId, qty: number, buyerId: CuidId): Promise<{ reservationRef: { listingId: CuidId; units: { inventoryUnitId: CuidId; qty: number }[] }; exhaustedListingIds: CuidId[]; snapshot: { title: string; itemRef: string | null; condition: Condition | null; unitPriceCop: Cop; components: { catalogEntryId: CuidId; perBundleQty: number }[] | null } }>`

*Contended mutation. FR-INV-3, FR-INV-6. Called only by `orders.create` (AD-ORD-1 rule 2 step 3). NFR-INV-1 covers the last-unit race. NFR-INV-2 / FR-INV-6 is the mandatory edge case: the caller aborts after a successful reserve.*

- **Precondition (P):**
  - `tx` MUST be open and owned by `orders.create`. The function never begins or commits a transaction.
  - `qty` MUST be an integer `≥ 1`. A violation throws `'Unexpected'` (HTTP 500) before any SQL.
  - `buyerId` MUST be the session's `userId`, and `buyerId ≠ "Listing"."sellerId"`. `orders` checks this first through `getListingForPurchase` and raises `SelfPurchaseNotAllowed`.
  - The caller does **not** check visibility or purchasability. Those checks belong to this function (review F-05).
- **Postcondition (Q):**
  - **Listing checks**, in this order, each first-fail. Each runs inside `tx` before any decrement:
    1. A `"Listing"` row exists with `"hiddenAt"`, `"withdrawnAt"` and `"deactivatedAt"` all null. Otherwise `ListingNotFound` (HTTP 404, listings).
    2. `"sellerKindAtCreation" = 'business'`. Otherwise `NotBusinessListing` (HTTP 409, listings).
    3. `purchasable(listing)` (AD-INV-3 rule 1): `identity.getSellerVerification(sellerId).status = 'Approved'` and `"pausedAt" IS NULL`. Otherwise `ListingNotPurchasable` (HTTP 409, listings), citing `ListingUnverified` (status ≠ `Approved`) or `ListingPausedBalanceExhausted` (`"pausedAt"` non-null).
    - **Recorded deviation from FR-INV-3's text (review F-06).** FR-INV-3 lists "withdrawn or deactivated" among `ListingNotPurchasable`'s citations, but FR-INV-10 and ADD-§3.1 send a non-owner a `ListingNotFound` for a withdrawn or deactivated listing, and FR-INV-3's own check 1 runs first. Those two citations are therefore unreachable. This contract follows FR-INV-10 / ADD-§3.1 and is consistent with check 1.
  - For each `InventoryUnit` of the listing in **ascending `id` order**, it runs `UPDATE "InventoryUnit" SET quantity = quantity - :req WHERE id = :u AND quantity >= :req RETURNING quantity`.
    - For a single listing, `:req = qty`.
    - For a bundle, `:req = "perBundleQty" × qty` per component.
  - When every update returned 1 row, it runs one `SELECT` in `tx` that computes `exhaustedListingIds`: the ids of every listing referencing a decremented unit whose availability is now 0. It then returns `{ reservationRef, exhaustedListingIds, snapshot }`, where `snapshot.unitPriceCop` = `"Listing"."priceCop"` read in `tx`.
  - When any update returns 0 rows, it throws `InsufficientQuantity` (HTTP 409, listings) with citation `{ rule: 'FR-INV-3', inputs: { requested: :req, available: quantity } }`. The caller's `tx` rolls back, which restores every unit decremented earlier in this call.
  - No table other than `"InventoryUnit"` is written (NFR-INV-3). The function enqueues no event, and no reservation row exists (FR-INV-6).
  - **Caller abort after success:** if `tx` rolls back after this function returned (for example, the `"Order"` insert fails), every `quantity` equals its value before the call. No compensating write runs, and no reservation remains.
- **Invariant (I):**
  - `"InventoryUnit".quantity ≥ 0` before and after every call, physically enforced by `CHECK (quantity >= 0)` (bound to AD-6, AD-INV-1 rule 3).
  - Under N concurrent calls that each require the same `req` from a unit with `quantity = k`, exactly `min(N, floor(k / req))` calls succeed and every other call throws `InsufficientQuantity`. For calls with mixed `req` values, the sum of granted `req` is ≤ `k`, and every refused call had `req` > the quantity remaining when its update ran (bound to AD-INV-2 rule 3, AD-SYS-5; review F-07).
  - Units are locked in ascending `id` order, which is position 3 of the global lock order (bound to AD-SYS-4 rule 5).

#### Function: `getAvailabilitySummary(catalogEntryIds: CuidId[], area?: { lat; lng; radiusKm }): Promise<{ catalogEntryId: CuidId; lowestPriceCop: Cop | null; availableCount: number }[]>`

*Resolver. FR-COL-6. Called by `collections.wishlist.*`.*

- **Precondition (P):**
  - `catalogEntryIds` MUST contain 1–500 distinct `CuidId` values. More than 500 throws `'Unexpected'` (HTTP 500), because `collections` chunks at 500. Duplicates are refused by the input parser as `RequestValidationFailed` (review E-22).
  - When `area` is present, `assertSearchArea(area)` MUST have returned.
- **Postcondition (Q):**
  - Returns exactly one element per input id, in input order.
  - For each id, it counts listings that reference the entry and satisfy all of:
    - `"hiddenAt"`, `"withdrawnAt"` and `"deactivatedAt"` null;
    - availability ≥ 1;
    - for a business listing, `purchasable(listing)`: `"pausedAt" IS NULL` **and** the seller's verification is `Approved`. Verification is read through **one** `identity.getSellerKinds(distinct business sellerIds)` call per request. A `Pending` business's listing is visible but not purchasable, so it does not count (review F-08);
    - for an individual-seller listing, no purchasability term (it is contactable, FR-MSG-1);
    - inside `area` when present.
    `lowestPriceCop` is the minimum `"priceCop"` over them.
  - **Missing data:** an id with no counted listing, including an id unknown to `catalog`, returns `{ catalogEntryId, lowestPriceCop: null, availableCount: 0 }`. The element is present, and no error is thrown.
  - Zero writes. One SQL statement plus at most one `identity.getSellerKinds` call.
- **Invariant (I):**
  - Availability is computed at read from `"InventoryUnit".quantity` (single: `quantity`; bundle: `min(floor(quantity / "perBundleQty"))`) and never stored (bound to AD-INV-1 rule 2).
  - Hidden listings never contribute (bound to AD-12).

---

## 6. ORD — Order & Comprobante Confirmation (`orders`)

#### Function: `assertOrderVisible(orderId: CuidId, actorId: CuidId): Promise<{ role: 'buyer' | 'business' }>`

*Guard. FR-ORD-6. Precedes `orders.get`, `orders.comprobanteUrl` and every confirmation.*

- **Precondition (P):**
  - `orderId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Runs `SELECT "buyerId", "businessId" FROM "Order" WHERE id = :orderId AND ("buyerId" = :actorId OR ("businessId" = :actorId AND "buyerPaidConfirmedAt" IS NOT NULL))`.
  - Returns `{ role: 'buyer' }` when `"buyerId" = :actorId`, and `{ role: 'business' }` otherwise.
  - Throws `OrderNotVisibleToCaller` (HTTP 403, orders) when the statement returns no row. The response body is byte-identical for an unknown id, another user's order, and a business order before the buyer's paid confirmation.
  - Zero writes.
- **Invariant (I):**
  - A business never reads an order whose `"buyerPaidConfirmedAt" IS NULL` (bound to AD-15, AD-ORD-3 rule 1).
  - Every order read in `orders` uses this single predicate (bound to AD-ORD-3 rule 1).

#### Function: `confirmPaid(orderId: CuidId, buyerId: CuidId, now: Instant): Promise<{ orderId: CuidId; buyerPaidConfirmedAt: Instant; status: 'Paid' }>`

*Contended mutation. FR-ORD-3. Contenders: a double click, two tabs, and the paid-versus-expiry race at `now = expiresAt` (NFR-ORD-1). The ORD mandatory edge case is a confirmation that is repeated or arrives out of order.*

- **Precondition (P):**
  - `buyerId` MUST equal `actorId`.
  - `orderId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - Runs `UPDATE "Order" SET "buyerPaidConfirmedAt" = :now, version = version + 1 WHERE id = :orderId AND "buyerId" = :buyerId AND "comprobanteObjectKey" IS NOT NULL AND "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL AND "expiresAt" > :now RETURNING id`.
  - When 1 row is returned, it returns `{ orderId, buyerPaidConfirmedAt: now, status: 'Paid' }`. No event is enqueued, because `OrderPaymentConfirmedByBusiness` belongs to the business confirmation.
  - When 0 rows are returned, it re-reads the order in the same transaction and throws the first that applies:
    - not visible to `buyerId` → `OrderNotVisibleToCaller` (HTTP 403, orders);
    - `"buyerId" ≠ :buyerId` → `OrderNotOwnedByCaller` (HTTP 403, orders);
    - `"buyerPaidConfirmedAt" IS NOT NULL` → `OrderAlreadyConfirmedByRole` (HTTP 409, orders), citing the stored `buyerPaidConfirmedAt`;
    - `"cancelledAt"` or `"expiredAt"` non-null, or `"expiresAt" ≤ :now` → `OrderNoLongerActive` (HTTP 409, orders), citing the state and its instant. When `"expiresAt" ≤ :now AND "expiredAt" IS NULL`, the same transaction first runs the expiry transition (`"expiredAt"=:now`, `"cancelReason"='Unpaid'`, `releaseReservation(tx, "reservationRef")`), commits, and only then throws;
    - `"comprobanteObjectKey" IS NULL` → `ComprobanteNotYetUploaded` (HTTP 409, orders).
  - On every throw other than the materialized expiry, zero writes.
- **Invariant (I):**
  - `"buyerPaidConfirmedAt"` is set at most once per order and never changes after it is set. Of N concurrent calls at most one returns success (bound to AD-ORD-2 rules 1 and 3, AD-SYS-5).
  - A paid order is never expired or cancelled, physically enforced by `CHECK (("cancelledAt" IS NULL AND "expiredAt" IS NULL) OR "buyerPaidConfirmedAt" IS NULL)` (bound to AD-ORD-2, AD-2).
  - `"Order"` has no balance, escrow or payment-status column (bound to AD-2, AD-ORD-3 rule 5).

#### Function: `hasClosedPurchase(buyerId: CuidId, businessId: CuidId): Promise<{ closed: boolean; latestState: OrderStatus | null }>`

*The signature equals the ARCH §6.6 port. `now` comes from the `Clock` port inside `orders`, not from the caller (AD-SYS-6; review F-09).*

*Resolver. FR-ORD-9. Called by `reviews` (REP).* `OrderStatus = 'AwaitingPayment' | 'Paid' | 'PaymentConfirmed' | 'Closed' | 'Cancelled' | 'Expired'`.

- **Precondition (P):**
  - `buyerId` and `businessId` MUST be `CuidId` values.
- **Postcondition (Q):**
  - Returns `closed = EXISTS (SELECT 1 FROM "Order" WHERE "buyerId"=:buyerId AND "businessId"=:businessId AND "buyerItemReceivedConfirmedAt" IS NOT NULL)`.
  - Returns `latestState = deriveStatus(facts, Clock.now())` of the latest such order by `("createdAt" DESC, id DESC)`.
  - **Missing data:** when the pair has no order, it returns `{ closed: false, latestState: null }`. This is a silent result: no error, no log row.
  - Zero writes.
- **Invariant (I):**
  - "Completed purchase" means `"buyerItemReceivedConfirmedAt" IS NOT NULL`, never `"buyerPaidConfirmedAt" IS NOT NULL` (bound to AD-2, AD-ORD-3 rule 4).

---

## 7. COM — Commission Ledger & Purchasability Engine (`commission`)

#### Function: `assertTopUpVisible(topUpRequestId: CuidId, actorId: CuidId): Promise<void>`

*Guard. FR-COM-3. Precedes `commission.topUpProofUrl` and the business's own top-up reads.*

- **Precondition (P):**
  - `topUpRequestId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Runs `SELECT 1 FROM "TopUpRequest" WHERE id = :topUpRequestId AND "businessId" = :actorId`.
  - Returns `void` when one row exists.
  - Throws `TopUpNotVisibleToCaller` (HTTP 403, commission) otherwise. The body is identical for an unknown id and another business's request.
  - Zero writes.
- **Invariant (I):**
  - A business reads only its own top-up requests and proof objects (bound to AD-COM-3 rule 4, AD-SYS-8 rule 9).

#### Function: `applyOrderDeduction(tx: Tx, event: { orderId: CuidId; businessId: CuidId; totalCop: Cop; sellerReceivedConfirmedAt: Instant | null; buyerItemReceivedConfirmedAt: Instant | null }): Promise<{ outcome: 'charged'; amountCop: Cop; balanceAfter: number; ledgerSeq: number; crossing: 'exhausted' | null } | { outcome: 'duplicate' }>`

*Contended mutation. FR-COM-4, FR-COM-5, FR-COM-6. Runs as subscriber `onOrderPaymentConfirmedByBusiness` and `onOrderClosed`, inside the delivery's handler transaction (AD-SYS-2 rule 4 step 2). NFR-COM-1 is the mandatory edge case: two orders confirmed at the same instant against a balance that covers one, plus a duplicate delivery.*

- **Precondition (P):**
  - `tx` MUST be the handler transaction that holds this subscriber's `"EventDelivery"` row for the event (lock-order position 0).
  - `event` MUST be the ADD-§5 payload of `OrderPaymentConfirmedByBusiness` or `OrderClosed`, with at least one of the two fact instants non-null.
  - A `"CommissionAccount"` row MUST exist for `businessId`. If none exists, the function throws `'Unexpected'` (HTTP 500): the delivery is marked `failed` and becomes replayable (AD-COM-1 rule 1).
- **Postcondition (Q):**
  - Computes `{ commissionTriggeredAt, trigger } = commissionTrigger(facts)`, then reads `rateBps` from the `"CommissionRateSetting"` with the greatest `"effectiveFrom" ≤ commissionTriggeredAt`. It computes `c = floor((totalCop × rateBps + 5000) / 10000)` in `BigInt`.
  - When `SELECT 1 FROM "CommissionLedgerEntry" WHERE "orderId" = :orderId AND kind = 'Deduction'` returns a row, it returns `{ outcome: 'duplicate' }` with zero writes.
  - Otherwise it runs `SAVEPOINT apply_deduction`, then `UPDATE "CommissionAccount" SET "balanceCop" = "balanceCop" - :c, "ledgerSeq" = "ledgerSeq" + 1, state = CASE WHEN "balanceCop" - :c > 0 THEN 'Funded' ELSE 'Exhausted' END, version = version + 1 WHERE "businessId" = :businessId RETURNING "balanceCop", "ledgerSeq"`.
  - It then runs `INSERT INTO "CommissionLedgerEntry" (…, kind, "amountCop", "orderId", "rateBps", "baseCop", trigger, "commissionTriggeredAt", seq, "balanceAfter", at) … ON CONFLICT ("orderId") WHERE kind = 'Deduction' DO NOTHING RETURNING id`.
  - When the insert returns no row, a concurrent delivery won. The function runs `ROLLBACK TO SAVEPOINT apply_deduction`, which undoes the account update and its seq increment, and returns `{ outcome: 'duplicate' }`.
    - `tx` itself stays open, so the subscriber's `"EventDelivery"` row is still set to `delivered` in it, as AD-SYS-2 rule 4 step 2 requires. Rolling back the whole `tx`, as AD-COM-2 rule 3 words it, would also discard that update, spend an automatic attempt, and could end in `DeliveryAttemptsExhausted` for a correctly handled event (review F-03).
    - `DuplicateDeductionSentinel` is an internal control-flow signal inside `LedgerService.apply`. It is not a registry code and never leaves `commission`.
  - When `crossing(before = balanceAfter + c, after = balanceAfter)` is a move from `> 0` to `≤ 0`, it enqueues `CommissionBalanceExhausted { businessId, ledgerSeq, balanceAfter }` in `tx`, with one `"EventDelivery"` row for subscriber `listings`, and returns `crossing: 'exhausted'`. Otherwise it enqueues nothing and returns `crossing: null`.
  - A deduction is never refused, and `"balanceCop"` may become negative (AD-19).
- **Invariant (I):**
  - At most one `kind='Deduction'` ledger entry exists per `orderId`, physically enforced by the partial unique index `"CommissionLedgerEntry"("orderId") WHERE kind = 'Deduction'` (bound to AD-COM-2, AD-SYS-3).
  - `"balanceCop" = Σ TopUp."amountCop" − Σ Deduction."amountCop"`, and ledger `seq` values per business are exactly `1..ledgerSeq` (bound to AD-COM-1 rules 1, 2 and 4).
  - `CommissionBalanceExhausted` is enqueued exactly once per crossing from `> 0` to `≤ 0` (bound to AD-COM-1 rule 3, FR-COM-6).

#### Function: `findCommissionAccount(businessId: CuidId): Promise<{ businessId: CuidId; balanceCop: number; state: 'Funded' | 'Exhausted'; ledgerSeq: number } | null>`

*Resolver. FR-COM-8. Backs `commission.myAccount` and `commission.admin.ledger`.*

- **Precondition (P):**
  - `businessId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - Returns the `"CommissionAccount"` row of `businessId`.
  - **Missing data:** returns `null` when no account has been opened (the business is not yet `Approved`, or the approval event is not yet delivered). This is a silent result: no error and no row created. The 7.1 page renders `null` with its "no account yet" state from `docs/plan-2/ux/C-UX-Scenarios/07-com-commission-balance/7.1-balance-top-up/`. The copy is owned by `microcopy-es-CO.md`, not by this contract (review F-17).
  - Zero writes.
- **Invariant (I):**
  - Only the `BusinessApplicationApproved` subscriber creates an account (`INSERT … ON CONFLICT ("businessId") DO NOTHING`). A read never creates one (bound to AD-COM-1 rule 5).
  - `listings` never calls this function. Purchasability reads only the `"SellerCommissionState"` projection, and an absent row means paused (bound to AD-3, AD-INV-3 rule 3).

---

## 8. TRD — Trade Offer Negotiation Engine (`trading`)

#### Function: `assertActorTurn(offerId: CuidId, actorId: CuidId, now: Instant): Promise<{ role: 'proposer' | 'seller'; version: number }>`

*Guard. FR-TRD-2, FR-TRD-3. Precedes `trading.counter`, `accept` and `reject`, and renders the 8.2 action buttons.*

- **Precondition (P):**
  - `offerId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Reads `"TradeOffer"` `{ "proposerId", "sellerId", status, turn, version, "expiresAt" }`.
  - Throws `TradeOfferNotVisibleToCaller` (HTTP 403, trading) when the row does not exist or `actorId ∉ {"proposerId", "sellerId"}`. The body is identical in both cases.
  - Throws `TradeOfferNotOpen` (HTTP 409, trading) when `status ≠ 'Open'` or `"expiresAt" ≤ :now`, citing the derived status (`Expired` included).
  - Throws `NotYourTurn` (HTTP 409, trading) when `turn` ≠ the actor's role, citing `{ turn }`.
  - Otherwise it returns `{ role, version }`.
  - Zero writes. It does not materialize expiry.
- **Invariant (I):**
  - Only the party named by `turn` may counter, accept or reject. The mutation re-asserts `turn = :role AND version = :v` in its own `UPDATE` predicate, so this read can never authorize a stale action (bound to AD-TRD-1 rule 1, AD-SYS-5).

#### Function: `acceptOffer(offerId: CuidId, sellerId: CuidId, version: number, now: Instant): Promise<{ offerId: CuidId; status: 'Accepted'; reservationRef: ReservationRef; unfulfillableOfferIds: CuidId[]; handoff: { text: string; externalUrl: string; copyText: string } | null }>`

*Contended mutation. FR-TRD-4, FR-TRD-5, FR-TRD-6. NFR-TRD-1 is the mandatory edge case: two pending offers compete for the last unit, accepted from two tabs at once.*

- **Precondition (P):**
  - `sellerId` MUST equal `actorId` and `"TradeOffer"."sellerId"`.
  - `version` MUST be an integer `≥ 0`: the version the seller's page last read.
  - `assertActorTurn(offerId, sellerId, now)` MUST have returned `{ role: 'seller' }`.
- **Postcondition (Q):**
  - Runs in one transaction, in global lock order:
    1. `pg_advisory_xact_lock(hashtextextended('trd:seller:' || :sellerId, 0))`.
    2. `UPDATE "TradeOffer" SET status='Accepted', "acceptedAt"=:now, version=version+1 WHERE id=:offerId AND status='Open' AND turn='seller' AND version=:version AND "expiresAt" > :now`. On 0 rows it re-reads and throws `TradeOfferNotOpen` (HTTP 409, trading) or `NotYourTurn` (HTTP 409, trading).
    3. `listings.getTradeability(listingId)` in the ambient `tx`. A refusal, such as `ListingNotOpenToTrade` (HTTP 409, owner listings), propagates unchanged.
    4. `listings.reserveForTrade(tx, listingId, 1)`. `InsufficientQuantity` (HTTP 409, owner listings) propagates unchanged.
    5. Stores `"reservationRef"` on the offer and inserts `"TradeOfferRound" { action: 'accept', actor: 'seller', at: now }`.
    6. `UPDATE "TradeOffer" SET status='Unfulfillable', "unfulfillableReason"='ListingNoLongerAvailable' WHERE "listingId" = ANY(:exhaustedListingIds) AND status='Open' AND id <> :offerId RETURNING id`, then inserts one `markedUnfulfillable` round per returned id, with `actor='seller'` and `round = max(round) + 1` of that offer. `"roundCount"` is **not** incremented; it counts offer and counter rounds only, so a sibling already at 10 rounds never breaches `CHECK ("roundCount" BETWEEN 1 AND 10)` (review E-10). The own offer's `accept` round in step 5 follows the same rule.
    7. Enqueues `TradeAccepted { tradeOfferId, listingId, sellerId, proposerId, terms, acceptedAt }`, with zero `"EventDelivery"` rows (no V1 subscriber).
  - After commit, it calls `listings.generateContactMessage({ kind: 'trade', listingId, requesterId: proposerId, tradeSummary })` exactly once and returns its `{ text, externalUrl, copyText }` as `handoff`.
  - **Post-commit handoff failure (review F-14):** if that call throws (for example `ListingNotFound` because the listing was hidden between commit and call), the accept stays committed. The function returns success with `handoff: null` and logs the error code at `warn`, without the message text. Page 8.2 regenerates the handoff later through `trading.handoff`, which runs the same deterministic composition. The caller never sees an error for a committed accept.
  - **Failure at steps 3–4:** `tx` rolls back. A follow-up transaction takes the same advisory lock and runs `UPDATE "TradeOffer" SET status='Unfulfillable', "unfulfillableReason"='ListingNoLongerAvailable' WHERE id=:offerId AND status='Open'`, which is a no-op when already marked. The function then rethrows the original error. No reservation and no `TradeAccepted` event exist from this call.
- **Invariant (I):**
  - Two accepts on offers for the same last unit never both commit. The second accept to acquire `trd:seller` finds its own offer `Unfulfillable` at step 2 and throws `TradeOfferNotOpen` (bound to AD-TRD-2 rules 1 and 4, AD-6).
  - After an accept commits, no offer with `status='Open'` remains on a listing in `exhaustedListingIds` (bound to AD-TRD-2 rule 2 step 6, FR-TRD-5).
  - `CHECK (status IN ('Accepted','Cancelled') OR "reservationRef" IS NULL)` holds before and after every call (bound to AD-TRD-3).

#### Function: `findOpenOffer(listingId: CuidId, proposerId: CuidId, now: Instant): Promise<{ offerId: CuidId; version: number; turn: 'proposer' | 'seller'; expiresAt: Instant } | null>`

*Resolver. FR-TRD-1. Lets 8.1 show "Ya tienes una oferta abierta" before a duplicate submit.*

- **Precondition (P):**
  - `listingId` and `proposerId` MUST be `CuidId` values. `proposerId` MUST equal `actorId`.
- **Postcondition (Q):**
  - Returns the `"TradeOffer"` row with `"listingId"=:listingId AND "proposerId"=:proposerId AND status='Open' AND "expiresAt" > :now`.
  - **Missing data:** returns `null` when no such row exists, including when the only `Open` row has `"expiresAt" ≤ :now`. This is a silent result: no error. It does not materialize the expiry.
  - Zero writes.
- **Invariant (I):**
  - At most one `status='Open'` row exists per `("listingId", "proposerId")`, physically enforced by the partial unique index `"TradeOffer"("listingId", "proposerId") WHERE status='Open'` (bound to AD-TRD-1 rule 6).

---

## 9. MSG — Contact Handoff & In-App Business Messaging (`messaging`)

#### Function: `assertConversationParticipant(conversationId: CuidId, actorId: CuidId): Promise<{ role: 'buyer' | 'business' }>`

*Guard. FR-MSG-7. Precedes `messaging.thread`, `markRead`, `setMuted`, and `send` with a `conversationId`.*

- **Precondition (P):**
  - `conversationId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Runs `SELECT role FROM "ConversationParticipant" WHERE "conversationId" = :conversationId AND "userId" = :actorId`.
  - Returns `{ role }` when one row exists.
  - Throws `ConversationNotVisibleToCaller` (HTTP 403, messaging) otherwise. The body is identical for an unknown id and a conversation the actor is not part of.
  - Zero writes.
- **Invariant (I):**
  - Message bodies are read only by the two participants. No `adminProcedure` selects `"Message".body` (bound to AD-MSG-3 rule 5, AD-SYS-8 rule 3).

#### Function: `sendMessage(input: { recipientId: CuidId } | { conversationId: CuidId }, body: string, clientMessageId: string, senderId: CuidId, now: Instant): Promise<{ conversationId: CuidId; messageId: CuidId; seq: number; decision: Decision }>`

*Contended mutation. FR-MSG-4, FR-MSG-5, FR-MSG-6. Contenders: a network retry with the same `clientMessageId`, two first messages that both start a conversation, and two concurrent sends in one conversation.*

- **Precondition (P):**
  - `senderId` MUST equal `actorId`, and `requireCanBuy` MUST have passed (`EmailNotVerified`, HTTP 403, identity, otherwise — family `FORBIDDEN` in AD-SYS-1).
  - `body` MUST be 1–2,000 characters after NFC normalization.
  - `clientMessageId` MUST be 1–64 characters of `[A-Za-z0-9_-]`. The browser generates a cuid2 per composed message and reuses it on retry (GAP-3, adopted at the Phase 1 gate, decision log #6).
  - The target MUST be exactly one of `{ recipientId }` or `{ conversationId }`. The input parser uses two `.strict()` objects, so a payload carrying both keys, or neither, is `RequestValidationFailed` (review E-21).
  - With `{ conversationId }`, `assertConversationParticipant(conversationId, senderId)` MUST have returned.
- **Postcondition (Q):**
  - **Start path** (`{ recipientId }`):
    - A sender with `sellerKind = 'business'` → throws `BusinessCannotInitiate` (HTTP 409, messaging).
    - Otherwise it runs `INSERT INTO "Conversation" (id, "buyerId", "businessId", "lastSeq", "createdAt") VALUES (…, 0, :now) ON CONFLICT ("buyerId", "businessId") DO NOTHING`, then selects the conversation id and inserts the two `"ConversationParticipant"` rows `ON CONFLICT DO NOTHING`.
  - **Eligibility by sender role** (review F-15), read inside the transaction:
    - **Buyer sends** (start path, or a reply as `role='buyer'`): `identity.requireMessagingEligibility(businessId)`.
      - `Approved` → `decision.outcome = 'allowed'`;
      - `Pending` → `'allowedWithNotice'` with `reasonCode = 'RecipientNotYetVerified'`;
      - any other status → that `identity` function itself throws `NotBusinessAccount` (HTTP 409, owner identity). `messaging` lets it propagate unchanged and adds the composed text to the response so the buyer can copy it (FR-MSG-6). Zero writes.
    - **Business replies** (`role='business'`): `identity.requireMessagingEligibility(senderId)`, the business's **own** status.
      - `Approved` or `Pending` → `decision.outcome = 'allowed'`, with no recipient notice;
      - `Rejected` → `NotBusinessAccount` propagated as above, because the thread is read-only for both sides (AD-MSG-2 rule 2).
    - `requireMessagingEligibility` is the throwing projection of `getMessagingEligibility`. It is added to `identity`'s offered ports, so the only code that constructs `NotBusinessAccount` lives in its owner (AD-SYS-1 rule 2; review F-02).
  - It allocates the sequence number with `UPDATE "Conversation" SET "lastSeq" = "lastSeq" + 1, "lastMessageAt" = :now WHERE id = :conversationId RETURNING "lastSeq"`. It then runs `SAVEPOINT send_insert` and inserts `"Message" { senderId, body, clientMessageId, seq: lastSeq, "recipientVerificationAtSend": status, at: now }`.
  - **Retry (review F-16):** when the insert fails with SQLSTATE `23505` on `UNIQUE ("conversationId", "senderId", "clientMessageId")`, the function runs `ROLLBACK TO SAVEPOINT send_insert` and then `ROLLBACK` of `tx`, which undoes the `lastSeq` increment. In a new read-only statement it selects the stored row by that key and returns `{ conversationId, messageId, seq }` of the original message. Net writes: zero. No statement runs inside an aborted transaction (`25P02` never occurs).
  - No `OutboxEvent` is enqueued.
- **Invariant (I):**
  - Exactly one `"Conversation"` exists per `("buyerId", "businessId")` (`UNIQUE`). Within a conversation, `seq` is unique and gapless from 1 to `"lastSeq"` (`UNIQUE ("conversationId", seq)`). One `clientMessageId` per sender and conversation produces exactly one `"Message"` row (bound to AD-MSG-2 rules 1, 3 and 4).
  - Eligibility is evaluated at send time, never at conversation start (bound to AD-MSG-2 rule 2).

#### Function: `findConversation(buyerId: CuidId, businessId: CuidId): Promise<{ conversationId: CuidId; lastSeq: number; lastMessageAt: Instant | null } | null>`

*Resolver. FR-MSG-4. Lets the 12.1 composer open the existing thread instead of starting a new one.*

- **Precondition (P):**
  - `buyerId` MUST equal `actorId`. `businessId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - Returns the `"Conversation"` row with `"buyerId"=:buyerId AND "businessId"=:businessId`.
  - **Missing data:** returns `null` when none exists. This is a silent result: no error and no row created.
  - Zero writes.
- **Invariant (I):**
  - A read never creates a conversation. Conversations are created only by the start path of `sendMessage` (bound to AD-MSG-2 rule 1).

---

## 10. COL — Collection, Binder & Wishlist Manager (`collections`)

#### Function: `assertCollectionOwner(collectionId: CuidId, actorId: CuidId): Promise<void>`

*Guard. FR-COL-1. Precedes every `collections.*` command and query that takes a `collectionId`.*

- **Precondition (P):**
  - `collectionId` MUST be a `CuidId`. `actorId` MUST be the session's `userId`.
- **Postcondition (Q):**
  - Runs `SELECT 1 FROM "Collection" WHERE id = :collectionId AND "ownerId" = :actorId`.
  - Returns `void` when one row exists.
  - Throws `CollectionNotFound` (HTTP 404, collections) otherwise. The body is identical for an unknown id and another user's collection.
  - Zero writes.
- **Invariant (I):**
  - A collection and its entries are read and changed only by `"Collection"."ownerId"` (bound to AD-COL-1, AD-SYS-8 rule 1).

#### Function: `acceptPrompt(promptId: CuidId, collectionId: CuidId, actorId: CuidId, now: Instant): Promise<{ promptId: CuidId; status: 'Accepted'; entryIds: CuidId[] }>`

*Contended mutation. FR-COL-7. NFR-COL-1 is the mandatory edge case: `OrderClosed` is delivered twice, then the prompt is accepted twice at once from two sessions.*

- **Precondition (P):**
  - `actorId` MUST equal `"PostPurchasePrompt"."buyerId"`.
  - `promptId` and `collectionId` MUST be `CuidId` values.
- **Postcondition (Q):**
  - The first statement of the transaction is `pg_advisory_xact_lock(hashtextextended('col:owner:' || :actorId, 0))`, lock-order position 1. It serializes this accept with every other write that assigns `"manualPosition"` in the owner's collections (`collections.addEntry`, `addExternal`, `copyEntry`, `moveEntry`, `create`), so "current maximum + 1" is never read by two transactions at once (review F-13).
  - Then, in the same transaction: `UPDATE "PostPurchasePrompt" SET status='Accepted', "resolvedAt"=:now, "acceptedIntoCollectionId"=:collectionId, version=version+1 WHERE id=:promptId AND "buyerId"=:actorId AND status='Pending' RETURNING lines, "orderId", "buyerItemReceivedConfirmedAt"`.
  - When 1 row is returned:
    - It runs `SELECT 1 FROM "Collection" WHERE id=:collectionId AND "ownerId"=:actorId FOR SHARE`. When no row exists, it throws `CollectionNotFound` (HTTP 404, collections) and `tx` rolls back, so the prompt stays `Pending`.
    - Otherwise it inserts one `"CollectionEntry"` per line, each with:
      - `"cardKind"='catalog'`, `"catalogEntryId"=line.itemRef`;
      - `source='PlatformPurchase'`, `"orderId"`, `qty=line.qty`;
      - `"acquiredAt"` = the `America/Bogota` calendar date of `"buyerItemReceivedConfirmedAt"`;
      - `"acquiredPriceCop"=line.unitPriceCop ?? NULL`;
      - `"manualPosition"` = the collection's current maximum + 1, + 2, ….
    - It returns `{ promptId, status: 'Accepted', entryIds }`.
  - When 0 rows are returned, it re-reads the prompt:
    - `status ∈ {'Accepted', 'Dismissed'}` with `"buyerId" = :actorId` → throws `PromptAlreadyResolved` (HTTP 409, collections), citing `{ status, resolvedAt }`;
    - unknown `promptId`, or `"buyerId" ≠ :actorId` → throws `PromptNotFound` (HTTP 404, collections). The body is identical in both cases, so another buyer's prompt state is never disclosed (GAP-1, adopted at the Phase 1 gate, decision log #6).
    - In every 0-row case, zero writes.
  - No `OutboxEvent` is enqueued, and `orders` tables are never read or written.
- **Invariant (I):**
  - At most one `"PostPurchasePrompt"` exists per `"orderId"` (`UNIQUE "orderId"`; the `OrderClosed` subscriber inserts `ON CONFLICT ("orderId") DO NOTHING`). A prompt leaves `Pending` at most once, so its entries are inserted at most once (bound to AD-COL-2, AD-SYS-5).
  - Every entry with `source='PlatformPurchase'` has a non-null `"orderId"` (`CHECK ((source='PlatformPurchase') = ("orderId" IS NOT NULL))`) (bound to AD-COL-1).

> **[GAP-1] — adopted (decision log #6).** Plan-2 defined only `PromptAlreadyResolved` for a 0-row accept (AD-COL-2 rule 3), and named no code for an unknown or foreign id. `PromptNotFound` (owner collections, `NOT_FOUND`, HTTP 404) is a new registry row, to be added to `shared-kernel/codes.ts` with an es-CO template and a triggering test (AD-SYS-1 rule 6).

#### Function: `getSetCompletion(collectionId: CuidId, setId: CuidId): Promise<{ setId: CuidId; ownedDistinct: number; cardEntryCount: number; completionPercent: number | null } | null>`

*Resolver. FR-COL-5. Renders the 9.1 completion bar.*

- **Precondition (P):**
  - `assertCollectionOwner(collectionId, actorId)` MUST have returned.
  - `setId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - Calls `catalog.getSetSummaries([setId])` once. It also calls `catalog.getEntries(ids)` over the collection's distinct `"catalogEntryId"` values, in chunks of 500, to read each entry's `setId` and `kind` (review F-12). `ownedDistinct` = the count of distinct `"catalogEntryId"` among the collection's `"cardKind"='catalog'` entries whose catalog entry belongs to `setId` and has `kind='card'`.
  - Returns `completionPercent = floor(ownedDistinct × 100 / cardEntryCount)`, an integer from 0 to 100.
  - **Missing data:**
    - `cardEntryCount = 0` → returns `completionPercent: null`;
    - `setId` unknown to `catalog` (`getSetSummaries` returns no row for it) → returns `null`.
    - Neither case throws.
  - Zero writes.
- **Invariant (I):**
  - Link-added entries (`"cardKind"='external'`) never count toward completion, and no placeholder `"CatalogEntry"` is ever created for them (bound to AD-7, AD-COL-1 rules 4–5).

---

## 11. VAL — Collection Valuation & Trend Engine (`collections`, no tables)

#### Function: `assertValuationPeriod(period: number): void`

*Guard. FR-VAL-2. Pure: no I/O.*

- **Precondition (P):**
  - `period` MUST be an integer. A non-integer is refused by the input parser as `RequestValidationFailed`.
- **Postcondition (Q):**
  - Returns `void` when `period ∈ {7, 30, 90, 365}`.
  - Throws `InvalidValuationPeriod` (HTTP 400, collections) otherwise. Citation: `{ rule: 'FR-VAL-2', inputs: { period } }`.
  - Zero writes and zero reads.
- **Invariant (I):**
  - The allowed periods are one constant set shared by `valuation.trend` and `valuation.history` (bound to AD-VAL-2 rule 1).

#### Function: `valueCollection(collectionId: CuidId, actorId: CuidId, now: Instant): Promise<Valuation>` *(concurrency-safe read)*

*Fills the contended slot (decision log #4). FR-VAL-1, FR-VAL-3. Concurrent writers are entry edits in `collections` and feed ingestion in `catalog`. The VAL mandatory edge case is rounding drift over a 500-entry collection.*

`Valuation = { totalCop: Cop; valuedCount: number; notValued: { entryId: CuidId; reasonCode: 'ExternalEntryNotInCatalog' | 'NoReferencePrice' }[]; staleCount: number; asOf: Instant; conversionDriftBoundCop: number }`

- **Precondition (P):**
  - `assertCollectionOwner(collectionId, actorId)` MUST have returned. Otherwise `CollectionNotFound` (HTTP 404, collections).
- **Postcondition (Q):**
  - Opens one `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`. Inside it, it reads the collection's `"CollectionEntry"` rows in one statement and calls `catalog.getReferencePricesAsOf(ids, asOf = now)` in chunks of 500 distinct catalog ids, with the same `now` for every chunk. The `catalog` query resolves its client through `db()` and therefore reads in this snapshot (AD-SYS-4 rule 9; GAP-2, adopted at the Phase 1 gate, decision log #6).
  - For each entry:
    - `"cardKind"='external'` → added to `notValued` with `ExternalEntryNotInCatalog`;
    - price `null` → added to `notValued` with `NoReferencePrice`;
    - otherwise its value is `cop × qty`, and it is counted in `staleCount` when `stale`.
  - `totalCop` is the exact `BigInt` sum of valued entries. `conversionDriftBoundCop = floor(Σ qty over entries with copDerivation='fxDerived' / 2)`, reported and never applied to `totalCop`.
  - When `totalCop > Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991), the DTO mapping throws `'Unexpected'` (HTTP 500) through `assertSafeInteger` instead of returning a rounded number (AD-SYS-7 rule 1; review E-20).
  - Zero writes. Nothing about the valuation is stored.
  - **Concurrency and repetition:**
    - Two calls with equal `now` against equal committed entries and observations return byte-identical `Valuation` objects.
    - An observation inserted with `observedAt > now` never affects the result.
    - An entry edit or an observation committed after the snapshot was taken affects no chunk of this call. Every chunk and the entry read see the same snapshot.
- **Invariant (I):**
  - `totalCop = Σ (cop_i × qty_i)` exactly over valued entries. No float, no listing price and no adjustment enters the sum (bound to AD-VAL-1 rules 2–5, AD-SYS-7).
  - The function's input type accepts only `ReferencePrice`, and passing a `Cop` listing price fails type-checking (bound to AD-VAL-1 rule 5, FR-VAL-5).

> **[GAP-2] — adopted (decision log #6).** Without it, an observation inserted by ingestion with `observedAt ≤ now` between two 500-id chunks would be seen by the entries of one chunk and not by those of the other. The `REPEATABLE READ` read-only transaction is the second sanctioned read-only exception to AD-SYS-4 rule 8, after AD-REP-2 rule 2.

#### Function: `changePercent(base: Cop, current: Cop): { hundredths: number } | null`

*Resolver. FR-VAL-2, ADD-§2.2. Pure. Used by `valuation.trend`.*

- **Precondition (P):**
  - `base` and `current` MUST be `Cop` values (integers ≥ 0).
- **Postcondition (Q):**
  - Returns `{ hundredths: sign(n) × floor((|n| × 2 + base) / (2 × base)) }`, where `n = (current − base) × 10000`, computed in `BigInt`. Rounding is half away from zero.
  - Test vectors:
    - (40000, 45000) → 1250;
    - (30000, 29999) → 0, never −0;
    - (3, 4) → 3333.
  - **Missing data:** `base = 0` → returns `null`. The caller attaches `ValuationNoBaseline`. No division is executed and nothing is thrown.
  - Zero I/O.
- **Invariant (I):**
  - No division by zero exists on any path. The result is symmetric under sign: `changePercent(b, b + d) = −changePercent(b, b − d)` whenever both are non-null (bound to AD-VAL-2 rule 3, AD-SYS-7 rule 4).

---

## 12. REP — Reviews, Reputation & Moderation Console (`reviews`)

#### Function: `assertVerifiedPurchaser(reviewerId: CuidId, targetUserId: CuidId, now: Instant): Promise<{ targetKind: 'business' | 'individual'; purchaseVerified: boolean }>`

*Guard. FR-REP-1, FR-REP-2. Runs before the `"Review"` insert in `reputation.write`. NFR-REP-1 covers its part of the REP mandatory edge case: a review submitted while the order is paid but not closed.*

- **Precondition (P):**
  - `reviewerId` MUST equal `actorId`, and `requireCanBuy` MUST have passed.
  - `targetUserId` MUST be a `CuidId`.
- **Postcondition (Q):**
  - When `reviewerId = targetUserId`, it throws `TargetNotFound` (HTTP 404, reviews) before any read. User input never reaches `CHECK ("reviewerId" <> "targetUserId")`.
  - It calls `identity.getReviewTarget(targetUserId)`. A business whose status is not `Approved`, or an individual with `"sellerTrack" ≠ 'individual'`, throws `TargetNotFound` (HTTP 404, reviews).
  - For a business target it calls `orders.hasClosedPurchase(reviewerId, targetUserId)`:
    - `closed = false` → throws `NotVerifiedPurchaser` (HTTP 409, reviews), citing `{ latestState }`. A `Paid` or `PaymentConfirmed` order is named, so "paid is not enough" is explained;
    - `closed = true` → returns `{ targetKind: 'business', purchaseVerified: true }`.
  - For an individual target it returns `{ targetKind: 'individual', purchaseVerified: false }` without calling `orders`.
  - Zero writes.
- **Invariant (I):**
  - A `"Review"` of a business has `"purchaseVerified" = true` and exists only if an order between the pair has `"buyerItemReceivedConfirmedAt" IS NOT NULL` at write time (bound to AD-2, AD-REP-1 rule 2).

#### Function: `hideReview(reviewId: CuidId, reasonCode: 'Harassment' | 'PersonalData' | 'Spam' | 'OffTopic' | 'Other', note: string | null, adminId: CuidId, now: Instant): Promise<Decision>`

*Contended mutation. FR-REP-4. Contenders: two admins hiding at once, a double click, and the REP mandatory edge case (a hide at the same moment as another review's post).*

- **Precondition (P):**
  - `adminId` MUST equal `actorId` with `isAdmin = true`. Otherwise `adminProcedure` throws `AdminOnly` (HTTP 403, identity).
  - `reviewId` MUST be a `CuidId`.
  - `note` MUST be 10–500 characters when `reasonCode = 'Other'`, and `null` or 0–500 characters otherwise.
- **Postcondition (Q):**
  - Runs `UPDATE "Review" SET "hiddenAt"=:now, "hiddenReason"=:reasonCode, "hiddenBy"=:adminId, version=version+1 WHERE id=:reviewId AND "hiddenAt" IS NULL RETURNING rating, text`.
  - When 1 row is returned, the same transaction inserts one `"ReviewModerationLog" { reviewId, action: 'hide', reasonCode, note, adminId, ratingSnapshot: rating, textSnapshot: text, at: now }`. It returns `Decision { outcome: 'hidden', reasonCode, citations: [{ rule: 'FR-REP-4', inputs: { reviewId } }] }`.
  - When 0 rows are returned, it re-reads the review:
    - unknown id → throws `ReviewNotFound` (HTTP 404, reviews);
    - already hidden → returns `Decision { outcome: 'allowedWithNotice', reasonCode: <existing hiddenReason>, citations: [{ rule: 'FR-REP-4', inputs: { hiddenAt, hiddenBy } }] }` with zero writes.
  - No `OutboxEvent` is enqueued.
- **Invariant (I):**
  - A `"Review"` row is never deleted: the application role has `DELETE` revoked (bound to AD-12, AD-REP-2 rule 3).
  - Each change of `"hiddenAt"` from `NULL` to non-null writes exactly one `"ReviewModerationLog"` row, and a no-op writes none (bound to AD-REP-3 rule 1).

#### Function: `getAggregates(sellerIds: CuidId[]): Promise<{ sellerId: CuidId; averageTenths: number | null; count: number }[]>`

*Resolver. FR-REP-3. Composed in the 2.2 and 3.1 RSC pages.*

- **Precondition (P):**
  - `sellerIds` MUST contain 1–500 distinct `CuidId` values. Duplicates are refused by the input parser as `RequestValidationFailed` (review E-22).
- **Postcondition (Q):**
  - Runs one statement over `"Review" WHERE "hiddenAt" IS NULL AND "targetUserId" = ANY(:sellerIds)` that returns `count` and `sum(rating)` per target.
  - `averageTenths = floor((20 × sum + count) / (2 × count))` in `BigInt`. For example, sum 51 and count 12 give 43, which renders "4,3".
  - Returns exactly one element per input id, in input order.
  - **Missing data:** a seller with no visible review returns `{ sellerId, averageTenths: null, count: 0 }`. The element is present and renders the FR-REP-3 "No reviews yet" state (copy owned by `microcopy-es-CO.md`), never 0.0. No error is thrown.
  - Zero writes.
- **Invariant (I):**
  - A hidden review never contributes to `count` or `sum` (bound to AD-12, AD-REP-2 rule 1).
  - On the profile page, the aggregate and the first review page are read in one `REPEATABLE READ` read-only transaction, so the list and the average never disagree (bound to AD-REP-2 rule 2).

---

## 13. Invariant index

| Invariant (short) | AD | Contract(s) | Physical or structural enforcement |
|---|---|---|---|
| Seller tracks exclusive | AD-IDN-2, AD-18 | `claimSellerTrack` | Conditional `UPDATE "User"."sellerTrack"`; `CHECK sellerTrack IN (…)` |
| Capabilities derived server-side | AD-IDN-1, AD-16 | `requireListingEligibility`, `getSellerVerification`, `assertCatalogAdmin` | One `deriveCapabilities` pure function |
| One terminal decision per application | AD-VER-1 | `decideApplication` | `WHERE status='Pending'`; `CHECK (status='Pending') = (decidedAt IS NULL)`; `UNIQUE ApplicationDecisionLog.applicationId` |
| One pending application per business | AD-VER-3 | `assertCanSubmitApplication` | Partial unique `(businessId) WHERE status='Pending'` |
| One running feed run | AD-CAT-1 | `startFeedRun` | Partial unique `((true)) WHERE status='Running'` |
| Catalog identity stable | AD-CAT-1 r5, AD-7 | `upsertCatalogEntry` | `UNIQUE externalKey`, `ON CONFLICT … DO UPDATE` keeps `id` |
| Prices served verbatim | AD-CAT-2 | `getReferencePriceAsOf` | Append-only observations; `UNIQUE (catalogEntryId, source, observedAt)` |
| One query path, hidden never shown | AD-5, AD-12, AD-DSC-1 | `search`, `getCardDetail` | One SQL builder; default predicate |
| No oversell | AD-6, AD-INV-2 | `reserveForPurchase` | `CHECK (quantity >= 0)`; conditional decrement |
| Ownership from session | AD-SYS-8 r1 | every guard | Builder resolves `actorId` |
| Business sees order only after paid | AD-15, AD-ORD-3 | `assertOrderVisible` | One visibility predicate |
| Facts set once, paid never expires | AD-2, AD-ORD-2 | `confirmPaid` | `IS NULL` predicates; fact-order and terminal CHECKs |
| One deduction per order | AD-COM-2, AD-SYS-3 | `applyOrderDeduction` | Partial unique `(orderId) WHERE kind='Deduction'` |
| Ledger reconciles exactly | AD-COM-1 | `applyOrderDeduction` | `UNIQUE (businessId, seq)`; atomic `UPDATE … RETURNING` |
| One open offer per proposer and listing | AD-TRD-1 | `findOpenOffer` | Partial unique `(listingId, proposerId) WHERE status='Open'` |
| One accept per last unit | AD-TRD-2 | `acceptOffer` | `trd:seller` advisory lock + conditional updates |
| One conversation per pair, idempotent send | AD-MSG-2 | `sendMessage`, `findConversation` | `UNIQUE (buyerId, businessId)`; `UNIQUE (conversationId, seq)`; `UNIQUE (conversationId, senderId, clientMessageId)` |
| One prompt per order, entries once | AD-COL-2 | `acceptPrompt` | `UNIQUE PostPurchasePrompt.orderId`; `WHERE status='Pending'` |
| Tagged-union entries | AD-COL-1, AD-7 | `acceptPrompt`, `getSetCompletion` | CHECK on `cardKind` / `source` |
| Exact BigInt valuation, no zero division | AD-VAL-1, AD-VAL-2, AD-SYS-7 | `valueCollection`, `changePercent` | Pure functions + type brands |
| Business reviews need a closed purchase | AD-2, AD-REP-1 | `assertVerifiedPurchaser` | `hasClosedPurchase` read |
| Hide, never delete | AD-12, AD-REP-3 | `hideReview`, `getAggregates` | `DELETE` revoked; `WHERE "hiddenAt" IS NULL` |

## 14. Gaps found while deriving the contracts

| Gap | Where | Proposal | State |
|---|---|---|---|
| GAP-1 | `acceptPrompt` | New code `PromptNotFound` (collections, HTTP 404) for unknown or foreign prompt ids | Adopted, Phase 1 gate (#6) |
| GAP-2 | `valueCollection` | Run entry read and all price chunks in one `REPEATABLE READ` read-only transaction | Adopted, Phase 1 gate (#6) |
| GAP-3 | `sendMessage` | Fix `clientMessageId` as 1–64 characters of `[A-Za-z0-9_-]` (the browser generates a cuid2) | Adopted, Phase 1 gate (#6) |
| GAP-4 | `upsertCatalogEntry` | New feed quarantine reason `KindChanged` (ADD-§8.1 extension) for a row whose `kind` differs from the stored entry | Open, routed to the Phase 2 gate |

## 15. Port and registry additions these contracts require

| Addition | Owner | Introduced by |
|---|---|---|
| `identity.requireAdmin(actorId)` — throws `AdminOnly`; called only from `src/server/trpc/admin-guard.ts` | identity | review F-01, E-23 |
| `identity.requireMessagingEligibility(userId)` — throwing projection of `getMessagingEligibility` | identity | review F-02 |
| DomainError `PromptNotFound` (`NOT_FOUND`) | collections | GAP-1 |
| Better Auth `advanced.database.generateId` bound to cuid2 | identity | review F-04 |
