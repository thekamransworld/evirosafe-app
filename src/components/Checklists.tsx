import React, { useState } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { ChecklistLibraryModal } from './ChecklistLibraryModal';
import { useAppContext, useDataContext } from '../contexts';

// ICONS
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const LibraryIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>;

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, usersList, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates, setChecklistTemplates } = useDataContext();
    
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

  const handleImportChecklists = (newTemplates: ChecklistTemplate[]) => {
      setChecklistTemplates(prev => [...prev, ...newTemplates]);
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
    <div>
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 mb-8 shadow-xl">
          <div className="relative z-10 flex justify-between items-end">
              <div>
                  <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <span className="text-emerald-400"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                      Checklists & Audits
                  </h1>
                  <p className="text-slate-300 max-w-xl">Standardize inspections with digital checklists. Import industry standards or create custom templates.</p>
                  
                  <div className="flex gap-3 mt-6">
                      <Button variant="secondary" onClick={() => setIsLibraryOpen(true)} leftIcon={<LibraryIcon className="w-5 h-5"/>}>
                          Browse Library
                      </Button>
                      <Button className="bg-emerald-600 hover:bg-emerald-500 text-white border-none" leftIcon={<PlusIcon className="w-5 h-5"/>}>
                          Create Custom
                      </Button>
                  </div>
              </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card title={`Your Templates (${checklistTemplates.length})`} className="h-full">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {checklistTemplates.map(template => (
                        <li key={template.id} className="py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors -mx-6 px-6 cursor-pointer" onClick={() => handleViewTemplate(template)}>
                           <div className="flex justify-between items-center">
                               <div>
                                   <p className="font-semibold text-gray-900 dark:text-white">{getTranslated(template.title)}</p>
                                   <div className="flex gap-2 mt-1">
                                        <Badge color="gray" size="sm">{template.category}</Badge>
                                        <span className="text-xs text-gray-500 py-0.5">{template.items.length} items</span>
                                   </div>
                               </div>
                               <div>
                                   {can('create', 'checklists') && (
                                       <button 
                                            onClick={(e) => { e.stopPropagation(); handleInitiateRun(template); }}
                                            className="p-2 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            title="Start Inspection"
                                       >
                                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                       </button>
                                   )}
                               </div>
                           </div>
                        </li>
                    ))}
                    {checklistTemplates.length === 0 && (
                        <div className="py-8 text-center text-gray-500">
                            <p>No templates yet.</p>
                            <button onClick={() => setIsLibraryOpen(true)} className="text-emerald-600 font-semibold hover:underline mt-2">Import from Library</button>
                        </div>
                    )}
                </ul>
            </Card>
        </div>
        
        <div className="lg:col-span-2">
            <Card title="Recent Checklist Runs" className="h-full">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checklist</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Executed By</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-800">
                    {checklistRunList.map((run) => (
                        <tr key={run.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{getTemplateTitle(run.template_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{getUserName(run.executed_by_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 dark:text-gray-300">{run.status === 'completed' ? `${run.score}%` : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge color={run.status === 'completed' ? 'green' : 'blue'}>{run.status.replace('_', ' ')}</Badge>
                        </td>
                        </tr>
                    ))}
                    {checklistRunList.length === 0 && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">No inspections conducted yet.</td></tr>
                    )}
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Start Inspection</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Template</label>
                        <div className="mt-1 p-3 bg-gray-100 dark:bg-white/10 rounded-lg text-sm text-gray-800 dark:text-white font-medium">
                            {getTranslated(selectedTemplate.title)}
                        </div>
                    </div>
                    <div>
                         <label htmlFor="project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Project</label>
                         <select 
                            id="project" 
                            value={projectForRun?.id} 
                            onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} 
                            className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        >
                             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setSetupModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleStartRun}>Start</Button>
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
        onImport={handleImportChecklists}
      />
    </div>
  );
};