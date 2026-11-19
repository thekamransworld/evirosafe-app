// Turns engine decisions into the exact documents / field updates to write.
// Pure: no Firebase. Server time and Firestore timestamps are represented by
// sentinels, which the service layer swaps for the real thing (and the rules
// simulator swaps for simulated values), so what is tested is what is written.

import { formatPermitNo } from './numbering';
import type { EnginePermit, LogEntry, TransitionResult } from './engine';
import type { ActorLike } from './engine';
import type { PermitType } from './model';

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

// ─── Public token ─────────────────────────────────────────────────────────

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; // no look-alikes

/** 24 random characters (~139 bits). `randomBytes` is injected so tests are deterministic. */
export function generatePublicToken(randomBytes: (n: number) => Uint8Array): string {
  let out = '';
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % TOKEN_ALPHABET.length);
  while (out.length < 24) {
    for (const b of Array.from(randomBytes(32))) {
      if (b < limit && out.length < 24) out += TOKEN_ALPHABET[b % TOKEN_ALPHABET.length];
    }
  }
  return out;
}

// ─── Creation ─────────────────────────────────────────────────────────────

export interface NewPermitInput {
  orgId: string;
  projectId: string;
  type: PermitType;
  title: string;
  payload: any;
  creator: ActorLike;
  receiverId?: string;
  /** Local calendar year of `now`: the permit number's year. */
  year: number;
  /** The NEW counter value for (org, year): this permit's sequence number. */
  n: number;
  token: string;
  now: number;
}

export interface NewPermitDocs {
  permit: Record<string, any>;
  mirror: Record<string, any>;
  counter: { org_id: string; year: number; value: number };
}

const iso = (ms: number) => new Date(ms).toISOString();

export function mirrorFor(permitId: string, p: Record<string, any>): Record<string, any> {
  const loc = String(p.payload?.work?.location ?? '').slice(0, 200);
  const m: Record<string, any> = {
    token: p.public_token,
    permit_id: permitId,
    org_id: p.org_id,
    permit_no: p.permit_no,
    type: p.type,
    status: p.status,
    location: loc,
    updated_at: p.updated_at,
  };
  if (p.valid_from) m.valid_from = p.valid_from;
  if (p.valid_until) m.valid_until = p.valid_until;
  if (p.valid_until_ts) m.valid_until_ts = p.valid_until_ts;
  return m;
}

export function buildNewPermit(permitId: string, i: NewPermitInput): NewPermitDocs {
  const log = {
    stage: 'DRAFT', from: 'DRAFT', action: 'create',
    user_id: i.creator.id, user_name: i.creator.name || i.creator.id, role: i.creator.role,
    timestamp: iso(i.now),
  };
  const permit: Record<string, any> = {
    org_id: i.orgId,
    project_id: i.projectId,
    type: i.type,
    status: 'DRAFT',
    title: i.title,
    payload: i.payload,
    approvals: [],
    audit_log: [],
    updated_at: iso(i.now),
    workflow_log: [log],
    permit_no: formatPermitNo(i.year, i.n),
    permit_year: i.year,
    public_token: i.token,
    creator_id: i.creator.id,
    last_transition_at: SERVER_TIME,
    stage_times: { DRAFT: SERVER_TIME },
    signatures: {},
    extensions: [],
  };
  if (i.receiverId) permit.receiver_id = i.receiverId;
  return {
    permit,
    mirror: mirrorFor(permitId, permit),
    counter: { org_id: i.orgId, year: i.year, value: i.n },
  };
}

// ─── Transitions ──────────────────────────────────────────────────────────

export interface TransitionWrite {
  /** Dotted-path updates for ptws/{id}. */
  permit: Record<string, unknown>;
  /** Merge-set for ptw_public/{token}. */
  mirror: Record<string, unknown>;
}

type OkTransition = Extract<TransitionResult, { ok: true }>;

