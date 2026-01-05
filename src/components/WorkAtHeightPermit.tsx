import React from 'react';
import type { PtwWorkAtHeightPayload } from '../types';

interface WorkAtHeightPermitProps {
  payload: PtwWorkAtHeightPayload;
  onChange: (updatedPayload: PtwWorkAtHeightPayload) => void;
  readOnly?: boolean;
}

const EQUIPMENT_LABELS: Record<keyof PtwWorkAtHeightPayload['access_equipment'], string> = {
    step_ladder: 'Step Ladder',
    independent_scaffolding: 'Independent Scaffolding',
    tower_mobile_scaffolding: 'Mobile Tower Scaffold',
    scissor_lift: 'Scissor Lift',
    articulated_telescopic_boom: 'Articulated/Telescopic Boom',
    boatswain_chair: 'Boatswain Chair',
    man_basket: 'Man Basket',
    rope_access_system: 'Rope Access System',
    roof_ladder: 'Roof Ladder',
    other: 'Other',
};

export const WorkAtHeightPermit: React.FC<WorkAtHeightPermitProps> = ({ payload, onChange, readOnly = false }) => {
  
  const handleToggle = (key: keyof PtwWorkAtHeightPayload['access_equipment']) => {
      if (readOnly || key === 'other') return;
      
      const newEquipment = { 
          ...payload.access_equipment,
          [key]: !payload.access_equipment[key]
      };
      onChange({ ...payload, access_equipment: newEquipment });
  };

  const handleOtherChange = (value: string) => {
      if (readOnly) return;
      const newEquipment = {
          ...payload.access_equipment,
          other: value
      };
      onChange({ ...payload, access_equipment: newEquipment });
  };

  return (
    <div className="mb-6 border rounded-xl p-5 bg-sky-50/50 dark:bg-sky-900/10 border-sky-100 dark:border-sky-800">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🧗</span>
            <h4 className="font-bold text-base text-sky-900 dark:text-sky-100">Access Equipment Selection</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {(Object.keys(EQUIPMENT_LABELS) as Array<keyof typeof EQUIPMENT_LABELS>).filter(k => k !== 'other').map(key => (
                <div 
                    key={key as string} 
                    onClick={() => handleToggle(key)}
                    className={`
                        flex items-center p-3 rounded-lg border transition-all cursor-pointer select-none
                        ${payload.access_equipment[key] 
                            ? 'bg-sky-100 border-sky-300 dark:bg-sky-800 dark:border-sky-600 shadow-sm' 
                            : 'bg-white dark:bg-dark-background border-gray-200 dark:border-dark-border hover:border-sky-300 dark:hover:border-sky-700'}
                        ${readOnly ? 'cursor-default opacity-90' : ''}
                    `}
                >
                    <input
                        type="checkbox"
                        checked={payload.access_equipment[key]}
                        readOnly
                        className={`h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 ${readOnly ? 'pointer-events-none' : ''}`}
                    />
                    <span className={`ml-3 font-medium ${payload.access_equipment[key] ? 'text-sky-900 dark:text-sky-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {EQUIPMENT_LABELS[key]}
                    </span>
                </div>
            ))}
        </div>

        <div className="mt-4">
            <label htmlFor="equip-other" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Other Equipment / Method
            </label>
            <input
                type="text"
                id="equip-other"
                value={payload.access_equipment.other}
                onChange={e => handleOtherChange(e.target.value)}
                placeholder="Specify any other equipment..."
                className="w-full p-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-dark-background border border-gray-300 dark:border-dark-border rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition-all"
                disabled={readOnly}
            />
        </div>
    </div>
  );
};