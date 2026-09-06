---
name: TEZG — Seller/Business Experience
description: Information architecture, behavior, states, interactions, and accessibility floor for Valentina's individual-seller scenarios (S1-S2) and Andrés's verified-business scenarios (S3-S4).
status: final
sources:
  - docs/plan-1-seller-track/prd.md
  - docs/plan-1-seller-track/C-UX-Scenarios/00-ux-scenarios.md
  - docs/plan-1-seller-track/DESIGN.md
  - docs/plan-1-buyer-track/EXPERIENCE.md
updated: 2026-09-06
reviewed: review-ux-adversarial.md, review-ux-edge-cases.md — both run 2026-09-06; findings triaged (3 surfaced to the user as genuine product decisions, logged in decision-log.md entries 6-8; remaining findings applied directly as documentation/consistency fixes across DESIGN.md and the 11 page specs)
---

## Foundation

**Form factor:** Responsive web app, same platform-wide equal-priority contract as the Buyer track (SPEC.md). This track carries two protagonists on two different device declarations, resolved page-by-page below — a deliberate difference from the Buyer track's single "mobile is primary throughout" declaration, since Valentina's seller-side tasks are the same kind of on-the-go session as her buyer-side ones, while Andrés's tasks split between quick notification-driven checks and slower, document-heavy back-office work.

**Valentina (S1, S2) — Mobile-primary**, inherited directly from her Buyer-track device declaration. Publishing a first listing and managing a trade offer are the same "phone-in-hand, between other things" sessions as her buying journeys.

**Andrés (S3, S4) — resolved per page, the decision deferred from Phase 2's scenario outlines:**

| Page | Primary device | Why |
|---|---|---|
| 3.1 Business Verification Application | Desktop-primary | One-time legal-identity data entry plus external-presence proof (a link, a document) — a larger surface and keyboard reduce error on a form he fills out once, carefully, not repeatedly under time pressure. |
| 3.2 Application Status | Mobile-primary | A repeated, notification-driven glance ("did it get approved yet?") — the same pattern as the Buyer track's Orders List, which is also mobile-primary for exactly this reason. |
| 3.3 Commission Balance Management | Desktop-primary | A back-office financial task (topping up, reviewing balance) he's more likely to do at his shop's computer alongside other admin work, and it reuses the same listing-creation form as 3.1's document-entry pattern. |
| 4.1 Incoming Orders List | Mobile-primary | Notification-driven — he learns of a new Order via a badge, and checks it the way Valentina checks hers, from wherever he is. |
| 4.2 Order Detail — Review Comprobante & Confirm Payment | Desktop-primary | Reviewing a payment-proof image closely before confirming real money received benefits from a larger viewport for zoom/detail — a more deliberate action than 4.1's glance, paralleling why 3.1/3.3 are also desktop-primary. |

No page is device-exclusive — every page fully supports the non-primary device per TEZG's platform-wide contract; "primary" only governs which breakpoint layout is authored first (see Responsive & Platform).

**UI system:** None named — inherits DESIGN.md's tokens as the full source of visual truth, same as the Buyer track.

**Reused mechanisms (settled, not open):** Page 1.2's create-listing-form mechanism is reused verbatim for the business path (FR-S9), reachable directly from 3.2 the moment a business application exists — Pending or Approved — never gated on commission balance. It is not a separate component, only a different eligibility check ahead of the same form: individual sellers gate on profile-completion, businesses gate on application existence alone. A funded balance governs only whether a business's listings are *purchasable* (FR-S6), never whether they can be *created* — a Pending or zero-balance business can still create and edit listings, which simply don't display a verified badge or accept purchases until Approved/Funded respectively. 3.3 additionally surfaces its own "Create a listing" shortcut into the same mechanism as a convenience once Andrés is already on his balance dashboard, but 3.2 is the earliest reachable entry point, available from the moment his application is submitted. Page 4.2 reuses the Buyer track's comprobante artifact (the same uploaded file from Buyer-track page 3.2) in read-only form via `{components.comprobante-viewer}` — Andrés never uploads, only reviews.

## Information Architecture

