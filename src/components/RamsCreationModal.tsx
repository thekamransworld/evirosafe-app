import React, { useState } from 'react';
import type { Project, User } from '../types';
import { Button } from './ui/Button';
import { generateRamsContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

// Define the shape of the AI response
type AiContent = { 
    overview: string; 
    competence: string; 
    ppe_requirements?: string[];
    emergency_arrangements: string;
    sequence_of_operations: { 
        step_no: number;
        description: string; 
        hazards: { id: string; description: string }[]; 
        controls: { id: string; description: string; hierarchy: string }[];
        risk_before: { severity: number; likelihood: number };
        risk_after: { severity: number; likelihood: number };
    }[]; 
};

interface RamsCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { activity: string; location: string; project_id: string, aiContent: AiContent }) => void;
  projects: Project[];
  activeUser: User;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        {children}
    </div>
);

export const RamsCreationModal: React.FC<RamsCreationModalProps> = ({ isOpen, onClose, onSubmit, projects }) => {
  const [formData, setFormData] = useState({
    activity: '',
    location: '',
    project_id: projects[0]?.id || '',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<AiContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
      if (!aiPrompt.trim()) {
          setError("Please enter a description for the AI.");
          return;
      }

      setIsGenerating(true);
      setError('');
      setAiResult(null);

      try {
        const result = await generateRamsContent(aiPrompt);
        setAiResult(result);
        
        // Auto-fill Title if empty
        if (!formData.activity) {
            setFormData(prev => ({...prev, activity: aiPrompt.split('.')[0].substring(0, 50) }));
        }
      } catch(e: any) {
          console.error("RAMS Generation Error:", e);
          setError("Failed to generate content. Please check your API key or try a simpler prompt.");
      } finally {
        setIsGenerating(false);
      }
  };

  const handleSubmit = () => {
    if (!formData.activity.trim() || !formData.project_id) {
        setError('Please fill out the Activity Title and select a Project.');
        return;
    }
    if (!aiResult) {
        setError('Please generate the method statement with AI first.');
        return;
    }
    onSubmit({ ...formData, aiContent: aiResult });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Comprehensive RAMS</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">AI-Powered Risk Assessment & Method Statement</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 flex-1 overflow-y-auto">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                    <FormField label="Project">
                        <select 
                            value={formData.project_id} 
                            onChange={e => handleChange('project_id', e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                        >
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </FormField>
                    <FormField label="Activity Title">
                        <input 
                            type="text" 
                            value={formData.activity} 
                            onChange={e => handleChange('activity', e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" 
                            placeholder="e.g., Confined Space Welding"
                        />
                    </FormField>
                    <FormField label="Work Location">
                        <input 
                            type="text" 
                            value={formData.location} 
                            onChange={e => handleChange('location', e.target.value)} 
                            className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white" 
                            placeholder="e.g., Basement Level 2"
                        />
                    </FormField>
                </div>

                {/* AI Input Area */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🤖</span>
                        <h4 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h4>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        Describe the task in detail. Include tools, height, materials, and environment.
                    </p>
                    <textarea 
                        value={aiPrompt} 
                        onChange={e => setAiPrompt(e.target.value)} 
                        rows={4} 
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-emerald-500" 
                        placeholder="Example: Installation of heavy steel beams at 15m height using a 50-ton mobile crane. Ground conditions are sandy."
                    />
                    <Button 
                        onClick={handleGenerate} 
                        disabled={isGenerating}
                        className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
                    >
                        {isGenerating ? 'Analyzing Risks & generating Steps...' : 'Generate Comprehensive RAMS'}
                    </Button>
                </div>
            </div>

            {/* AI Result Preview */}
            {aiResult && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2">Overview</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{aiResult.overview}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border dark:border-gray-700 rounded-lg">
                            <h5 className="font-bold mb-2">Competence Required</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{aiResult.competence}</p>
                        </div>
                        <div className="p-4 border dark:border-gray-700 rounded-lg">
                            <h5 className="font-bold mb-2">Emergency Arrangements</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{aiResult.emergency_arrangements}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-3 border-b dark:border-gray-700 pb-2">Method Statement Steps</h4>
                        <div className="space-y-4">
                            {aiResult.sequence_of_operations.map((step, i) => (
                                <div key={i} className="border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-800/30">
                                    <div className="flex justify-between mb-2">
                                        <h5 className="font-bold">Step {step.step_no}: {step.description}</h5>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <strong className="text-red-500">Hazards:</strong>
                                            <ul className="list-disc pl-4 mt-1 text-gray-600 dark:text-gray-400">
                                                {step.hazards.map((h, idx) => <li key={idx}>{h.description}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <strong className="text-emerald-500">Controls:</strong>
                                            <ul className="list-disc pl-4 mt-1 text-gray-600 dark:text-gray-400">
                                                {step.controls.map((c, idx) => <li key={idx}>{c.description} <span className="text-xs opacity-50">({c.hierarchy})</span></li>)}
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-4 text-xs font-mono">
                                        <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">Risk Before: {step.risk_before.severity * step.risk_before.likelihood}</span>
                                        <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 px-2 py-1 rounded">Residual: {step.risk_after.severity * step.risk_after.likelihood}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800/50 rounded-b-xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!aiResult || !formData.activity}>Create RAMS</Button>
        </div>
      </div>
    </div>
  );
};