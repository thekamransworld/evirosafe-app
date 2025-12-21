import React, { useState, useEffect } from 'react';
import type { Rams as RamsType, RamsStatus, RamsStep } from '../types';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { RiskMatrixDisplay } from './RiskMatrixDisplay';
import { Badge } from './ui/Badge';
import { translateText } from '../services/geminiService';
import { RamsStepEditor } from './RamsStepEditor';
import { 
  getStatusColor, 
  getStatusDisplayText, 
  getRiskColor,
  getRiskLevel,
  calculateOverallRisk,
  formatDate 
} from '../utils/ramsUtils';
import { Loader2, Globe, Plus, Trash2, X, Paperclip } from 'lucide-react';

interface RamsEditorModalProps {
  rams: RamsType;
  onClose: () => void;
  onSave: (rams: RamsType) => void;
  onSubmitForReview: (ramsId: string, newStatus: RamsStatus) => void;
  onDelete?: (ramsId: string) => void;
}

type EditorSection = 'Overview' | 'Competence' | 'Steps' | 'Emergency' | 'Settings';

const RightRailSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ 
  title, 
  children, 
  className = '' 
}) => (
  <div className={className}>
    <h3 className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">{title}</h3>
    <div className="p-3 bg-white dark:bg-dark-card border dark:border-dark-border rounded-md space-y-2">
      {children}
    </div>
  </div>
);

