import React, { useState, useMemo } from 'react';
import {
  Lock, Download, Trash2, CheckCircle2, AlertTriangle,
  Clock, User, FileText, Shield, ChevronDown, Plus,
  Eye, Database, RefreshCw, X, BookOpen, Bell,
} from 'lucide-react';
import { useAppContext }  from '../../contexts';
import { useDataContext } from '../../contexts';
import { writeAuditLog }  from '../../lib/auditLogger';
import { CanDo }          from '../auth/RbacGuard';

type RequestStatus = 'Pending' | 'In Progress' | 'Completed' | 'Rejected';
type RequestType   = 'DSAR' | 'Erasure' | 'Rectification' | 'Restriction' | 'Portability';
type LegalBasis    = 'Consent' | 'Contract' | 'Legal Obligation' | 'Vital Interests' | 'Public Task' | 'Legitimate Interests';
type RetentionUnit = 'days' | 'months' | 'years';
type Tab = 'requests' | 'consent' | 'retention' | 'processing' | 'breaches';

interface DataRequest {
  id: string;
  type: RequestType;
  subject_name: string;
  subject_email: string;
  submitted_by: string;
  submitted_at: string;
  deadline: string;
  status: RequestStatus;
  notes: string;
  completed_at?: string;
}

interface RetentionPolicy {
  id: string;
  data_type: string;
  description: string;
  retention_period: number;
  retention_unit: RetentionUnit;
  legal_basis: string;
  auto_delete: boolean;
}

interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  categories: string[];
  legal_basis: LegalBasis;
  data_subjects: string[];
  recipients: string[];
  third_country_transfer: boolean;
  retention_period: string;
  security_measures: string;
}

interface DataBreach {
  id: string;
  discovered_at: string;
  reported_at?: string;
  nature: string;
  categories_affected: string[];
  approximate_subjects: number;
  likely_consequences: string;
  measures_taken: string;
  regulator_notified: boolean;
  notification_deadline: string;
  status: 'Discovered' | 'Contained' | 'Reported' | 'Closed';
}

