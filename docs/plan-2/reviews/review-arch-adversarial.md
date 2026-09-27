---
title: Adversarial review — Plan-2 architecture
reviewed: docs/plan-2/planning/ARCHITECTURE.md (companions docs/plan-2/planning/prd.md and addendum.md)
skill: bmad-review-adversarial-general
date: 2026-09-27
status: triaged — Phase 3 gate, 2026-09-27
---

# Adversarial review — Plan-2 architecture

This review covers the full draft: §0–§15, the 41 ADs, the event catalog and the code registry additions. It was checked against the PRD and the addendum. The skill asks for findings as descriptions only, with no severity. The triage table after the list holds the reviewer's recommendation. The team adopted it in full at the Phase 3 gate on 2026-09-27 (decision log #19).

Line numbers point to the document **after** the Accept fixes.

## Findings

- **F-01 The feed lease is never renewed.**
  - AD-CAT-1 claims a run with a 90 s lease. The scheduled run then loops in-process for up to 240 s.
  - No batch checks that the caller still holds the lease. After 90 s a second caller can claim the same run.
  - Both runners then process batches from the same cursor. The upserts are idempotent, but the cursor and the counters are advanced twice. The run summary becomes wrong.
- **F-02 A run can never reach `Failed`.**
  - `FeedIngestionRun.status` includes `Failed`, but no rule ever writes it.
  - The partial unique index allows only one `Running` row. A run abandoned by a crash, or by a file that can never be parsed, therefore blocks every future `start` with `FeedRunInProgress`, forever.
- **F-03 The "append-only" ledger is patched, and the lock order is inverted.**
  - AD-COM-2 rule 3 inserted the deduction entry first and then patched its `seq` and `balanceAfter`. That contradicts the `(append-only)` label on `CommissionLedgerEntry`.
  - It also meant a revoked `UPDATE` grant could not be applied to the table.
  - The insert took the entry's lock before the `CommissionAccount` row. AD-SYS-4 rule 5 requires the aggregate row first.
- **F-04 FR-COM-7 lost a rule, and the rate lookup can come back empty.**
  - FR-COM-7 requires `effectiveFrom` to be now or later. The architecture dropped the rule, and `setRate` listed only `RequestValidationFailed`.
  - A past-dated rate would retroactively change the price of any order whose event is still queued or failed, even though AD-SYS-3 prices "at the trigger time".
  - No rule creates a first `CommissionRateSetting` row. On a fresh database, AD-SYS-3 rule 2 ("the setting with the greatest `effectiveFrom ≤ commissionTriggeredAt`") finds nothing.
- **F-05 Jobs have no sanctioned path to the legal-identity table.**
  - `orphan-upload-sweep` needs `documentKeys` to know which objects are referenced, and `retention-purge` must delete expired rows.
  - AD-VER-2 rule 1 allows only `legalIdentityRepository.ts` to touch the table. NFR-VER-2 requires the access-log count to equal the repository's read counter.
  - A job either breaks the lint rule, or reads unlogged and breaks the counter equality.
- **F-06 Two IP hashing schemes.**
  - AD-IDN-3 rule 4 stored `sha256(ip + AUTH_THROTTLE_SALT)`.
  - S-7 and the secrets list define `ipHmac` = HMAC-SHA256 with `IP_HMAC_KEY`, and `AUTH_THROTTLE_SALT` appears in no secrets list.
  - A salted hash is also weaker than an HMAC against an offline dictionary of the IPv4 space.
- **F-07 The lag claims ignore the tick's actual window.**
  - The AD-INV-2 and AD-ORD-2 trade-offs and AD-SYS-2 promised a lag of at most one hour with G-3.
  - The G-3 cron `5 12-23,0-1 * * *` UTC runs only from 07:05 to 20:05 Bogotá. The real overnight lag is about 6.5 h (00:30 → 07:00).
  - The expiry trigger list was also inconsistent. AD-ORD-2 rule 7 named three triggers, while §4 and §13 list a fourth, the `daily-night` catch-up. The outbox sweep's schedule differed between AD-SYS-2 rule 6 ("the daily cron") and §13 ("`daily-morning`").
