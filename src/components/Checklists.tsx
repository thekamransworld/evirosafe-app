import React, { useState, useMemo } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { ChecklistLibraryModal } from './ChecklistLibraryModal';
import { ChecklistAISuggestor } from './ChecklistAISuggestor';
import { RiskAssessmentDashboard } from './RiskAssessmentDashboard';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, Download, Brain, Zap, AlertTriangle, X } from 'lucide-react';

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates, handleCreateChecklistTemplate } = useDataContext();
    
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [projectForRun, setProjectForRun] = useState(projects[0] || null);
  
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  // AI States
  const [showAISuggestor, setShowAISuggestor] = useState(false);
  const [showRiskDashboard, setShowRiskDashboard] = useState(false);

  const getTranslated = (textRecord: Record<string, string> | string) => {
      if (typeof textRecord === 'string') return textRecord;
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  }

  const handleAIGenerate = (template: ChecklistTemplate) => {
    handleCreateChecklistTemplate(template);
    setShowAISuggestor(false);
  };

  const handleSubmitRun = (data: any) => {
    const newRun = { 
        ...data, 
        id: `cr_${Date.now()}`, 
        org_id: activeOrg.id, 
        executed_by_id: activeUser.id, 
        executed_at: new Date().toISOString() 
    };
    setChecklistRunList(prev => [newRun, ...prev]);
    setRunModalOpen(false);
    setSelectedTemplate(null);
    setProjectForRun(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Checklists</h1>
        <div className="flex gap-2">
            {can('create', 'checklists') && (
                <>
                    <Button variant="secondary" onClick={() => setIsLibraryOpen(true)}>
                        <Download className="w-5 h-5 mr-2" /> Import
                    </Button>
                    <Button onClick={() => checklistTemplates.length > 0 && setSetupModalOpen(true)}>
                        <Plus className="w-5 h-5 mr-2" /> Run
                    </Button>
                </>
            )}
        </div>
      </div>

      {/* AI Quick Actions */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 border-purple-200 dark:border-purple-900">
            <div className="p-4">
            <div className="flex items-center mb-3">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2" />
                <h3 className="font-bold text-gray-900 dark:text-white">AI Assistant</h3>
            </div>
            <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setShowAISuggestor(true)}>
                    <Zap className="w-4 h-4 mr-2" /> Generate Smart Checklist
                </Button>
                <Button variant="ghost" className="w-full justify-start text-left" onClick={() => setShowRiskDashboard(true)}>
                    <AlertTriangle className="w-4 h-4 mr-2" /> Analyze Risk Trends
                </Button>
            </div>
            </div>
        </Card>
        
        <Card>
            <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Safety Score</h3>
                <div className="text-3xl font-bold text-green-600">92%</div>
                <div className="text-sm text-gray-500 mt-1">Based on {checklistRunList.length} checklists</div>
            </div>
        </Card>

        <Card>
            <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">This Week</h3>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Completed</span>
                    <span className="font-bold dark:text-white">24</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">Issues</span>
                    <span className="font-bold text-red-500">3</span>
                </div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card title="My Templates">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {checklistTemplates.map(template => (
                        <li key={template.id} className="py-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{getTranslated(template.title)}</p>
                                    {template.aiGenerated && <Badge color="purple" size="sm">AI</Badge>}
                                </div>
                                <p className="text-xs text-gray-500">{template.category}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplate(template); setDetailModalOpen(true); }}>View</Button>
                        </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card title="Recent Checklist Runs">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {checklistRunList.map((run) => (
                        <tr key={run.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {checklistTemplates.find(t => t.id === run.template_id)?.title['en'] || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{run.score}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge color={run.status === 'completed' ? 'green' : 'blue'}>{run.status}</Badge>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </div>
      </div>
      
      {/* Modals */}
      {isDetailModalOpen && selectedTemplate && (
        <ChecklistDetailModal 
            template={selectedTemplate}
            onClose={() => setDetailModalOpen(false)}
            organization={activeOrg}
            project={projects[0]}
            user={activeUser}
        />
      )}

      {isSetupModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={() => setSetupModalOpen(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Run Checklist</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Template</label>
                        <select 
                            onChange={e => setSelectedTemplate(checklistTemplates.find(t => t.id === e.target.value) || null)}
                            className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        >
                            <option value="">Choose...</option>
                            {checklistTemplates.map(t => <option key={t.id} value={t.id}>{getTranslated(t.title)}</option>)}
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Project</label>
                         <select onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="secondary" onClick={() => setSetupModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => { setSetupModalOpen(false); setRunModalOpen(true); }} disabled={!selectedTemplate || !projectForRun}>Start</Button>
                    </div>
                </div>
            </div>
         </div>
      )}
      
      {isRunModalOpen && selectedTemplate && projectForRun && (
        <ChecklistRunModal
            template={selectedTemplate}
            project={projectForRun}
            user={activeUser}
            onClose={() => setRunModalOpen(false)}
            onSubmit={handleSubmitRun}
        />
      )}

      <ChecklistLibraryModal 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onImport={handleCreateChecklistTemplate}
      />

      <ChecklistAISuggestor
        isOpen={showAISuggestor}
        onClose={() => setShowAISuggestor(false)}
        onGenerate={handleAIGenerate}
      />

      {showRiskDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={() => setShowRiskDashboard(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Risk Assessment Dashboard</h2>
                        <button onClick={() => setShowRiskDashboard(false)}><X className="w-6 h-6 text-gray-500"/></button>
                    </div>
                    <RiskAssessmentDashboard />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};