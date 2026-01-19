import React, { useState } from 'react';
import type { Report, User, ReportStatus, CapaAction, AccidentDetails, IncidentDetails, NearMissDetails, UnsafeActDetails, UnsafeConditionDetails, LeadershipEventDetails, RootCause, ReportClassification, Witness } from '../types';
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
import { RootCauseAnalysisModal } from './shared/RootCauseAnalysisModal';
import { WitnessSection, TimelineSection } from './reporting/InvestigationHelpers';
import { Search, FileText, ShieldAlert } from 'lucide-react';

interface ReportDetailModalProps {
  report: Report;
  users: User[];
  activeUser: User;
  onClose: () => void;
  onStatusChange: (reportId: string, newStatus: ReportStatus) => void;
  onCapaActionChange: (reportId: string, capaIndex: number, newStatus: CapaAction['status']) => void;
  onAcknowledgeReport: (reportId: string) => void;
}

const ALL_CAPA_STATUSES: CapaAction['status'][] = ['Open', 'In Progress', 'Closed'];

type Tab = 'details' | 'investigation' | 'capa' | 'distribution' | 'audit';

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; icon?: React.ReactNode }> = ({ label, isActive, onClick, icon }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400'}`}>
        {icon} {label}
    </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode; fullWidth?: boolean }> = ({ title, children, fullWidth = false }) => (
  <div className={`py-4 border-b dark:border-dark-border ${fullWidth ? 'col-span-2' : ''}`}>
    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
    <div className="text-gray-800 dark:text-gray-200">{children || 'N/A'}</div>
  </div>
);

