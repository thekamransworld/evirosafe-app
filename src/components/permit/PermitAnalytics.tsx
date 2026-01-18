import React, { useMemo } from 'react';
import { Card } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import type { PermitToWork } from '../../types/permit';

interface PermitAnalyticsProps {
  permits: PermitToWork[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const PermitAnalytics: React.FC<PermitAnalyticsProps> = ({ permits }) => {
  
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    permits.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));
  }, [permits]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    permits.forEach(p => {
      counts[p.type] = (counts[p.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [permits]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card title="Permit Status Distribution">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top Permit Types">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={typeData} layout="vertical" margin={{ left: 40 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};