const StepSummary: React.FC<{ step: RamsStep; onClick: () => void }> = ({ step, onClick }) => {
  const riskBefore = step.risk_before.severity * step.risk_before.likelihood;
  const riskAfter = step.risk_after.severity * step.risk_after.likelihood;
  const riskReduction = riskBefore - riskAfter;
  
  return (
    <div 
      className="p-3 border dark:border-dark-border rounded-lg bg-white dark:bg-dark-card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-primary-600 dark:text-primary-400">Step {step.step_no}</span>
            <Badge color={riskAfter >= 13 ? 'red' : riskAfter >= 7 ? 'yellow' : 'green'}>
              Risk: {riskAfter}
            </Badge>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{step.description}</p>
        </div>
        {riskReduction > 0 && (
          <Badge color="green" className="animate-pulse">
            ↓ {riskReduction}
          </Badge>
        )}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>{step.hazards.length} hazard{step.hazards.length !== 1 ? 's' : ''}</span>
        <span>{step.controls.length} control{step.controls.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export const RamsEditorModal: React.FC<RamsEditorModalProps> = ({ 
  rams, 
  onClose, 
  onSave, 
  onSubmitForReview,
  onDelete 
}) => {
  const [editedRams, setEditedRams] = useState<RamsType>(JSON.parse(JSON.stringify(rams)));
  const [activeSection, setActiveSection] = useState<EditorSection>('Overview');
  const [isTranslating, setIsTranslating] = useState(false);
  const [editingStep, setEditingStep] = useState<RamsStep | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = setTimeout(() => {
      if (!isSaving && JSON.stringify(editedRams) !== JSON.stringify(rams)) {
        handleAutoSave();
      }
    }, 5000); // Auto-save after 5 seconds of inactivity

    setAutoSaveTimer(timer);
    
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [editedRams]);

  const handleAutoSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would be a silent save without closing
      console.log('Auto-saving...', editedRams);
      // onSave(editedRams); // Uncomment if onSave doesn't close modal
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const risks = calculateOverallRisk(editedRams.method_statement.sequence_of_operations);
    setEditedRams(prev => ({
      ...prev,
      overall_risk_before: risks.before,
      overall_risk_after: risks.after,
    }));
  }, [editedRams.method_statement.sequence_of_operations]);

  const handleSaveAndSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(editedRams);
      await onSubmitForReview(editedRams.id, 'under_review');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTranslate = async () => {
    const textToTranslate = editedRams.method_statement.overview;
    if (!textToTranslate) return;
    setIsTranslating(true);
    try {
      const translatedText = await translateText(textToTranslate, 'Arabic');
      setEditedRams(prev => ({
        ...prev, 
        method_statement: { 
          ...prev.method_statement, 
          overview: translatedText 
        }
      }));
    } catch (error) {
      console.error("Translation failed:", error);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleUpdateStep = (updatedStep: RamsStep) => {
    setEditedRams(prev => ({
      ...prev,
      method_statement: {
        ...prev.method_statement,
        sequence_of_operations: prev.method_statement.sequence_of_operations.map(s => 
          s.step_no === updatedStep.step_no ? updatedStep : s
        )
      }
    }));
    setShowStepModal(false);
    setEditingStep(null);
  };

  const handleAddStep = () => {
    const newStep: RamsStep = {
      step_no: editedRams.method_statement.sequence_of_operations.length + 1,
      description: `New Step ${editedRams.method_statement.sequence_of_operations.length + 1}`,
      hazards: [],
      controls: [],
      risk_before: { severity: 3, likelihood: 3 },
      risk_after: { severity: 1, likelihood: 1 }
    };
    setEditingStep(newStep);
    setShowStepModal(true);
  };

  const handleDeleteStep = (stepNo: number) => {
    setEditedRams(prev => ({
      ...prev,
      method_statement: {
        ...prev.method_statement,
        sequence_of_operations: prev.method_statement.sequence_of_operations
          .filter(s => s.step_no !== stepNo)
          .map((s, idx) => ({ ...s, step_no: idx + 1 }))
      }
    }));
  };

  const renderSection = () => {
    switch(activeSection) {
      case 'Overview':
      case 'Competence':
      case 'Emergency':
        const keyMap = { 
          'Overview': 'overview', 
          'Competence': 'competence', 
          'Emergency': 'emergency_arrangements' 
        };
        const currentKey = keyMap[activeSection] as 'overview' | 'competence' | 'emergency_arrangements';
        
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{activeSection}</h2>
              {activeSection === 'Overview' && (
                <Button 
                  variant="outline" 
                  onClick={handleTranslate} 
                  disabled={isTranslating}
                  className="flex items-center gap-2"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Translate to Arabic
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1">
                <textarea 
                  value={editedRams.method_statement[currentKey]}
                  onChange={(e) => setEditedRams(prev => ({
                    ...prev, 
                    method_statement: { 
                      ...prev.method_statement, 
                      [currentKey]: e.target.value 
                    }
                  }))}
                  className="w-full h-[50vh] p-4 border rounded-lg bg-white dark:bg-dark-card dark:border-dark-border font-mono text-gray-900 dark:text-white"
                  placeholder={`Describe the ${activeSection.toLowerCase()}...`}
                  spellCheck="true"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Preview</h4>
                <div className="p-4 border rounded-lg h-[50vh] overflow-y-auto bg-gray-50 dark:bg-gray-900/50 dark:border-dark-border">
                  <ReactMarkdown className="prose dark:prose-invert max-w-none">
                    {editedRams.method_statement[currentKey] || `*No ${activeSection.toLowerCase()} content yet*`}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'Steps':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sequence of Operations</h2>
              <Button onClick={handleAddStep}>
                <Plus className="w-5 h-5 mr-2" />
                Add Step
              </Button>
            </div>
            
            <div className="space-y-3 mb-6">
              {editedRams.method_statement.sequence_of_operations.map(step => (
                <StepSummary 
                  key={step.step_no} 
                  step={step} 
                  onClick={() => {
                    setEditingStep(step);
                    setShowStepModal(true);
                  }}
                />
              ))}
              
              {editedRams.method_statement.sequence_of_operations.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg border-gray-300 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No steps defined yet</p>
                  <Button onClick={handleAddStep}>
                    Add First Step
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'Settings':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">RAMS Title</label>
                <input
                  type="text"
                  value={editedRams.activity}
                  onChange={(e) => setEditedRams(prev => ({ ...prev, activity: e.target.value }))}
                  className="w-full p-2 border rounded bg-white dark:bg-dark-background dark:border-dark-border dark:text-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Valid From</label>
                  <input
                    type="date"
                    value={editedRams.times.valid_from.split('T')[0]}
                    onChange={(e) => setEditedRams(prev => ({
                      ...prev,
                      times: { ...prev.times, valid_from: new Date(e.target.value).toISOString() }
                    }))}
                    className="w-full p-2 border rounded bg-white dark:bg-dark-background dark:border-dark-border dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Valid Until</label>
                  <input
                    type="date"
                    value={editedRams.times.valid_until.split('T')[0]}
                    onChange={(e) => setEditedRams(prev => ({
                      ...prev,
                      times: { ...prev.times, valid_until: new Date(e.target.value).toISOString() }
                    }))}
                    className="w-full p-2 border rounded bg-white dark:bg-dark-background dark:border-dark-border dark:text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Linked PTW Types</label>
                <div className="flex flex-wrap gap-2">
                  {['Hot Work', 'Work at Height', 'Confined Space', 'Electrical', 'Excavation'].map(type => (
                    <label key={type} className="inline-flex items-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={(editedRams.linked_ptw_types || []).includes(type as any)}
                        onChange={(e) => {
                          setEditedRams(prev => ({
                            ...prev,
                            linked_ptw_types: e.target.checked
                              ? [...prev.linked_ptw_types, type as any]
                              : prev.linked_ptw_types.filter(t => t !== type)
                          }));
                        }}
                        className="mr-2 rounded text-primary-600 focus:ring-primary-500"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
        
      default: 
        return null;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-gray-100 dark:bg-dark-background rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <header className="p-4 border-b bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {editedRams.activity}
                {isSaving && <span className="ml-2 text-sm text-gray-500 font-normal">(Saving...)</span>}
              </h2>
              <Badge color={getStatusColor(editedRams.status)}>
                {getStatusDisplayText(editedRams.status)}
              </Badge>
              <span className="text-sm text-gray-500">v{editedRams.version}</span>
            </div>
            <div className="flex items-center gap-4">
              {onDelete && (
                <Button 
                  variant="ghost" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>
          </header>

          <div className="flex-grow flex overflow-hidden">
            {/* Left Navigation */}
            <nav className="w-60 bg-white dark:bg-dark-card border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0">
              <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 px-2">Sections</h3>
              <ul className="space-y-1">
                {(['Overview', 'Competence', 'Steps', 'Emergency', 'Settings'] as EditorSection[]).map(section => (
                  <li key={section}>
                    <button
                      onClick={() => setActiveSection(section)}
                      className={`w-full text-left p-3 rounded-md text-sm font-medium flex items-center gap-2 transition-all ${
                        activeSection === section 
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' 
                          : 'hover:bg-gray-100 dark:hover:bg-dark-background text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {section === 'Steps' && (
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-bold ml-auto">
                          {editedRams.method_statement.sequence_of_operations.length}
                        </span>
                      )}
                      {section}
                    </button>
                  </li>
                ))}
              </ul>
              
              {/* Risk Summary */}
              <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <h4 className="font-semibold text-sm mb-3 text-gray-900 dark:text-white">Risk Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Initial Risk:</span>
                    <Badge color={getRiskColor(editedRams.overall_risk_before)}>
                      {getRiskLevel(editedRams.overall_risk_before)} ({editedRams.overall_risk_before})
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Residual Risk:</span>
                    <Badge color={getRiskColor(editedRams.overall_risk_after)}>
                      {getRiskLevel(editedRams.overall_risk_after)} ({editedRams.overall_risk_after})
                    </Badge>
                  </div>
                  {editedRams.overall_risk_before > editedRams.overall_risk_after && (
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                      ↓ Risk reduction: {editedRams.overall_risk_before - editedRams.overall_risk_after} points
                    </div>
                  )}
                </div>
              </div>
            </nav>

            {/* Center Content Editor */}
            <main className="flex-1 p-6 overflow-y-auto">
              {renderSection()}
            </main>

            {/* Right Metadata Rail */}
            <aside className="w-80 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-4 overflow-y-auto flex-shrink-0 space-y-6">
              <RightRailSection title="Overall Risk Score">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30">
                    <p className="text-xs font-bold mb-1 text-red-800 dark:text-red-300">BEFORE</p>
                    <p className="text-3xl font-black text-red-600 dark:text-red-400">{editedRams.overall_risk_before}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                    <p className="text-xs font-bold mb-1 text-green-800 dark:text-green-300">AFTER</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">{editedRams.overall_risk_after}</p>
                  </div>
                </div>
              </RightRailSection>

              <RightRailSection title="Timeline">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(editedRams.times.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valid From:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(editedRams.times.valid_from)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valid Until:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatDate(editedRams.times.valid_until)}</span>
                  </div>
                </div>
              </RightRailSection>

              <RightRailSection title="Linked PTW Types">
                <div className="flex flex-wrap gap-2">
                  {editedRams.linked_ptw_types.map(ptw => (
                    <Badge key={ptw} color="blue">{ptw}</Badge>
                  ))}
                  {editedRams.linked_ptw_types.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No linked PTWs</p>
                  )}
                </div>
              </RightRailSection>

              <RightRailSection title="Attachments">
                <div className="space-y-2">
                  {editedRams.attachments.map(att => (
                    <div key={att.name} className="flex items-center justify-between p-2 bg-white dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-gray-800 rounded border dark:border-gray-700 transition-colors">
                      <div className="flex items-center min-w-0">
                        <Paperclip className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0"/>
                        <span className="truncate text-sm text-gray-700 dark:text-gray-300">{att.name}</span>
                      </div>
                      <a 
                        href={att.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        View
                      </a>
                    </div>
                  ))}
                  {editedRams.attachments.length === 0 && (
                    <p className="text-xs text-gray-500 italic text-center py-2">No attachments</p>
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-2 border-dashed">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Attachment
                  </Button>
                </div>
              </RightRailSection>
            </aside>
          </div>

          <footer className="p-4 border-t bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Auto-saving...</span>
                </div>
              )}
              {!isSaving && editedRams.times.updated_at && (
                <span className="text-xs text-gray-500">
                  Last saved: {new Date(editedRams.times.updated_at).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button 
                variant="outline" 
                onClick={() => onSave(editedRams)}
                disabled={isSaving}
              >
                Save Draft
              </Button>
              <Button 
                onClick={handleSaveAndSubmit} 
                disabled={isSaving}
                className="ml-2"
              >
                Save & Submit for Review
              </Button>
            </div>
          </footer>
        </div>
      </div>

      {/* Step Editor Modal */}
      {showStepModal && editingStep && (
        <RamsStepEditor
          step={editingStep}
          onSave={handleUpdateStep}
          onClose={() => {
            setShowStepModal(false);
            setEditingStep(null);
          }}
          onDelete={() => {
            handleDeleteStep(editingStep.step_no);
            setShowStepModal(false);
            setEditingStep(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog - Inline Implementation since component might be missing */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={() => setShowDeleteConfirm(false)}>
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete RAMS</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete this RAMS document? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                    <Button variant="danger" onClick={() => {
                        if (onDelete) onDelete(editedRams.id);
                        setShowDeleteConfirm(false);
                        onClose();
                    }}>Delete</Button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};