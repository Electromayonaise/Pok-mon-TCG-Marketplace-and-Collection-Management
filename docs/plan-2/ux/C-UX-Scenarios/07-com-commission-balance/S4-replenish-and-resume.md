---
design_intent: D
design_status: specified
module: COM
annex_scenario: 4
---

# COM-S4: Andrés Tops Up, and the Same Listings Come Back

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COM-3, FR-COM-6, FR-COM-7, FR-COM-8, FR-INV-7 (Annex scenario COM-4, Replenish → Resume)

---

## Transaction (Q1)

**What this scenario covers:**
- A top-up that takes the balance from ≤ 0 to > 0 publishes Replenished once. The same listing ids resume, and none is recreated.
- A top-up that leaves the balance ≤ 0 says so, and names the remaining amount.
- The admin can change the rate going forward (append-only, audited) and run reconciliation (FR-COM-7, FR-COM-8).

---

## Business Goal (Q2)

**Goal:** PRD §1, "recoverable, auditable money state".
**Objective:**
- Listings resume within one event delivery.
- The reconciliation identity holds exactly, with a difference of $0.

---

## User & Situation (Q3)

**Personas:** Andrés; Sebastián.
**Situation:**
- On 24 oct 2026, 8:50 a. m., Andrés transfers $50.000 and submits the request (reference "TZG-ANDRES-02"). His balance is −$2.400.
- Sebastián confirms it at 10:20 a. m.
- The same afternoon, Sebastián schedules a rate change from 800 to 850 bps, effective 1 nov 2026, 12:00 a. m. (fixture).

---

## Driving Forces (Q4)

**Hope (Andrés):** Get his listings back exactly as they were, reviews and all.
**Worry (Andrés):** Having to recreate listings; a top-up that isn't enough and says nothing.
**Hope (Sebastián):** Change the rate without touching past charges, and prove that the books balance.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Andrés on his phone (R); Sebastián on desktop (D).
**Entry:**
- Andrés: 7.1 → "Recargar saldo".
- Sebastián: Recargas (7.3), then Comisiones → Tarifa y conciliación (7.4).

---

## Best Outcome (Q7)

**User Success:**
- **The top-up.** After confirmation, 7.1 reads "Recibimos tu recarga de $50.000. Tu saldo es $47.600 y tus publicaciones ya se pueden comprar."
- **The listings.** 4.2 shows the same listings as "Activa", with the same ids and URLs.
- **The rate change.** In 7.4, Sebastián adds 850 bps from 1 nov 2026, 12:00 a. m. The confirmation reads "Aplica a comisiones que se cobren desde el 1 nov 2026, 12:00 a. m. Los cobros anteriores no cambian." The history keeps 800 bps as a row.
- **Reconciliation.** "Conciliar ahora" reports "Tienda Andrés · saldo $47.600 = recargas $100.000 − comisiones $52.400 · secuencia continua ✓".

**Business Success:**
- 1 Replenished event with a new `ledgerSeq`. Listings apply it only if it is newer (FR-INV-7).
- The rate-change audit row names Sebastián and the before/after values.

---

## Shortest Path (Q8)

1. **Balance & Top-Up (7.1)** — request.
2. **Admin Top-Up Queue (7.3)** — confirm.
3. **My Listings (4.2)** — the same ids are active again.
4. **Rate Settings & Reconciliation (7.4)** — future rate; reconcile. ✓

---

## Trigger Map Connections

**Personas:** Andrés; Sebastián

**Driving Forces Addressed:**
- ✅ **Want:** Exact recovery; a rate change that isn't retroactive; balanced books.
- ❌ **Fear:** Lost listings; silent partial recovery.

**Business Goal:** FR-COM-6; FR-COM-7; FR-COM-8.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COM-S4.1 | [`7.1-balance-top-up/`](7.1-balance-top-up/7.1-balance-top-up.md) | Request a top-up while exhausted | In review |
| COM-S4.2 | [`7.3-admin-top-up-queue/`](7.3-admin-top-up-queue/7.3-admin-top-up-queue.md) | Confirm; the balance crosses zero | Replenished |
| COM-S4.3 | [`../04-inv-listing-shared-inventory/4.2-my-listings/`](../04-inv-listing-shared-inventory/4.2-my-listings/4.2-my-listings.md) | The same listing ids resume | — |
| COM-S4.4 | [`7.4-rate-settings-reconciliation/`](7.4-rate-settings-reconciliation/7.4-rate-settings-reconciliation.md) | Future rate; reconciliation | Scenario success ✓ |

**First step** (COM-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Still-short variant (FR-COM-3):** at a balance of −$25.000, a $20.000 top-up gives "Recibimos tu recarga de $20.000. Tu saldo es −$5.000; recarga al menos $5.001 para reactivar tus publicaciones." with "Recargar saldo". No event is published.

**Edge (mandatory, NFR-COM-1), in 7.5:** balance $5.000 and two $45.000 orders (commission $3.600 each) confirmed at once, plus one duplicate delivery → balance −$2.200, 2 entries and exactly 1 Exhausted, ×100.
