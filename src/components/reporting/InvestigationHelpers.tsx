import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Users, Clock, Plus, Trash2 } from 'lucide-react';
import type { Witness } from '../../types';

export const WitnessSection: React.FC<{
  witnesses: Witness[];
  onChange: (witnesses: Witness[]) => void;
}> = ({ witnesses, onChange }) => {
  const [newWitness, setNewWitness] = useState<Witness>({ name: '', contact: '', statement: '' });

  const addWitness = () => {
    if (newWitness.name && newWitness.statement) {
      onChange([...witnesses, newWitness]);
      setNewWitness({ name: '', contact: '', statement: '' });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-500" /> Witness Statements
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {witnesses.map((w, i) => (
          <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 relative group">
            <button 
              onClick={() => onChange(witnesses.filter((_, idx) => idx !== i))}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <p className="font-bold">{w.name} <span className="text-xs font-normal text-gray-500">({w.contact})</span></p>
            <p className="text-sm mt-2 italic">"{w.statement}"</p>
          </div>
        ))}
      </div>

      <div className="p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input 
            placeholder="Witness Name" 
            value={newWitness.name}
            onChange={e => setNewWitness({...newWitness, name: e.target.value})}
            className="p-2 border rounded dark:bg-gray-900"
          />
          <input 
            placeholder="Contact Info" 
            value={newWitness.contact}
            onChange={e => setNewWitness({...newWitness, contact: e.target.value})}
            className="p-2 border rounded dark:bg-gray-900"
          />
        </div>
        <textarea 
          placeholder="Statement..." 
          value={newWitness.statement}
          onChange={e => setNewWitness({...newWitness, statement: e.target.value})}
          className="w-full p-2 border rounded dark:bg-gray-900 mb-3"
          rows={3}
        />
        <Button size="sm" onClick={addWitness} leftIcon={<Plus className="w-4 h-4"/>}>Add Witness</Button>
      </div>
    </div>
  );
};

export const TimelineSection: React.FC<{
  timeline: { time: string; event: string }[];
  onChange: (timeline: { time: string; event: string }[]) => void;
}> = ({ timeline, onChange }) => {
  const [newEvent, setNewEvent] = useState({ time: '', event: '' });

  const addEvent = () => {
    if (newEvent.time && newEvent.event) {
      const sorted = [...timeline, newEvent].sort((a, b) => a.time.localeCompare(b.time));
      onChange(sorted);
      setNewEvent({ time: '', event: '' });
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <h3 className="font-bold text-lg flex items-center gap-2">
        <Clock className="w-5 h-5 text-orange-500" /> Sequence of Events
      </h3>
      
      <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6 pl-6 py-2">
        {timeline.map((t, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900"></div>
            <p className="text-xs font-bold text-gray-500">{t.time}</p>
            <p className="text-sm">{t.event}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input 
          type="time" 
          value={newEvent.time}
          onChange={e => setNewEvent({...newEvent, time: e.target.value})}
          className="p-2 border rounded dark:bg-gray-900"
        />
        <input 
          type="text" 
          placeholder="Event description..." 
          value={newEvent.event}
          onChange={e => setNewEvent({...newEvent, event: e.target.value})}
          className="flex-1 p-2 border rounded dark:bg-gray-900"
        />
        <Button size="sm" onClick={addEvent}>Add</Button>
      </div>
    </div>
  );
};