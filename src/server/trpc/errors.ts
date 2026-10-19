// Driving adapter — the tRPC error formatter (AD-SYS-1; refinement R-9, review G-03). Every
// refusal leaves the server as `{ error: ErrorBody }`. Interface stub (Solutioning stop-point),
// proven by sys › [SYS-1.R6].
import { NotImplementedError } from '../../shared-kernel/errors.js';
import type { ErrorBody } from '../../shared-kernel/explanation.js';

/**
 * Maps a thrown value to the wire body:
 * - a DomainError → its registry family's status, the es-CO `humanMessage`, the citations
 *   passed through the redactor, and `occurredAt = now`;
 * - a zod failure → `RequestValidationFailed` with `issues`;
 * - anything else → `'Unexpected'` (HTTP 500), whose body never carries the error's message.
 */
export function toErrorBody(_error: unknown, _now: Date): ErrorBody {
  throw new NotImplementedError('server.trpc.toErrorBody');
}
