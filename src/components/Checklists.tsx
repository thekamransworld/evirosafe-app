import React, { useState, useMemo } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistRunModal } from './ChecklistRunModal';
import { useAppContext, useDataContext } from '../contexts';

export const Checklists: React.FC = () => {
  const { activeOrg, activeUser, language, can } = useAppContext();
  const { checklistRunList, setChecklistRunList, projects, checklistTemplates } = useDataContext();
    
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);
  const [projectForRun, setProjectForRun] = useState(projects[0] || null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isSetupModalOpen, setSetupModalOpen] = useState(false);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getTranslated = (textRecord: any) => {
      if (typeof textRecord === 'string') return textRecord;
      return textRecord[language] || textRecord['en'] || '';
  }

  const filteredTemplates = useMemo(() => {
      return checklistTemplates.filter(t => 
          getTranslated(t.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [checklistTemplates, searchQuery]);

  const handleInitiateRun = (template: ChecklistTemplate) => {
    setSelectedTemplate(template);
    if (projects.length > 0) setProjectForRun(projects[0]);
    setSetupModalOpen(true);
  };

  const handleStartRun = () => {
    setSetupModalOpen(false);
    setRunModalOpen(true);
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
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Checklists</h1>
        <div className="flex gap-2">
            <input 
                type="text" 
                placeholder="Search templates..." 
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card title={`Templates (${filteredTemplates.length})`} className="max-h-[80vh] overflow-y-auto">
                <ul className="divide-y divide-gray-700">
                    {filteredTemplates.map(template => (
                        <li key={template.id} className="py-3">
                           <div className="flex justify-between items-center">
                               <div className="flex-1 mr-2">
                                   <p className="text-sm font-medium text-white truncate">{getTranslated(template.title)}</p>
                                   <p className="text-xs text-gray-400">{template.category}</p>
                               </div>
                               <div className="space-x-2 flex-shrink-0">
                                   <Button variant="ghost" size="sm" onClick={() => { setSelectedTemplate(template); setDetailModalOpen(true); }}>View</Button>
                                   <Button variant="primary" size="sm" onClick={() => handleInitiateRun(template)}>Run</Button>
                               </div>
                           </div>
                        </li>
                    ))}
                </ul>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card title="Recent Checklist Runs">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-slate-800">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Checklist</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                    {checklistRunList.map((run) => (
                        <tr key={run.id}>
                        <td className="px-6 py-4 text-sm text-white">{run.template_id}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">{run.score}%</td>
                        <td className="px-6 py-4"><Badge color="green">{run.status}</Badge></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </div>
      </div>
      
      {isDetailModalOpen && selectedTemplate && (
        <ChecklistDetailModal template={selectedTemplate} onClose={() => setDetailModalOpen(false)} organization={activeOrg} project={projects[0]} user={activeUser} />
      )}

      {isSetupModalOpen && selectedTemplate && (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={() => setSetupModalOpen(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-white">Run Checklist</h3>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Project</label>
                        <select value={projectForRun?.id} onChange={e => setProjectForRun(projects.find(p => p.id === e.target.value) || null)} className="mt-1 w-full p-2 bg-slate-800 border border-slate-600 rounded text-white">
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={() => setSetupModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleStartRun}>Start</Button>
                </div>
            </div>
         </div>
      )}
      
      {isRunModalOpen && selectedTemplate && projectForRun && (
        <ChecklistRunModal template={selectedTemplate} project={projectForRun} user={activeUser} onClose={() => setRunModalOpen(false)} onSubmit={handleSubmitRun} />
      )}
    </div>
  );
};