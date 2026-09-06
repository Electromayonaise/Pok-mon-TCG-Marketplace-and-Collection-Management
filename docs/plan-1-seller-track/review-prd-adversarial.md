# Adversarial Review — PRD: TEZG Seller/Business Track

**Reviewed:** `prd.md`, `addendum.md`
**Cross-checked against:** `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` (CAP-1..28), `ARCHITECTURE-SPINE.md` (AD-1..13), `_bmad-output/project-context.md`, and — per this track's explicit purpose of surfacing cross-track issues — `docs/plan-1-buyer-track/prd.md`, `addendum.md`, and `review-prd-adversarial.md`.

## Findings within this PRD (unranked)

- No FR in this document grants a verified business — Pending or newly Approved — the ability to create a listing at all. FR-S1 is explicitly scoped to "Individual-Seller Listing & Trade Management," yet S3's own narrative ("once Approved, tops up a prepaid commission balance... his existing draft listings become purchasable") presupposes that Andrés already has listings before this PRD ever describes how a business creates one. This is a real functional gap, not an editorial one.

- FR-S3's title promises "accept, reject, or counter," but its testable Consequences only cover the accept-and-reserve-inventory path. CAP-25's own success signal — "the seller's accept/reject/counter action is recorded and visible to the buyer" — is never tested for the reject or counter cases; a reject or counter action could be silently dropped and this FR's Consequences would still all pass.

- Open Question 2's assumption ("unlimited concurrent trade offers... first-accepted-wins enforced structurally by inventory reservation") never states what happens to the *other* pending trade offers on a listing once one is accepted and the unit is gone. No FR, Consequence, or Non-Goal says whether they're auto-rejected, left indefinitely open, or surfaced to the seller as now-unfulfillable.

- FR-S8 has no testable Consequence covering a business attempting to confirm payment-received twice on the same Order, or confirming an Order that isn't tied to one of its own listings. This mirrors the exact shape of a finding already logged against the Buyer track (FR-5 lacking a matching `DomainError` code for its own rejection case) — the same class of gap appears again here, on the seller side.

- Neither FR-S6 nor FR-S8 addresses what happens if a business's commission balance is depleted by a *different* Order's confirmation in the window between this Order's purchase and this business's own receipt-confirmation on it. Does the deduction go negative, does this confirmation get blocked, or is a below-zero balance simply tolerated? AD-3 describes the deduction trigger but not this ordering edge case, and this PRD doesn't either.

- FR-S7's Consequence "the business does not have to wait for `buyerPaidConfirmedAt` to see that an Order was placed, only to see the comprobante image, which appears once uploaded" is written as a testable claim but isn't actually grounded in CAP-22 or AD-2 — both describe the three confirmation states, not when the Order record itself first becomes visible to the business. This is an invented detail presented with the same confidence as a cited one.

- The fact "`openToTrade` can never be `true` on a verified-business listing" is independently restated in the Glossary, FR-S2's Consequences, and §5 Non-Goals — three copies of the same constraint with no single source of truth, the same redundancy pattern already flagged as a minor finding in the Buyer-track review.

## Cross-track findings (this track vs. the already-finalized Buyer/Collector track)

- Buyer-track FR-9 claims the "My Sales" tab shows "pending contact/trade requests" as tab content. This Seller-track PRD is the actual owner of trade-offer data (FR-S3, FR-S4), and neither PRD's FR text cites the other — Buyer-track FR-9 doesn't say "sourced from FR-S3," and FR-S3 doesn't say "feeds Buyer-track FR-9." The two documents now describe overlapping UI/data surfaces from opposite sides without a cross-reference in either. This is the same issue the Buyer-track adversarial review already flagged (FR-9's "trade requests" claim being ungrounded) — adding this track does not resolve it, and arguably sharpens it, since the missing data source (trade offers) now demonstrably exists in a sibling document that FR-9 still doesn't cite.

- This PRD's §2.3 explicitly disambiguates the Buyer track's "dual-role coexistence" axis from this track's "seller-type exclusivity" axis — but only from this document's side. `docs/plan-1-buyer-track/prd.md`'s own Glossary ("Dual-role user") and FR-9 remain unedited, and a reader of that document alone still hits the exact ambiguity `docs/plan-1-buyer-track/review-prd-adversarial.md` already flagged against it. Per the governing plan's cross-track-consistency rule, this is a case for reopening that specific piece of the Buyer-track PRD via `bmad-prd`'s Update flow — writing the disambiguation once, here, does not fix the sibling document that a grader may read independently.

- Buyer-track FR-9's `[NOTE FOR PM]` describes this track as "the seam where full seller-side functionality (listing management, trade-offer handling) should be expanded... when/if a Seller/Business track PRD is produced." That track now exists (FR-S1..FR-S8), but the note in Buyer-track's `prd.md` still reads as a forward-looking placeholder rather than pointing to the FRs that now actually fulfill it — it's stale the moment this document was finalized, not just eventually.

- Both PRDs independently arrive at "the business/buyer needs functional, not just architectural, ability to read the comprobante" (Buyer-track review's finding against FR-6/§7; this document's FR-S7 and its Notes). Neither PRD's actual text cross-references the other's FR making the same point from its own side — a reader of either document alone doesn't learn a matching requirement exists in its sibling.

## Minor / editorial

- This PRD's self-containedness depends on `docs/plan-1-buyer-track/prd.md` existing and remaining stable — the Vision section's opening line assumes the reader already knows who Valentina is from that document. This is a reasonable dependency given the two tracks share a protagonist, but it is nowhere stated as an explicit cross-file dependency (unlike, say, a version-pinned citation) — if the Buyer-track PRD's Valentina characterization ever changes, nothing here would flag the drift.
