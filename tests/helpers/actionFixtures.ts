// Fixtures for the actions tests: a valid new action, and helpers that make an action or take a step the way the
// app does (engine decision -> write plan -> sentinels resolved -> committed against the generated rules).
import type { World } from './rulesSim';
import { P, resolver, T0, DAY, H, MIN, newWorld, type Person } from './ptwFixtures';
import { buildNewAction, planTransitionWrite } from '../../src/lib/actions/writes';
import { prepareTransition, type NewActionInput, type Reschedule } from '../../src/lib/actions/engine';
import type { ActionId } from '../../src/lib/actions/model';
import { applyUpdate, resolveSentinels } from '../../src/lib/shared/writes';

export { P, resolver, T0, DAY, H, MIN, newWorld };
export type { Person };

export interface Clock { now: number }

export const sample = (over: Partial<NewActionInput> = {}): NewActionInput => ({
  project_id: 'proj',
  title: 'Replace damaged guard rail',
  description: 'Level 3 east stairwell',
  kind: 'corrective',
  priority: 'high',
  owner_id: P.worker.id,
  due_date: '2026-11-21',
  source: { type: 'incident', id: 'rep_1', ref: 'Near miss 2026-11-10' },
  ...over,
});

let seq = 0;
export const actor = (p: Person) => ({ id: p.id, name: p.name, role: p.role });

/** Creates an action exactly as the service does: the counter and the action in ONE commit. */
export function createAction(
  w: World, who: Person, clk: Clock, over: Partial<NewActionInput> = {},
  tweak?: (action: Record<string, any>, counter: Record<string, any>) => void,
) {
  const year = new Date(clk.now).getUTCFullYear();
  const counterPath = `/counters/act_${who.org}_${year}`;
  const existing = w.docs[counterPath];
  const n = (existing ? existing.value : 0) + 1;
  const built = buildNewAction({ orgId: who.org, actor: actor(who), input: sample(over), year, n, now: clk.now });
  const action = built.action as Record<string, any>;
  const counter = { ...built.counter } as Record<string, any>;
  tweak?.(action, counter);
  const id = `a${++seq}`;
  const ops = [
    existing ? { kind: 'update' as const, path: counterPath, data: { ...existing, ...counter } } : { kind: 'set' as const, path: counterPath, data: counter },
    { kind: 'set' as const, path: `/actions/${id}`, data: resolveSentinels(action, resolver(clk.now)) },
  ];
  return { id, counterPath, commit: w.commit(who.uid, ops, clk.now) };
}

export interface StepOpts {
  note?: string;
  justification?: string;
  changes?: Reschedule;
  /** Change the finished document before it is committed (to forge a write). */
  tweak?: (after: Record<string, any>) => void;
}

/** Takes a step through the engine and commits the plan. `engine.ok === false` means the app would not even try. */
export function stepAction(w: World, who: Person, id: string, step: ActionId, clk: Clock, o: StepOpts = {}) {
  const before = w.docs[`/actions/${id}`];
  const r = prepareTransition({
    action: { ...before, id }, step, actor: actor(who), now: clk.now,
    note: o.note ?? 'Done as planned and checked', justification: o.justification, changes: o.changes,
  });
  if (r.ok === false) return { engine: r, commit: null as null };
  const plan = planTransitionWrite({ ...before, id }, r);
  const after = applyUpdate(before, plan.update, resolver(clk.now)) as Record<string, any>;
  o.tweak?.(after);
  return { engine: r, commit: w.commit(who.uid, [{ kind: 'update', path: `/actions/${id}`, data: after }], clk.now) };
}

/** A world with one action in a given stage, made by walking the real route so every field is genuine. */
export function actionInStage(stage: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED') {
  const w = newWorld();
  const clk: Clock = { now: T0 };
  const c = createAction(w, P.creator, clk, { owner_id: P.worker.id });
  if (c.commit.ok !== true) throw new Error('fixture: create refused: ' + (c.commit as any).why);
  const go = (who: Person, step: ActionId, o: StepOpts = {}) => {
    clk.now += 10 * MIN;
    const r = stepAction(w, who, c.id, step, clk, o);
    if (!r.commit || r.commit.ok !== true) throw new Error(`fixture: ${step} refused: ${r.commit ? (r.commit as any).why : (r.engine as any).reason}`);
  };
  if (stage === 'IN_PROGRESS') go(P.worker, 'start');
  if (stage === 'COMPLETED') go(P.worker, 'complete');
  if (stage === 'CLOSED') { go(P.worker, 'complete'); go(P.reviewer, 'verify'); }
  if (stage === 'CANCELLED') go(P.approver, 'cancel');
  return { w, clk, id: c.id };
}

export const ALL_ROLES = [
  'ADMIN', 'ORG_ADMIN', 'HSE_MANAGER', 'HSE_OFFICER', 'SUPERVISOR', 'INSPECTOR', 'WORKER', 'CLIENT_VIEWER', 'CUSTOM_SITE_LEAD',
] as const;
