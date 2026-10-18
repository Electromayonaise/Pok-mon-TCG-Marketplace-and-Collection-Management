// Code registry (AD-SYS-1 rule 1), restricted to the codes the Solu contracts reference.
// Source of truth for owners and families: docs/plan-2/planning/addendum.md ADD-§3 and
// ARCHITECTURE §8, plus PromptNotFound (Solu-1 GAP-1, decision log #6).

export type CodeOwner =
  | 'shared-kernel' | 'identity' | 'catalog' | 'listings' | 'orders'
  | 'commission' | 'trading' | 'messaging' | 'collections' | 'reviews';

export type TrpcFamily =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST' | 'CONFLICT' | 'TOO_MANY_REQUESTS';

/** The HTTP status tRPC 11 emits for each family. */
export const HTTP_STATUS: Record<TrpcFamily, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
};

export const DOMAIN_ERRORS = {
  // shared-kernel
  RequestValidationFailed: { owner: 'shared-kernel', trpc: 'BAD_REQUEST' },
  // identity (IDN, VER)
  NotAuthenticated: { owner: 'identity', trpc: 'UNAUTHORIZED' },
  AdminOnly: { owner: 'identity', trpc: 'FORBIDDEN' },
  EmailNotVerified: { owner: 'identity', trpc: 'FORBIDDEN' },
  IndividualSellerProfileIncomplete: { owner: 'identity', trpc: 'CONFLICT' },
  IndividualSellerProfileAlreadyComplete: { owner: 'identity', trpc: 'CONFLICT' },
  AlreadyVerifiedBusiness: { owner: 'identity', trpc: 'CONFLICT' },
  BusinessApplicationOnFile: { owner: 'identity', trpc: 'CONFLICT' },
  NotBusinessAccount: { owner: 'identity', trpc: 'CONFLICT' },
  SellerNotVerified: { owner: 'identity', trpc: 'CONFLICT' },
  ApplicationAlreadyPending: { owner: 'identity', trpc: 'CONFLICT' },
  ApplicationNotPending: { owner: 'identity', trpc: 'CONFLICT' },
  ApplicationNotFound: { owner: 'identity', trpc: 'NOT_FOUND' },
  ReapplicationCooldownActive: { owner: 'identity', trpc: 'CONFLICT' },
  ReapplicationBarred: { owner: 'identity', trpc: 'CONFLICT' },
  RejectionReasonUnknown: { owner: 'identity', trpc: 'CONFLICT' },
  // catalog (CAT)
  CatalogEntryNotFound: { owner: 'catalog', trpc: 'NOT_FOUND' },
  FeedRunInProgress: { owner: 'catalog', trpc: 'CONFLICT' },
  // listings (INV, DSC)
  NotBusinessListing: { owner: 'listings', trpc: 'CONFLICT' },
  ListingNotOpenToTrade: { owner: 'listings', trpc: 'CONFLICT' },
  InsufficientQuantity: { owner: 'listings', trpc: 'CONFLICT' },
  ListingNotFound: { owner: 'listings', trpc: 'NOT_FOUND' },
  ListingNotOwnedByCaller: { owner: 'listings', trpc: 'FORBIDDEN' },
  ListingNotPurchasable: { owner: 'listings', trpc: 'CONFLICT' },
  InvalidSearchArea: { owner: 'listings', trpc: 'BAD_REQUEST' },
  SearchFilterTooBroad: { owner: 'listings', trpc: 'BAD_REQUEST' },
  // orders (ORD)
  SelfPurchaseNotAllowed: { owner: 'orders', trpc: 'CONFLICT' },
  ComprobanteNotYetUploaded: { owner: 'orders', trpc: 'CONFLICT' },
  OrderAlreadyConfirmedByRole: { owner: 'orders', trpc: 'CONFLICT' },
  OrderNotVisibleToCaller: { owner: 'orders', trpc: 'FORBIDDEN' },
  OrderNotOwnedByCaller: { owner: 'orders', trpc: 'FORBIDDEN' },
  OrderNoLongerActive: { owner: 'orders', trpc: 'CONFLICT' },
  // commission (COM)
  TopUpNotVisibleToCaller: { owner: 'commission', trpc: 'FORBIDDEN' },
  // trading (TRD)
  NotYourTurn: { owner: 'trading', trpc: 'CONFLICT' },
  TradeOfferNotOpen: { owner: 'trading', trpc: 'CONFLICT' },
  TradeOfferNotVisibleToCaller: { owner: 'trading', trpc: 'FORBIDDEN' },
  // messaging (MSG)
  ConversationNotVisibleToCaller: { owner: 'messaging', trpc: 'FORBIDDEN' },
  BusinessCannotInitiate: { owner: 'messaging', trpc: 'CONFLICT' },
  // collections (COL, VAL)
  CollectionNotFound: { owner: 'collections', trpc: 'NOT_FOUND' },
  PromptAlreadyResolved: { owner: 'collections', trpc: 'CONFLICT' },
  PromptNotFound: { owner: 'collections', trpc: 'NOT_FOUND' },
  InvalidValuationPeriod: { owner: 'collections', trpc: 'BAD_REQUEST' },
  // reviews (REP)
  TargetNotFound: { owner: 'reviews', trpc: 'NOT_FOUND' },
  NotVerifiedPurchaser: { owner: 'reviews', trpc: 'CONFLICT' },
  ReviewNotFound: { owner: 'reviews', trpc: 'NOT_FOUND' },
} as const satisfies Record<string, { owner: CodeOwner; trpc: TrpcFamily }>;

export type DomainErrorCode = keyof typeof DOMAIN_ERRORS;

export const DECISION_CODES = {
  ListingUnverified: { owner: 'listings' },
  ListingPausedBalanceExhausted: { owner: 'listings' },
  ReferencePriceStale: { owner: 'catalog' },
  TrendNoBaseline: { owner: 'catalog' },
  ListingNoLongerAvailable: { owner: 'trading' },
  RecipientNotYetVerified: { owner: 'messaging' },
  ExternalEntryNotInCatalog: { owner: 'collections' },
  NoReferencePrice: { owner: 'collections' },
  ValuationNoBaseline: { owner: 'collections' },
} as const satisfies Record<string, { owner: CodeOwner }>;

export type DecisionCode = keyof typeof DECISION_CODES;
