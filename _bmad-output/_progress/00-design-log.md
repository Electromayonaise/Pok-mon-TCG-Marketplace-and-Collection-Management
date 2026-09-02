# Design Log

**Project:** Pokémon TCG Marketplace and Collection Management Platform
**Started:** 2026-08-24
**Method:** Whiteport Design Studio (WDS)

---

## Backlog

> Business-value items. Add links to detail files if needed.

- [x] ~~Complete product brief — Phase 1~~ (`wds-1-project-brief`, via Saga) — complete 2026-08-24
- [x] ~~Define trigger map — Phase 2~~ — complete 2026-09-01 (`wds-2-trigger-mapping`, Suggest mode, from-existing-documentation path — re-run per BMAD Closure Assignment Repair Plan Step 1)
- [x] ~~Distill brief into SPEC.md~~ — `bmad-spec` — complete
- [x] ~~Produce ARCHITECTURE-SPINE.md~~ — `bmad-architecture` — complete
- [x] ~~Fold adversarial-divergence review's proposed ADs (AD-9, AD-10, AD-11, amended AD-4/AD-6) into ARCHITECTURE-SPINE.md~~ — verified complete 2026-09-01, done pre-session in commit `9596c7f` (2026-08-25). 5/6 findings merged verbatim; Finding 4 (event delivery) deliberately diverges — spine adopts best-effort/no-retry instead of the review's transactional-outbox proposal, an explicit free-tier trade-off, not an oversight. See design-log entry below.
- [x] ~~Repair Plan Step 2: Vercel Hobby-tier ToS validation~~ — complete 2026-09-01. Confirmed non-compliant (see log entry below); team decision: accept the risk, stay on Hobby for now.
- [x] ~~Repair Plan Step 3: Ley 1581 mechanism design~~ — complete 2026-09-01. `legalIdentity` classified as ordinary (not sensitive-category) personal data; standard-consent mechanism defined. See log entry below.
- [x] ~~Repair Plan Step 4: fold Steps 1–3 outputs into SPEC.md and both ARCHITECTURE-SPINE.md copies~~ — complete 2026-09-01. Added AD-13 (Ley 1581), resolved the Vercel Deferred entry, updated SPEC.md's `legalIdentity` constraint line. See log entry below.
- [x] ~~Repair Plan Step 5: re-run adversarial-divergence review against the updated spine~~ — complete 2026-09-01. 2 new findings (Medium, Low) on AD-13, both fixed inline. See log entry below.
- [x] ~~Repair Plan Step 6: new bmad-project-context artifact~~ — complete 2026-09-01. `project-context.md` generated via `bmad-generate-project-context`, 47 rules across 7 categories. See log entry below.

---

## Current

| Task | Started | Agent |
|------|---------|-------|
| — | — | — |

**Rules:** Mark what you start. Complete it when done (move to Log). One task at a time per agent.

---

## Design Loop Status

> Per-page design progress. Updated by agents at every design transition.

| Scenario | Step | Page | Status | Updated |
|----------|------|------|--------|---------|

**Status values:** `discussed` → `wireframed` → `specified` → `explored` → `building` → `built` → `approved` | `removed`

**How to use:**
- **Append a row** when a page reaches a new status (do not overwrite — latest row per page is current status)
- **Read on startup** to see where the project stands and what to suggest next

---

## Log

### 2026-09-01 — Phase 2: Trigger Map Complete (Repair Plan Step 1)

**Agent:** Saga (Trigger Mapping, Suggest mode)
**Trigger:** BMAD High Spec Closure Assignment, Part 4 Repair Plan Step 1

**Artifacts Created:**
- `B-Trigger-Map/trigger-map.md`
- `B-Trigger-Map/personas/01-release-driven-collector.md`
- `B-Trigger-Map/personas/02-individual-seller.md`
- `B-Trigger-Map/personas/03-casual-buyer.md`
- `B-Trigger-Map/personas/04-verified-business.md`
- `B-Trigger-Map/feature-impact-analysis.md`
- `_progress/agent-experiences/2026-09-01-trigger-map-suggest.md`

