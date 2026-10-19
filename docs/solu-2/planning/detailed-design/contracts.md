---
title: "TEZG Solu-2 — Behavioral Contracts: 37 core operations, error catalog, invariant bindings, supporting contracts"
status: final — Phase 1 gate passed 2026-10-18 (decision log Solu-2 #7–#8)
created: 2026-10-18
phase: "Solu-2 Phase 1"
persona: "Winston (bmad-agent-architect)"
directed_by: "Mateo Rubio (Architect-lead)"
inputs:
  - docs/plan-2/planning/ARCHITECTURE.md
  - docs/solu-2/planning/ARCHITECTURE.md (refinements R-1..R-9)
  - docs/plan-2/planning/prd.md
  - docs/plan-2/planning/addendum.md
  - docs/solu-1/planning/contracts.md (the 17 operations both packages share)
  - docs/solu-2/reviews/review-arch-implementability.md (G-01..G-17)
---

# Behavioral Contracts — TEZG, all 12 modules

## 0. How to read this document

**Scope.** The 37 core operations of Annex A, in the full Solu-2 template (§1–§12). Then:
- the Typed Error Catalog (§13);
- the Invariant Binding Table, with one row for every AD (§14);
- supporting contracts for the 38 FRs the core operations do not bind (§15).

Together they trace all 96 PRD FRs (decision log Solu-2 #3).

**Seventeen operations already have a Solu-1 contract.** For those, this document restates the clauses in the Solu-2 template and adds what Solu-2 requires: the explanation clause, the audit clause, the time and latency clauses, and the gap resolutions G-01..G-17. Where a Solu-1 clause carried a review id, the id is kept (for example "review F-16"), so the reasoning can still be traced. Nothing below weakens a Solu-1 clause.

### 0.1 Notation

| Term | Definition |
|---|---|
| `CuidId` | `string` matching `^[a-z][0-9a-z]{23}$` (cuid2, length 24), issued only by `IdGenerator`. Every primary key, including Better Auth's `"User".id` (Solu-1 review F-04) |
| `Instant` | A UTC instant read **once per transaction** from `Clock.now()` and passed to SQL as a parameter (AD-SYS-6 rules 1–2). It crosses the wire as an ISO-8601 UTC string |
| `Tx` | An open PostgreSQL transaction, READ COMMITTED (AD-SYS-4 rule 8). A function taking `tx` never opens or commits one (AD-SYS-4 rule 1) |
| `Cop` | An integer number of pesos, `0 ≤ n ≤ 9,007,199,254,740,991`, stored as `bigint` (AD-SYS-7). `SignedCop` allows negatives (commission balances) |
| `actorId` | The `userId` that the procedure builder resolves from the session. It is never an input field (AD-SYS-8 rule 1, AD-16) |
| "zero writes" | No `INSERT`, `UPDATE` or `DELETE` on any table, no `OutboxEvent`, and no `audit_events` row |
| "rolls back" | The transaction aborts, and every row, outbox event and audit row it wrote disappears (AD-SYS-2 rule 1) |
| `audit(action, aggregate, decision?)` | One `AuditLog.record(tx, entry)` call in the writer's transaction (refinement R-2). `entry = { actorId \| null, actorKind: 'user' \| 'admin' \| 'system', module, action, aggregateType, aggregateId, decisionCode \| null, data }`. `data` holds ids and non-regulated values only; the AD-SYS-8 redactor runs over it |

### 0.2 Operation map (review G-06)

**Layer** follows the statement:
- **Inbound Port**: an application-service method reached from a tRPC procedure, a subscriber or a job;
- **Core Domain**: a pure function with no I/O;
- **Outbound Port**: a method another module calls through its `ports/` interface.

**Kind:** R = raced, repeated or interrupted mutation; E = explainable decision; MEC = the mandatory edge case.

| # | Module | Operation | Kind | Realized as | Layer | Solu-1 basis |
|---|---|---|---|---|---|---|
| IDN-1 | IDN | `claimSellerTrack` | R, MEC | first write of `access.completeIndividualProfile` and `verification.submit` | Outbound Port (identity-internal, called in the caller's `tx`) | `claimSellerTrack` |
| IDN-2 | IDN | `requireListingEligibility` | E | `identity.getListingEligibility`, throwing projection | Outbound Port | `requireListingEligibility` |
| IDN-3 | IDN | `traceCapabilities` | E | `access.traceCapabilities` (admin) | Inbound Port | — |
| VER-1 | VER | `decideApplication` | R, MEC | `verification.approve` / `verification.reject` | Inbound Port | `decideApplication` |
| VER-2 | VER | `submitApplication` | R, E | `verification.submit` | Inbound Port | `assertCanSubmitApplication` (its guard) |
| VER-3 | VER | `getApplicationForReview` | E (audited) | `verification.getApplicationForReview` | Inbound Port | — |
| CAT-1 | CAT | `startFeedRun` | R | `catalog.feed.start` | Inbound Port | `startFeedRun` |
| CAT-2 | CAT | `upsertCatalogEntry` | R, MEC | one row of a `catalog.feed.continue` batch | Inbound Port (batch step) | `upsertCatalogEntry` |
| CAT-3 | CAT | `getPriceProvenance` | E | `catalog.provenance`; `catalog.getPriceProvenance` port | Inbound + Outbound Port | `getReferencePriceAsOf` (its per-entry read) |
| DSC-1 | DSC | `search` | E, repeat-safe | `discovery.search` (`view=listings`) | Inbound Port | `search` |
| DSC-2 | DSC | `getCardDetail` | MEC | `discovery.cardDetail` | Inbound Port | `getCardDetail` |
| DSC-3 | DSC | `assertSearchArea` | E | pure guard used by DSC-1, DSC-2 and INV's wishlist port | Core Domain | `assertSearchArea` |
| INV-1 | INV | `reserveForPurchase` | R, MEC | `listings.reserveForPurchase(tx, …)` port | Outbound Port | `reserveForPurchase` |
| INV-2 | INV | `createListing` | E | `inventory.create` | Inbound Port | — |
| INV-3 | INV | `applyCommissionProjection` | R | subscribers `onCommissionBalanceExhausted` / `Replenished` | Inbound Port (subscriber) | — |
| ORD-1 | ORD | `createOrder` | R | `orders.create` | Inbound Port | — |
| ORD-2 | ORD | `confirmPaid` | R, E | `orders.confirmPaid` | Inbound Port | `confirmPaid` |
| ORD-3 | ORD | `confirmPaymentReceived` | MEC | `orders.confirmPaymentReceived` | Inbound Port | — |
| ORD-4 | ORD | `confirmItemReceived` | MEC | `orders.confirmItemReceived` | Inbound Port | — |
| COM-1 | COM | `applyOrderDeduction` | R, MEC | subscribers `onOrderPaymentConfirmedByBusiness` / `onOrderClosed` | Inbound Port (subscriber) | `applyOrderDeduction` |
| COM-2 | COM | `confirmTopUp` | R | `commission.admin.confirmTopUp` (`TopUpConfirmationPort` V1 adapter) | Inbound Port | — |
| COM-3 | COM | `reconcile` | E | `commission.reconcile`; the `commission-reconcile` job | Inbound Port | — |
| TRD-1 | TRD | `acceptOffer` | R, MEC | `trading.accept` | Inbound Port | `acceptOffer` |
| TRD-2 | TRD | `counterOffer` | R, E | `trading.counter` | Inbound Port | — |
| TRD-3 | TRD | `cancelTrade` | R | `trading.cancel` (Accepted → Cancelled). `trading.withdraw` is a supporting contract (§15) | Inbound Port | — |
| MSG-1 | MSG | `sendMessage` | R | `messaging.send` | Inbound Port | `sendMessage` |
| MSG-2 | MSG | `generateContactMessage` | E, MEC | `inventory.contact`; `listings.generateContactMessage` port (trading) | Inbound + Outbound Port | — |
| MSG-3 | MSG | `requireMessagingEligibility` | E, MEC | `identity.requireMessagingEligibility` port | Outbound Port | used inside `sendMessage` |
| COL-1 | COL | `acceptPrompt` | R, MEC | `collections.prompts.accept` | Inbound Port | `acceptPrompt` |
| COL-2 | COL | `onOrderClosed` | R | subscriber `collections.onOrderClosed` | Inbound Port (subscriber) | — |
| COL-3 | COL | `addEntry` | E | `collections.addEntry` | Inbound Port | — |
| VAL-1 | VAL | `valueCollection` | MEC | `valuation.current` | Inbound Port | `valueCollection` |
| VAL-2 | VAL | `valuationTrend` | E | `valuation.trend` | Inbound Port | `changePercent` (its formula) |
| VAL-3 | VAL | `valuationHistory` | E | `valuation.history` | Inbound Port | — |
| REP-1 | REP | `writeReview` | R, E | `reputation.write` | Inbound Port | `assertVerifiedPurchaser` (its guard) |
| REP-2 | REP | `hideReview` | R | `reputation.admin.hide` | Inbound Port | `hideReview` |
| REP-3 | REP | `getAggregates` | MEC | `reviews.getAggregates` port (RSC composition) | Outbound Port | `getAggregates` |

DSC and VAL own no tables. Their "R" coverage is a concurrency-safe, repeat-safe read (Annex A note; Solu-1 #4).

### 0.3 Conventions every clause relies on

- **Typed errors.** A typed error is written `Code` (HTTP *n*, owner *module*). The status is the tRPC 11 status of the code's AD-SYS-1 family: UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, BAD_REQUEST 400, CONFLICT 409, TOO_MANY_REQUESTS 429. `'Unexpected'` is HTTP 500 and is never a registry code. A code raised by a non-owner is propagated unchanged (AD-11).
- **Shape validation precedes every contract.** The procedure's zod schema refuses a wrong type, length, enum or format as `RequestValidationFailed` (HTTP 400, owner shared-kernel), with `issues: { field, issue }[]`, before the body runs (AD-SYS-1 rule 7). Preconditions that state types are therefore guaranteed by the parser. An internal caller that bypasses the parser and violates one gets `'Unexpected'`.
- **Error body (R-9, review G-03).** Every refusal returns `{ error: ErrorBody }` with `ErrorBody = { code, httpStatus, decision: ExplanationDTO, issues? }`. `ExplanationDTO` is the AD-SYS-1 `Decision`, with `occurredAt` in ISO-8601. For `*NotVisibleToCaller` and `*NotFound` codes, two bodies differ only in `occurredAt` (S-2).
- **Explanation (Q4; review G-16).** Every `Decision`, whether on a refusal or on a successful result, has `citations.length ≥ 1`. `citations[0].rule` matches `^(AD|FR|NFR)-[A-Z0-9-]+( rule \d+)?$`, and `citations[0].inputs` holds the observed values that decided the outcome, never a regulated value (AD-SYS-8 rule 4). A decision about an order has `citations[0].inputs.orderId` (AD-SYS-1 rule 4). The Phase 3 fixture `explain_assert` checks exactly this.
- **Events (R-1, review G-01).** "Enqueues `E{…}`" means `outbox.enqueue(tx, …)` in the same transaction. The row's envelope is `{ eventId = OutboxEvent.id, type, occurredAt = the transaction's Instant, schemaVersion = 1, payload }`, the payload is exactly ADD-§5, and one `pending` `EventDelivery` is written per registered subscriber (AD-SYS-2 rules 1 and 3).
- **Time.** "Time: `Clock`, once" means one `now: Instant` read at the start of the transaction from the injected `Clock`. Every comparison uses that value. Interval boundaries are stated per contract, as half-open `[from, to)` unless written otherwise.
- **Latency (review G-11).** The budget is the module NFR where one exists, otherwise NFR-SYS-9 (interactive read p95 ≤ 1,000 ms; command p95 ≤ 800 ms). It is measured at **N = 1** under the PRD §7 protocol: Docker Postgres, the §3 seed, 50 warm-up and 500 measured calls, server-side handler time. Concurrency correctness is a separate proof (NFR-SYS-10: 50 connections × 100 repetitions), stated in the concurrency clause. No contract invents a number that the PRD does not state.
- **Test ids.** `[IDN-1.P1]`, `[IDN-1.Q2]`, `[IDN-1.I1]` and `[IDN-1.MEC]` name the Phase 3 ATDD tests in `docs/solu-2/test/atdd/<module>_contracts.test.ts` that prove a clause. Each test turns red if its clause is removed from the implementation. §14 indexes them by AD.

---

## 1. IDN — User, Role & Seller-Type Access Manager (`identity`)

### Operation: `claimSellerTrack(tx: Tx, userId: CuidId, track: 'individual' | 'business'): Promise<{ claimed: 'individual' | 'business' }>`

*IDN-1 · R, MEC · FR-IDN-2, FR-IDN-4, FR-VER-1 rule 1 · NFR-IDN-2. The first write of `access.completeIndividualProfile` (`'individual'`) and of `verification.submit` (`'business'`).*

- **Layer:** Outbound Port (identity-internal; joins the caller's `tx`).
- **Precondition (P):**
  - P1 `tx` is open, and this call is its first row-locking statement. The `"User"` row is lock-order position 2 (AD-SYS-4 rule 5). Violation: a programming error, `'Unexpected'` (HTTP 500).
  - P2 `userId = actorId` and the `"User"` row exists (the session guarantees it). Violation: `'Unexpected'`.
  - P3 `track ∈ {'individual', 'business'}`. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel), raised at the procedure's parser.
- **Postcondition (Q):**
  - Q1 Returns `{ claimed: track }` when the conditional update returns 1 row:
    - `'individual'`: `UPDATE "User" SET "sellerTrack"='individual', "updatedAt"=:now WHERE id=:userId AND "sellerTrack" IS NULL RETURNING id`;
    - `'business'`: the same with `"sellerTrack" IS DISTINCT FROM 'individual'`.
  - Q2 After success, `"sellerTrack" = track`, and the caller inserts `"IndividualSellerProfile"` (individual), or applies VER-2's steps (business), in the same `tx`.
  - Q3 Audit: `audit('identity.sellerTrack.claimed', User:userId)` in `tx`. No event.
  - Q4 On a refusal, the decision cites `{ rule: 'AD-IDN-2 rule 3', inputs: { sellerTrack, latestApplicationStatus } }`.
  - Q-fail On 0 rows, the function re-reads in `tx` and throws:
    - `'individual'` with `"sellerTrack"='business'` → `AlreadyVerifiedBusiness` (HTTP 409, identity) if the latest application is `Approved`, else `BusinessApplicationOnFile` (HTTP 409, identity);
    - `'individual'` with `"sellerTrack"='individual'` → `IndividualSellerProfileAlreadyComplete` (HTTP 409, identity);
    - `'business'` → `IndividualSellerProfileAlreadyComplete` (HTTP 409, identity).

    The caller's `tx` rolls back: `"sellerTrack"` keeps its value, and no profile, application or audit row exists from this call.
- **Invariant (I):**
  - I1 No `"User"` row has `"sellerTrack"='individual'` while a `"BusinessApplication"` exists for that user. Bound to: AD-IDN-2, AD-18.
  - I2 `"sellerTrack"` is never set back to `NULL`, and never changes between the two values. Bound to: AD-IDN-2 rule 4; `CHECK ("sellerTrack" IN ('individual','business'))`, plus the two `WHERE` predicates and the composite FKs `("userId", 'individual')` / `("businessId", 'business')` → `"User"(id, "sellerTrack")`.
- **Concurrency / idempotency:** two concurrent claims with different tracks serialize on the row lock, and exactly one returns 1 row (NFR-IDN-2: 100 repetitions on a fresh account, two connections behind a barrier, both-succeeded = 0 and neither-succeeded = 0). A repeated identical claim after success is refused (Q-fail) with zero writes.
- **Time:** `Clock`, once, for `"updatedAt"`. No time-based rule.
- **Latency budget (NFR):** inside a command with p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `requireListingEligibility(userId: CuidId): Promise<{ listingKind: 'business' | 'individual'; verified: boolean; decision: Decision }>`

*IDN-2 · E · FR-IDN-3, FR-IDN-1. Called by `listings` before `inventory.create`, `createBundle` and `reactivate`.*

- **Layer:** Outbound Port.
- **Precondition (P):**
  - P1 `userId = actorId`, and the `"User"` row exists. Violation: `'Unexpected'`.
- **Postcondition (Q):**
  - Q1 One SQL statement loads `"sellerTrack"` and the latest `"BusinessApplication"` by `("submittedAt" DESC, id DESC)`, and projects them through `deriveCapabilities(facts)` (AD-IDN-1 rules 1–2). It returns:
    - `{ listingKind: 'individual', verified: false }` when `"sellerTrack"='individual'`;
    - `{ listingKind: 'business', verified: status = 'Approved' }` when `"sellerTrack"='business'` and the latest `status ∈ {Pending, Approved}`.
  - Q2 Zero writes, on success or failure.
  - Q3 No audit row; only `traceCapabilities` audits (AD-IDN-1 rule 5).
  - Q4 `decision.outcome = 'allowed'`, or `'allowedWithNotice'` with `reasonCode = 'ListingUnverified'` for a `Pending` business. Citation `{ rule: 'FR-IDN-3', inputs: { sellerKind, latestApplicationStatus } }`.
  - Q-fail
    - `"sellerTrack"='business'` with latest `Rejected` → `SellerNotVerified` (HTTP 409, identity), citing `{ applicationId, reapplyNotBefore, barred }`.
    - `"sellerTrack" IS NULL` → `IndividualSellerProfileIncomplete` (HTTP 409, identity), citing `{ sellerKind: 'none' }`.
    - `"sellerTrack"='business'` with no application → `'Unexpected'`. This state is unreachable while IDN-1 I1 holds, so the guard fails closed (Solu-1 review F-19).
- **Invariant (I):**
  - I1 `sellerKind` is a pure function of `"sellerTrack"`. No input field and no cache contributes. Bound to: AD-IDN-1, AD-16.
  - I2 For one fact set, exactly one of {allowed, `SellerNotVerified`, `IndividualSellerProfileIncomplete`} results. Bound to: AD-IDN-1 rule 6.
- **Concurrency / idempotency:** a pure read with no lock; repeated calls on equal facts give equal results. A status change is visible on the next call (AD-IDN-1 rule 4).
- **Time:** none. Eligibility does not depend on time.
- **Latency budget (NFR):** p95 ≤ 50 ms at N = 1 (NFR-IDN-1).

### Operation: `traceCapabilities(targetUserId: CuidId, adminId: CuidId, now: Instant): Promise<CapabilityTraceDTO>`

*IDN-3 · E (audited) · FR-IDN-5, FR-IDN-1 · NFR-SYS-8. `access.traceCapabilities`, page 1.3.*

`CapabilityTraceDTO = { targetUserId; sellerKind: 'business' | 'individual' | 'none'; capabilities: { name: CapabilityName; value: boolean; derivedFrom: { fact: string; value: string | boolean | null; at: Instant | null }[] }[] }`, where `CapabilityName ∈ {canBuy, canListAsIndividual, canListAsBusiness, isVerifiedBusiness, canReceiveInAppMessages, canModerate}`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The caller is an admin. Otherwise `adminProcedure` refuses with `AdminOnly` (HTTP 403, identity) before the call, with zero writes.
  - P2 A `"User"` row with `id = :targetUserId` exists. Violation: `AccountNotFound` (HTTP 404, identity), new code, contract gap C-GAP-1 (§16). The body is identical for any unknown id, and zero writes.
- **Postcondition (Q):**
  - Q1 Returns one element per `CapabilityName`, in that fixed order. Each element's `derivedFrom` names at least one fact: `emailVerified`, `signupConsentAt`, `sellerTrack`, `latestApplication.status` / `decidedAt` / `reapplyNotBefore`, or `isAdmin`. All of it comes from **one** `deriveCapabilities(facts)` output (AD-IDN-1 rule 2).
  - Q2 The same transaction inserts one `"CapabilityAuditRead" { id, adminId, targetUserId, createdAt: now }`.
  - Q3 Audit: `audit('identity.capabilities.traced', User:targetUserId)`, `actorKind='admin'`. No event.
  - Q4 Each capability renders as one es-CO line built from its `derivedFrom`. The trace's decision cites `{ rule: 'FR-IDN-5', inputs: { targetUserId, capabilityCount: 6 } }`.
  - Q-fail On refusal, no `CapabilityAuditRead` and no `audit_events` row exist.
- **Invariant (I):**
  - I1 The trace never selects a `"BusinessApplicationLegalIdentity"` column. Bound to: AD-VER-2 rule 1, AD-13 (lint `tezg/legal-identity-confined`).
  - I2 Every successful trace has exactly one `CapabilityAuditRead` row. Bound to: AD-IDN-1 rule 5, AD-SYS-8 rule 10.
  - I3 For each capability, the trace's `value` equals `getCapabilities(targetUserId)` on the same facts. Bound to: AD-IDN-1 rule 2.
- **Concurrency / idempotency:** not idempotent by design: N calls write N audit rows, because every read is audited. There is no contended state.
- **Time:** `Clock`, once (`now` for the audit rows). The fact timestamps are stored instants, returned as they are.
- **Latency budget (NFR):** interactive read p95 ≤ 1,000 ms at N = 1 (NFR-SYS-9).

---

## 2. VER — Business Verification Workflow (`identity`)

### Operation: `decideApplication(applicationId: CuidId, decision: { kind: 'approve' } | { kind: 'reject'; reasonCode: string; note: string | null }, adminId: CuidId, now: Instant): Promise<{ applicationId; status: 'Approved' | 'Rejected'; decidedAt: Instant; decidedBy: CuidId; decision: Decision }>`

*VER-1 · R, MEC · FR-VER-3, FR-VER-4 · NFR-VER-1. `verification.approve` / `verification.reject`.*

- **Layer:** Inbound Port.
- **Precondition (P), first-fail in this order** (Solu-1 review F-20):
  - P1 The caller is an admin. Violation: `AdminOnly` (HTTP 403, identity), raised by `adminProcedure`.
  - P2 The application exists. Violation: `ApplicationNotFound` (HTTP 404, identity).
  - P3 `status = 'Pending'`. Violation: `ApplicationNotPending` (HTTP 409, identity), citing `{ status, decidedBy, decidedAt }`.
  - P4 For a reject: `SELECT … FROM "RejectionReason" WHERE code=:reasonCode AND active FOR SHARE` returns a row. Violation: `RejectionReasonUnknown` (HTTP 409, identity). `note` is 0–500 characters (parser).
- **Postcondition (Q):**
  - Q1 Returns `{ applicationId, status, decidedAt: now, decidedBy: adminId, decision }`.
  - Q2 `UPDATE "BusinessApplication" SET status=:to, "decidedBy", "decidedAt"=:now, "updatedAt"=:now, version=version+1 [, "rejectionReasonCode", "rejectionNote", "reapplyNotBefore" = :now + cooldownDays × 1 day | "reapplyBarred"=true] WHERE id=:applicationId AND status='Pending'` returns 1 row. The policy is copied onto the application (AD-VER-1 rule 5).
  - Q3 In the same transaction:
    - one `"ApplicationDecisionLog"` row;
    - `audit('verification.application.decided', BusinessApplication:id, decisionCode)`;
    - exactly one event: `BusinessApplicationApproved { applicationId, businessId, businessName, approvedAt, approvedBy }` (subscribers `commission`, `listings`), or `BusinessApplicationRejected { applicationId, businessId, reasonCode, reapplyNotBefore | barred, rejectedAt }` (subscriber `listings`).
  - Q4 The decision cites `{ rule: 'FR-VER-3' | 'FR-VER-4', inputs: { applicationId, reasonCode?, reapplyNotBefore?, barred? } }`.
  - Q-fail On 0 rows (the race loser), the function re-reads and throws `ApplicationNotPending`, citing the winner's `{ status, decidedBy, decidedAt }`. No log row, audit row or event is written. A repeat after success behaves the same.
- **Invariant (I):**
  - I1 At most one transition out of `Pending` per application. Bound to: AD-VER-1, AD-SYS-5; `CHECK ((status='Pending') = ("decidedAt" IS NULL))` and `UNIQUE "ApplicationDecisionLog"("applicationId")`.
  - I2 The number of application events equals the number of decided transitions (0 or 1). Bound to: AD-VER-1 rule 4, AD-SYS-2 rule 1.
  - I3 A `Rejected` row always has its policy snapshot. Bound to: AD-VER-1 rule 5; `CHECK status<>'Rejected' OR ("rejectionReasonCode" IS NOT NULL AND ("reapplyBarred" OR "reapplyNotBefore" IS NOT NULL))`.
- **Concurrency / idempotency:** approve and reject racing on one `Pending` application → exactly one terminal transition, one event of the winner's type, and the loser gets `ApplicationNotPending` naming the winner (NFR-VER-1, 100 repetitions). The share lock on the reason blocks a concurrent deactivation until commit (AD-VER-1 rule 1).
- **Time:** `Clock`, once. `reapplyNotBefore = now + cooldownDays × 86,400 s`, compared half-open by VER-2.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `submitApplication(input: SubmitApplicationInput, businessId: CuidId, now: Instant): Promise<{ applicationId: CuidId; status: 'Pending'; submittedAt: Instant; decision: Decision }>`

*VER-2 · R, E · FR-VER-1, FR-VER-6, FR-IDN-4. `verification.submit`.*

`SubmitApplicationInput = { businessName: string (2–80); legalIdentity: { type: 'NIT' | 'CC'; number: string }; documentUploadKeys: string[] (1–3); externalPresenceUrl: string (https, ≤ 2048); city: string (2–60); paymentInstructions: { bankName; accountType: 'savings' | 'checking'; accountNumber: string (6–20 digits); holderName; qrUploadKey: string | null }; consentAccepted: true; consentVersion: string }`

- **Layer:** Inbound Port.
- **Precondition (P).** P1–P2 are the field-level shape stage and report every issue at once. P3 onward are first-fail.
  - P1 Every required field is present. Violation: `MissingRequiredField` (HTTP 400, identity), naming every missing field.
  - P2 Every field is well-formed:
    - lengths and URL as above;
    - a CC `number` has 6–10 digits;
    - a NIT has a 6–10 digit base plus a DIAN mod-11 check digit (ADD-§2.5);
    - `consentVersion` is the current privacy-notice version.

    Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel), one issue per field.
  - P3 Each upload key has the prefix `business-document/<actorId>/` and exists in `upload-quarantine`, and its bytes pass the AD-SYS-8 rule 6 pipeline. Violation: `InvalidDocumentFile` (HTTP 400, identity), citing `{ key, cause: 'missing' | 'size' | 'magic' | 'scanner' }`. Promotion happens before the transaction (AD-VER-3 rule 4).
  - P4 `claimSellerTrack(tx, businessId, 'business')` succeeds. Violation: `IndividualSellerProfileAlreadyComplete` (HTTP 409, identity).
  - P5 The latest application is not `Pending`. Violation: `ApplicationAlreadyPending` (HTTP 409, identity).
  - P6 The latest application is not `Approved`. Violation: `AlreadyVerifiedBusiness` (HTTP 409, identity).
  - P7 If the latest is `Rejected`: not barred, or else `ReapplicationBarred` (HTTP 409, identity); and `now ≥ reapplyNotBefore`, or else `ReapplicationCooldownActive` (HTTP 409, identity), citing `reapplyNotBefore`.
- **Postcondition (Q):**
  - Q1 Returns `{ applicationId, status: 'Pending', submittedAt: now, decision }`.
  - Q2 In one transaction, in AD-VER-3 rule 1 order:
    - the IDN-1 write;
    - a read of the latest application;
    - P5–P7;
    - `INSERT "BusinessApplication" (status 'Pending', "submittedAt"=:now, consent snapshot, "createdAt"=:now, "updatedAt"=:now)`;
    - `INSERT "BusinessApplicationLegalIdentity"`, through `legalIdentityRepository` only;
    - an upsert of `"BusinessProfile"` (payment instructions and public fields).
  - Q3 Audit: `audit('verification.application.submitted', BusinessApplication:id)`. The audit data holds ids only, and never `legalIdentity`. No event, because VER publishes only on decisions.
  - Q4 The decision is `allowed` with `{ rule: 'FR-VER-1', inputs: { applicationId, reapplication: boolean } }`. Each refusal cites its rule (`FR-VER-1`, `FR-VER-6`) and the snapshot values it compared.
  - Q-fail Any refusal at P4–P7, or a unique violation, rolls the transaction back. `"sellerTrack"` returns to its prior value, and no application, profile or audit row survives. The promoted document objects are deleted after the rollback (AD-VER-3 rule 4).
- **Invariant (I):**
  - I1 At most one `Pending` application per business. Bound to: AD-VER-3 rule 2; partial unique `("businessId") WHERE status='Pending'`. A concurrent second submit that passed P5 fails at the insert with `ApplicationAlreadyPending`.
  - I2 Reapplication is judged only from the decided row's snapshot (`"reapplyBarred"`, `"reapplyNotBefore"`), never from the current `"RejectionReason"`. Bound to: AD-VER-3, AD-VER-1 rule 5.
  - I3 Legal identity is written and read only by `legalIdentityRepository`. Bound to: AD-VER-2, AD-13.
- **Concurrency / idempotency:** a double submit produces one `Pending` row and one `ApplicationAlreadyPending`. Submit racing `completeIndividualProfile` → exactly one wins (IDN-1).
- **Time:** `Clock`, once. The cooldown is half-open: refused for `now < reapplyNotBefore`, accepted at `now = reapplyNotBefore` (FR-VER-6 boundary test: 1 s before is refused, the exact instant succeeds).
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1, excluding the upload transfer (NFR-SYS-9). Upload plus validation p95 ≤ 10 s on 10 Mbps (NFR-VER-4), measured in the Phase 3 NFR plan.

### Operation: `getApplicationForReview(applicationId: CuidId, actorId: CuidId, now: Instant): Promise<ApplicationReviewDTO>`

*VER-3 · E (audited) · FR-VER-5, FR-VER-2 · NFR-VER-2, NFR-VER-3. `verification.getApplicationForReview`, built from `authedProcedure` plus an in-body admin check, so that a non-admin denial is audited.*

`ApplicationReviewDTO = { applicationId; businessId; businessName; city; externalPresenceUrl; submittedAt; status; legalIdentity: { type: 'NIT' | 'CC'; number: string }; documents: { url: string; expiresAt: Instant }[] }`. `legalIdentity` and `documents` are regulated, and this DTO is their only carrier.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The caller is an admin. Violation: `LegalIdentityAccessDenied` (HTTP 403, identity). **First**, a separate transaction commits `"LegalIdentityAccessLog" { actorId, applicationId, fieldsRead: [], outcome: 'denied', procedure: 'verification.getApplicationForReview', createdAt: now }` and `audit('verification.legalIdentity.denied', BusinessApplication:applicationId)`. The denial rows survive the error (AD-VER-2 rule 3).
  - P2 The application exists. Violation: `ApplicationNotFound` (HTTP 404, identity), with zero writes.
- **Postcondition (Q):**
  - Q1 Returns the DTO. Each document URL is signed for 600 s, with `expiresAt = now + 600 s` (AD-14, AD-SYS-8 rule 9).
  - Q2 In one transaction: the row is read through `legalIdentityRepository`, and one `"LegalIdentityAccessLog" { outcome: 'granted', fieldsRead: ['type', 'number', 'documentKeys'] }` row is inserted.
  - Q3 Audit: `audit('verification.legalIdentity.read', BusinessApplication:applicationId)`. The audit `data` holds `fieldsRead` names only, never values.
  - Q4 Each log row is the explanation of the access. A denial's decision cites `{ rule: 'FR-VER-5', inputs: { applicationId, outcome: 'denied' } }`.
  - Q-fail On P2, zero writes. No regulated value appears in an error, a log line or an audit row (AD-SYS-8 rule 4).
- **Invariant (I):**
  - I1 The count of `"LegalIdentityAccessLog"` rows equals the count of instrumented repository reads plus denials. Bound to: AD-VER-2 rule 5 (NFR-VER-2).
  - I2 No other procedure returns a `legalIdentity` field. Bound to: AD-13, AD-VER-2 rule 1.
  - I3 Signed URLs expire after exactly 600 s. Bound to: AD-14.
- **Concurrency / idempotency:** a read; each call writes its own log row by design. There is no contended state.
- **Time:** `Clock`, once. URL expiry is `[now, now + 600 s)`, verified by advancing the virtual clock by 600 s.
- **Latency budget (NFR):** p95 ≤ 300 ms for the signed-URL issue (NFR-VER-3), and p95 ≤ 1,000 ms for the read (NFR-SYS-9), both at N = 1.

---

## 3. CAT — Catalog & Price Reference Service (`catalog`)

### Operation: `startFeedRun(actorId: CuidId, now: Instant): Promise<{ runId: CuidId; startedAt: Instant }>`

*CAT-1 · R · FR-CAT-3. `catalog.feed.start`. Contenders: two admins pressing "Iniciar" at once, or the scheduled run overlapping an admin start.*

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The caller is an admin. Violation: `AdminOnly` (HTTP 403, identity), raised by the admin guard in `src/server/trpc/admin-guard.ts`, so `catalog` gains no dependency on `identity` (Solu-1 review E-23, AD-1).
- **Postcondition (Q):**
  - Q1 Returns `{ runId, startedAt: now }`.
  - Q2 One transaction:
    1. `UPDATE "FeedIngestionRun" SET status='Failed', "endedAt"=:now, "updatedAt"=:now WHERE status='Running' AND COALESCE("leaseUntil", "startedAt") < :now − interval '24 hours'` fails a run abandoned for more than 24 h (AD-CAT-1 rule 7);
    2. `INSERT "FeedIngestionRun" (id, status 'Running', cursor 0, all counters 0, "startedAt"=:now, "createdAt"=:now, "updatedAt"=:now)`.
  - Q3 Audit: `audit('catalog.feedRun.started', FeedIngestionRun:runId)`, plus one `audit('catalog.feedRun.failedAbandoned', …)` per run that step 1 failed. No event.
  - Q4 The decision cites `{ rule: 'AD-CAT-1 rule 1', inputs: { runId } }`.
  - Q-fail A unique violation on the partial index throws `FeedRunInProgress` (HTTP 409, catalog), citing `{ runId, startedAt }` of the running row. The transaction rolls back, so no new run or audit row exists.
- **Invariant (I):**
  - I1 At most one `status='Running'` row exists at any instant. Bound to: AD-CAT-1 rule 1; partial unique `ON "FeedIngestionRun"((true)) WHERE status='Running'`.
- **Concurrency / idempotency:** N concurrent starts → exactly one row, and N − 1 `FeedRunInProgress` responses (50 × 100). A retry while the run lives gets `FeedRunInProgress`, which is retryable (§13): the same call succeeds once the run ends.
- **Time:** `Clock`, once. The abandonment boundary is strict: abandoned when `COALESCE(leaseUntil, startedAt) < now − 24 h`; at exactly 24 h the run still blocks.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9). The whole run is bound by NFR-CAT-2 (10,000 rows ≤ 120 s).

### Operation: `upsertCatalogEntry(tx: Tx, row: ValidFeedRow, runId: CuidId, now: Instant): Promise<{ catalogEntryId: CuidId; outcome: 'created' | 'updated' | 'unchanged' | 'quarantinedKindChanged'; changedFields: string[] }>`

*CAT-2 · R, MEC · FR-CAT-2, FR-CAT-4 · NFR-CAT-2. One row of a `catalog.feed.continue` batch transaction (AD-CAT-1 rule 3). MEC: a renamed or reprinted card keeps its id, and listings and binder entries stay untouched.*

`ValidFeedRow = { externalKey; setCode; number; name; kind: 'card' | 'sealedProduct'; eraCode; pokemon | null; colour | null; style | null; artist | null; imageUrl | null }`, already accepted by the pure `validateRow` (ADD-§8.1).

- **Layer:** Inbound Port (a batch step of the ingestion use case).
- **Precondition (P):**
  - P1 `tx` is the batch transaction whose first statement renewed the lease: `UPDATE … SET "leaseUntil"=:now + 90 s WHERE id=:runId AND "leaseToken"=:t` returned 1 row. Violation: the batch rolls back and `continue` returns `{ done: false, cursor }` (AD-CAT-1 rule 3).
  - P2 `validateRow(row) = ok`. A failing row goes to `"QuarantinedFeedRow"` and never reaches this function.
  - P3 The `"CatalogSet"` with `code = row.setCode` exists (inserted earlier in the run). Violation: `'Unexpected'`.
- **Postcondition (Q):**
  - Q1 Runs `INSERT INTO "CatalogEntry" (…, "createdAt", "updatedAt") VALUES (:newId, …, :now, :now) ON CONFLICT ("externalKey") DO UPDATE SET <the nine attributes>, "updatedAt"=:now WHERE (<the nine>) IS DISTINCT FROM (EXCLUDED.<the nine>) RETURNING id, (xmax = 0) AS inserted`. The nine attributes are `"setId"`, `name`, `number`, `"numberSort"`, `pokemon`, `colour`, `style`, `artist` and `"imageUrl"`. The `SET` list never contains `id`, `"externalKey"`, `kind` or `"createdAt"`.
  - Q2 It returns:
    - `created` with the new id when the row was inserted;
    - `updated` with **the existing id** when attributes changed;
    - `unchanged` when nothing changed. The update's `WHERE` blocks the write, so the function selects the existing id and writes nothing.
  - Q3 On `updated`, the same `tx` inserts one `"CatalogEntryRevision" { catalogEntryId, runId, changedFields, before, after, createdAt: now }`. The batch writes one summary `audit('catalog.feedBatch.applied', FeedIngestionRun:runId)` with the counts; there is no per-row audit (the revision table is the per-row record). No event.
  - Q4 A revision row is the explanation of an identity-preserving change: `changedFields` plus the before and after values.
  - Q-fail **`kind` mismatch** (Solu-1 GAP-4, adopted at Solu-1's Phase 2 gate, Solu-1 log #12). A row whose `externalKey` exists with a different `kind` is not upserted. It is quarantined with reason `KindChanged` (`ON CONFLICT (runId, rowNumber) DO NOTHING`), and the function returns `quarantinedKindChanged` with the existing id and `changedFields: ['kind']`. The entry is unchanged.
- **Invariant (I):**
  - I1 `"CatalogEntry".id` is never reassigned and never deleted. One `externalKey` maps to exactly one id for the catalog's life. Bound to: AD-CAT-1 rule 5, AD-7; `UNIQUE ("externalKey")`, plus the upsert keeping `id`.
  - I2 A rerun of the same file converges: every row is `unchanged`, and zero revisions are written. Bound to: AD-CAT-1 rule 6.
  - I3 No `"Listing"`, `"BundleComponent"`, `"CollectionEntry"` or `"TradeOffer"` row is read or written. Those modules hold the id only. Bound to: AD-8, AD-7.
- **Concurrency / idempotency:** the lease makes one caller per run, and a second `continue` gets `FeedRunInProgress`. The upsert itself is idempotent per `externalKey` (a rerun gives `unchanged`). MEC: renaming a card used by 3 listings and 2 binder entries keeps the id, and those 5 rows are byte-identical before and after.
- **Time:** `Clock`, once per batch transaction. The lease is `[now, now + 90 s)`.
- **Latency budget (NFR):** 10,000 rows in ≤ 120 s in total (NFR-CAT-2), in batches of 500 per transaction.

### Operation: `getPriceProvenance(catalogEntryIds: CuidId[], period: 7 | 30 | 90, now: Instant): Promise<PriceProvenanceDTO[]>`

*CAT-3 · E · FR-CAT-5, FR-CAT-6, FR-CAT-7 · NFR-CAT-1, NFR-CAT-3. `catalog.provenance` (public) and the `catalog.getPriceProvenance` port (`listings` card detail, `collections` VAL).*

`PriceProvenanceDTO = { catalogEntryId; lastTransactionReference: ReferencePriceDTO | null; trend: { period; referencePriceAtStart: ReferencePriceDTO | null; changePercentHundredths: number | null; decision: Decision }; freshness: 'fresh' | 'stale' | null; decision: Decision }`, where `ReferencePriceDTO = { usdCents: number | null; cop: Cop; observedAt: Instant; source: string; copDerivation: 'sourceNative' | 'fxDerived'; fxRateDate: string | null }`.

- **Layer:** Inbound Port and Outbound Port (one implementation).
- **Precondition (P):**
  - P1 1–500 distinct ids. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel).
  - P2 Every id exists. Violation: `CatalogEntryNotFound` (HTTP 404, catalog), citing the missing ids, with zero writes. Entries are never deleted (CAT-2 I1), so a valid caller never meets this.
  - P3 `period ∈ {7, 30, 90}`, default 30. Violation: `RequestValidationFailed`.
- **Postcondition (Q):**
  - Q1 One element per input id, in input order. Two indexed statements (AD-CAT-2 rule 4):
    - the latest observation per entry, `DISTINCT ON` ordered by `("observedAt" DESC, source ASC, id ASC)` (deterministic tie-break, Solu-1 review F-11);
    - the latest observation at or before `now − period days`, as the baseline.
  - Q2 `changePercentHundredths = changePercent(baseline.cop, latest.cop)`, by the ADD-§2.2 BigInt formula, rounded half away from zero. It is `null` when there is no baseline or `baseline.cop = 0`.
  - Q3 Zero writes; a read path. No audit.
  - Q4 Explanation:
    - `freshness = 'stale'` when `now − observedAt > freshnessThresholdHours` (36), with a decision `{ outcome: 'stale', reasonCode: 'ReferencePriceStale', citations: [{ rule: 'FR-CAT-7', inputs: { observedAt, thresholdHours: 36 } }] }`;
    - no baseline → the trend decision is `TrendNoBaseline`, citing `{ rule: 'FR-CAT-6', inputs: { periodStart } }`;
    - no observation at all → `lastTransactionReference: null`, `freshness: null`.
  - Q-fail P2 throws before any read result is returned. Nothing changes.
- **Invariant (I):**
  - I1 Every returned value equals a stored observation byte for byte. There is no interpolation, averaging or substitution. Bound to: AD-CAT-2 rule 5 (NFR-CAT-3).
  - I2 `stale` is computed at read, and no column stores it. Bound to: AD-CAT-2 rule 3, AD-SYS-6 rule 5.
  - I3 `ReferencePriceDTO` is not assignable to `Cop` at compile time. Bound to: AD-SYS-7 rule 2.
- **Concurrency / idempotency:** a read in one READ COMMITTED snapshot per statement. Two calls with equal `now` over unchanged rows are byte-identical. Under the feed fault switches (`down`, `stale`, `malformedRows`) no value is fabricated (NFR-CAT-3).
- **Time:** `Clock`, once. Staleness is strict: stale when the age is > 36 h, fresh at exactly 36 h. The baseline instant is `now − period × 86,400 s`, inclusive (`observedAt ≤ start`).
- **Latency budget (NFR):** p95 ≤ 300 ms for 48 ids at N = 1 (NFR-CAT-1).

---

## 4. DSC — Marketplace Browse & Location Discovery (`listings`, no tables)

### Operation: `assertSearchArea(area: { lat: number; lng: number; radiusKm: number }): void`

*DSC-3 · E · FR-DSC-1. Pure; it does no I/O.*

- **Layer:** Core Domain.
- **Precondition (P):**
  - P1 `lat`, `lng` and `radiusKm` are finite doubles. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel), raised at the parser for `NaN` or `±Infinity`.
- **Postcondition (Q):**
  - Q1 Returns `void` when all of these hold:
    - `1 ≤ radiusKm ≤ 300`;
    - `−4.23 ≤ lat ≤ 13.39`;
    - `−81.73 ≤ lng ≤ −66.85`;
    - `(lat, lng) ≠ (0, 0)` (ADD-§2.4).
  - Q2 Zero reads and zero writes.
  - Q3 No event and no audit.
  - Q4 A refusal cites `{ rule: 'FR-DSC-1', inputs: { lat, lng, radiusKm } }`.
  - Q-fail Otherwise it throws `InvalidSearchArea` (HTTP 400, listings).
- **Invariant (I):**
  - I1 The box constants are the single ADD-§2.4 constants, shared with `InvalidLocation` (INV) and the meeting-point CHECK (IDN). Bound to: AD-DSC-1, AD-5.
- **Concurrency / idempotency:** pure and deterministic.
- **Time:** none.
- **Latency budget (NFR):** part of DSC-1's budget; no separate target.

### Operation: `search(input: SearchInput, now: Instant): Promise<{ results: SearchRow[]; excluded: { unusableLocation: number }; decision: Decision }>`

*DSC-1 · E, repeat-safe read · FR-DSC-1..6 · NFR-DSC-1..3. `discovery.search`, `view=listings`. Concurrent writers: `reserveForPurchase` (availability to 0), listing hide (`hiddenAt`), the commission projection (`pausedAt`).*

`SearchInput = { view: 'listings'; catalogFilters?; area?: { lat; lng; radiusKm }; maxPriceCop?: Cop; condition?: Condition[]; purchasableOnly?: boolean; includeSoldOut?: boolean (default false); page: 1..417; pageSize: 24 }`.

`SearchRow = { listingId; catalogEntryIds: CuidId[]; priceCop: Cop; distanceKm: number | null; sellerKind: 'business' | 'individual'; verified: boolean; pickupAvailable: boolean; purchasable: boolean; explanation: Decision }`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 If `area` is present, `assertSearchArea(area)` returned. Violation: `InvalidSearchArea` (HTTP 400, listings).
  - P2 If `catalogFilters` is present, `catalog.matchEntryIds` answers with ≤ 20,000 ids. Violation: `SearchFilterTooBroad` (HTTP 400, listings), citing `{ threshold: 20000 }`.
  - P3 `page ≤ 417`, which bounds the `OFFSET` (Solu-1 review E-19). Violation: `RequestValidationFailed`.
- **Postcondition (Q):**
  - Q1 **One** SQL statement:
    - selects listings with `"hiddenAt"`, `"withdrawnAt"` and `"deactivatedAt"` null, and availability ≥ 1 unless `includeSoldOut` (sold-out rows ranked last);
    - applies a bbox prefilter, then `d ≤ radiusKm + 1e-6` with `d = 2 × 6371.0088 × asin(sqrt(…))` in double precision;
    - orders by `(d, "priceCop", id)` with an area, or `("priceCop", id)` without;
    - counts unusable locations with `FILTER`.

    Then one `identity.getSellerKinds(distinct sellerIds of the page)` call derives `sellerKind`, `verified`, and `pickupAvailable = (sellerKind = 'individual')`. At most 3 neighbour calls in total (AD-DSC-2 rule 1).
  - Q2 Zero writes.
  - Q3 No event and no audit; this is a public read.
  - Q4 Every row's `explanation` cites `{ rule: 'FR-DSC-5', inputs: { distanceKm, priceCop, rankKey } }` (`ranked`). The response decision reports `excluded.unusableLocation` with `ListingLocationUnusable` (FR-DSC-3).
  - Q-fail A refusal at P1–P3 throws before the statement runs.
- **Invariant (I):**
  - I1 One query path serves both seller kinds. The builder has no branch on seller kind. Bound to: AD-5, AD-DSC-1 rule 1.
  - I2 A row with `"hiddenAt" IS NOT NULL` is never returned. Bound to: AD-12, AD-DSC-1 rule 6.
  - I3 `pickupAvailable` is computed per request and never stored. Bound to: AD-DSC-2 rule 3.
  - I4 SQL distance equals the TypeScript haversine reference within 1 m. Bound to: AD-DSC-1 (NFR-DSC-2).
- **Concurrency / idempotency:**
  - A listing hidden, withdrawn, deactivated or emptied before the statement began is absent from the response. A change committed after it began is not visible in it, because one statement sees one snapshot.
  - Equal inputs over unchanged data give byte-identical `results` (NFR-DSC-3: 10 runs, 0 ordering differences).
- **Time:** `Clock`, once. `now` is used only for derived listing states.
- **Latency budget (NFR):** p95 ≤ 1,000 ms at N = 1 with a 15 km area on the §3 seed, and p95 ≤ 1,500 ms on the 50,000-listing scale seed (NFR-DSC-1).

### Operation: `getCardDetail(catalogEntryId: CuidId, area: { lat; lng; radiusKm } | null, now: Instant): Promise<CardDetailDTO>`

*DSC-2 · MEC · FR-DSC-7, FR-CAT-6. `discovery.cardDetail`. MEC (Annex A):*
- *with `radiusKm = 15`, a listing at 15.0002 km is excluded and one at exactly 15.0000 km is included;*
- *with `radiusKm = 5`, a listing at 4.99 km is included;*
- *missing coordinates are counted;*
- *an entry whose listings are all filtered out is still returned.*

`CardDetailDTO = { entry: CatalogEntryDTO; provenance: PriceProvenanceDTO; listingPriceCop: Cop | null; hasActiveListings: boolean; listings: SearchRow[]; excluded: { unusableLocation: number } }`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The entry exists. Violation: `CatalogEntryNotFound` (HTTP 404, catalog), propagated unchanged from `catalog.getEntry`. No further call is made.
  - P2 If `area` is present, `assertSearchArea(area)` returned. Violation: `InvalidSearchArea` (HTTP 400, listings).
- **Postcondition (Q):**
  - Q1 Exactly three neighbour calls:
    - `catalog.getEntry`;
    - `catalog.getPriceProvenance([id], 30)`;
    - `identity.getSellerKinds`;

    plus DSC-1's statement restricted to the entry. `listingPriceCop` is the minimum `"priceCop"` over the returned listings, and `hasActiveListings = listings.length > 0`.
  - Q2 Zero writes.
  - Q3 No event and no audit.
  - Q4 Explanation: the three price blocks are separate fields with their own decisions (FR-CAT-6). No listing → `listingPriceCop: null`, decision "no active listings". Excluded rows are counted with `ListingLocationUnusable`.
  - Q-fail **Missing data is not an error:** when no listing survives the filters, the result is `{ entry, provenance, listingPriceCop: null, hasActiveListings: false, listings: [] }`.
- **Invariant (I):**
  - I1 `listingPriceCop` (a `Cop`) and `provenance.lastTransactionReference` (a `ReferencePriceDTO`) are distinct fields. Neither is derived from, summed with or averaged with the other. Bound to: AD-SYS-7, FR-CAT-6.
  - I2 `listings` calls `catalog`, never the reverse. Bound to: AD-1, AD-DSC-2 rule 4.
  - I3 The distance boundary is inclusive (`d ≤ radiusKm + 1e-6`). Bound to: AD-DSC-1 rule 2.
- **Concurrency / idempotency:** the same as DSC-1.
- **Time:** `Clock`, once, passed to the provenance read.
- **Latency budget (NFR):** interactive read p95 ≤ 1,000 ms at N = 1 (NFR-SYS-9; no DSC-specific detail NFR).

---

## 5. INV — Listing & Shared Inventory Engine (`listings`)

### Operation: `reserveForPurchase(tx: Tx, listingId: CuidId, qty: number, buyerId: CuidId): Promise<{ reservationRef: ReservationRef; exhaustedListingIds: CuidId[]; snapshot: ListingSnapshot }>`

*INV-1 · R, MEC · FR-INV-3, FR-INV-6 · NFR-INV-1..4. Called only by ORD-1 inside its transaction. MEC (NFR-INV-3): the caller aborts after a successful reserve, and the quantity is fully restored.*

`ReservationRef = { listingId; units: { inventoryUnitId; qty }[] }`. `ListingSnapshot = { title; itemRef: CuidId | null; condition: Condition | null; unitPriceCop: Cop; components: { catalogEntryId; perBundleQty }[] | null }`.

- **Layer:** Outbound Port.
- **Precondition (P)**, each checked in `tx` before any decrement, first-fail:
  - P1 `tx` is open and owned by the caller. `qty` is an integer ≥ 1 (otherwise `'Unexpected'` before any SQL). `buyerId = actorId ≠ sellerId`; the caller checked that first.
  - P2 The listing exists with `"hiddenAt"`, `"withdrawnAt"` and `"deactivatedAt"` null. Violation: `ListingNotFound` (HTTP 404, listings).
  - P3 `"sellerKindAtCreation" = 'business'`. Violation: `NotBusinessListing` (HTTP 409, listings).
  - P4 `purchasable(listing)`: `identity.getSellerVerification(sellerId).status = 'Approved'` read in `tx`, and `"pausedAt" IS NULL`. Violation: `ListingNotPurchasable` (HTTP 409, listings), citing `ListingUnverified` or `ListingPausedBalanceExhausted` (Solu-1 review F-06 records the FR-INV-3 deviation).
  - P5 Each unit holds `quantity ≥ req`. Violation: `InsufficientQuantity` (HTTP 409, listings), citing `{ requested: req, available: quantity }`.
- **Postcondition (Q):**
  - Q1 For each unit in **ascending id order**: `UPDATE "InventoryUnit" SET quantity = quantity − :req, "updatedAt" = :now WHERE id=:u AND quantity >= :req RETURNING quantity`, with `req = qty` for a single listing or `perBundleQty × qty` per component.
  - Q2 When every update returned 1 row: one `SELECT` in `tx` computes `exhaustedListingIds` (every listing on a decremented unit whose availability is now 0). The function returns `{ reservationRef, exhaustedListingIds, snapshot }`, with `snapshot.unitPriceCop` read in `tx`.
  - Q3 No table other than `"InventoryUnit"` is written (NFR-INV-3). There is no reservation row, no event and no audit row: the caller's order row and its audit entry record the reservation.
  - Q4 Every refusal cites `FR-INV-3` with its inputs (P4 cites the DecisionCode; P5 cites `requested`/`available`).
  - Q-fail A throw at P5 aborts `tx`, which restores every unit decremented earlier in the call. **Caller abort after success:** if `tx` rolls back after this function returned, every `quantity` equals its value before the call, with no compensating write.
- **Invariant (I):**
  - I1 `"InventoryUnit".quantity ≥ 0` always. Bound to: AD-6, AD-INV-1 rule 3; `CHECK (quantity >= 0)`.
  - I2 N concurrent calls needing `req` from a unit with `quantity = k` → exactly `min(N, floor(k / req))` succeed. Bound to: AD-INV-2 rule 3, AD-SYS-5.
  - I3 Units are locked in ascending id order (lock-order position 3). Bound to: AD-SYS-4 rule 5.
  - I4 Nothing is reserved outside the caller's transaction. Bound to: AD-INV-2 rule 1, AD-SYS-4 rule 1.
- **Concurrency / idempotency:** last-unit race, 50 connections × 100 repetitions → 1 success and 49 `InsufficientQuantity` (NFR-INV-1). A mixed purchase/trade race gives the same result (NFR-INV-2). A bundle racing a single listing on a shared unit → 0 deadlocks.
- **Time:** the caller's `now` (for `"updatedAt"`). No time rule.
- **Latency budget (NFR):** p95 ≤ 150 ms for a single listing, and ≤ 300 ms for a 20-component bundle, at N = 1 (NFR-INV-4).

### Operation: `createListing(input: CreateListingInput, sellerId: CuidId, now: Instant): Promise<{ listingId: CuidId; inventoryUnitId: CuidId; state: 'Active' | 'Unverified' | 'Paused'; availability: number; decision: Decision }>`

*INV-2 · E · FR-INV-1, FR-INV-4, FR-INV-7 (fail-closed insert) · NFR-INV-4. `inventory.create`.*

`CreateListingInput = { itemRef: CuidId; condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG' | 'Sealed'; priceCop: number; quantity: number (1–999); location: { lat; lng } | null; description: string (0–1000); openToTrade: boolean (default false) }`.

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail after the parser:
  - P1 `requireListingEligibility(sellerId)` passes. Violation: `IndividualSellerProfileIncomplete` (HTTP 409, identity) or `SellerNotVerified` (HTTP 409, identity), propagated unchanged.
  - P2 Not (`openToTrade` and `listingKind = 'business'`). Violation: `OpenToTradeNotAllowed` (HTTP 409, listings).
  - P3 `catalog.resolveItemRefs([itemRef])` resolves the id, and its kind matches the condition: `Sealed` ⇔ `sealedProduct`. Violation: `InvalidItemRef` (HTTP 400, listings), citing `{ itemRef, kind? }`.
  - P4 `priceCop` is an integer in 1,000–100,000,000. Violation: `InvalidPrice` (HTTP 400, listings).
  - P5 `location`, or the individual seller's meeting point when it is null, is inside ADD-§2.4 and not (0, 0). Violation: `InvalidLocation` (HTTP 400, listings). A business with `location = null` stores no coordinates; the listing is then counted as an unusable location in area search (FR-DSC-3).
- **Postcondition (Q):**
  - Q1 One transaction:
    1. `INSERT "InventoryUnit" (id, "sellerId", "catalogEntryId", condition, quantity, "createdAt", "updatedAt") ON CONFLICT ("sellerId", "catalogEntryId", condition) DO NOTHING RETURNING id`, then a select of the unit. An existing unit is linked **unchanged**, and `quantity` is ignored (FR-INV-1 rule 3).
    2. For a business: `SELECT … FROM "SellerCommissionState" WHERE "businessId"=:sellerId FOR SHARE`.
    3. `INSERT "Listing"` with `"sellerKindAtCreation"`, `"pausedAt" = :now` when the projection row is absent or `paused = true` (fail-closed), and `"createdAt" = "updatedAt" = :now`.
  - Q2 `state`:
    - `Paused` when `pausedAt` is set;
    - else `Unverified` for a `Pending` business;
    - else `Active`.

    `availability = unit.quantity`.
  - Q3 Audit: `audit('listings.listing.created', Listing:id)`. No event.
  - Q4 The decision is `allowed`, `allowedWithNotice` (`ListingUnverified`), or `paused` (`ListingPausedBalanceExhausted`), citing `{ rule: 'FR-INV-7', inputs: { verification, projection: 'absent' | 'paused' | 'funded' } }`. When the unit already existed, the decision adds `{ rule: 'FR-INV-1', inputs: { inventoryUnitId, existingQuantity, ignoredQuantity } }`.
  - Q-fail Any refusal → zero writes.
- **Invariant (I):**
  - I1 One `InventoryUnit` per `(sellerId, catalogEntryId, condition)`. A second listing of the same copy never adds stock. Bound to: AD-INV-1, AD-6; `UNIQUE ("sellerId", "catalogEntryId", condition)`.
  - I2 A business listing is never purchasable before its commission projection says `funded`. Bound to: AD-INV-3 rule 3, AD-3.
  - I3 Individual listings are never paused and never purchasable. Bound to: AD-INV-3 rule 6; `CHECK ("sellerKindAtCreation"='business' OR "pausedAt" IS NULL)`.
  - I4 Business listings are never open to trade. Bound to: AD-4; `CHECK ("sellerKindAtCreation"='individual' OR NOT "openToTrade")`.
- **Concurrency / idempotency:** two concurrent creates of the same `(seller, item, condition)` → one unit, both listings linked to it, and the unit's quantity is the first insert's (50 × 100). Not idempotent across retries: two calls create two listings on one pool, which FR-INV-1's acceptance requires.
- **Time:** `Clock`, once.
- **Latency budget (NFR):** p95 ≤ 800 ms at N = 1 (NFR-INV-4).

### Operation: `applyCommissionProjection(tx: Tx, event: { type: 'CommissionBalanceExhausted' | 'CommissionBalanceReplenished'; businessId: CuidId; ledgerSeq: number; balanceAfter: number }, now: Instant): Promise<{ applied: boolean; listingsChanged: number }>`

*INV-3 · R · FR-INV-7 · subscribers `listings.onCommissionBalanceExhausted` / `onCommissionBalanceReplenished` under the AD-SYS-2 rule 4 attempt procedure. Contenders: redelivery, the sweeper, a replay, and two events delivered out of order.*

- **Layer:** Inbound Port (subscriber).
- **Precondition (P):**
  - P1 `tx` is the handler transaction holding this subscriber's `"EventDelivery"` row (lock-order position 0). Violation: `'Unexpected'`, and the delivery is recorded `failed`.
  - P2 `event` is an ADD-§5 payload with `ledgerSeq ≥ 0`. Violation: `'Unexpected'`.
- **Postcondition (Q):**
  - Q1 `INSERT "SellerCommissionState" ("businessId", "lastAppliedSeq", paused, "appliedAt", "createdAt", "updatedAt") VALUES (:b, :seq, :paused, :now, :now, :now) ON CONFLICT ("businessId") DO UPDATE SET "lastAppliedSeq"=:seq, paused=:paused, "appliedAt"=:now, "updatedAt"=:now WHERE "SellerCommissionState"."lastAppliedSeq" < :seq RETURNING 1`.
  - Q2 When a row is returned: `UPDATE "Listing" SET "pausedAt" = :now, "updatedAt"=:now WHERE "sellerId"=:b AND "pausedAt" IS NULL` (Exhausted), or `SET "pausedAt" = NULL … WHERE "pausedAt" IS NOT NULL` (Replenished). It returns `{ applied: true, listingsChanged }`. When no row is returned, it returns `{ applied: false, listingsChanged: 0 }` with zero writes. The delivery row is set `delivered` in both cases.
  - Q3 Audit when applied: `audit('listings.commissionProjection.applied', SellerCommissionState:businessId)`, `actorKind='system'`. No event.
  - Q4 The decision on each affected listing's later reads is `ListingPausedBalanceExhausted`, citing `{ rule: 'FR-INV-7', inputs: { businessId, ledgerSeq, balanceAfter } }`.
  - Q-fail A throw rolls back the handler transaction. A separate transaction records the delivery as `failed` with the registry code only (AD-SYS-2 rule 4 step 3).
- **Invariant (I):**
  - I1 The projection applies only newer facts: `Replenished(seq 5)` and then `Exhausted(seq 4)` leaves the listings resumed. Bound to: AD-INV-3 rule 4.
  - I2 No business has a purchasable listing while its projection is absent. Bound to: AD-INV-3 rule 3, AD-3.
  - I3 The projection subscriber locks `SellerCommissionState` and then `Listing`, the one AD-SYS-4 rule 5 exception, and is deadlock-free because no transaction locks them in the reverse order. Bound to: AD-SYS-4 rule 5.
- **Concurrency / idempotency:**
  - Each event delivered 3 times, in both orders → one effect (§7.1 subscriber rule 2).
  - Two events for one business delivered concurrently → the row lock serializes them, and the higher `ledgerSeq` determines the final state whatever the commit order.
- **Time:** `Clock`, once per handler transaction.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9), for a business with ≤ 500 listings (the AD-INV-3 trade-off scale).

---

## 6. ORD — Order & Comprobante Confirmation (`orders`)

### Operation: `createOrder(listingId: CuidId, qty: number, buyerId: CuidId, now: Instant): Promise<{ orderId: CuidId; status: 'AwaitingPayment'; totalCop: Cop; paymentInstructions: PaymentInstructionsDTO; expiresAt: Instant; decision: Decision }>`

*ORD-1 · R · FR-ORD-1 · NFR-ORD-2. `orders.create`. Contenders: the same buyer's concurrent purchases near the open-order limit; the last-unit race (INV-1); a crash after the reserve (INV-1 MEC).*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail. P1–P3 run before the main transaction (AD-ORD-1 rule 1):
  - P1 `canBuy`. Violation: `EmailNotVerified` (HTTP 403, identity), from `requireCanBuy`.
  - P2 `listings.getListingForPurchase(listingId)` finds the listing. Violation: `ListingNotFound` (HTTP 404, listings), propagated.
  - P3 `sellerId ≠ buyerId`. Violation: `SelfPurchaseNotAllowed` (HTTP 409, orders).
  - P4 Under `pg_advisory_xact_lock(orders:buyer:<buyerId>)`, the open orders (`buyerPaidConfirmedAt IS NULL AND cancelledAt IS NULL AND expiredAt IS NULL AND expiresAt > :now`) number < 3 overall and < 1 with this business. Violation: `TooManyOpenOrders` (HTTP 409, orders), citing the open order ids.
  - P5 `reserveForPurchase(tx, listingId, qty, buyerId)` succeeds. Violation: `ListingNotFound` (HTTP 404, listings), `NotBusinessListing` (HTTP 409, listings), `ListingNotPurchasable` (HTTP 409, listings) or `InsufficientQuantity` (HTTP 409, listings), propagated unchanged.
- **Postcondition (Q):**
  - Q1 Returns `{ orderId, status: 'AwaitingPayment', totalCop, paymentInstructions, expiresAt, decision }`.
  - Q2 Before the main transaction, the expiry pre-step materializes this listing's expired orders (AD-ORD-2 rule 7). Then, in one transaction:
    1. the advisory lock;
    2. P4;
    3. P5;
    4. `identity.getBusinessPaymentInstructions` (`null` → `'Unexpected'`);
    5. `INSERT "Order"` with `listingSnapshot`, `paymentInstructionsSnapshot`, `qty`, `unitPriceCop`, `totalCop = unitPriceCop × qty`, `reservationRef`, `reservedUnitIds`, `expiresAt = :now + 48 h`, `"createdAt" = "updatedAt" = :now`.
  - Q3 Audit: `audit('orders.order.created', Order:id)`. **No event** at creation (FR-ORD-1 rule 6).
  - Q4 The decision cites `{ rule: 'FR-ORD-1', inputs: { orderId, qty, totalCop, expiresAt } }` (EC-29: `orderId` present).
  - Q-fail Any refusal at P4–P5, or a failed insert, rolls back `tx`, which restores every unit decremented by P5 (INV-1 Q-fail). No order, audit row or event exists.
- **Invariant (I):**
  - I1 `totalCop = unitPriceCop × qty` exactly. Bound to: AD-SYS-7; `CHECK ("totalCop" = "unitPriceCop" * qty)`.
  - I2 A buyer never holds more than 3 open orders, nor more than 1 with one business. Bound to: AD-ORD-1 rule 2 (count under the per-buyer lock).
  - I3 The snapshot and the decremented quantity come from the same transaction. Bound to: AD-ORD-1 rule 4, AD-9.
  - I4 `"Order"` has no balance, escrow or payment-status column. Bound to: AD-2, AD-ORD-3 rule 5.
- **Concurrency / idempotency:** two concurrent purchases by one buyer at 2 open orders → exactly one succeeds and one gets `TooManyOpenOrders` (50 × 100). Not idempotent across retries: a retried create is a new order, bounded by the limit of 1 per business.
- **Time:** `Clock`, once. `expiresAt = now + 172,800 s`. An order counts as open while `expiresAt > now` (strict).
- **Latency budget (NFR):** p95 ≤ 800 ms at N = 1, including the reservation (NFR-ORD-2).

### Operation: `confirmPaid(orderId: CuidId, buyerId: CuidId, now: Instant): Promise<{ orderId; buyerPaidConfirmedAt: Instant; status: 'Paid'; decision: Decision }>`

*ORD-2 · R, E · FR-ORD-3 · NFR-ORD-1 (the paid-versus-expiry race at `now = expiresAt`). `orders.confirmPaid`.*

- **Layer:** Inbound Port.
- **Precondition (P)**, the 0-row re-read order, first-fail:
  - P1 The order is visible to the actor (AD-ORD-3 rule 1). Violation: `OrderNotVisibleToCaller` (HTTP 403, orders), with a body byte-identical for an unknown id.
  - P2 `"buyerId" = actorId`. Violation: `OrderNotOwnedByCaller` (HTTP 403, orders).
  - P3 `"buyerPaidConfirmedAt" IS NULL`. Violation: `OrderAlreadyConfirmedByRole` (HTTP 409, orders), citing the stored instant.
  - P4 Not cancelled or expired, and `expiresAt > now`. Violation: `OrderNoLongerActive` (HTTP 409, orders), citing the state and its instant. If `expiresAt ≤ now` with `expiredAt` null, the same transaction first materializes the expiry (`"expiredAt"=:now`, `"cancelReason"='Unpaid'`, `releaseReservation(tx, ref)`), commits, and then throws (AD-ORD-2 rule 4).
  - P5 `"comprobanteObjectKey" IS NOT NULL`. Violation: `ComprobanteNotYetUploaded` (HTTP 409, orders).
- **Postcondition (Q):**
  - Q1 `UPDATE "Order" SET "buyerPaidConfirmedAt"=:now, "updatedAt"=:now, version=version+1 WHERE id=:orderId AND "buyerId"=:buyerId AND "comprobanteObjectKey" IS NOT NULL AND "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL AND "expiresAt" > :now RETURNING id` returns 1 row.
  - Q2 Returns `{ orderId, buyerPaidConfirmedAt: now, status: 'Paid', decision }`. From this instant the business can see the order (AD-15).
  - Q3 Audit: `audit('orders.fact.buyerPaid', Order:id)`. **No event**, because `OrderPaymentConfirmedByBusiness` belongs to ORD-3.
  - Q4 The decision cites `{ rule: 'FR-ORD-3', inputs: { orderId, buyerPaidConfirmedAt } }`.
  - Q-fail On 0 rows: re-read and P1–P5. Every refusal except the materialized expiry writes nothing.
- **Invariant (I):**
  - I1 `"buyerPaidConfirmedAt"` is set at most once and never changes. Bound to: AD-ORD-2 rules 1 and 3, AD-SYS-5.
  - I2 A paid order is never cancelled or expired. Bound to: AD-ORD-2, AD-2; `CHECK (("cancelledAt" IS NULL AND "expiredAt" IS NULL) OR "buyerPaidConfirmedAt" IS NULL)`.
  - I3 The reservation is released at most once. Bound to: AD-INV-2 rule 6.
- **Concurrency / idempotency:** a double click or two tabs → one success and one `OrderAlreadyConfirmedByRole`. Paid racing expiry at `now = expiresAt` → either paid with the reservation held, or expired with the reservation released exactly once and `OrderNoLongerActive`, never both (NFR-ORD-1, 100 repetitions).
- **Time:** `Clock`, once. The window is half-open: paid succeeds only for `now < expiresAt`, and at `now = expiresAt` the order is expired (AD-ORD-2 rule 8).
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `confirmPaymentReceived(orderId: CuidId, businessId: CuidId, now: Instant): Promise<{ orderId; sellerReceivedConfirmedAt: Instant; status: 'PaymentConfirmed' | 'Closed'; decision: Decision }>`

*ORD-3 · MEC · FR-ORD-4 · NFR-ORD-1. `orders.confirmPaymentReceived`. MEC: the business confirms before the buyer's "paid", or before any comprobante, and the confirmation is refused; a double confirmation is idempotent and publishes once.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 The order is visible to the actor. A business sees an order only once `"buyerPaidConfirmedAt" IS NOT NULL`. Violation: `OrderNotVisibleToCaller` (HTTP 403, orders), with a body byte-identical to an unknown id. **This is the MEC's "business confirms before paid" outcome** (refinement R-4; FR-ORD-4). Because "paid" requires a comprobante, "before any comprobante" also lands here.
  - P2 `"businessId" = actorId`; the buyer calling it fails here. Violation: `OrderNotOwnedByCaller` (HTTP 403, orders).
  - P3 `"comprobanteObjectKey" IS NOT NULL`. Violation: `ComprobanteMissingOnConfirm` (HTTP 409, orders), a defensive check that FR-ORD-3 makes unreachable.
  - P4 `"sellerReceivedConfirmedAt" IS NULL`. Violation: `OrderAlreadyConfirmedByRole` (HTTP 409, orders), citing the original instant.
  - P5 Not cancelled or expired. Violation: `OrderNoLongerActive` (HTTP 409, orders), defensive: a paid order cannot terminate (ORD-2 I2).
- **Postcondition (Q):**
  - Q1 `UPDATE "Order" SET "sellerReceivedConfirmedAt"=:now, "updatedAt"=:now, version=version+1 WHERE id=:orderId AND "businessId"=:businessId AND "buyerPaidConfirmedAt" IS NOT NULL AND "sellerReceivedConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL RETURNING …` returns 1 row.
  - Q2 Returns `status = 'Closed'` when `"buyerItemReceivedConfirmedAt"` is already set, otherwise `'PaymentConfirmed'` (ADD-§4.2).
  - Q3 In the same transaction, exactly one `OrderPaymentConfirmedByBusiness { orderId, businessId, buyerId, totalCop, lines, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }` (subscriber `commission`), and `audit('orders.fact.sellerReceived', Order:id)`.
  - Q4 The decision cites `{ rule: 'FR-ORD-4', inputs: { orderId, sellerReceivedConfirmedAt } }`.
  - Q-fail On 0 rows: re-read and P1–P5. No event and no audit row are written.
- **Invariant (I):**
  - I1 `sellerReceivedConfirmedAt ≥ buyerPaidConfirmedAt` whenever it is set. Bound to: AD-ORD-2, AD-2; `CHECK ("sellerReceivedConfirmedAt" IS NULL OR "sellerReceivedConfirmedAt" >= "buyerPaidConfirmedAt")` (Solu-1 review E-08).
  - I2 At most one `OrderPaymentConfirmedByBusiness` per order. Bound to: AD-ORD-2 rule 5, AD-SYS-2 rule 1.
  - I3 A business never learns that an unpaid order exists. Bound to: AD-15, AD-ORD-3 rule 1.
- **Concurrency / idempotency:**
  - Double click and two tabs → one fact, one event, and one `OrderAlreadyConfirmedByRole`.
  - NFR-ORD-1 sequences, 100 repetitions: business before paid → `OrderNotVisibleToCaller`; business before comprobante → `OrderNotVisibleToCaller`; each fact set at most once; each event at most once.
- **Time:** `Clock`, once. No expiry applies after payment.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `confirmItemReceived(orderId: CuidId, buyerId: CuidId, now: Instant): Promise<{ orderId; buyerItemReceivedConfirmedAt: Instant; status: 'Closed'; decision: Decision }>`

*ORD-4 · MEC · FR-ORD-5 · NFR-ORD-1. `orders.confirmItemReceived`. MEC: the item confirmed before "paid" is refused as out of order; repeated is idempotent.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 Visible to the actor. Violation: `OrderNotVisibleToCaller` (HTTP 403, orders).
  - P2 `"buyerId" = actorId`; the business calling it fails here. Violation: `OrderNotOwnedByCaller` (HTTP 403, orders).
  - P3 Not cancelled or expired, and if unpaid, `expiresAt > now`. Violation: `OrderNoLongerActive` (HTTP 409, orders). An unmaterialized expiry is materialized first, as in ORD-2 P4. This precedes P4, because a terminated order cannot become paid (ADD-§3.1 `OrderNotCancellable` note).
  - P4 `"buyerPaidConfirmedAt" IS NOT NULL`. Violation: `OrderConfirmationOutOfOrder` (HTTP 409, orders), citing `{ orderId, buyerPaidConfirmedAt: null }`.
  - P5 `"buyerItemReceivedConfirmedAt" IS NULL`. Violation: `OrderAlreadyConfirmedByRole` (HTTP 409, orders).
- **Postcondition (Q):**
  - Q1 `UPDATE "Order" SET "buyerItemReceivedConfirmedAt"=:now, "updatedAt"=:now, version=version+1 WHERE id AND "buyerId"=:buyerId AND "buyerPaidConfirmedAt" IS NOT NULL AND "buyerItemReceivedConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL RETURNING …` returns 1 row. `sellerReceivedConfirmedAt` is **not** required (FR-ORD-5).
  - Q2 Returns `status: 'Closed'`. This is the only fact that closes an order.
  - Q3 In the same transaction, exactly one `OrderClosed { orderId, buyerId, businessId, totalCop, lines, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }` (subscribers `commission` and `collections`), and `audit('orders.fact.itemReceived', Order:id)`. `lines`:
    - a card or sealed listing → one line with the snapshot's `unitPriceCop`;
    - a bundle → one line per component, with `qty = perBundleQty × order qty` and no `unitPriceCop` (AD-ORD-2 rule 5).
  - Q4 The decision cites `{ rule: 'FR-ORD-5', inputs: { orderId, buyerItemReceivedConfirmedAt } }`.
  - Q-fail On 0 rows: re-read and P1–P5, with zero writes except a materialized expiry. The order never creates a collection entry (FR-ORD-5).
- **Invariant (I):**
  - I1 `buyerItemReceivedConfirmedAt ≥ buyerPaidConfirmedAt` whenever it is set. Bound to: AD-ORD-2, AD-2; `CHECK ("buyerItemReceivedConfirmedAt" IS NULL OR "buyerItemReceivedConfirmedAt" >= "buyerPaidConfirmedAt")`.
  - I2 At most one `OrderClosed` per order. Bound to: AD-ORD-2 rule 5.
  - I3 "Completed purchase" means this fact, never "paid". Bound to: AD-2, AD-ORD-3 rule 4.
- **Concurrency / idempotency:** a double confirmation → one fact, one event, one `OrderAlreadyConfirmedByRole`. Item before paid → `OrderConfirmationOutOfOrder`, with zero writes (NFR-ORD-1). A 2-of-3-card bundle closes with 3 lines of `qty = 2`.
- **Time:** `Clock`, once.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

---

## 7. COM — Commission Ledger & Purchasability (`commission`)

### Operation: `applyOrderDeduction(tx: Tx, event: { type: 'OrderPaymentConfirmedByBusiness' | 'OrderClosed'; orderId; businessId; totalCop: Cop; sellerReceivedConfirmedAt: Instant | null; buyerItemReceivedConfirmedAt: Instant | null }, now: Instant): Promise<{ outcome: 'charged'; amountCop: Cop; balanceAfter: SignedCop; ledgerSeq: number; crossing: 'exhausted' | null } | { outcome: 'duplicate' }>`

*COM-1 · R, MEC · FR-COM-4, FR-COM-5, FR-COM-6 · NFR-COM-1..4. Subscribers `onOrderPaymentConfirmedByBusiness` and `onOrderClosed`, in the delivery's handler transaction. MEC (NFR-COM-1): two orders owing 3,600 each, confirmed at one instant against a balance of 5,000, plus a duplicate delivery → each order charged once, final balance −2,200, `Exhausted` published once.*

- **Layer:** Inbound Port (subscriber).
- **Precondition (P):**
  - P1 `tx` holds this subscriber's `"EventDelivery"` row (position 0). Violation: `'Unexpected'`.
  - P2 At least one of the two fact instants is non-null. Violation: `'Unexpected'`.
  - P3 A `"CommissionAccount"` exists for `businessId`. Violation: `'Unexpected'`. The delivery is marked `failed` and becomes replayable once the account exists (AD-COM-1 rule 1).
- **Postcondition (Q):**
  - Q1 `{ commissionTriggeredAt, trigger } = commissionTrigger(facts)`: the earlier non-null fact, and `businessConfirmed` on a tie (AD-SYS-3 rule 2). `rateBps` comes from the `"CommissionRateSetting"` with the greatest `"effectiveFrom" ≤ commissionTriggeredAt`. `c = floor((totalCop × rateBps + 5000) / 10000)` in BigInt (ADD-§2.6).
  - Q2 When `SELECT 1 FROM "CommissionLedgerEntry" WHERE "orderId"=:o AND kind='Deduction'` finds a row, the function returns `duplicate` with zero writes. Otherwise:
    1. `SAVEPOINT apply_deduction`;
    2. `UPDATE "CommissionAccount" SET "balanceCop" = "balanceCop" − :c, "ledgerSeq" = "ledgerSeq" + 1, state = CASE WHEN "balanceCop" − :c > 0 THEN 'Funded' ELSE 'Exhausted' END, "updatedAt"=:now, version = version + 1 WHERE "businessId"=:b RETURNING "balanceCop", "ledgerSeq"`;
    3. `INSERT "CommissionLedgerEntry" (kind 'Deduction', "amountCop" c, "orderId", "rateBps", "baseCop", trigger, "commissionTriggeredAt", seq, "balanceAfter", "createdAt") ON CONFLICT ("orderId") WHERE kind='Deduction' DO NOTHING RETURNING id`.

    When the insert returns no row (a concurrent delivery won): `ROLLBACK TO SAVEPOINT`, return `duplicate`. `tx` stays open, so the delivery row still becomes `delivered` (Solu-1 review F-03).
  - Q3 A crossing from `> 0` to `≤ 0` enqueues `CommissionBalanceExhausted { businessId, ledgerSeq, balanceAfter }` (subscriber `listings`). Audit: `audit('commission.deduction.applied', CommissionLedgerEntry:id)`, `actorKind='system'`, only on `charged`.
  - Q4 The ledger line is the explanation: `{ rule: 'FR-COM-5', inputs: { orderId, baseCop: totalCop, rateBps, amountCop, trigger, commissionTriggeredAt } }`. A `buyerClosed` trigger cites FR-COM-4's support link.
  - Q-fail A throw rolls back the handler transaction, and the delivery is recorded `failed` with its registry code (AD-SYS-2 rule 4 step 3). A deduction is never refused, and the balance may go negative (AD-19).
- **Invariant (I):**
  - I1 At most one `Deduction` per `orderId`. Bound to: AD-COM-2, AD-SYS-3; partial unique `("orderId") WHERE kind='Deduction'`.
  - I2 `balanceCop = Σ TopUp − Σ Deduction`, and each business's `seq` values are exactly `1..ledgerSeq`. Bound to: AD-COM-1 rules 1, 2 and 4; `UNIQUE ("businessId", seq)`.
  - I3 The rounding rule is enforced in storage: `CHECK ("amountCop" = ("baseCop" * "rateBps" + 5000) / 10000)` on deductions. Bound to: AD-SYS-7, AD-COM-2 rule 1.
  - I4 The values never depend on which event arrived first. Bound to: AD-SYS-3 rule 1.
- **Concurrency / idempotency:**
  - NFR-COM-1, 100 repetitions: two orders and one duplicate → 2 entries, balance −2,200, one `Exhausted`, 0 `Replenished`.
  - `OrderPaymentConfirmedByBusiness` and `OrderClosed` delivered concurrently for one order → 1 entry and 1 decrement.
  - Each event delivered 3 times → one effect.
- **Time:** `Clock`, once, for `"createdAt"`. The **rate** is chosen by `commissionTriggeredAt` (a fact), never by `now`, so processing time cannot change the amount.
- **Latency budget (NFR):** p95 ≤ 200 ms at N = 1 for the handler (NFR-COM-3).

### Operation: `confirmTopUp(topUpRequestId: CuidId, adminId: CuidId, now: Instant): Promise<{ topUpRequestId; status: 'Confirmed'; balanceAfter: SignedCop; ledgerSeq: number; resumed: boolean; neededToResumeCop: Cop | null; decision: Decision }>`

*COM-2 · R · FR-COM-3, FR-COM-6 · NFR-COM-3. `commission.admin.confirmTopUp`, the V1 adapter of `TopUpConfirmationPort` (AD-COM-3 rule 1). Contenders: two admins, a double click, a later v2 webhook calling the same command.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 The caller is an admin. Violation: `AdminOnly` (HTTP 403, identity).
  - P2 The request exists. Violation: `TopUpNotFound` (HTTP 404, commission).
  - P3 `status = 'Pending'`. Violation: `TopUpNotPending` (HTTP 409, commission), citing `{ status, decidedBy, decidedAt }`.
  - P4 The business's `"CommissionAccount"` exists. This is guaranteed, because `requestTopUp` refuses with `CommissionAccountNotOpen` before the account exists (refinement R-7 as amended, C-GAP-3). Violation: `'Unexpected'`, an invariant breach.
- **Postcondition (Q):**
  - Q1 One transaction:
    1. `UPDATE "TopUpRequest" SET status='Confirmed', "decidedBy"=:adminId, "decidedAt"=:now, "updatedAt"=:now, version=version+1 WHERE id=:id AND status='Pending' RETURNING "businessId", "amountCop"`;
    2. `LedgerService.apply(tx, +amountCop)`: the atomic account `UPDATE … RETURNING`, and `INSERT "CommissionLedgerEntry" (kind 'TopUp', "topUpRequestId", seq, "balanceAfter")`;
    3. `INSERT "TopUpDecisionLog"`.
  - Q2 Returns `resumed = (before ≤ 0 AND after > 0)`, and `neededToResumeCop = 1 − balanceAfter` when `balanceAfter ≤ 0`, else `null` (AD-COM-3 rule 3).
  - Q3 A crossing from `≤ 0` to `> 0` enqueues `CommissionBalanceReplenished { businessId, ledgerSeq, balanceAfter }` (subscriber `listings`). Audit: `audit('commission.topUp.confirmed', TopUpRequest:id)`, `actorKind='admin'`.
  - Q4 The decision cites `{ rule: 'FR-COM-3', inputs: { topUpRequestId, amountCop, balanceAfter, resumed, neededToResumeCop } }`. Example: confirming 20,000 on a balance of −25,000 gives `balanceAfter = −5,000`, `resumed = false`, `neededToResumeCop = 5,001`.
  - Q-fail On 0 rows (the race loser): re-read, then `TopUpNotPending`, citing the winner. No ledger, log, audit row or event is written.
- **Invariant (I):**
  - I1 A top-up is credited at most once. Bound to: AD-COM-3 rule 2; unique `("topUpRequestId") WHERE kind='TopUp'`, and `WHERE status='Pending'`.
  - I2 `CommissionBalanceReplenished` is published exactly once per crossing from `≤ 0` to `> 0`. Bound to: AD-COM-1 rule 3.
  - I3 `amountCop` is in 20,000–10,000,000. Bound to: AD-COM-3; `CHECK ("amountCop" BETWEEN 20000 AND 10000000)`.
- **Concurrency / idempotency:** two admins confirming at once → one credit, one log row, one `TopUpNotPending` (50 × 100). Confirm racing a deduction on the same account → the account row lock serializes them, and `seq` stays gapless.
- **Time:** `Clock`, once.
- **Latency budget (NFR):** p95 ≤ 800 ms at N = 1 (NFR-COM-3).

### Operation: `reconcile(businessId: CuidId | null, actor: { kind: 'admin'; adminId: CuidId } | { kind: 'job' }, now: Instant): Promise<{ runId: CuidId; accountsChecked: number; discrepancies: Discrepancy[]; decision: Decision } | { skipped: 'runInProgress' }>`

*COM-3 · E · FR-COM-8 · NFR-COM-2. `commission.reconcile` (page 7.4, admin) and the `commission-reconcile` job (`daily-night`).*

`Discrepancy = { businessId; kind: 'balanceMismatch' | 'seqGap'; expected: string; actual: string }`. The values are decimal strings, so `bigint` sums never lose precision.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 Admin path: the caller is an admin. Violation: `AdminOnly` (HTTP 403, identity). Job path: the `JOBS_SECRET` bearer matches. Otherwise the job route returns 401 and writes no `JobRun` row (S-9).
  - P2 Job path: `pg_try_advisory_xact_lock(job:commission-reconcile)` is acquired. If not, the call is a no-op returning `{ skipped: 'runInProgress' }` (AD-SYS-4 rule 7).
- **Postcondition (Q):**
  - Q1 For each account in scope (one, or all in ascending `businessId`), in its own transaction: `SELECT … FROM "CommissionAccount" WHERE "businessId"=:b FOR SHARE`, then `Σ` over the ledger, then the `seq` set. The share lock blocks a concurrent `apply` until the read ends, so a commit between the two reads cannot produce a false discrepancy.
  - Q2 One `INSERT "ReconciliationRun" { scope, accountsChecked, discrepancies, createdAt: now }`. Nothing else is written. **Reconcile never repairs.**
  - Q3 Audit: `audit('commission.reconcile.ran', ReconciliationRun:id)`, with `actorKind` `admin` or `system`. No event.
  - Q4 Explanation:
    - each discrepancy cites `{ rule: 'FR-COM-8', inputs: { businessId, expected, actual } }`;
    - 0 discrepancies → decision `allowed`, citing `{ accountsChecked, discrepancies: 0 }`;
    - an unknown `businessId` → `accountsChecked: 0` with `allowedWithNotice`, citing `{ businessId, accountFound: false }`. It is not an error: `commission` cannot raise an identity code (AD-SYS-1 rule 2).
  - Q-fail A throw rolls back the run row. Accounts are read-only, so nothing else can change.
- **Invariant (I):**
  - I1 After the seed and every suite, reconciliation reports 0 discrepancies. Bound to: AD-COM-1 rule 4, AD-19 (NFR-COM-2: 10,000 random top-ups and deductions with 20 % duplicate deliveries → difference 0).
  - I2 `"CommissionAccount"`, `"CommissionLedgerEntry"` and `"TopUpRequest"` are never written by reconcile. Bound to: AD-COM-1.
- **Concurrency / idempotency:** two admin runs at once → two run rows with equal results over unchanged data. Two job runs → one runs and one is skipped. A run concurrent with deductions → no false discrepancy (Q1).
- **Time:** `Clock`, once per run.
- **Latency budget (NFR):** the single-account admin call is a command, p95 ≤ 800 ms at N = 1 (NFR-SYS-9). The all-accounts job has no PRD latency target; it is bounded by the job's 50 s batch rule (AD-ORD-2 rule 7 pattern) and resumes on the next run.

---

## 8. TRD — Trade Offer Negotiation (`trading`)

### Operation: `acceptOffer(offerId: CuidId, expectedVersion: number, sellerId: CuidId, now: Instant): Promise<{ offerId; status: 'Accepted'; reservationRef: ReservationRef; unfulfillableOfferIds: CuidId[]; handoff: ContactMessageDTO | null; decision: Decision }>`

*TRD-1 · R, MEC · FR-TRD-4, FR-TRD-5, FR-TRD-6 · NFR-TRD-1..3. `trading.accept`. MEC (NFR-TRD-1): two `Open` offers for the last unit, accepted from two sessions at once → one `Accepted` and one `Unfulfillable`.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 Visible to the actor. Violation: `TradeOfferNotVisibleToCaller` (HTTP 403, trading), with an identical body for an unknown id.
  - P2 `status='Open'` and `expiresAt > now`. Violation: `TradeOfferNotOpen` (HTTP 409, trading), citing the derived status.
  - P3 `turn = 'seller'` and the actor is the seller. Violation: `NotYourTurn` (HTTP 409, trading), citing `{ turn }`.
  - P4 `version = expectedVersion`; the value comes from the rendered offer (refinement R-6). Violation: `TradeOfferNotOpen` (HTTP 409, trading), citing the latest round.
  - P5 `listings.getTradeability(listingId)` allows it in the ambient `tx`. Violation: `ListingNotOpenToTrade` (HTTP 409, listings) or `ListingNotFound` (HTTP 404, listings), propagated.
  - P6 `listings.reserveForTrade(tx, listingId, 1)` succeeds. Violation: `InsufficientQuantity` (HTTP 409, listings), propagated.
- **Postcondition (Q):**
  - Q1 One transaction, in lock order:
    1. `pg_advisory_xact_lock(trd:seller:<sellerId>)`;
    2. `UPDATE "TradeOffer" SET status='Accepted', "acceptedAt"=:now, "updatedAt"=:now, version=version+1 WHERE id AND status='Open' AND turn='seller' AND version=:expectedVersion AND "expiresAt" > :now`;
    3. P5;
    4. P6;
    5. store `"reservationRef"`, and insert the round `accept`;
    6. `UPDATE … SET status='Unfulfillable', "unfulfillableReason"='ListingNoLongerAvailable' WHERE "listingId" = ANY(:exhaustedListingIds) AND status='Open' AND id <> :offerId`, with one `markedUnfulfillable` round each (`"roundCount"` unchanged, Solu-1 review E-10);
    7. enqueue `TradeAccepted { tradeOfferId, listingId, sellerId, proposerId, terms, acceptedAt }`, with no `EventDelivery` row (no V1 subscriber).
  - Q2 After commit, exactly one `listings.generateContactMessage({ kind: 'trade', listingId, requesterId: proposerId, tradeSummary })`, returned as `handoff`. If it throws, the accept stays committed and `handoff = null`; page 8.2 regenerates it (Solu-1 review F-14).
  - Q3 Audit: `audit('trading.offer.accepted', TradeOffer:id)`, plus `audit('trading.offer.unfulfillable', …)` per sibling.
  - Q4 The decision cites `{ rule: 'FR-TRD-4', inputs: { offerId, listingId, reservedQty: 1 } }`. Each sibling cites `ListingNoLongerAvailable`.
  - Q-fail At P5 or P6, `tx` rolls back. A follow-up transaction takes the same lock and marks the own offer `Unfulfillable` (a no-op if already marked), then rethrows the original error (AD-TRD-2 rule 3). No reservation, event or accept round exists.
- **Invariant (I):**
  - I1 Two accepts on the same last unit never both commit. Bound to: AD-TRD-2 rules 1 and 4, AD-6.
  - I2 After an accept, no `Open` offer remains on an exhausted listing. Bound to: AD-TRD-2 rule 2 step 6.
  - I3 Only `Accepted` or `Cancelled` offers carry a reservation. Bound to: AD-TRD-3; `CHECK (status IN ('Accepted','Cancelled') OR "reservationRef" IS NULL)`.
- **Concurrency / idempotency:**
  - NFR-TRD-1, 100 repetitions → 1 `Accepted`, 1 `Unfulfillable` (its request gets `InsufficientQuantity` or `TradeOfferNotOpen`), quantity 0, one `TradeAccepted`, one handoff.
  - The sibling variant (an individual listing and a bundle sharing the last unit) → the same outcomes, with 0 deadlocks.
- **Time:** `Clock`, once. An offer is open only while `now < expiresAt`.
- **Latency budget (NFR):** p95 ≤ 800 ms at N = 1 (NFR-TRD-2).

### Operation: `counterOffer(offerId: CuidId, terms: TradeTerms, expectedVersion: number, actorId: CuidId, now: Instant): Promise<{ offerId; version: number; turn: 'proposer' | 'seller'; roundCount: number; decision: Decision }>`

*TRD-2 · R, E · FR-TRD-2, FR-TRD-1 (term validation) · EC-11, G-1. `trading.counter`.*

`TradeTerms = { offeredItems: { itemRef: CuidId; condition: Condition; qty: 1..4 }[] (0–10); cashCop: Cop (0–100,000,000); requestedQty: 1 }`.

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 Visible to the actor. Violation: `TradeOfferNotVisibleToCaller` (HTTP 403, trading).
  - P2 The terms are not empty (some items or `cashCop > 0`). Violation: `EmptyTradeOffer` (HTTP 400, trading).
  - P3 Every `itemRef` resolves through `listings.resolveItemRefs` (OQ-6). Violation: `InvalidItemRef` (HTTP 400, listings), propagated.
  - P4 `status='Open'` and `expiresAt > now`. Violation: `TradeOfferNotOpen` (HTTP 409, trading).
  - P5 `turn` = the actor's role. Violation: `NotYourTurn` (HTTP 409, trading), citing `{ turn }`.
  - P6 `version = expectedVersion`. Violation: `TradeOfferNotOpen` (HTTP 409, trading), citing the latest round (a stale tab).
  - P7 `roundCount < 10`. Violation: `TradeRoundLimitReached` (HTTP 409, trading), citing `{ roundCount: 10 }`.
  - P8 The canonical terms (item multiset sorted by `(itemRef, condition, qty)`, plus `cashCop`) differ from the latest round's. Violation: `TradeCounterUnchanged` (HTTP 409, trading), citing `{ round }`.
- **Postcondition (Q):**
  - Q1 Under `pg_advisory_xact_lock(trd:seller:<sellerId>)`: read the latest round (P8), then `UPDATE "TradeOffer" SET terms=:terms, turn=<other>, "roundCount"="roundCount"+1, "updatedAt"=:now, version=version+1 WHERE id AND status='Open' AND turn=:role AND version=:expectedVersion AND "expiresAt" > :now AND "roundCount" < 10 RETURNING version, turn, "roundCount"`.
  - Q2 Inserts `"TradeOfferRound" { offerId, round: roundCount, actor: role, action: 'counter', terms, createdAt: now }`.
  - Q3 Audit: `audit('trading.offer.countered', TradeOffer:id)`. No event.
  - Q4 The decision cites `{ rule: 'FR-TRD-2', inputs: { offerId, round, turn } }`. Every refusal cites its rule with the observed `turn`, `status`, `version` or `roundCount`.
  - Q-fail On 0 rows, the re-read maps the state to P4–P7. No round, audit row or terms change is written.
- **Invariant (I):**
  - I1 Rounds are immutable: `"TradeOfferRound"` has `UPDATE` and `DELETE` revoked, `PK (offerId, round)`. Bound to: AD-TRD-1 rule 4.
  - I2 `1 ≤ roundCount ≤ 10`. Bound to: AD-TRD-1 rule 3; `CHECK ("roundCount" BETWEEN 1 AND 10)`.
  - I3 Only the turn holder changes the terms, and each counter flips the turn exactly once. Bound to: AD-TRD-1 rule 1, AD-SYS-5.
- **Concurrency / idempotency:** two tabs of the same party countering with the same `expectedVersion` → one round, and the other gets `TradeOfferNotOpen` (stale). A counter racing the proposer's withdraw → exactly one of them applies. A repeated identical counter after success → `NotYourTurn`.
- **Time:** `Clock`, once. Open only while `now < expiresAt`.
- **Latency budget (NFR):** p95 ≤ 500 ms at N = 1 (NFR-TRD-2).

### Operation: `cancelTrade(offerId: CuidId, actorId: CuidId, now: Instant): Promise<{ offerId; status: 'Cancelled'; cancelledBy: CuidId; decision: Decision }>`

*TRD-3 · R · FR-TRD-8. `trading.cancel`: an `Accepted` trade cancelled before either party confirms completion. The R slot is "release exactly once" under a double submit.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 Visible to the actor, the proposer or the seller. Violation: `TradeOfferNotVisibleToCaller` (HTTP 403, trading).
  - P2 `status='Accepted'` and neither `"proposerConfirmedAt"` nor `"sellerConfirmedAt"` is set. Violation: `TradeNotCancellable` (HTTP 409, trading), citing `{ status, proposerConfirmedAt, sellerConfirmedAt }`.
- **Postcondition (Q):**
  - Q1 Under `trd:seller`: `UPDATE "TradeOffer" SET status='Cancelled', "cancelledBy"=:actorId, "cancelledAt"=:now, "updatedAt"=:now, version=version+1 WHERE id AND status='Accepted' AND "proposerConfirmedAt" IS NULL AND "sellerConfirmedAt" IS NULL RETURNING "reservationRef"`. On 1 row it calls `listings.releaseReservation(tx, ref)`, which increments the same units in ascending id order.
  - Q2 Inserts the round `cancel`. The other party sees who cancelled (FR-TRD-8).
  - Q3 Audit: `audit('trading.offer.cancelled', TradeOffer:id)`. No event.
  - Q4 The decision cites `{ rule: 'FR-TRD-8', inputs: { offerId, cancelledBy, releasedQty } }`.
  - Q-fail On 0 rows: `TradeNotCancellable`, with zero writes. The reservation is untouched.
- **Invariant (I):**
  - I1 A reservation is released exactly once. Bound to: AD-TRD-3 rule 3, AD-INV-2 rule 6.
  - I2 A cancelled trade keeps its `reservationRef` for audit, but its units are released. Bound to: AD-TRD-3; the reservation CHECK of TRD-1 I3.
- **Concurrency / idempotency:** a double submit, or both parties cancelling at once → one `Cancelled` and one release (quantity restored exactly once), and the other gets `TradeNotCancellable`. Cancel racing `confirmCompletion` → either cancelled with the release, or confirmed with `TradeNotCancellable`, never both.
- **Time:** `Clock`, once. Accepted trades do not expire (AD-TRD-3 trade-off).
- **Latency budget (NFR):** p95 ≤ 500 ms at N = 1 (NFR-TRD-2).

---

## 9. MSG — Contact Handoff & In-App Business Messaging (`listings` contact, `messaging` in-app)

### Operation: `sendMessage(target: { recipientId: CuidId } | { conversationId: CuidId }, body: string, clientMessageId: string, senderId: CuidId, now: Instant): Promise<{ conversationId; messageId; seq: number; decision: Decision }>`

*MSG-1 · R · FR-MSG-5, FR-MSG-6 · NFR-MSG-2. `messaging.send`. Contenders: a network retry with the same `clientMessageId`; two first messages that both start a conversation; concurrent sends in one conversation.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 `canBuy`. Violation: `EmailNotVerified` (HTTP 403, identity).
  - P2 `body` has 1–2,000 characters after NFC, and `clientMessageId` has 1–64 characters of `[A-Za-z0-9_-]` (Solu-1 GAP-3). Exactly one of `recipientId` / `conversationId` is present (two `.strict()` objects, Solu-1 review E-21). Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel).
  - P3 With `conversationId`: the actor is a participant. Violation: `ConversationNotVisibleToCaller` (HTTP 403, messaging).
  - P4 Start path: the sender's `sellerKind ≠ 'business'`. Violation: `BusinessCannotInitiate` (HTTP 409, messaging).
  - P5 `requireMessagingEligibility` (MSG-3) allows it, as read in the send transaction:
    - buyer sending → the business's status;
    - business replying → its own status.

    Violation: `NotBusinessAccount` (HTTP 409, identity), propagated. The response carries the composed `body` back so the user can copy it (FR-MSG-6).
- **Postcondition (Q):**
  - Q1 Start path: `INSERT "Conversation" … ON CONFLICT ("buyerId", "businessId") DO NOTHING`, then select it, then the two participant rows `ON CONFLICT DO NOTHING`.
  - Q2 `UPDATE "Conversation" SET "lastSeq" = "lastSeq" + 1, "lastMessageAt" = :now, "updatedAt" = :now WHERE id RETURNING "lastSeq"`. Then `SAVEPOINT send_insert` and `INSERT "Message" { senderId, body, clientMessageId, seq, "recipientVerificationAtSend", "createdAt": now }`. Returns `{ conversationId, messageId, seq, decision }`.
  - Q3 Audit: `audit('messaging.message.sent', Message:id)`. The audit `data` holds ids and `seq`, never the body (AD-SYS-8 rule 3). No event.
  - Q4 The decision is `allowed`, or `allowedWithNotice` with `RecipientNotYetVerified` (a `Pending` business), citing `{ rule: 'FR-MSG-4', inputs: { recipientStatus } }`.
  - Q-fail **Retry:** a `23505` on `UNIQUE ("conversationId", "senderId", "clientMessageId")` → `ROLLBACK TO SAVEPOINT`, then `ROLLBACK` (the `lastSeq` increment is undone). A new read returns the original message: net zero writes, and `25P02` never occurs (Solu-1 review F-16). Every refusal → zero writes.
- **Invariant (I):**
  - I1 One conversation per `(buyerId, businessId)`. Bound to: AD-MSG-2 rule 1; `UNIQUE`.
  - I2 `seq` is unique and gapless per conversation. Bound to: AD-MSG-2 rule 3; `UNIQUE ("conversationId", seq)`.
  - I3 One `clientMessageId` per sender and conversation gives exactly one message. Bound to: AD-MSG-2 rule 4; `UNIQUE ("conversationId", "senderId", "clientMessageId")`.
  - I4 No admin procedure selects `"Message".body`. Bound to: AD-MSG-3 rule 5, AD-SYS-8 rule 3.
- **Concurrency / idempotency:** two first messages → one conversation. N concurrent sends in one conversation → `seq` values `1..N` with no gap. A retry with the same `clientMessageId` → the original message is returned, and the row count is unchanged (50 × 100).
- **Time:** `Clock`, once. Eligibility is evaluated at send time, never at conversation start (AD-MSG-2 rule 2).
- **Latency budget (NFR):** send p95 ≤ 500 ms at N = 1 (NFR-MSG-2).

### Operation: `generateContactMessage(input: { kind: 'purchase' | 'trade'; listingId: CuidId; requesterId: CuidId; tradeSummary: TradeSummary | null }, ipHmac: string | null, now: Instant): Promise<ContactMessageDTO>`

*MSG-2 · E, MEC · FR-MSG-1, FR-MSG-2, FR-MSG-3, FR-TRD-6 · NFR-MSG-1, NFR-MSG-3, NFR-MSG-4. `inventory.contact` (`kind='purchase'`), and the `listings.generateContactMessage` port called by TRD-1 (`kind='trade'`). MEC: long, accented and emoji names; URL-like text; prices from 1,000 to 100,000,000.*

`ContactMessageDTO = { text: string; externalUrl: string; copyText: string; requesterDisplayName: string; decision: Decision }`. `externalUrl` carries the regulated phone, and this DTO is its only carrier.

- **Layer:** Inbound Port and Outbound Port.
- **Precondition (P)**, first-fail (AD-MSG-1 rule 2):
  - P1 `canBuy` for the requester. Violation: `EmailNotVerified` (HTTP 403, identity).
  - P2 The listing is visible: not hidden, withdrawn or deactivated. Violation: `ListingNotFound` (HTTP 404, listings).
  - P3 An individual-seller listing. Violation: `NotIndividualSellerListing` (HTTP 409, listings).
  - P4 `kind='purchase'` only. Under `pg_advisory_xact_lock(msg:contact:req:<requesterId>)`, then `msg:contact:ip:<ipHmac>` in that fixed order, the counted rows are below:
    - 30 per requester in `[now − 1 h, now)`;
    - 10 per requester and seller in `[now − 24 h, now)`;
    - 60 per IP in `[now − 1 h, now)`.

    Violation: `ContactRateLimited` (HTTP 429, listings), citing `{ retryAt }` = the oldest counted row + its window.
- **Postcondition (Q):**
  - Q1 The pure composer NFC-normalizes, fills the es-CO template, percent-encodes per RFC 3986, and truncates in the FR-MSG-2 order until `externalUrl.length ≤ 2000`:
    1. the product name, down to 20 graphemes;
    2. offered item names, longest first, down to 20;
    3. trailing items collapse into "+N más".

    Prices, cash, conditions, quantities, the seller name and `copyText` are never truncated. `externalUrl = https://wa.me/<E.164 without +>?text=<encoded>`.
  - Q2 For `kind='purchase'`: one `"ContactRequestLog" { listingId, sellerId, ipHmac, kind, counted, createdAt: now }` row. `counted=false` for a repeat of the same `(requesterId, listingId)` within 60 min (EC-36). For `kind='trade'`: no limiter and no log row (EC-37).
  - Q3 No event and no audit row: contact generation changes no domain state, and the log row is its record. The phone is read through `identity.getContactCard` and is never logged.
  - Q4 The decision cites `{ rule: 'FR-MSG-2', inputs: { truncated: boolean, truncationSteps: string[], urlLength } }`.
  - Q-fail Any refusal → zero writes, and the phone is never read.
- **Invariant (I):**
  - I1 Equal inputs give byte-identical outputs (1 distinct output over 1,000 runs). Bound to: AD-MSG-1 rule 4 (NFR-MSG-1).
  - I2 `externalUrl ≤ 2000` characters and round-trip-decodes to the exact UTF-8 text (no broken surrogate pair). Bound to: AD-MSG-1 rules 4–5 (NFR-MSG-4).
  - I3 The platform makes 0 outbound requests to the messaging app. Bound to: AD-MSG-1 rule 5, AD-SYS-6 rule 3 (NFR-MSG-3).
  - I4 The phone appears only in `externalUrl`. Bound to: AD-SYS-8 rules 3–4.
- **Concurrency / idempotency:** 50 concurrent requests by one requester → exactly 30 allowed in the hour and 20 `ContactRateLimited` (S-6). The fixed lock order means 0 deadlocks.
- **Time:** `Clock`, once. The windows are half-open `[now − w, now)`.
- **Latency budget (NFR):** p95 ≤ 200 ms at N = 1 (NFR-MSG-1).

### Operation: `requireMessagingEligibility(businessId: CuidId): Promise<{ status: 'Approved' | 'Pending'; verified: boolean; decision: Decision }>`

*MSG-3 · E, MEC · FR-MSG-4, FR-MSG-6, FR-IDN-6 · NFR-MSG-4 (compose → send race). The throwing projection of `identity.getMessagingEligibility`, so that only `identity` constructs `NotBusinessAccount` (Solu-1 review F-02). MEC: the verified state changes between compose and send.*

- **Layer:** Outbound Port (offered by `identity`, consumed by `messaging`).
- **Precondition (P):**
  - P1 `businessId` is a `CuidId`. A missing row is not an error; it falls to Q-fail.
- **Postcondition (Q):**
  - Q1 From one `deriveCapabilities(facts)` read:
    - `Approved` → `{ status: 'Approved', verified: true }`, with decision `allowed`;
    - `Pending` → `{ status: 'Pending', verified: false }`, with decision `allowedWithNotice` and `RecipientNotYetVerified`.
  - Q2 Zero writes.
  - Q3 No event and no audit.
  - Q4 The decision cites `{ rule: 'FR-IDN-6', inputs: { businessId, status } }`.
  - Q-fail Any other state (a `Rejected` business, an individual seller, a buyer, an unknown id) → `NotBusinessAccount` (HTTP 409, identity), citing `{ status }`, with an identical body for an unknown id.
- **Invariant (I):**
  - I1 It is computed from current facts on every call, with no cache. Bound to: AD-IDN-1 rule 4, AD-MSG-2 rule 2.
  - I2 An observed `Approved → Pending` is logged as an invariant breach and answered as `Pending`. Bound to: AD-MSG-2 rule 5.
- **Concurrency / idempotency:** a read. **MEC:** the business is rejected after the buyer composed and before the send commits → the send's in-transaction read sees `Rejected` → `NotBusinessAccount`, with the composed text returned for copying and zero writes. `Pending → Approved` in the same gap → `allowed` with no notice. Both hold in 100/100 repetitions (NFR-MSG-4).
- **Time:** none. Status is not time-based.
- **Latency budget (NFR):** inside MSG-1's send budget, p95 ≤ 500 ms (NFR-MSG-2).

---

## 10. COL — Collection, Binder & Wishlist Manager (`collections`)

### Operation: `acceptPrompt(promptId: CuidId, collectionId: CuidId, actorId: CuidId, now: Instant): Promise<{ promptId; status: 'Accepted'; entryIds: CuidId[]; decision: Decision }>`

*COL-1 · R, MEC · FR-COL-7 · NFR-COL-1. `collections.prompts.accept`. MEC: `OrderClosed` is delivered twice, then the prompt is accepted twice at once → one prompt and one entry set.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 The prompt exists with `"buyerId" = actorId`. Violation: `PromptNotFound` (HTTP 404, collections), with an identical body for a foreign prompt (Solu-1 GAP-1).
  - P2 `status = 'Pending'`. Violation: `PromptAlreadyResolved` (HTTP 409, collections), citing `{ status, resolvedAt }`.
  - P3 The collection exists and is owned by the actor (`FOR SHARE`). Violation: `CollectionNotFound` (HTTP 404, collections). The transaction rolls back, so **the prompt stays `Pending`** and can be accepted into another collection (review G-15).
- **Postcondition (Q):**
  - Q1 The first statement is `pg_advisory_xact_lock(col:owner:<actorId>)`, which serializes every `"manualPosition"` assignment for the owner (Solu-1 review F-13).
  - Q2 `UPDATE "PostPurchasePrompt" SET status='Accepted', "resolvedAt"=:now, "acceptedIntoCollectionId"=:c, "updatedAt"=:now, version=version+1 WHERE id AND "buyerId"=:actorId AND status='Pending' RETURNING lines, "orderId", "buyerItemReceivedConfirmedAt"`. Then P3. Then one `"CollectionEntry"` per line, each with:
    - `"cardKind"='catalog'`, `source='PlatformPurchase'`, `"orderId"`, `qty`;
    - `"acquiredAt"` = the Bogotá date of `"buyerItemReceivedConfirmedAt"`;
    - `"acquiredPriceCop" = line.unitPriceCop ?? NULL`;
    - `"manualPosition"` = max + 1, + 2, …

    Returns the entry ids.
  - Q3 Audit: `audit('collections.prompt.accepted', PostPurchasePrompt:id)`. No event. `orders` tables are never read.
  - Q4 The decision cites `{ rule: 'FR-COL-7', inputs: { promptId, orderId, entryCount } }`.
  - Q-fail On 0 rows: re-read and P1–P2, with zero writes.
- **Invariant (I):**
  - I1 At most one prompt per `orderId`, and a prompt leaves `Pending` at most once, so its entries are inserted at most once. Bound to: AD-COL-2, AD-SYS-5; `UNIQUE "orderId"` and `WHERE status='Pending'`.
  - I2 `source='PlatformPurchase'` ⇔ `"orderId" IS NOT NULL`. Bound to: AD-COL-1; CHECK.
- **Concurrency / idempotency:** NFR-COL-1, 100 repetitions → 1 prompt, 1 entry per line, and the second accept gets `PromptAlreadyResolved`.
- **Time:** `Clock`, once. `acquiredAt` is derived from the stored close fact, not from `now` (decision log Plan-2 #45).
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `onOrderClosed(tx: Tx, event: OrderClosedPayload, now: Instant): Promise<{ created: boolean; promptId: CuidId }>`

*COL-2 · R · FR-COL-7 · NFR-COL-1 (first half). The subscriber `collections.onOrderClosed` under the AD-SYS-2 attempt procedure. Contenders: redelivery, the sweeper, a replay.*

- **Layer:** Inbound Port (subscriber).
- **Precondition (P):**
  - P1 `tx` holds this subscriber's `"EventDelivery"` row. Violation: `'Unexpected'`.
  - P2 The payload has `orderId`, `buyerId`, `lines` (≥ 1) and a non-null `buyerItemReceivedConfirmedAt`. Violation: `'Unexpected'`, and the delivery becomes `failed`.
- **Postcondition (Q):**
  - Q1 `INSERT "PostPurchasePrompt" (id, "orderId", "buyerId", lines, "buyerItemReceivedConfirmedAt", status 'Pending', "createdAt", "updatedAt") ON CONFLICT ("orderId") DO NOTHING RETURNING id`. It returns `{ created: true, promptId }` on insert, and otherwise selects the existing id and returns `{ created: false, promptId }`.
  - Q2 The prompt keeps the payload's lines and close fact. It never reads `"Order"` (AD-9).
  - Q3 Audit on insert only: `audit('collections.prompt.created', PostPurchasePrompt:id)`, `actorKind='system'`. No event.
  - Q4 The prompt's later rendering cites `{ rule: 'FR-COL-7', inputs: { orderId, lineCount } }`.
  - Q-fail A throw → the handler transaction rolls back, and the delivery is recorded `failed` (AD-SYS-2 rule 4 step 3).
- **Invariant (I):**
  - I1 Exactly one prompt per closed order. Bound to: AD-COL-2 rule 1; `UNIQUE ("orderId")`.
  - I2 `collections` never reads or writes `orders` tables. Bound to: AD-8, AD-9.
- **Concurrency / idempotency:** delivered twice, sequentially or concurrently, or replayed → 1 row (§7.1 rule 2).
- **Time:** `Clock`, once for `"createdAt"`. The close fact comes from the payload.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `addEntry(input: { collectionId: CuidId | null; catalogEntryId: CuidId; qty: number; acquiredAt: string /* YYYY-MM-DD */; acquiredPriceCop: Cop | null }, ownerId: CuidId, now: Instant): Promise<{ entryId; collectionId; createdGeneral: boolean; decision: Decision }>`

*COL-3 · E · FR-COL-2, FR-COL-1 (first use creates "General") · EC-07, EC-08. `collections.addEntry`.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 `qty` is 1–999, and `acquiredPriceCop` is null or 0–100,000,000. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel).
  - P2 `acquiredAt` ≤ the `America/Bogota` date of `now`. Violation: `InvalidAcquiredDate` (HTTP 400, collections), new code C-GAP-2 (§16), citing `{ acquiredAt, today }`. The parser cannot read the `Clock`, so this rule belongs to the owner (AD-SYS-1 rule 7).
  - P3 With a `collectionId`: the collection is owned by `ownerId`. Violation: `CollectionNotFound` (HTTP 404, collections), with an identical body for a foreign id.
  - P4 `catalog.getEntries([catalogEntryId])` reports it present. Violation: `InvalidCatalogEntry` (HTTP 400, collections), citing the id.
- **Postcondition (Q):**
  - Q1 Under `pg_advisory_xact_lock(col:owner:<ownerId>)`, with `collectionId = null` and an owner with 0 collections: `INSERT "Collection" (name 'General') ON CONFLICT ("ownerId", "nameKey") DO NOTHING`, then select it (`createdGeneral = true` on insert; AD-COL-1 rule 2). With `null` and ≥ 1 collection, it targets the owner's "General", creating it the same way if absent.
  - Q2 `INSERT "CollectionEntry" { "cardKind": 'catalog', "catalogEntryId", source: 'Manual', "orderId": NULL, qty, "acquiredAt", "acquiredPriceCop", "manualPosition": max + 1, "createdAt", "updatedAt" }`.
  - Q3 Audit: `audit('collections.entry.added', CollectionEntry:id)`. No event, and no `"CatalogEntry"` write (NFR-COL-3).
  - Q4 The decision cites `{ rule: 'FR-COL-2', inputs: { entryId, source: 'Manual', createdGeneral } }`.
  - Q-fail Any refusal → zero writes, including no "General" collection.
- **Invariant (I):**
  - I1 This path writes only `source='Manual'`; `PlatformPurchase` is reachable only through COL-1. Bound to: AD-COL-1; `CHECK ((source='PlatformPurchase') = ("orderId" IS NOT NULL))`.
  - I2 A catalog entry has a `catalogEntryId`, and an external one has a valid https URL and title. Bound to: AD-COL-1, AD-7; the tagged-union CHECKs.
  - I3 At most one "General" per owner. Bound to: AD-COL-1 rule 2; `UNIQUE ("ownerId", "nameKey")`.
- **Concurrency / idempotency:** two first-use adds at once → one "General", both entries in it, distinct `manualPosition` values. Not idempotent across retries: the same card may appear in several entries (FR-COL-2).
- **Time:** `Clock`, once. The future check compares calendar dates in `America/Bogota`; today itself is allowed.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

---

## 11. VAL — Collection Valuation & Trends (`collections`, no tables)

### Operation: `valueCollection(collectionId: CuidId, actorId: CuidId, now: Instant): Promise<ValuationDTO>`

*VAL-1 · MEC · FR-VAL-1, FR-VAL-3, FR-VAL-5 · NFR-VAL-1..3. `valuation.current`. MEC: a zero baseline, and rounding drift over 500 entries.*

`ValuationDTO = { totalCop: Cop; valuedCount: number; notValued: { entryId; reasonCode: 'ExternalEntryNotInCatalog' | 'NoReferencePrice' }[]; staleCount: number; asOf: Instant; conversionDriftBoundCop: Cop; decision: Decision }`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The collection is owned by the actor. Violation: `CollectionNotFound` (HTTP 404, collections).
- **Postcondition (Q):**
  - Q1 In one `REPEATABLE READ READ ONLY` transaction (Solu-1 GAP-2): read the entries, then call `catalog.getReferencePricesAsOf(ids, asOf = now)` in chunks of 500 through `db()`. Per entry:
    - external → `ExternalEntryNotInCatalog`;
    - no price → `NoReferencePrice`;
    - otherwise `cop × qty`, counted in `staleCount` when stale.
  - Q2 `totalCop` is the exact BigInt sum. `conversionDriftBoundCop = floor(Σ qty over fxDerived entries / 2)`, reported and never applied. A total above `Number.MAX_SAFE_INTEGER` → `'Unexpected'` through `assertSafeInteger` (Solu-1 review E-20).
  - Q3 Zero writes. No audit.
  - Q4 Every excluded entry carries its DecisionCode. The response decision cites `{ rule: 'FR-VAL-1', inputs: { valuedCount, notValuedCount, staleCount, conversionDriftBoundCop } }`.
  - Q-fail P1 → no read beyond the ownership check.
- **Invariant (I):**
  - I1 `totalCop = Σ (cop_i × qty_i)` exactly over valued entries, with no float, no listing price and no adjustment. Bound to: AD-VAL-1, AD-SYS-7.
  - I2 The input type accepts only `ReferencePrice`, and passing a listing `Cop` fails type-checking. Bound to: AD-VAL-1 rule 5 (FR-VAL-5).
- **Concurrency / idempotency:** equal `now` over equal committed data → byte-identical results. An observation or edit committed after the snapshot affects no chunk. **MEC:** for the 500-entry collection, `Σ entryValueCop == totalCop` and `|Σ fxDerived − convertOnce| ≤ conversionDriftBoundCop`, property-tested over 1,000 random collections (NFR-VAL-1). An empty collection → `totalCop = 0`, `valuedCount = 0`.
- **Time:** `Clock`, once (`asOf = now`). Staleness as in CAT-3.
- **Latency budget (NFR):** current value plus the 30-day trend for 500 entries, p95 ≤ 1,500 ms at N = 1 (NFR-VAL-2).

### Operation: `valuationTrend(collectionId: CuidId, period: 7 | 30 | 90 | 365, actorId: CuidId, now: Instant): Promise<ValuationTrendDTO>`

*VAL-2 · E · FR-VAL-2 · NFR-VAL-1 (zero baseline), NFR-VAL-3. `valuation.trend`.*

`ValuationTrendDTO = { period; start: Instant; asOf: Instant; valueAtStartCop: Cop; valueNowCop: Cop; changeCop: SignedCop; changePercentHundredths: number | null; marketChangePercentHundredths: number | null; label: 'current-cards-were-worth'; decision: Decision }`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 Owned collection. Violation: `CollectionNotFound` (HTTP 404, collections).
  - P2 `period ∈ {7, 30, 90, 365}`. Violation: `InvalidValuationPeriod` (HTTP 400, collections), citing `{ period }`.
- **Postcondition (Q):**
  - Q1 `start = now − period × 86,400 s`. `V(t)` values the **current** entries with `acquiredAt ≤ Bogotá date of t`, priced by `getReferencePricesAsOf(ids, t)`. Both `V(start)` and `V(now)` are read in one `REPEATABLE READ READ ONLY` transaction.
  - Q2 `changeCop = V(now) − V(start)`. When `V(start) > 0`: `changePercentHundredths = roundHalfAwayFromZero((V(now) − V(start)) × 10000, V(start))` in BigInt (AD-VAL-2 rule 3). `marketChangePercentHundredths` is the same formula over the entries with `acquiredAt ≤ start` (A-46).
  - Q3 Zero writes. No audit.
  - Q4 Explanation:
    - `V(start) = 0` → `changePercentHundredths = null` with `ValuationNoBaseline`, citing `{ rule: 'FR-VAL-2', inputs: { valueAtStartCop: 0, changeCop } }`; the UI shows `changeCop` and "Nuevo en este periodo";
    - every result carries the label "Lo que valían tus cartas actuales" (A-54).
  - Q-fail P1, P2 → nothing read beyond ownership.
- **Invariant (I):**
  - I1 There is no division by zero on any path, and never `NaN` or `Infinity`. Bound to: AD-VAL-2 rule 3, AD-SYS-7 rule 4.
  - I2 The result has symmetric rounding: `change(b, b + d) = −change(b, b − d)` whenever both are non-null. Bound to: AD-VAL-2 rule 3.
  - I3 0 floating-point operations on COP. Bound to: AD-SYS-7 rule 3 (NFR-VAL-3).
- **Concurrency / idempotency:** a snapshot read, deterministic for equal `now`. **MEC:** the empty, the all-unpriced and the all-new collections each give `null`, never `NaN` (NFR-VAL-1).
- **Time:** `Clock`, once. The baseline instant is inclusive: an observation with `observedAt ≤ start` counts.
- **Latency budget (NFR):** part of NFR-VAL-2: current plus the 30-day trend over 500 entries, p95 ≤ 1,500 ms at N = 1.

### Operation: `valuationHistory(collectionId: CuidId, days: number, actorId: CuidId, now: Instant): Promise<ValuationHistoryDTO>`

*VAL-3 · E · FR-VAL-4 · NFR-VAL-2. `valuation.history`.*

`ValuationHistoryDTO = { points: { date: string /* YYYY-MM-DD, Bogotá */; valueCop: Cop; stale: boolean }[]; label: 'current-cards-were-worth'; decision: Decision }`.

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 Owned collection. Violation: `CollectionNotFound` (HTTP 404, collections).
  - P2 `days` is an integer in 1–365. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel).
- **Postcondition (Q):**
  - Q1 Daily points from `max(earliest acquiredAt, today − days + 1)` to today, as Bogotá calendar days: at most 365 points and exactly one per day.
  - Q2 One `catalog.getPriceHistory(ids, from, to)` per 500 distinct ids. The pure `series` carries each price forward day by day and marks a point `stale` when its price is older than 36 h at that day's end. It never interpolates. A priced entry steps in on its `acquiredAt` date.
  - Q3 Zero writes. No audit.
  - Q4 Explanation:
    - no priced entry → `points: []`, with a decision citing `{ rule: 'FR-VAL-4', inputs: { pricedEntries: 0 } }`;
    - otherwise the series is non-empty and every value is integer COP;
    - the label is the A-54 text.
  - Q-fail P1, P2 → nothing read beyond ownership.
- **Invariant (I):**
  - I1 It is recomputed from current entries on every request, and nothing is stored. Bound to: AD-VAL-2, FR-VAL "never stored".
  - I2 No interpolated value: every point equals a stored observation × qty, carried forward. Bound to: AD-VAL-2 rule 5, AD-CAT-2 rule 5.
- **Concurrency / idempotency:** a snapshot read. Adding a priced entry dated 12 days ago raises every point from that date by exactly its `entryValueCop`, and removing it removes the step from every past point (FR-VAL-4 acceptance).
- **Time:** `Clock`, once. Days are `America/Bogota` calendar days (UTC−5, no DST).
- **Latency budget (NFR):** the 365-day history, p95 ≤ 2,500 ms at N = 1 (NFR-VAL-2).

---

## 12. REP — Seller Reputation & Moderation (`reviews`)

### Operation: `writeReview(input: { targetUserId: CuidId; rating: 1 | 2 | 3 | 4 | 5; text: string (0–1000) }, reviewerId: CuidId, now: Instant): Promise<{ reviewId; targetKind: 'business' | 'individual'; purchaseVerified: boolean; decision: Decision }>`

*REP-1 · R, E · FR-REP-1, FR-REP-2 · NFR-REP-1 (paid but not closed). `reputation.write`.*

- **Layer:** Inbound Port.
- **Precondition (P)**, first-fail:
  - P1 `canBuy`. Violation: `EmailNotVerified` (HTTP 403, identity).
  - P2 `reviewerId ≠ targetUserId`, checked before any read. Violation: `TargetNotFound` (HTTP 404, reviews).
  - P3 `identity.getReviewTarget(targetUserId)` is an `Approved` business or a complete individual seller. Violation: `TargetNotFound` (HTTP 404, reviews).
  - P4 For a business: `orders.hasClosedPurchase(reviewerId, targetUserId).closed = true`. Violation: `NotVerifiedPurchaser` (HTTP 409, reviews), citing `{ latestState }`. A `Paid` or `PaymentConfirmed` order is named, so "paying isn't enough" is explained.
  - P5 No existing review by this reviewer of this target. Violation: `DuplicateReview` (HTTP 409, reviews), raised by the unique index at insert.
- **Postcondition (Q):**
  - Q1 `INSERT "Review" { reviewerId, targetUserId, targetKind, rating, text, purchaseVerified: (targetKind = 'business'), "createdAt", "updatedAt" }`.
  - Q2 Returns `{ reviewId, targetKind, purchaseVerified, decision }`. The review counts in `getAggregates` from the next read.
  - Q3 Audit: `audit('reviews.review.written', Review:id)`. No event.
  - Q4 The decision cites `{ rule: 'FR-REP-1' | 'FR-REP-2', inputs: { targetKind, purchaseVerified } }`.
  - Q-fail Any refusal → zero writes.
- **Invariant (I):**
  - I1 A business review exists only with a closed purchase, and its `purchaseVerified` is snapshotted `true`. Bound to: AD-REP-1, AD-2; `CHECK ((targetKind = 'business') = "purchaseVerified")` (`review_business_iff_verified`).
  - I2 One review per `(reviewerId, targetUserId)`. Bound to: AD-REP-1 rule 3; `UNIQUE`.
  - I3 No self-review reaches storage. Bound to: AD-REP-1 rule 1; `CHECK ("reviewerId" <> "targetUserId")` as a second guard.
- **Concurrency / idempotency:** a double submit → one row and one `DuplicateReview`. **MEC part 1:** a review while the order is `Paid` but not closed → `NotVerifiedPurchaser` in 100/100.
- **Time:** `Clock`, once.
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `hideReview(reviewId: CuidId, reasonCode: 'Harassment' | 'PersonalData' | 'Spam' | 'OffTopic' | 'Other', note: string | null, adminId: CuidId, now: Instant): Promise<Decision>`

*REP-2 · R · FR-REP-4 · NFR-REP-1 (hide racing a post), NFR-REP-2. `reputation.admin.hide`.*

- **Layer:** Inbound Port.
- **Precondition (P):**
  - P1 The caller is an admin. Violation: `AdminOnly` (HTTP 403, identity).
  - P2 `note` has 10–500 characters when `reasonCode = 'Other'`; otherwise it is null or 0–500. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel).
  - P3 The review exists. Violation: `ReviewNotFound` (HTTP 404, reviews).
