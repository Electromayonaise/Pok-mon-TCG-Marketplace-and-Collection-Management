[
  {
    "location": "ARCHITECTURE.md:AD-14 Rule",
    "trigger_condition": "Business/buyer requests a signed URL before any comprobante has been uploaded",
    "guard_snippet": "if (!order.comprobanteObjectKey) return DomainError.ComprobanteNotYetUploaded;",
    "potential_consequence": "Endpoint mints a URL for a nonexistent object or throws an unhandled storage-layer error"
  },
  {
    "location": "ARCHITECTURE.md:AD-14 Rule",
    "trigger_condition": "Buyer re-uploads a replacement comprobante after an earlier upload failed/was retried (EXPERIENCE.md's upload states)",
    "guard_snippet": "on re-upload: overwrite same objectKey, or invalidate previously-minted URLs pointing at the old object",
    "potential_consequence": "A previously minted URL keeps serving a stale or now-deleted comprobante image"
  },
  {
    "location": "ARCHITECTURE.md:AD-14 Rule (5-15 min TTL)",
    "trigger_condition": "Download begins just before the signed URL's TTL boundary and finishes after it expires",
    "guard_snippet": "no defined behavior for expiry-mid-transfer; document as accepted or add a grace window",
    "potential_consequence": "Comprobante image request silently truncates or 403s mid-load for the viewer"
  },
  {
    "location": "ARCHITECTURE.md:AD-14 Rule (owner-of-listing check)",
    "trigger_condition": "The listing the Order references is later hidden/moderated (AD-12 hiddenAt) or reassigned after the Order was placed",
    "guard_snippet": "authorize against a snapshot of owning-business-at-order-time, not a live listing lookup",
    "potential_consequence": "Authorized business unexpectedly loses (or a new owner unexpectedly gains) URL-minting rights on an old Order"
  },
  {
    "location": "ARCHITECTURE.md:AD-14 Rule",
    "trigger_condition": "Caller is unauthorized (wrong buyer, wrong business, or AD-15 condition unmet)",
    "guard_snippet": "return a single consistent DomainError code regardless of which check failed",
    "potential_consequence": "Distinguishable error/404 responses let a caller enumerate valid Order IDs or comprobante existence"
  },
  {
    "location": "ARCHITECTURE.md:AD-14 (URL-minting endpoint)",
    "trigger_condition": "Same caller issues many rapid mint requests against different Order IDs",
    "guard_snippet": "rate-limit the minting endpoint per caller",
    "potential_consequence": "Endpoint usable to brute-force-enumerate Orders/comprobantes at scale"
  },
  {
    "location": "ARCHITECTURE.md:AD-15 Rule (buyerPaidConfirmedAt IS NOT NULL onward)",
    "trigger_condition": "Order never reaches buyerPaidConfirmedAt (abandoned before payment)",
    "guard_snippet": "no expiry/cleanup rule for permanently-unpaid Orders",
    "potential_consequence": "Unpaid Orders accumulate indefinitely with undefined long-term visibility/retention"
  },
  {
    "location": "ARCHITECTURE.md:AD-15 Rule",
    "trigger_condition": "Order reaches buyerItemReceivedConfirmedAt (fully closed) — no end boundary stated for business read access",
    "guard_snippet": "state explicitly whether business read access continues, or ends, after closure",
    "potential_consequence": "Ambiguous whether a closed Order's comprobante/detail stays readable to the business forever"
  },
  {
    "location": "ARCHITECTURE.md:AD-15 Rule (business incoming-orders query)",
    "trigger_condition": "Order.businessId is derived via the referenced listing rather than stored directly (per file's own Deferred item), and the listing's owning business later changes",
    "guard_snippet": "pin ownership at order-creation time (stored businessId), not via live listing join",
    "potential_consequence": "Order becomes visible to the wrong business, or invisible to the correct one, after a listing ownership change"
  },
  {
    "location": "ARCHITECTURE.md:AD-16 Rule (My Sales query)",
    "trigger_condition": "The listings/trading lookup query fails or times out, rather than merely being slow",
    "guard_snippet": "define an Error state for my-sales-summary distinct from Loading/Default/Fully-empty",
    "potential_consequence": "Tab has no defined behavior on query failure — page spec 4.4 only defines Loading, Default, and Fully-empty states"
  },
  {
    "location": "ARCHITECTURE.md:AD-16 Rule (open-listings count)",
    "trigger_condition": "A listing counted as 'open' has been hidden/moderated (AD-12 hiddenAt)",
    "guard_snippet": "explicitly exclude hiddenAt-set listings from the open-listings count",
    "potential_consequence": "My Sales tab shows a moderated/hidden listing as still open, misleading the seller"
  },
  {
    "location": "ARCHITECTURE.md:AD-16 Rule (pending trade offers count)",
    "trigger_condition": "A pending trade offer targets a listing that is subsequently hidden/moderated",
    "guard_snippet": "define whether pending-offer count still includes offers against now-hidden listings",
    "potential_consequence": "Count includes offers the seller can no longer act on, or silently drops them with no stated rule"
  },
  {
    "location": "ARCHITECTURE.md:AD-16 Rule (userId ownership query)",
    "trigger_condition": "A verified-business user (Seller-track) still holds leftover individual-seller listings from before verification",
    "guard_snippet": "state whether My Sales includes pre-verification individual-seller rows for a now-business account",
    "potential_consequence": "A business account's My Sales tab shows counts inconsistent with the Seller-track's stated individual-seller/business exclusivity"
  }
]
