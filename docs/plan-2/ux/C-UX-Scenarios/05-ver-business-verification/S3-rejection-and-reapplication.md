---
design_intent: D
design_status: specified
module: VER
annex_scenario: 3
---

# VER-S3: Rejected for a Reason, With a Date to Come Back

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VER-4, FR-VER-6, FR-VER-7, FR-VER-8, FR-INV-8 (Annex scenario VER-3, Rejection and Explanation — reapplication decided)

---

## Transaction (Q1)

**What this scenario covers:**
An admin rejects with a policy reason and an optional note. The application snapshots the reason's policy at decision time, as a cooldown until an exact instant or as barred. The applicant sees the reason, the note and the reapply condition. The form enforces the date openly, and later policy edits never touch a decision already made.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified" and "explainable" (Plan-2 reapplication decision, superseding Plan-1 OQ4).
**Objective:** Every rejection shown to an applicant carries a reason and a condition taken from the snapshot, and none of it contains internal codes.

---

## User & Situation (Q3)

**Personas:**
- Sebastián, deciding;
- Andrés, reading the decision (UJ-3 steps 4–6).

**Situation:** 1 oct 2026, 10:00 a. m. The NIT Andrés typed (900.123.456-8) doesn't match the one on the attached RUT.

---

## Driving Forces (Q4)

**Hope (Andrés):** Know exactly what was wrong and when he can try again.
**Worry (Andrés):** A silent "no", or losing his listings for good.
**Hope (Sebastián):** A reason list that fits real cases, and a note that helps.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Sebastián on desktop (D); Andrés on his phone (R).
**Entry:** 5.3 detail → "Rechazar".

---

## Best Outcome (Q7)

**User Success:**
- In the 5.3 dialog Sebastián picks "Los datos no coinciden con los documentos · puede volver a solicitar en 7 días" and writes the note "El NIT del formulario no coincide con el del RUT adjunto." The note field reminds him: "No incluya números de documento: la tienda verá esta nota."
- Andrés's 5.2 reads "No pudimos verificar su tienda · Los datos que ingresó no coinciden con sus documentos. El NIT del formulario no coincide con el del RUT adjunto. Puede volver a solicitar desde el 8 oct 2026, 10:00 a. m."
- His listings in 4.2 read "Retirada…".
- On 5.1, before that instant, the form is available to fill in, but the submit area is replaced by "Aún no puede volver a solicitar. Podrá hacerlo desde el 8 oct 2026, 10:00 a. m." At 10:00:00 the button appears.
- Barred variant (a seeded `FraudSuspected` account): 5.2 reads "…Esta decisión es definitiva para esta cuenta." and 5.1 shows no form.

**Business Success:**
- `reapplyNotBefore` equals `decidedAt` + 7 days exactly.
- A later 5.5 edit (DataMismatch 7 → 14 days) leaves this snapshot unchanged, and the change row records before and after.
- One `BusinessApplicationRejected` event.

---

## Shortest Path (Q8)

1. **Admin Review Queue (5.3)** — reject, with a reason and a note.
2. **Application Status (5.2)** — reason, note and exact reapply instant.
3. **Business Application Form (5.1)** — gated until the instant, then open.
4. **Rejection-Reason Policy (5.5)** — a later cooldown edit that doesn't reach past decisions. ✓

---

## Trigger Map Connections

**Personas:** Andrés; Sebastián

**Driving Forces Addressed:**
- ✅ **Want:** A clear reason and a date; configurable policy.
- ❌ **Fear:** Silent rejection; retroactive policy changes.

**Business Goal:** FR-VER-4, FR-VER-6, FR-VER-8.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VER-S3.1 | [`5.3-admin-review-queue/`](5.3-admin-review-queue/5.3-admin-review-queue.md) | Reject with a policy reason and a note | Andrés's view updates |
| VER-S3.2 | [`5.2-application-status/`](5.2-application-status/5.2-application-status.md) | Reason, note, cooldown instant (or barred) | "Volver a solicitar" |
| VER-S3.3 | [`5.1-business-application-form/`](5.1-business-application-form/5.1-business-application-form.md) | Visible date gate; opens at the exact instant | Resubmits (→ S2) |
| VER-S3.4 | [`5.5-rejection-reason-policy/`](5.5-rejection-reason-policy/5.5-rejection-reason-policy.md) | Edit a cooldown; snapshot unaffected | Scenario success ✓ |

**First step** (VER-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Boundary proof:** the 1.1 API explorer, with the virtual clock at 8 oct 2026, 9:59:59 a. m., returns `ReapplicationCooldownActive`. At 10:00:00 a. m. it returns `Pending`.
