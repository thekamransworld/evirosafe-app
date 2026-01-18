import React, { useState } from 'react';
import type { ChecklistTemplate, ChecklistItem } from '../types';
import { Button } from './ui/Button';
import { Plus, Trash2, X } from 'lucide-react';
import { useAppContext } from '../contexts';

interface ChecklistCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (template: ChecklistTemplate) => void;
}

export const ChecklistCreationModal: React.FC<ChecklistCreationModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { activeOrg } = useAppContext();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: '1', text: { en: '' }, description: { en: '' }, riskLevel: 'Low' }
  ]);

  const handleAddItem = () => {
    setItems(prev => [
      ...prev, 
      { id: Date.now().toString(), text: { en: '' }, description: { en: '' }, riskLevel: 'Low' }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'text' | 'description' | 'riskLevel', value: string) => {
    setItems(prev => {
      const newItems = [...prev];
      if (field === 'text' || field === 'description') {
          newItems[index] = { ...newItems[index], [field]: { en: value } };
      } else {
          // FIX: Cast string to specific risk level type
          newItems[index] = { ...newItems[index], [field]: value as 'Low' | 'Medium' | 'High' | 'Critical' };
      }
      return newItems;
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) return alert("Title is required");
    const validItems = items.filter(i => i.text.en && i.text.en.trim() !== '');
    if (validItems.length === 0) return alert("Add at least one checklist item");

    const newTemplate: ChecklistTemplate = {
      id: `ct_${Date.now()}`,
      org_id: activeOrg.id,
      category,
      title: { en: title },
      items: validItems,
      popularity: 0,
      estimatedTime: validItems.length * 2,
      aiGenerated: false
    };

    onSubmit(newTemplate);
    onClose();
    setTitle('');
    setCategory('General');
    setItems([{ id: '1', text: { en: '' }, description: { en: '' }, riskLevel: 'Low' }]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Custom Checklist</h2>
          <button onClick={onClose}><X className="w-6 h-6 text-gray-500" /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Checklist Title</label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="e.g. Daily Crane Inspection" 
                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              >
                <option>General</option>
                <option>Safety</option>
                <option>Quality</option>
                <option>Environmental</option>
                <option>Maintenance</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Checklist Items</label>
              <button onClick={handleAddItem} className="text-blue-600 text-sm font-bold flex items-center hover:underline">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                  <span className="text-slate-400 mt-2 text-sm">{idx + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <input 
                      placeholder="Requirement / Question" 
                      value={item.text.en} 
                      onChange={e => handleItemChange(idx, 'text', e.target.value)}
                      className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <input 
                        placeholder="Description / Guidance (Optional)" 
                        value={item.description.en} 
                        onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 p-2 text-xs border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      />
                      <select 
                        value={item.riskLevel} 
                        onChange={e => handleItemChange(idx, 'riskLevel', e.target.value)}
                        className="p-2 text-xs border rounded w-24 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveItem(idx)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Checklist</Button>
        </div>
      </div>
    </div>
  );
};