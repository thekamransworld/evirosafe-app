import React, { useState, useMemo } from 'react';
import type { Inspection, InspectionStatus, InspectionFinding } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { InspectionCreationModal } from './InspectionCreationModal';
import { InspectionConductModal } from './InspectionConductModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { 
  Plus, ClipboardList, AlertTriangle, CheckCircle, 
  Clock, BarChart3, ArrowRight, Calendar 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';

// --- ANALYTICS COMPONENT ---
const InspectionAnalytics: React.FC<{ inspections: Inspection[] }> = ({ inspections }) => {
  const stats = useMemo(() => {
    const total = inspections.length;
    const completed = inspections.filter(i => i.status === 'Closed' || i.status === 'Approved').length;
    const inProgress = inspections.filter(i => i.status === 'In Progress' || i.status === 'Ongoing').length;
    
    // Flatten all findings to analyze risks
    const allFindings = inspections.flatMap(i => i.findings || []);
    const criticalFindings = allFindings.filter(f => f.risk_level === 'High').length;
    const openFindings = allFindings.filter(f => f.status === 'open').length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, criticalFindings, openFindings, completionRate };
  }, [inspections]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completion Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.completionRate}%</span>
            <span className="text-xs text-slate-500 mb-1">of {stats.total} inspections</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${stats.completionRate}%` }}></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Risks</p>
            <p className="text-3xl font-black text-red-600 mt-1">{stats.criticalFindings}</p>
          </div>
          <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">High risk findings identified</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Open Actions</p>
            <p className="text-3xl font-black text-orange-500 mt-1">{stats.openFindings}</p>
          </div>
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Findings requiring action</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Now</p>
            <p className="text-3xl font-black text-blue-500 mt-1">{stats.inProgress}</p>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">Inspections currently ongoing</p>
      </div>
    </div>
  );
};

// --- CARD COMPONENT ---
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
            case 'In Progress': 
            case 'Ongoing': return 'blue';
            case 'Scheduled': return 'blue';
            case 'Pending Review': 
            case 'Submitted': return 'yellow';
            case 'Draft': return 'gray';
            case 'Overdue': return 'red';
            default: return 'gray';
        }
    };

    const getPhaseLabel = (phase?: string) => {
        switch(phase) {
            case 'opening_meeting': return 'Phase 1: Opening';
            case 'execution': return 'Phase 2: Execution';
            case 'closing_meeting': return 'Phase 3: Closing';
            case 'closed': return 'Complete';
            default: return 'Planning';
        }
    };
    
    const findingsCount = inspection.findings?.length || 0;
    const criticalCount = inspection.findings?.filter(f => f.risk_level === 'High').length || 0;

    return (
        <Card className="hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 group cursor-pointer" onClick={() => onConduct(inspection)}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${inspection.type === 'Safety' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{inspection.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{inspection.id ? inspection.id.slice(-6) : 'NEW'}</p>
                    </div>
                </div>
                <Badge color={getStatusColor(inspection.status)}>{inspection.status}</Badge>
            </div>
            
            <div className="space-y-2 mb-4">
                 <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-20 text-slate-400">Project:</span>
                    <span className="font-medium truncate">{project}</span>
                 </div>
                 <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-20 text-slate-400">Lead:</span>
                    <span className="font-medium truncate">{responsible}</span>
                 </div>
                 <div className="flex items-center text-xs text-slate-600 dark:text-slate-300">
                    <span className="w-20 text-slate-400">Schedule:</span>
                    <span className="font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {inspection.schedule_at ? new Date(inspection.schedule_at).toLocaleDateString() : 'Unscheduled'}
                    </span>
                 </div>
            </div>

            {/* Progress / Phase Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Current Status</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{getPhaseLabel(inspection.current_phase)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${inspection.status === 'Closed' ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ 
                            width: inspection.current_phase === 'closed' ? '100%' : 
                                   inspection.current_phase === 'closing_meeting' ? '80%' : 
                                   inspection.current_phase === 'execution' ? '50%' : 
                                   inspection.current_phase === 'opening_meeting' ? '20%' : '5%' 
                        }}
                    ></div>
                </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-3">
                    {findingsCount > 0 && (
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {findingsCount} Findings
                        </span>
                    )}
                    {criticalCount > 0 && (
                        <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {criticalCount} Critical
                        </span>
                    )}
                </div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {inspection.status === 'Draft' ? 'Start' : 'Resume'} <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </Card>
    );
};

// --- MAIN COMPONENT ---
export const Inspections: React.FC = () => {
  const { activeOrg, usersList, can } = useAppContext();
  const { inspectionList, setInspectionList, projects, handleUpdateInspection, checklistTemplates, handleCreateInspection } = useDataContext();
  
  const { 
    isInspectionCreationModalOpen, 
    setIsInspectionCreationModalOpen,
    setIsReportCreationModalOpen,
    setReportInitialData
  } = useModalContext();

  const [isConductModalOpen, setConductModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  const handleStartConduct = (inspection: Inspection) => {
    let inspectionToConduct = inspection;
    // Auto-transition status when starting if in Draft
    if (inspection.status === 'Draft' || inspection.status === 'Scheduled') {
        inspectionToConduct = { 
            ...inspection, 
            status: 'In Progress',
            current_phase: 'opening_meeting' // Initialize phase
        };
        handleUpdateInspection(inspectionToConduct);
    }
    setSelectedInspection(inspectionToConduct);
    setConductModalOpen(true);
  };

  const handleUpdateAndCloseConduct = (inspection: Inspection, action?: 'submit' | 'save' | 'approve' | 'close') => {
    let newStatus = inspection.status;
    
    if (action === 'submit') newStatus = 'Submitted'; // Ready for review
    if (action === 'approve') newStatus = 'Approved';
    if (action === 'close') newStatus = 'Closed';

    const updated = { ...inspection, status: newStatus };
    handleUpdateInspection(updated);
    
    if (action !== 'save') {
        setConductModalOpen(false);
        setSelectedInspection(null);
    }
  };

  const handleConvertToReport = (finding: InspectionFinding) => {
    setReportInitialData({
        description: finding.description,
        type: 'Unsafe Condition',
        risk_pre_control: { 
            severity: finding.risk_level === 'High' ? 3 : finding.risk_level === 'Medium' ? 2 : 1, 
            likelihood: 2 
        },
        evidence_urls: finding.evidence_urls,
        immediate_actions: finding.immediate_actions
    });
    setIsReportCreationModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inspections</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage safety audits, track findings, and ensure compliance.</p>
        </div>
        {can('create', 'inspections') && (
            <Button onClick={() => setIsInspectionCreationModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20">
              <Plus className="w-5 h-5 mr-2" />
              New Inspection
            </Button>
        )}
      </div>

      {/* Analytics Dashboard */}
      <InspectionAnalytics inspections={inspectionList} />

      {/* Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inspectionList.map((inspection) => (
            <InspectionCard 
                key={inspection.id}
                inspection={inspection}
                onConduct={handleStartConduct}
            />
        ))}
         {inspectionList.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                <ClipboardList className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">No Inspections Found</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Get started by creating a new inspection plan.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsInspectionCreationModalOpen(true)}>
                    Create First Inspection
                </Button>
            </div>
        )}
      </div>

      {/* Modals */}
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
            onConvertToReport={handleConvertToReport}
            projects={projects}
            users={usersList}
            checklistTemplates={checklistTemplates}
        />
      )}
    </div>
  );
};