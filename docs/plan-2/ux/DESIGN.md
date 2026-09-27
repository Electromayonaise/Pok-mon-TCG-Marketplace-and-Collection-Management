---
name: TEZG — Trusted Ledger (Plan-2 Module Extension)
description: Visual identity for the 12 Plan-2 modules. Extends the Plan-1 "Trusted Ledger" (buyer and seller tracks) to back-office queues, developer consoles, ledgers, binders, valuation charts and moderation, without a second visual vocabulary. TEZG is one app.
status: final
sources:
  - docs/plan-1-buyer-track/DESIGN.md
  - docs/plan-1-seller-track/DESIGN.md
  - docs/plan-2/planning/prd.md
  - docs/plan-2/planning/addendum.md
  - docs/plan-2/ux/C-UX-Scenarios/00-ux-scenarios.md
updated: 2026-09-26
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
  note: 'All colour tokens are inherited verbatim [ADOPTED] from docs/plan-1-buyer-track/DESIGN.md via the seller-track extension. Plan-2 adds zero colours. Contrast on surface-base — ink-primary ≈16:1, ink-secondary ≈7.0:1, accent ≈5.5:1, status-error ≈5.9:1 (all text-safe); status-pending ≈2.96:1 and ink-disabled ≈2.3:1 are NOT text-safe and are used only as redundant graphics next to a text label.'
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
    note: 'inherited; tabular-nums. Plan-2 reuses it for the collection total (VAL), the commission balance (COM) and the rating average (REP) — each is "the number the person checks first" on its surface.'
  data-label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontWeight: 400
    fontSize: '0.75rem'
    lineHeight: 1.3
    note: 'inherited; labels of figures, table headers in D surfaces, bank/reference text.'
  code:
    fontFamily: 'ui-monospace, "JetBrains Mono", "SFMono-Regular", Menlo, Consolas, monospace'
    fontWeight: 400
    fontSize: '0.8125rem'
    lineHeight: 1.5
    note: 'NEW (Plan-2, logged decision UX-D-2). Only on H developer-console surfaces and in admin-only D views that show identifiers (orderId, ledger seq, reasonCode, rule citation, JSON). Never in R buyer/seller surfaces, where codes are forbidden (ADD-§1.2).'
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
  # ---- inherited [ADOPTED] from Plan-1 (declared there, not redeclared here) ----
  # button-primary, price-block, payment-details-block, order-status-row, upload-dropzone,
  # listing-card (cta-business / cta-individual), empty-state      <- buyer track
  # verification-status-badge, commission-balance-card, trade-offer-card, comprobante-viewer,
  # open-to-trade-toggle, create-listing-form                       <- seller track
  focus-ring:
    color: '{colors.accent}'
    width: '2px'
    offset: '2px'
    note: 'NEW behavioural token (logged decision UX-D-3). Applies to every focusable element on R, D and H surfaces; never removed, never replaced by a colour change alone (WCAG 2.2 SC 2.4.7 / 2.4.11). No new colour — reuses accent.'
  button-secondary:
    background: 'transparent'
    border: '{colors.border-hairline}'
    text: '{colors.ink-primary}'
    radius: '{rounded.sm}'
    padding: '{spacing.3} {spacing.5}'
    note: 'formalises the outlined style Plan-1 used ad hoc for cta-individual and Decline; every non-dominant action uses it'
  button-destructive:
    background: 'transparent'
    border: '{colors.status-error}'
    text: '{colors.status-error}'
    radius: '{rounded.sm}'
    note: 'Reject application, Reject top-up, Hide, Delete collection, Cancel trade. Outlined, never filled — a destructive action is never the visually dominant one'
  state-indicator:
    typography: '{typography.meta}'
    label-color: '{colors.ink-secondary}'
    dot-size: '8px'
    confirmed:
      dot: '{colors.status-confirmed}'
      shape: 'filled circle'
    pending:
      dot: '{colors.status-pending}'
      shape: 'filled circle'
    error:
      dot: '{colors.status-error}'
      shape: 'filled circle'
    inert:
      dot: '{colors.ink-disabled}'
      shape: 'hollow ring, 1.5px'
    note: 'the single state grammar for all 12 modules (see Colors → state mapping). Dot is always paired with a text label in ink-secondary or ink-primary — the dot is redundant, the label carries meaning'
  explainability-banner:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    rule-width: '4px'
    radius: '{rounded.md}'
    padding: '{spacing.4}'
    headline: '{typography.body} weight 600, {colors.ink-primary}'
    message: '{typography.body}, {colors.ink-primary}'
    why-toggle: '{typography.meta}, {colors.accent}, underline'
    tone-notice:
      rule: '{colors.status-pending}'
      outcomes: 'allowedWithNotice, unverified, stale, excluded, notValued'
    tone-inert:
      rule: '{colors.ink-secondary}'
      outcomes: 'paused, withdrawn, hidden, unfulfillable'
    tone-refusal:
      rule: '{colors.status-error}'
      outcomes: 'rejected'
    tone-done:
      rule: '{colors.status-confirmed}'
      outcomes: 'allowed (only when a success needs confirming, e.g. "Recarga enviada")'
    note: 'the visual form of the PRD §6 Decision. The left rule is decorative; the headline names the outcome in words'
  field-error:
    text: '{colors.status-error}'
    typography: '{typography.meta}'
    input-border: '{colors.status-error}'
    summary: 'error summary box at the top of the form: {components.explainability-banner} tone-refusal listing every field issue as an in-page link'
  stale-label:
    typography: '{typography.meta}'
    color: '{colors.ink-secondary}'
    glyph: '◷'
    note: 'CAT reference prices, VAL stale items and history points. Always words plus date ("◷ Precio del 29 sep 2026: el feed no se actualiza desde entonces"), never a colour alone'
  price-provenance-block:
    extends: '{components.price-block}'
    provenance-line:
      typography: '{typography.meta}'
      color: '{colors.ink-secondary}'
    usd-line:
      typography: '{typography.meta}'
      color: '{colors.ink-secondary}'
      note: '"US$12,34 · TRM al 29 sep 2026" — a separate line, never summed into a COP figure (money-shape rule)'
  data-table:
    background: '{colors.surface-raised}'
    header: '{typography.data-label}, {colors.ink-secondary}'
    cell: '{typography.meta}, {colors.ink-primary}'
    numeric-cell: 'tabular-nums, right-aligned'
    row-height: '40px'
    row-divider: '{colors.border-hairline}'
    selected-row: '2px left rule {colors.accent}'
    note: 'D surfaces (queues, ledger, audit). Sticky header, no zebra striping, no row shadows'
  ledger-table:
    extends: '{components.data-table}'
    credit: '"+$20.000" in {colors.ink-primary}'
    debit: '"−$2.200" (U+2212) in {colors.ink-primary}'
    balance-column: 'tabular-nums, {typography.meta} weight 600'
    negative-balance: '{colors.status-error} text + "Saldo negativo" label'
    note: 'sign carries meaning, not colour; debits are not red'
  api-explorer-panel:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    request-pane: '{typography.code}'
    response-pane: '{typography.code}'
    decision-card: '{components.explainability-banner} rendered above the raw JSON'
    fixture-banner: '{typography.meta}, {colors.ink-secondary}, text "Consola de desarrollo · datos de prueba"'
    note: 'every H surface (IDN, INV, COM, MSG, ORD simulator, TRD state viewer). Two panes side by side ≥1024px, stacked below'
  state-machine-viewer:
    node: '{components.state-indicator} in a {rounded.sm} bordered box'
    current-node: '2px border {colors.accent} + "estado actual" label'
    edge: '1px {colors.border-hairline}, arrow, action label in {typography.code}'
    note: 'text list of transitions is always rendered below the diagram (the diagram is not the only representation)'
  race-simulator:
    input: 'number field N (2–100) + fire button {components.button-primary}'
    result-summary: '"1 ganó · 49 recibieron InsufficientQuantity · invariante: disponible = 0 ✓" in {typography.code}'
    invariant-ok: '{components.state-indicator} confirmed'
    invariant-broken: '{components.state-indicator} error'
  ingestion-console:
    counts-row: 'four figures (inserted, updated, unchanged, quarantined) in {typography.price-figure}, labels {typography.data-label}'
    quarantine-table: '{components.data-table} with defect kind and row number'
    fault-switch: 'segmented control: none / down / stale / malformedRows / renamedRows'
  capability-trace:
    row: 'capability name ({typography.body}) · yes/no in words · cited facts in {typography.code}'
    allowed: '{components.state-indicator} confirmed'
    denied: '{components.state-indicator} inert, with the reason in words'
  document-viewer:
    extends: '{components.comprobante-viewer}'
    audit-line: '{typography.meta}, {colors.ink-secondary}: "Este acceso queda registrado · enlace válido 10 min"'
    note: 'legal-identity documents and top-up proofs; view-only, no download button (NFR-SYS-14)'
  location-picker:
    use-my-location: '{components.button-secondary}'
    city-select: 'native select of Colombian cities with centre points'
    radius-input: 'number input 1–300 km + slider, both labelled; the number input is canonical'
  distance-row-explanation:
    typography: '{typography.meta}'
    color: '{colors.ink-secondary}'
    note: '"4,9 km · tienda verificada · se puede comprar" / "8,0 km · pausada (la tienda está recargando saldo)" / "12,4 km · entrega en persona"'
  trade-timeline:
    round: '{typography.meta} header "Ronda 2 · Julián" + terms list'
    turn-indicator: '{components.state-indicator} pending + "Te toca responder" / "Esperando a Valentina"'
    note: 'extends {components.trade-offer-card}; state badges add open (pending), rejected (error), expired / unfulfillable / cancelled (inert)'
  message-thread:
    own-message: 'right-aligned, {colors.surface-raised}, {rounded.md}, hairline border'
    other-message: 'left-aligned, {colors.surface-base}, {rounded.md}, hairline border'
    notice-line: '{typography.meta} with {components.state-indicator} pending — "Esta tienda aún no ha sido verificada por TEZG."'
    unread-count: 'number in {typography.meta} weight 600 next to an 8px {colors.accent} dot'
    read-only-footer: '{components.explainability-banner} tone-inert instead of the composer'
  contact-composer:
    preview-frame: '{colors.surface-raised}, hairline, {rounded.md}, {typography.body}'
    open-whatsapp: '{components.button-primary} label "Abrir WhatsApp"'
    copy-text: '{components.button-secondary} label "Copiar mensaje"; confirmation "Copiado" in a live region'
  binder-grid:
    pocket-aspect: '63:88'
    pocket: '{colors.surface-raised}, hairline, {rounded.sm}'
    empty-pocket: 'dashed {colors.border-hairline}, no content'
    gap: '{spacing.2}'
    page-footer: '{typography.meta} "Página 2 de 14"; with a one-set filter it adds the completion "· 37/191 (19 %)"'
  source-badge:
    typography: '{typography.meta}'
    color: '{colors.ink-secondary}'
    variants: '"Comprado en TEZG" · "Agregado a mano" · "Agregado por enlace · <dominio>"'
    note: 'text only, never colour-coded (seller-track Do/Don''t on value-judgment badges)'
  prompt-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    radius: '{rounded.md}'
    accept: '{components.button-primary} "Agregar", next to a native select labelled "Colección"'
    dismiss: '{components.button-secondary} "Ahora no"'
  valuation-summary:
    total: '{typography.price-figure}'
    change: '{components.price-block}.trend-up / trend-down with glyph and signed percent'
    coverage-line: '{typography.meta} "Valoradas 450 de 500 · 25 con precio desactualizado"'
  valuation-chart:
    series: '2px {colors.ink-primary}'
    stale-segment: '2px dashed {colors.ink-secondary}'
    axis: '{typography.data-label}, {colors.ink-secondary}'
    gridline: '{colors.border-hairline}'
    note: 'always paired with a "Ver como tabla" data table (same data). No area fill, no gradient'
  rating-summary:
    average: '{typography.price-figure} "4,3"'
    stars: '★ glyphs in {colors.ink-primary} with a text equivalent "4,3 de 5"'
    count: '{typography.meta} "12 reseñas"'
    provenance: '{typography.meta} "De compras verificadas" / "Las reseñas no están ligadas a compras"'
  review-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-hairline}'
    edited-marker: '{typography.meta} "editada"'
    hidden-for-author: '{components.explainability-banner} tone-inert "Oculta por moderación de TEZG" + reason'
  moderation-panel:
    reason-select: 'native select of ADD-§9.2 reasons for the target kind'
    note-field: 'textarea 0–500 (10–500 when reason = Other), counter in {typography.meta}'
    confirm: '{components.button-destructive} "Ocultar"; unhide uses {components.button-secondary} "Mostrar de nuevo"'
  skeleton:
    color: '{colors.border-hairline}'
    radius: '{rounded.sm}'
    note: 'static blocks matching the final layout; no shimmer (reduced-motion safe by construction)'
