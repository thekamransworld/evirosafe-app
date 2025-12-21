import React from 'react';
import type { PtwLiftingPayload } from '../types/ptw';

interface LoadCalculationSectionProps {
  loadCalc: PtwLiftingPayload['load_calculation'];
  onChange: (calc: PtwLiftingPayload['load_calculation']) => void;
  disabled: boolean;
}

export const LoadCalculationSection: React.FC<LoadCalculationSectionProps> = ({ 
  loadCalc, 
  onChange, 
  disabled 
}) => {
  
  const calculateTotalWeight = (hook: number, load: number) => {
    return (hook || 0) + (load || 0);
  };
  
  const calculateUtilization = (total: number, capacity: number) => {
    return capacity > 0 ? (total / capacity) * 100 : 0;
  };
  
  const handleChange = (field: keyof typeof loadCalc, value: string) => {
    // Handle numeric fields
    if (field !== 'lift_plan_ref' && field !== 'crane_certification_no' && field !== 'operator_certification_no') {
        const numValue = parseFloat(value) || 0;
        const newCalc = { ...loadCalc, [field]: numValue };
        
        // Auto-calculate derived values
        if (field === 'hook_rigging_weight' || field === 'load_weight') {
            newCalc.total_weight = calculateTotalWeight(
                field === 'hook_rigging_weight' ? numValue : (loadCalc.hook_rigging_weight || 0),
                field === 'load_weight' ? numValue : (loadCalc.load_weight || 0)
            );
            // Recalculate utilization if total changed
            newCalc.utilization_percent = calculateUtilization(newCalc.total_weight, loadCalc.crane_capacity_at_radius || 0);
        }
        
        if (field === 'crane_capacity_at_radius') {
             const total = loadCalc.total_weight || 0;
             newCalc.utilization_percent = calculateUtilization(total, numValue);
        }

        onChange(newCalc);
    } else {
        // Handle string fields
        onChange({ ...loadCalc, [field]: value });
    }
  };
  
  const utilization = loadCalc.utilization_percent || 0;
  const isHighRisk = utilization > 85;
  const isCritical = utilization > 75;

  const inputClass = "w-full p-2 text-sm border rounded-md dark:bg-black dark:border-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-white/5";

  return (
    <div className="mb-6 border rounded-lg p-4 bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-base text-gray-800 dark:text-gray-200">Lifting Load Calculation</h4>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isHighRisk ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
          isCritical ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        }`}>
          {isHighRisk ? 'HIGH RISK' : isCritical ? 'CRITICAL LIFT' : 'SAFE'} {utilization.toFixed(1)}%
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Row 1: Weights */}
        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
          <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Hook + Rigging (Ton)</label>
          <input
            type="number"
            value={loadCalc.hook_rigging_weight || ''}
            onChange={(e) => handleChange('hook_rigging_weight', e.target.value)}
            disabled={disabled}
            className={inputClass}
            placeholder="0.0"
            step="0.1"
          />
        </div>

        <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
          <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Load Weight (Ton)</label>
          <input
            type="number"
            value={loadCalc.load_weight || ''}
            onChange={(e) => handleChange('load_weight', e.target.value)}
            disabled={disabled}
            className={inputClass}
            placeholder="0.0"
            step="0.1"
          />
        </div>

        <div className="p-3 border rounded-lg bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Total Weight (A+B)</label>
          <input
            type="number"
            value={loadCalc.total_weight || 0}
            readOnly
            className={`${inputClass} font-bold`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 2: Capacity */}
        <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Boom Length (m)</label>
            <input
                type="number"
                value={loadCalc.boom_length || ''}
                onChange={(e) => handleChange('boom_length', e.target.value)}
                disabled={disabled}
                className={inputClass}
            />
        </div>
        
        <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Radius (m)</label>
            <input
                type="number"
                value={loadCalc.max_working_radius || ''}
                onChange={(e) => handleChange('max_working_radius', e.target.value)}
                disabled={disabled}
                className={inputClass}
            />
        </div>

        <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-800">
          <label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Capacity at Radius (Ton)</label>
          <input
            type="number"
            value={loadCalc.crane_capacity_at_radius || ''}
            onChange={(e) => handleChange('crane_capacity_at_radius', e.target.value)}
            disabled={disabled}
            className={inputClass}
            placeholder="From Load Chart"
          />
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lift Plan Reference #</label>
            <input
                type="text"
                value={loadCalc.lift_plan_ref || ''}
                onChange={(e) => handleChange('lift_plan_ref', e.target.value)}
                disabled={disabled}
                className={inputClass}
            />
          </div>
      </div>
    </div>
  );
};