---
design_intent: D
design_status: specified
module: COM
annex_scenario: 3
---

# COM-S3: The Balance Runs Out, and the Listings Pause (but Nothing Is Lost)

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COM-4, FR-COM-6, FR-COM-9, FR-INV-7 (Annex scenario COM-3, Exhaustion → Pause)

---

## Transaction (Q1)

**What this scenario covers:**
- A low balance is announced before it runs out (FR-COM-9, display only).
- A confirmed sale is never refused, even when its commission takes the balance below zero (AD-19).
- Crossing from > 0 to ≤ 0 publishes Exhausted exactly once. All of the business's listings pause, and they stay visible and editable (FR-INV-7).
- The balance page names the exact amount needed to resume: X = 1 − balance.

---

## Business Goal (Q2)

**Goal:** PRD §1, "a shop never sells commission-free, and never loses a sale to the balance".
**Objective:**
- 1 Exhausted event per crossing.
- 0 listings deleted or recreated.

---

## User & Situation (Q3)

**Persona:** Andrés.
**Situation:**
- After COM-S2 his balance was $35.600. Two more sales followed: $150.000 on 20 oct (−$12.000) and $145.000 on 21 oct (−$11.600). Since 21 oct his balance is $12.000.
- On 23 oct 2026, 10:05 a. m., he confirms another $180.000 sale.

---

## Driving Forces (Q4)

**Hope:** Keep selling without surprises; know in advance when to top up.
**Worry:** His listings vanishing mid-sale; losing the listings he spent time creating.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R) for 7.1; desktop (D) for 4.2.
**Entry:** Mi tienda → Saldo (7.1); Mi tienda → Publicaciones (4.2).

---

## Best Outcome (Q7)

**User Success:**
- **The warning (21 oct).** 7.1 shows "Tu saldo se está agotando ($12.000). Recarga para que tus publicaciones sigan disponibles para compra." with "Recargar saldo".
- **After the sale (23 oct).** The sale goes through. 7.2 shows "−$14.400 · Saldo −$2.400".
- **The pause.** 7.1 shows "−$2.400 · Publicaciones pausadas" and "Tus publicaciones están pausadas. Recarga al menos $2.401 para reactivarlas."
- **The listings.** 4.2 shows every business listing as "Pausada: se reactivará cuando recargues tu saldo", with the banner "Tus publicaciones están pausadas…" and "Recargar saldo". They can still be edited and restocked, and none is missing.

**Business Success:**
- `before` 12.000 → `after` −2.400 in one atomic update, and one `CommissionBalanceExhausted` with a new `ledgerSeq`.
- On 2.2 and 3.1, buyers see the row explanation "pausada (la tienda está recargando saldo)", and "Comprar" gives the §3 paused refusal with "Agregar a lista de deseos".

---

## Shortest Path (Q8)

1. **Balance & Top-Up (7.1)** — the low-balance notice.
2. **Commission Ledger (7.2)** — the deduction that crossed zero.
3. **Balance & Top-Up (7.1)** — exhausted, with the exact amount to resume.
4. **My Listings (4.2)** — paused, not gone. ✓

---

## Trigger Map Connections

**Persona:** Andrés

**Driving Forces Addressed:**
- ✅ **Want:** An early warning; an exact recovery amount.
- ❌ **Fear:** Lost listings; a refused sale.

**Business Goal:** AD-19 (negative balances allowed); FR-COM-6 (no flapping).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COM-S3.1 | [`7.1-balance-top-up/`](7.1-balance-top-up/7.1-balance-top-up.md) | Low-balance notice at $12.000 | — |
| COM-S3.2 | [`7.2-commission-ledger/`](7.2-commission-ledger/7.2-commission-ledger.md) | The −$14.400 line; balance −$2.400 | "Ver saldo" |
| COM-S3.3 | [`7.1-balance-top-up/`](7.1-balance-top-up/7.1-balance-top-up.md) | Exhausted copy with $2.401 | "Ver mis publicaciones" |
| COM-S3.4 | [`../04-inv-listing-shared-inventory/4.2-my-listings/`](../04-inv-listing-shared-inventory/4.2-my-listings/4.2-my-listings.md) | Paused, visible, editable | Scenario success ✓ |

**First step** (COM-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Paid orders keep working:** paid orders still open on 6.3 can be confirmed while the listings are paused, and each confirmation deducts again (the balance may go further below zero). No second Exhausted event is published, because there is no new crossing.
