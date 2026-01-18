import React from 'react';
import { Button } from '../ui/Button';
import { Trash2, Plus } from 'lucide-react';
import type { GasTestLogEntry } from '../../types/ptw';

interface GasTestLogProps {
  entries: GasTestLogEntry[];
  onChange: (entries: GasTestLogEntry[]) => void;
  readOnly?: boolean;
}

export const GasTestLog: React.FC<GasTestLogProps> = ({ entries, onChange, readOnly = false }) => {
  const handleAdd = () => {
    const newEntry: GasTestLogEntry = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      o2: 20.9,
      lel: 0,
      co: 0,
      h2s: 0,
      tester_name: ''
    };
    onChange([...entries, newEntry]);
  };

  const handleRemove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof GasTestLogEntry, value: string | number) => {
    const newEntries = [...entries];
    // @ts-ignore
    newEntries[index][field] = value;
    onChange(newEntries);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Atmospheric Gas Testing</h4>
        {!readOnly && (
          <Button size="sm" variant="secondary" onClick={handleAdd} leftIcon={<Plus className="w-3 h-3" />}>
            Add Reading
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">O₂ (%)</th>
              <th className="p-2">LEL (%)</th>
              <th className="p-2">H₂S (ppm)</th>
              <th className="p-2">CO (ppm)</th>
              <th className="p-2">Tester</th>
              {!readOnly && <th className="p-2 w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {entries.map((entry, index) => (
              <tr key={index} className="bg-white dark:bg-gray-900">
                <td className="p-2">
                  <input 
                    type="time" 
                    value={entry.time}
                    onChange={(e) => handleChange(index, 'time', e.target.value)}
                    disabled={readOnly}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={entry.o2}
                    onChange={(e) => handleChange(index, 'o2', parseFloat(e.target.value))}
                    disabled={readOnly}
                    className={`w-16 rounded px-1 py-0.5 ${entry.o2 < 19.5 || entry.o2 > 23.5 ? 'bg-red-100 text-red-700' : 'bg-transparent'}`}
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={entry.lel}
                    onChange={(e) => handleChange(index, 'lel', parseFloat(e.target.value))}
                    disabled={readOnly}
                    className={`w-16 rounded px-1 py-0.5 ${entry.lel > 10 ? 'bg-red-100 text-red-700' : 'bg-transparent'}`}
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={entry.h2s}
                    onChange={(e) => handleChange(index, 'h2s', parseFloat(e.target.value))}
                    disabled={readOnly}
                    className={`w-16 rounded px-1 py-0.5 ${entry.h2s > 10 ? 'bg-red-100 text-red-700' : 'bg-transparent'}`}
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="number" 
                    value={entry.co}
                    onChange={(e) => handleChange(index, 'co', parseFloat(e.target.value))}
                    disabled={readOnly}
                    className={`w-16 rounded px-1 py-0.5 ${entry.co > 35 ? 'bg-red-100 text-red-700' : 'bg-transparent'}`}
                  />
                </td>
                <td className="p-2">
                  <input 
                    type="text" 
                    value={entry.tester_name}
                    onChange={(e) => handleChange(index, 'tester_name', e.target.value)}
                    disabled={readOnly}
                    placeholder="Name"
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                  />
                </td>
                {!readOnly && (
                  <td className="p-2 text-center">
                    <button onClick={() => handleRemove(index)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500 italic">No gas tests recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};