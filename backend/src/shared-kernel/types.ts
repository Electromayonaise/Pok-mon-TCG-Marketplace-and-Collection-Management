// Primitive value types shared by every module's DTOs and ports.
// DTOs carry only these primitives (Solu-1 §4.2.B); no framework object appears here.

/** cuid2, 24 characters, leading lowercase letter: `^[a-z][0-9a-z]{23}$`. */
export type CuidId = string;

/** A UTC instant serialized as ISO 8601 with a `Z` offset, e.g. `2026-10-01T15:00:00.000Z`. */
export type IsoInstant = string;

/** A calendar date `YYYY-MM-DD` in `America/Bogota`. */
export type IsoDate = string;

/** Integer Colombian pesos (AD-SYS-7). Never a fraction, never a reference price. */
export type Cop = number;

/** Basis points, an integer 0–10,000. */
export type Bps = number;

export const CUID_PATTERN = /^[a-z][0-9a-z]{23}$/;

/** ADD-§2.4 Colombia bounding box, inclusive. */
export const COLOMBIA_BBOX = { minLat: -4.23, maxLat: 13.39, minLng: -81.73, maxLng: -66.85 } as const;

export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
export type Condition = CardCondition | 'Sealed';
