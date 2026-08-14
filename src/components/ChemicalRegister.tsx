import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ChemicalCreationModal } from './ChemicalCreationModal';
import type { Chemical, GhsHazard } from '../types';
import {
  Plus, X, Search, AlertTriangle, ExternalLink,
  ChevronRight, Flame, Skull, Droplets, Wind,
  Eye, Shield, Package, FileText
} from 'lucide-react';

// ─── GHS config ───────────────────────────────────────────────────────────────

const GHS_CONFIG: Record<GhsHazard, { label: string; color: string; symbol: string }> = {
  explosive:        { label: 'Explosive',      color: 'text-red-600',    symbol: '💥' },
  flammable:        { label: 'Flammable',      color: 'text-orange-600', symbol: '🔥' },
  oxidising:        { label: 'Oxidising',      color: 'text-yellow-600', symbol: '⭕' },
  compressed_gas:   { label: 'Compressed Gas', color: 'text-blue-600',   symbol: '🔵' },
  corrosive:        { label: 'Corrosive',      color: 'text-purple-600', symbol: '🧪' },
  toxic:            { label: 'Toxic',          color: 'text-gray-800',   symbol: '☠️' },
  irritant:         { label: 'Irritant',       color: 'text-amber-600',  symbol: '❗' },
  environmental:    { label: 'Environmental',  color: 'text-green-700',  symbol: '🌿' },
  health_hazard:    { label: 'Health Hazard',  color: 'text-pink-600',   symbol: '⚠️' },
};

// ─── Chemical Detail Modal ────────────────────────────────────────────────────

