import React, { useState } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { ChecklistLibraryModal } from './ChecklistLibraryModal'; // Import new modal
import { useAppContext, useDataContext } from '../contexts';
import { Plus, BookOpen } from 'lucide-react'; // Import icons

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, usersList, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates, setChecklistTemplates } = useDataContext(); // Ensure setChecklistTemplates is exposed in context
    
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [projectForRun, setProjectForRun] = useState(projects[0] || null);
  
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false); // New state
  
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
  
  const onCreateRun = (data: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'>) => {
    const newRun = { 
        ...data, 
        id: `cr_${Date.now()}`, 
        org_id: activeOrg.id, 
        executed_by_id: activeUser.id, 
        executed_at: new Date().toISOString() 
    };
    setChecklistRunList(prev => [newRun, ...prev]);
  };

  const handleSubmitRun = (data: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'>) => {
    onCreateRun(data);
    setRunModalOpen(false);
    setSelectedTemplate(null);
    setProjectForRun(null);
  };

  // New Handler for Importing
  const handleImportTemplate = (template: ChecklistTemplate) => {
      // In a real app, you would save this to the DB here
      // For now, we update the local context state
      // You need to ensure setChecklistTemplates is available in DataContext
      // If not, add it to contexts.tsx
      // setChecklistTemplates(prev => [...prev, template]); 
      console.log("Imported:", template);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Checklists</h1>
        {can('create', 'checklists') && (
            <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setIsLibraryModalOpen(true)}>
                    <BookOpen className="w-5 h-5 mr-2" />
                    Library
                </Button>
                <Button onClick={() => checklistTemplates.length > 0 && handleInitiateRun(checklistTemplates[0])}>
                    <Plus className="w-5 h-5 mr-2" />
                    Run Checklist
                </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card title="My Templates">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {checklistTemplates.map(template => (
                        <li key={template.id} className="py-3">
                           <div className="flex justify-between items-center">
                               <div>
                                   <p className="text-sm font-medium text-gray-900 dark:text-white">{getTranslated(template.title)}</p>
                                   <p className="text-xs text-gray-500">{template.category}</p>
                               </div>
                               <div className="space-x-2">
                                   <Button variant="ghost" size="sm" onClick={() => handleViewTemplate(template)}>View</Button>
                                   {can('create', 'checklists') && <Button variant="primary" size="sm" onClick={() => handleInitiateRun(template)}>Run</Button>}
                               </div>
                           </div>
                        </li>
                    ))}
                    {checklistTemplates.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No templates yet.</p>
                            <Button variant="ghost" size="sm" onClick={() => setIsLibraryModalOpen(true)} className="mt-2">Browse Library</Button>
                        </div>
                    )}
                </ul>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card title="Recent Checklist Runs">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executed By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {checklistRunList.map((run) => (
                        <tr key={run.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getTemplateTitle(run.template_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getUserName(run.executed_by_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">{run.status === 'completed' ? `${run.score}%` : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge color={run.status === 'completed' ? 'green' : 'blue'}>{run.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-primary-600 hover:text-primary-900">View</a>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </div>
      </div>
      
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
         <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={() => setSetupModalOpen(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Run Checklist</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Setup the details for this checklist run.</p>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Checklist Template</label>
                            <input type="text" readOnly value={getTranslated(selectedTemplate.title)} className="mt-1 w-full p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-white" />
                        </div>
                        <div>
                             <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Project</label>
                             <select id="project" value={projectForRun?.id} onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                                 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 flex justify-end space-x-2 rounded-b-lg">
                    <Button variant="secondary" onClick={() => setSetupModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleStartRun}>Start Run</Button>
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
        isOpen={isLibraryModalOpen}
        onClose={() => setIsLibraryModalOpen(false)}
        onImport={handleImportTemplate}
      />
    </div>
  );
};