- **Postcondition (Q):**
  - Q1 `UPDATE "Review" SET "hiddenAt"=:now, "hiddenReason"=:reasonCode, "hiddenBy"=:adminId, "updatedAt"=:now, version=version+1 WHERE id AND "hiddenAt" IS NULL RETURNING rating, text`.
  - Q2 On 1 row: one `"ReviewModerationLog" { reviewId, action: 'hide', reasonCode, note, adminId, ratingSnapshot, textSnapshot, createdAt: now }`. Returns `Decision { outcome: 'hidden', … }`.
  - Q3 Audit: `audit('reviews.review.hidden', Review:id)`, `actorKind='admin'`. No event.
  - Q4 The decision cites `{ rule: 'FR-REP-4', inputs: { reviewId, reasonCode } }`.
  - Q-fail On 0 rows, already hidden → an explained no-op: `Decision { outcome: 'allowedWithNotice', citations: [{ rule: 'FR-REP-4', inputs: { hiddenAt, hiddenBy } }] }`, with zero writes. An unknown id → `ReviewNotFound`.
- **Invariant (I):**
  - I1 A `"Review"` is never deleted: `DELETE` is revoked from the application role. Bound to: AD-12, AD-REP-2 rule 3.
  - I2 Each `NULL → non-null` change of `"hiddenAt"` writes exactly one log row with snapshots, and a no-op writes none. Bound to: AD-REP-3 rule 1.
  - I3 A hidden review cannot be edited back into view. Bound to: AD-REP-1 rule 4 (EC-32).
