import React, { useState } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { ChecklistLibraryModal } from './ChecklistLibraryModal';
import { useAppContext, useDataContext } from '../contexts';
import { Plus, BookOpen, Play, Eye } from 'lucide-react';

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, usersList, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates } = useDataContext();
    
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [projectForRun, setProjectForRun] = useState(projects[0] || null);
  
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  
  const getTranslated = (textRecord: Record<string, string> | string) => {
      if (typeof textRecord === 'string') return textRecord;
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  }

  const getTemplateTitle = (templateId: string) => {
    const template = checklistTemplates.find(t => t.id === templateId);
    if (!template) return 'Unknown Template';
    return getTranslated(template.title);
  };
  const getUserName = (userId: string) => usersList.find(u => u.id === userId)?.name || 'Unknown';

  const handleViewTemplate = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    setDetailModalOpen(true);
  };

  const handleInitiateRun = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    if (projects.length > 0 && !projectForRun) {
        setProjectForRun(projects[0]);
    }
    setSetupModalOpen(true);
  };

  const handleStartRun = () => {
    if (selectedTemplate && projectForRun) {
        setSetupModalOpen(false);
        setRunModalOpen(true);
    }
  };
  
  const handleSubmitRun = (data: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'>) => {
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Checklists</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and execute safety inspections.</p>
        </div>
        <div className="flex gap-3">
            {can('create', 'checklists') && (
                <>
                    <Button variant="secondary" onClick={() => setIsLibraryOpen(true)}>
                        <BookOpen className="w-5 h-5 mr-2" />
                        Import from Library
                    </Button>
                    <Button onClick={() => { /* Logic for creating custom checklist */ }}>
                        <Plus className="w-5 h-5 mr-2" />
                        Create Custom
                    </Button>
                </>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className="lg:col-span-1">
            <Card title="Available Templates" className="h-full">
                {checklistTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <p>No templates found.</p>
                        <Button variant="ghost" size="sm" onClick={() => setIsLibraryOpen(true)} className="mt-2">Browse Library</Button>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {checklistTemplates.map(template => (
                            <li key={template.id} className="py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors rounded-lg px-2 -mx-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{getTranslated(template.title)}</p>
                                    <Badge color="blue" size="sm" className="mt-1">{template.category}</Badge>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleViewTemplate(template)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors" title="View">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {can('create', 'checklists') && (
                                        <button onClick={() => handleInitiateRun(template)} className="p-2 text-gray-400 hover:text-green-500 transition-colors" title="Run">
                                            <Play className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>

        {/* Recent Runs */}
        <div className="lg:col-span-2">
            <Card title="Recent Inspections">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {checklistRunList.map((run) => (
                        <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getTemplateTitle(run.template_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getUserName(run.executed_by_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                            <span className={run.score && run.score < 80 ? 'text-red-500' : 'text-green-500'}>{run.score}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge color={run.status === 'completed' ? 'green' : 'blue'}>{run.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-primary-600 hover:text-primary-500">View</button>
                        </td>
                        </tr>
                    ))}
                    {checklistRunList.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                No inspections performed yet.
                            </td>
                        </tr>
                    )}
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

      {isSetupModalOpen && selectedTemplate && (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={() => setSetupModalOpen(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Run Checklist</h3>
                    <p className="text-sm text-gray-500 mt-1">Setup details for this inspection.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template</label>
                        <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-900 dark:text-white text-sm">
                            {getTranslated(selectedTemplate.title)}
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Project</label>
                         <select 
                            value={projectForRun?.id} 
                            onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} 
                            className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-emerald-500 focus:border-emerald-500"
                         >
                             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
                    <Button variant="secondary" onClick={() => setSetupModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleStartRun}>Start Inspection</Button>
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
      />
    </div>
  );
};