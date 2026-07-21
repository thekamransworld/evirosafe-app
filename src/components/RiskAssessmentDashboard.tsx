import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const RiskAssessmentDashboard: React.FC = () => {
  return (
    <div className="p-8 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>AI Risk Score</p>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
        This feature is coming soon.
      </p>
    </div>
  );
};