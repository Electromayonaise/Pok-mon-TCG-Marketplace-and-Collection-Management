---
name: TEZG — Plan-2 Module Experience
description: Behavioural spine for the 12 Plan-2 modules — information architecture across responsive, back-office and developer-console surfaces; the explainable-decision pattern; Loading/Empty/Error/Success states; es-CO microcopy; WCAG 2.2 AA; and the five cross-module journeys.
status: final
sources:
  - docs/plan-2/planning/prd.md
  - docs/plan-2/planning/addendum.md
  - docs/plan-2/ux/DESIGN.md
  - docs/plan-1-buyer-track/EXPERIENCE.md
  - docs/plan-1-seller-track/EXPERIENCE.md
updated: 2026-09-27
reviewed: docs/plan-2/reviews/review-ux-edge-cases.md
---

# TEZG — Plan-2 Module Experience

DESIGN.md owns how things look; this file owns how they behave. Tokens are referenced as `{path.token}`. Where a page spec in `C-UX-Scenarios/` conflicts with this file or with DESIGN.md, **the spines win**. Mock-ups and wireframes (`wireframes/`) are illustrative only.

## Foundation

- **Product:** one responsive web app. There is no native app, no offline mode and no device APIs beyond the file input and optional browser geolocation, as in Plan-1.
- **UI system:** none. The components are the ones in DESIGN.md, built on semantic HTML (native `<select>`, `<dialog>`, `<details>`, `<input type=file>`).
- **Locale:** es-CO, with times in `America/Bogota` (PRD §6, NFR-SYS-4).

### Form factors

Choices are made per task shape, following the Annex defaults. A per-surface override is a logged decision; see the table below.

| # | Module | Default | Surfaces (spec folder) |
| --- | --- | --- | --- |
| 01 | IDN | H + D | 1.1 Capability API Explorer (H) · 1.2 Individual-Seller Profile Step (**R, override UX-D-6**) · 1.3 Account Capability Inspector (D) |
| 02 | CAT | R (+ D) | 2.1 Catalog Browse & Filter (R) · 2.2 Card Detail & Price Provenance (R) · 2.3 Feed Ingestion Console (D, admin) |
| 03 | DSC | R | 3.1 Nearby Listings (R) · 3.2 Discovery Explanation Inspector (**H, override UX-D-6**) |
| 04 | INV | H + R | 4.1 Create Listing & Bundle (R) · 4.2 My Listings (R) · 4.3 Inventory Console & Race Simulator (H) |
| 05 | VER | D + R | 5.1 Business Application Form (R) · 5.2 Application Status (R) · 5.3 Admin Review Queue (D) · 5.4 Legal-Identity Access Audit (D) · 5.5 Rejection-Reason Policy (D) |
| 06 | ORD | R (buyer) + D (business) | 6.1 Purchase & Payment Instructions (R) · 6.2 Buyer Order Detail (R) · 6.3 Business Order Desk (D) · 6.4 Order Timeline Simulator (**H, override UX-D-6**) |
| 07 | COM | D + R + H | 7.1 Balance & Top-Up (R) · 7.2 Commission Ledger (D, business + admin variants) · 7.3 Admin Top-Up Queue (D) · 7.4 Rate Settings & Reconciliation (D) · 7.5 Concurrent-Deduction Simulator (H) |
| 08 | TRD | R | 8.1 Make an Offer (R) · 8.2 Trade Negotiation Timeline (R) · 8.3 My Trades (R) · 8.4 Trade State Viewer (**H, override UX-D-6**) |
| 09 | COL | R | 9.1 Collections & Binder (R) · 9.2 Add Entry (R) · 9.3 Wishlist (R) · 9.4 Post-Purchase Prompts (R) |
| 10 | VAL | R | 10.1 Collection Value (R) · 10.2 Value History (R) · 10.3 Valuation Lab (**H, override UX-D-6**) |
| 11 | REP | R + D | 11.1 Write a Review (R) · 11.2 Seller Reputation Profile (R) · 11.3 Moderation Queue (D) · 11.4 Moderation Audit (D) |
| 12 | MSG | H + R | 12.1 Contact Seller Composer (R) · 12.2 Inbox & Thread (R) · 12.3 Messaging API Explorer (H) |

