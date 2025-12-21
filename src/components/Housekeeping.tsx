import React, { useState, useMemo } from 'react';
import type { ChecklistTemplate, ChecklistRun } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { useAppContext, useDataContext } from '../contexts';
import { ChecklistRunModal } from './ChecklistRunModal';
import { ChecklistDetailModal } from './ChecklistDetailModal';
import { ChecklistLibraryModal } from './ChecklistLibraryModal';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';

const StatCard: React.FC<{ title: string; value: string | number; change?: string }> = ({ title, value, change }) => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-2xl shadow-lg p-4">
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{title}</p>
        <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{value}</p>
        {change && <p className="text-xs text-green-500 mt-1">{change}</p>}
    </div>
);

export const Housekeeping: React.FC = () => {
    const { activeOrg, activeUser, usersList, language } = useAppContext();
    const { checklistRunList, setChecklistRunList, projects, checklistTemplates, setChecklistTemplates } = useDataContext();

    const [isRunModalOpen, setRunModalOpen] = useState(false);
    const [isDetailModalOpen, setDetailModalOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null);

    // Filter templates for Housekeeping category
    const housekeepingTemplates = useMemo(() => {
        return checklistTemplates.filter(t => t.category === 'Housekeeping' || t.category === 'Welfare');
    }, [checklistTemplates]);

    const housekeepingRuns = useMemo(() => {
        const templateIds = housekeepingTemplates.map(t => t.id);
        return checklistRunList.filter(run => templateIds.includes(run.template_id));
    }, [checklistRunList, housekeepingTemplates]);
    
    const getTranslated = (textRecord: Record<string, string> | string) => {
      if (typeof textRecord === 'string') return textRecord;
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
    };

    const handleRunChecklist = (template: ChecklistTemplate) => {
        setSelectedTemplate(template);
        setRunModalOpen(true);
    };

    const handleViewChecklist = (template: ChecklistTemplate) => {
        setSelectedTemplate(template);
        setDetailModalOpen(true);
    }
    
    const handleSubmitRun = (data: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'>) => {
        const newRun: ChecklistRun = {
            ...data,
            id: `cr_${Date.now()}`,
            org_id: activeOrg.id,
            executed_by_id: activeUser.id,
            executed_at: new Date().toISOString(),
        };
        setChecklistRunList(prev => [newRun, ...prev]);
        setRunModalOpen(false);
        setSelectedTemplate(null);
    };

    const handleImportChecklists = (newTemplates: ChecklistTemplate[]) => {
        setChecklistTemplates(prev => [...prev, ...newTemplates]);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Site Housekeeping & Welfare</h1>
                    <p className="text-text-secondary dark:text-dark-text-secondary">Manage cleanliness, waste, and welfare facilities across the project.</p>
                </div>
                <Button onClick={() => setIsLibraryOpen(true)}>
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Import Templates
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Overall Score" value="92%" change="+1.5% this week" />
                <StatCard title="Daily Compliance" value="98%" />
                <StatCard title="Open Findings" value="3" />
                <StatCard title="Inspections Today" value={housekeepingRuns.filter(r => new Date(r.executed_at).toDateString() === new Date().toDateString()).length} />
            </div>

            <Card title="Housekeeping Checklists">
                {housekeepingTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {housekeepingTemplates.map(template => (
                            <div key={template.id} className="p-4 bg-gray-50 dark:bg-dark-background rounded-lg border dark:border-dark-border flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-text-primary dark:text-dark-text-primary">{getTranslated(template.title)}</h4>
                                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{template.items.length} items</p>
                                </div>
                                <div className="space-x-2">
                                    <Button size="sm" variant="secondary" onClick={() => handleViewChecklist(template)}>View</Button>
                                    <Button size="sm" onClick={() => handleRunChecklist(template)}>Run</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400 mb-4">No housekeeping templates found.</p>
                        <Button variant="outline" onClick={() => setIsLibraryOpen(true)}>Import from Library</Button>
                    </div>
                )}
            </Card>

            <Card title="Recent Activity">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                        <thead className="bg-gray-50 dark:bg-dark-background">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Executor</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                            {housekeepingRuns.slice(0, 5).map(run => {
                                const template = housekeepingTemplates.find(t => t.id === run.template_id);
                                const user = usersList.find(u => u.id === run.executed_by_id);
                                return (
                                <tr key={run.id}>
                                    <td className="px-4 py-3 font-medium">{template ? getTranslated(template.title) : 'Unknown'}</td>
                                    <td className="px-4 py-3 text-sm">{user?.name || 'Unknown'}</td>
                                    <td className="px-4 py-3"><Badge color={run.score && run.score >= 85 ? 'green' : 'yellow'}>{run.score}%</Badge></td>
                                    <td className="px-4 py-3 text-sm">{new Date(run.executed_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">View</Button></td>
                                </tr>
                                )
                            })}
                            {housekeepingRuns.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-sm text-gray-500">No housekeeping inspections have been recorded yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isRunModalOpen && selectedTemplate && projects[0] && (
                <ChecklistRunModal
                    template={selectedTemplate}
                    project={projects.find(p => p.org_id === activeOrg.id) || projects[0]}
                    user={activeUser}
                    onClose={() => setRunModalOpen(false)}
                    onSubmit={handleSubmitRun}
                />
            )}
            
            {isDetailModalOpen && selectedTemplate && projects[0] && (
                 <ChecklistDetailModal
                    template={selectedTemplate}
                    organization={activeOrg}
                    project={projects.find(p => p.org_id === activeOrg.id) || projects[0]}
                    user={activeUser}
                    onClose={() => setDetailModalOpen(false)}
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

const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);