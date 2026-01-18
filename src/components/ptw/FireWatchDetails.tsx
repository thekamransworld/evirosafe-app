import React from 'react';
import { Flame, Clock } from 'lucide-react';
import type { PtwHotWorkPayload } from '../../types/ptw';

interface FireWatchDetailsProps {
  data: {
    fire_watcher: PtwHotWorkPayload['fire_watcher'];
    post_watch_minutes: number;
  };
  onChange: (data: any) => void;
  readOnly?: boolean;
}

export const FireWatchDetails: React.FC<FireWatchDetailsProps> = ({ data, onChange, readOnly = false }) => {
  
  const updateWatcher = (field: string, value: string) => {
    onChange({
      ...data,
      fire_watcher: { ...data.fire_watcher, [field]: value }
    });
  };

  return (
    <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
      <div className="flex items-center gap-2 mb-4 text-orange-800 dark:text-orange-200">
        <Flame className="w-5 h-5" />
        <h4 className="font-bold">Fire Watch Requirements</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Designated Fire Watcher</label>
          <input 
            type="text" 
            value={data.fire_watcher.name}
            onChange={(e) => updateWatcher('name', e.target.value)}
            disabled={readOnly}
            placeholder="Enter Name"
            className="w-full p-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emergency Contact</label>
          <input 
            type="tel" 
            value={data.fire_watcher.mobile}
            onChange={(e) => updateWatcher('mobile', e.target.value)}
            disabled={readOnly}
            placeholder="+971..."
            className="w-full p-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Post-Work Monitoring Duration</label>
          <div className="flex items-center gap-4">
            {[30, 60, 120].map(mins => (
              <label key={mins} className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${data.post_watch_minutes === mins ? 'bg-orange-100 border-orange-400 text-orange-900' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}>
                <input 
                  type="radio" 
                  name="post_watch" 
                  checked={data.post_watch_minutes === mins}
                  onChange={() => !readOnly && onChange({ ...data, post_watch_minutes: mins })}
                  disabled={readOnly}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {mins} Mins
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};