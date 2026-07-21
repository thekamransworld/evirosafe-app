import React, { useState, useMemo } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import {
  Plus, X, Search, AlertTriangle, CheckCircle,
  Clock, Building, Phone, Mail, ChevronRight,
  Shield, FileText, Calendar, XCircle, Star
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContractorStatus  = 'approved' | 'pending' | 'suspended' | 'blacklisted';
export type ContractorRisk    = 'low' | 'medium' | 'high';

export interface ContractorDoc {
  name:         string;
  expiry_date:  string | null;
  status:       'valid' | 'expiring' | 'expired' | 'missing';
}

export interface Contractor {
  id:                string;
  name:              string;
  registration_no:   string;
  contact_name:      string;
  contact_email:     string;
  contact_phone:     string;
  services:          string[];
  risk_rating:       ContractorRisk;
  status:            ContractorStatus;
  approval_date:     string | null;
  approval_expiry:   string | null;
  insurance_expiry:  string | null;
  documents:         ContractorDoc[];
  notes:             string;
  workers_on_site:   number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<ContractorStatus, { label: string; color: any; icon: React.FC<any> }> = {
  approved:    { label: 'Approved',    color: 'green',  icon: CheckCircle },
  pending:     { label: 'Pending',     color: 'yellow', icon: Clock },
  suspended:   { label: 'Suspended',   color: 'red',    icon: XCircle },
  blacklisted: { label: 'Blacklisted', color: 'gray',   icon: XCircle },
};

const riskConfig: Record<ContractorRisk, { label: string; color: any; stars: number }> = {
  low:    { label: 'Low Risk',    color: 'green',  stars: 1 },
  medium: { label: 'Medium Risk', color: 'yellow', stars: 2 },
  high:   { label: 'High Risk',   color: 'red',    stars: 3 },
};

const daysUntil = (d: string | null) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const docStatus = (expiry: string | null): ContractorDoc['status'] => {
  if (!expiry) return 'missing';
  const days = daysUntil(expiry)!;
  if (days < 0)  return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CONTRACTORS: Contractor[] = [
  {
    id: 'con-001', name: 'SteelCo Construction Ltd', registration_no: 'CR-123456',
    contact_name: 'James Okafor', contact_email: 'james@steelco.com', contact_phone: '+966-50-111-2222',
    services: ['Steel fixing', 'Rebar installation', 'Structural works'],
    risk_rating: 'medium', status: 'approved',
    approval_date: '2024-01-15',
    approval_expiry: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workers_on_site: 28,
    notes: 'Long-term contractor. Good safety record.',
    documents: [
      { name: 'Public Liability Insurance',   expiry_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  status: 'expiring' },
      { name: 'COSHH Assessment',             expiry_date: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'valid' },
      { name: 'Method Statement',             expiry_date: null, status: 'missing' },
      { name: 'Risk Assessment',              expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'valid' },
    ],
  },
  {
    id: 'con-002', name: 'WeldPro Industrial Services', registration_no: 'CR-234567',
    contact_name: 'Tony Mensah', contact_email: 'tony@weldpro.com', contact_phone: '+966-50-222-3333',
    services: ['Welding', 'Fabrication', 'Hot work'],
    risk_rating: 'high', status: 'approved',
    approval_date: '2024-03-01',
    approval_expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workers_on_site: 12,
    notes: 'Hot work specialist. Strict permit requirements.',
    documents: [
      { name: 'Public Liability Insurance', expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'valid' },
      { name: 'Hot Work Procedure',         expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  status: 'valid' },
      { name: 'Welder Certifications',      expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  status: 'valid' },
    ],
  },
  {
    id: 'con-003', name: 'FormworkPro Contractors', registration_no: 'CR-345678',
    contact_name: 'Priya Sharma', contact_email: 'priya@formworkpro.com', contact_phone: '+966-50-333-4444',
    services: ['Formwork', 'Shuttering', 'Concrete works'],
    risk_rating: 'medium', status: 'pending',
    approval_date: null,
    approval_expiry: null,
    insurance_expiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workers_on_site: 0,
    notes: 'New contractor — awaiting document verification.',
    documents: [
      { name: 'Public Liability Insurance', expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'valid' },
      { name: 'Method Statement',           expiry_date: null, status: 'missing' },
      { name: 'Risk Assessment',            expiry_date: null, status: 'missing' },
    ],
  },
  {
    id: 'con-004', name: 'FastLift Crane Services', registration_no: 'CR-456789',
    contact_name: 'David Chen', contact_email: 'david@fastlift.com', contact_phone: '+966-50-444-5555',
    services: ['Crane operation', 'Lifting', 'Rigging'],
    risk_rating: 'high', status: 'suspended',
    approval_date: '2023-06-01',
    approval_expiry: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    insurance_expiry: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    workers_on_site: 0,
    notes: 'Suspended — insurance expired. Must renew before returning to site.',
    documents: [
      { name: 'Public Liability Insurance', expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'expired' },
      { name: 'Crane Inspection Certificate',expiry_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],status: 'expired' },
      { name: 'Operator Licences',          expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],status: 'valid' },
    ],
  },
];

// ─── Document status config ───────────────────────────────────────────────────

const docConfig: Record<ContractorDoc['status'], { color: string; bg: string; label: string }> = {
  valid:    { color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  label: 'Valid' },
  expiring: { color: 'text-yellow-700 dark:text-yellow-400',bg: 'bg-yellow-50 dark:bg-yellow-900/20',label: 'Expiring' },
  expired:  { color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',      label: 'Expired' },
  missing:  { color: 'text-gray-500',                        bg: 'bg-gray-50 dark:bg-gray-800/50',    label: 'Missing' },
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

const ContractorDetailModal: React.FC<{
  contractor: Contractor;
  onClose:    () => void;
  onUpdate:   (c: Contractor) => void;
}> = ({ contractor, onClose, onUpdate }) => {
  const [status, setStatus] = useState<ContractorStatus>(contractor.status);
  const sCfg = statusConfig[status];
  const rCfg = riskConfig[contractor.risk_rating];
  const insuranceDays = daysUntil(contractor.insurance_expiry);
  const approvalDays  = daysUntil(contractor.approval_expiry);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-6 border-b dark:border-dark-border flex justify-between items-start flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color={sCfg.color}>{sCfg.label}</Badge>
              <Badge color={rCfg.color}>{rCfg.label}</Badge>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{contractor.name}</h2>
            <p className="text-sm text-gray-500">{contractor.registration_no}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Contact */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Building className="w-4 h-4" /><span>{contractor.contact_name}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Phone className="w-4 h-4" /><span>{contractor.contact_phone}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4" /><span className="truncate">{contractor.contact_email}</span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Services</h3>
            <div className="flex flex-wrap gap-2">
              {contractor.services.map(s => (
                <span key={s} className="px-3 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">{s}</span>
              ))}
            </div>
          </div>

          {/* Key dates */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Insurance Expiry', days: insuranceDays, date: contractor.insurance_expiry },
              { label: 'Approval Expiry',  days: approvalDays,  date: contractor.approval_expiry },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl border ${item.days !== null && item.days < 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10' : item.days !== null && item.days <= 30 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/10' : 'border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-background'}`}>
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</p>
                {item.days !== null && (
                  <p className={`text-xs mt-1 ${item.days < 0 ? 'text-red-600' : item.days <= 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {item.days < 0 ? `Expired ${Math.abs(item.days)}d ago` : `${item.days}d remaining`}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Documents */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Documents</h3>
            <div className="space-y-2">
              {contractor.documents.map(doc => {
                const cfg = docConfig[doc.status];
                const days = daysUntil(doc.expiry_date);
                return (
                  <div key={doc.name} className={`flex items-center justify-between p-3 rounded-lg ${cfg.bg}`}>
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${cfg.color}`} />
                      <span className={`text-sm font-semibold ${cfg.color}`}>{doc.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                      {doc.expiry_date && <p className="text-xs text-gray-400">{new Date(doc.expiry_date).toLocaleDateString()}</p>}
                      {days !== null && days >= 0 && days <= 30 && <p className="text-xs text-yellow-600">{days}d</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Update status */}
          <div className="border-t dark:border-dark-border pt-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Update Approval Status</h3>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(statusConfig) as ContractorStatus[]).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${status === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-gray-50 dark:bg-dark-background border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-300'}`}>
                  {statusConfig[s].label}
                </button>
              ))}
            </div>
          </div>

          {contractor.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Note:</span> {contractor.notes}
            </div>
          )}
        </div>

        <footer className="p-4 border-t dark:border-dark-border flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onUpdate({ ...contractor, status }); onClose(); }}>Save Changes</Button>
        </footer>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ContractorManagement: React.FC = () => {
  const { can } = useAppContext();
  const [contractors, setContractors] = useState<Contractor[]>(MOCK_CONTRACTORS);
  const [selected, setSelected]       = useState<Contractor | null>(null);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractorStatus | 'all'>('all');

  const filtered = useMemo(() => contractors.filter(c => {
    const sMatch = !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.services || []).some(s => (s || '').toLowerCase().includes(search.toLowerCase()));
    const fMatch = statusFilter === 'all' || c.status === statusFilter;
    return sMatch && fMatch;
  }), [contractors, search, statusFilter]);

  const stats = useMemo(() => ({
    total:       contractors.filter(c => c.status !== 'blacklisted').length,
    approved:    contractors.filter(c => c.status === 'approved').length,
    onSite:      contractors.reduce((s, c) => s + c.workers_on_site, 0),
    alerts:      contractors.filter(c => {
      const ins = daysUntil(c.insurance_expiry);
      const app = daysUntil(c.approval_expiry);
      return (ins !== null && ins < 30) || (app !== null && app < 30) || c.status === 'suspended';
    }).length,
  }), [contractors]);

  const handleUpdate = (updated: Contractor) =>
    setContractors(prev => prev.map(c => c.id === updated.id ? updated : c));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-text-primary dark:text-white">Contractor Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approval workflow, insurance and document tracking</p>
        </div>
        {can('create', 'reports') && (
          <Button leftIcon={<Plus className="w-4 h-4" />}>Add Contractor</Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contractors', value: stats.total,    icon: Building,      color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Approved',          value: stats.approved, icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Workers on Site',   value: stats.onSite,   icon: Shield,        color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Alerts',            value: stats.alerts,   icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
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
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contractors or services..."
              className="w-full pl-9 p-2 border rounded-lg text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all', ...Object.keys(statusConfig)] as (ContractorStatus | 'all')[]).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'}`}>
                {s === 'all' ? 'All' : statusConfig[s as ContractorStatus].label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {filtered.map(c => {
          const sCfg = statusConfig[c.status];
          const rCfg = riskConfig[c.risk_rating];
          const insDays = daysUntil(c.insurance_expiry);
          const hasAlert = (insDays !== null && insDays < 30) || c.status === 'suspended';
          const missingDocs = c.documents.filter(d => d.status === 'missing' || d.status === 'expired').length;

          return (
            <div key={c.id} onClick={() => setSelected(c)}
              className={`bg-white dark:bg-dark-card rounded-xl border ${hasAlert ? 'border-red-200 dark:border-red-900' : 'border-gray-100 dark:border-dark-border'} p-4 cursor-pointer hover:shadow-md transition-all flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 text-lg flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge color={sCfg.color}>{sCfg.label}</Badge>
                  <Badge color={rCfg.color}>{rCfg.label}</Badge>
                  {missingDocs > 0 && <Badge color="red">{missingDocs} doc{missingDocs > 1 ? 's' : ''} missing/expired</Badge>}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white">{c.name}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>{c.services.slice(0, 2).join(', ')}{c.services.length > 2 ? ` +${c.services.length - 2}` : ''}</span>
                  {c.workers_on_site > 0 && <span className="text-primary-600 dark:text-primary-400 font-semibold">{c.workers_on_site} workers on site</span>}
                  {insDays !== null && (
                    <span className={insDays < 0 ? 'text-red-500 font-semibold' : insDays <= 30 ? 'text-yellow-500 font-semibold' : ''}>
                      Insurance: {insDays < 0 ? 'EXPIRED' : `${insDays}d`}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Building className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No contractors found</p>
          </div>
        )}
      </div>

      {selected && <ContractorDetailModal contractor={selected} onClose={() => setSelected(null)} onUpdate={handleUpdate} />}
    </div>
  );
};