**Override UX-D-6.** The Annex asks for a standalone prototype per module (a simulator, inspector or lab), even for R modules. Those prototypes are H surfaces added *beside* the R product pages; they do not change the module's default. In the other direction, IDN's profile step is an end-user form and therefore R, although IDN defaults to H + D.

**H surfaces never ship to production users (UX-D-5).** They run only in `development`/`test` builds against fixtures and the virtual clock, and they always show the banner "Consola de desarrollo · datos de prueba". D surfaces are production admin tools gated by `isAdmin` (`AdminOnly`). R surfaces are the product.

## Information Architecture

### Three roots

**R — the app.** Mobile uses a bottom bar of 5 items; ≥1024 px uses a top bar.

| Root | Contains |
| --- | --- |
| **Catálogo** | 2.1 → 2.2 (with the DSC listings block) → 6.1 / 12.1 / 8.1 |
| **Cerca de ti** | 3.1 |
| **Mi colección** | 9.1 (tabs: Colecciones · Lista de deseos 9.3 · Valor 10.1) → 9.2, 10.2 |
| **Actividad** | Pedidos (6.2 list, inherited Plan-1 4.1) · Intercambios 8.3 · Mensajes 12.2 · Sugerencias 9.4. An unread/pending count shows per tab |
| **Cuenta** | Perfil · Vender (1.2 profile step, 4.1, 4.2, 7.1 for businesses, 5.2 application status) · Reseñas 11.2 (own profile) |

**D — the admin panel `/admin`.** A left rail with, in order:

