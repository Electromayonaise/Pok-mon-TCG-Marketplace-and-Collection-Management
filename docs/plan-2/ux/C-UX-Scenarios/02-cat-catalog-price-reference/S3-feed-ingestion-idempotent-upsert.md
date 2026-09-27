---
design_intent: D
design_status: specified
module: CAT
annex_scenario: 3
---

# CAT-S3: Sebastián Ingests the Nightly Feed, Twice

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-CAT-3, FR-CAT-4 (Annex scenario CAT-3, Feed Ingestion & Idempotent Upsert, plus the mandatory edge case "attribute change keeps `catalogEntryId`")

---

## Transaction (Q1)

**What this scenario covers:**
Sebastián runs the 10,000-row feed and reads the counts. He inspects the 50 quarantined rows by reason, then reruns the same file and sees nothing duplicated. A second file renames cards and corrects artists: the entries keep their ids, and each change leaves a revision.

---

## Business Goal (Q2)

**Goal:** PRD §1, "independently testable" and "semantically coherent". A card exists once.
**Objective:** A rerun gives `created=0` and `updated=0` (NFR-CAT-2). No listing, binder entry or wishlist item is orphaned by an attribute change.

---

## User & Situation (Q3)

**Persona:** Sebastián, Platform Admin.
**Situation:** It's the start of UJ-4. The scheduled run failed overnight, so he starts it by hand, and a second correction file arrived from the feed provider.

---

## Driving Forces (Q4)

**Hope:** Confidence that one button press does exactly what the counts say.

**Worry:** Duplicated cards after a retry, or a rename breaking every collector's binder.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (D).
**Entry:** Admin rail → Catálogo (2.3).

---

## Best Outcome (Q7)

**User Success:**
- Run summary "Creadas 9.950 · Actualizadas 0 · Sin cambios 0 · En cuarentena 50", with the quarantine filterable by 5 reasons.
- Rerun: "Creadas 0 · Actualizadas 0 · Sin cambios 9.950 · En cuarentena 50".
- Change file: "Actualizadas 30", with a revisions tab that shows before → after.

**Business Success:**
`FeedRunInProgress` blocks a concurrent start with an explanation. Every quarantined row carries its reason and raw row, and nothing is partially applied.

---

## Shortest Path (Q8)

1. **Feed Ingestion Console (2.3)** — "Iniciar ingesta" → progress → summary.
2. **Feed Ingestion Console (2.3), Cuarentena tab** — filter by reason; open a raw row.
3. **Feed Ingestion Console (2.3)** — rerun the same file; the counts show convergence.
4. **Feed Ingestion Console (2.3), Revisiones tab** — the 30 changes keep their ids. ✓

---

## Trigger Map Connections

**Persona:** Sebastián — Platform Admin

**Driving Forces Addressed:**
- ✅ **Want:** Predictable, auditable ingestion.
- ❌ **Fear:** Duplicates and orphaned references.

**Business Goal:** NFR-CAT-2; NFR-SYS-8 (a feed run is an audited admin action).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| CAT-S3.1 | [`2.3-feed-ingestion-console/`](2.3-feed-ingestion-console/2.3-feed-ingestion-console.md) | Run, inspect quarantine, rerun, inspect revisions | Scenario success ✓ |

**First step** (CAT-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
