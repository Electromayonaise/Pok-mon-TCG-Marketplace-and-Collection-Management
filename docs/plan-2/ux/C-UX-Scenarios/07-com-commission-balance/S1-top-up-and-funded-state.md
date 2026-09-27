---
design_intent: D
design_status: specified
module: COM
annex_scenario: 1
---

# COM-S1: Andrés Funds His Balance, and His Listings Become Purchasable

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COM-1, FR-COM-2, FR-COM-3, FR-INV-7 (Annex scenario COM-1, Top-up and Funded State)

---

## Transaction (Q1)

**What this scenario covers:**
- A newly approved business starts at $0 in the Exhausted state; its listings carry the badge but can't be bought (FR-COM-1).
- The business transfers money to the platform outside TEZG and submits a top-up request: amount, transfer reference and comprobante (FR-COM-2).
- An admin confirms the request against the bank statement (FR-COM-3).
- The balance becomes positive, Replenished is published once, and the listings become purchasable (FR-INV-7).

---

## Business Goal (Q2)

**Goal:** PRD §1, "commission is prepaid, and a shop never sells commission-free".
**Objective:**
- 0 purchasable listings for a business that has never been funded (fail-closed).
- A top-up confirmation takes p95 ≤ 800 ms (NFR-COM-3).

---

## User & Situation (Q3)

**Personas:** Andrés, owner of Tienda Andrés, Medellín; Sebastián, admin.
**Situation:**
- Sebastián approved the shop on 8 oct 2026, 11:34 a. m. Andrés's 6 listings now show the verified badge, but 2.2 shows each one as "pausada (la tienda está recargando saldo)", and "Comprar" is refused with "Pausada: Tienda Andrés está recargando su saldo. Puedes agregarla a tu lista de deseos."
- On 9 oct 2026, 9:40 a. m., Andrés transfers $50.000 from his Bancolombia app to TEZG's account; the reference is "TZG-ANDRES-01".

---

## Driving Forces (Q4)

**Hope (Andrés):** Start selling today; know exactly when his listings go live.
**Worry (Andrés):** Sending money into a void, with no sign that someone is checking.
**Hope (Sebastián):** Match each request against the bank statement quickly, with no double credit.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Andrés on his phone (R); Sebastián on desktop (D, admin).
**Entry:**
- Andrés: 5.2 → "Recargar saldo" → 7.1.
- Sebastián: admin rail → Recargas (7.3).

---

## Best Outcome (Q7)

**User Success:**
- **Before funding.** 7.1 shows `commission-balance-card` "$0 · Publicaciones pausadas" with "Recarga tu saldo para empezar a vender." The platform's bank details come from configuration, and each has "Copiar".
- **The request.** Andrés enters $50.000, the reference TZG-ANDRES-01 and the screenshot, then taps "Enviar recarga". His requests list shows "En revisión · 9 oct 2026, 9:40 a. m." with "Estamos revisando tu transferencia. Tu saldo cambiará cuando la confirmemos."
- **Sebastián confirms.** In 7.3 he opens the request (oldest first), compares the comprobante with the bank statement and confirms it in the dialog.
- **Back on 7.1.** On his next visit or focus, Andrés sees "Recibimos tu recarga de $50.000. Tu saldo es $50.000 y tus publicaciones ya se pueden comprar." The card reads "$50.000 · Activa".

**Business Success:**
- 1 `TopUp` ledger entry, `seq` 1, and 1 `CommissionBalanceReplenished` event.
- The same 6 listing ids become purchasable, and none is recreated.

---

## Shortest Path (Q8)

1. **Balance & Top-Up (7.1)** — send the request.
2. **Admin Top-Up Queue (7.3)** — confirm it.
3. **Balance & Top-Up (7.1)** — see the balance is funded and the listings active. ✓

---

## Trigger Map Connections

**Personas:** Andrés (business); Sebastián (admin)

**Driving Forces Addressed:**
- ✅ **Want:** A visible request status; an exact "your listings are live" moment.
- ❌ **Fear:** Money lost in transit; a double credit.

**Business Goal:** AD-3 (commission events drive the pause); FR-INV-7 fail-closed.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COM-S1.1 | [`7.1-balance-top-up/`](7.1-balance-top-up/7.1-balance-top-up.md) | See $0 / paused; submit a top-up request | The request is in review |
| COM-S1.2 | [`7.3-admin-top-up-queue/`](7.3-admin-top-up-queue/7.3-admin-top-up-queue.md) | Verify and confirm | The balance is credited |
| COM-S1.3 | [`7.1-balance-top-up/`](7.1-balance-top-up/7.1-balance-top-up.md) | Funded; listings purchasable | Scenario success ✓ |

**First step** (COM-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Variants:**
- An amount of $15.000 returns `TopUpAmountInvalid`, shown at the field.
- A second admin confirming the same request gets `TopUpNotPending`, with the banner "Sebastián ya confirmó esta recarga el 9 oct 2026, 11:15 a. m.".
- A rejected request shows the reason and "Nueva recarga" on 7.1.
