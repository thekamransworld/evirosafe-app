
import React from 'react';
import type { RiskMatrix } from '../types';

interface RiskMatrixDisplayProps {
  matrix: RiskMatrix;
}

const severityLabels = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];
const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];

const getRiskColor = (severity: number, likelihood: number): string => {
    const score = severity * likelihood;
    if (score >= 15) return 'bg-red-600 text-white';
    if (score >= 9) return 'bg-orange-500 text-white';
    if (score >= 4) return 'bg-yellow-400 text-gray-800';
    return 'bg-green-500 text-white';
};

export const RiskMatrixDisplay: React.FC<RiskMatrixDisplayProps> = ({ matrix }) => {
  return (
    <div className="flex space-x-4 items-center">
      <div className="flex-shrink-0">
        <table className="border-collapse text-xs text-center">
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: 5 }).map((_, colIndex) => {
                  const severity = 5 - rowIndex;
                  const likelihood = colIndex + 1;
                  const isSelected = matrix.severity === severity && matrix.likelihood === likelihood;
                  return (
                    <td
                      key={colIndex}
                      className={`w-8 h-8 border border-gray-300 ${getRiskColor(severity, likelihood)} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500' : ''}`}
                    >
                      {severity * likelihood}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <p><span className="font-semibold">Severity:</span> {severityLabels[matrix.severity - 1] || 'N/A'} ({matrix.severity})</p>
        <p><span className="font-semibold">Likelihood:</span> {likelihoodLabels[matrix.likelihood - 1] || 'N/A'} ({matrix.likelihood})</p>
      </div>
    </div>
  );
};
