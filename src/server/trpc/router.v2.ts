// Driving adapter — the root tRPC router of the ingress procedures in
// _bmad-output/planning-artifacts/detailed-design/schemas/operations.json (AD-SYS-8 rules 1–2), registered
// from the generated table, so the router cannot drift from the registry. Proven by sys › [SYS-8.R2].
import type { AnyProcedure } from '@trpc/server';
import type { z } from 'zod';
import { NotImplementedError } from '../../shared-kernel/errors.js';
import type { CuidId } from '../../shared-kernel/types.js';
import { adminProcedure, authedProcedure, canBuyProcedure, publicProcedure, router } from './init.js';
import { INPUTS, PROCEDURES } from './inputs.generated.js';

export type ProcedureBuilder = 'public' | 'authed' | 'canBuy' | 'admin' | 'job';

/** What the built router exposes for one procedure, read from its zod input schema. */
export interface ProcedureShape {
  procedure: string;
  kind: 'query' | 'mutation';
  builder: ProcedureBuilder;
  /** Top-level keys of the input schema; actor fields come from the session, never from here. */
  inputKeys: string[];
}

/**
 * A wired resolver: the parsed wire input and the session actor. The actor is the builder's,
 * never the input's (AD-SYS-8 rule 2); a `public` procedure gets none. A procedure with no input
 * schema (`orders.supportContact.get`) gets `undefined`.
 */
export type Resolvers = { [P in keyof typeof INPUTS]?: (input: z.infer<(typeof INPUTS)[P]>, actorId: CuidId) => Promise<unknown> }
  & { [P in Exclude<(typeof PROCEDURES)[number]['procedure'], keyof typeof INPUTS>]?: (input: undefined, actorId: CuidId) => Promise<unknown> };

const BUILDERS = { public: publicProcedure, authed: authedProcedure, canBuy: canBuyProcedure, admin: adminProcedure };
const inputs: Partial<Record<string, z.ZodObject>> = INPUTS;

/** One registry procedure. Its resolver is NotImplemented until the owning story wires the service. */
function registryProcedure({ procedure, kind, builder }: (typeof PROCEDURES)[number], resolvers: Resolvers): AnyProcedure {
  const base = BUILDERS[builder] as typeof publicProcedure;
  const input = inputs[procedure];
  const withInput = input ? base.input(input) : base;
  const wired = (resolvers as Partial<Record<string, (input: unknown, actorId: CuidId) => Promise<unknown>>>)[procedure];
  const resolve = wired
    ? ({ ctx, input: parsed }: { ctx: object; input: unknown }) => wired(parsed, (ctx as { actorId: CuidId }).actorId)
    : async (): Promise<never> => { throw new NotImplementedError(procedure); };
  return kind === 'query' ? withInput.query(resolve) : withInput.mutation(resolve);
}

type Tree = { [key: string]: Tree | AnyProcedure };

/** The router of every registry procedure; the ones in `resolvers` call their service (composition.ts). */
export function buildAppRouter(resolvers: Resolvers = {}) {
  const tree: Tree = {};
  for (const p of PROCEDURES) {
    const path = p.procedure.split('.');
    let node = tree;
    for (const key of path.slice(0, -1)) node = (node[key] ??= {}) as Tree;
    node[path.at(-1)!] = registryProcedure(p, resolvers);
  }
  return router(tree);
}

/** The unwired router: every resolver is NotImplemented (the shape tests and the gate tests use it). */
export const appRouter = buildAppRouter();
export type AppRouter = typeof appRouter;

/** Introspects the built router: one element per registered procedure. */
export function describeProceduresV2(): ProcedureShape[] {
  return Object.entries(appRouter._def.procedures as Record<string, AnyProcedure>).map(([procedure, p]) => ({
    procedure,
    kind: p._def.type as ProcedureShape['kind'],
    builder: (p._def.meta as { builder: ProcedureBuilder }).builder,
    inputKeys: Object.keys((p._def.inputs[0] as z.ZodObject | undefined)?.shape ?? {}),
  }));
}