**Summary:** Ran the "from existing documentation" path (step-00a) against `project-brief.md`, `SPEC.md`, and `persona-archetypes.md`, then Overview (step-01) in Suggest mode. Produced 3 Business Goals (go-to platform, business revenue, ship non-negotiable core by Nov 2026), 4 prioritized target groups (Release-Driven Collector, Individual Seller, Casual Buyer, Verified Business — Platform Administrator and Community excluded as non-demand-side), deep personas with scored positive/negative driving forces, and a Design Focus Statement converging on the card detail/listing view as the platform's highest-leverage surface (price-trust is the dominant force across two personas). Surfaced one genuine gap: the Individual Seller's fear of buyer ghosting scores low on fit (no escrow) despite high intensity — resolved as an in-scope UX fix (label unverified vs. verified-purchase reviews) plus an out-of-scope deferred research item (any actual enforcement mechanism). Note: this workshop is UX/psychology-focused per its actual Effect Mapping methodology and does not address the separate technical event-contract gaps found by the architecture review's adversarial-divergence pass — those are being folded into `ARCHITECTURE-SPINE.md` as a separate task per the same Repair Plan step.

**Next:** Verify whether the adversarial-divergence review's proposed ADs are already folded into `ARCHITECTURE-SPINE.md` before redoing that work, then Repair Plan Steps 2–6.

### 2026-09-01 — Repair Plan Step 1 (AD-folding half): verified already complete

**Trigger:** "Do both" decision's second half — fold `review-adversarial-divergence.md`'s 6 findings into `ARCHITECTURE-SPINE.md`.

**Finding:** Re-read the current spine (both copies: `planning-artifacts/architecture/.../ARCHITECTURE-SPINE.md` and its `specs/spec-pokemon-tcg-marketplace/` companion) against the review's 6 findings before making any edit. All of it was already merged, in commit `9596c7f` ("Spec Task 2: finalize architecture spine with ADRs, remediate peer review, clean up deliverable layout", 2026-08-25) — a commit that predates this session. No edit was needed; this closes out that half of Step 1 as verification, not new work.

- Finding 1 (Critical, thin-event payloads) → AD-9, merged near-verbatim.
- Finding 2 (Critical, InventoryUnit decrement timing) → AD-6 amended, merged, explicitly cites "adversarial reviewer Critical finding."
- Finding 3 (High, trade closure vs. inventory) → AD-4 amended, merged (`trading` calls `listings.reserveInventory` directly).
- Finding 4 (High, event delivery/failure semantics) → **partially diverges.** AD-10 solves the rollback-coupling half (subscriber failure never rolls back publisher) but deliberately rejects the review's transactional-outbox/at-least-once proposal in favor of post-commit, best-effort, no-retry delivery — reasoned explicitly as a free-tier/2-person-team trade-off, with a missed side effect accepted as a "Deferred operational-remediation gap" rather than solved now. Flagged to the user as a conscious risk-acceptance worth re-confirming, not silently left unaddressed.
- Finding 5 (Medium, TradeOffer closure representation) → AD-4 amended, merged (computed property, never stored status).
- Finding 6 (Medium, DomainError ownership) → AD-11, merged (explicit one-owner-per-code list).

### 2026-09-01 — Repair Plan Step 2: Vercel Hobby-tier ToS — confirmed non-compliant, risk accepted

**Trigger:** BMAD Closure Assignment Repair Plan Step 2 ("Validate the Vercel Hobby-tier commercial-use ToS question definitively").

**Finding:** Pulled Vercel's own Fair Use Guidelines (`vercel.com/docs/limits/fair-use-guidelines`, updated 2026-07-29) and Terms of Service §4 directly. Commercial usage is defined as *"any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project"* — includes "any method of requesting or processing payment from visitors of the site." Purpose, not realized revenue, triggers it. Since the platform is one single deployable (modular monolith, `ARCHITECTURE-SPINE.md` Design Paradigm) with commission processing (`commission` module, AD-3) built in from day one, the entire production deployment counts as commercial usage the moment it's live — not a partial or later-stage concern. **Vercel Hobby tier is confirmed non-compliant**, upgrading this from "flagged, unresolved" (prior Deferred entry) to a confirmed fact.

