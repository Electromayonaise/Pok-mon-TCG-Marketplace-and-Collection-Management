---
name: TEZG — Buyer/Collector Experience
description: Information architecture, behavior, states, interactions, and accessibility floor for Valentina's 4 Buyer/Collector scenarios.
status: final
sources:
  - docs/plan-1-buyer-track/prd.md
  - docs/plan-1-buyer-track/C-UX-Scenarios/00-ux-scenarios.md
  - docs/plan-1-buyer-track/DESIGN.md
updated: 2026-09-05
reviewed: review-ux-adversarial.md, review-ux-edge-cases.md (both triaged 2026-09-05)
---

## Foundation

**Form factor:** Responsive web app. TEZG's platform-wide contract (SPEC.md) requires equal-priority support across devices — this is not a mobile-only product. Within that framework, mobile is declared the **primary design surface** for these 4 scenarios specifically, because all four of Valentina's journeys (catalog discovery, listing comparison, comprobante payment, order/sales check-in) are drawn from `00-ux-scenarios.md` as mobile-browser sessions. Layouts are authored mobile-first and widen at tablet/desktop breakpoints (see Responsive & Platform below) — the desktop experience is a derived expansion of the mobile layout, not a separately designed one.

**UI system:** None named. No existing whole-system Design System was available to inherit from (`_bmad-output/D-Design-System/00-design-system.md` is explicitly deferred) — DESIGN.md's tokens are the full and only source of visual truth for this track.

**Upload mechanism (settled, not open):** SPEC.md's platform-wide constraint rules out any native-device-feature dependency (camera, push notifications) for this iteration. The comprobante upload (page 3.2) therefore uses a standard HTML `<input type="file" accept="image/*,application/pdf">`. On a phone this transparently surfaces the OS's own chooser, which already offers "Camera" alongside "Photo Library"/"Files" — Valentina gets a native-feeling camera option without TEZG integrating camera access directly. This is the resolution of what was flagged during Discovery as a real UX decision: build a custom in-app camera capture flow, or delegate to the OS picker. Delegating wins on every axis that matters here — it costs zero native integration, it inherits the OS's own permission handling, and it satisfies SPEC.md's constraint outright, whereas a custom capture flow would violate it. PDF is included alongside images because bank apps frequently issue transfer confirmations as PDFs rather than photos — the dropzone's Success-state preview shows a generic document icon (not a rasterized page) for a PDF selection, in place of the image thumbnail.

**Platform-field note (reconciling upstream naming):** Scenario 03's outline and page spec 3.2 label their Device/Platform field "Mobile (browser + camera)." That phrase predates this document and describes the *user-facing outcome* (she can use her camera), not a technical camera-API dependency — this Foundation section is the authoritative resolution: no native camera integration exists; "+ camera" refers only to the OS picker's built-in camera option.

## Information Architecture

Ten surfaces across four scenarios, each owned by exactly one scenario chain (no page is revisited from a second scenario):

| Surface | Scenario | Reached from | Leads to |
|---|---|---|---|
| 1.1 Sign Up | 01 | App entry | 1.2 Catalog Browse & Filter |
| 1.2 Catalog Browse & Filter | 01 | 1.1, or return visit via nav | 1.3 Card Detail View |
| 1.3 Card Detail View | 01 | 1.2 | 2.1 Listing Search Results (same session) — only when `hasActiveListings=true`; see State Patterns |
| 2.1 Listing Search Results & Comparison | 02 | 1.3 | 3.1 Purchase Confirmation (on Buy) |
| 3.1 Purchase Confirmation Screen | 03 | 2.1 | 3.2 Comprobante Upload (after external payment) |
| 3.2 Comprobante Upload & Payment Confirmation | 03 | 3.1, returning from banking app | Order shows buyer-paid state — scenario exit |
| 4.1 Orders List | 04 | Account menu (return visit); also reached directly from 3.2 via "Finish payment later" for an unpaid order | 4.2 Order Detail, or back to 3.2 for an unpaid order ("Finish payment") |
| 4.2 Order Detail | 04 | 4.1 | 4.3 Add-to-Collection Prompt |
| 4.3 Add-to-Collection Prompt | 04 | 4.2, on "item received" confirm | 4.4 My Sales Tab |
| 4.4 My Sales Tab | 04 | 4.3, or account menu directly | Scenario exit |

