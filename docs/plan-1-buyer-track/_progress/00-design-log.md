# Design Log: TEZG — Buyer/Collector Track

**Project:** Pokémon TCG Marketplace and Collection Management Platform
**Track:** Buyer/Collector (docs/plan-1-buyer-track/)
**Method:** BMAD / Whiteport Design Studio (WDS)

---

## Progress

### 2026-09-04 — Phase 1: PRD Complete

**Agent:** bmad-prd
**Protagonist:** Valentina, 27, Bogotá — Release-Driven Collector (Priority 1), dual-role with Individual Seller (Priority 2)
**FRs:** FR-1 through FR-9
**Quality:** Adversarial review run, findings triaged

**Artifacts Created:**
- `prd.md` — Product Requirements Document (status: final)
- `addendum.md` — supporting depth (rejected alternatives, options considered)
- `review-prd-adversarial.md` — adversarial review findings
- `.memlog.md` — 17-entry audit trail

**Summary:** Established Valentina as the named protagonist across 4 user journeys (UJ-1..UJ-4: catalog discovery/price-trust, listing comparison, comprobante-based payment, dual-role order/sales tracking), each mapped to testable FRs citing SPEC.md CAPs and ARCHITECTURE-SPINE.md ADs as fixed invariants. FR-9 deliberately left a "[NOTE FOR PM]" seam marking the My Sales tab as summary-only, to be closed by the Seller/Business track.

**Next:** Phase 2 — UX Scenarios

---

### 2026-09-04 — Phase 2: UX Scenarios Complete

**Agent:** Saga (Scenario Outline)
**Scenarios:** 4 scenarios covering 10 pages
**Quality:** Excellent (all 4 scenarios: Completeness 7/7, Quality 7/7, Mistakes Avoided 7/7, Best Practices 4/4)

**Artifacts Created:**
- `C-UX-Scenarios/00-ux-scenarios.md` — Scenario index with coverage matrix
- `C-UX-Scenarios/01-valentina-finds-her-first-card/01-valentina-finds-her-first-card.md` — Scenario 01 outline
- `C-UX-Scenarios/01-valentina-finds-her-first-card/1.1-sign-up/1.1-sign-up.md` — Page spec
- `C-UX-Scenarios/01-valentina-finds-her-first-card/1.2-catalog-browse-filter/1.2-catalog-browse-filter.md` — Page spec
- `C-UX-Scenarios/01-valentina-finds-her-first-card/1.3-card-detail-view/1.3-card-detail-view.md` — Page spec
- `C-UX-Scenarios/02-valentina-picks-a-listing-she-trusts/02-valentina-picks-a-listing-she-trusts.md` — Scenario 02 outline
- `C-UX-Scenarios/02-valentina-picks-a-listing-she-trusts/2.1-listing-search-results-comparison/2.1-listing-search-results-comparison.md` — Page spec
- `C-UX-Scenarios/03-valentina-pays-without-a-payment-gateway/03-valentina-pays-without-a-payment-gateway.md` — Scenario 03 outline
- `C-UX-Scenarios/03-valentina-pays-without-a-payment-gateway/3.1-purchase-confirmation-screen/3.1-purchase-confirmation-screen.md` — Page spec
- `C-UX-Scenarios/03-valentina-pays-without-a-payment-gateway/3.2-comprobante-upload-payment-confirmation/3.2-comprobante-upload-payment-confirmation.md` — Page spec
- `C-UX-Scenarios/04-valentina-checks-her-orders-and-her-sales/04-valentina-checks-her-orders-and-her-sales.md` — Scenario 04 outline
- `C-UX-Scenarios/04-valentina-checks-her-orders-and-her-sales/4.1-orders-list/4.1-orders-list.md` — Page spec
- `C-UX-Scenarios/04-valentina-checks-her-orders-and-her-sales/4.2-order-detail/4.2-order-detail.md` — Page spec
- `C-UX-Scenarios/04-valentina-checks-her-orders-and-her-sales/4.3-add-to-collection-prompt/4.3-add-to-collection-prompt.md` — Page spec
- `C-UX-Scenarios/04-valentina-checks-her-orders-and-her-sales/4.4-my-sales-tab/4.4-my-sales-tab.md` — Page spec

