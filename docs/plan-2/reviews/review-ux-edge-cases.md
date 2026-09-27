---
title: Edge-case review — Plan-2 UX package
reviewed: docs/plan-2/ux/ (DESIGN.md, EXPERIENCE.md, microcopy-es-CO.md, C-UX-Scenarios/ — 00 index, 48 scenarios, 43 page specs — and wireframes/)
skill: bmad-review-edge-case-hunter
date: 2026-09-27
status: triaged — adopted in full at the Phase 2 gate (2026-09-27)
---

# Edge-case review — Plan-2 UX package

**Scope.** Every file under `docs/plan-2/ux/`:
- the two spines;
- the microcopy registry;
- the scenario index;
- 48 scenarios and 43 page specs;
- the two drawn wireframes.

The whole package is the scope, not a diff, so there is no deletion check (skill Step 4).

**Method.** The skill walks every branching path and reports only the paths that have no handling. For a UX package, a "path" is:
- a state (Loading, Empty, Error, Success, and the domain states);
- a refusal code;
- a race;
- an input boundary;
- an entry point and an exit point;
- a value named in a scenario that another file must agree with.

**How to read this file.**
- The findings keep the skill's four fields: `location`, `trigger_condition`, `guard_snippet` and `potential_consequence`. The skill assigns no severity, so this file adds none.
- The **Triage** column is the reviewer's recommendation for the Phase 2 gate. It is not a decision until the team confirms it.
  - **Accept**: the fix is already applied, at the location given.
  - **Defer**: the finding is real, and a named owner and phase will handle it. Where the spec needed a stopgap, it carries an `[ASSUMPTION]`.
  - **Reject**: the path is in fact handled; the citation shows where.
- Locations are line numbers **after** the fix. For findings fixed in earlier passes, the location is where the fix now lives.

**Counts.** 53 findings: 30 Accept · 14 Defer · 9 Reject. Three Accepts (EC-07, EC-11 and EC-14) also defer one part to Phase 3.

---

## 1. State coverage