const REQUEST_DEADLINE_DAYS = 30;
const uid = () => `gdpr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const REQUEST_TYPE_CONFIG: Record<RequestType, { label: string; desc: string; color: string; bg: string }> = {
  DSAR:          { label: 'Access Request',     desc: 'Export all personal data held',          color: 'text-blue-700 dark:text-blue-300',    bg: 'bg-blue-100 dark:bg-blue-950' },
  Erasure:       { label: 'Right to Erasure',   desc: 'Delete all personal data (RTBF)',        color: 'text-red-700 dark:text-red-300',      bg: 'bg-red-100 dark:bg-red-950' },
  Rectification: { label: 'Rectification',      desc: 'Correct inaccurate personal data',       color: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-100 dark:bg-amber-950' },
  Restriction:   { label: 'Restriction',        desc: 'Restrict processing of personal data',   color: 'text-purple-700 dark:text-purple-300',bg: 'bg-purple-100 dark:bg-purple-950' },
  Portability:   { label: 'Data Portability',   desc: 'Export data in machine-readable format', color: 'text-teal-700 dark:text-teal-300',    bg: 'bg-teal-100 dark:bg-teal-950' },
};

const STATUS_CONFIG: Record<RequestStatus, { color: string; bg: string; icon: React.ElementType }> = {
  Pending:        { color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-100 dark:bg-amber-950',     icon: Clock },
  'In Progress':  { color: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-100 dark:bg-blue-950',       icon: RefreshCw },
  Completed:      { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950', icon: CheckCircle2 },
  Rejected:       { color: 'text-red-700 dark:text-red-300',         bg: 'bg-red-100 dark:bg-red-950',         icon: X },
};

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { id: 'ret_incidents',  data_type: 'Incident Reports',      description: 'Incident reports and investigation records',      retention_period: 7,  retention_unit: 'years',  legal_basis: 'Legal obligation (HSE regulations)', auto_delete: false },
  { id: 'ret_training',   data_type: 'Training Records',      description: 'Employee training completion and certifications',  retention_period: 5,  retention_unit: 'years',  legal_basis: 'Legal obligation (COSHH, LOLER)',     auto_delete: false },
  { id: 'ret_ptw',        data_type: 'Permit to Work',        description: 'Permit documentation and workflow logs',           retention_period: 7,  retention_unit: 'years',  legal_basis: 'Legal obligation (CDM, PSSR)',        auto_delete: false },
  { id: 'ret_medical',    data_type: 'Medical Assessments',   description: 'Fitness for duty and medical clearance records',   retention_period: 40, retention_unit: 'years',  legal_basis: 'Legal obligation (COSHH Reg 11)',     auto_delete: false },
  { id: 'ret_cctv',       data_type: 'CCTV / Video Records',  description: 'Site surveillance recordings',                     retention_period: 31, retention_unit: 'days',   legal_basis: 'Legitimate interests (security)',     auto_delete: true },
  { id: 'ret_visitor',    data_type: 'Visitor Records',       description: 'Site visitor logs and induction records',          retention_period: 3,  retention_unit: 'years',  legal_basis: 'Legal obligation (site security)',    auto_delete: false },
  { id: 'ret_audit',      data_type: 'Audit Logs',            description: 'System activity logs and access records',          retention_period: 5,  retention_unit: 'years',  legal_basis: 'Legitimate interests (security)',     auto_delete: false },
  { id: 'ret_contracts',  data_type: 'Contractor Records',    description: 'Contractor personnel and compliance records',       retention_period: 6,  retention_unit: 'years',  legal_basis: 'Contract',                            auto_delete: false },
];

const DEFAULT_PROCESSING_ACTIVITIES: ProcessingActivity[] = [
  {
    id: 'proc_incidents', name: 'Incident Management',
    purpose: 'Recording and investigating workplace incidents to ensure legal compliance and prevent recurrence',
    categories: ['Identity data', 'Health data', 'Employment data'],
    legal_basis: 'Legal Obligation',
    data_subjects: ['Employees', 'Contractors', 'Visitors'],
    recipients: ['HSE Manager', 'Regulatory authorities (as required)'],
    third_country_transfer: false,
    retention_period: '7 years',
    security_measures: 'Role-based access control, encryption at rest and in transit, audit logging',
  },
  {
    id: 'proc_training', name: 'Training & Competency Management',
    purpose: 'Tracking employee training completion and certification to ensure workforce competency',
    categories: ['Identity data', 'Employment data', 'Certification data'],
    legal_basis: 'Legal Obligation',
    data_subjects: ['Employees', 'Contractors'],
    recipients: ['Line managers', 'HR department'],
    third_country_transfer: false,
    retention_period: '5 years',
    security_measures: 'Role-based access control, encryption at rest',
  },
  {
    id: 'proc_health', name: 'Occupational Health & Fitness for Duty',
    purpose: 'Assessing worker fitness for duty and monitoring fatigue to prevent accidents',
    categories: ['Health data', 'Identity data', 'Employment data'],
    legal_basis: 'Legal Obligation',
    data_subjects: ['Employees', 'Contractors'],
    recipients: ['Occupational health provider', 'HR (anonymised summaries only)'],
    third_country_transfer: false,
    retention_period: '40 years (COSHH requirement)',
    security_measures: 'Restricted access (health data is special category), encryption, access logging',
  },
];

function daysRemaining(deadline: string): number {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function generateDsarExport(subjectName: string, subjectEmail: string, data: any): void {
  const bundle = {
    meta: { data_subject: subjectName, export_date: new Date().toISOString(), generated_by: 'EviroSafe HSE Platform', regulation: 'GDPR Article 15 / PDPL Article 5' },
    personal_data: {
      profile: data.usersList?.find((u: any) => u.email === subjectEmail || u.name === subjectName) ?? 'Not found',
      incident_reports: (data.reportList ?? []).filter((r: any) => r.reporter_id === subjectEmail || r.injured_person === subjectName),
      training_records: (data.trainingRecordList ?? []).filter((t: any) => t.user_id === subjectEmail),
    },
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `dsar-${subjectName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const GdprControls: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();
  const { reportList, trainingRecordList, ptwList } = useDataContext();

  const [activeTab,   setActiveTab]   = useState<Tab>('requests');
  const [requests,    setRequests]    = useState<DataRequest[]>([]);
  const [policies,    setPolicies]    = useState<RetentionPolicy[]>(DEFAULT_RETENTION_POLICIES);
  const [activities]                  = useState<ProcessingActivity[]>(DEFAULT_PROCESSING_ACTIVITIES);
  const [breaches,    setBreaches]    = useState<DataBreach[]>([]);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [showNewReq,  setShowNewReq]  = useState(false);
  const [showBreach,  setShowBreach]  = useState(false);

  const [newReq,  setNewReq]  = useState({ type: 'DSAR' as RequestType, subject_name: '', subject_email: '', notes: '' });
  const [newBreach, setNewBreach] = useState({ nature: '', categories_affected: '', approximate_subjects: 0, likely_consequences: '', measures_taken: '' });

  const overdueRequests = useMemo(() =>
    requests.filter((r) => (r.status === 'Pending' || r.status === 'In Progress') && daysRemaining(r.deadline) < 0),
  [requests]);

  const handleSubmitRequest = () => {
    if (!newReq.subject_name || !newReq.subject_email) return;
    const deadline = new Date(Date.now() + REQUEST_DEADLINE_DAYS * 86400000).toISOString().slice(0, 10);
    const req: DataRequest = { id: uid(), ...newReq, submitted_by: activeUser?.id ?? '', submitted_at: new Date().toISOString(), deadline, status: 'Pending' };
    setRequests((p) => [req, ...p]);
    setShowNewReq(false);
    setNewReq({ type: 'DSAR', subject_name: '', subject_email: '', notes: '' });
    writeAuditLog({ org_id: (activeOrg as any)?.id ?? '', user_id: activeUser?.id ?? '', action: 'CREATE', resource_type: 'user', resource_id: req.id, description: `DSR submitted: ${req.type} for ${req.subject_name}`, timestamp: new Date().toISOString() });
  };

  const updateStatus = (id: string, status: RequestStatus) =>
    setRequests((p) => p.map((r) => r.id === id ? { ...r, status, ...(status === 'Completed' ? { completed_at: new Date().toISOString() } : {}) } : r));

  const handleDsar = (req: DataRequest) => {
    generateDsarExport(req.subject_name, req.subject_email, { reportList, trainingRecordList, ptwList, usersList });
    updateStatus(req.id, 'Completed');
  };

  const handleSubmitBreach = () => {
    if (!newBreach.nature) return;
    const discovered = new Date();
    const breach: DataBreach = {
      id: uid(), discovered_at: discovered.toISOString(),
      nature: newBreach.nature,
      categories_affected: newBreach.categories_affected.split(',').map((c) => c.trim()).filter(Boolean),
      approximate_subjects: newBreach.approximate_subjects,
      likely_consequences: newBreach.likely_consequences,
      measures_taken: newBreach.measures_taken,
      regulator_notified: false,
      notification_deadline: new Date(discovered.getTime() + 72 * 3600000).toISOString(),
      status: 'Discovered',
    };
    setBreaches((p) => [breach, ...p]);
    setShowBreach(false);
    setNewBreach({ nature: '', categories_affected: '', approximate_subjects: 0, likely_consequences: '', measures_taken: '' });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'requests',   label: 'Subject Requests',   icon: User,         badge: overdueRequests.length || undefined },
    { id: 'consent',    label: 'Consent Log',         icon: CheckCircle2 },
    { id: 'retention',  label: 'Retention Policies',  icon: Clock },
    { id: 'processing', label: 'Processing Register', icon: Database },
    { id: 'breaches',   label: 'Breach Log',          icon: AlertTriangle, badge: breaches.filter((b) => b.status !== 'Closed').length || undefined },
  ];

  const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200';

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data & Privacy</h2>
        <p className="text-sm text-slate-500 mt-0.5">GDPR · PDPL (Saudi Arabia) · Data subject rights management</p>
      </div>

      {overdueRequests.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">{overdueRequests.length} data subject request{overdueRequests.length !== 1 ? 's are' : ' is'} overdue</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">GDPR / PDPL requires a response within {REQUEST_DEADLINE_DAYS} days. Regulatory fines may apply.</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit flex-wrap">
        {tabs.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{badge}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Response deadline: {REQUEST_DEADLINE_DAYS} days (GDPR Art. 12 / PDPL Art. 5)</p>
            <CanDo permission="user:admin">
              <button onClick={() => setShowNewReq(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
                <Plus className="w-4 h-4" /> New Request
              </button>
            </CanDo>
          </div>

          {showNewReq && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">New Data Subject Request</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Request Type</label>
                  <select value={newReq.type} onChange={(e) => setNewReq((p) => ({ ...p, type: e.target.value as RequestType }))} className={inputCls}>
                    {(Object.keys(REQUEST_TYPE_CONFIG) as RequestType[]).map((t) => <option key={t} value={t}>{REQUEST_TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data Subject Name *</label>
                  <input value={newReq.subject_name} onChange={(e) => setNewReq((p) => ({ ...p, subject_name: e.target.value }))} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Address *</label>
                  <input type="email" value={newReq.subject_email} onChange={(e) => setNewReq((p) => ({ ...p, subject_email: e.target.value }))} placeholder="email@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</label>
                  <input value={newReq.notes} onChange={(e) => setNewReq((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional context..." className={inputCls} />
                </div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Deadline: Response required by {new Date(Date.now() + REQUEST_DEADLINE_DAYS * 86400000).toLocaleDateString('en-GB')} ({REQUEST_DEADLINE_DAYS} days from today).
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowNewReq(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                <button onClick={handleSubmitRequest} disabled={!newReq.subject_name || !newReq.subject_email} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50">Submit</button>
              </div>
            </div>
          )}

          {requests.length === 0 && !showNewReq ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Lock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No data subject requests yet.</p>
            </div>
          ) : requests.map((req) => {
            const tc = REQUEST_TYPE_CONFIG[req.type];
            const sc = STATUS_CONFIG[req.status];
            const StatusIcon = sc.icon;
            const days = daysRemaining(req.deadline);
            const isOpen = expandedId === req.id;
            return (
              <div key={req.id} className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden ${days < 0 && req.status !== 'Completed' && req.status !== 'Rejected' ? 'border-red-300 dark:border-red-800' : 'border-slate-100 dark:border-slate-700'}`}>
                <button onClick={() => setExpandedId(isOpen ? null : req.id)} className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 text-left transition-colors">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${tc.bg}`}><Shield className={`w-4 h-4 ${tc.color}`} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>{tc.label}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.color}`}><StatusIcon className="w-3 h-3" />{req.status}</span>
                      {days < 0 && req.status !== 'Completed' && req.status !== 'Rejected' && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">OVERDUE by {Math.abs(days)}d</span>}
                      {days >= 0 && days <= 7 && req.status !== 'Completed' && req.status !== 'Rejected' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Due in {days}d</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{req.subject_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{req.subject_email} · Submitted {new Date(req.submitted_at).toLocaleDateString('en-GB')} · Deadline {req.deadline}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 flex flex-wrap gap-2">
                    {req.type === 'DSAR' && req.status !== 'Completed' && (
                      <button onClick={() => handleDsar(req)} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-semibold">
                        <Download className="w-3.5 h-3.5" /> Export Personal Data
                      </button>
                    )}
                    {req.status === 'Pending' && (
                      <button onClick={() => updateStatus(req.id, 'In Progress')} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-semibold">
                        <RefreshCw className="w-3.5 h-3.5" /> Start Processing
                      </button>
                    )}
                    {req.status === 'In Progress' && (
                      <button onClick={() => updateStatus(req.id, 'Completed')} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                      </button>
                    )}
                    {req.status !== 'Completed' && req.status !== 'Rejected' && (
                      <button onClick={() => updateStatus(req.id, 'Rejected')} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 font-semibold">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Consent Records</h3>
          <p className="text-sm text-slate-500 mb-4">Most HSE processing relies on Legal Obligation or Legitimate Interests. Consent records are created when workers accept the privacy notice.</p>
          <div className="text-center py-8">
            <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm">No consent records yet. Records are auto-created when workers accept the privacy notice at login.</p>
          </div>
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Data retention periods under GDPR Article 5(1)(e) (storage limitation) and Saudi PDPL.</p>
          {policies.map((policy) => (
            <div key={policy.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{policy.data_type}</p>
                    {policy.auto_delete && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Auto-delete</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{policy.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Retain for <strong className="ml-1 text-slate-700 dark:text-slate-300">{policy.retention_period} {policy.retention_unit}</strong></span>
                    <span>{policy.legal_basis}</span>
                  </div>
                </div>
                <CanDo permission="settings:admin">
                  <button onClick={() => setPolicies((p) => p.map((x) => x.id === policy.id ? { ...x, auto_delete: !x.auto_delete } : x))}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${policy.auto_delete ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>
                    {policy.auto_delete ? 'Auto-delete ON' : 'Auto-delete OFF'}
                  </button>
                </CanDo>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'processing' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Record of processing activities (GDPR Article 30).</p>
          {activities.map((act) => (
            <div key={act.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{act.name}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${act.legal_basis === 'Legal Obligation' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{act.legal_basis}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{act.purpose}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Data Categories',       value: act.categories.join(', ') },
                  { label: 'Data Subjects',          value: act.data_subjects.join(', ') },
                  { label: 'Recipients',             value: act.recipients.join(', ') },
                  { label: 'Retention Period',       value: act.retention_period },
                  { label: 'Third Country Transfer', value: act.third_country_transfer ? 'Yes' : 'No' },
                  { label: 'Security Measures',      value: act.security_measures },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'breaches' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">GDPR Article 33: notify supervisory authority within 72 hours. Saudi PDPL Article 24: notify NDMO without undue delay.</p>
            <CanDo permission="settings:admin">
              <button onClick={() => setShowBreach(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
                <AlertTriangle className="w-4 h-4" /> Record Breach
              </button>
            </CanDo>
          </div>

          {showBreach && (
            <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Record Data Breach — 72-hour clock starts now
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nature of breach *</label>
                  <textarea value={newBreach.nature} onChange={(e) => setNewBreach((p) => ({ ...p, nature: e.target.value }))} rows={2}
                    placeholder="e.g. Unauthorised access to employee incident records..." className={`${inputCls} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data categories affected</label>
                  <input value={newBreach.categories_affected} onChange={(e) => setNewBreach((p) => ({ ...p, categories_affected: e.target.value }))}
                    placeholder="Health data, Identity data (comma separated)" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Approximate subjects</label>
                  <input type="number" min={0} value={newBreach.approximate_subjects} onChange={(e) => setNewBreach((p) => ({ ...p, approximate_subjects: Number(e.target.value) }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Likely consequences</label>
                  <input value={newBreach.likely_consequences} onChange={(e) => setNewBreach((p) => ({ ...p, likely_consequences: e.target.value }))} placeholder="Risk to individuals..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Measures taken</label>
                  <input value={newBreach.measures_taken} onChange={(e) => setNewBreach((p) => ({ ...p, measures_taken: e.target.value }))} placeholder="Containment actions..." className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowBreach(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
                <button onClick={handleSubmitBreach} disabled={!newBreach.nature} className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Record Breach</button>
              </div>
            </div>
          )}

          {breaches.length === 0 && !showBreach ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Shield className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-500 text-sm">No data breaches recorded.</p>
            </div>
          ) : breaches.map((breach) => {
            const hoursLeft = Math.ceil((new Date(breach.notification_deadline).getTime() - Date.now()) / 3600000);
            const isOverdue = hoursLeft <= 0 && !breach.regulator_notified;
            const isUrgent  = hoursLeft > 0 && hoursLeft <= 72 && !breach.regulator_notified;
            return (
              <div key={breach.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${isOverdue ? 'border-red-400 dark:border-red-700' : isUrgent ? 'border-amber-400 dark:border-amber-700' : 'border-slate-100 dark:border-slate-700'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${breach.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{breach.status}</span>
                      {isOverdue && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">OVERDUE — Notify regulator now</span>}
                      {isUrgent  && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{hoursLeft}h until 72hr deadline</span>}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{breach.nature}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Discovered: {new Date(breach.discovered_at).toLocaleString('en-GB')} · ~{breach.approximate_subjects} subjects</p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!breach.regulator_notified && (
                      <button onClick={() => setBreaches((p) => p.map((b) => b.id === breach.id ? { ...b, regulator_notified: true, reported_at: new Date().toISOString(), status: 'Reported' } : b))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold">Mark Reported</button>
                    )}
                    {breach.status !== 'Closed' && (
                      <button onClick={() => setBreaches((p) => p.map((b) => b.id === breach.id ? { ...b, status: 'Closed' } : b))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold">Close</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GdprControls;