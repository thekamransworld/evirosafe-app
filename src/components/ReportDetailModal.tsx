import React, { useState } from 'react';
import type { Report, User, ReportStatus, CapaAction, AccidentDetails, IncidentDetails, NearMissDetails, UnsafeActDetails, UnsafeConditionDetails, LeadershipEventDetails, RootCause, ReportClassification } from '../types';
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

type Tab = 'details' | 'capa' | 'distribution' | 'audit';

const TabButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium border-b-2 ${isActive ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
        {label}
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
  const [aiSummary, setAiSummary] = useState('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  
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

  const isCreator = report.creator_id === activeUser?.id;
  const isHighOrCritical = risk.level === 'High' || risk.level === 'Critical';
  const selfApprovalBlocked = isCreator && isHighOrCritical;

  const renderDetails = () => {
      const details = report.details || {}; 
      
      if (['Incident', 'Accident', 'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Lost Time Injury (LTI)', 'Restricted Work Case (RWC)'].includes(report.type)) {
          const acc = details as AccidentDetails;
          return <><Section title="Injured Person">{acc.person_name}</Section><Section title="Nature of Injury">{acc.nature_of_injury}</Section><Section title="Body Part Affected">{acc.body_part_affected}</Section><Section title="Treatment Given">{acc.treatment_given}</Section></>;
      }
      if (['Property / Asset Damage', 'Environmental Incident', 'Fire Event'].includes(report.type)) {
          const inc = details as IncidentDetails;
          return <><Section title="Property Damage">{inc.property_damage_details || 'N/A'}</Section>{inc.environmental_impact && <Section title="Environmental Impact" fullWidth>{inc.environmental_impact.type_of_impact}: {inc.environmental_impact.quantity_extent}</Section>}</>;
      }
      if (report.type === 'Near Miss') {
          const nm = details as NearMissDetails;
          return <Section title="Potential Consequence">{nm.potential_consequence}</Section>;
      }
      if (report.type === 'Unsafe Act') {
          const ua = details as UnsafeActDetails;
          return <><Section title="Act Category">{ua.act_category}</Section><Section title="Coaching Given">{ua.coaching_given ? `Yes: ${ua.coaching_notes || ''}` : 'No'}</Section></>;
      }
      if (report.type === 'Unsafe Condition') {
          const uc = details as UnsafeConditionDetails;
          return <><Section title="Condition Category">{uc.condition_category}</Section><Section title="Temporary Control">{uc.temporary_control_applied}</Section></>;
      }
      if (report.type === 'Leadership Event' || report.type === 'Positive Observation') {
          const le = details as LeadershipEventDetails;
          return (
              <>
                <Section title="Event Code"><Badge color="purple">{le.event_type_code || 'N/A'}</Badge></Section>
                <Section title="Leader">{le.leader_name}</Section>
                <Section title="Participants">{le.attendees_count}</Section>
                <Section title="Key Observations" fullWidth>{le.key_observations}</Section>
              </>
          );
      }
      return <p className="col-span-2 text-gray-500 italic p-4">No specific details recorded for this category.</p>;
  }
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 print:hidden" onClick={onClose} aria-modal="true" role="dialog" aria-labelledby="report-title">
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
            <div>
              <h2 id="report-title" className="text-xl font-bold text-gray-900 dark:text-gray-100 truncate max-w-2xl">{report.type} - {report.id}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                  Reported by {getUser(report.reporter_id)?.name} on {report.reported_at ? new Date(report.reported_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ActionsBar onPrint={() => window.print()} onDownloadPdf={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
              <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon/></button>
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
              
              {['Leadership Event', 'Positive Observation'].includes(report.type) ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 border border-blue-100 dark:border-blue-800">
                      <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-2">Leadership Engagement</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{(report.details as LeadershipEventDetails)?.key_observations || 'No observations.'}</p>
                  </div>
              ) : (
                  <p className="text-gray-700 dark:text-gray-300 mb-6">{report.description || 'No description provided.'}</p>
              )}
              
              <div className="border-b dark:border-dark-border mb-4">
                <nav className="-mb-px flex space-x-4 overflow-x-auto">
                    <TabButton label="Details" isActive={activeTab === 'details'} onClick={() => setActiveTab('details')} />
                    <TabButton label="CAPA" isActive={activeTab === 'capa'} onClick={() => setActiveTab('capa')} />
                    <TabButton label="Distribution & Ack." isActive={activeTab === 'distribution'} onClick={() => setActiveTab('distribution')} />
                    <TabButton label="Audit Trail" isActive={activeTab === 'audit'} onClick={() => setActiveTab('audit')} />
                </nav>
              </div>
              
              <div className={activeTab === 'details' ? '' : 'hidden'}>
                {!['Leadership Event', 'Positive Observation'].includes(report.type) && (
                    <Card title="AI Executive Summary" actions={<Button variant="ghost" size="sm" onClick={handleGenerateSummary} disabled={isLoadingSummary}>{isLoadingSummary ? 'Generating...': '✨ Generate'}</Button>}>
                        {isLoadingSummary && <p className="text-sm text-gray-500">AI is analyzing the report...</p>}
                        {aiSummary && <div className="prose prose-sm max-w-none dark:prose-invert"><ReactMarkdown>{aiSummary}</ReactMarkdown></div>}
                        {!aiSummary && !isLoadingSummary && <p className="text-sm text-gray-500">Click "Generate" to create an AI-powered summary of this report.</p>}
                    </Card>
                )}

                <div className="grid grid-cols-2 gap-x-6 mt-4">
                    <Section title="Location">
                        {report.location?.text || 'Unknown'} {report.location?.specific_area ? `- ${report.location.specific_area}` : ''}
                    </Section>
                    <Section title="Date & Time">{report.occurred_at ? new Date(report.occurred_at).toLocaleString() : 'Unknown'}</Section>
                    
                    {!['Leadership Event', 'Positive Observation'].includes(report.type) && <Section title="Conditions">{report.conditions || 'N/A'}</Section>}
                    {!['Leadership Event', 'Positive Observation'].includes(report.type) && <Section title="Immediate Actions">{report.immediate_actions || 'N/A'}</Section>}
                    
                    {renderDetails()}
                    
                    {!['Leadership Event', 'Positive Observation'].includes(report.type) && (
                        <Section title="Initial Risk Assessment" fullWidth>
                            <RiskMatrixDisplay matrix={safeRiskMatrix} />
                        </Section>
                    )}
                    {report.ai_suggested_evidence && report.ai_suggested_evidence.length > 0 && (
                        <Section title="AI Suggested Evidence" fullWidth>
                            <ul className="list-disc list-inside text-sm text-blue-600 dark:text-blue-400">
                                {report.ai_suggested_evidence.map((ev, i) => <li key={i}>{ev}</li>)}
                            </ul>
                        </Section>
                    )}
                    
                    {report.evidence_urls && report.evidence_urls.length > 0 && (
                        <Section title="Evidence Photos" fullWidth>
                            <div className="flex gap-2 flex-wrap">
                                {report.evidence_urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noreferrer">
                                        <img src={url} alt="Evidence" className="w-24 h-24 object-cover rounded-md border border-gray-300 hover:opacity-75 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}
                </div>
                
                {/* Cost Impact Section */}
                {report.costs && (
                    <div className="mt-6">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Cost Impact Analysis</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h4 className="font-semibold mb-2">Direct Costs</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Medical:</span> <span>${report.costs.directCosts.medical}</span></div>
                                    <div className="flex justify-between"><span>Repair:</span> <span>${report.costs.directCosts.repair}</span></div>
                                    <div className="flex justify-between"><span>Compensation:</span> <span>${report.costs.directCosts.compensation}</span></div>
                                    <div className="flex justify-between"><span>Fines:</span> <span>${report.costs.directCosts.fines}</span></div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <h4 className="font-semibold mb-2">Indirect Costs</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Downtime:</span> <span>${report.costs.indirectCosts.downtime}</span></div>
                                    <div className="flex justify-between"><span>Lost Productivity:</span> <span>${report.costs.indirectCosts.lostProductivity}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                            <p className="font-bold text-yellow-800 dark:text-yellow-200">Total Estimated Impact: ${report.costs.totalEstimated}</p>
                        </div>
                    </div>
                )}
              </div>
              
              <div className={activeTab === 'capa' ? '' : 'hidden'}>
                <Card title="Corrective & Preventive Actions (CAPA)">
                  {canApprove && !['Leadership Event', 'Positive Observation'].includes(report.type) && (
                    <div className="grid grid-cols-2 gap-x-6 mb-4 p-4 border rounded-md bg-gray-50 dark:bg-dark-background">
                       <Section title="Classification">
                          <select value={editedClassification} onChange={e => setEditedClassification(e.target.value as ReportClassification)} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md">
                            {(['To Be Determined', 'Minor', 'Moderate', 'Major', 'Fatal'] as ReportClassification[]).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </Section>
                       <Section title="Root Cause">
                         <select value={editedRootCause || 'Other'} onChange={e => setEditedRootCause(e.target.value as RootCause)} className="w-full p-2 border dark:border-dark-border bg-transparent rounded-md">
                             {(['Human Error', 'Equipment Failure', 'Process Deficiency', 'Environment', 'Other'] as RootCause[]).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                       </Section>
                    </div>
                  )}
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
                      {capaList.length === 0 && <p className="text-sm text-gray-500 text-center">No CAPA items assigned yet.</p>}
                  </div>
                </Card>
              </div>

              <div className={activeTab === 'distribution' ? '' : 'hidden'}>
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
                          {distributionList.length === 0 && <p className="text-gray-500 text-sm italic">No distribution list defined.</p>}
                      </ul>
                  </Card>
              </div>
              
              <div className={activeTab === 'audit' ? '' : 'hidden'}>
                <AuditTrail logs={auditList} users={users} />
              </div>

            </main>
          </div>
          
          <footer className="p-4 border-t dark:border-dark-border bg-gray-100 dark:bg-black/20 flex-shrink-0 flex justify-between items-center">
            {canAcknowledge && <Button variant="secondary" onClick={() => onAcknowledgeReport(report.id)}>Acknowledge Receipt</Button>}
            <div></div>
            {canApprove && report.status !== 'closed' && (
                <div className="flex items-center space-x-2">
                    <Button variant="secondary">Request More Info</Button>
                    <Button 
                      onClick={() => onStatusChange(report.id, 'closed')} 
                      disabled={selfApprovalBlocked}
                      title={selfApprovalBlocked ? "Cannot approve a High/Critical report you created." : ""}
                    >
                      Verify & Close Report
                    </Button>
                </div>
            )}
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

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;