1. Solicitudes 5.3
2. Recargas 7.3
3. Pedidos (business order desk 6.3 is the business's own D surface, not admin; the admin gets the FR-ORD-10 audited lookup inside 1.3)
4. Moderación 11.3
5. Catálogo 2.3 (carries a marker when the hourly tick is silent; ARCHITECTURE §4)
6. Comisiones 7.2 admin · 7.4
7. Cuentas 1.3
8. Auditoría 11.4 · 5.4
9. Políticas 5.5
10. Entregas fallidas → 2.3, Entregas tab (NFR-SYS-6 badge: count of failed deliveries plus the age of the oldest by first failure, `firstFailedAt`, and count of deliveries stuck `pending` for more than 24 h; read through `admin.events.deliveryHealth()`)

**Business D — the shop desk.** A verified or Pending business reaches its desk from Cuenta → Mi tienda. It has four sections:

- Pedidos 6.3
- Saldo 7.1
- Movimientos 7.2
- Publicaciones 4.2

The desk is desktop-first (Plan-1 seller-track precedent: Andrés works at the shop counter). At <1024 px it falls back to the same stacked list pattern as other D tables.

**H — the developer consoles `/dev/<module>`.** They appear only in non-production builds and have one index page linking the ten consoles (1.1, 3.2, 4.3, 6.4, 7.5, 8.4, 10.3, 12.3, plus 2.3's fault switch and 5.4's denial prober when running on fixtures).

### Surface ↔ scenario map

The full matrix is in `C-UX-Scenarios/00-ux-scenarios.md`. Every surface has at least one scenario that lands on it, and every Annex scenario lands on at least one surface.

### Navigation & resilience

- **Deep links are stable** for every R and D detail surface (`/c/<catalogEntryId>`, `/pedidos/<orderId>`, `/intercambios/<offerId>`, `/mensajes/<conversationId>`, `/admin/solicitudes/<applicationId>`).
  - A deep link the caller may not see (`OrderNotVisibleToCaller`, `TradeOfferNotVisibleToCaller`, `ConversationNotVisibleToCaller`, `ListingNotFound`) renders a full-page **Not available** state: "No encontramos este pedido en tu cuenta." plus a link to the parent list.
  - It never renders a partial page, and it never distinguishes "doesn't exist" from "not yours". This avoids leaking existence.
- **Unauthenticated deep link:** redirect to sign-in, then return to the same URL.
- **Admin surface opened by a non-admin:** the same Not available page. No "access denied" copy (ADD-§1.2).
- **Back always returns to the list with its filters, sort and page intact.** Filters are kept in the URL query string, so a list is a shareable, reload-safe state.
- **Stale tab / lost race.** Every command is conditional server-side (ADD-§4).
  - When a command loses (`ApplicationNotPending`, `TopUpNotPending`, `TradeOfferNotOpen`, `PromptAlreadyResolved`, `OrderAlreadyConfirmedByRole`), the surface does not show an error page. It **re-fetches** and shows the current state, with an explainability banner saying what happened and who did it. Example: "Sebastián ya aprobó esta solicitud el 8 oct 2026, 11:34 a. m. La vista se actualizó con la decisión."
  - The form content the person typed is kept where it still applies.

## Voice and Tone

Brand voice is set in DESIGN.md → Brand & Style. This section covers microcopy.

- **Language:** es-CO. English strings in the PRD are illustrative; the es-CO strings in the page specs and in `microcopy-es-CO.md` are the source for implementation.
- **Address:**
  - *tú* in buyer and seller flows, including Andrés when he is selling (4.x, 6.3, 7.1, 7.2);
  - *usted* in the admin panel (all D admin surfaces);
  - *usted* in business-verification messages to applicants (5.1, 5.2, and VER decision refusals such as `SellerNotVerified`). Listing-state labels on 4.2 stay *tú*, even when VER caused them (unverified, withdrawn), because they belong to the selling flow.
  - Andrés therefore reads *usted* about his application and *tú* about his sales. This follows the addendum (ADD-§1.1) and was confirmed at the Phase 2 gate.
- **Every refusal names the fact and the next step.** Pattern: *what happened* + *because of what* + *what you can do now*. Example: "Esta publicación ya no tiene unidades: otra persona reservó la última hace un momento. Puedes buscar otra publicación de esta carta."
- **Never:**
  - the ADD-§1.2 forbidden phrases;
  - any PascalCase code, field name or table name on R surfaces;
  - "error" as a noun in a headline for a normal business outcome (paused, pending, stale and unverified are states, not errors).
- **Names, not roles.** Say "Andrés confirmó que recibió tu pago" and "Esperando a que Julián confirme", never "el vendedor" when the name is known.
- **Formats** (ADD-§2.7, §1.1):

  | Item | Format |
  | --- | --- |
  | COP | "$45.000", or "$45.000 COP" wherever USD is also on screen and in every outgoing message |
  | Negative COP | "−$2.200" (U+2212) |
  | USD | "US$12,34 · TRM al 29 sep 2026" |
  | Percent | "+12,50 %" / "−3,20 %" / "0,00 %" |
  | Distance | "4,9 km" |
  | Absolute date | "29 sep 2026, 3:00 p. m." |
  | Relative date | "hace 2 horas", in lists only, with the absolute date in the element's accessible name and `title` |

- **Registry.** Every `humanMessage` template for R and D surfaces lives in `microcopy-es-CO.md`, keyed by code. The code is the key, never the text. The NFR-SYS-1 CI check runs over that file.

## Component Patterns

These are behavioural rules. Visual specs are in DESIGN.md → Components.

- **`{components.explainability-banner}`** — the §6 Decision made visible.
  - It renders **directly above the control the decision is about**: above the Buy button, above the composer, or above a listing's row actions.
  - It is announced through a polite live region; it uses an assertive one only for a refusal that follows the person's own action.
  - The "¿Por qué?" disclosure is closed by default and toggles with Enter/Space.
    - On R surfaces it lists the citation *inputs* in words ("Unidades pedidas: 2 · Unidades disponibles: 1").
    - On D and H surfaces it adds the `reasonCode` and rule ids in `{typography.code}`.
  - It never contains a regulated value (legal identity, phone, comprobante key, message body; NFR-SYS-2).
  - It offers at most one action button, and that button *is* the next step.
- **Primary action discipline** (Plan-1 rule, extended): one `{components.button-primary}` per screen region. When the domain says the action is unavailable, the button is **replaced by the banner**, not disabled with no reason.
  - A disabled primary is used only while the button's own request is in flight. It shows a spinner after 300 ms and prevents double-submission.
- **Forms:**
  - Validation runs on submit, then live per field after the first submit.
  - Server shape errors arrive **aggregated** (`RequestValidationFailed` / `MissingRequiredField`, one issue per field). The UI shows them all at once: the error summary banner at the top, each item an in-page link to its field, plus `{components.field-error}` under each field. Focus moves to the summary.
  - A domain refusal (first-fail) arrives as one banner above the submit button. Field values are preserved.
  - Character counters appear on every bounded text field (note ≤300, body ≤2.000, title ≤120, moderation note ≤500), are announced at 90 % and 100 %, and never block typing silently.
- **Uploads** (comprobante, legal documents, top-up proof) reuse the Plan-1 five-state dropzone: idle → selected → uploading → uploaded → error. Rules:
  - accepted types `image/jpeg, image/png, application/pdf`, ≤5 MB, checked client-side for speed and server-side for truth (sniffed type);
  - replace is allowed until the locking action (ORD: until "Ya pagué"; COM: until the admin decides).
- **Copy to clipboard** (payment details, handoff summary, contact text):
  - a `{components.button-secondary}` "Copiar";
  - on success, the text "Copiado" appears for 3 s in a live region;
  - on failure (clipboard API denied), the text is selected in a read-only field with "Selecciona y copia el texto".
- **External link hand-off** (WhatsApp): opens in a new tab with `rel="noopener noreferrer"`, and the label says where it goes ("Abrir WhatsApp"). TEZG never calls the external app. The copyable text is always offered beside the link.
- **Admin tables (`{components.data-table}`)**, used by queues, the ledger and audit:
  - server-side pagination (queues 25/page, audit 50/page);
  - sort by column header button with `aria-sort`;
  - filters above the table, reflected in the URL;
  - row click or Enter opens the detail panel; Esc closes it and returns focus to the row.
- **Destructive admin actions** (reject, hide, reject top-up) open a native `<dialog>` that restates the target and the consequence in words, with the reason select and note:
  - "Ocultar la reseña de Coleccionista 231 sobre Valentina. Dejará de contar en su calificación de inmediato. La autora o el autor verá el motivo."
  - Confirm is `{components.button-destructive}`, and Esc cancels.
- **H consoles (`{components.api-explorer-panel}`)**:
  - The request is editable JSON with a "Plantillas" select of the module's scenario fixtures (one per Annex scenario and edge case).
  - "Ejecutar" sends the request. The response shows the Decision banner first, then the raw JSON, then the state-machine view or invariant check.
  - An actor switcher (the session fixture: Valentina, Andrés, Camila, Julián, Sebastián, anonymous) is always visible.
  - A virtual-clock control ("Avanzar reloj: +1 h / +48 h / +7 d / fecha exacta") exists wherever a rule is time-dependent.

## State Patterns

Every R and D surface specifies **Loading, Empty, Error and Success**, plus the domain states below. The page specs list them per surface.

| State | Behaviour |
| --- | --- |
| **Loading** | Static `{components.skeleton}` matching the final layout; no layout shift on resolve. Shown only after 300 ms, to avoid flicker; `aria-busy="true"` on the region. Lists show skeleton rows equal to the page size, capped at 6 on mobile. |
| **Empty** | `{components.empty-state}`: one factual sentence plus the next step as a button or link. Distinct from **Zero results** (filters matched nothing), which offers "Quitar filtros" and lists the active filters. |
| **Error (transport/system)** | The request did not complete: network, timeout or 5xx. An inline banner, tone refusal: "No pudimos cargar tus pedidos porque se perdió la conexión. Revisa tu conexión y vuelve a intentarlo." with a "Reintentar" button. Never a bare "Intenta más tarde". Commands are safe to retry because they are idempotent or conditional server-side. |
| **Refusal (domain decision)** | Not an error state. The explainability banner, with the tone set by the Decision's `outcome`; the page stays usable. |
| **Success** | For commands, the page re-renders in its new state (state indicator changes, timeline gains a row), plus a short live-region confirmation ("Enviaste tu oferta a Valentina"). No success toasts, no confetti. |
| **Not available** | Deep link to something the caller can't see; see IA → Navigation & resilience. |

### Outcome → banner mapping (PRD §6)

| `outcome` | Banner tone | Typical surfaces | Primary action offered |
| --- | --- | --- | --- |
| `allowed` | none (or *done* when a confirmation is needed) | 7.1 top-up sent, 5.1 application sent | — |
| `allowedWithNotice` | notice | 12.2 composer to a Pending shop | Enviar (the action proceeds) |
| `rejected` | refusal | any command | the next step named in the message |
| `paused` | inert | 2.2, 3.1, listing detail, 4.2 | owner: "Recargar saldo"; buyer: none |
| `unverified` | notice | 2.2, 3.1, 4.2 | owner: "Ver estado de la solicitud" |
| `withdrawn` | inert | 4.2 (owner only) | "Ver estado de la solicitud" |
| `hidden` | inert | 4.2 / 11.2 (author only) | none; the reason is shown |
| `stale` | notice | 2.2, 10.1, 10.2 | none |
| `excluded` | notice | 3.1 footer ("3 publicaciones sin ubicación válida no aparecen") | none |
| `ranked` | no banner; the per-row explanation line (`{components.distance-row-explanation}`) | 3.1 | — |
| `notValued` | notice | 10.1 "No valoradas" list | none |
| `unfulfillable` | inert | 8.2, 8.3 for the proposer | "Buscar otra publicación de esta carta" |

### Freshness

- **Polling.** Screens that show another party's actions poll every **30 s** while visible and pause when the tab is hidden: order detail (6.2 / 6.3), trade timeline (8.2), thread and inbox (12.2), and admin queues (5.3, 7.3). They refetch immediately on focus.
  - A change arriving by poll is announced politely ("Andrés confirmó que recibió tu pago").
  - Target: visible ≤ 35 s after the other party acts (PRD FR-MSG-7 freshness, applied to all).
- **No push, no email** (PRD out of scope). Unread and pending counts on the Actividad tabs are the only notification surface.

### Concurrency losers, as seen by a person

| Race | Loser sees |
| --- | --- |
| Last unit, two buyers (INV/ORD) | Banner on 6.1: "Otra persona reservó la última unidad hace un momento. Esta publicación ya no tiene unidades disponibles." + "Buscar otra publicación de esta carta" |
| Two accepts, two tabs (TRD) | Tab 2: "Ya aceptaste la oferta de Julián en otra pestaña, así que esta no puede continuar." The losing offer shows as *No disponible* to its proposer |
| Two admins, one application (VER) | "Sebastián ya rechazó esta solicitud el {fecha}. La vista se actualizó con la decisión." The detail panel re-renders read-only |
| Paid vs expiry (ORD) | "Este pedido venció antes de que confirmaras el pago: pasaron 48 horas. Si ya transferiste, escríbele a Andrés; aquí tienes sus datos." + support link |
| Prompt accepted twice (COL) | The second tab re-renders as "Ya agregaste esta carta a «Mi primera colección»" |

## Interaction Primitives

- Touch targets are ≥ 44 × 44 px on R; D controls are ≥ 32 px high with ≥ 24 px target spacing (WCAG 2.2 SC 2.5.8).
- **No modal for a critical step on R.**
  - Purchase, comprobante, trade accept and review are full pages or inline sections.
  - `<dialog>` is used only for confirmations of destructive or irreversible actions: cancel an order, cancel a trade, delete a collection, and admin reject/hide.
- **Irreversible actions are confirmed once, never twice.** The confirmation restates the consequence in words ("Se eliminará «Promos 2024» y sus 23 cartas. Esto no se puede deshacer.").
- **Feedback:**
  - within 100 ms, a pressed state;
  - at 300 ms, a spinner in the button;
  - at 10 s, the in-button text "Sigue en proceso…".
  - Nothing auto-retries a command.
- **Drag to reorder** (binder manual mode, 9.1) always has a keyboard and button equivalent: select a pocket, then "Mover antes / después", or arrow keys with Space to pick up and drop, with live-region narration ("Charizard ex movida a la posición 5 de 9").
- **Time-bounded states show their deadline as an absolute time:**
  - "Paga antes del 14 oct 2026, 4:20 p. m.";
  - "La oferta vence el 3 oct";
  - "Puede volver a solicitar desde el 8 oct 2026, 10:00 a. m.".

  Countdown timers are not used; they are anxiety-inducing and not screen-reader friendly.

## Accessibility Floor

Target: **WCAG 2.2 AA** on all R and D surfaces (NFR-SYS-11; satisfies the task statement's 2.1 AA). H consoles meet the same keyboard and contrast rules, but are not audited as product surfaces.

- **Status is never colour alone.** Every `{components.state-indicator}` has a text label. Trend has glyph plus sign plus colour. Ledger debits have the `−` glyph. Stale has words plus date. Chart stale segments are dashed and also listed in the table view.
- **Contrast:** text uses only `ink-primary`, `ink-secondary`, `accent`, `status-error` or `surface-raised`-on-`accent`. `status-pending` and `ink-disabled` are graphics only (DESIGN.md → Colors).
- **Focus:** a visible `{components.focus-ring}` on every focusable element, never obscured by sticky headers (SC 2.4.11), with a logical order that follows the visual order. After a route change, focus moves to the `<h1>`. After a refusal, focus moves to the banner's headline only when the refusal follows the person's own submit.
- **Live regions:**
  - one polite region per page for poll updates and success confirmations;
  - one assertive region for refusals of the person's own action;
  - never both for the same message.
- **Forms:**
  - Every input has a visible `<label>`.
  - Constraints are stated before input ("Entre $20.000 y $10.000.000").
  - Errors are tied to fields with `aria-describedby`.
  - Consent checkboxes are never pre-checked (Ley 1581; VER, IDN phone consent).
- **Tables** use `<th scope>`; numeric columns are right-aligned with tabular numbers, and sort state is exposed.
- **Charts** (10.2): the SVG has `role="img"` with a summary sentence ("Valor entre el 1 sep y el 1 oct 2026: de $1.240.000 a $1.310.500, +5,69 %"), and the "Ver como tabla" toggle exposes the full series.
- **Binder:** each pocket is a list item with an accessible name ("Posición 5: Pikachu, Escarlata y Púrpura 151 #025, agregada a mano") and an empty pocket reads "Posición 6: vacía".
- **Motion:** none required. Skeletons are static, and `prefers-reduced-motion` is respected everywhere by construction.
- **Zoom and reflow:** usable at 200 % zoom and 320 CSS px width (SC 1.4.10) on R. D tables reflow to stacked rows below 1024 px.
- **Timeouts:** no session-bound form loses input. The legal-identity signed URL (10 min) regenerates on demand with "Volver a abrir el documento".

## Key Flows

The PRD §2.2 journeys, walked across surfaces. Each has one **climax beat**, the moment the design exists for.

### UJ-1 — Camila buys a card from Andrés (DSC → CAT → ORD → COM → COL → REP)

1. **3.1 Cerca de ti.** Camila picks "Medellín" and sets 15 km. Andrés's listing row reads "4,2 km · tienda verificada · se puede comprar".
2. **2.2 Card detail.** She sees three labelled prices, each with its provenance line, and a listings block showing the top 5 plus "12 más".
3. **6.1 Purchase.** "Comprar" reserves the unit and shows Andrés's payment details and "Paga antes del 14 oct 2026, 4:20 p. m.".
4. **6.2 Order detail.** She pays in her bank app, uploads the comprobante and taps "Ya pagué". The row shows Pagado with a pending dot.
5. **6.3 Business desk (Andrés).** He opens the comprobante viewer and confirms "Recibí el pago". Commission is deducted once (COM, invisible to Camila).
6. **6.2.** The card arrives. Camila taps "Ya recibí la carta" and the order closes.
7. **Climax:** **9.4 / inline prompt** — "¿Agregar Charizard ex a tu colección?". She picks "Mi primera colección". A link, "Ahora puedes reseñar a Tienda Andrés", appears on the closed order.
8. **11.1 Review.** She submits 5 stars. The profile (11.2) shows "4,3 · 13 reseñas · De compras verificadas".

### UJ-2 — Valentina lists and trades to Julián (IDN → INV → TRD → MSG)

1. **4.1 Create listing.** Her first attempt shows a banner: "Antes de publicar, completa tu perfil de vendedor." plus the action "Completar perfil".
2. **1.2 Profile step.** She enters her display name, phone (+57 3…), phone consent and meeting point, and returns to 4.1 with her draft intact.
3. **4.1.** She publishes with "Abierta a intercambios" on.
4. **8.1 Julián's offer.** Julián offers his Pikachu ex (NM) plus $20.000.
5. **8.2 Timeline.** Valentina counters by removing the cash and asking for a second card. Julián sees "Te toca responder" and accepts.
6. **Climax:** **8.2 acceptance.**
   - The page shows "Intercambio aceptado · la carta queda reservada para ti".
   - Julián gets "Abrir WhatsApp" with the pre-filled summary.
   - Valentina gets a copyable summary and Julián's name.
   - The other proposer on that listing sees "Valentina aceptó otra oferta por esta carta, así que esta no puede continuar."
7. **8.2 Confirmation.** Each confirms "Ya hicimos el intercambio". After the first confirmation the page reads "Esperando a que Julián confirme"; after the second, "Completado".

### UJ-3 — Andrés becomes verified, after a first rejection (VER → INV → MSG → COM)

1. **5.1 Application.** He enters the shop name, NIT (validated live with its check digit), documents, Instagram, city, payment instructions and consent, then taps "Enviar solicitud".
2. **5.2 Status.** "Estamos revisando su tienda" with the ADD-§1.3 Pending copy.
3. **4.2 My listings.** Each listing carries a notice banner: "Sin insignia de verificación · aún no se puede comprar".
4. **12.2.** A buyer's message arrives. Andrés's replies carry the "aún no verificada" notice line.
5. **5.3 (Sebastián).** He rejects with `DataMismatch`.
6. **5.2 Rejection.**
   - The page reads "No pudimos verificar su tienda · Los datos que ingresó no coinciden con sus documentos. … Puede volver a solicitar desde el 8 oct 2026, 10:00 a. m."
   - On 4.2, the listings read *Retirada* with an inert ring. They are view only and none were deleted.
7. **5.1 again** after the cooldown. The date gate is enforced in the button and banner, not hidden.
8. **Climax:** **5.2 approved + 4.2 restored.**
   - The page reads "Su tienda está verificada".
   - The same listings are back with the badge, still paused (inert): "Recarga tu saldo para empezar a vender" and the action "Recargar saldo".
9. **7.1 Top-up.** He sends $50.000 with his transfer reference and proof. The status is "Estamos revisando tu transferencia". Sebastián confirms on 7.3, the balance shows $50.000, and the listings read "se puede comprar".

### UJ-4 — Sebastián runs the platform for a day (CAT → VER → COM → REP → IDN)

1. **2.3 Ingestion console.** The nightly run shows "Insertadas 0 · Actualizadas 42 · Sin cambios 9.908 · En cuarentena 50" and the quarantine table grouped by defect kind.
2. **5.3 Queue**, oldest first. He decides 3 applications.
3. **5.5 Policies.** He changes the `ExternalPresenceUnverifiable` cooldown from 14 to 10 days, with a note: "Aplica a rechazos futuros".
4. **7.3 Top-ups.** He confirms 2 top-ups after checking each reference against the proof in the document viewer.
5. **11.3 Moderation.** He hides a review (Acoso) and a listing (Falsificación). Each dialog restates the consequence.
6. **Climax:** **1.3 Account inspector.** A support question: "why can't this account sell?".
   - The capability trace answers "Puede vender: no · Motivo: tiene una solicitud de tienda rechazada, y no puede volver a solicitar hasta el 8 oct 2026, 10:00 a. m.", citing the facts.
   - The read itself is logged in the audit.

### UJ-5 — Valentina checks what her collection is worth (COL → VAL → CAT)

1. **9.1 Binder** «Kanto 151» (120 entries), 3×3, sorted by set then Pokémon, with the footer "Página 2 de 14". Filtered to the set 151, the footer adds the completion "37/191 (19 %)".
2. **Climax:** **10.1 Collection value.**
   - The page shows "$1.310.500" and "▲ +5,69 % en 30 días (desde $1.240.000)".
   - The coverage line reads "Valoradas 118 de 120 · 1 con precio desactualizado".
   - The "No valoradas (2)" list shows both promos: "Agregada por enlace: no tiene precio de catálogo".
   - The stale card shows "◷ Precio del 29 sep 2026: el feed no se actualiza desde entonces" (the page is read on 1 oct 2026, the seed clock).
3. **10.2 History.** The line has a dashed stretch where the stale price was carried, and "Ver como tabla" shows the same series.

## Responsive & Platform

- **Breakpoints** are inherited from Plan-1: base (mobile) → ≥768 px → ≥1024 px, plus ≥1280 px for D detail panels.
- **R surfaces:**
  - single column on mobile;
  - catalog and results grids go to 2 columns at ≥768 px and 3 at ≥1024 px;
  - the binder follows the chosen layout (1–5 columns), and on mobile ≥4 columns degrades to a horizontally *paged* (not scrolled) view with the same page contents;
  - reading measure is ~640 px.
- **D surfaces:** a minimum of 1024 px for the optimised layout; a stacked fallback below (see Layout & Spacing in DESIGN.md).
- **H surfaces:** two panes at ≥1024 px, stacked below.
- **Browsers:** the last two versions of Chrome, Safari (iOS and macOS), Firefox and Edge; Android Chrome is the primary mobile target (Colombian market share).
- **Performance budget:** skeleton within 300 ms; queries within NFR-SYS-9 (p95 ≤ 1.000 ms).

## Messaging Safety (review F-29, evaluated)

**Situation.** A buyer who wrote once to a shop can receive unlimited replies, including from a Pending (unverified) shop. There is no report or block, and messages are out of moderation scope (FR-MSG-7).

**Mitigations already in the spec:**

- businesses can't initiate (`BusinessCannotInitiate`);
- there are no push or email notifications;
- a Rejected shop's thread becomes read-only;
- the Pending notice is shown on every message.

**Residual harm.** An unwanted unread badge and unwanted text in a thread the buyer started.

**Adopted at the Phase 2 gate: "Silenciar conversación" (FR-MSG-8).** A buyer-side, per-conversation toggle in 12.2's thread menu:

- **Effect:**
  - new messages still arrive but no longer count toward the unread badge;
  - the thread moves to a "Silenciadas" filter;
  - the business is not told.
- **Reversible:** "Dejar de silenciar".
- **Cost:** one per-participant timestamp (`mutedAt`), specified in PRD FR-MSG-8.
- **Why:** it closes most of F-29's harm without moderation tooling. True blocking and reporting stay deferred with the SPEC non-goal.

## Open Items

- **F-29 mute.** Adopted at the Phase 2 gate as FR-MSG-8 (see above).
- **[ASSUMPTION] Exclusivity copy.** The refusal copy for a business application from an individual seller says a shop needs a separate account (microcopy key `IndividualSellerProfileAlreadyComplete@VER`). Converting an account between seller kinds is out of scope (PRD IDN). Confirmed at the Phase 2 gate.
- **Address.** The *usted*/*tú* split for Andrés follows ADD-§1.1; confirmed at the Phase 2 gate.
