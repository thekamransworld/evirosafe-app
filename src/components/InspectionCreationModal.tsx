
import React, { useState } from 'react';
import type { Inspection, Project, User, ChecklistTemplate } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

interface InspectionCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Inspection, 'id' | 'org_id' | 'findings' | 'status' | 'audit_trail'>) => void;
  projects: Project[];
  users: User[];
  checklistTemplates: ChecklistTemplate[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

export const InspectionCreationModal: React.FC<InspectionCreationModalProps> = (props) => {
  const { isOpen, onClose, onSubmit, projects, users, checklistTemplates } = props;
  const { language, activeOrg } = useAppContext();
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'Safety' as Inspection['type'],
    project_id: projects[0]?.id || '',
    person_responsible_id: users.find(u => u.role === 'INSPECTOR' || u.role === 'SUPERVISOR')?.id || '',
    checklist_template_id: checklistTemplates[0]?.id || '',
    schedule_at: new Date().toISOString().slice(0, 16),
    team_member_ids: [] as string[],
    observers: [] as string[],
  });
  
  const [error, setError] = useState('');

  const getTranslated = (textRecord: Record<string, string>) => {
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  }

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.project_id || !formData.person_responsible_id || !formData.checklist_template_id) {
        setError('Please fill out all required fields.');
        return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Inspection</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Plan and schedule a new inspection.</p>
          <div className="mt-6 space-y-4">
            <FormField label="Inspection Title">
              <input type="text" value={formData.title} onChange={e => handleChange('title', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md" placeholder="e.g., Weekly Site Safety Walkdown"/>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Inspection Type">
                    <select value={formData.type} onChange={e => handleChange('type', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md">
                        <option>Safety</option>
                        <option>Quality</option>
                        <option>Environmental</option>
                        <option>Fire</option>
                        <option>Equipment</option>
                    </select>
                </FormField>
                <FormField label="Project">
                    <select value={formData.project_id} onChange={e => handleChange('project_id', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </FormField>
            </div>
             <FormField label="Person Responsible">
                <select value={formData.person_responsible_id} onChange={e => handleChange('person_responsible_id', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md">
                    {users.filter(u => ['INSPECTOR', 'SUPERVISOR', 'HSE_MANAGER', 'ADMIN'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </FormField>
            <FormField label="Team Members">
                {/* FIX: Explicitly type the 'option' parameter in the 'Array.from' callback as 'HTMLOptionElement' to resolve the TypeScript error 'Property 'value' does not exist on type 'unknown''. */}
                <select multiple value={formData.team_member_ids} onChange={e => handleChange('team_member_ids', Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md h-24">
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </FormField>
             <FormField label="Checklist Template">
                <select value={formData.checklist_template_id} onChange={e => handleChange('checklist_template_id', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md">
                    {checklistTemplates.map(t => <option key={t.id} value={t.id}>{getTranslated(t.title)}</option>)}
                </select>
            </FormField>
            <FormField label="Scheduled Start">
                <input type="datetime-local" value={formData.schedule_at} onChange={e => handleChange('schedule_at', e.target.value)} className="w-full p-2 border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-background text-gray-900 dark:text-white rounded-md"/>
            </FormField>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Inspection</Button>
        </div>
      </div>
    </div>
  );
};
