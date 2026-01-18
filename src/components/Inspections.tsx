import React, { useState, useMemo } from 'react';
import type { Inspection } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { InspectionCreationModal } from './InspectionCreationModal';
import { InspectionConductModal } from './InspectionConductModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { ClipboardIcon, PlusIcon, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

// --- ANALYTICS DASHBOARD ---
const InspectionAnalyticsDashboard: React.FC<{ inspections: Inspection[] }> = ({ inspections }) => {
  const stats = useMemo(() => {
    const completed = inspections.filter(i => i.status === 'Closed' || i.status === 'Approved').length;
    const inProgress = inspections.filter(i => i.status === 'In Progress').length;
    const findings = inspections.flatMap(i => i.findings || []);
    const openFindings = findings.filter(f => f.status === 'open').length;
    const criticalFindings = findings.filter(f => f.risk_level === 'Critical' || f.risk_level === 'High').length;
    
    return { total: inspections.length, completed, inProgress, openFindings, criticalFindings };
  }, [inspections]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="p-4 flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Total Inspections</p><p className="text-2xl font-bold text-blue-600">{stats.total}</p></div>
        <ClipboardIcon className="w-8 h-8 text-blue-100" />
      </Card>
      <Card className="p-4 flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{stats.completed}</p></div>
        <CheckCircle className="w-8 h-8 text-green-100" />
      </Card>
      <Card className="p-4 flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Open Findings</p><p className="text-2xl font-bold text-red-600">{stats.openFindings}</p></div>
        <AlertTriangle className="w-8 h-8 text-red-100" />
      </Card>
      <Card className="p-4 flex items-center justify-between">
        <div><p className="text-sm text-gray-500">Critical Risks</p><p className="text-2xl font-bold text-orange-600">{stats.criticalFindings}</p></div>
        <AlertCircle className="w-8 h-8 text-orange-100" />
      </Card>
    </div>
  );
};

// --- MAIN COMPONENT ---
export const Inspections: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { inspectionList, setInspectionList, projects, handleUpdateInspection, checklistTemplates, handleCreateInspection } = useDataContext();
  const { isInspectionCreationModalOpen, setIsInspectionCreationModalOpen } = useModalContext();

  const [isConductModalOpen, setConductModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const handleStartConduct = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setConductModalOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Inspections</h1>
            <p className="text-text-secondary">Professional HSE inspection management</p>
        </div>
        {can('create', 'inspections') && (
            <Button onClick={() => setIsInspectionCreationModalOpen(true)}>
              <PlusIcon className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
        )}
      </div>

      <InspectionAnalyticsDashboard inspections={inspectionList} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspectionList.map((inspection) => (
            <Card key={inspection.id} className="hover:border-blue-300 transition-colors cursor-pointer" onClick={() => handleStartConduct(inspection)}>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-md text-text-primary">{inspection.title}</h3>
                    <Badge color={inspection.status === 'Approved' ? 'green' : 'blue'}>{inspection.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mb-4">{inspection.inspection_id}</p>
                <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-xs text-gray-500">{inspection.findings?.length || 0} Findings</span>
                    <Button size="sm" variant="ghost">Open</Button>
                </div>
            </Card>
        ))}
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
            onUpdate={handleUpdateInspection}
            onConvertToReport={() => {}}
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}
    </div>
  );
};