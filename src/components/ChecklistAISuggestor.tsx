import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Loader2, Zap, Target, Shield, AlertTriangle, Brain } from 'lucide-react';
import { checklistAIService } from '../services/checklistAIService';
import { useAppContext } from '../contexts';

interface ChecklistAISuggestorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (template: any) => void;
}

export const ChecklistAISuggestor: React.FC<ChecklistAISuggestorProps> = ({
  isOpen,
  onClose,
  onGenerate
}) => {
  const { activeOrg } = useAppContext();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [criteria, setCriteria] = useState({
    workType: '',
    hazards: [] as string[],
    regulations: ['OSHA', 'ISO 45001'],
    complexity: 'Medium',
    teamSize: '5-10',
    duration: '1-4 hours'
  });

  const hazardOptions = [
    'Work at Height', 'Electrical', 'Chemical', 'Fire', 'Confined Space',
    'Heavy Machinery', 'Excavation', 'Lifting Operations', 'Hot Work'
  ];

  const generateAIItems = async () => {
    setIsGenerating(true);
    try {
      const aiResponse = await checklistAIService.generateChecklist(criteria);
      
      const generatedItems = aiResponse.items.map((item, index) => ({
        id: `ai_${Date.now()}_${index}`,
        text: { en: item.text, ar: item.text }, // In real app, translate here
        description: { en: item.description, ar: item.description },
        riskLevel: item.riskLevel,
        requiredEvidence: item.requiredEvidence || [],
        referenceStandards: item.referenceStandards || []
      }));

      const template = {
        id: `ct_ai_${Date.now()}`,
        org_id: activeOrg.id,
        category: 'AI Generated',
        title: { en: aiResponse.title, ar: aiResponse.title },
        items: generatedItems,
        aiGenerated: true,
        aiCriteria: criteria,
        estimatedTime: aiResponse.estimatedTime,
        riskScore: aiResponse.riskScore,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          model: 'safety-checklist-v1'
        }
      };

      onGenerate(template);
      onClose();
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-4">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Checklist Generator</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Intelligent safety controls based on work context</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Activity</label>
                <input
                  type="text"
                  value={criteria.workType}
                  onChange={(e) => setCriteria({...criteria, workType: e.target.value})}
                  placeholder="e.g., Scaffolding Erection on 5th Floor"
                  className="w-full p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complexity</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button
                      key={level}
                      onClick={() => setCriteria({...criteria, complexity: level})}
                      className={`p-3 rounded-lg border ${criteria.complexity === level ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'dark:border-gray-700'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Hazards</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {hazardOptions.map(hazard => (
                  <button
                    key={hazard}
                    onClick={() => {
                      const newHazards = criteria.hazards.includes(hazard)
                        ? criteria.hazards.filter(h => h !== hazard)
                        : [...criteria.hazards, hazard];
                      setCriteria({...criteria, hazards: newHazards});
                    }}
                    className={`p-2 rounded-lg border text-sm ${criteria.hazards.includes(hazard) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'dark:border-gray-700'}`}
                  >
                    {hazard}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-gray-800 flex justify-between">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
          )}
          
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button onClick={generateAIItems} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Generating...</> : <><Zap className="w-4 h-4 mr-2"/> Generate Checklist</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};