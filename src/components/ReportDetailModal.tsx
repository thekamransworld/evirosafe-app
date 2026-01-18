import React, { useState, useMemo } from 'react';
import type { 
  Report, User, ReportStatus, CapaAction, 
  AccidentDetails, IncidentDetails, NearMissDetails, 
  UnsafeActDetails, UnsafeConditionDetails, LeadershipEventDetails, 
  RootCauseAnalysis, CostImpact, Witness 
} from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import ReactMarkdown from 'react-markdown';
import { generateReportSummary } from '../services/geminiService';
import { getRiskLevel } from '../utils/riskUtils';
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { AuditTrail } from './AuditTrail';
import { useAppContext } from '../contexts';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { SafetyAlertModal } from './SafetyAlertModal';
import { 
  CheckCircle, Clock, AlertTriangle, FileText, 
  DollarSign, Search, Users, ArrowRight, Save, Megaphone 
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report;
  users: User[];
  activeUser: User;
  onClose: () => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void;
  onCapaActionChange: (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => void;
  onAcknowledgeReport: (reportId: string) => void;
  onUpdateReport?: (reportId: string, data: Partial<Report>) => void;
}

const ALL_CAPA_STATUSES: CapaAction['status'][] = ['Open', 'In Progress', 'Closed'];

type Tab = 'details' | 'investigation' | 'costs' | 'capa' | 'distribution' | 'audit' | 'lessons';

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; icon?: React.ReactNode }> = ({ label, isActive, onClick, icon }) => (
    <button 
        onClick={onClick} 
        className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:dark:text-gray-200'}`}
    >
        {icon} {label}
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode; fullWidth?: boolean }> = ({ title, children, fullWidth = false }) => (
  <div className={`py-4 border-b dark:border-dark-border ${fullWidth ? 'col-span-2' : ''}`}>
    <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 tracking-wider">{title}</h3>
    <div className="text-gray-800 dark:text-gray-200 text-sm">{children || 'N/A'}</div>
  </div>
);

