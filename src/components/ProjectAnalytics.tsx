import React, { useMemo } from 'react';
import type { Project, User } from '../types';
import { Card } from './ui/Card';
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, DollarSign, Clock, PieChart as PieChartIcon 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface ProjectAnalyticsProps {
  projects: Project[];
  users: User[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; subtext?: string }> = ({ label, value, icon, color, subtext }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
        {icon}
      </div>
      {subtext && <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{subtext}</span>}
    </div>
    <div>
      <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide">{label}</p>
    </div>
  </div>
);

export const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ projects, users }) => {
  // Calculate Metrics
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status === 'active').length;
    const completed = projects.filter(p => p.status === 'completed' || p.status === 'archived').length;
    
    const now = new Date();
    const overdue = projects.filter(p => {
      if (!p.finish_date || p.status === 'completed' || p.status === 'archived') return false;
      return new Date(p.finish_date) < now;
    }).length;

    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = projects.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
    const budgetHealth = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    const avgProgress = total > 0 
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / total) 
      : 0;

    return { total, active, completed, overdue, totalBudget, totalSpent, budgetHealth, avgProgress };
  }, [projects]);

  // Chart Data: Status Distribution
  const statusData = useMemo(() => [
    { name: 'Active', value: metrics.active },
    { name: 'Completed', value: metrics.completed },
    { name: 'Overdue', value: metrics.overdue },
    { name: 'Pending', value: projects.length - (metrics.active + metrics.completed + metrics.overdue) }
  ].filter(d => d.value > 0), [metrics, projects.length]);

  // Chart Data: Budget vs Spent per Project (Top 5)
  const budgetData = useMemo(() => {
    return projects
      .slice(0, 5)
      .map(p => ({
        name: p.code || p.name.substring(0, 10),
        Budget: p.budget || 0,
        Spent: p.budget_spent || 0
      }));
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Active Projects" 
          value={metrics.active} 
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />} 
          color="bg-blue-500" 
          subtext={`${metrics.total} Total`}
        />
        <StatCard 
          label="Total Budget" 
          value={`$${(metrics.totalBudget / 1000000).toFixed(1)}M`} 
          icon={<DollarSign className="w-6 h-6 text-green-600" />} 
          color="bg-green-500" 
        />
        <StatCard 
          label="Avg. Progress" 
          value={`${metrics.avgProgress}%`} 
          icon={<CheckCircle className="w-6 h-6 text-purple-600" />} 
          color="bg-purple-500" 
        />
        <StatCard 
          label="Overdue" 
          value={metrics.overdue} 
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />} 
          color="bg-red-500" 
          subtext="Action Needed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Chart */}
        <Card title="Budget Utilization (Top 5 Projects)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Legend />
                <Bar dataKey="Budget" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Chart */}
        <Card title="Project Status Distribution">
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
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
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Timeline / Gantt Placeholder */}
      <Card title="Project Timeline Overview">
        <div className="space-y-4">
          {projects.slice(0, 5).map(project => {
             const start = new Date(project.start_date).getTime();
             const end = new Date(project.finish_date).getTime();
             const now = new Date().getTime();
             const total = end - start;
             const elapsed = now - start;
             const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));

             return (
               <div key={project.id} className="flex items-center gap-4">
                 <div className="w-32 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{project.name}</div>
                 <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full ${percent > 100 ? 'bg-red-500' : percent > 90 ? 'bg-amber-500' : 'bg-blue-500'}`} 
                      style={{ width: `${percent}%` }}
                   />
                 </div>
                 <div className="w-12 text-xs text-gray-500 text-right">{Math.round(percent)}%</div>
               </div>
             )
          })}
        </div>
      </Card>
    </div>
  );
};