- **Concurrency / idempotency:** two admins hiding at once → one hide, one log row, one explained no-op (50 × 100).
- **Time:** `Clock`, once. The hide takes effect on the very next read (0 s cache, NFR-REP-2).
- **Latency budget (NFR):** command p95 ≤ 800 ms at N = 1 (NFR-SYS-9).

### Operation: `getAggregates(sellerIds: CuidId[]): Promise<{ sellerId; averageTenths: number | null; count: number; decision: Decision }[]>`

*REP-3 · MEC · FR-REP-3 · NFR-REP-1 (aggregate consistency), NFR-REP-2. The `reviews.getAggregates` port, composed by the RSC on pages 2.2 and 3.1. MEC: a hide and a new post on one target run concurrently, and every later read counts exactly the visible committed reviews.*

- **Layer:** Outbound Port.
- **Precondition (P):**
  - P1 1–500 distinct ids. Violation: `RequestValidationFailed` (HTTP 400, owner shared-kernel); duplicates are refused (Solu-1 review E-22).
- **Postcondition (Q):**
  - Q1 One statement over `"Review" WHERE "hiddenAt" IS NULL AND "targetUserId" = ANY(:ids)` returns `count` and `sum(rating)` per target. `averageTenths = floor((20 × sum + count) / (2 × count))` in BigInt (ADD-§2.9).
  - Q2 One element per input id, in input order.
  - Q3 Zero writes. No audit.
  - Q4 A seller with no visible review → `{ averageTenths: null, count: 0 }`, with a decision citing `{ rule: 'FR-REP-3', inputs: { count: 0 } }`. The UI renders "Aún sin reseñas", never 0.0.
  - Q-fail None beyond P1. Missing data is a result, not an error.
