import React, { useState, useMemo } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Clock, 
  Lock, Users, Calendar, MapPin, FileText,
  Shield, Eye, Download, Printer,
  Play, Pause, CheckSquare, AlertCircle,
  History
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAppContext, usePtwWorkflow } from '../../contexts';
import type { Ptw, PtwStatus, PtwHotWorkPayload, PtwConfinedSpacePayload } from '../../types';

// Import Specialized Components
import { FireWatchDetails } from './FireWatchDetails';
import { GasTestLog } from './GasTestLog';
import { IsolationList } from './IsolationList';
import { WorkAtHeightPermit } from '../WorkAtHeightPermit';
import { LoadCalculationSection } from '../LoadCalculationSection';

interface PermitDetailViewProps {
  permit: Ptw;
  onClose: () => void;
  onUpdate: (permit: Ptw) => void;
}

const PhaseProgress: React.FC<{ status: PtwStatus }> = ({ status }) => {
  const phases = [
    { id: 'DRAFT', label: 'Draft' },
    { id: 'REQUESTED', label: 'Review' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'CLOSED', label: 'Closed' },
  ];

  // Map current status to a phase index
  const getCurrentIndex = () => {
    if (['DRAFT'].includes(status)) return 0;
    if (['REQUESTED', 'ISSUER_REVIEW', 'PENDING_APPROVAL'].includes(status)) return 1;
    if (['APPROVED', 'ISSUER_SIGNED'].includes(status)) return 2;
    if (['ACTIVE', 'SUSPENDED', 'COMPLETION_PENDING'].includes(status)) return 3;
    if (['CLOSED', 'ARCHIVED', 'CANCELLED'].includes(status)) return 4;
    return 0;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="mb-6 px-4">
      <div className="flex justify-between items-center mb-2 relative">
        {/* Progress Bar Background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10" />
        
        {phases.map((phase, index) => (
          <div key={phase.id} className="flex flex-col items-center bg-white dark:bg-gray-900 px-2">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
              ${index <= currentIndex 
                ? 'bg-blue-600 text-white border-blue-600' 
                : 'bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-800 dark:border-gray-600'}
            `}>
              {index + 1}
            </div>
            <span className={`text-xs mt-1 font-medium ${index <= currentIndex ? 'text-blue-600' : 'text-gray-500'}`}>
              {phase.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PermitDetailView: React.FC<PermitDetailViewProps> = ({ permit, onClose, onUpdate }) => {
  const { activeUser } = useAppContext();
  const { getNextPossibleStages, moveToNextStage, validateUserPermission } = usePtwWorkflow();
  const [activeTab, setActiveTab] = useState<'overview' | 'controls' | 'logs' | 'history'>('overview');

  // Determine if the current user can edit specific sections based on status
  const isLive = permit.status === 'ACTIVE';
  const isDraft = permit.status === 'DRAFT';

  // --- HANDLERS ---

  const handleWorkflowAction = (action: string) => {
    // This uses the Workflow Engine we built in Phase 1
    const updatedPtw = moveToNextStage(permit, activeUser?.id || 'unknown', action);
    if (updatedPtw) {
      onUpdate(updatedPtw);
    }
  };

  const handlePayloadUpdate = (field: string, data: any) => {
    const updatedPtw = {
      ...permit,
      payload: {
        ...permit.payload,
        [field]: data
      }
    };
    onUpdate(updatedPtw);
  };

  // --- RENDERERS ---

  const renderDynamicContent = () => {
    switch (permit.type) {
      case 'Hot Work':
        return (
          <FireWatchDetails 
            data={permit.payload as PtwHotWorkPayload}
            onChange={(d) => handlePayloadUpdate('fire_watcher', d.fire_watcher)}
            readOnly={!isDraft && !isLive}
          />
        );
      case 'Confined Space Entry':
        return (
          <GasTestLog 
            entries={(permit.payload as PtwConfinedSpacePayload).gas_tests || []}
            onChange={(d) => handlePayloadUpdate('gas_tests', d)}
            readOnly={!isLive} // Only editable when active
          />
        );
      case 'Electrical Work':
      case 'Mechanical Work':
        return (
          <IsolationList 
            isolations={(permit.payload as any).isolations || []}
            onChange={(d) => handlePayloadUpdate('isolations', d)}
            readOnly={!isDraft && !isLive}
          />
        );
      case 'Lifting':
        return (
           <LoadCalculationSection
              loadCalc={(permit.payload as any).load_calculation}
              onChange={(d) => handlePayloadUpdate('load_calculation', d)}
              disabled={!isDraft}
           />
        );
      case 'Work at Height':
         return (
            <WorkAtHeightPermit
                payload={permit.payload as any}
                onChange={(d) => handlePayloadUpdate('access_equipment', d.access_equipment)}
                readOnly={!isDraft}
            />
         );
      default:
        return <div className="text-gray-500 italic">No specific technical controls for this permit type.</div>;
    }
  };

  const nextStages = getNextPossibleStages(permit);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {permit.title}
              </h2>
              <Badge color={
                permit.status === 'ACTIVE' ? 'green' :
                permit.status === 'SUSPENDED' ? 'orange' :
                permit.status === 'APPROVED' ? 'blue' : 'gray'
              }>
                {permit.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                {permit.payload.permit_no}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {permit.payload.work.location}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {permit.payload.requester.contractor}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* PROGRESS */}
        <div className="pt-6 bg-gray-50 dark:bg-black/20">
            <PhaseProgress status={permit.status} />
        </div>

        {/* TABS */}
        <div className="px-6 border-b dark:border-gray-800 bg-gray-50 dark:bg-black/20">
          <div className="flex space-x-6">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'controls', label: 'Controls & Hazards', icon: Shield },
              { id: 'logs', label: 'Live Logs', icon: Activity },
              { id: 'history', label: 'Audit Trail', icon: History },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`pb-3 pt-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-black/10">
          
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Work Details">
                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="block text-gray-500 text-xs uppercase font-bold">Description</span>
                            <p className="text-gray-900 dark:text-white mt-1">{permit.payload.work.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="block text-gray-500 text-xs uppercase font-bold">Start Time</span>
                                <p className="text-gray-900 dark:text-white">{permit.payload.work.coverage.start_date} {permit.payload.work.coverage.start_time}</p>
                            </div>
                            <div>
                                <span className="block text-gray-500 text-xs uppercase font-bold">End Time</span>
                                <p className="text-gray-900 dark:text-white">{permit.payload.work.coverage.end_date} {permit.payload.work.coverage.end_time}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card title="Personnel">
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                            <span className="text-gray-500">Requester</span>
                            <span className="font-medium text-gray-900 dark:text-white">{permit.payload.requester.name}</span>
                        </div>
                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                            <span className="text-gray-500">Supervisor</span>
                            <span className="font-medium text-gray-900 dark:text-white">{permit.payload.contractor_safety_personnel?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500">Team Size</span>
                            <span className="font-medium text-gray-900 dark:text-white">{permit.payload.work.number_of_workers} Workers</span>
                        </div>
                    </div>
                </Card>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-6">
                {/* Dynamic Component based on Type */}
                {renderDynamicContent()}

                {/* Standard PPE */}
                <Card title="Required PPE">
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(permit.payload.ppe).map(([key, required]) => (
                            required && (
                                <Badge key={key} color="blue" className="capitalize">
                                    {key.replace(/_/g, ' ')}
                                </Badge>
                            )
                        ))}
                    </div>
                </Card>
            </div>
          )}

          {activeTab === 'logs' && (
              <div className="space-y-6">
                  {/* If it's confined space, show gas logs again here for convenience */}
                  {permit.type === 'Confined Space Entry' && (
                      <GasTestLog 
                        entries={(permit.payload as PtwConfinedSpacePayload).gas_tests || []}
                        onChange={(d) => handlePayloadUpdate('gas_tests', d)}
                        readOnly={!isLive}
                      />
                  )}
                  
                  {/* Workflow Log */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-900 dark:text-white">Workflow History</h3>
                      {permit.workflow_log?.map((log, i) => (
                          <div key={i} className="flex gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                              <div className="text-xs text-gray-500 w-32">
                                  {new Date(log.timestamp).toLocaleString()}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{log.action}</p>
                                  <p className="text-xs text-gray-500">by User ID: {log.user_id}</p>
                                  {log.comments && <p className="text-xs text-blue-600 mt-1">"{log.comments}"</p>}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center sticky bottom-0">
            <div className="flex gap-2">
                <Button variant="secondary" leftIcon={<Printer className="w-4 h-4"/>}>Print</Button>
                <Button variant="secondary" leftIcon={<Download className="w-4 h-4"/>}>PDF</Button>
            </div>

            <div className="flex gap-3">
                {nextStages.map(stage => {
                    const canMove = validateUserPermission(permit, activeUser?.id || '', activeUser?.role || '');
                    
                    // Determine button style based on action
                    let btnStyle = "bg-blue-600 hover:bg-blue-700";
                    let icon = <CheckCircle className="w-4 h-4 mr-2" />;
                    
                    if (stage === 'APPROVED') btnStyle = "bg-emerald-600 hover:bg-emerald-700";
                    if (stage === 'ACTIVE') { btnStyle = "bg-green-600 hover:bg-green-700"; icon = <Play className="w-4 h-4 mr-2" />; }
                    if (stage === 'SUSPENDED') { btnStyle = "bg-orange-600 hover:bg-orange-700"; icon = <Pause className="w-4 h-4 mr-2" />; }
                    if (stage === 'CLOSED') { btnStyle = "bg-slate-700 hover:bg-slate-800"; icon = <CheckSquare className="w-4 h-4 mr-2" />; }
                    if (stage === 'REJECTED' || stage === 'CANCELLED') { btnStyle = "bg-red-600 hover:bg-red-700"; icon = <AlertCircle className="w-4 h-4 mr-2" />; }

                    return (
                        <Button 
                            key={stage} 
                            onClick={() => handleWorkflowAction(stage)}
                            disabled={!canMove}
                            className={`${btnStyle} text-white shadow-lg`}
                        >
                            {icon}
                            {stage.replace('_', ' ')}
                        </Button>
                    );
                })}
            </div>
        </div>

      </div>
    </div>
  );
};