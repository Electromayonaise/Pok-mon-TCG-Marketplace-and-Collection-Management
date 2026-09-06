---
name: TEZG — Trusted Ledger (Seller/Business Extension)
description: Visual identity for TEZG's Seller/Business track — extends the Buyer/Collector track's "trusted ledger" language to Valentina's individual-seller flows and Andrés's verified-business flows, without introducing a second visual vocabulary for the same app.
status: final
sources:
  - docs/plan-1-buyer-track/DESIGN.md
  - docs/plan-1-seller-track/prd.md
  - docs/plan-1-seller-track/C-UX-Scenarios/00-ux-scenarios.md
updated: 2026-09-06
colors:
  surface-base: '#FAF7F0'
  surface-raised: '#FFFFFF'
  ink-primary: '#0F1B2D'
  ink-secondary: '#4A5568'
  ink-disabled: '#A0AEC0'
  accent: '#1F6F6B'
  accent-pressed: '#164F4C'
  border-hairline: '#E2DFD5'
  status-pending: '#B08968'
  status-confirmed: '#1F6F6B'
  status-error: '#9B4444'
  trend-positive: '#1F6F6B'
  trend-negative: '#9B4444'
  note: 'All 11 tokens above are inherited verbatim [ADOPTED] from docs/plan-1-buyer-track/DESIGN.md — TEZG is one app, and this track introduces zero new colors. Every new component below is composed from this existing palette.'
typography:
  heading:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 600
    fontSize: '1.25rem'
    lineHeight: 1.3
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 400
    fontSize: '1rem'
    lineHeight: 1.5
  meta:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 400
    fontSize: '0.8125rem'
    lineHeight: 1.4
  price-figure:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 600
    fontSize: '1.375rem'
    letterSpacing: '0'
    note: 'inherited from the Buyer track — reused here for the commission-balance figure and listing-price entry field, since both are the same kind of "the number that matters most" value this token was built for'
  data-label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 400
    fontSize: '0.75rem'
    lineHeight: 1.3
rounded:
  sm: 6px
  md: 10px
  DEFAULT: 8px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 48px
components:
  button-primary:
    background: '{colors.accent}'
    background-pressed: '{colors.accent-pressed}'
    text: '{colors.surface-raised}'
    radius: '{rounded.sm}'
    padding: '{spacing.3} {spacing.5}'
  verification-status-badge:
    pending:
      color: '{colors.status-pending}'
      label: 'Pending review'
    approved:
      color: '{colors.status-confirmed}'
      label: 'Approved'
    rejected:
      color: '{colors.status-error}'
      label: 'Not approved'
    style: 'text label with a leading filled dot, same visual grammar as {components.order-status-row} dots — never a colored pill, matching the Buyer track\'s Do/Don\'t against value-judgment-coded badges'
  commission-balance-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    balance-figure:
      typography: '{typography.price-figure}'
      color: '{colors.ink-primary}'
      note: 'always COP, tabular-nums — same rendering rule as listing-price, since this is also "the number Andrés checks first"'
    zero-balance-state:
      color: '{colors.status-pending}'
      note: 'a zero/paused balance is a normal waiting state, not an error — reuses status-pending, never status-error, consistent with the Buyer track\'s treatment of "not yet confirmed" as non-alarming'
    top-up-action:
      style: '{components.button-primary}'
      label: 'Top up balance'
  trade-offer-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    accept-action:
      style: '{components.button-primary}'
      label: 'Accept'
    reject-action:
      background: 'transparent'
      border: '{colors.border-hairline}'
      text: '{colors.ink-primary}'
      radius: '{rounded.sm}'
      label: 'Decline'
      note: 'visually subordinate to Accept, mirroring the listing-card cta-business/cta-individual asymmetry already established — accepting is the primary path, declining is a lower-commitment escape hatch, not a competing action'
    state-badge:
      typography: '{typography.meta}'
      style: 'text label with a leading filled dot, identical grammar to order-status-row (inherited [ADOPTED] from docs/plan-1-buyer-track/DESIGN.md — not redeclared in this file, same inheritance pattern as listing-card)'
      offered:
        color: '{colors.status-pending}'
        label: 'Offered'
      accepted:
        color: '{colors.status-confirmed}'
        label: 'Accepted — waiting for both sides to confirm completion'
      declined:
        color: '{colors.status-error}'
        label: 'Declined'
      withdrawn:
        color: '{colors.ink-disabled}'
        label: 'Withdrawn by the other side'
        note: 'the one state that is neither a positive nor a negative outcome of Valentina\'s own doing — uses ink-disabled rather than status-error, since nothing went wrong on her side'
      completed:
        color: '{colors.status-confirmed}'
        label: 'Completed'
    unseen-indicator-dot:
      color: '{colors.accent}'
      size: '8px'
      shape: 'filled circle'
      note: 'a lightweight presence dot, distinct from the state-badge\'s leading dot — signals "new since last visit," not trade state, and disappears permanently once the card is opened (2.1's Technical Notes)'
  comprobante-viewer:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    note: 'the seller-side counterpart to {components.upload-dropzone} in the Buyer track — same bordered-frame visual language, but read-only and zoomable rather than an input target. Never styled as an upload-dropzone (no idle/active/error border states), since nothing is being uploaded here.'
  open-to-trade-toggle:
    on-color: '{colors.accent}'
    off-color: '{colors.border-hairline}'
    note: 'visible only inside {components.create-listing-form} when the acting seller is an Individual Seller — never rendered at all (not rendered-and-disabled) for a Verified Business listing, per AD-4. A control that is merely disabled would still imply a business account could someday flip it; the toggle is absent from the DOM entirely, matching the same "empty state visible, but a structurally impossible control does not render" distinction already drawn in the Buyer track\'s empty-state token.'
  create-listing-form:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    price-input:
      typography: '{typography.price-figure}'
      color: '{colors.ink-primary}'
    submit-action:
      style: '{components.button-primary}'
      label: 'Publish listing'
