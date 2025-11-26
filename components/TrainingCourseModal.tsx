import React, { useState } from 'react';
import type { TrainingCourse } from '../types';
import { Button } from './ui/Button';
import { generateCourseContent } from '../services/geminiService';

interface TrainingCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: TrainingCourse[];
  onUpdateCourse: (course: TrainingCourse) => void;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
    </div>
);

const initialNewCourseState = {
  id: '',
  org_id: 'org_1',
  title: '',
  category: '',
  validity_months: 24,
  syllabus: '',
  learning_objectives: [],
  requires_assessment: false,
};

export const TrainingCourseModal: React.FC<TrainingCourseModalProps> = ({ isOpen, onClose, courses, onUpdateCourse }) => {
  const [newCourse, setNewCourse] = useState<Omit<TrainingCourse, 'id' | 'org_id'>>(initialNewCourseState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAiGenerate = async () => {
    if (!newCourse.title) {
        setError("Please enter a title for the course first to provide context for the AI.");
        return;
    }
    setError('');
    setIsGenerating(true);
    try {
        const content = await generateCourseContent(newCourse.title);
        setNewCourse(prev => ({
            ...prev,
            syllabus: content.syllabus,
            learning_objectives: content.learning_objectives,
        }));
    } catch (e) {
        setError("Failed to generate AI content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAddCourse = () => {
    if (!newCourse.title || !newCourse.category) {
        setError('Title and Category are required.');
        return;
    };
    const newCourseData: TrainingCourse = {
        ...newCourse,
        id: `tc_${Date.now()}`,
        org_id: courses[0]?.org_id || 'org_1',
    };
    onUpdateCourse(newCourseData);
    setNewCourse(initialNewCourseState);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Manage Training Courses</h3>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-1 space-y-4">
                     <FormField label="Course Title"><input type="text" placeholder="e.g. Working at Height" value={newCourse.title} onChange={e => setNewCourse(p => ({...p, title: e.target.value}))} className="w-full p-2 border rounded"/></FormField>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField label="Category"><input type="text" placeholder="High Risk" value={newCourse.category} onChange={e => setNewCourse(p => ({...p, category: e.target.value}))} className="w-full p-2 border rounded"/></FormField>
                        <FormField label="Validity (months)"><input type="number" value={newCourse.validity_months} onChange={e => setNewCourse(p => ({...p, validity_months: parseInt(e.target.value, 10)}))} className="w-full p-2 border rounded"/></FormField>
                     </div>
                     <div className="p-4 border-t border-dashed mt-4">
                        <div className="flex justify-between items-center">
                            <div><h4 className="font-semibold">AI Content Generator</h4><p className="text-xs text-gray-500">Auto-fill syllabus based on the title.</p></div>
                            <Button onClick={handleAiGenerate} disabled={isGenerating || !newCourse.title}>{isGenerating ? 'Generating...' : '✨ Draft with AI'}</Button>
                        </div>
                    </div>
                    <FormField label="Learning Objectives (one per line)"><textarea rows={4} value={newCourse.learning_objectives.join('\n')} onChange={e => setNewCourse(p => ({...p, learning_objectives: e.target.value.split('\n')}))} className="w-full p-2 border rounded" /></FormField>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button onClick={handleAddCourse}>Add New Course</Button>
                </div>
                 <div className="md:col-span-1">
                    <FormField label="Syllabus (Markdown)">
                        <textarea rows={16} value={newCourse.syllabus} onChange={e => setNewCourse(p => ({...p, syllabus: e.target.value}))} className="w-full p-2 border rounded bg-gray-50 font-mono text-xs" />
                    </FormField>
                 </div>
            </div>
             <div className="border-t mt-6 pt-4">
                 <h4 className="font-semibold mb-2">Existing Courses</h4>
                 <div className="space-y-2 max-h-48 overflow-y-auto">
                    {courses.map(course => (
                        <div key={course.id} className="p-2 border rounded-md flex justify-between items-center bg-gray-50">
                            <p className="font-semibold text-sm">{course.title}</p>
                            <p className="text-xs text-gray-500">{course.category}</p>
                        </div>
                    ))}
                 </div>
             </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};