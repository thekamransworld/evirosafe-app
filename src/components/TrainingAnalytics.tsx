import React from 'react';
import type { TrainingRecord, TrainingCourse } from '../types';
import { Card } from './ui/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface TrainingAnalyticsProps {
  records: TrainingRecord[];
  courses: TrainingCourse[];
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444']; // Green, Amber, Red

export const TrainingAnalytics: React.FC<TrainingAnalyticsProps> = ({ records, courses }) => {
  
  // Calculate Status Distribution
  const statusData = [
    { name: 'Valid', value: records.filter(r => r.status === 'valid').length },
    { name: 'Expiring Soon', value: records.filter(r => r.status === 'expiring_soon').length },
    { name: 'Expired', value: records.filter(r => r.status === 'expired').length },
  ];

  // Calculate Course Popularity/Completion
  const courseData = courses.map(c => ({
    name: c.title.length > 15 ? c.title.substring(0, 15) + '...' : c.title,
    count: records.filter(r => r.course_id === c.id).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Card title="Compliance Status">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Top Completed Courses">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={courseData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 11}} />
              <Tooltip cursor={{fill: 'transparent'}} />
              <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};