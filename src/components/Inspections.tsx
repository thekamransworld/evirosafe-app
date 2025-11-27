
import React, { useState, useMemo, useEffect } from 'react';
import type { Inspection, InspectionFinding, InspectionStatus } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { InspectionCreationModal } from './InspectionCreationModal';
import { InspectionConductModal } from './InspectionConductModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';

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
            case 'Approved':
            case 'Archived':
                 return 'green';
            case 'Ongoing':
            case 'Submitted':
                 return 'blue';
            case 'Under Review': return 'yellow';
            case 'Draft': return 'gray';
            default: return 'gray';
        }
    };
    
    return (
        <Card>
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-md text-text-primary pr-2">{inspection.title}</h3>
                <Badge color={getStatusColor(inspection.status)}>{inspection.status}</Badge>
            </div>
            <p className="text-sm text-text-secondary mt-1">{inspection.type} Inspection</p>
            <div className="text-xs text-gray-500 mt-4 space-y-1">
                <p><strong>Project:</strong> {project}</p>
                <p><strong>Responsible:</strong> {responsible}</p>
                <p><strong>Scheduled:</strong> {new Date(inspection.schedule_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
                <Button onClick={() => onConduct(inspection)}>
                    {inspection.status === 'Draft' ? 'Start' : 'View / Continue'}
                </Button>
            </div>
        </Card>
    );
};

const FilterButton: React.FC<{label: string, value: string, currentFilter: string, setFilter: (val: string) => void}> = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-3 py-1 text-sm font-medium rounded-full transition-colors duration-200 ${
            currentFilter === value ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-dark-card dark:text-dark-text-secondary dark:hover:bg-white/10'
        }`}
    >
        {label}
    </button>
)

export const Inspections: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { inspectionList, setInspectionList, projects, handleUpdateInspection, checklistTemplates } = useDataContext();
  const { setReportInitialData, setIsReportCreationModalOpen, isInspectionCreationModalOpen, setIsInspectionCreationModalOpen } = useModalContext();

  const [isConductModalOpen, setConductModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<InspectionStatus | 'All'>('All');

  const filteredInspections = useMemo(() => {
    return inspectionList.filter(inspection => {
        const typeMatch = typeFilter === 'All' || inspection.type === typeFilter;
        const statusMatch = statusFilter === 'All' || inspection.status === statusFilter;
        return typeMatch && statusMatch;
    });
  }, [inspectionList, typeFilter, statusFilter]);

  const handleCreateInspection = (data: Omit<Inspection, 'id' | 'org_id' | 'findings' | 'status'>) => {
    const newInspection: Inspection = {
      ...data,
      id: `insp_${Date.now()}`,
      org_id: activeOrg.id,
      findings: [],
      status: 'Draft',
      audit_trail: [{ user_id: activeOrg.id, timestamp: new Date().toISOString(), action: 'Inspection Created'}]
    };
    setInspectionList(prev => [newInspection, ...prev]);
    setIsInspectionCreationModalOpen(false);
  };

  const onConvertToReport = (finding: InspectionFinding) => {
    setReportInitialData({ type: 'Unsafe Condition', description: finding.description, evidence_urls: finding.evidence_urls });
    setIsReportCreationModalOpen(true);
    setConductModalOpen(false);
  };
  
  const handleStartConduct = (inspection: Inspection) => {
    let inspectionToConduct = inspection;
    if (inspection.status === 'Draft') {
        inspectionToConduct = { ...inspection, status: 'Ongoing' };
        handleUpdateInspection(inspectionToConduct, 'save');
    }
    setSelectedInspection(inspectionToConduct);
    setConductModalOpen(true);
  };

  const handleUpdateAndCloseConduct = (inspection: Inspection, action?: 'submit' | 'approve' | 'request_revision' | 'close' | 'save') => {
    handleUpdateInspection(inspection, action);
    setConductModalOpen(false);
    setSelectedInspection(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Inspections</h1>
        {can('create', 'inspections') && (
            <Button onClick={() => setIsInspectionCreationModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
        )}
      </div>

      <Card className="mb-6">
        <div className="space-y-4">
             <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Type</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <FilterButton label="All" value="All" currentFilter={typeFilter} setFilter={setTypeFilter} />
                    {['Safety', 'Quality', 'Environmental', 'Fire', 'Equipment'].map(t => <FilterButton key={t} label={t} value={t} currentFilter={typeFilter} setFilter={setTypeFilter} />)}
                </div>
            </div>
            <div>
                <label className="text-sm font-semibold text-gray-600 dark:text-dark-text-secondary">Status</label>
                <div className="flex flex-wrap gap-2 mt-2">
                    <FilterButton label="All" value="All" currentFilter={statusFilter} setFilter={setStatusFilter as (val: string) => void} />
                    {['Draft', 'Ongoing', 'Submitted', 'Under Review', 'Approved', 'Closed'].map(s => <FilterButton key={s} label={s} value={s} currentFilter={statusFilter} setFilter={setStatusFilter as (val: string) => void} />)}
                </div>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInspections.map((inspection) => (
            <InspectionCard 
                key={inspection.id}
                inspection={inspection}
                onConduct={handleStartConduct}
            />
        ))}
         {filteredInspections.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
                <p>No inspections match the current filters.</p>
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
            onUpdate={handleUpdateAndCloseConduct}
            onConvertToReport={onConvertToReport}
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
