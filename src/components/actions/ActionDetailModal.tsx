import React, { useMemo, useState } from 'react';
import { useAppContext, useDataContext } from '../../contexts';
import { CAR_KEYS, CAR_LABEL, KIND_LABEL, MAX, type Kind } from '../../lib/actions/model';
import { checkContentEdit, LEGACY_MESSAGE, type ActionDoc, type CarSection } from '../../lib/actions/engine';
import { isOverdue, ymd } from '../../lib/actions/overdue';
import type { ContentFields } from '../../lib/actions/writes';
import { useNow } from '../ptw/useNow';
import { ActionBar } from './ActionBar';
import { ActionHistory } from './ActionHistory';
import {
  ModalShell, PriorityBadge, StageBadge, dueText, fmtDate, fmtStamp, personName, safeHref, sourceText,
} from './actionsUi';

interface Draft { title: string; description: string; car: Record<string, string> }

const toDraft = (a: ActionDoc): Draft => ({
  title: a.title ?? '',
  description: a.description ?? '',
  car: Object.fromEntries(CAR_KEYS.map(k => [k, (a.car as Record<string, string> | undefined)?.[k] ?? ''])),
});
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="text-sm text-gray-900 dark:text-gray-100 break-words">{children}</dd>
  </div>
);

/**
 * One action: its definition, who is doing what by when, the signed completion and verification, the steps this
 * person can take (with the reason for every step they cannot), and the history. It reads the action LIVE from
 * the shared list, so it is always the current version.
 */
