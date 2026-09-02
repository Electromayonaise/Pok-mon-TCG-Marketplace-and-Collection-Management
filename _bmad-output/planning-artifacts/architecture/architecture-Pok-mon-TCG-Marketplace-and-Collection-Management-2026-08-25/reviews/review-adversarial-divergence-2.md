---
name: 'Adversarial Divergence Review 2 — Architecture Spine (post Repair Plan Steps 1-4)'
type: architecture-review
lens: adversarial-divergence
target: ARCHITECTURE-SPINE.md (Pokemon TCG Marketplace and Collection Management Platform, updated 2026-09-01)
created: '2026-09-01'
status: complete
supersedes-scope-of: review-adversarial-divergence.md (2026-08-25 — findings 1-6, all resolved/accepted, not re-litigated here)
---

# Adversarial Divergence Review 2

**Mandate (unchanged from the first pass):** construct two units one level down that each obey every AD to the letter yet still build incompatibly. Every pair found is a hole to close with a new or tightened AD.

**Scope of this pass:** the spine changed since 2026-08-25 by adding AD-13 (Ley 1581 handling of `legalIdentity`) and resolving the Vercel Deferred entry (Repair Plan Steps 2-4). The first review's 6 findings were re-verified complete and are not re-litigated here (see `00-design-log.md`'s 2026-09-01 entry for the finding-by-finding status; one, Finding 4, remains a deliberate divergence from its own proposal — accepted, not a new gap). This pass applies the same adversarial mandate specifically to what's new: AD-13, and a general sweep for any interaction the new AD introduces with AD-8/AD-12's established patterns.

**Verdict:** AD-13 is directionally sound — the ordinary-vs-sensitive-data classification and the three-obligation structure hold up — but it names obligations narratively without pinning the concrete data shape the way every other AD in this spine does (AD-2 names exact field names, AD-7 names an exact tagged-union shape, AD-12 names exact method signatures). Two builders each honoring AD-13's text to the letter would model consent-capture differently, and neither would know how to handle a genuine Ley 1581 deletion (supresión) request without contradicting the platform's dominant "hide, never delete" convention established elsewhere. One Medium finding; one Low finding. Neither is Critical/non-functional the way the first pass's InventoryUnit or event-payload findings were — CAP-15 is still buildable either way — but both are real spec-level divergence risk, consistent with the same bar the first review applied.

---

## Finding 7 — AD-13 never pins where/how consent is stored, and the platform-wide framing in SPEC.md invites a broader reading than AD-13's narrow scope (Medium)

