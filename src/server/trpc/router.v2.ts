// Driving adapter — the root tRPC router of the 111 ingress procedures in
// docs/solu-2/planning/detailed-design/schemas/operations.json (AD-SYS-8 rules 1–2).
// Interface stub (Solutioning stop-point), proven by sys › [SYS-8.R2].
import { NotImplementedError } from '../../shared-kernel/errors.js';

export type ProcedureBuilder = 'public' | 'authed' | 'canBuy' | 'admin' | 'job';

/** What the built router exposes for one procedure, read from its zod input schema. */
export interface ProcedureShape {
  procedure: string;
  kind: 'query' | 'mutation';
  builder: ProcedureBuilder;
  /** Top-level keys of the input schema; actor fields come from the session, never from here. */
  inputKeys: string[];
}

/** Introspects the built router: one element per registered procedure. */
export function describeProceduresV2(): ProcedureShape[] {
  throw new NotImplementedError('server.trpc.describeProceduresV2');
}
