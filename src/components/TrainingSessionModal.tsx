import React, { useState } from 'react';
import type { TrainingSession, TrainingCourse, Project, User } from '../types';
import { Button } from './ui/Button';

interface TrainingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TrainingSession, 'id' | 'status' | 'roster' | 'attendance'>) => void;
  course: TrainingCourse;
  projects: Project[];
  users: User[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

export const TrainingSessionModal: React.FC<TrainingSessionModalProps> = ({ isOpen, onClose, onSubmit, course, projects, users }) => {
  const [formData, setFormData] = useState({
    course_id: course.id,
    project_id: projects[0]?.id || '',
    scheduled_at: new Date().toISOString().slice(0, 16),
    trainer_id: users.find(u => u.role === 'SUPERVISOR' || u.role === 'HSE_MANAGER')?.id || '',
  });
  
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!formData.project_id || !formData.trainer_id) {
        setError('Please fill out all fields.');
        return;
    }
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Schedule New Session</h3>
          <p className="text-sm text-gray-600 mt-1">Course: {course.title}</p>
        </div>
        <div className="p-6 space-y-4">
            <FormField label="Project">
                <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md">
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Scheduled Date & Time">
                    <input type="datetime-local" value={formData.scheduled_at} onChange={e => setFormData(p => ({...p, scheduled_at: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md"/>
                </FormField>
                <FormField label="Trainer">
                    <select value={formData.trainer_id} onChange={e => setFormData(p => ({...p, trainer_id: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md">
                        {users.filter(u => ['SUPERVISOR', 'HSE_MANAGER', 'ADMIN'].includes(u.role)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </FormField>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Schedule Session</Button>
        </div>
      </div>
    </div>
  );
};