EXPERIENCE.md:175 requires every R and D surface to specify Loading, Empty, Error and Success. The H consoles are exempt.

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-01 | ux/C-UX-Scenarios/01-idn-access-manager/1.2-individual-seller-profile-step/1.2-individual-seller-profile-step.md:158 | R form page has no Empty row in its state table | `\| Empty \| Not applicable \| no list; blank form is the default \|` | A reader cannot tell whether Empty was forgotten or is impossible | **Accept**: an Empty row reading "Not applicable", with the reason |
| EC-02 | ux/C-UX-Scenarios/05-ver-business-verification/5.1-business-application-form/5.1-business-application-form.md:167 | R form page has no Empty row in its state table | same as EC-01 | Same as EC-01 | **Accept**: same fix as EC-01 |
| EC-03 | ux/C-UX-Scenarios/06-ord-order-comprobante/6.1-purchase-payment-instructions/6.1-purchase-payment-instructions.md:154 | Single-listing page has no Empty row | `\| Empty \| Not applicable \| one listing, or a refusal \|` | Same as EC-01 | **Accept**: "Not applicable" row. The page renders one listing, or a refusal when the listing no longer resolves |
| EC-04 | ux/C-UX-Scenarios/07-com-commission-balance/7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md:156 | No commission account exists yet (no shop approved) | `if accounts.length === 0 render empty-state; reconcile reports 0/0` | The reconciliation panel renders a blank table, or an error | **Accept**: a real Empty state, with copy in microcopy §5 "No commission accounts (7.4)" (microcopy-es-CO.md:185). "Conciliar ahora" still runs and reports "0 cuentas, 0 diferencias" |
| EC-05 | ux/C-UX-Scenarios/08-trd-trading/8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md:223 | Timeline page has no Empty row | `\| Empty \| Not applicable \| an offer has at least one round \|` | Same as EC-01 | **Accept**: "Not applicable" row, with the reason |
| EC-06 | ux/C-UX-Scenarios/12-msg-messaging/12.1-contact-seller-composer/12.1-contact-seller-composer.md:158 | Composer page has no Empty row | `\| Empty \| Not applicable \| message or refusal, no list \|` | Same as EC-01 | **Accept**: "Not applicable" row |
| EC-07 | ux/C-UX-Scenarios/09-col-collections/9.2-add-entry/9.2-add-entry.md:143 | 9.2 opened from the 9.1 empty state, on an account with no collection | `if collections.length === 0 options = ['General (se creará al guardar)']` | The collection select is empty and the first card can never be saved | **Accept**: a single option «General (se creará al guardar)». The first save creates it (FR-COL-1 "created on first use"). Copy is in microcopy-es-CO.md:292. The **route form** without a collection id is **Deferred** to Phase 3 |
| EC-08 | ux/C-UX-Scenarios/09-col-collections/9.2-add-entry/9.2-add-entry.md:146 | `CollectionNotFound` on save, and the deleted collection was the only one | `if remaining.length === 0 offer General fallback` | The select reopens with no options, a dead end | **Accept**: the "Collection gone" row now falls back to «General (se creará al guardar)» |
| EC-09 | ux/C-UX-Scenarios/*/x.3-* and the other H consoles | H pages have no Empty row | — | — | **Reject**: EXPERIENCE.md:175 applies the four-state rule to R and D surfaces only. H consoles are developer tools |

## 2. Races and concurrent actions

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-10 | ux/C-UX-Scenarios/08-trd-trading/8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md:192 | A poll finds the offer withdrawn, expired or unfulfillable while the counter editor is open | `on poll if offer.status !== 'Open' closeEditor(); showEndedBanner()` | The user sends a counter against a dead offer, or the editor silently loses its draft | **Accept**: the editor closes, the draft is discarded because it no longer applies (UX-D-7), the §6 ended banner takes its place and is announced. While the offer stays Open, the draft survives polls |
| EC-11 | ux/C-UX-Scenarios/08-trd-trading/8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md:191 | Counter submitted with terms identical to the current round | `if deepEqual(draft, current) fieldError('No cambiaste nada…')` | An empty round passes the turn back without changing anything; turns can ping-pong until expiry | **Accept** for the UX: a client-side `field-error`, copy in microcopy-es-CO.md:224, tagged [ASSUMPTION]. **Defer** the server-side rule: Phase 3 decides whether FR-TRD-2 refuses an identical counter |
| EC-12 | ux/C-UX-Scenarios/06-ord-order-comprobante/6.2-*/6.2-*.md:186 | The expiry sweep wins against "Ya pagué" | — | — | **Reject**: handled. The "Error — lost race" row re-fetches and shows "Este pedido venció el {fecha}…" |
| EC-13 | ux/C-UX-Scenarios/07-com-commission-balance/7.3-admin-top-up-queue/7.3-admin-top-up-queue.md:127 | Two admins confirm the same top-up | — | — | **Reject**: handled. `TopUpNotPending` closes the dialog and shows the lost-race state |
| EC-14 | ux/C-UX-Scenarios/12-msg-messaging/12.2-inbox-thread/12.2-inbox-thread.md:197 | "Enviar" retried after a lost response | `clientMessageId generated on first press, reused on retry` | Duplicate messages in the thread | **Accept** for the UX: the client reuses the message id it generated on the first press. **Defer** the server dedupe contract to Phase 3 |
| EC-15 | ux/C-UX-Scenarios/11-rep-reputation-moderation/S4-admin-hide-and-audit.md:65-66, ux/EXPERIENCE.md:165 | A hide on Tienda Andrés's review shifts the UJ-1 rating (4,3 · 12 → 13) used by REP-S1 and REP-S3 | `hide example targets a seller outside UJ-1` | The REP scenarios contradict one another on Andrés's rating | **Accept**: the hide example now targets Valentina ("Coleccionista 231", Acoso). The EXPERIENCE.md example and the microcopy registry (microcopy-es-CO.md:361) match |

