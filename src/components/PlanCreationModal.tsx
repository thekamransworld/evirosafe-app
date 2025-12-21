import React, { useState, useEffect } from 'react';
import type { Project, PlanType } from '../types';
import { Button } from './ui/Button';
import { planTypes } from '../config';
import { useAppContext } from '../contexts';
import { 
  Sparkles, FileText, Clock
} from 'lucide-react';

interface PlanCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    title: string; 
    type: PlanType; 
    project_id: string;
    template?: string;
    aiGenerated?: boolean;
  }) => void;
  projects: Project[];
}

const PLAN_TEMPLATES = [
  {
    id: 'template_hsemp',
    name: 'HSE Management Plan',
    description: 'Complete HSE management system for large projects',
    icon: '🛡️',
    sections: 15,
    estimatedTime: '2 hours',
    aiCapable: true
  },
  {
    id: 'template_lifting',
    name: 'Lifting Plan',
    description: 'Detailed lifting operations plan with calculations',
    icon: '🏗️',
    sections: 8,
    estimatedTime: '1 hour',
    aiCapable: true
  },
  {
    id: 'template_excavation',
    name: 'Excavation Plan',
    description: 'Safe excavation procedures and soil analysis',
    icon: '⛏️',
    sections: 10,
    estimatedTime: '1.5 hours',
    aiCapable: true
  },
  {
    id: 'template_emergency',
    name: 'Emergency Response Plan',
    description: 'Emergency procedures and evacuation plans',
    icon: '🚨',
    sections: 12,
    estimatedTime: '1 hour',
    aiCapable: true
  },
  {
    id: 'template_fire',
    name: 'Fire Safety Plan',
    description: 'Fire prevention and response strategies',
    icon: '🔥',
    sections: 9,
    estimatedTime: '45 min',
    aiCapable: true
  },
  {
    id: 'template_custom',
    name: 'Custom Plan',
    description: 'Start from scratch with AI assistance',
    icon: '✨',
    sections: 0,
    estimatedTime: 'Flexible',
    aiCapable: true
  },
];

export const PlanCreationModal: React.FC<PlanCreationModalProps> = ({ 
  isOpen, onClose, onSubmit, projects 
}) => {
  const { activeUser } = useAppContext();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'HSEMP' as PlanType,
    project_id: projects[0]?.id || '',
    description: '',
  });
  
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== 'template_custom') {
      const template = PLAN_TEMPLATES.find(t => t.id === selectedTemplate);
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: `${template.name} - ${new Date().toLocaleDateString()}`,
          type: template.name.includes('Lifting') ? 'Lifting' as PlanType :
                 template.name.includes('Excavation') ? 'Excavation' as PlanType :
                 template.name.includes('Emergency') ? 'ERP' as PlanType :
                 'HSEMP',
        }));
      }
    }
  }, [selectedTemplate]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.project_id) {
      setError('Please fill out all required fields.');
      return;
    }

    const submissionData = {
      title: formData.title,
      type: formData.type,
      project_id: formData.project_id,
      template: selectedTemplate || undefined,
      aiGenerated: useAI
    };

    onSubmit(submissionData);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedTemplate(null);
    setUseAI(true);
    setFormData({
      title: '',
      type: 'HSEMP',
      project_id: projects[0]?.id || '',
      description: '',
    });
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                <FileText className="w-6 h-6 mr-3 text-blue-500" />
                Create New Plan
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {step === 1 ? 'Step 1: Select Template' : 'Step 2: Plan Details'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">Use AI</span>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    useAI ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      useAI ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select a Template
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Choose from industry-standard templates or create a custom plan
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PLAN_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`p-4 border rounded-xl text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : 'border-gray-300 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{template.icon}</span>
                      {template.aiCapable && useAI && (
                        <span className="text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-2 py-1 rounded-full flex items-center">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI
                        </span>
                      )}
                    </div>
                    <h5 className="font-bold text-gray-900 dark:text-white mb-2">{template.name}</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        {template.sections} sections
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {template.estimatedTime}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button
                  onClick={() => selectedTemplate && setStep(2)}
                  disabled={!selectedTemplate}
                  className={!selectedTemplate ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Plan Details
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plan Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Main Building HSE Management Plan"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Plan Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    >
                      {planTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project *
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => handleChange('project_id', e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    rows={3}
                    placeholder="Brief description of this plan's purpose and scope..."
                  />
                </div>

                {useAI && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                      <span className="font-semibold text-purple-700 dark:text-purple-300">AI Generation Enabled</span>
                    </div>
                    <p className="text-sm text-purple-600 dark:text-purple-400">
                      AI will generate initial content based on your project details and industry best practices.
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <div className="space-x-2">
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    {useAI ? (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Create with AI
                      </>
                    ) : (
                      'Create Plan'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};