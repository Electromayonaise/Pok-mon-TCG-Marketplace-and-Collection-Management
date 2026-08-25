---
name: 'Adversarial Divergence Review — Architecture Spine'
type: architecture-review
lens: adversarial-divergence
target: ARCHITECTURE-SPINE.md (Pokemon TCG Marketplace and Collection Management Platform, 2026-08-25)
created: '2026-08-25'
status: complete
---

# Adversarial Divergence Review

**Mandate:** construct two units one level down that each obey every AD to the letter yet still build incompatibly. Every pair found is a hole to close with a new or tightened AD.

**Verdict:** The spine is structurally sound at the module-boundary level (AD-1, AD-7, AD-8 are tight), but every cross-module *event* seam (orders→commission, orders→collections, orders→listings-adjacent inventory, trading↔listings) is specified only as "an event fires," never as "here is the payload, the transaction boundary, or the failure behavior." That gap is large enough that two builders each honoring every AD to the letter would ship incompatible systems — in two cases (CAP-27's payload and InventoryUnit-vs-trading) one of the two builders' modules would simply not work, not just drift stylistically.

---

## Finding 1 — CAP-27's `OrderClosed` event is structurally unbuildable as a thin event, and nothing says so (Critical)

**The clash:** `collections` has *no* compile-time dependency on `orders` or `listings` in AD-1's graph — only `collections --> catalog` and `collections --> identity`. Its only connection to `orders` is the dashed subscription edge `collections -. subscribes .-> orders`.

- **Builder A** treats domain events the conventional way: thin, identity-only payloads (`OrderClosed(orderId)`), on the theory that subscribers "look up what they need." This is the dominant pattern in every domain-events tutorial and is fully consistent with AD-1's text and the naming-convention row.
- **Builder B** puts a full snapshot in the payload (`OrderClosed(orderId, buyerId, items: [{catalogEntryId, ...}])`) because they notice `collections` has no legal path to resolve `orderId → catalogEntryId(s)`.

Builder A's implementation is **not just a different style — it's non-functional**: CAP-27's "AddToCollection" prompt needs to know which card(s) were bought to offer as a collection add, and `collections`'s handler has no query it is architecturally permitted to call to find out (calling into `orders` or `listings` from `collections` would add an edge AD-1's graph doesn't have, or would violate AD-8 by reaching across a table boundary). This is a real hole in the spine, not a style preference: **AD-1's dependency graph is currently incompatible with CAP-27 unless the event payload is pinned as fat/denormalized**, and nothing in the spine says that.

The same shape of problem recurs at `orders -. commission`: `commission` has no compile-time edge to `orders` either (only `commission --> identity`, `commission --> shared`), yet deduction needs an amount and a business id from the order that triggered `OrderPaymentConfirmedByBusiness`. Same hole, same fix needed.

**Proposed AD (new, AD-9 — Event payloads are self-contained snapshots):**

> **AD-9 — Cross-module domain events carry denormalized, self-contained payloads**
> - **Binds:** `orders`→`commission`, `orders`→`collections`, and any future event edge in AD-1's dependency graph where the subscriber has no compile-time dependency on the publisher.
> - **Prevents:** a subscriber module needing data it has no legal query path to, forcing either a broken feature or an ad-hoc dependency edge that AD-1 doesn't sanction.
> - **Rule:** every event payload must contain every field its documented subscriber(s) need, resolved and denormalized at publish time — never an id the subscriber is expected to "look up." Concretely:
>   - `OrderPaymentConfirmedByBusiness(orderId, businessId, orderTotalCOP, confirmedAt)` — enough for `commission` to compute and post the deduction without querying `orders`.
>   - `OrderClosed(orderId, buyerId, sellerId, items: [{ catalogEntryId, cardName, imageUrl, quantity }], closedAt)` — enough for `collections` to render the CAP-27 prompt without querying `orders` or `listings`.
>   - Each event's exact payload shape is defined once in `shared-kernel`'s event-type registry (a discriminated union or per-event interface file), imported by both publisher and every subscriber — never redefined ad hoc per module.

---

## Finding 2 — InventoryUnit decrement timing in the `orders` lifecycle is unpinned; two compliant builders produce guaranteed oversell vs. a stuck-inventory bug (Critical)

AD-6 pins the *mechanism* ("selling through either path decrements the same `InventoryUnit` row in the same transaction") but not the *moment*: `Order` has three independently-timestamped confirmations (AD-2) and AD-6 never says which one — or whether Order creation itself — is "the transaction" that decrements `InventoryUnit`.

- **Builder A** decrements `InventoryUnit` at **Order creation** (buyer initiates purchase), reserving stock immediately. This is defensible: it's the most natural reading of "selling... decrements the same row in the same transaction" if you consider order-initiation the sale event.
- **Builder B** decrements `InventoryUnit` at **`buyerItemReceivedConfirmedAt`** (AD-2: "the only field that closes the order"), reasoning that a not-yet-closed order isn't a completed sale and shouldn't consume inventory some other buyer might successfully complete first.

Both read AD-6 and AD-2 and comply with both to the letter. But they are not just stylistically different — **Builder B's system guarantees oversell**: nothing reserves the unit at order creation, so two buyers can each create an Order against the same `InventoryUnit(sellerId, cardId)` with `quantity = 1`, both proceed through `buyerPaidConfirmedAt` / `sellerReceivedConfirmedAt`, and both reach `buyerItemReceivedConfirmedAt` — at which point the second decrement either double-sells (quantity goes negative) or throws on an inventory row the seller believes is still validly sold to them. This is exactly the failure class AD-6 exists to prevent ("a bundle-component sale and an individual-listing sale of the same physical card decrementing two different counters and overselling") — AD-6 closes the *counter-duplication* version of oversell but leaves the *timing* version wide open.

There's a second-order issue baked into Builder A's approach too: if `InventoryUnit` is decremented at Order creation, the spine has no cancellation/expiry/abandonment flow (not mentioned anywhere, not even in Deferred) to give the unit back if a buyer never pays. That's a real product gap this review flags but doesn't own — it becomes load-bearing only once the AD below picks a decrement moment.

**Proposed AD (tighten AD-6):**

> **AD-6 (amended) — `InventoryUnit` is the sole quantity owner; decrement happens at Order/TradeOffer creation, not at any later confirmation**
> - Add to the existing rule: *"The decrement occurs in the same transaction as `Order` row creation (buyer-initiated purchase) — not at `buyerPaidConfirmedAt`, `sellerReceivedConfirmedAt`, or `buyerItemReceivedConfirmedAt`. Order creation therefore acts as an inventory reservation; a business rule for releasing that reservation on abandoned/expired/never-paid orders is required before ship (tracked as a follow-up, not covered by this AD) and must itself go through the same `InventoryUnit` row in a transaction, never a parallel 'reserved quantity' column."*
> - This also forces the answer to Finding 3 below (trade closure) to use the same creation-time decrement moment, for consistency.

---

## Finding 3 — Trade closure is a third "sale path" AD-6 never named, and AD-4 says `listings` has zero knowledge of trading (High)

AD-6's decrement rule explicitly scopes itself to "a bundle-component sale and an individual-listing sale" — two paths. Trading is a third path onto the same `Listing`/`InventoryUnit` (the ER diagram shows `LISTING ||--o{ TRADE_OFFER`), but:

- AD-4 says `listings` has *zero* knowledge of `trading` (one-directional: `trading --> listings`, never back).
- AD-6 never mentions `TradeOffer` or `trading` at all.
- No AD says what happens to the `Listing`'s availability or its `InventoryUnit` when a `TradeOffer` closes (mutual `buyerConfirmed`/`sellerConfirmed`).

- **Builder A** (strict AD-4 reading: "trading is parallel, listings has zero knowledge of it") never touches `InventoryUnit` on trade close at all — the traded `Listing` stays fully purchasable and re-offerable for trade, because nothing in `trading`'s scope says to change it, and `trading` has no write access to `listings`' tables (AD-8) to change it even if it wanted to.
- **Builder B**, reasoning from AD-6's *purpose* ("the sole quantity owner... prevents... overselling"), has `trading` emit a `TradeAccepted` event (already named in the Consistency Conventions table) that `listings` subscribes to, decrementing the same `InventoryUnit` row — but this requires `listings` to depend on / subscribe to `trading`, which is exactly the edge AD-1's graph and AD-4's text forbid ("listings has zero knowledge of trading").

Both builders are individually AD-4-compliant reasoning from different parts of the same sentence, and they produce opposite behavior: Builder A's system lets a physical card be traded away and *still* sold via a direct listing to a different buyer (classic oversell, the exact failure mode AD-6 exists to prevent) — a hole neither AD-4 nor AD-6 currently closes.

**Proposed AD (tighten AD-4 + AD-6 jointly):**

> **AD-4 (amended) — add a closing clause:** *"On `TradeAccepted`, the traded `Listing`'s backing `InventoryUnit` is decremented exactly once, via the same decrement path AD-6 defines for a sale — `trading` calls the same `listings`-owned inventory-decrement application-service function that `orders` calls (a shared internal function in `listings`, invoked directly by both `orders` and `trading` since both already hold a compile-time dependency on `listings` per AD-1's graph), not a new event round-trip. This does not give `listings` knowledge of `TradeOffer`'s existence or schema — `listings` only exposes `decrementInventoryForSale(inventoryUnitId, quantity)`, agnostic to whether the caller is `orders` or `trading`."*
> - This closes the gap without adding a forbidden `listings`-subscribes-to-`trading` edge: both `orders` and `trading` already have a legitimate solid dependency arrow to `listings` in AD-1's graph, so both can call the same guarded write path directly, in-transaction — consistent with the Finding 2 fix.

---

## Finding 4 — Event delivery/failure semantics are never pinned: synchronous-in-transaction vs. commit-then-notify-and-swallow are both "a typed emitter, not a message queue" (High)

The Design Paradigm section says events travel on "an in-process event bus (a typed emitter, not a message queue)." That single phrase answers "is it a durable queue" (no) but answers nothing else:

- **Builder A** wires the emitter to fire *synchronously, before the publishing transaction commits*, and lets subscriber exceptions propagate — so a bug or transient failure in `commission`'s `OrderPaymentConfirmedByBusiness` handler rolls back the *seller's* `sellerReceivedConfirmedAt` write in `orders`. This reads AD-3 ("deduction is triggered only by the event... never by a direct call") as meaning the event is just an in-process function call wearing an event-shaped name — which is a completely legitimate reading of "typed emitter."
- **Builder B** wires the emitter to fire *after commit*, wrapped in a try/catch that logs and swallows subscriber errors (the standard "don't let a notification failure break the primary write" pattern) — so if `commission`'s handler throws (DB blip, bug, whatever), the order confirmation succeeds permanently but the balance deduction is silently lost forever. No retry, no outbox, no dead-letter path exists anywhere in the spine.

Both builders can point to "typed emitter, not a message queue" as license for their choice. The two systems have opposite failure modes: A makes `orders` fragile to `commission`/`collections` bugs (coupling AD-1 explicitly tried to avoid by using events instead of direct calls); B makes `commission`'s balance silently drift out of sync with confirmed orders — **precisely the failure AD-3 was written to prevent** ("`listings` keeping its own copy of a business's balance and drifting out of sync with `commission`" — B reintroduces an analogous drift, just via a lost event instead of a duplicated field).

**Proposed AD (new, AD-10 — Event delivery is transactional-outbox, at-least-once, subscriber-isolated):**

> **AD-10 — In-process events publish after commit, deliver at-least-once, and a subscriber failure never rolls back the publisher**
> - **Binds:** `shared-kernel`'s event bus; all publishers/subscribers (`orders`→`commission`, `orders`→`collections`).
> - **Prevents:** a subscriber bug coupling back into the publisher's transaction (re-introducing the tight coupling events were chosen to avoid), and silent, unrecoverable event loss that lets `commission`'s balance or `collections`' prompts drift from ground truth.
> - **Rule:** the publishing module's write and its event(s) commit in the same DB transaction via an outbox row (`shared-kernel` owns an `OutboxEvent` table); a post-commit dispatcher delivers to in-process subscribers and marks the outbox row processed only on subscriber success. A subscriber exception is caught, logged, and retried (fixed backoff, bounded attempts) without ever unwinding the publisher's already-committed transaction. This keeps the "typed emitter, not a message queue" framing (still in-process, still no external broker) while pinning the one property that actually matters for correctness: **the publisher's write is never rolled back by a subscriber's failure, and no event is silently dropped on first failure.**

---

## Finding 5 — `TradeOffer` closure: AD-4 doesn't say whether "both confirmed" is computed or stored, and calls it "structurally similar" to `Order` in a way that invites copying the wrong semantics (Medium)

AD-2 pins `Order` closure precisely: **one single field**, `buyerItemReceivedConfirmedAt`, closes the order — it is explicitly *not* "all three confirmations set." AD-4 then describes `TradeOffer` as "structurally similar to `Order`'s confirmation pattern" but requires **mutual** confirmation (`buyerConfirmed && sellerConfirmed`) for closure — a different closure rule (AND of two fields, not "presence of one specific field"). AD-4 never says whether "closed" is:

- **Builder A**: a **computed** property — no stored `status`/`closedAt` field; `isClosed = buyerConfirmed && sellerConfirmed`, evaluated on read. Each confirmation is an independent, idempotent `UPDATE ... SET buyerConfirmed = true`; there's no race because there's nothing to race over — the two booleans commit independently and the closed-ness just falls out of the next read.
- **Builder B**: a **stored** `status: 'pending' | 'accepted'` field, transitioned by whichever confirmation handler observes the *other* party's flag already set — i.e., "read the other flag, if true, set status = accepted." Under near-simultaneous confirmation (buyer and seller both confirm within the same window — plausible for two people finishing a chat and both hitting confirm), both handlers can read the other's flag as still `false` (pre-commit), both write only their own flag, and neither transitions `status` to `accepted` — the trade is stuck showing `pending` forever with both booleans actually `true`. This is a genuine concurrent-write bug that only exists in Builder B's design, triggered by ordinary (not adversarial) user behavior.

Both builders satisfy AD-4's literal text ("`buyerConfirmed`/`sellerConfirmed`, both independently settable"). Only one of them is safe under concurrency, and AD-4 doesn't say which shape is required — nor flag that "structurally similar to Order" is misleading here (Order's closure is single-field-triggered; TradeOffer's is AND-of-two, a materially different concurrency shape).

**Proposed AD (tighten AD-4):**

> **AD-4 (amended) — add:** *"`TradeOffer` closure (`accepted`) is a **computed** property (`buyerConfirmed && sellerConfirmed`), never a separately stored status field written by a confirmation handler. If a materialized `status` column is wanted for query performance, it is maintained by a single idempotent trigger/service call re-derived from both booleans inside the same transaction as *either* boolean's write (`UPDATE ... SET buyerConfirmed = true, status = CASE WHEN sellerConfirmed THEN 'accepted' ELSE 'pending' END`), never by a read-other-then-write-status two-step. This is a deliberately different closure shape from `Order`'s single-field trigger (AD-2) — 'structurally similar' in AD-4 refers only to the timestamped-independent-confirmation *pattern*, not to the closure-trigger arity."*

---

## Finding 6 — `DomainError` ownership per code is asserted to exist in "the Contract" but isn't pinned in the spine itself (Medium)

The Consistency Conventions table says errors carry "the Contract's exact names (`NotBusinessListing`, `IndividualSellerProfileIncomplete`, `NotVerifiedPurchaser`, `NotBusinessAccount`, etc.)" — this presupposes an external Contract document that maps each named error to an owning module and throw site, but that mapping is not in the spine and the spine doesn't cite where it lives.

- **Builder A** puts the `NotBusinessListing` check in `orders`' application service (it owns the purchase flow; per AD-1 it already depends on `listings` and can call `listings`' public query to read `sellerType`, then throw the error itself before creating an `Order`).
- **Builder B** puts the same check inside `listings`, exposing a `assertPurchasable(listingId)` guard in its public application-service interface that `orders` is expected to call first.

