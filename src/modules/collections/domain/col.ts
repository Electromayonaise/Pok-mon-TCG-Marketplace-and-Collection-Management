// Core domain — COL. Pure (AD-SYS-6).
import { NotImplementedError } from '../../../shared-kernel/errors.js';

export type PromptStatus = 'Pending' | 'Accepted' | 'Dismissed';

/** AD-COL-1 rule 5: floor(owned × 100 / count), null when count = 0. */
export function completionPercent(_ownedDistinct: number, _cardEntryCount: number): number | null {
  throw new NotImplementedError('collections.domain.completionPercent');
}

/** AD-COL-2 rule 2: the America/Bogota calendar date (YYYY-MM-DD) of an instant. */
export function bogotaDate(_instant: Date): string {
  throw new NotImplementedError('collections.domain.bogotaDate');
}
