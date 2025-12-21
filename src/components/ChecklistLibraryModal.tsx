import React, { useState, useMemo } from 'react';
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { MASTER_CHECKLIST_LIBRARY } from "../data/checklistLibrary";
import { Search, Check, X } from "lucide-react";
import { useAppContext } from "../contexts";

interface ChecklistLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedTemplates: any[]) => void;
}

export const ChecklistLibraryModal: React.FC<ChecklistLibraryModalProps> = ({ isOpen, onClose, onImport }) => {
    const { activeOrg } = useAppContext();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const categories = useMemo(() => {
        const cats = new Set(MASTER_CHECKLIST_LIBRARY.map(c => c.category));
        return ["All", ...Array.from(cats)];
    }, []);

    const filteredList = useMemo(() => {
        return MASTER_CHECKLIST_LIBRARY.filter(t => {
            const matchesSearch = t.title.en.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleImport = () => {
        // Clone and assign new IDs belonging to the current Org
        const templatesToImport = MASTER_CHECKLIST_LIBRARY
            .filter(t => selectedIds.includes(t.id))
            .map(t => ({
                ...t,
                id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                org_id: activeOrg.id,
                is_custom: false
            }));
        
        onImport(templatesToImport);
        // Reset selection
        setSelectedIds([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Checklist Library</h2>
                        <p className="text-gray-500 dark:text-gray-400">Browse 50+ industry standard HSE checklists</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-64 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-800 p-4 overflow-y-auto hidden md:block">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Categories</h3>
                        <div className="space-y-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input 
                                    type="text" 
                                    placeholder="Search library..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                            {filteredList.map(template => {
                                const isSelected = selectedIds.includes(template.id);
                                return (
                                    <div 
                                        key={template.id} 
                                        onClick={() => toggleSelect(template.id)}
                                        className={`cursor-pointer border-2 rounded-xl p-4 transition-all relative group ${isSelected ? 'border-emerald-500 bg-emerald-50/10 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700'}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <Badge color={template.category === 'High Risk' ? 'red' : 'gray'}>{template.category}</Badge>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                {isSelected && <Check className="w-4 h-4 text-white" />}
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">{template.title.en}</h3>
                                        <p className="text-xs text-gray-500">{template.items.length} Checkpoints</p>
                                        
                                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-xs text-gray-400 mb-1 uppercase font-semibold">Preview:</p>
                                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                {template.items.slice(0, 3).map((i, idx) => (
                                                    <li key={idx} className="truncate">• {i.text.en}</li>
                                                ))}
                                                {template.items.length > 3 && <li className="italic text-gray-400">+ {template.items.length - 3} more</li>}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center rounded-b-2xl shrink-0">
                    <span className="text-sm text-gray-500 font-medium">
                        {selectedIds.length} checklists selected
                    </span>
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