Eleven surfaces across four scenarios, each owned by exactly one scenario chain:

| Surface | Scenario | Reached from | Leads to |
|---|---|---|---|
| 1.1 Individual-Seller Profile Step | 01 | Account menu → "Start selling" (first time only) | 1.2 Create Listing |
| 1.2 Create Listing | 01 | 1.1, or directly on return visits once profile is complete | 1.3 Listing Live Confirmation |
| 1.3 Listing Live Confirmation | 01 | 1.2 | Scenario exit — returns to My Sales tab (Buyer-track 4.4) |
| 2.1 Trade Offers Inbox | 02 | My Sales tab (4.4), or a notification | 2.2 Trade Offer Detail |
| 2.2 Trade Offer Detail | 02 | 2.1 | 2.3 Trade Completion Confirmation (after physical exchange), or back to 2.1 on Decline |
| 2.3 Trade Completion Confirmation | 02 | 2.2, after both sides have physically exchanged | Scenario exit |
| 3.1 Business Verification Application | 03 | Account menu → "Apply as a business" | 3.2 Application Status |
| 3.2 Application Status | 03 | 3.1, or return visits while Pending | 1.2's Create Listing mechanism (FR-S9 reuse, reachable while Pending or Approved), or 3.3 Commission Balance Management (once Approved) |
| 3.3 Commission Balance Management | 03 | 3.2, on Approved | 1.2's Create Listing mechanism (FR-S9 reuse, convenience shortcut) — scenario exit once first listing is live |
| 4.1 Incoming Orders List | 04 | Notification badge, or account menu | 4.2 Order Detail |
| 4.2 Order Detail — Review Comprobante & Confirm Payment | 04 | 4.1 | Scenario exit — Order remains open pending the buyer's own closing confirmation (AD-2) |

