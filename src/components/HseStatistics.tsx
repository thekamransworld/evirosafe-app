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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// --- Enhanced Types ---
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
  department?: string;
  location?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  trend?: 'improving' | 'declining' | 'stable';
}

interface MonthlyData {
  id: string;
  month: string;
  year: number;
  metrics: Record<string, number>;
  status: HseStatus;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
}

interface DepartmentData {
  id: string;
  name: string;
  manpower: number;
  manhours: number;
  incidents: number;
  target: number;
  color: string;
}

interface HseReport {
  id: string;
  title: string;
  period: string;
  generatedAt: string;
  data: MonthlyData;
  pdfUrl?: string;
  excelUrl?: string;
}

// --- HSE Standards & Requirements ---
const HSE_STANDARDS = {
  OSHA: {
    TRIR_TARGET: 2.5,
    LTIFR_TARGET: 1.2,
    DART_RATE_TARGET: 2.0,
    FATALITY_TARGET: 0,
  }
};

// --- Mock Data Generation ---
const generateMonthlyData = (year: number = 2024) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return months.map((month, index) => ({
    id: `${year}-${String(index + 1).padStart(2, '0')}`,
    month,
    year,
    metrics: {
      totalManpower: Math.floor(Math.random() * 200) + 150,
      totalManhours: Math.floor(Math.random() * 40000) + 20000,
      totalIncidents: Math.floor(Math.random() * 5),
      lostTimeInjuries: Math.random() > 0.9 ? 1 : 0,
      firstAidCases: Math.floor(Math.random() * 8),
      nearMisses: Math.floor(Math.random() * 15),
      environmentalIncidents: Math.floor(Math.random() * 3),
      wasteGenerated: Math.floor(Math.random() * 600) + 300,
      energyConsumption: Math.floor(Math.random() * 6000) + 4000,
      safetyObservations: Math.floor(Math.random() * 50) + 30,
      inspectionsCompleted: Math.floor(Math.random() * 20) + 10,
      trainingHours: Math.floor(Math.random() * 100) + 50,
    },
    status: (index < months.length - 1 ? 'approved' : 'pending') as HseStatus,
    submittedAt: new Date(year, index, 15).toISOString(),
    approvedAt: new Date(year, index, 20).toISOString(),
  }));
};

const generateDepartments = (): DepartmentData[] => [
  { id: 'dept-1', name: 'Construction', manpower: 65, manhours: 13000, incidents: 2, target: 1, color: '#3b82f6' },
  { id: 'dept-2', name: 'Electrical', manpower: 28, manhours: 5600, incidents: 1, target: 0, color: '#8b5cf6' },
  { id: 'dept-3', name: 'Mechanical', manpower: 42, manhours: 8400, incidents: 0, target: 0, color: '#f59e0b' },
  { id: 'dept-4', name: 'Civil', manpower: 35, manhours: 7000, incidents: 1, target: 1, color: '#10b981' },
  { id: 'dept-5', name: 'Safety', manpower: 8, manhours: 1600, incidents: 0, target: 0, color: '#ef4444' },
  { id: 'dept-6', name: 'Administration', manpower: 20, manhours: 4000, incidents: 0, target: 0, color: '#06b6d4' },
];

