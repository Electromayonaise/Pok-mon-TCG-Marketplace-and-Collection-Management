# Addendum: TEZG — Seller/Business Track

*Depth that belongs to this exercise's context but doesn't earn a place in `prd.md`'s main narrative — course-mapping rationale, rejected alternatives, and extended persona background. Audit/override information is never here; it lives in `.memlog.md`.*

## Course exercise mapping (Smart Solar Flow → TEZG)

This PRD is produced for the "Plan-1: AI-Assisted Product Planning" course activity, whose template case study is a fictional product called Smart Solar Flow with two tracks — Host (Marco, solar-installation owner) and Guest (Daniela, EV-charging guest). The real subject is TEZG; this table records how the course's Track B (Host) structure was re-mapped onto TEZG's Seller/Business personas, for anyone auditing the exercise's fidelity to the original assignment.

| Course concept (Track B / Host) | TEZG equivalent | Fit |
|---|---|---|
| Two separate apps (host-app, guest-web) | One responsive web app | **Divergence** — as with the Buyer/Collector track, "track" here means persona-scoped documentation, not a separate codebase. |
| Marco (single host protagonist) | Valentina (Individual Seller) + Andrés (Verified Business) — two protagonists | **Divergence, resolved as a decision** — TEZG has two structurally distinct seller personas (trigger-map.md Priority 2 vs. Priority 4) where the course's Host track assumes one. Confirmed via AskUserQuestion during Discovery rather than forcing a single composite protagonist; see decision log. |
| H1 Host onboarding, registers asset | S1 Individual-seller profile completion + first listing | Close — no "asset registration" concept; replaced with listing publication, TEZG's equivalent unit of host-side inventory. |
| H2 Host manages incoming reservation requests | S2 Trade offer management | Close — "reservation request" maps to "trade offer," same accept/reject/counter shape (CAP-25). |
| H1/H3 Host onboarding + availability/pause management | S3 Business verification + commission balance | **Near-exact for the pause half** — TEZG's balance-exhaustion pause (CAP-21) independently arrived at the same "pause, never delete" design as an availability toggle would need. The onboarding half diverges: TEZG's business verification (CAP-15) is a manual admin-approval gate, not self-service availability setup. |
| H4 Host confirms session completed, billing | S4 Business fulfills a sale | **Near-exact** — "confirm session completed" maps directly to `sellerReceivedConfirmedAt`; TEZG's tri-state model already independently isolates the host/business's confirmation from the guest/buyer's own closing confirmation, matching the course's implied host/guest asymmetry. |

## Rejected alternative: single composite seller protagonist

During Discovery, considered documenting the Seller/Business track with one composite protagonist (e.g., "a seller" covering both individual and business behavior in one persona), the same shape the Buyer/Collector track used successfully with Valentina. Rejected because:
- TEZG's two seller personas are not the same population wearing different hats (unlike Valentina's buyer/individual-seller dual role) — SPEC.md's "Safe" assumption makes them *mutually exclusive account states*, so a single protagonist experiencing both would misrepresent the platform's own rule to a reader.
- Individual Seller (Priority 2) and Verified Business (Priority 4) have materially different driving forces per `trigger-map.md` — trade-openness/low-friction vs. credibility/predictable-cost — that a composite persona would blur or force an artificial choice between.
- The user was presented this exact trade-off via AskUserQuestion (one vs. two protagonists) and explicitly chose two protagonists with 2+2 scenarios, prioritizing scope fidelity over course-template conformity.

## Extended persona note: Andrés

Not required by the PRD's UJ format, but useful background for whoever designs the UI next: Andrés fits `_bmad-output/B-Trigger-Map/personas/04-verified-business.md` (Priority 4) — a small-shop owner already running an informal Instagram-based storefront before discovering TEZG. His defining tension isn't discovering the platform (he already sells cards) but deciding whether formal verification is worth trading some autonomy (admin approval gate, prepaid commission cost) for credibility and in-platform purchasability he can't get by staying an Instagram DM seller. Unlike Valentina, he has no dual role in this track's scenarios — he is a business account only, per SPEC.md's seller-exclusivity assumption — though nothing prevents the same human from also buying cards on TEZG under a separate account relationship, which this PRD does not model (see `prd.md` §2.2).

## Sourcing notes

- CAP numbers throughout `prd.md` are cited, not restated in full — always cross-check against `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` if a CAP's exact wording matters.
- `project-context.md` rules (e.g. `openToTrade` enforcement at the `Listing` aggregate boundary, comprobante as a stored file reference) are implementation-facing, not product-facing, but were pulled into `prd.md`'s FR "Consequences" where they constrain what a testable acceptance criterion can claim.
- The FR-S numbering prefix (distinct from the Buyer track's unprefixed FR-N) and the two-protagonist decision are recorded in `.memlog.md` and will be carried into this track's `decision-log.md` at the end of Phase 5.
- The comprobante-ACL and Order-read-ownership open architecture decisions are deliberately **not** re-opened as this track's own open questions — they are logged once, in the governing plan file (`C:\Users\agaza\.claude\plans\streamed-singing-donut.md`), as shared cross-track decisions resolved in whichever track's Architecture phase (Fase 4) runs first.
- **Explicit cross-file dependency (added during Seller-track triage):** `prd.md`'s §1 Vision and S1-S2 assume Valentina's characterization in `docs/plan-1-buyer-track/prd.md` §1 Vision / addendum's "Extended persona note" remains stable. If that document's protagonist description changes, this PRD's Vision and S1-S2 should be revisited for drift — unlike a version-pinned citation, nothing here would otherwise flag that automatically.
