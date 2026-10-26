---
title: 'Story 3.1: Submit a business application with its legal identity'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_commit: '140bd6a1b6b03ae0a7a56b826bc4ec3b9c326ef8'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `submitApplication` throws `NotImplementedError`, so the 4 bound tests are red. A shop cannot apply for verification, and nothing writes `"BusinessApplication"`, its legal identity or `"BusinessProfile"`.

**Approach:** Build VER-2 as the contract orders it (AD-VER-3 rule 1). Documents are promoted before the transaction. Then one transaction claims the seller track, reads the latest application, runs P5–P7, and inserts the application, the legal identity and the profile. The claim reuses IDN-1's write, so a submit and a profile completion race on one `"User"` row lock. Wire `verification.submit` (decision #24).

## Boundaries & Constraints

**Always:**
- **Shape (P1–P2):**
  - P1: `MissingRequiredField` (400) names every missing field, comma-joined in `{fields}`. An empty `documentUploadKeys` counts as missing.
  - P2: a CC has 6–10 digits. A NIT is a 6–10 digit body plus the DIAN mod-11 check digit (ADD-§2.5, with its 7 vectors as unit tests). `consentVersion` equals `CURRENT_CONSENT_VERSION = 'privacy-v1'` in `domain/ver.ts`.
  - P2 raises the kernel's `RequestValidationFailed` with one issue per field. The `error-owner` rule forbids identity from raising a kernel code, so a new kernel helper `rejectRequest(issues)` (in `src/shared-kernel/`, through `raiserFor('shared-kernel')`) raises it.
- **Promotion (P3, AD-SYS-8 rules 5.3 and 6):** done before the transaction, one key at a time.
  - The key must start with `business-document/<businessId>/` and the object must exist, or cause `missing`.
  - Then size ≤ 5 MiB (`size`), the magic bytes of JPEG, PNG or PDF (`magic`), and `scanner.scan` (`scanner`).
  - Clean bytes (the sanitized ones when given) go to `ver-documents/<new cuid2>`. The quarantine object is deleted.
  - Refusals raise `InvalidDocumentFile` (400), citing `{ key, cause }`.
  - If the transaction fails, every promoted object is deleted, then the error is rethrown.
- **Transaction (Q2):** the clock is read once.
  - The claim calls IDN-1's claim at VER's `now`, so the claim refusals stay identical (P4; `[VER-2.I2]`).
  - Read the latest application. P5 `ApplicationAlreadyPending` cites `{submittedAt}`. P6 `AlreadyVerifiedBusiness`. P7 `ReapplicationBarred`, then `ReapplicationCooldownActive` while `now < reapplyNotBefore` (half-open), citing `{reapplyNotBefore}`, from the snapshot only.
  - `INSERT "BusinessApplication"` (Pending, consent snapshot, `submittedAt`/`createdAt`/`updatedAt` = now).
  - A unique violation (23505) on the partial Pending index maps to `ApplicationAlreadyPending` (I1).
  - `INSERT "BusinessApplicationLegalIdentity"` through the new `infra/legalIdentityRepository.ts` only. Never use `RETURNING` with its columns.
  - Upsert `"BusinessProfile"` (the payment instructions and public fields).
- **Audit and decision:** `audit('verification.application.submitted', BusinessApplication:id)`. The data holds ids and `reapplication` only, never the NIT. No event. The decision is `allowed` under a new stored-only §13 code `ApplicationSubmitted`, citing `FR-VER-1 {applicationId, reapplication}`.
- **Ports:** `VerRepository extends IdnRepository`. `PgVerRepository` (`infra/pg.ts`) and `PgLegalIdentityRepository` are added to `oneRepository(...)` in the test `wiring()` and in `compose()`.
- Wire `verification.submit` (authed) and add an HTTP case to `composition.test.ts`.

**Ask First:**
- A `qrUploadKey` promotion. The ATDD request sends `null`. A non-null key is refused as `RequestValidationFailed` (`paymentInstructions.qrUploadKey`) and `qrObjectKey` is stored `null`, because an unpromoted client key could name another account's object. Promoting it waits for the payment-QR upload.
- Any DTO or bound-test change.

