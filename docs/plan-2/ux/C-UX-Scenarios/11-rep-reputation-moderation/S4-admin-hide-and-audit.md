---
design_intent: D
design_status: specified
module: REP
annex_scenario: 4
---

# REP-S4: Sebastián Hides a Harassing Review and a Counterfeit Listing, and the Audit Shows Each Once

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-REP-4, FR-REP-5, FR-REP-6 (Annex scenario REP-4, Admin Hide and Audit); FR-DSC-6, FR-INV-10; NFR-REP-2, NFR-REP-3; NFR-SYS-8; UJ-4 step 5

---

## Transaction (Q1)

**What this scenario covers:**
- An admin hides a review or a listing with a policy reason and a note. Nothing is deleted.
- A hidden review stops counting in the target's rating on the next read; a hidden listing disappears from browse and detail on the next read.
- Each hide and unhide writes one log row in its own module, and the combined audit view (11.4) shows each exactly once.
- A second hide of something already hidden is an explained no-op; unhide restores the prior state exactly.

---

## Business Goal (Q2)

**Goal:** CAP-28, moderation that hides without deleting and leaves a full trail (PRD §1, "defensively specified").
**Objective:**
- Hide then unhide restores the prior aggregate exactly, with 2 log rows (FR-REP-4 acceptance).
- A hidden counterfeit listing is absent from browse on the next call and present in the moderation view with its reason (FR-REP-5 acceptance).
- 0 hard deletes (NFR-REP-3).

---

## User & Situation (Q3)

**Persona:** Sebastián, admin (UJ-4).
**Situation:** 1 oct 2026, the seed day. In-app user reports are out of scope (PRD §5), so he moderates from his own searches.
- **10:02 a. m.** He hides a listing «Charizard ex» whose description sells a proxy as an original (DSC-S4). Reason: Falsificación.
- **10:06 a. m.** Searching Valentina's reviews, he finds a 1-star review whose text insults her personally. Reason: Acoso.

**Scenario fixture** (the §3 seed does not fix these rows): the listing belongs to the seed individual seller "Coleccionista 88"; the review is by the seed buyer "Coleccionista 231". The names are illustrative. Before the hide, Valentina's profile has 7 visible reviews summing 29 stars ("4,1 · 7 reseñas").

---

## Driving Forces (Q4)

**Hope:** Take harmful content down now, say why, and be able to prove it later.
**Worry:** Hiding the wrong thing by mistake; a cache that keeps showing it; losing the evidence.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (D), ≥1280 px.
**Entry:** Admin rail → Moderación (11.3, `/admin/moderacion`) → "Buscar".

---

## Best Outcome (Q7)

**User Success:**
- **The review.** He searches "Reseñas" for "Valentina" and opens the 1-star row. The side panel shows the full text, the author, the date and "Visible". He taps "Ocultar…". The dialog reads "Ocultar la reseña de Coleccionista 231 sobre Valentina. Dejará de contar en su calificación de inmediato. La autora o el autor verá el motivo." He picks "Acoso", writes the note "Insultos personales contra la vendedora.", and confirms "Ocultar".
- **In place.** The panel status reads "Oculta · Acoso · por Sebastián · 1 oct 2026, 10:06 a. m.", and the live region says "Ocultó la reseña. La calificación de Valentina ahora es 4,7 · 6 reseñas."
- **The listing** (10:02 a. m., DSC-S4). The same flow with "Publicaciones": the dialog reads "Ocultar la publicación «Charizard ex» de Coleccionista 88. Desaparece de búsquedas y del detalle de inmediato; los pedidos e intercambios ya acordados siguen su curso." Reason "Falsificación".
- **The audit.** On 11.4 (Auditoría → Moderación), filtered to 1 oct 2026, both actions appear once each, newest first: 10:06 a. m. review · Ocultó · Acoso · Sebastián; 10:02 a. m. listing · Ocultó · Falsificación · Sebastián.

**Business Success:**
- Valentina's aggregate: 28 / 6 = 4,67 → "4,7", on the very next read.
- The review row keeps `hiddenAt`, `hiddenBy`, `hiddenReason`; one `ReviewModerationLog` row and one `ListingModerationLog` row are written.
- The listing is gone from 3.1 and 2.2 on the next call; its detail link shows the Not-available page; new orders and offers get `ListingNotFound` (FR-REP-5).

---

## Shortest Path (Q8)

1. **Moderation Queue (11.3)** — search, open the row, "Ocultar…".
2. **Moderation Queue (11.3)** — confirm in the dialog; the panel shows the new status.
3. **Moderation Audit (11.4)** — the action appears once. ✓

---

## Trigger Map Connections

**Persona:** Sebastián

**Driving Forces Addressed:**
- ✅ **Want:** An immediate hide with a stated reason, and a trail.
- ❌ **Fear:** A mistaken or silent hide; lost evidence.

**Business Goal:** FR-REP-4/5/6; NFR-REP-2 (effective on the next read); NFR-REP-3 (never deleted).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| REP-S4.1 | [`11.3-moderation-queue/`](11.3-moderation-queue/11.3-moderation-queue.md) | Find the review; open the side panel | "Ocultar…" |
| REP-S4.2 | [`11.3-moderation-queue/`](11.3-moderation-queue/11.3-moderation-queue.md) | Restate, pick the reason, confirm | "Ocultar" |
| REP-S4.3 | [`11.4-moderation-audit/`](11.4-moderation-audit/11.4-moderation-audit.md) | Check the trail | Scenario success ✓ |

**First step** (REP-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**What the affected people see:**
- **Coleccionista 231** sees the review on Valentina's profile, and on 11.1, as "Oculta por moderación de TEZG: Acoso." The note is not shown to them.
- **Coleccionista 88** sees the listing on 4.2 under "Ocultas" with "Oculta por moderación de TEZG: Falsificación. {nota}. Los compradores no la ven." and "Contactar a soporte" (the microcopy §3 owner copy includes the note).
- **Everyone else** sees neither; nothing marks the gap.

**Double hide:** at 10:09 a. m. a second tab still shows the review as visible and Sebastián taps "Ocultar" again. Nothing changes, and a notice banner reads "Ya estaba oculta desde el 1 oct 2026, 10:06 a. m. por Sebastián (Acoso)." The no-op writes no log row, so the audit still shows the hide once.

**Other reason:** with "Otro (requiere nota)" and a note under 10 characters, "Ocultar" keeps the dialog open and the note field shows "Escriba una nota de al menos 10 caracteres para «Otro»." The counter reads "{n}/500"; the button is never disabled for this (EXPERIENCE, primary action discipline).

**Unhide (variant):** "Mostrar de nuevo" on the panel restores the review at once. Valentina's profile reads "4,1 · 7 reseñas" again, exactly as before, and 11.4 shows 2 rows for it: Ocultó, Mostró de nuevo. The main story does not unhide it; REP-S2's figures start from the hidden state.

**Existing commitments:** hiding a listing doesn't cancel anything already agreed: an existing order on it proceeds, an accepted trade proceeds, and open offers stay visible to their two parties (FR-REP-5 [ASSUMPTION]).

**Concurrent hide and post (NFR-REP-1):** a hide racing a new review on the same target, ×100, leaves `count` and `sum` equal to the set of visible committed reviews. REP has no H console; this is an integration test, noted on 11.3.
