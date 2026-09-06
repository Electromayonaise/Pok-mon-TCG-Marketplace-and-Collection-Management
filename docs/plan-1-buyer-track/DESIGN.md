---
name: TEZG — Trusted Ledger
description: Visual identity for TEZG's Buyer/Collector track — a calm, ledger-like surface where a Pokémon card's price can be trusted at the moment of decision.
status: final
sources:
  - docs/plan-1-buyer-track/prd.md
  - docs/plan-1-buyer-track/C-UX-Scenarios/00-ux-scenarios.md
updated: 2026-09-05
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
    note: 'tabular-nums enabled — digits must align across listing/reference/trend values (CAP-3). All three values render in COP: reference price is shown as its COP-converted equivalent, never raw USD, so digits stay directly comparable.'
  data-label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 400
    fontSize: '0.75rem'
    lineHeight: 1.3
    note: 'monospace-style QR/account-number text on the payment-details-block (3.1) — never the same weight as price-figure, so a bank account number can never be mistaken for a price'
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
  price-block:
    listing-price:
      color: '{colors.ink-primary}'
      typography: '{typography.price-figure}'
      note: 'always COP, formatted with thousands separators'
    reference-price:
      color: '{colors.ink-secondary}'
      typography: '{typography.body}'
      note: 'COP-converted equivalent of the last-transaction USD/COP figure (CAP-3) — never displayed in raw USD'
    trend-up:
      color: '{colors.trend-positive}'
      glyph: '▲'
    trend-down:
      color: '{colors.trend-negative}'
      glyph: '▼'
    trend-none:
      color: '{colors.ink-secondary}'
      note: 'shown when a card has no historical price data yet (e.g. a newly released card) — the trend row still renders, with a factual "No price history yet" label instead of a figure, never hidden'
  payment-details-block:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    qr-frame:
      background: '{colors.surface-raised}'
      border: '{colors.border-hairline}'
      radius: '{rounded.sm}'
      padding: '{spacing.3}'
    account-text:
      color: '{colors.ink-primary}'
      typography: '{typography.data-label}'
    order-id-text:
      color: '{colors.ink-secondary}'
      typography: '{typography.meta}'
  order-status-row:
    pending-dot: '{colors.status-pending}'
    confirmed-dot: '{colors.status-confirmed}'
    label: '{colors.ink-secondary}'
    radius: '{rounded.sm}'
  upload-dropzone:
    idle-border: '{colors.border-hairline}'
    active-border: '{colors.accent}'
    error-border: '{colors.status-error}'
    radius: '{rounded.md}'
  listing-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    cta-business:
      label: 'Buy'
      style: '{components.button-primary}'
    cta-individual:
      label: 'Contact Seller'
      background: 'transparent'
      border: '{colors.border-hairline}'
      text: '{colors.ink-primary}'
      radius: '{rounded.sm}'
      note: 'never styled as button-primary — a visually distinct, lower-commitment action, since it only sends a contact message (CAP-6) rather than beginning a purchase'
  empty-state:
    text: '{colors.ink-secondary}'
    typography: '{typography.meta}'
    note: 'applies to: My Sales tab (4.4) with no listings, Orders List (4.1) with no orders, Card Detail View (1.3) when hasActiveListings=false, and Listing Search Results (2.1) when a filter/search matches zero listings — never to the 1.2 Catalog Browse grid itself, which instead shows a "no cards match your filters" variant of the same pattern with a filter-reset action'
---

## Brand & Style

TEZG's Buyer/Collector surfaces exist to answer one question the moment it's asked: *is this price real?* Valentina already knows PriceCharting and eBay well enough to spot a marketplace that's guessing. The visual language earns her trust the way a ledger does — by being quiet, precise, and legible under pressure, not by trying to look exciting.

Everything chromatic is rationed. A single muted teal signals "this is confirmed" and "this is the action to take" — it never decorates. No gradients, no holographic effects, no pack-opening theatrics: those belong to a hype-collectible aesthetic, and hype is the opposite of what a price-trust product needs to signal. The card itself — its art, its rarity — is the only place color is allowed to be loud, and that's the card's own catalog image, not this system's chrome.

## Colors

