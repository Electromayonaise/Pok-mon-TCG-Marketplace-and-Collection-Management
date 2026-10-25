// The `tezg/*` lint rules (Story 1.4, test-design TG-8): the static half of AD-11, AD-8 and
// AD-SYS-8 rule 3. Parse-only (decision log #7): each rule reads string and template literals and
// call shapes, never types. The sources of truth are read once at load: the code registry
// (src/shared-kernel/codes.ts) and the SQL-first schema the migrations apply. The fitness project
// keeps the repository-wide proofs (docs/solu-2/test/fitness); these rules fail the same plants
// in the editor and at `npm run lint`. Proven by tools/lint/tezg-plugin.test.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SCHEMA = 'docs/solu-2/planning/detailed-design/schemas/001_tezg_schema.sql';

/** Code → owning module, from the `DOMAIN_ERRORS` block (one `Code: { owner: '…', … }` entry per line). */
export function codeOwners(codesTs) {
  const block = /^export const DOMAIN_ERRORS = \{([\s\S]*?)^\} as const/m.exec(codesTs)?.[1] ?? '';
  return new Map([...block.matchAll(/^\s*(\w+):\s*\{\s*owner:\s*'([\w-]+)'/gm)].map((m) => [m[1], m[2]]));
}

/** Table → owning module, from the schema's section headers (same parse as fitness `tableOwners`). */
export function tableOwners(schemaSql) {
  const owners = new Map();
  let owner = '';
  for (const line of schemaSql.split(/\r?\n/)) {
    const h = /^-- (shared-kernel|identity|catalog|listings|orders|commission|trading|messaging|collections|reviews)\b/.exec(line);
    if (h) owner = h[1];
    const t = /^CREATE TABLE IF NOT EXISTS "?(\w+)"?/.exec(line);
    if (t && owner) owners.set(t[1], owner);
  }
  return owners;
}

/**
 * The regulated columns a SELECT may read only in the owning module's `infra/` (AD-SYS-8 rule 3,
 * AD-17). `null` means every column: the legal identity is regulated as a whole. The test file
 * checks this list against the schema's `-- regulated` markers, so the two cannot drift.
 */
export const REGULATED_COLUMNS = {
  Session: ['token'],
  IndividualSellerProfile: ['contactPhoneE164'],
  BusinessApplicationLegalIdentity: null,
  Order: ['comprobanteObjectKey'],
  TopUpRequest: ['proofObjectKey'],
  Message: ['body'],
};

export const CODE_OWNERS = codeOwners(fs.readFileSync(path.join(REPO_ROOT, 'src/shared-kernel/codes.ts'), 'utf8'));
export const TABLE_OWNERS = tableOwners(fs.readFileSync(path.join(REPO_ROOT, SCHEMA), 'utf8'));

/** The linted file as a repo-relative path, its module (`identity`, `shared-kernel`, `server`, …) and whether it is adapter code. */
function fileOf(context) {
  const rel = path.relative(REPO_ROOT, path.resolve(context.cwd, context.filename)).replace(/\\/g, '/');
  const m = /^src\/(?:modules\/)?([\w-]+)\/(infra\/)?/.exec(rel);
  return { rel, module: m?.[1] ?? '', infra: Boolean(m?.[2]) };
}

/** A literal's SQL text: a string as is, a template with `?` for each interpolation. */
function sqlText(node) {
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null;
  return node.quasis.map((q) => q.value.cooked ?? q.value.raw).join('?');
}

const isString = (node) => node?.type === 'Literal' && typeof node.value === 'string';

const errorOwner = {
  meta: {
    type: 'problem',
    docs: { description: 'A DomainError is raised only by the module that owns its code (AD-11, AD-SYS-1 rule 2).' },
    schema: [],
    messages: {
      foreignRaiser: "raiserFor('{{name}}') in a {{module}} file: a module raises only through its own raiser.",
      raiserOutsideModule: 'raiserFor({{name}}) outside src/modules/<m> and src/shared-kernel: only a module raises.',
      foreignCode: "raise('{{name}}') in a {{module}} file: {{owner}} owns {{name}}.",
      directConstruction: 'new DomainError({{name}}) outside src/shared-kernel/raise.ts: raise through raiserFor(module).',
    },
  },
  create(context) {
    const file = fileOf(context);
    const raiserModule = file.rel.startsWith('src/modules/') || file.rel.startsWith('src/shared-kernel/') ? file.module : '';
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return;
        const [arg] = node.arguments;
        if (node.callee.name === 'raiserFor') {
          const name = isString(arg) ? arg.value : context.sourceCode.getText(arg ?? node);
          if (!raiserModule) context.report({ node, messageId: 'raiserOutsideModule', data: { name } });
          else if (name !== raiserModule) context.report({ node, messageId: 'foreignRaiser', data: { name, module: raiserModule } });
        } else if (node.callee.name === 'raise' && isString(arg) && CODE_OWNERS.has(arg.value)) {
          const owner = CODE_OWNERS.get(arg.value);
          if (owner !== raiserModule) context.report({ node, messageId: 'foreignCode', data: { name: arg.value, module: raiserModule || file.module || file.rel, owner } });
        }
      },
      NewExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'DomainError' || file.rel === 'src/shared-kernel/raise.ts') return;
        const [arg] = node.arguments;
        context.report({ node, messageId: 'directConstruction', data: { name: arg ? context.sourceCode.getText(arg) : '' } });
      },
    };
  },
};

