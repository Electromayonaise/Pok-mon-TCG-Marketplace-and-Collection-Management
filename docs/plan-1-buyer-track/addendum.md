# Addendum: TEZG — Buyer/Collector Track

*Depth that belongs to this exercise's context but doesn't earn a place in `prd.md`'s main narrative — course-mapping rationale, rejected alternatives, and extended persona background. Audit/override information is never here; it lives in `.memlog.md`.*

## Course exercise mapping (Smart Solar Flow → TEZG)

This PRD is produced for the "Plan-1: AI-Assisted Product Planning" course activity, whose template case study is a fictional product called Smart Solar Flow with two tracks — Host (Marco, solar-installation owner) and Guest (Daniela, EV-charging guest). The real subject is TEZG; this table records how the course's Track A (Guest) structure was re-mapped onto TEZG's Buyer/Collector persona, for anyone auditing the exercise's fidelity to the original assignment.

| Course concept (Track A / Guest) | TEZG equivalent | Fit |
|---|---|---|
| Two separate apps (host-app, guest-web) | One responsive web app | **Divergence** — TEZG has no app-level separation, so "track" here means persona-scoped documentation, not a separate codebase. |
| Daniela (protagonist) | Valentina, 27, Bogotá | Direct substitution — TEZG's own Priority-1 persona (Release-Driven Collector) plus its Priority-2 trait (Individual Seller), per `trigger-map.md`. |
| G1 Onboarding, accepts a charging plan | UJ-1 Account creation, catalog discovery | Close — no "plan" concept in TEZG; replaced with catalog-first onboarding. |
| G2 Booking a charging session | UJ-2 Purchase decision (listing vs. reference price) | Close — "booking" maps to "deciding to buy," same decision-point shape. |
| G3 Paying, photo-only proof (no payment gateway) | UJ-3 Paying via comprobante upload (CAP-20) | **Near-exact** — TEZG independently arrived at the same no-payment-gateway/photo-proof design. |
| G4 Billing history + "external host" dual state | UJ-4 Order history + My Sales tab (dual buyer/seller role) | **Near-exact** — TEZG's data model already natively supports the same dual-role shape. |
| Mobile-only guest-web, no desktop view | Equal-priority responsive, mobile declared primary *design* target for this track only | **Divergence, resolved as a design decision** — see `prd.md` §1 Vision's explicit "Design-target decision" callout and the decision log; not a SPEC violation. |

## Rejected alternative: full seller functionality in FR-9

During Discovery, considered building FR-9 (My Sales tab) out as a fully functional individual-seller listing-management feature inline in this PRD, rather than a summary-only tab. Rejected because:
- It would effectively fold half of the Seller/Business track into a PRD scoped as Buyer/Collector, defeating the point of tracks existing at all.
- The course exercise's time budget (per-phase minutes) assumes one track's depth, not two tracks' worth of FRs inside one PRD.
- The user explicitly chose the summary-tab-only option during Discovery, with an explicit instruction that the seam (FR-9) must be documented clearly enough that a future pass can expand it without re-deriving the dual-role concept from scratch — done via FR-9's `[NOTE FOR PM]` callout.

## Extended persona note: Valentina

Not required by the PRD's UJ format, but useful background for whoever designs the UI next: Valentina fits `_bmad-output/B-Trigger-Map/personas/01-release-driven-collector.md` (Priority 1) crossed with the dual-role framing in `02-individual-seller.md` ("often the same person as the Release-Driven Collector on a different day, not a distinct population"). She is not a novice — she already knows PriceCharting/eBay/Collectr well enough to notice immediately if TEZG's price display is less trustworthy than what she's used to, which is why UJ-1's climax is specifically about the three-value price display, not just "browsing is easy."

## Sourcing notes

- CAP numbers throughout `prd.md` are cited, not restated in full — always cross-check against `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` if a CAP's exact wording matters.
- `project-context.md` rules (e.g. comprobante as a stored file reference, `pickupAvailable` computed on read) are implementation-facing, not product-facing, but were pulled into `prd.md`'s FR "Consequences" where they constrain what a testable acceptance criterion can claim.
- Track-scope decision (Buyer/Collector only, Seller/Business deferred) and the three Discovery decisions (protagonist, comprobante NFR, FR-9 scope) are recorded in `.memlog.md` and will be carried into the exercise's final `decision-log.md` at the end of Phase 5.
