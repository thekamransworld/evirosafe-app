



import React, { useState } from 'react';
import type { TbtSession, Project, User, PtwType } from '../types';
import { Button } from './ui/Button';
import { generateTbtContent } from '../services/geminiService';
import { tbtTopicsLibrary } from '../config';

interface TbtCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TbtSession, 'id' | 'org_id' | 'attendees' | 'attachments' | 'audit_log'>) => void;
  projects: Project[];
  activeUser: User;
}

const FormField: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean }> = ({ label, children, fullWidth = false }) => (
  <div className={fullWidth ? 'md:col-span-2' : ''}>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

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
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">New Toolbox Talk Session</h3>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Topic Category">
                <select value={formData.topic_category} onChange={e => setFormData(p => ({...p, topic_category: e.target.value, title: ''}))} className="w-full p-2 border rounded-md">
                    {Object.keys(tbtTopicsLibrary).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </FormField>
             <FormField label="Talk Title">
                <select value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full p-2 border rounded-md">
                    <option value="">Select a title or type below</option>
                    {(tbtTopicsLibrary[formData.topic_category as keyof typeof tbtTopicsLibrary] || []).map(topic => <option key={topic} value={topic}>{topic}</option>)}
                </select>
            </FormField>
          </div>
          <FormField label="Or Enter Custom Title" fullWidth>
            <input type="text" value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="w-full p-2 border rounded-md" />
          </FormField>
          
           <div className="p-4 border-t border-dashed mt-4">
               <div className="flex justify-between items-center">
                   <div>
                       <h4 className="font-semibold">AI Content Generator</h4>
                       <p className="text-xs text-gray-500">Auto-fill content based on the title.</p>
                   </div>
                    <Button onClick={handleAiGenerate} disabled={isGenerating || !formData.title}>
                        {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
               </div>
           </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Project">
                <select value={formData.project_id} onChange={e => setFormData(p => ({...p, project_id: e.target.value}))} className="w-full p-2 border rounded-md">
                    {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                </select>
            </FormField>
             <FormField label="Location">
                <input type="text" value={formData.location} onChange={e => setFormData(p => ({...p, location: e.target.value}))} className="w-full p-2 border rounded-md" placeholder="e.g. Site C, Assembly Area"/>
            </FormField>
            <FormField label="Date"><input type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} className="w-full p-2 border rounded-md"/></FormField>
            <FormField label="Time"><input type="time" value={formData.time} onChange={e => setFormData(p => ({...p, time: e.target.value}))} className="w-full p-2 border rounded-md"/></FormField>
           </div>
           
            <FormField label="Summary" fullWidth><textarea rows={3} value={formData.summary} onChange={e => setFormData(p => ({...p, summary: e.target.value}))} className="w-full p-2 border rounded-md" /></FormField>
            <FormField label="Hazards Discussed" fullWidth><textarea rows={3} value={formData.hazards_discussed?.join('\n') || ''} onChange={e => setFormData(p => ({...p, hazards_discussed: e.target.value.split('\n')}))} className="w-full p-2 border rounded-md" /></FormField>
            <FormField label="Controls Discussed" fullWidth><textarea rows={3} value={formData.controls_discussed?.join('\n') || ''} onChange={e => setFormData(p => ({...p, controls_discussed: e.target.value.split('\n')}))} className="w-full p-2 border rounded-md" /></FormField>
            <FormField label="Questions for Workers" fullWidth><textarea rows={3} value={formData.discussion_points?.join('\n') || ''} onChange={e => setFormData(p => ({...p, discussion_points: e.target.value.split('\n')}))} className="w-full p-2 border rounded-md" /></FormField>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create TBT</Button>
        </div>
      </div>
    </div>
  );
};