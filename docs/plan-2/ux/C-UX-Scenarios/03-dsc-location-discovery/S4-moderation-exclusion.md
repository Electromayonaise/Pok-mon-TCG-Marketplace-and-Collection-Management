---
design_intent: D
design_status: specified
module: DSC
annex_scenario: 4
---

# DSC-S4: Hidden Means Gone From the Next Search

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-DSC-6, FR-REP-4 (Annex scenario DSC-4, Moderation Exclusion)

---

## Transaction (Q1)

**What this scenario covers:**
Sebastián hides a listing. Camila's very next search no longer returns it, because there is no cache at launch. The record is kept, and the moderation view still lists it.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified".
**Objective:** A hide takes effect on the next query (FR-DSC-6), and its audit trail is complete (FR-REP-6).

---

## User & Situation (Q3)

**Personas:**
- Sebastián, admin;
- Camila, buyer.

**Situation:** While searching listings in the moderation view, Sebastián finds one whose description sells a "proxy" as an original Charizard. He judges it a counterfeit (`Counterfeit`, "Falsificación"). In-app user reports are out of scope (PRD §5, §20), so moderation starts from the admin's own search.

---

## Driving Forces (Q4)

**Hope (Sebastián):** Hide it now and see that it's gone, without deleting evidence.
**Worry (Sebastián):** A cache that keeps showing it for an hour.
**Worry (Camila):** Nothing. She simply never sees it again.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Sebastián on desktop (D); Camila on mobile (R).
**Entry:** Admin → Moderación (11.3) → "Buscar publicación" → "Ocultar publicación".

---

## Best Outcome (Q7)

**User Success:**
- In 11.3 the item reads "Oculta · Falsificación · por Sebastián · 1 oct 2026, 10:02 a. m.".
- In 3.1, Camila's next search has one fewer row, with no gap and no notice (hidden items are simply absent for buyers).

**Business Success:**
- `hiddenAt` is set and the row is retained.
- 3.2's "Excluidas por estado" count shows `hidden: 1`.

---

## Shortest Path (Q8)

1. **Moderation Queue (11.3)** — Sebastián hides the listing with a reason.
2. **Nearby Listings (3.1)** — Camila's next search excludes it.
3. **Discovery Explanation Inspector (3.2)** — the developer or admin view shows it as excluded by `hiddenAt`. ✓

---

## Trigger Map Connections

**Personas:** Sebastián; Camila

**Driving Forces Addressed:**
- ✅ **Want:** An immediate, auditable hide.
- ❌ **Fear:** A lingering cached listing; lost evidence.

**Business Goal:** FR-DSC-6, FR-REP-6.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| DSC-S4.1 | [`../11-rep-reputation-moderation/11.3-moderation-queue/`](../11-rep-reputation-moderation/11.3-moderation-queue/11.3-moderation-queue.md) | Hide the listing with a reason | Camila searches |
| DSC-S4.2 | [`3.1-nearby-listings/`](3.1-nearby-listings/3.1-nearby-listings.md) | Next query excludes it | Developer verifies |
| DSC-S4.3 | [`3.2-discovery-explanation-inspector/`](3.2-discovery-explanation-inspector/3.2-discovery-explanation-inspector.md) | Exclusion counted by state | Scenario success ✓ |

**First step** (DSC-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
