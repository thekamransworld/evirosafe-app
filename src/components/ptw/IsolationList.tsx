import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Lock, Unlock, Plus, Trash2 } from 'lucide-react';

// We define a local interface for the UI, which maps to the payload structure
interface IsolationPoint {
  id: string;
  equipment: string;
  tagNumber: string;
  isolationType: string; // Electrical, Mechanical, etc.
  location: string;
  locked: boolean;
}

interface IsolationListProps {
  isolations: any[]; // Using any[] to map to the flexible payload structure
  onChange: (isolations: any[]) => void;
  readOnly?: boolean;
}

export const IsolationList: React.FC<IsolationListProps> = ({ isolations, onChange, readOnly = false }) => {
  const [newIso, setNewIso] = useState<Partial<IsolationPoint>>({
    equipment: '',
    tagNumber: '',
    isolationType: 'Electrical',
    location: ''
  });

  const handleAdd = () => {
    if (!newIso.equipment || !newIso.tagNumber) return;
    
    const entry = {
      id: `iso_${Date.now()}`,
      equipment: newIso.equipment,
      tagNumber: newIso.tagNumber,
      isolationType: newIso.isolationType,
      location: newIso.location,
      locked: false, // Default to unlocked until verified
      tagColor: 'Red'
    };
    
    onChange([...isolations, entry]);
    setNewIso({ equipment: '', tagNumber: '', isolationType: 'Electrical', location: '' });
  };

  const handleRemove = (id: string) => {
    onChange(isolations.filter(i => i.id !== id));
  };

  const toggleLock = (id: string) => {
    if (readOnly) return;
    onChange(isolations.map(i => i.id === id ? { ...i, locked: !i.locked } : i));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-5 h-5 text-red-600" />
        <h4 className="font-bold text-gray-800 dark:text-white">Energy Isolation (LOTO)</h4>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <input 
            placeholder="Equipment Name" 
            value={newIso.equipment}
            onChange={e => setNewIso({...newIso, equipment: e.target.value})}
            className="md:col-span-2 p-2 text-sm border rounded"
          />
          <input 
            placeholder="Tag #" 
            value={newIso.tagNumber}
            onChange={e => setNewIso({...newIso, tagNumber: e.target.value})}
            className="p-2 text-sm border rounded"
          />
          <select 
            value={newIso.isolationType}
            onChange={e => setNewIso({...newIso, isolationType: e.target.value})}
            className="p-2 text-sm border rounded"
          >
            <option>Electrical</option>
            <option>Mechanical</option>
            <option>Hydraulic</option>
            <option>Pneumatic</option>
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!newIso.equipment}>
            <Plus className="w-4 h-4 mr-1" /> Add Point
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {isolations.map((iso) => (
          <div key={iso.id} className={`flex items-center justify-between p-3 border rounded-lg ${iso.locked ? 'bg-green-50 border-green-200 dark:bg-green-900/20' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <span className="block text-xs text-gray-500 uppercase">Equipment</span>
                <span className="font-medium text-sm dark:text-white">{iso.equipment}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500 uppercase">Tag Number</span>
                <span className="font-mono text-sm dark:text-gray-300">{iso.tagNumber}</span>
              </div>
              <div>
                <span className="block text-xs text-gray-500 uppercase">Type</span>
                <span className="text-sm dark:text-gray-300">{iso.isolationType}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l dark:border-gray-700">
              <button 
                onClick={() => toggleLock(iso.id)}
                disabled={readOnly}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  iso.locked 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {iso.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {iso.locked ? 'LOCKED' : 'UNLOCKED'}
              </button>
              
              {!readOnly && (
                <button onClick={() => handleRemove(iso.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isolations.length === 0 && (
          <div className="text-center p-6 border-2 border-dashed rounded-lg text-gray-400 text-sm">
            No isolation points added.
          </div>
        )}
      </div>
    </div>
  );
};