export function planTransitionWrite(permit: EnginePermit, result: OkTransition): TransitionWrite {
  const upd: Record<string, unknown> = { ...result.patch };
  upd.workflow_log = [...((permit as any).workflow_log ?? []), result.log as LogEntry];
  upd.last_transition_at = SERVER_TIME;
  upd[`stage_times.${result.to}`] = SERVER_TIME;
  upd.updated_at = result.log.timestamp;
  if (result.validity) {
    // Activation stamps server time; revalidation (no `from`) keeps the original start.
    if (result.validity.from !== undefined) {
      upd.valid_from_ts = SERVER_TIME;
      upd.first_activated_ts = SERVER_TIME;
    }
    upd.valid_until_ts = tsMarker(result.validity.until);
  }
  const mirror: Record<string, unknown> = { status: result.to, updated_at: result.log.timestamp };
  if (result.validity) {
    if (typeof result.patch.valid_from === 'string') mirror.valid_from = result.patch.valid_from;
    if (typeof result.patch.valid_until === 'string') mirror.valid_until = result.patch.valid_until;
    mirror.valid_until_ts = tsMarker(result.validity.until);
  }
  return { permit: upd, mirror };
}

// ─── Content edits ────────────────────────────────────────────────────────

export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const isPlain = (v: unknown): v is Record<string, any> =>
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
export function diffPayload(before: any, after: any, allowDelete = true): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const b = before ?? {}, a = after ?? {};
  for (const k of Object.keys(a)) diffInto(out, `payload.${k}`, b[k], a[k], allowDelete);
  // A section missing from `after` is only a deletion if the editor demonstrably HAD it
  // (compared with what they loaded). Against the live copy it just means their screen is stale.
  if (allowDelete) for (const k of Object.keys(b)) if (!(k in a)) out[`payload.${k}`] = DELETE_FIELD;
  return out;
}

const isPrefix = (prefix: any[], list: any[]) => prefix.length <= list.length && prefix.every((x, i) => same(x, list[i]));

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

const getAt = (obj: any, path: string[]) => path.reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);

export interface ContentWrite {
  permit: Record<string, unknown>;
  /** Set only when the location shown on the public page changed. */
  mirror?: Record<string, unknown>;
  changed: boolean;
}

/**
 * @param base the payload the editor LOADED. Only sections the editor changed
 *             relative to it are written, so a stale copy cannot revert a
 *             section somebody else saved in the meantime. Defaults to the
 *             current payload.
 */
export function planContentWrite(
  permit: EnginePermit,
  next: { payload?: any; title?: string; receiver_id?: string },
  now: number,
  base?: any,
): ContentWrite {
  const upd: Record<string, unknown> = {};
  if (next.payload !== undefined) {
    const changes = diffPayload(base ?? permit.payload, next.payload, base !== undefined);
    // A list the editor only APPENDED to (a new gas test, a new person in the entry log) is
    // rebased onto the list as saved NOW, so a row somebody else added meanwhile is not lost.
    if (base !== undefined) {
      for (const [path, v] of Object.entries(changes)) {
        const keys = path.split('.').slice(1);
        // A list the editor's screen did not have at all counts as empty: its first rows are appends too.
        const was = getAt(base, keys) ?? [], saved = getAt(permit.payload, keys);
        if (Array.isArray(v) && Array.isArray(was) && Array.isArray(saved) && isPrefix(was, v) && !same(saved, was)) {
          const appended = v.slice(was.length);
          changes[path] = appended.every(r => saved.some((s: any) => same(s, r))) ? saved : [...saved, ...appended];
        }
      }
    }
    Object.assign(upd, changes);
  }
  if (next.title !== undefined && next.title !== permit.title) upd.title = next.title;
  if (next.receiver_id !== undefined && next.receiver_id !== permit.receiver_id) upd.receiver_id = next.receiver_id;
  if (Object.keys(upd).length === 0) return { permit: {}, changed: false };
  upd.updated_at = iso(now);

  const merged = applyUpdate(permit as any, upd, () => undefined);
  const oldLoc = String(permit.payload?.work?.location ?? '').slice(0, 200);
  const newLoc = String(merged.payload?.work?.location ?? '').slice(0, 200);
  const mirror = oldLoc !== newLoc ? { location: newLoc, updated_at: iso(now) } : undefined;
  return { permit: upd, ...(mirror ? { mirror } : {}), changed: true };
}

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