## 3. Input boundaries and validation

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-16 | ux/C-UX-Scenarios/11-rep-reputation-moderation/11.1-write-a-review/11.1-write-a-review.md:127 | Review text made only of spaces, or with padding around it | `text = text.trim(); if (text === '') text = null` | Blank "reviews" publish, and the counter is off by the padding | **Accept**: leading and trailing spaces are trimmed; a text of only spaces counts as no text |
| EC-17 | ux/C-UX-Scenarios/11-rep-reputation-moderation/S4-admin-hide-and-audit.md:114 | "Otro" reason with a note under 10 characters | `keep dialog open; inline error; button never disabled` | The earlier wording disabled the button, which EXPERIENCE forbids and which hides the reason | **Accept**: inline validation "Escriba una nota de al menos 10 caracteres para «Otro»."; the button stays enabled |
| EC-18 | ux/C-UX-Scenarios/12-msg-messaging/12.3-messaging-api-explorer/12.3-messaging-api-explorer.md:121 | Maximal trade handoff: 10 items × 200-character names plus cash | `assert url.length <= 2000; shorten longest first, min 20 graphemes` | The fixture claimed a collapse that its own numbers never reach | **Accept**: the claim is corrected. Shortening alone fits, so no item collapses. The emoji-name fixture (S1-contact-individual-seller.md:108) checks graphemes |
| EC-19 | ux/C-UX-Scenarios/01-idn-access-manager/1.2-individual-seller-profile-step/1.2-individual-seller-profile-step.md:115 | Display name with emoji or combining marks | `length counted in graphemes` | Emoji names are refused or cut in the middle of a character | **Accept**: validation counts graphemes (emoji = 1) |
| EC-20 | ux/C-UX-Scenarios/06-ord-order-comprobante/6.2-*/6.2-*.md:128 | Comprobante of the wrong type, or over 5 MB | — | — | **Reject**: handled. JPEG/PNG/PDF, at most 5 MB, a server-side content-signature check, and the `ComprobanteInvalidFile` copy |
| EC-21 | ux/C-UX-Scenarios/03-dsc-location-discovery/3.1-nearby-listings/3.1-nearby-listings.md:28 | Listing exactly at the radius boundary | — | — | **Reject**: handled. "The boundary is inclusive" |
| EC-22 | ux/C-UX-Scenarios/03-dsc-location-discovery/3.1-nearby-listings/3.1-nearby-listings.md:121 | Browser geolocation denied | — | — | **Reject**: handled. City picker, no dead end |
| EC-23 | ux/C-UX-Scenarios/10-val-valuation/* | Per-item values rounded, then the total drifts from their sum | — | — | **Reject**: prd.md:1918 makes `totalCop` an exact integer sum of integer terms, equal by construction |
| EC-24 | ux/C-UX-Scenarios/06-ord-order-comprobante/S1-purchase-and-reserve.md:106; ux/C-UX-Scenarios/08-trd-trading/8.1-make-an-offer/8.1-make-an-offer.md:163 | Seller buys or offers on their own listing | — | — | **Reject**: handled. `SelfPurchaseNotAllowed` and `SelfTradeNotAllowed` banners, with a next step |

## 4. Entry and exit points

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-25 | ux/C-UX-Scenarios/03-dsc-location-discovery/S4-moderation-exclusion.md (Scenario Steps) | A step link targets a page folder instead of its spec file | `[`x.y-page/`](x.y-page/x.y-page.md)` | A dead or directory link; the 00 coverage matrix misses the page | **Accept**: the link targets the spec file. gen00.py now asserts that every scenario links at least one page file |
| EC-26 | ux/C-UX-Scenarios/07-com-commission-balance/7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md:36 | Exit to 11.4 for rate-change audit rows | `no exit; rate history names actor and time` | The admin lands on a moderation log that never contains rate changes | **Accept**: no such exit. 11.4 covers moderation only (FR-REP-6) |
| EC-27 | ux/C-UX-Scenarios/01-idn-access-manager/1.3-account-capability-inspector/1.3-account-capability-inspector.md:36 | Exit to 11.4 "filtered by target account" | `filter by type, reason, date only` | The link promises a filter that FR-REP-6 does not provide | **Accept**: the exit names the real filters and says there is no per-account filter |
| EC-28 | ux/C-UX-Scenarios/06-ord-order-comprobante/S4-item-received-and-close.md | The post-purchase collection prompt was described as also following a completed trade | `prompt only on OrderClosed` | A behaviour that PRD §18 marks out of scope ("prompts for completed trades") | **Accept**: the claim is removed |
| EC-29 | ux/C-UX-Scenarios/06-ord-order-comprobante/6.1-*/6.1-*.md:126; ux/C-UX-Scenarios/11-rep-reputation-moderation/11.1-write-a-review/11.1-write-a-review.md | "Ver pedido" needs the order id, but the Decision citation may not carry it | `citation.orderId ?? link to orders list filtered by shop` | A dead link from a refusal banner | **Defer** to Phase 3 (the citation shape). The UX fallback is specified: the orders list, filtered |
| EC-30 | ux/C-UX-Scenarios/00-ux-scenarios.md §6 (routes for 1.2 and 2.1) | Two pages have no fixed route | — | Deep links and tests cannot target them | **Defer** to Phase 3. The index marks them "set in Phase 3" |
| EC-31 | ux/C-UX-Scenarios/12-msg-messaging/12.2-inbox-thread/12.2-inbox-thread.md:131 | Thread reopened later, without the `publicacion` link parameter | `context line only for that visit; not stored` | The user expects the "Sobre: {producto}" line and it is gone | **Accept**: the spec states the line lasts one visit, because FR-MSG-5 gives a conversation no listing reference |

