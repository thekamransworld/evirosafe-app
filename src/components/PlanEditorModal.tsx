import React, { useState, useEffect } from 'react';
import type { Plan, PlanContentSection, PlanStatus } from '../types';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';
import { useToast } from './ui/Toast'; // Import Toast for feedback
import { FileText as FileTextIcon, X as CloseIcon, Paperclip as PaperClipIcon, Plus } from 'lucide-react';

interface PlanEditorModalProps {
  plan: Plan;
  onClose: () => void;
  onSave: (plan: Plan) => void;
  onSubmitForReview: (planId: string, newStatus: PlanStatus) => void;
}

const RightRailSection: React.FC<{ title: string, children: React.ReactNode, action?: React.ReactNode }> = ({ title, children, action }) => (
    <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">{title}</h3>
            {action}
        </div>
        <div className="p-3 bg-white dark:bg-dark-card border dark:border-dark-border rounded-lg space-y-2 shadow-sm">
            {children}
        </div>
    </div>
);

export const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ plan, onClose, onSave, onSubmitForReview }) => {
  const [editedPlan, setEditedPlan] = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [activeSection, setActiveSection] = useState<PlanContentSection | null>(editedPlan.content.body_json[0] || null);
  const toast = useToast();

  useEffect(() => {
    // If the active section is deleted from the plan, reset to the first one
    if (activeSection && !editedPlan.content.body_json.find(s => s.title === activeSection.title)) {
        setActiveSection(editedPlan.content.body_json[0] || null);
    }
  }, [editedPlan.content.body_json, activeSection]);

  const handleSectionContentChange = (newContent: string) => {
    if (!activeSection) return;
    const newSections = editedPlan.content.body_json.map(s => 
        s.title === activeSection.title ? { ...s, content: newContent } : s
    );
    setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
    setActiveSection(s => s ? { ...s, content: newContent } : null);
  };
  
  const handleSectionCompletionChange = (title: string, isComplete: boolean) => {
    const newSections = editedPlan.content.body_json.map(s => 
        s.title === title ? { ...s, is_complete: isComplete } : s
    );
    setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
  };

  const handleMetaChange = (field: keyof Plan['meta'], value: string | string[]) => {
      setEditedPlan(p => ({ ...p, meta: { ...p.meta, [field]: value }}));
  }

  // --- FIX: Implemented Add Section Logic ---
  const handleAddSection = () => {
      const newSection: PlanContentSection = {
          title: `New Section ${editedPlan.content.body_json.length + 1}`,
          content: 'Enter content here...',
          is_complete: false
      };
      
      const newSections = [...editedPlan.content.body_json, newSection];
      setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
      setActiveSection(newSection);
      toast.success("New section added.");
  };

  const handleSaveDraft = () => {
      onSave(editedPlan);
      toast.success("Draft saved successfully.");
      onClose();
  };

  const handleSaveAndSubmit = () => {
    onSave(editedPlan);
    onSubmitForReview(editedPlan.id, 'under_review');
    toast.success("Plan submitted for review.");
    onClose();
  };

  const handleLinkItem = (type: string) => {
      toast.info(`Link ${type} feature coming soon.`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-100 dark:bg-black rounded-xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <header className="p-4 border-b bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <FileTextIcon className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Plan Editor: {editedPlan.title}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Status: {editedPlan.status}</span>
                    <span>•</span>
                    <span>Version: {editedPlan.version}</span>
                </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow flex overflow-hidden">
            {/* Left Navigation */}
            <nav className="w-72 bg-white dark:bg-dark-card border-r dark:border-dark-border overflow-y-auto p-4 flex-shrink-0">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Sections</h3>
                    {/* FIX: Connected Add Button */}
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1" onClick={handleAddSection}>
                        <Plus className="w-3 h-3" /> ADD
                    </button>
                </div>
                <ul className="space-y-1">
                    {editedPlan.content.body_json.map(section => (
                        <li key={section.title}>
                            <button
                                onClick={() => setActiveSection(section)}
                                className={`w-full text-left p-3 rounded-lg text-sm flex items-center justify-between transition-all ${
                                    activeSection?.title === section.title 
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800' 
                                    : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span className="truncate pr-2 font-medium">{section.title}</span>
                                <input 
                                    type="checkbox" 
                                    checked={section.is_complete}
                                    onChange={(e) => handleSectionCompletionChange(section.title, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                />
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Center Content Editor */}
            <main className="flex-1 flex flex-col bg-white dark:bg-dark-background relative">
                {activeSection ? (
                    <>
                        <div className="p-6 border-b dark:border-dark-border">
                            <input 
                                type="text" 
                                value={activeSection.title} 
                                readOnly 
                                className="text-2xl font-bold w-full bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            />
                        </div>
                        <textarea 
                            value={activeSection.content}
                            onChange={(e) => handleSectionContentChange(e.target.value)}
                            className="flex-1 w-full p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-300 bg-transparent"
                            placeholder="Enter section content here. Markdown is supported."
                        />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <FileTextIcon className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a section from the left to begin editing.</p>
                    </div>
                )}
            </main>

            {/* Right Metadata Rail */}
            <aside className="w-80 bg-gray-50 dark:bg-dark-background border-l dark:border-dark-border p-6 overflow-y-auto flex-shrink-0">
                <RightRailSection title="Metadata">
                    <div className="text-sm space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">VERSION</label>
                            <input 
                                type="text" 
                                value={editedPlan.version} 
                                onChange={e => setEditedPlan(p => ({...p, version: e.target.value}))} 
                                className="w-full p-2 border rounded-md bg-white dark:bg-dark-card dark:border-dark-border dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">TAGS</label>
                            <input 
                                type="text" 
                                value={editedPlan.meta.tags?.join(', ') || ''} 
                                onChange={e => handleMetaChange('tags', e.target.value.split(',').map(t=>t.trim()))} 
                                className="w-full p-2 border rounded-md bg-white dark:bg-dark-card dark:border-dark-border dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Comma separated"
                            />
                        </div>
                    </div>
                </RightRailSection>

                <RightRailSection title="Attachments" action={<button onClick={() => handleLinkItem('Attachment')} className="text-blue-600 hover:text-blue-700 text-lg font-bold">+</button>}>
                    {editedPlan.content.attachments.length > 0 ? (
                        editedPlan.content.attachments.map(att => (
                            <div key={att.name} className="flex items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded">
                                <PaperClipIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                                <span className="truncate text-gray-700 dark:text-gray-300">{att.name}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 italic p-2">No attachments uploaded.</p>
                    )}
                </RightRailSection>
                
                <RightRailSection title="Linked RAMS" action={<button onClick={() => handleLinkItem('RAMS')} className="text-sm font-medium text-blue-600 hover:underline">Link</button>}>
                    <p className="text-xs text-gray-400 italic p-2">No linked RAMS.</p>
                </RightRailSection>

                <RightRailSection title="Linked PTWs" action={<button onClick={() => handleLinkItem('PTW')} className="text-sm font-medium text-blue-600 hover:underline">Link</button>}>
                    <p className="text-xs text-gray-400 italic p-2">No linked PTWs.</p>
                </RightRailSection>
            </aside>
        </div>

        <footer className="p-4 border-t bg-white dark:bg-dark-card dark:border-dark-border flex justify-between items-center flex-shrink-0">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={handleSaveDraft}>Save Draft</Button>
                <Button onClick={handleSaveAndSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Save & Submit for Review
                </Button>
            </div>
        </footer>
      </div>
    </div>
  );
};