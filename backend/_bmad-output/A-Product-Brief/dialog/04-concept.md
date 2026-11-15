# Step 7a: Product Concept

**Completed:** 2026-08-24
**Session:** 1

---

## Purpose

Capture the designer's STRUCTURAL vision - the founding principle or key feature that defines the product concept.

**Not just requirements - the IDEA.**

---

## Concept Exploration

**Agent asked:**
With vision, positioning, and target users established, what's the organizing structural principle — referencing SPEC.md's existing constraint that the catalog is never a derived view of listings (a card exists independent of whether it's listed) as a possible starting point. Also asked for the entry point (catalog-first vs. personal-collection-first vs. market-activity-first) and whether an existing product's *structure* was being borrowed from.

**User described:**
Provided concrete reference screenshots rather than abstract description:
- **Catalog structure** modeled on tcgwatchtower.com: browse by Set → see ranked "Chase Cards" + full card grid → click a card → detail view with market price and buy-source links (Amazon/eBay/TCGplayer in the reference).
- **Binder structure** modeled on pkmnbindr.com: create a named binder, configurable grid (rows/columns, combinable slots), collection-progress tracking, toggles (show market price on cards, dim missing/collected cards, hide "missing" badge), custom card sorting, multi-page support (up to 100 pages / 500 cards in the reference), and add-a-card either by selecting from the registered catalog or by pasting a link for a card not yet indexed.

---

## Deep Dive

### Core Structural Idea

**The founding principle:**
**One canonical card, three lenses.** Every card lives once in the catalog (Set → card → detail), and that same catalog entry is simultaneously viewable through three lenses that all point back to it rather than existing as separate records: the **marketplace lens** (who's selling it, at what price — individual sellers external-handoff, verified businesses in-platform, per SPEC.md), the **collection/binder lens** (do I own it, where does it sit in my binder), and the **market lens** (price history/trend). This directly extends SPEC.md's existing constraint that the catalog is never a derived view of listings.

**Concrete example:**
A user browses Delta Reign (ME6) → sees Mega Rayquaza ex as a Chase Card ranked by price → clicks it → sees market price + trend + who's selling it locally (marketplace lens, replacing tcgwatchtower's external-retailer links with in-platform Colombian sellers) → if they own a copy, the same card also appears in their binder (collection lens) with its current value contributing to `GetCollectionValueHistory`.

### Why This Matters

**User's rationale:**
Confirmed ("yes") to both: (1) the one-card/three-lenses structural model, and (2) carrying over pkmnbindr's "add via link" fallback for cards not yet in the registered catalog (promos, errors, very new releases).

**Problem it solves:**
Avoids the exact fragmentation the Vision names — instead of three separate tools each holding their own partial copy of "this card" (eBay's listing, PriceCharting's price record, Collectr's collection entry), there's one card record with multiple views, so price, ownership, and marketplace availability never drift out of sync with each other.

---

## Reflection Checkpoint

**Agent's synthesis:**
Catalog IA borrows tcgwatchtower.com (set-first browse → chase cards/grid → detail-with-buy-panel), binder borrows pkmnbindr.com (configurable grid, progress tracking, display toggles, multi-page, add-by-selection-or-link). The structural principle unifying them: one canonical catalog card viewed through marketplace/collection/market lenses, replacing tcgwatchtower's external-retailer buy links with the platform's own local marketplace listings.

**User response:**
- [x] Confirmed
- [ ] Corrected

**Corrections (if any):**
None.

---

## Concept Documentation

**Core concept:**
One canonical card, three lenses (marketplace, collection/binder, market/price) — all reading from and writing back to a single catalog entry per SPEC.md's catalog-independence constraint.

**Implementation principle:**
Catalog IA: Set → Chase Cards + full grid → Card Detail (market price + trend + local buy sources). Binder IA: named, multi-page virtual binders with configurable grid, display toggles (price visibility, missing/collected dimming), custom sorting, and cards addable either from the catalog or via link (for not-yet-indexed cards).

**Example:** Mega Rayquaza ex — same catalog entry shows as a Chase Card in Delta Reign's set page, as a priced/tracked item in a user's binder if owned, and carries local marketplace listings instead of external retailer links.

---

## Related Features

Features that stem from this concept:
1. Set-first catalog browsing with a "Chase Cards" (ranked by market price) highlight view.
2. Card detail view unifying market price/trend + local marketplace listings (replacing external retailer links with in-platform Colombian sellers/businesses).
3. Configurable virtual binder: grid size, combinable slots, multi-page, collection-progress tracking, display toggles (price visibility, missing/collected dimming), custom sorting.
4. "Add to binder via link" fallback for cards not yet in the registered catalog (promos, errors, very new releases) — a new signal for the catalog/collection capability, alongside the location/distance filtering signal from Step 7.

---

**Documented in:** `wds-project-outline.yaml` → `product_concept`
**Impacts:** Navigation structure, information architecture, feature priorities
