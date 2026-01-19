import React from 'react';
import { Inspection } from '../../../types';

interface Step5Props {
  formData: Partial<Inspection>;
  setFormData: (data: Partial<Inspection>) => void;
}

export const Step5Execution: React.FC<Step5Props> = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Checklist Execution</h3>
        <p className="text-gray-500">
            The checklist execution will be available once the inspection is created.
        </p>
      </div>
    </div>
  );
};