import React, { useState, useEffect } from 'react';
import type { Plan, PlanContentSection, PlanStatus } from '../types';
import { Button } from './ui/Button';
import ReactMarkdown from 'react-markdown';

interface PlanEditorModalProps {
  plan: Plan;
  onClose: () => void;
  onSave: (plan: Plan) => void;
  onSubmitForReview: (planId: string, newStatus: PlanStatus) => void;
}

const RightRailSection: React.FC<{ title: string, children: React.ReactNode, action?: React.ReactNode }> = ({ title, children, action }) => (
    <div>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold uppercase text-gray-500">{title}</h3>
            {action}
        </div>
        <div className="p-3 bg-white border rounded-md space-y-2">
            {children}
        </div>
    </div>
);

export const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ plan, onClose, onSave, onSubmitForReview }) => {
  const [editedPlan, setEditedPlan] = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [activeSection, setActiveSection] = useState<PlanContentSection | null>(editedPlan.content.body_json[0] || null);

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

  const handleSaveAndSubmit = () => {
    onSave(editedPlan);
    onSubmitForReview(editedPlan.id, 'under_review');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b bg-white flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Plan Editor: {editedPlan.title}</h2>
            <p className="text-sm text-gray-500">Status: Draft</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <div className="flex-grow flex overflow-hidden">
            {/* Left Navigation */}
            <nav className="w-72 bg-white border-r overflow-y-auto p-4 flex-shrink-0">
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 px-2">Sections</h3>
                <ul>
                    {editedPlan.content.body_json.map(section => (
                        <li key={section.title}>
                            <button
                                onClick={() => setActiveSection(section)}
                                className={`w-full text-left p-2 rounded-md text-sm flex items-center justify-between ${activeSection?.title === section.title ? 'bg-primary-100 text-primary-700 font-semibold' : 'hover:bg-gray-100'}`}
                            >
                                <span className="truncate pr-2">{section.title}</span>
                                <input 
                                    type="checkbox" 
                                    checked={section.is_complete}
                                    onChange={(e) => handleSectionCompletionChange(section.title, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-4 w-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                                />
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Center Content Editor */}
            <main className="flex-1 p-6 overflow-y-auto">
                {activeSection ? (
                    <div>
                        <input 
                            type="text" 
                            value={activeSection.title} 
                            readOnly 
                            className="text-2xl font-bold w-full bg-transparent focus:outline-none mb-4"
                        />
                        <textarea 
                            value={activeSection.content}
                            onChange={(e) => handleSectionContentChange(e.target.value)}
                            className="w-full h-[60vh] p-4 border rounded-md font-mono text-sm leading-6"
                            placeholder="Enter section content here. Markdown is supported."
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a section to begin editing.</p>
                    </div>
                )}
            </main>

            {/* Right Metadata Rail */}
            <aside className="w-80 bg-gray-50 border-l p-4 overflow-y-auto flex-shrink-0 space-y-4">
                <RightRailSection title="Metadata">
                    <div className="text-sm space-y-2">
                        <div>
                            <label className="font-semibold">Version</label>
                            <input type="text" value={editedPlan.version} onChange={e => setEditedPlan(p => ({...p, version: e.target.value}))} className="w-full p-1.5 border rounded-md mt-1"/>
                        </div>
                         <div>
                            <label className="font-semibold">Tags</label>
                            <input type="text" value={editedPlan.meta.tags?.join(', ') || ''} onChange={e => handleMetaChange('tags', e.target.value.split(',').map(t=>t.trim()))} className="w-full p-1.5 border rounded-md mt-1"/>
                        </div>
                    </div>
                </RightRailSection>

                <RightRailSection title="Attachments" action={<Button size="sm" variant="ghost">+</Button>}>
                    {editedPlan.content.attachments.map(att => (
                        <div key={att.name} className="flex items-center text-sm">
                            <PaperClipIcon className="w-4 h-4 mr-2 text-gray-400 shrink-0"/>
                            <span className="truncate">{att.name}</span>
                        </div>
                    ))}
                    {editedPlan.content.attachments.length === 0 && <p className="text-xs text-gray-500">No attachments.</p>}
                </RightRailSection>
                
                <RightRailSection title="Linked RAMS" action={<Button size="sm" variant="ghost">Link</Button>}>
                    <p className="text-xs text-gray-500">No linked RAMS.</p>
                </RightRailSection>
                <RightRailSection title="Linked PTWs" action={<Button size="sm" variant="ghost">Link</Button>}>
                    <p className="text-xs text-gray-500">No linked PTWs.</p>
                </RightRailSection>
                 <RightRailSection title="Linked Checklists" action={<Button size="sm" variant="ghost">Link</Button>}>
                    <p className="text-xs text-gray-500">No linked checklists.</p>
                </RightRailSection>
                 <RightRailSection title="Linked Trainings" action={<Button size="sm" variant="ghost">Link</Button>}>
                    <p className="text-xs text-gray-500">No linked trainings.</p>
                </RightRailSection>

            </aside>
        </div>

        <footer className="p-4 border-t bg-white flex justify-between items-center flex-shrink-0 space-x-2">
            <div>
                 <Button variant="secondary" onClick={onClose}>Cancel</Button>
            </div>
            <div>
                <Button variant="secondary" onClick={() => onSave(editedPlan)}>Save Draft</Button>
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