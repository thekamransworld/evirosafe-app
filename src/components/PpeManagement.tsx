import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import {
  Plus, X, Search, AlertTriangle, CheckCircle,
  Package, ChevronRight, User, Calendar,
  ShieldCheck, HardHat, Eye, Ear, Wind, Hand
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PpeCategory =
  | 'head' | 'eye_face' | 'hearing' | 'respiratory'
  | 'hand' | 'foot' | 'body' | 'fall_protection' | 'other';

export interface PpeItem {
  id:               string;
  item_name:        string;
  category:         PpeCategory;
  standard:         string;
  quantity_total:   number;
  quantity_issued:  number;
  reorder_level:    number;
  unit_cost:        number;
  supplier:         string;
  inspection_freq:  number;
  last_inspected:   string | null;
  next_inspection:  string | null;
  condition:        'good' | 'worn' | 'damaged';
  notes:            string;
}

export interface PpeIssue {
  id:          string;
  ppe_id:      string;
  ppe_name:    string;
  issued_to:   string;
  issued_by:   string;
  issued_at:   string;
  quantity:    number;
  returned:    boolean;
  returned_at: string | null;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<PpeCategory, { label: string; icon: React.FC<any>; color: string }> = {
  head:            { label: 'Head Protection',     icon: HardHat,    color: 'text-yellow-600' },
  eye_face:        { label: 'Eye / Face',          icon: Eye,        color: 'text-blue-600' },
  hearing:         { label: 'Hearing Protection',  icon: Ear,        color: 'text-purple-600' },
  respiratory:     { label: 'Respiratory',         icon: Wind,       color: 'text-green-600' },
  hand:            { label: 'Hand Protection',     icon: Hand,       color: 'text-orange-600' },
  foot:            { label: 'Foot Protection',     icon: ShieldCheck,color: 'text-red-600' },
  body:            { label: 'Body / High-Vis',     icon: ShieldCheck,color: 'text-lime-600' },
  fall_protection: { label: 'Fall Protection',     icon: ShieldCheck,color: 'text-red-700' },
  other:           { label: 'Other PPE',           icon: Package,    color: 'text-gray-600' },
};

const daysUntil = (d: string | null) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PPE: PpeItem[] = [
  { id: 'ppe-1', item_name: 'Safety Helmet (EN 397)',     category: 'head',            standard: 'EN 397',        quantity_total: 150, quantity_issued: 124, reorder_level: 20, unit_cost: 45,  supplier: 'SafetyFirst Arabia',  inspection_freq: 30, last_inspected: '2024-09-01', next_inspection: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: '' },
  { id: 'ppe-2', item_name: 'Safety Glasses (ANSI Z87.1)',category: 'eye_face',        standard: 'ANSI Z87.1',    quantity_total: 200, quantity_issued: 180, reorder_level: 30, unit_cost: 12,  supplier: 'SafetyFirst Arabia',  inspection_freq: 30, last_inspected: '2024-09-01', next_inspection: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: '' },
  { id: 'ppe-3', item_name: 'Safety Boots S3 (EN ISO 20345)',category: 'foot',         standard: 'EN ISO 20345',  quantity_total: 100, quantity_issued: 95,  reorder_level: 15, unit_cost: 180, supplier: 'WorkSafe KSA',        inspection_freq: 90, last_inspected: '2024-07-15', next_inspection: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'worn',    notes: '5 pairs showing heavy wear' },
  { id: 'ppe-4', item_name: 'Full Body Harness (EN 361)', category: 'fall_protection', standard: 'EN 361',        quantity_total: 40,  quantity_issued: 38,  reorder_level: 5,  unit_cost: 320, supplier: 'Height Safety Intl',  inspection_freq: 30, last_inspected: '2024-08-15', next_inspection: new Date(Date.now() + 5  * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: '' },
  { id: 'ppe-5', item_name: 'Hi-Vis Vest Class 2 (EN 471)',category: 'body',           standard: 'EN 471',        quantity_total: 250, quantity_issued: 210, reorder_level: 40, unit_cost: 18,  supplier: 'SafetyFirst Arabia',  inspection_freq: 90, last_inspected: '2024-06-01', next_inspection: new Date(Date.now() - 5  * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'worn',    notes: 'Inspection overdue' },
  { id: 'ppe-6', item_name: 'Ear Defenders (SNR 30dB)',   category: 'hearing',         standard: 'EN 352-1',      quantity_total: 80,  quantity_issued: 60,  reorder_level: 10, unit_cost: 25,  supplier: 'WorkSafe KSA',        inspection_freq: 30, last_inspected: '2024-09-01', next_inspection: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: '' },
  { id: 'ppe-7', item_name: 'P2 Dust Mask (FFP2)',        category: 'respiratory',     standard: 'EN 149 FFP2',   quantity_total: 500, quantity_issued: 380, reorder_level: 100,unit_cost: 3.5, supplier: 'MedSupply KSA',       inspection_freq: 7,  last_inspected: '2024-09-10', next_inspection: new Date(Date.now() + 2  * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: 'Disposable — replace weekly' },
  { id: 'ppe-8', item_name: 'Cut-Resistant Gloves Level D',category: 'hand',           standard: 'EN 388 Level D', quantity_total: 200, quantity_issued: 185, reorder_level: 30, unit_cost: 22,  supplier: 'SafetyFirst Arabia',  inspection_freq: 30, last_inspected: '2024-09-01', next_inspection: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], condition: 'good',    notes: '' },
];

const MOCK_ISSUES: PpeIssue[] = [
  { id: 'i1', ppe_id: 'ppe-1', ppe_name: 'Safety Helmet',       issued_to: 'Carlos Rivera',  issued_by: 'HSE Officer', issued_at: '2024-09-15T07:00:00Z', quantity: 1, returned: false, returned_at: null },
  { id: 'i2', ppe_id: 'ppe-4', ppe_name: 'Full Body Harness',   issued_to: 'James Okafor',   issued_by: 'HSE Officer', issued_at: '2024-09-15T07:30:00Z', quantity: 1, returned: false, returned_at: null },
  { id: 'i3', ppe_id: 'ppe-3', ppe_name: 'Safety Boots S3',     issued_to: 'Priya Sharma',   issued_by: 'HSE Officer', issued_at: '2024-09-14T08:00:00Z', quantity: 1, returned: false, returned_at: null },
  { id: 'i4', ppe_id: 'ppe-7', ppe_name: 'P2 Dust Mask',        issued_to: 'Mohamed Hassan', issued_by: 'HSE Officer', issued_at: '2024-09-15T06:45:00Z', quantity: 5, returned: false, returned_at: null },
  { id: 'i5', ppe_id: 'ppe-2', ppe_name: 'Safety Glasses',      issued_to: 'Tony Mensah',    issued_by: 'HSE Officer', issued_at: '2024-09-10T09:00:00Z', quantity: 1, returned: true,  returned_at: '2024-09-12T17:00:00Z' },
];

// ─── Issue Modal ──────────────────────────────────────────────────────────────

const IssueModal: React.FC<{
  item: PpeItem; onClose: () => void; onIssue: (issue: PpeIssue) => void;
}> = ({ item, onClose, onIssue }) => {
  const { activeUser } = useAppContext();
  const [form, setForm] = useState({ issued_to: '', quantity: '1' });
  const available = item.quantity_total - item.quantity_issued;

  const handleIssue = () => {
    const qty = parseInt(form.quantity);
    if (!form.issued_to || !qty || qty > available) { alert('Name required and quantity must not exceed available stock.'); return; }
    onIssue({
      id:          `i-${Date.now()}`,
      ppe_id:      item.id,
      ppe_name:    item.item_name,
      issued_to:   form.issued_to,
      issued_by:   activeUser?.name || 'HSE Officer',
      issued_at:   new Date().toISOString(),
      quantity:    qty,
      returned:    false,
      returned_at: null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <header className="p-5 border-b dark:border-dark-border flex justify-between items-center">
          <h2 className="font-bold dark:text-white">Issue PPE</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-dark-background rounded-xl p-3">
            <p className="font-semibold text-sm dark:text-white">{item.item_name}</p>
            <p className="text-xs text-gray-500">{available} units available</p>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Issued To *</label>
            <input value={form.issued_to} onChange={e => setForm(f => ({ ...f, issued_to: e.target.value }))}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Worker name" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} min="1" max={available}
              className="w-full p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
        </div>
        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleIssue}>Issue PPE</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PpeManagement: React.FC = () => {
  const { can } = useAppContext();
  const [ppeItems, setPpeItems]   = useState<PpeItem[]>(MOCK_PPE);
  const [issues, setIssues]       = useState<PpeIssue[]>(MOCK_ISSUES);
  const [issueTarget, setIssueTarget] = useState<PpeItem | null>(null);
  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState<PpeCategory | 'all'>('all');
  const [tab, setTab]             = useState<'inventory' | 'issued'>('inventory');

  const filtered = useMemo(() =>
    ppeItems.filter(p => {
      const sMatch = !search || (p.item_name || '').toLowerCase().includes(search.toLowerCase());
      const cMatch = catFilter === 'all' || p.category === catFilter;
      return sMatch && cMatch;
    }), [ppeItems, search, catFilter]);

  const stats = useMemo(() => ({
    totalItems:  ppeItems.length,
    lowStock:    ppeItems.filter(p => (p.quantity_total - p.quantity_issued) <= p.reorder_level).length,
    inspDue:     ppeItems.filter(p => { const d = daysUntil(p.next_inspection); return d !== null && d <= 7; }).length,
    activeIssues:issues.filter(i => !i.returned).length,
  }), [ppeItems, issues]);

  const handleIssue = (issue: PpeIssue) => {
    setIssues(prev => [issue, ...prev]);
    setPpeItems(prev => prev.map(p => p.id === issue.ppe_id ? { ...p, quantity_issued: p.quantity_issued + issue.quantity } : p));
  };

  const handleReturn = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;
    setIssues(prev => prev.map(i => i.id === issueId ? { ...i, returned: true, returned_at: new Date().toISOString() } : i));
    setPpeItems(prev => prev.map(p => p.id === issue.ppe_id ? { ...p, quantity_issued: Math.max(0, p.quantity_issued - issue.quantity) } : p));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">PPE Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventory, issue tracking and inspection schedule</p>
        </div>
        {can('create', 'reports') && <Button leftIcon={<Plus className="w-4 h-4" />}>Add PPE Item</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'PPE Types',       value: stats.totalItems,   icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Low Stock Alerts',value: stats.lowStock,     icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Inspection Due',  value: stats.inspDue,      icon: Calendar,      color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'Active Issues',   value: stats.activeIssues, icon: User,          color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
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

      {/* Tabs */}
      <div className="flex gap-2 border-b dark:border-dark-border">
        {(['inventory', 'issued'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 capitalize ${tab === t ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500'}`}>
            {t === 'inventory' ? 'Inventory' : `Issued Items (${stats.activeIssues} active)`}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <Card>
            <div className="flex gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search PPE..."
                  className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setCatFilter('all')} className={`px-3 py-1 rounded-full text-xs font-semibold ${catFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>All</button>
                {(Object.entries(CAT_CONFIG) as [PpeCategory, { label: string }][]).map(([k, v]) => (
                  <button key={k} onClick={() => setCatFilter(k)} className={`px-3 py-1 rounded-full text-xs font-semibold ${catFilter === k ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>{v.label}</button>
                ))}
              </div>
            </div>
          </Card>

          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card">
            <table className="min-w-full">
              <thead>
                <tr className="border-b dark:border-dark-border bg-gray-50 dark:bg-dark-background">
                  {['Item', 'Standard', 'Stock', 'Available', 'Reorder?', 'Inspection', 'Condition', ''].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const available   = item.quantity_total - item.quantity_issued;
                  const lowStock    = available <= item.reorder_level;
                  const catCfg      = CAT_CONFIG[item.category];
                  const inspDays    = daysUntil(item.next_inspection);
                  const inspOverdue = inspDays !== null && inspDays < 0;
                  const inspSoon    = inspDays !== null && inspDays <= 7 && inspDays >= 0;
                  return (
                    <tr key={item.id} className={`border-b dark:border-dark-border ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.02]'}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <catCfg.icon className={`w-4 h-4 ${catCfg.color}`} />
                          <div>
                            <p className="font-semibold text-xs text-gray-900 dark:text-white">{item.item_name}</p>
                            <p className="text-[10px] text-gray-400">{catCfg.label}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500 font-mono">{item.standard}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-800 dark:text-gray-200">{item.quantity_total}</td>
                      <td className="py-3 px-4">
                        <span className={`text-sm font-bold ${lowStock ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>{available}</span>
                      </td>
                      <td className="py-3 px-4">
                        {lowStock ? <Badge color="red">Reorder</Badge> : <Badge color="green">OK</Badge>}
                      </td>
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        {item.next_inspection
                          ? <span className={inspOverdue ? 'text-red-600 font-bold' : inspSoon ? 'text-yellow-600 font-semibold' : 'text-gray-500'}>
                              {inspOverdue ? 'OVERDUE' : inspSoon ? `${inspDays}d` : new Date(item.next_inspection).toLocaleDateString()}
                            </span>
                          : <span className="text-gray-400">N/A</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={item.condition === 'good' ? 'green' : item.condition === 'worn' ? 'yellow' : 'red'}>
                          {item.condition}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm" onClick={() => setIssueTarget(item)} disabled={available === 0}>Issue</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'issued' && (
        <div className="space-y-3">
          {issues.filter(i => !i.returned).map(issue => (
            <div key={issue.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
                {issue.issued_to.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white">{issue.issued_to}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{issue.ppe_name} × {issue.quantity}</p>
                <p className="text-xs text-gray-400 mt-0.5">Issued {new Date(issue.issued_at).toLocaleDateString()} by {issue.issued_by}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleReturn(issue.id)}>Return</Button>
            </div>
          ))}
          {issues.filter(i => !i.returned).length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No active PPE issues</p>
            </div>
          )}

          {issues.filter(i => i.returned).length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Recently Returned</p>
              <div className="space-y-2">
                {issues.filter(i => i.returned).slice(0, 5).map(issue => (
                  <div key={issue.id} className="bg-gray-50 dark:bg-dark-background rounded-xl p-3 flex items-center gap-3 opacity-60">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-500 text-xs">{issue.issued_to.charAt(0)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{issue.issued_to} — {issue.ppe_name}</p>
                      <p className="text-xs text-gray-400">Returned {issue.returned_at ? new Date(issue.returned_at).toLocaleDateString() : ''}</p>
                    </div>
                    <Badge color="gray">Returned</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {issueTarget && <IssueModal item={issueTarget} onClose={() => setIssueTarget(null)} onIssue={handleIssue} />}
    </div>
  );
};