import React, { useState } from 'react';
import type { TrainingCourse } from '../types';
import { Button } from './ui/Button';
import { generateCourseContent } from '../services/geminiService';
import { Sparkles } from 'lucide-react';

interface TrainingCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: TrainingCourse[];
  onUpdateCourse: (course: TrainingCourse) => void;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        {children}
    </div>
);

export const TrainingCourseModal: React.FC<TrainingCourseModalProps> = ({ isOpen, onClose, onUpdateCourse }) => {
  const [newCourse, setNewCourse] = useState<Omit<TrainingCourse, 'id' | 'org_id'>>({
    title: '',
    category: '',
    validity_months: 24,
    syllabus: '',
    learning_objectives: [],
    requires_assessment: true,
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAiGenerate = async () => {
    if (!newCourse.title) {
        setError("Please provide a Course Title for the AI context.");
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
        console.error(e);
        setError("Failed to generate content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleAddCourse = () => {
    if (!newCourse.title) {
        setError("Course Title is required.");
        return;
    }
    const course: TrainingCourse = {
        ...newCourse,
        id: `tc_${Date.now()}`,
        org_id: 'org_1'
    };
    onUpdateCourse(course);
    onClose();
    // Reset form
    setNewCourse({
        title: '',
        category: '',
        validity_months: 24,
        syllabus: '',
        learning_objectives: [],
        requires_assessment: true,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Manage Training Courses</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                     <FormField label="Course Title">
                        <input type="text" placeholder="e.g. Working at Height" value={newCourse.title} onChange={e => setNewCourse(p => ({...p, title: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700 dark:text-white"/>
                     </FormField>
                     
                     <div className="grid grid-cols-2 gap-4">
                        <FormField label="Category">
                            <input type="text" placeholder="High Risk" value={newCourse.category} onChange={e => setNewCourse(p => ({...p, category: e.target.value}))} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700 dark:text-white"/>
                        </FormField>
                        <FormField label="Validity (months)">
                            <input type="number" value={newCourse.validity_months} onChange={e => setNewCourse(p => ({...p, validity_months: parseInt(e.target.value)}))} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700 dark:text-white"/>
                        </FormField>
                     </div>

                     {/* AI Button */}
                     <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-purple-900 dark:text-purple-300">AI Syllabus Creator</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Generates modules & objectives.</p>
                            </div>
                            <Button onClick={handleAiGenerate} disabled={isGenerating}>
                                {isGenerating ? 'Creating...' : <><Sparkles className="w-4 h-4 mr-2"/>Draft with AI</>}
                            </Button>
                        </div>
                    </div>

                    <FormField label="Learning Objectives">
                        {newCourse.learning_objectives.length > 0 ? (
                            <ul className="list-disc pl-5 text-sm space-y-1 text-gray-700 dark:text-gray-300">
                                {newCourse.learning_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No objectives yet. Use AI to generate.</p>
                        )}
                    </FormField>
                    
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <div className="h-full flex flex-col">
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Syllabus (Markdown)</label>
                    <textarea 
                        value={newCourse.syllabus} 
                        onChange={e => setNewCourse(p => ({...p, syllabus: e.target.value}))} 
                        className="w-full flex-grow p-4 border rounded-lg font-mono text-sm dark:bg-slate-800 dark:border-gray-700 dark:text-gray-300"
                        placeholder="# Module 1..."
                    />
                </div>
            </div>
        </div>

        <div className="bg-gray-50 dark:bg-slate-800 px-6 py-4 flex justify-end gap-3 rounded-b-xl border-t dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={handleAddCourse}>Add New Course</Button>
        </div>
      </div>
    </div>
  );
};