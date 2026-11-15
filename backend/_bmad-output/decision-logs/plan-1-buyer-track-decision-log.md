# Decision Log — Buyer/Collector Track

**Track:** Buyer/Collector (≈ course "Guest" track), TEZG Pokémon TCG Marketplace and Collection Management — Plan-1 course exercise.
**Purpose:** record every point where a genuinely open tradeoff was surfaced to the acting user (Martin) rather than decided silently by the agent, per the governing plan's operating rule. Mechanical extractions, cross-references, and "resolved by existing precedent" calls are excluded — only entries below reflect visible human judgment on a real fork in the road. Sourced from `.memlog.md` (Phases 1-4) and this track's Phase 5 readiness check.

---

### 1. Protagonist and persona (Phase 1 — PRD)
**Decision:** Valentina, 27, Bogotá — a release-driven collector (Priority 1 persona) who also occasionally sells/trades as an individual seller (Priority 2 persona) — confirmed as the track's dual-role protagonist.
**Alternatives considered:** a single-role buyer-only persona (rejected — would have left FR-9's dual-role requirement without a narrative anchor).
**Rationale:** matches `project-brief.md`'s existing "graduate" dual-role description and lets one PRD naturally motivate FR-9 without inventing a second persona.

### 2. Comprobante upload time NFR (Phase 1 — PRD)
**Decision:** comprobante upload completes within the same purchase session, under 10 seconds on a typical mobile connection.
**Alternatives considered:** leaving the NFR qualitative-only, since SPEC.md fixes no number for this.
**Rationale:** user chose to set an explicit, testable number rather than leave a bare-list NFR unmeasurable — trades a self-imposed target (not SPEC-sourced) for testability.

### 3. B4 scope boundary — summary-only My Sales tab (Phase 1 — PRD)
**Decision:** the dual-role tab (FR-9) shows only counts (open listings, pending trade offers); full individual-seller listing management is explicitly deferred as a Non-Goal, flagged so a future pass expands it rather than assuming permanent exclusion.
**Rationale:** keeps this PRD's scope tight to the Buyer/Collector journey while leaving an explicit, discoverable seam — later closed by the Seller/Business track's FR-S1-S4.

### 4. Track-scope expansion to both Buyer/Collector and Seller/Business (Phase 1→2 transition)
**Decision:** after instructor confirmation that covering both tracks is valid for a single-app product, scope expanded to add the Seller/Business track as an incremental second pass — not a rewrite of this track.
**Alternatives considered:** stopping at one track (the original, more conservative plan), given the course's template assumes two separate apps (Host/Guest).
**Rationale:** external authorization (instructor) resolved a real ambiguity about whether TEZG's single-app structure fit the exercise's two-app template.

### 5. Mobile declared the primary design surface (Phase 1 PRD → Phase 3 UX)
**Decision:** mobile is the primary design target for this track's 4 scenarios, even though SPEC.md mandates equal-priority responsive support (not mobile-only).
**Alternatives considered:** designing desktop-first or with no stated primary surface.
**Rationale:** framed explicitly as a design-priority decision for this journey, not an exception to the platform-wide responsive contract — all 4 of Valentina's journeys are drawn from mobile-browser sessions in the source scenarios.

### 6. Comprobante maximum file size (Phase 1 PRD triage)
**Decision:** 5 MB per image, no resolution cap.
**Alternatives considered:** leaving the size limit unspecified pending an architecture-phase decision.
**Rationale:** user resolved this during PRD triage (via AskUserQuestion) rather than deferring it, closing Open Question 2 and unblocking FR-5's Feature-specific NFR outright.

### 7. Visual direction — "Trusted Ledger" (Phase 3 — UX/DESIGN.md)
**Decision:** calm navy/cream palette, single muted-teal accent, no gradients or shadows — chosen over two alternatives ("Holo Energy," a saturated/energetic TCG-game aesthetic, and "Binder Archive," a collector-scrapbook aesthetic).
**Rationale:** TEZG has no inherited whole-system brand identity to extend, and the trigger map's #1 driving force for this persona is price-trustworthiness — a restrained, ledger-like visual language reinforces that trust signal better than a gamified or nostalgic one.

### 8. Reference price shown as COP-converted only, not raw source currency (Phase 3 Reviewer Gate)
**Decision:** the price-block's reference price displays as its COP-converted equivalent only.
**Alternatives considered:** showing both the original currency and a COP conversion side by side.
**Rationale:** preserves at-a-glance tabular comparison against the listing price (also always COP) — a dual-currency display would undercut the "look trustworthy instead of like a guess" climax moment this page exists to deliver.

### 9. Abandoned-purchase resume path (Phase 3 Reviewer Gate)
**Decision:** an Order where 3.1 completed but 3.2 (comprobante upload) was never finished is not lost — it appears in the Orders List as an unpaid order with a "Finish payment" action returning to 3.2 with the original OrderId and payment details intact.
**Alternatives considered:** letting an abandoned purchase attempt simply disappear with no record.
**Rationale:** losing the record entirely would leave Valentina with no proof she started a legitimate transaction if she returns days later — an edge case worth a deliberate design decision rather than silent data loss.

### 10. Comprobante accepts PDF alongside images (Phase 3 Reviewer Gate)
**Decision:** the upload dropzone accepts `image/*` and `application/pdf`, not images only.
**Alternatives considered:** the agent's own recommendation was image-only, for a simpler single-preview code path.
**Rationale:** user overrode the agent's recommendation — bank apps frequently issue transfer confirmations as PDFs rather than photos, and excluding them would force Valentina to screenshot a PDF just to satisfy an artificial format restriction.

### 11. Comprobante storage/ACL mechanism — AD-14 (Phase 4 — Architecture)
**Decision:** signed, time-limited URLs minted per-request by the orders application service (validated against `Order.buyerId` and the order's selling business) — not convention-only access, and not full server-proxied byte streaming.
**Alternatives considered:** convention-only access control (rejected — too weak for a two-legitimate-reader resource); full server-proxied streaming (rejected — adds a proxy code path and per-view server load this course-project's scale doesn't need, given signed URLs already give real storage-layer enforcement).
**Rationale:** unlike AD-13's single-reader admin-only precedent, the comprobante has two legitimate readers (buyer and business), so AD-13's convention-only pattern doesn't transfer as-is — a genuinely open tradeoff, confirmed via AskUserQuestion rather than inferred.

### 12. Comprobante content regulated-data classification — AD-17 (Phase 4 Reviewer Gate)
**Decision:** comprobante content (bank account number, holder name) extends AD-13's regulated-personal-data handling pattern, rather than being accepted as an unaddressed gap or redacted before storage.
**Alternatives considered:** accept-as-gap; redact the sensitive fields before storage.
**Rationale:** user chose the extend-AD-13 option — a PRD-flagged compliance question (Ley 1581 exposure) that the initial architecture draft had left entirely unanswered; extending the existing pattern was judged the least-effort path that still actually closes the gap.

### 13. Business Order-read access after closure — AD-15 amendment (Phase 4 Reviewer Gate)
**Decision:** business read access to a closed Order persists indefinitely — no end boundary at closure, no time-boxed cutoff.
**Alternatives considered:** access ends at Order closure; access is time-boxed for some fixed retention window post-closure.
**Rationale:** confirmed via AskUserQuestion after the adversarial review flagged the original AD-15 draft left this boundary completely unstated — a business plausibly needs its own sales-history record indefinitely, and there is no stated retention/cleanup rule elsewhere in the spine that would justify an artificial cutoff.

### 14. Signed-URL TTL fixed at exactly 10 minutes — AD-14 amendment (Phase 4 Reviewer Gate)
**Decision:** AD-14's Rule fixes the comprobante signed-URL TTL at exactly 10 minutes, replacing an original "5-15 minute" range.
**Rationale:** the adversarial review's own test ("could two builders choose incompatibly?") flagged the range as non-enforceable — two independent implementations picking different values inside the same band would both technically comply while diverging. Confirmed via AskUserQuestion rather than picking a number unilaterally.

### 15. `Order.businessId` as a stored, snapshotted column — AD-15 finalization (Phase 4 Reviewer Gate)
**Decision:** `Order.businessId` is a column stored at Order-creation time, not derived live through a join against the referenced listing's current owning business.
**Alternatives considered:** deriving ownership live via the listing's current owning-business at read time.
**Rationale:** this was the load-bearing fact both AD-14 (comprobante access) and AD-15 (read-ownership) silently depended on without stating how it was computed — the adversarial review caught that a Rule can't be enforceable if its own precondition's data shape is undefined. Snapshotting at creation also protects against a listing's ownership changing after the Order was placed, which a live join would not.

### 16. My Sales tab (4.4) Error-state gap — blocker, not accepted gap (Phase 5 — Implementation Readiness)
**Decision:** the missing Error state on page spec `4.4-my-sales-tab.md` (for when AD-16's underlying query fails outright, distinct from Loading/Default/Fully-empty) is treated as a **blocker** requiring immediate remediation, not an accepted known gap to leave logged for a future pass.
**Alternatives considered:** accepting it as a known, explicitly-logged gap with a fix recommendation for later, given the small blast radius (a degraded-to-Loading failure mode, not data loss or incorrect data shown) and the course-project scale of this exercise.
**Rationale:** this exact gap had already survived two separate finalized phases (UX Phase 3, then Architecture Phase 4) each deferring it to the next rather than owning it — user's ruling was that a third deferral would repeat the same pattern rather than close it, so the fix (adding an Error state to both `4.4-my-sales-tab.md` and `EXPERIENCE.md`, consistent with the existing 3.2 comprobante-failure copy/color conventions) was applied within the same Phase 5 pass rather than carried forward again.

---

**Total entries: 16** (exceeds the ≥8 rubric threshold). All entries above reflect a real fork where more than one defensible answer existed and the acting user's judgment — not the agent's default inference — determined the outcome.
