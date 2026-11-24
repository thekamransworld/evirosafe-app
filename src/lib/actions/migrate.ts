// The one-off import of the three old stores into the new `actions` documents:
//   actions             the Action Tracker's standalone actions   (status Open / In Progress / Closed)
//   corrective_actions  the CAR register                           (CAR-YYYY-NNNN, its own statuses)
//   reports[].capa[]    the corrective / preventive items embedded in every incident report
//
// Pure: no Firebase, no clock. scripts/migrate-actions.mjs reads the old data, calls planImport (a DRY RUN by
// default: it only reports), and with --apply writes each document in its own transaction.
//
// Safe by construction:
//   * Old documents are never changed or deleted. Their content is copied.
//   * Each new document has a deterministic id (imp_act_<id>, imp_car_<id>, imp_capa_<report>_<n>), so a
//     second run finds them and skips them. It can be stopped and resumed at any point.
//   * The old record is kept whole in `legacy`, and the history says plainly "Imported from ...".
//   * Nothing is invented: a missing owner stays missing, a missing due date is reported, a status that is not
//     understood is reported and imported as OPEN.

import { formatNumber } from '../shared/counters';
import { SERVER_TIME } from '../shared/writes';
import { isValidDate, type ActionSource, type ActorLike, type CarSection } from './engine';
import {
  KINDS, MAX, PRIORITIES, STAGES, type ImportSource, type Kind, type Priority, type Stage,
} from './model';

export const LEGACY_ACTION_STATUS: Record<string, Stage> = { Open: 'OPEN', 'In Progress': 'IN_PROGRESS', Closed: 'CLOSED' };
export const LEGACY_CAR_STATUS: Record<string, Stage> = {
  open: 'OPEN', in_progress: 'IN_PROGRESS', completed: 'COMPLETED', verified: 'CLOSED',
  // "overdue" was a stored flag; it is now computed from the due date, so the work itself is still open.
  overdue: 'OPEN', cancelled: 'CANCELLED',
};
const LEGACY_SOURCE_TYPE: Record<string, ActionSource['type']> = {
  incident: 'incident', audit: 'audit', inspection: 'inspection', observation: 'observation', management: 'manual',
  Report: 'incident', Inspection: 'inspection', Audit: 'audit', Standalone: 'manual',
};

export interface ImportContext {
  orgId: string;
  importer: ActorLike;
  /** Today, YYYY-MM-DD: stands in for a missing or invalid due date (and is reported). */
  today: string;
  /** Where to put an action that has no project of its own. Without it such actions are visible to administrators only. */
  defaultProjectId?: string;
  /** Incident report id -> its project, to place corrective actions that came from an incident. */
  reportProjects?: Record<string, string>;
}

export interface ImportFields {
  project_id?: string;
  title: string;
  description?: string;
  kind: Kind;
  priority: Priority;
  status: Stage;
  owner_id: string;
  creator_id: string;
  due_date: string;
  source: ActionSource;
  car?: CarSection;
  /** The old record, kept whole. */
  legacy: Record<string, unknown>;
}

export interface ImportCandidate {
  /** Deterministic document id. */
  id: string;
  source: ImportSource;
  /** A readable pointer to the old record, e.g. "corrective_actions/abc123 (CAR-2026-4821)". */
  ref: string;
  fields: ImportFields;
  warnings: string[];
  /** Oldest first, so the new numbers follow the order things were raised. */
  sortKey: string;
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** A JSON-safe copy of an old record: timestamps become ISO strings, undefined and functions are dropped. */
export function plain(v: unknown, depth = 0): unknown {
  if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (v === undefined || typeof v === 'function' || depth > 4) return undefined;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? undefined : v.toISOString();
  const t = v as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === 'function') return plain(t.toDate(), depth);
  if (typeof t.seconds === 'number' && Object.keys(v as object).length <= 3) return new Date(t.seconds * 1000).toISOString();
  if (Array.isArray(v)) return v.map(x => plain(x, depth + 1)).filter(x => x !== undefined);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as object)) {
      const p = plain(x, depth + 1);
      if (p !== undefined) out[k] = p;
    }
    return out;
  }
  return undefined;
}