export const ActionDetailModal: React.FC<{ actionId: string; onClose: () => void }> = ({ actionId, onClose }) => {
  const { actionItems, projects, actionActor, handleActionStep, handleSaveActionContent } = useDataContext();
  const { usersList } = useAppContext();
  const now = useNow(60_000);
  const today = ymd(now);
  const action: ActionDoc | undefined = (actionItems as ActionDoc[]).find(a => a.id === actionId);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [base, setBase] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProblem, setSaveProblem] = useState('');

  const edit = useMemo(() => (action && actionActor ? checkContentEdit(action, actionActor) : null), [action, actionActor]);
  const dirty = editing && draft && base ? !same(draft, base) : false;

  const close = () => {
    if (dirty && !window.confirm('Discard your changes to this action?')) return;
    onClose();
  };

  if (!action) {
    return (
      <ModalShell title="Action" onClose={onClose} testid="action-detail">
        <p className="text-sm text-gray-600 dark:text-gray-300">This action is no longer available.</p>
      </ModalShell>
    );
  }

  const legacy = !action.number;
  const proj = (projects ?? []).find((p: any) => p.id === action.project_id);
  const due = dueText(action.due_date, today);
  const overdue = isOverdue({ status: action.status, due_date: action.due_date }, today);
  const car = (action.car ?? {}) as CarSection;
  const scope = edit && edit.ok === true ? edit.scope : null;

  const startEdit = () => { const d = toDraft(action); setDraft(d); setBase(d); setSaveProblem(''); setEditing(true); };
  const cancelEdit = () => {
    if (dirty && !window.confirm('Discard your changes to this action?')) return;
    setEditing(false); setDraft(null); setBase(null);
  };
  const save = async () => {
    if (!draft || !base) return;
    setSaving(true); setSaveProblem('');
    const toFields = (d: Draft): ContentFields => ({ title: d.title, description: d.description, car: d.car });
    const r = await handleSaveActionContent(action.id, scope === 'car' ? { car: draft.car } : toFields(draft), toFields(base));
    setSaving(false);
    if (r.ok === true) { setEditing(false); setDraft(null); setBase(null); } else setSaveProblem(r.reason);
  };

  return (
    <ModalShell title={action.number ?? 'Action (not yet imported)'} onClose={close} testid="action-detail" wide>
      <div className="space-y-5">
        <div>
          {editing && draft && scope === 'all' ? (
            <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} maxLength={MAX.title} className="giq-input w-full text-base font-semibold" aria-label="Title" data-testid="edit-title" />
          ) : (
            <h3 className="text-lg font-bold text-gray-900 dark:text-white break-words" data-testid="detail-title">{action.title ?? (action as any).action}</h3>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StageBadge status={action.status} />
            <PriorityBadge priority={String(action.priority).toLowerCase()} />
            {overdue && <span className="text-xs font-bold text-red-600 dark:text-red-400" data-testid="detail-overdue">{due.text}</span>}
            {!overdue && due.soon && action.status !== 'CLOSED' && action.status !== 'CANCELLED' && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{due.text}</span>}
            {action.imported && <span className="text-[11px] rounded-full px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300" data-testid="detail-imported">Imported</span>}
          </div>
        </div>

        {legacy && (
          <p role="status" className="text-sm rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 px-3 py-2" data-testid="detail-legacy">{LEGACY_MESSAGE}</p>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <Row label="Owner">{personName(usersList, action.owner_id)}</Row>
          <Row label="Raised by">{personName(usersList, action.creator_id)}</Row>
          <Row label="Due">{fmtDate(action.due_date)}{!overdue && due.text ? ` · ${due.text}` : ''}</Row>
          <Row label="Project">{proj?.name ?? action.project_id ?? 'Not set'}</Row>
          <Row label="Type">{KIND_LABEL[action.kind as Kind] ?? action.kind}</Row>
          <Row label="Source">{sourceText(action.source)}</Row>
          {action.created_at ? <Row label="Raised">{fmtStamp(action.created_at)}</Row> : null}
        </dl>

        <div>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Details</p>
          {editing && draft && scope === 'all'
            ? <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={4} maxLength={MAX.description} className="giq-input w-full" aria-label="Details" data-testid="edit-description" />
            : <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap" data-testid="detail-description">{action.description || 'No further details.'}</p>}
        </div>

        <div data-testid="detail-car">
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Corrective-action details</p>
          {editing && draft ? (
            <div className="space-y-3">
              {CAR_KEYS.map(k => (
                <label key={k} className="block text-xs font-semibold text-gray-700 dark:text-gray-300">{CAR_LABEL[k]}
                  <textarea value={draft.car[k]} onChange={e => setDraft({ ...draft, car: { ...draft.car, [k]: e.target.value } })} rows={2} maxLength={MAX.car} className="giq-input w-full mt-1" data-testid={`edit-${k}`} />
                </label>
              ))}
            </div>
          ) : CAR_KEYS.some(k => car[k]) ? (
            <dl className="space-y-2">
              {CAR_KEYS.filter(k => car[k]).map(k => (
                <div key={k}><dt className="text-xs font-semibold text-gray-600 dark:text-gray-400">{CAR_LABEL[k]}</dt><dd className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{car[k]}</dd></div>
              ))}
            </dl>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">None recorded.</p>}
        </div>

        {(action.completion || action.verification) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="detail-records">
            {action.completion && (
              <div className="rounded-xl border border-gray-200 dark:border-dark-border p-3">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Completed by {personName(usersList, action.completion.by)}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{fmtStamp(action.completion.at)}</p>
                {action.completion.note && <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{action.completion.note}</p>}
              </div>
            )}
            {action.verification && (
              <div className="rounded-xl border border-emerald-300 dark:border-emerald-700/50 p-3">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Verified by {personName(usersList, action.verification.by)}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{fmtStamp(action.verification.at)}</p>
                {action.verification.note && <p className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{action.verification.note}</p>}
              </div>
            )}
          </div>
        )}

        {action.imported && action.legacy && <ImportedRecord legacy={action.legacy} importRef={action.import_ref} />}

        {/* Edit the definition */}
        {!legacy && (
          <div className="flex flex-wrap items-center gap-2">
            {!editing && scope && <button type="button" onClick={startEdit} className="giq-btn-secondary text-sm" data-testid="edit-start">{scope === 'car' ? 'Edit corrective-action details' : 'Edit details'}</button>}
            {editing && (
              <>
                <button type="button" onClick={save} disabled={saving || !dirty} className="giq-btn-primary text-sm" data-testid="edit-save">{saving ? 'Saving…' : 'Save changes'}</button>
                <button type="button" onClick={cancelEdit} className="giq-btn-secondary text-sm">Cancel</button>
                {dirty && <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}
              </>
            )}
            {!editing && edit && edit.ok === false && <span className="text-[11px] text-gray-500 dark:text-gray-400" data-testid="edit-blocked">{edit.reason}</span>}
          </div>
        )}
        {saveProblem && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{saveProblem}</p>}

        {/* The steps */}
        {!legacy && actionActor && (
          <section aria-label="Steps">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">What can be done</h4>
            <ActionBar action={action} actor={actionActor} users={usersList ?? []} onStep={(step, opts) => handleActionStep(action.id, step, opts)} />
          </section>
        )}

        <section aria-label="History">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">History</h4>
          <ActionHistory action={action} users={usersList ?? []} />
        </section>
      </div>
    </ModalShell>
  );
};

/** The old record of an imported action: kept whole, and shown so nothing from the old system is lost. */
const ImportedRecord: React.FC<{ legacy: Record<string, unknown>; importRef?: string }> = ({ legacy, importRef }) => {
  const evidence = (Array.isArray(legacy.evidence) ? legacy.evidence : []).map(safeHref).filter(Boolean) as string[];
  const notes = typeof legacy.notes === 'string' ? legacy.notes : '';
  const carNo = typeof legacy.car_number === 'string' ? legacy.car_number : '';
  return (
    <div className="rounded-xl border border-gray-200 dark:border-dark-border p-3 text-sm" data-testid="detail-imported-record">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">From the old system{carNo ? ` · ${carNo}` : ''}</p>
      {importRef && <p className="text-[11px] text-gray-500 dark:text-gray-400 break-all">{importRef}</p>}
      {notes && <p className="mt-1 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{notes}</p>}
      {evidence.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {evidence.map(u => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="text-emerald-700 dark:text-emerald-400 underline break-all">{u}</a></li>)}
        </ul>
      )}
    </div>
  );
};