// --- Main Component ---
export const HseStatistics: React.FC = () => {
  // State Management
  const [activeTab, setActiveTab] = useState<MetricCategory>('Core & Workforce');
  const [selectedPeriod, setSelectedPeriod] = useState<HsePeriod>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-12');
  const [showTargets, setShowTargets] = useState(true);
  const [monthlyData] = useState<MonthlyData[]>(generateMonthlyData());
  const [departments] = useState<DepartmentData[]>(generateDepartments());
  const [reports, setReports] = useState<HseReport[]>([]);
  const [newMetric, setNewMetric] = useState<Partial<HseMetric>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const reportRef = useRef<HTMLDivElement>(null);

  // Enhanced Metrics State
  const [metrics, setMetrics] = useState<HseMetric[]>([
    // Core & Workforce
    { id: 'mp_total', label: 'Total Manpower', description: 'Total workforce count', prev: 190, curr: 198, target: 200, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'mh_total', label: 'Total Manhours', description: 'Total work hours logged', prev: 35000, curr: 39080, target: 40000, unit: 'Hours', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_tri', label: 'Total Recordable Incidents', description: 'OSHA recordable incidents', prev: 2, curr: 0, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_lti', label: 'Lost Time Injuries (LTI)', description: 'Injuries resulting in lost work days', prev: 0, curr: 0, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_fac', label: 'First Aid Cases', description: 'Minor injuries requiring first aid', prev: 5, curr: 2, target: 1, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_nm', label: 'Near Misses', description: 'Potential incidents that did not occur', prev: 12, curr: 8, target: 10, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_mtc', label: 'Medical Treatment Cases', description: 'Injuries requiring medical treatment', prev: 1, curr: 0, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'inc_fatal', label: 'Fatalities', description: 'Work-related fatalities', prev: 0, curr: 0, target: 0, unit: 'Count', category: 'Core & Workforce', status: 'completed', lastUpdated: '2024-12-15' },
    
    // Environment
    { id: 'env_spills', label: 'Chemical Spills', description: 'Environmental spills and releases', prev: 0, curr: 0, target: 0, unit: 'Count', category: 'Environment', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'env_waste', label: 'Waste Generated', description: 'Total waste produced', prev: 500, curr: 450, target: 400, unit: 'kg', category: 'Environment', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'env_energy', label: 'Energy Consumption', description: 'Total energy usage', prev: 5500, curr: 4800, target: 4500, unit: 'kWh', category: 'Environment', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'env_water', label: 'Water Consumption', description: 'Total water usage', prev: 2500, curr: 2300, target: 2000, unit: 'm³', category: 'Environment', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'env_co2', label: 'CO2 Emissions', description: 'Carbon dioxide emissions', prev: 12.5, curr: 11.8, target: 10, unit: 'tons', category: 'Environment', status: 'completed', lastUpdated: '2024-12-15' },
    
    // Health
    { id: 'health_sick', label: 'Sickness Absence', description: 'Work-related sickness days', prev: 3, curr: 1, target: 0, unit: 'Days', category: 'Health', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'health_screen', label: 'Health Screenings', description: 'Employee health assessments', prev: 85, curr: 95, target: 100, unit: 'Count', category: 'Health', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'health_ergo', label: 'Ergonomic Assessments', description: 'Workstation evaluations', prev: 15, curr: 20, target: 25, unit: 'Count', category: 'Health', status: 'completed', lastUpdated: '2024-12-15' },
    
    // Compliance
    { id: 'comp_insp', label: 'Safety Inspections', description: 'Completed safety inspections', prev: 10, curr: 12, target: 15, unit: 'Count', category: 'Compliance', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'comp_audit', label: 'Safety Audits', description: 'Internal safety audits', prev: 4, curr: 6, target: 8, unit: 'Count', category: 'Compliance', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'comp_training', label: 'Training Hours', description: 'Safety training delivered', prev: 320, curr: 380, target: 400, unit: 'Hours', category: 'Compliance', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'comp_tt', label: 'Toolbox Talks', description: 'Safety briefings conducted', prev: 25, curr: 30, target: 35, unit: 'Count', category: 'Compliance', status: 'completed', lastUpdated: '2024-12-15' },
    
    // Process
    { id: 'proc_psm', label: 'PSM Compliance', description: 'Process Safety Management compliance', prev: 92, curr: 95, target: 100, unit: '%', category: 'Process', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'proc_hazop', label: 'HAZOP Actions', description: 'Hazard analysis actions completed', prev: 45, curr: 52, target: 60, unit: 'Count', category: 'Process', status: 'completed', lastUpdated: '2024-12-15' },
    
    // Financial
    { id: 'fin_safety', label: 'Safety Investment', description: 'Safety equipment and training investment', prev: 50000, curr: 65000, target: 75000, unit: '$', category: 'Financial', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'fin_incident', label: 'Incident Costs', description: 'Cost of incidents and injuries', prev: 15000, curr: 8000, target: 5000, unit: '$', category: 'Financial', status: 'completed', lastUpdated: '2024-12-15' },
    { id: 'fin_insurance', label: 'Insurance Premiums', description: 'Workers compensation insurance', prev: 120000, curr: 115000, target: 110000, unit: '$', category: 'Financial', status: 'completed', lastUpdated: '2024-12-15' },
  ]);

  // Calculations
  const totals = useMemo(() => {
    const totalManhours = metrics.find(m => m.id === 'mh_total')?.curr || 1;
    const totalManpower = metrics.find(m => m.id === 'mp_total')?.curr || 0;
    const totalLTI = metrics.find(m => m.id === 'inc_lti')?.curr || 0;
    const totalRecordable = metrics.find(m => m.id === 'inc_tri')?.curr || 0;
    const totalFatalities = metrics.find(m => m.id === 'inc_fatal')?.curr || 0;
    const totalDART = metrics.find(m => m.id === 'inc_mtc')?.curr || 0;

    // OSHA Calculations
    const trir = ((totalRecordable * 200000) / totalManhours).toFixed(2);
    const ltifr = ((totalLTI * 1000000) / totalManhours).toFixed(2);
    const dartRate = ((totalDART * 200000) / totalManhours).toFixed(2);
    const fatalityRate = ((totalFatalities * 1000000) / totalManhours).toFixed(4);

    // Safety Performance Index
    const performanceMetrics = [
      { metric: metrics.find(m => m.id === 'inc_tri'), weight: 30 },
      { metric: metrics.find(m => m.id === 'inc_lti'), weight: 25 },
      { metric: metrics.find(m => m.id === 'comp_insp'), weight: 15 },
      { metric: metrics.find(m => m.id === 'comp_training'), weight: 15 },
      { metric: metrics.find(m => m.id === 'health_sick'), weight: 15 },
    ];

    const spi = performanceMetrics.reduce((score, item) => {
      if (item.metric && item.metric.target) {
        const achievement = (item.metric.curr / item.metric.target) * 100;
        return score + (Math.min(achievement, 100) * (item.weight / 100));
      }
      return score;
    }, 0).toFixed(1);

    return { 
      totalManhours, 
      totalManpower, 
      trir, 
      ltifr, 
      dartRate, 
      fatalityRate, 
      spi 
    };
  }, [metrics]);

  // Filtered Metrics
  const filteredMetrics = useMemo(() => {
    let filtered = metrics.filter(m => m.category === activeTab);
    
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [metrics, activeTab, searchQuery]);

  // Chart Data
  const chartData = useMemo(() => {
    return monthlyData.map(month => ({
      name: month.month.substring(0, 3),
      fullMonth: month.month,
      manhours: month.metrics.totalManhours || 0,
      incidents: month.metrics.totalIncidents || 0,
      manpower: month.metrics.totalManpower || 0,
      nearMisses: month.metrics.nearMisses || 0,
      waste: month.metrics.wasteGenerated || 0,
      inspections: month.metrics.inspectionsCompleted || 0,
    }));
  }, [monthlyData]);

  // Department Performance Data
  const departmentPerformance = useMemo(() => {
    return departments.map(dept => ({
      subject: dept.name,
      A: dept.incidents,
      B: dept.manpower,
      C: dept.manhours / 1000,
      fullMark: Math.max(dept.target, dept.incidents) + 5,
    }));
  }, [departments]);

  // Handlers
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

  const handleRefresh = () => {
    const updatedMetrics = metrics.map(m => ({
      ...m,
      prev: m.curr,
      curr: m.curr + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 10),
      lastUpdated: new Date().toISOString().split('T')[0]
    }));
    setMetrics(updatedMetrics);
  };

  // --- PROFESSIONAL PDF EXPORT (FIXED) ---
  const exportToPDF = () => {
    setIsExporting(true);
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString();

    // 1. Header Background
    doc.setFillColor(11, 17, 32); // Dark Blue/Black
    doc.rect(0, 0, pageWidth, 40, 'F');

    // 2. Logo (Vector Shield)
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(14, 10, 15, 15, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("ES", 16.5, 19);

    // Title
    doc.setFontSize(22);
    doc.text("EviroSafe HSE Report", 35, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${today}`, 35, 28);
    doc.text(`Period: ${selectedPeriod.toUpperCase()} - ${selectedMonth}`, 35, 33);

    // 3. Executive Summary (KPIs)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Executive Summary", 14, 50);

    const kpiData = [
        ['Total Manpower', totals.totalManpower.toString()],
        ['Total Manhours', totals.totalManhours.toLocaleString()],
        ['TRIR (per 200k)', totals.trir],
        ['LTIFR (per 1M)', totals.ltifr],
        ['DART Rate', totals.dartRate],
        ['Safety Index', totals.spi]
    ];

    autoTable(doc, {
        startY: 55,
        head: [['KPI', 'Value']],
        body: kpiData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }, // Emerald Green
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } }
    });

    // 4. Detailed Metrics Table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("Detailed Metrics", 14, finalY);

    const tableBody = filteredMetrics.map(m => [
        m.label,
        m.prev.toString(),
        m.curr.toString(),
        m.target?.toString() || '-',
        m.unit,
        m.status.toUpperCase()
    ]);

    autoTable(doc, {
        startY: finalY + 5,
        head: [['Metric', 'Prev', 'Curr', 'Target', 'Unit', 'Status']],
        body: tableBody,
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 }, // Slate Dark
        styles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [241, 245, 249] }
    });

    // 5. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} - EviroSafe Enterprise System`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`HSE_Report_${selectedMonth}.pdf`);
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

  // Component for Monthly Selector
  const MonthSelector = () => {
    const months = monthlyData.map(m => ({
      id: m.id,
      label: `${m.month} ${m.year}`,
      status: m.status
    }));
    const currentIndex = months.findIndex(m => m.id === selectedMonth);
    
    return (
      <div className="flex items-center gap-4">
        <button 
          onClick={() => { if (currentIndex > 0) setSelectedMonth(months[currentIndex - 1].id); }}
          disabled={currentIndex <= 0}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex gap-2">
          {months.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map(month => (
            <button
              key={month.id}
              onClick={() => setSelectedMonth(month.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMonth === month.id
                  ? 'bg-sky-900 text-sky-300 border border-sky-700'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {month.label.split(' ')[0]}
              {month.status === 'pending' && <span className="ml-2 w-2 h-2 bg-amber-500 rounded-full inline-block"></span>}
            </button>
          ))}
        </div>
        <button 
          onClick={() => { if (currentIndex < months.length - 1) setSelectedMonth(months[currentIndex + 1].id); }}
          disabled={currentIndex >= months.length - 1}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex gap-2 ml-4">
          <button className="px-3 py-2 bg-emerald-900/50 text-emerald-300 text-sm rounded-lg border border-emerald-700/50 hover:bg-emerald-900">
            <Plus className="w-4 h-4" />
          </button>
          <button className="px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white">
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Component for Performance Indicators
  const PerformanceIndicators = () => {
    const indicators = [
      { 
        label: 'TRIR', 
        value: totals.trir, 
        target: HSE_STANDARDS.OSHA.TRIR_TARGET, 
        icon: <AlertTriangle className="w-5 h-5" />,
        color: parseFloat(totals.trir) <= HSE_STANDARDS.OSHA.TRIR_TARGET ? 'text-emerald-400' : 'text-red-400',
        bgColor: parseFloat(totals.trir) <= HSE_STANDARDS.OSHA.TRIR_TARGET ? 'bg-emerald-900/30' : 'bg-red-900/30'
      },
      { 
        label: 'LTIFR', 
        value: totals.ltifr, 
        target: HSE_STANDARDS.OSHA.LTIFR_TARGET, 
        icon: <Activity className="w-5 h-5" />,
        color: parseFloat(totals.ltifr) <= HSE_STANDARDS.OSHA.LTIFR_TARGET ? 'text-emerald-400' : 'text-red-400',
        bgColor: parseFloat(totals.ltifr) <= HSE_STANDARDS.OSHA.LTIFR_TARGET ? 'bg-emerald-900/30' : 'bg-red-900/30'
      },
      { 
        label: 'DART Rate', 
        value: totals.dartRate, 
        target: HSE_STANDARDS.OSHA.DART_RATE_TARGET, 
        icon: <Thermometer className="w-5 h-5" />,
        color: parseFloat(totals.dartRate) <= HSE_STANDARDS.OSHA.DART_RATE_TARGET ? 'text-emerald-400' : 'text-amber-400',
        bgColor: parseFloat(totals.dartRate) <= HSE_STANDARDS.OSHA.DART_RATE_TARGET ? 'bg-emerald-900/30' : 'bg-amber-900/30'
      },
      { 
        label: 'SPI', 
        value: totals.spi, 
        target: 90, 
        icon: <Award className="w-5 h-5" />,
        color: parseFloat(totals.spi) >= 90 ? 'text-emerald-400' : parseFloat(totals.spi) >= 80 ? 'text-amber-400' : 'text-red-400',
        bgColor: parseFloat(totals.spi) >= 90 ? 'bg-emerald-900/30' : parseFloat(totals.spi) >= 80 ? 'bg-amber-900/30' : 'bg-red-900/30'
      },
    ];
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {indicators.map(indicator => (
          <div key={indicator.label} className={`p-4 rounded-xl border border-slate-800 ${indicator.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {indicator.icon}
                <span className="text-sm font-bold text-slate-400">{indicator.label}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-400">
                Target: {indicator.target}
              </span>
            </div>
            <div className={`text-3xl font-black ${indicator.color} mb-1`}>
              {indicator.value}
            </div>
            <div className="text-xs text-slate-500">
              {parseFloat(indicator.value) <= indicator.target ? 'Meeting Target' : 'Needs Improvement'}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 p-6">
      <div ref={reportRef} className="bg-[#0B1120] p-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <Shield className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">HSE Statistics Dashboard</h1>
              <p className="text-slate-400 mt-1">
                ISO 45001 • OSHA Compliant • Monthly Reporting
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Manpower</p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xl font-bold text-white">{totals.totalManpower}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Manhours</p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-xl font-bold text-white">{totals.totalManhours.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">TRIR</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xl font-bold text-white">{totals.trir}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (MOVED TO TOP) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-8 overflow-x-auto sticky top-0 z-10 bg-[#0B1120] pt-2">
          <div className="flex gap-1">
            {[
              { id: 'Core & Workforce', icon: <Shield className="w-4 h-4" /> },
              { id: 'Compliance', icon: <Activity className="w-4 h-4" /> },
              { id: 'Environment', icon: <Leaf className="w-4 h-4" /> },
              { id: 'Health', icon: <Heart className="w-4 h-4" /> },
              { id: 'Process', icon: <Settings className="w-4 h-4" /> },
              { id: 'Behavioral', icon: <Users className="w-4 h-4" /> },
              { id: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
              { id: 'Performance', icon: <BarChart3 className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MetricCategory)}
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
          
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500">
              Data as of: <span className="text-slate-300 font-bold">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="mb-8 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white">Monthly Statistics</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400">Reporting Period:</span>
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as HsePeriod)}
                className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          
          <MonthSelector />
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></div>
                <span className="text-sm text-slate-400">Approved</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500"></div>
                <span className="text-sm text-slate-400">Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></div>
                <span className="text-sm text-slate-400">In Progress</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white">
                <Save className="w-4 h-4" />
              </button>
              <button className="px-3 py-1.5 bg-blue-900/50 text-blue-300 text-sm rounded-lg border border-blue-700/50 hover:bg-blue-900">
                <Upload className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <PerformanceIndicators />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Data Table (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
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
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white">{activeTab} Metrics</h3>
                  <p className="text-sm text-slate-500">
                    {filteredMetrics.length} metrics • Last updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={exportToPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-3 py-2 bg-red-900/50 text-red-300 text-sm rounded-lg border border-red-700/50 hover:bg-red-900 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    {isExporting ? 'Generating...' : 'Export PDF'}
                  </button>
                  <button className="flex items-center gap-2 px-3 py-2 bg-blue-900/50 text-blue-300 text-sm rounded-lg border border-blue-700/50 hover:bg-blue-900">
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>
              
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

          {/* Charts & Visualizations (1/3 width) */}
          <div className="space-y-6">
            {/* Trend Analysis */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-sky-400" />
                Trend Analysis
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorManhours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                      itemStyle={{ fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="manhours" stroke="#3b82f6" fill="url(#colorManhours)" strokeWidth={2} />
                    <Line type="monotone" dataKey="incidents" stroke="#ef4444" strokeWidth={2} dot={{r: 3, fill: '#ef4444'}} />
                    <Line type="monotone" dataKey="inspections" stroke="#10b981" strokeWidth={2} dot={{r: 3, fill: '#10b981'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500"></span>
                  <span className="text-slate-400">Manhours</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500"></span>
                  <span className="text-slate-400">Incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></span>
                  <span className="text-slate-400">Inspections</span>
                </div>
              </div>
            </div>

            {/* Department Performance */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                Department Performance
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, incidents }) => `${name}: ${incidents}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="incidents"
                    >
                      {departments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold text-white mb-4">KPI Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Manpower Growth', value: '+4.2%', icon: <Users className="w-4 h-4" />, color: 'text-blue-400' },
                  { label: 'Incident Reduction', value: '-60%', icon: <AlertTriangle className="w-4 h-4" />, color: 'text-emerald-400' },
                  { label: 'Waste Reduction', value: '-10%', icon: <Leaf className="w-4 h-4" />, color: 'text-green-400' },
                  { label: 'Training Completion', value: '95%', icon: <Award className="w-4 h-4" />, color: 'text-purple-400' },
                ].map((kpi) => (
                  <div key={kpi.label} className="flex items-center justify-between p-2 hover:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${kpi.color.replace('text-', 'bg-')}/20`}>
                        <div className={kpi.color}>{kpi.icon}</div>
                      </div>
                      <span className="text-sm text-slate-300">{kpi.label}</span>
                    </div>
                    <span className={`font-bold ${kpi.color}`}>{kpi.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Department Radar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              Department Performance Radar
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={departmentPerformance}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#94a3b8' }} />
                  <Radar name="Performance" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Radar name="Capacity" dataKey="B" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Hours" dataKey="C" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Legend />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              Monthly Comparison
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.slice(-6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="manhours" fill="#3b82f6" name="Manhours" />
                  <Bar dataKey="incidents" fill="#ef4444" name="Incidents" />
                  <Line type="monotone" dataKey="nearMisses" stroke="#f59e0b" strokeWidth={2} name="Near Misses" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Reports History */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white">Recent Reports</h3>
            <button className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
              <Database className="w-4 h-4" />
              View All Reports
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-bold text-left">Report Title</th>
                  <th className="pb-3 font-bold text-center">Period</th>
                  <th className="pb-3 font-bold text-center">Generated</th>
                  <th className="pb-3 font-bold text-center">Status</th>
                  <th className="pb-3 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reports.length > 0 ? (
                  reports.map(report => (
                    <tr key={report.id} className="hover:bg-slate-800/50">
                      <td className="py-3">
                        <div className="font-medium text-slate-300">{report.title}</div>
                        <div className="text-xs text-slate-500">{report.id}</div>
                      </td>
                      <td className="py-3 text-center text-slate-400">{report.period}</td>
                      <td className="py-3 text-center text-slate-400">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-700/50">
                          Generated
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 text-slate-500 hover:text-sky-400">
                            <Download className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-slate-500 hover:text-emerald-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-slate-500 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No reports generated yet</p>
                      <p className="text-sm mt-1">Generate your first report using the export buttons above</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};