function priorityOf(raw: unknown, warnings: string[]): Priority {
  const p = str(raw).toLowerCase();
  if ((PRIORITIES as readonly string[]).includes(p)) return p as Priority;
  if (p) warnings.push(`priority "${raw}" not understood: imported as medium`);
  return 'medium';
}

function kindOf(raw: unknown, warnings: string[]): Kind {
  const k = str(raw).toLowerCase();
  if ((KINDS as readonly string[]).includes(k)) return k as Kind;
  if (k) warnings.push(`type "${raw}" not understood: imported as corrective`);
  return 'corrective';
}

function dueDateOf(raw: unknown, ctx: ImportContext, warnings: string[]): string {
  const s = str(raw);
  if (isValidDate(s)) return s;
  const head = s.slice(0, 10);
  if (isValidDate(head)) return head;
  warnings.push(s ? `due date "${s}" is not a date: set to the import date` : 'no due date: set to the import date');
  return ctx.today;
}

/**
 * A title of at most MAX.title characters. When the text does not fit on one short line, the whole text goes to
 * the description so nothing is lost; otherwise the description is the extra text (if any).
 */
function titleAndDescription(text: string, extra: string, warnings: string[]): { title: string; description?: string } {
  const firstLine = (text.split('\n')[0] || '').trim();
  const title = firstLine.length > MAX.title ? `${firstLine.slice(0, MAX.title - 3)}...` : firstLine || 'Untitled action';
  if (!firstLine) warnings.push('no text: titled "Untitled action"');
  const titleHoldsAll = !text.includes('\n') && text.trim().length <= MAX.title;
  let description = (titleHoldsAll ? extra : [text, extra].filter(Boolean).join('\n\n')).trim();
  if (description.length > MAX.description) {
    description = description.slice(0, MAX.description - 20) + '\n[shortened by import]';
    warnings.push(`text longer than ${MAX.description} characters: shortened in the description (the full text is in the old record)`);
  }
  return { title, ...(description ? { description } : {}) };
}

function statusOf(table: Record<string, Stage>, raw: unknown, warnings: string[]): Stage {
  const s = table[str(raw)];
  if (s) return s;
  warnings.push(`status "${raw}" not understood: imported as OPEN`);
  return 'OPEN';
}

function projectOf(own: unknown, ctx: ImportContext, warnings: string[]): string | undefined {
  const p = str(own);
  if (p && p !== 'all') return p;
  if (ctx.defaultProjectId) return ctx.defaultProjectId;
  warnings.push('no project: only administrators will see it until a project is chosen');
  return undefined;
}

const sourceOf = (rawType: unknown, rawId: unknown, ref: string, item: string | undefined, warnings: string[]): ActionSource => {
  const type = LEGACY_SOURCE_TYPE[str(rawType)] ?? 'manual';
  const id = str(rawId);
  if (type !== 'manual' && !id) {
    warnings.push(`was linked to a ${str(rawType) || 'source'} but has no reference: imported as raised directly`);
    return { type: 'manual', ...(ref ? { ref: ref.slice(0, MAX.ref) } : {}) };
  }
  return { type, ...(type !== 'manual' ? { id: id.slice(0, MAX.id) } : {}), ...(ref ? { ref: ref.slice(0, MAX.ref) } : {}), ...(item ? { item } : {}) };
};

// ─── the three mappers ────────────────────────────────────────────────────

/** An Action Tracker document (collection `actions`, made before the rebuild). */
export function mapStandaloneAction(raw: Record<string, any>, ctx: ImportContext): ImportCandidate | null {
  const id = str(raw.id);
  if (!id || raw.number) return null; // not an old action
  const warnings: string[] = [];
  const t = titleAndDescription(str(raw.action), '', warnings);
  const ref = `actions/${id}`;
  return {
    id: `imp_act_${id}`.slice(0, 104),
    source: 'actions',
    ref,
    sortKey: str(raw.created_at) || str(raw.due_date),
    warnings,
    fields: {
      project_id: projectOf(raw.project_id, ctx, warnings),
      ...t,
      kind: 'corrective',
      priority: priorityOf(raw.priority, warnings),
      status: statusOf(LEGACY_ACTION_STATUS, raw.status, warnings),
      owner_id: str(raw.owner_id).slice(0, MAX.id),
      creator_id: ctx.importer.id,
      due_date: dueDateOf(raw.due_date, ctx, warnings),
      source: sourceOf(raw.source?.type, raw.source?.id, str(raw.source?.description), undefined, warnings),
      legacy: { collection: 'actions', id, status: raw.status, record: plain(raw) },
    },
  };
}

