/**
 * ════════════════════════════════════════════════════════════════════════
 * FILE: src/components/ppe/PpeInventory.tsx
 * PASTE AT: src/components/ppe/PpeInventory.tsx  (create ppe/ folder)
 *
 * TO ADD TO APP:
 *   import PpeInventory from './components/ppe/PpeInventory';
 *   {activePage === 'ppe' && <PpeInventory />}
 *
 * SIDEBAR NAV:
 *   { id: 'ppe', label: 'PPE Inventory', icon: Shield,
 *     roles: ['admin', 'hse_manager', 'supervisor'] }
 * ════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import {
  Plus, Shield, AlertTriangle, CheckCircle2,
  Search, Download, RefreshCw, Package,
  User, Calendar, ChevronDown, Edit3,
} from 'lucide-react';
import { useAppContext } from '../../contexts';
import { CanDo } from '../auth/RbacGuard';
import { exportTableToCsv } from '../../lib/exportUtils';
import { writeAuditLog } from '../../lib/auditLogger';

// ─── Types ───────────────────────────────────────────────────────────────────
type PpeCondition = 'Good' | 'Fair' | 'Replace' | 'Condemned';
type PpeCategory  = 'Head' | 'Eye' | 'Face' | 'Hearing' | 'Respiratory' | 'Hand' | 'Foot' | 'Body' | 'Fall Protection' | 'High Visibility';

interface PpeItem {
  id: string;
  org_id: string;
  name: string;
  category: PpeCategory;
  standard: string;         // e.g. "EN 397", "ANSI Z89.1"
  quantity_total: number;
  quantity_available: number;
  quantity_issued: number;
  reorder_level: number;
  location: string;
  condition: PpeCondition;
  inspection_interval_days: number;
  last_inspection_date: string;
  next_inspection_date: string;
  supplier: string;
  unit_cost: number;
  notes: string;
  created_at: string;
}

interface PpeAssignment {
  id: string;
  item_id: string;
  item_name: string;
  user_id: string;
  user_name: string;
  quantity: number;
  issued_date: string;
  return_date: string;
  condition_on_return: PpeCondition;
  project_id: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const uid = () => `ppe_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const CONDITION_CONFIG: Record<PpeCondition, { color: string; bg: string }> = {
  Good:      { color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950' },
  Fair:      { color: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-100 dark:bg-amber-950' },
  Replace:   { color: 'text-orange-700 dark:text-orange-300',  bg: 'bg-orange-100 dark:bg-orange-950' },
  Condemned: { color: 'text-red-700 dark:text-red-300',        bg: 'bg-red-100 dark:bg-red-950' },
};

const PPE_CATEGORIES: PpeCategory[] = [
  'Head', 'Eye', 'Face', 'Hearing', 'Respiratory',
  'Hand', 'Foot', 'Body', 'Fall Protection', 'High Visibility',
];

// ─── Add Item Form ────────────────────────────────────────────────────────────
interface AddItemFormProps {
  onSave: (item: PpeItem) => void;
  onCancel: () => void;
  orgId: string;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onSave, onCancel, orgId }) => {
  const [f, setF] = useState({
    name: '', category: 'Head' as PpeCategory, standard: '',
    quantity_total: 0, reorder_level: 5, location: '',
    condition: 'Good' as PpeCondition, inspection_interval_days: 90,
    last_inspection_date: new Date().toISOString().slice(0, 10),
    supplier: '', unit_cost: 0, notes: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const nextInspection = new Date(
    new Date(f.last_inspection_date).getTime() + f.inspection_interval_days * 86400000,
  ).toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Item Name *</label>
          <input value={f.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Safety Helmet — Type II"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Category</label>
          <select value={f.category} onChange={(e) => set('category', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {PPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Safety Standard</label>
          <input value={f.standard} onChange={(e) => set('standard', e.target.value)}
            placeholder="EN 397, ANSI Z89.1..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        {[
          { key: 'quantity_total',           label: 'Total Quantity',      type: 'number', min: 0 },
          { key: 'reorder_level',            label: 'Reorder Level',       type: 'number', min: 0 },
          { key: 'unit_cost',                label: 'Unit Cost (SAR)',      type: 'number', min: 0 },
          { key: 'inspection_interval_days', label: 'Inspection Interval (days)', type: 'number', min: 1 },
        ].map(({ key, label, type, min }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</label>
            <input type={type} min={min} value={(f as any)[key]} onChange={(e) => set(key, Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Storage Location</label>
          <input value={f.location} onChange={(e) => set('location', e.target.value)}
            placeholder="Warehouse Shelf A3..."
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Supplier</label>
          <input value={f.supplier} onChange={(e) => set('supplier', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Condition</label>
          <select value={f.condition} onChange={(e) => set('condition', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200">
            {['Good','Fair','Replace','Condemned'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Last Inspection</label>
          <input type="date" value={f.last_inspection_date} onChange={(e) => set('last_inspection_date', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
        <button onClick={() => { if (!f.name) return; onSave({ ...f, id: uid(), org_id: orgId, quantity_available: f.quantity_total, quantity_issued: 0, next_inspection_date: nextInspection, created_at: new Date().toISOString() }); }}
          className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
          Add Item
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PpeInventory: React.FC = () => {
  const { activeUser, activeOrg, usersList } = useAppContext();
  const [items, setItems]           = useState<PpeItem[]>([]);
  const [assignments, setAssignments] = useState<PpeAssignment[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState<PpeCategory | 'All'>('All');
  const [activeTab, setActiveTab]   = useState<'inventory' | 'assignments'>('inventory');
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [issueUserId, setIssueUserId] = useState('');
  const [issueQty, setIssueQty]     = useState(1);

  const handleAddItem = (item: PpeItem) => {
    setItems((prev) => [item, ...prev]);
    setShowForm(false);
    writeAuditLog({ org_id: activeOrg?.id ?? '', user_id: activeUser?.id ?? '', action: 'CREATE', resource_type: 'ppe_item', resource_id: item.id, description: `PPE item added: ${item.name}`, new_value: item, timestamp: new Date().toISOString() });
  };

  const handleIssue = () => {
    const item = items.find((i) => i.id === issueItemId);
    const user = usersList.find((u: any) => u.id === issueUserId);
    if (!item || !user || issueQty <= 0 || issueQty > item.quantity_available) return;

    const assignment: PpeAssignment = {
      id: `pa_${Date.now()}`, item_id: item.id, item_name: item.name,
      user_id: user.id, user_name: (user as any).name ?? user.id,
      quantity: issueQty, issued_date: new Date().toISOString().slice(0, 10),
      return_date: '', condition_on_return: 'Good', project_id: '',
    };
    setAssignments((prev) => [assignment, ...prev]);
    setItems((prev) => prev.map((i) => i.id === item.id
      ? { ...i, quantity_available: i.quantity_available - issueQty, quantity_issued: i.quantity_issued + issueQty }
      : i));
    setIssueItemId(null);
  };

  const filtered = items.filter((item) => {
    if (filterCat !== 'All' && item.category !== filterCat) return false;
    if (search && !(item.name || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = useMemo(() => ({
    total:    items.length,
    lowStock: items.filter((i) => i.quantity_available <= i.reorder_level).length,
    inspect:  items.filter((i) => i.next_inspection_date && new Date(i.next_inspection_date) <= new Date()).length,
    issued:   assignments.filter((a) => !a.return_date).length,
  }), [items, assignments]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">PPE Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} items · {stats.lowStock} low stock · {stats.inspect} due inspection</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportTableToCsv(items, [
            { key: 'name', label: 'Item' }, { key: 'category', label: 'Category' },
            { key: 'quantity_available', label: 'Available' }, { key: 'quantity_total', label: 'Total' },
            { key: 'condition', label: 'Condition' }, { key: 'next_inspection_date', label: 'Next Inspection' },
          ], 'ppe-inventory')}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm hover:bg-emerald-100">
            <Download className="w-4 h-4" /> Export
          </button>
          <CanDo permission="ppe:create">
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-800">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </CanDo>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Items',        value: stats.total,    color: 'text-slate-700 dark:text-slate-300' },
          { label: 'Low Stock Alerts',   value: stats.lowStock, color: 'text-red-600' },
          { label: 'Inspection Due',     value: stats.inspect,  color: 'text-amber-600' },
          { label: 'Currently Issued',   value: stats.issued,   color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {[{ id: 'inventory', label: 'Inventory' }, { id: 'assignments', label: 'Issued PPE' }].map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">Add PPE Item</h3>
          <AddItemForm onSave={handleAddItem} onCancel={() => setShowForm(false)} orgId={activeOrg?.id ?? ''} />
        </div>
      )}

      {/* Issue modal */}
      {issueItemId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Issue PPE</h3>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Issue To</label>
                <select value={issueUserId} onChange={(e) => setIssueUserId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none">
                  <option value="">Select worker</option>
                  {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                <input type="number" min={1} max={items.find((i) => i.id === issueItemId)?.quantity_available ?? 1}
                  value={issueQty} onChange={(e) => setIssueQty(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIssueItemId(null)} className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400">Cancel</button>
              <button onClick={handleIssue} disabled={!issueUserId}
                className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold disabled:opacity-50">
                Issue
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300" />
            </div>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value as any)}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-600 dark:text-slate-400">
              <option value="All">All categories</option>
              {PPE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
              <Package className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No PPE items in inventory yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const cc = CONDITION_CONFIG[item.condition];
                const isLowStock = item.quantity_available <= item.reorder_level;
                const isInspectionDue = item.next_inspection_date && new Date(item.next_inspection_date) <= new Date();
                const stockPct = item.quantity_total > 0 ? (item.quantity_available / item.quantity_total) * 100 : 0;

                return (
                  <div key={item.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-4 ${
                    item.condition === 'Condemned' ? 'border-red-300 dark:border-red-700' :
                    isLowStock ? 'border-amber-300 dark:border-amber-700' :
                    'border-slate-100 dark:border-slate-700'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.category} · {item.standard}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cc.bg} ${cc.color}`}>{item.condition}</span>
                    </div>

                    {/* Stock bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Stock: {item.quantity_available} / {item.quantity_total}</span>
                        {isLowStock && <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low stock</span>}
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${
                          stockPct <= 20 ? 'bg-red-500' : stockPct <= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${stockPct}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.location}</span>
                      {isInspectionDue && <span className="text-red-500 font-medium">Inspection due</span>}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <CanDo permission="ppe:update">
                        <button onClick={() => setIssueItemId(item.id)}
                          disabled={item.quantity_available === 0 || item.condition === 'Condemned'}
                          className="flex-1 py-1.5 text-xs rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 font-medium">
                          Issue PPE
                        </button>
                      </CanDo>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'assignments' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="text-center py-14">
              <User className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">No PPE currently issued.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {['Item', 'Issued To', 'Qty', 'Issued Date', 'Returned', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750">
                      <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{a.item_name}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.user_name}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{a.quantity}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{a.issued_date}</td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-xs">{a.return_date || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.return_date ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {a.return_date ? 'Returned' : 'Issued'}
                        </span>
                      </td>
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

export default PpeInventory;