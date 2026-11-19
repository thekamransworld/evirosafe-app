// Everything the app needs to work with permits to work, in one place:
// who the person is (as the database sees them), live updates, create / act /
// save / delete, and the expiry sweep. The decisions live in src/lib/ptw; the
// Firestore calls in src/services/ptwService.ts. This hook only connects them
// to React state, and is used by DataProvider (src/contexts.tsx).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { Ptw, PtwPayload, TrainingCourse, TrainingRecord, User } from '../types';
import type { ActorLike, EnginePermit } from '../lib/ptw/engine';
import { ACTIONS, STAFF, type ActionId, type PermitType } from '../lib/ptw/model';
import type { CompetencyContext } from '../lib/ptw/competency';
import type { SimopsPermit } from '../lib/ptw/simops';
import type { NotifyUser } from '../lib/ptw/notify';
import { effectiveStatus } from '../lib/ptw/validity';
import {
  createPermit, deleteDraftPermit, expireIfDue, performTransition, savePermitContent,
  type CreateOutcome, type SaveOutcome, type TransitionOutcome,
} from '../services/ptwService';

export interface PtwToast { success(message: string): void; error(message: string): void }

export interface PtwControllerDeps {
  /** Firebase Auth uid of the signed-in person (null when signed out). */
  uid: string | null;
  ptwList: Ptw[];
  setPtwList: React.Dispatch<React.SetStateAction<Ptw[]>>;
  usersList: User[];
  trainingCourseList: TrainingCourse[];
  trainingRecordList: TrainingRecord[];
  toast: PtwToast;
}

export interface CreatePtwInput {
  project_id: string;
  type: PermitType;
  title: string;
  payload: PtwPayload | Record<string, any>;
  receiver_id?: string;
}

export interface TransitionOptions { note?: string; justification?: string; reauthenticated?: boolean }

export interface PtwController {
  /** The person as the DATABASE sees them (their login, not an impersonated user). Null until known. */
  ptwActor: ActorLike | null;
  /** The organisation permits are created in. */
  ptwOrgId: string | null;
  /** Training data and the project's other permits, for showing gate results on screen. */
  getPtwGateInputs: (permit: Ptw) => { others: SimopsPermit[]; competency: CompetencyContext };
  handleCreatePtw: (input: CreatePtwInput) => Promise<CreateOutcome>;
  handlePtwTransition: (permitId: string, action: ActionId, opts?: TransitionOptions) => Promise<TransitionOutcome>;
  handleUpdatePtw: (permitId: string, next: { payload?: PtwPayload | Record<string, any>; title?: string; receiver_id?: string }, base?: PtwPayload | Record<string, any>) => Promise<SaveOutcome>;
  handleDeletePtw: (id: string) => Promise<void>;
}

interface Identity { docId: string; orgId: string; role: string; projectIds: string[] }

const ADMIN_ROLES = ['ADMIN', 'ORG_ADMIN'];

