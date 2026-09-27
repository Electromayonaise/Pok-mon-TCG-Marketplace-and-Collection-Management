---
design_intent: D
design_status: specified
module: MSG
annex_scenario: 1
---

# MSG-S1: Camila Writes to Juan P. on WhatsApp With a Message TEZG Prepared

**Project:** TEZG — Pokémon TCG Marketplace and Collection Management Platform
**Created:** 2026-09-27
**Method:** Whiteport Design Studio (WDS)
**Realizes:** [prd.md](../../../planning/prd.md) FR-MSG-1, FR-MSG-2, FR-MSG-3 (Annex scenario MSG-1, Contact an Individual Seller); NFR-MSG-1, NFR-MSG-3; continues ORD-S3

---

## Transaction (Q1)

**What this scenario covers:**
- A buyer gets a ready-to-send message for an individual seller's listing, plus a link that opens it in WhatsApp, and a copy action for any other app.
- TEZG makes no request to WhatsApp. The seller's phone travels only inside the link, and only to a signed-in buyer with a verified email.
- The same listing always produces the same text, with the price in COP and names intact.

---

## Business Goal (Q2)

**Goal:** CAP-6, contact with individual sellers without an in-app chat and without exposing their phone to scrapers (PRD §17).
**Objective:**
- The text contains the exact product name and the price as "$88.000 COP"; the link decodes back to the text byte for byte (FR-MSG-1 acceptance).
- 0 outbound calls to external messaging services (NFR-MSG-3).
- Generation p95 ≤ 200 ms (NFR-MSG-1).

---

## User & Situation (Q3)

**Persona:** Camila, buyer in Medellín (Laureles), searching within 15 km.
**Situation:** 11 oct 2026, 8:05 p. m. On 2.2 for Pikachu ex, Juan P., an individual seller 12,4 km away, lists one LP copy for $88.000 (ORD-S3). His row offers "Contactar al vendedor" instead of "Comprar". Her email is verified.

---

## Driving Forces (Q4)

**Hope:** Ask about the card in one tap, in the app she already uses, without typing the details.
**Worry:** Sending a message with the wrong price or a garbled card name; handing her number to a stranger for nothing.

---

## Device & Starting Point (Q5 + Q6)

**Device:** Her phone (R), with WhatsApp installed.
**Entry:** 2.2 → Juan P.'s row → "Contactar al vendedor" (the same action exists on 3.1 rows).

---

## Best Outcome (Q7)

**User Success:**
- 12.1 opens with the preview: "¡Hola, Juan P.! Vi tu Pikachu ex (LP) en TEZG por $88.000 COP. ¿Todavía está disponible?"
- A line under it says what happens next: "Se abrirá WhatsApp con este mensaje. Puedes editarlo allí antes de enviarlo."
- "Abrir WhatsApp" opens the chat with Juan P. and the text already typed. The page stays open behind it.
- "Copiar mensaje" copies the same text; the live region says "Copiado".

**Business Success:**
- One call to `listings.generateContactMessage({ kind: 'purchase', listingId, requesterId })`; one `ContactRequestCounter` increment for Camila, for Camila → Juan P. and for her IP.
- The phone number is not printed on the page, is not in any log line and is not in any Decision citation (FR-MSG-3).

---

## Shortest Path (Q8)

1. **Card Detail (2.2)** — Juan P.'s row, "Contactar al vendedor".
2. **Contact Seller Composer (12.1)** — "Abrir WhatsApp". ✓

---

## Trigger Map Connections

**Persona:** Camila

**Driving Forces Addressed:**
- ✅ **Want:** A correct message ready to send, in her own app.
- ❌ **Fear:** A wrong or garbled message; an exposed number.

**Business Goal:** FR-MSG-1/2/3; NFR-MSG-1, NFR-MSG-3.

---

## Scenario Steps

| Step | Folder | Purpose | Exit Action |
|------|--------|---------|-------------|
| MSG-S1.1 | [`../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/`](../02-cat-catalog-price-reference/2.2-card-detail-price-provenance/2.2-card-detail-price-provenance.md) | An individual seller's row offers contact | "Contactar al vendedor" |
| MSG-S1.2 | [`12.1-contact-seller-composer/`](12.1-contact-seller-composer/12.1-contact-seller-composer.md) | Preview the message; open WhatsApp or copy | Scenario success ✓ |
| MSG-S1.3 | [`12.3-messaging-api-explorer/`](12.3-messaging-api-explorer/12.3-messaging-api-explorer.md) | Developer proof: round trip, determinism, 0 external calls | — |

**First step** (MSG-S1.1) includes full entry context (Q3 + Q4 + Q5 + Q6).

**Refusals on 12.1 (the banner replaces the composer):**
- **Not signed in.** `NotAuthenticated`: "Inicia sesión para continuar. Te traeremos de vuelta a esta página." After sign-in she lands back on 12.1 for the same listing.
- **Email not verified.** `EmailNotVerified` with "Reenviar enlace". No text and no link are generated, so the phone is never sent to an unverified account.
- **Too many contacts.** Her 31st contact in an hour gets `ContactRateLimited`: "Enviaste muchos mensajes de contacto seguidos. Podrás contactar a más vendedores a las 9:05 p. m." Her 11th contact with Juan P. in a day gets the per-seller variant, which cites the day.
- **The listing is gone** (sold, withdrawn or hidden since 2.2 loaded). `ListingNotFound`: "Esta publicación ya no está disponible." with "Buscar otra publicación de esta carta".
- **A shop's listing** (a stale or hand-edited link). `NotIndividualSellerListing`: "Esta carta la vende una tienda: puedes comprarla aquí mismo o escribirle dentro de TEZG." with "Comprar" and "Escribir a la tienda".

**Edge case (mandatory, NFR-MSG-4), in 12.3:**
- The fixture name "Pokémon Center Exclusivo — Pikachu & Zekrom GX (Niñez) ⚡🔥" keeps its ñ, accents, ampersand and emoji in the preview and after decoding the link.
- The 500-character name is shortened with "…" in the WhatsApp text only, at a grapheme boundary. The link stays ≤ 2.000 characters and keeps the full price. 12.1 then shows the note "El mensaje para WhatsApp acorta el nombre de la carta. «Copiar mensaje» copia el texto completo.", because `copyText` is never shortened.
- A name that contains a web address is shown as plain text, never as a link.
