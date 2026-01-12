import React from 'react';
// FIX: Updated import path
import { HSEInspection } from '../../../types';

interface Step3Props {
  formData: Partial<HSEInspection>;
  setFormData: (data: Partial<HSEInspection>) => void;
  users: any[];
  contractors: any[];
}

export const Step3Team: React.FC<Step3Props> = ({ formData, setFormData, users }) => {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Inspection Team</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Inspector</label>
        <select
          value={formData.inspection_team?.team_lead?.id}
          onChange={(e) => {
            const user = users.find(u => u.id === e.target.value);
            if (user) {
              setFormData({
                ...formData,
                inspection_team: {
                  ...formData.inspection_team!,
                  team_lead: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    qualification: 'N/A',
                    contact: { email: user.email, phone: '' }
                  }
                }
              });
            }
          }}
          className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Select Lead</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
    </div>
  );
};