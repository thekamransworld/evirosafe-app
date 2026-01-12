import React from 'react';
// FIX: Updated import path
import { HSEInspection } from '../../../types';

interface Step2Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
}

export const Step2Planning: React.FC<Step2Props> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Schedule & Frequency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input
              type="date"
              value={formData.schedule?.scheduled_date ? new Date(formData.schedule.scheduled_date).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({
                ...formData,
                schedule: { ...formData.schedule!, scheduled_date: new Date(e.target.value) }
              })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
            <input
              type="time"
              value={formData.schedule?.scheduled_time}
              onChange={(e) => setFormData({
                ...formData,
                schedule: { ...formData.schedule!, scheduled_time: e.target.value }
              })}
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
};