import React, { useEffect, useState } from 'react';
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

// Roles offered in the Trainer dropdown. The default selection below MUST come
// from this same list (see buildInitial).
const TRAINER_ROLES = ['SUPERVISOR', 'HSE_MANAGER', 'ORG_ADMIN', 'ADMIN'];

// <input type="datetime-local"> expects LOCAL time, but toISOString() is UTC, so
// the old default was off by the user's UTC offset (3 hours in Riyadh).
const nowForDateTimeInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const FIELD_CLASS =
  'w-full p-2 border border-gray-300 rounded-md dark:bg-slate-800 dark:border-gray-700 dark:text-white';

export const TrainingSessionModal: React.FC<TrainingSessionModalProps> = ({ isOpen, onClose, onSubmit, course, projects, users }) => {
  const buildInitial = () => {
    const trainers = users.filter(u => TRAINER_ROLES.includes(u.role));
    // Prefer a supervisor / HSE manager, but fall back to whoever the dropdown
    // actually lists. Before, the fallback was '' even though the <select> was
    // *displaying* the only option (an admin): the form looked complete yet
    // failed validation, and with a single option there was nothing to
    // re-select to fix it.
    const defaultTrainer = trainers.find(u => u.role === 'SUPERVISOR' || u.role === 'HSE_MANAGER') ?? trainers[0];
    return {
      course_id: course.id,
      project_id: projects[0]?.id || '',
      scheduled_at: nowForDateTimeInput(),
      trainer_id: defaultTrainer?.id || '',
    };
  };

  const [formData, setFormData] = useState(buildInitial);
  const [error, setError] = useState('');

  // This component stays mounted while closed, so its state outlives each
  // opening. Without a reset, opening it for a different course kept the
  // previous course's id (the header showed the new title, but the session was
  // saved against the old course).
  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitial());
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, course.id]);

  const handleSubmit = () => {
    if (!formData.project_id) {
      setError(projects.length === 0 ? 'Create a project first, then schedule the session.' : 'Select a project.');
      return;
    }
    if (!formData.trainer_id) {
      setError('No eligible trainer found. Add a supervisor or HSE manager.');
      return;
    }
    if (!formData.scheduled_at) {
      setError('Pick a date and time.');
      return;
    }
    // Always the course named in the header, whatever the form state holds.
    onSubmit({ ...formData, course_id: course.id });
    // Close right away; otherwise the dialog stays open after scheduling and a
    // second click schedules a duplicate session.
    onClose();
  };

  if (!isOpen) return null;

  const trainers = users.filter(u => TRAINER_ROLES.includes(u.role));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Schedule New Session</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Course: {course.title}</p>
        </div>
        <div className="p-6 space-y-4">
            <FormField label="Project">
                <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className={FIELD_CLASS}>
                    {projects.length === 0 && <option value="">No projects yet</option>}
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Scheduled Date & Time">
                    <input type="datetime-local" value={formData.scheduled_at} onChange={e => setFormData(p => ({...p, scheduled_at: e.target.value}))} className={FIELD_CLASS}/>
                </FormField>
                <FormField label="Trainer">
                    <select value={formData.trainer_id} onChange={e => setFormData(p => ({...p, trainer_id: e.target.value}))} className={FIELD_CLASS}>
                        {trainers.length === 0 && <option value="">No eligible trainer</option>}
                        {trainers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </FormField>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-b-lg px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Schedule Session</Button>
        </div>
      </div>
    </div>
  );
};
