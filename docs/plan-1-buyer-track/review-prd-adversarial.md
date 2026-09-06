# Adversarial Review — PRD: TEZG Buyer/Collector Track

**Reviewed:** `prd.md`, `addendum.md`
**Cross-checked against:** `_bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md` (CAP-1..28), `ARCHITECTURE-SPINE.md` (AD-1..13), `_bmad-output/project-context.md`

Findings (unranked):

- FR-9 and the "My Sales tab" glossary entry both claim the tab shows "pending contact/trade requests," but Trading (CAP-25, CAP-26) is explicitly declared a total Non-Goal in §5 ("card-for-card trade offers... are not part of this track's 4 scenarios"). FR-9's own content directly contradicts the PRD's own scope boundary two sections later — either the "trade requests" clause is deleted or Trading isn't actually a clean Non-Goal.

- The "pending contact requests" half of that same FR-9 claim has no grounding anywhere in the adopted contract. CAP-6 only produces a one-time, generated external-channel message text handed to the buyer — there is no persisted, seller-visible "pending contact request" object described in SPEC.md, ARCHITECTURE-SPINE.md, or project-context.md for an individual seller to review later. FR-9 invents a data shape that doesn't exist in any source it cites.

- FR-5 requires rejecting a "confirm paid without an uploaded comprobante" attempt as a testable consequence, but AD-11's exhaustive, single-owning-module `DomainError` list (the architecture's closed error taxonomy) names no code for this condition. As written, FR-5 either requires the Architecture phase to add an error code unsanctioned by the current spine, or it's an untestable requirement against the contract this PRD claims to be consistent with.

- FR-2's consequence states a zero-active-listing catalog entry is still returned "when no location filter narrows results" — implying it might be excluded once a location filter is applied. That's the opposite of SPEC.md's own Success Signal: "a location/distance filter narrows returned listings without excluding catalog entries that simply have none nearby." This is a direct contradiction with the canonical contract, not merely an omission, on the single most-tested behavior in CAP-1.

- The PRD's entire trust narrative (§1 Vision, JTBD #1: "know... that a listed price is the real Colombian market price") is built on CAP-3's reference-price/historical-trend data — data whose external source SPEC.md's Assumptions section flags twice as "Risky" and explicitly unverified for existence and licensability. The PRD never surfaces this risk to a downstream reader, and none of the three Success Metrics measure price-data accuracy or trust — SM-1 measures only response latency.

- Success Metric SM-3 ("share of closed Orders reached without the buyer contacting the seller outside the app") has no instrumentation path anywhere in this PRD's FRs. A WhatsApp/phone conversation outside the platform leaves no trace in any data model this document defines. A KPI is named that the described system cannot observe.

- §7's Security/Privacy NFR defers comprobante access control entirely to the Architecture phase as if it were a pure security/implementation detail, but CAP-20's own success signal requires the business to review the comprobante before it can confirm "payment received" — meaning comprobante readability by the seller is a functional precondition this PRD's own FR-6/tri-state flow depends on, not something that can be deferred without touching requirements this document owns.

- The comprobante (a bank-transfer/QR confirmation image, typically showing an account number and holder name) is compared in §7 to "AD-13's handling of legalIdentity documents," but AD-13's own text scopes itself explicitly to `legalIdentity` only (its "Scope note" says so verbatim). Neither the PRD nor the addendum flags that the comprobante may independently carry Ley 1581 personal-data obligations (consent, retention, access-scoping) in its own right — a compliance angle this document doesn't address despite invoking the adjacent AD by name.

- §5 Non-Goals explicitly excludes Wishlist (CAP-13/14) as "orthogonal," but says nothing about the broader Collection/Binder capability set (CAP-8–11), even though FR-8's acceptance criterion ("creates a collection entry tagged source=PlatformPurchase") and UJ-4's resolution ("her new card appears in her binder") both depend on it. A reader cannot tell from §5 whether viewing the purchased card's collection/binder entry — e.g., its value per CAP-9 — is in or out of this track's scope.

- The Glossary's "Dual-role user" entry and FR-9 both assert a user can be a buyer and an individual seller simultaneously. SPEC.md's Assumptions section separately states, as "Safe," that "a single seller account is exclusively either an individual seller or a verified business... not both simultaneously." The PRD never explicitly distinguishes these as two different axes (seller-type exclusivity vs. buyer/individual-seller role coexistence) for the reader — as written, the PRD's central FR-9 premise sits next to an apparently contradicting "Safe" assumption in the canonical SPEC with nothing in either document pointing out they don't actually conflict.

- `addendum.md`'s course-mapping table cites "`prd.md` §1 Vision framing and the decision log" as where the mobile-primary-design-target decision is documented, but §1 Vision never states any such decision — it only opens with an incidental "on her phone" detail. The cross-reference points a downstream reader (the UX phase) to content that isn't actually there.

- Open Question 2 (exact max file size/resolution for the comprobante photo) is left fully unresolved, yet FR-5's Feature-specific NFR ("<10s on a typical mobile connection") and Success Metric SM-2 both assert a concrete, testable upload-time target that is meaningless without the file-size ceiling controlling it. The PRD asserts a testable number while leaving its primary controlling variable an open question.

- FR-9 is listed as in-scope MVP functionality (§6.1), but the precondition for it to apply at all — a buyer completing CAP-19's individual-seller profile step to become a seller in the first place — is never defined by any FR in this PRD, and isn't explicitly claimed by the deferred Seller/Business track either (which doesn't exist yet). This leaves a scope seam that neither document currently owns.

- The fact "individual-seller listings can't be purchased in-platform" is independently restated in §2.2 Non-Users, the Glossary's "Individual seller" entry, UJ-2's edge case, and FR-4's Out of Scope note — four separate copies of the same constraint with no single source of truth, which raises the chance a future edit updates one copy and silently leaves the others stale.