**Cross-track entry point:** Scenario 01 and Scenario 02 are both reached from "My Sales tab," the same surface the Buyer track's `4.4-my-sales-tab.md` already owns and specifies in full — this track adds no new tab, only the destinations that tab's existing "Open listings" and "Pending trade offers" counts (per Buyer-track EXPERIENCE.md's State Patterns) link into. My Sales tab itself is not re-specified here; it is cited, not owned, by this track.

**Mutual-exclusivity boundary (Valentina vs. Andrés):** Scenarios 01-02's surfaces are only ever reached by an account in Individual Seller state; Scenarios 03-04's surfaces (past 3.1) are only ever reached by an account in Verified Business state (SPEC.md's Safe assumption). A single account never sees both "Start selling" (1.1) and "Apply as a business" (3.1) as simultaneously live entry points once one path has been taken — "Apply as a business" replaces "Start selling" in the account menu the moment a Verified Business application exists, since the two states are mutually exclusive, not additive.

**Closure check:** every stated need in the 4 scenario outlines has exactly one primary surface; every surface has exactly one scenario landing on it as its primary entry. 11/11 pages accounted for, matching the Phase 2 Page Coverage Matrix.

### Navigation & Resilience

- **Back navigation:** native browser/OS back at all times, except while the comprobante viewer's zoom overlay (4.2) is open — see Interaction Primitives. No surface here is a scenario-terminal step requiring a confirmation dialog to leave, since none represents an irreversible action mid-flight (accepting a trade offer and confirming payment received are themselves the confirmable actions, not steps that precede one).
- **Deep-linking / out-of-order access:** 2.2 opened for a trade offer Valentina doesn't own, or 4.2 for an Order Andrés's listing isn't party to, redirects to the nearest valid predecessor (2.1, 4.1 respectively) with a factual "not found" line — same fallback rule as the Buyer track, not re-invented here.
- **Trade offer withdrawn mid-review:** if the buyer withdraws a trade offer while Valentina is on 2.2 reviewing it, her next action (Accept or Decline) fails with a factual inline message ("This offer was withdrawn") and returns her to 2.1, where it no longer appears — this is the trade-offer equivalent of the Buyer track's "listing sold out between viewing" race condition, resolved the same way: a factual outcome, not an error page.

## Voice and Tone

Inherits the Buyer track's register in full — factual, calm, never cute, never alarmist about a normal waiting state. Extensions specific to this track's new conditions:

- Pending verification: "Your application is under review — no fixed timeline, we'll notify you when it's decided." Never "Almost there!" or a fake progress percentage, since CAP-15's review has no SLA to promise against.
- Verification rejected: state the actual reason if the system has one, otherwise "Your application wasn't approved this time" — never a generic "Something went wrong," matching the Buyer track's account-error register.
- Zero/paused commission balance: "Your listings are paused — top up your balance to make them purchasable again." Factual and actionable, not "Uh oh, you're out of funds!"
- Trade offer declined (shown to the party who declined, as confirmation): "Offer declined." No apology language, no "Are you sure?" second-guessing after the fact — Decline is a legitimate, low-drama outcome, not a mistake to second-guess.
- Payment-received confirmation (4.2, Andrés's own action): "Payment marked as received — [buyer] can now confirm the item's arrival to close this Order." States the actual next step (AD-2's remaining action) rather than implying the Order is done, since it isn't yet.

## Component Patterns

Behavioral specs only — visuals live in `DESIGN.md.components`.

- **`{components.verification-status-badge}`** — renders from exactly one of three states (Pending, Approved, Not approved), driven by the application's own field, never inferred from the presence/absence of a commission balance or listings. Appears on 3.2 and persists in account chrome afterward as a small always-visible indicator once the account is Verified Business.
- **`{components.commission-balance-card}`** — the balance figure always renders, including "$0" — a zero balance is a real, displayable value, never an empty state. The "Top up balance" action is always present regardless of current balance (topping up from a positive balance is a valid action, not one you unlock only at zero).
- **`{components.trade-offer-card}`** (2.1, 2.2) — what's being offered renders with the same price-block typographic rules a listing uses, so an offer is scanned the same way a listing is. Accept and Decline are the only two actions; there is no third "counter-offer" action in this track's scope (not in FR-S3/FR-S4 — a Non-Goal, not an omission).
- **`{components.comprobante-viewer}`** (4.2) — tapping/clicking opens a zoom overlay for closer inspection; the "Confirm payment received" `button-primary` sits outside the viewer itself and is not gated on having zoomed — Andrés can confirm from the thumbnail view alone, since TEZG doesn't enforce a "you must have looked closely" rule.
- **`{components.open-to-trade-toggle}` / `{components.create-listing-form}`** (1.2, reused by 3.3) — the toggle's structural absence for a Verified Business (per DESIGN.md) means the form component itself takes a `sellerType` prop that controls which fields render, not a CSS-hidden toggle — this is a behavioral requirement, not just a visual one, since a hidden-but-present control could still be reached via devtools/API tampering, whereas a field that was never included in the form's own render tree cannot be submitted.

## State Patterns

**Business verification application (3.1 → 3.2) — three terminal states, no auto-retry:**

1. **Pending** — the default state immediately after 3.1's submission. 3.2 shows the Pending badge and the factual "no fixed timeline" copy from Voice and Tone. Andrés can return to 3.2 any number of times while Pending; nothing changes on repeat visits except a live re-check of status. 3.2 also offers a "Create a listing" action in this state (FR-S9) — a business does not have to wait for Approved to start listing inventory; the listing exists but stays non-purchasable and unbadged until Approved.
2. **Approved** — 3.2 shows the Approved badge and a "Continue to your balance" action leading to 3.3. This is a one-way transition — once Approved, 3.1 is never shown again for this account (the mutual-exclusivity boundary in Information Architecture).
3. **Rejected** — 3.2 shows the "Not approved" badge and, if the system has one, the stated reason; no automatic retry or resubmission path exists in this track's scope (CAP-15 is manual review — resubmission, if TEZG ever supports it, is a Non-Goal here, matching the same "documented limitation, not a gap" framing already used for AD-2 in Scenario 04).

**Commission balance (3.3) — two states, driven by balance value, never by a separate "paused" flag:**

1. **Funded (balance > 0)** — listings created against this balance are purchasable; the balance card shows the current figure and the "Top up" action.
2. **Zero/paused (balance = 0)** — existing listings remain in the system (never deleted, per CAP-21) but are not purchasable; the balance card shows "$0" alongside the factual pause copy from Voice and Tone. The moment a top-up succeeds and balance becomes > 0, listings become purchasable again automatically — no separate "resume listings" action exists, since CAP-21's own testable criterion is that the transition happens without recreating anything.

**Trade offer lifecycle (2.1 → 2.2 → 2.3):**

1. **Offered** — appears in 2.1's inbox list; opening it reaches 2.2.
2. **Accepted** — Valentina taps Accept on 2.2; the offer moves out of the "pending" filter in 2.1 and 2.2 now shows a "Waiting for physical exchange" state with the path to 2.3.
3. **Declined** — Valentina taps Decline on 2.2; the offer is removed from 2.1's inbox and the buyer is notified (outside this track's UI scope) — no confirmation dialog, consistent with Decline being a legitimate low-drama outcome per Voice and Tone.
4. **Completed** — on 2.3, Valentina confirms the physical exchange happened; this is her side of the mutual completion CAP-25/CAP-26 require. The trade shows fully completed only once both sides have confirmed — if the buyer hasn't yet confirmed on their own end, 2.3 shows "Waiting for the other side to confirm" rather than a false "Completed" state, mirroring the Buyer track's own rule that a status is never claimed before its condition is actually met.
5. **Withdrawn (buyer-initiated, mid-review)** — see Navigation & Resilience above.

**Order fulfillment tri-state (4.1, 4.2) — inherits the Buyer track's tri-state model verbatim (CAP-22):** Andrés's side only ever sets `sellerReceivedConfirmedAt` (the "received-by-seller" step); he never sets `paid` (the buyer's payment-confirmation step, already true by the time an Order reaches his Incoming list) or the buyer's own item-received step. 4.2's tri-state row is otherwise the exact same component as the Buyer track's `{components.order-status-row}`, just viewed from the business side — worked example: `{paid:true, receivedBySeller:false, receivedByBuyer:false}` on arrival at 4.2 (confirmed / hollow / hollow); after Andrés confirms, `{paid:true, receivedBySeller:true, receivedByBuyer:false}` (confirmed / confirmed / hollow) — the row never shows "Closed" from Andrés's action alone, since closing requires the buyer's own confirmation too (AD-2), which he cannot trigger.

**Loading and empty states (2.1, 4.1):** both inbox-style lists follow the Buyer track's rule exactly — a skeleton/placeholder state while fetching, never a default "empty" that could be mistaken for a real zero-count result; a genuine zero-count renders the factual empty-state copy ("No trade offers right now." / "No incoming orders yet.") from `{components.empty-state}`, never hidden.

## Interaction Primitives

- **Tap/click targets:** minimum 44×44px, inherited from the Buyer track, applying equally to Accept/Decline on the trade-offer card and the top-up action on the balance card.
- **Comprobante zoom overlay (4.2):** a full-screen, dismissible overlay (Escape key or a close control) — not a new page, since it is a closer look at data already on 4.2, not a navigation event. Opening it does not gate or delay the "Confirm payment received" action, which remains available underneath.
- **Feedback timing:** any network action (submitting 3.1, topping up 3.3, Accept/Decline on 2.2, confirming payment on 4.2) disables its triggering button immediately and shows an in-progress state until the response returns — the same double-submission guard the Buyer track's `button-primary` component already specifies, applied here to every new action this track introduces.
- **Backing out mid-submission:** navigating away while 3.1's submission or 3.3's top-up is in flight is allowed without a blocking dialog but abandons that attempt, consistent with the Buyer track's rule for its own in-flight actions — the user must resubmit on return, nothing is silently retried in the background.

## Accessibility Floor

Inherits the Buyer track's floor in full (WCAG AA contrast, no color-only distinctions, keyboard/assistive-tech operability at desktop widths). Extensions for this track's new components:

- The verification-status badge, like the order-status dot it borrows its grammar from, always carries a text label alongside its color/dot — never color alone.
- The commission-balance card's zero/paused state is announced by its text copy, not by the figure's color alone (the figure itself, "$0," uses `ink-primary` like any other balance value — the *pause* is communicated by the adjacent sentence, not by recoloring the number itself).
- The comprobante zoom overlay (4.2) is keyboard-operable (open via Enter/Space on the thumbnail, close via Escape) and its zoomed image carries the same `alt` text convention as the Buyer track's QR code — a factual description ("Buyer's uploaded payment confirmation"), not a decorative-image empty alt.
- Trade-offer Accept/Decline are always presented as two independently reachable, clearly labeled controls — never a single toggle or swipe-only gesture that would be inaccessible to keyboard/assistive-tech users, per the Buyer track's equal-priority responsive contract extending to interaction modality, not just layout.

## Key Flows

**Flow 1 — Valentina Publishes Her First Listing (Scenario 01).** From the My Sales tab, Valentina taps "Start selling," completes the one-time individual-seller profile step, then creates her first listing — setting a price and condition, and switching on Open to Trade because she'd rather trade this particular card than sell it outright. Climax: she sees her listing confirmed live and visible on 1.3 — no business paperwork, no waiting on a review queue, the exact seam the Buyer track's FR-9 had deliberately left for this track to close.

**Flow 2 — Valentina Manages a Trade Offer (Scenario 02).** Days later a trade offer arrives on one of her open-to-trade listings. She opens her Trade Offers Inbox, reviews the offer's detail, and accepts it. She and the other collector arrange and complete the physical exchange outside TEZG. Climax: back on 2.3, she confirms the exchange happened — and because the other side has already confirmed too, the trade shows fully completed, not a one-sided claim she has to just trust.

**Flow 3 — Andrés Verifies His Business and Funds His Balance (Scenario 03).** Andrés, whose card shop has been running informally on Instagram, applies for business verification — legal identity plus a link to his existing storefront presence. He checks back on 3.2 over the following days; when it flips to Approved, he moves straight to funding his commission balance. Climax: he tops it up, creates his first listing through the same form Valentina uses, and it goes live as purchasable — verified, funded, and selling, with no invoice he didn't expect.

**Flow 4 — Andrés Fulfills a Sale (Scenario 04).** A buyer purchases one of his listings; Andrés notices the new Order on his Incoming Orders List. He opens it, reviews the comprobante the buyer uploaded, zooming in to check the transfer details against the amount owed. Climax: he confirms payment received — the commission auto-deducts, and the Order's tri-state row now shows his confirmation alongside the buyer's, needing only the buyer's own item-received tap (which he cannot trigger himself, AD-2) to close.

## Responsive & Platform

- **Valentina's surfaces (1.1-2.3):** mobile-first single-column, widening at the same tablet (≥768px) / desktop (≥1024px) breakpoints as the Buyer track — these are the same kind of decision/confirmation screens as the Buyer track's 3.1/3.2/4.1-4.4, capped at a ~640px reading measure on desktop rather than stretching full-width.
- **Andrés's surfaces (3.1-4.2):** authored desktop-first for the three Desktop-primary pages (3.1, 3.3, 4.2) and mobile-first for the two Mobile-primary pages (3.2, 4.1) per the Foundation table above — but every page reflows correctly at every breakpoint regardless of which was authored first, per TEZG's platform-wide equal-priority contract. A desktop-primary page (e.g. 3.1's verification form) collapses to a single-column mobile layout the same way Valentina's forms do; a mobile-primary page (e.g. 4.1's order list) widens into a comfortable single-column reading measure on desktop rather than stretching full-width, matching the Buyer track's 4.1 Orders List treatment exactly.
- **Comprobante viewer zoom overlay (4.2):** full-viewport on mobile, a centered modal capped at a comfortable max-width on desktop/tablet — never full-viewport on a wide screen, since that would force excessive eye travel to compare the zoomed image against the surrounding page's amount-owed context.
- **Zoom and scale:** all 11 surfaces reflow correctly under browser zoom up to 200%, inherited from the Buyer track's floor, using the same responsive rules already governing breakpoints.
