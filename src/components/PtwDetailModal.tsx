import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Ptw, PtwSafetyRequirement, PtwWorkAtHeightPayload, CanonicalPtwPayload, PtwTeamMember, PtwIsolationPoint, User,
} from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { LoadCalculationSection } from './LoadCalculationSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { GasTestLogSection } from './ptw/GasTestLogSection';
import { PermitActionsPanel } from './ptw/PermitActionsPanel';
import { ValidityBanner } from './ptw/ValidityBanner';
import { PermitTimeline } from './ptw/PermitTimeline';
import { ControlsSection } from './ptw/ControlsSection';
import { TeamEditor } from './ptw/TeamEditor';
import { IsolationRegister } from './ptw/IsolationRegister';
import { STAGE_BADGE, fmtDateTime, stageLabel } from './ptw/ptwUi';
import { useNow } from './ptw/useNow';
import { APPROVERS, OVERRIDERS, TYPE_RULES, normalizeStage, type PpeKey } from '../lib/ptw/model';
import { checkContentEdit, type EnginePermit } from '../lib/ptw/engine';
import { diffPayload, mergeThreeWay } from '../lib/ptw/writes';
import { effectiveStatus } from '../lib/ptw/validity';
import { splitLocalInput } from '../lib/ptw/payload';
import { downloadPermitPdf } from '../lib/ptw/permitPdf';
import { getPublicBaseUrl } from '../lib/certificates';

interface PtwDetailModalProps {
  /** The LIVE permit (from the permit list), not a snapshot. */
  ptw: Ptw;
  onClose: () => void;
  /** Which section to open first (defaults to General Information). */
  initialSection?: SectionKey;
}

export type SectionKey = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX' | 'X' | 'XI';
const sections: { key: SectionKey; title: string }[] = [
  { key: 'I', title: 'General Information' },
  { key: 'II', title: 'Safety Requirement' },
  { key: 'III', title: 'Permit Requester' },
  { key: 'IV', title: 'Client Proponent' },
  { key: 'V', title: 'Client HSE Dept' },
  { key: 'VI', title: 'Joint Site Inspection' },
  { key: 'VII', title: 'Holding/Stoppage' },
  { key: 'VIII', title: 'Extensions' },
  { key: 'IX', title: 'Permit Closure' },
  { key: 'X', title: 'Controls & Checks' },
  { key: 'XI', title: 'Activity Log' },
];

// --- HELPER COMPONENTS ---

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const fieldCls = 'mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-gray-100 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

const FormInput: React.FC<{ label: string; value: any; onChange: (val: any) => void; type?: string; required?: boolean; disabled?: boolean; placeholder?: string }> =
  ({ label, value, onChange, type = 'text', required = false, disabled = false, placeholder }) => (
    <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">
      {label}{required && <span className="text-red-500"> *</span>}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className={fieldCls} required={required} disabled={disabled} placeholder={placeholder} />
    </label>
  );

const SignatureInput: React.FC<{ label: string; value: any; onChange: (val: any) => void; disabled?: boolean }> = ({ label, value, onChange, disabled = false }) => (
  <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">
    {label}
    <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="mt-1 w-full p-2 border border-gray-300 dark:border-dark-border rounded-md font-serif text-lg bg-white dark:bg-dark-background text-blue-800 dark:text-blue-200 disabled:opacity-60"
      placeholder="Type name (record only)" />
  </label>
);

const InfoField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="border-b py-2 dark:border-dark-border">
    <span className="font-semibold text-gray-600 dark:text-gray-400">{label}:</span>
    <span className="ml-2 text-gray-800 dark:text-gray-200">{value}</span>
  </div>
);

/** Typed names are a RECORD of what was agreed with the client, not a system signature. */
const ExternalNote: React.FC = () => (
  <p className="text-xs rounded border border-dashed border-gray-300 dark:border-dark-border text-gray-600 dark:text-gray-400 px-3 py-2 mb-4" data-testid="external-note">
    <strong>External record.</strong> Names typed here record what was agreed on site with the client. They are not system signatures.
    The signed-in person who carried out each step, and when, is recorded in the Activity log.
  </p>
);

