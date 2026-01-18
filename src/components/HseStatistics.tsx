import React, { useState, useMemo, useRef } from 'react';
import { 
  Activity, Users, Clock, AlertTriangle, 
  RefreshCw, Download, Shield, Leaf, Heart, 
  Settings, BarChart3, DollarSign, EyeOff, Eye,
  FileText, Calendar, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Plus, Trash2,
  FileSpreadsheet, Printer, Search,
  Save, Upload, Target, Award,
  Thermometer, Database, PieChart, LineChart
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, Bar, Pie, Cell, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useDataContext } from '../contexts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export const HseStatistics: React.FC = () => {
  const { reportList, inspectionList, ptwList } = useDataContext();
  const [activeTab, setActiveTab] = useState('Overview');

  // --- REAL-TIME CALCULATIONS ---
  
  // 1. Financial Impact
  const financialStats = useMemo(() => {
      let total = 0;
      let medical = 0;
      let repair = 0;
      let fines = 0;

      reportList.forEach(r => {
          if (r.costs) {
              total += r.costs.total_estimated || 0;
              medical += r.costs.direct_costs?.medical || 0;
              repair += r.costs.direct_costs?.repair || 0;
              fines += r.costs.direct_costs?.fines || 0;
          }
      });

      return { total, medical, repair, fines };
  }, [reportList]);

  // 2. Root Cause Analysis
  const rootCauseData = useMemo(() => {
      const counts: Record<string, number> = { 'Human Error': 0, 'Equipment': 0, 'Process': 0, 'Environment': 0, 'Management': 0 };
      
      reportList.forEach(r => {
          if (r.root_cause_analysis?.root_cause_category) {
              r.root_cause_analysis.root_cause_category.forEach(cat => {
                  // Normalize category names
                  const key = cat.includes('Human') ? 'Human Error' : 
                              cat.includes('Equipment') ? 'Equipment' :
                              cat.includes('Process') ? 'Process' :
                              cat.includes('Environment') ? 'Environment' : 'Management';
                  counts[key] = (counts[key] || 0) + 1;
              });
          }
      });

      return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [reportList]);

  // 3. Incident Trends (Last 6 Months)
  const trendData = useMemo(() => {
      const data: Record<string, { incidents: number, inspections: number }> = {};
      const now = new Date();
      
      // Initialize last 6 months
      for(let i=5; i>=0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString('default', { month: 'short' });
          data[key] = { incidents: 0, inspections: 0 };
      }

      reportList.forEach(r => {
          const d = new Date(r.occurred_at);
          const key = d.toLocaleString('default', { month: 'short' });
          if (data[key]) data[key].incidents++;
      });

      inspectionList.forEach(i => {
          const d = new Date(i.schedule_at);
          const key = d.toLocaleString('default', { month: 'short' });
          if (data[key]) data[key].inspections++;
      });

      return Object.entries(data).map(([name, val]) => ({ name, ...val }));
  }, [reportList, inspectionList]);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6">
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Safety Intelligence</h1>
                <p className="text-slate-400">Real-time analytics based on live field data.</p>
            </div>
            <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-800 rounded-lg text-sm font-medium hover:bg-slate-700">Export Report</button>
            </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Financial Impact</p>
                <p className="text-3xl font-black text-emerald-400 mt-2">${financialStats.total.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Estimated cost of incidents</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Incidents</p>
                <p className="text-3xl font-black text-blue-400 mt-2">{reportList.length}</p>
                <p className="text-xs text-slate-500 mt-1">All categories</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inspections</p>
                <p className="text-3xl font-black text-purple-400 mt-2">{inspectionList.length}</p>
                <p className="text-xs text-slate-500 mt-1">Conducted this year</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Permits</p>
                <p className="text-3xl font-black text-amber-400 mt-2">{ptwList.filter(p => p.status === 'ACTIVE').length}</p>
                <p className="text-xs text-slate-500 mt-1">Currently open</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* TREND CHART */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="font-bold text-white mb-6">Incident vs Inspection Trend</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                            <YAxis tick={{ fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            <Legend />
                            <Bar dataKey="inspections" fill="#3b82f6" name="Inspections" barSize={20} radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={3} name="Incidents" dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ROOT CAUSE PIE */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h3 className="font-bold text-white mb-6">Root Cause Analysis</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={rootCauseData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {rootCauseData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {rootCauseData.length === 0 && (
                    <p className="text-center text-slate-500 text-sm mt-[-150px]">No root cause data available yet.</p>
                )}
            </div>
        </div>
    </div>
  );
};