**Never:** a regulated value in an error, a log line or an audit row; SQL `now()`; reading the current `"RejectionReason"` for P7.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh account | valid request, PDF in quarantine | Pending row, legal identity, profile, one audit row without the NIT, no event | N/A |
| Second submit | one Pending | — | `ApplicationAlreadyPending` 409 |
| Concurrent submits | two at once | exactly one Pending | the loser 409 (lock or 23505) |
| Racing a profile completion | 100 fresh accounts | one wins, never both | the IDN-1 refusal codes |
| No documents | `documentUploadKeys: []` | — | `MissingRequiredField` 400 |
| Key not in quarantine | foreign key | nothing written, `sellerTrack` null | `InvalidDocumentFile` 400, cause `missing` |
| Bad NIT check digit | `8001972685` | — | `RequestValidationFailed` 400 |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/ver.v2.ts` -- `submitApplication`, the promotion helper
- `src/modules/identity/application/idn.v2.ts` -- the private `claim` becomes callable at a given `now` (`claimAt`); behaviour unchanged
- `src/modules/identity/domain/ver.ts` -- the NIT and CC checks, `CURRENT_CONSENT_VERSION`, the P5–P7 rule
- `src/modules/identity/ports/ver.v2.ts` + `infra/pg.ts` + `infra/legalIdentityRepository.ts` (new) -- the VER repository
- `src/shared-kernel/` -- `rejectRequest`
- `test-support/solu2/fixtures.ts`, `src/server/composition.ts` + `.test.ts` -- wiring
- `_bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- `[VER-2.Q1]`, `[VER-2.I1]`, `[VER-2.P5]`, `[VER-2.I2]`

## Tasks & Acceptance

**Execution:**
- [x] `contracts.md` §13 -- add `ApplicationSubmitted` (stored only) and regenerate -- decision #16
- [x] `shared-kernel` -- `rejectRequest(issues)` and its unit test -- AD-SYS-1
- [x] `domain/ver.ts` -- NIT mod-11 (the 7 ADD vectors), CC, consent version, P5–P7 -- unit tests
- [x] ports + infra -- `VerRepository`, `PgVerRepository`, `legalIdentityRepository.insertLegalIdentity`; compose both wirings
- [x] `application/ver.v2.ts` -- promotion, then the transaction, then cleanup on failure; unit tests for cleanup and each cause
- [x] `composition.ts` + test -- `verification.submit`, one HTTP case

**Acceptance Criteria:**
- Given the 4 bound tests, when the VER ATDD file runs, then they pass.
- Given a transaction that fails after promotion, when the submit returns, then no `ver-documents` object it wrote remains.
- Given this story `done` and the next stories not yet, when the red gate runs, then the only unexpected greens are 3.3's `[VER-2.P1]`, `[VER-2.P3]` and `[VER-2.P7]`; Story 3.3 is committed after 3.2 and restores the gate (decision #27).

## Verification

**Commands:**
- `npm run lint` -- expected: 0 errors
- `npm run test:unit` -- expected: all pass
- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/ver_contracts.test.ts` -- expected: the 4 bound tests pass

## Implementation Notes

- Code review is batched with the rest of Epic 3 at its close (decision #22).
- Test data: the ATDD NIT `9001234563` has a wrong DIAN check digit, so it is corrected to `9001234568` in `ver_contracts.test.ts` and `ver_supporting.test.ts` (decision #27, Martín's choice).
- P2 names every bad field at once: `RequestValidationFailed` carries one citation per issue, and no issue repeats the submitted number.
- `I1`: `insertApplication` runs under the savepoint `ver_insert_application`; a 23505 rolls back to it and returns `false`, and the service re-reads the winner to cite its `submittedAt`.
- Quarantine objects are deleted only after the commit, so a refused submit can be retried with the same keys. Promoted copies are deleted when promotion or the transaction fails.
- IDN-1's claim is the public `claimAt(tx, {userId, track}, now)`, which VER reuses with its own clock read.
- The legal-identity insert sits in its own adapter, `infra/legalIdentityRepository.ts`, the one place Story 3.4's `tezg/legal-identity-confined` rule will allow.
- Production storage and scanner are unwired stand-ins until a provider is approved (`deferred-work.md`). Tests bind `InMemoryObjectStorage` and `SimulatedScanner`.
- Unit tests: `src/shared-kernel/request.test.ts`, `src/modules/identity/ver-domain.test.ts`, `src/modules/identity/application/ver.v2.test.ts` (14 cases), `src/server/trpc/errors.test.ts`, and two HTTP cases in `src/server/composition.test.ts`.
- Early greens until Story 3.3 is committed: `[VER-2.P1]`, `[VER-2.P3]`, `[VER-2.P7]`.