const tableOwner = {
  meta: {
    type: 'problem',
    docs: { description: 'A module writes only the tables its schema section owns (AD-8, R-2).' },
    schema: [],
    messages: {
      foreignWrite: '{{module}} writes {{name}}, owned by {{owner}}: call the owner through its index.ts.',
      unknownTable: '{{module}} writes {{name}}, which no schema section declares.',
    },
  },
  create(context) {
    const file = fileOf(context);
    const check = (node) => {
      const sql = sqlText(node);
      if (!sql) return;
      // A row lock (`FOR UPDATE`) is a read (decision log Impl-1 #18).
      for (const m of sql.matchAll(/\b(?:INSERT\s+INTO|(?<!\bFOR\s+)UPDATE|DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+"?(\w+)"?/gi)) {
        const owner = TABLE_OWNERS.get(m[1]);
        const data = { name: m[1], module: file.module || file.rel, owner };
        if (!owner) context.report({ node, messageId: 'unknownTable', data });
        else if (owner !== file.module) context.report({ node, messageId: 'foreignWrite', data });
      }
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

/** Every `FROM`/`JOIN` table of a SQL text, with its alias (or its own name). */
function tableRefs(sql) {
  const KEYWORDS = /^(?:WHERE|ON|USING|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|LATERAL|ORDER|GROUP|LIMIT|FOR|UNION|SET|AS)$/i;
  return [...sql.matchAll(/\b(?:FROM|JOIN)\s+"?(\w+)"?(?:\s+(?:AS\s+)?"?(\w+)"?)?/gi)].map((m) => ({
    table: m[1],
    alias: m[2] && !KEYWORDS.test(m[2]) ? m[2] : m[1],
  }));
}

/** The tables each `SELECT *` reads: the FROM clause after it, up to the next clause or closing parenthesis. */
function starTables(sql) {
  const out = [];
  for (const m of sql.matchAll(/\bSELECT\s+(?:DISTINCT\s+)?\*\s+FROM\b([\s\S]*?)(?=\bWHERE\b|\bORDER\b|\bGROUP\b|\bLIMIT\b|\bUNION\b|\)|;|$)/gi)) {
    out.push(...tableRefs(`FROM${m[1]}`).map((r) => r.table));
  }
  return out;
}

const regulatedSelect = {
  meta: {
    type: 'problem',
    docs: { description: "A regulated column is selected only in its owning module's infra/, and never through `*` (AD-SYS-8 rule 3, AD-17)." },
    schema: [],
    messages: {
      regulatedColumn: "selects regulated {{name}} outside {{owner}}'s infra/: return a DTO without it.",
      regulatedStar: 'selects * over {{name}}, which holds regulated columns: name the columns.',
    },
  },
  create(context) {
    const file = fileOf(context);
    const check = (node) => {
      const sql = sqlText(node);
      if (!sql || !/\bSELECT\b/i.test(sql)) return;
      const refs = tableRefs(sql).filter((r) => r.table in REGULATED_COLUMNS);
      if (refs.length === 0) return;
      const reported = new Set();
      const report = (messageId, name) => {
        if (reported.has(name)) return;
        reported.add(name);
        context.report({ node, messageId, data: { name, owner: TABLE_OWNERS.get(name.replace(/\..*/, '')) } });
      };
      for (const table of starTables(sql)) if (table in REGULATED_COLUMNS) report('regulatedStar', table);
      for (const r of refs) {
        if (sql.match(new RegExp(`(?:^|[^\\w"])"?${r.alias}"?\\.\\*`))) report('regulatedStar', r.table);
      }
      for (const r of refs) {
        if (file.infra && file.module === TABLE_OWNERS.get(r.table)) continue;
        const columns = REGULATED_COLUMNS[r.table];
        if (columns === null) report('regulatedColumn', r.table);
        else for (const c of columns) if (new RegExp(`(?<![\\w$])"?${c}"?(?![\\w$])`).test(sql)) report('regulatedColumn', `${r.table}.${c}`);
      }
    };
    return { Literal: check, TemplateLiteral: check };
  },
};

export default {
  meta: { name: 'tezg' },
  rules: { 'error-owner': errorOwner, 'table-owner': tableOwner, 'regulated-select': regulatedSelect },
};