**Summary:** Derived all 4 scenarios directly from the finalized PRD's UJ-1..UJ-4 (Suggest mode — all 8 dialog answers already fully specified in the PRD) rather than deriving a fresh Trigger Map, per the governing plan's track-scoping instruction; the whole-system `trigger-map.md` was cited only as background for Business Goal/Objective and persona grounding. Achieved 10/10 page coverage with zero repetition by assigning each page to exactly one scenario chain (Scenario 01 owns discovery pages, 02 owns comparison, 03 owns payment, 04 owns post-purchase/dual-role). During quality review, trimmed a zero-active-listings edge-case reference out of Scenario 01's Shortest Path (it belongs at the page-spec level, not in the sunshine path) and aligned the Scenario 01 file title with its folder slug for cross-reference consistency.

**Next:** Phase 3 — UX Design (`bmad-ux` + `wds-4-ux-design`)

---

### 2026-09-05 — Phase 3 Part A: UX Design Spines Complete

**Agent:** bmad-ux (Fast path)
**Scope:** DESIGN.md (visual identity) + EXPERIENCE.md (IA/behavior/states/accessibility/flows), scoped to the Buyer/Collector track's 4 scenarios and 10 pages
**Quality:** Reviewer Gate run with both lenses — `bmad-review-adversarial-general` (14 findings) and `bmad-review-edge-case-hunter` (42 findings) — all triaged; ~25 direct fixes applied, remaining low-stakes implementation-level items explicitly deferred to Phase 3 Part B/Phase 4; `doc_standards` editorial polish (structure + prose) applied last

**Artifacts Created:**
- `DESIGN.md` — "Trusted Ledger" visual identity spine (status: final)
- `EXPERIENCE.md` — IA/behavior/state-machine spine (status: final)
- `review-ux-adversarial.md` — adversarial review findings
- `review-ux-edge-cases.md` — edge-case review findings (JSON array)
- `.memlog.md` — extended to 36 entries

