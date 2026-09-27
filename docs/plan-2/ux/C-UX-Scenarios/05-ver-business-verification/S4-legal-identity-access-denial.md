---
design_intent: D
design_status: specified
module: VER
annex_scenario: 4
---

# VER-S4: Legal Identity Is Read in One Place Only, and Every Read Is Logged

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-VER-5, NFR-VER-2 (Annex scenario VER-4, Legal-Identity Access Denial)

---

## Transaction (Q1)

**What this scenario covers:**
- Legal identity (NIT or CC number and documents) is readable only through the admin review detail.
- Documents open through signed URLs that expire in 10 minutes.
- Every read is logged with the fields read.
- Every other path is refused with `LegalIdentityAccessDenied`, explained, and logged with the denied actor. That covers a non-admin session, another procedure, and another module's query.

---

## Business Goal (Q2)

**Goal:** PRD §1, "regulated personal data handled deliberately" (AD-13, AD-17; Ley 1581).
**Objective:** 100 % of reads and denials are audited (NFR-VER-2). There is no public object URL.

---

## User & Situation (Q3)

**Personas:**
- a developer probing the boundary;
- Sebastián auditing it.

**Situation:** A support ticket asks whether anyone outside the review queue can see a shop's NIT. Sebastián wants evidence, not reassurance.

---

## Driving Forces (Q4)

**Hope (Sebastián):** One screen that proves who saw what, and when.
**Worry (Sebastián):** A backdoor through another screen or API; an unlogged read.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (D); the developer on H.
**Entry:** Admin → Auditoría → "Accesos a datos legales" (5.4).

---

## Best Outcome (Q7)

**User Success:**
- The developer, signed in as Camila (a buyer) in 1.1, calls `identity.getApplicationForReview`. The Decision panel shows `LegalIdentityAccessDenied` with the message "Los datos legales de una tienda solo se consultan desde la revisión de solicitudes. Este intento quedó registrado."
- The public business-profile query that other modules use (called from 1.1) returns the shop data with no legal-identity field at all; the response shape is shown.
- Sebastián opens Andrés's RUT from 5.3 at 11:31 a. m. The document opens, and after 10 minutes "Volver a abrir el documento" issues a new link.
- In 5.4, filtered by Andrés's application, there are two rows:
  - "Lectura · Sebastián · número, documento 1 · 8 oct 2026, 11:31 a. m.";
  - "Denegado · Camila (sin permisos de administrador) · 8 oct 2026, 11:40 a. m.".

**Business Success:**
- Access-log count = instrumented reads in the test suite.
- Signed URLs expire at 10 minutes.
- Denied attempts never return partial data.

---

## Shortest Path (Q8)

1. **Capability API Explorer (1.1)** — a non-admin call, denied and logged.
2. **Admin Review Queue (5.3)** — the one legitimate read path: detail plus document viewer.
3. **Legal-Identity Access Audit (5.4)** — both rows, filtered by application. ✓

---

## Trigger Map Connections

**Persona:** Sebastián — the admin accountable for regulated data

**Driving Forces Addressed:**
- ✅ **Want:** Provable scoping; a complete audit.
- ❌ **Fear:** Hidden access paths.

**Business Goal:** AD-13, NFR-VER-2.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| VER-S4.1 | [`../01-idn-access-manager/1.1-capability-api-explorer/`](../01-idn-access-manager/1.1-capability-api-explorer/1.1-capability-api-explorer.md) | A crafted non-admin read, denied | → 5.3 |
| VER-S4.2 | [`5.3-admin-review-queue/`](5.3-admin-review-queue/5.3-admin-review-queue.md) | The only legitimate read (audited) | → 5.4 |
| VER-S4.3 | [`5.4-legal-identity-access-audit/`](5.4-legal-identity-access-audit/5.4-legal-identity-access-audit.md) | Read and denial rows | Scenario success ✓ |

**First step** (VER-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**Denial prober (fixtures only):** 5.4 carries an H-only panel, "Probar accesos", that runs the denial matrix. It covers the non-admin caller, the wrong procedure and cross-module queries, and asserts one denial row per attempt.
