import React, { useState, useEffect } from 'react';
import type { Ptw, User, PtwSafetyRequirement } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext } from '../contexts';
import { usePtwWorkflow } from '../contexts/PtwWorkflowContext';
import { WorkAtHeightPermit } from './WorkAtHeightPermit';
import { useToast } from './ui/Toast';
import { ActionsBar } from './ui/ActionsBar';
import { EmailModal } from './ui/EmailModal';
import { LoadCalculationSection } from './LoadCalculationSection';
import { GasTestLogSection } from './GasTestLogSection';
import { PersonnelEntryLogSection } from './PersonnelEntryLogSection';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Shield, X, ArrowRight } from 'lucide-react';
import { IsolationManagementModal } from './permit/IsolationManagementModal';

interface PtwDetailModalProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw, action?: any) => void;
}

export const PtwDetailModal: React.FC<PtwDetailModalProps> = ({ ptw, onClose, onUpdate }) => {
  const { activeUser } = useAppContext();
  const { moveToNextStage, getNextPossibleStages, getStageResponsibilities } = usePtwWorkflow();
  const [isIsolationModalOpen, setIsIsolationModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'isolations'>('details');

  const handleWorkflowAction = (stage: string) => {
    if (!activeUser) return;
    const updatedPtw = moveToNextStage(ptw, activeUser.id, `Moved to ${stage}`);
    if (updatedPtw) {
      onUpdate(updatedPtw, stage);
    }
  };

  const nextStages = getNextPossibleStages(ptw);
  const currentResponsibilities = getStageResponsibilities(ptw.status);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color={ptw.status === 'ACTIVE' ? 'green' : 'blue'}>
                {ptw.status.replace(/_/g, ' ')}
              </Badge>
              <span className="text-xs font-mono text-gray-500">{ptw.payload.permit_no || 'DRAFT'}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{ptw.title}</h2>
            <p className="text-sm text-gray-500">{ptw.type} • {ptw.project_id}</p>
          </div>
          <div className="flex gap-2">
             <ActionsBar onPrint={() => window.print()} onEmail={() => setIsEmailModalOpen(true)} />
             <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-6 h-6 text-gray-500" />
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b dark:border-gray-800 px-6">
            <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Details</button>
            <button onClick={() => setActiveTab('workflow')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'workflow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Workflow & Audit</button>
            <button onClick={() => setActiveTab('isolations')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'isolations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>Isolations (LOTO)</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50 dark:bg-black/20">
          
          {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
                    <h3 className="font-bold mb-4 border-b pb-2">Work Description</h3>
                    <p className="text-gray-700 dark:text-gray-300">{ptw.payload.work.description}</p>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div><span className="text-gray-500 block">Location</span>{ptw.payload.work.location}</div>
                        <div><span className="text-gray-500 block">Contractor</span>{ptw.payload.requester.contractor}</div>
                        <div><span className="text-gray-500 block">Start Time</span>{ptw.payload.work.coverage.start_time}</div>
                        <div><span className="text-gray-500 block">End Time</span>{ptw.payload.work.coverage.end_time}</div>
                    </div>
                </div>

                {/* Dynamic Sections based on Type */}
                {ptw.type === 'Lifting' && <LoadCalculationSection loadCalc={(ptw.payload as any).load_calculation} onChange={() => {}} disabled={true} />}
                {ptw.type === 'Confined Space Entry' && <GasTestLogSection gasTests={(ptw.payload as any).gas_tests} onChange={() => {}} disabled={true} />}
                {ptw.type === 'Work at Height' && <WorkAtHeightPermit payload={ptw.payload as any} onChange={() => {}} readOnly={true} />}
              </div>
          )}

          {activeTab === 'workflow' && (
              <div className="space-y-6">
                  {/* Current Stage Actions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                    <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Current Stage: {ptw.status.replace(/_/g, ' ')}
                    </h3>
                    
                    {currentResponsibilities.length > 0 && (
                        <div className="mb-4 bg-white dark:bg-gray-800 p-3 rounded-lg text-sm">
                            <p className="font-semibold mb-1">Pending Actions:</p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400">
                                {currentResponsibilities.map((resp, i) => <li key={i}>{resp}</li>)}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                    {nextStages.map(stage => (
                        <Button key={stage} onClick={() => handleWorkflowAction(stage)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Move to {stage.replace(/_/g, ' ')} <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ))}
                    {nextStages.length === 0 && (
                        <p className="text-sm text-gray-500">No further actions available for this stage.</p>
                    )}
                    </div>
                </div>

                {/* Audit Log */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 font-bold">Workflow History</div>
                    <div className="divide-y dark:divide-gray-700">
                        {ptw.workflow_log?.map((log, i) => (
                            <div key={i} className="p-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="font-semibold">{log.action}</span>
                                    <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-gray-500 mt-1">User ID: {log.user_id}</p>
                            </div>
                        ))}
                        {(!ptw.workflow_log || ptw.workflow_log.length === 0) && <div className="p-4 text-gray-500 italic">No history recorded.</div>}
                    </div>
                </div>
              </div>
          )}

          {activeTab === 'isolations' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" /> Active Isolations
                </h3>
                <Button size="sm" variant="secondary" onClick={() => setIsIsolationModalOpen(true)}>
                    Manage LOTO
                </Button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-dashed text-center text-gray-500">
                    No active isolations recorded. Click "Manage LOTO" to add points.
                </div>
            </div>
          )}

        </div>
      </div>

      {isIsolationModalOpen && (
        <IsolationManagementModal 
          ptw={ptw} 
          isOpen={isIsolationModalOpen} 
          onClose={() => setIsIsolationModalOpen(false)}
          onUpdate={(isolations) => {
             console.log("Isolations updated", isolations);
          }}
        />
      )}
      
      <EmailModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={`PTW: ${ptw.payload.permit_no}`}
        documentLink="#"
        defaultRecipients={[]}
      />
    </div>
  );
};