---
design_intent: D
design_status: specified
module: VER
annex_scenario: 2
---

# VER-S2: Sebastián Approves, and the Badge Appears

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VER-2, FR-VER-3, FR-VER-5, FR-INV-7, FR-INV-8, FR-COM-1 (Annex scenario VER-2, Admin Approval)

---

## Transaction (Q1)

**What this scenario covers:**
- An admin works the queue oldest-first, opens one application's review detail (the only place legal identity is visible) and approves it.
- The badge appears on the business's listings only after the approval event is handled.
- The commission account is created, starting at zero, so the listings stay paused until the first top-up.
- If two admins decide the same application at once, the one who loses sees who won. They never see an error page.

---

## Business Goal (Q2)

**Goal:** PRD §1, "verification only through an explicit admin action" (CAP-15) and "concurrency-safe".
**Objective:** 0 applications with a half-applied decision (NFR-VER-1). The queue order is total and stable.

---

## User & Situation (Q3)

**Persona:** Sebastián, Platform Admin (UJ-4 step 2), deciding Andrés's second application (UJ-3 step 6).
**Situation:** 8 oct 2026, 11:30 a. m. (virtual clock). Andrés reapplied at 10:05 a. m. The queue holds 3 Pending applications, and Andrés's row reads "1 solicitud anterior (rechazada)".

---

## Driving Forces (Q4)

**Hope:** Decide quickly with everything he needs in one view.

**Worry:** Approving something a colleague already rejected; leaving legal data exposed in a list.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (D, `/admin/solicitudes`).
**Entry:** Admin → Solicitudes (5.3). The queue is sorted oldest-first by submission time.

---

## Best Outcome (Q7)

**User Success:**
- In 5.3 the queue rows show name, city, Instagram link, age and prior count, but no NIT.
- Opening the detail reveals the NIT and documents, with the line "Esta consulta queda registrada en la auditoría."
- He taps "Aprobar" and confirms: "Aprobar la tienda de Andrés. Sus publicaciones recibirán la insignia de verificación y se abrirá su cuenta de comisión en $0."
- The row leaves the queue, and the live-region confirmation reads "Solicitud aprobada · 8 oct 2026, 11:34 a. m."
- Andrés's 5.2 reads "Su tienda está verificada" and "Recargue su saldo de comisión para empezar a vender."
- His 4.2 shows ✓ on every restored listing, plus "Pausada: se reactivará cuando recargues tu saldo" (fail-closed until the first top-up).

**Business Success:**
- One conditional transition, stamped with `decidedBy`/`decidedAt`, and the audit row in the same transaction.
- Exactly one `BusinessApplicationApproved` event.
- Before the event is handled, no listing carries the badge.

---

## Shortest Path (Q8)

1. **Admin Review Queue (5.3)** — queue → review detail → Aprobar.
2. **Application Status (5.2)** — Andrés sees "verificada".
3. **My Listings (4.2)** — badge on, paused until the first top-up. ✓

---

## Trigger Map Connections

**Personas:** Sebastián (admin); Andrés (applicant)

**Driving Forces Addressed:**
- ✅ **Want:** A fast, complete review; visible trust.
- ❌ **Fear:** A double decision; leaked legal data.

**Business Goal:** CAP-15, NFR-VER-1, AD-13.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VER-S2.1 | [`5.3-admin-review-queue/`](5.3-admin-review-queue/5.3-admin-review-queue.md) | Queue → detail (audited read) → approve | Andrés's view updates |
| VER-S2.2 | [`5.2-application-status/`](5.2-application-status/5.2-application-status.md) | Approved copy; next step is a top-up | → 4.2 |
| VER-S2.3 | [`../04-inv-listing-shared-inventory/4.2-my-listings/`](../04-inv-listing-shared-inventory/4.2-my-listings/4.2-my-listings.md) | Badge restored; paused (fail-closed) | Scenario success ✓ |

**First step** (VER-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Edge (mandatory, NFR-VER-1):**
- A second seeded admin has the same detail open and taps "Rechazar" 2 s after Sebastián's approval commits.
- That admin's dialog closes, and the detail re-renders read-only with the banner "Sebastián ya aprobó esta solicitud el 8 oct 2026, 11:34 a. m. La vista se actualizó con la decisión."
- No second event is published.
