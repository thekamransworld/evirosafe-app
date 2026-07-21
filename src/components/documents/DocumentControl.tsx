/**
 * FILE: src/components/documents/DocumentControl.tsx
 * PASTE AT: src/components/documents/DocumentControl.tsx
 *           (create documents/ folder inside src/components/)
 *
 * TO ADD TO APP (src/App.tsx):
 *   import DocumentControl from './components/documents/DocumentControl';
 *   {activePage === 'documents' && <DocumentControl />}
 *
 * SIDEBAR NAV ITEM:
 *   { id: 'documents', label: 'Document Control', icon: FolderOpen,
 *     roles: ['admin', 'hse_manager', 'supervisor', 'worker'] }
 *
 * Document Control Module (ISO 45001 clause 7.5 aligned)
 * Features:
 *  - Document registry with version history
 *  - Review cycle tracking with due-date alerts
 *  - Distribution lists and acknowledgement tracking
 *  - Document categories: Procedure, Policy, Form, MSDS, Drawing, Other
 *  - Status workflow: Draft → Under Review → Approved → Superseded
 *  - File upload reference (stores filename/URL, not the actual file)
 *  - Full text search across title, category, reference number
 *  - CSV export
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, FileText, Search, Download, FolderOpen,
  CheckCircle2, Clock, AlertTriangle, ChevronDown,
  ChevronRight, Eye, Edit3, Archive, RefreshCw,
  Users, BookOpen, X,
} from 'lucide-react';
import { useAppContext } from '../../contexts';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';
import { writeAuditLog } from '../../lib/auditLogger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type DocStatus   = 'Draft' | 'Under Review' | 'Approved' | 'Superseded' | 'Obsolete';
type DocCategory = 'Policy' | 'Procedure' | 'Work Instruction' | 'Form' | 'MSDS/SDS'
                 | 'Drawing' | 'Risk Assessment' | 'Emergency Plan' | 'Training Material' | 'Other';

interface DocVersion {
  version: string;
  revised_by: string;
  revision_date: string;
  change_summary: string;
}

interface DocAcknowledgement {
  user_id: string;
  user_name: string;
  acknowledged_at: string;
}

interface HseDocument {
  id: string;
  org_id: string;
  reference_number: string;
  title: string;
  category: DocCategory;
  status: DocStatus;
  current_version: string;
  owner_id: string;
  approved_by_id: string;
  approved_date: string;
  effective_date: string;
  review_date: string;
  next_review_date: string;
  review_frequency_months: number;
  description: string;
  file_url: string;
  file_name: string;
  distribution_list: string[];   // user_ids
  acknowledgements: DocAcknowledgement[];
  version_history: DocVersion[];
  tags: string[];
  project_id: string;
  created_at: string;
  created_by: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const STATUS_CONFIG: Record<DocStatus, { color: string; bg: string; icon: React.ElementType }> = {
  Draft:          { color: 'text-slate-600 dark:text-slate-400',    bg: 'bg-slate-100 dark:bg-slate-800',    icon: Edit3 },
  'Under Review': { color: 'text-blue-700 dark:text-blue-300',      bg: 'bg-blue-100 dark:bg-blue-950',      icon: RefreshCw },
  Approved:       { color: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-100 dark:bg-emerald-950',icon: CheckCircle2 },
  Superseded:     { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950',    icon: Archive },
  Obsolete:       { color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-950',        icon: X },
};

const CATEGORY_ICONS: Partial<Record<DocCategory, React.ElementType>> = {
  Policy:            BookOpen,
  Procedure:         FileText,
  'Work Instruction':FileText,
  Form:              FileText,
  'MSDS/SDS':        AlertTriangle,
  Drawing:           FolderOpen,
  'Risk Assessment': AlertTriangle,
  'Emergency Plan':  AlertTriangle,
  'Training Material': Users,
  Other:             FileText,
};

const DOC_CATEGORIES: DocCategory[] = [
  'Policy', 'Procedure', 'Work Instruction', 'Form', 'MSDS/SDS',
  'Drawing', 'Risk Assessment', 'Emergency Plan', 'Training Material', 'Other',
];

const REVIEW_FREQUENCIES = [
  { label: '3 months',  value: 3 },
  { label: '6 months',  value: 6 },
  { label: '12 months', value: 12 },
  { label: '24 months', value: 24 },
  { label: '36 months', value: 36 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcNextReview(effectiveDate: string, months: number): string {
  if (!effectiveDate) return '';
  const d = new Date(effectiveDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function reviewDaysLeft(nextReviewDate: string): number {
  if (!nextReviewDate) return 999;
  const diff = new Date(nextReviewDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Document Form
// ─────────────────────────────────────────────────────────────────────────────

interface AddDocFormProps {
  onSave: (doc: HseDocument) => void;
  onCancel: () => void;
  orgId: string;
  userId: string;
  usersList: any[];
}

const AddDocForm: React.FC<AddDocFormProps> = ({ onSave, onCancel, orgId, userId, usersList }) => {
  const [f, setF] = useState({
    reference_number: '',
    title: '',
    category: 'Procedure' as DocCategory,
    status: 'Draft' as DocStatus,
    current_version: '1.0',
    owner_id: userId,
    approved_by_id: '',
    approved_date: '',
    effective_date: new Date().toISOString().slice(0, 10),
    review_frequency_months: 12,
    description: '',
    file_url: '',
    file_name: '',
    tags: '',
    project_id: '',
    distribution_list: [] as string[],
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const nextReview = calcNextReview(f.effective_date, f.review_frequency_months);

  const toggleDistribution = (uid: string) => {
    setF((p) => ({
      ...p,
      distribution_list: p.distribution_list.includes(uid)
        ? p.distribution_list.filter((id) => id !== uid)
        : [...p.distribution_list, uid],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Reference Number *</label>
          <input value={f.reference_number} onChange={(e) => set('reference_number', e.target.value)}
            placeholder="HSE-PRO-001"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Version</label>
          <input value={f.current_version} onChange={(e) => set('current_version', e.target.value)}
            placeholder="1.0"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Document Title *</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Hot Work Permit Procedure"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Category</label>
          <select value={f.category} onChange={(e) => set('category', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Status</label>
          <select value={f.status} onChange={(e) => set('status', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Draft','Under Review','Approved'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Document Owner</label>
          <select value={f.owner_id} onChange={(e) => set('owner_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">Select owner</option>
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Approved By</label>
          <select value={f.approved_by_id} onChange={(e) => set('approved_by_id', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            <option value="">Select approver</option>
            {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Effective Date</label>
          <input type="date" value={f.effective_date} onChange={(e) => set('effective_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Review Frequency</label>
          <select value={f.review_frequency_months} onChange={(e) => set('review_frequency_months', Number(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {REVIEW_FREQUENCIES.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
          </select>
          {nextReview && (
            <p className="text-xs text-slate-400 mt-1">Next review: {nextReview}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Approval Date</label>
          <input type="date" value={f.approved_date} onChange={(e) => set('approved_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">File / URL Reference</label>
          <input value={f.file_url} onChange={(e) => set('file_url', e.target.value)}
            placeholder="https://drive.google.com/... or SharePoint link"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          <p className="text-xs text-slate-400 mt-1">Paste the document link from your file storage (Google Drive, SharePoint, etc.)</p>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description</label>
          <textarea value={f.description} onChange={(e) => set('description', e.target.value)}
            rows={2} placeholder="Brief description of document purpose and scope..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Tags (comma separated)</label>
          <input value={f.tags} onChange={(e) => set('tags', e.target.value)}
            placeholder="safety, permit, hot work..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      </div>

      {/* Distribution list */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
          Distribution List ({f.distribution_list.length} selected)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1">
          {usersList.map((u: any) => (
            <label key={u.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-colors ${
              f.distribution_list.includes(u.id)
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}>
              <input type="checkbox" checked={f.distribution_list.includes(u.id)}
                onChange={() => toggleDistribution(u.id)} className="sr-only" />
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                f.distribution_list.includes(u.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
              }`}>
                {f.distribution_list.includes(u.id) && (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="truncate">{u.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!f.title || !f.reference_number) return;
            const doc: HseDocument = {
              ...f,
              id: uid(),
              org_id: orgId,
              review_date: f.effective_date,
              next_review_date: nextReview,
              tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean),
              acknowledgements: [],
              version_history: [{
                version: f.current_version,
                revised_by: userId,
                revision_date: f.effective_date,
                change_summary: 'Initial version',
              }],
              created_at: new Date().toISOString(),
              created_by: userId,
            };
            onSave(doc);
          }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Add Document
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentControl: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();

  const [documents, setDocuments] = useState<HseDocument[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState<DocCategory | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<DocStatus | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ackDocId, setAckDocId]   = useState<string | null>(null);

  const handleSave = (doc: HseDocument) => {
    setDocuments((prev) => [doc, ...prev]);
    setShowForm(false);
    writeAuditLog({
      org_id: activeOrg?.id ?? '',
      user_id: activeUser?.id ?? '',
      action: 'CREATE',
      resource_type: 'document',
      resource_id: doc.id,
      description: `Document registered: ${doc.reference_number} — ${doc.title}`,
      new_value: { id: doc.id, title: doc.title, reference_number: doc.reference_number, version: doc.current_version },
      timestamp: new Date().toISOString(),
    });
  };

  const handleAcknowledge = (docId: string) => {
    if (!activeUser) return;
    setDocuments((prev) => prev.map((doc) => {
      if (doc.id !== docId) return doc;
      const alreadyAcked = doc.acknowledgements.some((a) => a.user_id === activeUser.id);
      if (alreadyAcked) return doc;
      return {
        ...doc,
        acknowledgements: [...doc.acknowledgements, {
          user_id: activeUser.id,
          user_name: activeUser.name ?? activeUser.email ?? activeUser.id,
          acknowledged_at: new Date().toISOString(),
        }],
      };
    }));
    setAckDocId(null);
  };

  const handleStatusChange = (docId: string, newStatus: DocStatus) => {
    setDocuments((prev) => prev.map((doc) =>
      doc.id === docId ? { ...doc, status: newStatus } : doc,
    ));
    writeAuditLog({
      org_id: activeOrg?.id ?? '',
      user_id: activeUser?.id ?? '',
      action: 'STATUS_CHANGE',
      resource_type: 'document',
      resource_id: docId,
      description: `Document status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
    });
  };

  const filtered = useMemo(() => documents.filter((doc) => {
    if (filterCat !== 'All' && doc.category !== filterCat) return false;
    if (filterStatus !== 'All' && doc.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return ((doc.title ?? '').toLowerCase().includes(s)
        || (doc.reference_number ?? '').toLowerCase().includes(s)
        || doc.tags.some((t) => (t ?? '').toLowerCase().includes(s))
        || (doc.description ?? '').toLowerCase().includes(s));
    }
    return true;
  }), [documents, filterCat, filterStatus, search]);

  // Summary stats
  const stats = useMemo(() => ({
    total:       documents.length,
    approved:    documents.filter((d) => d.status === 'Approved').length,
    reviewDue:   documents.filter((d) => reviewDaysLeft(d.next_review_date) <= 30).length,
    overdue:     documents.filter((d) => reviewDaysLeft(d.next_review_date) < 0).length,
    draft:       documents.filter((d) => d.status === 'Draft' || d.status === 'Under Review').length,
  }), [documents]);

  // Check if current user has acknowledged a document
  const hasAcknowledged = (doc: HseDocument) =>
    doc.acknowledgements.some((a) => a.user_id === activeUser?.id);

  const ackRate = (doc: HseDocument) => {
    if (!doc.distribution_list.length) return null;
    return Math.round((doc.acknowledgements.length / doc.distribution_list.length) * 100);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Document Control</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            ISO 45001 §7.5 · {stats.total} documents · {stats.reviewDue} due for review
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportTableToCsv(documents, [
              { key: 'reference_number', label: 'Ref No.' },
              { key: 'title',            label: 'Title' },
              { key: 'category',         label: 'Category' },
              { key: 'current_version',  label: 'Version' },
              { key: 'status',           label: 'Status' },
              { key: 'next_review_date', label: 'Next Review' },
              { key: 'effective_date',   label: 'Effective Date' },
            ], 'document-register')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="document:create">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Add Document
            </button>
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: stats.total,     color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Approved',    value: stats.approved,  color: 'text-emerald-600' },
          { label: 'In Progress', value: stats.draft,     color: 'text-blue-600' },
          { label: 'Review Due',  value: stats.reviewDue, color: 'text-amber-600' },
          { label: 'Overdue',     value: stats.overdue,   color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Register New Document</h3>
          <AddDocForm
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            orgId={activeOrg?.id ?? ''}
            userId={activeUser?.id ?? ''}
            usersList={usersList}
          />
        </div>
      )}

      {/* Acknowledge modal */}
      {ackDocId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Acknowledge Document</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              By clicking confirm, you acknowledge that you have read, understood, and agree to comply with this document.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setAckDocId(null)}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button onClick={() => handleAcknowledge(ackDocId)}
                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, reference, tags..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as any)}
          className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-600 dark:text-slate-400">
          <option value="All">All categories</option>
          {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-600 dark:text-slate-400">
          <option value="All">All statuses</option>
          {['Draft','Under Review','Approved','Superseded','Obsolete'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
          <FolderOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {documents.length === 0 ? 'No documents registered yet.' : 'No documents match your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const sc = STATUS_CONFIG[doc.status];
            const StatusIcon = sc.icon;
            const CatIcon = CATEGORY_ICONS[doc.category] ?? FileText;
            const isOpen = expandedId === doc.id;
            const daysLeft = reviewDaysLeft(doc.next_review_date);
            const reviewAlert = daysLeft < 0 ? 'overdue' : daysLeft <= 30 ? 'due-soon' : null;
            const userHasAcked = hasAcknowledged(doc);
            const ackRatePct = ackRate(doc);
            const owner = usersList.find((u: any) => u.id === doc.owner_id);

            return (
              <div key={doc.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-shadow hover:shadow-sm ${
                  reviewAlert === 'overdue' ? 'border-red-200 dark:border-red-800' :
                  reviewAlert === 'due-soon' ? 'border-amber-200 dark:border-amber-800' :
                  'border-slate-100 dark:border-slate-700'
                }`}>

                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : doc.id)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors text-left">
                  <div className="flex-shrink-0 mt-0.5">
                    <CatIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{doc.reference_number}</span>
                      <span className="text-xs text-slate-400">v{doc.current_version}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color} flex items-center gap-1`}>
                        <StatusIcon className="w-2.5 h-2.5" />{doc.status}
                      </span>
                      {reviewAlert === 'overdue' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Review Overdue</span>
                      )}
                      {reviewAlert === 'due-soon' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Review in {daysLeft}d</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">{doc.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">{doc.category}</span>
                      {owner && <span className="text-xs text-slate-400">Owner: {owner.name}</span>}
                      {doc.next_review_date && <span className="text-xs text-slate-400">Review: {doc.next_review_date}</span>}
                      {ackRatePct !== null && (
                        <span className="text-xs text-slate-400">Acknowledged: {doc.acknowledgements.length}/{doc.distribution_list.length}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.distribution_list.includes(activeUser?.id ?? '') && !userHasAcked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAckDocId(doc.id); }}
                        className="px-2.5 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium whitespace-nowrap">
                        Acknowledge
                      </button>
                    )}
                    {userHasAcked && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-4">
                    {doc.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{doc.description}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Effective Date',  value: doc.effective_date },
                        { label: 'Approved Date',   value: doc.approved_date || '—' },
                        { label: 'Next Review',     value: doc.next_review_date || '—' },
                        { label: 'Review Cycle',    value: `Every ${doc.review_frequency_months} months` },
                        { label: 'Approved By',     value: usersList.find((u: any) => u.id === doc.approved_by_id)?.name ?? '—' },
                        { label: 'Distribution',    value: `${doc.distribution_list.length} people` },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {doc.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Version history */}
                    {doc.version_history.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Version History</p>
                        <div className="space-y-1">
                          {doc.version_history.map((v, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-700 last:border-0">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-8">{v.version}</span>
                              <span>{v.revision_date}</span>
                              <span className="flex-1 truncate">{v.change_summary}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acknowledgements */}
                    {doc.distribution_list.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Acknowledgements ({doc.acknowledgements.length}/{doc.distribution_list.length})
                          </p>
                          {ackRatePct !== null && (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ackRatePct}%` }} />
                              </div>
                              <span className="text-xs text-slate-400">{ackRatePct}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {doc.distribution_list.map((uid) => {
                            const user = usersList.find((u: any) => u.id === uid);
                            const acked = doc.acknowledgements.some((a) => a.user_id === uid);
                            return (
                              <div key={uid} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                acked ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              }`}>
                                {acked ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {user?.name ?? uid}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium">
                          <Eye className="w-3.5 h-3.5" /> Open Document
                        </a>
                      )}
                      <CanDo permission="document:approve">
                        {doc.status === 'Under Review' && (
                          <button onClick={() => handleStatusChange(doc.id, 'Approved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                        )}
                        {doc.status === 'Draft' && (
                          <button onClick={() => handleStatusChange(doc.id, 'Under Review')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 font-medium">
                            <RefreshCw className="w-3.5 h-3.5" /> Submit for Review
                          </button>
                        )}
                        {doc.status === 'Approved' && (
                          <button onClick={() => handleStatusChange(doc.id, 'Superseded')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium">
                            <Archive className="w-3.5 h-3.5" /> Supersede
                          </button>
                        )}
                      </CanDo>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentControl;