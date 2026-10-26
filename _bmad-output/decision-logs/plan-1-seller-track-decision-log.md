# Decision Log — Seller/Business Track

**Track:** Seller/Business (≈ course "Host" track), TEZG Pokémon TCG Marketplace and Collection Management — Plan-1 course exercise.
**Purpose:** record every point where a genuinely open tradeoff was surfaced to the acting user (Martin) rather than decided silently by the agent, per the governing plan's operating rule. Mechanical extractions, cross-references, and "resolved by existing precedent" autofixes are excluded — only entries below reflect visible human judgment on a real fork in the road. Sourced from `.memlog.md` (Phases 1-3) and this track's Phase 3 Reviewer Gate triage.

---

### 1. Two protagonists confirmed (Phase 1 — PRD)
**Decision:** Valentina (Individual Seller) covers S1-S2; a new protagonist, Andrés (Verified Business), covers S3-S4 — rather than a single composite protagonist spanning both seller types.
**Alternatives considered:** one composite protagonist holding both seller-type states.
**Rationale:** SPEC.md's "Safe" assumption makes Individual Seller and Verified Business mutually exclusive account states — a single protagonist would have to narratively hop between two states the system itself treats as an exclusive fork, unlike Valentina's genuinely-coexisting buyer/individual-seller dual role in the Buyer track.

### 2. Andrés's device deferred to per-page resolution (Phase 2 — Scenarios)
**Decision:** rather than defaulting to the skill's own recommended "Mobile" primary device for Andrés, his device was declared "responsive web, multi-surface — no single primary device, decided per-page in Phase 3."
**Alternatives considered:** the agent's own suggested default (Mobile-primary, mirroring Valentina).
**Rationale:** Andrés's four scenarios (business verification, commission balance, incoming orders, order confirmation) plausibly split across a genuinely different task-shape than Valentina's glance-and-tap flows — deferring let Phase 3's actual per-page task analysis decide instead of forcing one blanket default too early.

### 3. Dream Up (D) design intent for Phase 2 Handover (Phase 2 — Scenarios)
**Decision:** design_intent = Dream Up (D), confirmed autonomously for all 4 Seller-track scenarios at Handover — matching the Buyer/Collector track's own Phase 2 handover choice.
**Rationale:** kept momentum consistent between the two tracks' Phase 2→3 transitions rather than re-litigating a choice already made once for this same product.

### 4. Per-page device split for Andrés (Phase 3 Part A — Design System)
**Decision:** three back-office/document-heavy pages (3.1 Business Verification, 3.3 Commission Balance, 4.2 Order Detail/Confirm Payment) are Desktop-primary; two notification-driven glance pages (3.2 Application Status, 4.1 Incoming Orders) are Mobile-primary — resolving the device question deferred in decision #2.
**Alternatives considered:** one blanket device for all five of Andrés's pages.
**Rationale:** task shape, not persona, decided the split — a document-review/data-entry task benefits from a desktop surface regardless of who's performing it, while a notification-driven status check doesn't.

### 5. Palette: zero new colors, extend Buyer-track's "Trusted Ledger" identity (Phase 3 Part A — Design System)
**Decision:** every new Seller/Business component (verification badge, balance card, trade-offer card, comprobante viewer) is composed entirely from the Buyer track's existing adopted palette — no new colors introduced.
**Alternatives considered:** a distinct visual vocabulary for the business/seller side, differentiating it from the buyer-facing palette.
**Rationale:** TEZG is one app, not two — a second palette would undercut the "trusted ledger" identity the Buyer track already established and would visually imply the business side is a different product.

### 6. Andrés's post-publish confirmation: inline banner, not a dedicated page (Phase 3 Reviewer Gate triage)
**Decision:** when Andrés publishes a listing via 3.3's reused `create-listing-form` (FR-S9), he sees a transient "Listing published" banner on 3.3 itself, then the page settles into its normal Funded/Paused dashboard view — no new dedicated confirmation page.
**Alternatives considered:** a 1.3-equivalent dedicated confirmation page for Andrés; leaving the gap unresolved as a logged open item.
**Rationale:** the adversarial review caught that 1.2's success flow for a business submitter referenced "3.3's own confirmation state," which didn't exist anywhere in 3.3's Page States — user chose the lighter-weight fix since 3.3 is a dashboard Andrés returns to repeatedly, not a one-time flow like Valentina's 1.3.

### 7. Top-up amount entry: modal overlay (Phase 3 Reviewer Gate triage)
**Decision:** 3.3's "Top up balance" action opens a modal overlay for amount entry, replacing the previously undecided "inline or lightweight modal" phrasing.
**Alternatives considered:** inline expansion within the commission-balance-card itself.
**Rationale:** the adversarial review flagged this as the one interaction in the track left genuinely undecided — user picked the modal since it keeps Andrés on the balance dashboard for a short, single-field, low-navigation task on a desktop-primary page.

### 8. Corrupted comprobante: add a minimal escalation action (Phase 3 Reviewer Gate triage)
**Decision:** 4.2's comprobante-viewer Error state gets a lightweight "report an issue" action after repeated failed retries, rather than offering Retry indefinitely with no escalation path.
**Alternatives considered:** accept the indefinite-retry gap as a documented known limitation, consistent with this track's existing no-SLA/no-auto-escalation stance elsewhere (CAP-15 manual review, the indefinite unconfirmed-order state).
**Rationale:** the edge-case review distinguished this from the other accepted-gap cases — a permanently corrupted upload (not a transient network blip) leaves Andrés with literally no path forward, which the user judged worth a small, scoped addition rather than folding into the track's existing "no SLA" pattern.

