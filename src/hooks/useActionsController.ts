// Everything the app needs to work with actions, in one place: who the person is (as the database sees them),
// the live list, and create / step / save. The decisions live in src/lib/actions; the Firestore calls in
// src/services/actionsService.ts. This hook only connects them to React state, and is used by DataProvider
// (src/contexts.tsx), so the dashboards and the Action Tracker share one live list.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from '../types';
import { ORG_WIDE } from '../lib/shared/roles';
import type { ActionDoc, ActorLike, NewActionInput, Reschedule } from '../lib/actions/engine';
import type { ActionId } from '../lib/actions/model';
import type { NotifyUser } from '../lib/actions/notify';
import type { ContentFields } from '../lib/actions/writes';
import {
  createAction, performStep, saveActionContent, subscribeActions,
  type CreateOutcome, type SaveOutcome, type StepOutcome,
} from '../services/actionsService';

export interface ActionsToast { success(message: string): void; error(message: string): void }

export interface ActionsControllerDeps {
  /** Firebase Auth uid of the signed-in person (null when signed out). */
  uid: string | null;
  actionItems: ActionDoc[];
  setActionItems: React.Dispatch<React.SetStateAction<ActionDoc[]>>;
  usersList: User[];
  toast: ActionsToast;
}

export interface StepOptions { note?: string; justification?: string; changes?: Reschedule }

export interface ActionsController {
  /** The person as the DATABASE sees them (their login, not an impersonated user). Null until known. */
  actionActor: ActorLike | null;
  /** The organisation actions are created in. */
  actionOrgId: string | null;
  /** Projects the person is limited to, or null when they see the whole organisation. */
  actionProjectIds: string[] | null;
  /** False while the first answer from the database is still on its way. */
  actionsReady: boolean;
  handleCreateAction: (input: NewActionInput) => Promise<CreateOutcome>;
  handleActionStep: (actionId: string, step: ActionId, opts?: StepOptions) => Promise<StepOutcome>;
  handleSaveActionContent: (actionId: string, next: ContentFields, base?: ContentFields) => Promise<SaveOutcome>;
}

interface Identity { docId: string; orgId: string; role: string; projectIds: string[] }

export function useActionsController(d: ActionsControllerDeps): ActionsController {
  const { uid, setActionItems, usersList, toast } = d;
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  // ── who am I, as the database sees me ──────────────────────────────────
  // The rules read the role and user id from the users_by_uid pointer, so the engine must use the same values
  // or it would allow what the rules refuse.
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
      .catch(e => console.error('Actions: could not read the user pointer:', e));
    return () => { cancelled = true; };
  }, [uid]);

  const actionOrgId = useMemo(() => {
    if (!identity) return null;
    // An administrator can switch organisation (the same override the data loader honours).
    const override = identity.role === 'ADMIN' ? localStorage.getItem('adminActiveOrgId') : null;
    return override || identity.orgId;
  }, [identity]);

  const actionActor = useMemo<ActorLike | null>(() => {
    if (!identity) return null;
    const me = usersList.find(u => u.id === identity.docId);
    return { id: identity.docId, name: me?.name || me?.email?.split('@')[0] || 'User', role: identity.role };
  }, [identity, usersList]);

  const actionProjectIds = useMemo<string[] | null>(() => {
    if (!identity) return null;
    return (ORG_WIDE as readonly string[]).includes(identity.role) ? null : identity.projectIds;
  }, [identity]);

  // ── live updates: an action is a shared document that several people move along ─────────────────────
  useEffect(() => {
    if (!identity || !actionOrgId) return;
    setReady(false);
    return subscribeActions(
      { orgId: actionOrgId, projectIds: actionProjectIds },
      list => { setActionItems(list); setReady(true); },
      () => setReady(true),
    );
  }, [identity, actionOrgId, actionProjectIds, setActionItems]);

  // ── people to notify ───────────────────────────────────────────────────
  const orgUsers = useMemo<NotifyUser[]>(
    () => usersList.map(u => ({ id: u.id, org_id: u.org_id, role: u.role, name: u.name, project_ids: u.project_ids, status: u.status })),
    [usersList],
  );

  const handleCreateAction = useCallback(async (input: NewActionInput): Promise<CreateOutcome> => {
    if (!actionActor || !actionOrgId) return { ok: false, reason: 'Still checking who you are. Wait a moment and try again.' };
    const r = await createAction({ actor: actionActor, orgId: actionOrgId, input, orgUsers });
    if (r.ok === true) toast.success(`${r.action.number} raised.`); else toast.error(r.reason);
    return r;
  }, [actionActor, actionOrgId, orgUsers, toast]);

  const handleActionStep = useCallback(async (actionId: string, step: ActionId, opts: StepOptions = {}): Promise<StepOutcome> => {
    if (!actionActor) return { ok: false, reason: 'Still checking who you are. Wait a moment and try again.' };
    const r = await performStep({ actionId, step, actor: actionActor, ...opts, orgUsers });
    if (r.ok === false) toast.error(r.reason);
    return r;
  }, [actionActor, orgUsers, toast]);

  const handleSaveActionContent = useCallback(async (actionId: string, next: ContentFields, base?: ContentFields): Promise<SaveOutcome> => {
    if (!actionActor) return { ok: false, reason: 'Still checking who you are. Wait a moment and try again.' };
    const r = await saveActionContent(actionId, next, actionActor, base);
    if (r.ok === false) toast.error(r.reason);
    return r;
  }, [actionActor, toast]);

  return { actionActor, actionOrgId, actionProjectIds, actionsReady: ready, handleCreateAction, handleActionStep, handleSaveActionContent };
}