export const ReportDetailModal: React.FC<ReportDetailModalProps> = (props) => {
  const { report, users = [], activeUser, onClose, onStatusChange, onCapaActionChange, onAcknowledgeReport, onUpdateReport } = props;
  const { can } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // --- INVESTIGATION STATE ---
  const [rootCause, setRootCause] = useState<RootCauseAnalysis>(report.root_cause_analysis || {
      method: '5_whys',
      direct_cause: '',
      why_1: '', why_2: '', why_3: '', why_4: '', why_5: '',
      root_cause_category: [],
      conclusion: ''
  });

  // --- COST STATE ---
  const [costs, setCosts] = useState<CostImpact>(report.costs || {
      direct_costs: { medical: 0, repair: 0, compensation: 0, fines: 0 },
      indirect_costs: { downtime: 0, legal: 0, training: 0, admin: 0 },
      total_estimated: 0,
      currency: 'USD'
  });

  if (!report) return null;

  const canApprove = can('approve', 'reports');
  const risk = getRiskLevel(report.risk_pre_control || { severity: 1, likelihood: 1 });
  const distributionList = report.distribution?.user_ids || [];
  const acknowledgements = report.acknowledgements || [];
  const canAcknowledge = distributionList.includes(activeUser?.id) && !acknowledgements.some(ack => ack.user_id === activeUser?.id);

  // --- HANDLERS ---

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    const summary = await generateReportSummary(JSON.stringify(report, null, 2));
    setAiSummary(summary);
    setIsLoadingSummary(false);
  };

  const handleSaveInvestigation = () => {
      if (onUpdateReport) {
          onUpdateReport(report.id, { root_cause_analysis: rootCause });
          // Auto transition status if needed
          if (report.status === 'under_investigation') {
              onStatusChange(report.id, 'capa_required');
          }
      }
  };

  const handleSaveCosts = () => {
      const total = 
        Object.values(costs.direct_costs).reduce((a, b) => a + b, 0) + 
        Object.values(costs.indirect_costs).reduce((a, b) => a + b, 0);
      
      const updatedCosts = { ...costs, total_estimated: total };
      setCosts(updatedCosts);
      
      if (onUpdateReport) {
          onUpdateReport(report.id, { costs: updatedCosts });
      }
  };

  const getUser = (userId: string) => {
      if (!users || !userId) return { name: 'Unknown User' };
      return users.find(u => u.id === userId) || { name: 'Unknown User' };
  };

  const getStatusBadge = (status: ReportStatus) => {
      const styles = {
          draft: 'bg-gray-100 text-gray-800',
          submitted: 'bg-blue-100 text-blue-800',
          under_investigation: 'bg-purple-100 text-purple-800',
          capa_required: 'bg-orange-100 text-orange-800',
          capa_in_progress: 'bg-yellow-100 text-yellow-800',
          pending_closure: 'bg-teal-100 text-teal-800',
          closed: 'bg-green-100 text-green-800',
          archived: 'bg-gray-200 text-gray-600'
      };
      return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${styles[status] || styles.draft}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const renderDetails = () => {
      const details = report.details || {}; 
      if (['Incident', 'Accident', 'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)'].includes(report.type)) {
          const acc = details as AccidentDetails;
          return <><Section title="Injured Person">{acc.person_name}</Section><Section title="Nature of Injury">{acc.nature_of_injury}</Section></>;
      }
      return null;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          
          {/* HEADER */}
          <header className="p-5 border-b dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-card shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{report.type}</h2>
                {getStatusBadge(report.status)}
                <Badge color={risk.color}>{risk.level} Risk</Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {report.id} • Reported: {new Date(report.reported_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500">✕</button>
            </div>
          </header>

          {/* TABS */}
          <div className="border-b dark:border-dark-border bg-gray-50 dark:bg-black/20 px-6 flex gap-2 overflow-x-auto">
            <TabButton label="Overview" icon={<FileText className="w-4 h-4"/>} isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
            <TabButton label="Investigation" icon={<Search className="w-4 h-4"/>} isActive={activeTab === 'investigation'} onClick={() => setActiveTab('investigation')} />
            <TabButton label="Financial Impact" icon={<DollarSign className="w-4 h-4"/>} isActive={activeTab === 'costs'} onClick={() => setActiveTab('costs')} />
            <TabButton label="CAPA Plan" icon={<CheckCircle className="w-4 h-4"/>} isActive={activeTab === 'capa'} onClick={() => setActiveTab('capa')} />
            <TabButton label="Lessons Learned" icon={<Megaphone className="w-4 h-4"/>} isActive={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} />
            <TabButton label="Audit Trail" icon={<Clock className="w-4 h-4"/>} isActive={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
          </div>

          {/* CONTENT */}
          <main className="flex-1 overflow-y-auto p-6 bg-white dark:bg-dark-card">
            
            {/* --- TAB: DETAILS --- */}
            {activeTab === 'details' && (
                <div className="space-y-6">
                    {/* AI Summary */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">✨ AI Executive Summary</h3>
                            <Button size="sm" variant="ghost" onClick={handleGenerateSummary} disabled={isLoadingSummary}>
                                {isLoadingSummary ? 'Analyzing...' : 'Generate'}
                            </Button>
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-300 prose dark:prose-invert">
                            {aiSummary ? <ReactMarkdown>{aiSummary}</ReactMarkdown> : "Click generate to get an AI analysis of this incident."}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Description" fullWidth>{report.description}</Section>
                        <Section title="Location">{report.location?.text}</Section>
                        <Section title="Date & Time">{new Date(report.occurred_at).toLocaleString()}</Section>
                        <Section title="Immediate Actions">{report.immediate_actions}</Section>
                        {renderDetails()}
                        <Section title="Risk Assessment">
                            <RiskMatrixDisplay matrix={report.risk_pre_control} />
                        </Section>
                    </div>

                    {/* Evidence Gallery */}
                    {report.evidence_urls && report.evidence_urls.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Evidence</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {report.evidence_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer" className="block w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity">
                                        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: INVESTIGATION (5 WHYS) --- */}
            {activeTab === 'investigation' && (
                <div className="space-y-8">
                    {/* Witnesses */}
                    <Card title="Witness Statements">
                        {report.witnesses && report.witnesses.length > 0 ? (
                            <div className="space-y-4">
                                {report.witnesses.map((w, i) => (
                                    <div key={i} className="p-4 bg-gray-50 dark:bg-white/5 rounded-lg border dark:border-white/10">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-bold text-gray-900 dark:text-white">{w.name}</span>
                                            <Badge color="blue">{w.type}</Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{w.statement}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic">No witnesses recorded.</p>
                        )}
                    </Card>

                    {/* 5 Whys Analysis */}
                    <Card title="Root Cause Analysis (5 Whys)">
                        <div className="space-y-4">
                            <FormField label="Direct Cause (What happened?)">
                                <input 
                                    className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                    value={rootCause.direct_cause}
                                    onChange={e => setRootCause({...rootCause, direct_cause: e.target.value})}
                                    placeholder="e.g. Worker slipped on oil"
                                />
                            </FormField>
                            {[1, 2, 3, 4, 5].map(num => (
                                <FormField key={num} label={`Why ${num}?`}>
                                    <input 
                                        className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                        // @ts-ignore
                                        value={rootCause[`why_${num}`]}
                                        // @ts-ignore
                                        onChange={e => setRootCause({...rootCause, [`why_${num}`]: e.target.value})}
                                        placeholder="Because..."
                                    />
                                </FormField>
                            ))}
                            <FormField label="Root Cause Conclusion">
                                <textarea 
                                    className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                    rows={3}
                                    value={rootCause.conclusion}
                                    onChange={e => setRootCause({...rootCause, conclusion: e.target.value})}
                                    placeholder="The fundamental system failure was..."
                                />
                            </FormField>
                            <div className="flex justify-end">
                                <Button onClick={handleSaveInvestigation} leftIcon={<Save className="w-4 h-4"/>}>Save Analysis</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- TAB: COSTS --- */}
            {activeTab === 'costs' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Direct Costs">
                            <div className="space-y-3">
                                <FormField label="Medical Costs">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.direct_costs.medical} onChange={e => setCosts({...costs, direct_costs: {...costs.direct_costs, medical: +e.target.value}})} />
                                </FormField>
                                <FormField label="Repair / Replacement">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.direct_costs.repair} onChange={e => setCosts({...costs, direct_costs: {...costs.direct_costs, repair: +e.target.value}})} />
                                </FormField>
                                <FormField label="Fines / Penalties">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.direct_costs.fines} onChange={e => setCosts({...costs, direct_costs: {...costs.direct_costs, fines: +e.target.value}})} />
                                </FormField>
                            </div>
                        </Card>
                        <Card title="Indirect Costs">
                            <div className="space-y-3">
                                <FormField label="Downtime / Lost Production">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.indirect_costs.downtime} onChange={e => setCosts({...costs, indirect_costs: {...costs.indirect_costs, downtime: +e.target.value}})} />
                                </FormField>
                                <FormField label="Legal Fees">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.indirect_costs.legal} onChange={e => setCosts({...costs, indirect_costs: {...costs.indirect_costs, legal: +e.target.value}})} />
                                </FormField>
                                <FormField label="Admin / Investigation Time">
                                    <input type="number" className="w-full p-2 border rounded dark:bg-black/20 dark:border-gray-700" value={costs.indirect_costs.admin} onChange={e => setCosts({...costs, indirect_costs: {...costs.indirect_costs, admin: +e.target.value}})} />
                                </FormField>
                            </div>
                        </Card>
                    </div>
                    
                    <div className="flex items-center justify-between p-6 bg-gray-900 text-white rounded-xl shadow-lg">
                        <div>
                            <p className="text-sm text-gray-400 uppercase tracking-wider font-bold">Total Estimated Impact</p>
                            <p className="text-3xl font-black mt-1">${costs.total_estimated.toLocaleString()}</p>
                        </div>
                        <Button onClick={handleSaveCosts} className="bg-white text-gray-900 hover:bg-gray-200">Update Calculation</Button>
                    </div>
                </div>
            )}

            {/* --- TAB: CAPA --- */}
            {activeTab === 'capa' && (
                <Card title="Corrective & Preventive Actions">
                    <div className="space-y-4">
                        {report.capa?.map((action, index) => (
                            <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-white/5 dark:border-white/10 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge color={action.type === 'Corrective' ? 'blue' : 'purple'}>{action.type}</Badge>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{action.action}</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Owner: {getUser(action.owner_id)?.name} • Due: {action.due_date}</p>
                                </div>
                                <select 
                                    value={action.status}
                                    onChange={(e) => onCapaActionChange(report.id, index, e.target.value as any)}
                                    className="text-sm border rounded p-1 bg-white dark:bg-black/20 dark:text-white dark:border-gray-700"
                                >
                                    {ALL_CAPA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        ))}
                        {(!report.capa || report.capa.length === 0) && <p className="text-gray-500 italic text-center py-4">No actions assigned yet.</p>}
                    </div>
                </Card>
            )}

            {/* --- TAB: LESSONS LEARNED --- */}
            {activeTab === 'lessons' && (
                <div className="space-y-6">
                    <Card title="Lessons Learned & Prevention">
                        <div className="p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                                    <Megaphone className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100 mb-2">Share Safety Alert</h3>
                                    <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
                                        Generate a one-page safety alert flyer to share with the workforce, display on notice boards, or use in Toolbox Talks.
                                    </p>
                                    <Button onClick={() => setIsAlertModalOpen(true)} className="bg-orange-600 hover:bg-orange-700 text-white border-none">
                                        Generate Safety Alert PDF
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <FormField label="Key Learnings">
                                <textarea 
                                    className="w-full p-3 border rounded-lg dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                    rows={4}
                                    placeholder="What did we learn from this incident?"
                                    defaultValue={report.lessons_learned}
                                    onChange={(e) => onUpdateReport && onUpdateReport(report.id, { lessons_learned: e.target.value })}
                                />
                            </FormField>
                            <FormField label="Prevention Strategy">
                                <textarea 
                                    className="w-full p-3 border rounded-lg dark:bg-black/20 dark:border-gray-700 dark:text-white"
                                    rows={4}
                                    placeholder="How can we prevent recurrence?"
                                    defaultValue={report.prevention_strategy}
                                    onChange={(e) => onUpdateReport && onUpdateReport(report.id, { prevention_strategy: e.target.value })}
                                />
                            </FormField>
                        </div>
                    </Card>
                </div>
            )}

            {/* --- TAB: AUDIT --- */}
            {activeTab === 'audit' && (
                <AuditTrail logs={report.audit_trail || []} users={users} />
            )}

          </main>

          {/* FOOTER - WORKFLOW ACTIONS */}
          <footer className="p-4 border-t dark:border-dark-border bg-gray-50 dark:bg-black/20 flex justify-between items-center shrink-0">
            <div className="text-xs text-gray-500">
                Current Stage: <span className="font-bold text-gray-700 dark:text-gray-300 uppercase">{report.status.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex gap-3">
                {canAcknowledge && <Button variant="secondary" onClick={() => onAcknowledgeReport(report.id)}>Acknowledge Receipt</Button>}
                
                {report.status === 'submitted' && canApprove && (
                    <Button onClick={() => onStatusChange(report.id, 'under_investigation')} leftIcon={<Search className="w-4 h-4"/>}>Start Investigation</Button>
                )}
                {report.status === 'under_investigation' && canApprove && (
                    <Button onClick={() => onStatusChange(report.id, 'capa_required')} leftIcon={<CheckCircle className="w-4 h-4"/>}>Complete Investigation</Button>
                )}
                {report.status === 'capa_required' && (
                    <Button onClick={() => setActiveTab('capa')} variant="secondary">Manage CAPA</Button>
                )}
                {report.status !== 'closed' && canApprove && (
                    <Button onClick={() => onStatusChange(report.id, 'closed')} className="bg-green-600 hover:bg-green-700 text-white">Close Report</Button>
                )}
            </div>
          </footer>
        </div>
      </div>

      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`Report: ${report.type} - ${report.id}`}
        documentLink={`${window.location.href}?report=${report.id}`}
        defaultRecipients={report.distribution?.user_ids?.map(id => users.find(u => u.id === id)).filter(Boolean) as User[] || []}
      />

      <SafetyAlertModal 
        isOpen={isAlertModalOpen} 
        onClose={() => setIsAlertModalOpen(false)} 
        report={report} 
      />
    </>
  );
};