## 5. Assumptions where the PRD is silent

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-32 | ux/C-UX-Scenarios/11-rep-reputation-moderation/11.1-write-a-review/11.1-write-a-review.md:158 | Author tries to edit a review that moderation hid | `if review.hidden render tombstone, no form` | An edit would bypass moderation, or the rule is left undefined | **Defer**: [ASSUMPTION] no edit while hidden. Phase 3 confirms it in the REP contract |
| EC-33 | ux/C-UX-Scenarios/11-rep-reputation-moderation/S2-ungated-individual-review.md | Seller opens their own profile | `hide "Reseñar" on own profile` | A self-review is possible through a direct URL | **Defer** to v2. Hiding the button is a courtesy only; self-review detection is out of scope (PRD §5) |
| EC-34 | ux/C-UX-Scenarios/11-rep-reputation-moderation/11.3-moderation-queue/11.3-moderation-queue.md:211 | Admin searches reviews or listings | `exact substring, case- and accent-insensitive` | Search results differ between client and server | **Defer**: [ASSUMPTION]. Phase 3 fixes the query semantics |
| EC-35 | ux/C-UX-Scenarios/11-rep-reputation-moderation/11.4-moderation-audit/11.4-moderation-audit.md:120,129 | An audit row is read after the content changed; the log is exported | `snapshot rating+text / title+price; no export` | The audit shows current content instead of what was hidden | **Defer**: [ASSUMPTION] snapshot fields and no export. Phase 3 confirms them against FR-REP-6 |
| EC-36 | ux/C-UX-Scenarios/12-msg-messaging/12.1-contact-seller-composer/12.1-contact-seller-composer.md:172 | 12.1 reloaded | `each generation counts; Phase 3 may dedupe per requester+listing/hour` | Reloads use up the FR-MSG-3 contact limit | **Defer**: [ASSUMPTION] a reload counts. Phase 3 may de-duplicate |
| EC-37 | ux/C-UX-Scenarios/12-msg-messaging/S4-trade-handoff-reuse.md:99 | Trade acceptance when the proposer is at the FR-MSG-3 contact limit | `trade handoff exempt from contact limits` | An agreed trade fails to produce its handoff | **Defer**: [ASSUMPTION] trade handoffs are exempt. Phase 3 writes it into FR-MSG-3 |
| EC-38 | ux/C-UX-Scenarios/12-msg-messaging/S3-ineligible-recipient.md:108 | Shop rejected, then reapplies and is Pending again | `thread accepts messages again, with the notice` | The read-only thread never reopens, or reopens without the notice | **Defer**: [ASSUMPTION] eligibility follows the shop's current state. Phase 3 confirms |
| EC-39 | ux/C-UX-Scenarios/12-msg-messaging/12.2-inbox-thread/12.2-inbox-thread.md:143 | A sender wonders whether the other side read the message | `no read receipts` | Users expect "Visto" | **Defer**: [ASSUMPTION]. FR-MSG-7 tracks each reader's own state only |
| EC-40 | planning/prd.md:1539 vs planning/prd.md:1628 | `trading` passes `counterpartId`; `generateContactMessage` takes `requesterId` | `one parameter name in both FRs` | A contract mismatch between FR-TRD-6 and FR-MSG-1 | **Defer** to Phase 3 (the contract). Out of the UX's scope; logged here because 12.3 exercises both |
| EC-41 | ux/C-UX-Scenarios/04-inv-listing-shared-inventory/4.2-* | FR-INV-9 (edit, restock, deactivate) has no Annex scenario | `4.3 console preset for FR-INV-9` | The requirement is exercised only by a page, not by a scenario test | **Defer**: fully specified on 4.2, including the lost race. A 4.3 preset is a Phase 3 candidate. The 00 index says so |

## 6. Cross-file consistency (values one file states and another must match)