**Decision:** Team chose to **accept the risk and stay on Vercel Hobby** rather than upgrade to Pro (~$20/mo, breaks the free-tier-first constraint) or switch hosting providers. Rationale not elicited beyond the choice itself — bet on pre-revenue/low-visibility usage not triggering enforcement before the team revisits this. Vercel's enforcement is entirely discretionary ("with or without notice... for any reason or no reason" per ToS §4) — the accepted risk is a Hobby deployment being disabled/removed without warning, not just a ToS technicality.

**Next:** Fold this decision into `ARCHITECTURE-SPINE.md`'s Deferred section at Step 4 (alongside Step 3's Ley 1581 output), replacing the "flagged for the team, not resolved here" language with the confirmed finding + accepted-risk decision.

### 2026-09-01 — Repair Plan Step 3: Ley 1581 (habeas data) compliance mechanism for `legalIdentity`

**Trigger:** BMAD Closure Assignment Repair Plan Step 3 ("Validate the Ley 1581 compliance mechanism for `legalIdentity` collection") — SPEC.md flagged this as regulated personal data with "the specific mechanism... deferred to architecture," never designed.

**Finding:** Ley 1581 binds the platform as data controller regardless of company size — only RNBD *registration* is size-gated (100,000 UVT ≈ USD $1.1M total assets, far above this team's scale, so registration is not required). Every other obligation applies in full. Verified Art. 5's statutory "sensitive data" list directly (racial/ethnic origin, political orientation, religious/philosophical convictions, union/social/human-rights-org membership, health, sex life, biometric data) against a secondary source (magist.io) that vaguely implied identity documents trigger heightened protection — the statutory list does not support that claim absent automated biometric matching, which CAP-15's manual admin-review design doesn't do. `legalIdentity` is therefore ordinary personal data under standard consent rules, not the heightened sensitive-data regime — a meaningfully lighter compliance bar than the secondary source implied. Concrete mechanism: (1) timestamped, non-pre-checked consent captured at business-application submission; (2) a published Privacy Policy/Aviso de Privacidad naming purpose, retention, and a designated rights-request contact, with response timelines under the implementing decree (commonly cited as 10 business days for a *consulta* / 15 for a *reclamo*, extendable once); (3) stored identity documents access-scoped to the admin-review path only.

**Decision:** No team decision needed — this is a legal compliance requirement, not a discretionary trade-off like Step 2's hosting choice. Recorded as new AD-13 in `ARCHITECTURE-SPINE.md` (both copies).

**Next:** Fold into both `ARCHITECTURE-SPINE.md` copies and SPEC.md alongside Step 2's resolved Vercel finding — Step 4.

### 2026-09-01 — Repair Plan Step 4: fold Steps 1–3 outputs into SPEC.md and ARCHITECTURE-SPINE.md

**Trigger:** BMAD Closure Assignment Repair Plan Step 4.

**Changes made (both `ARCHITECTURE-SPINE.md` copies — `planning-artifacts/architecture/.../` and `specs/spec-pokemon-tcg-marketplace/`):**
- Added **AD-13** — `legalIdentity` handling under Ley 1581 (ordinary personal data, standard consent, admin-scoped storage, no RNBD registration) — full ADR-format entry per Step 3's finding.
- Resolved the Vercel Deferred entry: replaced "flagged for the team, not resolved here" with the confirmed non-compliance finding and the accept-the-risk decision from Step 2.
- Updated the Stack table's Vercel row to reflect the confirmed/accepted status instead of "flagged as an open risk."
- Added a Deferred item naming the Privacy Policy page content + designated rights-request contact as an outstanding product/ops deliverable (not architecture) that AD-13 depends on.
- Added AD-13 to the Capability → Architecture Map's CAP-5/CAP-15 row.

**Changes made (`specs/spec-pokemon-tcg-marketplace/SPEC.md`):**
- Updated the `legalIdentity` constraint line to point at AD-13 instead of saying the mechanism is "deferred to architecture."

**Not changed:** The Trigger Map deliverables (Step 1) are UX/psychology artifacts standing on their own in `B-Trigger-Map/` — no SPEC.md or spine cross-references were added for them, since nothing in Steps 1's output named a spec/architecture-level gap requiring one (the one gap it did surface, individual-seller ghosting fear, was already resolved within the workshop itself as an in-scope UX fix plus an explicitly out-of-scope deferred item, per `feature-impact-analysis.md`).

**Next:** Repair Plan Step 5 — re-run the adversarial-divergence review against the updated spine (13 ADs now, not 12) to check the new AD-13 and the resolved Deferred items for consistency/conflicts before Step 6's bmad-project-context artifact.

### 2026-09-01 — Repair Plan Step 5: re-ran adversarial-divergence review against the updated spine

**Trigger:** BMAD Closure Assignment Repair Plan Step 5. Same mandate as the first pass (`review-adversarial-divergence.md`, 2026-08-25): construct two units one level down that each obey every AD to the letter yet still build incompatibly. Scoped to what changed since that pass — AD-13 (Ley 1581) and the resolved Vercel Deferred entry — since the first pass's 6 findings were already re-verified complete at Step 1.

**Artifact created:** `reviews/review-adversarial-divergence-2.md` (both spine copies share the same `reviews/` folder reference).

**Finding:** 2 new findings, both on AD-13, neither Critical/non-functional (CAP-15 stays buildable either way, unlike the first pass's InventoryUnit-oversell/event-payload findings):
- **Finding 7 (Medium):** AD-13 named the consent obligation narratively ("stored alongside the application") without pinning a field/table shape — the same class of gap the first review's Finding 1 found in event payloads. Two builders would diverge: a field on `BusinessApplication` vs. a general-purpose `ConsentRecord` table (the latter a reasonable reading of SPEC.md's broader, unscoped Ley 1581 framing). Fixed by naming exact fields (`legalIdentityConsentGivenAt`, `legalIdentityConsentVersion` on `BusinessApplication`) and adding an explicit scope note that AD-13 covers `legalIdentity` only, not Ley 1581 compliance platform-wide.
- **Finding 8 (Low):** no rule reconciles a genuine Ley 1581 deletion (supresión) request against an approved business's `legalIdentity` with AD-12's hide-never-delete convention used elsewhere in the spine. Low-volume edge case — added as a Deferred item rather than forcing a decision now.

**Decision:** Both findings fixed inline in this pass rather than surfaced as open questions — Finding 7 by tightening AD-13's Rule/Context/Decision/Consequences/Rejected-Alternatives text in both spine copies; Finding 8 by adding a Deferred bullet in both copies. No user decision needed for either (both are architecture-completeness fixes, not budget/product trade-offs like Step 2's Vercel choice).

