---
reviewer: rubric-walker
target: ARCHITECTURE-SPINE.md
spec: _bmad-output/specs/spec-pokemon-tcg-marketplace/SPEC.md
date: 2026-08-25
---

# Rubric-Walker Review — Pokemon TCG Marketplace Architecture Spine

## Verdict

**Needs targeted revision, not a rewrite.** The dependency graph, the eight ADs, and the Capability→Architecture Map are internally coherent and cover all 26 assigned capabilities (CAP-23 is correctly absent — the spec's own memlog confirms it was intentionally never assigned, folded into CAP-1). The one clear rubric failure is the operational/environmental envelope: deployment topology is decided, but operations (logging/monitoring/error-tracking/backups/secrets) is entirely silent — not decided, not deferred, not flagged. There's also one real missing AD (review purchase-gate) and one Deferred item that undersells its own divergence risk (trade counter-offers). Everything else is minor/style.

## Walk

### 1. Fixes real divergence points for epics/stories — mostly, with one gap

The eight ADs target genuine, well-chosen divergence points: module boundary discipline (AD-1/AD-8), the payment-custody trap (AD-2), balance-drift between commission and listings (AD-3), trading contamination of the purchase flow (AD-4), duplicate filter implementations (AD-5), oversell across bundle/individual listing (AD-6), and catalog/listing/binder coupling (AD-7). These match the SPEC's own Constraints section closely (payment-gateway rejection, prepaid-balance semantics, inventory sharing, catalog independence) — good traceability.

**Gap found:** CAP-7 / the `NotVerifiedPurchaser` review gate has no AD. AD-1's dependency graph draws `reviews -. -> orders` (well, a solid edge: `reviews --> orders`) and the Consistency Conventions table lists `NotVerifiedPurchaser` as a known error code, so the intent was clearly recognized — but no AD states *which* order state qualifies as "completed purchase" for review eligibility (order exists? `sellerReceivedConfirmedAt` set? or the order-closing `buyerItemReceivedConfirmedAt`?). AD-2 goes to real lengths to replace one ambiguous "complete" flag with three explicit timestamps specifically to prevent this kind of ambiguity — leaving reviews' consumption of that state unstated reopens the identical ambiguity one hop away. Two independent builders could reasonably wire the gate to different order states, and per AD-8 they'd have to do it through `orders`' public query API anyway, so the exact query contract is exactly the kind of thing this spine format exists to pin down. This should be a short AD-9 or at minimum a one-line addition to AD-2/the Consistency Conventions.

### 2. Every AD's Rule is enforceable and actually prevents its divergence — yes, with one caveat

AD-2 through AD-7 are concrete, checkable rules (specific field names, specific ownership, specific query shape) that a reviewer could verify against a PR. AD-1 and AD-8 are the two structural rules and both are stated as **pure convention** — "never import another module's domain core/repository/Prisma models directly," "a module's Prisma models are written only by that module's own repository" — with no enforcement mechanism named (no import-boundary lint rule, no per-module generated client, no schema-ownership check). AD-8 exists explicitly because "Prisma's single shared schema file lets any module read or write any other module's tables directly," which is an admission that the substrate itself doesn't stop the violation — yet the rule that's supposed to compensate is itself unenforced by anything but code review. This may be an acceptable altitude call (tooling specifics could be epics-level), but it's worth flagging since it's the one place where an AD's own stated rationale ("the substrate won't stop you") isn't answered by anything stronger than discipline.

### 3. Nothing in Deferred that needed to be an AD — mostly clean, one item flagged

Most Deferred items are correctly scoped (UI/UX detail, explicit SPEC Non-goals, or genuinely open strategic questions carried from the spec/memlog).

**Flagged:** "Trade-offer negotiation UI (counter-offer flow specifics) — beyond AD-4's confirmation-shape rule, this is story-level." Counter-offering is characterized as UI, but it's actually a data-shape decision: does a seller's "counter" produce a new `TradeOffer` row referencing the original, or mutate the existing row's terms in place? That choice affects the very aggregate AD-4 was written to pin down (mutual-confirmation shape, no reimplementation of `Order`'s pattern). Two builders implementing "counter" independently could diverge exactly the way AD-4 exists to prevent for the accept/reject path. This deserves at least one sentence in AD-4 (e.g., "a counter creates a new `TradeOffer` superseding the prior one" or "counter mutates `TradeOffer.terms` and resets both confirmation flags") rather than being waved fully into Deferred.

