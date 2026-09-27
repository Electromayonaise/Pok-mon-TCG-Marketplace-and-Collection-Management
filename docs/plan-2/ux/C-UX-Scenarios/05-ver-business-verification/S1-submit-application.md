---
design_intent: D
design_status: specified
module: VER
annex_scenario: 1
---

# VER-S1: Andrés Applies to Become a Verified Shop

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VER-1, FR-VER-7, FR-IDN-4 (Annex scenario VER-1, Submit Application)

---

## Transaction (Q1)

**What this scenario covers:**
A business submits its application, with consent to process its legal identity recorded. Shape errors come back all at once, field by field, and nothing is created. A valid submission creates exactly one `Pending` application, and the status page explains what `Pending` allows.

---

## Business Goal (Q2)

**Goal:** PRD §1, "regulated personal data handled deliberately" (AD-13) and "semantically coherent".
**Objective:** Every `Pending` row has non-null consent fields. The applicant never needs more than one resubmission to fix shape errors (all issues come back in one response).

---

## User & Situation (Q3)

**Persona:** Andrés, a shop owner who has sold on Instagram for two years (UJ-3 step 1).
**Situation:** 30 sep 2026, at the shop counter after closing. He has his RUT as a PDF and a phone photo of his cédula. He types his NIT from memory.

---

## Driving Forces (Q4)

**Hope:** Get the verified badge so buyers trust him the way his Instagram followers do.

**Worry:** Handing his NIT and documents to a platform he doesn't know yet; a form that throws away what he typed.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop at the counter (R, wide).
**Entry:** Cuenta → Vender → "Vender como tienda" → 5.1. Before the form, the IDN guard (FR-IDN-4) has already confirmed that this account has no individual-seller profile.

---

## Best Outcome (Q7)

**User Success:**
- First submit: he left the Instagram link empty and typed the NIT as 900.123.456-3. The single summary reads "Revise 2 campos antes de continuar:", with both issues linked. The field messages are "Escriba el enlace de su Instagram o de su sitio web." and "El dígito de verificación no corresponde a este NIT. Revíselo en su RUT." Everything else he typed is kept.
- After fixing (-8) and submitting: 5.2 reads "Estamos revisando su tienda" with the Pending body copy (microcopy §1.1), "Solicitud enviada el 30 sep 2026, 9:12 p. m." and "Publicar mientras tanto".

**Business Success:**
- Exactly one `Pending` row, whose `legalIdentityConsentGivenAt` and `legalIdentityConsentVersion` are set.
- The invalid first attempt created no row and no stored documents.

---

## Shortest Path (Q8)

1. **Business Application Form (5.1)** — fill in, submit, fix both field errors, submit again.
2. **Application Status (5.2)** — the Pending copy and next steps. ✓

---

## Trigger Map Connections

**Persona:** Andrés — an informal seller becoming a verified shop

**Driving Forces Addressed:**
- ✅ **Want:** A trust badge; to keep selling during review.
- ❌ **Fear:** Exposing legal data; losing typed input.

**Business Goal:** AD-13 consent capture; FR-VER-1 aggregate validation.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VER-S1.1 | [`5.1-business-application-form/`](5.1-business-application-form/5.1-business-application-form.md) | Submit with consent; fix aggregated field errors | Lands in 5.2 |
| VER-S1.2 | [`5.2-application-status/`](5.2-application-status/5.2-application-status.md) | Pending status and what it allows | Scenario success ✓ |

**First step** (VER-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Refusal variants (first-fail, after shape validation):**
- A second submit while `Pending` gives `ApplicationAlreadyPending`.
- An account that already sells as an individual gets the UX-A-2 copy (`IndividualSellerProfileAlreadyComplete`, VER submit).
- An approved account gets `AlreadyVerifiedBusiness` (VER submit).
