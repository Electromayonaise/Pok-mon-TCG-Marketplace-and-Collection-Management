import type { Cop, CuidId, IsoDate, IsoInstant } from '../../../shared-kernel/types.js';
import type { ExplanationDTO } from '../../../shared-kernel/explanation.js';
import type { OrderClosedV1 } from '../../../shared-kernel/events.js';
import type { SetCompletionDTO } from './col.dto.js';

// Solu-2 DTOs — COL (contracts.md §10, §15).

// COL-1 acceptPrompt (and its dismissing mirror)
export interface AcceptPromptRequest { promptId: CuidId; collectionId: CuidId; actorId: CuidId }
export interface AcceptPromptResponse { promptId: CuidId; status: 'Accepted'; entryIds: CuidId[]; decision: ExplanationDTO }
export interface DismissPromptRequest { promptId: CuidId; actorId: CuidId }
export interface DismissPromptResponse { promptId: CuidId; status: 'Dismissed'; decision: ExplanationDTO }

// COL-2 onOrderClosed (subscriber; the payload is the event's, AD-9)
export type OnOrderClosedRequest = OrderClosedV1;
export interface OnOrderClosedResponse { created: boolean; promptId: CuidId }

// COL-3 addEntry
export interface AddEntryRequest {
  ownerId: CuidId;
  collectionId: CuidId | null;
  catalogEntryId: CuidId;
  qty: number;
  acquiredAt: IsoDate;
  acquiredPriceCop: Cop | null;
}
export interface AddEntryResponse { entryId: CuidId; collectionId: CuidId; createdGeneral: boolean; decision: ExplanationDTO }

// S-FR-COL-1 collections
export interface CreateCollectionRequest { ownerId: CuidId; name: string }
export interface CreateCollectionResponse { collectionId: CuidId; name: string; decision: ExplanationDTO }
export interface RenameCollectionRequest { ownerId: CuidId; collectionId: CuidId; name: string }
export interface DeleteCollectionRequest { ownerId: CuidId; collectionId: CuidId; confirm: true }
export interface DeleteCollectionResponse { entriesRemoved: number; platformPurchaseEntriesRemoved: number; decision: ExplanationDTO }

// S-FR-COL-3 add by link
export interface AddExternalEntryRequest {
  ownerId: CuidId;
  collectionId: CuidId;
  url: string;
  title: string;
  imageUrl: string | null;
  qty: number;
  acquiredAt: IsoDate;
}
export interface AddExternalEntryResponse { entryId: CuidId; decision: ExplanationDTO }

// S-FR-COL-4 move / copy
export interface MoveOrCopyEntryRequest { ownerId: CuidId; entryId: CuidId; targetCollectionId: CuidId; mode: 'move' | 'copy' }
export interface MoveOrCopyEntryResponse { entryId: CuidId; collectionId: CuidId; decision: ExplanationDTO }

// S-FR-COL-5 binder
export type BinderSortKey = 'setNumber' | 'name' | 'acquiredAt' | 'acquiredPriceCop' | 'manual';
export interface GetBinderRequest { ownerId: CuidId; collectionId: CuidId; sort: BinderSortKey[]; setId: CuidId | null }
export interface BinderEntryDTO {
  entryId: CuidId;
  cardKind: 'catalog' | 'external';
  catalogEntryId: CuidId | null;
  title: string;
  source: 'Manual' | 'PlatformPurchase';
  qty: number;
  acquiredAt: IsoDate;
  manualPosition: number;
}
export interface GetBinderResponse { rows: number; cols: number; entries: BinderEntryDTO[]; completion: SetCompletionDTO | null }
export interface SetBinderLayoutRequest { ownerId: CuidId; collectionId: CuidId; rows: number; cols: number }
export interface ReorderEntriesRequest { ownerId: CuidId; collectionId: CuidId; orderedEntryIds: CuidId[] }
export interface CollectionChangeResponse { collectionId: CuidId; updatedAt: IsoInstant }

// S-FR-COL-6 wishlist
export interface AddWishlistRequest { ownerId: CuidId; catalogEntryId: CuidId; maxPriceCop: Cop | null; note: string | null }
export interface RemoveWishlistRequest { ownerId: CuidId; catalogEntryId: CuidId }
export interface ListWishlistRequest { ownerId: CuidId }
export interface WishlistRowDTO { catalogEntryId: CuidId; maxPriceCop: Cop | null; lowestPriceCop: Cop | null; availableCount: number }
export interface ListWishlistResponse { rows: WishlistRowDTO[] }
