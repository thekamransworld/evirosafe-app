import React from 'react';
import { HSEInspection } from '../../../types/hse-inspection';

interface Step4Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
  templates: any[];
}

export const Step4Checklist: React.FC<Step4Props> = ({ formData, setFormData, templates }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Checklist</h3>
      <div className="space-y-2">
        {templates.map(tpl => (
            <div key={tpl.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                <span>{tpl.title.en || tpl.title}</span>
                <button className="text-blue-600 text-sm font-medium">Select</button>
            </div>
        ))}
      </div>
    </div>
  );
};