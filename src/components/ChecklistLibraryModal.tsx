import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';
import { Search, Plus, Check } from 'lucide-react';
import { useAppContext } from '../contexts';
import type { ChecklistTemplate } from '../types';

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (template: ChecklistTemplate) => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose, onImport }) => {
  const { activeOrg } = useAppContext();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [importedIds, setImportedIds] = useState<string[]>([]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(MASTER_CHECKLIST_LIBRARY.map(c => c.category)))], []);

  const filteredTemplates = useMemo(() => {
    return MASTER_CHECKLIST_LIBRARY.filter(t => {
      const matchesSearch = (t.title as any)['en'].toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter]);

  const handleImport = (template: ChecklistTemplate) => {
    // Create a copy for the organization
    const newTemplate = {
        ...template,
        id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        org_id: activeOrg.id
    };
    onImport(newTemplate);
    setImportedIds(prev => [...prev, template.id]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checklist Library</h2>
                <p className="text-sm text-gray-500">Browse and import industry-standard HSE checklists.</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <span className="text-2xl">&times;</span>
            </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex gap-4 items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search templates..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
            </div>
            <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                    <div key={template.id} className="border dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <Badge color="blue">{template.category}</Badge>
                            <span className="text-xs text-gray-400">{template.items.length} items</span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{(template.title as any)['en']}</h3>
                        <div className="flex-1">
                            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
                                {template.items.slice(0, 3).map((item, i) => (
                                    <li key={i} className="truncate">• {(item.text as any)['en']}</li>
                                ))}
                                {template.items.length > 3 && <li className="italic">+ {template.items.length - 3} more...</li>}
                            </ul>
                        </div>
                        <Button 
                            onClick={() => handleImport(template)} 
                            disabled={importedIds.includes(template.id)}
                            variant={importedIds.includes(template.id) ? 'secondary' : 'primary'}
                            className="w-full"
                        >
                            {importedIds.includes(template.id) ? (
                                <><Check className="w-4 h-4 mr-2" /> Imported</>
                            ) : (
                                <><Plus className="w-4 h-4 mr-2" /> Import Template</>
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};