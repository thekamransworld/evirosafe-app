import React from 'react';
import { Inspection } from '../../../types';

interface Step3Props {
  formData: Partial<Inspection>;
  setFormData: (data: Partial<Inspection>) => void;
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
          value={formData.person_responsible_id || ''}
          onChange={(e) => {
            setFormData({
              ...formData,
              person_responsible_id: e.target.value
            });
          }}
          className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">Select Lead</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Team Members</label>
        <div className="flex flex-wrap gap-2">
            {users.map(u => (
                <button
                    key={u.id}
                    onClick={() => {
                        const current = formData.team_member_ids || [];
                        const newMembers = current.includes(u.id) 
                            ? current.filter(id => id !== u.id)
                            : [...current, u.id];
                        setFormData({ ...formData, team_member_ids: newMembers });
                    }}
                    className={`px-3 py-1 rounded-full text-sm border ${
                        (formData.team_member_ids || []).includes(u.id)
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                >
                    {u.name}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};