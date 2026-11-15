import { TRPCError } from '@trpc/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DomainError, NotImplementedError, UnexpectedError } from '../../shared-kernel/errors.js';
import { explainAssert, T0 } from '../../../test-support/solu2/fixtures.js';
import { toErrorBody } from './errors.js';
import { INPUTS } from './inputs.generated.js';

const now = new Date(T0);
const input = z.strictObject({ name: z.string().min(2), qty: z.number().int().max(5), kind: z.enum(['card', 'sealed']), at: z.iso.datetime() });
const zodError = (value: unknown) => input.safeParse(value).error!;

describe('toErrorBody — DomainError', () => {
  it('maps the code to its family status and a cited, rendered, rejected decision', () => {
    const body = toErrorBody(new DomainError('InsufficientQuantity', [{ rule: 'FR-INV-9', inputs: { requested: 3, available: 1 } }]), now);
    expect(body).toEqual({
      code: 'InsufficientQuantity',
      httpStatus: 409,
      decision: { outcome: 'rejected', reasonCode: 'InsufficientQuantity', humanMessage: 'Pediste 3; quedan 1.', citations: [{ rule: 'FR-INV-9', inputs: { requested: 3, available: 1 } }], occurredAt: T0 },
    });
  });

  it('a service-raised RequestValidationFailed carries its cited issue, or the whole input\'s when it cites none', () => {
    const cited = toErrorBody(new DomainError('RequestValidationFailed', [{ rule: 'AD-SYS-1', inputs: { field: 'cursor', issue: 'no corresponde a una página de esta lista' } }]), now);
    const bare = toErrorBody(new DomainError('RequestValidationFailed', [{ rule: 'AD-SYS-1', inputs: {} }]), now);
    expect([cited.issues, bare.issues]).toEqual([[{ field: 'cursor', issue: 'no corresponde a una página de esta lista' }], [{ field: 'la solicitud', issue: 'no es válido' }]]);
  });

  it('a service-raised RequestValidationFailed with several citations carries one issue and one line per citation (VER-2 P2)', () => {
    const body = toErrorBody(new DomainError('RequestValidationFailed', [
      { rule: 'AD-SYS-1', inputs: { field: 'legalIdentity.number', issue: 'no tiene un dígito de verificación válido' } },
      { rule: 'AD-SYS-1', inputs: { field: 'consentVersion', issue: 'no es la versión vigente del aviso de privacidad' } },
    ]), now);
    expect(body.issues).toEqual([
      { field: 'legalIdentity.number', issue: 'no tiene un dígito de verificación válido' },
      { field: 'consentVersion', issue: 'no es la versión vigente del aviso de privacidad' },
    ]);
    expect(body.decision.humanMessage.split('\n')).toEqual(body.issues!.map((i) => `Revisa ${i.field}: ${i.issue}.`));
  });

  it('unwraps the cause tRPC adds around a thrown DomainError', () => {
    const wrapped = new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: new DomainError('AdminOnly', [{ rule: 'AD-SYS-1', inputs: {} }]) });
    expect(toErrorBody(wrapped, now)).toMatchObject({ code: 'AdminOnly', httpStatus: 403 });
  });

  it('redacts a regulated citation input before it reaches the citations or the humanMessage (AD-SYS-8 rule 4)', () => {
    const body = toErrorBody(new DomainError('ContactRateLimited', [{ rule: 'FR-MSG-2', inputs: { phone: '+573009912345', listingId: 'lst1', retryAt: T0 } }]), now);
    expect(JSON.stringify(body)).not.toContain('3009912345');
    expect(body.decision.citations[0].inputs).toEqual({ phone: '[redacted]', listingId: 'lst1', retryAt: T0 });
    explainAssert(body.decision, { code: 'ContactRateLimited', outcome: 'rejected', rule: 'FR-MSG-2' });
    const plain = new DomainError('AdminOnly', [{ rule: 'AD-SYS-1', inputs: { orderId: 'o1' } }]);
    expect(toErrorBody(plain, now).decision.citations).toEqual(plain.citations);
  });
});

