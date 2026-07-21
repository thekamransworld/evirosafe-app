import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import {
  Plus, X, Search, FileText, CheckCircle, Clock,
  ChevronRight, Download, Eye, History, AlertTriangle,
  Upload, Lock, Edit, Archive
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocCategory =
  | 'policy' | 'procedure' | 'form' | 'risk_assessment'
  | 'method_statement' | 'plan' | 'register' | 'certificate'
  | 'report' | 'permit' | 'other';

export type DocStatus =
  | 'draft' | 'under_review' | 'approved' | 'superseded' | 'obsolete';

export interface DocRevision {
  version:     string;
  revised_by:  string;
  revised_at:  string;
  change_notes: string;
}

export interface Document {
  id:              string;
  doc_number:      string;
  title:           string;
  category:        DocCategory;
  current_version: string;
  status:          DocStatus;
  owner:           string;
  approved_by:     string | null;
  approved_at:     string | null;
  review_date:     string;
  file_url:        string;
  revisions:       DocRevision[];
  description:     string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: any }> = {
  policy:           { label: 'Policy',           color: 'red' },
  procedure:        { label: 'Procedure',        color: 'blue' },
  form:             { label: 'Form',             color: 'green' },
  risk_assessment:  { label: 'Risk Assessment',  color: 'yellow' },
  method_statement: { label: 'Method Statement', color: 'purple' },
  plan:             { label: 'Plan',             color: 'indigo' },
  register:         { label: 'Register',         color: 'amber' },
  certificate:      { label: 'Certificate',      color: 'green' },
  report:           { label: 'Report',           color: 'gray' },
  permit:           { label: 'Permit',           color: 'orange' },
  other:            { label: 'Other',            color: 'gray' },
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: any; icon: React.FC<any> }> = {
  draft:        { label: 'Draft',        color: 'gray',   icon: Edit },
  under_review: { label: 'Under Review', color: 'yellow', icon: Clock },
  approved:     { label: 'Approved',     color: 'green',  icon: CheckCircle },
  superseded:   { label: 'Superseded',   color: 'gray',   icon: Archive },
  obsolete:     { label: 'Obsolete',     color: 'red',    icon: Archive },
};

const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_DOCS: Document[] = [
  {
    id: 'doc-001', doc_number: 'POL-HSE-001', title: 'HSE Policy Statement',
    category: 'policy', current_version: '3.1', status: 'approved',
    owner: 'HSE Manager', approved_by: 'Site Director', approved_at: '2024-01-15',
    review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Company HSE Policy signed by CEO. Describes commitment to safety.',
    revisions: [
      { version: '3.1', revised_by: 'Ahmed Al-Rashid', revised_at: '2024-01-15', change_notes: 'Updated to reflect new organisational structure.' },
      { version: '3.0', revised_by: 'Sarah Mitchell',  revised_at: '2023-07-01', change_notes: 'Annual review — no substantive changes.' },
      { version: '2.0', revised_by: 'Ahmed Al-Rashid', revised_at: '2022-01-10', change_notes: 'Added environmental policy section.' },
    ],
  },
  {
    id: 'doc-002', doc_number: 'PRO-PTW-001', title: 'Permit to Work Procedure',
    category: 'procedure', current_version: '2.3', status: 'approved',
    owner: 'HSE Manager', approved_by: 'HSE Director', approved_at: '2024-03-01',
    review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Procedure for issuing, managing and closing all permits to work on site.',
    revisions: [
      { version: '2.3', revised_by: 'Ahmed Al-Rashid', revised_at: '2024-03-01', change_notes: 'Added gas detector calibration requirement to hot work permits.' },
      { version: '2.2', revised_by: 'Sarah Mitchell',  revised_at: '2023-11-15', change_notes: 'Updated authorised signatories list.' },
    ],
  },
  {
    id: 'doc-003', doc_number: 'RA-WAH-001', title: 'Working at Height Risk Assessment',
    category: 'risk_assessment', current_version: '1.4', status: 'approved',
    owner: 'Supervisor', approved_by: 'HSE Manager', approved_at: '2024-05-20',
    review_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Risk assessment covering all working at height activities above 1.8m.',
    revisions: [
      { version: '1.4', revised_by: 'Carlos Rivera',   revised_at: '2024-05-20', change_notes: 'Added MEWP pre-use inspection checklist reference.' },
      { version: '1.3', revised_by: 'Ahmed Al-Rashid', revised_at: '2024-01-08', change_notes: 'Updated following near-miss investigation.' },
    ],
  },
  {
    id: 'doc-004', doc_number: 'MS-EXCAV-001', title: 'Excavation Method Statement',
    category: 'method_statement', current_version: '1.0', status: 'under_review',
    owner: 'Site Engineer', approved_by: null, approved_at: null,
    review_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Method statement for all excavation works below 1.2m depth.',
    revisions: [
      { version: '1.0', revised_by: 'James Okafor', revised_at: '2024-09-01', change_notes: 'Initial issue.' },
    ],
  },
  {
    id: 'doc-005', doc_number: 'FORM-INC-001', title: 'Incident Report Form',
    category: 'form', current_version: '4.0', status: 'approved',
    owner: 'HSE Manager', approved_by: 'HSE Manager', approved_at: '2024-02-01',
    review_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Standard form for reporting all incidents, near misses and observations.',
    revisions: [
      { version: '4.0', revised_by: 'Sarah Mitchell',  revised_at: '2024-02-01', change_notes: 'Added root cause analysis section.' },
      { version: '3.0', revised_by: 'Ahmed Al-Rashid', revised_at: '2023-06-01', change_notes: 'Restructured to OSHA recordable criteria.' },
    ],
  },
  {
    id: 'doc-006', doc_number: 'PLAN-ERP-001', title: 'Emergency Response Plan',
    category: 'plan', current_version: '2.1', status: 'approved',
    owner: 'HSE Manager', approved_by: 'Site Director', approved_at: '2024-04-15',
    review_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Comprehensive emergency response plan covering fire, medical and environmental incidents.',
    revisions: [
      { version: '2.1', revised_by: 'Ahmed Al-Rashid', revised_at: '2024-04-15', change_notes: 'Updated assembly point and emergency contacts.' },
    ],
  },
  {
    id: 'doc-007', doc_number: 'PRO-COSHH-001', title: 'COSHH Control Procedure',
    category: 'procedure', current_version: '1.2', status: 'draft',
    owner: 'HSE Officer', approved_by: null, approved_at: null,
    review_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    file_url: '', description: 'Procedure for assessment and control of hazardous substances on site.',
    revisions: [
      { version: '1.2', revised_by: 'Sarah Mitchell', revised_at: '2024-09-10', change_notes: 'Draft update — added new chemical assessment forms.' },
    ],
  },
];

// ─── Document Detail Modal ────────────────────────────────────────────────────

const DocDetailModal: React.FC<{
  doc:      Document;
  onClose:  () => void;
  onUpdate: (d: Document) => void;
}> = ({ doc, onClose, onUpdate }) => {
  const [tab, setTab]       = useState<'details' | 'history'>('details');
  const [status, setStatus] = useState<DocStatus>(doc.status);
  const catCfg = CATEGORY_CONFIG[doc.category];
  const stsCfg = STATUS_CONFIG[doc.status];
  const reviewDays = daysUntil(doc.review_date);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={catCfg.color}>{catCfg.label}</Badge>
              <Badge color={stsCfg.color}>{stsCfg.label}</Badge>
              {reviewDays < 0 && <Badge color="red">Review overdue</Badge>}
              {reviewDays >= 0 && reviewDays <= 30 && <Badge color="yellow">Review due in {reviewDays}d</Badge>}
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{doc.title}</h2>
            <p className="text-sm text-gray-500">{doc.doc_number} · v{doc.current_version}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="border-b dark:border-dark-border flex-shrink-0">
          <div className="flex px-6">
            {(['details', 'history'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 capitalize ${tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>
                {t === 'history' ? `Revision History (${doc.revisions.length})` : t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <div className="space-y-5">
              <p className="text-sm text-gray-600 dark:text-gray-400">{doc.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Document Owner',  value: doc.owner },
                  { label: 'Current Version', value: `v${doc.current_version}` },
                  { label: 'Approved By',     value: doc.approved_by || 'Pending approval' },
                  { label: 'Approval Date',   value: doc.approved_at ? new Date(doc.approved_at).toLocaleDateString() : 'N/A' },
                  { label: 'Review Date',     value: new Date(doc.review_date).toLocaleDateString() },
                  { label: 'Days to Review',  value: reviewDays < 0 ? `${Math.abs(reviewDays)}d overdue` : `${reviewDays}d` },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 dark:bg-dark-background rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                    <p className={`font-semibold ${item.label === 'Days to Review' && reviewDays < 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t dark:border-dark-border pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(STATUS_CONFIG) as DocStatus[]).map(s => (
                    <button key={s} onClick={() => setStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 dark:bg-dark-background border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'}`}>
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-6">
                {doc.revisions.map((rev, i) => (
                  <div key={rev.version} className="relative flex gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      <span className="text-xs font-bold">{rev.version}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-dark-background rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{rev.revised_by}</p>
                        <p className="text-xs text-gray-400">{new Date(rev.revised_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rev.change_notes}</p>
                      {i === 0 && (
                        <span className="mt-2 inline-block text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full font-semibold">Current</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            {doc.file_url ? (
              <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => window.open(doc.file_url)}>Download</Button>
            ) : (
              <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />}>Upload File</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onUpdate({ ...doc, status }); onClose(); }}>Save Changes</Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DocumentControl: React.FC = () => {
  const { can } = useAppContext();
  const [docs, setDocs]             = useState<Document[]>(MOCK_DOCS);
  const [selected, setSelected]     = useState<Document | null>(null);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState<DocCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocStatus | 'all'>('all');

  const filtered = useMemo(() => docs.filter(d => {
    const sMatch = !search || (d.title || '').toLowerCase().includes(search.toLowerCase()) || (d.doc_number || '').toLowerCase().includes(search.toLowerCase());
    const cMatch = catFilter    === 'all' || d.category === catFilter;
    const stMatch = statusFilter === 'all' || d.status   === statusFilter;
    return sMatch && cMatch && stMatch;
  }), [docs, search, catFilter, statusFilter]);

  const stats = useMemo(() => ({
    total:          docs.length,
    approved:       docs.filter(d => d.status === 'approved').length,
    pending:        docs.filter(d => d.status === 'draft' || d.status === 'under_review').length,
    reviewDue:      docs.filter(d => daysUntil(d.review_date) <= 30).length,
  }), [docs]);

  const handleUpdate = (updated: Document) =>
    setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Document Control</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Version-controlled documents with approval workflow</p>
        </div>
        {can('create', 'reports') && (
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Document</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: stats.total,     icon: FileText,      color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Approved',        value: stats.approved,  icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Draft / Review',  value: stats.pending,   icon: Clock,         color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Review Due ≤30d', value: stats.reviewDue, icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-4`}>
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or document number..."
              className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value as DocCategory | 'all')}
              className="p-2 border rounded-lg text-xs dark:bg-dark-background dark:border-dark-border dark:text-white">
              <option value="all">All Categories</option>
              {(Object.entries(CATEGORY_CONFIG) as [DocCategory, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DocStatus | 'all')}
              className="p-2 border rounded-lg text-xs dark:bg-dark-background dark:border-dark-border dark:text-white">
              <option value="all">All Statuses</option>
              {(Object.entries(STATUS_CONFIG) as [DocStatus, { label: string }][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card">
        <table className="min-w-full">
          <thead>
            <tr className="border-b dark:border-dark-border bg-gray-50 dark:bg-dark-background">
              {['Doc Number', 'Title', 'Category', 'Version', 'Status', 'Owner', 'Review Date', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc, i) => {
              const catCfg = CATEGORY_CONFIG[doc.category];
              const stsCfg = STATUS_CONFIG[doc.status];
              const reviewDays = daysUntil(doc.review_date);
              return (
                <tr key={doc.id} onClick={() => setSelected(doc)}
                  className={`border-b dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.02]'}`}>
                  <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{doc.doc_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{doc.title}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{doc.description}</p>
                  </td>
                  <td className="py-3 px-4"><Badge color={catCfg.color}>{catCfg.label}</Badge></td>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">v{doc.current_version}</td>
                  <td className="py-3 px-4"><Badge color={stsCfg.color}>{stsCfg.label}</Badge></td>
                  <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{doc.owner}</td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <span className={reviewDays < 0 ? 'text-red-600 font-bold' : reviewDays <= 30 ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                      {new Date(doc.review_date).toLocaleDateString()}
                      {reviewDays < 0 && ' ⚠️'}
                    </span>
                  </td>
                  <td className="py-3 px-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No documents found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <DocDetailModal doc={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  );
};