---

## Brand & Style

Plan-2 does not change what TEZG looks like; it extends the same ledger to the places Plan-1 never drew. Those places are:

- an admin approving a shop at 9 a.m.;
- a developer firing fifty reservations at one card;
- a collector reading what her binder is worth;
- a buyer being told, plainly, why the "Buy" button is not there.

The Trusted Ledger's promise is the same everywhere: every number and every refusal can be checked. Plan-2's largest addition to that promise is the **explainability banner**. Every automated decision the PRD returns (§6 `Decision`) has one visual form, so "why can't I do this?" always looks the same across all twelve modules.

The Plan-1 restraint holds on every new surface:

- One accent colour.
- No gradients, glow or hype.
- Flat surfaces with hairline dividers.
- Colour never carries meaning alone.

Back-office (D) and developer-console (H) surfaces are **denser**, but they are not **different**. They use the same palette and the same state grammar, plus one monospace type token for identifiers.

## Colors

No colour is added. The eleven Plan-1 tokens are inherited verbatim; see the Plan-1 buyer DESIGN.md for the rationale of each colour.

Plan-2 contributes one thing: a **single state mapping** that every module's states resolve to. With it, a reader who has learned "brown dot = waiting" on an order row understands a pending top-up, a pending application and a stale price without learning anything new.

