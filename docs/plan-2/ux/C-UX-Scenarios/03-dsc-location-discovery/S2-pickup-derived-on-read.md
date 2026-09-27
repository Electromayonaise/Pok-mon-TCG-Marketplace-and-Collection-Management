---
design_intent: D
design_status: specified
module: DSC
annex_scenario: 2
---

# DSC-S2: "Recogida en persona" Is Never Stale

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-DSC-4, FR-IDN-6 (`getSellerKinds`) (Annex scenario DSC-2, Pickup Semantics)

---

## Transaction (Q1)

**What this scenario covers:**
Pickup is derived from the seller's kind on every request. It is never stored. When a seller's kind changes, for example when an individual becomes a business applicant, the next query reflects it without any listing write.

---

## Business Goal (Q2)

**Goal:** PRD §1, "semantically coherent". Individual sellers mean in-person pickup; shops mean in-app purchase.
**Objective:** The UI never shows "recogida en persona" on a shop row (FR-DSC-4 acceptance).

---

## User & Situation (Q3)

**Personas:**
- Camila, who browses;
- a developer, who proves the flip on the seller-kind stub.

**Situation:** A seller Camila saw yesterday as "recogida en persona" has since applied as a shop.

---

## Driving Forces (Q4)

**Hope (Camila):** The row tells her how the exchange works, and it is true today.
**Worry (Camila):** Showing up to a meeting with a shop that only sells in-app.
**Worry (developer):** Pickup cached on the listing and drifting from identity.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on mobile (R); the developer on desktop (H, `/dev/dsc`).
**Entry:** 3.1 (Camila); 3.2 → "Tipo de vendedor (stub)" (developer).

---

## Best Outcome (Q7)

**User Success:**
- Before the flip, the row reads "a 6,8 km · recogida en persona".
- After it, the same listing reads "a 6,8 km · tienda sin verificar · aún no se puede comprar".
- Neither row carries a stale label, because nothing about it was stored.

**Business Success:**
- `pickupAvailable` is computed from `identity.getSellerKinds` per request.
- Business rows always return `false`.

---

## Shortest Path (Q8)

1. **Nearby Listings (3.1)** — Camila sees the pickup row.
2. **Discovery Explanation Inspector (3.2)** — the developer flips the stub to `business`, runs the same query again, and the diff panel shows only `pickupAvailable` and the explanation parts changing. ✓

---

## Trigger Map Connections

**Personas:** Camila; developer

**Driving Forces Addressed:**
- ✅ **Want:** Exchange mode always true.
- ❌ **Fear:** Stale pickup flags.

**Business Goal:** AD-5 single query path; CAP-1.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| DSC-S2.1 | [`3.1-nearby-listings/`](3.1-nearby-listings/3.1-nearby-listings.md) | See a pickup row | Developer switches to 3.2 |
| DSC-S2.2 | [`3.2-discovery-explanation-inspector/`](3.2-discovery-explanation-inspector/3.2-discovery-explanation-inspector.md) | Flip the seller kind; run again; diff | Scenario success ✓ |

**First step** (DSC-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
