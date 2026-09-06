# Design Log: TEZG — Seller/Business Track

**Project:** Pokémon TCG Marketplace and Collection Management Platform
**Track:** Seller/Business (docs/plan-1-seller-track/)
**Method:** BMAD / Whiteport Design Studio (WDS)

---

## Progress

### 2026-09-04 — Phase 1: PRD Complete

**Agent:** bmad-prd
**Protagonists:** Valentina (Individual Seller, Priority 2 — same protagonist as the Buyer/Collector track, now in her seller role) covering S1-S2; Andrés (Verified Business, Priority 4 — new protagonist) covering S3-S4
**FRs:** FR-S1 through FR-S9
**Quality:** Adversarial review run (11 findings: 7 own-track, 3 cross-track vs. Buyer-track prd.md, 1 minor), all triaged via autofix

**Artifacts Created:**
- `prd.md` — Product Requirements Document (status: final)
- `addendum.md` — supporting depth (rejected single-composite-protagonist alternative, sourcing notes)
- `review-prd-adversarial.md` — adversarial review findings
- `.memlog.md` — 17-entry audit trail

**Summary:** Established two protagonists across two mutually-exclusive seller-type axes (Individual Seller vs. Verified Business — distinct from the Buyer track's dual buyer/individual-seller coexistence axis), mapped to 4 scenarios (S1-S4) and 9 FRs citing SPEC.md CAPs and ARCHITECTURE-SPINE.md ADs as fixed invariants. Directly closes the seam Buyer-track FR-9 left open (full individual-seller listing management). Comprobante-ACL and Order-read-ownership were deliberately not re-opened as this track's own architecture questions — logged as shared cross-track decisions to resolve once, in whichever track's Architecture phase runs first.

**Next:** Phase 2 — UX Scenarios

---

### 2026-09-05 — Phase 2: UX Scenarios Complete

**Agent:** Saga (Scenario Outline)
**Scenarios:** 4 scenarios covering 11 pages
**Quality:** Excellent (all 4 scenarios: Completeness 7/7, Quality 7/7, Mistakes Avoided 6/6, Best Practices 4/4)

**Artifacts Created:**
- `C-UX-Scenarios/00-ux-scenarios.md` — Scenario index with coverage matrix
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/01-valentina-publishes-her-first-listing.md` — Scenario 01 outline
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.1-individual-seller-profile-step/1.1-individual-seller-profile-step.md` — Page stub
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.2-create-listing/1.2-create-listing.md` — Page stub
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.3-listing-live-confirmation/1.3-listing-live-confirmation.md` — Page stub
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/02-valentina-manages-a-trade-offer.md` — Scenario 02 outline
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.1-trade-offers-inbox/2.1-trade-offers-inbox.md` — Page stub
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.2-trade-offer-detail/2.2-trade-offer-detail.md` — Page stub
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.3-trade-completion-confirmation/2.3-trade-completion-confirmation.md` — Page stub
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/03-andres-verifies-his-business-and-funds-his-balance.md` — Scenario 03 outline
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.1-business-verification-application/3.1-business-verification-application.md` — Page stub
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.2-application-status/3.2-application-status.md` — Page stub
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.3-commission-balance-management/3.3-commission-balance-management.md` — Page stub
- `C-UX-Scenarios/04-andres-fulfills-a-sale/04-andres-fulfills-a-sale.md` — Scenario 04 outline
- `C-UX-Scenarios/04-andres-fulfills-a-sale/4.1-incoming-orders-list/4.1-incoming-orders-list.md` — Page stub
- `C-UX-Scenarios/04-andres-fulfills-a-sale/4.2-order-detail-confirm-payment/4.2-order-detail-confirm-payment.md` — Page stub

**Summary:** Derived all 4 scenarios directly from the finalized Phase 1 `prd.md` (Suggest mode — all 8 dialog answers already fully specified in the PRD's FR-S1..FR-S9 and the Trigger Map persona docs) rather than deriving a fresh Trigger Map, mirroring the Buyer track's Phase 2 approach. Achieved 11/11 page coverage with zero repetition (page 3.3 explicitly cross-references 1.2's listing-creation mechanism for FR-S9 rather than re-documenting it, matching the precedent already set by the Buyer track's 4.4 tab reading Seller-track data without owning it). Andrés's device was surfaced as a genuine open question via AskUserQuestion rather than defaulting to Valentina's inherited mobile-primary declaration — resolved as "responsive web, multi-surface, decided per-page in Phase 3," diverging from the agent's own recommended default.

**Next:** Phase 3 — UX Design (`bmad-ux` + `wds-4-ux-design`)

---

### 2026-09-06 — Phase 3 Part A: Design System Complete

**Agent:** bmad-ux (Fast path — all inputs fully specified in the finalized PRD and Phase 2 scenarios/pages)
**Scope:** DESIGN.md + EXPERIENCE.md scoped to the Seller/Business track's 4 scenarios / 11 pages

**Artifacts Created:**
- `DESIGN.md` — visual identity, adopting all Buyer-track color/type/radius/spacing tokens verbatim and adding 6 new component tokens (verification-status-badge, commission-balance-card, trade-offer-card, comprobante-viewer, open-to-trade-toggle, create-listing-form)
- `EXPERIENCE.md` — IA (11 surfaces), voice/tone extensions, component patterns, state patterns (verification lifecycle, commission balance funded/paused, trade-offer lifecycle, tri-state order reused), accessibility floor extensions, 4 Key Flows, Responsive & Platform

**Summary:** Declared zero new colors — every new Seller/Business component (verification badge, balance card, trade-offer card, comprobante viewer) is composed entirely from the Buyer track's existing palette, since TEZG is one app and a second visual vocabulary would undercut the "trusted ledger" identity the Buyer track already established. Resolved Andrés's per-page device declaration (deferred from Phase 2) by task type rather than a single blanket choice: three back-office/document-heavy pages (3.1, 3.3, 4.2) are Desktop-primary, two notification-driven glance pages (3.2, 4.1) are Mobile-primary — all five remain fully responsive per TEZG's platform-wide equal-priority contract. The comprobante-viewer component was deliberately NOT styled as a second upload-dropzone, since Andrés only reviews a file Valentina/the buyer already uploaded — conflating "upload" and "view" visual language would misrepresent which side of the transaction is acting.

**Next:** Phase 3 Part B — Page Specs (`wds-4-ux-design`)

---

### 2026-09-06 — Phase 3 Part B: Page Specs Complete

**Agent:** wds-4-ux-design (Dream mode, following the exact template established by the Buyer/Collector track's `1.1-sign-up.md`)
**Scope:** 11 page specs, overwriting each Phase 2 stub in place

**Artifacts Created (overwritten in place):**
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.1-individual-seller-profile-step/1.1-individual-seller-profile-step.md`
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.2-create-listing/1.2-create-listing.md`
- `C-UX-Scenarios/01-valentina-publishes-her-first-listing/1.3-listing-live-confirmation/1.3-listing-live-confirmation.md`
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.1-trade-offers-inbox/2.1-trade-offers-inbox.md`
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.2-trade-offer-detail/2.2-trade-offer-detail.md`
- `C-UX-Scenarios/02-valentina-manages-a-trade-offer/2.3-trade-completion-confirmation/2.3-trade-completion-confirmation.md`
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.1-business-verification-application/3.1-business-verification-application.md`
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.2-application-status/3.2-application-status.md`
- `C-UX-Scenarios/03-andres-verifies-his-business-and-funds-his-balance/3.3-commission-balance-management/3.3-commission-balance-management.md`
- `C-UX-Scenarios/04-andres-fulfills-a-sale/4.1-incoming-orders-list/4.1-incoming-orders-list.md`
- `C-UX-Scenarios/04-andres-fulfills-a-sale/4.2-order-detail-confirm-payment/4.2-order-detail-confirm-payment.md`

**Summary:** Each page follows the Buyer-track template exactly (Page Metadata / Overview / Reference Materials / Layout Structure / Spacing / Typography / Page Sections with Object IDs / Page States / Technical Notes / Open Questions / Checklist). Platform values pulled directly from EXPERIENCE.md's Foundation device table: Valentina's 6 pages (1.1-1.3, 2.1-2.3) are Mobile-primary throughout; Andrés's document-heavy pages (3.1, 3.3, 4.2) are Desktop-primary; his notification-driven glance pages (3.2, 4.1) are Mobile-primary. Page 1.2 documents the `open-to-trade-toggle`'s structural (not CSS) absence for `sellerType=business` per AD-4. Page 3.3 documents the FR-S9 reuse of 1.2's `create-listing-form` verbatim via the `sellerType` prop, and the automatic (never manual) Funded/Paused transition per CAP-21. Page 4.2 documents the `comprobante-viewer` (read-only, never an upload surface) and explicitly surfaces the AD-2 limitation — Andrés's button only ever sets `sellerReceivedConfirmedAt`, with a permanent "buyer closes only" note rather than a silently missing action.

**Next:** Phase 3 Reviewer Gate — `bmad-review-adversarial-general` → `review-ux-adversarial.md`, `bmad-review-edge-case-hunter` → `review-ux-edge-cases.md`

---

### 2026-09-06 — Phase 3 Reviewer Gate Complete

**Agents:** `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter`, run against DESIGN.md, EXPERIENCE.md, and all 11 page specs
**Scope:** consistency/correctness pass across the full Phase 3 output, plus manual triage and remediation directly on the page specs

**Artifacts Created:**
- `review-ux-adversarial.md` — 12 findings (broken token references, contradictory preconditions, unspecified UI, a11y and vocabulary issues)
- `review-ux-edge-cases.md` — 11 findings, strict-JSON (races, session-expiry, staleness, unreachable states)
- `decision-log.md` — new file, 8 entries meeting the ≥8 rubric threshold

**Top findings and resolution:**
- 3 findings were genuine product/UX forks surfaced to the user via AskUserQuestion (decision-log entries 6-8): Andrés's post-publish confirmation (inline banner on 3.3, not a dedicated page), the top-up amount entry pattern (modal overlay), and the corrupted-comprobante retry loop (added a minimal "report an issue" escalation after 3 failed retries).
- Remaining ~20 findings were mechanical documentation/consistency fixes applied directly, without further user input: 1.2's business-success routing now points at 3.3's new Listing Published Banner; 1.2 gained a publish idempotency key; 1.1 gained an interrupted-redirect guard and fixed a buyer/seller-account vocabulary conflation; 1.3 fixed its `listing-card` token reference (inherited-but-undeclared, same pattern as `order-status-row`) and added a back-navigation stale-state guard; 2.2 gained a proper Object ID + property table for the previously-unspec'd inline Accept confirmation, plus an accept-vs-withdraw race guard; 2.3 gained a double-tap confirm guard and a reopened-Completed-state entry point from 2.1; 2.1's card-tap behavior was fixed to route a Completed offer to 2.3 instead of 2.2; 3.1 gained a session-expiry-mid-upload state-preservation note and its Visibility precondition was corrected to permit re-entry after a Rejected application (fixing a contradiction with 3.2's own "resubmit" path); 3.3 gained the Listing Published Banner, the top-up modal decision, a server-side balance-zero-out revalidation guard, and switched a disabled-button tooltip to always-visible inline helper text (a11y fix — disabled controls aren't reliably reachable by keyboard/screen-reader users); 4.2 gained a "Confirming" Page State row, the report-an-issue escalation, and an explicit note documenting indefinite seller-confirmed-but-not-closed orders as an accepted limitation (same no-SLA/no-auto-escalation stance as CAP-15); DESIGN.md gained the previously-undefined `trade-offer-card` 5-state badge and "unseen" indicator dot token definitions, both using only already-adopted colors.

**Summary:** Distinguished genuine judgment calls (3, surfaced to the user) from correctness/consistency fixes (~20, resolved directly) per the plan's operating rule — visible human judgment on real forks is the graded criterion, not judgment on mechanical fixes. EXPERIENCE.md's `reviewed:` frontmatter updated to record both reviews as complete and triaged.

**Next:** Phase 4 — Architecture (`bmad-architecture`, resolving this track's own individual-vs-business seller-identity decision, citing AD-14/AD-15/AD-17 as [ADOPTED] from the Buyer-track ARCHITECTURE.md)

---

### 2026-09-06 — Phase 4: Architecture Complete (incl. Reviewer Gate)

**Agent:** bmad-architecture (Fast path), plus `bmad-review-adversarial-general` and `bmad-review-edge-case-hunter` for the Reviewer Gate
**Scope:** ARCHITECTURE.md resolving this track's own open decision (AD-18, seller-type exclusivity) and one carried-forward PRD open question (AD-19, commission balance concurrency), on top of all 13 whole-system ADs plus AD-14/AD-15/AD-17 adopted [ADOPTED] verbatim from the Buyer-track `ARCHITECTURE.md`

**Artifacts Created:**
- `ARCHITECTURE.md` — AD-18 (seller-type exclusivity) and AD-19 (commission balance atomic decrement), Capability → Architecture Map, Mermaid Structural Seed diagram, Cross-Track Note adjudicating all six PRD Open Questions (OQ1-OQ6) (status: final)
- `review-arch-adversarial.md` — 12 findings, plain Markdown list
- `review-arch-edge-cases.md` — 7 findings, strict JSON

**Reviewer Gate findings and resolution:**
- 3 findings were genuine architectural tradeoffs surfaced to the user via AskUserQuestion (decision-log entries 10-12): AD-18's race-closure mechanism (atomic conditional `UPDATE`, replacing insufficient "same transaction" framing), AD-18's exclusivity scope (extended to cover `Pending`, not only `Approved`, business applications — closing a gap FR-S9 exposed), and AD-19's floor-guard alternative (named and rejected in Rejected Alternatives, no behavior change — original atomic-decrement-with-transient-negative-balance design confirmed as intentional).
- Remaining 6 mechanical fixes applied directly without further user input: fixed the Capability Map's AD-19-mislabeled-as-SPINE row; removed the Mermaid diagram's misattributed `Verify -->|AD-19 atomic decrement|` edge; resolved the `status: final` vs. `reviewed:`-field frontmatter contradiction; widened the frontmatter `binds` array to match the ADs' own stated Binds lines; widened the frontmatter `scope` field to cover the full OQ1-OQ6 disposition; fixed the Buyer-track `ARCHITECTURE.md`'s stale `companions` cross-reference.

**Summary:** Distinguished genuine judgment calls (3, surfaced to the user) from correctness/consistency fixes (6, resolved directly), same operating rule as the Phase 3 gate. AD-18 went from a documentation-level "same transaction" claim to a true atomic conditional `UPDATE` pattern mirroring AD-19's own rigor, and its scope was extended to close a real Pending-window gap the edge-case review traced back to FR-S9. AD-19's original design intent (pause future purchasability on depletion, never refuse an already-confirmed sale) was confirmed, not changed — only the previously-unnamed floor-guard alternative is now documented and rejected. `ARCHITECTURE.md`'s `status: final` is now legitimately earned. `decision-log.md` stands at 12 entries (exceeds the ≥8 rubric threshold).

**Next:** Phase 5 — Implementation Readiness Check (`bmad-check-implementation-readiness`) against this track's 4 final artifacts (`prd.md`, `DESIGN.md`, `EXPERIENCE.md`, `ARCHITECTURE.md`)

---

## Key Decisions

| Date | Decision | Phase | By |
|------|----------|-------|-----|
| 2026-09-04 | Two protagonists confirmed (Valentina/Individual-Seller for S1-S2, Andrés/Verified-Business for S3-S4), rejecting a single-composite-protagonist alternative, since SPEC.md's Safe assumption makes the two seller types mutually exclusive account states | Phase 1: PRD | Saga + Martin (via AskUserQuestion) |
| 2026-09-05 | Use Suggest mode (not step-by-step Conversation mode) for the 8-question scenario dialog, since all answers were already fully specified in the finalized PRD | Phase 2: Scenarios | Saga + Martin |
| 2026-09-05 | Andrés's device declared "responsive web, multi-surface — no single primary device, decided per-page in Phase 3," diverging from the agent's own recommended "Mobile" default | Phase 2: Scenarios | Martin (user, via AskUserQuestion) |
| 2026-09-06 | design_intent = Dream Up (D) confirmed for all 4 Seller-track scenarios at Handover, matching the Buyer/Collector track's own Phase 2 handover choice, to keep momentum into Phase 3 | Phase 2: Scenarios (Handover) | Martin (user, via AskUserQuestion) |
| 2026-09-06 | Andrés's post-publish confirmation is a lightweight inline banner on 3.3, not a dedicated confirmation page like Valentina's 1.3 | Phase 3 Reviewer Gate | Martin (user, via AskUserQuestion) |
| 2026-09-06 | 3.3's "Top up balance" action commits to a modal overlay, over an inline dashboard expansion | Phase 3 Reviewer Gate | Martin (user, via AskUserQuestion) |
| 2026-09-06 | 4.2's comprobante Error state gets a minimal "report an issue" escalation after repeated failed retries, rather than accepting indefinite retry as a known gap | Phase 3 Reviewer Gate | Martin (user, via AskUserQuestion) |