**Root nav:** Account menu is the entry point for scenario 04 (return visit) — Orders and My Sales are siblings under it, both always visible regardless of whether Valentina has any orders or listings yet (empty states, never hidden entry points — this is a direct expression of FR-9's testable Consequence in `prd.md`). Scenario 01 begins unauthenticated at App Entry, before any account menu exists; the two scenarios are sequential in Valentina's overall journey, not connected by a shared navigation element.

**Abandoned-purchase resume path:** if Valentina completes 3.1 (receives an OrderId and payment details) but never returns to finish 3.2, that Order is not lost. It appears in 4.1 Orders List as an unpaid order alongside her paid ones, distinguished by an "Awaiting payment" label (not part of the tri-state row, since payment hasn't happened yet) and a "Finish payment" action that returns her directly to 3.2 with her original OrderId and payment details intact. This is a deliberate design decision (not an omission): losing an abandoned purchase's record entirely would mean Valentina has no proof she started a legitimate transaction if she comes back days later.

**Contact-message outcome (2.1, individual-seller listings):** tapping `cta-individual` ("Contact Seller") on an individual-seller listing generates a contact message to that seller (CAP-6) and shows a lightweight inline confirmation ("Message sent — the seller will reach out") in place of navigating to a new page. This is the outcome of the CTA distinction described in Component Patterns below; TEZG does not provide a dedicated message-thread/inbox surface within this track's scope — the confirmation is the full extent of this interaction here.

**Closure check:** every stated need in the 4 scenario outlines has exactly one primary surface; every surface has exactly one scenario landing on it as its primary entry. The abandoned-purchase resume path and the contact-message outcome above are the two intentional exceptions — cross-scenario branches the original closure check missed, now reconciled rather than left implicit.

### Navigation & Resilience

General principles that apply across all 10 surfaces, rather than being re-specified per page:

- **Back navigation** is native browser/OS back at all times, except while an upload is actively in flight (State Patterns, comprobante Uploading state) — see Interaction Primitives for what backing out mid-upload does. Every surface not explicitly named as a scenario's terminal step (2.1, 3.1) supports backing out to its predecessor with no confirmation dialog, since no destructive action has occurred yet at those points.
- **Deep-linking / out-of-order access:** a surface reached without its documented predecessor context (e.g. 3.2 opened directly without an OrderId in session, or 4.2 for an order Valentina doesn't own) redirects to the nearest valid predecessor with its data available — 3.2 without context redirects to 4.1 Orders List; 4.2 for an inaccessible order redirects to 4.1 with a factual "Order not found" line. This is a fallback rule, not a per-surface design; no dedicated error page is needed.
- **Listing sold out between viewing (race condition):** if a card's last active listing sells between 1.3 and 2.1, 2.1 renders the same "No active listings for this card right now" empty-state treatment already defined for `hasActiveListings=false` — the race condition and the stable zero-listings case share one visual outcome, not two.

## Voice and Tone

Factual, first-person-plural-avoided, never cute. TEZG is a hobby marketplace, not a casual game — but it handles real money and real shipping anxiety, so copy stays calm and specific rather than either alarmist or playful.

- State what happened, not how the user should feel about it: "Payment not yet confirmed by seller" — not "Uh oh, still waiting!" and not "Payment failed" (it hasn't failed, it's pending).
- Never anthropomorphize errors ("Oops!", "Something went wrong on our end 😅") — name the actual condition: "We couldn't read that image — try a clearer photo of your transfer receipt."
- Empty states are single factual sentences, no illustration, no forced positivity: "You're not selling anything yet." Not "Nothing here yet — time to start selling! 🎉"
- Price language is precise: "Reference price" never "Market price" or "Fair price" (TEZG doesn't editorialize on what a card is worth, per FR-3's neutral three-value display).
- `NotBusinessListing` rejection (FR-4 — attempting to buy a listing that isn't actually purchasable in-platform): "This listing isn't available for in-platform purchase — try Contact Seller instead." Factual, redirects to the correct action rather than just naming the failure.
- Account-creation errors (1.1, e.g. duplicate email, weak password, network failure during signup): same factual register as payment errors — "That email's already registered — try signing in instead" / "Choose a password with at least 8 characters" / "Couldn't create your account — check your connection and try again." Never a generic "Something went wrong."

## Component Patterns

Behavioral specs only — visuals live in `DESIGN.md.components`.

- **`{components.listing-card}`** — the card body is tappable to reach Card Detail View from browse contexts (1.2). In search-results/comparison context (2.1), the CTA itself is the primary action: `cta-business` ("Buy") begins the purchase flow directly into 3.1; `cta-individual` ("Contact Seller") triggers the contact-message outcome described in Information Architecture above and does not navigate anywhere. Seller-type label is always present, never omitted for individual sellers. If a buyer somehow reaches a purchase attempt against a listing the backend rejects as `NotBusinessListing` (FR-4), the same Voice and Tone copy renders inline at the point of attempt — this is a defensive/consistency state, not an expected path, since the CTA distinction should prevent triggering it in the first place.
- **`{components.price-block}`** — the three values (listing / reference / trend) render as three separate DOM rows in a fixed order every time, never conditionally reordered or merged even when they're equal. Listing and reference price are always COP; trend renders its glyph + signed percentage, or the `trend-none` no-history label — never blank.
- **`{components.payment-details-block}`** (3.1) — OrderId, QR, and bank-account text render together as one block; the QR is always accompanied by its full text equivalent (account number, bank name, reference) directly beneath it, per Accessibility Floor below — a user who can't or doesn't want to scan a QR must be able to type the details manually into her banking app from the same screen.
- **`{components.order-status-row}`** — each of the three confirmation steps (paid / received-by-seller / received-by-buyer) is independently rendered from its own boolean/timestamp field. The row never infers or short-circuits a step's display from another step's state — e.g. `received-by-seller` pending does not visually block or gray out `received-by-buyer`, since a buyer can in principle confirm receipt whenever her card physically arrives, independent of the seller's own confirmation timing (AD-2). Concretely: `{paid:true, receivedBySeller:false, receivedByBuyer:true}` renders one confirmed dot, one hollow ring, and one confirmed dot — the buyer-side confirmation is never gated on the seller-side one. `{paid:false, receivedBySeller:false, receivedByBuyer:false}` (a brand-new order) renders three hollow rings. When all three are confirmed, see the "Closed" treatment in DESIGN.md's order-status-row component.
- **`{components.upload-dropzone}`** — wraps a native `<input type="file" accept="image/*,application/pdf">`. Tapping the dropzone opens the OS file/camera/file-browser chooser directly; there is no in-app intermediate "Camera or Gallery?" screen — that choice belongs entirely to the OS picker, per the Foundation decision above. See State Patterns for the complete transition graph.
- **`{components.button-primary}`** — disabled (not hidden) until its screen's required state is met (e.g. Confirm Purchase disabled until a listing is selected) — a disabled control communicates progress; a missing one reads as a bug. Any button-primary tied to a network action (Confirm I Paid, Confirm Item Received) disables itself the instant it's tapped and stays disabled until that action's response returns, success or failure — this is the standing guard against double-submission for every such action in this track, not just the comprobante flow.

## State Patterns

**Comprobante upload (page 3.2) — five named states plus their transitions, all required:**

1. **Idle / picker not yet opened** — dropzone shows idle border, instructional copy discloses the constraints upfront rather than reactively: "Upload a photo or PDF of your transfer confirmation (max 5MB)." Button-primary reads "Choose File."
2. **OS picker open** — native OS surface, outside TEZG's rendering control. Two exits: a file is selected → **Uploading**; the picker is dismissed/cancelled with nothing selected → back to **Idle** unchanged (explicit, not assumed).
3. **Uploading** — dropzone shows the selected file's thumbnail (image) or a generic document icon (PDF) at reduced opacity with an indeterminate progress indicator (no percentage — SPEC.md doesn't fix an upload-time NFR, so a determinate progress claim would overpromise); button-primary disabled with label "Uploading…". A file failing client-side validation (wrong type, over 5MB) is caught at selection time and routes directly to **Failure** without ever entering Uploading — this is a distinct path from a server-side upload failure, which does pass through Uploading first. The dropzone is not interactive while Uploading (no mid-upload replace); tapping it is a no-op until the state resolves. If the tab loses focus or the network drops mid-upload, the attempt is treated as failed on return/reconnect and lands in **Failure** with retry available — TEZG never silently resumes a background upload.
4. **Success** — dropzone border becomes `{colors.status-confirmed}`, thumbnail/document-icon at full opacity, a confirmation line ("File uploaded") appears alongside a small "Change file" text action that returns to **Idle** (letting Valentina replace a wrong screenshot before committing). Button-primary becomes enabled "Confirm I Paid." Tapping it disables it immediately (per the button-primary double-submission guard in Component Patterns) while the confirmation request is in flight; on success the page transitions to the buyer-paid order state (scenario exit); on failure, button-primary re-enables with an inline retry line ("Couldn't confirm — try again") and the uploaded file is preserved, so Valentina doesn't have to re-upload just because the confirmation call failed.
5. **Failure** — dropzone border becomes `{colors.status-error}`, thumbnail/icon (if one was selected) is cleared, an inline factual error line explains the failure by cause: "That file wasn't an image or PDF," "That file is over 5MB," or "Upload failed — check your connection and try again" (network/timeout, including a fully offline attempt). Button-primary reverts to "Choose File" so Valentina can retry from Idle without reloading the page. There is no attempt limit or cooldown — repeated failures simply repeat this state, since nothing about this flow is security-sensitive enough to warrant lockout.

**Order tri-state display (pages 4.1, 4.2):** each of the three steps independently renders one of {unconfirmed, pending, confirmed} — never a single collapsed "status" enum (CAP-22). Worked examples, covering the reachable range rather than a single case:
- `{paid:false, receivedBySeller:false, receivedByBuyer:false}` — brand-new order: three hollow rings.
- `{paid:true, receivedBySeller:false, receivedByBuyer:false}` — the common in-transit case: one confirmed dot, two hollow rings.
- `{paid:true, receivedBySeller:false, receivedByBuyer:true}` — buyer confirms receipt before the seller confirms payment receipt (AD-2 permits this ordering): confirmed / hollow / confirmed — never blocked or reordered to look sequential.
- `{paid:true, receivedBySeller:true, receivedByBuyer:true}` — fully confirmed: three confirmed dots plus the "Closed" label and read-only page state (DESIGN.md order-status-row).
`receivedByBuyer` or `receivedBySeller` true while `paid:false` is not reachable — both confirmations are modeled as only becoming available after `paid:true`, so the row never needs to render that combination.

**Loading state (4.1, 4.2):** while order data is being fetched, the tri-state row renders three low-opacity placeholder rings (a skeleton state), never a default "all unconfirmed" that could be mistaken for real data.

**My Sales tab (4.4) empty state:** a user with zero individual-seller listings sees the tab itself (never hidden) with the empty-state copy from Voice and Tone — this is the explicit, testable expression of FR-9's Consequence. When Valentina has listings but zero pending trade offers (or the reverse — offers on a listing she's since removed), each count renders independently as "0" with its own label ("Open listings: 3," "Pending trade offers: 0") rather than collapsing to a single empty-state message — the tab is only ever in its fully-empty state when both counts are zero.

**My Sales tab (4.4) error state:** distinct from the above — when the underlying `listings`/`trading` query (ARCHITECTURE.md AD-16) fails outright rather than merely being slow, the tab shows a factual inline message in place of the count rows ("Couldn't load your sales — check your connection and try again," `{colors.status-error}`) with a "Try again" action, per Voice and Tone's error-copy register. This is never conflated with Fully-empty (a successful query returning two real zeros) or with Loading (the query still in flight) — three visually and semantically distinct conditions, not one collapsed "nothing to show" state.

**Orders List (4.1) empty state:** a user with zero orders ever placed sees the same empty-state pattern: "You haven't placed any orders yet."

**Zero-active-listings catalog state (1.2/1.3):** a card with `hasActiveListings=false` still appears in browse/filter results and still opens a full Card Detail View (reference price and trend still shown) — it is not a dead end, only its listing-comparison action (leading into Scenario 02) is unavailable, replaced by a factual "No active listings for this card right now" line in place of the listing list.

**Zero-results filter state (1.2):** distinct from the above — when a filter/search combination matches no cards at all (not "this card has no listings" but "no cards match"), 1.2 shows the `components.empty-state` pattern with copy "No cards match your filters" and a visible action to reset filters. This is a different condition from a single card lacking active listings and is never conflated with it.

## Interaction Primitives

- **Tap targets:** minimum 44×44px for all primary actions (button-primary, listing-card tap area, dropzone), per standard mobile touch-target accessibility guidance — no exceptions for secondary icon-only controls.
- **Navigation:** forward progression within a scenario is always a full-screen transition (no modals for scenario-critical steps like comprobante upload or add-to-collection) — modals are reserved for genuinely dismissible, non-blocking confirmations only.
- **Feedback timing:** any state change lasting longer than ~300ms (upload, page navigation) shows a visible in-progress indicator; nothing changes silently.
- **Backing out mid-upload:** navigating away while the comprobante dropzone is in its Uploading state is allowed (no blocking confirmation dialog) but abandons that upload attempt — returning to 3.2 later starts from Idle, not from a resumed Uploading state, consistent with State Patterns' rule that TEZG never silently resumes a background upload.

## Accessibility Floor

Behavioral requirements — contrast values themselves live in DESIGN.md's color token choices, which were selected to meet these floors:

- All text/background pairings meet WCAG AA contrast (4.5:1 body text, 3:1 large text) — `ink-primary`/`ink-secondary` on `surface-base`/`surface-raised` were chosen against this floor.
- The three price-block values are never distinguished by color alone — labels ("Listing price," "Reference price," "Trend") are always present as text, so a color-blind or screen-reader user gets the same distinction sighted users get from position and weight. Trend direction specifically is never color-only either: the ▲/▼ glyph and a signed percentage (`+4%`/`-2%`) always accompany `trend-positive`/`trend-negative`.
- Order-status dots carry a text label alongside color/fill state (e.g. "Confirmed," "Pending," not yet confirmed") — never color/fill alone.
- The payment-details-block's QR code always carries a full text equivalent beneath it (account number, bank name, reference) with an `alt` description identifying it as a payment QR code — a screen-reader user or anyone who can't scan it gets the complete payment path without the QR.
- Upload dropzone states (idle/OS-picker-open/uploading/success/failure) are announced via `aria-live` region text changes, not border-color changes alone, since the file input itself is a common screen-reader focus point. This includes the return from OS-picker-open (to Idle on cancel, or to Uploading on selection) — that transition is announced like any other, not treated as outside TEZG's scope just because the picker itself is native chrome.
- All interactive elements are reachable and operable via keyboard/assistive tech on desktop widths, even though mobile is the primary design target — this is not optional under TEZG's platform-wide equal-priority responsive contract.

## Key Flows

**Flow 1 — Valentina Finds Her First Card (Scenario 01).** Valentina signs up, then browses the catalog filtering by set and Pokémon name to find a card she's chasing from the newest set. She opens its Card Detail View. Climax: she sees the listing price sitting right beside a reference price and a historical trend line she recognizes from PriceCharting — the number finally looks trustworthy instead of like a guess, and she keeps going instead of bouncing to check a third-party site.

**Flow 2 — Valentina Picks a Listing She Trusts (Scenario 02).** Continuing the same session, she filters listing search results by distance for that exact card and sees individual-seller and verified-business listings side by side, each with its price against the same reference price. Climax: she picks the verified-business listing specifically because it's purchasable in-platform — she does not have to leave TEZG and negotiate with a stranger on WhatsApp to get her card.

**Flow 3 — Valentina Pays Without a Payment Gateway (Scenario 03).** She confirms the purchase and receives an OrderId plus the business's bank/QR details. She leaves TEZG, pays through her own banking app, and returns. Climax: she uploads a photo of her transfer confirmation through the standard OS picker, watches it move through uploading → success, and confirms "I paid" — the order now visibly shows a buyer-paid state, her proof that she did her part, without TEZG ever touching her money.

**Flow 4 — Valentina Checks Her Orders — and Her Sales (Scenario 04).** Days later she opens Orders from the account menu and sees her order's three independent states (alongside any unpaid orders awaiting a "Finish payment" tap, if she has one). Her card has physically arrived, so she confirms "item received," closing the Order. She accepts the add-to-collection prompt — the card lands in her binder tagged `PlatformPurchase`. Climax: she then taps into the My Sales tab, in the same account area, and sees a plain summary of her own open individual-seller listings and pending trade offers — never having to decide whether she's "acting as a buyer" or "acting as a seller" to get there, because TEZG never asked her to pick.

## Responsive & Platform

Mobile-first single-column layouts widen at standard tablet (≥768px) and desktop (≥1024px) breakpoints:

- **1.2 Catalog Browse & Filter, 2.1 Listing Search Results:** single-column list on mobile → 2-column grid at tablet → 3-column grid at desktop. Filter controls move from a full-screen sheet (mobile) to a persistent left rail (desktop).
- **1.3 Card Detail View, 3.1/3.2, 4.1-4.4:** remain single-column at all widths, capped at a comfortable reading measure (~640px) on desktop rather than stretching full-width — these are decision/confirmation screens, not browse surfaces, and stretching the price-block or upload-dropzone wide would work against their "ledger page" visual language.
- No feature is desktop-only or mobile-only across these 10 surfaces — the same OS file-picker upload mechanism applies on desktop browsers too (a standard file-browser dialog rather than a mobile OS sheet), satisfying the same five-state pattern identically. On desktop, the dropzone additionally accepts drag-and-drop and clipboard-paste of a file as equivalent alternate entry points into the same Uploading state — these aren't separate states, just additional ways to reach the one that already exists.
- **Orientation and resize:** layout is fluid, not fixed at load — a live viewport resize (window resize on desktop, device rotation on mobile/tablet) reflows immediately using the same breakpoint rules above; there is no separate "landscape" layout to design, since portrait and landscape at a given width both resolve through the same three-tier breakpoint system.
- **Zoom and scale:** all 10 surfaces reflow correctly under browser zoom up to 200% (a standard accessibility benchmark) without horizontal scrolling or content loss, using the same responsive grid/flex rules already governing breakpoints — zoom is treated as "a narrower effective viewport," not a separate case.
- **Viewport bounds:** the single-column decision screens (1.3, 3.1, 3.2, 4.1-4.4) have no minimum-width floor below which they break, since they're already single-column at the narrowest breakpoint; the grid surfaces (1.2, 2.1) cap at 3 columns and do not add a 4th no matter how wide the viewport gets, keeping card sizes legible on ultra-wide displays rather than stretching indefinitely.