- **Warm Cream (`#FAF7F0`)** — the base canvas. Warm enough to avoid a clinical fintech-app coldness, restrained enough to stay out of the way of catalog card art.
- **Deep Navy Ink (`#0F1B2D`)** — primary text and the listing-price figure. Navy over black reads as considered rather than stark, and doubles as the "ledger" cue — this is the number that matters most on the card detail view (CAP-3).
- **Slate (`#4A5568`)** — secondary text: reference prices, metadata, timestamps. Always visually subordinate to the primary ink so the eye finds the listing price first.
- **Muted Teal (`#1F6F6B` / pressed `#164F4C`)** — the only accent. Used exclusively for the primary action (Buy, Upload, Confirm) and for "confirmed" state dots in the tri-state order row. Never used decoratively.
- **Hairline (`#E2DFD5`)** — dividers between listings, catalog rows, and order-status steps, at the lowest contrast that still reads.
- **Status-Pending (`#B08968`)** — a muted amber-brown, not a bright warning yellow, for a state that is simply "not yet confirmed" (e.g. business hasn't confirmed receipt) — CAP-22's tri-state design explicitly treats this as a normal, un-alarming waiting state, not an error (`prd.md` §7 NFR: "communicate that state honestly rather than implying an incident is being handled").
- **Status-Error (`#9B4444`)** — a muted brick red, reserved for genuine rejections (comprobante upload failure, `NotBusinessListing`). Muted deliberately — this is a marketplace for a hobby, not a banking app; errors should read as "try again," not alarm.
- **Trend colors** reuse Teal (up) and the muted brick red (down) for the historical-trend delta (CAP-3) — the same vocabulary as confirmed/error elsewhere, so a user never has to learn a second color language for "good" and "bad." Color is never the only signal: a ▲/▼ glyph and a signed percentage (`+4%`, `-2%`) always accompany the color, per the Accessibility Floor in EXPERIENCE.md.

**Avoid:** gradients, holographic/foil effects, saturated primary colors, drop-shadow "pop" on price figures — all of these read as marketing hype, which undercuts the very trust this product is selling.

## Typography

Inter, system-ui fallback — a neutral, highly legible humanist sans with true tabular figures, which matters here specifically: CAP-3 requires listing price, reference price, and historical trend to render as three distinct, separately labeled values, and tabular-nums keeps their digits aligned so a user can visually compare them at a glance rather than re-reading each one.

- `heading` — page titles and section headers only (Catalog, Orders, My Sales). Never used for a price.
- `body` — all standard UI text, labels, descriptions.
- `meta` — timestamps, order IDs, secondary labels (e.g. "Last transaction: 2 days ago").
- `price-figure` — reserved exclusively for the listing-price number on the card detail view and listing cards. Tabular-nums on, no italics, no color use beyond `ink-primary`/`ink-secondary` per the price-block component tokens.

No display or decorative typefaces. Headlines are rare and quiet — the price is the hero, not the heading.

## Layout & Spacing

Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48px. The 48px step exists because this is a responsive web surface (not mobile-only) — section breaks between major page regions (e.g. catalog filter bar → results grid) need more room to breathe on wider viewports than a mobile-only spacing scale would provide.

Mobile is the primary design target for these four scenarios (`prd.md` §1's Design-target decision) — layouts are authored mobile-first, single-column, then allowed to widen into a comparison grid (Listing Search Results) or a two-column catalog layout at tablet/desktop breakpoints, per TEZG's platform-wide equal-priority responsive requirement (SPEC.md). See EXPERIENCE.md's Responsive & Platform section for the breakpoint behavior itself.

## Elevation & Depth

No drop shadows for hierarchy — hierarchy comes from the hairline border and background-tone difference between `surface-base` and `surface-raised`, the same restrained approach a paper ledger uses (a ruled line, not a raised card). The one exception: the comprobante upload dropzone gets a 1px border-color state change (idle → active → error) rather than any shadow or elevation change, keeping the "flat ledger page" language consistent even during an active interaction.

## Shapes

`rounded/sm` (6px) for buttons, input fields, and status dots. `rounded/md` (10px) for listing cards and the upload dropzone — soft enough to feel approachable, restrained enough to avoid the bubbly, pill-shaped language of a gamified collectibles app. Nothing fully rounded; no pill buttons, no circular avatars-as-primary-action.

Card art thumbnails (the Pokémon card image itself) are the one place a slightly tighter radius (`rounded/sm`) is used to frame licensed artwork without visually competing with `rounded/md` containers around them.

## Components

- **Listing card** — `surface-raised` on `surface-base`, hairline border, `rounded/md`. Card art thumbnail, listing price in `price-figure`, seller-type badge (text label, not a colored pill — "Verified Business" or "Individual Seller" in `meta` type, never color-coded). Its call-to-action visibly differs by seller type: a verified-business listing shows `cta-business` ("Buy," full `button-primary` styling — it is directly purchasable), an individual-seller listing shows `cta-individual` ("Contact Seller," outlined and visually subordinate — tapping it only sends a contact message, CAP-6, and never begins a purchase). This distinction is the component's single most important job: it is how Valentina tells, at a glance, which listings she can complete in-platform (Scenario 02's climax).
- **Price block** (Card Detail View) — three stacked rows, always COP: listing price (`price-figure`, `ink-primary`), reference price (`body`, `ink-secondary`, labeled "Reference price," shown as its COP-converted equivalent per CAP-3), historical trend (`meta`, colored per trend direction with its ▲/▼ glyph, or the `trend-none` "No price history yet" label for a card with no history). Never collapsed into one row.
- **Payment details block** (Purchase Confirmation Screen, 3.1) — the OrderId, QR code, and bank-account details a buyer needs to pay externally. QR sits in its own bordered `qr-frame` (the one place a blocky, high-contrast graphic is allowed inside the otherwise flat ledger language). Account number and reference details render in `data-label` (monospaced-feel, never `price-figure` weight, so an account number is never visually mistaken for a price). OrderId renders in `meta`, clearly subordinate to the payment details it labels.
- **Order status row** — three steps (paid / received-by-seller / received-by-buyer) rendered as a horizontal or stacked sequence of labeled dots: unconfirmed = hollow ring in `border-hairline`, pending = filled `status-pending`, confirmed = filled `status-confirmed`. Never a single progress bar or percentage — each state must stay individually legible (CAP-22, `prd.md` §7 Consistency NFR). When all three are confirmed, the row additionally shows a "Closed" label beside it and the page's action controls become read-only — the row itself keeps showing three confirmed dots rather than swapping to a different terminal visual.
- **Upload dropzone** — `rounded/md` bordered region, idle border in `border-hairline`, active/focused border in `accent`, error border in `status-error`. Houses the standard file-input control (see EXPERIENCE.md Component Patterns for the no-native-camera-dependency behavior and the full state machine).
- **Button-primary** — `accent` background, `surface-raised` text, `rounded/sm`. One per screen for the dominant action (Buy, Confirm payment, Confirm received). Always disabled (never removed) while its own action is mid-flight, to prevent double-submission. No secondary-accent color for a second button — a second action is always a plain-text or outlined `ink-secondary` button, never a competing color.
- **Empty state** — see `components.empty-state` token for the full list of surfaces it applies to. Centered `meta`-weight text, no illustration, no color — a quiet, factual statement, never an apologetic or playful one (see EXPERIENCE.md Voice and Tone).

## Do's and Don'ts

| Do | Don't |
|---|---|
| One accent color (teal), used only for confirmed state + primary action | Color-code seller type, listing category, or card rarity in UI chrome |
| Three price values always visually distinct and separately labeled | Collapse listing/reference/trend into one number or one color |
| Muted, factual tone for pending/error states | Bright red alerts or urgent banners for a simply-unconfirmed state |
| Flat surfaces, hairline dividers | Drop shadows, gradients, or glow effects for hierarchy |
| Tabular figures for all price displays | Proportional-figure fonts where prices must be visually compared |
| Text-label seller-type badges | Colored pills/badges that imply a value judgment between seller types |
| Visually distinct CTAs for purchasable vs. contact-only listings | One generic "View" button that hides whether a listing is purchasable |
| QR codes paired with a full text equivalent (account number, bank name) | A QR code as the only way to access payment details — real money is at stake |
