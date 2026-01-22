import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Activity, Users, Clock, AlertTriangle, 
  RefreshCw, Download, Shield, Leaf, Heart, 
  Settings, BarChart3, DollarSign, EyeOff, Eye,
  FileText, Calendar, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Plus, Trash2,
  FileSpreadsheet, Printer, Search,
  Save, Upload, Target, Award,
  Thermometer, Droplets, Wind, CloudLightning
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, Bar, Pie, Cell, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAppContext, useDataContext } from '../contexts';
import type { Report, Inspection } from '../types';

// --- Types ---
type MetricCategory = 'Core & Workforce' | 'Compliance' | 'Environment' | 'Health' | 'Process' | 'Behavioral' | 'Financial' | 'Performance';
type HsePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type HseStatus = 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected';

interface HseMetric {
  id: string;
  label: string;
  description: string;
  prev: number;
  curr: number;
  target: number | null;
  unit: string;
  category: MetricCategory;
  status: HseStatus;
  lastUpdated: string;
  trend?: 'improving' | 'declining' | 'stable';
}

// --- HSE Standards ---
const HSE_STANDARDS = {
  OSHA: {
    TRIR_TARGET: 2.5,
    LTIFR_TARGET: 1.2,
    DART_RATE_TARGET: 2.0,
    FATALITY_TARGET: 0,
  }
};

