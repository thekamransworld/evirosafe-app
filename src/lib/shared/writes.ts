// Generic building blocks for turning decisions into Firestore writes. Pure: no Firebase. Shared by every
// module (permits, actions, ...). Server time and Firestore timestamps are represented by sentinels, which
// the service layer swaps for the real thing (and the rules simulator swaps for simulated values), so what
// is tested is what is written.

// ─── Sentinels ────────────────────────────────────────────────────────────

export interface ServerTimeSentinel { __sentinel: 'serverTimestamp' }
export interface TimestampSentinel { __sentinel: 'timestamp'; ms: number }
export interface DeleteSentinel { __sentinel: 'deleteField' }
export type Sentinel = ServerTimeSentinel | TimestampSentinel | DeleteSentinel;

export const SERVER_TIME: ServerTimeSentinel = { __sentinel: 'serverTimestamp' };
export const DELETE_FIELD: DeleteSentinel = { __sentinel: 'deleteField' };
export const tsMarker = (ms: number): TimestampSentinel => ({ __sentinel: 'timestamp', ms });

export function isSentinel(v: unknown): v is Sentinel {
  return !!v && typeof v === 'object' && typeof (v as any).__sentinel === 'string';
}

/** Deep-maps every sentinel through `resolve`, leaving everything else as is. */
export function resolveSentinels<T>(value: T, resolve: (s: Sentinel) => unknown): T {
  if (isSentinel(value)) return resolve(value) as T;
  if (Array.isArray(value)) return value.map(v => resolveSentinels(v, resolve)) as unknown as T;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = resolveSentinels(v, resolve);
    return out as T;
  }
  return value;
}

// ─── Leaf-level diff and three-way merge ──────────────────────────────────

// ─── Content edits ────────────────────────────────────────────────────────

export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const isPlain = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
/** Keys that are safe inside a Firestore dotted field path. Anything else is written as a whole object. */
const safeKey = (k: string) => /^[A-Za-z0-9_]+$/.test(k);

function diffInto(out: Record<string, unknown>, path: string, before: any, after: any, allowDelete: boolean) {
  if (same(after, before)) return;
  if (isPlain(after) && isPlain(before) && [...Object.keys(after), ...Object.keys(before)].every(safeKey)) {
    for (const k of Object.keys(after)) diffInto(out, `${path}.${k}`, before[k], after[k], allowDelete);
    if (allowDelete) for (const k of Object.keys(before)) if (!(k in after)) out[`${path}.${k}`] = DELETE_FIELD;
    return;
  }
  out[path] = after;
}

/**
 * What the editor changed, as dotted field paths (`payload.work.location`), LEAF by leaf, so two
 * people editing different fields of the same section cannot overwrite each other. Lists are
 * written whole (see planContentWrite, which rebases appended rows onto the server's list).
 */
export function diffSection(prefix: string, before: any, after: any, allowDelete = true): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const b = before ?? {}, a = after ?? {};
  for (const k of Object.keys(a)) diffInto(out, `${prefix}.${k}`, b[k], a[k], allowDelete);
  // A section missing from `after` is only a deletion if the editor demonstrably HAD it
  // (compared with what they loaded). Against the live copy it just means their screen is stale.
  if (allowDelete) for (const k of Object.keys(b)) if (!(k in a)) out[`${prefix}.${k}`] = DELETE_FIELD;
  return out;
}
export const isPrefix = (prefix: any[], list: any[]) => prefix.length <= list.length && prefix.every((x, i) => same(x, list[i]));

/**
 * Three-way merge of the edit form: `base` is what the editor loaded, `local` what they have typed,
 * `remote` what is saved now. Whatever they did not touch follows the saved version; whatever
 * they did touch is kept; both appending to the same list keeps both sets of rows. Only when both
 * changed the very same value does the editor's win (on screen, and on save).
 */
export function mergeThreeWay(base: any, local: any, remote: any): any {
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  if (isPlain(local) && isPlain(remote) && (base === undefined || isPlain(base))) {
    const keys = Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]));
    const out: Record<string, any> = {};
    for (const k of keys) {
      const v = mergeThreeWay(base?.[k], local[k], remote[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  if (Array.isArray(local) && Array.isArray(remote) && Array.isArray(base) && isPrefix(base, local) && isPrefix(base, remote)) {
    return [...remote, ...local.slice(base.length)];
  }
  return local;
}

export const getAt = (obj: any, path: string[]) => path.reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);

// ─── Applying updates (used by tests and the rules simulator) ─────────────

// ─── Applying updates (used by tests and the rules simulator) ─────────────

/** Firestore `updateDoc` semantics: dotted keys set nested fields; other keys replace. */
export function applyUpdate(doc: Record<string, any>, updates: Record<string, unknown>, resolve: (s: Sentinel) => unknown): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(doc)) out[k] = cloneKeep(doc[k]);
  for (const [path, raw] of Object.entries(updates)) {
    const parts = path.split('.');
    let cur: any = out;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] === undefined || cur[parts[i]] === null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (isSentinel(raw) && raw.__sentinel === 'deleteField') delete cur[last];
    else cur[last] = resolveSentinels(raw, resolve);
  }
  return out;
}

function cloneKeep(v: any): any {
  if (Array.isArray(v)) return v.map(cloneKeep);
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const o: Record<string, any> = {};
    for (const [k, x] of Object.entries(v)) o[k] = cloneKeep(x);
    return o;
  }
  return v;
}
