---
title: Adversarial review — Plan-2 PRD
reviewed: docs/plan-2/planning/prd.md (companion docs/plan-2/planning/addendum.md)
skill: bmad-review-adversarial-general
date: 2026-09-23
status: triaged — resolved at Phase 1 gate (2026-09-23)
---

# Adversarial review — Plan-2 PRD

Reviewed the full draft (§0–§23, 2,121 lines) and the addendum (ADD-§1–§10). The skill asks for findings as descriptions only, without severity. The triage table after the list holds the reviewer's recommendation for the Phase 1 gate. The team adopted it in full (decision log #46); the Gate item F-15 became OQ-12, answered at the Phase 1 gate (#14).

## Findings

- **F-01 Seed contradiction.** §3 declares 12 business accounts: 8 Approved, 3 Pending and 1 Rejected. The IDN seed asks for 3 each in Pending, Approved and Rejected, one of them barred. The VER seed adds a Rejected→Approved history, and the MSG seed needs a Rejected business with a thread. §3 claims module seeds "never contradict" it, but they do.
- **F-02 `canBuy` has no definition.** FR-IDN-1 says `canBuy` = "the account is active", but no account status, suspension or deactivation state exists anywhere in the PRD. The capability is therefore always true, and the word "active" implies a state machine nobody owns.
- **F-03 `Decision.outcome` is an open enum.** §6 ends the union with `...`. The one shape every module must return has no closed value set. Contract tests (NFR-SYS-1) cannot assert it, and modules will invent values such as `notice`, `notValued` and `unfulfillable`.
- **F-04 Rule-evaluation order contradicts FR-VER-1.** "How to Read" says the first failing rule's code is returned. FR-VER-1 rule 5 (and every `RequestValidationFailed` case) reports all field issues in one response. The global rule is wrong as written.
- **F-05 Order-state race, plus a misused error code.**
  - FR-ORD-3 checks "cancelled or expired" and then applies a conditional update on `buyerPaidConfirmedAt IS NULL` only. That is check-then-act. An expiry sweep running at the TTL instant can set `expiredAt` and release the reservation while the buyer's "I paid" also commits. The result is an order that is both paid and expired, with its stock already released.
  - The refusal code is `OrderNotCancellable`, which is misleading for a confirmation, not a cancellation.
- **F-06 FR-ORD-6 acceptance can't be met.** It asks for "each of the 8 combinations of the three facts" to render a distinct label. Three combinations are unreachable, because the business and item confirmations both require payment. The same FR also says a closed order stays closed whatever the business confirmation, which collapses two combinations into one label. ADD-§4.2 defines 6 derived statuses.
- **F-07 Order creation has no abuse limit.** Any account can create unlimited unpaid orders. Each one reserves stock for 48 h and reveals the business's bank details. A single griefer can lock a shop's entire inventory indefinitely by re-ordering on expiry, and can harvest payment instructions at scale.
- **F-08 Listing quantity semantics are inconsistent.**
  - FR-INV-1 adds `quantity` to an existing `InventoryUnit`, while FR-INV-2 leaves an existing unit unchanged for bundles.
  - A seller who lists the same physical copy twice (say, at two prices) therefore doubles their declared stock. That is the exact oversell the shared-pool design exists to prevent.
- **F-09 A newly approved business can sell commission-free.**
  - FR-COM-1 publishes `Exhausted` with `ledgerSeq: 0`. FR-INV-7 applies an event only if `ledgerSeq > lastAppliedSeq`, and a new projection starts at 0, so the event is dropped.
  - Even if it were applied, approval restores and badges the listings (FR-INV-8) before the Exhausted event arrives. Without automatic retry (NFR-SYS-6), one lost event leaves the business purchasable with a zero balance indefinitely.
  - FR-COM-1's "re-approval after a rejection" case cannot occur. An account only exists after an approval, and there is no revocation.