**Summary:** Drafted both spines directly from the already-fully-specified 4 scenario outlines and 10 page specs (Fast path — re-running slow Discovery elicitation on already-answered questions would have been redundant), batching genuinely open creative decisions into `[ASSUMPTION]` tags and escalating three consequential judgment calls to the user via AskUserQuestion rather than deciding them silently. The Reviewer Gate caught real gaps: the core individual-vs-business CTA distinction (Scenario 02's climax) was undefined, page 3.1's payment-details block had zero component coverage, the comprobante upload state machine was missing OS-picker-cancel/change-file/double-submission-guard paths, and the contact-message and abandoned-purchase outcomes were silently excluded from the IA's own "closure check" despite being in scope. All were resolved directly except the three genuine tradeoffs (currency display format, abandoned-purchase resume mechanism, comprobante file-type scope), which went to the user. Skipped bmad-ux's own key-screen-mock Finalize step since Phase 3 Part B (`wds-4-ux-design`/Freya) already owns detailed wireframing per the governing plan — producing HTML mocks here would have duplicated that work.

**Next:** Phase 3 Part B — Page specs & wireframes (`wds-4-ux-design`/Freya, one pass per scenario)

---

### 2026-09-05 — Phase 3 Part B: Page Specs & Wireframes Complete

**Agent:** `wds-4-ux-design` (Freya), [D] Dream Up mode, autonomous
**Scope:** Full development-ready page specification for all 10 pages across the track's 4 scenarios, plus dedicated wireframes for the 2 highest-complexity pages

**Artifacts Created (all under `C-UX-Scenarios/`, overwriting each page's step-15 starter stub in place):**
- 1.1-sign-up, 1.2-catalog-browse-filter, 1.3-card-detail-view
- 2.1-listing-search-results-comparison + `wireframes/2.1-listing-comparison.md`
- 3.1-purchase-confirmation-screen, 3.2-comprobante-upload-payment-confirmation + `wireframes/3.2-comprobante-states.md`
- 4.1-orders-list, 4.2-order-detail, 4.3-add-to-collection-prompt, 4.4-my-sales-tab

**Design Loop Status (adapted to this track's log format — logged in `.memlog.md` as a Phase 3B decision):**

| Scenario | Page | Status | Date |
|----------|------|--------|------|
| 01 | 1.1 Sign Up | specified | 2026-09-05 |
| 01 | 1.2 Catalog Browse & Filter | specified | 2026-09-05 |
| 01 | 1.3 Card Detail View | specified | 2026-09-05 |
| 02 | 2.1 Listing Search Results & Comparison | specified + wireframed | 2026-09-05 |
| 03 | 3.1 Purchase Confirmation Screen | specified | 2026-09-05 |
| 03 | 3.2 Comprobante Upload & Payment Confirmation | specified + wireframed | 2026-09-05 |
| 04 | 4.1 Orders List | specified | 2026-09-05 |
| 04 | 4.2 Order Detail | specified | 2026-09-05 |
| 04 | 4.3 Add-to-Collection Prompt | specified | 2026-09-05 |
| 04 | 4.4 My Sales Tab | specified | 2026-09-05 |

**Summary:** Skipped `wds-4-ux-design`'s steps-s (01-15) entirely — all 10 scenarios/pages already existed at the step-15 "starter document" level from the earlier `wds-3-scenarios` pass (Phase 2), so work began directly at steps-p (Specify). Adapted the module's `page-specification.template.md` to this track's actual constraints: dropped the bilingual SE/EN fields (`product_languages: [en]` only), repointed Spacing/Typography table references from a nonexistent `D-Design-System/00-design-system.md` to this track's own `DESIGN.md` frontmatter tokens, and used inline ASCII layout diagrams instead of raster sketch images. Ran in autonomous Dream mode per the Phase 2 handover decision, auto-chaining through all 10 pages without per-page halting. Beyond producing the specs, this pass directly closed 9 of the Phase 3A Reviewer Gate's findings at the page-spec level (see `.memlog.md` for the full list) — most notably giving page 2.1 an explicit CTA contrast mechanism and a surface for the contact-message outcome, and expanding page 3.2's state coverage well past the happy path (5 states plus 3 nested confirmation sub-states), directly answering the governing plan's explicit requirement that this page not ship happy-path-only. Promoted 2 of the 10 pages to dedicated wireframes (2.1, 3.2) per the plan's call-out; the remaining 8 were judged spine-only sufficient since their page-spec tables leave no layout/behavior ambiguity a visual reference would resolve.

**Next:** Judge whether Phase 3A's existing reviews (`review-ux-adversarial.md`, `review-ux-edge-cases.md`) provide sufficient coverage for Phase 3B's new artifacts, or whether a follow-up review pass is warranted; then Phase 4 (`bmad-architecture`).

---

## Key Decisions

| Date | Decision | Phase | By |
|------|----------|-------|-----|
| 2026-09-04 | Use Suggest mode (not step-by-step Conversation mode) for the 8-question scenario dialog, since all answers were already fully specified in the finalized PRD's UJs | Phase 2: Scenarios | Saga + Martin |
| 2026-09-04 | Source scenarios from the Phase 1 PRD's named-protagonist UJs instead of deriving a fresh Trigger Map, per the governing plan's track-scoping instruction | Phase 2: Scenarios | Saga + Martin |
| 2026-09-04 | design_intent = Dream Up (D) for all 4 scenarios heading into Phase 3, chosen by Martin to keep momentum given both tracks' remaining Phases 3-5 | Phase 2: Handover | Saga + Martin |
| 2026-09-05 | Reference price displays as its COP-converted equivalent only, never raw USD — keeps CAP-3's three price values in one comparable currency instead of forcing the buyer to mentally convert | Phase 3A: UX Design | Martin (user, via AskUserQuestion) |
| 2026-09-05 | An abandoned purchase (3.1 completed, 3.2 never finished) is not lost — it surfaces in Orders List as an unpaid order with a "Finish payment" action back to 3.2, rather than disappearing or blocking re-entry | Phase 3A: UX Design | Martin (user, via AskUserQuestion) |
| 2026-09-05 | Comprobante upload accepts PDF alongside images (not image-only as recommended), since bank apps frequently issue transfer confirmations as PDFs — user overrode the image-only recommendation | Phase 3A: UX Design | Martin (user, via AskUserQuestion) |
| 2026-09-05 | Mock coverage: promoted pages 2.1 and 3.2 to dedicated wireframes, kept the remaining 8 pages spine-only — an autonomous judgment call under Dream mode's Mode Override Rule (halt-and-ask suppressed by design), not escalated to the user; logged here for transparency rather than as a human-judgment entry | Phase 3B: Page Specs | Freya (autonomous Dream mode) |
