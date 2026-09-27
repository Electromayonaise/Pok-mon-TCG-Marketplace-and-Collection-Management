---
design_intent: D
design_status: specified
module: MSG
annex_scenario: 2
---

# MSG-S2: Camila Asks Tienda Andrés About the Charizard, and Both Unread Counts Stay Right

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-27
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-MSG-5, FR-MSG-7 (Annex scenario MSG-2, In-App Message to a Verified Business); FR-MSG-4; FR-MSG-8 (mute variant); NFR-MSG-2; precedes ORD-S1

---

## Transaction (Q1)

**What this scenario covers:**
- A buyer writes to a verified shop inside TEZG. The conversation is unique per buyer–shop pair, so a new message joins the existing thread.
- Each side's unread count is the number of the other side's messages after their read marker. Opening the thread moves the marker forward; it never moves back.
- Freshness comes from polling every 30 s. There are no push or email notifications.

---

## Business Goal (Q2)

**Goal:** CAP-18, a contact channel with shops that TEZG can vouch for (PRD §17).
**Objective:**
- A sent message is visible to the shop on its next poll, ≤ 35 s at p95 (NFR-MSG-2).
- Unread counts are correct after interleaved sends from both sides; opening the thread sets the reader's count to 0 (FR-MSG-7 acceptance).
- Send p95 ≤ 500 ms.

---

## User & Situation (Q3)

**Personas:** Camila, buyer in Medellín; Andrés, owner of Tienda Andrés (verified since 8 oct 2026, 11:34 a. m., VER-S2).
**Situation:** 12 oct 2026, 9:12 a. m. Before buying the Charizard ex NM for $180.000 (ORD-S1, 4:20 p. m. the same day), Camila wants to know whether the card has whitening on the back. Her thread with Tienda Andrés already exists: it holds the 1 oct exchange from MSG-S3, when the shop was still Pending.

---

## Driving Forces (Q4)

**Hope (Camila):** A quick answer from the shop itself, kept next to the purchase.
**Worry (Camila):** Writing into a void; not noticing the reply.
**Hope (Andrés):** See new buyer questions without refreshing all day.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Camila on her phone (R). Andrés on the shop's desktop (R, ≥1024 px two-pane layout).
**Entry:**
- Camila: 2.2 → Tienda Andrés's row → "Escribir a la tienda" → 12.2 opens her existing thread with the composer focused.
- Andrés: Actividad → Mensajes (12.2).

---

## Best Outcome (Q7)

**User Success:**
- **9:12 a. m., Camila.** She writes "Hola, ¿la Charizard ex tiene marcas blancas en el reverso?" and taps "Enviar". The message appears on the right with "Enviado · 9:12 a. m.". There is no "not yet verified" notice: the shop is verified, and the header shows the "tienda verificada" badge.
- **Earlier messages.** The 1 oct messages further up keep their notice line "Esta tienda aún no ha sido verificada por TEZG.", because each message keeps the state it was sent under.
- **Andrés.** Within 30 s his Mensajes tab shows "1" with the accent dot, and the row shows Camila's name, the first line of the message and "9:12 a. m.". He opens it; his count drops to 0. At 9:40 a. m. he replies: "Buenos días. No, está impecable; le puedo enviar fotos por aquí mismo si quiere." (attachments are out of scope, so he describes it instead.)
- **10:05 a. m., Camila.** Her Actividad → Mensajes tab shows "1". She opens the thread and her count drops to 0.

**Business Success:**
- One conversation for the pair; 2 new messages with `recipientVerificationAtSend = Approved`.
- Camila's `lastReadMessageId` moves from her 1 oct marker to Andrés's 9:40 a. m. message. Andrés's marker moves to Camila's 9:12 a. m. message.

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — "Escribir a la tienda".
2. **Inbox & Thread (12.2)** — Camila sends.
3. **Inbox & Thread (12.2)** — Andrés sees the unread count, opens it and replies.
4. **Inbox & Thread (12.2)** — Camila reads the reply; both counts are 0. ✓

---

## Trigger Map Connections

**Personas:** Camila; Andrés

**Driving Forces Addressed:**
- ✅ **Want:** A direct question to a verified shop, with the reply easy to notice.
- ❌ **Fear:** Silent threads; counts that lie.

**Business Goal:** FR-MSG-5, FR-MSG-7; NFR-MSG-2.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| MSG-S2.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | A shop's row offers in-app messaging | "Escribir a la tienda" |
| MSG-S2.2 | [`12.2-inbox-thread/`](12.2-inbox-thread/12.2-inbox-thread.md) | Send; the shop's inbox and unread count; the reply; read state | Scenario success ✓ |
| MSG-S2.3 | [`12.3-messaging-api-explorer/`](12.3-messaging-api-explorer/12.3-messaging-api-explorer.md) | Developer proof: interleaved sends and unread counts | — |

**First step** (MSG-S2.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Andrés cannot start threads.** His inbox has no "new message" action. A direct call to start a conversation with a buyer gets `BusinessCannotInitiate`: "Las tiendas solo pueden responder conversaciones que inicie un comprador." (shown in 12.3).

**Interleaving:** if Andrés sends two replies at 9:40 and 9:41 a. m. while Camila has the thread open, her next poll shows both and her count stays 0. If she had closed the thread before 9:40, her count would read "2".

**Email not verified:** a buyer who never confirmed their email gets `EmailNotVerified` when starting a conversation, and the typed text stays in the composer.

**Someone else's thread:** a deep link to a conversation the caller is not part of gets the Not-available page: "No encontramos esta conversación en tu cuenta." with "Ver mensajes". Admins get the same page: message bodies are not visible to admins (FR-MSG-7 [ASSUMPTION A-38]).

**Mute (variant, FR-MSG-8):** after the purchase, Camila no longer needs the thread. She opens ⋯ → "Silenciar conversación"; the live region says "Silenciaste esta conversación." and the thread moves to "Silenciadas". A later reply from the shop raises that thread's own unread count, but her Mensajes badge stays at 0. Andrés sees nothing different. "Dejar de silenciar" returns the thread to "Todas", and its unread messages count in the badge again.
