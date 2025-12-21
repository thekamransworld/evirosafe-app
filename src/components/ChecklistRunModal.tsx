import React, { useState } from 'react';
import type { ChecklistTemplate, Project, User, ChecklistRun, ChecklistRunResult } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';
import { X } from 'lucide-react';

interface ChecklistRunModalProps {
  template: ChecklistTemplate;
  project: Project;
  user: User;
  onClose: () => void;
  onSubmit: (data: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'>) => void;
}

type ResultValue = ChecklistRunResult['result'];

export const ChecklistRunModal: React.FC<ChecklistRunModalProps> = ({ template, project, user, onClose, onSubmit }) => {
  const { language, activeOrg } = useAppContext();
  
  const [results, setResults] = useState<Record<string, ChecklistRunResult>>(() => {
    const initial: Record<string, ChecklistRunResult> = {};
    template.items.forEach(item => {
        initial[item.id] = { item_id: item.id, result: 'na' };
    });
    return initial;
  });

  const getTranslated = (textRecord: string | Record<string, string> | undefined) => {
      if (!textRecord) return '';
      if (typeof textRecord === 'string') return textRecord;
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  };

  const handleResultChange = (itemId: string, result: ResultValue) => {
    setResults(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], result }
    }));
  };
  
  const handleRemarksChange = (itemId: string, remarks: string) => {
    setResults(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], remarks }
    }));
  };

  const calculateScore = () => {
    const resultValues = Object.values(results);
    const applicableItems = resultValues.filter(r => (r as ChecklistRunResult).result !== 'na');
    if (applicableItems.length === 0) return 100;
    const passedItems = applicableItems.filter(r => (r as ChecklistRunResult).result === 'pass');
    return Math.round((passedItems.length / applicableItems.length) * 100);
  };

  const handleSubmit = () => {
    const finalRun: Omit<ChecklistRun, 'id' | 'org_id' | 'executed_by_id' | 'executed_at'> = {
        template_id: template.id,
        project_id: project.id,
        status: 'completed',
        score: calculateScore(),
        results: Object.values(results),
    };
    onSubmit(finalRun);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b dark:border-dark-border sticky top-0 bg-white dark:bg-dark-card z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{getTranslated(template.title)}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Project: {project.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
             <X className="w-6 h-6" />
          </button>
        </header>

        <main className="p-6 overflow-y-auto">
            <div className="space-y-4">
                {template.items.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-white/5">
                        <div className="flex justify-between items-start">
                           <div>
                             <p className="font-semibold text-gray-900 dark:text-white">{index + 1}. {getTranslated(item.text)}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400 ml-5">{getTranslated(item.description)}</p>
                           </div>
                           <div className="flex-shrink-0 flex items-center space-x-1">
                             <ResultButton active={results[item.id].result === 'pass'} onClick={() => handleResultChange(item.id, 'pass')} color="green">Pass</ResultButton>
                             <ResultButton active={results[item.id].result === 'fail'} onClick={() => handleResultChange(item.id, 'fail')} color="red">Fail</ResultButton>
                             <ResultButton active={results[item.id].result === 'na'} onClick={() => handleResultChange(item.id, 'na')} color="gray">N/A</ResultButton>
                           </div>
                        </div>
                        <div className="mt-2 ml-5">
                            <textarea
                                value={results[item.id].remarks || ''}
                                onChange={e => handleRemarksChange(item.id, e.target.value)}
                                placeholder="Add remarks..."
                                rows={2}
                                className="w-full text-sm p-2 border border-gray-200 dark:border-dark-border dark:bg-dark-background dark:text-white rounded-md shadow-sm"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </main>
        
        <footer className="p-4 border-t bg-gray-50 dark:bg-dark-card dark:border-dark-border sticky bottom-0 z-10 flex justify-between items-center">
            <div>
                <span className="font-semibold text-gray-900 dark:text-white">Score: {calculateScore()}%</span>
            </div>
            <div className="space-x-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit}>Submit Checklist</Button>
            </div>
        </footer>
      </div>
    </div>
  );
};

const ResultButton: React.FC<{active: boolean, onClick: () => void, color: 'green' | 'red' | 'gray', children: React.ReactNode}> = ({ active, onClick, color, children }) => {
    const colorClasses = {
        green: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        red: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        gray: 'border-gray-500 bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    }
    const inactiveClasses = 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-background dark:border-dark-border dark:text-gray-400 dark:hover:bg-white/5'
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-sm font-bold rounded-full border-2 transition-colors ${active ? colorClasses[color] : inactiveClasses}`}
        >
            {children}
        </button>
    )
}