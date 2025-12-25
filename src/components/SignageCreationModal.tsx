import React, { useState, useEffect } from 'react';
import type { Sign, SignCategory, HazardType, PtwType } from '../types';
import { Button } from './ui/Button';
import { FormField } from './ui/FormField';
import { signageConfig, ptwTypeDetails } from '../config';

interface SignageCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Sign, 'id' | 'org_id'>) => void;
  initialData?: Sign | null;
}

const HAZARDS: HazardType[] = ['Fire', 'Fall', 'Electrical', 'Chemical', 'Noise', 'Dropped Object', 'Overhead Load', 'Trip', 'Slippery', 'Explosion', 'Moving Machinery', 'Confined Space', 'Excavation'];

export const SignageCreationModal: React.FC<SignageCreationModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Mandatory' as SignCategory,
    icon_url: '⚠️', // Default emoji
    description: '',
    matched_activities: [] as string[],
    hazards: [] as string[],
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title['en'] || '',
        category: initialData.category,
        icon_url: initialData.icon_url,
        description: initialData.description['en'] || '',
        matched_activities: initialData.matched_activities,
        hazards: initialData.hazards,
      });
    } else {
        // Reset
        setFormData({
            title: '',
            category: 'Mandatory',
            icon_url: '⚠️',
            description: '',
            matched_activities: [],
            hazards: [],
        });
    }
  }, [initialData, isOpen]);

  const handleSubmit = () => {
    if (!formData.title || !formData.icon_url) {
        alert("Title and Icon are required.");
        return;
    }

    const signData: Omit<Sign, 'id' | 'org_id'> = {
        category: formData.category,
        title: { en: formData.title },
        description: { en: formData.description },
        icon_url: formData.icon_url,
        matched_activities: formData.matched_activities,
        hazards: formData.hazards,
    };

    onSubmit(signData);
    onClose();
  };

  const toggleSelection = (list: string[], item: string, field: 'matched_activities' | 'hazards') => {
      const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
      setFormData(prev => ({ ...prev, [field]: newList }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b dark:border-dark-border">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {initialData ? 'Edit Sign' : 'Add New Sign'}
          </h3>
        </div>
        
        <div className="p-6 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
                <FormField label="Sign Category">
                    <select 
                        value={formData.category} 
                        onChange={e => setFormData(p => ({...p, category: e.target.value as SignCategory}))}
                        className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                    >
                        {Object.keys(signageConfig).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </FormField>
                <FormField label="Icon / Emoji">
                    <input 
                        type="text" 
                        value={formData.icon_url} 
                        onChange={e => setFormData(p => ({...p, icon_url: e.target.value}))}
                        className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white text-center text-2xl"
                        placeholder="e.g. ⚠️"
                    />
                </FormField>
            </div>

            <FormField label="Sign Title (English)">
                <input 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                    className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                    placeholder="e.g. Wear Safety Helmet"
                />
            </FormField>

            <FormField label="Description">
                <textarea 
                    rows={2}
                    value={formData.description} 
                    onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                    className="w-full p-2 border rounded-md dark:bg-dark-background dark:border-dark-border dark:text-white"
                    placeholder="Brief explanation of the sign..."
                />
            </FormField>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Related Hazards</label>
                <div className="flex flex-wrap gap-2">
                    {HAZARDS.map(h => (
                        <button
                            key={h}
                            onClick={() => toggleSelection(formData.hazards, h, 'hazards')}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                formData.hazards.includes(h) 
                                ? 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-400'
                            }`}
                        >
                            {h}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Required for Activities</label>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(ptwTypeDetails).map(act => (
                        <button
                            key={act}
                            onClick={() => toggleSelection(formData.matched_activities, act, 'matched_activities')}
                            className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                                formData.matched_activities.includes(act) 
                                ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                                : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-white/5 dark:border-white/10 dark:text-gray-400'
                            }`}
                        >
                            {act}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 border-t dark:border-dark-border flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>{initialData ? 'Update Sign' : 'Create Sign'}</Button>
        </div>
      </div>
    </div>
  );
};