const ChecklistRow: React.FC<{ index: number; item: PtwSafetyRequirement; onChange: (value: PtwSafetyRequirement) => void; disabled: boolean }> = ({ index, item, onChange, disabled }) => {
  const unanswered = !item.response;
  return (
    <tr className={`border-b dark:border-dark-border ${disabled ? '' : 'hover:bg-gray-50 dark:hover:bg-dark-background'} ${unanswered && !disabled ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
      <td className="p-2 w-8 text-center text-gray-600 dark:text-gray-400">{index}</td>
      <td className="p-2 text-gray-900 dark:text-gray-200">{item.text}{item.is_critical && <span className="ml-2 text-[10px] font-bold text-red-600 uppercase">critical</span>}</td>
      {(['Yes', 'No', 'N/A'] as const).map(v => (
        <td key={v} className="p-2 w-16 text-center">
          <input type="radio" name={`chk-${item.id}`} aria-label={`${item.text}: ${v}`} checked={item.response === v} onChange={() => onChange({ ...item, response: v })} disabled={disabled} className="w-4 h-4 text-blue-600" />
        </td>
      ))}
    </tr>
  );
};

// --- DATA SAFETY NET ---
// Saved permits may lack some nested fields (older data, partial writes). This guarantees every
// field the modal reads exists, WITHOUT dropping fields it does not know about (team, isolation,
// wizard notes, external reference...): the whole saved payload is spread first.
export function normalizePayload(payload: any, type?: string): CanonicalPtwPayload {
  const p = payload ?? {};
  return {
    ...p,
    creator_id: p.creator_id ?? '',
    permit_no: p.permit_no ?? '',
    category: p.category ?? 'standard',
    requester: { name: '', email: '', mobile: '', designation: '', contractor: '', signature: '', ...(p.requester ?? {}) },
    work: {
      location: '', description: '', number_of_workers: undefined, associated_permits: [], risk_assessment_ref: '', emergency_contact: '',
      ...(p.work ?? {}),
      coverage: { start_date: '', end_date: '', start_time: '', end_time: '', ...(p.work?.coverage ?? {}) },
    },
    safety_requirements: Array.isArray(p.safety_requirements) ? p.safety_requirements : [],
    ppe: { hard_hat: false, safety_shoes: false, safety_harness: false, goggles: false, coverall: false, respirator: false, safety_gloves: false, vest: false, ...(p.ppe ?? {}) },
    signoffs: {
      client_proponent: { name: '', designation: '', signature: '', ...(p.signoffs?.client_proponent ?? {}) },
      other_stakeholders: Array.isArray(p.signoffs?.other_stakeholders) ? p.signoffs.other_stakeholders : [],
      client_hs: { name: '', designation: '', signature: '', ...(p.signoffs?.client_hs ?? {}) },
    },
    joint_inspection: {
      remarks: p.joint_inspection?.remarks ?? '',
      requester: { signature: '', ...(p.joint_inspection?.requester ?? {}) },
      client_proponent: { signature: '', ...(p.joint_inspection?.client_proponent ?? {}) },
      client_hs: { signature: '', ...(p.joint_inspection?.client_hs ?? {}) },
    },
    holding_or_stoppage: Array.isArray(p.holding_or_stoppage) ? p.holding_or_stoppage : [],
    extension: p.extension ?? {},
    closure: {
      note: p.closure?.note ?? '',
      permit_requester: { signature: '', ...(p.closure?.permit_requester ?? {}) },
      client_proponent: { signature: '', ...(p.closure?.client_proponent ?? {}) },
      client_hs: { signature: '', ...(p.closure?.client_hs ?? {}) },
    },
    attachments: Array.isArray(p.attachments) ? p.attachments : [],
    audit: Array.isArray(p.audit) ? p.audit : [],
    global_compliance: p.global_compliance ?? { standards: [] },
    team: Array.isArray(p.team) ? p.team : [],
    isolation: Array.isArray(p.isolation) ? p.isolation : [],
    fire_watcher: p.fire_watcher ?? { name: '', mobile: '' },
    post_watch_minutes: p.post_watch_minutes ?? 30,
    access_equipment: p.access_equipment ?? {},
    gas_tests: Array.isArray(p.gas_tests) ? p.gas_tests : [],
    entry_log: Array.isArray(p.entry_log) ? p.entry_log : [],
    soil_type: p.soil_type ?? 'A',
    cave_in_protection: Array.isArray(p.cave_in_protection) ? p.cave_in_protection : [],
    closure_type: p.closure_type ?? 'partial',
    load_calculation: p.load_calculation ?? (type === 'Lifting' ? { lift_plan_ref: '', crane_certification_no: '', operator_certification_no: '', hook_rigging_weight: '', load_weight: '', total_weight: '', crane_capacity_at_radius: '', utilization_percent: '' } : {}),
  } as any;
}

const PPE_LABELS: Record<PpeKey, string> = {
  hard_hat: 'Hard hat', safety_shoes: 'Safety shoes', goggles: 'Safety goggles', safety_harness: 'Safety harness',
  coverall: 'Coverall', respirator: 'Respirator', safety_gloves: 'Safety gloves', vest: 'Hi-vis vest',
};

// --- MAIN COMPONENT ---
export const PtwDetailModal: React.FC<PtwDetailModalProps> = ({ ptw, onClose, initialSection = 'I' }) => {
  const { usersList, impersonatedUser, activeOrg } = useAppContext();
  const { ptwActor, handlePtwTransition, handleUpdatePtw, handleDeletePtw, getPtwGateInputs, projects } = useDataContext();
  const now = useNow(15_000);

  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfState, setPdfState] = useState<'idle' | 'busy' | 'error'>('idle');

  // What the form is compared with: the saved permit as last loaded.
  const baseRef = useRef({ payload: normalizePayload(ptw.payload, ptw.type), title: ptw.title ?? '', receiver_id: ptw.receiver_id ?? '' });
  const [form, setForm] = useState(() => ({ payload: baseRef.current.payload as any, title: baseRef.current.title, receiver_id: baseRef.current.receiver_id }));

  // The permit is live: when it changes elsewhere, take the new saved version but KEEP anything the person has edited.
  useEffect(() => {
    const remote = { payload: normalizePayload(ptw.payload, ptw.type) as any, title: ptw.title ?? '', receiver_id: ptw.receiver_id ?? '' };
    const base = baseRef.current;
    setForm(prev => {
      return {
        payload: mergeThreeWay(base.payload, prev.payload, remote.payload),
        title: prev.title !== base.title ? prev.title : remote.title,
        receiver_id: prev.receiver_id !== base.receiver_id ? prev.receiver_id : remote.receiver_id,
      };
    });
    baseRef.current = remote;
  }, [ptw]);

  const p = ptw as unknown as EnginePermit;
  const stage = normalizeStage(ptw.status);
  const shown = effectiveStatus(p, now) ?? stage;
  const isLegacy = !ptw.permit_no;
  const isDraft = stage === 'DRAFT';
  const edit = ptwActor ? checkContentEdit(p, ptwActor) : ({ ok: false, reason: 'Your profile is still loading.' } as const);
  const canEdit = edit.ok === true;
  const draftFields = canEdit && isDraft;                        // details, checklist, PPE, team, type-specific inputs
  const siteRecords = canEdit && !isDraft;                       // gas tests, entry log, isolation stamps, external records
  const rule = TYPE_RULES[ptw.type as keyof typeof TYPE_RULES];
  const gateInputs = getPtwGateInputs(ptw);

  const dirty = useMemo(() => {
    const changed = Object.keys(diffPayload(baseRef.current.payload, form.payload, true)).length > 0;
    return changed || form.title !== baseRef.current.title || form.receiver_id !== baseRef.current.receiver_id;
  }, [form, ptw]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPayload = (path: string, value: any) => {
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev.payload));
      const keys = path.split('.');
      let cur: any = next;
      for (let i = 0; i < keys.length - 1; i++) { if (!cur[keys[i]]) cur[keys[i]] = {}; cur = cur[keys[i]]; }
      cur[keys[keys.length - 1]] = value;
      return { ...prev, payload: next };
    });
  };
  const handleChecklistChange = (updated: PtwSafetyRequirement) =>
    setPayload('safety_requirements', (form.payload.safety_requirements || []).map((i: PtwSafetyRequirement) => (i.id === updated.id ? updated : i)));

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await handleUpdatePtw(
        ptw.id,
        { payload: form.payload, title: form.title, ...(form.receiver_id !== baseRef.current.receiver_id ? { receiver_id: form.receiver_id } : {}) },
        baseRef.current.payload as any,
      );
    } finally { setSaving(false); }
  };
  const discard = () => setForm({ payload: baseRef.current.payload as any, title: baseRef.current.title, receiver_id: baseRef.current.receiver_id });

  const canDelete = !!ptwActor && (isLegacy
    ? (OVERRIDERS as readonly string[]).includes(ptwActor.role)
    : isDraft && (ptwActor.id === ptw.creator_id || (APPROVERS as readonly string[]).includes(ptwActor.role)));
  const remove = async () => {
    if (!window.confirm(isLegacy ? 'Delete this old permit permanently?' : 'Delete this draft permit permanently?')) return;
    await handleDeletePtw(ptw.id);
    onClose();
  };

  const projectName = projects?.find(x => x.id === ptw.project_id)?.name || ptw.project_id;

  // The formal PDF (with a QR to the public status page) replaces printing this window.
  const downloadPdf = async () => {
    if (pdfState === 'busy') return;
    setPdfState('busy');
    try {
      await downloadPermitPdf({
        permit: ptw, orgName: activeOrg?.name ?? '', projectName, baseUrl: getPublicBaseUrl(), now: Date.now(),
        users: (usersList ?? []).map((u: User) => ({ id: u.id, name: u.name })),
      });
      setPdfState('idle');
    } catch (e) {
      console.error('Permit PDF failed:', e);
      setPdfState('error');
    }
  };
  const receivers: User[] = useMemo(
    () => (usersList || []).filter(u => u.role !== 'CLIENT_VIEWER' && (!u.status || u.status === 'active') && (u.project_ids?.includes(ptw.project_id) || u.role === 'ADMIN' || u.role === 'ORG_ADMIN')),
    [usersList, ptw.project_id],
  );
  const payload = form.payload;
  const cov = payload.work?.coverage ?? {};
  const savedGas = Array.isArray((ptw.payload as any)?.gas_tests) ? (ptw.payload as any).gas_tests.length : 0;
  const savedEntries = Array.isArray((ptw.payload as any)?.entry_log) ? (ptw.payload as any).entry_log.length : 0;
  const stoppages = Array.isArray(ptw.payload?.holding_or_stoppage) ? ptw.payload.holding_or_stoppage : [];
  const extensions = ptw.extensions ?? [];
  const isoNeeded = !!rule?.isolation;

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'I':
        return (
          <div className="space-y-4">
            {draftFields ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><FormInput label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required /></div>
                <FormInput label="Work location" value={payload.work.location} onChange={v => setPayload('work.location', v)} required />
                <FormInput label="Number of workers" type="number" value={payload.work.number_of_workers} onChange={v => setPayload('work.number_of_workers', v === '' ? undefined : Number(v))} required />
                <FormInput label="Emergency contact (name and phone)" value={payload.work.emergency_contact} onChange={v => setPayload('work.emergency_contact', v)} required />
                <FormInput label={`Risk assessment / method statement ref.${rule?.rams ? '' : ' (optional)'}`} value={payload.work.risk_assessment_ref} onChange={v => setPayload('work.risk_assessment_ref', v)} required={!!rule?.rams} />
                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm">Work description <span className="text-red-500">*</span></label>
                  <textarea rows={3} className={fieldCls} value={payload.work.description} onChange={e => setPayload('work.description', e.target.value)} />
                </div>
                <FormInput label="Start (local time)" type="datetime-local" value={cov.start_date && cov.start_time ? `${cov.start_date}T${cov.start_time}` : ''}
                  onChange={v => { const s = splitLocalInput(v); setPayload('work.coverage', { ...cov, start_date: s.date, start_time: s.time }); }} required />
                <FormInput label="End (local time)" type="datetime-local" value={cov.end_date && cov.end_time ? `${cov.end_date}T${cov.end_time}` : ''}
                  onChange={v => { const s = splitLocalInput(v); setPayload('work.coverage', { ...cov, end_date: s.date, end_time: s.time }); }} required />
                <label className="block font-medium text-gray-700 dark:text-gray-300 text-sm md:col-span-2">Receiver (person who will accept the handover on site)
                  <select className={fieldCls} value={form.receiver_id} onChange={e => setForm(f => ({ ...f, receiver_id: e.target.value }))}>
                    <option value="">Same as requester</option>
                    {receivers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </label>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Permit number" value={ptw.permit_no || 'Legacy permit (no number)'} />
                  <InfoField label="Permit type" value={ptw.type} />
                  <InfoField label="Status" value={<Badge color={STAGE_BADGE[(shown ?? 'DRAFT')]}>{stageLabel(shown, ptw.status)}</Badge>} />
                  <InfoField label="Project" value={projectName} />
                  <InfoField label="Work location" value={payload.work.location || 'Not specified'} />
                  <InfoField label="Number of workers" value={payload.work.number_of_workers || 'Not specified'} />
                  <InfoField label="Emergency contact" value={payload.work.emergency_contact || 'Not specified'} />
                  <InfoField label="Risk assessment ref." value={payload.work.risk_assessment_ref || 'Not specified'} />
                  {payload.external_ref && <InfoField label="Paper permit ref." value={payload.external_ref} />}
                  <InfoField label="Receiver" value={usersList?.find(u => u.id === ptw.receiver_id)?.name || 'Same as requester'} />
                </div>
                <div className="mt-4">
                  <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2">Work description</h4>
                  <p className="text-gray-700 dark:text-gray-300 p-3 bg-gray-50 dark:bg-gray-900/30 rounded whitespace-pre-wrap">{payload.work.description || 'No description.'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Requested start" value={cov.start_date ? `${cov.start_date} ${cov.start_time || ''}` : 'Not set'} />
                  <InfoField label="Requested end" value={cov.end_date ? `${cov.end_date} ${cov.end_time || ''}` : 'Not set'} />
                </div>
              </>
            )}
            {payload.wizard && (
              <div className="rounded-lg border dark:border-dark-border p-3 text-sm">
                <h4 className="font-bold mb-1 text-gray-800 dark:text-gray-200">From the guided permit</h4>
                {payload.wizard.hazards?.length > 0 && <p><strong>Hazards:</strong> {payload.wizard.hazards.join('; ')}</p>}
                {payload.wizard.controls?.length > 0 && <p><strong>Controls:</strong> {payload.wizard.controls.join('; ')}</p>}
                {payload.wizard.rescue_plan && <p><strong>Rescue plan:</strong> {payload.wizard.rescue_plan}</p>}
                {payload.wizard.receiver_name && <p><strong>Receiver:</strong> {payload.wizard.receiver_name}{payload.wizard.receiver_company ? `, ${payload.wizard.receiver_company}` : ''}</p>}
              </div>
            )}
          </div>
        );

      case 'II':
        return (
          <div className="space-y-6">
            {ptw.type === 'Hot Work' && (
              <div className="border rounded-lg p-4 dark:border-dark-border">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Fire watch</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormInput label="Fire watcher name" value={payload.fire_watcher?.name} onChange={v => setPayload('fire_watcher.name', v)} disabled={!draftFields} required />
                  <FormInput label="Fire watcher mobile" value={payload.fire_watcher?.mobile} onChange={v => setPayload('fire_watcher.mobile', v)} disabled={!draftFields} />
                  <FormInput label="Post-work watch (minutes, at least 30)" type="number" value={payload.post_watch_minutes} onChange={v => setPayload('post_watch_minutes', v === '' ? '' : Number(v))} disabled={!draftFields} required />
                </div>
              </div>
            )}
            {ptw.type === 'Lifting' && payload.load_calculation && (
              <LoadCalculationSection loadCalc={payload.load_calculation as any} onChange={calc => setPayload('load_calculation', calc)} disabled={!draftFields} />
            )}
            {ptw.type === 'Confined Space Entry' && (
              <>
                <GasTestLogSection gasTests={payload.gas_tests} onChange={rows => setPayload('gas_tests', rows)} disabled={!siteRecords} lockedCount={savedGas} permitType={ptw.type} testerName={ptwActor?.name ?? ''} />
                <PersonnelEntryLogSection entries={payload.entry_log} onChange={rows => setPayload('entry_log', rows)} disabled={!siteRecords} lockedCount={savedEntries} />
              </>
            )}
            {ptw.type === 'Work at Height' && payload.access_equipment && (
              <WorkAtHeightPermit payload={payload as PtwWorkAtHeightPayload} onChange={updated => setForm(f => ({ ...f, payload: updated as any }))} readOnly={!draftFields} />
            )}

            <div className="border rounded-lg p-4 dark:border-dark-border">
              <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">Personal protective equipment</h4>
              {rule && rule.ppe.length > 0 && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Required for {ptw.type}: {rule.ppe.map(k => PPE_LABELS[k]).join(', ')}.</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {(Object.keys(PPE_LABELS) as PpeKey[]).map(k => (
                  <label key={k} className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <input type="checkbox" checked={!!payload.ppe?.[k]} disabled={!draftFields} onChange={e => setPayload(`ppe.${k}`, e.target.checked)} className="w-4 h-4" />
                    {PPE_LABELS[k]}{rule?.ppe.includes(k) && <span className="text-red-500">*</span>}
                  </label>
                ))}
              </div>
            </div>

            <TeamEditor team={(payload.team ?? []) as PtwTeamMember[]} onChange={t => setPayload('team', t)} users={receivers} disabled={!draftFields} />

            {(isoNeeded || (payload.isolation ?? []).length > 0) && (
              <IsolationRegister
                points={(payload.isolation ?? []) as PtwIsolationPoint[]}
                onChange={pts => setPayload('isolation', pts)}
                actorName={ptwActor?.name ?? ''}
                canDefine={canEdit && (isDraft || stage === 'SITE_INSPECTION')}
                canStamp={siteRecords}
                required={isoNeeded}
                now={now}
              />
            )}

            <div className="border rounded-lg overflow-hidden dark:border-dark-border">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b dark:border-dark-border">
                <h4 className="font-bold text-gray-800 dark:text-gray-200">Safety requirements checklist</h4>
                {draftFields && <p className="text-xs text-gray-500 dark:text-gray-400">Every item must be answered before the permit can be submitted.</p>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr className="border-b dark:border-dark-border text-gray-700 dark:text-gray-300">
                      <th className="p-3 w-8">#</th><th className="p-3 text-left">Requirement</th><th className="p-3 w-16 text-center">Yes</th><th className="p-3 w-16 text-center">No</th><th className="p-3 w-16 text-center">N/A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payload.safety_requirements || []).map((item: PtwSafetyRequirement, index: number) => (
                      <ChecklistRow key={item.id} index={index + 1} item={item} onChange={handleChecklistChange} disabled={!draftFields} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'III':
        return (
          <div className="space-y-4">
            <ExternalNote />
            <div className="border rounded-lg p-4 dark:border-dark-border">
              <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section III — Permit Requester Confirmation</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <FormInput label="Permit holder name" value={payload.requester?.name} onChange={v => setPayload('requester.name', v)} disabled={!canEdit} />
                <FormInput label="Designation" value={payload.requester?.designation} onChange={v => setPayload('requester.designation', v)} disabled={!canEdit} />
                <FormInput label="Contractor company" value={payload.requester?.contractor} onChange={v => setPayload('requester.contractor', v)} disabled={!canEdit} />
                <FormInput label="Mobile" value={payload.requester?.mobile} onChange={v => setPayload('requester.mobile', v)} disabled={!canEdit} />
                <div className="md:col-span-2"><SignatureInput label="Name typed as confirmation" value={payload.requester?.signature} onChange={v => setPayload('requester.signature', v)} disabled={!canEdit} /></div>
              </div>
            </div>
          </div>
        );

      case 'IV':
        return (
          <div>
            <ExternalNote />
            <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section IV — Client Proponent / Stakeholder</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <FormInput label="Name" value={payload.signoffs?.client_proponent?.name} onChange={v => setPayload('signoffs.client_proponent.name', v)} disabled={!canEdit} />
              <FormInput label="Designation" value={payload.signoffs?.client_proponent?.designation} onChange={v => setPayload('signoffs.client_proponent.designation', v)} disabled={!canEdit} />
              <div className="md:col-span-2"><SignatureInput label="Name typed as confirmation" value={payload.signoffs?.client_proponent?.signature} onChange={v => setPayload('signoffs.client_proponent.signature', v)} disabled={!canEdit} /></div>
            </div>
          </div>
        );

      case 'V':
        return (
          <div>
            <ExternalNote />
            <h3 className="text-base font-semibold mb-4 text-gray-800 dark:text-gray-200">Section V — Client HSE Department</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <FormInput label="HSE representative name" value={payload.signoffs?.client_hs?.name} onChange={v => setPayload('signoffs.client_hs.name', v)} disabled={!canEdit} />
              <div className="md:col-span-2"><SignatureInput label="Name typed as confirmation" value={payload.signoffs?.client_hs?.signature} onChange={v => setPayload('signoffs.client_hs.signature', v)} disabled={!canEdit} /></div>
            </div>
          </div>
        );

      case 'VI':
        return (
          <div>
            <ExternalNote />
            <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section VI — Joint Site Inspection</h3>
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6 dark:border-dark-border">
              <p className="text-sm italic text-gray-700 dark:text-gray-300">“The work area has been jointly inspected by all parties, and all safety requirements have been met.”</p>
            </div>
            <div className="space-y-6">
              <FormInput label="Remarks (required before the permit can be closed)" value={payload.joint_inspection?.remarks} onChange={v => setPayload('joint_inspection.remarks', v)} disabled={!siteRecords} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SignatureInput label="Permit requester (required to close)" value={payload.joint_inspection?.requester?.signature} onChange={v => setPayload('joint_inspection.requester', { ...(payload.joint_inspection?.requester ?? {}), signature: v, signed_at: v ? new Date().toISOString() : '' })} disabled={!siteRecords} />
                <SignatureInput label="Client proponent" value={payload.joint_inspection?.client_proponent?.signature} onChange={v => setPayload('joint_inspection.client_proponent', { ...(payload.joint_inspection?.client_proponent ?? {}), signature: v, signed_at: v ? new Date().toISOString() : '' })} disabled={!siteRecords} />
                <SignatureInput label="Client HSE" value={payload.joint_inspection?.client_hs?.signature} onChange={v => setPayload('joint_inspection.client_hs', { ...(payload.joint_inspection?.client_hs ?? {}), signature: v, signed_at: v ? new Date().toISOString() : '' })} disabled={!siteRecords} />
              </div>
            </div>
          </div>
        );

      case 'VII':
        return (
          <div>
            <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section VII — Holding / Stoppage of Work</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Stoppages are recorded by the system when someone uses <strong>Stop work</strong> or <strong>Resume work</strong> in the action bar. They cannot be edited here.</p>
            <div className="space-y-4">
              {stoppages.map((s: any, index: number) => (
                <div key={index} className="p-4 border rounded-md dark:border-dark-border text-gray-800 dark:text-gray-200 text-sm">
                  <p className="font-bold">Stoppage #{index + 1} at {fmtDateTime(new Date(s.time).getTime())}</p>
                  <p><strong>Reason:</strong> {s.reason}</p>
                  <p><strong>Stopped by:</strong> {s.stopped_by}</p>
                  {s.restarted_time
                    ? <div className="mt-2 pt-2 border-t dark:border-dark-border"><p className="text-green-600 font-semibold">Resumed {fmtDateTime(new Date(s.restarted_time).getTime())}{s.resumed_by ? ` by ${s.resumed_by}` : ''}</p>{s.resume_note && <p>{s.resume_note}</p>}</div>
                    : <p className="mt-2 text-red-600 font-semibold">Still on hold</p>}
                </div>
              ))}
              {stoppages.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No work stoppages have been logged.</p>}
            </div>
          </div>
        );

      case 'VIII':
        return (
          <div>
            <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section VIII — Extensions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">An extension (revalidation) is done by a reviewer with <strong>Revalidate</strong> in the action bar, with a reason and a password confirmation. A permit never runs longer than 7 days in total, and an expired permit cannot be extended.</p>
            <div className="space-y-3">
              {extensions.map((e, i) => (
                <div key={i} className="p-4 border rounded-md dark:border-dark-border text-sm text-gray-800 dark:text-gray-200">
                  <p className="font-bold">Extension #{i + 1} · {fmtDateTime(new Date(e.at).getTime())}</p>
                  <p><strong>By:</strong> {e.by_name}</p>
                  <p><strong>Reason:</strong> {e.reason}</p>
                  <p><strong>New end:</strong> {e.to_until ? fmtDateTime(new Date(e.to_until).getTime()) : ''}</p>
                </div>
              ))}
              {extensions.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">This permit has not been extended.</p>}
            </div>
          </div>
        );

      case 'IX':
        return (
          <div>
            <ExternalNote />
            <h3 className="text-base font-semibold mb-2 text-gray-800 dark:text-gray-200">Section IX — Permit Closure</h3>
            <div className="p-4 border rounded-md bg-gray-50 dark:bg-dark-background mb-6 dark:border-dark-border">
              <p className="text-sm italic text-gray-700 dark:text-gray-300">“We confirm the work is complete, the area is clean and safe, all isolations have been removed and all personnel are accounted for.”</p>
            </div>
            <FormInput label="Closure note / handover" value={payload.closure?.note} onChange={v => setPayload('closure.note', v)} disabled={!siteRecords} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <SignatureInput label="Requester closure" value={payload.closure?.permit_requester?.signature} onChange={v => setPayload('closure.permit_requester.signature', v)} disabled={!siteRecords} />
              <SignatureInput label="Proponent closure" value={payload.closure?.client_proponent?.signature} onChange={v => setPayload('closure.client_proponent.signature', v)} disabled={!siteRecords} />
              <SignatureInput label="HSE closure" value={payload.closure?.client_hs?.signature} onChange={v => setPayload('closure.client_hs.signature', v)} disabled={!siteRecords} />
            </div>
          </div>
        );

      case 'X':
        return <ControlsSection permit={ptw} gateInputs={gateInputs} />;

      case 'XI':
        return <PermitTimeline log={ptw.workflow_log ?? []} users={usersList} />;

      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-2 md:p-4" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="ptw-title">
        <div id="ptw-printable-area" className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-7xl h-[96vh] md:h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-3 md:p-4 border-b dark:border-dark-border flex justify-between items-start md:items-center flex-shrink-0 print:hidden gap-2">
            <div>
              <h2 id="ptw-title" className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">{ptw.permit_no || 'Legacy permit'} · {ptw.type}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{form.title || ptw.title}</p>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <Badge color={STAGE_BADGE[(shown ?? 'DRAFT')]}>{stageLabel(shown, ptw.status)}</Badge>
                {rule && <Badge color={rule.risk === 'high' ? 'red' : rule.risk === 'medium' ? 'yellow' : 'green'}>{rule.risk} risk</Badge>}
                {isLegacy && <Badge color="gray">Legacy</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ActionsBar onEmail={() => setIsEmailModalOpen(true)} onDownloadPdf={downloadPdf} />
              <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
            </div>
          </header>

          <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
            <nav className="md:w-64 bg-gray-50 dark:bg-dark-background md:border-r border-b md:border-b-0 dark:border-dark-border overflow-x-auto md:overflow-y-auto p-2 md:p-4 flex-shrink-0 print:hidden">
              <h3 className="hidden md:block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">SECTIONS</h3>
              <ul className="flex md:block gap-1 md:space-y-1">
                {sections.map(section => (
                  <li key={section.key} className="shrink-0">
                    <button
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full text-left px-3 py-2 md:p-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                        activeSection === section.key
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 md:border-l-4 border-primary-500'
                          : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 md:border-l-4 border-transparent'
                      }`}
                    >
                      {section.key}. {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <main className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4">
              {isLegacy && (
                <p role="alert" className="text-sm rounded border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-3 py-2">
                  This permit was created before the new permit system. It can be read, but not progressed or edited.{canDelete ? ' You can delete it and raise a new one.' : ' An administrator can delete it so a new one can be raised.'}
                </p>
              )}
              {pdfState !== 'idle' && (
                <p role="status" className={`text-sm rounded px-3 py-2 ${pdfState === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200' : 'bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-300'}`} data-testid="pdf-state">
                  {pdfState === 'busy' ? 'Preparing the PDF...' : 'The PDF could not be created. Try again.'}
                </p>
              )}
              <ValidityBanner permit={ptw} />
              {renderSectionContent()}
            </main>
          </div>

          <footer className="p-3 md:p-4 border-t bg-gray-100 dark:bg-black/20 dark:border-dark-border flex-shrink-0 print:hidden space-y-3">
            {canEdit && (
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={save} disabled={!dirty || saving} data-testid="save-changes">{saving ? 'Saving...' : 'Save changes'}</Button>
                {dirty && <Button variant="ghost" onClick={discard}>Discard changes</Button>}
                <span className="text-xs text-gray-500 dark:text-gray-400">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
              </div>
            )}
            {!canEdit && !isLegacy && edit.ok === false && stage && !['CLOSED', 'CANCELLED', 'REJECTED', 'ARCHIVED'].includes(stage) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{edit.reason}</p>
            )}
            {!isLegacy && (
              <PermitActionsPanel
                permit={ptw}
                actor={ptwActor}
                gateInputs={gateInputs}
                dirty={dirty}
                onPerform={(action, opts) => handlePtwTransition(ptw.id, action, opts)}
                impersonatingAs={impersonatedUser?.name ?? null}
              />
            )}
            {canDelete && <button type="button" onClick={remove} className="text-xs text-red-600 underline" data-testid="delete-permit">{isLegacy ? 'Delete this old permit' : 'Delete this draft'}</button>}
          </footer>
        </div>
      </div>

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.permit_no || ptw.id}`}
        documentLink={`${window.location.href}?ptw=${ptw.id}`}
        defaultRecipients={[...Object.values(payload.signoffs ?? {}).flat(), payload.requester].filter(Boolean) as Partial<User>[]}
      />
    </>
  );
};
