// Turns engine decisions into the exact documents / field updates to write.
// Pure: no Firebase. Server time and Firestore timestamps are represented by
// sentinels, which the service layer swaps for the real thing (and the rules
// simulator swaps for simulated values), so what is tested is what is written.


import { formatPermitNo } from './numbering';
import type { EnginePermit, LogEntry, TransitionResult } from './engine';
import type { ActorLike } from './engine';
import type { PermitType } from './model';
import {
  DELETE_FIELD, SERVER_TIME, applyUpdate, diffSection, getAt, isPrefix, resolveSentinels, same, tsMarker,
  type Sentinel,
} from '../shared/writes';

// The generic helpers moved to src/lib/shared/writes.ts; re-exported so existing imports keep working.
export {
  DELETE_FIELD, SERVER_TIME, applyUpdate, isSentinel, mergeThreeWay, resolveSentinels, same, tsMarker,
} from '../shared/writes';
export type { DeleteSentinel, Sentinel, ServerTimeSentinel, TimestampSentinel } from '../shared/writes';


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

/** What the editor changed in the payload, as dotted field paths (`payload.work.location`), LEAF by leaf. */
export function diffPayload(before: any, after: any, allowDelete = true): Record<string, unknown> {
  return diffSection('payload', before, after, allowDelete);
}


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
