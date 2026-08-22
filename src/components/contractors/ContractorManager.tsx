/**
 * FILE: src/components/contractors/ContractorManager.tsx
 * PASTE AT: src/components/contractors/ContractorManager.tsx
 *           (create contractors/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import ContractorManager from './components/contractors/ContractorManager';
 *   {activePage === 'contractors' && <ContractorManager />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'contractors', label: 'Contractors', icon: HardHat,
 *     roles: ['admin', 'hse_manager', 'supervisor'] }
 *
 * Contractor & Visitor Safety Management
 * Features:
 *  - Contractor company profiles with safety performance ratings
 *  - Worker registration with induction tracking
 *  - Site access log (gate passes — check-in / check-out)
 *  - Induction status per worker per project
 *  - Document checklist (insurance, licences, medical certs)
 *  - Performance scorecard per contractor
 *  - CSV export of all registers
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, HardHat, User, Building2, CheckCircle2,
  XCircle, Clock, Download, Search, ChevronDown,
  LogIn, LogOut, FileText, Star, AlertTriangle,
} from 'lucide-react';
import { useAppContext } from '../../contexts';
import { useDataContext } from '../../contexts';
import { writeAuditLog } from '../../lib/auditLogger';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type InductionStatus = 'Pending' | 'Completed' | 'Expired' | 'Exempted';
type AccessStatus    = 'On-site' | 'Off-site' | 'Suspended';
type ContractorTier  = 'Approved' | 'Conditional' | 'Under Review' | 'Suspended';
import type { ContractorCompany, ContractorWorker, SiteAccessLog } from '../../types';


// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => `con_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const TIER_CONFIG: Record<ContractorTier, { color: string; bg: string }> = {
  Approved:      { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  Conditional:   { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950' },
  'Under Review':{ color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-950' },
  Suspended:     { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950' },
};

const INDUCTION_CONFIG: Record<InductionStatus, { color: string; bg: string; icon: React.ElementType }> = {
  Completed: { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: CheckCircle2 },
  Pending:   { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950',    icon: Clock },
  Expired:   { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950',        icon: AlertTriangle },
  Exempted:  { color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-100 dark:bg-slate-800',    icon: CheckCircle2 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Star rating component
// ─────────────────────────────────────────────────────────────────────────────

const StarRating: React.FC<{ score: number }> = ({ score }) => {
  const stars = Math.round(score / 20); // 0-100 → 0-5
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
      ))}
      <span className="text-xs text-slate-400 ml-1">{score}/100</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Company Form
// ─────────────────────────────────────────────────────────────────────────────

interface CompanyFormProps {
  onSave: (c: ContractorCompany) => void;
  onCancel: () => void;
  orgId: string;
}

const CompanyForm: React.FC<CompanyFormProps> = ({ onSave, onCancel, orgId }) => {
  const [f, setF] = useState({
    company_name: '', contact_name: '', contact_phone: '', contact_email: '',
    trade: '', tier: 'Under Review' as ContractorTier,
    insurance_expiry: '', insurance_number: '',
    prequalification_date: '', prequalification_expiry: '',
    performance_score: 70, notes: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: 'company_name',   label: 'Company Name *',      placeholder: 'ABC Contractors Ltd' },
          { key: 'trade',          label: 'Trade / Scope',        placeholder: 'Civil works, scaffolding...' },
          { key: 'contact_name',   label: 'Primary Contact',      placeholder: 'Full name' },
          { key: 'contact_phone',  label: 'Phone',                placeholder: '+966 5x xxx xxxx' },
          { key: 'contact_email',  label: 'Email',                placeholder: 'contact@company.com' },
          { key: 'insurance_number', label: 'Insurance Policy No.', placeholder: 'POL-12345' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</label>
            <input value={(f as any)[key]} onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        ))}
        {[
          { key: 'insurance_expiry',        label: 'Insurance Expiry' },
          { key: 'prequalification_date',   label: 'Prequalification Date' },
          { key: 'prequalification_expiry', label: 'Prequalification Expiry' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</label>
            <input type="date" value={(f as any)[key]} onChange={(e) => set(key, e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Approval Tier</label>
          <select value={f.tier} onChange={(e) => set('tier', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Approved','Conditional','Under Review','Suspended'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Performance Score (0–100)</label>
          <input type="number" min={0} max={100} value={f.performance_score} onChange={(e) => set('performance_score', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Notes</label>
        <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={() => { if (!f.company_name) return; onSave({ ...f, id: uid(), org_id: orgId, active_workers: 0, created_at: new Date().toISOString() }); }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Add Company
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Worker Form
// ─────────────────────────────────────────────────────────────────────────────

interface WorkerFormProps {
  companies: ContractorCompany[];
  projects: any[];
  onSave: (w: ContractorWorker) => void;
  onCancel: () => void;
  orgId: string;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ companies, projects, onSave, onCancel, orgId }) => {
  const [f, setF] = useState({
    company_id: companies[0]?.id ?? '', name: '', trade: '', id_number: '', phone: '',
    induction_status: 'Pending' as InductionStatus,
    induction_date: '', induction_expiry: '',
    medical_clearance: false, medical_expiry: '',
    current_project_id: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Company *</label>
          <select value={f.company_id} onChange={(e) => set('company_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {companies.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        {[
          { key: 'name',      label: 'Full Name *',   placeholder: 'Worker full name' },
          { key: 'trade',     label: 'Trade',          placeholder: 'e.g. Scaffolder' },
          { key: 'id_number', label: 'ID / Iqama No.', placeholder: 'National ID or Iqama' },
          { key: 'phone',     label: 'Phone',          placeholder: '+966...' },
        ].map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</label>
            <input value={(f as any)[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Induction Status</label>
          <select value={f.induction_status} onChange={(e) => set('induction_status', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Pending','Completed','Expired','Exempted'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Induction Date</label>
          <input type="date" value={f.induction_date} onChange={(e) => set('induction_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Induction Expiry</label>
          <input type="date" value={f.induction_expiry} onChange={(e) => set('induction_expiry', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Project</label>
          <select value={f.current_project_id} onChange={(e) => set('current_project_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">No project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={f.medical_clearance} onChange={(e) => set('medical_clearance', e.target.checked)} className="rounded" id="med" />
          <label htmlFor="med" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">Medical clearance obtained</label>
        </div>
        {f.medical_clearance && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Medical Expiry</label>
            <input type="date" value={f.medical_expiry} onChange={(e) => set('medical_expiry', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        )}
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={() => { if (!f.name) return; onSave({ ...f, id: uid(), org_id: orgId, access_status: 'Off-site', created_at: new Date().toISOString() }); }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Register Worker
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'companies' | 'workers' | 'access-log';

export const ContractorManager: React.FC = () => {
  const { activeUser, activeOrg } = useAppContext();
  const { projects, contractorCompanies: companies, contractorWorkers: workers, siteAccessLogs: accessLog,
    handleCreateContractorCompany, handleCreateContractorWorker, handleUpdateContractorWorker,
    handleCreateSiteAccessLog, handleUpdateSiteAccessLog } = useDataContext();

  const [activeTab, setActiveTab] = useState<Tab>('companies');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showWorkerForm, setShowWorkerForm]   = useState(false);
  const [search, setSearch]                   = useState('');
  const [expandedId, setExpandedId]           = useState<string | null>(null);

  const handleSaveCompany = (c: ContractorCompany) => {
    handleCreateContractorCompany(c);
    setShowCompanyForm(false);
    writeAuditLog({ org_id: activeOrg?.id ?? '', user_id: activeUser?.id ?? '', action: 'CREATE', resource_type: 'contractor_profile', resource_id: c.id, description: `Contractor company registered: ${c.company_name}`, new_value: c, timestamp: new Date().toISOString() });
  };

  const handleSaveWorker = (w: ContractorWorker) => {
    handleCreateContractorWorker(w);
    setShowWorkerForm(false);
  };

  const handleCheckIn = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    const company = companies.find((c) => c.id === worker.company_id);
    const log: SiteAccessLog = {
      id: uid(), org_id: activeOrg?.id ?? '', worker_id: workerId, worker_name: worker.name,
      company_name: company?.company_name ?? '',
      project_id: worker.current_project_id,
      check_in: new Date().toISOString(), check_out: '',
      gate: 'Main Gate', vehicle_reg: '', purpose: 'Work',
      approved_by: activeUser?.name ?? '',
    };
    handleCreateSiteAccessLog(log);
    handleUpdateContractorWorker({ ...worker, access_status: 'On-site' });
  };

  const handleCheckOut = (workerId: string) => {
    const openLog = accessLog.find((l) => l.worker_id === workerId && !l.check_out);
    if (openLog) handleUpdateSiteAccessLog({ ...openLog, check_out: new Date().toISOString() });
    const worker = workers.find((w) => w.id === workerId);
    if (worker) handleUpdateContractorWorker({ ...worker, access_status: 'Off-site' });
  };

  const filteredWorkers = workers.filter((w) =>
    !search || (w.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (companies.find((c) => c.id === w.company_id)?.company_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const stats = useMemo(() => ({
    totalCompanies: companies.length,
    approved:       companies.filter((c) => c.tier === 'Approved').length,
    onSite:         workers.filter((w) => w.access_status === 'On-site').length,
    pendingInduction: workers.filter((w) => w.induction_status === 'Pending').length,
  }), [companies, workers]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'companies',  label: `Companies (${companies.length})` },
    { id: 'workers',    label: `Workers (${workers.length})` },
    { id: 'access-log', label: `Access Log (${accessLog.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contractor Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.totalCompanies} companies · {stats.onSite} on site · {stats.pendingInduction} pending induction
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportTableToCsv(workers,
            [{ key: 'name', label: 'Name' }, { key: 'trade', label: 'Trade' }, { key: 'induction_status', label: 'Induction' }, { key: 'access_status', label: 'Access' }],
            'contractor-workers')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="contractor:create">
            {activeTab === 'companies'
              ? <button onClick={() => setShowCompanyForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
                  <Plus className="w-4 h-4" /> Add Company
                </button>
              : activeTab === 'workers'
              ? <button onClick={() => setShowWorkerForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800"
                  disabled={companies.length === 0}>
                  <Plus className="w-4 h-4" /> Register Worker
                </button>
              : null}
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Companies',        value: stats.totalCompanies, color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Approved',         value: stats.approved,       color: 'text-emerald-600' },
          { label: 'On Site Now',      value: stats.onSite,         color: 'text-blue-600' },
          { label: 'Pending Induction',value: stats.pendingInduction, color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
            }`}>{label}</button>
        ))}
      </div>

      {/* Company form */}
      {showCompanyForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Register Contractor Company</h3>
          <CompanyForm onSave={handleSaveCompany} onCancel={() => setShowCompanyForm(false)} orgId={activeOrg?.id ?? ''} />
        </div>
      )}

      {/* Worker form */}
      {showWorkerForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Register Contractor Worker</h3>
          <WorkerForm companies={companies} projects={projects} onSave={handleSaveWorker} onCancel={() => setShowWorkerForm(false)} orgId={activeOrg?.id ?? ''} />
        </div>
      )}

      {/* Companies tab */}
      {activeTab === 'companies' && (
        <div className="space-y-2">
          {companies.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Building2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No contractor companies registered yet.</p>
            </div>
          ) : companies.map((company) => {
            const tc = TIER_CONFIG[company.tier];
            const isOpen = expandedId === company.id;
            const insuranceExpired = company.insurance_expiry && new Date(company.insurance_expiry) < new Date();
            return (
              <div key={company.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button onClick={() => setExpandedId(isOpen ? null : company.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 text-left transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{company.company_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tc.bg} ${tc.color}`}>{company.tier}</span>
                      {insuranceExpired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Insurance Expired</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{company.trade} · {company.contact_name}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <StarRating score={company.performance_score} />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Contact',    value: company.contact_name },
                        { label: 'Phone',      value: company.contact_phone },
                        { label: 'Email',      value: company.contact_email },
                        { label: 'Insurance',  value: `${company.insurance_number} · Exp: ${company.insurance_expiry || '—'}` },
                        { label: 'Prequal',    value: company.prequalification_expiry || '—' },
                        { label: 'Workers',    value: workers.filter((w) => w.company_id === company.id).length },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                    {company.notes && <p className="text-xs text-slate-500 mt-3">{company.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Workers tab */}
      {activeTab === 'workers' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or company..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300" />
          </div>

          {filteredWorkers.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <HardHat className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">{companies.length === 0 ? 'Register a company first.' : 'No workers registered yet.'}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      {['Name', 'Company', 'Trade', 'Induction', 'Medical', 'Access', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkers.map((w) => {
                      const ic = INDUCTION_CONFIG[w.induction_status];
                      const IndIcon = ic.icon;
                      const company = companies.find((c) => c.id === w.company_id);
                      return (
                        <tr key={w.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{w.name}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{company?.company_name ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{w.trade}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-0.5 rounded-full ${ic.bg} ${ic.color}`}>
                              <IndIcon className="w-3 h-3" />{w.induction_status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {w.medical_clearance
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <XCircle className="w-4 h-4 text-red-400" />}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              w.access_status === 'On-site'  ? 'bg-blue-100 text-blue-700' :
                              w.access_status === 'Suspended'? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{w.access_status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <CanDo permission="contractor:update">
                              <div className="flex gap-1.5">
                                {w.access_status !== 'On-site' ? (
                                  <button onClick={() => handleCheckIn(w.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">
                                    <LogIn className="w-3 h-3" /> In
                                  </button>
                                ) : (
                                  <button onClick={() => handleCheckOut(w.id)}
                                    className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium">
                                    <LogOut className="w-3 h-3" /> Out
                                  </button>
                                )}
                              </div>
                            </CanDo>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Access log tab */}
      {activeTab === 'access-log' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {accessLog.length === 0 ? (
            <div className="text-center py-14">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No access log entries yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {['Worker', 'Company', 'Check In', 'Check Out', 'Gate', 'Purpose', 'Approved By'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accessLog.map((log) => (
                    <tr key={log.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{log.worker_name}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.company_name}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">{new Date(log.check_in).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 text-xs">
                        {log.check_out
                          ? new Date(log.check_out).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })
                          : <span className="text-blue-600 font-medium">On site</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.gate}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.purpose}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{log.approved_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractorManager;