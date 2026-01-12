import React from 'react';
// FIX: Updated import path
import { ChecklistTemplate } from '../../../types';

interface Step4Props {
  templates: ChecklistTemplate[];
  selectedTemplateId: string;
  onSelect: (id: string) => void;
}

export const Step4Checklist: React.FC<Step4Props> = ({ templates, selectedTemplateId, onSelect }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Checklist</h3>
      <div className="space-y-2">
        {templates.map(tpl => {
            // Handle title translation safely
            const title = typeof tpl.title === 'string' 
                ? tpl.title 
                // @ts-ignore
                : (tpl.title['en'] || Object.values(tpl.title)[0]);

            return (
                <div 
                    key={tpl.id} 
                    onClick={() => onSelect(tpl.id)}
                    className={`p-3 border rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                        selectedTemplateId === tpl.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                >
                    <span className="text-gray-700 dark:text-gray-200 font-medium">{title}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedTemplateId === tpl.id ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
                    }`}>
                        {selectedTemplateId === tpl.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                </div>
            );
        })}
        {templates.length === 0 && (
            <p className="text-gray-500 italic text-center py-4">No templates available for this inspection type.</p>
        )}
      </div>
    </div>
  );
};