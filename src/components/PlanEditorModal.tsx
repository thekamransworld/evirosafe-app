import React, { useState, useEffect, useRef } from 'react';
import type { Plan, PlanContentSection, PlanStatus } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAppContext } from '../contexts';
import { 
  Sparkles, Plus, Link, Paperclip,
  Eye, EyeOff, Save, Send,
  MessageSquare, Users, Clock, CheckCircle,
  AlertTriangle, X
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';

interface PlanEditorModalProps {
  plan: Plan;
  onClose: () => void;
  onSave: (plan: Plan) => void;
  onSubmitForReview: (planId: string, newStatus: PlanStatus) => void;
  onAIGenerateSection?: (sectionTitle: string, context: string) => Promise<string>;
}

export const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ 
  plan, onClose, onSave, onSubmitForReview, onAIGenerateSection 
}) => {
  const [editedPlan, setEditedPlan] = useState<Plan>(JSON.parse(JSON.stringify(plan)));
  const [activeSection, setActiveSection] = useState<PlanContentSection | null>(editedPlan.content.body_json[0] || null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSection) {
      const words = activeSection.content.split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(words);
    }
  }, [activeSection]);

  const handleSectionContentChange = (newContent: string) => {
    if (!activeSection) return;
    const newSections = editedPlan.content.body_json.map(s => 
      s.title === activeSection.title ? { ...s, content: newContent } : s
    );
    setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
    setActiveSection(s => s ? { ...s, content: newContent } : null);
  };

  const handleAddSection = () => {
    const newSection: PlanContentSection = {
      title: `New Section ${editedPlan.content.body_json.length + 1}`,
      content: '',
      is_complete: false
    };
    const newSections = [...editedPlan.content.body_json, newSection];
    setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
    setActiveSection(newSection);
  };

  const handleAIGenerate = async () => {
    if (!activeSection || !onAIGenerateSection) return;
    
    setIsGeneratingAI(true);
    try {
      const aiContent = await onAIGenerateSection(
        activeSection.title,
        editedPlan.title + " " + editedPlan.type + " " + editedPlan.meta.description
      );
      
      if (aiContent) {
        handleSectionContentChange(aiContent);
      }
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const completionPercentage = editedPlan.content.body_json.length > 0
    ? Math.round((editedPlan.content.body_json.filter(s => s.is_complete).length / editedPlan.content.body_json.length) * 100)
    : 0;

  const handleSaveAndSubmit = () => {
    onSave(editedPlan);
    onSubmitForReview(editedPlan.id, 'under_review');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <header className="p-4 border-b bg-white dark:bg-gray-800 flex justify-between items-center">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Editing: <span className="text-blue-600">{editedPlan.title}</span>
            </h2>
            <div className="flex items-center space-x-4 mt-1 text-sm">
              <Badge color={completionPercentage >= 80 ? 'green' : completionPercentage >= 50 ? 'blue' : 'amber'}>
                {completionPercentage}% Complete
              </Badge>
              <span className="text-gray-500">v{editedPlan.version}</span>
              <span className="text-gray-500">{editedPlan.type}</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Preview
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-grow flex overflow-hidden">
          {/* Left Sidebar - Sections */}
          <nav className="w-64 bg-white dark:bg-gray-800 border-r overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Sections</h3>
              <Button size="sm" onClick={handleAddSection}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-1">
              {editedPlan.content.body_json.map(section => (
                <button
                  key={section.title}
                  onClick={() => setActiveSection(section)}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
                    activeSection?.title === section.title
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{section.title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {section.content ? `${section.content.split(' ').length} words` : 'Empty'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {section.is_complete ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Progress Section */}
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    completionPercentage >= 80 ? 'bg-green-500' :
                    completionPercentage >= 50 ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>
                  {editedPlan.content.body_json.filter(s => s.is_complete).length} of {editedPlan.content.body_json.length} sections
                </span>
                <span>{wordCount} words</span>
              </div>
            </div>
          </nav>

          {/* Center Editor */}
          <main className="flex-1 p-6 overflow-y-auto">
            {activeSection ? (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    value={activeSection.title}
                    onChange={(e) => {
                      const newSections = editedPlan.content.body_json.map(s =>
                        s.title === activeSection.title ? { ...s, title: e.target.value } : s
                      );
                      setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
                      setActiveSection(s => s ? { ...s, title: e.target.value } : null);
                    }}
                    className="text-2xl font-bold bg-transparent border-0 focus:ring-0 w-full"
                    placeholder="Section Title"
                  />
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeSection.is_complete}
                        onChange={(e) => {
                          const newSections = editedPlan.content.body_json.map(s =>
                            s.title === activeSection.title ? { ...s, is_complete: e.target.checked } : s
                          );
                          setEditedPlan(p => ({ ...p, content: { ...p.content, body_json: newSections } }));
                          setActiveSection(s => s ? { ...s, is_complete: e.target.checked } : null);
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Mark as Complete
                    </label>
                  </div>
                </div>

                {showPreview ? (
                  <div className="border rounded-lg p-6 bg-white dark:bg-gray-800 flex-1 overflow-y-auto">
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeSection.content || '*No content yet*'}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden flex-1 flex flex-col">
                    <div className="border-b bg-gray-50 dark:bg-gray-800 p-2 flex justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Markdown Editor</span>
                        <Badge size="sm" color="blue">Live Preview</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAIGenerate}
                        disabled={isGeneratingAI}
                        className={isGeneratingAI ? 'opacity-50 cursor-not-allowed' : ''}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {isGeneratingAI ? 'Generating...' : 'AI Generate'}
                      </Button>
                    </div>
                    <div className="flex-1" data-color-mode="light">
                      <MDEditor
                        value={activeSection.content}
                        onChange={(val) => handleSectionContentChange(val || '')}
                        height="100%"
                        preview="live"
                        visibleDragbar={false}
                        textareaProps={{
                          placeholder: "Write your section content here... You can use markdown for formatting."
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <FileText className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg">Select a section to begin editing</p>
                <p className="text-sm mt-2">Or create a new section to get started</p>
                <Button className="mt-4" onClick={handleAddSection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Section
                </Button>
              </div>
            )}
          </main>

          {/* Right Sidebar - Tools & Metadata */}
          <aside className="w-80 bg-white dark:bg-gray-800 border-l p-4 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tools & References</h3>
            
            {/* AI Assistant */}
            <div className="mb-6 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
              <div className="flex items-center mb-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
                <h4 className="font-semibold text-purple-700 dark:text-purple-300">AI Assistant</h4>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400 mb-3">
                Get AI suggestions for this section
              </p>
              <div className="space-y-2">
                <Button size="sm" variant="outline" className="w-full" onClick={() => console.log('Improve grammar')}>
                  ✨ Improve Grammar
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => console.log('Expand section')}>
                  📝 Expand Section
                </Button>
                <Button size="sm" variant="outline" className="w-full" onClick={() => console.log('Add compliance')}>
                  🛡️ Add Compliance
                </Button>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Templates</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Scope', 'Responsibilities', 'Procedure', 'Training', 'Monitoring', 'References'].map(template => (
                  <button
                    key={template}
                    onClick={() => handleSectionContentChange(activeSection?.content + `\n\n## ${template}\n\n[Content for ${template} section]`)}
                    className="p-2 text-sm border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {/* Linked Documents */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Linked Documents</h4>
                <Button size="sm" variant="ghost">
                  <Link className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {editedPlan.content.attachments.map(att => (
                  <div key={att.name} className="flex items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <Paperclip className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm truncate">{att.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center justify-between w-full p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
              >
                <span className="font-semibold text-gray-700 dark:text-gray-300">Comments</span>
                <MessageSquare className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="p-4 border-t bg-white dark:bg-gray-800 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => onSave(editedPlan)}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              Last saved: {new Date().toLocaleTimeString()}
            </span>
            <Button onClick={handleSaveAndSubmit} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};