/** A CAR register document (collection `corrective_actions`). */
export function mapCorrectiveAction(raw: Record<string, any>, ctx: ImportContext): ImportCandidate | null {
  const id = str(raw.id);
  if (!id) return null;
  const warnings: string[] = [];
  const carNo = str(raw.car_number);
  const t = titleAndDescription(str(raw.title), str(raw.description), warnings);
  const ref = `corrective_actions/${id}${carNo ? ` (${carNo})` : ''}`;
  const src = str(raw.source);
  const srcRef = str(raw.source_ref);
  const fromReport = src === 'incident' && srcRef ? ctx.reportProjects?.[srcRef] : undefined;
  return {
    id: `imp_car_${id}`.slice(0, 104),
    source: 'corrective_actions',
    ref,
    sortKey: str(raw.created_at),
    warnings,
    fields: {
      project_id: fromReport ?? projectOf(raw.project_id, ctx, warnings),
      ...t,
      kind: kindOf(raw.action_type, warnings),
      priority: priorityOf(raw.priority, warnings),
      status: statusOf(LEGACY_CAR_STATUS, raw.status, warnings),
      owner_id: str(raw.assigned_to).slice(0, MAX.id),
      creator_id: str(raw.assigned_by) || ctx.importer.id,
      due_date: dueDateOf(raw.target_date, ctx, warnings),
      source: sourceOf(src, srcRef, carNo || srcRef, undefined, warnings),
      legacy: {
        collection: 'corrective_actions', id, car_number: carNo, status: raw.status,
        completed_at: str(raw.completed_at), verified_by: str(raw.verified_by), verified_at: str(raw.verified_at),
        evidence: Array.isArray(raw.evidence) ? raw.evidence.filter((x: unknown) => typeof x === 'string') : [],
        notes: str(raw.notes), created_at: str(raw.created_at), updated_at: str(raw.updated_at),
      },
    },
  };
}

/** One item of an incident report's embedded capa[] array. */
export function mapCapaItem(report: Record<string, any>, index: number, ctx: ImportContext): ImportCandidate | null {
  const item = (report.capa ?? [])[index];
  const rid = str(report.id);
  if (!rid || !item || !str(item.action)) return null;
  const warnings: string[] = [];
  const t = titleAndDescription(str(item.action), '', warnings);
  const label = [str(report.type), str(report.occurred_at).slice(0, 10)].filter(Boolean).join(' ');
  const verified = str(item.verified_at);
  return {
    id: `imp_capa_${rid}_${index}`.slice(0, 104),
    source: 'report_capa',
    ref: `reports/${rid}/capa/${index}`,
    sortKey: str(report.created_at) || str(report.occurred_at),
    warnings,
    fields: {
      project_id: projectOf(report.project_id, ctx, warnings),
      ...t,
      kind: kindOf(item.type, warnings),
      priority: 'medium',
      status: statusOf(LEGACY_ACTION_STATUS, item.status, warnings),
      owner_id: str(item.owner_id).slice(0, MAX.id),
      creator_id: str(report.creator_id) || str(report.reporter_id) || ctx.importer.id,
      due_date: dueDateOf(item.due_date, ctx, warnings),
      source: { type: 'incident', id: rid.slice(0, MAX.id), ref: label.slice(0, MAX.ref), item: String(index) },
      legacy: {
        collection: 'reports', id: rid, capa_index: index, status: item.status,
        verified_at: verified, verified_by_id: str(item.verified_by_id),
      },
    },
  };
}

// ─── the plan ─────────────────────────────────────────────────────────────

export interface ImportSources {
  actions: Array<Record<string, any>>;
  corrective_actions: Array<Record<string, any>>;
  reports: Array<Record<string, any>>;
}

