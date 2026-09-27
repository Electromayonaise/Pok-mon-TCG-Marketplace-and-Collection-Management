---
design_intent: D
design_status: specified
module: REP
annex_scenario: 3
---

# REP-S3: Tienda Andrés Reads 4,3, Not 4,2, and the Hidden Review Counts Nowhere

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-REP-3 (Annex scenario REP-3, Aggregate Reputation); FR-REP-7; NFR-REP-2; UJ-1 step 2

---

## Transaction (Q1)

**What this scenario covers:**
- The profile shows the average to one decimal, computed from visible reviews only with a stated rule: half up, from the integer sum and count.
- The average, the count and the list come from one read, so they never disagree.
- A profile with no visible reviews says "Aún no tiene reseñas", never "0,0".
- Reviews are listed newest first, 20 per page, each with its rating, text, date, "Compra verificada" where it applies, and "editada" where it applies.
- A hidden review is never shown to anyone but its author and the admins, and it counts nowhere.

---

## Business Goal (Q2)

**Goal:** CAP-7, a reputation that means what it says.
**Objective:**
- Andrés's 12 visible reviews (sum 51) read "4,3", not "4,2" (FR-REP-3 acceptance, `ADD-§2.9`).
- A profile read (aggregate plus the first page) takes p95 ≤ 300 ms, and a hide shows on the very next read (NFR-REP-2).

---

## User & Situation (Q3)

**Persona:** Camila, buyer (UJ-1).
**Situation:** 12 oct 2026, before she buys. On the Charizard ex detail (2.2) she taps the seller's name, "Tienda Andrés", to see whether the shop is trustworthy.

**Seed branch.** The REP scenarios run on the seed branch in which Tienda Andrés is Approved (PRD §3: the Approved business that was rejected once and re-applied). The PRD §20 seed gives it 13 reviews: 12 visible with ratings summing to 51, and 1 hidden. The seed's review dates are set in Phase 3 and must fall after the shop's approval.

---

## Driving Forces (Q4)

**Hope:** A quick, honest read of the shop before paying by transfer.
**Worry:** An inflated number, or an average that doesn't match the reviews under it.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Mobile (R).
**Entry:** 2.2 → seller name → 11.2 (`/perfil/<userId>`).

---

## Best Outcome (Q7)

**User Success:**
- **Summary.** "4,3" in the price-figure style, four filled stars and one empty, read aloud as "4,3 de 5", then "12 reseñas · De compras verificadas".
- **List.** The 12 visible reviews, newest first, each with "Compra verificada" and its date. The hidden one is not in the list and not in the count, and nothing marks the gap.
- **After her own review (REP-S1, 16 oct).** "4,3 · 13 reseñas": the sum is 56, and 56 / 13 = 4,31.

**Business Success:**
- `average = round_half_up(10 × 51 / 12) / 10 = round_half_up(42,5) / 10 = 4,3`. A float average would show 4,25, and rounding it half-to-even gives 4,2.
- The page never computes the average itself: it formats the integer tenths the server returns (43 → "4,3").

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — tap "Tienda Andrés".
2. **Seller Reputation Profile (11.2)** — read the summary and the reviews. ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** A rating she can trust at a glance.
- ❌ **Fear:** An average that disagrees with the list.

**Business Goal:** FR-REP-3 stated rounding; FR-REP-7 profile content.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| REP-S3.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | Open the seller's profile | Seller name |
| REP-S3.2 | [`11.2-seller-reputation-profile/`](11.2-seller-reputation-profile/11.2-seller-reputation-profile.md) | Read the aggregate and the list | Scenario success ✓ |

**First step** (REP-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**The author of the hidden review** sees it on Andrés's profile, in its date position, as a card with the tombstone "Oculta por moderación de TEZG: {motivo}." It is still left out of the count and average they see. No one else sees it.

**No reviews yet:** a shop approved today has "Aún no tiene reseñas" instead of the average and the stars. The provenance label still shows, so the reader knows what kind of reviews will appear.

**Individual seller:** the same summary with "Las reseñas no están ligadas a compras" (REP-S2) and no "Compra verificada" markers.

**More than 20:** "Ver más reseñas" appends the next 20. The summary always covers every visible review, not just the loaded pages.

**Hide between reads:** if an admin hides a review while the profile is open, the next load or "Ver más reseñas" shows the new count and average, and the list without it (NFR-REP-2: no cache). An already-loaded page is not rewritten in place.
