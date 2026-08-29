import React, { useState } from 'react';
import type { Report, User, ReportStatus, CapaAction } from '../types';
import { getRiskResult } from '../utils/riskUtils';
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { AuditTrail } from './AuditTrail';
import { useAppContext } from '../contexts';
import { generateReportSummary } from '../services/geminiService';
import { exportReportToPdf } from '../lib/exportUtils';
import { useToast } from './ui/Toast';
import {
  X, AlertTriangle, MapPin, Calendar, User as UserIcon,
  FileText, CheckCircle, Clock, ChevronRight, Download,
  Sparkles, Loader2, Shield, Activity, Tag
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportDetailModalProps {
  report:               Report;
  users:                User[];
  activeUser:           User;
  onClose:              () => void;
  onStatusChange:       (reportId: string, newStatus: ReportStatus) => void;
  onCapaActionChange:   (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => void;
  onAddCapaAction?:     (reportId: string, action: Omit<CapaAction, 'status'>) => void;
  onAcknowledgeReport:  (reportId: string) => void;
  onInvestigate?:       (report: Report) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  'Incident':             '#ef4444',
  'Accident':             '#ef4444',
  'Near Miss':            '#f97316',
  'Unsafe Act':           '#f59e0b',
  'Unsafe Condition':     '#eab308',
  'Lost Time Injury (LTI)': '#dc2626',
  'Positive Observation': '#10b981',
  'Leadership Event':     '#3b82f6',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted:          { label: 'Submitted',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  under_investigation:{ label: 'Under Investigation',color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  under_review:       { label: 'Under Review',      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  pending_action:     { label: 'Pending Action',    color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  closed:             { label: 'Closed',            color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  active:             { label: 'Active',            color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  cancelled:          { label: 'Cancelled',         color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

type Tab = 'overview' | 'capa' | 'distribution' | 'audit';

const TabBtn: React.FC<{ label: string; active: boolean; onClick: () => void; badge?: number }> = ({ label, active, onClick, badge }) => (
  <button onClick={onClick}
    className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors"
    style={{
      borderColor:  active ? '#10b981' : 'transparent',
      color:        active ? '#10b981' : 'var(--text-muted)',
    }}>
    {label}
    {badge !== undefined && badge > 0 && (
      <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
        style={{ background: '#ef444420', color: '#ef4444' }}>{badge}</span>
    )}
  </button>
);

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: React.ReactNode; icon?: React.FC<any> }> = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
    {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />}
    <div className="min-w-0">
      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{value || 'N/A'}</div>
    </div>
  </div>
);

// ─── CAPA row ─────────────────────────────────────────────────────────────────

const CapaRow: React.FC<{ action: CapaAction; index: number; canEdit: boolean; onChange: (status: CapaAction['status']) => void }> = ({ action, index, canEdit, onChange }) => {
  const statusColors: Record<string, { bg: string; color: string }> = {
    'Open':        { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
    'In Progress': { bg: 'rgba(245,158,11,0.1)',   color: '#f59e0b' },
    'Closed':      { bg: 'rgba(16,185,129,0.1)',   color: '#10b981' },
  };
  const cfg = statusColors[action.status] || statusColors['Open'];

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
        style={{ background: '#10b981' }}>{index + 1}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{action.action}</p>
        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <UserIcon className="w-3 h-3" />{action.owner_id || 'Unassigned'}
          </span>
          {action.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />{new Date(action.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      {canEdit ? (
        <select value={action.status} onChange={e => onChange(e.target.value as CapaAction['status'])}
          className="text-xs py-1 px-2 rounded-lg"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, minWidth: '110px' }}>
          {['Open', 'In Progress', 'Closed'].map(s => <option key={s}>{s}</option>)}
        </select>
      ) : (
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: cfg.bg, color: cfg.color }}>{action.status}</span>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report, users, activeUser, onClose, onStatusChange, onCapaActionChange, onAddCapaAction, onAcknowledgeReport, onInvestigate,
}) => {
  const { info, success, error: toastError } = useToast();
  const { can, activeOrg } = useAppContext();
  const [tab, setTab]             = useState<Tab>('overview');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showAddCapa, setShowAddCapa] = useState(false);
  const [newCapaType, setNewCapaType]   = useState<'Corrective' | 'Preventive'>('Corrective');
  const [newCapaAction, setNewCapaAction] = useState('');
  const [newCapaOwner, setNewCapaOwner]   = useState('');
  const [newCapaDue, setNewCapaDue]       = useState('');

  if (!report) return null;

  const canApprove = can('approve', 'reports');
  const risk       = getRiskResult(report.risk_pre_control || { severity: 1, likelihood: 1 });
  const typeColor  = TYPE_COLORS[report.type] || '#6b7280';
  const statusCfg  = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
  const capaList   = report.capa || [];
  const distList   = report.distribution?.user_ids || [];
  const acks       = report.acknowledgements || [];
  const auditList  = report.audit_trail || [];
  const getUser    = (id: string) => users.find(u => u.id === id) || { name: id };
  const hasAcknowledged = acks.some(a => a.user_id === activeUser?.id);
  const canAck          = distList.includes(activeUser?.id) && !hasAcknowledged;
  const isCreator       = report.creator_id === activeUser?.id;
  const selfApproveBlock = isCreator && (risk.level === 'High' || risk.level === 'Critical');

  const riskBadgeStyle = {
    background: `${risk.cssColor}15`,
    color: risk.cssColor,
    border: `1px solid ${risk.cssColor}30`,
  };

  const handleAI = async () => {
    setLoadingAI(true);
    const s = await generateReportSummary(JSON.stringify(report, null, 2));
    setAiSummary(s);
    setLoadingAI(false);
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportReportToPdf(report, activeOrg?.name ?? 'EviroSafe');
      success('Report exported.');
    } catch (err) {
      console.error('[ReportDetailModal] PDF export failed:', err);
      toastError('Could not export the report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="giq-overlay" onClick={onClose}>
      <div className="giq-modal w-full max-w-4xl" onClick={e => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-6 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${typeColor}15` }}>
                <AlertTriangle className="w-5 h-5" style={{ color: typeColor }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${typeColor}15`, color: typeColor }}>
                    {report.type}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={riskBadgeStyle}>
                    {risk.level} Risk — {risk.score}
                  </span>
                </div>
                <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {report.type} — {report.id?.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Reported by {getUser(report.reporter_id)?.name} · {report.reported_at ? new Date(report.reported_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown date'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleExportPdf} disabled={isExporting}
                className="giq-btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 disabled:opacity-60">
                <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting…' : 'Export'}
              </button>
              <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="flex flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <TabBtn label="Overview"           active={tab === 'overview'}     onClick={() => setTab('overview')} />
          <TabBtn label="CAPA"               active={tab === 'capa'}         onClick={() => setTab('capa')}         badge={capaList.filter(c => c.status !== 'Closed').length} />
          <TabBtn label="Distribution"       active={tab === 'distribution'} onClick={() => setTab('distribution')} badge={distList.length - acks.length > 0 ? distList.length - acks.length : undefined} />
          <TabBtn label={`Audit (${auditList.length})`} active={tab === 'audit'} onClick={() => setTab('audit')} />
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* AI Summary */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: '#10b981' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI Executive Summary</span>
                  </div>
                  <button onClick={() => info('AI features are coming soon.')}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    Generate <span className="ml-1 text-[10px] font-bold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full tracking-wide">Soon</span>
                  </button>
                </div>
                {aiSummary ? (
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{aiSummary}</p>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Click Generate for an AI-powered analysis of this incident, root cause indicators and recommended actions.
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Description</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {report.description || (report.details as any)?.key_observations || 'No description provided.'}
                </p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <DetailRow label="Location"      icon={MapPin}     value={`${report.location?.text || 'Unknown'}${report.location?.specific_area ? ` — ${report.location.specific_area}` : ''}`} />
                  <DetailRow label="Occurred At"   icon={Calendar}   value={report.occurred_at ? new Date(report.occurred_at).toLocaleString() : 'Unknown'} />
                  <DetailRow label="Conditions"    icon={Activity}   value={report.conditions} />
                  <DetailRow label="Immediate Actions" icon={Shield} value={report.immediate_actions} />
                </div>
                <div>
                  <DetailRow label="Reporter"      icon={UserIcon}   value={getUser(report.reporter_id)?.name} />
                  <DetailRow label="Classification" icon={Tag}       value={report.classification || 'To Be Determined'} />
                  {(report.details as any)?.person_name && (
                    <DetailRow label="Injured Person" icon={UserIcon} value={(report.details as any).person_name} />
                  )}
                  {(report.details as any)?.nature_of_injury && (
                    <DetailRow label="Nature of Injury" icon={Activity} value={(report.details as any).nature_of_injury} />
                  )}
                </div>
              </div>

              {/* Risk matrix */}
              {report.risk_pre_control && (
                <div>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Initial Risk Assessment</p>
                  <RiskMatrixDisplay matrix={report.risk_pre_control} />
                </div>
              )}

              {/* Witness statements */}
              {report.witnesses && report.witnesses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Witness Statements</p>
                  <div className="space-y-2">
                    {report.witnesses.map((w, i) => (
                      <div key={i} className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {w.name} {w.contact && <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({w.contact})</span>}
                        </p>
                        <p className="text-sm italic mt-1" style={{ color: 'var(--text-secondary)' }}>"{w.statement}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sequence of events */}
              {report.timeline && report.timeline.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Sequence of Events</p>
                  <div className="space-y-2">
                    {report.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <span className="font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{t.time}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{t.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              {report.evidence_urls && report.evidence_urls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Evidence Photos</p>
                  <div className="flex gap-2 flex-wrap">
                    {report.evidence_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="Evidence" className="w-24 h-24 object-cover rounded-xl"
                          style={{ border: '1px solid var(--border-default)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CAPA */}
          {tab === 'capa' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Corrective & Preventive Actions
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                    {capaList.filter(c => c.status === 'Closed').length}/{capaList.length} closed
                  </span>
                  {onAddCapaAction && canApprove && (
                    <button onClick={() => setShowAddCapa(v => !v)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: '#10b981', color: 'white' }}>
                      + Add Action
                    </button>
                  )}
                </div>
              </div>

              {showAddCapa && (
                <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                      <select value={newCapaType} onChange={e => setNewCapaType(e.target.value as any)} className="giq-input w-full">
                        <option value="Corrective">Corrective</option>
                        <option value="Preventive">Preventive</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Owner</label>
                      <select value={newCapaOwner} onChange={e => setNewCapaOwner(e.target.value)} className="giq-input w-full">
                        <option value="">Select owner...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Action Required</label>
                    <textarea value={newCapaAction} onChange={e => setNewCapaAction(e.target.value)} rows={2}
                      placeholder="Describe the corrective or preventive action..." className="giq-input w-full" style={{ resize: 'vertical' }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Due Date</label>
                    <input type="date" value={newCapaDue} onChange={e => setNewCapaDue(e.target.value)} className="giq-input w-full" />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddCapa(false)} className="giq-btn-secondary text-xs">Cancel</button>
                    <button
                      disabled={!newCapaAction.trim() || !newCapaOwner || !newCapaDue}
                      onClick={() => {
                        onAddCapaAction?.(report.id, {
                          type: newCapaType, action: newCapaAction.trim(),
                          owner_id: newCapaOwner, due_date: newCapaDue,
                        });
                        setNewCapaAction(''); setNewCapaOwner(''); setNewCapaDue(''); setShowAddCapa(false);
                      }}
                      className="giq-btn-primary text-xs">
                      Add Action
                    </button>
                  </div>
                </div>
              )}

              {capaList.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No CAPA actions assigned yet</p>
                  {onAddCapaAction && canApprove && !showAddCapa && (
                    <button onClick={() => setShowAddCapa(true)} className="giq-btn-primary text-xs mt-3">
                      + Add First Action
                    </button>
                  )}
                </div>
              ) : (
                capaList.map((action, i) => (
                  <CapaRow key={i} action={action} index={i} canEdit={canApprove}
                    onChange={s => onCapaActionChange(report.id, i, s)} />
                ))
              )}
            </div>
          )}

          {/* DISTRIBUTION */}
          {tab === 'distribution' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Distribution & Acknowledgements</p>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {acks.length}/{distList.length} acknowledged
                </span>
              </div>
              <div className="space-y-2">
                {distList.map(uid => {
                  const u   = getUser(uid);
                  const ack = acks.find(a => a.user_id === uid);
                  return (
                    <div key={uid} className="flex items-center gap-3 py-3"
                      style={{ borderBottom: '1px solid var(--border-default)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: '#10b981' }}>{u.name?.charAt(0)}</div>
                      <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                      {ack ? (
                        <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          <CheckCircle className="w-3 h-3" />
                          {new Date(ack.acknowledged_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>Pending</span>
                      )}
                    </div>
                  );
                })}
                {distList.length === 0 && (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No distribution list set</p>
                )}
              </div>
              {canAck && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                  <button onClick={() => onAcknowledgeReport(report.id)} className="giq-btn-primary">
                    <CheckCircle className="w-4 h-4" />Acknowledge This Report
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AUDIT TRAIL */}
          {tab === 'audit' && (
            <AuditTrail logs={auditList} users={users} />
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="p-4 flex justify-between items-center flex-shrink-0"
          style={{ borderTop: '1px solid var(--border-default)' }}>
          <div>
            {selfApproveBlock && (
              <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                Self-approval blocked for {risk.level} risk incidents
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {onInvestigate && (
              <button
                onClick={() => { onInvestigate(report); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                🔍 Investigate (RCA)
              </button>
            )}
            {canApprove && !selfApproveBlock && report.status === 'submitted' && (
              <button onClick={() => onStatusChange(report.id, 'under_review')} className="giq-btn-secondary">
                Move to Review
              </button>
            )}
            {canApprove && report.status === 'under_review' && (
              <button onClick={() => onStatusChange(report.id, 'closed')}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                Close Report
              </button>
            )}
            <button onClick={onClose} className="giq-btn-secondary">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};