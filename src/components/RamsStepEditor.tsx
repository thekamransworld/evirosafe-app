import React, { useState } from 'react';
import type { RamsStep, RamsHazard, RamsControl, RamsHierarchy, Severity, Likelihood } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { RiskMatrixInput } from './RiskMatrixInput';
import { X, Plus, Trash2 } from 'lucide-react';

interface RamsStepEditorProps {
  step: RamsStep;
  onSave: (step: RamsStep) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const HIERARCHY_OPTIONS: { value: RamsHierarchy; label: string; color: string }[] = [
  { value: 'elimination', label: 'Elimination', color: 'green' },
  { value: 'substitution', label: 'Substitution', color: 'blue' },
  { value: 'engineering', label: 'Engineering', color: 'purple' },
  { value: 'administrative', label: 'Administrative', color: 'yellow' },
  { value: 'ppe', label: 'PPE', color: 'orange' },
];

export const RamsStepEditor: React.FC<RamsStepEditorProps> = ({ step, onSave, onClose, onDelete }) => {
  const [editedStep, setEditedStep] = useState<RamsStep>({ ...step });
  const [newHazard, setNewHazard] = useState('');
  const [newControl, setNewControl] = useState('');
  const [selectedHierarchy, setSelectedHierarchy] = useState<RamsHierarchy>('engineering');

  const handleAddHazard = () => {
    if (newHazard.trim()) {
      const hazard: RamsHazard = {
        id: `hazard-${Date.now()}`,
        description: newHazard.trim(),
      };
      setEditedStep(prev => ({
        ...prev,
        hazards: [...prev.hazards, hazard],
      }));
      setNewHazard('');
    }
  };

  const handleAddControl = () => {
    if (newControl.trim()) {
      const control: RamsControl = {
        id: `control-${Date.now()}`,
        description: newControl.trim(),
        hierarchy: selectedHierarchy,
      };
      setEditedStep(prev => ({
        ...prev,
        controls: [...prev.controls, control],
      }));
      setNewControl('');
    }
  };

  const handleRemoveHazard = (hazardId: string) => {
    setEditedStep(prev => ({
      ...prev,
      hazards: prev.hazards.filter(h => h.id !== hazardId),
    }));
  };

  const handleRemoveControl = (controlId: string) => {
    setEditedStep(prev => ({
      ...prev,
      controls: prev.controls.filter(c => c.id !== controlId),
    }));
  };

  const handleRiskBeforeChange = (val: { severity: number; likelihood: number }) => {
    setEditedStep(prev => ({
      ...prev,
      risk_before: {
          severity: val.severity as Severity,
          likelihood: val.likelihood as Likelihood
      },
    }));
  };

  const handleRiskAfterChange = (val: { severity: number; likelihood: number }) => {
    setEditedStep(prev => ({
      ...prev,
      risk_after: {
          severity: val.severity as Severity,
          likelihood: val.likelihood as Likelihood
      },
    }));
  };

  const calculateRiskScore = (severity: number, likelihood: number) => severity * likelihood;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b dark:border-dark-border flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Step {step.step_no}</h2>
                <div className="flex gap-2">
                    {onDelete && (
                        <Button variant="danger" size="sm" onClick={onDelete}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete Step
                        </Button>
                    )}
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="p-6 overflow-y-auto flex-grow space-y-6">
                {/* Step Description */}
                <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Step Description</label>
                <textarea
                    value={editedStep.description}
                    onChange={(e) => setEditedStep(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-background text-gray-900 dark:text-white h-24"
                    placeholder="Describe this step in detail..."
                />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hazards Section */}
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
                    <h3 className="font-bold text-red-800 dark:text-red-300 mb-3">Hazards</h3>
                    <div className="space-y-2 mb-3">
                    {editedStep.hazards.map(hazard => (
                        <div key={hazard.id} className="flex items-center justify-between p-2 bg-white dark:bg-dark-background border dark:border-red-900/30 rounded shadow-sm">
                        <span className="text-sm text-gray-700 dark:text-gray-200">{hazard.description}</span>
                        <button
                            onClick={() => handleRemoveHazard(hazard.id)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        </div>
                    ))}
                    </div>
                    <div className="flex gap-2">
                    <input
                        type="text"
                        value={newHazard}
                        onChange={(e) => setNewHazard(e.target.value)}
                        placeholder="Add new hazard..."
                        className="flex-1 p-2 text-sm border rounded dark:bg-dark-background dark:border-red-900/30 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddHazard()}
                    />
                    <Button size="sm" onClick={handleAddHazard} className="bg-red-600 hover:bg-red-700 text-white"><Plus className="w-4 h-4"/></Button>
                    </div>
                </div>

                {/* Controls Section */}
                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                    <h3 className="font-bold text-green-800 dark:text-green-300 mb-3">Controls</h3>
                    <div className="space-y-2 mb-3">
                    {editedStep.controls.map(control => (
                        <div key={control.id} className="flex items-center justify-between p-2 bg-white dark:bg-dark-background border dark:border-green-900/30 rounded shadow-sm">
                        <div className="flex-1 min-w-0 mr-2">
                            <span className="text-sm text-gray-700 dark:text-gray-200 block truncate" title={control.description}>{control.description}</span>
                            <Badge color={HIERARCHY_OPTIONS.find(h => h.value === control.hierarchy)?.color as any} size="sm">
                            {control.hierarchy}
                            </Badge>
                        </div>
                        <button
                            onClick={() => handleRemoveControl(control.id)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        </div>
                    ))}
                    </div>
                    <div className="space-y-2">
                    <select
                        value={selectedHierarchy}
                        onChange={(e) => setSelectedHierarchy(e.target.value as RamsHierarchy)}
                        className="w-full p-2 text-sm border rounded dark:bg-dark-background dark:border-green-900/30 dark:text-white"
                    >
                        {HIERARCHY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                        <input
                        type="text"
                        value={newControl}
                        onChange={(e) => setNewControl(e.target.value)}
                        placeholder="Add new control..."
                        className="flex-1 p-2 text-sm border rounded dark:bg-dark-background dark:border-green-900/30 dark:text-white"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddControl()}
                        />
                        <Button size="sm" onClick={handleAddControl} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4"/></Button>
                    </div>
                    </div>
                </div>
                </div>

                {/* Risk Assessment */}
                <div className="mt-6 pt-6 border-t dark:border-dark-border grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-center">Risk Before Controls</h3>
                    <div className="flex flex-col items-center">
                        <RiskMatrixInput
                        value={editedStep.risk_before}
                        onChange={handleRiskBeforeChange}
                        />
                        <div className="mt-3">
                            <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Score</span>
                            <span className="ml-2 text-2xl font-bold text-red-600">
                                {calculateRiskScore(editedStep.risk_before.severity, editedStep.risk_before.likelihood)}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-center">Risk After Controls</h3>
                     <div className="flex flex-col items-center">
                        <RiskMatrixInput
                        value={editedStep.risk_after}
                        onChange={handleRiskAfterChange}
                        />
                        <div className="mt-3">
                            <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Score</span>
                            <span className={`ml-2 text-2xl font-bold ${
                                calculateRiskScore(editedStep.risk_after.severity, editedStep.risk_after.likelihood) >= 13 ? 'text-red-600' :
                                calculateRiskScore(editedStep.risk_after.severity, editedStep.risk_after.likelihood) >= 7 ? 'text-yellow-600' :
                                'text-green-600'
                            }`}>
                                {calculateRiskScore(editedStep.risk_after.severity, editedStep.risk_after.likelihood)}
                            </span>
                        </div>
                    </div>
                </div>
                </div>

                {/* Risk Reduction Message */}
                {calculateRiskScore(editedStep.risk_before.severity, editedStep.risk_before.likelihood) > 
                calculateRiskScore(editedStep.risk_after.severity, editedStep.risk_after.likelihood) && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-green-700 dark:text-green-300">
                    Risk successfully reduced by {
                        (100 - (calculateRiskScore(editedStep.risk_after.severity, editedStep.risk_after.likelihood) / 
                        calculateRiskScore(editedStep.risk_before.severity, editedStep.risk_before.likelihood) * 100)).toFixed(0)
                    }%
                    </p>
                </div>
                )}
            </div>

            <div className="p-6 border-t dark:border-dark-border flex justify-end gap-3 bg-gray-50 dark:bg-dark-background/50 rounded-b-xl">
                <Button variant="secondary" onClick={onClose}>
                Cancel
                </Button>
                <Button onClick={() => onSave(editedStep)}>
                Save Changes
                </Button>
            </div>
        </div>
    </div>
  );
};