**The clash:** AD-13 says consent must be "timestamped and stored alongside the application" but never names a field, table, or owning aggregate — every other AD in this spine that touches data shape does (AD-2's three confirmation timestamps by name, AD-7's `BinderEntry.cardRef` tagged union, AD-12's `hiddenAt`/`hiddenReason` pair). SPEC.md's constraint line (as updated) also reads more broadly than AD-13's stated `identity`/`BusinessApplication`-only scope: it says the platform must apply "lawful-basis/consent... practices" under Ley 1581 generally, which as a matter of Colombian law actually does apply to any personal data collection, not just `legalIdentity` — buyer accounts, reviews, messaging all collect personal data too, even if only `legalIdentity` was flagged as needing an explicit mechanism here.

- **Builder A** adds `consentGivenAt: DateTime` (and maybe `consentVersion: string`) directly on `BusinessApplication`, scoped narrowly to match AD-13's literal text — consent lives and dies with the one form that mentions it.
- **Builder B** reads SPEC.md's broader "Ley 1581... lawful-basis/consent" framing and `identity`'s role as the module owning all account-level data, and builds a reusable `ConsentRecord(userId, purpose, version, givenAt)` table anticipating that buyer signup, reviews, or messaging consent will need the same mechanism later — a reasonable generalization given the law's actual scope, but a different table, different query shape, and a different answer to "does a user have exactly one consent record or one per purpose."

Both builders satisfy AD-13's rule as literally written ("captures... consent, timestamped and stored alongside the application") — "alongside" is genuinely ambiguous between "as a field on the same aggregate" and "in a related record the application points to." This is the same class of gap the first review's Finding 1 identified for event payloads: a rule stated as an obligation without a pinned shape, left for two builders to fill in differently.

**Proposed fix (tighten AD-13, no new AD needed):** pin the field shape explicitly, matching this spine's convention elsewhere: `BusinessApplication` owns `legalIdentityConsentGivenAt: DateTime` and `legalIdentityConsentVersion: string` (referencing the Privacy Policy version in effect at submission) directly on its own aggregate — no separate `ConsentRecord` table, consistent with AD-8's table-ownership rule and keeping `identity` the sole owner. Explicitly scope AD-13 to `legalIdentity` only (as it already claims to), and add one sentence noting that consent for other personal-data collection (buyer accounts, reviews, messaging) is a Deferred item, not silently assumed covered by AD-13 — closing the SPEC.md-vs-AD-13 scope mismatch rather than leaving it to be discovered later.

---

## Finding 8 — No rule reconciles a Ley 1581 deletion (supresión) request against `legalIdentity` with the platform's "hide, never delete" convention (Low)

**The clash:** AD-12 establishes hide-never-delete as the platform's dominant moderation pattern for `listings`/`reviews`, with an explicit audit-retention rationale. AD-13 names deletion ("supresión") as one of the data-subject rights the platform must honor for `legalIdentity`, but doesn't say what happens when a business's application data must actually be erased under a valid request — versus retained, e.g., because an approved business's `legalIdentity` may still be needed as evidence of the verification that legitimizes its account and past transactions.

- **Builder A**, pattern-matching on AD-12's dominant convention elsewhere in the spine, implements the "deletion" right as a `hiddenAt`-style soft-delete on `BusinessApplication` — consistent with the rest of the codebase's style, but not actually deletion, and arguably non-compliant if a data subject's statutory right is to have the data actually erased (subject to any lawful retention exception, which nothing in this spine names).
- **Builder B** implements a literal hard delete of `legalIdentity` and its documents on request, which could strip the audit basis for an already-approved, already-transacting business account — a different (and differently risky) outcome than Builder A's.

Lower severity than Finding 7 because this path is rarely exercised (a data-subject deletion request against an *approved* business's identity documents) and CAP-15/CAP-28 don't currently define what happens to a business's listings/orders if its identity data is erased — this sits at the edge of what the spine needs to decide now versus at implementation time.

**Proposed fix (Deferred, not a new AD):** add a Deferred item naming this explicitly — "Ley 1581 deletion-request handling for an approved business's `legalIdentity`, and its interaction with AD-12's hide-never-delete convention, is not decided; likely needs a lawful-retention-exception carve-out (data needed to substantiate past verified transactions) rather than either pure soft-delete or pure hard-delete, resolved at implementation time once real request volume justifies the design cost." This keeps the gap visible without forcing a premature decision on a rarely-exercised path — consistent with how this spine treats other genuinely low-volume edge cases (e.g. the stalled-confirmation gap in AD-2).

---

## Summary

| # | Finding | Severity | Disposition |
|---|---|---|---|
| 7 | AD-13 doesn't pin consent's field/table shape; SPEC.md's broader Ley 1581 framing isn't scoped against AD-13's narrower one | Medium | Tighten AD-13's text with explicit field names + scope note |
| 8 | No rule for reconciling a Ley 1581 deletion request against `legalIdentity` with AD-12's hide-never-delete convention | Low | Add a Deferred item; not decided now, low-volume edge case |

Neither finding is Critical/non-functional the way the first pass's InventoryUnit-oversell or event-payload findings were — CAP-15 remains buildable under either builder's reading. Both are genuine spec-completeness gaps by the same bar the first review applied, appropriate to close at the same tightening-pass level (edit AD-13's text + one Deferred line) rather than a new AD.