| # | location | trigger_condition | guard_snippet | potential_consequence | Triage |
|---|----------|-------------------|---------------|-----------------------|--------|
| EC-42 | ux/C-UX-Scenarios/00-ux-scenarios.md:86 | The PRD seed profile and UJ-4 ("a day") are relative; the scenarios use absolute dates | `seed fixture pinned to the §3 time model` | The fixtures contradict the scenario dates | **Defer** to Phase 3 seed design. The time model in 00 §3 is the reference |
| EC-43 | ux/C-UX-Scenarios/11-rep-reputation-moderation/S3-aggregate-reputation.md:42; 11.2-*:74 | Seed reviews of Tienda Andrés dated before its approval (UJ-3) | `seed review dates > approval date` | Verified-purchase reviews that predate the shop's approval | **Defer** to Phase 3 seed design. The constraint is stated in both files |
| EC-44 | ux/C-UX-Scenarios/*/S*.md (Realizes lines) | FR-IDN-6, FR-INV-5, FR-INV-6 and FR-DSC-3 exercised but not listed | `Realizes lists every FR the scenario exercises` | The FR→scenario matrix shows false gaps | **Accept**: Realizes lines completed; the 00 matrix is rebuilt from them |
| EC-45 | ux/C-UX-Scenarios/00-ux-scenarios.md §7 | 23 FRs have no scenario in the PRD's per-module trace tables | `matrix places each FR` | Those FRs look untested | **Accept**: the 00 matrix places all 95 FRs and lists the 23 by id |
| EC-46 | ux/C-UX-Scenarios/10-val-valuation/S2-period-trend.md:38 | The 30-day additions listed the promos as priced | `unpriced items add nothing to either value` | The trend percentage cannot be reproduced | **Accept**: the promos are unpriced; the Mew ex is the only priced addition |
| EC-47 | ux/C-UX-Scenarios/02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md | Prices and seller names on 2.2 differ from CAT-S2, 3.1 and ORD-S1 | `one fixture per listing` | A scenario test asserts a price that another page contradicts | **Accept**: aligned (for example Juan P. at 12,4 km, and the CAT-S2 trend) |
| EC-48 | ux/C-UX-Scenarios/12-msg-messaging/* (cross-references) | A cross-reference named page 6.2 where the inbox thread 12.2 was meant | `reference 12.2` | The reader follows the reference to the order page instead of the thread | **Accept**: corrected to 12.2 |
| EC-49 | ux/microcopy-es-CO.md:249 (§7, contact composer template) | An outgoing message used `{precio}` without a currency | `{monto} renders "$20.000 COP" in outgoing text` | A recipient on WhatsApp sees an ambiguous amount | **Accept**: outgoing templates use `{monto}` with "COP" |
| EC-50 | ux/C-UX-Scenarios/12-msg-messaging/12.1-contact-seller-composer/12.1-contact-seller-composer.md:147 | `ContactRateLimited` per seller: "desde el {fecha}" | `{fecha} = that seller's window reset, not a global one` | The user is told the wrong date on which they can write again | **Accept**: `{fecha}` is per seller, per day |
| EC-51 | ux/C-UX-Scenarios/*/*.md (earlier self-check passes) | Values stated in one file and contradicted in another | — | Scenario tests built from different files disagree | **Accept**. The corrections, each applied and re-checked: live region instead of toasts; lost-race copy; Medellín for Camila; the UJ-1 and UJ-5 figures; status labels; tú/usted per surface; cuid2 ids; reapply dates; pluralization; no invented admin name; FR references instead of invented AD references; typography tokens; TRD turn and status wording; the 8.4 id; the "Agregar" button; wishlist labels; Mew ex; the 9.2 price $30.000; the COL-S2 date; the VAL recompute claim; the removal-step logic; the trend-note wording; the `{valor}` rule |
| EC-52 | ux/C-UX-Scenarios/06-ord-order-comprobante/6.3-business-order-desk/6.3-business-order-desk.md | Business opens the receipt of an order that is not yet paid | — | — | **Reject**: unreachable. The desk never lists unpaid orders, and the H console covers the raw state |
| EC-53 | ux/wireframes/5.3-admin-review-queue.svg, 8.2-trade-negotiation-timeline.svg | A drawn wireframe disagrees with its spec (an invented rail, presence type or lost-race copy) | `every label taken from the spec or the microcopy registry` | Engineers build from the picture instead of the spec | **Accept**: labels were checked against the spec and corrected. Each spec links its wireframe and states that the spec wins on conflict (5.3:52, 8.2:53) |

---

## 7. Summary for the gate

- **Accept (30).** All fixes are applied in the files cited. No Accept finding changes a PRD requirement.
- **Defer (14).** Thirteen are owned by Phase 3:
  - contract and routes: EC-29, EC-30, EC-40;
  - seed design: EC-42, EC-43;
  - server rules behind UX assumptions: EC-32, EC-34 to EC-39;
  - the FR-INV-9 preset: EC-41.

  One (EC-33) is deferred to v2. The Phase 3 parts of EC-07 (route form), EC-11 (server rule) and EC-14 (dedupe contract) go to the same owner.
- **Reject (9).** Each cites the line where the path is already handled, or the rule that exempts it.
- **Gate outcome (2026-09-27).** The team adopted this triage in full, including the [ASSUMPTION] tags behind EC-11 (UX-A-3), EC-07 and EC-08 (UX-A-4), EC-32 and EC-34 to EC-39. Those remain working assumptions for Phase 3 to confirm. See the decision log, entry 16.