| Class | Graphic | Used for (all modules) |
| --- | --- | --- |
| **confirmed** | filled `status-confirmed` dot | Approved application · Funded balance · PaymentConfirmed / Closed order · Accepted / completed trade · Accepted prompt · Visible (after unhide) · top-up Confirmed · capability allowed · invariant holds |
| **pending** | filled `status-pending` dot | Pending application · Unverified listing · AwaitingPayment / Paid order · Open offer (waiting on a turn) · top-up Pending · low balance · stale price · Pending prompt · unread · "not yet verified" notice |
| **error** | filled `status-error` dot | Rejected application (with its reason) · rejected top-up · Rejected offer · refused action · negative balance · invariant broken |
| **inert** | hollow `ink-disabled` ring | Paused (balance) · Withdrawn · Hidden · Deactivated · Sold out · Expired · Cancelled · Unfulfillable · Withdrawn offer · Dismissed prompt · barred reapplication · capability not granted |

**Rules:**

- The dot is always followed by a text label in `ink-secondary` or `ink-primary`. `status-pending` (≈2.96:1) and `ink-disabled` (≈2.3:1) are never used for text.
- **Paused is inert, not pending and not error.** The Plan-1 seller track chose `status-pending` for a zero balance on the owner's own card, and that stays for `commission-balance-card`. A *listing* that is paused, however, is not waiting on the buyer. It reads as inert, with the words "pausada (la tienda está recargando saldo)".
- **Negative balance is error** because it is the one balance state that needs Andrés to act before anything resumes. It is shown in text as "−$5.000" plus "Saldo negativo", not in red alone.
- **Trend colours** keep the Plan-1 rule: ▲/▼ glyph plus signed percent plus colour, and "0,00 %" in `ink-secondary` with no glyph.

