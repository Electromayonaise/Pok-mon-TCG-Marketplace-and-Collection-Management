# Adversarial Review: Seller/Business Track — Phase 3 (UX Design)

**Reviewed:** `DESIGN.md`, `EXPERIENCE.md`, and all 11 page specs under `C-UX-Scenarios/` (1.1–1.3, 2.1–2.3, 3.1–3.3, 4.1–4.2)
**Method:** bmad-review-adversarial-general

---

## Findings

- **1.3's "Design System" reference cites `components.listing-card` as if it's documented in this track's own `DESIGN.md`, but that token doesn't exist anywhere in `docs/plan-1-seller-track/DESIGN.md`'s frontmatter.** The Seller-track `DESIGN.md` only formally lists `button-primary` plus the 6 new component tokens — `listing-card` (and `order-status-row`, referenced elsewhere) are only ever mentioned in prose as "inherited," never actually declared or linked to their source file. A reader following 1.3's Reference Materials link will find nothing there for `listing-card`. 4.1's spec is more honest about this (it writes "order-status-row (inherited from Buyer track)" as plain text rather than a broken component-token link), which only highlights the inconsistency between pages.

- **1.2's success behavior for a business submitter routes to "3.3's own confirmation state," but 3.3 has no such state.** 3.3's Page States table lists exactly five states — Funded, Zero–Paused, Top-up in progress, Top-up error, Loading — none of which is "listing just published." A verified-business seller who publishes a listing through the reused form has no documented landing state or confirmation feedback anywhere in this track's 11 pages; Valentina's equivalent moment is explicitly page 1.3, and Andrés has no equivalent at all.

- **3.2's Rejected state offers "Submit a new application (returns to 3.1)," but 3.1's own Visibility precondition is "no existing business-verification application on file."** A Rejected application is, definitionally, an application on file. As written, the one documented path back into 3.1 contradicts the page's own stated access guard — either 3.1's Visibility needs to explicitly carve out "no *Pending or Approved* application," or this is a real dead end for a Rejected applicant.

- **2.1 and 4.1 both promise a "state badge" / "unseen indicator dot" on their card/row components, but neither element is defined in `DESIGN.md`.** `trade-offer-card`'s component entry in `DESIGN.md` only specifies background/border/radius/padding and the accept/reject action styles — there is no visual spec anywhere for how the five lifecycle states (Offered/Accepted/Declined/Completed/Withdrawn) are actually rendered as a badge, nor for the "unseen" dot's color, size, or placement on either card type.

- **2.2's Accept button description promises "a lightweight inline confirmation" step, but this UI element has no Object ID, no property table, and no place in Page Sections.** Every other interactive element on every other page in this track gets a dedicated subsection; this one is asserted in a parenthetical and then never actually specified — what does it say, how is it dismissed, does it block the Accept request or just warn beforehand?

- **3.3's "Top up balance" behavior is left genuinely undecided ("Opens a top-up amount entry (inline or lightweight modal)")** — every other multi-step interaction in this track commits to one specific pattern (a full page, an overlay, an inline expansion); this is the only place a real UI decision is punted with an "or," and it's never picked up again anywhere else in the document.

- **The disabled "Create a Listing" button on 3.3 relies on a tooltip to explain why it's disabled ("Disabled with a tooltip/helper... when Paused").** Disabled buttons are not focusable in most implementations, and hover-only tooltips are unreachable by keyboard and screen-reader users — this directly conflicts with the Accessibility Floor's own stated bar of "keyboard/assistive-tech operability," which this specific control is never checked against.

- **4.2's "Confirm Payment Received" button has no "Submitting/Confirming" row in its Page States table**, even though EXPERIENCE.md's Interaction Primitives explicitly states every network action in this track (including this exact one) "disables its triggering button immediately and shows an in-progress state." Every comparable submit action elsewhere (1.1, 1.2, 3.1) gets its own explicit Submitting state in the table; 4.2's is the one exception, silently relying on the reader to remember the general rule instead of stating it.

- **Andrés's Verification Application (3.1) never states what happens if he leaves the page mid-fill and comes back** — Interaction Primitives only covers backing out mid-*submission* (in-flight network request), not mid-*composition* (he's typed half the form and closes the tab). Given this is explicitly the one desktop, document-heavy, "gather everything and sit down" task in the whole track, silently losing typed-but-unsaved field values on an accidental navigation is a real risk this spec never addresses.

- **1.2's Condition field content is left as "options per TEZG's existing catalog condition vocabulary,"** an unresolved external reference rather than an actual enumerated value list — every other field on every other form in this track (including this same page's own Price and Item Search fields) commits to a specific input type and validation rule; Condition alone punts to an undefined external source with no citation of where that vocabulary actually lives.

- **EXPERIENCE.md's Component Patterns section mixes documentation conventions inconsistently between files** — page specs consistently reference design tokens as plain backticked paths (`` `components.create-listing-form` ``), while EXPERIENCE.md itself uses curly-brace token syntax (`{components.create-listing-form}`) per its own stated cross-reference convention, and 1.2's own Overview section then mixes the two conventions within a single document ("the shared `{components.create-listing-form}` mechanism" appears inside a page spec, not EXPERIENCE.md, breaking the stated per-document convention).

- **The claim that "the same uploaded file from Buyer-track page 3.2" backs 4.2's comprobante viewer is asserted without verification against the actual Buyer-track page numbering** cited nowhere else in this review's scope — if the Buyer track's comprobante-upload page isn't in fact numbered 3.2, this cross-track citation is simply wrong, and nothing in this track's own documents would catch that drift since it's a one-way, unchecked reference into a file this review didn't have in scope.

- **DESIGN.md's Brand & Style section asserts "a 'business' account is not styled as more important or more trustworthy than an 'individual' one anywhere in this system,"** yet Andrés's pages are given more spacing headroom, a wider reading measure, and desktop-primary authoring precisely because his tasks are framed as more "deliberate" and "back-office" — this is a defensible product decision, but calling the visual outcome equally-weighted while explicitly designing more real estate and a different primary device for the business persona's screens is a tension the document never actually reconciles, it just asserts both things are true.

---

*Reviewed via bmad-review-adversarial-general.*
