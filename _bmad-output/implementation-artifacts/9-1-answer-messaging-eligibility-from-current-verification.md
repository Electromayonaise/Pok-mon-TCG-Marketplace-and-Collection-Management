---
title: 'Story 9.1: Answer messaging eligibility from current verification'
type: 'feature'
created: '2026-10-30'
status: 'done'
baseline_commit: '787392b'
review_loop_iteration: 0
flow: 'epic-batched (decision log Impl-1 #22): bmad-quick-dev, ATDD tests as the spec, one code review per epic'
context:
  - '{project-root}/_bmad-output/planning-artifacts/epics.md'
  - '{project-root}/_bmad-output/planning-artifacts/detailed-design/contracts.md'
  - '{project-root}/_bmad-output/planning-artifacts/ARCHITECTURE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `VerServiceV2.requireMessagingEligibility` throws `NotImplementedError`, so `[MSG-3.Q1]` and `[MSG-3.QF1]` are red and MSG-1 (Story 9.2) has no recipient check.

**Approach:** MSG-3 as written in contracts.md §9: one `deriveCapabilities(facts)` read of the business's current verification, no cache (AD-IDN-1 rule 4, AD-MSG-2 rule 2), on the ambient transaction when one is open (AD-SYS-4 rule 9), as `getBusinessPaymentInstructions` does.

## Boundaries & Constraints

**Always:**
- `Approved` → `{ status: 'Approved', verified: true }`, decision `allowed`; `Pending` → `{ status: 'Pending', verified: false }`, decision `allowedWithNotice` with `RecipientNotYetVerified`. Both cite `{ rule: 'FR-IDN-6', inputs: { businessId, status } }`.
- Any other state (Rejected, individual seller, buyer, unknown id) → `NotBusinessAccount` (409, identity), citing `{ status }` with no id, so an unknown id and an individual seller give byte-identical bodies.
- Zero writes, no event, no audit (Q2, Q3).
- **D3 (approved):** inside an ambient transaction, the latest application row is read `FOR SHARE`, so a rejection cannot commit between the send's read and its commit; outside one, a plain read-only transaction.
- An observed `Approved → Pending` cannot be detected from one read (VER has no such transition); I2 is satisfied by answering the current status. No breach log in this story.
- §13 gains a stored-only `MessagingEligible` row for the `allowed` decision code (if the explanation needs a code).

**Ask First:** a DTO change; a write of any kind.

**Never:** a cache; a read of a messaging table.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Approved | latest application Approved | verified, allowed | N/A |
| Pending | latest application Pending | notice `RecipientNotYetVerified` | N/A |
| Rejected / individual / unknown | — | identical bodies | `NotBusinessAccount` 409 |

</frozen-after-approval>

## Code Map

- `src/modules/identity/application/ver.v2.ts` -- `requireMessagingEligibility`
- `src/modules/identity/domain/ver.ts` -- pure `messagingEligibility(status)` mapping
- `src/modules/identity/ports/ver.v2.ts`, `infra/pg.ts` -- `readVerificationForMessaging(tx, businessId, { lock })`
- `_bmad-output/planning-artifacts/detailed-design/contracts.md` §13 -- stored-only rows

## Tasks & Acceptance

**Execution:**
- [x] domain mapping + src domain test (every status)
- [x] repository read + service; a src test that the call completes inside an open transaction on a pool of 1
- [x] `sprint-status.yaml` -- 9.1 `done`; `gen:trace:solu2`

**Acceptance Criteria:**
- Given 9.1 `done`, when `[MSG-3.Q1]` and `[MSG-3.QF1]` run, then they pass and every other MSG test stays red for NotImplemented.

## Verification

- `npx vitest run --project solu2-atdd _bmad-output/test-artifacts/atdd/msg_contracts.test.ts -t "MSG-3.Q"` -- expected: pass

## Implementation Notes

- Code review is batched with the rest of Epic 9 at its close (decision #22). Martín approved the five Epic 9 specs together, with every recommendation (decision log Impl-1 #34).
- The status comes from `readCapabilityFacts` and `deriveCapabilities(facts).verification`; `domain/ver.ts` `messagingEligibility` maps it. A refusal cites `{ status }` only (`'none'` for an individual seller, a buyer and an unknown id), so `[MSG-3.QF1]`'s two bodies match.
- **D3:** inside an ambient transaction, `lockLatestApplicationForShare` takes the latest application `FOR SHARE` before the facts read; outside one, a read-only transaction with no lock. A src test proves the read on a pool of 1 and that a concurrent rejection waits for the commit.
- §13 gains two stored-only rows: `MessagingEligible` (the `allowed` code) and `RecipientNotYetVerified` (a DecisionCode with no template until now).
