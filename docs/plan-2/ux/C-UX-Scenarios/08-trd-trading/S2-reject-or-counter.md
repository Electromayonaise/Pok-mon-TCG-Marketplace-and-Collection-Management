---
design_intent: D
design_status: specified
module: TRD
annex_scenario: 2
---

# TRD-S2: Valentina Counters, and Only One Person Can Answer at a Time

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-TRD-2, FR-TRD-3 (Annex scenario TRD-2, Reject or Counter)

---

## Transaction (Q1)

**What this scenario covers:**
- The party whose turn it is can accept, reject or counter. The proposer can withdraw an open offer at any time.
- A counter replaces the terms, adds a round and passes the turn. Every round stays visible to both parties.
- A second action by the same party is refused with `NotYourTurn`, naming whose turn it is. A stale tab never double-acts.
- After 10 rounds, only accept or reject remain.
- Nobody but the two parties can open the offer.

---

## Business Goal (Q2)

**Goal:** CAP-25, strict turn-taking.
**Objective:**
- 0 double actions under stale tabs (conditional update on status, turn and version).
- Every round is recorded and visible.

---

## User & Situation (Q3)

**Personas:** Valentina (seller); Julián (proposer).
**Situation:**
- On 6 oct 2026, 8:15 a. m., Valentina opens Actividad → Intercambios (8.3) and sees Julián's offer marked "Te toca responder".
- She would rather keep the cash out and get a second card: the Espeon V (NM) that Julián mentions in his note. She adds it through the item picker's catalog search; she never sees Julián's inventory.

---

## Driving Forces (Q4)

**Hope (Valentina):** Negotiate in structured steps, without a long chat.
**Worry (Valentina):** Losing track of which terms are current; the other side changing terms after she agrees.
**Hope (Julián):** See exactly what changed.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Valentina on her phone (R); Julián on his phone (R).
**Entry:** Actividad → Intercambios (8.3) → the offer → 8.2.

---

## Best Outcome (Q7)

**User Success:**
- **Valentina's view.** 8.2 shows round 1 (Julián: Pikachu ex (NM) + $20.000) and her actions: "Aceptar", "Contraofertar", "Rechazar".
- **Her counter.** She opens "Contraofertar", removes the $20.000, adds Espeon V (NM), and sends. Round 2 appears: "Valentina contraofertó: Pikachu ex (NM) + Espeon V (NM) · sin efectivo". The terms that changed are marked "cambió".
- **Stale tab.** A second counter from her older tab gets "Le toca responder a Julián. Te avisaremos aquí cuando lo haga." The tab refreshes to round 2.
- **Julián's view.** On his next poll or focus, 8.2 shows round 2 with "Te toca responder" and the three actions, plus "Retirar oferta".

**Business Success:**
- 2 `TradeOfferRound` rows, `turn=proposer`, `version` +1.
- A third account opening the offer URL gets the Not-available page (`TradeOfferNotVisibleToCaller`).

---

## Shortest Path (Q8)

1. **My Trades (8.3)** — the offer waiting on her.
2. **Trade Negotiation Timeline (8.2)** — counter; the round is added; the turn passes.
3. **Trade Negotiation Timeline (8.2, Julián)** — round 2, his turn. ✓

---

## Trigger Map Connections

**Personas:** Valentina; Julián

**Driving Forces Addressed:**
- ✅ **Want:** Structured rounds; clear current terms.
- ❌ **Fear:** Terms that change underneath; double actions.

**Business Goal:** FR-TRD-2 conditional updates; FR-TRD-3 visibility.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| TRD-S2.1 | [`8.3-my-trades/`](8.3-my-trades/8.3-my-trades.md) | See offers waiting on her | Open the offer |
| TRD-S2.2 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Counter; round 2 | Turn passes |
| TRD-S2.3 | [`8.2-trade-negotiation-timeline/`](8.2-trade-negotiation-timeline/8.2-trade-negotiation-timeline.md) | Julián sees round 2 and his turn | Scenario success ✓ |

**First step** (TRD-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Variants:**
- **Reject.** Valentina rejects round 1 → both see "Valentina rechazó la oferta el {fecha}." The offer ends and Julián gets "Hacer una nueva oferta".
- **Withdraw.** Julián withdraws while it is Valentina's turn → "Julián retiró la oferta el {fecha}."
- **Round limit.** At round 10, the Contraofertar action is replaced by "Llegaron a 10 rondas. Ahora solo puedes aceptar o rechazar."