- **F-08 An expired offer blocks a new one.**
  - Expiry is derived. An offer past `expiresAt` that has not yet been materialized still has `status='Open'` in the table.
  - The partial unique `(listingId, proposerId) WHERE status='Open'` therefore raises `DuplicateOpenOffer` while page 8.2 shows the old offer as Expired. The user is refused with no way forward until a job runs.
- **F-09 AD-TRD-2 rule 6 names an exhaustion path that cannot happen.**
  - The rule said "a purchase that exhausts a unit" leaves offers `Open`. Individual-seller listings are never purchasable (AD-INV-3 rule 6), and a unit belongs to one seller, so a purchase never touches a trade unit.
  - The real paths are a restock decrement, a deactivation and a moderation hide.
  - Rule 3 marked the own offer `Unfulfillable` only on `InsufficientQuantity`. A `getTradeability` refusal (the listing is hidden, deactivated or closed to trade) left the offer `Open`, so every later accept failed the same way.
- **F-10 The purchasability SQL twin crosses table ownership.**
  - AD-INV-3 rule 2 asked for one TypeScript predicate and "its SQL twin". Rule 1's first term is the seller's verification status, which lives in `identity` tables.
  - A SQL twin that evaluates that term must read another module's tables. AD-8 and `tezg/table-owner` forbid that.
- **F-11 The commission projection subscriber runs against the global lock order.**
  - AD-INV-3 rule 4 upserts `SellerCommissionState` (position 5) and then updates the business's `Listing` rows.
  - `Listing` had no position in AD-SYS-4 rule 5. Read literally, the subscriber goes backwards, and the document never argued why that cannot deadlock.
- **F-12 "General" looked like a way around the 50-collection cap.** AD-COL-1 rule 2 said "the first add without a collection" creates "General", with no count. Read as "an add that names no collection", an owner with 50 collections could get a 51st.
- **F-13 A prompt can be accepted into another user's collection.** AD-COL-2 rule 2 checks that the prompt belongs to the actor, but not that `collectionId` does. Entries would be inserted into a foreign collection. `CollectionNotFound` was listed on the procedure but never raised.
- **F-14 The oversell metric measures nothing.**
  - ADD-§10 and the `oversell-check` job count "units with `reserved > quantity` or negative availability".
  - Under AD-INV-2 there is no `reserved` column, and `CHECK (quantity >= 0)` keeps the second term at 0. The metric is always 0 whether or not an oversell happened.
- **F-15 An advisory-lock order contradicts its own label.**
  - AD-MSG-1 rule 3 takes `msg:contact:req` and then `msg:contact:ip`, and calls it "ascending key order".
  - The keys are `hashtextextended` values, so the fixed order is not ascending for roughly half the pairs. That contradicts AD-SYS-4 rule 5.1 as written.
- **F-16 Discovery shows paused listings.** Listings of a shop whose commission balance is exhausted stay in browse results, so a buyer sees items they cannot buy.
- **F-17 A reserve reads purchasability without a lock.** `reserveForPurchase` reads `pausedAt` and the verification status unlocked. An order can commit in the same instant that a commission crossing pauses the shop.

## Triage (adopted at the Phase 3 gate)

