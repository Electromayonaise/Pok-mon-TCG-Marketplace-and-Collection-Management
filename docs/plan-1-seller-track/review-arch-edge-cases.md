# Edge Case Review — Seller/Business Track `ARCHITECTURE.md`

**Reviewed:** `docs/plan-1-seller-track/ARCHITECTURE.md`
**Method:** `bmad-review-edge-case-hunter`
**Cross-referenced against:** `docs/plan-1-buyer-track/ARCHITECTURE.md`, `docs/plan-1-seller-track/prd.md`

```json
[
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:51",
    "trigger_condition": "Individual-seller profile completion and admin business-approval submitted concurrently for the same user, each transaction committing before the other",
    "guard_snippet": "UPDATE users SET is_individual_seller_profile_complete=true WHERE id=:uid AND business_id IS NULL (and the symmetric guarded UPDATE for approval) instead of a separate SELECT-then-UPDATE",
    "potential_consequence": "Both writes commit, leaving one user with both flags set — the exact invalid simultaneous state AD-18 exists to prevent"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:58-67",
    "trigger_condition": "Confirm-payment-received request retried after a client-side timeout, reaching the same Order's handler twice",
    "guard_snippet": "Gate AD-19's UPDATE behind the adopted OrderAlreadyConfirmedByRole check (sellerReceivedConfirmedAt IS NULL) in the same transaction, and state that dependency explicitly",
    "potential_consequence": "Commission balance is decremented twice for a single confirmed sale if that cross-module ordering isn't actually enforced as assumed"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:47-56 (AD-18) vs prd.md FR-S9 (business creates a listing while Pending) and prd.md §8 OQ4 (no-cooldown reapplication)",
    "trigger_condition": "A user's business application is Pending (businessId still null per AD-18's own Rule) while that same user attempts to complete the individual-seller profile step",
    "guard_snippet": "Reject also when a non-terminal (Pending) business application row exists for the caller, not only when business_id IS NOT NULL",
    "potential_consequence": "User ends up simultaneously an approved individual seller and a soon-to-be-approved business, unblocked by AD-18 entirely"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:107-108 (mermaid Structural Seed)",
    "trigger_condition": "Reader/builder follows the 'Verify -->|AD-19 atomic decrement| commission_m' edge to conclude the verification/balance page itself performs the deduction",
    "guard_snippet": "Delete the Verify-sourced AD-19 edge; keep only 'Orders -->|FR-S8 confirm, triggers AD-19| commission_m'",
    "potential_consequence": "Decrement call gets wired into the 3.3 balance page instead of the 4.2 confirm-payment-received action"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:35 (AD-6 inherited-invariants row) vs AD-19 (58-67)",
    "trigger_condition": "Two trade offers against listings sharing the same InventoryUnit accepted concurrently — the same concurrency shape AD-19 was written to close for commission balance",
    "guard_snippet": "State explicitly (mirroring AD-19's own specificity) that trade-offer acceptance reserves inventory via an atomic conditional write, e.g. UPDATE inventory_unit SET reserved_by=:offerId WHERE reserved_by IS NULL",
    "potential_consequence": "Without a restated atomic guard, two accepted offers could each believe they reserved the same unit"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:124 (Capability → Architecture Map, row 1)",
    "trigger_condition": "Row reads 'AD-1, AD-19 (SPINE) — inherited', contradicting every other reference to AD-19 in this same file as a new, track-local decision",
    "guard_snippet": "Correct the row to 'AD-1 (SPINE) — inherited' only",
    "potential_consequence": "A later pass treats AD-19 as an already-fixed, platform-wide invariant outside this track's own authority to amend"
  },
  {
    "location": "docs/plan-1-seller-track/ARCHITECTURE.md:8,11,139 (frontmatter status vs reviewed field vs closing note)",
    "trigger_condition": "Frontmatter 'status: final' read in isolation (e.g. by tooling or a grader scanning only frontmatter) before the closing note is reached",
    "guard_snippet": "Set status: draft (or review-pending) until the Reviewer Gate referenced in the closing note actually completes",
    "potential_consequence": "An unreviewed architecture document is treated as authoritative/final by a downstream consumer"
  }
]
```
