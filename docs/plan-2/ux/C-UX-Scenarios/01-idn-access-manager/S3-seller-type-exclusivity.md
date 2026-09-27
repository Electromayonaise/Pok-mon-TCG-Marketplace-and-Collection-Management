---
design_intent: D
design_status: specified
module: IDN
annex_scenario: 3
---

# IDN-S3: One Seller Type Per Account, Even Under a Race

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-IDN-4, FR-IDN-2, FR-VER-1; NFR-IDN-2 (Annex scenario IDN-3 and the mandatory edge case)

---

## Transaction (Q1)

**What this scenario covers:**
An account that already holds one seller type tries to take the other. The action is refused outright with an explanation; nothing is silently "graduated". Two simultaneous attempts produce exactly one winner.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified", together with AD-18 seller-type exclusivity.
**Objective:** The database never holds both states for one account. NFR-IDN-2 runs 100 repetitions and sees 0 double successes.

---

## User & Situation (Q3)

**Personas:**
- Valentina, 27, Bogotá. Her profile is complete, and she wonders about opening a shop.
- Andrés, a shop owner with a `Pending` application.

**Situation:** Valentina opens "Registrar mi tienda" (5.1). Separately, Andrés, curious, opens the individual-seller profile step (1.2).

---

## Driving Forces (Q4)

**Hope (Valentina):** Grow into a shop without starting over.
**Hope (Andrés):** Sell a few personal cards on the side.

**Worry:** Losing their current status or listings by pressing the wrong button.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Valentina uses mobile (R); Andrés uses desktop at the shop (R at ≥1024 px). The developer runs the race template (H).
**Entry:**
- Valentina: Cuenta → Vender → "Registrar mi tienda".
- Andrés: a direct link to the profile step.
- Developer: 1.1 → template "Carrera: perfil vs solicitud".

---

## Best Outcome (Q7)

**User Success:**
- Valentina reads why the account can't also be a shop, and what to do instead: use a separate account for the shop (assumption UX-A-2). The form never opens with fields she can't submit.
- Andrés reads "Tienes una solicitud de tienda registrada…", with a link to his application status.

**Business Success:**
Refusals return `IndividualSellerProfileAlreadyComplete` and `BusinessApplicationOnFile`, and no flags change. When the developer fires the race template in 1.1, it shows one `allowed` and one `rejected`, citing the state that won.

---

## Shortest Path (Q8)

1. **Business Application Form (5.1)** — Valentina sees a full-width refusal banner instead of the form. "Entendido" returns her to Cuenta.
2. **Individual-Seller Profile Step (1.2)** — Andrés sees the `BusinessApplicationOnFile` banner, and "Ver solicitud" goes to 5.2.
3. **Capability API Explorer (1.1, H)** — the race template fires both commands behind a barrier, and the result pane shows exactly one success. ✓

---

## Trigger Map Connections

**Personas:** Valentina (individual seller), Andrés (business)

**Driving Forces Addressed:**
- ✅ **Want:** A clear statement of what their account is.
- ❌ **Fear:** Silent status changes that cost them their listings.

**Business Goal:** AD-18 exclusivity; NFR-IDN-2 concurrency proof (NFR-SYS-10).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| IDN-S3.1 | [`../05-ver-business-verification/5.1-business-application-form/`](../05-ver-business-verification/5.1-business-application-form/5.1-business-application-form.md) | Individual seller is refused a business application | "Entendido" |
| IDN-S3.2 | [`1.2-individual-seller-profile-step/`](1.2-individual-seller-profile-step/1.2-individual-seller-profile-step.md) | Business applicant is refused the profile step | "Ver solicitud" |
| IDN-S3.3 | [`1.1-capability-api-explorer/`](1.1-capability-api-explorer/1.1-capability-api-explorer.md) | Simultaneous race: exactly one wins | Scenario success ✓ |

**First step** (IDN-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
