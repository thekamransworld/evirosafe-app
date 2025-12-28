import React, { useState } from 'react';
import type { Project, PlanType } from '../types';
import { Button } from './ui/Button';
import { planTypes } from '../config';

interface PlanCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; type: PlanType; project_id: string }) => void;
  projects: Project[];
}

export const PlanCreationModal: React.FC<PlanCreationModalProps> = ({ isOpen, onClose, onSubmit, projects }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'HSEMP' as PlanType,
    project_id: projects[0]?.id || '',
  });

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.project_id) return;
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-white mb-4">Create New Plan</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Plan Title</label>
            <input type="text" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full mt-1 p-2 bg-slate-800 border border-slate-600 rounded text-white" placeholder="e.g., Site HSE Plan"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-400">Type</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value as PlanType}))} className="w-full mt-1 p-2 bg-slate-800 border border-slate-600 rounded text-white">
                      {planTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-400">Project</label>
                  <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full mt-1 p-2 bg-slate-800 border border-slate-600 rounded text-white">
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Plan</Button>
        </div>
      </div>
    </div>
  );
};