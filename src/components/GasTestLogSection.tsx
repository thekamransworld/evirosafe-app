import React, { useState } from 'react';
import type { GasTestLogEntry } from '../types';
import { Button } from './ui/Button';

interface GasTestLogSectionProps {
  gasTests: GasTestLogEntry[];
  onChange: (tests: GasTestLogEntry[]) => void;
  disabled: boolean;
}

export const GasTestLogSection: React.FC<GasTestLogSectionProps> = ({ gasTests, onChange, disabled }) => {
  const [newTest, setNewTest] = useState<GasTestLogEntry>({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    o2: 20.9,
    lel: 0,
    co: 0,
    h2s: 0,
    tester_name: ''
  });

  const handleAdd = () => {
    if (!newTest.tester_name) return alert("Tester name is required");
    onChange([...gasTests, newTest]);
    setNewTest({ ...newTest, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
  };

  const handleRemove = (index: number) => {
    if (disabled) return;
    const updated = [...gasTests];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="mb-6 border rounded-lg p-4 bg-white dark:bg-dark-card dark:border-dark-border">
      <h4 className="font-bold text-base text-gray-800 dark:text-gray-200 mb-3">Gas Test Log (Periodic)</h4>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100 dark:bg-white/5 text-xs uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">O2 (%)</th>
              <th className="p-2">LEL (%)</th>
              <th className="p-2">CO (ppm)</th>
              <th className="p-2">H2S (ppm)</th>
              <th className="p-2">Tester</th>
              {!disabled && <th className="p-2">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {gasTests.map((test, idx) => (
              <tr key={idx}>
                <td className="p-2 text-gray-900 dark:text-gray-300">{test.time}</td>
                <td className={`p-2 font-mono ${test.o2 < 19.5 || test.o2 > 23.5 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{test.o2}%</td>
                <td className={`p-2 font-mono ${test.lel > 10 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{test.lel}%</td>
                <td className={`p-2 font-mono ${test.co > 25 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{test.co}</td>
                <td className={`p-2 font-mono ${test.h2s > 10 ? 'text-red-600 font-bold' : 'text-green-600'}`}>{test.h2s}</td>
                <td className="p-2 text-gray-900 dark:text-gray-300">{test.tester_name}</td>
                {!disabled && (
                  <td className="p-2">
                    <button onClick={() => handleRemove(idx)} className="text-red-500 hover:text-red-700">&times;</button>
                  </td>
                )}
              </tr>
            ))}
            {gasTests.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-gray-500 italic">No gas tests recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!disabled && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-7 gap-2 items-end bg-gray-50 dark:bg-white/5 p-3 rounded-lg">
          <div className="col-span-1">
            <label className="text-xs text-gray-500 block mb-1">Time</label>
            <input type="time" value={newTest.time} onChange={e => setNewTest({...newTest, time: e.target.value})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">O2 %</label>
            <input type="number" value={newTest.o2} onChange={e => setNewTest({...newTest, o2: parseFloat(e.target.value)})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">LEL %</label>
            <input type="number" value={newTest.lel} onChange={e => setNewTest({...newTest, lel: parseFloat(e.target.value)})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">CO ppm</label>
            <input type="number" value={newTest.co} onChange={e => setNewTest({...newTest, co: parseFloat(e.target.value)})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">H2S ppm</label>
            <input type="number" value={newTest.h2s} onChange={e => setNewTest({...newTest, h2s: parseFloat(e.target.value)})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-gray-500 block mb-1">Tester</label>
            <input type="text" value={newTest.tester_name} onChange={e => setNewTest({...newTest, tester_name: e.target.value})} className="w-full p-1 border rounded text-sm dark:bg-dark-background dark:border-dark-border dark:text-white" placeholder="Name" />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Button size="sm" onClick={handleAdd} className="w-full">Add</Button>
          </div>
        </div>
      )}
    </div>
  );
};