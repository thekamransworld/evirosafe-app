import React, { useState } from 'react';
import type { TbtSession, Project, User } from '../types';
import { Button } from './ui/Button';
import { generateTbtContent } from '../services/geminiService';
import { tbtTopicsLibrary } from '../config';
import { FormField } from './ui/FormField';

interface TbtCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TbtSession, 'id' | 'org_id' | 'attendees' | 'attachments' | 'audit_log'>) => void;
  projects: Project[];
  activeUser: User;
}

// Icons
const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 00-2.456 2.456z" /></svg>;
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

export const TbtCreationModal: React.FC<TbtCreationModalProps> = ({ isOpen, onClose, onSubmit, projects, activeUser }) => {
  const [formData, setFormData] = useState<Omit<TbtSession, 'id' | 'org_id' | 'attendees' | 'attachments' | 'audit_log'>>({
    project_id: projects[0]?.id || '',
    title: '',
    topic_category: Object.keys(tbtTopicsLibrary)[0],
    method: 'daily',
    location: '',
    conducted_by: { name: activeUser.name, role: activeUser.role, signature: '' },
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    summary: '',
    hazards_discussed: [],
    controls_discussed: [],
    discussion_points: [],
    linked_rams_ids: [],
    linked_ptw_types: [],
    linked_plan_ids: [],
    status: 'draft',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleAiGenerate = async () => {
    if (!formData.title) {
        setError("Please enter a title for the TBT first to provide context for the AI.");
        return;
    }
    setError('');
    setIsGenerating(true);
    try {
        const content = await generateTbtContent(formData.title);
        setFormData(prev => ({
            ...prev,
            summary: content.summary,
            hazards_discussed: content.hazards,
            controls_discussed: content.controls,
            discussion_points: content.questions,
        }));
    } catch (e) {
        setError("Failed to generate AI content. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleSubmit = () => {
      if (!formData.title || !formData.location) {
          setError("Title and Location are required.");
          return;
      }
      onSubmit(formData);
      onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-center bg-white dark:bg-dark-card sticky top-0 z-10">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Toolbox Talk Session</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Core Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Topic Category">
                <select 
                    value={formData.topic_category} 
                    onChange={e => setFormData(p => ({...p, topic_category: e.target.value, title: ''}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                >
                    {Object.keys(tbtTopicsLibrary).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </FormField>
             <FormField label="Talk Title">
                <select 
                    value={formData.title} 
                    onChange={e => setFormData(p => ({...p, title: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                >
                    <option value="">Select a title or type below</option>
                    {(tbtTopicsLibrary[formData.topic_category as keyof typeof tbtTopicsLibrary] || []).map(topic => <option key={topic} value={topic}>{topic}</option>)}
                </select>
            </FormField>
          </div>

          <FormField label="Or Enter Custom Title" fullWidth>
            <input 
                type="text" 
                value={formData.title} 
                onChange={e => setFormData(p => ({...p, title: e.target.value}))} 
                className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                placeholder="e.g. Working at Height Safety"
            />
          </FormField>
          
           {/* AI Generator */}
           <div className="p-4 border border-dashed border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/10 rounded-lg">
               <div className="flex justify-between items-center">
                   <div>
                       <h4 className="font-semibold text-primary-900 dark:text-primary-100">AI Content Generator</h4>
                       <p className="text-xs text-primary-700 dark:text-primary-300">Auto-fill summary, hazards, and controls based on the title.</p>
                   </div>
                    <Button onClick={handleAiGenerate} disabled={isGenerating || !formData.title} className="bg-primary-600 text-white">
                        {isGenerating ? 'Generating...' : <><SparklesIcon className="w-4 h-4 mr-2" /> Generate Content</>}
                    </Button>
               </div>
           </div>
          
           {/* Logistics */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Project">
                <select 
                    value={formData.project_id} 
                    onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                >
                    {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                </select>
            </FormField>
             <FormField label="Location">
                <input 
                    type="text" 
                    value={formData.location} 
                    onChange={e => setFormData(p => ({...p, location: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                    placeholder="e.g. Site C, Assembly Area"
                />
            </FormField>
            <FormField label="Date">
                <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData(p => ({...p, date: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                />
            </FormField>
            <FormField label="Time">
                <input 
                    type="time" 
                    value={formData.time} 
                    onChange={e => setFormData(p => ({...p, time: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white"
                />
            </FormField>
           </div>
           
            {/* Content Fields */}
            <FormField label="Summary" fullWidth>
                <textarea 
                    rows={3} 
                    value={formData.summary} 
                    onChange={e => setFormData(p => ({...p, summary: e.target.value}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                />
            </FormField>
            <FormField label="Hazards Discussed" fullWidth>
                <textarea 
                    rows={3} 
                    value={formData.hazards_discussed?.join('\n') || ''} 
                    onChange={e => setFormData(p => ({...p, hazards_discussed: e.target.value.split('\n')}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                    placeholder="One hazard per line"
                />
            </FormField>
            <FormField label="Controls Discussed" fullWidth>
                <textarea 
                    rows={3} 
                    value={formData.controls_discussed?.join('\n') || ''} 
                    onChange={e => setFormData(p => ({...p, controls_discussed: e.target.value.split('\n')}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                    placeholder="One control per line"
                />
            </FormField>
            <FormField label="Questions for Workers" fullWidth>
                <textarea 
                    rows={3} 
                    value={formData.discussion_points?.join('\n') || ''} 
                    onChange={e => setFormData(p => ({...p, discussion_points: e.target.value.split('\n')}))} 
                    className="w-full p-2 border border-gray-300 dark:border-dark-border rounded-md bg-white dark:bg-dark-background text-gray-900 dark:text-white" 
                    placeholder="One question per line"
                />
            </FormField>

            {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm font-semibold">
                    {error}
                </div>
            )}
        </div>

        <div className="bg-gray-50 dark:bg-black/20 px-6 py-4 flex justify-end space-x-2 border-t dark:border-dark-border sticky bottom-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create TBT</Button>
        </div>
      </div>
    </div>
  );
};