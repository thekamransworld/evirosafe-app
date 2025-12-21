import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Loader2, Zap, Target, Shield, AlertTriangle, Brain } from 'lucide-react';

interface ChecklistAISuggestorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (criteria: any) => void;
  projectType?: string;
  workType?: string;
}

export const ChecklistAISuggestor: React.FC<ChecklistAISuggestorProps> = ({
  isOpen,
  onClose,
  onGenerate,
  projectType,
  workType
}) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [criteria, setCriteria] = useState({
    workType: workType || '',
    hazards: [] as string[],
    regulations: ['OSHA', 'ISO 45001'],
    complexity: 'Medium',
    teamSize: '5-10',
    duration: '1-4 hours'
  });

  const hazardOptions = [
    'Work at Height', 'Electrical', 'Chemical', 'Fire', 'Confined Space',
    'Heavy Machinery', 'Excavation', 'Lifting Operations', 'Hot Work',
    'Noise Exposure', 'Dust/Silica', 'Extreme Temperatures', 'Biological'
  ];

  const regulationOptions = [
    'OSHA', 'ISO 45001', 'ISO 14001', 'ANSI', 'NEBOSH', 
    'Local Regulations', 'Client Standards', 'Industry Best Practices'
  ];

  const generateAIItems = () => {
    setIsGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      onGenerate(criteria);
      setIsGenerating(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl">
        <div className="p-6 border-b dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mr-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  AI Checklist Generator
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Generate custom checklists based on your specific requirements
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
            {[1, 2, 3].map((s) => (
              <div key={s} className="relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {step > s ? '✓' : s}
                </div>
                <div className="text-xs text-center mt-2">
                  {s === 1 ? 'Work Details' : s === 2 ? 'Hazards' : 'Generate'}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Work Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Type / Activity
                </label>
                <input
                  type="text"
                  value={criteria.workType}
                  onChange={(e) => setCriteria({...criteria, workType: e.target.value})}
                  placeholder="e.g., Scaffolding Erection, Confined Space Entry, Electrical Installation"
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Team Size
                  </label>
                  <select 
                    value={criteria.teamSize}
                    onChange={(e) => setCriteria({...criteria, teamSize: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                  >
                    <option value="1-5">1-5 workers</option>
                    <option value="5-10">5-10 workers</option>
                    <option value="10-20">10-20 workers</option>
                    <option value="20+">20+ workers</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Work Duration
                  </label>
                  <select 
                    value={criteria.duration}
                    onChange={(e) => setCriteria({...criteria, duration: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white"
                  >
                    <option value="<1 hour">Less than 1 hour</option>
                    <option value="1-4 hours">1-4 hours</option>
                    <option value="4-8 hours">4-8 hours</option>
                    <option value="Multiple days">Multiple days</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Complexity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Low', 'Medium', 'High'].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCriteria({...criteria, complexity: level})}
                      className={`p-3 rounded-lg border ${
                        criteria.complexity === level
                          ? level === 'Low' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : level === 'Medium' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {level === 'Low' && <Shield className="w-5 h-5 mb-1" />}
                        {level === 'Medium' && <Target className="w-5 h-5 mb-1" />}
                        {level === 'High' && <AlertTriangle className="w-5 h-5 mb-1" />}
                        <span className="text-sm font-medium">{level}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Hazards & Regulations */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Applicable Hazards
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {hazardOptions.map(hazard => (
                    <button
                      key={hazard}
                      type="button"
                      onClick={() => {
                        const newHazards = criteria.hazards.includes(hazard)
                          ? criteria.hazards.filter(h => h !== hazard)
                          : [...criteria.hazards, hazard];
                        setCriteria({...criteria, hazards: newHazards});
                      }}
                      className={`p-2 rounded-lg border text-sm ${
                        criteria.hazards.includes(hazard)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      {hazard}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Compliance Standards
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {regulationOptions.map(regulation => (
                    <button
                      key={regulation}
                      type="button"
                      onClick={() => {
                        const newRegs = criteria.regulations.includes(regulation)
                          ? criteria.regulations.filter(r => r !== regulation)
                          : [...criteria.regulations, regulation];
                        setCriteria({...criteria, regulations: newRegs});
                      }}
                      className={`p-2 rounded-lg border text-sm ${
                        criteria.regulations.includes(regulation)
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      {regulation}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
                <Zap className="w-10 h-10 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Ready to Generate
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                AI will create a customized checklist based on your specifications
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                <h5 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Summary</h5>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Work Type: {criteria.workType}</li>
                  <li>• Hazards: {criteria.hazards.join(', ')}</li>
                  <li>• Regulations: {criteria.regulations.join(', ')}</li>
                  <li>• Complexity: {criteria.complexity}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-gray-800 flex justify-between">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          )}
          
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button 
              onClick={generateAIItems}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Generate Checklist
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};