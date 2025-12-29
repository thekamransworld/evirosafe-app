import React from 'react';
import type { GasTestLogEntry } from '../types';
import { Button } from './ui/Button';

interface GasTestLogSectionProps {
  gasTests: GasTestLogEntry[];
  onChange: (tests: GasTestLogEntry[]) => void;
  disabled: boolean;
}

export const GasTestLogSection: React.FC<GasTestLogSectionProps> = ({ gasTests, onChange, disabled }) => {
  const addRow = () => {
    onChange([...gasTests, { time: '', o2: 20.9, lel: 0, co: 0, h2s: 0, tester_name: '' }]);
  };

  const updateRow = (index: number, field: keyof GasTestLogEntry, value: any) => {
    const newTests = [...gasTests];
    newTests[index] = { ...newTests[index], [field]: value };
    onChange(newTests);
  };

  const removeRow = (index: number) => {
    onChange(gasTests.filter((_, i) => i !== index));
  };

  return (
    <div className="border rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-gray-800 dark:text-gray-200">Gas Test Log</h4>
        {!disabled && <Button size="sm" onClick={addRow}>+ Add Test</Button>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">O2 (%)</th>
              <th className="p-2">LEL (%)</th>
              <th className="p-2">CO (ppm)</th>
              <th className="p-2">H2S (ppm)</th>
              <th className="p-2">Tester</th>
              {!disabled && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {gasTests.map((test, i) => (
              <tr key={i} className="border-b dark:border-gray-700">
                <td className="p-2"><input type="time" value={test.time} onChange={e => updateRow(i, 'time', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1" /></td>
                <td className="p-2"><input type="number" value={test.o2} onChange={e => updateRow(i, 'o2', parseFloat(e.target.value))} disabled={disabled} className="w-16 bg-transparent border rounded p-1" /></td>
                <td className="p-2"><input type="number" value={test.lel} onChange={e => updateRow(i, 'lel', parseFloat(e.target.value))} disabled={disabled} className="w-16 bg-transparent border rounded p-1" /></td>
                <td className="p-2"><input type="number" value={test.co} onChange={e => updateRow(i, 'co', parseFloat(e.target.value))} disabled={disabled} className="w-16 bg-transparent border rounded p-1" /></td>
                <td className="p-2"><input type="number" value={test.h2s} onChange={e => updateRow(i, 'h2s', parseFloat(e.target.value))} disabled={disabled} className="w-16 bg-transparent border rounded p-1" /></td>
                <td className="p-2"><input type="text" value={test.tester_name} onChange={e => updateRow(i, 'tester_name', e.target.value)} disabled={disabled} className="w-full bg-transparent border rounded p-1" /></td>
                {!disabled && <td className="p-2"><button onClick={() => removeRow(i)} className="text-red-500">×</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};