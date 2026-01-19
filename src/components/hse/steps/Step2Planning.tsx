import React from 'react';
import { Inspection } from '../../../types';

interface Step2Props {
  formData: Partial<Inspection>;
  setFormData: (data: Partial<Inspection>) => void;
}

export const Step2Planning: React.FC<Step2Props> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Schedule & Frequency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={formData.schedule_at || ''}
              onChange={(e) => setFormData({
                ...formData,
                schedule_at: e.target.value
              })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};