## Typography

The five Plan-1 tokens are inherited unchanged. One token is added:

- **`code`** (monospace, 0.8125rem). *Logged decision UX-D-2.* H surfaces show request and response JSON, ledger sequence numbers, `reasonCode`s and rule citations such as `FR-INV-3`. D admin views show identifiers (orderId, applicationId, transferReference) that must be read character by character. Inter's tabular figures do not separate `0/O` and `1/l/I` well enough for that job.
  - `code` **never** appears on an R buyer or seller surface. There, codes and internal vocabulary are forbidden (ADD-§1.2).
  - It is also never used for a price.

Reuse notes:

- `price-figure` is reserved for "the number the person checks first":
  - listing price (inherited);
  - commission balance (inherited);
  - collection total (VAL);
  - rating average (REP);
  - the four ingestion counts (CAT console).
- `data-label` becomes the table-header style on D surfaces.

## Layout & Spacing

Same 4-48px scale. Three layout families, by form factor (EXPERIENCE.md → Foundation):

- **R (responsive)** — mobile-first single column, widening at ≥768px and ≥1024px (Plan-1 rules). Content measure is capped around 640px for reading surfaces (forms, banners, message threads). Grids (catalog, binder, results) cap at 3 columns for cards and 5 for binder pockets.
- **D (desktop-first back-office)** — a 240px left navigation rail plus a content area. Queues use `data-table` with a detail panel on the right, 480px, at ≥1280px, or a separate page below that. The minimum supported width is 1024px; below that, the table collapses to a stacked row list, which stays usable but is not optimised.
- **H (developer console)** — `api-explorer-panel`, with the request pane on the left and the response pane on the right at ≥1024px, stacked below that. A fixture banner is always pinned at the top.

