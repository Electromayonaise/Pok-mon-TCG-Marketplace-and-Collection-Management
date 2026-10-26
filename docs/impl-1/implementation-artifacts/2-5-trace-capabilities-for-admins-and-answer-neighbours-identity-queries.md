---
title: "Story 2.5: Trace capabilities for admins and answer neighbours' identity queries"
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: 'af976248ede65b30984e607b5a71b2da78b62532'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/docs/solu-2/planning/epics.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `traceCapabilities`, `getSellerKinds`, `getReviewTarget`, `getContactCard` and `getDisplayNames` throw `NotImplementedError`, so 9 bound tests are red. Support cannot explain why an account holds a capability, and the neighbour modules (listings, messaging, reviews) cannot ask identity who a seller is or what to call a user.

**Approach:** Widen the one fact read to a list of ids (one statement, AD-IDN-1 rule 1), so every capability answer stays a projection of `deriveCapabilities`. The trace adds one `"CapabilityAuditRead"` and one admin audit row in its transaction. The contact card and the names are two narrow reads in identity infra. Wire `access.traceCapabilities` (decision #24).

## Boundaries & Constraints

**Always:**
- **Facts:** `readCapabilityFactsMany(tx, ids)` reads every id in one statement (`WHERE u.id = ANY($1)`, same lateral join on the latest application). `readCapabilityFacts` becomes its single-id case, so there is one reader.
- **Trace (IDN-3):**
  - The clock is read once. One read-write transaction.
  - An unknown target raises `AccountNotFound` (404) before any write. The citation is `{ rule: 'FR-IDN-5', inputs: { account: null } }`, identical for every unknown id.
  - The response holds six `CapabilityTraceLine`s in `CAPABILITY_NAMES` order, each copied from `deriveCapabilities`, plus `sellerKind`.
  - Insert `CapabilityAuditRead { id, adminId, targetUserId, createdAt: now }` and `audit('identity.capabilities.traced', User:targetUserId)` with `actorKind: 'admin'` and no event.
  - The decision is `allowed`, citing `FR-IDN-5` with `{ targetUserId, capabilityCount: 6 }`, under a new stored-only §13 code `CapabilitiesTraced` (the rule of decision #16).
  - Not idempotent: N traces write N audit pairs.
  - The fact read never selects a `"BusinessApplicationLegalIdentity"` column (AD-13; `tezg/regulated-select` guards it).
- **Seller kinds and review target (S-FR-IDN-6):**
  - Both are projections of the facts and make zero writes, with no cache.
  - `getSellerKinds`: one row per known id, in input order. Duplicates collapse, and an empty list returns `[]` without a query. `verified` = `isVerifiedBusiness`.
  - `getReviewTarget`: returns `{ kind: sellerKind, verified }`. An unknown id gives `{ kind: 'none', verified: false }`.
- **Contact card (P-IDN.contact):**
  - Selects `"displayName"` and `"contactPhoneE164"` from `"IndividualSellerProfile"` by `"userId"`, in identity infra only.
  - With no profile it raises `IndividualSellerProfileIncomplete` (409).
  - It never logs or audits the phone.
- **Names (P-IDN.names):** one statement, `COALESCE(profile."displayName", "User".name)`, one row per known id in input order. It never selects the email or the phone.
- Wire `access.traceCapabilities` (admin builder) in `composition.ts` and add an HTTP case to `composition.test.ts`.

**Ask First:**
- A business's display name taken from its application's `businessName`. This story uses `"User".name`, because the business name is a VER-reviewed field.
- A per-line es-CO text in the trace: `CapabilityTraceLine` has no text field, and page 1.3 (Impl-2) renders each line.
- Any DTO change.
- A guard on more than 500 ids: the caller's parser bounds the list, and identity cannot raise the kernel's `RequestValidationFailed`.

**Never:** reading `"BusinessApplicationLegalIdentity"`; a cache; changing the bound tests or the DTOs; SQL `now()`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Trace a Rejected business | Andrés, Rejected | 6 lines in order, each `derivedFrom ≥ 1`; `canListAsBusiness: false` | N/A |
| Trace writes | Camila | one `CapabilityAuditRead`, one `identity.capabilities.traced` row with `actorKind: 'admin'` | N/A |
| Unknown target | `nobody` | — | `AccountNotFound` 404; zero rows |
| Legal identity present | Approved, with a NIT row | the JSON has no NIT and no document key | N/A |
| Trace = getCapabilities | Approved business | line values equal `getCapabilities().capabilities` | N/A |
| Approval, no cache | Pending, then a direct SQL approve | `verified: false`, then `true` | N/A |
| Plain user as review target | Camila | `{ kind: 'none', verified: false }` | N/A |
| Contact card | Valentina, individual | `+573001234567`; no audit row holds it | N/A |
| No profile | a business id | — | `IndividualSellerProfileIncomplete` 409 |
| 500 names | 500 plain users | 500 rows; no `@tezg.test`, no `+57` | N/A |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/idn.v2.ts` -- the five methods; the audit and decision patterns of `completeIndividualProfile`
- `src/modules/identity/domain/idn.ts` -- `deriveCapabilities`, `CAPABILITY_NAMES`
- `src/modules/identity/ports/idn.v2.ts` + `infra/pg.ts` -- `readCapabilityFactsMany`, `insertCapabilityAuditRead`, `readContactCard`, `readDisplayNames`
- `src/server/composition.ts` + `composition.test.ts` -- `resolvers()` and the HTTP proof
- `docs/solu-2/planning/detailed-design/contracts.md` §13 -- stored-only rows
- `docs/solu-2/test/atdd/idn_contracts.test.ts` -- the 9 bound tests

## Tasks & Acceptance

**Execution:**
- [x] `contracts.md` §13 -- add `CapabilitiesTraced` (stored only, identity) and regenerate -- AD-SYS-1 rule 6
- [x] `ports/idn.v2.ts` + `infra/pg.ts` -- `readCapabilityFactsMany` (with `readCapabilityFacts` built on it), `insertCapabilityAuditRead`, `readContactCard`, `readDisplayNames` -- one fact reader; regulated columns stay in identity infra
- [x] `application/idn.v2.ts` -- `traceCapabilities`, `getSellerKinds`, `getReviewTarget`, `getContactCard`, `getDisplayNames`
- [x] `application/idn.v2.test.ts` -- unit cases for input order with duplicates, the empty list, an unknown id in `getReviewTarget`, and the contact card's refusal
- [x] `composition.ts` + `composition.test.ts` -- wire `access.traceCapabilities`; one HTTP case as an admin -- decision #24

**Acceptance Criteria:**
- Given the bound tests, when `npx vitest run --project solu2-atdd docs/solu-2/test/atdd/idn_contracts.test.ts` runs, then all 9 tests of Story 2.5 pass and the file has no red test left.
- Given an unknown target, when an admin traces it, then `AccountNotFound` (404) and zero rows in `"CapabilityAuditRead"` and `audit_events`.
- Given Story 2.5 marked `done`, when `npm run test:ci` runs, then every gate stays green.

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors (the regulated selects stay in identity infra)
- `npm run test:unit` -- expected: all pass
- `npm run test:ci` -- expected: exit 0

## Implementation Notes

- Code review is batched with Story 2.4 at the close of Epic 2 (decision #22).
- `CapabilitiesTraced` has a fixed text with no placeholder: the messages test does not list `capabilityCount` as an allowed input, and the count is always 6.
- The trace reads the facts before the clock, so a refused trace never reads it. The audit row's `data` holds `sellerKind` only.
- `getSellerKinds` and `getDisplayNames` dedupe with a `Set` and keep input order. The repository returns maps, and an empty list returns before any transaction.
- `getContactCard` cites `{ rule: 'AD-SYS-8 rule 3', inputs: { individualProfile: false } }` (the AD that P-IDN.contact binds; the code review replaced `P-IDN.contact`, which fails the §0.3 rule format), using the fact name of `deriveCapabilities`. The phone never enters a citation or an audit row.
- Unit tests: 8 new cases in `src/modules/identity/application/idn.v2.test.ts` (18 in total). There are also 3 HTTP cases in `src/server/composition.test.ts`: non-admin 403, admin 200, unknown target 404. The ATDD file is 24/24 green.

### Review Findings

Epic 2 close review (2026-10-25, decision #22): Blind Hunter, Edge Case Hunter and Acceptance Auditor over `af97624..9701f19`.

- [x] [Review][Patch] The contact card's refusal cites `P-IDN.contact`, which fails the §0.3 rule format; the contract binds AD-SYS-8 rule 3 [src/modules/identity/application/idn.v2.ts:268]
- [x] [Review][Patch] No test proves the AC "unknown target → zero rows in `CapabilityAuditRead` and `audit_events`"; the non-admin HTTP case counts `CapabilityAuditRead` only [src/modules/identity/application/idn.v2.test.ts, src/server/composition.test.ts]
- [x] [Review][Defer] `PgAuditLog.record` stamps `createdAt` with its own clock read, so a trace reads the clock twice [src/shared-kernel/infra/pg-audit.ts:18] — deferred, pre-existing: shared with Story 2.1; the fix passes the instant through the `AuditLog` port
- [x] [Review][Defer] IDN-3 Q4's per-line es-CO text is not built [src/modules/identity/application/idn.v2.ts:152] — deferred: `CapabilityTraceLine` has no text field; page 1.3 (Impl-2) renders each line (spec Ask First)
- [x] [Review][Defer] `IndividualSellerProfileIncomplete` from the contact card carries the seller's text "Completa tu perfil de vendedor para publicar." [src/modules/identity/application/idn.v2.ts:268] — deferred: the listings contact story calls it only for an individual listing's seller and owns the buyer-facing refusal
- [x] [Review][Defer] A `"User"` row deleted between the trace's fact read and its insert surfaces as an FK violation (500), not `AccountNotFound` [src/modules/identity/application/idn.v2.ts:159] — deferred: no flow deletes a `"User"` row today
