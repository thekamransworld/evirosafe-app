// An in-memory stand-in for the parts of firebase/firestore that ptwService
// uses. Every write is judged by the GENERATED PTW rules (via the rules
// interpreter) before it is applied, so the service code runs against the
// same rules the database will use.
import { Ts, World, type Op } from './rulesSim';
import { applyUpdate, resolveSentinels, type Sentinel } from '../../src/lib/ptw/writes';

export const Timestamp = { fromMillis: (ms: number) => new Ts(ms) };
export const serverTimestamp = () => ({ __sentinel: 'serverTimestamp' as const });
export const deleteField = () => ({ __sentinel: 'deleteField' as const });

/** Test control panel: set `world`, `uid` and `serverNow` before calling the service. */
export const fake = {
  world: null as unknown as World,
  uid: null as string | null,
  serverNow: 0,
  notifications: [] as any[],
  lastDenied: null as null | { path: string; why: string },
  commits: 0,
  autoId: 0,
};

interface Ref { path: string; id: string; kind: 'doc' | 'col' }
const docRef = (path: string): Ref => ({ path, id: path.split('/').pop() as string, kind: 'doc' });

export function collection(_db: unknown, path: string): Ref { return { path: `/${path}`, id: path, kind: 'col' }; }
export function doc(parent: any, ...segs: string[]): Ref {
  if (parent && parent.kind === 'col') return docRef(`${parent.path}/auto${++fake.autoId}_${'x'.repeat(14)}`);
  return docRef('/' + segs.join('/'));
}

const snap = (r: Ref) => {
  const data = fake.world.docs[r.path];
  return { id: r.id, exists: () => data !== undefined, data: () => data };
};
export type DocumentSnapshot = ReturnType<typeof snap>;
export async function getDocFromServer(r: Ref) { return snap(r); }

export const where = (field: string, op: string, value: unknown) => ({ field, op, value });
export const query = (col: Ref, ...constraints: Array<{ field: string; op: string; value: unknown }>) => ({ col, constraints });
export async function getDocsFromServer(q: { col: Ref; constraints: Array<{ field: string; op: string; value: unknown }> }) {
  const prefix = `${q.col.path}/`;
  const docs = Object.entries(fake.world.docs)
    .filter(([path, data]) => path.startsWith(prefix) && q.constraints.every(c => {
      if (c.op !== '==') throw new Error(`fake firestore: operator ${c.op} not supported`);
      return (data as any)[c.field] === c.value;
    }))
    .map(([path, data]) => ({ id: path.split('/').pop() as string, data: () => data }));
  return { docs, empty: docs.length === 0, size: docs.length };
}

const resolveFake = (s: Sentinel) => (s.__sentinel === 'serverTimestamp' ? new Ts(fake.serverNow) : undefined);

function deepMerge(base: any, patch: any): any {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch) || patch instanceof Ts) return patch;
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(out[k], v);
  return out;
}

type Queued = { kind: 'set' | 'update' | 'delete'; ref: Ref; data?: any; merge?: boolean };

function denied(): Error {
  return Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
}

function commit(queue: Queued[]) {
  if (queue.length === 0) return; // a transaction that only read writes nothing
  // Work out each document's post-write state, in order, so later ops see earlier ones.
  const ops: Op[] = [];
  const staged: Record<string, any> = { ...fake.world.docs };
  for (const q of queue) {
    const before = staged[q.ref.path];
    if (q.kind === 'delete') { ops.push({ kind: 'delete', path: q.ref.path }); delete staged[q.ref.path]; continue; }
    if (q.kind === 'update') {
      if (before === undefined) throw Object.assign(new Error('No document to update'), { code: 'not-found' });
      const after = applyUpdate(before, q.data, resolveFake);
      ops.push({ kind: 'update', path: q.ref.path, data: after }); staged[q.ref.path] = after; continue;
    }
    const resolved = resolveSentinels(q.data, resolveFake);
    const after = q.merge && before !== undefined ? deepMerge(before, resolved) : resolved;
    ops.push({ kind: 'set', path: q.ref.path, data: after }); staged[q.ref.path] = after;
  }
  fake.commits++;
  const res = fake.world.commit(fake.uid, ops, fake.serverNow);
  if (res.ok === false) { fake.lastDenied = { path: res.op.path, why: res.why }; throw denied(); }
}

export function writeBatch(_db: unknown) {
  const queue: Queued[] = [];
  return {
    update: (ref: Ref, data: any) => { queue.push({ kind: 'update', ref, data }); },
    set: (ref: Ref, data: any, opts?: { merge?: boolean }) => { queue.push({ kind: 'set', ref, data, merge: opts?.merge }); },
    delete: (ref: Ref) => { queue.push({ kind: 'delete', ref }); },
    commit: async () => commit(queue),
  };
}

export async function runTransaction<T>(_db: unknown, fn: (tx: any) => Promise<T>): Promise<T> {
  const queue: Queued[] = [];
  const tx = {
    get: async (ref: Ref) => snap(ref),
    update: (ref: Ref, data: any) => { queue.push({ kind: 'update', ref, data }); },
    set: (ref: Ref, data: any, opts?: { merge?: boolean }) => { queue.push({ kind: 'set', ref, data, merge: opts?.merge }); },
    delete: (ref: Ref) => { queue.push({ kind: 'delete', ref }); },
  };
  const out = await fn(tx);
  commit(queue);
  return out;
}

/** Notifications are not part of the PTW rules; record them so tests can inspect what would be written. */
export async function addDoc(col: Ref, data: any) {
  if (col.id === 'notifications') fake.notifications.push(data);
  return docRef(`${col.path}/n${fake.notifications.length}`);
}
