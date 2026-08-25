# Persona Archetypes

Spec-authored companion to `SPEC.md`. Deepens `stakeholders.md`'s per-actor goals matrix into concrete archetypes: who they are, what frustrates them today, and which capabilities matter most to them. Sources: `stakeholders.md`, `docs/Problem-statement.pdf`, and the Product Brief's (`../../A-Product-Brief/project-brief.md`) primary-archetype framing.

## The Release-Driven Collector (primary archetype)

Browses weekly around new-set releases, logs purchases monthly. Currently stitches together eBay (buying), PriceCharting (price sanity-check), and Collectr (collection logging) by hand for every card, and eats months-long international shipping and import fees running up to ~20% of card value because no formal local marketplace exists.

- **Goals:** reliable catalog/price/availability information; a virtual binder that mirrors how they already think about their collection; a wishlist to plan the next purchase.
- **Frustrations:** manual reconciliation across three disconnected tools; foreign price references that don't reflect the Colombian market; slow, informal WhatsApp/Telegram-only seller discovery.
- **Primary capabilities:** CAP-1 (browse/filter), CAP-3 (three distinct price values), CAP-8–CAP-13 (collection, binder, wishlist), CAP-24 (link-added binder entries for cards not yet in the catalog).

## The Casual Buyer

Browsing more than collecting — comparing listings, checking market context, wanting a low-friction way to reach a seller without commitment. Often the same person as an individual seller on a different day (per the Product Brief's "graduate" framing, not two disjoint populations).

- **Goals:** quickly compare listing price against last-transaction/historical reference; a fast, no-signup-heavy way to contact a seller.
- **Frustrations:** no way today to tell a fair asking price from an inflated one without leaving the platform to check a foreign price tracker.
- **Primary capabilities:** CAP-1, CAP-3, CAP-6 (external contact-message generation), CAP-17/CAP-20/CAP-22 (business purchase + confirmation, when buying from a verified business).

## The Individual Seller

A collector who occasionally sells — trading up, thinning a collection, or flipping a pulled card — without wanting a formal storefront or business paperwork. Sells complete off-platform (external handoff); the platform's job ends at discovery and contact.

- **Goals:** list a card/bundle/sealed product quickly after a lightweight one-time profile step; be discoverable by location for in-person pickup; optionally trade instead of sell outright.
- **Frustrations:** existing informal groups (WhatsApp/Telegram) have no search, no structure, and no way to signal trade-openness distinctly from a straight sale.
- **Primary capabilities:** CAP-4, CAP-19 (profile-step gate), CAP-6 (contact handoff), CAP-25/CAP-26 (trade offer + mutual completion), CAP-1's location/pickup annotation.

## The Verified Business / Specialized Store

A solo seller-as-business or a small shop (per the Product Brief's B2B profile) seeking visibility, credibility, and a real distribution channel beyond informal social selling.

- **Goals:** a professional, verified profile; in-platform purchase and messaging so buyers can transact with confidence; predictable commission economics without a payment-gateway integration.
- **Frustrations:** no credibility signal distinguishing a real shop from an anonymous social-media seller; today's informal channels can't process a purchase end-to-end.
- **Primary capabilities:** CAP-15 (application review), CAP-17/CAP-20/CAP-22 (in-platform purchase, 3-state confirmation), CAP-18 (in-app messaging), CAP-21 (commission balance gating).

## The Platform Administrator

Reviews business applications and is the platform's only lever against unreliable or policy-violating content, per `stakeholders.md`'s "maintain marketplace/catalog reliability and integrity."

- **Goals:** approve/reject business applications with confidence in the submitted legal-identity/external-presence evidence; remove a policy-violating listing or review without destroying the audit trail.
- **Frustrations (pre-remediation):** the original spec left moderation as an implied stakeholder responsibility with no actual capability behind it — closed in this remediation pass (CAP-28).
- **Primary capabilities:** CAP-15 (business application review), CAP-28 (listing/review moderation).

## The Pokémon TCG Community (non-transactional)

Values the platform as a structured information source — catalog, prices, sets, collecting trends — even without ever listing, buying, or trading. Not a distinct account type, but a usage mode every other archetype can be in.

- **Goals:** a centralized, trustworthy reference that doesn't require a foreign site or an off-platform spreadsheet.
- **Primary capabilities:** CAP-1, CAP-2, CAP-3 — read-only catalog/price value, no transactional capability required.