- **Invariant (I):**
  - I1 A hidden review never contributes to `count` or `sum`. Bound to: AD-12, AD-REP-2 rule 1.
  - I2 On the profile, the aggregate and the first page are read in one `REPEATABLE READ` read-only transaction, so they never disagree. Bound to: AD-REP-2 rule 2.
- **Concurrency / idempotency:** **MEC:** a hide racing a new post, 100 repetitions. After both commit, `count` and `sum` equal exactly the visible committed set: the hidden review is never counted, and the new one is never dropped. One statement reads one snapshot, so no read mixes the two states.
- **Time:** none. Aggregates are not time-based.
- **Latency budget (NFR):** a profile read (aggregate plus the first page) p95 ≤ 300 ms at N = 1 (NFR-REP-2).

---

## 13. Typed Error Catalog

**Columns:**
- **HTTP**: from the AD-SYS-1 family.
- **Trigger**: names the contract clause that raises the code.
- **Explanation template**: the es-CO `humanMessage`, filled only from `citations[0].inputs`. A template contains no PascalCase token and no ADD-§1.2 phrase (AD-SYS-1 rule 6).
- **Retryable** (review G-12): `yes` only when the same input can succeed later without the caller changing anything.

Codes marked † were proposed by this document (§16) and adopted at the Phase 1 gate (decision log Solu-2 #8). They are registered in `shared-kernel/codes.ts`.

| Code | HTTP | Owner | Trigger (contract) | Explanation template (es-CO) | Retryable |
|---|---|---|---|---|---|
| `RequestValidationFailed` | 400 | shared-kernel | Every procedure's parser (§0.3) | "Revisa {field}: {issue}." (one line per issue) | no |
| `EventDeliveryNotReplayable` | 409 | shared-kernel | `admin.events.replay` on a non-`failed` delivery (S-SYS) | "Esta entrega está en estado {status}; solo se reintentan las fallidas." | no |
| `DeliveryAttemptsExhausted` | — (stored only) | shared-kernel | AD-SYS-2 rule 4, the fourth automatic attempt | "La entrega agotó sus 3 intentos automáticos; reintenta desde el panel." | no |
| `NotAuthenticated` | 401 | identity | Any non-public procedure without a session (S-FR-IDN-7) | "Inicia sesión para continuar." | no |
| `AdminOnly` | 403 | identity | Every admin procedure (VER-1, CAT-1, COM-2, COM-3, REP-2, IDN-3, …) | "Esta acción es solo para administradores." | no |
| `EmailNotVerified` | 403 | identity | `requireCanBuy` (ORD-1, MSG-1, MSG-2, REP-1, S-FR-TRD-1) | "Verifica tu correo para comprar, ofertar o escribir; te enviamos el enlace a {emailHint}." | no |
| `AuthRateLimited` | 429 | identity | Sign-in or sign-up throttle (S-FR-IDN-7) | "Demasiados intentos. Vuelve a intentarlo después de las {retryAt}." | yes |
| `AccountNotFound` † | 404 | identity | IDN-3 P2 (C-GAP-1) | "No encontramos esa cuenta." | no |
| `IndividualSellerProfileIncomplete` | 409 | identity | IDN-2 Q-fail | "Completa tu perfil de vendedor para publicar." | no |
| `IndividualSellerProfileAlreadyComplete` | 409 | identity | IDN-1 Q-fail; VER-2 P4 | "Tu cuenta ya vende como persona; no puede registrar una tienda." | no |
| `AlreadyVerifiedBusiness` | 409 | identity | IDN-1 Q-fail; VER-2 P6 | "Tu tienda ya está verificada." | no |
| `BusinessApplicationOnFile` | 409 | identity | IDN-1 Q-fail | "Tienes una solicitud de tienda {status}; no puedes vender también como persona." | no |
| `NotBusinessAccount` | 409 | identity | MSG-3 Q-fail; S-FR-VER-9; S-FR-COM-2 | "Esta cuenta no es una tienda activa ({status}); copia tu mensaje y contáctala por otro medio." | no |
| `SellerNotVerified` | 409 | identity | IDN-2 Q-fail | "Tu solicitud de tienda fue rechazada; podrás publicar si vuelves a aplicar desde el {reapplyNotBefore}." | no |
| `ApplicationAlreadyPending` | 409 | identity | VER-2 P5, I1 | "Ya tienes una solicitud en revisión desde el {submittedAt}." | no |
| `ApplicationNotPending` | 409 | identity | VER-1 P3, Q-fail | "Esta solicitud ya fue {status} por {decidedBy} el {decidedAt}." | no |
| `ApplicationNotFound` | 404 | identity | VER-1 P2; VER-3 P2 | "No encontramos esa solicitud." | no |
| `MissingRequiredField` | 400 | identity | VER-2 P1 | "Falta completar: {fields}." | no |
| `ReapplicationCooldownActive` | 409 | identity | VER-2 P7 | "Podrás volver a aplicar desde el {reapplyNotBefore}." | no |
| `ReapplicationBarred` | 409 | identity | VER-2 P7 | "Esta solicitud no se puede volver a enviar: {reasonText}." | no |
| `LegalIdentityAccessDenied` | 403 | identity | VER-3 P1 | "No tienes acceso a los datos legales; este intento quedó registrado." | no |
| `RejectionReasonUnknown` | 409 | identity | VER-1 P4 | "El motivo {reasonCode} no está activo; elige otro." | no |
| `LastActiveReasonRequired` | 409 | identity | S-FR-VER-8 | "Debe quedar al menos un motivo de rechazo activo." | no |
| `InvalidDocumentFile` | 400 | identity | VER-2 P3 | "El documento {key} no se pudo usar: {cause}." | no |
| `CatalogEntryNotFound` | 404 | catalog | CAT-3 P2; DSC-2 P1 | "No encontramos esa carta o producto." | no |
| `FeedRunInProgress` | 409 | catalog | CAT-1 Q-fail; `catalog.feed.continue` | "Ya hay una carga en curso desde las {startedAt}." | yes |
| `InvalidItemRef` | 400 | listings | INV-2 P3; TRD-2 P3 | "La carta {itemRef} no existe o no corresponde al tipo elegido." | no |
| `InvalidPrice` | 400 | listings | INV-2 P4 | "El precio debe estar entre $1.000 y $100.000.000 COP." | no |
| `InvalidLocation` | 400 | listings | INV-2 P5 | "El punto de encuentro debe estar en Colombia." | no |
| `EmptyComponentList` | 400 | listings | S-FR-INV-2 | "Agrega al menos una carta al lote." | no |
| `SealedProductInBundle` | 409 | listings | S-FR-INV-2 | "{title} es un producto sellado y no puede ir en un lote." | no |
| `OpenToTradeNotAllowed` | 409 | listings | INV-2 P2 | "Las tiendas no reciben ofertas de intercambio." | no |
| `ListingNotOpenToTrade` | 409 | listings | TRD-1 P5; S-FR-TRD-1 | "Esta publicación ya no acepta intercambios." | no |
| `NotBusinessListing` | 409 | listings | INV-1 P3 | "Esta publicación es de una persona; contáctala en lugar de comprar." | no |
| `NotIndividualSellerListing` | 409 | listings | MSG-2 P3; S-FR-TRD-1 | "Esta publicación es de una tienda; cómprala o escríbele en la app." | no |
| `InsufficientQuantity` | 409 | listings | INV-1 P5; TRD-1 P6; S-FR-INV-9 | "Pediste {requested}; quedan {available}." | no |
| `ListingNotFound` | 404 | listings | INV-1 P2; MSG-2 P2; S-FR-INV-10 | "Esta publicación ya no está disponible." | no |
| `ListingNotOwnedByCaller` | 403 | listings | S-FR-INV-9 | "Solo quien publicó puede cambiar esta publicación." | no |
| `ListingNotPurchasable` | 409 | listings | INV-1 P4 | "Esta tienda no puede vender ahora: {reasonText}." | no |
| `InvalidSearchArea` | 400 | listings | DSC-3 | "El radio debe estar entre 1 y 300 km y el centro en Colombia." | no |
| `SearchFilterTooBroad` | 400 | listings | DSC-1 P2 | "Tu filtro abarca más de {threshold} cartas; agrega otro criterio." | no |
| `ContactRateLimited` | 429 | listings | MSG-2 P4 | "Ya contactaste a muchos vendedores; vuelve a intentarlo después de las {retryAt}." | yes |
| `SelfPurchaseNotAllowed` | 409 | orders | ORD-1 P3 | "No puedes comprar tu propia publicación." | no |
| `ComprobanteInvalidFile` | 400 | orders | S-FR-ORD-2 | "El comprobante no se pudo usar: {cause}." | no |
| `ComprobanteLocked` | 409 | orders | S-FR-ORD-2 | "Ya confirmaste el pago; el comprobante no se puede cambiar." | no |
| `ComprobanteNotYetUploaded` | 409 | orders | ORD-2 P5 | "Sube el comprobante antes de confirmar el pago del pedido {orderId}." | no |
| `ComprobanteMissingOnConfirm` | 409 | orders | ORD-3 P3 | "El pedido {orderId} no tiene comprobante." | no |
| `OrderAlreadyConfirmedByRole` | 409 | orders | ORD-2 P3; ORD-3 P4; ORD-4 P5 | "Ya confirmaste esto el {confirmedAt} (pedido {orderId})." | no |
| `OrderConfirmationOutOfOrder` | 409 | orders | ORD-4 P4 | "Primero confirma que pagaste el pedido {orderId}." | no |
| `OrderNotVisibleToCaller` | 403 | orders | ORD-2 P1; ORD-3 P1; ORD-4 P1; S-FR-ORD-6 | "No encontramos ese pedido." | no |
| `OrderNotOwnedByCaller` | 403 | orders | ORD-2 P2; ORD-3 P2; ORD-4 P2 | "Esta confirmación le corresponde a la otra parte del pedido {orderId}." | no |
| `OrderNotCancellable` | 409 | orders | S-FR-ORD-7 | "El pedido {orderId} ya está {status}; no se puede cancelar." | no |
| `OrderNoLongerActive` | 409 | orders | ORD-2 P4; ORD-3 P5; ORD-4 P3 | "El pedido {orderId} {status} el {at}." | no |
| `TooManyOpenOrders` | 409 | orders | ORD-1 P4 | "Paga o cancela primero: {openOrderIds}." | no |
| `TopUpAmountInvalid` | 400 | commission | S-FR-COM-2 | "La recarga debe estar entre $20.000 y $10.000.000 COP." | no |
| `TopUpNotPending` | 409 | commission | COM-2 P3 | "Esta recarga ya fue {status} por {decidedBy} el {decidedAt}." | no |
| `TopUpNotVisibleToCaller` | 403 | commission | S-FR-COM-2 | "No encontramos esa recarga." | no |
| `TopUpProofInvalidFile` | 400 | commission | S-FR-COM-2 | "El soporte no se pudo usar: {cause}." | no |
| `TopUpNotFound` | 404 | commission | COM-2 P2 | "No encontramos esa recarga." | no |
| `CommissionRateNotFutureDated` | 400 | commission | S-FR-COM-7 | "La tarifa debe empezar desde ahora o después ({effectiveFrom})." | no |
| `CommissionAccountNotOpen` † | 409 | commission | S-FR-COM-2 (C-GAP-3) | "Tu cuenta de comisiones se está abriendo; intenta la recarga en unos minutos." | yes |
| `SelfTradeNotAllowed` | 409 | trading | S-FR-TRD-1 | "No puedes ofertar por tu propia publicación." | no |
| `EmptyTradeOffer` | 400 | trading | TRD-2 P2; S-FR-TRD-1 | "Agrega una carta o un monto a tu oferta." | no |
| `DuplicateOpenOffer` | 409 | trading | S-FR-TRD-1 | "Ya tienes una oferta abierta por esta publicación." | no |
| `NotYourTurn` | 409 | trading | TRD-1 P3; TRD-2 P5 | "Es turno de {turn}." | no |
| `TradeCounterUnchanged` | 409 | trading | TRD-2 P8 | "Tu contraoferta es igual a la ronda {round}; cambia algo." | no |
| `TradeRoundLimitReached` | 409 | trading | TRD-2 P7 | "Llegaron a 10 rondas; ahora solo puedes aceptar o rechazar." | no |
| `TradeOfferNotOpen` | 409 | trading | TRD-1 P2, P4; TRD-2 P4, P6 | "Esta oferta está {status}." | no |
| `TradeOfferNotVisibleToCaller` | 403 | trading | TRD-1 P1; TRD-2 P1; TRD-3 P1 | "No encontramos esa oferta." | no |
| `TradeNotAccepted` | 409 | trading | S-FR-TRD-7 | "Esta oferta no está aceptada." | no |
| `TradeAlreadyConfirmedByRole` | 409 | trading | S-FR-TRD-7 | "Ya confirmaste el intercambio el {confirmedAt}." | no |
| `TradeNotCancellable` | 409 | trading | TRD-3 P2 | "Ya hay una confirmación de entrega; el intercambio no se puede cancelar." | no |
| `ConversationNotVisibleToCaller` | 403 | messaging | MSG-1 P3; S-FR-MSG-7 | "No encontramos esa conversación." | no |
| `BusinessCannotInitiate` | 409 | messaging | MSG-1 P4 | "Las tiendas responden; no pueden iniciar conversaciones." | no |
| `CollectionNotFound` | 404 | collections | COL-1 P3; COL-3 P3; VAL-1..3 P1 | "No encontramos esa colección." | no |
| `CollectionNameTaken` | 409 | collections | S-FR-COL-1 | "Ya tienes una colección llamada {name}." | no |
| `CollectionLimitReached` | 409 | collections | S-FR-COL-1 | "Llegaste al máximo de 50 colecciones." | no |
| `CollectionEntryNotFound` | 404 | collections | S-FR-COL-4 | "No encontramos esa carta en tu colección." | no |
| `InvalidExternalLink` | 400 | collections | S-FR-COL-3 | "Revisa el enlace: {field} no es válido." | no |
| `InvalidCatalogEntry` | 400 | collections | COL-3 P4; S-FR-COL-6 | "La carta {catalogEntryId} no está en el catálogo." | no |
| `InvalidAcquiredDate` † | 400 | collections | COL-3 P2 (C-GAP-2) | "La fecha {acquiredAt} es posterior a hoy ({today})." | no |
| `PromptAlreadyResolved` | 409 | collections | COL-1 P2 | "Esta sugerencia ya fue {status} el {resolvedAt}." | no |
| `PromptNotFound` | 404 | collections | COL-1 P1 | "No encontramos esa sugerencia." | no |
| `InvalidValuationPeriod` | 400 | collections | VAL-2 P2 | "El periodo debe ser 7, 30, 90 o 365 días." | no |
| `TargetNotFound` | 404 | reviews | REP-1 P2, P3; S-FR-REP-7 | "No encontramos ese vendedor." | no |
| `NotVerifiedPurchaser` | 409 | reviews | REP-1 P4 | "Podrás reseñar esta tienda cuando confirmes que recibiste tu pedido; pagar no es suficiente ({latestState})." | no |
| `DuplicateReview` | 409 | reviews | REP-1 P5 | "Ya reseñaste a este vendedor; puedes editar tu reseña." | no |
| `ReviewNotFound` | 404 | reviews | REP-2 P3; S-FR-REP-6 | "No encontramos esa reseña." | no |
| `'Unexpected'` | 500 | — | An invariant breach or an internal caller bypassing the parser | "Algo falló de nuestro lado; no se aplicó ningún cambio." | yes |

**DecisionCodes** (non-error outcomes, ADD-§3.2) used by these contracts:
- `ListingUnverified`, `ListingPausedBalanceExhausted`, `ListingLocationUnusable` (listings);
- `ReferencePriceStale`, `TrendNoBaseline`, `FxRateCarriedForward`, `FxRateSourceMismatch` (catalog);
- `ListingNoLongerAvailable` (trading);
- `RecipientNotYetVerified` (messaging);
- `ExternalEntryNotInCatalog`, `NoReferencePrice`, `ValuationNoBaseline` (collections).

---

## 14. Invariant Binding Table

There is one row per AD, and no AD is left unbound (Phase 3 gate: "no AD without a test that goes red"). The test column names the Phase 3 ATDD test that turns red when the enforcement point is removed. `sys` is `docs/solu-2/test/atdd/sys_contracts.test.ts`: the shared-kernel and cross-module suite, which also holds the walking skeleton. Every other prefix is `<module>_contracts.test.ts`.

| Invariant | AD | Enforcement point | Red test |
|---|---|---|---|
| Module dependency graph is AD-1's | AD-1 | Each module imports only neighbours' `index.ts`; `catalog` imports no module; admin guard lives in `server/trpc` | `sys › [SYS-AD1] import graph equals AD-1` |
| Three facts, no custody | AD-2 | Fact CHECKs on `"Order"`; no balance/escrow/payment column | `ord › [ORD-2.I2]`, `ord › [ORD-1.I4]` |
| Commission balance is the single source of purchasability | AD-3 | Fail-closed `SellerCommissionState` read `FOR SHARE` at listing insert; projection seq gate | `inv › [INV-2.I2]`, `inv › [INV-3.I2]` |
| Trading is a one-way flow off `listings` | AD-4 | `CHECK (sellerKindAtCreation='individual' OR NOT openToTrade)`; `getTradeability` / `reserveForTrade` ports | `inv › [INV-2.I4]`, `trd › [TRD-1.I1]` |
| One location query path | AD-5 | One SQL builder with no seller-kind branch | `dsc › [DSC-1.I1]` |
| `InventoryUnit` is the sole quantity owner | AD-6 | `CHECK (quantity >= 0)`; conditional decrement | `inv › [INV-1.I1]`, `inv › [INV-1.MEC]` |
| Catalog, listing and binder records are independent | AD-7 | Upsert `SET` list without `id`/`kind`; tagged-union CHECKs | `cat › [CAT-2.I3]`, `col › [COL-3.I2]` |
| Table ownership | AD-8 | No module writes another's tables; static scan of `infra/` SQL; shared-kernel owns only infra tables (+ `audit_events`, R-2) | `sys › [SYS-AD8] no foreign-table writes`, `col › [S-FR-COL-3.h]` |
| Snapshot payloads | AD-9 | Payload = ADD-§5 exactly; subscribers read only the payload | `sys › [SYS-AD9] payload schema per event`, `col › [COL-2.I2]` |
| Post-commit, in-process dispatch with an outbox | AD-10 | `outbox.enqueue(tx)` + sweeper | `sys › [SYS-2.R6] crash between commit and dispatch → delivered once` |
| One owner per error code | AD-11 | Registry `owner`; `raise` checks the caller module | `sys › [SYS-1.R2] non-owner raise fails` |
| Hide, never delete | AD-12 | `DELETE` revoked on `Review` and `Listing`; `hiddenAt IS NULL` default predicate | `rep › [REP-2.I1]`, `dsc › [DSC-1.I2]` |
| `legalIdentity` under Ley 1581 | AD-13 | Split table; one repository reader | `ver › [VER-3.I2]`, `idn › [IDN-3.I1]` |
| Signed URLs, 10-minute TTL | AD-14 | `ObjectStorage.sign(key, 600)` | `ver › [VER-3.I3]` |
| Business sees an order from `buyerPaidConfirmedAt` | AD-15 | One visibility predicate | `ord › [ORD-3.I3]`, `ord › [ORD-3.MEC]` |
| Roles derived server-side | AD-16 | `deriveCapabilities`; no role-like input key | `idn › [IDN-2.I1]`, `sys › [SYS-8.R2] no role-like input keys` |
| Comprobante is regulated data | AD-17 | `regulated.ts` + redactor; promotion through quarantine | `ord › [S-FR-ORD-2.f]`, `sys › [SYS-8.R4] canary scan = 0` |
| Exclusivity by rejecting the second state-granting action | AD-18 | Conditional `UPDATE "User"."sellerTrack"`; composite FKs | `idn › [IDN-1.MEC]` |
| Atomic decrement; balance may go negative | AD-19 | Account `UPDATE … RETURNING`; no refusal path | `com › [COM-1.MEC]` |
| One Decision shape and one code registry | AD-SYS-1 | `codes.ts`; error formatter; `explain_assert` | `sys › [SYS-1.R6] every code triggered with full shape` |
| Transactional outbox; at most 3 automatic attempts | AD-SYS-2 | `EventDelivery` attempt procedure | `sys › [SYS-2.R4] 3 unrecorded attempts → failed DeliveryAttemptsExhausted` |
| Commission triggered by the first of two order events | AD-SYS-3 | `commissionTrigger(facts)`; partial unique on deductions | `com › [COM-1.I4]` |
| Transaction handles, pooler-safe state, global lock order | AD-SYS-4 | `tx` first; `db()` ambient client; ascending unit locks | `inv › [INV-1.I3]`, `sys › [SYS-4.R9] neighbour query in tx with pool of 1` |
| Every transition is one conditional UPDATE | AD-SYS-5 | `WHERE <from-state>` + loser re-read | `ver › [VER-1.MEC]`, `trd › [TRD-2.I3]` |
| Determinism boundary (Clock, IdGenerator, no network) | AD-SYS-6 | `Clock` port; network guard; no SQL `now()` | `sys › [SYS-6.R1] no wall-clock reads`, `sys › [SYS-6.R4] socket guard` |
| Branded money, one set of formulas | AD-SYS-7 | BigInt helpers; rounding CHECK on deductions | `com › [COM-1.I3]`, `val › [VAL-2.I3]` |
| Server-side authorization, regulated data, uploads | AD-SYS-8 | Procedure builders; redactor; quarantine promotion | `sys › [SYS-8.R2]`, `ver › [VER-2.P3]` |
| Capabilities from one pure function | AD-IDN-1 | `deriveCapabilities`; trace = projection | `idn › [IDN-3.I3]` |
| Seller-track exclusivity | AD-IDN-2 | Conditional `UPDATE "User"."sellerTrack"` | `idn › [IDN-1.I1]` |
| `canBuy` gate and auth throttle | AD-IDN-3 | `requireCanBuy`; `AuthThrottleEvent` count | `idn › [S-FR-IDN-7.f]` |
| One decision with its audit row and event | AD-VER-1 | `WHERE status='Pending'`; unique decision log | `ver › [VER-1.I1]` |
| Legal identity has one reader; reads and denials logged | AD-VER-2 | `legalIdentityRepository`; access log | `ver › [VER-3.I1]` |
| One pending application; reapplication from the snapshot | AD-VER-3 | Partial unique `(businessId) WHERE Pending` | `ver › [VER-2.I1]` |
| Resumable leased ingestion | AD-CAT-1 | Partial unique `Running`; lease token | `cat › [CAT-1.I1]`, `cat › [CAT-2.I1]` |
| Observations immutable, aged at read | AD-CAT-2 | Append-only observations; `stale` computed | `cat › [CAT-3.I1]` |
| TRM never invented | AD-CAT-3 | `EXCLUDE` on validity ranges; no gap row | `cat › [S-FR-CAT-8.f]` |
| One unit per (seller, item, condition) | AD-INV-1 | `UNIQUE (sellerId, catalogEntryId, condition)` | `inv › [INV-2.I1]` |
| Reserve and release in the caller's transaction | AD-INV-2 | `tx` parameter; ascending conditional decrement | `inv › [INV-1.MEC]` |
| Fail-closed purchasability, newer facts only | AD-INV-3 | Seq gate; `AppliedApplicationDecision` | `inv › [INV-3.I1]`, `inv › [S-FR-INV-8.f]` |
| SQL distance equals the TS reference | AD-DSC-1 | One haversine expression; `+ 1e-6` inclusive bound | `dsc › [DSC-1.I4]`, `dsc › [DSC-2.MEC]` |
| At most 3 neighbour calls per request | AD-DSC-2 | Composition in `listings` | `dsc › [DSC-2.Q1]` |
| Creation serialized per buyer | AD-ORD-1 | `orders:buyer` advisory lock + derived count | `ord › [ORD-1.I2]` |
| Facts set once; expiry derived and materialized once | AD-ORD-2 | `IS NULL` predicates; `expiresAt > now` | `ord › [ORD-2.MEC]`, `ord › [ORD-4.MEC]` |
| One visibility predicate; locked comprobante | AD-ORD-3 | Visibility SQL; comprobante update predicate | `ord › [ORD-3.I3]`, `ord › [S-FR-ORD-2.f]` |
| One atomic account update + one ledger entry | AD-COM-1 | `UPDATE … RETURNING`; `UNIQUE (businessId, seq)` | `com › [COM-3.I1]` |
| Deduction keyed by `orderId`, priced at the trigger time | AD-COM-2 | Partial unique; rate by `commissionTriggeredAt` | `com › [COM-1.I1]` |
| Top-ups have one domain path | AD-COM-3 | `WHERE status='Pending'`; unique TopUp entry | `com › [COM-2.I1]` |
| Offer action = one conditional update | AD-TRD-1 | `status`, `turn`, `version`, `expiresAt` predicate | `trd › [TRD-2.I3]` |
| Accept serialized per seller | AD-TRD-2 | `trd:seller` advisory lock | `trd › [TRD-1.MEC]` |
| Completion computed; cancel releases once | AD-TRD-3 | `WHERE status='Accepted' AND no confirmation` | `trd › [TRD-3.I1]` |
| Contact messages deterministic and rate-limited | AD-MSG-1 | Pure composer; fixed-order advisory locks | `msg › [MSG-2.I1]`, `msg › [MSG-2.MEC]` |
| One conversation per pair; idempotent send | AD-MSG-2 | Unique keys; `lastSeq` allocation | `msg › [MSG-1.I3]` |
| Read state monotonic | AD-MSG-3 | `WHERE "lastReadSeq" < :seq` | `msg › [S-FR-MSG-7.f]` |
| Tagged-union entries; collections capped under an owner lock | AD-COL-1 | CHECKs; `col:owner` lock | `col › [COL-3.I2]`, `col › [S-FR-COL-1.f]` |
| One prompt per closed order; entries once | AD-COL-2 | `UNIQUE orderId`; `WHERE status='Pending'` | `col › [COL-1.MEC]` |
| Valuation is a pure BigInt function | AD-VAL-1 | Pure function; brand types | `val › [VAL-1.I1]`, `val › [VAL-1.MEC]` |
| Trend and history recomputed, no zero division | AD-VAL-2 | `roundHalfAwayFromZero`; null baseline | `val › [VAL-2.I1]` |
| Business reviews purchase-verified; one per pair | AD-REP-1 | `review_business_iff_verified`; unique pair | `rep › [REP-1.I1]` |
| Aggregates from the same snapshot as the list | AD-REP-2 | One statement; `REPEATABLE READ` profile read | `rep › [REP-3.MEC]` |
| Hide and unhide conditional and logged | AD-REP-3 | `WHERE hiddenAt IS NULL`; log with snapshots | `rep › [REP-2.I2]` |
| `audit_events` is append-only and written in the writer's transaction | AD-SYS-2 rule 10 as refined by R-2 | Grants (`UPDATE`/`DELETE` revoked); `AuditLog.record(tx)` | `sys › [SYS-R2] audit row rolls back with its transaction; grants` |

---

## 15. Supporting contracts (FRs not bound by a core operation)

The core operations bind 58 FRs. The 38 below get a compact contract each (decision log Solu-2 #3): precondition with typed errors, postcondition, AD binding, and one happy and one failure red test. Together, §1–§12 and §15 trace all 96 PRD FRs, which is the input to readiness check 1. Shape-level refusals (`RequestValidationFailed`, HTTP 400) apply to every one and are not repeated.

### IDN

- **S-FR-IDN-6 — `identity.getMessagingEligibility` / `getReviewTarget` / `getSellerKinds(ids ≤ 500)`.** Outbound Port.
  - *P:* the ids are `CuidId`.
  - *Q:* every answer is a projection of one `deriveCapabilities` read, on current facts. `getReviewTarget` returns `{ kind: 'business' | 'individual' | 'none', verified }`. Zero writes.
  - *Errors:* `NotBusinessAccount` (HTTP 409, identity), from the throwing projection MSG-3 only.
  - *I:* no cache (AD-IDN-1 rule 4).
  - *Tests:* `[S-FR-IDN-6.h]` approving a business changes `getSellerKinds` on the next call; `[S-FR-IDN-6.f]` an individual seller as recipient → `NotBusinessAccount`.
- **S-FR-IDN-7 — Authentication and admin gating** (procedure builders, Better Auth hooks). Inbound Port.
  - *P:* a session; for admin procedures, `isAdmin`; for sign-in, below the throttle.
  - *Q:* `actor = { userId }` from the session. A failed sign-in inserts one `"AuthThrottleEvent"` (scope, `ipHmac` or account key).
  - *Errors:* `NotAuthenticated` (HTTP 401, identity), `AdminOnly` (HTTP 403, identity), `AuthRateLimited` (HTTP 429, identity), `EmailNotVerified` (HTTP 403, identity).
  - *I:* AD-16, AD-IDN-3, AD-SYS-8 rules 1–2.
  - *Tests:* `[S-FR-IDN-7.h]` an admin passes `adminProcedure`; `[S-FR-IDN-7.f]` the 11th failed sign-in in 15 min → `AuthRateLimited` citing `retryAt`.

### VER

- **S-FR-VER-2 — `verification.queue(cursor?)`.** Inbound Port.
  - *P:* admin.
  - *Q:* `Pending` applications ordered by `("submittedAt", id)`, 25 per page, with no `legalIdentity` column selected. Zero writes.
  - *Errors:* `AdminOnly` (HTTP 403, identity).
  - *I:* AD-VER-2 rule 1 (legal identity confined).
  - *Tests:* `[S-FR-VER-2.h]` 3 pending applications are listed oldest first; `[S-FR-VER-2.f]` non-admin → `AdminOnly`.
- **S-FR-VER-7 — `verification.myStatus`.** Inbound Port.
  - *P:* a session.
  - *Q:* the latest application's `status`, the ADD-§1.3 copy key, and `reapplyNotBefore` / `barred` from the snapshot; `status: 'none'` with no application. Zero writes.
  - *Errors:* `NotAuthenticated` (HTTP 401, identity).
  - *I:* AD-VER-3 (snapshot, not current policy).
  - *Tests:* `[S-FR-VER-7.h]` a rejected applicant sees `reapplyNotBefore`; `[S-FR-VER-7.f]` editing the reason's cooldown afterwards does not change the shown date.
- **S-FR-VER-8 — `verification.reasons.upsert` / `setActive`.** Inbound Port.
  - *P:* admin. `textEsCo` is 10–300 characters. `barred` XOR `cooldownDays` in 0–365.
  - *Q:* one `"RejectionReasonChange"` row per effective change, and an audit row. `setActive(code, false)` locks every active row (`ORDER BY code FOR UPDATE`).
  - *Errors:* `AdminOnly` (HTTP 403, identity), `LastActiveReasonRequired` (HTTP 409, identity).
  - *I:* AD-VER-1 rule 6. Decided applications are untouched (rule 5).
  - *Tests:* `[S-FR-VER-8.h]` deactivating one of two reasons writes one change row; `[S-FR-VER-8.f]` two concurrent deactivations of the last two → one stays active, and the other gets `LastActiveReasonRequired`.
- **S-FR-VER-9 — `verification.updatePaymentInstructions` and the `getBusinessPaymentInstructions` port.** Inbound + Outbound Port.
  - *P:* the actor's `sellerTrack = 'business'`.
  - *Q:* upsert `"BusinessProfile"` (`updatedAt = now`) plus an audit row. The port returns the instructions only for an `Approved` business, otherwise `null`.
  - *Errors:* `NotBusinessAccount` (HTTP 409, identity).
  - *I:* an order keeps its snapshot (AD-9).
  - *Tests:* `[S-FR-VER-9.h]` an edit after an order leaves that order's snapshot unchanged; `[S-FR-VER-9.f]` an individual seller → `NotBusinessAccount`.

### CAT

- **S-FR-CAT-1 — `catalog.browse(filters, page, pageSize ≤ 100)`.** Inbound + Outbound Port.
  - *P:* `pageSize` 1–100.
  - *Q:* entries ordered `(setId, numberSort, id)`, plus the total and facets, from one query. Zero writes.
  - *Errors:* only `RequestValidationFailed`.
  - *I:* `catalog` has no module dependencies (AD-1).
  - *Tests:* `[S-FR-CAT-1.h]` filtering by `pokemon` returns only matching entries in a stable order; `[S-FR-CAT-1.f]` `pageSize = 101` → `RequestValidationFailed`.
- **S-FR-CAT-8 — the `trm-fetch` job and the `getFxRate(date)` port.** Inbound (job) + Outbound Port.
  - *P:* `JOBS_SECRET`; single-flight `job:trm-fetch`.
  - *Q:* a no-op when a row covers today. Otherwise one `"FxRate"` insert as delivered by the source; the `valor` decimal string is parsed to centavos, half-up. `getFxRate` returns the covering row, or the latest earlier one with `stale=true` and `FxRateCarriedForward`. No row is ever written for a gap.
  - *Errors:* none to users. A different value for a covered date keeps the stored row and logs `FxRateSourceMismatch`.
  - *I:* AD-CAT-3; `EXCLUDE USING gist (daterange(validFrom, validTo, '[]') WITH &&)`.
  - *Tests:* `[S-FR-CAT-8.h]` a rerun on a covered day writes nothing; `[S-FR-CAT-8.f]` with the source `down`, no row is written and `getFxRate(today)` returns yesterday's rate with `stale=true`.

### INV

- **S-FR-INV-2 — `inventory.createBundle`.** Inbound Port.
  - *P:* INV-2 P1–P5; 1–20 components, each with `perBundleQty` 1–4.
  - *Q:* one `"Listing" (kind='bundle')` plus `"BundleComponent"` rows. Each component's unit is resolved as in INV-2 Q1. Availability `= min(floor(quantity / perBundleQty))`.
  - *Errors:* `EmptyComponentList` (HTTP 400, listings), `SealedProductInBundle` (HTTP 409, listings), `InvalidItemRef` (HTTP 400, listings), plus INV-2's codes.
  - *I:* AD-INV-1 rules 2 and 5.
  - *Tests:* `[S-FR-INV-2.h]` a 3-card bundle shows availability equal to its scarcest component; `[S-FR-INV-2.f]` a sealed component → `SealedProductInBundle`, with zero rows written.
- **S-FR-INV-4 — Shared-quantity reconciliation** (availability at read, in `inventory.get` / `mine` and DSC). Inbound Port.
  - *P:* none beyond visibility.
  - *Q:* every listing on a unit shows `availability` computed from `"InventoryUnit".quantity` at read time. Nothing is stored.
  - *Errors:* `ListingNotFound` (HTTP 404, listings).
  - *I:* AD-INV-1 rule 2, AD-6.
  - *Tests:* `[S-FR-INV-4.h]` a sale through one of two listings on one unit lowers both listings' availability; `[S-FR-INV-4.f]` a bundle with `perBundleQty = 2` over a unit of 1 shows availability 0, and a reserve gets `InsufficientQuantity`.
- **S-FR-INV-5 — `listings.releaseReservation(tx, ref)`.** Outbound Port.
  - *P:* `tx` is open, and the caller's own conditional transition returned 1 row in it.
  - *Q:* increments the referenced units by their `qty`, in ascending id order. No other write.
  - *Errors:* `'Unexpected'` for an unknown unit.
  - *I:* AD-INV-2 rule 6 (at most once, tied to a 1-row transition).
  - *Tests:* `[S-FR-INV-5.h]` a cancel restores the quantity; `[S-FR-INV-5.f]` a second cancel of the same order is refused, and the quantity is unchanged.
- **S-FR-INV-8 — subscribers `onBusinessApplicationApproved` / `Rejected` in `listings`.** Inbound Port (subscriber).
  - *P:* the handler `tx` holds the delivery.
  - *Q:* `INSERT "AppliedApplicationDecision" ON CONFLICT (applicationId) DO NOTHING`. It applies only when it inserted and its `decidedAt` is the newest for the business:
    - Rejected → `withdrawnAt = now`, `withdrawnReason = 'ApplicationRejected'`;
    - Approved → clears only those rows.

    Otherwise `ignored = true`.
  - *Errors:* none to users.
  - *I:* AD-INV-3 rule 5.
  - *Tests:* `[S-FR-INV-8.h]` reject then approve → withdrawn, then restored; `[S-FR-INV-8.f]` an older `Rejected` delivered after a newer `Approved` → `ignored = true`, and the listings stay visible.
- **S-FR-INV-9 — `inventory.update` / `restock(delta)` / `deactivate` / `reactivate`.** Inbound Port.
  - *P:* the owner; `delta ≠ 0`; reactivate re-checks IDN-2.
  - *Q:* conditional updates on `"Listing"` (`version`). Restock `+δ` adds; restock `−δ` is the conditional decrement. Each writes an audit row.
  - *Errors:* `ListingNotFound` (HTTP 404, listings), `ListingNotOwnedByCaller` (HTTP 403, listings), `InsufficientQuantity` (HTTP 409, listings), `SellerNotVerified` (HTTP 409, identity).
  - *I:* AD-INV-1 rule 4, AD-SYS-5.
  - *Tests:* `[S-FR-INV-9.h]` restock +2 raises availability by 2 on every listing of the unit; `[S-FR-INV-9.f]` a non-owner → `ListingNotOwnedByCaller`, with zero writes.
- **S-FR-INV-10 — `inventory.get` (public) / `inventory.mine` (owner).** Inbound Port.
  - *P:* none / a session.
  - *Q:* the owner sees hidden, withdrawn and deactivated listings with their reason. A non-owner sees only visible ones. Zero writes.
  - *Errors:* `ListingNotFound` (HTTP 404, listings), with an identical body for hidden and unknown ids.
  - *I:* AD-12, S-2.
  - *Tests:* `[S-FR-INV-10.h]` the owner sees their hidden listing with its reason; `[S-FR-INV-10.f]` a non-owner gets a body byte-identical to an unknown id's, except `occurredAt`.

### ORD

- **S-FR-ORD-2 — `orders.createComprobanteUpload` / `orders.uploadComprobante({ orderId, uploadKey })`.** Inbound Port.
  - *P:* the buyer of the order; the key prefix matches; the bytes pass the AD-SYS-8 pipeline.
  - *Q:* promote to `order-comprobantes` under a new cuid2 key, then `UPDATE … SET "comprobanteObjectKey" WHERE … "buyerPaidConfirmedAt" IS NULL AND "expiresAt" > :now`. The previous object is deleted after commit. Audit row.
  - *Errors:* `OrderNotOwnedByCaller` (HTTP 403, orders), `ComprobanteInvalidFile` (HTTP 400, orders), `ComprobanteLocked` (HTTP 409, orders), `OrderNoLongerActive` (HTTP 409, orders).
  - *I:* AD-ORD-3 rule 2, AD-17, AD-SYS-8 rules 5–6.
  - *Tests:* `[S-FR-ORD-2.h]` replacing before "paid" stores the new key and deletes the old object; `[S-FR-ORD-2.f]` after "paid" → `ComprobanteLocked`, and the newly promoted object is deleted.
- **S-FR-ORD-6 — `orders.get` / `mine` / `sales`.** Inbound Port.
  - *P:* a session.
  - *Q:* rows filtered by the one visibility predicate. `status = deriveStatus(facts, now)`, and each row carries `decision`. Zero writes.
  - *Errors:* `OrderNotVisibleToCaller` (HTTP 403, orders).
  - *I:* AD-ORD-3 rule 1, AD-15.
  - *Tests:* `[S-FR-ORD-6.h]` the 6 derived states × 3 roles visibility matrix; `[S-FR-ORD-6.f]` a foreign id and a random id give byte-identical bodies, except `occurredAt`.
- **S-FR-ORD-7 — `orders.cancel(orderId)`.** Inbound Port.
  - *P:* the buyer; `AwaitingPayment` with `expiresAt > now`.
  - *Q:* `UPDATE … SET "cancelledAt" = :now, "cancelReason" = 'BuyerCancelled'` (refinement R-5) `WHERE … "buyerPaidConfirmedAt" IS NULL AND "cancelledAt" IS NULL AND "expiredAt" IS NULL AND "expiresAt" > :now RETURNING "reservationRef"`, then `releaseReservation(tx, ref)`, then an audit row.
  - *Errors:* `OrderNotOwnedByCaller` (HTTP 403, orders), `OrderNotCancellable` (HTTP 409, orders). At `expiresAt ≤ now` the expiry is materialized first.
  - *I:* AD-ORD-2 rule 6, AD-INV-2 rule 6; `CHECK ("cancelReason" IN ('Unpaid', 'BuyerCancelled'))`.
  - *Tests:* `[S-FR-ORD-7.h]` a cancel restores the quantity exactly once; `[S-FR-ORD-7.f]` a double cancel → the second gets `OrderNotCancellable`, and the quantity is unchanged.
- **S-FR-ORD-8 — `ExpiryMaterializer.expireDue(scope)`** (the `orders.create` pre-step, the tick and both crons). Inbound Port (job).
  - *P:* `JOBS_SECRET` (job path); single-flight `job:expiry-materialize`.
  - *Q:* one transaction per order: `SET "expiredAt" = :now, "cancelReason" = 'Unpaid' WHERE … "expiresAt" <= :now`, then `releaseReservation` on 1 row, then an audit row with `actorKind='system'`. Batches of 200 until 50 s pass.
  - *Errors:* none to users.
  - *I:* AD-ORD-2 rules 6–8, AD-SYS-6 rule 5 (correct without the job).
  - *Tests:* `[S-FR-ORD-8.h]` the job materializes once and releases once, and a second run is a no-op; `[S-FR-ORD-8.f]` with the job never run, the status still reads `Expired` and `confirmPaid` gets `OrderNoLongerActive`.
- **S-FR-ORD-9 — `orders.hasClosedPurchase(buyerId, businessId)`.** Outbound Port.
  - *P:* ids.
  - *Q:* `closed = EXISTS (… "buyerItemReceivedConfirmedAt" IS NOT NULL)`, and `latestState = deriveStatus` of the latest order. With no order, `{ closed: false, latestState: null }`. Zero writes.
  - *Errors:* none.
  - *I:* AD-ORD-3 rule 4, AD-2.
  - *Tests:* `[S-FR-ORD-9.h]` `true` after the item is received; `[S-FR-ORD-9.f]` paid but not closed → `{ closed: false, latestState: 'Paid' }`.
- **S-FR-ORD-10 — `orders.adminLookup` / `orders.supportContact.get` (public) / `set` (admin).** Inbound Port.
  - *P:* admin for lookup and set.
  - *Q:* lookup inserts one `"OrderLookupLog"` and has no write path to `"Order"`. `set` writes `"SupportContactChange"` and updates `"SupportContactSetting"` (`updatedAt`). Audit rows.
  - *Errors:* `AdminOnly` (HTTP 403, identity).
  - *I:* AD-ORD-3 rule 3, AD-SYS-8 rule 10.
  - *Tests:* `[S-FR-ORD-10.h]` a lookup writes exactly one log row, and the order is byte-identical afterwards; `[S-FR-ORD-10.f]` non-admin → `AdminOnly`.

### COM

- **S-FR-COM-1 — subscriber `commission.onBusinessApplicationApproved`.** Inbound Port (subscriber).
  - *P:* the handler `tx`.
  - *Q:* `INSERT "CommissionAccount" (balance 0, state 'Exhausted', ledgerSeq 0, openedAt) ON CONFLICT ("businessId") DO NOTHING`. Only on insert, it enqueues `CommissionBalanceExhausted { ledgerSeq: 0, balanceAfter: 0 }` and writes an audit row.
  - *Errors:* none to users.
  - *I:* AD-COM-1 rule 5.
  - *Tests:* `[S-FR-COM-1.h]` approval opens one account and publishes one seq-0 event; `[S-FR-COM-1.f]` a redelivery writes nothing and publishes nothing.
- **S-FR-COM-2 — `commission.createTopUpProofUpload` / `commission.requestTopUp({ amountCop, transferReference, uploadKey })`.** Inbound Port.
  - *P:* the actor is a business (`identity.getCapabilities`); its `"CommissionAccount"` exists; the amount is 20,000–10,000,000; the proof passes the pipeline.
  - *Q:* `INSERT "TopUpRequest" (Pending)` plus an audit row. The balance is unchanged until COM-2.
  - *Errors:* `NotBusinessAccount` (HTTP 409, identity, propagated), `CommissionAccountNotOpen` (HTTP 409, commission; C-GAP-3), `TopUpAmountInvalid` (HTTP 400, commission), `TopUpProofInvalidFile` (HTTP 400, commission), `TopUpNotVisibleToCaller` (HTTP 403, commission) on reads of another business's request.
  - *I:* AD-COM-3 rule 1; `CHECK ("amountCop" BETWEEN 20000 AND 10000000)`.
  - *Tests:* `[S-FR-COM-2.h]` a pending request is created and the balance is unchanged; `[S-FR-COM-2.f]` 19,999 → `TopUpAmountInvalid`, with zero rows.
- **S-FR-COM-7 — `commission.admin.setRate({ rateBps, effectiveFrom })`.** Inbound Port.
  - *P:* admin; `rateBps` 0–10,000; `effectiveFrom ≥ now − 60 s`.
  - *Q:* append a `"CommissionRateSetting"` with `effectiveFrom = max(effectiveFrom, now)`, plus an audit row.
  - *Errors:* `AdminOnly` (HTTP 403, identity), `CommissionRateNotFutureDated` (HTTP 400, commission).
  - *I:* AD-COM-2 rule 6; `UNIQUE (effectiveFrom)`; append-only grants.
  - *Tests:* `[S-FR-COM-7.h]` a new rate applies only to triggers after its `effectiveFrom`; `[S-FR-COM-7.f]` `effectiveFrom = now − 61 s` → `CommissionRateNotFutureDated`.
- **S-FR-COM-9 — `commission.myAccount` / `myLedger` (low-balance notice).** Inbound Port.
  - *P:* a business session.
  - *Q:* the balance, state and ledger (newest first). `lowBalance = 0 < balance < lowBalanceThresholdCop` (20,000, display only). `neededToResumeCop = 1 − balance` when `balance ≤ 0`. With no account → `account: null` (a "no account yet" state). Zero writes.
  - *Errors:* `NotBusinessAccount` (HTTP 409, identity, propagated).
  - *I:* AD-COM-3 rule 3 (display only, never a gate).
  - *Tests:* `[S-FR-COM-9.h]` balance 15,000 → `lowBalance = true`, and listings remain purchasable; `[S-FR-COM-9.f]` an individual seller → `NotBusinessAccount`.

### TRD

- **S-FR-TRD-1 — `trading.offer({ listingId, terms })`.** Inbound Port.
  - *P:* `canBuy`; not the seller; an individual listing open to trade; non-empty terms; items resolve.
  - *Q:* under `trd:seller`, materialize the proposer's own expired offer on that listing. Then `INSERT "TradeOffer" (Open, turn 'seller', roundCount 1, version 0, expiresAt)` plus round 1, plus an audit row.
  - *Errors:* `EmailNotVerified` (HTTP 403, identity), `SelfTradeNotAllowed` (HTTP 409, trading), `NotIndividualSellerListing` (HTTP 409, listings), `ListingNotOpenToTrade` (HTTP 409, listings), `EmptyTradeOffer` (HTTP 400, trading), `InvalidItemRef` (HTTP 400, listings), `DuplicateOpenOffer` (HTTP 409, trading).
  - *I:* AD-TRD-1 rule 6; partial unique `(listingId, proposerId) WHERE status='Open'`.
  - *Tests:* `[S-FR-TRD-1.h]` an offer opens with the turn at the seller; `[S-FR-TRD-1.f]` a second live offer → `DuplicateOpenOffer`.
- **S-FR-TRD-2w — `trading.reject` / `trading.withdraw({ offerId, expectedVersion })`** (the FR-TRD-2 actions besides counter; review G-06). Inbound Port.
  - *P:* reject: the turn holder; withdraw: the proposer; both need `Open`, an unexpired offer and a matching `version`.
  - *Q:* a conditional `Open → Rejected | Withdrawn`, plus a round and an audit row.
  - *Errors:* `NotYourTurn` (HTTP 409, trading), `TradeOfferNotOpen` (HTTP 409, trading), `TradeOfferNotVisibleToCaller` (HTTP 403, trading).
  - *I:* AD-TRD-1 rule 1.
  - *Tests:* `[S-FR-TRD-2w.h]` the proposer withdraws an open offer; `[S-FR-TRD-2w.f]` withdrawing with a stale `version` → `TradeOfferNotOpen`.
- **S-FR-TRD-3 — `trading.get` / `mine` / `handoff`.** Inbound Port.
  - *P:* a session.
  - *Q:* the offer and every round, for the proposer or the seller. `status` is derived (expiry). `handoff` regenerates the deterministic MSG-2 text for an `Accepted` offer. Zero writes.
  - *Errors:* `TradeOfferNotVisibleToCaller` (HTTP 403, trading).
  - *I:* AD-TRD-1 rule 4.
  - *Tests:* `[S-FR-TRD-3.h]` both parties see the same round history; `[S-FR-TRD-3.f]` a third party gets a body identical to an unknown id's.
- **S-FR-TRD-7 — `trading.confirmCompletion(offerId)`.** Inbound Port.
  - *P:* a party to an `Accepted` offer that has not yet confirmed.
  - *Q:* a conditional `SET "<role>ConfirmedAt" = :now WHERE … IS NULL`, plus an audit row. `completed` is computed when both are set, and never stored.
  - *Errors:* `TradeNotAccepted` (HTTP 409, trading), `TradeAlreadyConfirmedByRole` (HTTP 409, trading).
  - *I:* AD-TRD-3 rules 1–2.
  - *Tests:* `[S-FR-TRD-7.h]` both confirm → `completed = true`; `[S-FR-TRD-7.f]` a repeated confirmation → `TradeAlreadyConfirmedByRole`, citing the original instant.
- **S-FR-TRD-9 — Expire open offers** (derived; materialized by the tick and the crons). Inbound Port (job).
  - *P:* `JOBS_SECRET`; single-flight.
  - *Q:* a conditional `Open → Expired` for `expiresAt ≤ now`, with no reservation change, plus an audit row (`system`).
  - *Errors:* none to users. Actions on such offers get `TradeOfferNotOpen`.
  - *I:* AD-TRD-1 rule 5, AD-SYS-6 rule 5.
  - *Tests:* `[S-FR-TRD-9.h]` the job marks an expired offer once; `[S-FR-TRD-9.f]` without the job, an accept at `now = expiresAt` → `TradeOfferNotOpen`, citing `Expired`.

### MSG

- **S-FR-MSG-7 — `messaging.inbox` / `thread` / `unreadCount` / `markRead`.** Inbound Port.
  - *P:* a participant.
  - *Q:*
    - the inbox is ordered `(lastMessageAt desc, id)`;
    - `thread` returns `seq > afterSeq`;
    - unread = `lastSeq − lastReadSeq`, excluding muted conversations;
    - `markRead` clamps to `lastSeq` and updates only `WHERE "lastReadSeq" < :seq`;
    - the other side's `lastReadSeq` is never returned.
  - *Errors:* `ConversationNotVisibleToCaller` (HTTP 403, messaging).
  - *I:* AD-MSG-3.
  - *Tests:* `[S-FR-MSG-7.h]` reading a thread lowers unread to 0; `[S-FR-MSG-7.f]` `markRead` with an older `seq` from a stale tab leaves `lastReadSeq` unchanged.
- **S-FR-MSG-8 — `messaging.setMuted({ conversationId, muted })`.** Inbound Port.
  - *P:* a participant.
  - *Q:* for the buyer, `mutedAt = now` or `null`, which removes the conversation from the unread total. For a business, an explained no-op: `allowedWithNotice`, zero writes (C-GAP-4).
  - *Errors:* `ConversationNotVisibleToCaller` (HTTP 403, messaging).
  - *I:* AD-MSG-3 rule 2; `CHECK (role='buyer' OR "mutedAt" IS NULL)`.
  - *Tests:* `[S-FR-MSG-8.h]` a muted conversation leaves the total unread count; `[S-FR-MSG-8.f]` a business's mute writes nothing and returns the notice.

### COL

- **S-FR-COL-1 — `collections.create` / `rename` / `delete`.** Inbound Port.
  - *P:* the owner; the name has 1–60 characters; create runs under `col:owner` with a count below 50; delete has `confirm: true`.
  - *Q:* insert or rename (`nameKey` unique). Delete cascades to the entries, and its `Decision` cites `{ entriesRemoved, platformPurchaseEntriesRemoved }` (review G-15). Audit row.
  - *Errors:* `CollectionNameTaken` (HTTP 409, collections), `CollectionLimitReached` (HTTP 409, collections), `CollectionNotFound` (HTTP 404, collections).
  - *I:* AD-COL-1 rule 1.
  - *Tests:* `[S-FR-COL-1.h]` "Keep" and "For trade" are created; `[S-FR-COL-1.f]` "keep" → `CollectionNameTaken`, and two concurrent creates at 49 → exactly one at 50 and one `CollectionLimitReached`.
- **S-FR-COL-3 — `collections.addExternal({ collectionId, url, title, imageUrl? })`.** Inbound Port.
  - *P:* the owner; `url` is https and ≤ 2,048; `title` is 1–120; `imageUrl` is https or null.
  - *Q:* an entry with `cardKind = 'external'`, plus an audit row. No server fetch, and no `"CatalogEntry"` write.
  - *Errors:* `InvalidExternalLink` (HTTP 400, collections), `CollectionNotFound` (HTTP 404, collections).
  - *I:* AD-COL-1 rule 4, AD-7, AD-8.
  - *Tests:* `[S-FR-COL-3.h]` 2 promos are added and the `"CatalogEntry"` count is unchanged; `[S-FR-COL-3.f]` an `http://` URL → `InvalidExternalLink`, citing `url`.
- **S-FR-COL-4 — `collections.moveEntry` / `copyEntry`.** Inbound Port.
  - *P:* the owner of the entry and of the target collection.
  - *Q:* move changes `collectionId` and `manualPosition`. Copy inserts a new entry keeping `source` and `orderId`. Audit row.
  - *Errors:* `CollectionEntryNotFound` (HTTP 404, collections), `CollectionNotFound` (HTTP 404, collections).
  - *I:* AD-COL-1 (the `source`/`orderId` CHECK holds on copies).
  - *Tests:* `[S-FR-COL-4.h]` copying a `PlatformPurchase` entry keeps its badge and `orderId`; `[S-FR-COL-4.f]` another owner's entry → `CollectionEntryNotFound`.
- **S-FR-COL-5 — `collections.binder({ collectionId, sort[] ≤ 3, setId? })` / `setLayout` / `reorder`.** Inbound Port.
  - *P:* the owner; `binderRows` and `binderCols` are 1–5.
  - *Q:* a deterministic order with `entryId` as the last tie-break. Completion is `floor(owned × 100 / cardEntryCount)`, or `null` when the count is 0.
  - *Errors:* `CollectionNotFound` (HTTP 404, collections).
  - *I:* AD-COL-1 rule 5.
  - *Tests:* `[S-FR-COL-5.h]` the same sort twice gives the same order; `[S-FR-COL-5.f]` a set with 0 card entries → completion `null`, never a division.
- **S-FR-COL-6 — `collections.wishlist.add` / `remove` / `list`.** Inbound Port.
  - *P:* a session; the catalog id exists.
  - *Q:* `INSERT … ON CONFLICT (ownerId, catalogEntryId) DO NOTHING`. `list` composes `listings.getAvailabilitySummary` (≤ 500 ids per call).
  - *Errors:* `InvalidCatalogEntry` (HTTP 400, collections).
  - *I:* AD-1 (`collections → listings`), AD-7.
  - *Tests:* `[S-FR-COL-6.h]` a wishlisted card shows its lowest purchasable price; `[S-FR-COL-6.f]` an unknown catalog id → `InvalidCatalogEntry`.

### REP

- **S-FR-REP-5 — `inventory.admin.hide` / `unhide` (listings host).** Inbound Port.
  - *P:* admin; a policy reason (ADD-§9.2).
  - *Q:* a conditional `hiddenAt` change plus one `"ListingModerationLog"` with `titleSnapshot`. The listing leaves discovery on the next request. Reservations are untouched. Audit row.
  - *Errors:* `AdminOnly` (HTTP 403, identity), `ListingNotFound` (HTTP 404, listings).
  - *I:* AD-REP-3, AD-12.
  - *Tests:* `[S-FR-REP-5.h]` a hidden listing is absent from the next search; `[S-FR-REP-5.f]` hiding twice → one log row and an explained no-op.
- **S-FR-REP-6 — `reputation.admin.search` / `log` and `listings.listingModerationLog`, merged in the 11.4 RSC.** Inbound Port.
  - *P:* admin.
  - *Q:* the two queries are merged by `(at desc, id)`, 50 per page. Search uses `tezg_unaccent_lower(text) LIKE … ESCAPE '\'` with `\`, `%` and `_` escaped. Zero writes.
  - *Errors:* `AdminOnly` (HTTP 403, identity).
  - *I:* AD-REP-3 rules 4–5.
  - *Tests:* `[S-FR-REP-6.h]` the merged order interleaves both logs by time; `[S-FR-REP-6.f]` the query `100%` matches only the literal text.
- **S-FR-REP-7 — `reputation.profile({ userId, page })`.** Inbound Port.
  - *P:* `userId` is a review target.
  - *Q:* the aggregate (REP-3) plus a page of 20 visible reviews, read in one `REPEATABLE READ` read-only transaction. Zero writes.
  - *Errors:* `TargetNotFound` (HTTP 404, reviews).
  - *I:* AD-REP-2 rule 2.
  - *Tests:* `[S-FR-REP-7.h]` a hidden review is neither listed nor counted; `[S-FR-REP-7.f]` an unknown user → `TargetNotFound`.

### Offered ports (§15.11)

*Added in Phase 2.* These are the queries and commands one module offers to another. They have no FR of their own, because each one serves the FR of its consumer. The operation registry (`schemas/operations.json`) lists each one with its consumers, and the generated consumer-side interfaces in `src/modules/<host>/ports/*.v2.ts` are built from it. Each has one happy red test. Missing data is a result, never an error, unless stated otherwise.

| Id | Port (provider → consumers) | P | Q | I (AD) | Test |
|---|---|---|---|---|---|
| P-IDN.capabilities | `identity.getCapabilities(userId)` → commission | `userId` exists | `{ capabilities, sellerKind, derivedFrom[] }` from one `deriveCapabilities` read; zero writes | AD-IDN-1 rules 2, 4 (no cache) | `[P-IDN.capabilities.h]` an unverified email gives `canBuy=false` citing `emailVerified=false` |
| P-IDN.verification | `identity.getSellerVerification(sellerId)` → listings (INV-1, in the ambient transaction) | a `CuidId` | `status` of the latest application, or `'none'`; reads through `db()`, never a second connection | AD-IDN-1, AD-SYS-4 rule 9 | `[P-IDN.verification.h]` called inside an open transaction with a pool of 1, it completes |
| P-IDN.contact | `identity.getContactCard(sellerId)` → listings contact service only | an individual seller | `{ displayName, contactPhoneE164 }`; the phone is regulated and is never logged | AD-SYS-8 rules 3–4 | `[P-IDN.contact.h]` the canary phone never appears in captured logs |
| P-IDN.names | `identity.getDisplayNames(userIds ≤ 500)` → messaging, reviews, listings | 1–500 distinct ids | one row per known id, with no phone and no email | AD-SYS-8 rule 3 | `[P-IDN.names.h]` 500 ids in one statement |
| P-VER.name | `identity.getBusinessName(businessId)` → commission, messaging | a `CuidId` | `{ businessName }` from the latest application, or `null` | AD-1 | `[P-VER.name.h]` an approved business's name is returned |
| P-CAT.entry | `catalog.getEntry(id)` → listings (DSC-2) | the id exists, else `CatalogEntryNotFound` (HTTP 404, catalog) | the entry DTO | AD-CAT-1 rule 5 | `[P-CAT.entry.h]` a renamed entry keeps its id |
| P-CAT.entries | `catalog.getEntries(ids ≤ 500)` → collections, listings | 1–500 ids | `{ entries[], missing[] }` | AD-7 | `[P-CAT.entries.h]` an unknown id is listed in `missing`, not thrown |
| P-CAT.match | `catalog.matchEntryIds(filters)` → listings (DSC-1) | — | `{ ids ≤ 20,000 }` or `{ tooBroad: true }` | AD-DSC-2 rule 2 | `[P-CAT.match.h]` a filter matching 20,001 entries answers `tooBroad` |
| P-CAT.refs | `catalog.resolveItemRefs(refs ≤ 500)` → listings | 1–500 refs | `{ resolved: [{ ref, kind }], missing[] }` | AD-1 (OQ-6) | `[P-CAT.refs.h]` kinds are returned per ref |
| P-CAT.asOf | `catalog.getReferencePricesAsOf(ids ≤ 500, asOf)` → collections (VAL) | 1–500 ids | the latest observation with `observedAt ≤ asOf`, ordered `(observedAt DESC, source, id)`; `stale` relative to `asOf`; `null` when none | AD-CAT-2 rules 3, 5 | `[P-CAT.asOf.h]` an observation after `asOf` is never returned |
| P-CAT.history | `catalog.getPriceHistory(ids ≤ 500, from, to)` → collections (VAL-3) | `from ≤ to` | the observations in `[from, to]` plus the last one before `from` | AD-CAT-2 rule 5 | `[P-CAT.history.h]` the carried-in observation is present |
| P-CAT.sets | `catalog.getSetSummaries(setIds ≤ 500)` → collections | 1–500 ids | `[{ setId, name, cardEntryCount }]`, counting `kind='card'` only | AD-COL-1 rule 5 | `[P-CAT.sets.h]` sealed products are not counted |
| P-INV.purchase | `listings.getListingForPurchase(listingId)` → orders (ORD-1 P2) | visible, else `ListingNotFound` (HTTP 404, listings) | `{ sellerId, kind, visible: true }` | AD-ORD-1 rule 1 | `[P-INV.purchase.h]` a hidden listing gets `ListingNotFound` |
| P-INV.trade | `listings.reserveForTrade(tx, listingId, 1)` → trading (TRD-1) | `tx` open; visible; an individual listing, else `NotIndividualSellerListing` (HTTP 409, listings); enough stock, else `InsufficientQuantity` (HTTP 409, listings) | the INV-1 decrement shape with `req = 1`; `exhaustedListingIds` | AD-INV-2, AD-6 | `[P-INV.trade.h]` the last unit reserved by trade leaves availability 0 |
| P-INV.tradeability | `listings.getTradeability(listingId)` → trading, in the ambient transaction | visible; open to trade, else `ListingNotOpenToTrade` (HTTP 409, listings) | `{ sellerId, availability, decision }` | AD-4, AD-SYS-4 rule 9 | `[P-INV.tradeability.h]` `openToTrade=false` refuses with the code |
| P-INV.units | `listings.getInventoryUnitIds(listingId)` → orders (expiry pre-step) | a `CuidId` | the unit ids of the listing or bundle; `[]` for unknown | AD-ORD-2 rule 7 | `[P-INV.units.h]` a 3-component bundle gives 3 ids |
| P-INV.availability | `listings.getAvailabilitySummary(ids ≤ 500, area?)` → collections (wishlist) | 1–500 distinct ids; DSC-3 for `area` | one element per id, in input order; purchasable business listings or contactable individual ones; `{ lowestPriceCop: null, availableCount: 0 }` when none (Solu-1 contract) | AD-INV-1 rule 2, AD-12 | `[P-INV.availability.h]` a `Pending` business's listing is not counted |
| P-INV.refs | `listings.resolveItemRefs(refs ≤ 500)` → trading | 1–500 refs | delegates to P-CAT.refs, so `trading` never imports `catalog` | AD-1 (OQ-6, AD-TRD-3 rule 5) | `[P-INV.refs.h]` the answer equals P-CAT.refs on the same input |

### Read models found by the UI-state check (§15.12)

*Added in Phase 2 by readiness check 2 (review G-17).* `scripts/check-ui-states.mjs` mapped the 327 states of the 43 UX page specs to registry operations, and found pages whose states no operation backed. Sixteen of the 18 operations below are Plan-2 procedures the first registry missed; Plan-2 never named the other two, `collections.list` and `reputation.eligibility`. Each one is a read with zero writes, unless the row says otherwise. Visibility follows the module's existing predicate, and an admin read is `adminProcedure` (`AdminOnly`, HTTP 403, identity).

| Id | Procedure | P | Q | I (AD) | Test |
|---|---|---|---|---|---|
| S-FR-VER-8.list | `verification.reasons.list` (5.5, 5.3) | admin | every reason, active and inactive, ordered by `code` | AD-VER-1 rule 5 | `[S-FR-VER-8.list.h]` |
| S-FR-VER-5.audit | `verification.legalIdentityAudit` (5.4) | admin | `LegalIdentityAccessLog` rows newest first, 50 per page; `fieldsRead` names only, never values | AD-VER-2 rule 5, AD-13 | `[S-FR-VER-5.audit.h]` a denial row appears with `fieldsRead = []` |
| CAT-1.runs | `catalog.feed.runs` (2.3) | admin | runs newest first, with their counters | AD-CAT-1 | `[CAT-1.runs.h]` |
| CAT-2.quarantine | `catalog.feed.quarantine` (2.3) | admin; `runId` exists | the run's quarantined rows by `rowNumber`, optionally by reason; never `rawRow` | AD-CAT-1 rule 3 | `[CAT-2.quarantine.h]` a `KindChanged` row is listed |
| S-FR-ORD-2.url | `orders.comprobanteUrl` (6.2, 6.3) | visible to the actor, else `OrderNotVisibleToCaller` (HTTP 403, orders) | a signed URL for the sanitized rendition (600 s), or `url: null` before any upload | AD-14, AD-17, AD-SYS-8 rule 11 | `[S-FR-ORD-2.url.h]` the URL expires at `now + 600 s` |
| COM-2.queue | `commission.admin.topUpQueue` (7.3) | admin | `Pending` requests oldest first | AD-COM-3 | `[COM-2.queue.h]` |
| S-FR-COM-2.mine | `commission.myTopUps` (7.1) | a business, else `NotBusinessAccount` (HTTP 409, identity, propagated) | own requests only, newest first | AD-COM-3 rule 4 | `[S-FR-COM-2.mine.h]` |
| S-FR-COM-2.url | `commission.topUpProofUrl` (7.1, 7.3) | the owner or an admin; otherwise `TopUpNotVisibleToCaller` (HTTP 403, commission) | a signed URL for the sanitized rendition (600 s) | AD-14, AD-COM-3 rule 4 | `[S-FR-COM-2.url.h]` another business gets a body identical to an unknown id |
| S-FR-COM-8.ledger | `commission.admin.ledger` (7.2) | admin | any account's ledger, newest first, filterable by `trigger` | AD-COM-1, FR-COM-8 | `[S-FR-COM-8.ledger.h]` `trigger=buyerClosed` shows only those deductions |
| S-FR-COM-7.list | `commission.admin.rates` (7.4) | admin | every rate setting plus the rate in force at `now` | AD-COM-2 rule 6 | `[S-FR-COM-7.list.h]` the seed rate of 800 bps is current with no other row |
| COM-3.last | `commission.admin.lastReconciliation` (7.4) | admin | the latest `ReconciliationRun`, or `null` | AD-COM-1 rule 4 | `[COM-3.last.h]` |
| S-FR-TRD-3.mine | `trading.mine` (8.1, 8.3) | a session | offers where the actor is the proposer or the seller, status derived at read | AD-TRD-1 rules 4–5 | `[S-FR-TRD-3.mine.h]` an expired `Open` offer reads `Expired` without the job |
| COL-1.list | `collections.prompts.list` (9.4, 6.2) | a session | the actor's prompts, optionally by status | AD-COL-2 | `[COL-1.list.h]` |
| S-FR-COL-1.list | `collections.list` (9.1, 9.2, 9.4, 10.1). **Not in Plan-2** | a session | the owner's collections with entry counts, ordered by `nameKey` | AD-COL-1 | `[S-FR-COL-1.list.h]` |
| REP-1.edit | `reputation.edit` (11.1). A Plan-2 procedure; FR-REP-1 "they can edit it" | `canBuy`; the reviewer's own, visible review | `UPDATE … SET rating, text, "editedAt"=:now WHERE id AND "reviewerId"=:actor AND "hiddenAt" IS NULL`; 0 rows → `ReviewNotFound` (HTTP 404, reviews) (EC-32); one audit row | AD-REP-1 rule 4 | `[REP-1.edit.f]` editing a hidden review → `ReviewNotFound`, text unchanged |
| REP-1.check | `reputation.eligibility` (11.1). **Not in Plan-2** | a session; the target is a review target, else `TargetNotFound` (HTTP 404, reviews) | `{ eligible, existingReview }` from the same rules as REP-1 P2–P5, with no insert | AD-REP-1 | `[REP-1.check.h]` a paid-not-closed buyer reads `eligible=false`, citing `latestState` |
| S-SYS.tick | `admin.jobs.tickHealth` (2.3) | admin | `{ lastTickStartedAt, tickSilent }` derived at read from `JobRun`: silent when read between 10:17 and 23:17 Bogotá with no tick in the previous 3 h | ARCH §4 | `[S-SYS.tick.h]` the virtual clock 3 h after the last tick reads `tickSilent=true` |
| S-SYS.deliveries | `admin.events.deliveries` (2.3) | admin | 25 rows: `failed` by `firstFailedAt`, or `pending` older than 24 h by `createdAt` | AD-SYS-2 rule 9 | `[S-SYS.deliveries.h]` |

**Mirrors and ingress wrappers.** The registry also carries five entries that reuse a core contract:
- `IDN-1.ingress` (`completeIndividualProfile`: IDN-1 then the profile insert);
- `CAT-2.ingress` (`continueFeedRun`: the lease plus CAT-2 batches, AD-CAT-1 rules 2–4);
- `COL-1.dismiss` (`Pending → Dismissed`, the COL-1 shape);
- `COM-2.reject` (`Pending → Rejected`, the COM-2 shape, with no ledger entry);
- `REP-2.unhide` (the AD-REP-3 rule 2 mirror).

Each one's clauses are those of the contract it wraps. The ATDD file holds one happy and one failure test for each.

---

## 16. Gaps found while deriving the contracts (Phase 1 gate)

| Gap | Where | Proposal | State |
|---|---|---|---|
| C-GAP-1 | IDN-3 `traceCapabilities` | Plan-2 names no code for an unknown target user. New DomainError `AccountNotFound` (identity, `NOT_FOUND`, HTTP 404), with an identical body for every unknown id | Adopted, Phase 1 gate (#8) |
| C-GAP-2 | COL-3 `addEntry` | FR-COL-2's "acquiredAt not in the future" depends on the `Clock`, so the parser cannot check it, and AD-SYS-1 rule 7 forbids a module from raising `RequestValidationFailed`. New DomainError `InvalidAcquiredDate` (collections, `BAD_REQUEST`, HTTP 400) | Adopted, Phase 1 gate (#8) |
| C-GAP-3 | S-FR-COM-2, refinement R-7 | **A correction to an accepted refinement.** R-7 (from review G-10) has `commission.requestTopUp` refuse with `NotBusinessAccount` while the account is not yet open. `NotBusinessAccount` is owned by `identity`, and AD-SYS-1 rule 2 (lint `tezg/error-owner`) forbids `commission` from raising it. Proposal: new DomainError `CommissionAccountNotOpen` (commission, `CONFLICT`, HTTP 409, retryable). `NotBusinessAccount` stays only as a code propagated from `identity` for a non-business actor. Amend R-7's text | Adopted, Phase 1 gate (#8); R-7 amended |
| C-GAP-4 | S-FR-MSG-8 `setMuted` | Mute is buyer-only (`CHECK role='buyer' OR mutedAt IS NULL`), and Plan-2 does not say what a business's call returns. Proposal: an explained no-op (`allowedWithNotice`, zero writes), so user input never reaches the CHECK and no new code is needed | Adopted, Phase 1 gate (#8) |
| C-NOTE-1 | Review G-07 | **Correction to the review.** G-07 said the business-before-paid case had "two incompatible codes". PRD FR-ORD-4 already states `OrderNotVisibleToCaller`, so only ARCHITECTURE was silent. The resolution (R-4) is unchanged; the finding's claim was overstated | Recorded as `[CORRECTED]` (#7) |