**Next:** Repair Plan Step 6 — new bmad-project-context artifact recording the full set of decisions made across Steps 1-5.

### 2026-09-01 — Repair Plan Step 6: generated `project-context.md` via `bmad-generate-project-context`

**Trigger:** BMAD Closure Assignment Repair Plan Step 6 — final step, producing a `bmad-project-context.md`-style artifact.

**Process:** Ran the real, on-disk `bmad-generate-project-context` skill (not an improvised format) through its full micro-file flow — Step 1 discovery, Step 2's 7-category collaborative generation (Technology Stack, Language-Specific, Framework-Specific, Testing, Code Quality & Style, Development Workflow, Critical Don't-Miss Rules), Step 3 finalization — HALTing for an A/P/C menu selection at every category per the skill's protocol. The skill's `resolve_customization.py` dependency failed both times it was invoked (missing Python 3.11+/`tomllib`); fell back to the skill's own documented manual-read recovery path both times (base `customize.toml` read directly; no team/user override files found under `_bmad/custom/`), so base defaults applied unmodified throughout.

**Key finding surfaced mid-run:** this is a pre-implementation, planning-only repo — no source code exists yet — so the skill's "discover existing code patterns" premise didn't apply. All 47 rules across the 7 categories are derived from `ARCHITECTURE-SPINE.md`'s 13 ADs instead of observed code, and two categories (Testing, Code Quality & Style) explicitly flag what's genuinely undecided (test framework, linter/coverage config) rather than inventing conventions the team hasn't chosen. The final category (Critical Don't-Miss Rules) went through one round of Advanced Elicitation (Pre-mortem Analysis), surfacing 6 additional gotchas not in the first draft — three of them cases where the "obvious" generic design pattern (a shared `ConsentRecord` table, a shared moderation table, bare-id events) is specifically the one the spine's ADs reject.

