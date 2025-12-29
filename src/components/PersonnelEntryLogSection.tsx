import React from 'react';
import type { PersonnelEntryLogEntry } from '../types';
import { Button } from './ui/Button';

interface PersonnelEntryLogSectionProps {
  entries: PersonnelEntryLogEntry[];
  onChange: (entries: PersonnelEntryLogEntry[]) => void;
  disabled: boolean;
}

export const PersonnelEntryLogSection: React.FC<PersonnelEntryLogSectionProps> = ({ entries, onChange, disabled }) => {
  const addRow = () => {
    onChange([...entries, { name: '', time_in: '', time_out: '' }]);
  };

  const updateRow = (index: number, field: keyof PersonnelEntryLogEntry, value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    onChange(newEntries);
  };

  const removeRow = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  return (
    <div className="border rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-gray-800 dark:text-gray-200">Personnel Entry/Exit Log</h4>
        {!disabled && <Button size="sm" onClick={addRow}>+ Add Person</Button>}
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            <th className="p-2">Name</th>
            <th className="p-2">Time In</th>
            <th className="p-2">Time Out</th>
            {!disabled && <th className="p-2"></th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b dark:border-gray-700">
              <td className="p-2"><input type="text" value={entry.name} onChange={e => updateRow(i, 'name', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1" placeholder="Name" /></td>
              <td className="p-2"><input type="time" value={entry.time_in} onChange={e => updateRow(i, 'time_in', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1" /></td>
              <td className="p-2"><input type="time" value={entry.time_out} onChange={e => updateRow(i, 'time_out', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1" /></td>
              {!disabled && <td className="p-2"><button onClick={() => removeRow(i)} className="text-red-500">×</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};