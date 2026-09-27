---
design_intent: D
design_status: specified
module: IDN
annex_scenario: 1
---

# IDN-S1: Valentina Buys and Sells From One Account

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-IDN-1, FR-IDN-7 (Annex scenario IDN-1, Dual-Role Derivation)

---

## Transaction (Q1)

**What this scenario covers:**
Valentina uses one account both to buy and to sell as an individual seller. The app offers her both paths because the server derives her capabilities from facts. Nothing she, the browser or a client "role" claims is trusted.

---

## Business Goal (Q2)

**Goal:** PRD §1, "semantically coherent": one owner answers "what can this account do?".
**Objective:** Every surface asks the same derivation (FR-IDN-1), so no screen offers an action the server will refuse for a role reason. PRD §22 tracks this as explained-decision coverage of 100 %.

---

## User & Situation (Q3)

**Persona:** Valentina, 27, Bogotá. Collector and individual seller.
**Situation:** Valentina has completed the individual-seller profile but has no business application. In the same evening she buys a sealed booster from Andrés and lists a duplicate holo.

---

## Driving Forces (Q4)

**Hope:** That selling doesn't mean giving up being a buyer, and that she doesn't need a second account.

**Worry:** Being pushed into "choose a role" screens, or being blocked by a mode switch she didn't know she had turned on.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R). A developer reproduces the same session on desktop (H).
**Entry:** Cuenta → Vender, and separately Catálogo → a card → Comprar.

---

## Best Outcome (Q7)

**User Success:**
Both paths are just there: "Vender" in Cuenta and "Comprar" on a business listing. There is no role picker, no mode toggle and no second login.

**Business Success:**
One `getCapabilities` call returns `canBuy=true`, `canListAsIndividual=true` and `canListAsBusiness=false`, each with a `derivedFrom` fact. The 1.1 explorer shows that a request carrying `role: "business"` is refused with `RequestValidationFailed` and changes nothing.

---

## Shortest Path (Q8)

1. **My Listings (4.2)** — Valentina sees her individual listings and "Nueva publicación". Selling is available because her profile is complete.
2. **Purchase (6.1)** — she buys from Andrés on the same session; the buying capability comes from her verified email.
3. **Capability API Explorer (1.1, H)** — the developer replays her session, and `getCapabilities` shows both capabilities with their source facts. ✓

---

## Trigger Map Connections

**Persona:** Valentina — Collector & Individual Seller

**Driving Forces Addressed:**
- ✅ **Want:** One account for everything she does in TEZG.
- ❌ **Fear:** A hidden mode or role that silently blocks her.

**Business Goal:** Semantically coherent capability model (PRD §1); NFR-IDN-3 (no client-supplied role).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| IDN-S1.1 | [`../04-inv-listing-shared-inventory/4.2-my-listings/`](../04-inv-listing-shared-inventory/4.2-my-listings/4.2-my-listings.md) | Selling entry is present because `canListAsIndividual` | Opens a card to buy |
| IDN-S1.2 | [`../06-ord-order-comprobante/6.1-purchase-payment-instructions/`](../06-ord-order-comprobante/6.1-purchase-payment-instructions/6.1-purchase-payment-instructions.md) | Buying works from the same account | Order created |
| IDN-S1.3 | [`1.1-capability-api-explorer/`](1.1-capability-api-explorer/1.1-capability-api-explorer.md) | Proves the derivation, and proves a client role claim is refused | Scenario success ✓ |

**First step** (IDN-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
