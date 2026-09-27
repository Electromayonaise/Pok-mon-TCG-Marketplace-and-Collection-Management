---
title: TEZG — Plan-2 PRD Addendum
created: 2026-09-23
updated: 2026-09-27
status: final
companion: prd.md
---

# Addendum to the Plan-2 PRD

This addendum holds the depth the PRD cites as `ADD-§n` and that UX, architecture and tests will need verbatim: copy rules, exact formulas with test vectors, the error and decision registries, state tables, event payloads, external-source contracts, seed defect kinds and policy defaults. The PRD states *what* must hold. This document states the exact numbers and strings that make those requirements testable.

Anything here marked **[ASSUMPTION]** is a proposed default that the Phase 1 gate may change. Anything marked **[verify at implementation]** is a fact about an external system that must be re-checked against the live source before code depends on it.

---

## ADD-§1 Tone and copy

### 1.1 Voice

- **Language.** Launch copy is Colombian Spanish (es-CO). The English strings in the PRD and this addendum are illustrative translations; UX writes the es-CO strings from them.
- **Address.** The surface that renders a message decides the treatment, not the module that owns its code (human review, decision log #40). Use *tú* on buyer and seller surfaces. Use *usted* on admin surfaces and on the business-verification surfaces an applicant sees. A code shown on more than one surface has one template variant per surface (EXPERIENCE Voice and Tone; `microcopy-es-CO.md`) [ASSUMPTION: this matches local marketplace norms].
- **Say what happened and what to do next.** Every refusal names the fact that caused it and the next available step. Examples:
  - "Your listings are paused until you top up your balance." Never "Account suspended due to insufficient funds."
  - "You can review Andrés's shop once you've confirmed the item arrived — paying isn't enough."
  - "Valentina hasn't opened this card to trades."
- **No internal vocabulary.** `humanMessage` and UI strings never show DomainError codes, DecisionCodes, table names, state-machine field names or stack traces.
- **Dates and times** are rendered in `America/Bogota` as "29 sep 2026, 3:00 p. m." (es-CO), and relative forms ("hace 2 horas") only in lists.

### 1.2 Forbidden phrases

The CI check from NFR-SYS-1 fails if any `humanMessage` template or UI error string contains one of these phrases, matched case-insensitively and ignoring accents:

| English | es-CO |
| --- | --- |
| Operation failed | Operación fallida |
| Something went wrong | Algo salió mal |
| An error occurred | Ocurrió un error |
| Invalid input | Entrada inválida / Datos inválidos |
| Access denied | Acceso denegado |
| Unauthorized | No autorizado |
| Request failed | La solicitud falló |
| Account suspended | Cuenta suspendida |
| Unknown error | Error desconocido |
| Please try again later *(as the whole message)* | Intenta más tarde *(como mensaje completo)* |

The check also fails when a template contains a PascalCase token that matches a registered code (ADD-§3).

### 1.3 Business-verification status copy (FR-VER-7)

| Status | Headline | Body |
| --- | --- | --- |
| `Pending` | "We're reviewing your shop" | "You can already publish listings. They'll show without the verified badge, and buyers can't purchase them yet. Shops can message you in-app with a 'not yet verified' notice." |
| `Approved` | "Your shop is verified" | "Your listings now show the verified badge. Top up your commission balance to start selling." |
| `Rejected` (with cooldown) | "We couldn't verify your shop" | "\<reason text\>. \<admin note, if any\>. You can apply again from \<date\>." |
| `Rejected` (barred) | "We couldn't verify your shop" | "\<reason text\>. \<admin note, if any\>. This decision is final for this account." |

---

## ADD-§2 Formulas and rounding

Every rounding rule in the package is listed here and named where it is used (NFR-SYS-5). All money arithmetic is integer. `round_half_up` means **round half away from zero**, so it is symmetric for negative values (−2.345 → −2.35).

### 2.1 USD → COP reference conversion (CAT)

- The TRM is stored as `copPerUsdCentavos` (COP per USD × 100). A USD price is stored as `usdCents`.
- `cop = floor((usdCents × copPerUsdCentavos + 5,000) / 10,000)`, which is round-half-up to the whole peso. The same formula applies to prices that are never negative.
- This conversion happens **once**, when the observation is stored, and its result is the `cop` field of `ReferencePrice`. Nothing downstream re-converts.
- The TRM used is the one whose validity covers the observation date (FR-CAT-8). `fxRateDate` stores that rate's `validFrom`.

**Test vector:** USD 12.34 (`usdCents=1234`) at TRM 4,012.37 (`401237`) gives `1234 × 401237 = 495,126,458`, then `(495,126,458 + 5,000) // 10,000 = 49,513`. The exact value is 49,512.6458, so COP 49,513 is correct.

### 2.2 Period change percentage (CAT card trend, VAL collection trend)

- `changePercent = round_half_up(Δ × 10,000 / base) / 100`, to 2 decimal places, where:
  - CAT: `base` = the latest observation with `observedAt ≤ start`, and `Δ = P_now − base`;
  - VAL: `base = V(start)`, and `Δ = V(asOf) − V(start)`.
- Integer implementation: `n = Δ × 10,000`, then `q = (|n| × 2 + base) // (2 × base)`, and `sign(n) × q` hundredths of a percent.
- `base = 0` or no base observation → `changePercent = null`. The reason is `TrendNoBaseline` for a card (catalog) and `ValuationNoBaseline` for a collection (collections). There is never a division by zero.

**Test vectors:**
- base 40,000, now 45,000 → 12.50%.
- base 30,000, now 29,999 → −0.00333…% → −0.00%. It is rendered as "0,00 %" and never "−0,00 %".
- base 3, now 4 → 33.33%.
- base 0 → `null`.

### 2.3 Distance (DSC)

- Haversine on a sphere with R = 6,371.0088 km (the IUGG mean radius):
  `d = 2R · asin(√(sin²(Δφ/2) + cos φ₁ · cos φ₂ · sin²(Δλ/2)))`, in double precision.
- **Inclusion:** a listing is inside the radius when `d ≤ r + 0.000001` km. The 1 mm tolerance makes the boundary inclusive and stable across platforms.
- **Display:** `d` is rounded half-up to 0.1 km ("4,9 km"). The ranking uses the unrounded value.

**Test vectors** (tolerance ±0.01 km):
- Bogotá (4.7110, −74.0721) → Medellín (6.2442, −75.5812): 238.67 km.
- Bogotá → Cali (3.4516, −76.5320): 306.67 km.
- Bogotá → Barranquilla (10.9685, −74.7813): 700.17 km.
- Bogotá → a point 0.0450° of longitude east: 4.99 km, so it is inside a 5 km radius.

### 2.4 Colombia bounding box (IDN, INV, DSC)

- Latitude [−4.23, 13.39] and longitude [−81.73, −66.85], inclusive. This covers the mainland, San Andrés and Providencia.
- It is a **plausibility check, not a border check**. It also contains parts of Venezuela, Ecuador, Peru, Brazil, Panama and open sea. The meeting point's city label is a separate human-entered field.
- The sentinel (0, 0) is always unusable, and so is any null coordinate.

### 2.5 NIT check digit (VER)

DIAN's modulus-11 algorithm:

1. Take the NIT body (6–10 digits; companies have 9, personas naturales use their cédula). Multiply its digits from **right to left** by the weights 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71.
2. Let `r = Σ mod 11`.
3. The check digit is `r` when `r ∈ {0, 1}`, and `11 − r` otherwise.

**Test vectors:**

| NIT body | Check digit | Note |
| --- | --- | --- |
| 800197268 | 4 | DIAN's own NIT |
| 890903938 | 8 | a known public NIT |
| 860034313 | 7 | a known public NIT |
| 900373913 | 4 | computed |
| 811001234 | 3 | computed |
| 79123456 | 0 | computed; 8-digit persona natural (cédula-based) |
| 1020304050 | 8 | computed; 10-digit persona natural |

Input may arrive with dots or a hyphen ("890.903.938-8"). It is normalised to digits before validation, and the stored form is `body` + `dv`.

### 2.6 Commission (COM)

- `c = floor((totalCop × rateBps + 5,000) / 10,000)`, which is round-half-up to the whole peso. `rateBps` is an integer from 0 to 10,000.

**Test vectors at 800 bps:** 45,000 → 3,600 · 45,006 → 3,600 (3,600.48) · 45,007 → 3,601 (3,600.56) · 1,000 → 80 · 100,000,000 → 8,000,000.

### 2.7 COP and USD display format

- The canonical es-CO COP string is `"$" + digits grouped by "." in threes`. There are no decimals and no space after `$`.
  - Where a currency could be ambiguous, which covers every message that leaves the platform and every screen that also shows USD, append `" COP"`.
  - A negative value uses a leading minus sign (U+2212): "−$2.200".
- The string is built by the platform's own formatter, **not** by `Intl.NumberFormat`, because runtime ICU versions differ on the space and the symbol.
- USD reference is shown as "US$12,34", using the es-CO decimal comma, and always next to "TRM al \<fecha\>".

**Test vectors:** 1,000 → "$1.000 COP" · 45,000 → "$45.000 COP" · 20,000 → "$20.000 COP" · 100,000,000 → "$100.000.000 COP" · −2,200 → "−$2.200".

### 2.8 Valuation drift bound (VAL)

- Each FX-derived `unitCop` is an integer rounded half-up from the exact USD × TRM product of its own `fxRateDate` (ADD-§2.1), so its error `e_i = unitCop_i − exact_i` lies in `(−0.5, 0.5]`.
- `convertOnce` is defined per rate date. Group the FX-derived entries by `fxRateDate`, and let `E_g = Σ_{i∈g} qty_i · exact_i` and `S_g = Σ_{i∈g} qty_i · unitCop_i`. Then `convertOnce = Σ_g round_half_up(E_g)`.
- **Bound per group.** With `q_g = Σ_{i∈g} qty_i`, `S_g − E_g ∈ (−q_g/2, q_g/2]` and `round_half_up(E_g) − E_g ∈ (−0.5, 0.5]`, so the integer `D_g = S_g − round_half_up(E_g)` lies strictly inside `(−q_g/2 − 0.5, q_g/2 + 0.5)`. Hence `|D_g| ≤ floor(q_g / 2)`.
- **Bound overall.** `|Σ_g D_g| ≤ Σ_g floor(q_g / 2) ≤ floor(Σ_g q_g / 2)`. So `conversionDriftBoundCop = floor(Σ qty over FX-derived entries / 2)` holds however many TRM dates the collection spans.
- Entries priced natively in COP (`copDerivation='sourceNative'`) have no conversion error and are left out of both `convertOnce` and the sum of quantities.
- The bound is reported for transparency and is **never** applied to the total. The displayed total is always the exact sum of per-item values.

**Test vector:** 3 copies at USD 0.10 and TRM 4,012.35 (exact 401.235 → `unitCop` 401) plus 2 copies at USD 0.10 and TRM 3,990.05 (exact 399.005 → 399). `S` = 1,203 + 798 = 2,001. `convertOnce` = round(1,203.705) + round(798.01) = 1,204 + 798 = 2,002. Drift 1 ≤ bound floor(5/2) = 2.

### 2.9 Reputation average (REP)

- `average = round_half_up(10 × sum / count) / 10`. In integer form this is `floor((20 × sum + count) / (2 × count))` tenths, which is valid because `sum` and `count` are positive.
- `count = 0` → no average ("No reviews yet").

**Test vectors:** sum 51, count 12 → 4.25 → **4.3** (banker's rounding would give 4.2) · sum 46, count 11 → 4.18 → 4.2 · sum 5, count 1 → 5.0.

---

## ADD-§3 Registries

### 3.1 DomainError codes with triggers

This is the contract-test source for NFR-SYS-1: every row has at least one test that triggers it and asserts the full `Decision` shape. The owners match PRD §4.2. "Propagated by" lists modules that re-throw a code unchanged. Phase 3 added the rows of ARCHITECTURE §8.1 and adjusted three triggers per §8.3.

| Code | Owner | Trigger | FR |
| --- | --- | --- | --- |
| `NotAuthenticated` | identity | Any authenticated procedure called without a session | FR-IDN-7 |
| `AdminOnly` | identity | A non-admin calls an admin procedure | FR-IDN-7 |
| `EmailNotVerified` | identity | A command that needs `canBuy` (contact, order, trade offer, message) from an account whose email is not verified. Propagated by `listings`, `orders`, `trading` and `messaging` | FR-IDN-1, FR-MSG-1, FR-ORD-1, FR-TRD-1, FR-MSG-5, NFR-SYS-14 |
| `AuthRateLimited` | identity | Sign-in over 10 failed attempts per account or 30 per IP in 15 minutes; sign-up over 5 per IP per hour | NFR-SYS-14 |
| `IndividualSellerProfileIncomplete` | identity | Listing creation by an account with `sellerKind='none'` | FR-IDN-3 |
| `IndividualSellerProfileAlreadyComplete` | identity | Completing the profile again, or submitting a business application after the profile is complete (exclusivity) | FR-IDN-2, FR-IDN-4 |
| `AlreadyVerifiedBusiness` | identity | Completing the individual profile when the latest application is `Approved` | FR-IDN-2, FR-IDN-4 |
| `BusinessApplicationOnFile` | identity | Completing the individual profile while any application is `Pending` or `Rejected` (OQ-1) | FR-IDN-2 |
| `NotBusinessAccount` | identity | In-app message to a recipient that is not an `Approved` or `Pending` business. Propagated by `messaging` | FR-IDN-6, FR-MSG-4, FR-MSG-6 |
| `SellerNotVerified` | identity | Listing creation or restore while the latest application is `Rejected`. Propagated by `listings` | FR-IDN-3, FR-VER-6 |
| `ApplicationAlreadyPending` | identity | Submitting an application while one is `Pending` | FR-VER-1 |
| `ApplicationNotPending` | identity | Approving or rejecting an application that is no longer `Pending` (race loser, stale tab) | FR-VER-3, FR-VER-4 |
| `ApplicationNotFound` | identity | Unknown application id on any VER admin read or decision | FR-VER-2, FR-VER-5 |
| `MissingRequiredField` | identity | A required application field is absent. Every missing field is listed | FR-VER-1 |
| `ReapplicationCooldownActive` | identity | Reapplying before `reapplyNotBefore` | FR-VER-6 |
| `ReapplicationBarred` | identity | Reapplying after a rejection whose reason bars reapplication | FR-VER-6 |
| `LegalIdentityAccessDenied` | identity | Any access to `legalIdentity` or documents other than `getApplicationForReview` by an admin. Audited | FR-VER-5 |
| `RejectionReasonUnknown` | identity | Rejecting with an inactive or unknown reason code | FR-VER-4 |
| `LastActiveReasonRequired` | identity | Deactivating the only active rejection reason | FR-VER-8 |
| `InvalidDocumentFile` | identity | A VER document that fails the upload pipeline (size, magic bytes, scanner). The cause is cited | FR-VER-1, NFR-SYS-14 |
| `CatalogEntryNotFound` | catalog | Unknown catalog entry id on card detail or provenance | FR-CAT-2, FR-CAT-6 |
| `FeedRunInProgress` | catalog | Starting an ingestion while another run is active | FR-CAT-3 |
| `InvalidItemRef` | listings | Unknown or kind-mismatched `itemRef` on a listing, bundle component or trade item. Propagated by `trading` | FR-INV-1, FR-INV-2, FR-TRD-1 |
| `InvalidPrice` | listings | Price outside COP 1,000–100,000,000 or not an integer | FR-INV-1 |
| `InvalidLocation` | listings | Meeting point outside ADD-§2.4, or the sentinel (0, 0) | FR-INV-1 |
| `EmptyComponentList` | listings | A bundle with no components | FR-INV-2 |
| `SealedProductInBundle` | listings | A bundle component of kind `sealedProduct` | FR-INV-2 |
| `OpenToTradeNotAllowed` | listings | `openToTrade=true` on a business listing | FR-INV-1 |
| `ListingNotOpenToTrade` | listings | An offer or acceptance on a listing with `openToTrade=false`, thrown by `getTradeability`. Propagated by `trading` | FR-TRD-1, FR-TRD-4 |
| `NotBusinessListing` | listings | Purchase reservation against an individual-seller listing. Propagated by `orders` | FR-INV-3, FR-ORD-1 |
| `NotIndividualSellerListing` | listings | Contact message or trade on a business listing | FR-MSG-1, FR-TRD-1 |
| `InsufficientQuantity` | listings | Reservation larger than availability, or the loser of a last-unit race. Propagated by `orders` and `trading` | FR-INV-3, FR-ORD-1, FR-TRD-4 |
| `ListingNotFound` | listings | Unknown, hidden, withdrawn or deactivated listing for a non-owner | FR-INV-10, FR-REP-5, FR-MSG-1 |
| `ListingNotOwnedByCaller` | listings | A non-owner edits, pauses, deactivates or restocks a listing | FR-INV-9 |
| `ListingNotPurchasable` | listings | Order attempt on a business listing that is `Unverified`, `Paused`, withdrawn or deactivated. The citation carries the DecisionCode or the state | FR-INV-3, FR-INV-7 |
| `InvalidSearchArea` | listings | Radius outside 1–300 km, or a centre outside ADD-§2.4 | FR-DSC-1 |
| `SearchFilterTooBroad` | listings | `view=listings` catalog filters that match more than 20,000 entries | FR-DSC-1 |
| `ContactRateLimited` | listings | Over 30 contact messages per hour, 10 per seller per day, or 60 per IP per hour. Not raised for a repeat within 60 min for the same `(requesterId, listingId)`, nor for a trade handoff | FR-MSG-3, NFR-SYS-14 |
| `SelfPurchaseNotAllowed` | orders | Buying one's own listing | FR-ORD-1 |
| `ComprobanteInvalidFile` | orders | A comprobante whose sniffed type is not JPEG, PNG or PDF, or that is over 5 MB | FR-ORD-2 |
| `ComprobanteLocked` | orders | Replacing a comprobante after the buyer confirmed payment | FR-ORD-2 |
| `ComprobanteNotYetUploaded` | orders | Buyer confirms payment with no comprobante | FR-ORD-3 |
| `ComprobanteMissingOnConfirm` | orders | Business confirms receipt with no comprobante (defensive) | FR-ORD-4 |
| `OrderAlreadyConfirmedByRole` | orders | Repeating a confirmation (safe repeat; original timestamp cited) | FR-ORD-3, FR-ORD-4, FR-ORD-5 |
| `OrderConfirmationOutOfOrder` | orders | Buyer confirms the item arrived before confirming payment | FR-ORD-5 |
| `OrderNotVisibleToCaller` | orders | The business reads or acts on an order before the buyer confirmed payment; any third party | FR-ORD-4, FR-ORD-6 |
| `OrderNotOwnedByCaller` | orders | A wrong-role actor on an order they can see | FR-ORD-2, FR-ORD-4 |
| `OrderNotCancellable` | orders | Cancelling after payment confirmation, or after cancel or expiry. Confirmations on a cancelled or expired order get `OrderNoLongerActive` instead | FR-ORD-7 |
| `OrderNoLongerActive` | orders | A confirmation (buyer paid, business received, buyer item received) on an order that is cancelled or expired (including one past `expiresAt` whose expiry is not yet stored), including the loser of the paid-vs-expiry race | FR-ORD-3, FR-ORD-4, FR-ORD-5 |
| `TooManyOpenOrders` | orders | A new order while the buyer already holds 3 `AwaitingPayment` orders, or 1 with the same business (OQ-11) | FR-ORD-1 |
| `TopUpAmountInvalid` | commission | Top-up outside COP 20,000–10,000,000 | FR-COM-2 |
| `TopUpNotPending` | commission | Confirming or rejecting a top-up that is already decided | FR-COM-3 |
| `TopUpNotVisibleToCaller` | commission | A business reads another business's top-up request | FR-COM-3 |
| `TopUpProofInvalidFile` | commission | A top-up proof that fails the upload pipeline | FR-COM-2, NFR-SYS-14 |
| `TopUpNotFound` | commission | An unknown top-up id on an admin read or decision | FR-COM-3 |
| `CommissionRateNotFutureDated` | commission | Setting a rate whose `effectiveFrom` is earlier than now (60 s tolerance) | FR-COM-7 |
| `SelfTradeNotAllowed` | trading | An offer on one's own listing | FR-TRD-1 |
| `EmptyTradeOffer` | trading | An offer or counter with no items and COP 0 | FR-TRD-1 |
| `DuplicateOpenOffer` | trading | A second `Open` offer by the same proposer on a listing | FR-TRD-1 |
| `NotYourTurn` | trading | An action by the party whose turn it isn't | FR-TRD-2 |
| `TradeCounterUnchanged` | trading | A counter whose terms equal the current round's terms (normalized item multiset and `cashCop`) | FR-TRD-2 |
| `TradeRoundLimitReached` | trading | A counter that would create round 11 | FR-TRD-2 |
| `TradeOfferNotOpen` | trading | An action on a non-`Open` offer (stale version, expired, or already resolved) | FR-TRD-2, FR-TRD-5, FR-TRD-9 |
| `TradeOfferNotVisibleToCaller` | trading | Any third party reading an offer | FR-TRD-3 |
| `TradeNotAccepted` | trading | Confirming completion of an offer that is not `Accepted` | FR-TRD-7 |
| `TradeAlreadyConfirmedByRole` | trading | Repeating a completion confirmation | FR-TRD-7 |
| `TradeNotCancellable` | trading | Cancelling after either party confirmed completion | FR-TRD-8 |
| `ConversationNotVisibleToCaller` | messaging | A non-participant reads a conversation | FR-MSG-7 |
| `BusinessCannotInitiate` | messaging | A business opens a new conversation | FR-MSG-4 |
| `CollectionNotFound` | collections | Unknown or foreign collection id | FR-COL-1 |
| `CollectionNameTaken` | collections | A duplicate name, case- and accent-insensitive | FR-COL-1 |
| `CollectionLimitReached` | collections | Creating a 51st collection | FR-COL-1 |
| `CollectionEntryNotFound` | collections | Unknown or foreign entry id on move, copy, edit or remove | FR-COL-4 |
| `InvalidExternalLink` | collections | A link entry whose URL, title or image fails the rules | FR-COL-3 |
| `InvalidCatalogEntry` | collections | Adding a catalog entry whose id `catalog.getEntries` reports as missing | FR-COL-2 |
| `PromptAlreadyResolved` | collections | Accepting or dismissing a prompt that is not `Pending` | FR-COL-7 |
| `InvalidValuationPeriod` | collections | Period outside {7, 30, 90, 365} | FR-VAL-2 |
| `TargetNotFound` | reviews | Review target not an `Approved` business nor a complete individual seller | FR-REP-1, FR-REP-2 |
| `NotVerifiedPurchaser` | reviews | Business review with no closed purchase | FR-REP-1 |
| `DuplicateReview` | reviews | A second review of the same target by the same reviewer | FR-REP-1, FR-REP-2 |
| `ReviewNotFound` | reviews | Unknown review id on edit, hide or unhide | FR-REP-4 |
| `RequestValidationFailed` | shared-kernel | Shape-level input failure (type, length, required, enum), with issues per field. Produced only by the tRPC input parser; a module never raises it (OQ-7, AD-SYS-1 rule 7) | all |
| `EventDeliveryNotReplayable` | shared-kernel | Replaying an event delivery that is not `failed` | NFR-SYS-6 |
| `DeliveryAttemptsExhausted` | shared-kernel | A `pending` event delivery used its 3 automatic attempts without a recorded outcome. Stored as `lastErrorCode`, never thrown | NFR-SYS-6 |

### 3.2 DecisionCodes

These are non-error decisions returned in `Decision.reasonCode` or as citations inside an error.

| DecisionCode | Owner | Meaning | FR |
| --- | --- | --- | --- |
| `ListingUnverified` | listings | Business listing visible but not purchasable while the application is `Pending` | FR-INV-7 |
| `ListingPausedBalanceExhausted` | listings | Business listing paused because the commission balance is ≤ 0, or because no commission state has been received yet (fail-closed) | FR-INV-7 |
| `ListingLocationUnusable` | listings | Listing excluded from area search: missing, out-of-box or sentinel coordinates | FR-DSC-3 |
| `ReferencePriceStale` | catalog | Price older than the freshness threshold, shown with its date | FR-CAT-7 |
| `TrendNoBaseline` | catalog | No observation at or before the trend start | FR-CAT-6 |
| `FxRateCarriedForward` | catalog | No TRM covers the date; the latest earlier rate is used | FR-CAT-8 |
| `FxRateSourceMismatch` | catalog | A TRM re-fetch returned a value different from the stored rate for the same validity date. The stored rate is kept and the conflict is logged | FR-CAT-8, NFR-CAT-3 |
| `ListingNoLongerAvailable` | trading | Offer made `Unfulfillable` because the last unit went to another accepted offer, or because its own accept found the listing no longer tradeable | FR-TRD-5 |
| `RecipientNotYetVerified` | messaging | Recipient is a `Pending` business; the message is allowed with a notice | FR-MSG-4 |
| `ExternalEntryNotInCatalog` | collections | Link-added entry excluded from valuation | FR-VAL-3 |
| `NoReferencePrice` | collections | Catalog entry with no price, excluded from valuation | FR-VAL-3 |
| `ValuationNoBaseline` | collections | Collection value at the period start is 0 | FR-VAL-2 |

---

## ADD-§4 State tables

Every transition is a conditional update on the current state. A losing concurrent actor gets the listed error, never a silent overwrite.

### 4.1 BusinessApplication (identity)

| From | Action | To | Guard / loser error |
| --- | --- | --- | --- |
| — | submit | `Pending` | no `Pending` (`ApplicationAlreadyPending`); not barred or in cooldown; exclusivity (FR-IDN-4) |
| `Pending` | approve | `Approved` | `ApplicationNotPending` |
| `Pending` | reject(reason) | `Rejected` | `ApplicationNotPending`; `RejectionReasonUnknown` |
| `Rejected` | reapply | new application in `Pending` | cooldown / bar (FR-VER-6) |
| `Approved` | — | terminal | no revocation in V1 (PRD §5) |

### 4.2 Order (orders), derived from the three facts

| Derived status | Condition |
| --- | --- |
| `AwaitingPayment` | no `buyerPaidConfirmedAt`, not cancelled or expired |
| `Paid` | `buyerPaidConfirmedAt` set, `buyerItemReceivedConfirmedAt` null |
| `PaymentConfirmed` | `Paid` plus `sellerReceivedConfirmedAt` set |
| `Closed` | `buyerItemReceivedConfirmedAt` set, with or without the business confirmation. Either way the commission is charged once (FR-COM-4, OQ-3 gate decision) |
| `Cancelled` | `cancelledAt` set (only from `AwaitingPayment`) |
| `Expired` | `expiredAt` set (only from `AwaitingPayment`, at `expiresAt`) |

The reservation is released exactly once, on `Cancelled` or `Expired`. It is consumed and never released after `Paid`.

### 4.3 TradeOffer (trading)

| From | Action | Actor | To |
| --- | --- | --- | --- |
| — | create | proposer | `Open`, turn = seller |
| `Open` | counter | turn holder | `Open`, turn flips, version + 1 |
| `Open` | reject | turn holder | `Rejected` |
| `Open` | withdraw | proposer | `Withdrawn` |
| `Open` | accept | turn holder | `Accepted` (reserves 1 unit) |
| `Open` | sweep at `expiresAt` | system | `Expired` |
| `Open` | another offer takes the last unit | system | `Unfulfillable` (`ListingNoLongerAvailable`) |
| `Accepted` | cancel, before either confirmation | either | `Cancelled` (releases the reservation) |
| `Accepted` | confirm | each party once | `Accepted`; `completed` computed when both have confirmed |

### 4.4 CommissionAccount and TopUpRequest (commission)

- **Account:**
  - `Exhausted` → `Funded` when a credit takes the balance from ≤ 0 to > 0 (publishes `Replenished`).
  - `Funded` → `Exhausted` when a debit takes it from > 0 to ≤ 0 (publishes `Exhausted`).
  - It starts as `Exhausted` with seq 0, and the seq-0 `CommissionBalanceExhausted` (balanceAfter 0) is published on opening.
  - The `listings` projection (`SellerCommissionState`) is fail-closed: it starts **absent**, and an absent row means paused (FR-INV-7). The row is created by the first applied event.
- **TopUpRequest:** `Pending` → `Confirmed` | `Rejected`. Both are terminal, and the loser gets `TopUpNotPending`.

### 4.5 PostPurchasePrompt (collections)

`Pending` → `Accepted` (creates entries) | `Dismissed`. Both are terminal (`PromptAlreadyResolved`). There is no expiry.

### 4.6 Review and Listing moderation visibility (reviews, listings)

`Visible` ⇄ `Hidden`. Each transition writes a moderation-log row with actor, reason and time. There is no delete.

---

## ADD-§5 Event payloads

Events are published after commit (AD-3, AD-10). Subscribers are idempotent by the listed key. Delivery is durable through the transactional outbox: every delivery is a `pending` row until it is delivered, a delivery whose failure was never recorded gets at most 3 automatic attempts, and every failed delivery is logged and can be replayed by an admin (AD-SYS-2, ARCHITECTURE §7.3).

| Event | Publisher | Payload | Subscribers | Idempotency key |
| --- | --- | --- | --- | --- |
| `BusinessApplicationApproved` | identity | `{ applicationId, businessId, businessName, approvedAt, approvedBy }` | commission (open account), listings (restore + badge) | `businessId` (commission), `applicationId` (listings) |
| `BusinessApplicationRejected` | identity | `{ applicationId, businessId, reasonCode, reapplyNotBefore \| barred, rejectedAt }` | listings (withdraw) | `applicationId` |
| `OrderPaymentConfirmedByBusiness` | orders | `{ orderId, businessId, buyerId, totalCop, lines, sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }` (last field null unless the buyer already confirmed receipt) | commission (deduct, if first) | `orderId` |
| `OrderClosed` | orders | `{ orderId, buyerId, businessId, totalCop, lines: [{ itemRef, title, qty }], sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt }` (`sellerReceivedConfirmedAt` null if the business has not confirmed). A bundle line is expanded into its components, each with `qty = perBundleQty × orderQty` (FR-ORD-5) | collections (prompt), commission (deduct, if first) | `orderId` (per subscriber) |
| `CommissionBalanceExhausted` | commission | `{ businessId, ledgerSeq, balanceAfter }` (`balanceAfter = 0` on account opening) | listings (pause) | apply if no `SellerCommissionState` row exists, or `ledgerSeq >` the stored seq |
| `CommissionBalanceReplenished` | commission | `{ businessId, ledgerSeq, balanceAfter }` | listings (resume) | apply if no `SellerCommissionState` row exists, or `ledgerSeq >` the stored seq |
| `TradeAccepted` | trading | `{ tradeOfferId, listingId, sellerId, proposerId, terms, acceptedAt }` | none in V1 (reserved for notifications) | `tradeOfferId` |

`lines` in `OrderPaymentConfirmedByBusiness` is `[{ listingId, itemRef, title, qty, unitPriceCop }]`. V1 has one line per order (A-23), and the array shape keeps a later cart change non-breaking.

**Commission trigger (OQ-3, gate decision; payload names aligned at the human review round).** `commission` subscribes to both order events. Both payloads carry the same two facts, and both handlers call one pure function, `commissionTrigger(facts)`. It returns `commissionTriggeredAt = min(sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt)` over the non-null values and `trigger = businessConfirmed` or `buyerClosed` for whichever fact is earlier (a tie counts as `businessConfirmed`). Whichever event is delivered first creates the one `Deduction` for the `orderId`. The later event hits the unique key and is a no-op, so the amount, rate and trigger never depend on delivery order (FR-COM-4).

---

## ADD-§6 TRM source contract

- **Source:** Superintendencia Financiera de Colombia, "Tasa de Cambio Representativa del Mercado — Histórico", published on datos.gov.co as dataset `32sa-8pi3` (Socrata).
- **Request:** `GET https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde <= '{yyyy-mm-dd}T00:00:00' AND vigenciahasta >= '{yyyy-mm-dd}T00:00:00'`. An unauthenticated app token header is optional and recommended for rate limits. [verify at implementation]
- **Fields used:** `valor` (decimal string, COP per USD), `unidad` (expected `"COP"`), `vigenciadesde` and `vigenciahasta` (floating timestamps, date part only). [verify at implementation]
- **Parsing:** `valor` is parsed as a decimal **string** into `copPerUsdCentavos` without floating point. For example, `"4012.37"` becomes 401237. A value with more than 2 decimals is rounded half-up to centavos, and that rounding is logged. A row with `unidad ≠ "COP"` is rejected.
- **Schedule:** fetch daily at 07:00 `America/Bogota` for today's date. If no row covers today, make one attempt per hour until 20:00 [ASSUMPTION]. Each attempt retries transport failures at most 3 times with backoff (NFR-CAT-4). Weekend and holiday rates arrive as one row whose validity spans those days.
- **Failure:** the adapter never invents a rate. `getFxRate(date)` falls back to the latest earlier rate with `stale=true` (`FxRateCarriedForward`).
- **Swap:** the port is `FxRateSource.getRateCovering(date) → { copPerUsdCentavos, validFrom, validTo, source }`. Replacing the provider touches only the adapter and its contract test.

---

## ADD-§7 TopUpConfirmationPort

```ts
interface TopUpConfirmationPort {
  confirm(input: {
    topUpRequestId: string;
    amountCop: Cop;                       // must equal the request amount
    confirmedBy:
      | { kind: 'admin'; adminId: string }
      | { kind: 'provider'; provider: string; providerEventId: string };
    externalReference: string;            // bank or provider reference
  }): Promise<Decision>;
  reject(input: { topUpRequestId: string; reason: string; rejectedBy: { kind: 'admin'; adminId: string } }): Promise<Decision>;
}
```

- **V1 adapter:** the admin action from FR-COM-3.
- **V2 adapter:** a payment-provider webhook. It verifies the signature, maps to `confirm`, and is idempotent by `(provider, providerEventId)`.
- An amount mismatch is **not** auto-corrected. The request stays `Pending` and is flagged for admin review.
- Both adapters share one domain path, so the ledger, events and audit are identical.

---

## ADD-§8 Seed and feed fixtures

### 8.1 Row validation (FR-CAT-3)

A feed row is valid only when all of these hold:

1. Required fields are present: `externalKey`, `setCode`, `number`, `name`, `kind`, `eraCode`.
2. `setCode` exists in the feed's set list, or is created by the same run.
3. `number` matches the set's numbering pattern (digits, optionally with a letter prefix or suffix, or a slash total such as "025/165").
4. Any price is a non-negative integer in its minor unit (USD cents or COP pesos).
5. The currency pair is consistent: a row carries `usdCents`, `cop` or both, and when both are present, `cop` is within ±1 peso of the ADD-§2.1 conversion at the row's TRM date.

### 8.2 Defect kinds in the 10,000-row fixture (10 rows each)

| Defect kind | Example | Violates |
| --- | --- | --- |
| `MissingRequiredField` | empty `name` | 8.1-1 |
| `UnknownSet` | `setCode='XX9'` | 8.1-2 |
| `BadNumberFormat` | `number='twenty'` | 8.1-3 |
| `InvalidPrice` | `usdCents=-150` or `12.5` | 8.1-4 |
| `CurrencyPairInconsistent` | `usdCents=1000` with `cop=90000` at TRM 4,000 | 8.1-5 |

### 8.3 Fault switches of the feed adapter

- `down`: the adapter throws a connection error.
- `stale`: it returns the previous file unchanged.
- `malformedRows`: it serves the 8.2 file.
- `renamedRows`: it serves the second file with 30 attribute changes and 5 reprints.

---

## ADD-§9 Policy defaults

### 9.1 Default business-rejection reasons (FR-VER-8)

The admin can edit these. Changes are logged (`RejectionReasonChange`) and apply only to later rejections.

| Code | Applicant-facing text (EN, illustrative) | Reapplication |
| --- | --- | --- |
| `DataMismatch` | "The details you entered don't match your documents." | after 7 days |
| `IncompleteDocuments` | "Some required documents were missing or unreadable." | immediately (0 days) |
| `ExternalPresenceUnverifiable` | "We couldn't confirm your shop's existing sales presence." | after 14 days |
| `FraudSuspected` | "We couldn't verify this application." | barred |
| `ProhibitedGoods` | "Your shop sells products TEZG doesn't allow." | barred |

### 9.2 Moderation policy reasons (FR-REP-4, FR-REP-5)

| Code | Applies to | Author-facing text (EN, illustrative) |
| --- | --- | --- |
| `Counterfeit` | listing | "This listing appears to offer a counterfeit product." |
| `ProhibitedItem` | listing | "This item isn't allowed on TEZG." |
| `MisleadingListing` | listing | "The listing's details don't match the product." |
| `Harassment` | review | "This review contains abusive language." |
| `PersonalData` | review, listing | "This content shares someone's personal information." |
| `Spam` | review, listing | "This content looks like spam." |
| `OffTopic` | review | "This review isn't about the seller or the transaction." |
| `Other` | both | the admin note (required, 10–500 characters) |

### 9.3 Operational limits (OQ-11)

Adopted at the Phase 1 gate as configuration values, to be revisited after 30 days of launch data.

| Parameter | Default | FR / NFR | Refusal code |
| --- | --- | --- | --- |
| Unpaid-order TTL | 48 h | FR-ORD-1, FR-ORD-8 | — (order expires) |
| Open-offer TTL | 7 days | FR-TRD-1, FR-TRD-9 | — (offer expires) |
| Open orders per buyer | 3 `AwaitingPayment` | FR-ORD-1 | `TooManyOpenOrders` |
| Open orders per buyer per business | 1 `AwaitingPayment` | FR-ORD-1 | `TooManyOpenOrders` |
| Contact requests per requester | 30 per rolling hour; 10 per seller per day | FR-MSG-3 | `ContactRateLimited` |
| Contact requests per IP | 60 per rolling hour | FR-MSG-3, NFR-SYS-14 | `ContactRateLimited` |
| Failed sign-ins | 10 per account and 30 per IP per 15 min | NFR-SYS-14 | `AuthRateLimited` |
| Sign-ups | 5 per IP per hour | NFR-SYS-14 | `AuthRateLimited` |
| Top-up amount | COP 20,000–10,000,000 | FR-COM-2 | `TopUpAmountInvalid` |

### 9.4 Retention defaults (OQ-12)

Adopted at the Phase 1 gate as **provisional defaults** (relabelled at the human review round, decision log #33). They have no legal approval yet. Until explicit legal approval is recorded, the regulated retention purge runs in dry-run: it counts and logs the rows it would delete and deletes none (ARCHITECTURE AD-SYS-8 rule 10, launch gate LG-2). The technical purge of delivered event rows is not affected.

| Data class | Kept for | Reason |
| --- | --- | --- |
| Legal-identity data and documents (including rejected and barred applicants) | 5 years after the last decision on the account | Supports bars, reapplication checks and disputes |
| Top-up proofs | 10 years after the top-up decision | The platform's own accounting support; commercial books and papers are kept 10 years (Ley 962 de 2005, art. 28) [verify with legal] |
| Buyer payment comprobantes | 5 years after the order closes, cancels or expires | Order and commission disputes |
| Phone numbers (individual-seller contact) | Until account closure plus 1 year | Contact disputes |
| Message bodies | Until account closure plus 1 year | Dispute support |

Data-subject requests (access, correction, deletion) are handled manually by an admin at launch (PRD §5).

---

## ADD-§10 Success-metric measurement

| Metric (PRD §22) | Source | Computation |
| --- | --- | --- |
| Oversell incidents | not measured in production in V1 | — Prevention rests on the `quantity >= 0` CHECK and the NFR-INV race tests until a stock-movement ledger exists (ARCHITECTURE §14; decision log #29) |
| Ledger discrepancies | the FR-COM-8 reconcile job | Σ \|stored balance − Σ ledger entries\| across accounts |
| Explained-decision coverage | API logs of `DomainError` responses | share of responses with a non-empty `reasonCode`, `humanMessage` and ≥ 1 citation |
| Applications decided in ≤ 3 business days | `BusinessApplication` timestamps | `decidedAt − submittedAt` in Colombian business days (holiday calendar from configuration) |
| Stale prices shown | card-detail read log | stale price views ÷ all price views |
| Orders closed within 14 days | `Order` facts | closed orders with `closedAt − createdAt ≤ 14 d` ÷ orders created 14+ days ago |
| Prompts per closed order | `PostPurchasePrompt` vs `OrderClosed` | count of prompts ÷ count of closed orders (target exactly 1.00) |
| Deliveries unresolved > 24 h | `EventDelivery` (NFR-SYS-6; ARCHITECTURE AD-SYS-2) | count of rows with (`status='failed'` and `firstFailedAt < now − 24 h`) or (`status='pending'` and `createdAt < now − 24 h`) |
