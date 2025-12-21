import React, { useState } from 'react';
import type { PersonnelEntryLogEntry } from '../types';
import { Button } from './ui/Button';

interface PersonnelEntryLogSectionProps {
  entries: PersonnelEntryLogEntry[];
  onChange: (entries: PersonnelEntryLogEntry[]) => void;
  disabled: boolean;
}

export const PersonnelEntryLogSection: React.FC<PersonnelEntryLogSectionProps> = ({ entries, onChange, disabled }) => {
  const [newEntry, setNewEntry] = useState<PersonnelEntryLogEntry>({
    name: '',
    time_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    time_out: ''
  });

  const handleAdd = () => {
    if (!newEntry.name) return alert("Entrant name is required");
    onChange([...entries, newEntry]);
    setNewEntry({ ...newEntry, name: '', time_in: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), time_out: '' });
  };

  const handleUpdateOut = (index: number, timeOut: string) => {
    const updated = [...entries];
    updated[index].time_out = timeOut;
    onChange(updated);
  };

  return (
    <div className="mb-6 border rounded-lg p-4 bg-white dark:bg-dark-card dark:border-dark-border">
      <h4 className="font-bold text-base text-gray-800 dark:text-gray-200 mb-3">Confined Space Entry/Exit Log</h4>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-3">Entrant Name</th>
              <th className="p-3">Time In</th>
              <th className="p-3">Time Out</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry, idx) => (
              <tr key={idx}>
                <td className="p-3 font-medium text-gray-900 dark:text-white">{entry.name}</td>
                <td className="p-3 text-gray-600 dark:text-gray-300">{entry.time_in}</td>
                <td className="p-3">
                  {entry.time_out ? (
                    <span className="text-gray-600 dark:text-gray-300">{entry.time_out}</span>
                  ) : (
                    <input 
                        type="time" 
                        disabled={disabled}
                        className="p-1 border rounded text-xs dark:bg-dark-background dark:border-dark-border dark:text-white"
                        onChange={(e) => handleUpdateOut(idx, e.target.value)}
                    />
                  )}
                </td>
                <td className="p-3">
                    {entry.time_out ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Exited</span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 animate-pulse">Inside</span>
                    )}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">No personnel currently logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <div className="mt-4 flex gap-2 items-end bg-gray-50 dark:bg-white/5 p-3 rounded-lg">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Entrant Name</label>
            <input type="text" value={newEntry.name} onChange={e => setNewEntry({...newEntry, name: e.target.value})} className="w-full p-2 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Name" />
          </div>
          <div className="w-32">
            <label className="text-xs text-gray-500 block mb-1">Time In</label>
            <input type="time" value={newEntry.time_in} onChange={e => setNewEntry({...newEntry, time_in: e.target.value})} className="w-full p-2 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <Button size="sm" onClick={handleAdd}>Log Entry</Button>
        </div>
      )}
    </div>
  );
};