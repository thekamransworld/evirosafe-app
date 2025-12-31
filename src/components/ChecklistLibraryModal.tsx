import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';
import { Search, Plus, Check } from 'lucide-react';
import { useAppContext } from '../contexts';

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (template: any) => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose, onImport }) => {
  const { activeOrg } = useAppContext();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [importedIds, setImportedIds] = useState<string[]>([]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(MASTER_CHECKLIST_LIBRARY.map(t => t.category)))], []);

  const filteredTemplates = useMemo(() => {
    return MASTER_CHECKLIST_LIBRARY.filter(t => {
      const matchesSearch = t.title.en.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  const handleImport = (template: typeof MASTER_CHECKLIST_LIBRARY[0], index: number) => {
    // Create a new template object for the organization
    const newTemplate = {
      ...template,
      org_id: activeOrg.id,
      // Generate a unique ID for the new template
      id: `ct_${Date.now()}_${index}` 
    };
    
    onImport(newTemplate);
    setImportedIds(prev => [...prev, template.title.en]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checklist Library</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Import industry-standard checklists to your project.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search templates..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template, index) => {
              const isImported = importedIds.includes(template.title.en);
              return (
                <div key={index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-lg transition-shadow flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <Badge color="blue">{template.category}</Badge>
                    <span className="text-xs text-gray-400">{template.items.length} items</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{template.title.en}</h3>
                  <div className="flex-1">
                    <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                      {template.items.slice(0, 3).map(item => (
                        <li key={item.id} className="truncate">• {item.text.en}</li>
                      ))}
                      {template.items.length > 3 && <li className="text-xs italic">+ {template.items.length - 3} more...</li>}
                    </ul>
                  </div>
                  <Button 
                    onClick={() => handleImport(template, index)} 
                    disabled={isImported}
                    className={`w-full justify-center ${isImported ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' : ''}`}
                    variant={isImported ? 'outline' : 'primary'}
                  >
                    {isImported ? (
                      <>
                        <Check className="w-4 h-4 mr-2" /> Imported
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" /> Import Template
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};