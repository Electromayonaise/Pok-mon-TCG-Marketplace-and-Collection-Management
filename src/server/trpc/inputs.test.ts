import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { INPUTS } from './inputs.generated.js';

type Ingress = { procedure: string; kind: string; input?: string; omit: string[] };
const ingress = (JSON.parse(fs.readFileSync('docs/solu-2/planning/detailed-design/schemas/operations.json', 'utf8')) as { ingress: Ingress[] }).ingress.filter((g) => g.kind !== 'job');
const inputs: Record<string, { shape: Record<string, unknown> } | undefined> = INPUTS;
const ROLE_LIKE = /^(role|roles|sellerKind|isAdmin|capabilities)$/;

type Def = { type: string; shape?: Record<string, z.ZodType>; innerType?: z.ZodType; element?: z.ZodType; options?: z.ZodType[]; valueType?: z.ZodType };
/** Every object key reachable in a schema, as a dotted path (`[]` marks an array element). */
function keysDeep(schema: z.ZodType | undefined, prefix = ''): string[] {
  if (!schema) return [];
  const def = (schema as unknown as { _zod: { def: Def } })._zod.def;
  switch (def.type) {
    case 'object':
      return Object.entries(def.shape!).flatMap(([k, v]) => [`${prefix}${k}`, ...keysDeep(v, `${prefix}${k}.`)]);
    case 'optional': case 'nullable':
      return keysDeep(def.innerType, prefix);
    case 'array':
      return keysDeep(def.element, `${prefix.replace(/\.$/, '')}[].`);
    case 'union':
      return def.options!.flatMap((o) => keysDeep(o, prefix));
    case 'record':
      return keysDeep(def.valueType, `${prefix}*.`);
    default:
      return [];
  }
}

describe('generated procedure inputs (AD-16, AD-SYS-8 rules 1–2)', () => {
  it('one schema per ingress procedure that takes an input, and none for the others', () => {
    expect(Object.keys(INPUTS).sort()).toEqual(ingress.filter((g) => g.input).map((g) => g.procedure).sort());
    expect(ingress.filter((g) => !g.input).map((g) => g.procedure)).toEqual(['orders.supportContact.get']);
  });

  it('no input has a role-like key at any depth, nor a field the session supplies', () => {
    expect(keysDeep(z.object({ items: z.array(z.object({ role: z.string() }).optional()) }))).toContain('items[].role');
    const bad = ingress.flatMap((g) => [
      ...keysDeep(INPUTS[g.procedure as keyof typeof INPUTS]).filter((k) => ROLE_LIKE.test(k.split(/\.|\[\]\.?/).filter(Boolean).at(-1)!)),
      ...Object.keys(inputs[g.procedure]?.shape ?? {}).filter((k) => g.omit.includes(k)),
    ].map((k) => `${g.procedure}: ${k}`));
    expect(bad).toEqual([]);
  });

  it('inputs are strict: an unknown key is refused', () => {
    for (const [procedure, schema] of Object.entries(INPUTS)) {
      const r = schema.safeParse({ role: 'admin' });
      expect([procedure, r.success]).toEqual([procedure, false]);
      expect([procedure, r.error!.issues.some((i) => i.code === 'unrecognized_keys')]).toEqual([procedure, true]);
    }
  });
});