**Decision:** No team decision needed — this is a documentation/tooling deliverable, not a trade-off.

**Next:** No further Repair Plan steps remain. All 6 steps are complete.

### 2026-08-24 — Phase 1: Product Brief Complete

**Agent:** Saga (Product Brief)
**Brief Level:** complete

**Artifacts Created:**
- `A-Product-Brief/00-product-brief.md` (folder index, updated to reflect completion)
- `A-Product-Brief/01-product-brief.md` (the Product Brief itself)
- `A-Product-Brief/dialog/00-context.md`
- `A-Product-Brief/dialog/client-profile.md`
- `A-Product-Brief/dialog/02-vision.md`
- `A-Product-Brief/dialog/07-positioning.md`
- `A-Product-Brief/dialog/03-users.md`
- `A-Product-Brief/dialog/04-concept.md`
- `A-Product-Brief/dialog/decisions.md` (14 numbered decisions + Step 12 synthesis entry)
- `A-Product-Brief/dialog/progress-tracker.md`

**Summary:** Used the existing Spec Task 1 SPEC.md as the starting truth per Martin's explicit direction, then deepened the strategic layer through Saga-facilitated dialog: positioning as "collection tracker with a marketplace attached" (not a marketplace-first product), business model confirmed as business-only monetization at launch via a prepaid commission balance (no payment gateway — peer-to-peer QR/bank-transfer payment with comprobante confirmation, deliberately not invoiced, since post-hoc collection has no enforcement), and delivery assurance built on a three-state confirmation plus identity-backed reputation instead of escrow. Surfaced several capability signals not present in the current SPEC.md: location/distance filtering for casual sellers, add-to-binder-via-link for unindexed cards, the full payment/commission/delivery-confirmation mechanics, and a new trading system (offer/counter-offer combining cards/product/money) for individual sellers on trade-flagged listings. Fixed/non-negotiable constraints: Colombia-only scope, the collection tracker, the virtual binder, and trading; flexible: the revenue and sell/payment-confirmation mechanisms specifically.

**Next:** `bmad-spec` (Trigger Mapping/Phase 2 skipped per exercise scope) — run in a fresh context window per the course handout's instruction never to chain SDD steps in the same session.

### 2026-08-24 — Project initialized (Phase 0)
- Type: greenfield
- Complexity: complex (web application)
- Tech stack: skipped (deliberate Non-Goal, see `docs/spec-task-1/SPEC.md`)
- Component library: custom
- Strategic analysis: simplified — Phase 2 (Trigger Mapping) skipped per course exercise handout ("not needed in this project")
- Existing materials registered: Problem Statement PDF, Spec Task 1 SPEC.md + JUSTIFICATION.md + human draft, Martín's peer review PDF, standalone `bmad-spec` run at `_bmad-output/specs/spec-pokemon-tcg-marketplace/`
- Working relationship: small business investment stakes, balanced involvement, Product Owner role, recommend-with-rationale style
- Output root confirmed as `_bmad-output/` (pre-existing BMad install config), not a new `design-process/` or `docs/` tree

---

## About This Folder

- **This file** — Single source of truth for project progress
- **agent-experiences/** — Compressed insights from design discussions (dated files)
- **wds-project-outline.yaml** — Project configuration from Phase 0 setup
- **../wds-workflow-status.yaml** — Compatibility status file downstream phase skills read

**Do not modify `wds-project-outline.yaml`** — it is the source of truth for project configuration.