export function usePtwController(d: PtwControllerDeps): PtwController {
  const { uid, ptwList, setPtwList, usersList, trainingCourseList, trainingRecordList, toast } = d;
  const [identity, setIdentity] = useState<Identity | null>(null);

  // ── who am I, as the database sees me ──────────────────────────────────
  // The rules read the role and user id from the users_by_uid pointer, so the
  // engine must use the same values or it would allow what the rules refuse.
  useEffect(() => {
    let cancelled = false;
    setIdentity(null);
    if (!uid) return;
    getDoc(doc(db, 'users_by_uid', uid))
      .then(snap => {
        if (cancelled || !snap.exists()) return;
        const p = snap.data() as { docId?: string; org_id?: string; role?: string | null; project_ids?: string[] };
        if (!p.docId || !p.org_id || !p.role) return;
        setIdentity({ docId: p.docId, orgId: p.org_id, role: p.role, projectIds: p.project_ids ?? [] });
      })
      .catch(e => console.error('PTW: could not read the user pointer:', e));
    return () => { cancelled = true; };
  }, [uid]);

  const ptwOrgId = useMemo(() => {
    if (!identity) return null;
    // An administrator can switch organisation (the same override the data loader honours).
    const override = identity.role === 'ADMIN' ? localStorage.getItem('adminActiveOrgId') : null;
    return override || identity.orgId;
  }, [identity]);

  const ptwActor = useMemo<ActorLike | null>(() => {
    if (!identity) return null;
    const me = usersList.find(u => u.id === identity.docId);
    return { id: identity.docId, name: me?.name || me?.email?.split('@')[0] || 'User', role: identity.role };
  }, [identity, usersList]);

  // ── live updates: a permit is a shared, time-critical document ──────────
  useEffect(() => {
    if (!identity || !ptwOrgId) return;
    const restricted = !ADMIN_ROLES.includes(identity.role);
    if (restricted && identity.projectIds.length === 0) return;
    const constraints = [where('org_id', '==', ptwOrgId)];
    if (restricted) constraints.push(where('project_id', 'in', identity.projectIds.slice(0, 30)));
    return onSnapshot(
      query(collection(db, 'ptws'), ...constraints),
      snap => setPtwList(snap.docs.map(s => ({ ...(s.data({ serverTimestamps: 'estimate' }) as object), id: s.id }) as unknown as Ptw)),
      err => console.error('PTW live updates stopped:', err),
    );
  }, [identity, ptwOrgId, setPtwList]);

  // ── people to notify ───────────────────────────────────────────────────
  const orgUsers = useMemo<NotifyUser[]>(
    () => usersList.map(u => ({ id: u.id, org_id: u.org_id, role: u.role, name: u.name, project_ids: u.project_ids, status: u.status })),
    [usersList],
  );

  const competency = useMemo<CompetencyContext>(
    () => ({ records: trainingRecordList, courses: trainingCourseList }),
    [trainingRecordList, trainingCourseList],
  );

  const getPtwGateInputs = useCallback(
    (permit: Ptw) => ({
      others: ptwList.filter(p => p.id !== permit.id && p.project_id === permit.project_id) as unknown as SimopsPermit[],
      competency,
    }),
    [ptwList, competency],
  );

  const replace = useCallback((permit: Ptw) => {
    setPtwList(prev => (prev.some(p => p.id === permit.id) ? prev.map(p => (p.id === permit.id ? permit : p)) : [permit, ...prev]));
  }, [setPtwList]);

  // ── create ─────────────────────────────────────────────────────────────
  const handleCreatePtw = useCallback(async (input: CreatePtwInput): Promise<CreateOutcome> => {
    if (!ptwActor || !ptwOrgId) {
      const reason = 'Your profile is still loading. Wait a moment and try again.';
      toast.error(reason);
      return { ok: false, reason };
    }
    const r = await createPermit({
      actor: ptwActor, orgId: ptwOrgId, projectId: input.project_id, type: input.type,
      title: input.title, payload: input.payload as PtwPayload, receiverId: input.receiver_id,
    });
    if (r.ok === true) { replace(r.permit); toast.success(`Permit ${r.permit.permit_no ?? ''} created as a draft.`.replace('  ', ' ')); }
    else toast.error(r.reason);
    return r;
  }, [ptwActor, ptwOrgId, replace, toast]);

  // ── act on a permit ────────────────────────────────────────────────────
  const handlePtwTransition = useCallback(async (permitId: string, action: ActionId, opts: TransitionOptions = {}): Promise<TransitionOutcome> => {
    if (!ptwActor) return { ok: false, reason: 'Your profile is still loading. Wait a moment and try again.' };
    const r = await performTransition({
      permitId, action, actor: ptwActor, note: opts.note, justification: opts.justification,
      reauthenticated: opts.reauthenticated,
      // `others` is left out on purpose: the service reads the project's permits fresh from the server.
      gateInputs: { competency },
      orgUsers,
    });
    if (r.ok === true) { replace(r.permit); toast.success(`${ACTIONS[action].label}: done.`); }
    return r;
  }, [ptwActor, competency, orgUsers, replace, toast]);

  // ── save content ───────────────────────────────────────────────────────
  const handleUpdatePtw = useCallback(async (permitId: string, next: { payload?: any; title?: string; receiver_id?: string }, base?: any): Promise<SaveOutcome> => {
    if (!ptwActor) return { ok: false, reason: 'Your profile is still loading. Wait a moment and try again.' };
    const r = await savePermitContent(permitId, ptwActor, next, base);
    if (r.ok === true) { if (r.changed) { replace(r.permit); toast.success('Permit saved.'); } }
    else toast.error(r.reason);
    return r;
  }, [ptwActor, replace, toast]);

  // ── delete ─────────────────────────────────────────────────────────────
  const handleDeletePtw = useCallback(async (id: string) => {
    const permit = ptwList.find(p => p.id === id);
    if (!permit) return;
    const r = await deleteDraftPermit(permit);
    if (r.ok === true) { setPtwList(prev => prev.filter(p => p.id !== id)); toast.success('Permit deleted.'); }
    else toast.error(r.reason);
  }, [ptwList, setPtwList, toast]);

  // ── expiry sweep ───────────────────────────────────────────────────────
  // Any signed-in staff member's open app marks overdue permits EXPIRED. Several
  // browsers racing is fine: the database lets exactly one write through.
  const listRef = useRef(ptwList);
  listRef.current = ptwList;
  const sweeping = useRef(false);
  useEffect(() => {
    if (!ptwActor || !(STAFF as readonly string[]).includes(ptwActor.role)) return;
    const sweep = async () => {
      if (sweeping.current || (typeof document !== 'undefined' && document.hidden)) return;
      sweeping.current = true;
      try {
        const now = Date.now();
        const due = listRef.current.filter(p => p.permit_no && p.status === 'ACTIVE' && effectiveStatus(p as unknown as EnginePermit, now) === 'EXPIRED');
        for (const p of due.slice(0, 5)) await expireIfDue(p, ptwActor, now, orgUsers);
      } catch (e) {
        console.error('PTW expiry sweep failed:', e);
      } finally {
        sweeping.current = false;
      }
    };
    const first = setTimeout(sweep, 3000);
    const every = setInterval(sweep, 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [ptwActor, orgUsers]);

  return { ptwActor, ptwOrgId, getPtwGateInputs, handleCreatePtw, handlePtwTransition, handleUpdatePtw, handleDeletePtw };
}
