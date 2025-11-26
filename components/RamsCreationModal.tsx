import React, { useState } from 'react';
import type { Project, User, RamsStep, Severity, Likelihood } from '../types';
import { Button } from './ui/Button';
import { generateRamsContent } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

type AiContent = { overview: string; competence: string; sequence_of_operations: { description: string; hazards: string[]; controls: string[] }[]; emergency_arrangements: string };

interface RamsCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { activity: string; location: string; project_id: string, aiContent: AiContent }) => void;
  projects: Project[];
  activeUser: User;
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <div className="mt-1">{children}</div>
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
      if (!aiPrompt.trim()) return;
      setIsGenerating(true);
      setAiResult(null);
      try {
        const result = await generateRamsContent(aiPrompt);
        setAiResult(result);
        if (!formData.activity) {
            setFormData(prev => ({...prev, activity: aiPrompt}));
        }
      } catch(e) {
          console.error(e);
          setError("Failed to generate AI content.");
      } finally {
        setIsGenerating(false);
      }
  };

  const handleSubmit = () => {
    if (!formData.activity.trim() || !formData.project_id) {
        setError('Please fill out the Activity and Project fields.');
        return;
    }
    if (!aiResult) {
        setError('Please generate the RAMS content with AI before creating.');
        return;
    }
    onSubmit({ ...formData, aiContent: aiResult });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">New RAMS</h3>
          <p className="text-sm text-gray-600 mt-1">Create a new Risk Assessment & Method Statement.</p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Activity Title">
                    <input type="text" value={formData.activity} onChange={e => handleChange('activity', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Facade Glass Installation"/>
                </FormField>
                <FormField label="Project">
                    <select value={formData.project_id} onChange={e => handleChange('project_id', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md">
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </FormField>
            </div>
            <FormField label="Work Location">
                <input type="text" value={formData.location} onChange={e => handleChange('location', e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Tower B, Levels 10-15"/>
            </FormField>
            
            <div className="border-t pt-4">
                <h4 className="font-semibold text-lg">AI Assistant</h4>
                <p className="text-sm text-gray-500 mb-2">Describe the activity, and the AI will generate a draft method statement for you.</p>
                 <FormField label="Activity Description for AI">
                    <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md" placeholder="e.g., Installation of large glass panels on the facade of a high-rise building using a mobile crane and suction lifters."/>
                </FormField>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? <><Spinner /> Generating...</> : <><SparklesIcon className="w-5 h-5 mr-2"/>Generate with AI</>}
                </Button>

                {aiResult && (
                    <div className="mt-4 p-4 border rounded-md bg-gray-50 max-h-64 overflow-y-auto">
                        <div className="prose prose-sm max-w-none">
                            <h5 className="font-bold">Overview</h5>
                            <ReactMarkdown>{aiResult.overview}</ReactMarkdown>
                             <h5 className="font-bold mt-4">Sequence of Operations</h5>
                            <ul>
                                {aiResult.sequence_of_operations.map((step, i) => <li key={i}>{step.description}</li>)}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-2 border-t">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create RAMS</Button>
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const SparklesIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624l-.259 1.035L16.38 20.624a3.375 3.375 0 00-2.455-2.455l-1.036-.259.259-1.035a3.375 3.375 0 002.456-2.456l.259-1.035.259 1.035a3.375 3.375 0 002.456 2.456l1.035.259-.259 1.035a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);