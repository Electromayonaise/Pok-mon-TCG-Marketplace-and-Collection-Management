[
  {
    "location": "1.2-create-listing.md: Publish Listing Button behavior / Page States (Error — network/server row)",
    "trigger_condition": "Server persists the listing but the client never receives the success response before erroring",
    "guard_snippet": "attach a client-generated idempotency key to the publish request; server rejects a duplicate key",
    "potential_consequence": "User retries and creates two identical listings for the same item"
  },
  {
    "location": "2.2-trade-offer-detail.md: Accept Button behavior",
    "trigger_condition": "The other party withdraws the offer between 2.2's page load and Valentina's Accept tap",
    "guard_snippet": "if (offer.status !== 'Offered') { showWithdrawnMessage(); return; }",
    "potential_consequence": "Accept is sent against an already-withdrawn offer with no defined client-side outcome on this page"
  },
  {
    "location": "2.3-trade-completion-confirmation.md: Confirm Button behavior",
    "trigger_condition": "User double-taps Confirm before the disabled state takes visual effect (network latency)",
    "guard_snippet": "disable the button synchronously in the click handler, before awaiting the network response",
    "potential_consequence": "Duplicate confirmation writes sent for the same side of the same trade"
  },
  {
    "location": "3.1-business-verification-application.md: Legal Identity Document Upload / Page States",
    "trigger_condition": "Auth session expires while the identity document is mid-upload",
    "guard_snippet": "on 401 during upload, preserve entered field values and prompt re-authentication rather than discarding the form",
    "potential_consequence": "Andrés loses all typed form data and the uploaded file, must restart the application from scratch"
  },
  {
    "location": "3.3-commission-balance-management.md: Create a Listing Button behavior",
    "trigger_condition": "Balance drops to zero (e.g. concurrent commission deduction) between opening the reused create-listing-form and submitting it",
    "guard_snippet": "revalidate balance > 0 server-side at publish time; reject with a specific paused-balance error if it fails",
    "potential_consequence": "A listing is created while the account is actually in the Zero/Paused state, contradicting CAP-21's pause invariant"
  },
  {
    "location": "4.2-order-detail-confirm-payment.md: Page States (Error row)",
    "trigger_condition": "The buyer's uploaded comprobante file is permanently corrupted at the source, not a transient load failure",
    "guard_snippet": "after N failed retries, surface a 'report an issue' path instead of only offering Retry indefinitely",
    "potential_consequence": "Andrés is stuck retrying a load that can never succeed, with no escalation path to resolve the stalled order"
  },
  {
    "location": "EXPERIENCE.md State Patterns (Order fulfillment tri-state) / 4.2-order-detail-confirm-payment.md Page States",
    "trigger_condition": "Andrés confirms sellerReceivedConfirmedAt but the buyer never performs their own item-received confirmation",
    "guard_snippet": "no staleness/reminder policy specified for an order stuck indefinitely between seller-confirmed and buyer-closed",
    "potential_consequence": "Orders can remain half-closed forever with no nudge or visibility for either party"
  },
  {
    "location": "1.3-listing-live-confirmation.md: Page States",
    "trigger_condition": "User returns to 1.3 via browser back navigation after the listing's state has since changed (e.g. already sold or removed)",
    "guard_snippet": "refetch listing state on mount; if no longer live, render its current status instead of the cached live-preview",
    "potential_consequence": "Page shows a stale 'your listing is live' confirmation for a listing that is no longer actually active"
  },
  {
    "location": "2.3-trade-completion-confirmation.md: Entry Points",
    "trigger_condition": "User re-opens an already-Completed trade's 2.3 page later (e.g. via 2.1's list) rather than immediately after confirming",
    "guard_snippet": "route 2.1's Completed-state cards to 2.3 in its read-only Completed view, not only forward-navigation from 2.2",
    "potential_consequence": "No documented entry point exists back into 2.3 for a trade that completed in the past, leaving that state effectively unreachable except in the instant it first occurs"
  },
  {
    "location": "3.2-application-status.md Page States (Rejected row) / 3.1-business-verification-application.md Page Metadata (Visibility)",
    "trigger_condition": "Andrés has a Rejected application on file and taps 'Submit a new application'",
    "guard_snippet": "clarify 3.1 Visibility as 'no Pending or Approved application on file' so a Rejected applicant is explicitly permitted back in",
    "potential_consequence": "The only documented retry path contradicts the page's own stated access guard, potentially blocking legitimate re-application"
  },
  {
    "location": "1.1-individual-seller-profile-step.md: Continue Button behavior",
    "trigger_condition": "Profile save succeeds server-side but client-side navigation to 1.2 is interrupted (e.g. connection drop right after save)",
    "guard_snippet": "on next visit, check the profile-complete flag before deciding whether to render 1.1 or 1.2",
    "potential_consequence": "User is shown the profile step again despite already having a saved profile, or is left with no forward path"
  }
]