Both are AD-1-compliant (the dependency arrow `orders --> listings` supports either shape). But now two independent, plausible owners exist for the same validation. In practice this tends to produce **both**: `orders` writes its own copy "just to be safe" *and* calls `listings`' guard, and the two copies drift the moment one module's definition of "business listing" changes (e.g., `listings` later allows a grace-period status that `orders`' inline copy doesn't know about) — silently reopening exactly the kind of drift AD-3 was written to prevent for balances, just for validation logic instead.

**Proposed AD (tighten Consistency Conventions row, or add AD-11):**

> **AD-11 — Every `DomainError` code has exactly one throwing module, declared next to its definition**
> - **Binds:** `shared-kernel`'s `DomainError` enum; every module.
> - **Rule:** each `DomainError` variant in `shared-kernel` is annotated with its single owning/throwing module in a comment or co-located manifest (e.g. `NotBusinessListing: owner=listings`, `IndividualSellerProfileIncomplete: owner=identity`, `NotVerifiedPurchaser: owner=orders`, `NotBusinessAccount: owner=identity`). A precondition check belongs entirely inside its owning module's application service, exposed as a typed guard function other modules call and let throw (`listings.assertPurchasable(listingId): asserts` style) — never re-implemented as an inline check in the calling module. The spine's Deferred/Contract reference for the full error-to-owner table must be linked explicitly rather than assumed to exist elsewhere.

