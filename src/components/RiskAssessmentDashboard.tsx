import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { useDataContext } from '../contexts';
import { checklistAIService } from '../services/checklistAIService';

export const RiskAssessmentDashboard: React.FC = () => {
  const { checklistRunList } = useDataContext();
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const analyze = async () => {
      setLoading(true);
      try {
        const data = await checklistAIService.analyzeChecklistResults(checklistRunList);
        setRiskData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    analyze();
  }, [checklistRunList]);

  if (loading) return <div className="p-8 text-center text-gray-500">AI is analyzing risk patterns...</div>;
  if (!riskData) return null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border border-white/10 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">AI Risk Score</h3>
            <p className="text-slate-400 text-sm">Based on {checklistRunList.length} inspections</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-emerald-400">{riskData.riskAssessment.complianceScore}%</div>
            <div className="text-xs text-emerald-200">Compliance Rate</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Critical Findings">
          <ul className="space-y-3">
            {riskData.riskAssessment.criticalFindings.map((f: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="AI Recommendations">
          <ul className="space-y-3">
            {riskData.riskAssessment.recommendations.map((r: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                <Shield className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};