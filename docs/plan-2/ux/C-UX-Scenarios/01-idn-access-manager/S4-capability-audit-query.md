---
design_intent: D
design_status: specified
module: IDN
annex_scenario: 4
---

# IDN-S4: Sebastián Asks "What Can This Account Do, and Why?"

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-26
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-IDN-5, FR-IDN-7, FR-ORD-10 (Annex scenario IDN-4, Capability Audit Query)

---

## Transaction (Q1)

**What this scenario covers:**
A support question comes in: "Why can't I publish?" Sebastián looks up the account and reads a per-capability trace that names the facts behind each answer. His read is itself audited.

---

## Business Goal (Q2)

**Goal:** PRD §1, "defensively specified", applied to support, plus UJ-4 (Sebastián runs the platform for a day).
**Objective:** Support answers come from the same derivation the product uses, never from guesswork. Every trace read writes a `CapabilityAuditRead` row (NFR-SYS-8).

---

## User & Situation (Q3)

**Persona:** Sebastián, Platform Admin.
**Situation:** A Bogotá shop owner whose application was rejected writes to support: "No puedo publicar y no entiendo por qué." Sebastián has the account email.

---

## Driving Forces (Q4)

**Hope:** Answer in one look, with the exact reapply date.

**Worry:** Accidentally seeing, or exposing, the applicant's legal-identity data while doing support.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Desktop (D), `/admin/cuentas`.
**Entry:** Admin rail → Cuentas; he searches by email.

---

## Best Outcome (Q7)

**User Success:**
One line per capability, for example: "No puede publicar como tienda — la última solicitud está Rechazada (Los datos no coinciden con los documentos), puede volver a solicitar desde el 8 oct 2026, 10:00 a. m." No legal-identity values appear anywhere.

**Business Success:**
The trace matches FR-IDN-1 exactly, and an audit row `{adminId, action: CapabilityAuditRead, targetId, at}` exists. When needed, the same inspector's audited order lookup (FR-ORD-10) answers order-status questions read-only.

---

## Shortest Path (Q8)

1. **Account Capability Inspector (1.3)** — search by email → select the account → the trace renders with an "Esta consulta queda registrada" note. ✓

---

## Trigger Map Connections

**Persona:** Sebastián — Platform Admin

**Driving Forces Addressed:**
- ✅ **Want:** Fast, exact support answers.
- ❌ **Fear:** Regulated-data exposure (AD-13, Ley 1581).

**Business Goal:** Explained-decision coverage; admin audit trail (NFR-SYS-8).

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| IDN-S4.1 | [`1.3-account-capability-inspector/`](1.3-account-capability-inspector/1.3-account-capability-inspector.md) | Look up the account and read the trace | Scenario success: support answer given ✓ |

**First step** (IDN-S4.1) includes full entry context (Q3 + Q4 + Q5 + Q6).
**H mirror:** 1.1's `traceCapabilities` call over fixtures reproduces the same trace for tests.