describe('toErrorBody — request validation', () => {
  it('maps a ZodError to RequestValidationFailed with one es-CO issue and line per problem', () => {
    const body = toErrorBody(zodError({ name: 'x', qty: 9, kind: 'deck', at: 'ayer', role: 'admin' }), now);
    expect(body.code).toBe('RequestValidationFailed');
    expect(body.httpStatus).toBe(400);
    expect(body.issues).toEqual([
      { field: 'name', issue: 'debe tener al menos 2 caracteres' },
      { field: 'qty', issue: 'debe ser menor o igual a 5' },
      { field: 'kind', issue: 'no es una de las opciones permitidas' },
      { field: 'at', issue: 'debe ser una fecha y hora ISO 8601 en UTC' },
      { field: 'role', issue: 'no es un campo permitido' },
    ]);
    expect(body.decision.humanMessage.split('\n')).toEqual(body.issues!.map((i) => `Revisa ${i.field}: ${i.issue}.`));
    expect(body.decision.citations).toEqual([{ rule: 'AD-SYS-1', inputs: { field: 'name', issue: 'debe tener al menos 2 caracteres' } }]);
    expect(body.decision).toMatchObject({ outcome: 'rejected', reasonCode: 'RequestValidationFailed', occurredAt: T0 });
  });

  it('reads the ZodError tRPC wraps in a BAD_REQUEST', () => {
    const body = toErrorBody(new TRPCError({ code: 'BAD_REQUEST', cause: zodError(null) }), now);
    expect(body.issues).toEqual([{ field: 'la solicitud', issue: 'debe ser un objeto' }]);
  });

  it('names the expected type of a wrong or missing value', () => {
    expect(toErrorBody(zodError({ name: 7, qty: 1.5, kind: 'card', at: T0 }), now).issues).toEqual([
      { field: 'name', issue: 'debe ser un texto' },
      { field: 'qty', issue: 'debe ser un número entero' },
    ]);
  });

  it('echoes a client-chosen key only when it is a plain camelCase name, and caps the issues', () => {
    const valid = { name: 'xx', qty: 1, kind: 'card', at: T0 };
    expect(toErrorBody(zodError({ ...valid, RelationOrder: 1, 'relation "Order"': 2, okKey: 3 }), now).issues).toEqual([
      { field: 'un campo desconocido', issue: 'no es un campo permitido' },
      { field: 'un campo desconocido', issue: 'no es un campo permitido' },
      { field: 'okKey', issue: 'no es un campo permitido' },
    ]);
    const many = toErrorBody(zodError({ ...valid, ...Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`k${i}`, i])) }), now);
    expect(many.issues).toHaveLength(20);
    expect(many.decision.humanMessage.split('\n')).toHaveLength(20);
  });

  it('every generated input refuses a bad value with an explainable decision: no option list, no PascalCase', () => {
    const probes: unknown[] = ['__zz__', 1.5, true, null, [], {}];
    const failing: string[] = [];
    for (const [procedure, schema] of Object.entries(INPUTS)) {
      for (const key of Object.keys(schema.shape)) {
        for (const value of probes) {
          const r = schema.safeParse({ [key]: value });
          if (r.success) continue;
          try {
            explainAssert(toErrorBody(r.error, now).decision, { code: 'RequestValidationFailed', outcome: 'rejected' });
          } catch {
            failing.push(`${procedure}.${key} = ${JSON.stringify(value)}`);
          }
        }
      }
    }
    expect(failing).toEqual([]);
  });

  it.each([
    ['NOT_FOUND', 'No procedure found on path "x.y"', 'no corresponde a ningún procedimiento'],
    ['METHOD_NOT_SUPPORTED', 'Unsupported GET-request to mutation procedure at path "x.y"', 'usa un método HTTP que este procedimiento no acepta'],
    ['BAD_REQUEST', 'Batching is not enabled on the server', 'no tiene la forma esperada'],
    ['PARSE_ERROR', 'Unexpected token } in JSON at position 1', 'no es un JSON válido'],
    ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported content-type "text/x-Order"', 'no tiene un tipo de contenido aceptado'],
    ['PAYLOAD_TOO_LARGE', 'Request body too large', 'es demasiado grande'],
  ] as const)('a request tRPC itself refuses (%s) is RequestValidationFailed, and its message never reaches the body', (code, message, issue) => {
    const body = toErrorBody(new TRPCError({ code, message }), now);
    expect(body).toEqual({
      code: 'RequestValidationFailed',
      httpStatus: 400,
      decision: { outcome: 'rejected', reasonCode: 'RequestValidationFailed', humanMessage: `Revisa la solicitud: ${issue}.`, citations: [{ rule: 'AD-SYS-1', inputs: { field: 'la solicitud', issue } }], occurredAt: T0 },
      issues: [{ field: 'la solicitud', issue }],
    });
    explainAssert(body.decision, { code: 'RequestValidationFailed', outcome: 'rejected' });
  });
});

describe('toErrorBody — Unexpected', () => {
  const unexpected = { code: 'Unexpected', httpStatus: 500, decision: { outcome: 'rejected', reasonCode: 'Unexpected', humanMessage: 'Algo falló de nuestro lado; no se aplicó ningún cambio.', citations: [{ rule: 'AD-SYS-1', inputs: {} }], occurredAt: T0 } };

  it.each([
    ['a driver error', new Error('relation "Order" does not exist at 10.0.0.7')],
    ['a non-owner raise', new UnexpectedError('reviews raised AdminOnly, which identity owns')],
    ['a stub', new NotImplementedError('orders.placeOrder')],
    ['a tRPC CONFLICT no procedure of ours raises', new TRPCError({ code: 'CONFLICT', message: 'relation "Order" is locked' })],
    ['a wrapped driver error', new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: new Error('ECONNREFUSED 10.0.0.7') })],
    ['a thrown string', 'boom'],
  ])('%s is Unexpected, and nothing of it reaches the body', (_, error) => {
    expect(toErrorBody(error, now)).toEqual(unexpected);
  });
});
