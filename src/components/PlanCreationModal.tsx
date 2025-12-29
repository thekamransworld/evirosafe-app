import React, { useState } from 'react';
import type { Project, PlanType, PlanContentSection } from '../types';
import { Button } from './ui/Button';
import { planTypes, planTemplates } from '../config';

interface PlanCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; type: PlanType; project_id: string; sections: PlanContentSection[] }) => void;
  projects: Project[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

export const PlanCreationModal: React.FC<PlanCreationModalProps> = ({ isOpen, onClose, onSubmit, projects }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'HSEMP' as PlanType,
    project_id: projects[0]?.id || '',
  });
  
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.project_id) {
        setError('Please fill out all fields.');
        return;
    }

    // Get the specific sections for this plan type from config
    const templateSections = planTemplates[formData.type] || [];

    onSubmit({
        ...formData,
        sections: templateSections
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-dark-border">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Plan</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Start a new HSE plan from a template.</p>
        </div>
        <div className="p-6 space-y-4">
          <FormField label="Plan Title">
            <input 
                type="text" 
                value={formData.title} 
                onChange={e => handleChange('title', e.target.value)} 
                className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                placeholder="e.g., Lifting Plan for Section B"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
              <FormField label="Plan Type">
                  <select 
                    value={formData.type} 
                    onChange={e => handleChange('type', e.target.value)} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                  >
                      {planTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
              </FormField>
              <FormField label="Project">
                  <select 
                    value={formData.project_id} 
                    onChange={e => handleChange('project_id', e.target.value)} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                  >
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </FormField>
          </div>
          
          <div className="mt-2 p-3 bg-gray-50 dark:bg-white/5 rounded border dark:border-dark-border">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sections included in this template:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-300 list-disc list-inside">
                  {(planTemplates[formData.type] || []).length > 0 ? (
                      (planTemplates[formData.type] || []).map((s, i) => (
                          <li key={i}>{s.title}</li>
                      ))
                  ) : (
                      <li className="italic text-gray-400">No default sections defined (Blank Plan)</li>
                  )}
              </ul>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="bg-gray-50 dark:bg-dark-background px-6 py-3 flex justify-end space-x-2 border-t dark:border-dark-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Plan</Button>
        </div>
      </div>
    </div>
  );
};