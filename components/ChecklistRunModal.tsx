import React, { useState } from 'react';
import type { ChecklistTemplate, Project, User, ChecklistRun, ChecklistRunResult } from '../types';
import { Button } from './ui/Button';
import { useAppContext } from '../contexts';

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

  const getTranslated = (textRecord: Record<string, string>) => {
      return textRecord[language] || textRecord[activeOrg.primaryLanguage] || textRecord['en'] || Object.values(textRecord)[0] || '';
  }

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-start p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
             <div>
                <h2 className="text-xl font-bold">{getTranslated(template.title)}</h2>
                <p className="text-sm text-gray-500">Project: {project.name} | Inspector: {user.name}</p>
             </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <main className="p-6 overflow-y-auto">
            <div className="space-y-4">
                {template.items.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start">
                           <div>
                             <p className="font-semibold">{index + 1}. {getTranslated(item.text)}</p>
                             <p className="text-xs text-gray-500 ml-5">{getTranslated(item.description)}</p>
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
                                className="w-full text-sm p-2 border border-gray-200 rounded-md shadow-sm"
                            />
                            <div className="mt-1">
                                <Button variant="ghost" size="sm">
                                    <CameraIcon className="w-4 h-4 mr-2" />
                                    Add Evidence
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </main>
        
        <footer className="p-4 border-t bg-gray-50 sticky bottom-0 z-10 flex justify-between items-center">
            <div>
                <span className="font-semibold">Score: {calculateScore()}%</span>
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
        green: 'border-green-500 bg-green-50 text-green-700',
        red: 'border-red-500 bg-red-50 text-red-700',
        gray: 'border-gray-500 bg-gray-50 text-gray-700',
    }
    const inactiveClasses = 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-sm font-bold rounded-full border-2 transition-colors ${active ? colorClasses[color] : inactiveClasses}`}
        >
            {children}
        </button>
    )
}

const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>;