## Edge Case Hunter — Findings

Target: `docs/plan-1-buyer-track/EXPERIENCE.md` (primary), cross-referenced against `docs/plan-1-buyer-track/DESIGN.md` (secondary).

Method: exhaustive path/state trace only. No severity, no priority, no editorializing. Each entry is a state, transition, boundary, or condition that the spec's own text does not explicitly handle. Handled cases are omitted.

```json
[
  {
    "id": 1,
    "category": "comprobante-upload-state-machine",
    "location": "EXPERIENCE.md State Patterns, state 2 (OS picker open), lines 62-66",
    "condition": "User opens the OS file/camera picker (Idle -> OS-picker-open) and then cancels or dismisses it without selecting a file.",
    "gap": "No transition back to Idle (or any other state) is documented for picker cancellation."
  },
  {
    "id": 2,
    "category": "comprobante-upload-state-machine",
    "location": "EXPERIENCE.md State Patterns, states 2-5, lines 65-68",
    "condition": "A non-image file is selected despite accept=\"image/*\" (e.g., desktop 'All Files' picker option, or a file whose extension was changed).",
    "gap": "'Bad format' is named as a Failure cause, but the transition graph doesn't specify whether this is detected at selection time (OS-picker-open -> Failure directly, skipping Uploading) or only after an upload attempt (OS-picker-open -> Uploading -> Failure). The two produce different UI sequences and neither is stated."
  },
  {
    "id": 3,
    "category": "comprobante-upload-file-type",
    "location": "EXPERIENCE.md Foundation + Component Patterns, lines 18, 57",
    "condition": "iOS camera capture defaults to HEIC format, which matches the accept=\"image/*\" filter.",
    "gap": "No statement on whether HEIC is an accepted/processable format or falls into the 'bad format' Failure path."
  },
  {
    "id": 4,
    "category": "comprobante-upload-file-type",
    "location": "EXPERIENCE.md Foundation, line 18",
    "condition": "A bank transfer confirmation is commonly issued as a PDF, not an image.",
    "gap": "accept=\"image/*\" forecloses PDF selection entirely at the OS picker level; no mention of whether PDF receipts are an anticipated input or explicitly out of scope."
  },
  {
    "id": 5,
    "category": "comprobante-upload-file-size",
    "location": "EXPERIENCE.md State Patterns, state 5, line 68",
    "condition": "'File too large' is named as a Failure cause.",
    "gap": "No numeric size threshold is defined anywhere in EXPERIENCE.md or DESIGN.md, so the boundary itself (what counts as 'too large') is undefined."
  },
  {
    "id": 6,
    "category": "comprobante-upload-lifecycle",
    "location": "EXPERIENCE.md State Patterns, state 3 (Uploading), line 66",
    "condition": "User backgrounds the browser tab or switches apps while in the Uploading state.",
    "gap": "No documented behavior (does upload continue, pause, or fail on foreground return?)."
  },
  {
    "id": 7,
    "category": "comprobante-upload-lifecycle",
    "location": "EXPERIENCE.md State Patterns, state 3 (Uploading), line 66",
    "condition": "User navigates away from or closes the page/tab while in the Uploading state.",
    "gap": "No documented behavior for in-flight upload abandonment."
  },
  {
    "id": 8,
    "category": "comprobante-upload-lifecycle",
    "location": "EXPERIENCE.md State Patterns, state 5, line 68",
    "condition": "Page is refreshed/reloaded from Idle, Uploading, or Success (not just Failure).",
    "gap": "The spec only says Failure-state retry works 'without reloading the page,' implying reload is a distinct path, but never states what actually happens to any state on an actual reload (does Success survive, does an in-flight Uploading resume or reset to Idle?)."
  },
  {
    "id": 9,
    "category": "comprobante-upload-confirm-action",
    "location": "EXPERIENCE.md State Patterns, state 4 (Success), line 67; Key Flows Flow 3, line 98",
    "condition": "Buyer taps 'Confirm I Paid' twice in quick succession, or taps it once and it fails on the network.",
    "gap": "The 5-state machine covers only the photo upload; there is no defined state, guard, or failure path for the 'Confirm I Paid' action itself (double-submission or its own network failure)."
  },
  {
    "id": 10,
    "category": "comprobante-upload-state-machine",
    "location": "EXPERIENCE.md State Patterns, state 3 (Uploading), line 66",
    "condition": "User taps the dropzone again while a prior upload is still in progress, attempting to replace the file mid-upload.",
    "gap": "Not addressed — no statement on whether the dropzone is tappable/interactive during Uploading, or whether an in-flight upload can be cancelled/replaced."
  },
  {
    "id": 11,
    "category": "comprobante-upload-state-machine",
    "location": "EXPERIENCE.md State Patterns, state 4 (Success), line 67",
    "condition": "User wants to replace the photo after reaching Success but before tapping 'Confirm I Paid'.",
    "gap": "Not addressed — no statement on whether the dropzone remains interactive in the Success state."
  },
  {
    "id": 12,
    "category": "comprobante-upload-lifecycle",
    "location": "EXPERIENCE.md State Patterns, state 5 (Failure), line 68",
    "condition": "Repeated upload failures (e.g., 3+ consecutive Failure states from the same session).",
    "gap": "No documented retry-limit, cooldown, or lockout behavior."
  },
  {
    "id": 13,
    "category": "comprobante-upload-network",
    "location": "EXPERIENCE.md State Patterns, state 5, line 68",
    "condition": "Device is fully offline (no network at all) when the upload is attempted.",
    "gap": "Only 'upload timeout' is named as a network-related failure cause; a fully offline attempt is a distinct condition (may fail immediately rather than time out) and is not named."
  },
  {
    "id": 14,
    "category": "comprobante-upload-file-selection",
    "location": "EXPERIENCE.md Foundation + Component Patterns, lines 18, 57",
    "condition": "OS file picker allows multi-select (the `multiple` attribute is not mentioned either way).",
    "gap": "Behavior when more than one file is selected is not addressed."
  },
  {
    "id": 15,
    "category": "comprobante-upload-file-selection",
    "location": "EXPERIENCE.md State Patterns, states 3-5, lines 66-68",
    "condition": "Selected file is zero-byte or corrupted (e.g., an interrupted camera capture).",
    "gap": "Not named among the Failure causes (bad format, upload timeout, file too large) or elsewhere."
  },
  {
    "id": 16,
    "category": "comprobante-upload-lifecycle",
    "location": "IA table row for 3.2, line 31; Foundation, line 18",
    "condition": "Buyer leaves for her banking app after 3.1 and either never returns, or returns much later than the OrderId/session's validity.",
    "gap": "Not addressed — no statement on OrderId/session expiry or on what she sees if she returns very late."
  },
  {
    "id": 17,
    "category": "comprobante-upload-input-methods",
    "location": "EXPERIENCE.md Component Patterns, upload-dropzone, line 57; Responsive & Platform, line 108",
    "condition": "Desktop widths support the same upload mechanism via 'a standard file-browser dialog,' where drag-and-drop and clipboard-paste of an image are common alternate input methods.",
    "gap": "Not addressed — no statement on whether drag-and-drop onto the dropzone or paste-from-clipboard is supported or explicitly excluded on desktop."
  },
  {
    "id": 18,
    "category": "comprobante-upload-accessibility",
    "location": "EXPERIENCE.md Accessibility Floor, line 89",
    "condition": "Transition through state 2 (OS-picker-open) and back.",
    "gap": "The aria-live announcement requirement is scoped to 'idle/uploading/success/failure' only — the OS-picker-open state and the transition back out of it are not included, so a screen-reader user's return from the OS picker may have no announced state change."
  },
  {
    "id": 19,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md State Patterns, line 70",
    "condition": "receivedByBuyer=true, paid=false, receivedBySeller=false.",
    "gap": "Reachability and rendering not addressed (only paid=true/receivedBySeller=false/receivedByBuyer=false is walked as an explicit example)."
  },
  {
    "id": 20,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md State Patterns, line 70",
    "condition": "receivedBySeller=true, paid=false, receivedByBuyer=false.",
    "gap": "Reachability and rendering not addressed."
  },
  {
    "id": 21,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md State Patterns, line 70",
    "condition": "receivedBySeller=true, receivedByBuyer=true, paid=false.",
    "gap": "Reachability and rendering not addressed."
  },
  {
    "id": 22,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md Component Patterns, order-status-row, line 56 (AD-2)",
    "condition": "paid=true, receivedBySeller=false, receivedByBuyer=true (buyer confirms receipt before the seller confirms payment receipt).",
    "gap": "AD-2's rationale asserts this sequence is conceptually valid ('buyer can confirm receipt... independent of the seller's own confirmation timing'), but this specific combination is never walked as a concrete rendered example the way the paid-only example is."
  },
  {
    "id": 23,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md Key Flows Flow 4, line 100; State Patterns, line 70",
    "condition": "paid=true, receivedBySeller=true, receivedByBuyer=true (all three confirmed).",
    "gap": "Flow 4 states that confirming receipt 'closes the Order,' but no rendering is specified for the closed/terminal state — whether the tri-state row still displays three confirmed dots, whether a distinct 'Closed' indicator appears, or whether the page becomes read-only."
  },
  {
    "id": 24,
    "category": "order-tristate-boolean-combination",
    "location": "EXPERIENCE.md State Patterns, line 70",
    "condition": "paid=false, receivedBySeller=false, receivedByBuyer=false (brand-new order, default state).",
    "gap": "Not explicitly walked as a rendered example; only inferable from the general rule that each step renders independently."
  },
  {
    "id": 25,
    "category": "order-data-loading",
    "location": "EXPERIENCE.md IA table rows 4.1/4.2, lines 32-33",
    "condition": "Orders List / Order Detail page is still fetching order data (tri-state fields not yet known).",
    "gap": "No loading/unknown/skeleton state is defined for the tri-state fields prior to data arrival."
  },
  {
    "id": 26,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture table, lines 24-39",
    "condition": "Browser/OS back-navigation (back button, back gesture) from any of the 10 surfaces.",
    "gap": "The IA table documents only forward 'Reached from' / 'Leads to' relationships; no back-navigation behavior is specified for any surface."
  },
  {
    "id": 27,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture, line 26; Foundation",
    "condition": "A previously-registered user returns to the app (not a fresh sign-up).",
    "gap": "Only a 'Sign Up' surface (1.1) exists in the 10-surface IA; no log-in surface or logged-out-to-logged-in transition is documented, even though scenario 04 assumes an already-authenticated 'Account menu' entry point."
  },
  {
    "id": 28,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture, line 29",
    "condition": "User reaches 2.1 Listing Search Results and decides not to buy.",
    "gap": "No documented exit/abandonment path from 2.1 back to catalog or elsewhere; only the forward 'Leads to 3.1 (on Buy)' path is specified."
  },
  {
    "id": 29,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture, line 30",
    "condition": "User reaches 3.1 Purchase Confirmation (sees bank/QR details) and decides not to pay.",
    "gap": "No documented cancel/back path from 3.1; only the forward path to 3.2 is specified."
  },
  {
    "id": 30,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture, lines 30-31, 39",
    "condition": "User abandons 3.2 indefinitely (never uploads a comprobante after leaving for her banking app).",
    "gap": "The Closure Check states 'no page is revisited from a second scenario,' which appears to preclude resuming an incomplete 3.2 later from the Orders List (4.1/4.2, scenario 04). No documented path exists to resume or complete an abandoned in-progress purchase."
  },
  {
    "id": 31,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture, line 34",
    "condition": "User is shown the 4.3 Add-to-Collection Prompt and declines/dismisses it rather than confirming.",
    "gap": "Only the accept path ('on item received confirm' leading to 4.4) is documented; no decline/dismiss path or its consequence is specified."
  },
  {
    "id": 32,
    "category": "information-architecture-navigation",
    "location": "EXPERIENCE.md Information Architecture table, lines 24-39",
    "condition": "User deep-links directly to 3.2, 4.2, or 4.3 (bookmark, shared link, browser history restore, manual refresh) without having traversed the documented 'Reached from' predecessor.",
    "gap": "Not addressed for any of the 10 surfaces — no fallback, redirect, or guard behavior is specified."
  },
  {
    "id": 33,
    "category": "information-architecture-consistency",
    "location": "EXPERIENCE.md Information Architecture line 28 vs. State Patterns line 74",
    "condition": "IA table states 1.3 'Leads to: 2.1 Listing Search Results' unconditionally.",
    "gap": "The State Patterns section's zero-active-listings rule means this transition is not always available (the listing-comparison action leading into 2.1 is replaced by a factual no-listings line for hasActiveListings=false cards). The IA table and State Patterns section are not reconciled on this point."
  },
  {
    "id": 34,
    "category": "responsive-platform",
    "location": "EXPERIENCE.md Responsive & Platform, lines 104-108",
    "condition": "Device orientation change (portrait <-> landscape) at any breakpoint.",
    "gap": "Not addressed anywhere in the Responsive & Platform section."
  },
  {
    "id": 35,
    "category": "responsive-platform",
    "location": "EXPERIENCE.md Responsive & Platform, lines 106-107",
    "condition": "Viewport narrower than typical mobile (e.g., <320px) or wider than typical desktop (ultra-wide monitor).",
    "gap": "No minimum viewport floor is stated; grid layouts (1.2, 2.1) have no stated maximum-width cap the way the single-column decision screens do (~640px), so behavior at very wide viewports is undefined."
  },
  {
    "id": 36,
    "category": "responsive-platform",
    "location": "EXPERIENCE.md Responsive & Platform, lines 104-108",
    "condition": "Live viewport resize while a page is open (window resize on desktop, or rotation on mobile/tablet) versus layout only being determined at page load.",
    "gap": "Not addressed — unclear whether breakpoint layout is dynamically reactive or fixed at load."
  },
  {
    "id": 37,
    "category": "responsive-platform-accessibility",
    "location": "EXPERIENCE.md Responsive & Platform + Accessibility Floor, lines 82-108",
    "condition": "Browser/OS text-size scaling or zoom (e.g., 200% zoom reflow).",
    "gap": "Not addressed in either the Responsive & Platform section or the Accessibility Floor section."
  },
  {
    "id": 38,
    "category": "empty-zero-state",
    "location": "EXPERIENCE.md State Patterns, lines 72, 74 (compare); IA table line 32",
    "condition": "Orders List (4.1) for a user with zero orders ever placed.",
    "gap": "Not addressed — explicit empty-state treatment is given for the My Sales tab (4.4) and the zero-active-listings catalog case (1.2/1.3), but no parallel empty-state copy or behavior is defined for an empty Orders List."
  },
  {
    "id": 39,
    "category": "empty-zero-state",
    "location": "DESIGN.md components.price-block, lines 64-74; EXPERIENCE.md Component Patterns line 55",
    "condition": "A newly released card with no historical price data yet (zero trend history).",
    "gap": "CAP-3 requires the three-value price-block (listing/reference/trend) to always render as three fixed rows, but no state is defined for what the 'Trend' row shows when no historical data exists."
  },
  {
    "id": 40,
    "category": "empty-zero-state",
    "location": "EXPERIENCE.md IA table line 27; State Patterns line 74",
    "condition": "A filter combination at 1.2 Catalog Browse & Filter matches zero cards at all.",
    "gap": "Not addressed — distinct from the documented 'card exists but hasActiveListings=false' state; a true zero-results filter state has no specified copy or behavior."
  },
  {
    "id": 41,
    "category": "empty-zero-state",
    "location": "EXPERIENCE.md IA table lines 28-29; State Patterns line 74",
    "condition": "A card's last active listing sells out between viewing 1.3 (where hasActiveListings=true was shown) and reaching 2.1 Listing Search Results.",
    "gap": "Not addressed — the only zero-listings handling documented is the 1.3-level hasActiveListings gate, not a race condition surfacing zero results at 2.1 itself."
  },
  {
    "id": 42,
    "category": "empty-zero-state",
    "location": "EXPERIENCE.md Voice and Tone line 47; Key Flows Flow 4 line 100; State Patterns line 72",
    "condition": "My Sales tab (4.4) with listings present but zero pending trade offers, or vice versa (zero listings but pending trade offers present).",
    "gap": "The documented empty-state copy ('You're not selling anything yet') addresses only the fully-empty case; Flow 4 describes both listings and 'pending trade offers' living in the same tab, but a partial-empty sub-state (one populated, one empty) is not disambiguated."
  }
]
```

**Component-token cross-reference check (also_consider item):** every `{components.*}` and `{colors.*}` token EXPERIENCE.md references by name (`components.listing-card`, `components.price-block`, `components.order-status-row`, `components.upload-dropzone`, `components.button-primary`, `colors.status-confirmed`, `colors.status-error`) is defined in DESIGN.md's frontmatter. No missing tokens found on this axis.