export interface ImportPlan {
  /** In numbering order, oldest first. */
  toCreate: ImportCandidate[];
  alreadyImported: number;
  skipped: Array<{ ref: string; reason: string }>;
  counts: Record<ImportSource, number>;
  /** Warnings per candidate, flattened for the report. */
  warnings: Array<{ ref: string; warning: string }>;
}

/**
 * @param existingIds ids already present in the `actions` collection (an earlier run, possibly interrupted)
 */
export function planImport(sources: ImportSources, existingIds: ReadonlySet<string>, ctx: ImportContext): ImportPlan {
  const all: ImportCandidate[] = [];
  const skipped: ImportPlan['skipped'] = [];

  for (const a of sources.actions) {
    if (a.number) continue; // already a new-format action, not legacy
    const c = mapStandaloneAction(a, ctx);
    if (c) all.push(c); else skipped.push({ ref: `actions/${a.id ?? '?'}`, reason: 'no id' });
  }
  for (const a of sources.corrective_actions) {
    const c = mapCorrectiveAction(a, ctx);
    if (c) all.push(c); else skipped.push({ ref: `corrective_actions/${a.id ?? '?'}`, reason: 'no id' });
  }
  for (const r of sources.reports) {
    const n = Array.isArray(r.capa) ? r.capa.length : 0;
    for (let i = 0; i < n; i++) {
      const c = mapCapaItem(r, i, ctx);
      if (c) all.push(c); else skipped.push({ ref: `reports/${r.id ?? '?'}/capa/${i}`, reason: 'no action text' });
    }
  }

  const toCreate = all
    .filter(c => !existingIds.has(c.id))
    .sort((a, b) => (a.sortKey || '￿').localeCompare(b.sortKey || '￿') || a.id.localeCompare(b.id));
  const counts = { actions: 0, corrective_actions: 0, report_capa: 0 } as Record<ImportSource, number>;
  for (const c of toCreate) counts[c.source]++;
  return {
    toCreate,
    alreadyImported: all.length - toCreate.length,
    skipped,
    counts,
    warnings: toCreate.flatMap(c => c.warnings.map(w => ({ ref: c.ref, warning: w }))),
  };
}

// ─── the document ─────────────────────────────────────────────────────────

const iso = (ms: number) => new Date(ms).toISOString();
export const IMPORT_ID_PATTERN = /^imp_[A-Za-z0-9_-]{1,100}$/;

/** The new action document for one candidate (server time as sentinels), and its counter value. */
export function buildImportAction(
  c: ImportCandidate,
  a: { orgId: string; importer: ActorLike; year: number; n: number; now: number },
): { action: Record<string, unknown>; counter: { org_id: string; year: number; value: number } } {
  const f = c.fields;
  if (!(STAGES as readonly string[]).includes(f.status)) throw new Error(`unknown status ${f.status}`);
  const action: Record<string, unknown> = {
    org_id: a.orgId,
    ...(f.project_id ? { project_id: f.project_id } : {}),
    number: formatNumber('act', a.year, a.n),
    action_year: a.year,
    title: f.title,
    ...(f.description ? { description: f.description } : {}),
    kind: f.kind,
    priority: f.priority,
    status: f.status,
    owner_id: f.owner_id,
    creator_id: f.creator_id,
    due_date: f.due_date,
    source: f.source,
    ...(f.car ? { car: f.car } : {}),
    imported: true,
    import_source: c.source,
    import_ref: c.ref.slice(0, 200),
    legacy: f.legacy,
    history: [{
      action: 'import', from: f.status, stage: f.status,
      user_id: a.importer.id, user_name: a.importer.name || a.importer.id, role: a.importer.role, timestamp: iso(a.now),
      note: `Imported from ${c.ref}`.slice(0, MAX.note),
    }],
    stage_times: { [f.status]: SERVER_TIME },
    last_transition_at: SERVER_TIME,
    created_at: SERVER_TIME,
    updated_at: SERVER_TIME,
  };
  return { action, counter: { org_id: a.orgId, year: a.year, value: a.n } };
}
