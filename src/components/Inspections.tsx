import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { InspectionCreationModal } from './InspectionCreationModal';
import { InspectionConductModal } from './InspectionConductModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';

// ICONS
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504 1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;

const InspectionCard: React.FC<{
    inspection: Inspection;
    onConduct: (inspection: Inspection) => void;
}> = ({ inspection, onConduct }) => {
    const { usersList } = useAppContext();
    const { projects } = useDataContext();
    const responsible = usersList.find(u => u.id === inspection.person_responsible_id)?.name || 'Unknown';
    const project = projects.find(p => p.id === inspection.project_id)?.name || 'Unknown';
    
    const getStatusColor = (status: Inspection['status']): 'green' | 'blue' | 'yellow' | 'red' | 'gray' => {
        switch (status) {
            case 'Closed':
            case 'Approved': return 'green';
            case 'In Progress': return 'blue';
            case 'Scheduled': return 'blue';
            case 'Pending Review': return 'yellow';
            case 'Draft': return 'gray';
            case 'Overdue': return 'red';
            default: return 'gray';
        }
    };
    
    const findingsCount = inspection.findings?.length || 0;

    return (
        <Card className="hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <ClipboardIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-md text-text-primary pr-2">{inspection.title}</h3>
                        <p className="text-xs text-text-secondary">{inspection.inspection_id || 'ID Pending'}</p>
                    </div>
                </div>
                {/* @ts-ignore */}
                <Badge color={getStatusColor(inspection.status)}>{inspection.status}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 py-3 border-t border-b border-gray-100 dark:border-gray-800">
                 <div>
                    <span className="text-xs text-gray-500 block">Project</span>
                    <span className="text-sm font-medium">{project}</span>
                 </div>
                 <div>
                    <span className="text-xs text-gray-500 block">Assigned To</span>
                    <span className="text-sm font-medium">{responsible}</span>
                 </div>
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="text-xs font-semibold text-red-500">
                    {findingsCount > 0 ? `${findingsCount} Findings` : 'No Findings'}
                </div>
                <Button size="sm" onClick={() => onConduct(inspection)}>
                    {inspection.status === 'Draft' || inspection.status === 'Scheduled' ? 'Start' : 'Continue'}
                </Button>
            </div>
        </Card>
    );
};

export const Inspections: React.FC = () => {
  const { usersList, can } = useAppContext();
  const { inspectionList, projects, handleUpdateInspection, checklistTemplates, handleCreateInspection } = useDataContext();
  const { isInspectionCreationModalOpen, setIsInspectionCreationModalOpen } = useModalContext();

  const [isConductModalOpen, setConductModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const handleStartConduct = (inspection: Inspection) => {
    let inspectionToConduct = inspection;
    // Auto-transition status when starting
    if (inspection.status === 'Draft' || inspection.status === 'Scheduled') {
        // @ts-ignore
        inspectionToConduct = { ...inspection, status: 'In Progress' };
        handleUpdateInspection(inspectionToConduct);
    }
    setSelectedInspection(inspectionToConduct);
    setConductModalOpen(true);
  };

  const handleUpdateAndCloseConduct = (inspection: Inspection, action?: 'submit' | 'save' | 'approve' | 'close') => {
    // Logic to handle status transitions based on action
    let newStatus = inspection.status;
    if (action === 'submit') newStatus = 'Pending Review' as any;
    if (action === 'approve') newStatus = 'Approved';
    if (action === 'close') newStatus = 'Closed';

    const updated = { ...inspection, status: newStatus };
    handleUpdateInspection(updated);
    
    if (action !== 'save') {
        setConductModalOpen(false);
        setSelectedInspection(null);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Inspections</h1>
            <p className="text-text-secondary">Manage and conduct safety audits.</p>
        </div>
        {can('create', 'inspections') && (
            <Button onClick={() => setIsInspectionCreationModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspectionList.map((inspection) => (
            <InspectionCard 
                key={inspection.id}
                inspection={inspection}
                onConduct={handleStartConduct}
            />
        ))}
         {inspectionList.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
                <p>No inspections scheduled. Create one to get started.</p>
            </div>
        )}
      </div>

      {isInspectionCreationModalOpen && (
        <InspectionCreationModal
            isOpen={isInspectionCreationModalOpen}
            onClose={() => setIsInspectionCreationModalOpen(false)}
            onSubmit={handleCreateInspection}
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}

      {isConductModalOpen && selectedInspection && (
        <InspectionConductModal
            isOpen={isConductModalOpen}
            onClose={() => setConductModalOpen(false)}
            inspection={selectedInspection}
            // @ts-ignore
            onUpdate={handleUpdateAndCloseConduct}
            onConvertToReport={() => {}} // Added missing prop
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}
    </div>
  );
};