- **F-10 A negative balance plus a small top-up leaves the seller confused.** A top-up that doesn't lift a negative balance above 0 is confirmed but changes nothing visible, and no copy says how much is needed to resume. This breaks the "explained decision" promise at the moment the seller has just paid.
- **F-11 Offers on sibling listings aren't resolved.** FR-TRD-5 marks as `Unfulfillable` only the competing offers on the accepted listing. INV lets a unit back several listings (FR-INV-4). Offers on a sibling listing whose shared unit just hit 0 stay `Open`, and each later accept fails with `InsufficientQuantity` while the offer remains `Open`. The FR-TRD-5 claim that the loser always ends `Unfulfillable` is false for siblings.
- **F-12 TRD confirmation fields have the wrong names.** `TradeOffer` names the parties `proposerId` and `sellerId`, but the completion facts are `buyerConfirmedAt` and `sellerConfirmedAt`. A trade has no buyer. The mismatch will leak into UX copy ("Waiting for the buyer").
- **F-13 The external-URL length rule ignores trade summaries.**
  - FR-MSG-2 truncates only the product name to keep `externalUrl` ≤ 2,000 characters.
  - A trade handoff carries up to 10 offered items plus cash. With long names the URL overflows even after the product name is reduced to "…".
  - No acceptance case covers it.
- **F-14 There is no platform-level abuse baseline.**
  - Contact limits are per requester, so multiple free accounts defeat them, and each generated link exposes a seller's phone.
  - No FR or NFR covers sign-in or sign-up throttling, or email verification before contact, orders, offers or messages.
  - Uploads are type-sniffed but never malware-scanned, even though admins open applicant PDFs.
- **F-15 No retention periods for regulated data.**
  - §5 defers data-subject tooling, but nothing states how long the following are kept:
    - legal-identity documents (including those of rejected or barred applicants);
    - comprobantes;
    - top-up proofs;
    - phone numbers;
    - message bodies.
  - Ley 1581 requires purpose-bound retention, and "indefinite" is only stated for admin audit rows (A-3).
- **F-16 Failed deliveries alert nobody.** NFR-SYS-6 has a failed-delivery log and admin replay but no automatic retry, no alert, no dashboard signal and no age target. A lost deduction or pause event is discovered only if an admin happens to look.
- **F-17 The measurement environment differs from production.**
  - Latency NFRs and concurrency proofs run on Docker Compose with a pool of at least 50 connections.
  - Production is Vercel Hobby plus Supabase, with pooler connection limits and transaction-mode pooling.
  - The PRD neither says that targets are verified only in the reference environment nor asks Phase 3 to prove that interactive transactions and row locks behave the same through the production pooler.
- **F-18 NFR-IDN-1 measures below the interface maximum.** `getSellerKinds` accepts up to 500 ids, but the NFR measures 100, so the worst case callers can trigger is never measured.
- **F-19 Addendum and PRD body have drifted.**
  - Codes named only in the addendum:
    - `ListingUnverified` and `FxRateCarriedForward` appear in ADD-§3.2 but not in the FR bodies (FR-INV-7, FR-CAT-8).
    - Four NotFound codes (`ApplicationNotFound`, `CatalogEntryNotFound`, `CollectionEntryNotFound`, `ReviewNotFound`) have triggers only in the addendum.
  - Inconsistent definitions:
    - ADD-§2.8 says `copDerivation='native'` where FR-CAT-5 says `'sourceNative'`.
    - ADD-§3.1's `ListingNotPurchasable` trigger omits withdrawn and deactivated listings, which FR-INV-3 includes.
- **F-20 TRM retry policy contradicts itself.** NFR-CAT-4 says at most 3 retries with backoff. ADD-§6 says hourly retries from 07:00 until 20:00.
- **F-21 FR-VAL-3's copy contradicts its own acceptance.** The summary line reads "Valued 445 of 500 items", but the acceptance expects `valuedCount=450` (500 − 20 link-added − 30 unpriced).
- **F-22 The valuation drift bound is ill-defined.**
  - FR-VAL-1 states the bound as `0.5 × Σ qty`, a non-integer for odd sums, and includes native-COP entries. ADD-§2.8 says `floor(Σ qty / 2)` and excludes them.
  - `convertOnce(ΣUSD)` in NFR-VAL-1 has no meaning, because each observation is converted with the TRM of its own date (FR-CAT-5). There is no single rate to "convert once" with.
