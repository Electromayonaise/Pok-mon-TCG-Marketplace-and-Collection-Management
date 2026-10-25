import type { CitationValue } from '../../shared-kernel/decision.js';
import { MESSAGES, type MessageCode } from './messages.generated.js';

/** What a placeholder reads as when its citation input is missing or null. */
export const MISSING_INPUT = '(sin dato)';

/**
 * Renders the es-CO humanMessage of `code`, filling each `{name}` only from the first
 * citation's inputs (AD-SYS-1 rule 6). Never leaves a `{…}` behind.
 */
export function renderMessage(code: MessageCode, inputs: Record<string, CitationValue>): string {
  return MESSAGES[code].replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = Object.hasOwn(inputs, name) ? inputs[name] : undefined;
    if (v === undefined || v === null) return MISSING_INPUT;
    if (typeof v === 'boolean') return v ? 'sí' : 'no';
    return String(v);
  });
}