Everything else in Deferred checks out: profile-step fields, binder grid config, currency-conversion mechanism, price-estimation algorithm, individual-seller monetization, seller-graduation transition, second Supabase project, and native/offline/push are all either explicit SPEC Non-goals or genuinely UX/story-level.

### 4. Named tech is verified-current — internally consistent

Stack table versions (Next.js 16.3.3, tRPC 11.13.2, Prisma 7.4.2, Better Auth 1.x, Tailwind 4.3.3, Supabase/Vercel free tier) appear exactly once each, nowhere else in the document, so there's no internal contradiction to catch. Not re-verifying currency per instructions.

### 5. Capability → Architecture Map covers the spec — complete

Checked all 26 capabilities bound in the frontmatter (`CAP-1..22, 24..27`) against the map table: every one appears, either individually or grouped (e.g., `CAP-8–CAP-13, CAP-24`). `CAP-23` is correctly absent — the spec's memlog explicitly notes it was intentionally never assigned (location/distance filtering folded into CAP-1 instead), so this is not a dropped capability. No gaps found in map coverage.

### 6. Every dimension this altitude owns is decided/deferred/open — one real silence

- Deployment & environments: decided (Vercel + Supabase, single-region, no staging tier, PR previews as ephemeral staging) — good, includes a Deferred fallback (second Supabase project) with a stated revisit trigger.
- Infra/provider strategy: decided (Vercel + Supabase free tier, named explicitly with rationale for the paradigm choice).
- **Operations: silent.** No mention anywhere of logging, monitoring, error tracking/alerting, backup/recovery strategy, or secrets/env-var management — not decided, not deferred, not raised as an open question. This is a system handling money-adjacent state (commission ledger deductions, comprobante proof-of-payment uploads, order confirmation sequences) on a free-tier stack with no staging environment; the operational blind spot is exactly the kind the rubric calls out as commonly skipped by domain-focused drafts. At minimum this needs a Deferred bullet (e.g., "observability/logging strategy — not decided, revisit before production traffic") so it's visibly triaged rather than invisibly absent.

Data/naming/error/money conventions, auth/session model, and cross-module event conventions are all decided in the Consistency Conventions table — good coverage there.

### 7. Style: terse/build-substrate — mostly clean, one section drifts into rationale

Almost every AD is stated as Binds/Prevents/Rule with no persuasion attached — correct for this format. Two exceptions:
- The Design Paradigm opening paragraph carries a full rationale clause ("Chosen over a plain layered monolith (too little boundary enforcement...) and over microservices/message-bus event-driven (infra cost and operational complexity incompatible with a 2-person, free-tier team against a fixed deadline)"). This is justification, not decision — it reads like memlog content promoted into the spine. Low severity, but worth trimming to the decision itself with rationale left to the memlog.
- Everything else (ADs, conventions, stack, structural seed, map, deferred) stays appropriately terse.

## Findings Summary (severity-ordered)

1. **Medium** — Missing AD: review purchase-gate (CAP-7 `NotVerifiedPurchaser`) doesn't specify which `orders` state counts as "completed purchase," despite AD-2 being built specifically to avoid this ambiguity one layer up.
2. **Medium** — Missing dimension: operations (logging/monitoring/error-tracking/backup/secrets) is completely silent — not decided, deferred, or flagged as open, contrary to the rubric's explicit expectation for the operational/environmental envelope.
3. **Low-Medium** — Deferred item "trade-offer counter specifics" undersells itself as UI-only; counter-offer state modeling (new row vs. mutation) is actually the kind of aggregate-shape decision AD-4 exists to fix, and belongs in AD-4 rather than Deferred.
4. **Low** — AD-1/AD-8 module-boundary rules rely entirely on code-review discipline with no named enforcement mechanism, which is a soft spot given AD-8's own stated rationale is that the shared-schema substrate won't stop the violation on its own.
5. **Low, style** — Design Paradigm section's "chosen over X because Y" rationale prose belongs in the memlog, not repeated in the terse build-substrate spine.