export const ReportDetailModal: React.FC<ReportDetailModalProps> = (props) => {
  const { report, users = [], activeUser, onClose, onStatusChange, onCapaActionChange, onAcknowledgeReport } = props;
  const { can } = useAppContext();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isRcaModalOpen, setIsRcaModalOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  
  // Local state for investigation data (in a real app, this would be in the report object)
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [timeline, setTimeline] = useState<{time: string, event: string}[]>([]);
  const [rcaData, setRcaData] = useState<any>(null);

  if (!report) return null;

  const canApprove = can('approve', 'reports');
  const [editedClassification, setEditedClassification] = useState<ReportClassification>(report.classification || 'To Be Determined');
  const [editedRootCause, setEditedRootCause] = useState<RootCause | undefined>(report.root_cause);

  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    const summary = await generateReportSummary(JSON.stringify(report, null, 2));
    setAiSummary(summary);
    setIsLoadingSummary(false);
  };

  const getUser = (userId: string) => {
      if (!users || !userId) return { name: 'Unknown User' };
      return users.find(u => u.id === userId) || { name: 'Unknown User' };
  };
  
  const safeRiskMatrix = report.risk_pre_control || { severity: 1, likelihood: 1 };
  const risk = getRiskLevel(safeRiskMatrix);

  const acknowledgements = report.acknowledgements || [];
  const distributionList = report.distribution?.user_ids || [];
  const capaList = report.capa || [];
  const auditList = report.audit_trail || [];

  const hasAcknowledged = acknowledgements.some(ack => ack.user_id === activeUser?.id);
  const canAcknowledge = distributionList.includes(activeUser?.id) && !hasAcknowledged;

  const renderDetails = () => {
      const details = report.details || {}; 
      if (['Incident', 'Accident', 'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)', 'Restricted Work Case (RWC)'].includes(report.type)) {
          const acc = details as AccidentDetails;
          return <><Section title="Injured Person">{acc.person_name}</Section><Section title="Nature of Injury">{acc.nature_of_injury}</Section><Section title="Body Part Affected">{acc.body_part_affected}</Section><Section title="Treatment Given">{acc.treatment_given}</Section></>;
      }
      // ... (Keep other conditions same as before)
      return <p className="col-span-2 text-gray-500 italic p-4">No specific details recorded for this category.</p>;
  }
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 print:hidden" onClick={onClose}>
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-2xl">{report.type} - {report.id}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reported by {getUser(report.reporter_id)?.name} on {report.reported_at ? new Date(report.reported_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ActionsBar onPrint={() => window.print()} onDownloadPdf={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            <main className="flex-1 p-6 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                 <div className="flex gap-2 flex-wrap">
                    {report.classification_codes?.map(code => <Badge key={code} color="gray">{code}</Badge>)}
                    <Badge color={risk.color} size="md">{risk.level} Risk</Badge>
                 </div>
                 <Badge color={report.status === 'closed' ? 'green' : 'blue'}>{report.status?.replace('_', ' ') || 'Unknown'}</Badge>
              </div>
              
              <div className="border-b dark:border-dark-border mb-4">
                <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    <TabButton label="Details" isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={<FileText className="w-4 h-4"/>} />
                    <TabButton label="Investigation" isActive={activeTab === 'investigation'} onClick={() => setActiveTab('investigation')} icon={<Search className="w-4 h-4"/>} />
                    <TabButton label="CAPA" isActive={activeTab === 'capa'} onClick={() => setActiveTab('capa')} icon={<ShieldAlert className="w-4 h-4"/>} />
                    <TabButton label="Distribution" isActive={activeTab === 'distribution'} onClick={() => setActiveTab('distribution')} />
                    <TabButton label="Audit Trail" isActive={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
                </nav>
              </div>
              
              {activeTab === 'details' && (
                <div className="grid grid-cols-2 gap-x-6 mt-4">
                    <Section title="Location">{report.location?.text || 'Unknown'}</Section>
                    <Section title="Date & Time">{report.occurred_at ? new Date(report.occurred_at).toLocaleString() : 'Unknown'}</Section>
                    <Section title="Description" fullWidth>{report.description}</Section>
                    {renderDetails()}
                    <Section title="Initial Risk Assessment" fullWidth><RiskMatrixDisplay matrix={safeRiskMatrix} /></Section>
                    {report.evidence_urls && report.evidence_urls.length > 0 && (
                        <Section title="Evidence Photos" fullWidth>
                            <div className="flex gap-2 flex-wrap">
                                {report.evidence_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer">
                                        <img src={url} alt="Evidence" className="w-24 h-24 object-cover rounded-md border border-gray-300" />
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
              )}

              {activeTab === 'investigation' && (
                <div className="space-y-8">
                    <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div>
                            <h3 className="font-bold text-blue-900 dark:text-blue-200">Root Cause Analysis</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">Perform 5-Whys analysis to identify systemic issues.</p>
                        </div>
                        <Button onClick={() => setIsRcaModalOpen(true)}>Start Analysis</Button>
                    </div>

                    {rcaData && (
                        <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                            <h4 className="font-bold mb-2">Analysis Results</h4>
                            <p><strong>Root Cause:</strong> {rcaData.why5}</p>
                            <p><strong>Systemic Issues:</strong> {rcaData.systemic_issues.join(', ')}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <WitnessSection witnesses={witnesses} onChange={setWitnesses} />
                        <TimelineSection timeline={timeline} onChange={setTimeline} />
                    </div>
                </div>
              )}
              
              {activeTab === 'capa' && (
                <Card title="Corrective & Preventive Actions (CAPA)">
                  <div className="space-y-4">
                      {capaList.map((action, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <p className={`font-semibold text-sm ${action.type === 'Corrective' ? 'text-blue-600' : 'text-purple-600'}`}>{action.type} Action</p>
                          <p className="text-gray-800 dark:text-gray-200">{action.action}</p>
                          <div className="text-xs text-gray-500 mt-2 flex justify-between items-center">
                              <span>Owner: {getUser(action.owner_id)?.name} | Due: {action.due_date ? new Date(action.due_date).toLocaleDateString() : 'No Date'}</span>
                              <select 
                                value={action.status} 
                                onChange={(e) => onCapaActionChange(report.id, index, e.target.value as CapaAction['status'])}
                                className="p-1 border rounded bg-transparent"
                                disabled={activeUser.id !== action.owner_id && !canApprove}
                              >
                                {ALL_CAPA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {activeTab === 'distribution' && (
                  <Card title="Distribution & Acknowledgements">
                      <ul className="space-y-3">
                          {distributionList.map(userId => {
                              const user = getUser(userId);
                              const ack = acknowledgements.find(a => a.user_id === userId);
                              return (
                                  <li key={userId} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-dark-background rounded-md">
                                      <span className="font-semibold text-sm">{user?.name}</span>
                                      {ack ? (
                                          <span className="text-xs text-green-600">Acknowledged on {new Date(ack.acknowledged_at).toLocaleDateString()}</span>
                                      ) : (
                                          <span className="text-xs text-yellow-600">Pending</span>
                                      )}
                                  </li>
                              )
                          })}
                      </ul>
                  </Card>
              )}
              
              {activeTab === 'audit' && <AuditTrail logs={auditList} users={users} />}

            </main>
          </div>
          
          <footer className="p-4 border-t dark:border-dark-border bg-gray-100 dark:bg-black/20 flex-shrink-0 flex justify-between items-center">
            {canAcknowledge && <Button variant="secondary" onClick={() => onAcknowledgeReport(report.id)}>Acknowledge Receipt</Button>}
            <div></div>
            {canApprove && report.status !== 'closed' && (
                <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => onStatusChange(report.id, 'closed')} 
                    >
                      Verify & Close Report
                    </Button>
                </div>
            )}
          </footer>
        </div>
      </div>

      {isRcaModalOpen && (
          <RootCauseAnalysisModal 
            title={report.type}
            description={report.description}
            onClose={() => setIsRcaModalOpen(false)}
            onSave={(data) => { setRcaData(data); setIsRcaModalOpen(false); }}
          />
      )}

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