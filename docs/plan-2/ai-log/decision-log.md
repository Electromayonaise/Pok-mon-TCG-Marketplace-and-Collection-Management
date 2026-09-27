# Decision Log — Plan-2 (All 12 Modules, Single Package)

**Scope:** TEZG Pokémon TCG Marketplace and Collection Management — Plan-2 course exercise, all 12 subsystem modules planned as one integrated package (see `task-statement.md`, Appendix B).
**Team:** Martín Gómez, Mateo Rubio.
**Purpose:** record every point where human judgment directed, corrected or constrained the AI. Each entry records the **decision**, the **alternatives considered**, the **rationale**, the proposing persona/skill and the key prompt (or an excerpt). Rejected, corrected or improved AI proposals are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`. Mechanical extractions and fixes resolved by existing precedent are excluded.

**Operating rule:** the agent drafts each phase and presents proposals and review triage with a recommendation; the team decides at a per-phase gate; the log records exactly what the team decided, never an agent-inferred decision.

---

### 1. Plan all 12 modules as one single package (Phase 0 — Scope)
**Decision:** the team plans all 12 Annex modules in **one** package (one PRD, one UX set, one architecture, one readiness gate, one decision log) rather than one module per pair, with the instructor's written approval.
**Alternatives considered:** one module, as in the default statement; twelve per-module packages; splitting modules between the two team members.
**Rationale:** TEZG is the team's own independent project and the goal is a product that is fully functional at the end. The instructor allowed covering all modules on condition of a single package, noting that splitting the documents between members "later will be complicated to put them together".
**Source:** email exchange with the instructor (quoted in `task-statement.md`, Appendix B). Not an AI proposal.

### 2. Four package-shape choices for the single package (Phase 0 — Planning)
**Decision:** the team adopted the agent's recommended option on each of four questions:
- **Depth:** all 12 modules at full depth (FRs/NFRs, scenarios and ADs at implementable level).
- **UX scenarios:** one folder per module, `ux/C-UX-Scenarios/NN-<code>-<slug>/`, each with its 4 outlines and page specs, plus `00-ux-scenarios.md` as index and coverage matrix (48 scenarios).
- **AD budget:** 6–8 cross-cutting `AD-SYS-n` plus 2–4 `AD-<CODE>-n` per module, only where a rule is not already stated by AD-1..19 or `AD-SYS` (≈35–45 in total).
- **Decision cadence:** one human gate per phase.

**Alternatives considered:**
- Depth: *staggered* (Foundation modules already covered by Plan-1 — IDN, MSG, REP — lighter, the rest marked for later definition); *subset + deferred* (6–8 modules now, the rest formally deferred to a Plan-2b).
- UX scenarios: *one file per module* (12 long files); *4 end-to-end journeys* plus a matrix mapping the 48 Annex scenarios.
- AD budget: *6–8 per module* (≈80 ADs, heavy repetition of inherited rules); *6–8 in total* (leaves the Advanced modules INV, COM, ORD, TRD without their own invariants).
- Cadence: *gate per module* (≈48 stopping points); *everything at the end* (weakens evidence that human judgment guided each step).

**Rationale:** full depth matches the instructor's condition for a fully functional product; per-module scenario folders keep fidelity to the Annex and FR↔scenario traceability; the split AD budget satisfies the rubric's "6–8" without restating inherited invariants; a per-phase gate yields real human decisions without stalling each module.
**Persona/skill:** agent planning turn (Claude Code), presented as a four-question choice menu, each with a recommended option.
**Prompt (excerpt):** "revisa si consideras la adaptación actual correcta, luego empieza con tu plan de implementación. Ten en cuenta que dado que es el proyecto independiente, realizaremos todos los módulos."

### 3. Contact-message service stays owned by `listings` (Phase 0 — Statement review)
**Decision:** Module 12 (MSG) *specifies* both contact paths, but the external-handoff contact-message service (CAP-6) stays code-owned by `listings`, as AD-4 and the spine's traceability table state; only in-app business messaging (CAP-18) lives in `messaging`. Module 8 (TRD) references the service as owned by `listings`.
**Alternatives considered:** move the service into `messaging`, as the first draft of the adapted statement had it — which would require a logged deviation from AD-1/AD-4 and a new `trading → messaging` dependency edge.
**Rationale:** the adopted spine already fixes `messaging → identity` as `messaging`'s only dependency and makes trade acceptance reuse `listings`' contact-message and reservation services; keeping it there preserves the AD-1 graph and the `trading` reuse with no deviation from an adopted invariant.
**Persona/skill:** agent review of `task-statement.md` against `ARCHITECTURE-SPINE.md` (finding B1), presented with a recommended option; the team chose the recommendation.

### 4. Launch-grade rigor and Fast path for the PRD (Phase 1 — PRD)
**Decision:** the PRD is written to launch-grade rigor, because the team intends to launch TEZG for real and not only as an academic prototype. The agent drafts the full PRD in one pass (Fast path), tagging every inference `[ASSUMPTION]`, and the team reviews at the phase gate.
**Alternatives considered:** stakes: hobby or internal-tool depth. Working mode: Coaching path, walking the PM sections together (Vision + Features, or Journey-led).
**Rationale:** real money (commission ledger), real personal data (Ley 1581) and real disputes are in scope. Only the Fast path fits twelve modules into one package while keeping the human decisions at the gate.
**Persona/skill:** `bmad-prd` (stakes probe and working-mode choice, with Fast path recommended).
**Prompt (excerpt):** "En juego en verdad esta el rigor dado que la idea es lanzar esta plataforma de verdad, mas alla de un prototipo academicop. Trabajemos con el fast path como recomiendas."

### 5. Reapplication after rejection depends on the reason, configured by admins (Phase 1 — VER)
**Decision:** a rejected business may reapply depending on the rejection reason. Each reason carries either a retry cooldown or a permanent bar, and an admin-panel section configures reason → cooldown/bar (PRD FR-VER-6, FR-VER-8; defaults in `ADD-§9.1`).
**Alternatives considered:** none presented as options. The agent asked an open question about reapplication, and this rule is the team's own answer.
**Rationale:** a data mismatch deserves a short retry window, while suspected fraud should not be retried. Admins, not code, should tune these values.
**Persona/skill:** `bmad-prd` Fast-path gap question.
**Prompt (excerpt):** "despues de un rechazo, el negocio se puede volver a postular dependiendo de la razon del rechazo … Seria bueno tener en el panel de admin una seccion que configura … cuanto es el timeout de reintento o si directamenbte no puede volverse a postular."

### 6. A Pending business can receive in-app messages, with an explicit notice (Phase 1 — MSG)
**Decision:** while a business's application is `Pending`, buyers may message it in-app, and the sender sees an explicit "not yet verified" notice (`RecipientNotYetVerified`, FR-MSG-4).
**Alternatives considered:** none presented as options (open question, answered by the team).
**Rationale:** a Pending business can already list (Plan-1 FR-S9), so buyers need a way to ask questions. The notice keeps them informed about the missing verification.
**Persona/skill:** `bmad-prd` Fast-path gap question.
**Prompt (excerpt):** "Cuando un negocio esta en estado pending … puede recibir mensajes, pero con un aviso explicito de que el negocio no ha sido verificado."

### 7. Accepting a trade offer makes competing offers Unfulfillable (Phase 1 — TRD)
**Decision:** the team adopted the agent's suggestion, carried over from a Plan-1 assumption. When an offer takes the last unit, the listing's other open offers become `Unfulfillable` and their proposers see why (`ListingNoLongerAvailable`, FR-TRD-5).
**Alternatives considered:** only the suggested behaviour was put to the team.
**Rationale:** leaving competing offers open after the stock is gone would let a second acceptance oversell.
**Persona/skill:** `bmad-prd` Fast-path gap question.
**Prompt (excerpt):** "Cuando se acepta una oferta ve por lo sugerido."

### 8. Reference-price freshness equals the source's update period (Phase 1 — CAT)
**Decision:** a reference price counts as stale once it is older than the external feed's own update period. The exact value is measured during implementation, and fixtures use 24 h plus 12 h of grace (A-13).
**Alternatives considered:** none presented as options (open question, answered by the team).
**Rationale:** a fixed threshold that doesn't match the feed would either flag every price as stale or hide real staleness.
**Persona/skill:** `bmad-prd` Fast-path gap question.
**Prompt (excerpt):** "El umbral de antiguedad es el periodo de actualizacion que tenga nuestra fuente, es algo a testear cuando se este implementadndo."

### 9. `SellerNotVerified` applies only to Rejected businesses (Phase 1 — INV/IDN)
**Decision:** creating or restoring a listing fails with `SellerNotVerified` only when the business's latest application is `Rejected` (in cooldown or barred). A `Pending` business may list, as Plan-1 FR-S9 allows.
**Alternatives considered:**
- also block before any application exists, which adds a draft state that the SPEC doesn't define;
- block both Pending and Rejected, which returns to the original SPEC and reverses Plan-1 FR-S9 as a logged deviation.

**Rationale:** Rejected is the only state where the error still makes sense without contradicting Plan-1.
**Persona/skill:** `bmad-prd`. The team asked what the state meant, and the agent explained it and gave a three-option menu with a recommendation. The team chose the recommendation.
**Prompt (excerpt):** "En los estados de cuenta de seller noy verified explicame mejor a que se refiere…"

### 10. A rejected business's listings are withdrawn, not deleted (Phase 1 — VER/INV)
**Decision:** if a business rejected after listing while `Pending`, its listings leave browse and stop being purchasable. They are kept (never deleted) and restored if the business is later approved (FR-INV-8).
**Alternatives considered:** keep them visible but paused (exposes a rejected business to buyers); keep them active as "unverified" (lets a rejected business keep selling).
**Rationale:** consistent with the hide-never-delete rule, and it protects buyers from a business that may have been rejected for fraud.
**Persona/skill:** `bmad-prd` choice menu with a recommendation. The team chose the recommendation.

### 11. Commission top-ups are confirmed manually with a comprobante, behind a port (Phase 1 — COM)
**Decision:** the business transfers to the platform's account and uploads a comprobante. An admin confirms it, and the ledger is credited. Confirmation sits behind `TopUpConfirmationPort` (`ADD-§7`), so a provider webhook can be plugged in later without redesign.
**Alternatives considered:**
- a webhook in V1 (Wompi or Mercado Pago), which is viable but amends the SPEC non-goal on payment gateways;
- manual entry without a comprobante, which leaves no auditable evidence.

**Rationale:** it respects the SPEC non-goal, leaves an auditable trail, and keeps the webhook path open, which the team had asked the agent to assess.
**Persona/skill:** `bmad-prd` choice menu with a recommendation. The team chose the recommendation.
**Prompt (excerpt):** "Lo de la recarga podemos dejarlo inicialmente a mano, o un webhook de algun tipo, verifica la viabilidad."

### 12. `[CORRECTED]` FX source: official TRM instead of "the Google rate" (Phase 1 — VAL/CAT)
**Decision:** USD→COP conversion uses the official TRM (Superintendencia Financiera) from datos.gov.co dataset `32sa-8pi3`. It is fetched daily, shown with its effective date, and kept behind a swappable adapter (`ADD-§6`).
**Correction:** the team's first instruction was "la fuente de el tipo de cambio siempre sera la tasa de google". The agent's viability check found that Google has offered no public FX API since 2012: `GOOGLEFINANCE` runs only inside Sheets, and scraping breaks Google's terms. The agent brought this back to the team as a choice rather than implementing a workaround, and the team changed its decision. Unlike the usual `[CORRECTED]` entry, the agent's finding corrected the team's instruction here, not the other way round.
**Alternatives considered:** a commercial API (Open Exchange Rates, CurrencyFreaks): intraday and closer to what Google shows, but paid and tied to one vendor. A scraper of Google: against its terms and fragile.
**Rationale:** the TRM is Colombia's legal reference rate. It is free and stable, and the adapter keeps the provider replaceable.
**Persona/skill:** `bmad-prd`, with a web viability check and then a choice menu with a recommendation.

### 13. Commission is charged on whichever comes first: business confirmation or buyer close (Phase 1 gate — OQ-3)
**Decision:** a deduction happens once per order, triggered by whichever comes first: `OrderPaymentConfirmedByBusiness` or `OrderClosed`. Its effective time is the earlier of the two facts, so delivery order never changes the amount or rate. Each entry records its trigger (`businessConfirmed` or `buyerClosed`), and admins can review buyer-closed charges (FR-COM-4, FR-COM-8). This amends AD-3's "only by `OrderPaymentConfirmedByBusiness`" trigger, and Phase 3 records the amendment as an AD-SYS.
**Alternatives considered:** an admin view of closed-but-unconfirmed orders with no automatic charge.
**Rationale:** without it, a business that never confirms payment is never charged, because the buyer can close the order on their own. A buyer's confirmation that the item arrived is strong evidence of a sale, and the open-order limits curb abuse.
**Persona/skill:** open question OQ-3 in the PRD, surfaced by the drafting agent and sharpened by the adversarial review (`bmad-review-adversarial-general`). Presented at the Phase 1 gate with a recommendation, and the team chose it.

### 14. Remaining Phase 1 gate answers (OQ-1, OQ-5, OQ-11, OQ-12)
**Decision:** the team adopted the recommendation on each question.
- **OQ-1:** a business with a `Rejected` application cannot switch to the individual-seller profile (`BusinessApplicationOnFile`).
- **OQ-5:** platform-wide personal-data consent (sign-up, plus a separate consent for sharing the phone number) is adopted beyond AD-13's `legalIdentity` scope.
- **OQ-11:** operational limits become configuration values, revisited after 30 days of launch data (`ADD-§9.3`):
  - unpaid-order TTL 48 h, open-offer TTL 7 days;
  - contact limits 30/h, 10 per seller per day, 60/h per IP;
  - top-up COP 20,000–10,000,000;
  - open orders 3 per buyer and 1 per buyer per business;
  - auth throttles.
- **OQ-12:** retention defaults (`ADD-§9.4`), with legal review before launch; data-subject requests are handled manually by an admin at launch:
  - legal-identity data 5 years after the last decision;
  - buyer comprobantes 5 years;
  - top-up proofs 10 years;
  - phones and messages until account closure plus 1 year.

**Alternatives considered:**
- OQ-1: allow the switch (opens a route around verification).
- OQ-5: consent for legal identity only (leaves phones, locations and messages uncovered).
- OQ-11 and OQ-12: adjust individual values.

**Rationale:** OQ-1 stops a business rejected for fraud from continuing to sell as an individual. OQ-5 reflects that Ley 1581 covers every personal-data class the platform holds. The OQ-11 and OQ-12 defaults are conservative and can be changed without code. Top-up proofs got 10 years instead of the 5 in the first draft, because they support the platform's own accounting (Ley 962 de 2005, art. 28, still to be verified by legal counsel).
**Persona/skill:** open questions from `bmad-prd` and the adversarial review (OQ-12 comes from finding F-15). Presented at the Phase 1 gate with recommendations.

### 15. Buyer-side "mute conversation" enters V1 as FR-MSG-8 (Phase 2 gate — F-29 / UX-A-1)
**Decision:** the buyer in an in-app conversation can mute it. A muted thread still receives messages, leaves the buyer's total unread count, moves to a "Silenciadas" filter, and the business is never told. Unmuting reverses it. The PRD gains FR-MSG-8. Blocking and reporting stay out of scope with the SPEC non-goal.
**Alternatives considered:** defer the mute to v2 and leave F-29 open until harassment reports arrive after launch (the Phase 1 triage of F-29).
**Rationale:** it removes most of the residual harm F-29 describes (an unwanted unread badge and unwanted text in a thread the buyer started) at the cost of one per-participant timestamp, with no moderation tooling.
**Persona/skill:** `bmad-ux` (Messaging Safety evaluation that the Phase 1 gate assigned to UX). Presented at the Phase 2 gate with a recommendation, and the team chose it.

### 16. Remaining Phase 2 gate answers (voice, REP/MSG assumptions, edge-case triage)
**Decision:** the team adopted the recommendation on each item.
- **Voice:** *usted* in the admin panel and in business-verification messages, *tú* in the selling flow (ADD-§1.1). The UX-A-2 refusal copy, which advises an individual seller to open a separate account for a shop, is confirmed.
- **REP and MSG assumptions** where the PRD is silent are adopted as working assumptions, for Phase 3 to turn into contract rules:
  - no edit of a hidden review;
  - admin search is an exact substring match, ignoring case and accents;
  - audit rows keep a snapshot, with no export;
  - a reload of 12.1 counts as a contact;
  - trade handoffs are exempt from contact limits;
  - a thread takes messages again when the shop is Pending again;
  - no read receipts.
- **Edge-case review triage** (`reviews/review-ux-edge-cases.md`) is adopted in full: 30 Accept, 14 Defer, 9 Reject. That includes UX-A-3 (an unchanged counter is refused in the client, and Phase 3 decides the server rule) and UX-A-4 ("General" is offered and created on the first save when no collection exists).

**Alternatives considered:**
- Voice: *usted* across all business chrome, or softer UX-A-2 copy without the separate-account advice.
- Assumptions: review each one before Phase 3.
- Triage: also decide now that FR-TRD-2 refuses an identical counter on the server.

**Rationale:**
- The voice split separates formal verification from day-to-day selling.
- The assumptions are conservative and already specified, so they do not block architecture.
- Every Defer in the triage has an owner, and every Reject cites the line where the case is already handled.

**Persona/skill:** `bmad-ux` open items and `bmad-review-edge-case-hunter` triage. Presented at the Phase 2 gate with recommendations.