- **F-23 The value history rewrites the past.** FR-VAL-2 and FR-VAL-4 reconstruct V(t) from the entries that exist today. Deleting, moving or removing entries (or a whole collection, FR-COL-1) silently changes historical values and trend baselines. The PRD presents the series as history without saying it is "today's holdings over time".
- **F-24 Set completion can exceed 100%.** FR-COL-5 divides by `CatalogSet.cardCount`. Sets with secret rares numbered above the printed total (for example 191/165) push completion over 100%, and sealed products in a set filter would count too.
- **F-25 Bundles and the post-purchase prompt don't fit.** The `Order` snapshot and `OrderClosed.lines` carry a single `itemRef`. A bundle listing has no single `itemRef`, so FR-COL-7's "one entry per line" either fails or creates one meaningless entry for a bundle purchase.
- **F-26 The NIT rule excludes natural-person shops.** FR-VER-1 fixes a NIT at "9 digits plus a check digit". A persona natural's NIT is the cédula (6–10 digits) plus a check digit, and many small TCG shops are personas naturales. They would be rejected at the form. Foreign-resident applicants (cédula de extranjería) are also silently unsupported.
- **F-27 The stalled-order support path is undefined.**
  - NFR-ORD-4 shows a "contact support" link, but no FR says what the link points to.
  - Admins have no read-only order lookup at all, even though OQ-3 already recommends an admin view of closed-but-unconfirmed orders.
- **F-28 FR-DSC-2's acceptance contradicts itself.** It requires each distance to be "within 1 m of a reference implementation" and then names Vincenty/WGS-84 "allowing the 0.5% spherical error", about 1.5 km at 300 km. NFR-DSC-2 says the reference is haversine.
- **F-29 In-app messaging has no protection.** Buyers cannot block or mute a business thread. `Harassment` is a moderation reason (ADD-§9.2), yet messages cannot be moderated (FR-MSG-7, out of scope). A `Pending` (unverified) business can reply indefinitely to a buyer who wrote once.
- **F-30 `view=entries` results are unbounded.** In FR-DSC-1, every entry carries its full ranked `listings[]`. A popular card with hundreds of listings makes a 24-entry page arbitrarily large, and NFR-DSC-1 doesn't cover it.

## Triage (recommendation for the gate)