Vertical rhythm:

- `spacing.5` between regions.
- `spacing.3` between rows inside a block.
- `spacing.7` only between top-level page regions on ≥1024px.

## Elevation & Depth

Flat. There is no shadow for hierarchy (Plan-1 rule). A D detail panel is separated by a hairline and the `surface-raised` tone, not by a shadow.

The one allowed layering is a **non-modal side panel** on D surfaces, such as the moderation panel or the reject-application form. It sits beside the table and never covers the row it acts on. Confirmation steps for destructive admin actions use a native `<dialog>` with the same flat styling, a hairline border and `rounded.md`, with no backdrop blur.

## Shapes

- `rounded.sm` for buttons, inputs, dots, binder pockets and state-machine nodes.
- `rounded.md` for cards, banners, panels, the preview frame and the document viewer.
- Nothing is fully rounded: no pills, and chips are text labels.
- Binder pockets keep the physical card aspect, 63:88, so a binder page reads as a page of sleeves.

## Components

Inherited components keep their Plan-1 specification. The following Plan-2 components are new or extended; the tokens are in the frontmatter.

- **State indicator** — the one state grammar. A dot plus a label; see Colors → state mapping. It is the base of the verification badge, order row, trade badge, top-up status, prompt status and moderation status.
- **Explainability banner** — the visual form of a §6 `Decision`.
  - **Parts:**
    - the headline (what happened);
    - the message (the `humanMessage`, naming the fact and the next step);
    - an optional action button (the next step);
    - a "¿Por qué?" disclosure listing the citation inputs in plain language, for example "Pedidas: 2 · Disponibles: 1".
  - **Surface differences:**
    - On R surfaces the disclosure never shows rule ids or codes.
    - On D and H surfaces it also shows `reasonCode` and the rule ids in `code`.
  - **Tones** follow the outcome: notice, inert, refusal or done.
  - **Placement:** directly above the control the decision is about, never as a toast.