### 9. Seller-type exclusivity: reject the second state-granting action (Phase 4 — Architecture)
**Decision:** when a user who already holds one seller state (approved individual seller, or approved verified business) triggers the action that would grant them the other, the second action is rejected outright (`AlreadyVerifiedBusiness` / `IndividualSellerProfileAlreadyComplete`) rather than silently resolved.
**Alternatives considered:** auto-clearing the earlier flag (silent "graduation"); allowing both flags to coexist in storage with per-endpoint resolution.
**Rationale:** auto-clearing would silently invent transition semantics (what happens to her existing listings?) that SPEC.md explicitly flags as an unaddressed, Risky, platform-wide assumption — a bigger decision than this AD's own scope; the user chose the option that keeps that transition honestly out of scope rather than deciding it as a side effect.

### 10. AD-18 concurrency guard: atomic conditional UPDATE, not "same transaction" framing (Phase 4 Reviewer Gate triage)
**Decision:** both of AD-18's exclusivity checks are rewritten as atomic conditional `UPDATE`s with the guard embedded in the `WHERE` clause (mirroring AD-19's own pattern), replacing the original "both checks run inside the same transaction as the write they're guarding" framing.
**Alternatives considered:** a pessimistic row lock (`SELECT ... FOR UPDATE`) on the user's identity row before either check; leaving the original text as-is and accepting the race as a documented, low-likelihood implementation risk.
**Rationale:** the adversarial review demonstrated the original framing only serializes sequential submissions, not genuinely concurrent ones — two truly simultaneous transactions could each read the other's flag as unset before either commits. The user chose the fix that costs no new locking primitive and stays consistent with AD-19's already-established pattern in this same file.

### 11. AD-18 extended to cover Pending business applications, not only Approved (Phase 4 Reviewer Gate triage)
**Decision:** AD-18's exclusivity guard now rejects individual-seller-profile completion whenever the caller has ANY non-terminal business application (`Pending` or `Approved`), not only an `Approved` one with a non-null `businessId`.
**Alternatives considered:** accept the gap as documented (a user could complete both during the `Pending` window) and defer it alongside the already-deferred graduation/transition question; push the fix to the PRD level instead, as a new field distinguishing "Pending business applicant" from "individual seller."
**Rationale:** the edge-case review traced that FR-S9 requires a business to list while `Pending` (before `businessId` is set), which meant AD-18 as originally scoped left that exact window unguarded — the user chose to close it architecturally now rather than carry a known invalid-state gap forward, since the fix (extending the same `WHERE`-clause guard) was cheap once AD-18 was already being rewritten for entry #10.

### 12. AD-19 floor-guard alternative: documented and rejected, no behavior change (Phase 4 Reviewer Gate triage)
**Decision:** AD-19 keeps its original mechanism (atomic decrement, transient negative balance permitted) rather than switching to a floor-guarded `UPDATE` (`WHERE balance >= :amount`) that would refuse a deduction that would take the balance negative. The floor-guard alternative is now named and rejected in AD-19's own Rejected Alternatives list.
**Alternatives considered:** switch to the floor-guard mechanism, which would keep the balance non-negative at the cost of refusing to record an already-earned, already-confirmed sale's commission debt.
**Rationale:** the adversarial review pointed out this alternative was never on the table despite being a real, atomicity-preserving option. The user confirmed the original design intent — pause future purchasability on depletion, never refuse to honor a completed sale — is what AD-19 was always meant to protect, so no runtime behavior changes; only the documentation gap is closed.

### 13. FR-S9 Pending-listing-creation gap: fix the UX to honor the PRD (Phase 5 Implementation Readiness Check)
**Decision:** `EXPERIENCE.md` and page specs 1.2, 3.2, and 3.3 are amended so a business can create a listing immediately upon a Pending application (not gated on Approved) and listing creation is never gated on commission balance being funded — closing a real, previously undetected contradiction between `prd.md`'s FR-S9 (whose Consequences explicitly state a business can create a listing while Pending, and that creation is never gated on balance, only purchasability) and the finalized UX, which only ever exposed listing creation via 3.3 — itself gated on Approved status *and* a Funded balance.
**Alternatives considered:** narrow FR-S9 in `prd.md` to match the Approved+Funded-only UX as actually built; or accept the gap as a documented, deliberate MVP scope narrowing without touching any of the three already-final artifacts.
**Rationale:** AD-18 (architecture, entry #11 above) was specifically extended during the Phase 4 Reviewer Gate to guard the Pending-application window *because* FR-S9 requires Pending-listing-creation — the architecture layer already assumed this capability existed and was reachable. Narrowing the PRD instead would have made that AD-18 extension pointless (guarding a window nothing can ever reach), and accepting the gap would leave a capability the architecture was deliberately built to support silently blocked at the UX layer. The user chose to close the gap in the UX so all three final artifacts (PRD, UX, Architecture) actually agree with each other.

---

**Total entries: 13** (meets the ≥8 rubric threshold). All entries above reflect a real fork where more than one defensible answer existed and the acting user's judgment — not the agent's default inference — determined the outcome.
