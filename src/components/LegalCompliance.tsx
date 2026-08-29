import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import type { LegalComplianceItem, LegalComplianceStatus, LegalComplianceCategory } from '../types';
import {
  Plus, X, Search, CheckCircle, AlertTriangle,
  XCircle, MinusCircle, ChevronRight, Scale,
  Globe, BookOpen, Shield, Calendar, User
} from 'lucide-react';

// Types now live in types.ts as LegalComplianceItem/Status/Category (kept
// here as local aliases so the rest of this file doesn't need renaming).
type ComplianceStatus = LegalComplianceStatus;
type ComplianceCategory = LegalComplianceCategory;
type ComplianceItem = LegalComplianceItem;

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComplianceStatus, {
  label: string; color: any; icon: React.FC<any>;
  bg: string; border: string;
}> = {
  compliant:      { label: 'Compliant',       color: 'green',  icon: CheckCircle, bg: 'bg-green-50 dark:bg-green-900/10',   border: 'border-l-green-500' },
  partial:        { label: 'Partial',         color: 'yellow', icon: AlertTriangle,bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-l-yellow-500' },
  non_compliant:  { label: 'Non-Compliant',   color: 'red',    icon: XCircle,     bg: 'bg-red-50 dark:bg-red-900/10',       border: 'border-l-red-500' },
  not_applicable: { label: 'N/A',             color: 'gray',   icon: MinusCircle, bg: 'bg-gray-50 dark:bg-gray-800/20',     border: 'border-l-gray-400' },
};

const CATEGORY_CONFIG: Record<ComplianceCategory, { label: string; color: any }> = {
  health_safety:   { label: 'Health & Safety',  color: 'blue' },
  environment:     { label: 'Environment',      color: 'green' },
  fire:            { label: 'Fire Safety',      color: 'red' },
  electrical:      { label: 'Electrical',       color: 'yellow' },
  pressure_vessel: { label: 'Pressure Vessel',  color: 'purple' },
  lifting:         { label: 'Lifting Ops',      color: 'amber' },
  construction:    { label: 'Construction',     color: 'indigo' },
  chemical:        { label: 'Chemical/COSHH',   color: 'pink' },
  other:           { label: 'Other',            color: 'gray' },
};

const daysUntil = (d: string) =>
  Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

// ─── Creation Modal ───────────────────────────────────────────────────────────

const ComplianceCreationModal: React.FC<{
  onClose: () => void; onSave: (item: ComplianceItem) => void;
}> = ({ onClose, onSave }) => {
  const { activeUser, activeOrg } = useAppContext();
  const [form, setForm] = useState({
    title: '', regulation_ref: '', jurisdiction: '',
    category: 'health_safety' as ComplianceCategory,
    requirement: '', responsible: '',
    next_review: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.requirement) { alert('Title and requirement are required.'); return; }
    onSave({
      id: `legal-${Date.now()}`,
      org_id: activeOrg?.id ?? '',
      ...form,
      compliance_status: 'partial',
      evidence: '',
      notes: '',
      last_assessed: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      created_by: activeUser?.id ?? '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="text-lg font-bold dark:text-white">Add Regulation</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
              placeholder="e.g. Working at Height Regulations" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Regulation Reference</label>
              <input value={form.regulation_ref} onChange={e => set('regulation_ref', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
                placeholder="e.g. WAH Regs 2005" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Jurisdiction</label>
              <input value={form.jurisdiction} onChange={e => set('jurisdiction', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
                placeholder="e.g. Saudi Arabia" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white">
                {(Object.entries(CATEGORY_CONFIG) as [ComplianceCategory, { label: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Next Review Date</label>
              <input type="date" value={form.next_review} onChange={e => set('next_review', e.target.value)}
                className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Requirement *</label>
            <textarea value={form.requirement} onChange={e => set('requirement', e.target.value)} rows={3}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
              placeholder="What does this regulation require?" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Responsible Person/Role</label>
            <input value={form.responsible} onChange={e => set('responsible', e.target.value)}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white"
              placeholder="e.g. HSE Manager" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Add Regulation</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const ComplianceDetailModal: React.FC<{
  item: ComplianceItem; onClose: () => void; onUpdate: (item: ComplianceItem) => void;
}> = ({ item, onClose, onUpdate }) => {
  const [status, setStatus] = useState<ComplianceStatus>(item.compliance_status);
  const [evidence, setEvidence] = useState(item.evidence);
  const [notes, setNotes] = useState(item.notes);
  const sCfg = STATUS_CONFIG[item.compliance_status];
  const cCfg = CATEGORY_CONFIG[item.category];
  const reviewDays = daysUntil(item.next_review);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={cCfg.color}>{cCfg.label}</Badge>
              <Badge color={sCfg.color}>{sCfg.label}</Badge>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{item.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{item.regulation_ref} · {item.jurisdiction}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-dark-background rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Legal Requirement</p>
            <p className="text-sm text-gray-800 dark:text-gray-200">{item.requirement}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-gray-500 mb-1">Responsible</p><p className="font-semibold dark:text-white">{item.responsible}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Last Assessed</p><p className="font-semibold dark:text-white">{new Date(item.last_assessed).toLocaleDateString()}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Next Review</p>
              <p className={`font-semibold ${reviewDays < 0 ? 'text-red-600' : reviewDays <= 30 ? 'text-yellow-600' : 'dark:text-white'}`}>
                {new Date(item.next_review).toLocaleDateString()} {reviewDays < 0 ? '(OVERDUE)' : reviewDays <= 30 ? `(${reviewDays}d)` : ''}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Compliance Status</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as ComplianceStatus[]).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 dark:bg-dark-background border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'}`}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evidence / Controls in Place</label>
            <textarea value={evidence} onChange={e => setEvidence(e.target.value)} rows={3}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes / Actions Required</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onUpdate({ ...item, compliance_status: status, evidence, notes, last_assessed: new Date().toISOString().split('T')[0] }); onClose(); }}>Save Assessment</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LegalCompliance: React.FC = () => {
  const { legalComplianceList, handleCreateLegalComplianceItem, handleUpdateLegalComplianceItem } = useDataContext();
  const items = legalComplianceList;
  const [showCreate, setShowCreate]     = useState(false);
  const [selected, setSelected]   = useState<ComplianceItem | null>(null);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<ComplianceCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'all'>('all');

  const filtered = useMemo(() => items.filter(i => {
    const sMatch = !search || (i.title || '').toLowerCase().includes(search.toLowerCase()) || (i.regulation_ref || '').toLowerCase().includes(search.toLowerCase());
    const cMatch = catFilter    === 'all' || i.category          === catFilter;
    const stMatch = statusFilter === 'all' || i.compliance_status === statusFilter;
    return sMatch && cMatch && stMatch;
  }), [items, search, catFilter, statusFilter]);

  const stats = useMemo(() => ({
    total:          items.filter(i => i.compliance_status !== 'not_applicable').length,
    compliant:      items.filter(i => i.compliance_status === 'compliant').length,
    nonCompliant:   items.filter(i => i.compliance_status === 'non_compliant').length,
    partial:        items.filter(i => i.compliance_status === 'partial').length,
    reviewDue:      items.filter(i => daysUntil(i.next_review) <= 30).length,
  }), [items]);

  const complianceRate = stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0;

  const handleUpdate = (updated: ComplianceItem) => handleUpdateLegalComplianceItem(updated);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Legal Compliance Register</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Regulatory requirements and compliance status</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>Add Regulation</Button>
      </div>

      {/* Compliance rate banner */}
      <div className={`rounded-xl p-5 flex items-center gap-6 ${complianceRate >= 90 ? 'bg-green-50 dark:bg-green-900/20' : complianceRate >= 70 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
        <div>
          <p className={`text-5xl font-black ${complianceRate >= 90 ? 'text-green-600' : complianceRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>{complianceRate}%</p>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">Overall Compliance Rate</p>
        </div>
        <div className="flex-1">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div className={`h-4 rounded-full transition-all ${complianceRate >= 90 ? 'bg-green-500' : complianceRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${complianceRate}%` }} />
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-green-600 font-semibold">✓ {stats.compliant} Compliant</span>
            <span className="text-yellow-600 font-semibold">~ {stats.partial} Partial</span>
            <span className="text-red-600 font-semibold">✗ {stats.nonCompliant} Non-compliant</span>
            {stats.reviewDue > 0 && <span className="text-orange-600 font-semibold">⏰ {stats.reviewDue} reviews due</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search regulations..."
              className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value as ComplianceCategory | 'all')}
            className="p-2 border rounded-lg text-xs dark:bg-dark-background dark:border-dark-border dark:text-white">
            <option value="all">All Categories</option>
            {(Object.entries(CATEGORY_CONFIG) as [ComplianceCategory, { label: string }][]).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="flex gap-2">
            {(['all', 'compliant', 'partial', 'non_compliant'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s as ComplianceStatus | 'all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                {s === 'all' ? 'All' : STATUS_CONFIG[s as ComplianceStatus].label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Items */}
      <div className="space-y-2">
        {filtered.map(item => {
          const sCfg = STATUS_CONFIG[item.compliance_status];
          const cCfg = CATEGORY_CONFIG[item.category];
          const reviewDays = daysUntil(item.next_review);
          return (
            <div key={item.id} onClick={() => setSelected(item)}
              className={`bg-white dark:bg-dark-card rounded-xl border-l-4 ${sCfg.border} border border-gray-100 dark:border-dark-border p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4`}>
              <sCfg.icon className={`w-6 h-6 flex-shrink-0 ${item.compliance_status === 'compliant' ? 'text-green-500' : item.compliance_status === 'non_compliant' ? 'text-red-500' : item.compliance_status === 'partial' ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Badge color={cCfg.color}>{cCfg.label}</Badge>
                  <span className="text-xs font-mono text-gray-400">{item.regulation_ref}</span>
                </div>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{item.evidence}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <Badge color={sCfg.color}>{sCfg.label}</Badge>
                <p className={`text-xs mt-1 ${reviewDays < 0 ? 'text-red-500 font-semibold' : reviewDays <= 30 ? 'text-yellow-500' : 'text-gray-400'}`}>
                  Review: {reviewDays < 0 ? 'OVERDUE' : `${reviewDays}d`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          );
        })}
      </div>

      {showCreate && <ComplianceCreationModal onClose={() => setShowCreate(false)} onSave={handleCreateLegalComplianceItem} />}
      {selected && <ComplianceDetailModal item={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  );
};