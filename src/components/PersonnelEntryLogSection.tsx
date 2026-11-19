import React from 'react';
import type { PersonnelEntryLogEntry } from '../types';
import { Button } from './ui/Button';

interface PersonnelEntryLogSectionProps {
  entries: PersonnelEntryLogEntry[];
  onChange: (entries: PersonnelEntryLogEntry[]) => void;
  disabled: boolean;
  /** Rows already saved: the person and time in are locked; the time out can still be filled in. */
  lockedCount?: number;
}

const hhmm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export const PersonnelEntryLogSection: React.FC<PersonnelEntryLogSectionProps> = ({ entries = [], onChange, disabled, lockedCount = 0 }) => {
  const addRow = () => onChange([...entries, { name: '', time_in: hhmm(), time_out: '' }]);
  const updateRow = (index: number, field: keyof PersonnelEntryLogEntry, value: string) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };
  const removeRow = (index: number) => onChange(entries.filter((_, i) => i !== index));
  const inside = entries.filter(e => e.time_in && !e.time_out);

  return (
    <div className="border rounded-lg p-4 mb-6 dark:border-dark-border" data-testid="entry-log">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-gray-800 dark:text-gray-200">Personnel entry / exit log</h4>
        {!disabled && <Button size="sm" onClick={addRow}>+ Add person</Button>}
      </div>
      <p className={`text-sm rounded px-3 py-2 mb-3 ${inside.length ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200' : 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-300'}`} role="status">
        {inside.length ? `${inside.length} inside now: ${inside.map(e => e.name || 'unnamed').join(', ')}` : 'Nobody is inside.'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-white/5">
            <tr><th className="p-2">Name</th><th className="p-2">Time in</th><th className="p-2">Time out</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => {
              const saved = i < lockedCount;
              return (
                <tr key={i} className="border-b dark:border-dark-border">
                  <td className="p-2"><input type="text" value={entry.name} onChange={e => updateRow(i, 'name', e.target.value)} disabled={disabled || saved} className="w-full bg-transparent border rounded p-1 dark:border-dark-border" placeholder="Name" /></td>
                  <td className="p-2"><input type="time" value={entry.time_in} onChange={e => updateRow(i, 'time_in', e.target.value)} disabled={disabled || saved} className="w-full bg-transparent border rounded p-1 dark:border-dark-border" /></td>
                  <td className="p-2">
                    <div className="flex gap-1 items-center">
                      <input type="time" value={entry.time_out} onChange={e => updateRow(i, 'time_out', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1 dark:border-dark-border" />
                      {!disabled && !entry.time_out && entry.time_in && <button type="button" className="text-xs whitespace-nowrap px-2 py-1 rounded bg-gray-100 dark:bg-white/10" onClick={() => updateRow(i, 'time_out', hhmm())}>Out now</button>}
                    </div>
                  </td>
                  <td className="p-2">{!disabled && !saved && <button type="button" onClick={() => removeRow(i)} className="text-red-500" aria-label="Remove">×</button>}</td>
                </tr>
              );
            })}
            {entries.length === 0 && <tr><td colSpan={4} className="p-3 text-center text-gray-500 dark:text-gray-400">No entries recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
