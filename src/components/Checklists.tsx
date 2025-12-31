import React, { useState, useRef } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { useAppContext, useDataContext } from '../contexts';

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, usersList, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates, handleCreateChecklistTemplate } = useDataContext();
    
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [projectForRun, setProjectForRun] = useState(projects[0] || null);
  
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- IMPORT LOGIC ---
  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              // Basic validation
              if (!json.title || !json.items || !Array.isArray(json.items)) {
                  alert("Invalid checklist format. Must contain 'title' and 'items' array.");
                  return;
              }
              handleCreateChecklistTemplate({
                  category: json.category || 'General',
                  title: typeof json.title === 'string' ? { en: json.title } : json.title,
                  items: json.items.map((item: any, idx: number) => ({
                      id: item.id || `item_${Date.now()}_${idx}`,
                      text: typeof item.text === 'string' ? { en: item.text } : item.text,
                      description: typeof item.description === 'string' ? { en: item.description } : item.description || { en: '' }
                  }))
              });
          } catch (err) {
              console.error(err);
              alert("Failed to parse JSON file.");
          }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-white">Checklists</h1>
        {can('create', 'checklists') && (
            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                <Button variant="secondary" onClick={handleImportClick}>
                    <UploadIcon className="w-5 h-5 mr-2" />
                    Import Template
                </Button>
                <Button onClick={() => checklistTemplates.length > 0 && handleInitiateRun(checklistTemplates[0])}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Run Checklist
                </Button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card title="Checklist Templates">
                <ul className="divide-y divide-gray-200 dark:divide-dark-border">
                    {checklistTemplates.map(template => (
                        <li key={template.id} className="py-3">
                           <div className="flex justify-between items-center">
                               <div>
                                   <p className="text-sm font-medium text-gray-900 dark:text-white">{getTranslated(template.title)}</p>
                                   <p className="text-xs text-gray-500 dark:text-gray-400">{template.category}</p>
                               </div>
                               <div className="space-x-2">
                                   <Button variant="ghost" size="sm" onClick={() => handleViewTemplate(template)}>View</Button>
                                   {can('create', 'checklists') && <Button variant="primary" size="sm" onClick={() => handleInitiateRun(template)}>Run</Button>}
                               </div>
                           </div>
                        </li>
                    ))}
                    {checklistTemplates.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No templates found.</p>}
                </ul>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card title="Recent Checklist Runs">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                    <thead className="bg-gray-50 dark:bg-dark-background">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executed By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                    {checklistRunList.map((run) => (
                        <tr key={run.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getTemplateTitle(run.template_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getUserName(run.executed_by_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-semibold">{run.status === 'completed' ? `${run.score}%` : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge color={run.status === 'completed' ? 'green' : 'blue'}>{run.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="#" className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300">View</a>
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
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Run Checklist</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Setup the details for this checklist run.</p>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Checklist Template</label>
                            <input type="text" readOnly value={getTranslated(selectedTemplate.title)} className="mt-1 w-full p-2 bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-dark-border rounded-md text-gray-900 dark:text-white" />
                        </div>
                        <div>
                             <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Project</label>
                             <select id="project" value={projectForRun?.id} onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-dark-border focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white">
                                 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 rounded-b-lg">
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
    </div>
  );
};

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
);