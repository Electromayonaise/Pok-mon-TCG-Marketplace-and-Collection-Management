# Feature Impact Analysis — Trigger Map Prioritization

> Scoring method: Frequency × Intensity × Fit, each 1–5, summed (max 15). Source personas in `personas/`. Full methodology: `_bmad/wds/data/agent-guides/saga/trigger-mapping.md`.

## All Driving Forces, Ranked

| Rank | Persona | Force | Freq | Int | Fit | Total | Priority |
|---|---|---|---|---|---|---|---|
| 1 | Release-Driven Collector | Trust the displayed price is the real Colombian market price, not inflated or stale | 5 | 5 | 5 | **15** | HIGH |
| 1 | Release-Driven Collector | Avoid paying an inflated price with no independent Colombian reference | 5 | 5 | 5 | **15** | HIGH |
| 3 | Casual Buyer | Compare a listing's price against a fair reference value within seconds | 5 | 4 | 5 | **14** | HIGH |
| 3 | Casual Buyer | Avoid tabbing out to an external price tracker to sanity-check a listing | 5 | 4 | 5 | **14** | HIGH |
| 5 | Release-Driven Collector | See newly bought cards reflected in the binder without manual re-entry | 4 | 4 | 5 | **13** | MEDIUM |
| 5 | Release-Driven Collector | Avoid the manual reconciliation grind across three disconnected tools | 4 | 4 | 5 | **13** | MEDIUM |
| 5 | Verified Business | Be seen as a credible, verified shop distinct from an anonymous seller | 4 | 4 | 5 | **13** | MEDIUM |
| 8 | Verified Business | Know commission cost predictably in advance | 3 | 4 | 5 | **12** | MEDIUM |
| 8 | Verified Business | Avoid a purchase completing without clear payment/delivery confirmation | 3 | 5 | 4 | **12** | MEDIUM |
| 10 | Individual Seller | Be found by a nearby buyer for in-person pickup | 3 | 4 | 4 | **11** | MEDIUM |
| 10 | Individual Seller | Signal trade-openness distinctly from a straight sale | 3 | 3 | 5 | **11** | MEDIUM |
| 10 | Individual Seller | Avoid the structurelessness of WhatsApp/Telegram groups | 4 | 3 | 4 | **11** | MEDIUM |
| 10 | Verified Business | Avoid listings silently going invisible when balance runs low | 2 | 4 | 5 | **11** | MEDIUM |
| 14 | Release-Driven Collector | Add a just-released/promo card to the binder before it's catalogued | 3 | 3 | 4 | **10** | LOW |
| 14 | Casual Buyer | Reach a seller without a heavy signup/commitment step | 3 | 3 | 4 | **10** | LOW |
| 14 | Individual Seller | Avoid being ghosted or scammed by a buyer who never follows through | 3 | 5 | 2 | **10** | LOW\* |

**\*See flag below — low total score, but flagged as a product-limitation gap, not a force to drop.**

## Using Scores Strategically

**Design for 14–15 first:** Price-trust — both the fear (paying inflated prices) and the desire (fast fairness comparison) — is the single highest-leverage cluster, shared across two personas (Collector, Casual Buyer). This converges directly with the Design Focus Statement in `trigger-map.md`: **the card detail / listing view is the platform's highest-leverage surface.**

**Group 11–13 into common solutions:** Reconciliation-friction forces (Collector) and credibility/predictability forces (Verified Business) cluster around **trustworthy, low-friction state visibility** — binder auto-sync on one side, balance/commission/confirmation clarity on the other. Different personas, same underlying design principle: never leave a user guessing what state their data or money is in.

**Defer <10, but check for product limitations first:** Only one force scores below 10 in a way that matters strategically — see the gap below. The other two (add-via-link, low-friction contact) are genuinely lower priority, not hidden gaps.

## Identified Gap: High-Intensity, Low-Fit Force

**Individual Seller — "avoid being ghosted or scammed by a buyer" scores 10/15 (LOW) despite 5/5 intensity, because Fit is only 2/5.**

Per the scoring guide's own interpretation rule: *"High-intensity forces with low fit = product limitation."* The platform's actual exchange happens off-platform (external handoff, matching the existing individual-seller model), so full escrow-style enforcement isn't available without changing a deliberate Platform Mechanics decision (no escrow; identity-backed reputation instead).

**Resolution reached during the workshop (two-tier split):**
- **In scope, UX-layer fix:** Label reviews as unverified vs. verified-purchase, so a counterpart can see at a glance whether a review reflects a confirmed transaction.
- **Out of scope, logged as future research:** Any actual enforcement mechanism (mandatory confirmation gates, escrow-like holds) for individual-seller trades — would require revisiting the no-escrow trust-model decision itself, not a Trigger-Map-scope fix.

This is the kind of gap Feature Impact Analysis is meant to surface: a real fear that the current product design can only partially address, made explicit instead of silently dropped for scoring low.
