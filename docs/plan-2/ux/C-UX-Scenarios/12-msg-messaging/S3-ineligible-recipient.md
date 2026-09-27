---
design_intent: D
design_status: specified
module: MSG
annex_scenario: 3
---

# MSG-S3: A Pending Shop Can Be Messaged With a Notice, a Rejected One Cannot, and a Message Composed Across the Rejection Is Not Lost

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-27
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-MSG-4, FR-MSG-6, FR-MSG-7, FR-IDN-6 (`getMessagingEligibility`) (Annex scenario MSG-3, Ineligible Recipient); NFR-MSG-4 (the compose→send race); UJ-3 step 4; A-8

---

## Transaction (Q1)

**What this scenario covers:**
- Eligibility comes from `identity.getMessagingEligibility` at send time: Approved → allowed; Pending → allowed with the notice "Esta tienda aún no ha sido verificada por TEZG."; anything else → `NotBusinessAccount`.
- A shop that becomes Rejected while a buyer is typing: the send fails, no message row is created and the typed text comes back.
- A thread with a Rejected shop stays readable but takes no new messages.
- Each message keeps the recipient's state at send time, so a notice shown once is never removed later.

---

## Business Goal (Q2)

**Goal:** AD-11 (Plan-2 decision): in-app messages only with shops TEZG has approved or is reviewing, and always say which.
**Objective:**
- Messaging an individual seller's account fails with `NotBusinessAccount`; messaging a Pending shop succeeds with the notice (FR-MSG-4 acceptance).
- Flipping the recipient from Pending to Rejected between compose and send yields `NotBusinessAccount` and 0 message rows, 100/100 times (FR-MSG-6, NFR-MSG-4).

---

## User & Situation (Q3)

**Personas:** Camila, buyer in Medellín; Andrés, owner of Tienda Andrés; Sebastián, admin (only as the cause of the rejection).
**Situation:** 1 oct 2026. Andrés applied on 30 sep and is Pending, so his listings show without the badge and cannot be bought (FR-INV-7). At 10:00 a. m. Sebastián rejects the application with `DataMismatch` (VER-S3).
- **8:10 a. m.** On 2.2, the Tienda Andrés row reads "Aún no se puede comprar: Tienda Andrés está en proceso de verificación." with "Escribir a la tienda". Camila taps it.
- **8:42 a. m.** Andrés replies.
- **9:57 a. m.** Camila starts a second message. She taps "Enviar" at 10:01 a. m., one minute after the rejection.

---

## Driving Forces (Q4)

**Hope (Camila):** Ask a new shop a question without being misled about who they are.
**Worry (Camila):** Trusting an unverified shop by mistake; losing what she typed.
**Hope (Andrés):** Answer buyers while the review is in progress.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on her phone (R); Andrés on desktop (R).
**Entry:** 2.2 → "Escribir a la tienda" → 12.2 (no thread for the pair yet, so the composer opens as a new conversation).

---

## Best Outcome (Q7)

**User Success:**
- **8:10 a. m., compose.** Above the composer, a notice banner reads "Esta tienda aún no ha sido verificada por TEZG." Camila writes "Hola, ¿tienen sobres de Surging Sparks?" and sends. Her message carries the notice line.
- **8:42 a. m., Andrés.** He sees the same notice on every message, addressed to him: "Su tienda aún no ha sido verificada: los compradores ven este aviso en sus mensajes." His reply "Sí, nos llegan el viernes." carries the notice line on Camila's side (UJ-3 step 4).
- **10:01 a. m., the race.** Camila's send fails. The banner reads "No enviamos tu mensaje porque Tienda Andrés ya no está disponible para mensajes en TEZG. Guardamos tu texto abajo para que lo copies." Her text is shown in a read-only block with "Copiar texto". The composer is replaced by the read-only footer: "Esta conversación es de solo lectura porque la tienda ya no está disponible para mensajes."
- **The earlier messages** stay readable, each with its notice line.

**Business Success:**
- 2 message rows with `recipientVerificationAtSend = Pending`; 0 rows for the 10:01 a. m. attempt.
- The refusal cites the state change (Pending → Rejected) and carries the composed text back in the error.

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — the Pending shop's row, "Escribir a la tienda".
2. **Inbox & Thread (12.2)** — send with the notice; the reply arrives with the notice.
3. **Inbox & Thread (12.2)** — the send after the rejection fails; the text is kept; the thread becomes read-only. ✓
4. **Messaging API Explorer (12.3)** — the race ×100 and the eligibility matrix.

---

## Trigger Map Connections

**Personas:** Camila; Andrés

**Driving Forces Addressed:**
- ✅ **Want:** A way to talk to a shop under review, with its status stated on every message.
- ❌ **Fear:** Being misled about verification; losing the typed text.

**Business Goal:** AD-11; FR-MSG-4, FR-MSG-6; NFR-MSG-4.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| MSG-S3.1 | [`12.2-inbox-thread/`](12.2-inbox-thread/12.2-inbox-thread.md) | New conversation with a Pending shop; the notice in the composer and on every message | "Enviar" |
| MSG-S3.2 | [`12.2-inbox-thread/`](12.2-inbox-thread/12.2-inbox-thread.md) | The send after the rejection fails; text kept; read-only thread | "Copiar texto" |
| MSG-S3.3 | [`12.3-messaging-api-explorer/`](12.3-messaging-api-explorer/12.3-messaging-api-explorer.md) | The compose→send race ×100 and the eligibility matrix | Scenario success ✓ |

**First step** (MSG-S3.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Individual seller (the ineligible case).** 2.2 never offers "Escribir a la tienda" on Juan P.'s row. A hand-edited link to start a conversation with him gets `NotBusinessAccount`: "Los mensajes dentro de TEZG son solo para tiendas. Para vendedores individuales, usa «Contactar al vendedor»." With the listing in context, the action "Contactar al vendedor" opens 12.1 (MSG-S1).

**The shop is approved later.** Andrés reapplies on 8 oct at 10:05 a. m. (Pending again) and is approved at 11:34 a. m. (VER-S2). While he is Pending, the thread takes messages again with the notice. From his approval on, new messages have no notice. The 1 oct messages keep theirs (MSG-S2). [ASSUMPTION: eligibility follows the shop's latest application, so a reapplication reopens the thread; the read-only copy says "ya no está disponible", which is true while the rejection stands. Logged in `review-ux-edge-cases.md`.]

**Pending → Approved during compose.** The message is sent, with no notice, and the composer's notice banner disappears on the response.

**Approved → Pending.** This cannot happen, because verification has no revocation (PRD §5). The server treats it as an invariant breach and logs it. The UI sends the message with the notice, as for any Pending shop; 12.3 shows the logged breach.
