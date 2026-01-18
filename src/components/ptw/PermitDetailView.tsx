import React, { useState } from 'react';
import type { Ptw } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAppContext } from '../../contexts';
// FIX: Import from the correct context file
import { usePtwWorkflow } from '../../contexts/PtwWorkflowContext';
import { Activity, AlertTriangle, CheckCircle, Clock, FileText, Shield, X } from 'lucide-react';
import { IsolationManagementModal } from '../permit/IsolationManagementModal';

interface PermitDetailViewProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw, action?: any) => void;
}

export const PermitDetailView: React.FC<PermitDetailViewProps> = ({ ptw, onClose, onUpdate }) => {
  const { activeUser } = useAppContext();
  const { moveToNextStage, getNextPossibleStages } = usePtwWorkflow();
  const [isIsolationModalOpen, setIsIsolationModalOpen] = useState(false);

  const handleWorkflowAction = (action: string) => {
    if (!activeUser) return;
    const updatedPtw = moveToNextStage(ptw, activeUser.id, action);
    if (updatedPtw) {
      onUpdate(updatedPtw, action);
    }
  };

  const nextStages = getNextPossibleStages(ptw);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge color={ptw.status === 'ACTIVE' ? 'green' : 'blue'}>
                {ptw.status.replace('_', ' ')}
              </Badge>
              <span className="text-xs font-mono text-gray-500">{ptw.id}</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{ptw.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Workflow Actions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" /> Workflow Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {nextStages.map(stage => (
                <Button key={stage} onClick={() => handleWorkflowAction(stage)}>
                  Move to {stage.replace('_', ' ')}
                </Button>
              ))}
              {nextStages.length === 0 && (
                <p className="text-sm text-gray-500">No further actions available.</p>
              )}
            </div>
          </div>

          {/* Isolations */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" /> Isolations (LOTO)
              </h3>
              <Button size="sm" variant="secondary" onClick={() => setIsIsolationModalOpen(true)}>
                Manage Isolations
              </Button>
            </div>
            {/* Isolation summary would go here */}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white border-b pb-2">Permit Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-gray-500">Location</span>
                <span className="font-medium dark:text-gray-200">{ptw.payload.work.location}</span>
              </div>
              <div>
                <span className="block text-gray-500">Start Time</span>
                <span className="font-medium dark:text-gray-200">{ptw.payload.work.coverage.start_time}</span>
              </div>
              <div>
                <span className="block text-gray-500">End Time</span>
                <span className="font-medium dark:text-gray-200">{ptw.payload.work.coverage.end_time}</span>
              </div>
              <div>
                <span className="block text-gray-500">Requester</span>
                <span className="font-medium dark:text-gray-200">{ptw.payload.requester.name}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {isIsolationModalOpen && (
        <IsolationManagementModal 
          ptw={ptw} 
          isOpen={isIsolationModalOpen} 
          onClose={() => setIsIsolationModalOpen(false)}
          onUpdate={(isolations) => {
             // Handle update logic here
             console.log("Isolations updated", isolations);
          }}
        />
      )}
    </div>
  );
};