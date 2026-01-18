import React, { useState } from 'react';
import type { Report, User, ReportStatus, CapaAction, CostImpact } from '../types';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { generateReportSummary } from '../services/geminiService';
import { getRiskLevel } from '../utils/riskUtils';
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { AuditTrail } from './AuditTrail';
import { useAppContext } from '../contexts';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { 
  AlertTriangle, DollarSign, BookOpen, Activity, 
  CheckCircle, X, FileText, TrendingUp 
} from 'lucide-react';

interface ReportDetailModalProps {
  report: Report;
  users: User[];
  activeUser: User;
  onClose: () => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void;
  onCapaActionChange: (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => void;
  onAcknowledgeReport: (reportId: string) => void;
}

type Tab = 'details' | 'investigation' | 'financials' | 'lessons' | 'audit';

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void; }> = ({ label, icon, isActive, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
    >
        {icon} {label}
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 ${className}`}>
    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">{title}</h3>
    <div className="text-gray-900 dark:text-gray-100 text-sm">{children || 'N/A'}</div>
  </div>
);

export const ReportDetailModal: React.FC<ReportDetailModalProps> = (props) => {
  const { report, users = [], activeUser, onClose, onStatusChange, onCapaActionChange, onAcknowledgeReport } = props;
  const { can } = useAppContext();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  
  // Cost State (Mocked for UI demo, in real app this would save to DB)
  const [costs, setCosts] = useState<CostImpact>(report.costs || {
      directCosts: { medical: 0, repair: 0, compensation: 0, fines: 0 },
      indirectCosts: { downtime: 0, lostProductivity: 0, training: 0, administrative: 0 },
      totalEstimated: 0,
      insuranceCoverage: 0
  });

  if (!report) return null;

  const risk = getRiskLevel(report.risk_pre_control);
  const canApprove = can('approve', 'reports');

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    const summary = await generateReportSummary(JSON.stringify(report, null, 2));
    setAiSummary(summary);
    setIsLoadingSummary(false);
  };

  const calculateTotalCost = () => {
      const direct = Object.values(costs.directCosts).reduce((a, b) => a + b, 0);
      const indirect = Object.values(costs.indirectCosts).reduce((a, b) => a + b, 0);
      setCosts(prev => ({ ...prev, totalEstimated: direct + indirect }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <header className="p-6 border-b dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900">
            <div>
              <div className="flex items-center gap-3 mb-2">
                  <Badge color={report.status === 'closed' ? 'green' : 'blue'}>{report.status.replace('_', ' ').toUpperCase()}</Badge>
                  <span className="text-xs font-mono text-gray-500">{report.id}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{report.type} Report</h2>
              <p className="text-sm text-gray-500">Reported by {users.find(u => u.id === report.reporter_id)?.name || 'Unknown'} on {new Date(report.created_at || '').toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
                <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><X className="w-6 h-6 text-gray-500"/></button>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-6">
              <TabButton label="Details" icon={<FileText className="w-4 h-4"/>} isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
              <TabButton label="Investigation & Root Cause" icon={<Activity className="w-4 h-4"/>} isActive={activeTab === 'investigation'} onClick={() => setActiveTab('investigation')} />
              <TabButton label="Financial Impact" icon={<DollarSign className="w-4 h-4"/>} isActive={activeTab === 'financials'} onClick={() => setActiveTab('financials')} />
              <TabButton label="Lessons Learned" icon={<BookOpen className="w-4 h-4"/>} isActive={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} />
              <TabButton label="Audit Trail" icon={<TrendingUp className="w-4 h-4"/>} isActive={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 dark:bg-black/20">
            
            {/* DETAILS TAB */}
            {activeTab === 'details' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-6">
                            <Section title="Description">
                                <p className="whitespace-pre-wrap">{report.description}</p>
                            </Section>
                            <div className="grid grid-cols-2 gap-4">
                                <Section title="Location">{report.location.text}</Section>
                                <Section title="Date & Time">{new Date(report.occurred_at).toLocaleString()}</Section>
                            </div>
                            <Section title="Immediate Actions Taken">{report.immediate_actions}</Section>
                            
                            {/* AI Summary */}
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-purple-900 dark:text-purple-200">AI Executive Summary</h3>
                                    <Button size="sm" variant="ghost" onClick={handleGenerateSummary} disabled={isLoadingSummary}>
                                        {isLoadingSummary ? 'Generating...' : 'Generate Summary'}
                                    </Button>
                                </div>
                                {aiSummary ? <ReactMarkdown className="prose text-sm">{aiSummary}</ReactMarkdown> : <p className="text-sm text-gray-500 italic">Click generate to analyze this report.</p>}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold mb-4">Risk Assessment</h3>
                                <RiskMatrixDisplay matrix={report.risk_pre_control} />
                                <div className={`mt-4 p-2 text-center rounded font-bold ${risk.color === 'red' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {risk.level} Risk Level
                                </div>
                            </div>
                            
                            {report.evidence_urls.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 shadow-sm">
                                    <h3 className="font-bold mb-4">Evidence</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {report.evidence_urls.map((url, i) => (
                                            <a key={i} href={url} target="_blank" rel="noreferrer">
                                                <img src={url} className="w-full h-24 object-cover rounded-lg border hover:opacity-80" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* INVESTIGATION TAB */}
            {activeTab === 'investigation' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Root Cause Analysis (5 Whys)">
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-3">
                                        <span className="font-bold text-gray-400">Why {i}?</span>
                                        <input className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 outline-none" placeholder="..." />
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="CAPA Plan">
                            <div className="space-y-4">
                                {report.capa.map((action, i) => (
                                    <div key={i} className="p-3 border rounded-lg bg-white dark:bg-gray-800">
                                        <div className="flex justify-between mb-1">
                                            <Badge color={action.type === 'Corrective' ? 'blue' : 'purple'}>{action.type}</Badge>
                                            <select 
                                                value={action.status}
                                                onChange={(e) => onCapaActionChange(report.id, i, e.target.value as any)}
                                                className="text-xs bg-transparent border rounded"
                                            >
                                                <option>Open</option><option>In Progress</option><option>Closed</option>
                                            </select>
                                        </div>
                                        <p className="text-sm font-medium">{action.action}</p>
                                        <p className="text-xs text-gray-500 mt-1">Owner: {users.find(u => u.id === action.owner_id)?.name}</p>
                                    </div>
                                ))}
                                {report.capa.length === 0 && <p className="text-gray-500 italic">No actions assigned.</p>}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* FINANCIALS TAB */}
            {activeTab === 'financials' && (
                <div className="max-w-3xl mx-auto">
                    <Card title="Cost Impact Analysis">
                        <div className="grid grid-cols-2 gap-8 mb-6">
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Direct Costs</h4>
                                <div className="space-y-3">
                                    {Object.entries(costs.directCosts).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center">
                                            <span className="capitalize text-sm">{key}</span>
                                            <input 
                                                type="number" 
                                                value={val} 
                                                onChange={e => setCosts(p => ({...p, directCosts: {...p.directCosts, [key]: parseFloat(e.target.value)}}))}
                                                className="w-24 p-1 text-right border rounded dark:bg-gray-800"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b pb-2">Indirect Costs</h4>
                                <div className="space-y-3">
                                    {Object.entries(costs.indirectCosts).map(([key, val]) => (
                                        <div key={key} className="flex justify-between items-center">
                                            <span className="capitalize text-sm">{key}</span>
                                            <input 
                                                type="number" 
                                                value={val} 
                                                onChange={e => setCosts(p => ({...p, indirectCosts: {...p.indirectCosts, [key]: parseFloat(e.target.value)}}))}
                                                className="w-24 p-1 text-right border rounded dark:bg-gray-800"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                            <Button size="sm" onClick={calculateTotalCost}>Calculate Total</Button>
                            <div className="text-xl font-bold text-green-600">${costs.totalEstimated.toLocaleString()}</div>
                        </div>
                    </Card>
                </div>
            )}

            {/* LESSONS LEARNED TAB */}
            {activeTab === 'lessons' && (
                <div className="space-y-6">
                    <Card title="Lessons Learned & Prevention">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">Key Learnings</label>
                                <textarea className="w-full p-3 border rounded-lg dark:bg-gray-800" rows={4} placeholder="What did we learn from this incident?" defaultValue={report.lessons_learned} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">Prevention Strategy</label>
                                <textarea className="w-full p-3 border rounded-lg dark:bg-gray-800" rows={4} placeholder="How can we prevent recurrence?" defaultValue={report.prevention_strategy} />
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
                <AuditTrail logs={report.audit_trail} users={users} />
            )}

          </div>

          {/* Footer */}
          <footer className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
             <div className="text-sm text-gray-500">
                 {report.acknowledgements.length} people acknowledged this report
             </div>
             <div className="flex gap-3">
                 {canApprove && report.status !== 'closed' && (
                     <Button onClick={() => onStatusChange(report.id, 'closed')} className="bg-green-600 hover:bg-green-700 text-white">
                         Verify & Close Report
                     </Button>
                 )}
                 <Button variant="secondary" onClick={onClose}>Close</Button>
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
    </>
  );
};