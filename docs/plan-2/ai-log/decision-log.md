# Decision Log — Plan-2 (All 12 Modules, Single Package)

**Scope:** TEZG Pokémon TCG Marketplace and Collection Management — Plan-2 course exercise, all 12 subsystem modules planned as one integrated package (see `task-statement.md`, Appendix B).
**Team:** Martín Gómez, Mateo Rubio.
**Purpose:** record every point where human judgment directed, corrected or constrained the AI. Each entry records the **decision** and the proposing persona/skill or human source. The **alternatives considered**, the **rationale** and the key prompt (or an excerpt) are recorded where applicable: an entry decided through a choice menu or a gate presentation cites that as its source, and prompts are not reconstructed after the fact (#50). Entries that are not AI proposals say so (#1, #21). Rejected, corrected or improved AI proposals are tagged `[REJECTED]`, `[CORRECTED]` or `[IMPROVED]`. Mechanical extractions and fixes resolved by existing precedent are excluded.

**Operating rule:** the agent drafts each phase and presents proposals and review triage with a recommendation; the team decides at a per-phase gate; the log records exactly what the team decided, never an agent-inferred decision.

**Tagged AI proposals (index):**

| Entry | Tag | AI proposal | Origin of the proposal and of the decision |
| --- | --- | --- | --- |
| #12 | `[CORRECTED]` | FX source "the Google rate" | The team's own instruction, corrected after the agent's viability check. The team changed its decision. |
| #22 | `[REJECTED]` | Hide a paused shop's listings from browse (F-16) | Architecture adversarial review. Reject recommended in the triage and adopted by the team at the Phase 3 gate. |
| #23 | `[REJECTED]` | Lock purchasability on every reserve (F-17) | Architecture adversarial review. Reject recommended in the triage and adopted by the team at the Phase 3 gate. |
| #24 | `[REJECTED]` | Empty state on headless consoles (EC-09) | UX edge-case review. Reject recommended in the triage and adopted by the team at the Phase 2 gate. |
| #25 | `[REJECTED]` | Rounding guard for the valuation total (EC-23) | UX edge-case review. Reject recommended in the triage and adopted by the team at the Phase 2 gate. |
| #26 | `[CORRECTED]` | Outbox recovery by event stamp, with no automatic retry (AD-SYS-2) | The team's human review (2026-09-27). The team accepted a per-delivery redesign. |
| #27 | `[IMPROVED]` | Commission payloads carrying aliased fact names (AD-SYS-3) | The team's human review. The team kept the semantics and accepted the representation fix. |
| #28 | `[CORRECTED]` | `StructuralScanner` + sandboxed viewer as the compensating control (G-4) | The team's human review. The team accepted direction C; the PDF mechanism is pending validation (G-5). |
| #29 | `[REJECTED]` | `oversell-check` placeholder metric (ADD-§10, entry #18) | The team's human review. The team accepted removing it. |
| #30 | `[IMPROVED]` | Unmonitored hourly GitHub Actions tick (G-3) | The team's human review. The team kept the tick and accepted the hardening. |
| #32 | `[IMPROVED]` | `status: final` as the only readiness signal | The team's human review. The team kept `final` and added `launchReady: false` plus launch gates. |
| #33 | `[IMPROVED]` | Retention periods adopted before legal review (OQ-12, entry #14) | The team's human review. The team accepted provisional defaults and a dry-run regulated purge. |
| #34 | `[CORRECTED]` | *Tú*/*usted* by owning module (entry #16) | The team's human review. The team accepted a rule by rendering surface. |
| #36 | `[CORRECTED]` | Uploads sent through a function body (AD-SYS-8 rule 5) | The agent's second pass (#35 a). The team accepted a signed direct upload to a quarantine bucket. |
| #37 | `[IMPROVED]` | Hourly tick at minute :05 (#30) | The agent's second pass (#35 c). The team accepted minute :17 as best-effort. |
| #38 | `[IMPROVED]` | LG-4 and LG-5 rows mixing fact and decision (#32) | The agent's second pass (#35 e, f). The team kept both gates open and asked for the three-part split. |
| #39 | `[CORRECTED]` | An "admin home" surface that UX does not define | The agent's second pass (#35 h). The team accepted the existing admin surfaces. |
| #42 | `[IMPROVED]` | Read procedures "named at implementation" | The agent's second pass (#35 n). The team asked for stable names now. |
| #43 | `[CORRECTED]` | Delivery metric by `failedAt`, without stuck `pending` rows (ADD-§10) | The agent's second pass (#35 o). The team accepted the new metric and three timestamps. |
| #44 | `[CORRECTED]` | Inherited Plan-1 comprobante viewer showing the original file | The agent's second pass (#35 m). The team required the sanitized-only policy, linked to LG-3. |
| #45 | `[CORRECTED]` | `PostPurchasePrompt` without the order's close date (AD-COL-2) | The agent's second pass (#35 l). The team set the rule; the evaluation found that accept needs the date. |
| #48 | `[CORRECTED]` | `OrderClosed` lines without `unitPriceCop` (ADD-§5, AD-ORD-2) | The agent's follow-up-round finding. The team adopted the fix at the pre-submission review. |
| #49 | `[CORRECTED]` | "Orders closed within 14 days" computed from a `closedAt` that `Order` does not have (ADD-§10) | The agent's follow-up-round finding. The team adopted the fix at the pre-submission review. |

The review triages reject 11 AI findings in total (9 in `review-ux-edge-cases.md`, 2 in `review-arch-adversarial.md`). Beyond the four above, six were already handled (EC-12, EC-13, EC-20, EC-21, EC-22, EC-24) and one is unreachable (EC-52). The four entries above are the rejections with a design trade-off behind them.

Entries #26–#35 record the human review round of 2026-09-27: ten objections raised by the team against adopted decisions. #31 (AD-VAL-2) is untagged because the team kept the AI's decision after reviewing it. #35 is untagged because it records second-pass findings, which are flagged and not decided.

Entries #36–#45 record the follow-up round of the same day: the team's decisions on the #35 findings. #40 and #41 are untagged, because they complete #34 and add a record note without changing an AI proposal.

Entries #46–#52 record the pre-submission review of the same day: the team's decisions on fixes A–E and on the key-screen mocks. Only #48 and #49 are tagged, because they correct the agent's own design; the others fix statements in the record or adopt a recommendation.

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

### 17. Phase 3 gate items G-1 to G-4 accepted
**Decision:** the team accepted all four recommendations in ARCHITECTURE.md §15.1.
- **G-1:** the server refuses a counter-offer whose terms equal the current round's, with `TradeCounterUnchanged`.
- **G-2:** the 50-collection limit has its own code, `CollectionLimitReached`.
- **G-3:** a free GitHub Actions hourly tick (`5 12-23,0-1 * * *` UTC, 07:05–20:05 Bogotá) retries the TRM and materializes expiries, alongside the two Vercel Hobby daily crons.
- **G-4:** `StructuralScanner` is the V1 `MalwareScanner`, with the sandboxed viewer as the compensating control. ClamAV-class scanning is deferred (§14).

**Alternatives considered:**
- G-1: allow an identical counter as a valid round that still counts toward the 10-round limit.
- G-2: name an existing generic code, which would break the one-owner rule of AD-SYS-1.
- G-3: no tick, so NFR-CAT-4 falls to two TRM attempts per day and quantity is reclaimed with a lag of up to 17.5 h.
- G-4: block uploads until a hosted scanner is chosen, which blocks VER, ORD and COM.

**Rationale:**
- G-1: the client-side check alone can be bypassed (EC-11).
- G-2: the UX needs a specific message.
- G-3: it costs nothing and keeps the overnight lag to about 6.5 h. Correctness never depends on it.
- G-4: it unblocks three modules without a paid host.

**Persona/skill:** `bmad-architecture` gate items. Presented at the Phase 3 gate with recommendations, and the team chose them.

### 18. PRD-sync edits from the architecture applied to prd.md and addendum.md
**Decision:** the §15.2 edits were applied, except NFR-CAT-4, which only applied if G-3 were rejected.
- **prd.md:**
  - FR-TRD-6 renames `counterpartId` to `requesterId`.
  - FR-TRD-2 gains `TradeCounterUnchanged` and `TradeRoundLimitReached`.
  - FR-ORD-8 is rewritten: expiry is derived at read, enforced by every command and materialized by jobs. This retires A-22.
  - FR-ORD-3 adds `expiresAt > now`.
  - FR-MSG-3 adds the 60-minute de-duplication and the trade exemption.
  - FR-COL-1 gains `CollectionLimitReached`.
  - FR-VER-8 uses `LastActiveReasonRequired`.
  - FR-DSC-1 gains `SearchFilterTooBroad`.
  - FR-COM-7 gains `CommissionRateNotFutureDated` and the 800 bps seed (A-24).
- **Three follow-on rows**, added to §15.2 because they follow from the accepted triage and §8.3:
  - FR-TRD-5: a tradeability refusal also marks the losing accept's own offer `Unfulfillable` (F-09).
  - FR-COL-2: an unknown catalog id uses `InvalidCatalogEntry`.
  - §21 and §23: OQ-2, OQ-4, OQ-6, OQ-7, OQ-8, OQ-10, A-15 and A-22 are marked resolved.
- **addendum.md:**
  - ADD-§3.1 gains the eleven §8.1 codes and the §8.3 changes of use (`ContactRateLimited`, `OrderNoLongerActive`, `RequestValidationFailed`).
  - ADD-§3.2 gains `FxRateSourceMismatch` and the broader `ListingNoLongerAvailable` meaning.
  - ADD-§10's oversell metric becomes a placeholder.

**Alternatives considered:** apply all but the two new rows (FR-COM-7, ADD-§10), or leave every edit listed as pending for Phase 4.
**Rationale:** the PRD and the addendum stay the contract-test source. Unapplied edits would appear as inconsistencies in the Phase 4 readiness check.
**Persona/skill:** `bmad-architecture` (Finalize, input reconciliation). Presented at the Phase 3 gate with a recommendation, and the team chose it.

### 19. Architecture review triage adopted; deferred items owned by the team
**Decision:** the triage of both architecture reviews is adopted in full.
- `reviews/review-arch-adversarial.md`: 17 findings. 14 Accept, 1 Defer (F-14) and 2 Reject (F-16, F-17).
- `reviews/review-arch-edge-cases.md`: 19 findings. 17 Accept and 2 Defer (AEC-18, AEC-19).

The three deferred items are owned by the team (both members) and are reviewed again in the Phase 4 readiness report:
- F-14: a meaningful oversell metric, before launch.
- AEC-18: retrying `deferredNoFx` rows, with the production feed (OQ-9).
- AEC-19: an operations check that the GitHub Actions schedule stays enabled.

**Alternatives considered:**
- Reopen F-16 (hide paused listings from browse) or F-17 (lock purchasability on reserve).
- Name a single owner for the deferred items.

**Rationale:**
- Every Accept is already applied to ARCHITECTURE.md and verified by the document checks.
- The rejections cite where the case is handled: prd.md keeps paused listings visible, and AD-19 accepts a negative balance, so no money is lost.
- No role split between the two team members has been set yet.

**Persona/skill:** `bmad-review-adversarial-general` and `bmad-review-edge-case-hunter`. Presented at the Phase 3 gate with recommendations.

### 20. Readiness gate: fixes R-1..R-6 applied; the event panel becomes a fifth tab on 2.3 (Phase 4 gate)
**Decision:** the team approved all six fixes proposed by the readiness assessment, and they were applied:
- **R-1:** frontmatter status.
- **R-2:** stale forward references.
- **R-3:** PRD §4.2 sync.
- **R-4:** ARCHITECTURE citations.
- **R-5:** es-CO templates for 12 codes plus one scanner variant.
- **R-6:** UX specs aligned with ARCHITECTURE.

For R-6b, the failed-delivery panel (`admin.events.replay`, ARCH §7.3) became a fifth tab, «Entregas», on page 2.3. Admin rail item 10 now links to it.

The re-run audit shows 0 MAJOR and 0 MINOR findings. The gate verdict moved from CONCERNS to PASS (`planning/readiness-gate-report.md` §9).

**Disclosure:** R-4 was proposed as a citation-only fix. When it was applied, NFR-SYS-9 (latency) and NFR-SYS-11 (accessibility) turned out to have no testing mechanism in ARCHITECTURE. The agent therefore added AD-SYS-6 rules 7 (latency benchmarks) and 8 (axe checks per page spec), rather than citing an AD that did not bind them. The change is limited to the test harness and changes no module design. It is reported in the gate report under R-4.

**Alternatives considered:**
- Pass with the gaps listed as conditions.
- Apply only the MAJOR fixes (R-4, R-5).
- For the panel: a separate admin page, or a section below the 2.3 tabs.

**Rationale:**
- The rubric's top score needs a verified PASS with clean triage.
- Every gap was a document edit that needed no design decision.
- The tab keeps the panel where ARCH §7.3 already places it, so no new route or IA surface is needed.

**Persona/skill:** `bmad-check-implementation-readiness`. The fixes and the tab option were presented at the Phase 4 gate with recommendations, and the team chose the recommended options.

### 21. Gate sign-off split between both team members, on behalf of both (Phase 4 gate)
**Decision:** the readiness gate sign-off (§11) is recorded per scope, with the signatures alternating between Martín Gómez and Mateo Rubio. Every signature is made on behalf of both, because the package is joint work and its deliverables cannot be separated by author.

**Key prompt (excerpt):** "registra mi firma en unas y la de mateo en otras, recuerda que estamos haciendo todo juntos dado que los entregables no son separables".

**Alternatives considered:**
- Two identical whole-package signature rows.
- Leave the block blank for signing by hand.

**Rationale:** an alternating, per-scope split, together with the joint-work note, records both members as accountable without implying a division of authorship that did not exist.

**Persona/skill:** `bmad-check-implementation-readiness` (the sign-off block). The split was recorded at Martín Gómez's instruction on 2026-09-27. Not an AI proposal.

### 22. `[REJECTED]` Hide a paused shop's listings from browse (Phase 3 gate — review F-16)
**AI proposal:** the adversarial architecture review (`bmad-review-adversarial-general`, finding F-16) proposed removing from browse and discovery every listing of a shop whose commission balance is exhausted, because "a buyer sees items they cannot buy".
**Decision:** rejected. Paused listings stay visible and editable. Only the purchase is blocked, through the `purchasable` predicate (prd.md FR-INV-7: "Paused listings stay visible and editable"; ARCHITECTURE AD-INV-3 rule 1). Browse and detail show a `Decision` label that explains the pause.
**Alternatives considered:** hide paused listings from browse (the proposal); hide them only from the "Solo comprables" filter, which already happens because that filter uses `purchasable`.
**Rationale:**
- A pause is a short, reversible state of the shop's commission account, not a defect of the listing. It clears on the next `CommissionBalanceReplenished`. Hiding and re-showing the whole catalog at each balance crossing would make discovery results unstable for buyers and would add a second visibility rule that DSC ranking must mirror.
- The buyer is not stuck. The row still offers "Escribir a la tienda" (page 3.1), so the shop keeps the lead while it tops up.
- The rule that matters for money is already enforced: `purchasable` is false while `pausedAt` is set, the check is fail-closed (AD-INV-3 rule 3), and the reserve re-checks it inside the transaction. Hiding would add no protection, only fewer explanations.
- The UX principle of explaining a denied action (EXPERIENCE.md explainability banners) favours a visible, labelled row over a silent disappearance.

**Persona/skill:** proposal from `bmad-review-adversarial-general`; the triage in `reviews/review-arch-adversarial.md` recommended Reject; the team adopted the rejection at the Phase 3 gate (entry #19).

### 23. `[REJECTED]` Lock purchasability on every reserve (Phase 3 gate — review F-17)
**AI proposal:** the same review (finding F-17) pointed out that `reserveForPurchase` reads `pausedAt` and the verification status without a lock, so an order can commit in the same instant that a commission crossing pauses the shop. It proposed locking the commission state during the reserve.
**Decision:** rejected. The reserve keeps reading purchasability in its own transaction without locking the commission account.
**Alternatives considered:** lock the shop's `SellerCommissionState` row `FOR UPDATE` in every reserve (the proposal); lock it `FOR SHARE`, which still blocks the pause event behind every in-flight reserve.
**Rationale:**
- The race is bounded: at most one order per request that is already in flight when the balance crosses zero. It cannot grow into unbounded commission-free selling, because every later reserve sees `pausedAt`.
- No money is lost. The commission for that order is still charged exactly once, keyed by `orderId` (AD-COM-2), and the balance is allowed to go negative (inherited AD-19, AD-COM-2 rule 5). The next top-up must cover the deficit before the shop resumes (page 7.1, "Recarga al menos…").
- The lock has a real cost. Every purchase from a shop would serialize on one commission row and would add that row to the global lock order (AD-SYS-4), which increases the risk of contention and deadlock on the hottest path of the product, the purchase of a last unit (NFR-INV race tests).
- Correctness is traded for a bounded, fully audited exposure that the ledger already records, which is the trade-off AD-19 made in Plan-1.

**Persona/skill:** proposal from `bmad-review-adversarial-general`; the triage recommended Reject; the team adopted the rejection at the Phase 3 gate (entry #19).

### 24. `[REJECTED]` Require an Empty state on the headless developer consoles (Phase 2 gate — review EC-09)
**AI proposal:** the UX edge-case review (`bmad-review-edge-case-hunter`, finding EC-09) flagged that the H consoles (the `x.3` explorers and the simulators, such as 7.5, 8.4, 10.3 and 12.3) have no "Empty" row, which implies adding one to each.
**Decision:** rejected. The four-state rule (Loading, Empty, Error, Success) binds R and D surfaces (EXPERIENCE.md, State Patterns: "Every R and D surface specifies Loading, Empty, Error and Success"). H consoles specify their own states instead: Idle (a preset chosen and not run), Running, Passed, Failed, Command refused, Error — fixture and Not available in production.
**Alternatives considered:** add an Empty row to every H console (the implied fix); rename Idle to Empty.
**Rationale:**
- An H console is never empty in the product sense: it always starts from a seeded fixture or a preset, and "nothing to show" is the Idle state before a run, which is already specified with its own copy and actions.
- Forcing the end-user template onto developer tools would add rows with no behaviour behind them. That is the kind of padding the spec discipline avoids, and it would make the real states (Passed/Failed with seeds, Reproducir) harder to find.
- The form-factor split (R, D, H) comes from the task statement's Phase 2 instructions, and the state rule follows it.

**Persona/skill:** proposal from `bmad-review-edge-case-hunter`; the triage in `reviews/review-ux-edge-cases.md` recommended Reject; the team adopted it at the Phase 2 gate (entry #16).

### 25. `[REJECTED]` Guard against rounding drift between per-item values and the collection total (Phase 2 gate — review EC-23)
**AI proposal:** the UX edge-case review (finding EC-23) warned that the valuation pages could round each item's value and then show a total that differs from the sum of the displayed rows. It named no specific guard, so the implied fix was a rounding or reconciliation step in the valuation display.
**Decision:** rejected. The drift cannot occur, so the page needs no reconciliation. FR-VAL-1 defines `totalCop = Σ entryValueCop` as an exact integer sum, and each `unitCop` is already an integer COP value. The USD→COP conversion rounds exactly once, at the catalog (`ADD-§2.1`), so the sum of the per-item values equals the total by construction (prd.md FR-VAL-1).
**Alternatives considered:** a client-side reconciliation line (the implied fix); keep decimals on each item and round only the total.
**Rationale:**
- Money is integer COP end to end (AD-SYS-7, branded money with `bigint` columns; FR-VAL-5 money-shape separation). A rounding step inside the page would reintroduce the float path the architecture forbids.
- The only drift the PRD admits is against a hypothetical "convert the USD totals once" figure, `convertOnce`, and FR-VAL-1 already defines it per rate date. It is a documented comparison, not a display bug.
- A reconciliation line on screen would suggest that the numbers could disagree, which undermines the "Trusted Ledger" identity of the design.

**Persona/skill:** proposal from `bmad-review-edge-case-hunter`; the triage recommended Reject; the team adopted it at the Phase 2 gate (entry #16). The triage row cites prd.md:1918; after later PRD edits the rule sits in FR-VAL-1 (prd.md:1934).

---

## Human review round (2026-09-27)

**What happened.** After the Phase 4 sign-off, the team (Martín Gómez and Mateo Rubio, jointly) reviewed the finished Plan-2 documents and raised ten objections against decisions the AI had drafted and the gates had adopted. The objections came from the team, not from an AI review skill. The team framed them explicitly as open questions, not instructions:

> "Estas observaciones NO son instrucciones automáticas de cambio ni decisiones finales. Son objeciones/preguntas que queremos contrastar contigo. […] NO asumas que nuestra propuesta es necesariamente correcta. […] No hagas cambios silenciosos en los archivos."

**How it ran.**
1. The agent evaluated each objection against the full documents, without editing any file. For each one it stated agree, partly agree or disagree, the trade-offs, and the exact rules it would change.
2. The team decided each item: accept the change, keep the decision, or leave it pending validation.
3. Before any edit, the team asked for a second consistency pass: "No cambies nada que sea consecuencia indirecta sin señalarlo primero. […] aplica únicamente las decisiones que ya quedaron aceptadas arriba y registra todas ellas en el decision trail."
4. The agent applied only the accepted decisions. The second-pass findings that were not accepted decisions are recorded in #35 as flags, not applied.

| # | Objection | Team decision | Tag |
| --- | --- | --- | --- |
| 26 | AD-SYS-2 outbox recovery and "no automatic retry" (objections 1 and 3) | Accepted: correction of AD-SYS-2 | `[CORRECTED]` |
| 27 | AD-SYS-3 commission trigger and payload names | Accepted: semantics kept, representation fixed | `[IMPROVED]` |
| 28 | AD-SYS-8 / G-4 upload scanner | Direction accepted; the PDF mechanism is pending validation (G-5) | `[CORRECTED]` |
| 29 | ADD-§10 `oversell-check` placeholder | Accepted: removed | `[REJECTED]` |
| 30 | G-3 GitHub Actions hourly tick | Kept and hardened | `[IMPROVED]` |
| 31 | AD-VAL-2 valuation over current entries | Kept | — |
| 32 | ARCHITECTURE `status: final` | Kept, plus launch gates | `[IMPROVED]` |
| 33 | OQ-12 retention periods | Accepted: provisional, dry-run purge | `[IMPROVED]` |
| 34 | Microcopy *tú*/*usted* | Accepted: rule by surface | `[CORRECTED]` |
| 35 | Second-pass findings | Flags and agent self-corrections; nothing decided | — |

### 26. `[CORRECTED]` Outbox recovery works per delivery, with pending rows and at most 3 automatic attempts (Human review — AD-SYS-2)
**Objection (team):** `OutboxEvent.dispatchStartedAt` was a permanent flag. If the process died after stamping it, the sweeper (which required `dispatchStartedAt IS NULL`) never picked the event up again. And because the sweeper "never touches an event that already has any delivery row", a crash between two subscribers left the second subscriber with no row that anything would recover. The team also asked whether "no automatic retry" was too rigid next to a sweeper that is itself an automatic recovery.
**AI proposal (original, adopted at the Phase 3 gate):** AD-SYS-2 rules 2–6: `dispatchStartedAt` on the event; `EventDelivery` rows written only on success or failure; a sweeper over never-stamped events; "No automatic retry of a failed delivery".
**Evaluation:** the agent agreed and found it worse than stated.
- `OrderClosed` (commission and collections) and `BusinessApplicationApproved` (commission and listings) have two subscribers, so a commission could silently never be charged.
- The badge and the NFR-SYS-6 metric counted only `failed` rows, so the loss was invisible.
- `commission-reconcile` compares the balance with the ledger, and both stay consistent when a deduction is missing.

The agent advised against a persisted `processing`/`claimed` state, because it needs a lease timeout: too short and a slow handler runs twice, too long and recovery is delayed.
**Decision:** accepted as a correction of AD-SYS-2 and the related items. The team's words: "`EventDelivery` por `(eventId, subscriber)`, filas `pending` creadas al encolar, claim mediante lock transaccional, sin `dispatchStartedAt`, máximo 3 intentos automáticos y visibilidad de `pending` atascados."

| | Before | After |
| --- | --- | --- |
| Recovery unit | the event (`OutboxEvent.dispatchStartedAt`) | the delivery `(eventId, subscriber)`; `dispatchStartedAt` removed |
| Delivery rows | written at the outcome (`delivered`/`failed`) | one `pending` row per registered subscriber, inserted by `outbox.enqueue` in the publisher's transaction |
| Claim | the event stamp; an advisory lock for replay | `SELECT … FOR UPDATE SKIP LOCKED` on the delivery row, for dispatch, sweep and replay; no advisory lock |
| Automatic retries | none | a delivery whose failure was never recorded gets at most 3 attempts, then `failed` with `DeliveryAttemptsExhausted`; a recorded `failed` is still never retried automatically |
| Visibility | count of `failed` | count of `failed` plus `pending` older than 24 h (`stuckPendingCount`), on the badge, the digest and page 2.3 |

**Implementation detail the cap requires (recorded, not a new decision):** a counter written inside the handler transaction rolls back on a crash, so it could never reach 3. The attempt therefore takes two steps (AD-SYS-2 rule 4):
1. A short transaction that commits on its own increments `attempts`. When `attempts` already equals 3, it marks the row `failed` instead.
2. The handler transaction claims the row.

A crash therefore still spends one attempt. The cost is one extra short transaction per attempt.

**Applied:**
- ARCHITECTURE:
  - AD-SYS-2: Binds, Prevents, rules 2–7, 9 and 10, and the trade-offs;
  - AD-SYS-4 rule 5: the `EventDelivery` row is lock position 0, with the no-deadlock argument;
  - §7.1: subscriber rule 1, and the `TradeAccepted` backfill note;
  - §7.2 and §7.3;
  - §8.1: new code `DeliveryAttemptsExhausted`; shared-kernel now owns three codes;
  - §11: AD-10 test row;
  - §13 `outbox-sweep` and the digest;
  - §4: the job table;
  - §15.2: PRD-sync rows.
- PRD-sync: prd.md NFR-SYS-6 ("No automatic retry of a recorded failure…"; the badge counts stuck deliveries); addendum ADD-§3.1 (new code) and ADD-§7 (delivery sentence).
- UX:
  - page 2.3: the Entregas tab lists "Atascada" rows with no Reintentar, shows attempts as "{n} de 3", and has a new empty-state condition;
  - EXPERIENCE admin badge;
  - microcopy row `DeliveryAttemptsExhausted`.

**Rationale:**
- A lost commission deduction is the one failure in this review that loses money in production. The fix needs no new infrastructure and fits the free tier.
- The sweeper takes only `pending` rows and replay only `failed` rows. The two sets are disjoint, so automatic recovery never races a human replay. The principle behind AD-10 survives.
- A row lock needs no lease: a crash releases it through the rollback.

**Trade-offs accepted:**
- one insert per subscriber at enqueue (at most 2 in V1);
- a new v2 subscriber needs a backfill migration for its `pending` rows;
- a handler that crashes its instance 3 times waits for a human replay.

**IDs:** AD-SYS-2, AD-SYS-4, AD-10, NFR-SYS-6, OQ-4, ADD-§3.1, ADD-§7.
**Persona/skill:** objection from the team's human review; evaluation and redesign drafted by the agent in the Architect role (`bmad-architecture` update); decision by the team.
**Prompt (excerpt):** "Queremos que la unidad recuperable sea la entrega `(eventId, subscriber)` y que el estado de dispatch funcione como un lease/claim recuperable, no como un flag permanente. […] No estamos imponiendo una implementación concreta."

### 27. `[IMPROVED]` Commission trigger: same semantics, one set of fact names and one pure function (Human review — AD-SYS-3)
**Objection (team):** the rule said "whichever is delivered first" but computed `min(sellerReceivedConfirmedAt, closedAt)`. The two payloads did not carry the same facts under the same names: `OrderPaymentConfirmedByBusiness` had `confirmedAt` and `buyerItemReceivedConfirmedAt`, and `OrderClosed` had `closedAt` and `sellerReceivedConfirmedAt`.
**AI proposal (original):** AD-SYS-3 rules 1–2 and ADD-§5 as adopted after entry #13.
**Evaluation:** the agent defended the semantics. Facts are written once (AD-ORD-2), each payload carries both facts, and rates can only be future-dated (`CommissionRateNotFutureDated`). So both delivery orders give the same `commissionTriggeredAt`, `trigger` and `rateBps`; "delivered first" only decides which handler inserts. The agent agreed that the representation was wrong: `confirmedAt` and `closedAt` are aliases of the two domain facts (ADD-§4.2), and an implementer had to infer the mapping.
**Decision:** the team kept the semantics and accepted the representation fix and the pure function: "corregir la representación de los payloads para que ambos eventos utilicen los hechos de dominio con nombres consistentes […] centralizar `commissionTrigger(facts)` como función pura. Aplica el PRD-sync correspondiente."

| | Before | After |
| --- | --- | --- |
| `OrderPaymentConfirmedByBusiness` payload | `confirmedAt, buyerItemReceivedConfirmedAt` | `sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt` |
| `OrderClosed` payload | `closedAt, sellerReceivedConfirmedAt` | `sellerReceivedConfirmedAt, buyerItemReceivedConfirmedAt` |
| Computation | written out in each handler | `commissionTrigger(facts)` in `commission/domain/`, with a table test over `(t1, null)`, `(null, t2)`, `t1 < t2`, `t1 > t2` and `t1 = t2`; `rateBps` is read by the handler, outside the pure function |

**Applied:**
- ARCHITECTURE: AD-SYS-3 Binds and rules 1–2; §7.1 payload rows; AD-COL-2 rule 2 (`acquiredAt` now reads `buyerItemReceivedConfirmedAt`); §15.2.
- PRD-sync: prd.md FR-ORD-4, FR-ORD-5 and FR-COM-4; addendum ADD-§5 payloads and the commission-trigger paragraph.

**Rationale:** one name per domain fact removes the mapping an implementer could get wrong. One pure function makes the two handlers agree by construction instead of by review.
**IDs:** AD-SYS-3, AD-3, AD-COL-2, FR-ORD-4, FR-ORD-5, FR-COM-4, OQ-3 (entry #13), ADD-§4.2, ADD-§5.
**Persona/skill:** objection from the team; evaluation by the agent (Architect role); decision by the team.
**Prompt (excerpt):** "Nuestra preferencia preliminar sería que ambos eventos expongan un conjunto común de facts semánticas […] Queremos tu opinión sobre cuál representación es más limpia y menos propensa a errores."

### 28. `[CORRECTED]` Viewers render sanitized content only; the PDF mechanism is pending validation as G-5 (Human review — AD-SYS-8, G-4)
**Objection (team):** the product handles regulated uploads (verification documents, comprobantes, top-up proofs), yet the V1 scanner is `StructuralScanner`, and the compensating control ("private buckets + sandboxed viewer") is not equivalent to scanning. The team asked the agent to choose between A (acceptable as is), B (a stronger launch gate) and C (an intermediate architecture).
**AI proposal (original, G-4 at the Phase 3 gate, entry #17):** `StructuralScanner` plus the sandboxed viewer as the compensating control.
**Evaluation:** the agent found that the compensating control had holes:
- AD-SYS-8 rule 9 sandboxed only *admin* viewers, while a business opens comprobantes uploaded by any buyer (page 6.3).
- Rule 9 serves files with `Content-Disposition: attachment`, which contradicts 6.3's "inline, view only, no download". The file would end up in the user's own PDF reader.
- Page 7.3 offered "Abrir en otra pestaña", which leaves any sandbox.

The agent recommended C (content disarm and reconstruction). Its first draft proposed rasterizing PDFs with pdf.js on the server.
**Decision:** the team accepted direction C and did not accept the concrete mechanism: "NO consideramos cerrada todavía la implementación concreta de rasterizar PDF con `pdf.js`. […] Esta parte debe quedar como decisión técnica pendiente de validación, no como implementación asumida." The team asked for an explicit evaluation of four points and for any better alternative.

| | Before | After |
| --- | --- | --- |
| What viewers show | the original file in a sandboxed `<iframe>` (admins only) | only a sanitized rendition, in an `<img>`, on every viewer; no original, no download, no new tab (AD-SYS-8 rule 11) |
| JPEG/PNG | re-encoded (rule 7) | unchanged; the re-encoded image is the rendition |
| PDF | shown in the sandbox | **pending G-5**. Until it closes, no PDF rendition exists and production launch is blocked (LG-3) |

**Evaluation of server-side pdf.js requested by the team** (recorded in ARCHITECTURE §15.1; facts verified on 2026-09-27):
1. *CPU, memory and duration.* A Vercel Hobby function has 2 GB, 1 vCPU, 300 s maximum duration and a 4.5 MB request body (vercel.com/docs/functions/limitations). Rendering would be CPU-bound work inside the instances that serve tRPC.
2. *Size and pages.* 5 MiB uploads already exceed the 4.5 MB body limit (#35 finding a). One A4 page at 150 dpi is about 1240 × 1754 px, about 8.7 MB of RGBA pixels, so memory grows with the page count. The page cap and resolution must come out of a spike; no number is invented.
3. *Malformed PDFs.* pdf.js recovers from broken files, so hostile input can parse partially, run long or exhaust memory. Any mechanism needs a timeout, a memory bound and rejection on failure.
4. *Security boundary.* It fails. In the main deployment the parser would share a process with `DATABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. CVE-2024-4367 (CVSS 9.8, arbitrary JavaScript through a crafted font matrix; fixed in pdf.js 4.2.67 and mitigated by `isEvalSupported: false`) shows that this parser class is exploitable.

**Better alternative proposed (not adopted; part of G-5):** rasterize the PDF in a Web Worker in the uploader's own browser, and have the server accept and re-encode images only.
- An exploit then runs on the attacker's own device, next to nothing of value.
- The server keeps its existing image path.
- The original PDF, its text layer and any digital signature are lost.
- Performance on low-end phones needs a spike.

The other candidates listed in G-5 are pdf.js in a separate Vercel project that holds no secret, and accepting images only.
**Applied:**
- ARCHITECTURE:
  - AD-SYS-8 Status, Prevents, rules 9 and 11, and the trade-off;
  - §10 S-5;
  - §14 ClamAV row;
  - §15.1: new G-5 row, the evaluation paragraph, and a human-review note. The G-4 row keeps its original text for the record.
- PRD-sync: prd.md NFR-SYS-14.
- UX:
  - pages 5.3, 6.2, 6.3 and 7.3 (7.3 loses "Abrir en otra pestaña");
  - DESIGN `document-viewer` note.
- Not changed: the Plan-1 `comprobante-viewer` definition, which is inherited (#35 finding m).

**Rationale:** C removes the need for a malware scanner to be right, because no viewer ever receives the original bytes. B would block VER, ORD and COM entirely. Keeping the mechanism open follows the team's instruction and the evaluation above: the obvious server-side option fails the boundary it was meant to create.
**IDs:** AD-SYS-8, G-4, G-5, LG-3, NFR-SYS-14, S-5.
**Persona/skill:** objection from the team; evaluation by the agent (Architect role), with the four-point evaluation added at the team's request; decision by the team.
**Prompt (excerpt):** "Queremos que evalúes si: A) `StructuralScanner` + sandbox es suficientemente aceptable para V1 […]; B) debería considerarse un launch blocker/gate más fuerte; C) hay una arquitectura intermedia razonable".

### 29. `[REJECTED]` The `oversell-check` placeholder is removed; "Oversell incidents" is not measured in production in V1 (Human review — ADD-§10)
**Objection (team):** the nightly job counted units with `quantity < 0`, which the `quantity >= 0` CHECK already makes impossible. A metric that is zero by construction gives a false sense of observability.
**AI proposal (original):** after review finding F-14 (entry #19), keep `oversell-check` as a placeholder and the ADD-§10 metric "units with a negative quantity" until a stocked-total check lands (entry #18).
**Evaluation:** the agent agreed and added a reason. The realistic inventory bug under AD-INV-2 is a double release, which *inflates* quantity (phantom stock) and never goes negative, so the placeholder could not detect it even in principle. PRD §22 still lists the metric, so the removal has to be stated openly.
**Decision:** accepted. "eliminar el `oversell-check` y declarar explícitamente que 'Oversell incidents' no se mide en producción en V1. La prevención queda respaldada por constraints y race tests hasta que exista el ledger de movimientos."

| | Before | After |
| --- | --- | --- |
| Job | `oversell-check` on `daily-night` | removed (§4, §13) |
| ADD-§10 row | placeholder count of negative quantities | "not measured in production in V1"; prevention by the CHECK and the NFR-INV race tests until a stock-movement ledger exists |
| F-14 deferral | "a meaningful oversell metric, before launch" | "when a stock-movement ledger exists" (§14); not a launch gate; listed as an acknowledged V1 gap in §0 |

**Applied:**
- ARCHITECTURE: §0 launch-gates note; §4; §11 AD-6 row; §13; §14; §15.2 (the ADD-§10 row is marked superseded, and a new row is added).
- PRD-sync: addendum ADD-§10; prd.md §22 intro and the Oversell row.
- Not changed: the UX scenario objectives "Oversell incidents stay at 0" (INV S2/S3) remain design goals, and the race tests still enforce them.

**Rationale:** a metric that cannot move is worse than no metric, because it is read as evidence. The prevention stays in the database and in the tests, where it actually lives.
**IDs:** ADD-§10, PRD §22, F-14 (`review-arch-adversarial.md`), AD-INV-2, AD-6, NFR-INV.
**Persona/skill:** objection from the team; evaluation by the agent; decision by the team.
**Prompt (excerpt):** "Nos preocupa que una métrica que necesariamente será 0 dé una falsa sensación de observabilidad."

### 30. `[IMPROVED]` The GitHub Actions tick stays, as best-effort, with a `JobRun` record and a silence alert (Human review — G-3)
**Objection (team):** the tick adds a third operational dependency for jobs whose correctness does not depend on timing. Is it needed in V1?
**AI proposal (original, G-3, entry #17):** a free hourly tick `5 12-23,0-1 * * *` UTC for the TRM retry, expiry materialization and the outbox sweep.
**Evaluation:** the agent disagreed with removing it. Without the tick, an expired unpaid order holds the last unit for up to 17.5 h, and browse shows the listing as sold out, so no buyer triggers the on-demand path. After #26, the sweep is also the only recovery for a crashed dispatch. The agent agreed the tick was unmonitored. It rejected `pg_cron`, which would duplicate domain logic in SQL or store the secret in the database.
**Decision:** kept and hardened. "mantener el tick horario de GitHub Actions. […] debe quedar explícitamente como best-effort, registrar la última ejecución y mostrar una alerta cuando el tick lleve demasiado tiempo sin ejecutarse. También queremos que los modos de fallo de GitHub Actions queden documentados. No necesitamos cambiar a `pg_cron`."

| | Before | After |
| --- | --- | --- |
| Status | `[ASSUMPTION — gate item G-3]` | `[best-effort; G-3 accepted]` |
| Failure modes | not documented (AEC-19 deferred) | documented in §4 (GitHub Docs, "Events that trigger workflows", `schedule`): delays at high load (the top of the hour is one), dropped queued runs, disabled after 60 days without activity in a public repository, default branch only |
| Record | none | one `JobRun` row per `/api/jobs/*` run (owned by shared-kernel, purged after 90 days) |
| Alert | none | page 2.3 header "Última tarea horaria"; an alert when the page is read between 10:05 and 23:05 Bogotá and no tick started in the previous 3 h (tolerates two dropped runs); marker on admin rail item 5 |

**Applied:**
- ARCHITECTURE: §4 (mermaid label, job table, entry-point bullets, the best-effort paragraph); AD-SYS-2 Binds and rule 10 (`JobRun` ownership); §13 intro.
- UX:
  - page 2.3: header line, a "Tick silent" state, TRM hours corrected to 07:05–20:05, a technical note;
  - EXPERIENCE: rail item 5.

**Rationale:**
- The alert turns AEC-19's silent fallback into a visible one.
- A table is cheaper than a second scheduler.

**IDs:** G-3, AEC-19, AD-SYS-2, AD-SYS-6, NFR-CAT-4, AD-ORD-2.
**Persona/skill:** objection from the team; evaluation by the agent; decision by the team. The window and threshold (10:05–23:05, 3 h) and the `JobRun` shape were drafted by the agent to implement the accepted "alerta" and "registrar la última ejecución".
**Prompt (excerpt):** "Queremos saber si la complejidad operacional que añade está justificada por los requisitos reales."

### 31. AD-VAL-2 kept: history values the current entries (Human review — AD-VAL-2)
**Objection (team):** `V(t)` re-values today's entries at past prices, so a card deleted today also disappears from past values. "My collection's history" could be read as the real past composition.
**AI proposal (original):** AD-VAL-2 and A-54: history over the current entries, labelled "what your current cards were worth"; `marketChangePercent` (A-46).
**Evaluation:** the agent defended keeping it:
- it answers "how did the market move for what I own", which is the signal for a sell decision;
- a composition history mixes the user's own additions with market moves, so a purchase shows as a rise;
- reconstructing composition needs a change log, including quantity edits, which costs against NFR-VAL-2.

It offered, as a team choice, an append-only `CollectionEntryChange` log now, so that a v2 history could reach back further, and recommended against it.
**Decision:** kept, with no `CollectionEntryChange` in V1. "mantenemos la decisión actual de valorar históricamente las entradas que existen actualmente. […] Queremos conservar la aclaración de copy que explica la semántica."
**Not changed (kept on purpose):**
- ARCHITECTURE AD-VAL-2;
- prd.md A-54 and A-46;
- page 10.2: heading "Lo que valían tus cartas actuales" and the note "Si quitas una carta, también sale del cálculo de fechas anteriores."

**Rationale:** the review confirmed that the semantics were a deliberate product choice, and the copy already states them. Adding the log would pay a cost now for a feature that is not planned.
**IDs:** AD-VAL-2, FR-VAL-2, A-54, A-46, NFR-VAL-2.
**Persona/skill:** objection from the team; defended by the agent; the team kept the AI's decision after reviewing it.
**Prompt (excerpt):** "Si consideras que el modelo actual es el correcto por simplicidad y coste, queremos que lo defiendas."

### 32. `[IMPROVED]` `status: final` is kept; `launchReady: false` and a visible Launch gates section are added (Human review — ARCHITECTURE status)
**Objection (team):** `status: final` while G-3, G-4 and OQ-9 are open could suggest that the production envelope is decided.
**AI proposal (original):** `status: final` set at the architecture Finalize, following the BMad lifecycle.
**Evaluation:** the agent recommended keeping `final`, because BMad skills use `status != final` to offer "resume", and adding a separate flag and a gate list. It also named two production constraints that no document mentioned: Vercel Hobby's non-commercial terms and Supabase Free's pausing.
**Decision:** "mantenemos `status: final` por compatibilidad con el lifecycle de BMad, pero aceptamos agregar `launchReady: false` y una sección visible de Launch Gates. Los puntos que mencionaste sobre Vercel Hobby y Supabase deben tratarse como hechos a verificar antes de incorporarlos definitivamente a la arquitectura."

**Verification done before incorporating them (2026-09-27):**
- *Vercel Hobby:* "restricted to non-commercial personal use only". The fair-use guidelines count as commercial "any method of requesting or processing payment from visitors of the site" and "advertising the sale of a product or service" (vercel.com/docs/plans/hobby; vercel.com/docs/limits/fair-use-guidelines). The marketplace does both.
- *Supabase Free:* projects pause after 7 days of low activity and must be resumed by hand (supabase.com/docs/guides/platform/free-project-pausing). Whether scheduled jobs count as activity is not documented.

Both are recorded as verified facts with an **open** decision (LG-4, LG-5). They are not adopted as constraints that change the design. Development and the course demo are unaffected.

**Applied:** the ARCHITECTURE frontmatter `launchReady: false`, and a §0 "Launch gates" section:
- LG-1: OQ-9 feed and licence;
- LG-2: retention legal approval (#33);
- LG-3: G-5 (#28);
- LG-4: Vercel commercial use;
- LG-5: Supabase pausing;
- plus the acknowledged oversell gap (#29).

**Rationale:** the lifecycle flag and the launch readiness answer different questions, so each gets its own field.
**IDs:** OQ-9, OQ-12, G-5, LG-1 to LG-5.
**Persona/skill:** objection from the team; evaluation by the agent; verification of the two facts on the providers' own documentation; decision by the team.
**Prompt (excerpt):** "Queremos tu opinión sobre si esto es solo una mejora documental o si el estado actual puede generar problemas reales de gobernanza/implementación."

### 33. `[IMPROVED]` Regulated retention periods are provisional defaults; the regulated purge runs in dry-run until legal approval (Human review — OQ-12)
**Objection (team):** the periods of 5 and 10 years were "adopted" while legal review was still a pre-launch requirement. The team did not want a technical default to become policy before validation.
**AI proposal (original, OQ-12 at the Phase 1 gate, entry #14):** adopt the defaults, with legal review before launch as a pre-launch task.
**Evaluation:** the agent agreed and proposed more than a relabel. `retention-purge` deletes irreversibly: a wrong short period destroys data the law requires, and a wrong long period conflicts with the purpose principle of Ley 1581 de 2012.
**Decision:** "tratar los períodos de retención regulada como provisional defaults y mantener el purge regulado en dry-run hasta que exista aprobación legal explícita. El purge técnico de `delivered` puede continuar normalmente."

| | Before | After |
| --- | --- | --- |
| Label | adopted at the Phase 1 gate | provisional defaults, not legally approved |
| Regulated purge | deletes past the periods | dry-run: counts and logs what it would delete and deletes nothing, until `TEZG_RETENTION_LEGAL_APPROVED=true` records approval (LG-2) |
| Technical purges | `delivered` rows after 90 days | unchanged, plus `JobRun` after 90 days; not gated |

**Applied:**
- ARCHITECTURE: AD-SYS-8 rule 10; AD-SYS-2 rule 10; §10 (the flag); §13 `retention-purge`; §14 legal row; §15.3.
- PRD-sync: addendum ADD-§9.4 intro; prd.md OQ-12 status and A-58.

**Rationale:** dry-run costs nothing in V1, because no regulated period ends for years, and it makes the irreversible step wait for the approval it depends on.
**IDs:** OQ-12, A-58, ADD-§9.4, AD-SYS-8, LG-2.
**Persona/skill:** objection from the team; evaluation by the agent; decision by the team.
**Prompt (excerpt):** "no queremos que un default técnico termine implementándose como política definitiva antes de la validación correspondiente."

### 34. `[CORRECTED]` *Tú*/*usted* follows the rendering surface; `SellerNotVerified` moves to *tú* (Human review — microcopy, ADD-§1.1)
**Objection (team):** the rule classified messages by module ("VER messages to applicants → usted"), which leaves seller-side messages owned by VER ambiguous.
**AI proposal (original, Phase 2 gate, entry #16):** *usted* in the admin panel and in business-verification messages, *tú* in the selling flow. EXPERIENCE listed `SellerNotVerified` as *usted*.
**Evaluation:** the agent agreed and found a concrete case. `SellerNotVerified` renders on the selling pages (4.x) but was written in *usted* ("No puede publicar…"), next to 4.2 labels in *tú*.
**Decision:** "cambiar la regla para que el tratamiento (`tú` / `usted`) dependa de la superficie que renderiza el mensaje y no del módulo propietario. Aceptamos además corregir `SellerNotVerified` para el flujo de seller/listing." This changes part of the voice decision confirmed at the Phase 2 gate (entry #16).

| | Before | After |
| --- | --- | --- |
| Rule | by module: VER messages to applicants in *usted* | by surface: *tú* on buyer and seller surfaces, including listing and selling pages; *usted* on the admin panel and on the application pages 5.1 and 5.2; a code shown on both gets one template per surface |
| `SellerNotVerified` | "No puede publicar mientras su solicitud de tienda esté rechazada. Podrá…" | "No puedes publicar mientras tu solicitud de tienda esté rechazada. Podrás volver a solicitar desde el {fecha}." (and the permanent variant in *tú*) |

**Applied:** microcopy §0 rule and the two `SellerNotVerified` rows; EXPERIENCE Voice and Tone and Open Items.
**Not applied (flagged, #35 finding i):** ADD-§1.1 in the addendum still states the module-based wording.
**Rationale:** the reader experiences a surface, not a module. One register per page avoids a formal sentence in the middle of an informal selling flow.
**IDs:** ADD-§1.1, `SellerNotVerified`, EXPERIENCE Voice and Tone, entry #16.
**Persona/skill:** objection from the team; evaluation by the agent (UX role); decision by the team.
**Prompt (excerpt):** "Queremos una regla explícita por superficie […] Queremos que nos digas si esta clasificación es realmente la más limpia".

### 35. Second-pass findings: flagged, not applied (Human review — consistency pass)
**Context:** the team asked for a second pass before any edit: "No cambies nada que sea consecuencia indirecta sin señalarlo primero. Si durante esa pasada encuentras una solución mejor que las decisiones anteriores, dinos cuál es y por qué antes de aplicarla." The pass covered outbox, commission, the upload boundary, the scheduler, launch gates, retention and microcopy. Only the accepted decisions #26–#34 were applied. Everything below is recorded for the team to decide.

**Correction of the agent's own statement.** During the evaluation the agent said that no collections code reads `closedAt`. That was wrong: AD-COL-2 rule 2 derived `acquiredAt` from `closedAt`. The rename in #27 covers it (`acquiredAt` now reads `buyerItemReceivedConfirmedAt`, with the same meaning).

**Findings (not applied unless the entry says so):**

| Id | Finding | Status |
| --- | --- | --- |
| a | Uploads are up to 5 MiB, but a Vercel function accepts a 4.5 MB request body. An upload through a function fails. Proposal: a signed direct upload to a quarantine bucket, checked before it is promoted | Flag, open |
| b | Server-side pdf.js fails the security boundary; client-side rasterization is the better candidate | Recorded as G-5 pending (#28) |
| c | Move the tick off :05 (for example to :17) to avoid GitHub's top-of-hour load | Proposal, not adopted |
| d | `JobRun` as the record of the last run | Applied (#30) |
| e | Vercel Hobby commercial-use terms | Verified; LG-4 open (#32) |
| f | Supabase Free pausing | Verified; LG-5 open (#32) |
| g | ADD-§10's "Orders closed within 14 days" uses the order's `closedAt` | Flag; it is an order column, not a payload field |
| h | "Admin home" is named by AD-SYS-2 rule 9, §7.2, §13, §14 and prd.md, but no UX surface is called that (the badge lives on the admin rail and 2.3) | Flag; wording kept |
| i | ADD-§1.1 still states the module-based address rule | Flag; PRD-sync pending the team's approval |
| j | `readiness-gate-report.md` still describes the pre-review state (sandboxed viewer, `oversell-check` placeholder, F-14 "before launch", AEC-19 open) | Flag; the report is a dated gate record, and a pointer to this round is proposed, not written |
| k | NFR-SYS-6 needed a PRD-sync for #26 | Applied (#26) |
| l | `PostPurchasePrompt` has no close-timestamp column | Flag; only the rename in #27 was applied |
| m | The Plan-1 `comprobante-viewer` definition is inherited and still describes inline viewing | Flag; not edited |
| n | No tRPC procedure name exists yet for reading `JobRun` or the delivery list on 2.3 | Flag; named at implementation |
| o | ADD-§10's "unreplayed failed deliveries" row does not count stuck `pending` deliveries, and it names `failedAt` where the column is `firstFailedAt` | Flag, open |

**Follow-up (2026-09-27):** the team later decided findings a, c, e, f, h, i, j, l, m, n and o in #36–#45; the letter mapping is at the start of that round. Finding g's status above is wrong and is corrected there. The statuses in this table are kept as recorded.

**Interim state recorded:** until G-5 closes, no PDF rendition exists, and no placeholder copy was invented for that state.
**Persona/skill:** the agent's consistency pass (Architect and UX roles), with the external facts verified on the providers' documentation. The team decides each open flag.
**Prompt (excerpt):** "Cuando termines la evaluación, aplica únicamente las decisiones que ya quedaron aceptadas arriba y registra todas ellas en el decision trail. No hagas cambios silenciosos."

---

## Follow-up review round (2026-09-27)

**What happened.** The team (Martín Gómez and Mateo Rubio, jointly) decided on the second-pass findings recorded in #35. For each finding the team did one of three things: accepted the proposal, accepted a correction with conditions, or asked for an evaluation before any change. The agent applied only these decisions. It flagged every indirect consequence below. It did not apply the two new findings it found while applying them.

**Letter mapping.** The team's letters a–j match the #35 finding ids. From l onward they differ:

| Team letter | #35 finding | Entry |
| --- | --- | --- |
| a | a | #36 |
| c | c | #37 |
| e/f | e, f | #38 |
| h | h | #39 |
| i | i | #40 |
| j | j | #41 |
| l | n | #42 |
| m, n | o | #43 |
| o | m | #44 |
| PostPurchasePrompt (no letter) | l | #45 |

| # | Finding | Team decision | Tag |
| --- | --- | --- | --- |
| 36 | Uploads above the Vercel request body limit | Accepted: signed direct upload to a quarantine bucket | `[CORRECTED]` |
| 37 | Tick at minute :05 | Accepted: minute :17, best-effort | `[IMPROVED]` |
| 38 | LG-4 Vercel Hobby, LG-5 Supabase Free | Accepted: both stay open, each split into fact, decision and pending decision | `[IMPROVED]` |
| 39 | "Admin home" names no UX surface | Accepted: replaced by the existing admin surfaces | `[CORRECTED]` |
| 40 | ADD-§1.1 states the old address rule | Accepted: the surface rule is the source of truth | — |
| 41 | The readiness report shows the pre-review state | Accepted: a post-issue note, no retrospective rewrite | — |
| 42 | No procedure name for tick runs and the delivery list | Accepted: stable names in the architecture | `[IMPROVED]` |
| 43 | The ADD-§10 metric misses stuck `pending` rows and names `failedAt` | Accepted: new metric and three timestamps | `[CORRECTED]` |
| 44 | Inherited Plan-1 comprobante viewer | Accepted: sanitized-only; the PDF branch is blocked by LG-3 | `[CORRECTED]` |
| 45 | `PostPurchasePrompt` has no close date | Evaluate first; add only if a rule needs it | `[CORRECTED]` |

#40 and #41 are untagged. #40 completes the correction already recorded in #34. #41 adds a record note without changing any AI proposal.

**Consequences flagged and applied.** Each follows directly from an accepted decision.
- Page 2.3 gains a digest line that renders the new `FailedDeliveryDigest` fields (#43). Its es-CO text is new copy: "Resumen del {dia}: {n} entregas fallidas (la más antigua desde {fecha}) y {m} atascadas."
- `microcopy-es-CO.md` gains three `(missing)` template rows, one per invalid-file code. They cover a promotion that finds no object in quarantine (#36).
- The NFR-SYS-6 target and the §22 row in prd.md are reworded to the new metric (#43).
- The preconditions of the three upload ticket procedures are the agent's design detail, not a team decision (#36):
  - `verification.createDocumentUpload` checks only the session; `verification.submit` keeps every precondition.
  - `orders.createComprobanteUpload` raises `OrderNotOwnedByCaller`.
  - `commission.createTopUpProofUpload` raises `NotBusinessAccount`.

**New findings, flagged and not applied.** These are for the team to decide.
- *`unitPriceCop` gap.* AD-COL-2 rule 2 sets `acquiredPriceCop` from the line's `unitPriceCop` "when present". The `OrderClosed` payload lines carry no `unitPriceCop`, so as written `acquiredPriceCop` is always null. Decided in #48.
- *Source of "Orders closed within 14 days".* ADD-§10 computes the metric from `closedAt − createdAt`, but `Order` has no `closedAt` column. The order's close fact is `buyerItemReceivedConfirmedAt`. Decided in #49.

**Correction of the agent's own statements in #35.**
- The status of finding g said `closedAt` "is an order column, not a payload field". That is wrong: `Order` has no `closedAt` column (checked against the data model on 2026-09-27). The corrected finding is the second new flag above.
- Finding h said that prd.md names "admin home". It does not; the term appeared only in ARCHITECTURE.

### 36. `[CORRECTED]` Uploads go directly to a quarantine bucket through a signed URL and are promoted only after validation (Follow-up review — #35 a, AD-SYS-8)
**Finding (#35 a):** uploads are up to 5 MiB, but a Vercel function accepts a request body of at most 4.5 MB. An upload sent through a tRPC procedure fails.
**AI proposal (original, AD-SYS-8 rule 5):** the owner's procedure receives the file bytes and runs the validation pipeline before it stores the object.
**Decision:** "Queremos usar upload directo al bucket de cuarentena mediante una URL firmada, manteniendo el archivo fuera de la función principal. La cuarentena sigue siendo obligatoria antes de que el archivo pueda pasar al flujo normal. […] asegúrate de que el archivo no pueda ser servido como contenido confiable antes de completar las validaciones correspondientes. Registra este punto también como parte de la revisión humana y como corrección de la arquitectura de uploads."

| | Before | After |
| --- | --- | --- |
| Transport | the file bytes travel in the tRPC request body | a ticket procedure returns a signed upload URL (Supabase `createSignedUploadUrl`, valid 2 h); the browser uploads directly to the private bucket `upload-quarantine` under `<purpose>/<actorId>/<cuid2>` |
| Validation | inside the upload request | at promotion: the owner's submit procedure downloads the object, then runs the size check, the magic-byte check and `MalwareScanner` on the downloaded bytes; the bucket's `fileSizeLimit` and `allowedMimeTypes` are only a first filter |
| Serving | — | no read path to `upload-quarantine` exists; only an object promoted to its destination bucket can be rendered, and only as the sanitized rendition (#28) |
| Failure | invalid-file code | the same codes, plus the cause `missing` when the object is absent or the ticket expired |
| Clean-up | — | the orphan sweep deletes quarantine objects older than 24 h |

**Applied:**
- ARCHITECTURE:
  - AD-SYS-8: binds, prevents, rules 3, 5, 6 and 8, and the trade-off;
  - the `ObjectStorage` port;
  - the ticket procedures and the new submit inputs (`documentUploadKeys`, `uploadKey`);
  - AD-VER rule 4 and the AD-ORD-3 upload steps;
  - the `missing` cause in §8.1;
  - S-5, the §13 orphan sweep and G-5 point 2.
- microcopy: the three `(missing)` rows (flagged above).

**Rationale:** the file never passes through a function body, so the 4.5 MB limit does not apply. Quarantine keeps an object unreachable until it is validated. The costs are one extra round trip and an abandoned object that can remain for up to 24 h.
**IDs:** AD-SYS-8, AD-VER, AD-ORD-3, G-4, G-5, LG-3, #28.
**Persona/skill:** finding from the agent's consistency pass (#35); decision by the team; applied by the agent (Architect role).
**Prompt (excerpt):** "a. Uploads de 5 MiB vs límite de 4.5 MB de Vercel — ACEPTADO."

### 37. `[IMPROVED]` The hourly tick moves to minute 17 as a best-effort choice (Follow-up review — #35 c, G-3)
**Finding (#35 c):** the tick ran at minute :05, close to the top of the hour, when GitHub Actions scheduled runs are more likely to be delayed.
**AI proposal (original, #30):** `5 12-23,0-1 * * *` UTC.
**Decision:** "Aceptamos mover el tick horario a :17. No queremos que la arquitectura dependa de la afirmación de que GitHub 'siempre' se congestiona al inicio de la hora. Déjalo explícitamente como una decisión operacional/best-effort para reducir la probabilidad de retrasos, no como una garantía de ejecución puntual."

| | Before | After |
| --- | --- | --- |
| Schedule | `5 12-23,0-1 * * *` (07:05–20:05 Bogotá) | `17 12-23,0-1 * * *` (07:17–20:17 Bogotá) |
| Silence alert window | 10:05–23:05 Bogotá | 10:17–23:17 Bogotá; the 3 h threshold is unchanged |
| Stated reason | — | best-effort: the move lowers the chance of a delay and guarantees nothing; the silence alert still catches a missed run |

**Applied:** in ARCHITECTURE, the §4 tick row and paragraph, and the times in the AD-SYS rules and G-3. The times on page 2.3. In the readiness report, an annotation on the AEC-19 checklist item; the item itself is not rewritten (#41).
**Not changed:** the historical `5 …` schedule quoted in entry #30 and in `reviews/review-arch-adversarial.md`, because those record what was proposed at the time.
**IDs:** G-3, AEC-19, #30.
**Persona/skill:** finding from the agent (#35); decision by the team.
**Prompt (excerpt):** "Actualiza la documentación, los ejemplos de schedule y cualquier readiness/gate que dependa del horario."

### 38. `[IMPROVED]` LG-4 and LG-5 stay open, each split into verified fact, architectural decision and pending decision (Follow-up review — #35 e/f)
**Finding (#35 e, f):** #32 verified Vercel Hobby's non-commercial terms and Supabase Free's pausing, but the gate rows mixed each fact with what the architecture does about it.
**Decision:** "Aceptamos mantener ambos como launch gates abiertos. La documentación debe distinguir claramente entre: hechos verificados […]; la decisión arquitectónica de usar esos servicios; la decisión pendiente sobre qué infraestructura/licencia utilizar para un lanzamiento comercial real. No cambies silenciosamente el deployment."

| Gate | Verified fact | Architectural decision | Pending decision |
| --- | --- | --- | --- |
| LG-4 | Vercel Hobby is for non-commercial use only (cited in #32) | development and the course demo run on Vercel Hobby | the hosting plan or infrastructure for a commercial launch |
| LG-5 | Supabase Free pauses a project after 7 days of low activity (cited in #32) | development and the course demo run on Supabase Free; the architecture does not rely on scheduled jobs to prevent pausing | the database plan for a commercial launch |

**Applied:** ARCHITECTURE §0 rows LG-4 and LG-5. The deployment in §4 does not change, and `launchReady` stays `false`.
**IDs:** LG-4, LG-5, #32.
**Persona/skill:** finding from the agent (#35); decision by the team.
**Prompt (excerpt):** "Por ahora queremos que quede como un bloqueo de launch readiness, no como una re-arquitectura inmediata."

### 39. `[CORRECTED]` "Admin home" is replaced by the admin surfaces that exist in UX (Follow-up review — #35 h)
**Finding (#35 h):** ARCHITECTURE named an "admin home" as the place for three things: the failed-delivery badge, the digest and the reconciliation results. No UX surface has that name.
**Decision:** "No queremos inventar una nueva pantalla. Si la arquitectura o algún registro menciona 'Admin home' como una superficie existente, reemplázalo por la superficie administrativa que realmente exista en UX."

| Where | Before | After |
| --- | --- | --- |
| AD-SYS-2 binds and rule 9, §7.2 | the admin home badge and digest | the badge on admin rail item 10, and the Entregas tab of page 2.3 |
| AD-COM rule 4 | discrepancies shown on the admin home | the "Última ejecución diaria" line on page 7.4 |
| §13, §14 | "for the admin home" | the same surfaces |

**Applied:** ARCHITECTURE only. No UX file changes, and there is no new screen.
**IDs:** AD-SYS-2, AD-COM, EXPERIENCE rail item 10, pages 2.3 and 7.4.
**Persona/skill:** finding from the agent (#35); decision by the team.

### 40. ADD-§1.1 states the surface rule for *tú* and *usted* (Follow-up review — #35 i, completes #34)
**Finding (#35 i):** after #34, the addendum still classified messages by the module that owns them.
**Decision:** "Actualizarlo para que la regla por superficie adoptada en esta revisión sea la fuente de verdad: buyer/seller surfaces → tú; admin surfaces → usted; VER applicant-facing surfaces → usted; el módulo propietario no determina el tratamiento; si un mismo código aparece en varias superficies, debe existir la variante correspondiente."
**Applied:** addendum ADD-§1.1 Address, which now cross-references EXPERIENCE Voice and Tone and `microcopy-es-CO.md`. The three sources state the same rule.
**IDs:** ADD-§1.1, #34, entry #16.
**Persona/skill:** finding from the agent (#35); decision by the team.

### 41. The readiness report keeps its issued state and gains a post-issue note (Follow-up review — #35 j)
**Finding (#35 j):** `readiness-gate-report.md` still describes the state before the review.
**Decision:** "No queremos reescribir retrospectivamente el report original. Queremos que quede claro cuál era su estado al momento de emisión y qué cambios se hicieron después como resultado de revisión humana."
**Applied:** a "Post-issue note (added after sign-off)" block. It points to #26–#35 and #36–#45 and lists what changed:
- the sanitized viewer (#28, #44);
- quarantine (#36);
- F-14 (#29);
- AEC-19 (#30, #37);
- the launch gates and `launchReady: false` (#32, #33, #38).

The note states that the PASS covers the planning package, not a launch. The AEC-19 checklist item carries a one-line post-issue annotation. Nothing else in the report changed.
**IDs:** readiness gate, AEC-19, LG-1 to LG-5.
**Persona/skill:** finding from the agent (#35); decision by the team.

### 42. `[IMPROVED]` The tick-run and delivery reads get stable procedure names (Follow-up review — #35 n; team letter l)
**Finding (#35 n):** no procedure was named for reading `JobRun` or the delivery list on page 2.3.
**AI proposal (original, #35 status):** "named at implementation".
**Decision:** "Queremos nombres explícitos y estables para esas lecturas. […] Añade la definición necesaria en arquitectura/contratos y donde corresponda en la trazabilidad."

| Procedure | Returns | Read by |
| --- | --- | --- |
| `admin.events.deliveries({ kind: 'failed' \| 'stuck', cursor? })` | a page of failed deliveries, ordered by `firstFailedAt`, or stuck `pending` deliveries, ordered by `createdAt` | page 2.3, Entregas tab |
| `admin.events.deliveryHealth()` | `{ failedCount, oldestFirstFailedAt, stuckPendingCount, latestDigest }` | the rail item 10 badge, the Entregas tab label and its digest line |
| `admin.jobs.tickHealth()` | `{ lastTickStartedAt, tickSilent }`, derived from `JobRun` | page 2.3's header and the rail item 5 marker |

**Applied:**
- ARCHITECTURE: the §7.3 Read procedures table, AD-SYS-2 binds and §4;
- page 2.3 Technical Notes;
- EXPERIENCE rail item 10.

**IDs:** AD-SYS-2, G-3, page 2.3.
**Persona/skill:** finding from the agent (#35); decision by the team. The names follow the convention of the existing `admin.events.replay`, and all three are `adminProcedure`.

### 43. `[CORRECTED]` The delivery metric counts stuck `pending` rows, and `EventDelivery` separates first failure, latest failure and latest attempt (Follow-up review — #35 o; team letters m and n)
**Finding (#35 o):** the ADD-§10 row counted only unreplayed failures, and it named `failedAt` where the column was `firstFailedAt`.
**AI proposal (original, ADD-§10):** "count of failed deliveries with no successful replay and `failedAt < now − 24 h`".
**Decision (m):** "la métrica debe incluir las entregas pending que llevan más de 24 horas atascadas, tal como quedó decidido en la revisión del outbox. […] alineada con el nuevo modelo de EventDelivery por subscriber."
**Decision (n):** "Queremos distinguir: cuándo ocurrió la primera falla; cuándo ocurrió una falla posterior/reintento; cuándo finalmente pasó a failed. La nomenclatura debe ser consistente entre modelo, métricas, addendum y arquitectura."

| Column | Meaning |
| --- | --- |
| `lastAttemptAt` | the latest dispatch attempt, whatever its outcome |
| `firstFailedAt` | the first recorded failure, set once (`COALESCE`); this is when the row became `failed` |
| `lastFailedAt` | the latest recorded failure, including a failed replay |

**Metric:** the count of rows where either condition holds:
- `status='failed'` and `firstFailedAt < now − 24 h`;
- `status='pending'` and `createdAt < now − 24 h`.

`FailedDeliveryDigest` becomes `(date, count, oldestFirstFailedAt, stuckPendingCount)`.

On the team's third point, a delivery becomes `failed` on its first recorded failure, so "when it became failed" is `firstFailedAt`. Later failures move only `lastFailedAt`.

**Applied:**
- ARCHITECTURE: AD-SYS-2 rules 3, 7 and 9 and steps 1 and 3; §7.2; the §7.3 replay effect; the §13 digest row.
- The addendum's ADD-§10, and the NFR-SYS-6 and §22 rows in prd.md (flagged above).
- The columns and digest line of page 2.3 (flagged above), and EXPERIENCE rail item 10.

**IDs:** NFR-SYS-6, ADD-§10, AD-SYS-2, #26.
**Persona/skill:** finding from the agent (#35); decision by the team.

### 44. `[CORRECTED]` The inherited Plan-1 comprobante viewer follows the sanitized-only policy; its PDF branch is blocked by LG-3, not patched (Follow-up review — #35 m; team letter o)
**Finding (#35 m):** DESIGN.md inherits Plan-1's `comprobante-viewer`, which shows the original file inline. That contradicts the sanitized-only rule adopted in #28.
**Decision:** "No queremos dejar una excepción de seguridad heredada del Plan-1 […]. Si el visor de Plan-1 no puede cumplirla tal como está diseñado, no lo parchees parcialmente: deja explícito qué debe cambiar y enlázalo al launch gate correspondiente."
**Evaluation:** the image branch complies once it renders the sanitized, re-encoded image. The PDF branch cannot comply as designed: it shows the original PDF, and no PDF rendition exists until G-5 decides the mechanism.
**Applied:** in DESIGN.md:
- the inherited list names the override;
- a new "Comprobante viewer (inherited; Plan-2 override)" bullet states that the image branch renders only the sanitized image;
- the same bullet states that the PDF branch is blocked by LG-3. It changes when G-5 closes: it renders the rendition as an image, or it is removed if G-5 accepts images only.

The Plan-1 source files are not edited.
**IDs:** DESIGN `comprobante-viewer`, AD-SYS-8, G-5, LG-3, #28.
**Persona/skill:** finding from the agent (#35); decision by the team; evaluation and edit by the agent (UX role).

### 45. `[CORRECTED]` `PostPurchasePrompt` stores `buyerItemReceivedConfirmedAt` because accept needs it (Follow-up review — #35 l)
**Finding (#35 l):** the prompt had no close-date column.
**Decision:** "Si la fecha es necesaria para que el prompt sea realmente idempotente, expire correctamente o pueda auditarse, entonces agrégala y explica qué representa. Si no existe una regla funcional que necesite una fecha de cierre persistida, no queremos agregar una columna solamente porque 'podría ser útil'."

**Evaluation against the team's criteria:**
- *Idempotency:* no need. The unique `orderId` already provides it.
- *Expiry:* no need. Prompts never expire (A-43).
- *Another functional rule:* yes, one needs it. When the buyer accepts, AD-COL-2 rule 2 sets each entry's `acquiredAt` to the Bogotá date of `buyerItemReceivedConfirmedAt`, and accept can happen days after the event. The prompt did not store that date, and `collections` cannot read `Order` (AD-9). Without the column, accept has no source for `acquiredAt`.

**Applied:**
- The ARCHITECTURE data model gains `buyerItemReceivedConfirmedAt timestamptz`, copied from the `OrderClosed` payload. It represents the order's close fact, the buyer's confirmation that the item arrived, and it is used only for `acquiredAt`.
- AD-COL-2 rule 1 and §15.2.
- The prompt shape in prd.md FR-COL-7.

**Rationale:** the column exists because a rule reads it, not for audit. It also fixes a defect in the original rule, which read a date the prompt never kept.
**IDs:** FR-COL-7, AD-COL-2, AD-9, A-43, #27.
**Persona/skill:** finding from the agent (#35); decision rule set by the team; evaluation by the agent against that rule.
**Prompt (excerpt):** "Aquí queremos que hagas una última comprobación semántica antes de modificar el modelo."

---

## Pre-submission review round (2026-09-27)

**What happened.** Before submission the team asked for a final review with three questions: how the package stands against the rubric, whether every module is covered well enough to end with a working product, and whether the package is comparable with the original statement. The agent answered without editing any file. It proposed five documentation fixes, A–E, and recommended A–D. The team approved all five.

In the same message the team asked whether two wireframes are enough for 12 modules and whether they should be HTML. The agent offered four options with a recommendation, and the team chose it (#52).

The agent applied only these decisions. It flagged every indirect consequence below. It did not apply the new findings it found while applying them.

| # | Finding | Team decision | Tag |
| --- | --- | --- | --- |
| 46 | No entry records the adoption of the PRD review triage, and the report still says its triage is not a decision | A: triage adopted in full; counts line added | — |
| 47 | Appendix A calls the rubric descriptors unchanged, but several were adapted | B: weights unchanged, adapted descriptors listed | — |
| 48 | `OrderClosed` lines carry no `unitPriceCop`, so `acquiredPriceCop` is always null (a new finding from the follow-up round) | C: `unitPriceCop` on card and sealed lines | `[CORRECTED]` |
| 49 | The ADD-§10 metric reads `closedAt`, which `Order` does not have (a new finding from the follow-up round) | C: the metric uses `buyerItemReceivedConfirmedAt` | `[CORRECTED]` |
| 50 | The field rule says every entry records a prompt, alternatives and a rationale; many entries do not | D: those fields are recorded where applicable; no prompt is reconstructed | — |
| 51 | The 15 Mermaid diagrams were never checked with a renderer | E: checked, all valid; no change | — |
| 52 | Two wireframes for 12 modules | 12 interactive HTML key-screen mocks, one per module | — |

#48 and #49 are tagged because they correct the agent's own payload design and metric. #46, #47, #50 and #51 are untagged: they fix statements in the record and change no AI design proposal. #52 is untagged because the team adopted the agent's recommendation.

**Consequences flagged and applied.** Each follows directly from an accepted decision.
- The counts line in the PRD review report records two later outcomes (#46):
  - the Defer item F-29 was taken into V1 as FR-MSG-8 (#15);
  - the Gate item F-15 became OQ-12 (#14).
- FR-COL-7 in prd.md now states the accept rule: `acquiredPriceCop` is the line's `unitPriceCop` when present, otherwise null. AD-COL-2 rule 2 already said so (#48).
- Appendix A gains a "Decision-log entry fields" row, because the rule it states changed (#50).
- Under Layout Structure, each of the 12 mocked page specs links to its mock, with the sentence "this spec and the spines win on any conflict". `00-ux-scenarios.md` and `EXPERIENCE.md` name the `mockups/` folder next to `wireframes/` (#52).
- The UX memlog records that the mocks supersede an earlier choice: ASCII layouts instead of HTML mocks. The ASCII layouts stay in the specs (#52).

**New findings, flagged and not applied.** These are for the team to decide.
1. *Bundle purchases have no acquired price.*
   - Under #48 a bundle's component lines carry no `unitPriceCop`, because the order snapshot holds no per-component price. An entry bought in a bundle therefore gets `acquiredPriceCop` null.
   - This is the agent's design detail, not a team decision.
   - The alternative, splitting the bundle price across components, would invent prices, so the agent does not recommend it.
2. *Page 9.2 does not say per unit or total.* The manual-entry field "Precio pagado (opcional)" does not say whether it is a unit price or a total. `acquiredPriceCop` from #48 is a unit price. Recommendation: relabel it "Precio pagado por unidad".
3. *Page 5.2 mixes address forms.*
   - The Approved state on this *usted* surface (#34) asks for two pieces of copy: the microcopy §1.1 body, and the COM "never funded" line "Recarga tu saldo para empezar a vender." from microcopy §5. The COM line exists only in *tú*.
   - The mock shows the §1.1 body alone, which already asks for a top-up in *usted*.
   - Recommendation: the spec drops the COM line on this page, because it repeats the §1.1 body.
4. *Page 3.1 layout.* The ASCII layout selects the "Cartas" view but draws flat listing rows. The view table defines flat rows for "Publicaciones" and one tile per card for "Cartas". The mock follows the view table. Minor.
5. *Page 12.2 counter.* The ASCII layout draws "0/2.000", but the composer table shows the counter only from 1.800 characters. The mock follows the table. Minor.
6. *Gender agreement in the §10 template.* The microcopy §10 command template ends in "puedes repetirla sin riesgo". That does not agree with a masculine object such as "tu mensaje". Page 1.2 already adapts it to "repetirlo", and the 12.2 mock does the same. Recommendation: microcopy §10 states the agreement rule.
7. *The statement names no HTML format.* The task statement asks for at least two key-screen wireframes or mocks as "ASCII diagram, Mermaid UI layout, or SVG/PNG asset", and its package tree shows only `ux/wireframes/`. The two SVG wireframes meet that requirement on their own; the HTML mocks are additional evidence. Recommendation: add `mockups/` to the package tree. Not applied, because it edits the task statement.

### 46. The PRD adversarial-review triage is adopted in full (Pre-submission review — A)
**Finding:**
- `review-prd-adversarial.md` said its triage columns "are not decisions until the team confirms them".
- Its frontmatter says it was resolved at the Phase 1 gate, but no entry recorded the adoption. The Phase 2 triage and #19 are recorded that way.
- The report also had no counts line.

**AI proposal:** remove the stale sentence, add the counts line, and record the adoption in the log. The agent said it could not assume the adoption. It asked the team to confirm that the team had adopted the full triage at the Phase 1 gate.
**Decision:** "haz todos de a a e" (2026-09-27), the team's reply to that proposal.
**Applied:**
- The report's opening now says the team adopted the triage in full (this entry), and that the Gate item F-15 became OQ-12, answered at the Phase 1 gate (#14).
- A counts line: 30 findings, 28 Accept (F-14 partial), 1 Defer (F-29, later FR-MSG-8, #15), 1 Gate (F-15 → OQ-12, #14), 0 Reject.

**Rationale:** without a recorded adoption the report read as open triage. A reader could take that for an incomplete review.
**IDs:** F-14, F-15, F-29, OQ-12, FR-MSG-8, #14, #15, #19.
**Persona/skill:** finding and proposal from the agent's pre-submission review; decision by the team.
**Prompt (excerpt):** "Ok. Ahora hagamos la revision final antes de entregar. Como estamos respecto a la rubrica, tenemos todos los modulos cubiertos para que terminemos con algo verdaderamente funcional? y por ultimo, es comparable a el enunciado adjunto?"

### 47. Appendix A: rubric weights unchanged, descriptors adapted (Pre-submission review — B)
**Finding:** the "Unchanged" row of Appendix A in `task-statement.md` listed the "rubric weights and descriptors". The weights are unchanged, but several §7 descriptors were adapted to the 12-module package.
**Decision:** "haz todos de a a e" (2026-09-27).
**Applied:** Appendix A gains a "Rubric descriptors" row that lists each adapted descriptor:
- **PRD.** Outstanding traces "all 4 scenarios of every module" and "every FR to a CAP", with named TEZG protagonists. Beginning reads "brief/SPEC" for "system brief".
- **UX.** Outstanding designs explainability for "rejections/pauses/hides" and adds "extends Trusted Ledger coherently".
- **Architecture.** Outstanding uses the single-package reading of "6–8" and adds three items: "Status/" in the 5-part list, "each Rule machine-checkable" and "consistent with inherited AD-1..19". Developing adds "contradicts an inherited AD".

The "Unchanged" row now lists the rubric weights and the Readiness, AI Governance and Adversarial Review descriptors.
**Rationale:** Appendix A is where a reader compares the package with the original statement, so its "unchanged" claim has to be exact.
**IDs:** `task-statement.md` §7 and Appendix A.
**Persona/skill:** finding and proposal from the agent's pre-submission review; decision by the team.

### 48. `[CORRECTED]` `OrderClosed` card and sealed lines carry `unitPriceCop` (Pre-submission review — C; new finding from the follow-up round)
**Finding:** AD-COL-2 rule 2 sets `acquiredPriceCop` from the line's `unitPriceCop` "when present". The `OrderClosed` payload lines carried only `{ itemRef, title, qty }`, so as written `acquiredPriceCop` was always null for platform purchases. The agent flagged this in the follow-up round and did not apply it.
**AI proposal (original, ADD-§5, FR-ORD-5, AD-ORD-2):** `OrderClosed` lines with no price.
**Decision:** "haz todos de a a e" (2026-09-27). This adopts the recommendation to add `unitPriceCop` from the order snapshot, which already holds it.
**Applied:**
- ADD-§5: `lines: [{ itemRef, title, qty, unitPriceCop? }]`.
- prd.md FR-ORD-5 and FR-COL-7:
  - FR-ORD-5 adds `unitPriceCop` to the payload lines;
  - in FR-COL-7, accept sets `acquiredPriceCop` from the line when present, otherwise null.
- In ARCHITECTURE: AD-ORD-2 rule 5, the §7 event catalog row and two §15.2 PRD-sync rows.

A card or sealed line carries the order's unit price. A bundle component line carries none, because the snapshot holds no per-component price. That split is the agent's design detail; it is flagged above as new finding 1.
**Rationale:** the price was already in the order snapshot. Without it the "when present" rule could never fire. The field is shown only in the collection. Valuation uses reference prices and is unaffected.
**IDs:** FR-ORD-5, FR-COL-7, AD-ORD-2, AD-COL-2, ADD-§5, #45.
**Persona/skill:** finding and proposal from the agent (follow-up round and pre-submission review); decision by the team.

### 49. `[CORRECTED]` "Orders closed within 14 days" is computed from `buyerItemReceivedConfirmedAt` (Pre-submission review — C; new finding from the follow-up round)
**Finding:** ADD-§10 computed the metric from `closedAt − createdAt`, but `Order` has no `closedAt` column. The order's close fact is `buyerItemReceivedConfirmedAt`. The agent's #35 status had also called `closedAt` an order column; the follow-up round corrected that statement.
**AI proposal (original, ADD-§10):** the metric by `closedAt`.
**Decision:** "haz todos de a a e" (2026-09-27), adopting the recommendation.
**Applied:**
- The ADD-§10 row now reads `buyerItemReceivedConfirmedAt − createdAt ≤ 14 d`.
- A §15.2 PRD-sync row in ARCHITECTURE records the change.

**Rationale:** a metric has to read a column that exists, and the buyer's confirmation is the fact that closes an order.
**IDs:** ADD-§10, AD-ORD-2, #35, #43.
**Persona/skill:** finding and proposal from the agent; decision by the team.

### 50. Decision-log fields are recorded where applicable (Pre-submission review — D)
**Finding:**
- Line 312 of `task-statement.md` and this log's Purpose line said that every entry records the alternatives, the rationale and the key prompt.
- The review counted 22 entries with no prompt, 20 with no alternatives and 9 with no rationale.
- Several entries are not AI proposals (for example #1).
- The original statement asks only for documented prompts in general.

**AI proposal:** change the rule to "where applicable" and mark the entries that are not AI proposals. The agent recommended against reconstructing old prompts after the fact.
**Decision:** "haz todos de a a e" (2026-09-27).
**Applied:**
- The Purpose line of this log and line 312 of `task-statement.md` now state the rule:
  - every entry records the decision and its persona/skill or human source;
  - alternatives, rationale and key prompt are recorded where applicable;
  - an entry decided through a choice menu or a gate presentation cites that as its source;
  - prompts are not reconstructed.
- Appendix A gains a "Decision-log entry fields" row.
- #21 now says "Not an AI proposal." #1 already did.

**Rationale:** a prompt written after the fact would be a fabricated record. The rule now matches what the log actually keeps.
**IDs:** `task-statement.md` line 312 and Appendix A, #1, #21.
**Persona/skill:** finding and proposal from the agent's pre-submission review; decision by the team.

### 51. The 15 Mermaid diagrams render without errors (Pre-submission review — E)
**Finding:** the review had not checked the Mermaid diagrams with a renderer.
**Decision:** "haz todos de a a e" (2026-09-27). E was proposed as optional.
**Applied:** no file change. On 2026-09-27, mermaid-cli 11.17.0 rendered all 15 Mermaid blocks in `planning/ARCHITECTURE.md` without errors.
**IDs:** the ARCHITECTURE context diagram and the per-module component diagrams.
**Persona/skill:** check run by the agent.

### 52. Twelve interactive HTML key-screen mocks, one per module (Pre-submission review)
**Question from the team:** "tambien tenemos suficientes wireframes? y los wireframes no deberian ser htmls? siento que para 12 modulos hay muy pocos".
**AI proposal and alternatives considered:** the agent explained two points:
- the statement asks for at least two wireframes or mocks and does not require HTML;
- in BMad, the Excalidraw wireframes go in `ux/wireframes/` and the HTML key-screen mocks go in `ux/mockups/`.

It offered four options:
- one HTML mock per module in `ux/mockups/`, with the DESIGN.md tokens and a state selector, keeping the two Excalidraw wireframes (recommended);
- ten more Excalidraw wireframes with SVG, in the format of 5.3 and 8.2 (consistent, but static: no states and no real tokens);
- both (about twice the work, for little gain over the first option);
- keep the two current wireframes (meets the literal minimum).

**Decision:** "12 mocks HTML (Recomendado)".
**Applied:**
- **Folder contents.** `ux/mockups/` holds four kinds of file:
  - 12 mocks: 1.3, 2.2, 3.1, 4.3, 5.2, 6.2, 7.1, 8.1, 9.1, 10.1, 11.2 and 12.2;
  - an `index.html`;
  - the shared `_tokens.css` (the DESIGN.md tokens);
  - the shared `_states.js` (the state selector).
- **Page choice.** The agent chose the page for each module: the page where layout drives behaviour.
- **States.** Each mock shows one view per row of its spec's Page States table, 112 views in total, including the Loading, Empty and Error states and the explainability banners. A state can be linked with `#state=<name>`.
- **Copy.** All Spanish copy comes from the page specs or `microcopy-es-CO.md`. Values the specs leave open stay as placeholders, such as `{texto}`. English mock notes mark illustrative fixture data and the points where a spec is ambiguous; those points are new findings 3–6 above.
- **Wireframes.** The two Excalidraw wireframes (5.3, 8.2) stay.
- **Links.** The spec links and the memlog entry are listed under the consequences above.

**Rationale:** taken from the recommended option. One mock per module shows the tokens, the four states and the explainability banners for every module; two static wireframes cannot. The mocks are illustrative; the page specs and the spines win on any conflict.
**IDs:** DESIGN.md, EXPERIENCE.md, the 12 page specs, `00-ux-scenarios.md`.
**Persona/skill:** options and mocks by the agent (`bmad-ux` key-screen mocks); decision by the team.
**Prompt (excerpt):** "haz todos de a a e, tambien tenemos suficientes wireframes? y los wireframes no deberian ser htmls? siento que para 12 modulos hay muy pocos".
