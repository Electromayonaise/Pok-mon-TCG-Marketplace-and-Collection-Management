// Core domain — CAT: the TRM source's circuit breaker (Story 4.6, decision log Impl-2 #31). Pure (AD-SYS-6).

/** closed: calls pass; open: calls are short-circuited until the cool-down ends; halfOpen: one probe is in flight. */
export type BreakerState = 'closed' | 'open' | 'halfOpen';
