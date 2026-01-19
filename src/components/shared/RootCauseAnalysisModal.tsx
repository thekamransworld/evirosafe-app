import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { X, AlertTriangle } from 'lucide-react';

interface RootCauseAnalysisModalProps {
  title: string;
  description: string;
  onSave: (analysis: any) => void;
  onClose: () => void;
}

export const RootCauseAnalysisModal: React.FC<RootCauseAnalysisModalProps> = ({
  title,
  description,
  onSave,
  onClose
}) => {
  const [analysis, setAnalysis] = useState({
    why1: '',
    why2: '',
    why3: '',
    why4: '',
    why5: '',
    systemic_issues: [] as string[],
    recommended_actions: [] as string[],
  });

  const [newAction, setNewAction] = useState('');

  const SYSTEMIC_ISSUES = [
    'Training / Competence',
    'Procedures / Work Instructions',
    'Supervision / Leadership',
    'Communication',
    'Equipment Design / Maintenance',
    'Work Environment',
    'Resource Allocation',
    'Time Pressure',
    'Organizational Culture',
    'Contractor Management',
  ];

  const handleAddAction = () => {
    if (newAction.trim()) {
      setAnalysis(prev => ({
        ...prev,
        recommended_actions: [...prev.recommended_actions, newAction.trim()]
      }));
      setNewAction('');
    }
  };

  const handleSubmit = () => {
    if (!analysis.why1.trim()) {
      alert('Please complete at least the first "Why"');
      return;
    }
    onSave(analysis);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Root Cause Analysis (5 Whys)</h2>
            <p className="text-gray-600 dark:text-gray-400">Investigate: {title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-red-700 dark:text-red-300">Incident Description</h3>
            </div>
            <p className="text-gray-800 dark:text-gray-200">{description}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">The 5 Whys</h3>
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/10 rounded-r-lg">
                <label className="block text-sm font-bold mb-2">Why {num}?</label>
                <input
                  type="text"
                  value={analysis[`why${num}` as keyof typeof analysis] as string}
                  onChange={(e) => setAnalysis(prev => ({ ...prev, [`why${num}`]: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  placeholder={num === 1 ? "Direct cause..." : "Underlying cause..."}
                />
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Systemic Issues</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {SYSTEMIC_ISSUES.map(issue => (
                <button
                  key={issue}
                  onClick={() => setAnalysis(prev => ({
                    ...prev,
                    systemic_issues: prev.systemic_issues.includes(issue)
                      ? prev.systemic_issues.filter(i => i !== issue)
                      : [...prev.systemic_issues, issue]
                  }))}
                  className={`p-3 border rounded-lg text-sm text-left transition-all ${analysis.systemic_issues.includes(issue)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                  }`}
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Preventive Actions</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Enter action..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg"
              />
              <Button onClick={handleAddAction}>Add</Button>
            </div>
            {analysis.recommended_actions.map((action, i) => (
              <div key={i} className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800 mb-2">
                {action}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t dark:border-gray-800 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white">Save Analysis</Button>
        </div>
      </div>
    </div>
  );
};