---

## Summary Table

| # | Seam | Two compliant-but-incompatible builds | Severity | Fix |
| - | --- | --- | --- | --- |
| 1 | `orders`/`commission`/`collections` event payloads | thin id-only event (unbuildable for `collections`) vs. denormalized snapshot | Critical | New AD-9: events are self-contained snapshots |
| 2 | `InventoryUnit` decrement timing | decrement at Order creation (reservation) vs. at close (no reservation → guaranteed oversell) | Critical | Amend AD-6: decrement at Order/TradeOffer creation |
| 3 | Trade closure vs. `InventoryUnit`/`Listing` availability | AD-4 literal ("listings has zero knowledge of trading") → never decrements, vs. an event edge AD-1 forbids | High | Amend AD-4: `trading` calls `listings`' shared decrement function directly (already-legal edge) |
| 4 | Event delivery/failure semantics | sync-in-transaction (couples publisher to subscriber failures) vs. commit-then-swallow (silent balance drift) | High | New AD-10: post-commit outbox, at-least-once, subscriber failure never rolls back publisher |
| 5 | `TradeOffer` "both confirmed" representation | computed property (safe) vs. stored status field (race → stuck-pending trades) | Medium | Amend AD-4: closure is a computed property, not a stored status |
| 6 | `DomainError` throw-site ownership | `orders` validates vs. `listings` validates vs. both (drift) | Medium | New AD-11: one throwing module per error code, declared explicitly |
