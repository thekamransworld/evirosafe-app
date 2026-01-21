import React from 'react';
import { Card } from '../ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import type { TrainingRecord, TrainingCourse } from '../../types';

interface TrainingAnalyticsProps {
  records: TrainingRecord[];
  courses: TrainingCourse[];
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#94a3b8'];

export const TrainingAnalytics: React.FC<TrainingAnalyticsProps> = ({ records, courses }) => {
  
  // Calculate Compliance Data
  const complianceData = [
    { name: 'Valid', value: records.filter(r => r.status === 'valid').length, color: '#10b981' },
    { name: 'Expiring', value: records.filter(r => r.status === 'expiring_soon').length, color: '#f59e0b' },
    { name: 'Expired', value: records.filter(r => r.status === 'expired').length, color: '#ef4444' },
  ];

  // Calculate Course Popularity
  const courseData = courses.map(c => ({
    name: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
    count: records.filter(r => r.course_id === c.id).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card title="Workforce Compliance Status">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <PieChart>
              <Pie 
                data={complianceData} 
                innerRadius={60} 
                outerRadius={80} 
                paddingAngle={5} 
                dataKey="value"
              >
                {complianceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top Completed Courses">
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={courseData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11, fill: '#94a3b8'}} />
              <Tooltip 
                cursor={{fill: 'transparent'}} 
                contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};