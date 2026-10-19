import type { CuidId } from '../../../shared-kernel/types.js';

// DTOs — COL (contracts.md §10). Primitive fields only.

// assertCollectionOwner
export interface AssertCollectionOwnerRequestDTO {
  collectionId: CuidId;
  actorId: CuidId;
}

// acceptPrompt
export interface AcceptPromptRequestDTO {
  promptId: CuidId;
  collectionId: CuidId;
  actorId: CuidId;
}
export interface AcceptPromptResponseDTO {
  promptId: CuidId;
  status: 'Accepted';
  /** One CollectionEntry per OrderClosed line, in line order. */
  entryIds: CuidId[];
}

// getSetCompletion
export interface GetSetCompletionRequestDTO {
  collectionId: CuidId;
  setId: CuidId;
}
export interface SetCompletionDTO {
  setId: CuidId;
  ownedDistinct: number;
  cardEntryCount: number;
  /** floor(ownedDistinct × 100 / cardEntryCount), 0–100; null when cardEntryCount = 0. */
  completionPercent: number | null;
}
/** null when the set is unknown to catalog (silent). */
export type GetSetCompletionResponseDTO = SetCompletionDTO | null;
