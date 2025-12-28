import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';
import { useAppContext, useDataContext } from '../contexts';
import type { ChecklistTemplate } from '../types';

// Icons
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose }) => {
  const { activeOrg } = useAppContext();
  const { checklistTemplates, setChecklistTemplates } = useDataContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const cats = new Set(MASTER_CHECKLIST_LIBRARY.map(c => c.category));
    return ['All', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    return MASTER_CHECKLIST_LIBRARY.filter(t => {
      // Safe access to title.en
      const titleStr = (t.title as any)['en'] || 'Untitled';
      const matchesSearch = titleStr.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const isImported = (template: ChecklistTemplate) => {
     // Check by title to avoid ID conflicts since IDs in library are static
     const titleStr = (template.title as any)['en'];
     return checklistTemplates.some(t => {
         const tTitle = (t.title as any)['en'] || t.title;
         return tTitle === titleStr;
     });
  };

  const handleImport = (template: ChecklistTemplate) => {
    if (isImported(template)) return;

    const newTemplate = {
      ...template,
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      org_id: activeOrg.id
    };

    setChecklistTemplates(prev => [newTemplate, ...prev]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Global Checklist Library</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Browse and import industry-standard HSE checklists.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
            <XIcon />
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 bg-gray-50 dark:bg-slate-800/50 shrink-0">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
            </div>
            <input 
              type="text" 
              placeholder="Search templates..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(t => {
              const imported = isImported(t);
              const title = (t.title as any)['en'];
              
              return (
                <div key={t.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-lg transition-all bg-white dark:bg-slate-800 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <Badge color="blue">{t.category}</Badge>
                    {imported && <Badge color="green">Imported</Badge>}
                  </div>
                  
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">{title}</h3>
                  
                  <div className="flex-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        {t.items.length} checkpoints included
                      </p>
                      <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                          {t.items.slice(0, 3).map((i, idx) => (
                              <li key={idx} className="truncate">• {(i.text as any)['en']}</li>
                          ))}
                          {t.items.length > 3 && <li>+ {t.items.length - 3} more...</li>}
                      </ul>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button 
                      className="w-full justify-center" 
                      variant={imported ? "secondary" : "primary"}
                      disabled={imported}
                      onClick={() => handleImport(t)}
                    >
                      {imported ? (
                        <><CheckIcon /> <span className="ml-2">Added</span></>
                      ) : (
                        <><PlusIcon /> <span className="ml-2">Import Template</span></>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No templates found matching your search.
              </div>
          )}
        </div>

      </div>
    </div>
  );
};