---

## Brand & Style

Seller/Business surfaces are the other half of the same ledger Valentina already trusted as a buyer — nothing here introduces a second visual identity. Where the Buyer track's chrome answers "is this price real?", the Seller/Business chrome answers a parallel question: "is my seller status, my balance, and my trade honest and current?" Same restraint, same single accent, same refusal of gradients or hype — a verification badge or a commission balance is not an achievement to celebrate, it's a fact to state plainly.

The one deliberate addition is a second protagonist's context: Andrés manages his shop's credibility and cash position here, not a collector's find. His screens carry slightly more back-office density (a balance figure, a status badge, a form) than Valentina's browse-and-buy screens, but never a different color language or a heavier visual weight — a "business" account is not styled as more important or more trustworthy than an "individual" one anywhere in this system, deliberately mirroring the Buyer track's own Do/Don't against color-coding seller-type value judgments.

## Colors

All colors are inherited [ADOPTED] from `docs/plan-1-buyer-track/DESIGN.md` — see that file's Colors section for full rationale. Two new semantic applications, using existing tokens only:

- **Status-Pending (`#B08968`)** now also covers a **paused/zero commission balance** (3.3) and a **pending verification application** (3.2) — both are "waiting, not broken" states, the same category `status-pending` already models for order confirmations.
- **Status-Confirmed / Muted Teal (`#1F6F6B`)** now also covers an **approved verification** badge and an **accepted trade offer** — both are "this is now true and actionable" states, the same category the accent already owns.

No new color is introduced for "rejected" (verification) or "declined" (trade offer) — both reuse `status-error`, consistent with the Buyer track's single error vocabulary.

## Typography

Inherited [ADOPTED] in full. `price-figure` gains one more legitimate use beyond the listing price: the commission-balance figure (3.3) and a listing's price-entry field (1.2, 3.3's reused mechanism) — both are values the tabular-nums/weight treatment was built for.

## Layout & Spacing

Inherited [ADOPTED] scale. The 48px step matters more here than in the Buyer track: Andrés's pages (3.1–4.2) are declared **responsive web, multi-surface** rather than mobile-first (see EXPERIENCE.md Foundation for the per-page device resolution deferred from Phase 2), so the wider section-break spacing is load-bearing on desktop from the start, not just an upscale of a mobile layout the way Valentina's pages are.

## Elevation & Depth

Inherited [ADOPTED] — flat surfaces, hairline borders, no drop shadows. The `comprobante-viewer` follows the same rule the upload-dropzone set: a border-color/state change communicates its condition, never a shadow.

## Shapes

Inherited [ADOPTED] — `rounded/sm` for controls and badges, `rounded/md` for cards and bordered content blocks. No new radius introduced.

## Components

- **Verification status badge** — text label with a leading filled dot (Pending/Approved/Not approved), identical grammar to `order-status-row` (inherited [ADOPTED] from `docs/plan-1-buyer-track/DESIGN.md`, not redeclared here — same inheritance pattern as `listing-card`) — a status is communicated the same way everywhere in TEZG, whether it's an order, a listing, or a business application.
- **Commission balance card** — the balance figure in `price-figure`, a "Top up balance" `button-primary`, and (when balance is zero) a factual `status-pending` line stating listings are paused — never a red warning banner, since pausing is a designed outcome of CAP-21, not a failure.
- **Trade offer card** — mirrors `{components.listing-card}`'s asymmetric-CTA pattern: Accept is `button-primary`-styled and visually dominant, Decline is outlined and subordinate. What's being offered (card/bundle, condition) renders using the same price-block typographic rules as a listing, so Valentina compares an incoming offer the same way she'd compare two listings. Its 5-state badge (Offered/Accepted/Declined/Withdrawn/Completed) uses the same leading-dot grammar as `order-status-row`; a separate small filled "unseen" dot (accent-colored, no relation to the state badge) marks a card as new since last visit and disappears once opened.
- **Comprobante viewer** — bordered, zoomable, read-only image (or PDF-icon) frame. This is the seller-side view of the same file the Buyer track's `upload-dropzone` produced; it is deliberately styled as a *viewer*, not a second dropzone, since Andrés never uploads here.
- **Open-to-trade toggle** — appears only inside `create-listing-form` for an Individual Seller; structurally absent (not disabled) for a Verified Business, per AD-4.
- **Create listing form** — shared by Scenario 01 (Valentina, page 1.2) and Scenario 03 (Andrés, reachable from page 3.2 while Pending or Approved, and via 3.3's shortcut once Approved, per FR-S9) — the same form component, gated differently: profile-completion for Valentina, business-application existence (Pending or Approved) for Andrés — never gated on commission balance, which affects only purchasability. The form itself never branches its visual layout by seller type; only the toggle's presence and the submit-eligibility check differ.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Reuse the Buyer track's exact palette, type, and radius tokens | Introduce a "business" accent color or a heavier/denser visual weight for Verified Business surfaces |
| Style a paused balance or a pending application as a factual waiting state | Show a red banner or urgent copy for a normal, expected waiting state |
| Render the open-to-trade toggle only when it can legally apply (AD-4) | Show the toggle disabled/grayed-out on a business listing — implies it could ever be turned on |
| Give Decline/Reject the same subordinate treatment as Contact-Seller in the Buyer track | Style Accept and Decline as two equal-weight competing buttons |
| Treat the comprobante viewer as read-only, bordered, zoomable | Reuse the upload-dropzone's idle/active/error states on a screen where nothing is being uploaded |
