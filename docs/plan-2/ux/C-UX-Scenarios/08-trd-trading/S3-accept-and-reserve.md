---
design_intent: D
design_status: specified
module: TRD
annex_scenario: 3
---

# TRD-S3: Julián Accepts, the Bundle Is Reserved, and Competing Offers Close With a Reason

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-TRD-4, FR-TRD-5, FR-TRD-6, FR-INV-3, FR-INV-4, FR-MSG-1 (Annex scenario TRD-3, Accept and Reserve)

---

## Transaction (Q1)

**What this scenario covers:**
- Acceptance reserves one unit through the same path as purchases (FR-INV-3), in one transaction with the status change.
- Every other open offer on each listing that has just run out, including **sibling** listings that share the unit, becomes Unfulfillable with a reason its proposer can read.
- Both parties get the contact handoff produced by the listings service: the proposer an external-contact link with a pre-filled summary, the seller a copyable summary and the proposer's name.

---

## Business Goal (Q2)

**Goal:** PRD §1, "mathematically sound": no card promised twice.
**Objective:**
- 0 open offers left on an exhausted listing.
- 1 `TradeAccepted` event and 1 handoff per acceptance.

---

## User & Situation (Q3)

**Personas:** Julián (accepting, since the counter made it his turn); Valentina; a second proposer from the seed.
**Situation:**
- On 6 oct 2026, 12:40 p. m., Julián accepts Valentina's counter (round 2).
- Two other open offers exist: one more on the Lote Psíquico, and one on Valentina's individual Gardevoir ex listing, which shares the Gardevoir ex unit with the bundle (INV-S2).

---

## Driving Forces (Q4)

**Hope (Julián):** Lock the deal and arrange the meeting right away.
**Worry (Julián):** Accepting and then finding the card went to someone else.
**Hope (Valentina):** Not have to tell the other people herself that the card is gone.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phones (R) for both parties and for the other proposers.
**Entry:** Julián: 8.2 (his turn). Valentina: 8.2 via the 8.3 list. Other proposers: 8.3.

---

## Best Outcome (Q7)

**User Success:**
- **Julián.** 8.2 shows "Intercambio aceptado · la carta queda reservada para ti." Below it is the handoff `contact-composer` with the trade template: "¡Hola, Valentina! Aceptaste mi oferta en TEZG por tu Lote Psíquico: te ofrezco Pikachu ex (NM) y Espeon V (NM). ¿Cuándo y dónde nos vemos?" with "Abrir WhatsApp" and "Copiar mensaje".
- **Valentina.** The same page shows "Intercambio aceptado · la carta queda reservada para Julián.", a copyable summary, and Julián's display name. 4.2 shows the individual Gardevoir ex as "Agotada (Gardevoir ex se reservó en otra publicación)".
- **Other proposers.** In 8.3 their offers move to "No disponible" with "Valentina aceptó otra oferta por esta carta, así que esta no puede continuar." and "Buscar otra publicación de esta carta".

**Business Success:**
- The Gardevoir ex unit goes 1 → 0 once (the other bundle components drop too).
- 2 offers are marked Unfulfillable in the accepting transaction, with the reason `ListingNoLongerAvailable` in their round history.

---

## Shortest Path (Q8)

1. **Trade Negotiation Timeline (8.2)** — Julián accepts.
2. **Trade Negotiation Timeline (8.2)** — the handoff for both parties.
3. **My Trades (8.3)** — the competing offers read "No disponible" with the reason. ✓

---

## Trigger Map Connections

**Personas:** Julián; Valentina; the other proposers

**Driving Forces Addressed:**
- ✅ **Want:** Immediate certainty; an easy way to arrange the meeting.
- ❌ **Fear:** A double promise; silently dead offers.

**Business Goal:** AD-4, AD-6; FR-TRD-5 (Plan-2 decision).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| TRD-S3.1 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Accept; reservation; handoff | "Abrir WhatsApp" / "Copiar mensaje" |
| TRD-S3.2 | [`8.3-my-trades/`](8.3-my-trades/8.3-my-trades.md) | Sibling and same-listing offers become unfulfillable | "Buscar otra publicación de esta carta" |
| TRD-S3.3 | [`8.4-trade-state-viewer/`](8.4-trade-state-viewer/8.4-trade-state-viewer.md) | Developer proof of the transition set | Scenario success ✓ |

**First step** (TRD-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Edge (mandatory, NFR-TRD-1), in 8.4:** a last-unit listing with two open offers, and Valentina accepts both from two tabs. Exactly one ends Accepted. Tab 2 shows "Ya aceptaste la oferta de Julián en otra pestaña, así que esta no puede continuar.", and the losing offer's proposer sees "No disponible". Quantity ends at 0; 1 event; 1 handoff. The sibling variant (individual listing + bundle sharing one unit) holds the same outcomes with 0 deadlocks. ×100.

**Offer-time vs accept-time note:** if Valentina had turned "Abierta a intercambios" off after the counter, Julián's accept would get `ListingNotOpenToTrade`. The offer stays Open, and Julián can withdraw it.