| # | Recommendation | Fix (applied now if Accept) |
| --- | --- | --- |
| F-01 | **Accept** | `FeedIngestionRun.leaseToken` (ARCHITECTURE.md:743). `continue` claims with a fresh token. Every batch first renews with `WHERE id AND leaseToken=:t`, and on 0 rows rolls back and stops (AD-CAT-1 rules 2–3, lines 788–790). |
| F-02 | **Accept** | AD-CAT-1 rule 7 (line 800): a non-transient source error sets `Failed`. `start` first fails a `Running` run idle for more than 24 h. |
| F-03 | **Accept** | AD-COM-2 rules 2–3 (lines 1268–1269): a non-locking `EXISTS` precheck, then `apply` updates the account row and inserts the entry `ON CONFLICT DO NOTHING`. On a conflict it throws a sentinel, the transaction rolls back, and the handler returns success. The entry is written once. `CommissionLedgerEntry` joins the revoked-grant list of AD-SYS-8 rule 10 (line 460). |
| F-04 | **Accept** + PRD-sync | New code `CommissionRateNotFutureDated` (§8.1). AD-COM-2 rule 6 (line 1272) stores `max(effectiveFrom, now)`, and a migration seeds the A-24 rate (800 bps) at the epoch. §15.2 adds the FR-COM-7 edit. |
| F-05 | **Accept** | AD-VER-2 rule 6 (line 691): `listReferencedDocumentKeys()` and `purgeExpired(before)` are the only job paths. Each logs a `LegalIdentityAccessLog` row with `procedure='job:<name>'` and a null `actorId`. |
| F-06 | **Accept** | AD-IDN-3 rule 4 (line 594) uses the shared `ipHmac` helper. |
| F-07 | **Accept** | Lag text corrected in AD-SYS-2 (line 309), AD-INV-2 (line 939) and AD-ORD-2 (line 1159). AD-ORD-2 rule 7 lists four triggers (line 1151). The outbox sweep runs on every cron invocation (AD-SYS-2 rule 6; §13). |
| F-08 | **Accept** | AD-TRD-1 rule 6 (line 1362): under `trd:seller`, `offer` first materializes the proposer's own expired offer on that listing, then inserts. |
| F-09 | **Accept** | AD-TRD-2 rule 3 (line 1380) marks the own offer `Unfulfillable` on any tradeability refusal. Rule 6 (line 1383) names the real paths. The §15.3 row is updated. |
| F-10 | **Accept** | AD-INV-3 rule 2 (line 952): the SQL twin covers only `listings` terms. The verification term is composed from `getSellerKinds().verified` or `getSellerVerification`, and the parity test compares the composed results. |
| F-11 | **Accept** (text) | AD-SYS-4 rule 5 (line 357) places `Listing` at position 4 and documents the subscriber exception, with the reason no cycle can form. |
| F-12 | **Accept** (text) | AD-COL-1 rule 2 (line 1591): "first use" means an owner with no collection at all, so the count is 0 and the cap cannot be reached on that path. No new code (it would be unreachable). |
| F-13 | **Accept** | AD-COL-2 rule 2 (line 1604) reads the collection `FOR SHARE` with `ownerId=:actor`. No row raises `CollectionNotFound` and rolls the accept back. |
| F-14 | **Defer** + PRD-sync | Before launch; owner: the team, reviewed in the Phase 4 readiness report. §13 relabels `oversell-check` as a placeholder (line 2028). §14 adds "a meaningful oversell metric", which needs a stocked total per unit. §15.2 adds the ADD-§10 edit. Oversell prevention itself is unchanged: the CHECK and the NFR-INV race tests. |
| F-15 | **Accept** (text) | AD-MSG-1 rule 3 (line 1475) states a fixed order. AD-SYS-4 rule 5 allows a fixed-order pair that no other transaction takes together. |
| F-16 | **Reject** | prd.md:909: paused listings stay visible and editable. Only purchase is blocked, through `purchasable` (AD-INV-3 rule 1). |
| F-17 | **Reject** | The race is bounded to one order per in-flight request, and AD-19 accepts a negative balance. The commission is still charged exactly once (AD-COM-2), so no money is lost. |

**Counts.** 17 findings: 14 Accept (one with a PRD-sync edit) · 1 Defer (with a PRD-sync edit) · 2 Reject.
