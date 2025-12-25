import React from 'react';
import { Card } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const complianceData = [
  { name: 'Valid', value: 65, color: '#10b981' },
  { name: 'Expiring', value: 15, color: '#f59e0b' },
  { name: 'Expired', value: 10, color: '#ef4444' },
  { name: 'Missing', value: 10, color: '#94a3b8' },
];

const gapData = [
  { role: 'Electrician', gap: 20 },
  { role: 'Scaffolder', gap: 15 },
  { role: 'Welder', gap: 5 },
  { role: 'Supervisor', gap: 30 },
];

export const TrainingAnalytics: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card title="Workforce Compliance Status">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={complianceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {complianceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 text-xs">
          {complianceData.map(d => (
            <div key={d.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span>{d.name} ({d.value}%)</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Critical Competency Gaps by Role">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={gapData} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="role" type="category" width={100} tick={{fontSize: 12}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="gap" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">% of required certifications missing per role</p>
      </Card>
    </div>
  );
};