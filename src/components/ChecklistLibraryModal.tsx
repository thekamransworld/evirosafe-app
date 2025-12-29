import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';
import { Search, Plus, Check } from 'lucide-react';
import { useAppContext, useDataContext } from '../contexts';
import type { ChecklistTemplate } from '../types';

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose }) => {
  const { activeOrg } = useAppContext();
  const { checklistTemplates, setChecklistTemplates } = useDataContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [importedIds, setImportedIds] = useState<string[]>([]);

  const categories = useMemo(() => {
    const cats = new Set(MASTER_CHECKLIST_LIBRARY.map(c => c.category));
    return ['All', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    return MASTER_CHECKLIST_LIBRARY.filter(t => {
      const matchesSearch = (t.title as any).en.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const handleImport = (template: ChecklistTemplate) => {
    // Check if already exists
    const exists = checklistTemplates.some(t => t.title['en'] === template.title['en']);
    
    if (!exists) {
      const newTemplate = {
        ...template,
        id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        org_id: activeOrg.id
      };
      // @ts-ignore
      setChecklistTemplates(prev => [...prev, newTemplate]);
      setImportedIds(prev => [...prev, template.id]);
    } else {
        setImportedIds(prev => [...prev, template.id]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checklist Library</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Import industry-standard checklists to your project.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const isImported = importedIds.includes(template.id);
              return (
                <div key={template.id} className="group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all hover:border-emerald-500/50">
                  <div className="flex justify-between items-start mb-3">
                    <Badge color="blue">{template.category}</Badge>
                    <span className="text-xs text-gray-500">{template.items.length} items</span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {(template.title as any).en}
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    {template.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        <span className="truncate">{(item.text as any).en}</span>
                      </div>
                    ))}
                    {template.items.length > 3 && (
                      <div className="text-xs text-gray-400 italic">+ {template.items.length - 3} more items</div>
                    )}
                  </div>

                  <Button 
                    className={`w-full ${isImported ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default' : ''}`}
                    onClick={() => !isImported && handleImport(template)}
                    variant={isImported ? 'secondary' : 'primary'}
                  >
                    {isImported ? (
                      <><Check className="w-4 h-4 mr-2" /> Imported</>
                    ) : (
                      <><Plus className="w-4 h-4 mr-2" /> Import Template</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};