---
design_intent: D
design_status: specified
module: MSG
annex_scenario: 4
---

# MSG-S4: Julián's Trade Handoff Comes From the Same Contact Service, With the Trade Summary Filled In

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-27
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-MSG-1, FR-MSG-2, FR-TRD-6 (Annex scenario MSG-4, Trade Handoff Reuse); AD-4; NFR-MSG-4 (maximal trade); UJ-2 step 6

---

## Transaction (Q1)

**What this scenario covers:**
- On acceptance, `trading` calls `listings.generateContactMessage` with `kind: 'trade'` and a trade summary. It does not build its own text, link or encoding (AD-4, decision-log #3).
- The proposer gets the same `contact-composer` as 12.1, embedded in the trade page; the seller gets a copyable summary and no external link.
- The trade text follows the same length rule as purchases, and shortens item names before it ever touches cash, conditions or quantities.

---

## Business Goal (Q2)

**Goal:** One contact-message service for both paths, so encoding, truncation and phone protection are specified and tested once.
**Objective:**
- Exactly 1 generation call per acceptance, recorded by the listings fake with its `tradeSummary`.
- A maximal trade (10 items × 200-character names, plus cash) gives a link ≤ 2.000 characters that keeps the cash and every condition; the copy text lists all 10 items in full (FR-MSG-2 acceptance).

---

## User & Situation (Q3)

**Personas:** Julián (proposer); Valentina (seller, Bogotá).
**Situation:** 6 oct 2026, 12:40 p. m. Julián accepts Valentina's round-2 counter on her Lote Psíquico: his Pikachu ex (NM) and Espeon V (NM), no cash (TRD-S3).

---

## Driving Forces (Q4)

**Hope (Julián):** Arrange the meeting right away with a message that states the deal exactly.
**Worry (Julián):** A message that gets the cards wrong, so the meeting starts with an argument.
**Hope (Valentina):** Know who is coming and for what, without sharing her number.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Both on phones (R); the developer on desktop (H, `/dev/msg`).
**Entry:** Julián: "Aceptar" on 8.2. Developer: 12.3 → preset "Traspaso de intercambio".

---

## Best Outcome (Q7)

**User Success:**
- **Julián, on 8.2.** Under "Intercambio aceptado · la carta queda reservada para ti.", the `contact-composer` shows: "¡Hola, Valentina! Aceptaste mi oferta en TEZG por tu Lote Psíquico: te ofrezco Pikachu ex (NM) y Espeon V (NM). ¿Cuándo y dónde nos vemos?" The cash is $0, so the " + {efectivo}" segment is dropped (microcopy §6 composition rule). "Abrir WhatsApp" and "Copiar mensaje" behave exactly as on 12.1.
- **Valentina, on 8.2.** A read-only summary of the same terms, Julián's display name and "Copiar resumen". Her phone reached Julián only inside his link; his phone is not shown to her.

**Business Success:**
- 1 `generateContactMessage({ kind: 'trade', … })` call, made by `trading` on acceptance (FR-TRD-6).
- 0 outbound calls to WhatsApp.

---

## Shortest Path (Q8)

1. **Trade Negotiation Timeline (8.2)** — Julián accepts; the handoff appears.
2. **Messaging API Explorer (12.3)** — the call is the same service; the maximal trade passes. ✓

---

## Trigger Map Connections

**Personas:** Julián; Valentina; the developer

**Driving Forces Addressed:**
- ✅ **Want:** An exact, ready-to-send summary of the deal.
- ❌ **Fear:** A wrong summary; a second, drifting copy of the contact logic.

**Business Goal:** AD-4; FR-MSG-1/2; FR-TRD-6.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| MSG-S4.1 | [`../08-trd-trading/8.2-trade-negotiation-timeline/`](../08-trd-trading/8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | The handoff on acceptance (`trd-neg-handoff`) | "Abrir WhatsApp" / "Copiar mensaje" |
| MSG-S4.2 | [`12.3-messaging-api-explorer/`](12.3-messaging-api-explorer/12.3-messaging-api-explorer.md) | Developer proof: same service, maximal trade, determinism | Scenario success ✓ |

**First step** (MSG-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Maximal trade (edge, in 12.3).** 10 offered items with 200-character names, plus $20.000 cash. The WhatsApp text shortens item names, longest first, down to 20 graphemes each; that alone brings this fixture under 2.000 characters, so "$20.000 COP" and every "(NM)" stay. Only a trade that still does not fit collapses its trailing items into "+{n} cartas más", keeping at least the first. The copy text lists all 10 items in full, and 8.2 shows the note "El mensaje para WhatsApp acorta los nombres de las cartas. «Copiar mensaje» copia el texto completo."

**Rate limits and trades.** [ASSUMPTION: a trade handoff does not count toward the FR-MSG-3 contact limits and is never refused by them. It is generated once per acceptance, and the phone is released only after both parties agreed, so it cannot be used to harvest numbers. Without this exemption, an acceptance could fail on a contact limit after the reservation. Logged in `review-ux-edge-cases.md` for Phase 3.]

**Handoff failure.** If generation fails after the acceptance committed, 8.2 still shows the accepted state. The composer area shows the §10 load copy ("No pudimos cargar el mensaje para WhatsApp…") with "Reintentar". The acceptance is never rolled back for this.
