import React, { useState, useEffect } from 'react';
import type { TrainingRecord, User, TrainingCourse } from '../types';
import { Button } from './ui/Button';

interface TrainingRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TrainingRecord, 'id' | 'org_id' | 'status'>) => void;
  users: User[];
  courses: TrainingCourse[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

export const TrainingRecordModal: React.FC<TrainingRecordModalProps> = ({ isOpen, onClose, onSubmit, users, courses }) => {
  const [formData, setFormData] = useState({
    user_id: users[0]?.id || '',
    course_id: courses[0]?.id || '',
    issued_at: new Date().toISOString().split('T')[0],
    expires_at: '',
    session_id: 'manual_entry',
    score: 80,
  });
  
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (courses.length > 0) {
        handleCourseChange(courses[0].id);
    }
  }, [courses]);

  const handleCourseChange = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course) {
        const issueDate = new Date(formData.issued_at);
        issueDate.setMonth(issueDate.getMonth() + course.validity_months);
        setFormData(prev => ({ 
            ...prev,
            course_id: courseId,
            expires_at: issueDate.toISOString().split('T')[0]
        }));
    }
  };

  const handleSubmit = () => {
    if (!formData.user_id || !formData.course_id || !formData.expires_at) {
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
          <h3 className="text-xl font-bold">Add Manual Training Record</h3>
          <p className="text-sm text-gray-500">For externally completed courses or historical data.</p>
        </div>
        <div className="p-6 space-y-4">
            <FormField label="Select Employee">
                <select value={formData.user_id} onChange={e => setFormData(p => ({...p, user_id: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md">
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </FormField>
            <FormField label="Select Course">
                <select value={formData.course_id} onChange={e => handleCourseChange(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                     {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Date Issued">
                    <input type="date" value={formData.issued_at} onChange={e => setFormData(p => ({...p, issued_at: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md"/>
                </FormField>
                 <FormField label="Expiration Date">
                    <input type="date" value={formData.expires_at} onChange={e => setFormData(p => ({...p, expires_at: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md"/>
                </FormField>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Record</Button>
        </div>
      </div>
    </div>
  );
};