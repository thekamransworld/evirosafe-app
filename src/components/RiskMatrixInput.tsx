
import React from 'react';
import type { RiskMatrix, Severity, Likelihood } from '../types';
import { getRiskLevel } from './Reports';

interface RiskMatrixInputProps {
  value: RiskMatrix;
  onChange: (value: RiskMatrix) => void;
}

const severityLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

const getRiskColorClass = (severity: number, likelihood: number): string => {
    const score = severity * likelihood;
    if (score >= 15) return 'bg-red-200 hover:bg-red-300';
    if (score >= 9) return 'bg-orange-200 hover:bg-orange-300';
    if (score >= 4) return 'bg-yellow-200 hover:bg-yellow-300';
    return 'bg-green-200 hover:bg-green-300';
};

export const RiskMatrixInput: React.FC<RiskMatrixInputProps> = ({ value, onChange }) => {
  const currentRisk = getRiskLevel(value);

  return (
    <div>
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-shrink-0">
                <div className="flex">
                    <div className="w-12 text-xs flex items-center justify-center transform -rotate-90 text-gray-500 font-semibold">Severity</div>
                    <div className="grid grid-cols-5 gap-1">
                        {Array.from({ length: 5 }).map((_, rowIndex) => 
                            Array.from({ length: 5 }).map((_, colIndex) => {
                                const severity = (5 - rowIndex) as Severity;
                                const likelihood = (colIndex + 1) as Likelihood;
                                const isSelected = value.severity === severity && value.likelihood === likelihood;
                                return (
                                    <button
                                        type="button"
                                        key={`${rowIndex}-${colIndex}`}
                                        onClick={() => onChange({ severity, likelihood })}
                                        className={`w-12 h-12 rounded-md text-sm font-bold transition-all duration-150 ${getRiskColorClass(severity, likelihood)} ${isSelected ? 'ring-2 ring-primary-500' : ''}`}
                                    >
                                        {severity * likelihood}
                                    </button>
                                )
                            })
                        )}
                         <div className="col-span-5 text-center text-xs text-gray-500 font-semibold mt-1">Likelihood</div>
                    </div>
                </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg flex-grow">
                <h4 className="font-bold text-lg">Calculated Risk</h4>
                <div className={`mt-2 text-2xl font-bold`} style={{ color: currentRisk.color === 'yellow' ? '#ca8a04' : currentRisk.color }}>
                    {currentRisk.level}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                    <p><span className="font-semibold">Severity:</span> {severityLabels[value.severity - 1]} ({value.severity})</p>
                    <p><span className="font-semibold">Likelihood:</span> {likelihoodLabels[value.likelihood - 1]} ({value.likelihood})</p>
                </div>
            </div>
        </div>
    </div>
  );
};
