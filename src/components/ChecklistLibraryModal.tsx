import React, { useState, useMemo } from 'react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { MASTER_CHECKLIST_LIBRARY } from '../data/checklistLibrary';
import { Search, Plus, Check } from 'lucide-react';
import { useAppContext } from '../contexts';

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (templateIds: string[]) => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose, onImport }) => {
  const { activeOrg } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const categories = useMemo(() => {
    const cats = new Set(MASTER_CHECKLIST_LIBRARY.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, []);

  const filteredTemplates = useMemo(() => {
    return MASTER_CHECKLIST_LIBRARY.filter(t => {
      const title = (t.title as any)['en'] || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleImport = () => {
    onImport(selectedIds);
    onClose();
    setSelectedIds([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checklist Library</h2>
            <p className="text-gray-500 dark:text-gray-400">Browse 50+ industry standard HSE checklists</p>
          </div>
          <div className="flex gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm w-64 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Categories */}
            <div className="w-64 bg-gray-50 dark:bg-gray-800/50 border-r dark:border-gray-800 p-4 overflow-y-auto">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-2">Categories</h3>
                <div className="space-y-1">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategory === cat 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-100 dark:bg-black/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(tpl => {
                        const isSelected = selectedIds.includes(tpl.id);
                        return (
                            <div 
                                key={tpl.id} 
                                onClick={() => toggleSelection(tpl.id)}
                                className={`
                                    relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group
                                    ${isSelected 
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                                        : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge color={isSelected ? 'green' : 'gray'}>{tpl.category}</Badge>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{(tpl.title as any)['en']}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{tpl.items.length} Checkpoints</p>
                                
                                {/* Preview Items */}
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-2">Preview:</p>
                                    <ul className="space-y-1">
                                        {tpl.items.slice(0, 3).map((item, i) => (
                                            <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start">
                                                <span className="mr-1.5">•</span>
                                                <span className="truncate">{(item.text as any)['en']}</span>
                                            </li>
                                        ))}
                                        {tpl.items.length > 3 && <li className="text-xs text-gray-400 italic">+ {tpl.items.length - 3} more</li>}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedIds.length} checklists selected
            </div>
            <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleImport} disabled={selectedIds.length === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Import Selected ({selectedIds.length})
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};