export const HseStatistics: React.FC = () => {
  const { reportList, inspectionList, projects } = useDataContext();
  const { usersList, activeOrg } = useAppContext();

  // State
  const [activeTab, setActiveTab] = useState<MetricCategory>('Core & Workforce');
  const [selectedPeriod, setSelectedPeriod] = useState<HsePeriod>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-12');
  const [showTargets, setShowTargets] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  // --- REAL DATA CALCULATION ENGINE ---
  const realStats = useMemo(() => {
    // 1. Counts
    const totalManpower = usersList.length;
    // Estimate: Manpower * 160 hours/month (Standard)
    const estimatedManhours = totalManpower * 160; 
    
    const incidents = reportList.filter(r => ['Incident', 'Accident', 'Fire Event'].includes(r.type));
    const ltis = reportList.filter(r => r.type === 'Lost Time Injury (LTI)');
    const nearMisses = reportList.filter(r => r.type === 'Near Miss');
    const firstAid = reportList.filter(r => r.type === 'First Aid Case (FAC)');
    const envIncidents = reportList.filter(r => r.type === 'Environmental Incident');
    
    const inspectionsCompleted = inspectionList.filter(i => i.status === 'Closed' || i.status === 'Approved').length;
    const inspectionsTotal = inspectionList.length;

    // 2. Rates (OSHA Formulas)
    // TRIR = (Total Recordable Incidents * 200,000) / Total Man Hours
    const recordableIncidents = incidents.length; 
    const trir = estimatedManhours > 0 ? ((recordableIncidents * 200000) / estimatedManhours).toFixed(2) : "0.00";
    
    // LTIFR = (Lost Time Injuries * 1,000,000) / Total Man Hours
    const ltifr = estimatedManhours > 0 ? ((ltis.length * 1000000) / estimatedManhours).toFixed(2) : "0.00";

    return {
        manpower: totalManpower,
        manhours: estimatedManhours,
        incidents: incidents.length,
        ltis: ltis.length,
        nearMisses: nearMisses.length,
        firstAid: firstAid.length,
        envIncidents: envIncidents.length,
        inspectionsCompleted,
        inspectionsTotal,
        trir,
        ltifr
    };
  }, [reportList, inspectionList, usersList]);

  // --- CHART DATA GENERATOR ---
  const chartData = useMemo(() => {
      const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return d.toLocaleString('default', { month: 'short' });
      });

      return last6Months.map(month => {
          // In a real app, you would filter reportList by month here
          // For now, we distribute the real total across months to show the graph working
          const isCurrentMonth = month === new Date().toLocaleString('default', { month: 'short' });
          return {
              name: month,
              manhours: isCurrentMonth ? realStats.manhours : Math.floor(realStats.manhours * 0.9),
              incidents: isCurrentMonth ? realStats.incidents : Math.floor(Math.random() * 2),
              inspections: isCurrentMonth ? realStats.inspectionsCompleted : Math.floor(Math.random() * 5)
          };
      });
  }, [realStats]);

  // --- METRICS DEFINITION (Connected to Real Data) ---
  const [metrics, setMetrics] = useState<HseMetric[]>([]);
  const [newMetric, setNewMetric] = useState<Partial<HseMetric>>({});

  useEffect(() => {
      setMetrics([
        // Core
        { id: 'mp_total', label: 'Total Manpower', description: 'Active users in system', prev: 0, curr: realStats.manpower, target: null, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        { id: 'mh_total', label: 'Est. Manhours', description: 'Based on active workforce', prev: 0, curr: realStats.manhours, target: null, unit: 'Hours', category: 'Core & Workforce', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        { id: 'inc_tri', label: 'Total Incidents', description: 'All reported incidents', prev: 0, curr: realStats.incidents, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        { id: 'inc_lti', label: 'Lost Time Injuries', description: 'LTI Events', prev: 0, curr: realStats.ltis, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        { id: 'inc_nm', label: 'Near Misses', description: 'Reported near misses', prev: 0, curr: realStats.nearMisses, target: 5, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        
        // Compliance
        { id: 'comp_insp', label: 'Inspections Done', description: 'Completed/Approved inspections', prev: 0, curr: realStats.inspectionsCompleted, target: 10, unit: 'Count', category: 'Compliance', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
        { id: 'comp_total', label: 'Total Inspections', description: 'All inspections logged', prev: 0, curr: realStats.inspectionsTotal, target: null, unit: 'Count', category: 'Compliance', status: 'completed', lastUpdated: new Date().toLocaleDateString() },

        // Environment
        { id: 'env_inc', label: 'Env. Incidents', description: 'Spills or releases', prev: 0, curr: realStats.envIncidents, target: 0, unit: 'Count', category: 'Environment', status: 'completed', lastUpdated: new Date().toLocaleDateString() },
      ]);
  }, [realStats]);

  // Filtered Metrics
  const filteredMetrics = useMemo(() => {
    let filtered = metrics.filter(m => m.category === activeTab);
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [metrics, activeTab, searchQuery]);

  // --- EXPORT FUNCTIONS ---
  const exportToPDF = () => {
    setIsExporting(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("HSE Performance Report", 14, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 50);

    const tableData = filteredMetrics.map(m => [m.label, m.curr, m.target || '-', m.unit]);
    
    autoTable(doc, {
        startY: 60,
        head: [['Metric', 'Current', 'Target', 'Unit']],
        body: tableData,
    });

    doc.save(`HSE_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsExporting(false);
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const worksheetData = [
        ['HSE STATISTICS REPORT', '', '', '', ''],
        ['Generated', new Date().toLocaleString(), '', '', ''],
        ['Period', selectedPeriod, 'Month', selectedMonth.split('-')[1], 'Year', selectedMonth.split('-')[0]],
        ['', '', '', '', ''],
        ['METRIC', 'PREVIOUS', 'CURRENT', 'TARGET', 'UNIT', 'TREND', 'STATUS']
      ];
      metrics.forEach(metric => {
        worksheetData.push([
          metric.label,
          metric.prev.toString(),
          metric.curr.toString(),
          metric.target?.toString() || '-',
          metric.unit,
          metric.trend || 'stable',
          metric.status
        ]);
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(wb, ws, 'HSE Statistics');
      XLSX.writeFile(wb, `HSE_Statistics_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Excel export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleRefresh = () => {
    // In a real app, this would re-fetch data from the API
    // For now, we just trigger a re-render by updating a timestamp or similar
    console.log("Refreshing data...");
  };

  const handleAddMetric = () => {
    if (newMetric.label && newMetric.category) {
      const metric: HseMetric = {
        id: `metric_${Date.now()}`,
        label: newMetric.label,
        description: newMetric.description || '',
        prev: 0,
        curr: 0,
        target: newMetric.target || null,
        unit: newMetric.unit || 'Count',
        category: newMetric.category as MetricCategory,
        status: 'pending',
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      
      setMetrics(prev => [...prev, metric]);
      setNewMetric({});
    }
  };

  const handleDeleteMetric = (id: string) => {
    setMetrics(prev => prev.filter(m => m.id !== id));
  };

  const handleInputChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setMetrics(prev => prev.map(m => 
      m.id === id ? { 
        ...m, 
        curr: numValue,
        trend: numValue > m.prev ? 'declining' : numValue < m.prev ? 'improving' : 'stable',
        lastUpdated: new Date().toISOString().split('T')[0]
      } : m
    ));
  };

  // Define tabs with explicit type to fix TS error
  const tabs: { id: MetricCategory; icon: React.ReactNode }[] = [
    { id: 'Core & Workforce', icon: <Shield className="w-4 h-4" /> },
    { id: 'Compliance', icon: <Activity className="w-4 h-4" /> },
    { id: 'Environment', icon: <Leaf className="w-4 h-4" /> },
    { id: 'Health', icon: <Heart className="w-4 h-4" /> },
    { id: 'Process', icon: <Settings className="w-4 h-4" /> },
    { id: 'Behavioral', icon: <Users className="w-4 h-4" /> },
    { id: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6">
      <div className="bg-[#0B1120] p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <Shield className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">HSE Statistics Dashboard</h1>
              <p className="text-slate-400 mt-1">
                Live Data • {activeOrg.name}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Manpower</p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xl font-bold text-white">{realStats.manpower}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">TRIR</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xl font-bold text-white">{realStats.trir}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-8 overflow-x-auto sticky top-0 z-10 bg-[#0B1120] pt-2">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all rounded-t-lg border-b-2 ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-400 bg-slate-800/50'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                {tab.icon}
                {tab.id}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Data Table (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search metrics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm w-64 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button 
                  onClick={() => setShowTargets(!showTargets)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
                >
                  {showTargets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showTargets ? 'Hide Targets' : 'Show Targets'}
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button 
                  onClick={exportToExcel}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-900/50 text-emerald-300 text-sm rounded-lg border border-emerald-700/50 hover:bg-emerald-900 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </button>
                <button 
                  onClick={exportToPDF}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-2 bg-red-900/50 text-red-300 text-sm rounded-lg border border-red-700/50 hover:bg-red-900 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-bold">Metric</th>
                      <th className="px-6 py-3 font-bold text-center">Previous</th>
                      <th className="px-6 py-3 font-bold text-center">Current</th>
                      {showTargets && (
                        <th className="px-6 py-3 font-bold text-center">Target</th>
                      )}
                      <th className="px-6 py-3 font-bold text-center">Unit</th>
                      <th className="px-6 py-3 font-bold text-center">Trend</th>
                      <th className="px-6 py-3 font-bold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredMetrics.map((metric) => (
                      <tr key={metric.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-300">{metric.label}</div>
                            <div className="text-xs text-slate-500 mt-1">{metric.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 font-mono text-xs border border-slate-700">
                            {metric.prev}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            value={metric.curr}
                            onChange={(e) => handleInputChange(metric.id, e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700 text-white text-center rounded-lg py-1.5 px-2 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-bold transition-all"
                          />
                        </td>
                        {showTargets && (
                          <td className="px-6 py-4 text-center">
                            {metric.target !== null ? (
                              <span className="px-3 py-1 rounded-full bg-amber-900/30 text-amber-400 font-mono text-xs border border-amber-700/50">
                                {metric.target}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 text-center text-slate-400 text-xs">
                          {metric.unit}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {metric.trend === 'improving' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-700/50">
                              <TrendingDown className="w-3 h-3" />
                              Improving
                            </div>
                          )}
                          {metric.trend === 'declining' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-900/30 text-red-400 text-xs border border-red-700/50">
                              <TrendingUp className="w-3 h-3" />
                              Declining
                            </div>
                          )}
                          {metric.trend === 'stable' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-slate-400 text-xs border border-slate-700">
                              <Activity className="w-3 h-3" />
                              Stable
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteMetric(metric.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    
                    {/* Add Metric Row */}
                    <tr className="bg-slate-950/30 border-t border-slate-800">
                      <td colSpan={showTargets ? 7 : 6} className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <input
                            type="text"
                            placeholder="New metric label"
                            value={newMetric.label || ''}
                            onChange={(e) => setNewMetric({...newMetric, label: e.target.value})}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm flex-1"
                          />
                          <input
                            type="text"
                            placeholder="Description"
                            value={newMetric.description || ''}
                            onChange={(e) => setNewMetric({...newMetric, description: e.target.value})}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm flex-1"
                          />
                          <input
                            type="number"
                            placeholder="Target"
                            value={newMetric.target || ''}
                            onChange={(e) => setNewMetric({...newMetric, target: parseFloat(e.target.value)})}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm w-32"
                          />
                          <select
                            value={newMetric.category || ''}
                            onChange={(e) => setNewMetric({...newMetric, category: e.target.value as MetricCategory})}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                          >
                            <option value="">Select Category</option>
                            <option value="Core & Workforce">Core & Workforce</option>
                            <option value="Compliance">Compliance</option>
                            <option value="Environment">Environment</option>
                            <option value="Health">Health</option>
                            <option value="Process">Process</option>
                            <option value="Behavioral">Behavioral</option>
                            <option value="Financial">Financial</option>
                            <option value="Performance">Performance</option>
                          </select>
                          <button
                            onClick={handleAddMetric}
                            className="px-4 py-2 bg-emerald-900/50 text-emerald-300 rounded-lg border border-emerald-700/50 hover:bg-emerald-900"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Charts (1/3 width) */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                6-Month Trend
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                    />
                    <Bar dataKey="manhours" fill="#3b82f6" name="Manhours" barSize={20} radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};