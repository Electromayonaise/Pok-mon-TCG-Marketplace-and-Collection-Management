// R-14: every service receives one `repo` object, so one composition serves every module.
// Each module adapter keeps its own class (AD-8); this binds their methods onto one object.

type Merged<T extends readonly object[]> = T extends readonly [infer Head, ...infer Rest extends readonly object[]] ? Head & Merged<Rest> : unknown;

/** The methods of an adapter's class chain, excluding `Object.prototype` and constructors. */
function methodNames(adapter: object): string[] {
  const names = new Set<string>();
  for (let proto = Object.getPrototypeOf(adapter); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== 'constructor' && typeof (adapter as Record<string, unknown>)[name] === 'function') names.add(name);
    }
  }
  return [...names];
}

/**
 * One repository object with every adapter's methods bound to its instance. A method name two
 * adapters both define throws here, at wiring time, instead of one silently shadowing the other.
 */
export function oneRepository<const T extends readonly object[]>(...adapters: T): Merged<T> {
  const repo: Record<string, unknown> = {};
  for (const adapter of adapters) {
    for (const name of methodNames(adapter)) {
      if (Object.hasOwn(repo, name)) throw new Error(`oneRepository: two adapters define ${name}`);
      repo[name] = ((adapter as Record<string, unknown>)[name] as (...args: unknown[]) => unknown).bind(adapter);
    }
  }
  return repo as Merged<T>;
}
