





import React, { useState, useEffect } from 'react';
import type { Rams as RamsType, RamsStatus, RamsStep, RiskMatrix, Severity, Likelihood, RamsHazard, RamsControl, RamsHierarchy } from '../types';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { RiskMatrixInput } from './RiskMatrixInput';
// FIX: Import the missing 'RiskMatrixDisplay' component.
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { Badge } from './ui/Badge';
import { translateText } from '../services/geminiService';

interface RamsEditorModalProps {
  rams: RamsType;
  onClose: () => void;
  onSave: (rams: RamsType) => void;
  onSubmitForReview: (ramsId: string, newStatus: RamsStatus) => void;
}

type EditorSection = 'Overview' | 'Competence' | 'Steps' | 'Emergency';

const RightRailSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
        <div className="p-3 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md space-y-2">
            {children}
        </div>
    </div>
);

const calculateOverallRisk = (steps: RamsStep[]): { before: number, after: number } => {
    if (steps.length === 0) return { before: 0, after: 0 };
    const beforeScores = steps.map(s => s.risk_before.severity * s.risk_before.likelihood);
    const afterScores = steps.map(s => s.risk_after.severity * s.risk_after.likelihood);
    return {
        before: Math.max(...beforeScores),
        after: Math.max(...afterScores)
    };
};

export const RamsEditorModal: React.FC<RamsEditorModalProps> = ({ rams, onClose, onSave, onSubmitForReview }) => {
  const [editedRams, setEditedRams] = useState<RamsType>(JSON.parse(JSON.stringify(rams)));
  const [activeSection, setActiveSection] = useState<EditorSection>('Overview');
  const [isTranslating, setIsTranslating] = useState(false);
  const [editingStep, setEditingStep] = useState<RamsStep | null>(null);

  useEffect(() => {
    // Recalculate overall risk whenever steps change
    const risks = calculateOverallRisk(editedRams.method_statement.sequence_of_operations);
    setEditedRams(prev => ({
        ...prev,
        overall_risk_before: risks.before,
        overall_risk_after: risks.after,
    }));
  }, [editedRams.method_statement.sequence_of_operations]);

  const handleSaveAndSubmit = () => {
    onSave(editedRams);
    onSubmitForReview(editedRams.id, 'under_review');
  };

  const handleTranslate = async () => {
      const textToTranslate = editedRams.method_statement.overview;
      if (!textToTranslate) return;
      setIsTranslating(true);
      try {
          const translatedText = await translateText(textToTranslate, 'Arabic');
           setEditedRams(prev => ({...prev, method_statement: { ...prev.method_statement, overview: translatedText}}));
      } catch (error) {
          console.error("Translation failed:", error);
      } finally {
          setIsTranslating(false);
      }
  }
  
  const handleUpdateStep = (updatedStep: RamsStep) => {
    setEditedRams(prev => ({
        ...prev,
        method_statement: {
            ...prev.method_statement,
            sequence_of_operations: prev.method_statement.sequence_of_operations.map(s => s.step_no === updatedStep.step_no ? updatedStep : s)
        }
    }));
  };

  const renderSection = () => {
      switch(activeSection) {
          case 'Overview':
          case 'Competence':
          case 'Emergency':
            const keyMap = { 'Overview': 'overview', 'Competence': 'competence', 'Emergency': 'emergency_arrangements' };
            const currentKey = keyMap[activeSection] as 'overview' | 'competence' | 'emergency_arrangements';
            return (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">{activeSection}</h2>
                    </div>
                    <textarea 
                        value={editedRams.method_statement[currentKey]}
                        onChange={(e) => setEditedRams(prev => ({...prev, method_statement: { ...prev.method_statement, [currentKey]: e.target.value}}))}
                        className="w-full h-[60vh] p-2 border rounded bg-white dark:bg-dark-card dark:border-dark-border"
                        placeholder={`Describe the ${activeSection.toLowerCase()}...`}
                    />
                </div>
            );
        case 'Steps':
            return (
                <div>
                    <h2 className="text-2xl font-bold mb-4">Sequence of Operations</h2>
                    <div className="space-y-4">
                        {editedRams.method_statement.sequence_of_operations.map(step => (
                            <div key={step.step_no} className="p-4 border rounded-lg dark:border-dark-border bg-white dark:bg-dark-card">
                                <h3 className="font-bold">{step.step_no}. {step.description}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <RiskMatrixDisplay matrix={step.risk_before} />
                                    <RiskMatrixDisplay matrix={step.risk_after} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        default: return null;
      }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-100 dark:bg-dark-background rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">RAMS Editor: {editedRams.activity}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status: Draft</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden">
            {/* Left Navigation */}
            <nav className="w-60 bg-white dark:bg-dark-card border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0">
                <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Sections</h3>
                <ul>
                    {(['Overview', 'Competence', 'Steps', 'Emergency'] as EditorSection[]).map(section => (
                        <li key={section}>
                            <button
                                onClick={() => setActiveSection(section)}
                                className={`w-full text-left p-2 rounded-md text-sm font-medium ${activeSection === section ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/20' : 'hover:bg-gray-100 dark:hover:bg-dark-background'}`}
                            >
                                {section}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Center Content Editor */}
            <main className="flex-1 p-6 overflow-y-auto">
                {renderSection()}
            </main>

            {/* Right Metadata Rail */}
            <aside className="w-80 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-4 overflow-y-auto flex-shrink-0 space-y-4">
                <RightRailSection title="Overall Risk">
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div>
                            <p className="text-xs font-bold">BEFORE</p>
                            <p className="text-2xl font-bold text-red-600">{editedRams.overall_risk_before}</p>
                        </div>
                         <div>
                            <p className="text-xs font-bold">AFTER</p>
                            <p className="text-2xl font-bold text-green-600">{editedRams.overall_risk_after}</p>
                        </div>
                    </div>
                </RightRailSection>

                <RightRailSection title="Linked PTW Types">
                   {editedRams.linked_ptw_types.map(ptw => <Badge key={ptw} color="blue">{ptw}</Badge>)}
                   {editedRams.linked_ptw_types.length === 0 && <p className="text-xs text-gray-500">No linked PTWs.</p>}
                </RightRailSection>

                <RightRailSection title="Attachments">
                    {editedRams.attachments.map(att => (
                        <div key={att.name} className="flex items-center text-sm">
                            <PaperClipIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                            <span className="truncate">{att.name}</span>
                        </div>
                    ))}
                    {editedRams.attachments.length === 0 && <p className="text-xs text-gray-500">No attachments.</p>}
                </RightRailSection>

            </aside>
        </div>

        <footer className="p-4 border-t bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0 space-x-2">
            <div>
                 <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
            <div>
                <Button variant="secondary" onClick={() => onSave(editedRams)}>Save Draft</Button>
                <Button onClick={handleSaveAndSubmit} className="ml-2">Save & Submit for Review</Button>
            </div>
        </footer>
      </div>
    </div>
  );
};


// Icons
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const PaperClipIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" />
    </svg>
);
