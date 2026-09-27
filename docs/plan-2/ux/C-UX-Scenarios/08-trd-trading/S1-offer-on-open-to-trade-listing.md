---
design_intent: D
design_status: specified
module: TRD
annex_scenario: 1
---

# TRD-S1: Julián Offers a Card Plus Cash for Valentina's Bundle

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-TRD-1, FR-TRD-9 (Annex scenario TRD-1, Offer on an Open-to-Trade Listing)

---

## Transaction (Q1)

**What this scenario covers:**
- A verified-email collector makes a trade offer on an individual seller's listing that is open to trades: up to 10 items, cash, and a note.
- The offer is non-binding. Nothing is reserved until someone accepts it.
- Every refusal says why and gives a next step: not open to trade, a shop listing, the proposer's own listing, an empty offer, a duplicate open offer, nothing available, or an unverified email.
- The offer shows its absolute expiry time (7 days).

---

## Business Goal (Q2)

**Goal:** CAP-25, "trade offers with strict turn-taking".
**Objective:**
- 100 % of refusals carry a reason and an action (PRD §22 explained-decision coverage).
- 0 offers created on listings that are not open to trade.

---

## User & Situation (Q3)

**Personas:** Julián, 22, Bogotá, a collector (the seed gives him 5 cards in inventory); Valentina, 27, Bogotá, individual seller.
**Situation:**
- Valentina has published her "Lote Psíquico" bundle (3 cards, including her only Gardevoir ex NM) with "Abierta a intercambios" on. The same Gardevoir ex is also listed on its own (INV-S2).
- On 5 oct 2026, 7:30 p. m., Julián finds the bundle on the Gardevoir ex card detail (2.2). He wants to offer his Pikachu ex (NM) plus $20.000.

---

## Driving Forces (Q4)

**Hope (Julián):** Make a clear offer in a minute, and know when he'll hear back.
**Worry (Julián):** Offering blind, or sending an offer that silently goes nowhere.
**Hope (Valentina):** Receive offers that are complete and comparable, not vague messages.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Julián on his phone (R).
**Entry:** 2.2 listings block → the bundle row (individual, open to trade) → "Hacer una oferta".

---

## Best Outcome (Q7)

**User Success:**
- 8.1 shows what he is asking for (the bundle with its 3 cards, Valentina's name, "1 disponible") and what he is offering.
- He adds Pikachu ex (NM) ×1 from the item picker (the "Tus cartas" shortcut lists his 5 cards; any catalog card can be searched, since items are catalog references validated by `listings.resolveItemRefs`) and $20.000. He writes the note "Puedo encontrarme en Chapinero. También tengo Espeon V (NM)."
- The summary reads "Ofreces: Pikachu ex (NM) + $20.000 · Pides: Lote Psíquico".
- He taps "Enviar oferta". 8.2 opens with "Oferta enviada. Le toca responder a Valentina. Esta oferta vence el 12 oct 2026, 7:30 p. m. si no responde."

**Business Success:**
- 1 `TradeOffer` with status Open, `turn=seller` and round 1. No reservation exists, and the bundle still reads "1 disponible".

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — "Hacer una oferta" on the open-to-trade row.
2. **Make an Offer (8.1)** — pick items and cash, then send.
3. **Trade Negotiation Timeline (8.2)** — round 1, Valentina's turn, absolute expiry. ✓

---

## Trigger Map Connections

**Personas:** Julián (proposer); Valentina (seller)

**Driving Forces Addressed:**
- ✅ **Want:** A complete, structured offer; a known deadline.
- ❌ **Fear:** Silent refusals; offers into the void.

**Business Goal:** AD-4 (trades stay inside individual listings; shops sell only through orders).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| TRD-S1.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Find the open-to-trade listing | "Hacer una oferta" |
| TRD-S1.2 | [`8.1-make-an-offer/`](8.1-make-an-offer/8.1-make-an-offer.md) | Compose and send the offer | Offer created |
| TRD-S1.3 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Round 1 visible; Valentina's turn | Scenario success ✓ |

**First step** (TRD-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Refusal variants (8.1, first failure wins, in FR-TRD-1 rule order):**
- `EmailNotVerified`;
- `SelfTradeNotAllowed` (Valentina tries to offer on her own bundle);
- `NotIndividualSellerListing` (a Tienda Andrés listing);
- `ListingNotOpenToTrade` ("Valentina no abrió esta carta a intercambios. Puedes escribirle para comprarla.");
- `InsufficientQuantity` (the bundle is already reserved);
- `EmptyTradeOffer`;
- `DuplicateOpenOffer` (Julián already has an open offer on this bundle) → "Ver mi oferta".

**Expiry variant (FR-TRD-9):** with no answer by 12 oct 2026, 7:30 p. m., the sweep marks the offer Expired. 8.2 shows "Esta oferta venció el 12 oct 2026, 7:30 p. m. sin respuesta." with "Hacer una nueva oferta".
