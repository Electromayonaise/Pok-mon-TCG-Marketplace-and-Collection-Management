---
design_intent: D
design_status: specified
module: COL
annex_scenario: 1
---

# COL-S1: Valentina Arranges Her Binder Her Way, and Every Page Reads the Same Twice

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-COL-1, FR-COL-4, FR-COL-5 (Annex scenario COL-1, Binder Layout and Sort)

---

## Transaction (Q1)

**What this scenario covers:**
- A collector keeps several named collections, with unique names regardless of case and accents.
- She views one collection as a binder: a chosen `rows × cols` layout, up to 3 sort keys, and pages that come out the same on every render.
- Filtered to one set, the binder footer shows completion against the catalog's full card count, secret rares included.
- She moves and copies entries between collections without losing their source.

---

## Business Goal (Q2)

**Goal:** CAP-10 and CAP-11: a binder that feels like a physical one, and named collections.
**Objective:**
- Deterministic pages: the final tie-break is always the entry id.
- Completion never exceeds 100 % and never counts sealed products or link-added entries.

---

## User & Situation (Q3)

**Persona:** Valentina (27, Bogotá, individual seller).
**Situation:** On 1 oct 2026 she opens "Kanto 151", her 120-entry collection, which includes 2 promos she added by link (COL-S2). She wants it sorted like her physical binder: by set, then by Pokémon. She also wants two new collections, "Favoritas" and "Para cambiar", to separate what she keeps from what she might trade.

---

## Driving Forces (Q4)

**Hope:** See her binder page by page, exactly as she files the physical one, and know how close she is to finishing the set.
**Worry:** An app that reshuffles her cards each time she opens it, or a completion figure that lies because of secret rares or sealed boxes.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Phone (R); she also checks it on a laptop.
**Entry:** Mi colección → Colecciones → "Kanto 151" (9.1).

---

## Best Outcome (Q7)

**User Success:**
- **Layout and sort.** In "Organizar" she keeps 3×3 and picks "Set" then "Pokémon", both ascending. The footer reads "Página 2 de 14". The 2 link-added promos are on the last page, after the catalog cards, sorted by their titles.
- **Same on every render.** She leaves and returns: page 2 shows the same 9 pockets in the same order.
- **Completion.** She filters to the set 151. The footer adds "37/191 (19 %)". The denominator comes from the catalog (secret rares numbered above the printed total are included), so owning every card would read exactly 100 %.
- **New collections.** She creates "Favoritas" and "Para cambiar". A second attempt with "favoritas" is refused in place: "Ya tienes una colección llamada «Favoritas». Elige otro nombre."
- **Copy.** She copies her Gardevoir ex (bought in TEZG) to "Favoritas". The copy keeps its source badge "Comprado en TEZG" and its order link.

**Business Success:**
- Layout and sort are saved per collection.
- Moves and copies require ownership of both collections; a foreign id gets the same "not found" as a missing one.

---

## Shortest Path (Q8)

1. **Collections & Binder (9.1)** — Colecciones list → "Kanto 151".
2. **Collections & Binder (9.1)** — Organizar: 3×3, Set ↑, Pokémon ↑ → page 2 of 14.
3. **Collections & Binder (9.1)** — Filter set 151 → "37/191 (19 %)". ✓

---

## Trigger Map Connections

**Persona:** Valentina

**Driving Forces Addressed:**
- ✅ **Want:** Her binder, her way, stable across visits.
- ❌ **Fear:** A completion figure she can't trust.

**Business Goal:** FR-COL-5 deterministic pages; FR-COL-1 named collections.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| COL-S1.1 | [`9.1-collections-binder/`](9.1-collections-binder/9.1-collections-binder.md) | Pick the collection | Open "Kanto 151" |
| COL-S1.2 | [`9.1-collections-binder/`](9.1-collections-binder/9.1-collections-binder.md) | Set layout and sort; page through | Filter to a set |
| COL-S1.3 | [`9.1-collections-binder/`](9.1-collections-binder/9.1-collections-binder.md) | Read completion | Scenario success ✓ |

**First step** (COL-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Manual order variant:** with the sort key "Manual" she drags Charizard ex to pocket 5. The keyboard and button equivalents ("Mover antes / después") give the same result, and the live region says "Charizard ex movida a la posición 5 de 9".

**Delete variant:** deleting "Para cambiar" opens a `<dialog>`: "Se eliminará «Para cambiar» y sus {n} cartas. Esto no se puede deshacer." Opening a deleted collection's link shows the Not-available page ("No encontramos esta colección en tu cuenta.").

**Layout on mobile:** a layout with 4 or 5 columns keeps the same page contents on a phone, shown as horizontally paged pockets rather than a scrolled strip (EXPERIENCE → Responsive).