- **Field error and error summary** — a field-level message under each failing input, plus one summary banner at the top listing every issue. This mirrors the PRD's aggregate shape-validation stage: all field issues are reported at once, never one per submit.
- **Stale label** — a clock glyph, the words and the date. It is used by CAT card detail, VAL items and valuation-chart points.
- **Price provenance block** — the Plan-1 price-block with a provenance line under each of the three values:
  - "Publicado por Andrés · hoy";
  - "Última transacción de referencia · feed PriceSource · 29 sep 2026";
  - "Cambio 30 días desde $41.000".

  The USD reference sits on its own meta line with its TRM date and is never added into a COP figure.
- **Data table and ledger table** — dense D tables. The ledger shows sign by glyph (`+` / U+2212 `−`), never by colour, with a running balance column and a trigger label per deduction.
- **API explorer panel** — the frame of every H surface. It shows the Decision rendered as a banner, then the raw JSON in `code`. A fixture banner keeps developers from mistaking seeded data for production.
- **State-machine viewer, race simulator, ingestion console, capability trace** — the H and D instruments of the Advanced modules. Each shows its invariant result as a state indicator plus a sentence, for example "invariante: disponible = 0 ✓".
- **Document viewer** — view-only legal identity and top-up proof, with an audit line. It has no download control.
- **Location picker and distance row explanation** — DSC. There are no map tiles in V1 (PRD out of scope), so the picker offers "Usar mi ubicación", a city list and a radius input.
- **Trade timeline** — the rounds of a negotiation, newest last, with a turn indicator that always names whose turn it is.
- **Message thread and contact composer** — MSG.
  - The composer shows the exact outgoing text in a preview frame before anything leaves TEZG.
  - The thread shows the "not yet verified" notice line on every message from a Pending shop.
- **Binder grid, source badge, prompt card** — COL. Empty pockets are dashed outlines, never placeholder art.
- **Valuation summary and valuation chart** — VAL.
  - The chart is a single ink line; stale stretches are dashed.
  - A "Ver como tabla" toggle is mandatory.
  - The coverage line always states what was not valued.
- **Rating summary, review card, moderation panel** — REP. The author of a hidden review sees a tombstone with the reason; everyone else sees nothing.
- **Skeleton** — static placeholder blocks with no shimmer.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Resolve every module state to one of four classes (confirmed / pending / error / inert) | Invent a per-module colour for a state ("purple for trades") |
| Put the explainability banner directly above the control it explains | Explain a refusal in a toast, a tooltip, or only in a disabled button's title |
| Show the "why" as plain inputs on R surfaces ("Disponibles: 1") | Show `InsufficientQuantity`, `FR-INV-3` or any PascalCase token to a buyer or seller |
| Use `code` for ids, JSON and citations on H and admin D surfaces | Use monospace for prices or on buyer surfaces |
| Sign ledger amounts with `+` and U+2212 `−` | Colour debits red or credits green as the only signal |
| Keep USD on its own line with "TRM al <fecha>" | Add a USD reference into a COP total, or show USD without its TRM date |
| Dash stale chart segments and label them | Drop stale points or interpolate over gaps silently |
| Label paused listings in words ("pausada") with an inert ring | Grey a paused listing out so it looks deleted — it stays visible and editable |
| Tombstone hidden content for its author only, with the reason | Delete hidden content from the author's own view without saying why |
| Pair every chart with a data table | Ship a chart as the only representation of a value series |
