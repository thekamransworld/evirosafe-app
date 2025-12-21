import React, { useState } from 'react';
import type { ChecklistTemplate, ChecklistItem } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { useAppContext, useDataContext } from '../contexts';

interface ChecklistBuilderProps {
  onClose: () => void;
  onSave: (template: ChecklistTemplate) => void;
}

export const ChecklistBuilder: React.FC<ChecklistBuilderProps> = ({ onClose, onSave }) => {
  const { activeOrg } = useAppContext();
  const { checklistTemplates } = useDataContext();

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [category, setCategory] = useState('General');
  const [items, setItems] = useState<Omit<ChecklistItem, 'id'>[]>([
      { text: { en: '', ar: '' }, description: { en: '', ar: '' } }
  ]);

  const handleItemChange = (index: number, field: 'text' | 'description', lang: 'en' | 'ar', value: string) => {
    const newItems = [...items];
    newItems[index][field][lang] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { text: { en: '', ar: '' }, description: { en: '', ar: '' } }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!titleEn) return alert('Please enter a checklist title.');
    
    const newTemplate: ChecklistTemplate = {
        id: `ct_custom_${Date.now()}`,
        org_id: activeOrg.id,
        category,
        title: { en: titleEn, ar: titleAr || titleEn },
        items: items.map((item, idx) => ({
            id: `ci_${Date.now()}_${idx}`,
            text: { en: item.text.en, ar: item.text.ar || item.text.en },
            description: { en: item.description.en, ar: item.description.ar || item.description.en }
        }))
    };
    
    onSave(newTemplate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b dark:border-dark-border flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Checklist Builder</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-red-500">Close</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title (English)</label>
                    <input 
                        className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border"
                        placeholder="e.g. Weekly Scaffold Check"
                        value={titleEn}
                        onChange={e => setTitleEn(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Title (Arabic) - Optional</label>
                    <input 
                        className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border text-right"
                        placeholder="...الاسم بالعربي"
                        value={titleAr}
                        onChange={e => setTitleAr(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Category</label>
                    <select 
                        className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                    >
                        <option>General</option>
                        <option>Safety</option>
                        <option>High Risk</option>
                        <option>Environmental</option>
                        <option>Quality</option>
                        <option>Fire</option>
                    </select>
                </div>
            </div>

            <div className="border-t dark:border-dark-border pt-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white">Checklist Items</h3>
                    <Button size="sm" variant="secondary" onClick={addItem} leftIcon={<PlusIcon className="w-4 h-4"/>}>Add Item</Button>
                </div>

                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-dark-background rounded-lg border dark:border-dark-border group">
                            <span className="text-gray-400 font-mono mt-2">{idx + 1}</span>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <input 
                                        placeholder="Item Check (English)" 
                                        className="w-full p-2 text-sm border rounded dark:bg-dark-card dark:border-dark-border"
                                        value={item.text.en}
                                        onChange={e => handleItemChange(idx, 'text', 'en', e.target.value)}
                                    />
                                    <input 
                                        placeholder="Description / Guide (English)" 
                                        className="w-full p-2 text-xs border rounded text-gray-600 dark:bg-dark-card dark:border-dark-border"
                                        value={item.description.en}
                                        onChange={e => handleItemChange(idx, 'description', 'en', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        placeholder="عنصر التحقق (عربي)" 
                                        className="w-full p-2 text-sm border rounded text-right dark:bg-dark-card dark:border-dark-border"
                                        value={item.text.ar}
                                        onChange={e => handleItemChange(idx, 'text', 'ar', e.target.value)}
                                    />
                                    <input 
                                        placeholder="وصف (عربي)" 
                                        className="w-full p-2 text-xs border rounded text-gray-600 text-right dark:bg-dark-card dark:border-dark-border"
                                        value={item.description.ar}
                                        onChange={e => handleItemChange(idx, 'description', 'ar', e.target.value)}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => removeItem(idx)}
                                className="p-2 text-gray-400 hover:text-red-500 mt-1 opacity-50 group-hover:opacity-100"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 border-t dark:border-dark-border bg-gray-50 dark:bg-dark-background flex justify-end gap-3 rounded-b-xl">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Custom Template</Button>
        </div>
      </div>
    </div>
  );
};