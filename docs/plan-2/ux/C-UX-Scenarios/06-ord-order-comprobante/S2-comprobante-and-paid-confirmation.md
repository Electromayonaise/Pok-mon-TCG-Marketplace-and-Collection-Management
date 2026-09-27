---
design_intent: D
design_status: specified
module: ORD
annex_scenario: 2
---

# ORD-S2: "Pagado" Only After Proof, and Andrés Confirms Separately

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-ORD-2, FR-ORD-3, FR-ORD-4, FR-ORD-6 (Annex scenario ORD-2, Comprobante and Paid Confirmation)

---

## Transaction (Q1)

**What this scenario covers:**
- The buyer uploads a comprobante and confirms "Ya pagué". The file is validated by its content, must be ≤5 MB, and can be replaced until she confirms.
- The business can see the order only from that fact onward.
- The business opens the comprobante through a 10-minute, view-only link and confirms "Recibí el pago" as a separate fact.
- Each party sees the three facts one by one, each with its timestamp, plus one derived status.

---

## Business Goal (Q2)

**Goal:** PRD §1, "settlement happens entirely outside the platform" and "every out-of-order or duplicate action is safe and explained".
**Objective:**
- "Pagado" never shows unless the file is uploaded and the buyer has confirmed.
- Each fact is set at most once (NFR-ORD-1).

---

## User & Situation (Q3)

**Personas:** Camila, the buyer (UJ-1 step 4); Andrés, the business (UJ-1 step 5).
**Situation:**
- 12 oct 2026, 6:05 p. m.: Camila has transferred $180.000 from her bank app and taken a screenshot.
- 13 oct 2026, 9:10 a. m.: Andrés opens his desk at the shop counter.

---

## Driving Forces (Q4)

**Hope (Camila):** Proof of payment, recorded where Andrés can see it.
**Worry (Camila):** Uploading the wrong file; Andrés saying he never got the money.
**Hope (Andrés):** See the proof next to the order before he ships.
**Worry (Andrés):** Confirming money he hasn't yet checked in his bank.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on her phone (R); Andrés on desktop (D, business desk).
**Entry:**
- Camila: 6.1 → "Ir al pedido" → 6.2.
- Andrés: Cuenta → Mi tienda → Pedidos (6.3).

---

## Best Outcome (Q7)

**User Success:**
- **The refused file.** Camila first picks a 6 MB photo, and the dropzone refuses it: "El archivo pesa 6,1 MB y el máximo es 5 MB. Sube una captura o una foto más liviana." She then picks the screenshot (a JPEG), and it previews.
- **"Ya pagué".** She taps it. The facts list reads "Pagaste · 12 oct 2026, 6:07 p. m." and "Tienda Andrés confirma el pago · pendiente". The status is "Pagado" with a pending dot, and the comprobante is locked ("Ya confirmaste el pago…").
- **Andrés confirms.** In 6.3 the order appears under "Por confirmar". Andrés opens the `comprobante-viewer` (view only, "enlace válido 10 min"), checks his bank and taps "Recibí el pago".
- **Camila sees it.** Her 6.2 updates on the next poll: "Tienda Andrés confirmó que recibió tu pago · 13 oct 2026, 9:12 a. m.". The status becomes "Pago confirmado".

**Business Success:**
- Before 6:07 p. m. the order is invisible to Andrés; a direct link returns `OrderNotVisibleToCaller`.
- `OrderPaymentConfirmedByBusiness` is published once, so COM deducts once (see COM-S2).
- The 6 MB file left no reference on the order.

---

## Shortest Path (Q8)

1. **Buyer Order Detail (6.2)** — upload the comprobante, then "Ya pagué".
2. **Business Order Desk (6.3)** — view the comprobante, then "Recibí el pago".
3. **Buyer Order Detail (6.2)** — sees "Pago confirmado". ✓

---

## Trigger Map Connections

**Personas:** Camila (buyer); Andrés (business)

**Driving Forces Addressed:**
- ✅ **Want:** Recorded proof; separate, visible confirmations.
- ❌ **Fear:** A lost comprobante; a confirmation made on someone else's behalf.

**Business Goal:** AD-2 (three independent facts); AD-14, AD-15 (visibility).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| ORD-S2.1 | [`6.2-buyer-order-detail/`](6.2-buyer-order-detail/6.2-buyer-order-detail.md) | Upload (one file refused, one accepted); "Ya pagué" | The order becomes visible to the business |
| ORD-S2.2 | [`6.3-business-order-desk/`](6.3-business-order-desk/6.3-business-order-desk.md) | Comprobante viewer; "Recibí el pago" | Camila's view updates |
| ORD-S2.3 | [`6.2-buyer-order-detail/`](6.2-buyer-order-detail/6.2-buyer-order-detail.md) | Three facts, derived status "Pago confirmado" | Scenario success ✓ |

**First step** (ORD-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Refusal variants:**
- "Ya pagué" with no file returns `ComprobanteNotYetUploaded`. The banner replaces the button and offers "Subir comprobante".
- A renamed `.exe` gets the type variant of `ComprobanteInvalidFile`.
- A double tap on "Ya pagué" returns `OrderAlreadyConfirmedByRole` with the original time, and nothing changes.