| # | Recommendation | Fix (applied now if Accept) |
| --- | --- | --- |
| F-01 | **Accept** | §3 changes to 14 business accounts: 8 Approved (one with a prior Rejected application), 3 Pending, and 3 Rejected (1 in cooldown, 1 with an expired cooldown, 1 barred). The VER and IDN seeds reference that set. |
| F-02 | **Accept** | `canBuy` = authenticated, with sign-up consent recorded and email verified (links to F-14). Account suspension joins the §5 non-goals [ASSUMPTION]. |
| F-03 | **Accept** | Close the `outcome` union with the values the FRs actually use. Phase 3 fixes the type. |
| F-04 | **Accept** | Shape and field validation is evaluated first and aggregates all field issues. Domain rules are first-fail, in order. |
| F-05 | **Accept** | The confirm predicates include `cancelledAt IS NULL AND expiredAt IS NULL`. New code `OrderNoLongerActive` (orders) replaces the misuse. NFR-ORD-1 adds the paid-vs-expiry race. |
| F-06 | **Accept** | The acceptance becomes: the 5 reachable fact combinations (two of which both render `Closed`) plus `Cancelled` and `Expired` map to the 6 ADD-§4.2 statuses. The 3 unreachable combinations are proven to be rejected. |
| F-07 | **Accept** | Limits: at most 3 `AwaitingPayment` orders per buyer, and 1 per buyer per business. New code `TooManyOpenOrders` (orders). Both limits are OQ-11 parameters. |
| F-08 | **Accept** | Listing onto an existing unit links it without changing its quantity; stock changes only through restock (FR-INV-9). |
| F-09 | **Accept** | Fail closed: a business with no `SellerCommissionState` row is paused. The projection starts empty, so the seq-0 event applies. FR-COM-1 wording fixed. |
| F-10 | **Accept** | The balance page and the top-up confirmation state the amount needed to resume. |
| F-11 | **Accept** | `reserveForTrade` returns the listing ids whose availability reached 0, and FR-TRD-5 resolves Open offers on all of them. |
| F-12 | **Accept** | Rename to `proposerConfirmedAt` / `sellerConfirmedAt`. |
| F-13 | **Accept** | Truncation order: product name, then offered-item names, then collapse to "+N more". Amounts and conditions are never truncated. A 10-item acceptance case is added. |
| F-14 | **Accept (partial)** | NFR-SYS-14 is added: auth throttling, email verification before the first contact, order, offer or message, and a per-IP contact limit. Malware scanning of uploads is **deferred to Phase 3** as an AD candidate. |
| F-15 | **Gate** | New OQ-12: retention periods per regulated-data class. Recommendation: adopt the [ASSUMPTION] defaults listed in OQ-12, have legal counsel validate them before launch, and handle data-subject requests manually through the admin at launch. |
| F-16 | **Accept** | The admin console shows unreplayed failures with their age, and a target of 0 failures older than 24 h is added to §22. |
| F-17 | **Accept** | §7 states that targets are verified in the reference environment, adds a non-gating production smoke check, and routes the pooler/interactive-transaction question to Phase 3 as an AD candidate. |
| F-18 | **Accept** | NFR-IDN-1 is measured at 500 ids. |
| F-19 | **Accept** | Name the codes in the FR bodies and align `sourceNative` and the `ListingNotPurchasable` trigger. |
| F-20 | **Accept** | NFR-CAT-4 aligned: hourly attempts 07:00–20:00, each with up to 3 backoff retries. |
| F-21 | **Accept** | "Valued 450 of 500 items". |
| F-22 | **Accept** | The bound is `floor(Σ qty_fx / 2)`, counting only FX-derived entries. `convertOnce` is defined per TRM date group. |
| F-23 | **Accept** | Stated explicitly as "value of your current holdings over time", with UI label copy [ASSUMPTION]. |
| F-24 | **Accept** | The denominator is the catalog's count of `card` entries in the set; the numerator is a subset of it, so the result never exceeds 100%. |
| F-25 | **Accept** | Bundle orders snapshot their components. `OrderClosed.lines` expands to one line per component, with `qty = perBundleQty × qty`. |
| F-26 | **Accept** | The NIT base is 6–10 digits plus a check digit. Cédula de extranjería is out of scope at launch [ASSUMPTION]. |
| F-27 | **Accept** | New FR-ORD-10: an audited, read-only admin order lookup. The NFR-ORD-4 link points to a support contact held in configuration. OQ-3 keeps only the question of whether to act on stalled orders. |
| F-28 | **Accept** | Reference = independent haversine at ≤ 1 m. Vincenty is a documented sanity check only. |
| F-29 | **Defer** | SPEC non-goal (no user reports). Owner: Phase 2 UX, to evaluate a buyer-side "mute conversation". Revisit if harassment reports arrive after launch. |
| F-30 | **Accept** | `view=entries` caps `listings[]` at 5 per entry and adds `moreCount`. |

**Counts.** 30 findings: 28 Accept (F-14 partial) · 1 Defer (F-29, later taken into V1 as FR-MSG-8, #15) · 1 Gate (F-15 → OQ-12, #14) · 0 Reject.