const ChemicalDetailModal: React.FC<{ chemical: Chemical; onClose: () => void }> = ({ chemical, onClose }) => {
  const { can } = useAppContext();
  const { handleUpdateChemical } = useDataContext();
  const isHighRisk = chemical.ghs_hazards.includes('toxic') || chemical.ghs_hazards.includes('explosive') || chemical.ghs_hazards.includes('corrosive');

  const toggleStatus = () => {
    handleUpdateChemical({ ...chemical, status: chemical.status === 'active' ? 'removed' : 'active' });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={chemical.status === 'active' ? 'green' : 'gray'}>{chemical.status}</Badge>
              {isHighRisk && <Badge color="red">High Risk</Badge>}
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{chemical.substance_name}</h2>
            <p className="text-sm text-gray-500">{chemical.trade_name} · {chemical.manufacturer}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* GHS Hazards */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">GHS Hazard Pictograms</h3>
            <div className="flex flex-wrap gap-2">
              {chemical.ghs_hazards.map(h => {
                const cfg = GHS_CONFIG[h];
                return (
                  <div key={h} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-dark-background rounded-lg border dark:border-dark-border text-sm">
                    <span>{cfg.symbol}</span>
                    <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">CAS Number</p>
                <p className="font-mono text-gray-800 dark:text-gray-200">{chemical.cas_number}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">UN Number</p>
                <p className="font-mono text-gray-800 dark:text-gray-200">{chemical.un_number}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Hazard Class</p>
                <p className="text-gray-800 dark:text-gray-200">{chemical.hazard_class}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Quantity on Site</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{chemical.quantity_on_site} {chemical.unit}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Storage Location</p>
                <p className="text-gray-800 dark:text-gray-200">{chemical.storage_location}</p>
              </div>
            </div>
          </div>

          {/* PPE */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5" />PPE Required
            </h3>
            <div className="flex flex-wrap gap-2">
              {chemical.ppe_required.map(p => (
                <span key={p} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold">{p}</span>
              ))}
            </div>
          </div>

          {/* First Aid */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">First Aid Measures</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30">{chemical.first_aid}</p>
          </div>

          {/* Disposal */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Disposal Method</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{chemical.disposal_method}</p>
          </div>
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <p className="text-xs text-gray-400">Last review: {new Date(chemical.last_review).toLocaleDateString()}</p>
          <div className="flex gap-2">
            {chemical.sds_url && (
              <Button variant="outline" onClick={() => window.open(chemical.sds_url, '_blank')} leftIcon={<ExternalLink className="w-4 h-4" />}>
                View SDS
              </Button>
            )}
            {can('update', 'chemicals') && (
              <Button variant={chemical.status === 'active' ? 'danger' : 'primary'} onClick={toggleStatus}>
                {chemical.status === 'active' ? 'Mark as Removed' : 'Reactivate'}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ChemicalRegister: React.FC = () => {
  const { can } = useAppContext();
  const { chemicalList: chemicals, handleCreateChemical } = useDataContext();
  const [selected, setSelected]   = useState<Chemical | null>(null);
  const [search, setSearch]       = useState('');
  const [showActive, setShowActive] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filtered = useMemo(() =>
    chemicals.filter(c => {
      const sMatch = !search ||
        (c.substance_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.trade_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.cas_number || '').includes(search);
      const aMatch = showActive ? c.status === 'active' : true;
      return sMatch && aMatch;
    }), [chemicals, search, showActive]);

  const stats = useMemo(() => ({
    total:    chemicals.filter(c => c.status === 'active').length,
    highRisk: chemicals.filter(c => c.status === 'active' && (c.ghs_hazards.includes('toxic') || c.ghs_hazards.includes('explosive') || c.ghs_hazards.includes('corrosive'))).length,
    flammable:chemicals.filter(c => c.status === 'active' && c.ghs_hazards.includes('flammable')).length,
    types:    new Set(chemicals.filter(c => c.status === 'active').map(c => c.hazard_class)).size,
  }), [chemicals]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Chemical / COSHH Register</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Hazardous substance inventory and SDS management</p>
        </div>
        {can('create', 'chemicals') && (
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>Add Chemical</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Substances', value: stats.total,     icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'High Risk',         value: stats.highRisk,  icon: Skull,         color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Flammable',         value: stats.flammable, icon: Flame,         color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
          { label: 'Hazard Classes',    value: stats.types,     icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
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
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, trade name or CAS number..."
              className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <button onClick={() => setShowActive(p => !p)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${showActive ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-dark-background border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'}`}>
            {showActive ? 'Active Only' : 'All Chemicals'}
          </button>
        </div>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card">
        <table className="min-w-full">
          <thead>
            <tr className="border-b dark:border-dark-border bg-gray-50 dark:bg-dark-background">
              {['Substance', 'CAS / UN', 'GHS Hazards', 'Qty on Site', 'Storage', 'PPE Required', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((chem, i) => (
              <tr key={chem.id} onClick={() => setSelected(chem)}
                className={`border-b dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30 dark:bg-white/[0.02]'}`}>
                <td className="py-3 px-4">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{chem.substance_name}</p>
                  <p className="text-xs text-gray-500">{chem.trade_name}</p>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                  <div>{chem.cas_number}</div>
                  <div className="text-gray-400">{chem.un_number}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {chem.ghs_hazards.slice(0, 3).map(h => (
                      <span key={h} title={GHS_CONFIG[h].label} className="text-lg cursor-help">{GHS_CONFIG[h].symbol}</span>
                    ))}
                    {chem.ghs_hazards.length > 3 && <span className="text-xs text-gray-400">+{chem.ghs_hazards.length - 3}</span>}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {chem.quantity_on_site} {chem.unit}
                </td>
                <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400 max-w-[140px] truncate">{chem.storage_location}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {chem.ppe_required.slice(0, 2).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-[10px]">{p}</span>
                    ))}
                    {chem.ppe_required.length > 2 && <span className="text-xs text-gray-400">+{chem.ppe_required.length - 2}</span>}
                  </div>
                </td>
                <td className="py-3 px-4"><ChevronRight className="w-4 h-4 text-gray-400" /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No chemicals found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <ChemicalDetailModal chemical={selected} onClose={() => setSelected(null)} />}
      <ChemicalCreationModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={handleCreateChemical} />
    </div>
  );
};