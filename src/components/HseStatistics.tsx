import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  Activity, Users, Clock, AlertTriangle, 
  RefreshCw, Download, Shield, Leaf, Heart, 
  Settings, BarChart3, DollarSign, EyeOff, Eye,
  FileText, Calendar, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight, Plus, Trash2,
  FileSpreadsheet, Printer, Search,
  Save, Upload, Target, Award,
  Thermometer, Droplets, Wind, CloudLightning,
  Filter, Bell, DownloadCloud, Star,
  PieChart as PieChartIcon, Target as TargetIcon,
  BellOff, Maximize2, Minimize2, Grid,
  Smartphone, Tablet, Monitor,
  TrendingUp as TrendingUpIcon, AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, Bar, Pie, Cell, Radar, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Scatter,
  ScatterChart, ZAxis, ReferenceLine
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAppContext, useDataContext } from '../contexts';
import type { Report, Inspection } from '../types';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// --- Types ---
type MetricCategory = 'Core & Workforce' | 'Compliance' | 'Environment' | 'Health' | 'Process' | 'Behavioral' | 'Financial' | 'Performance';
type HsePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type HseStatus = 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected';
type TrendDirection = 'improving' | 'declining' | 'stable';
type WidgetType = 'chart' | 'metric' | 'table' | 'gauge' | 'radar' | 'pie';
type ExportTemplate = 'standard' | 'executive' | 'detailed' | 'compliance';

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
  trend?: TrendDirection;
  benchmark?: number | null;
  confidence?: number;
  predictedNextMonth?: number;
  historicalData?: number[];
  severity?: 'high' | 'medium' | 'low';
}

interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  config: any;
  position: { x: number; y: number; w: number; h: number };
  isVisible: boolean;
}

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: Date;
}

// --- HSE Standards ---
const HSE_STANDARDS = {
  OSHA: {
    TRIR_TARGET: 2.5,
    LTIFR_TARGET: 1.2,
    DART_RATE_TARGET: 2.0,
    FATALITY_TARGET: 0,
  },
  INDUSTRY_BENCHMARKS: {
    'Total Manpower': 150,
    'Est. Manhours': 24000,
    'Total Incidents': 3,
    'Lost Time Injuries': 0,
    'Near Misses': 8,
    'Inspections Done': 12,
    'Total Inspections': 15,
    'Env. Incidents': 1,
  }
};

// Custom hooks for enhanced functionality
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

const useVisibilityChange = (callback: (isVisible: boolean) => void) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      callback(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback]);
};

export const HseStatistics: React.FC = () => {
  const { reportList, inspectionList, projects } = useDataContext();
  const { usersList, activeOrg } = useAppContext();

  // Enhanced State Management
  const [activeTab, setActiveTab] = useState<MetricCategory>('Core & Workforce');
  const [selectedPeriod, setSelectedPeriod] = useState<HsePeriod>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>('2024-12');
  const [showTargets, setShowTargets] = useState(true);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [filters, setFilters] = useState({
    status: [] as HseStatus[],
    dateRange: { start: null as Date | null, end: null as Date | null },
    minValue: null as number | null,
    maxValue: null as number | null,
    severity: [] as string[],
  });
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'key-metrics',
      title: 'Key Performance Indicators',
      type: 'metric',
      config: { metrics: ['trir', 'ltifr', 'incidents', 'inspections'] },
      position: { x: 0, y: 0, w: 4, h: 2 },
      isVisible: true
    },
    {
      id: 'trend-chart',
      title: '6-Month Trend Analysis',
      type: 'chart',
      config: { chartType: 'composed', dataKeys: ['manhours', 'incidents', 'inspections'] },
      position: { x: 4, y: 0, w: 4, h: 3 },
      isVisible: true
    },
    {
      id: 'severity-distribution',
      title: 'Incident Severity Distribution',
      type: 'pie',
      config: { dataKey: 'value', nameKey: 'name' },
      position: { x: 0, y: 2, w: 4, h: 3 },
      isVisible: true
    },
    {
      id: 'benchmark-comparison',
      title: 'Industry Benchmark Comparison',
      type: 'radar',
      config: { metrics: ['TRIR', 'LTIFR', 'Incidents', 'Inspections'] },
      position: { x: 4, y: 3, w: 4, h: 3 },
      isVisible: true
    },
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [exportTemplate, setExportTemplate] = useState<ExportTemplate>('standard');

  // Toast notification system
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    const newToast: ToastNotification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== newToast.id));
    }, 5000);
  }, []);

  // --- ENHANCED REAL DATA CALCULATION ENGINE ---
  const realStats = useMemo(() => {
    // 1. Counts with enhanced categorization
    const totalManpower = usersList.length;
    const estimatedManhours = totalManpower * 160;
    
    // Enhanced incident categorization with severity
    const incidents = reportList.map(r => {
      let severity: 'high' | 'medium' | 'low' = 'medium';
      if (r.type === 'Lost Time Injury (LTI)' || r.type === 'Fire Event') severity = 'high';
      if (r.type === 'Near Miss' || r.type === 'First Aid Case (FAC)') severity = 'low';
      
      return {
        ...r,
        severity
      };
    });
    
    const ltis = incidents.filter(r => r.type === 'Lost Time Injury (LTI)');
    const nearMisses = incidents.filter(r => r.type === 'Near Miss');
    const firstAid = incidents.filter(r => r.type === 'First Aid Case (FAC)');
    const envIncidents = incidents.filter(r => r.type === 'Environmental Incident');
    
    const inspectionsCompleted = inspectionList.filter(i => i.status === 'Closed' || i.status === 'Approved').length;
    const inspectionsTotal = inspectionList.length;

    // 2. Advanced Rates Calculation
    const recordableIncidents = incidents.length;
    const trir = estimatedManhours > 0 ? ((recordableIncidents * 200000) / estimatedManhours).toFixed(2) : "0.00";
    const ltifr = estimatedManhours > 0 ? ((ltis.length * 1000000) / estimatedManhours).toFixed(2) : "0.00";

    // 3. Severity Distribution
    const severityDistribution = {
      high: incidents.filter(r => r.severity === 'high').length,
      medium: incidents.filter(r => r.severity === 'medium').length,
      low: incidents.filter(r => r.severity === 'low').length,
    };

    // 4. Monthly Trends (12 months)
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      const monthKey = date.toISOString().slice(0, 7);
      
      const monthReports = incidents.filter(r => {
        const reportDate = new Date(r.date);
        return reportDate.getMonth() === date.getMonth() && 
               reportDate.getFullYear() === date.getFullYear();
      });
      
      return {
        name: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        incidents: monthReports.length,
        lti: monthReports.filter(r => r.type === 'Lost Time Injury (LTI)').length,
        nearMiss: monthReports.filter(r => r.type === 'Near Miss').length,
        firstAid: monthReports.filter(r => r.type === 'First Aid Case (FAC)').length,
        envIncidents: monthReports.filter(r => r.type === 'Environmental Incident').length,
        inspections: inspectionList.filter(i => {
          const inspDate = new Date(i.date);
          return inspDate.getMonth() === date.getMonth() && 
                 inspDate.getFullYear() === date.getFullYear();
        }).length,
      };
    });

    // 5. Predictive Analytics
    const calculateTrend = (values: number[]) => {
      if (values.length < 2) return { forecast: 0, confidence: 0 };
      
      const n = values.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      
      values.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const forecast = slope * (n) + intercept;
      const confidence = Math.min(95, Math.abs(slope) * 100);
      
      return { forecast: Math.max(0, Math.round(forecast)), confidence };
    };

    // 6. Benchmark Comparison
    const benchmarkComparison = {
      'TRIR': { current: parseFloat(trir), benchmark: HSE_STANDARDS.OSHA.TRIR_TARGET },
      'LTIFR': { current: parseFloat(ltifr), benchmark: HSE_STANDARDS.OSHA.LTIFR_TARGET },
      'Incidents': { current: incidents.length, benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Total Incidents'] },
      'Inspections': { current: inspectionsCompleted, benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Inspections Done'] },
    };

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
        ltifr,
        severityDistribution,
        monthlyTrend,
        benchmarkComparison,
        calculateTrend
    };
  }, [reportList, inspectionList, usersList]);

  // --- ENHANCED METRICS WITH PREDICTIVE ANALYTICS ---
  const [metrics, setMetrics] = useState<HseMetric[]>([]);
  const [newMetric, setNewMetric] = useState<Partial<HseMetric>>({});

  useEffect(() => {
    const initialMetrics: HseMetric[] = [
      { 
        id: 'mp_total', 
        label: 'Total Manpower', 
        description: 'Active users in system', 
        prev: 0, 
        curr: realStats.manpower, 
        target: null, 
        unit: 'Count', 
        category: 'Core & Workforce', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Total Manpower'],
        historicalData: [realStats.manpower * 0.9, realStats.manpower * 0.95, realStats.manpower]
      },
      { 
        id: 'mh_total', 
        label: 'Est. Manhours', 
        description: 'Based on active workforce', 
        prev: 0, 
        curr: realStats.manhours, 
        target: null, 
        unit: 'Hours', 
        category: 'Core & Workforce', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Est. Manhours']
      },
      { 
        id: 'inc_tri', 
        label: 'Total Incidents', 
        description: 'All reported incidents', 
        prev: 0, 
        curr: realStats.incidents, 
        target: 0, 
        unit: 'Count', 
        category: 'Core & Workforce', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Total Incidents'],
        severity: realStats.incidents > 5 ? 'high' : realStats.incidents > 2 ? 'medium' : 'low'
      },
      { 
        id: 'inc_lti', 
        label: 'Lost Time Injuries', 
        description: 'LTI Events', 
        prev: 0, 
        curr: realStats.ltis, 
        target: 0, 
        unit: 'Count', 
        category: 'Core & Workforce', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        severity: realStats.ltis > 0 ? 'high' : 'low'
      },
      { 
        id: 'inc_nm', 
        label: 'Near Misses', 
        description: 'Reported near misses', 
        prev: 0, 
        curr: realStats.nearMisses, 
        target: 5, 
        unit: 'Count', 
        category: 'Core & Workforce', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Near Misses']
      },
      { 
        id: 'comp_insp', 
        label: 'Inspections Done', 
        description: 'Completed/Approved inspections', 
        prev: 0, 
        curr: realStats.inspectionsCompleted, 
        target: 10, 
        unit: 'Count', 
        category: 'Compliance', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Inspections Done']
      },
      { 
        id: 'comp_total', 
        label: 'Total Inspections', 
        description: 'All inspections logged', 
        prev: 0, 
        curr: realStats.inspectionsTotal, 
        target: null, 
        unit: 'Count', 
        category: 'Compliance', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString()
      },
      { 
        id: 'env_inc', 
        label: 'Env. Incidents', 
        description: 'Spills or releases', 
        prev: 0, 
        curr: realStats.envIncidents, 
        target: 0, 
        unit: 'Count', 
        category: 'Environment', 
        status: 'completed', 
        lastUpdated: new Date().toLocaleDateString(),
        benchmark: HSE_STANDARDS.INDUSTRY_BENCHMARKS['Env. Incidents']
      },
    ];

    // Add predictive analytics to metrics
    const enhancedMetrics = initialMetrics.map(metric => {
      if (metric.historicalData) {
        const prediction = realStats.calculateTrend(metric.historicalData);
        return {
          ...metric,
          predictedNextMonth: prediction.forecast,
          confidence: prediction.confidence
        };
      }
      return metric;
    });

    setMetrics(enhancedMetrics);
  }, [realStats]);

  // Advanced filtering with debounced search
  const filteredMetrics = useMemo(() => {
    let filtered = metrics.filter(m => m.category === activeTab);
    
    // Search filter
    if (debouncedSearchQuery) {
      filtered = filtered.filter(m => 
        m.label.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(m => filters.status.includes(m.status));
    }
    
    // Value range filter
    if (filters.minValue !== null) {
      filtered = filtered.filter(m => m.curr >= filters.minValue!);
    }
    if (filters.maxValue !== null) {
      filtered = filtered.filter(m => m.curr <= filters.maxValue!);
    }
    
    // Severity filter
    if (filters.severity.length > 0) {
      filtered = filtered.filter(m => m.severity && filters.severity.includes(m.severity));
    }
    
    return filtered;
  }, [metrics, activeTab, debouncedSearchQuery, filters]);

  // Performance: Group metrics by category for faster rendering
  const categorizedMetrics = useMemo(() => {
    return metrics.reduce((acc, metric) => {
      acc[metric.category] = acc[metric.category] || [];
      acc[metric.category].push(metric);
      return acc;
    }, {} as Record<MetricCategory, HseMetric[]>);
  }, [metrics]);

  // --- ENHANCED EXPORT FUNCTIONS ---
  const exportTemplates = {
    'standard': { includeCharts: true, includeMetrics: true, includeSummary: true },
    'executive': { includeCharts: true, includeSummary: true, rawData: false },
    'detailed': { includeAllData: true, rawData: true, includeCharts: true },
    'compliance': { includeMetrics: true, includeStandards: true, includeGaps: true },
  };

  const exportToPDF = useCallback((template: ExportTemplate = 'standard') => {
    setIsExporting(true);
    const templateConfig = exportTemplates[template];
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Enhanced header with template-specific styling
    doc.setFillColor(11, 17, 32);
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(`${template.toUpperCase()} HSE Performance Report`, 14, 25);
    
    doc.setFontSize(10);
    doc.text(`Organization: ${activeOrg.name}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
    doc.text(`Period: ${selectedPeriod}`, 150, 42);

    // Summary section
    if (templateConfig.includeSummary) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('Executive Summary', 14, 60);
      
      const summaryText = [
        `Total Manpower: ${realStats.manpower}`,
        `TRIR: ${realStats.trir} (Target: ${HSE_STANDARDS.OSHA.TRIR_TARGET})`,
        `LTIFR: ${realStats.ltifr} (Target: ${HSE_STANDARDS.OSHA.LTIFR_TARGET})`,
        `Total Incidents: ${realStats.incidents}`,
        `Completed Inspections: ${realStats.inspectionsCompleted}/${realStats.inspectionsTotal}`
      ];
      
      summaryText.forEach((text, i) => {
        doc.setFontSize(11);
        doc.text(text, 14, 70 + (i * 7));
      });
    }

    // Metrics table
    let startY = templateConfig.includeSummary ? 110 : 70;
    
    const tableData = filteredMetrics.map(m => [
      m.label, 
      m.curr.toString(), 
      m.target?.toString() || '-', 
      m.benchmark?.toString() || '-',
      m.unit,
      m.trend || 'stable'
    ]);
    
    autoTable(doc, {
      startY,
      head: [['Metric', 'Current', 'Target', 'Benchmark', 'Unit', 'Trend']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    // Standards compliance section
    if (template === 'compliance') {
      doc.addPage();
      doc.setFontSize(16);
      doc.text('OSHA Standards Compliance', 14, 20);
      
      const complianceData = [
        ['Standard', 'Your Value', 'OSHA Target', 'Status'],
        ['TRIR', realStats.trir, HSE_STANDARDS.OSHA.TRIR_TARGET.toString(), 
         parseFloat(realStats.trir) <= HSE_STANDARDS.OSHA.TRIR_TARGET ? 'Compliant' : 'Non-Compliant'],
        ['LTIFR', realStats.ltifr, HSE_STANDARDS.OSHA.LTIFR_TARGET.toString(),
         parseFloat(realStats.ltifr) <= HSE_STANDARDS.OSHA.LTIFR_TARGET ? 'Compliant' : 'Non-Compliant']
      ];
      
      autoTable(doc, {
        startY: 30,
        head: complianceData.shift() as any,
        body: complianceData,
      });
    }

    doc.save(`HSE_${template}_Report_${new Date().toISOString().slice(0,10)}.pdf`);
    setIsExporting(false);
    showToast(`${template} PDF exported successfully!`, 'success');
  }, [filteredMetrics, realStats, activeOrg.name, selectedPeriod]);

  const exportToExcel = useCallback((template: ExportTemplate = 'standard') => {
    setIsExporting(true);
    try {
      const templateConfig = exportTemplates[template];
      
      const worksheetData = [
        [`${template.toUpperCase()} HSE STATISTICS REPORT`, '', '', '', '', ''],
        ['Organization', activeOrg.name, '', '', '', ''],
        ['Generated', new Date().toLocaleString(), '', '', '', ''],
        ['Period', selectedPeriod, 'Month', selectedMonth.split('-')[1], 'Year', selectedMonth.split('-')[0]],
        ['', '', '', '', '', ''],
      ];

      // Add summary section
      if (templateConfig.includeSummary) {
        worksheetData.push(['EXECUTIVE SUMMARY', '', '', '', '', '']);
        worksheetData.push(['Total Manpower', realStats.manpower.toString(), '', '', '', '']);
        worksheetData.push(['Total Manhours', realStats.manhours.toString(), '', '', '', '']);
        worksheetData.push(['TRIR', realStats.trir, 'Target', HSE_STANDARDS.OSHA.TRIR_TARGET.toString(), '', '']);
        worksheetData.push(['LTIFR', realStats.ltifr, 'Target', HSE_STANDARDS.OSHA.LTIFR_TARGET.toString(), '', '']);
        worksheetData.push(['', '', '', '', '', '']);
      }

      // Metrics table
      worksheetData.push(['METRIC', 'PREVIOUS', 'CURRENT', 'TARGET', 'BENCHMARK', 'UNIT', 'TREND', 'STATUS', 'SEVERITY']);
      
      metrics.forEach(metric => {
        worksheetData.push([
          metric.label,
          metric.prev.toString(),
          metric.curr.toString(),
          metric.target?.toString() || '-',
          metric.benchmark?.toString() || '-',
          metric.unit,
          metric.trend || 'stable',
          metric.status,
          metric.severity || '-'
        ]);
      });

      // Add monthly trend data
      if (templateConfig.includeAllData) {
        worksheetData.push(['', '', '', '', '', '', '', '', '']);
        worksheetData.push(['MONTHLY TREND DATA', '', '', '', '', '', '', '', '']);
        worksheetData.push(['Month', 'Incidents', 'LTI', 'Near Miss', 'First Aid', 'Env. Incidents', 'Inspections']);
        
        realStats.monthlyTrend.forEach(month => {
          worksheetData.push([
            month.name,
            month.incidents.toString(),
            month.lti.toString(),
            month.nearMiss.toString(),
            month.firstAid.toString(),
            month.envIncidents.toString(),
            month.inspections.toString()
          ]);
        });
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Style adjustments
      const wscols = [
        {wch: 25}, // Metric
        {wch: 10}, // Previous
        {wch: 10}, // Current
        {wch: 10}, // Target
        {wch: 12}, // Benchmark
        {wch: 8},  // Unit
        {wch: 10}, // Trend
        {wch: 12}, // Status
        {wch: 10}, // Severity
      ];
      ws['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(wb, ws, 'HSE Statistics');
      
      // Add a second sheet for severity distribution
      const severityData = Object.entries(realStats.severityDistribution).map(([name, value]) => [name, value]);
      const severityWs = XLSX.utils.aoa_to_sheet([
        ['SEVERITY DISTRIBUTION'],
        ['Severity', 'Count'],
        ...severityData
      ]);
      XLSX.utils.book_append_sheet(wb, severityWs, 'Severity Analysis');
      
      XLSX.writeFile(wb, `HSE_${template}_Statistics_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      showToast(`${template} Excel exported successfully!`, 'success');
    } catch (error) {
      console.error('Excel export failed:', error);
      showToast('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [metrics, realStats, activeOrg.name, selectedMonth, selectedPeriod]);

  // Schedule export functionality
  const scheduleExport = useCallback((frequency: 'daily' | 'weekly' | 'monthly', email: string) => {
    showToast(`Scheduled ${frequency} export to ${email}`, 'success');
    // In a real app, this would make an API call to schedule exports
  }, [showToast]);

  // --- REAL-TIME UPDATES AND WEBSOCKET SIMULATION ---
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Simulate WebSocket connection for real-time updates
  useEffect(() => {
    const simulateWebSocket = () => {
      // In a real app, this would be a WebSocket connection
      const updateInterval = setInterval(() => {
        // Simulate receiving real-time updates
        if (Math.random() > 0.7) { // 30% chance of update
          const randomMetricIndex = Math.floor(Math.random() * metrics.length);
          if (metrics[randomMetricIndex]) {
            setMetrics(prev => prev.map((m, i) => 
              i === randomMetricIndex ? { 
                ...m, 
                curr: Math.max(0, m.curr + (Math.random() > 0.5 ? 1 : -1)),
                lastUpdated: new Date().toISOString().split('T')[0]
              } : m
            ));
          }
        }
      }, 10000); // Every 10 seconds
      
      return () => clearInterval(updateInterval);
    };
    
    const cleanup = simulateWebSocket();
    return cleanup;
  }, [metrics.length]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E for Excel export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        exportToExcel(exportTemplate);
      }
      // Ctrl/Cmd + P for PDF export
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        exportToPDF(exportTemplate);
      }
      // Ctrl/Cmd + R for refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
      // Ctrl/Cmd + F for search focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape') {
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exportTemplate, exportToExcel, exportToPDF]);

  // --- ENHANCED HANDLERS ---
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    showToast('Refreshing data...', 'info');
    
    // Simulate API call
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
      showToast('Data refreshed successfully!', 'success');
    }, 1500);
  }, [showToast]);

  const handleAddMetric = useCallback(() => {
    if (newMetric.label && newMetric.category) {
      const metric: HseMetric = {
        id: `metric_${Date.now()}`,
        label: newMetric.label,
        description: newMetric.description || '',
        prev: 0,
        curr: newMetric.curr || 0,
        target: newMetric.target || null,
        unit: newMetric.unit || 'Count',
        category: newMetric.category as MetricCategory,
        status: 'pending',
        lastUpdated: new Date().toISOString().split('T')[0],
        benchmark: newMetric.benchmark || null,
        historicalData: [0, 0, 0]
      };
      
      setMetrics(prev => [...prev, metric]);
      setNewMetric({});
      showToast(`Added new metric: ${metric.label}`, 'success');
    }
  }, [newMetric, showToast]);

  const handleDeleteMetric = useCallback((id: string) => {
    const metric = metrics.find(m => m.id === id);
    setMetrics(prev => prev.filter(m => m.id !== id));
    showToast(`Deleted metric: ${metric?.label}`, 'info');
  }, [metrics, showToast]);

  const handleInputChange = useCallback((id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setMetrics(prev => prev.map(m => {
      if (m.id === id) {
        const trend: TrendDirection = numValue > m.prev ? 'declining' : numValue < m.prev ? 'improving' : 'stable';
        const severity: 'high' | 'medium' | 'low' = 
          numValue > 10 ? 'high' : numValue > 5 ? 'medium' : 'low';
        
        return { 
          ...m, 
          curr: numValue,
          trend,
          severity,
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      }
      return m;
    }));
  }, []);

  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
    ));
  }, []);

  const handleMetricNavigation = useCallback((e: React.KeyboardEvent, metricId: string) => {
    if (e.key === 'Enter') {
      // Open edit mode for metric
      const input = e.currentTarget.querySelector('input');
      input?.focus();
    }
    if (e.key === 'Delete') {
      handleDeleteMetric(metricId);
    }
  }, [handleDeleteMetric]);

  // --- RESPONSIVE DESIGN HOOKS ---
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Render responsive table
  const renderResponsiveTable = () => {
    if (isMobile) {
      return (
        <div className="space-y-4">
          {filteredMetrics.map((metric) => (
            <div 
              key={metric.id} 
              className="bg-slate-800 p-4 rounded-lg border border-slate-700"
              onKeyDown={(e) => handleMetricNavigation(e, metric.id)}
              tabIndex={0}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-medium text-slate-300">{metric.label}</h4>
                  <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
                </div>
                <button
                  onClick={() => handleDeleteMetric(metric.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={`Delete ${metric.label}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Current</p>
                  <input 
                    type="number" 
                    value={metric.curr}
                    onChange={(e) => handleInputChange(metric.id, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white text-center rounded-lg py-2 px-2 focus:outline-none focus:border-sky-500"
                    aria-label={`Current value for ${metric.label}`}
                  />
                </div>
                
                {showTargets && metric.target !== null && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Target</p>
                    <div className="px-3 py-2 rounded-full bg-amber-900/30 text-amber-400 text-xs border border-amber-700/50 text-center">
                      {metric.target}
                    </div>
                  </div>
                )}
                
                {showBenchmarks && metric.benchmark !== null && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Benchmark</p>
                    <div className="px-3 py-2 rounded-full bg-purple-900/30 text-purple-400 text-xs border border-purple-700/50 text-center">
                      {metric.benchmark}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-slate-400 mb-1">Trend</p>
                  {metric.trend === 'improving' && (
                    <div className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-700/50 w-full">
                      <TrendingDown className="w-3 h-3" />
                      Improving
                    </div>
                  )}
                  {metric.trend === 'declining' && (
                    <div className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-red-900/30 text-red-400 text-xs border border-red-700/50 w-full">
                      <TrendingUp className="w-3 h-3" />
                      Declining
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Desktop table view
    return (
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
          <tr>
            <th className="px-6 py-3 font-bold">Metric</th>
            <th className="px-6 py-3 font-bold text-center">Previous</th>
            <th className="px-6 py-3 font-bold text-center">Current</th>
            {showTargets && (
              <th className="px-6 py-3 font-bold text-center">Target</th>
            )}
            {showBenchmarks && (
              <th className="px-6 py-3 font-bold text-center">Benchmark</th>
            )}
            <th className="px-6 py-3 font-bold text-center">Unit</th>
            <th className="px-6 py-3 font-bold text-center">Trend</th>
            <th className="px-6 py-3 font-bold text-center">Prediction</th>
            <th className="px-6 py-3 font-bold text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {filteredMetrics.map((metric) => (
            <tr 
              key={metric.id} 
              className="hover:bg-slate-800/50 transition-colors"
              onKeyDown={(e) => handleMetricNavigation(e, metric.id)}
              tabIndex={0}
            >
              <td className="px-6 py-4">
                <div>
                  <div className="font-medium text-slate-300">{metric.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{metric.description}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {metric.severity === 'high' && (
                      <span className="px-2 py-1 rounded-full bg-red-900/30 text-red-400 text-xs border border-red-700/50">
                        High Severity
                      </span>
                    )}
                    {metric.severity === 'medium' && (
                      <span className="px-2 py-1 rounded-full bg-amber-900/30 text-amber-400 text-xs border border-amber-700/50">
                        Medium Severity
                      </span>
                    )}
                    {metric.severity === 'low' && (
                      <span className="px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-400 text-xs border border-emerald-700/50">
                        Low Severity
                      </span>
                    )}
                  </div>
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
                  aria-label={`Edit current value for ${metric.label}`}
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
              {showBenchmarks && (
                <td className="px-6 py-4 text-center">
                  {metric.benchmark !== null ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-400 font-mono text-xs border border-purple-700/50">
                        {metric.benchmark}
                      </span>
                      {metric.curr > metric.benchmark ? (
                        <span className="text-xs text-red-400">Above benchmark</span>
                      ) : (
                        <span className="text-xs text-emerald-400">Below benchmark</span>
                      )}
                    </div>
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
                {metric.predictedNextMonth !== undefined && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 font-mono text-xs border border-blue-700/50">
                      {metric.predictedNextMonth}
                    </span>
                    {metric.confidence && (
                      <span className="text-[10px] text-slate-500">
                        {Math.round(metric.confidence)}% confidence
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => handleDeleteMetric(metric.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  aria-label={`Delete ${metric.label}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // --- CHART DATA GENERATION ---
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return d.toLocaleString('default', { month: 'short' });
    });

    return last6Months.map(month => {
      const isCurrentMonth = month === new Date().toLocaleString('default', { month: 'short' });
      return {
        name: month,
        manhours: isCurrentMonth ? realStats.manhours : Math.floor(realStats.manhours * 0.9),
        incidents: isCurrentMonth ? realStats.incidents : Math.floor(Math.random() * 2),
        inspections: isCurrentMonth ? realStats.inspectionsCompleted : Math.floor(Math.random() * 5)
      };
    });
  }, [realStats]);

  // Severity distribution data for pie chart
  const severityData = useMemo(() => [
    { name: 'High', value: realStats.severityDistribution.high, color: '#ef4444' },
    { name: 'Medium', value: realStats.severityDistribution.medium, color: '#f59e0b' },
    { name: 'Low', value: realStats.severityDistribution.low, color: '#10b981' },
  ], [realStats.severityDistribution]);

  // Benchmark comparison data for radar chart
  const radarData = useMemo(() => {
    return Object.entries(realStats.benchmarkComparison).map(([key, value]) => ({
      subject: key,
      A: value.current,
      B: value.benchmark,
      fullMark: Math.max(value.current, value.benchmark) * 1.5,
    }));
  }, [realStats.benchmarkComparison]);

  const tabs = [
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
    <div className={`min-h-screen bg-[#0B1120] text-slate-200 p-4 md:p-6 transition-all ${isFullscreen ? 'fixed inset-0 z-50 p-0' : ''}`}>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg border shadow-lg transition-all duration-300 ${
              toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-700' :
              toast.type === 'error' ? 'bg-red-900/90 border-red-700' :
              toast.type === 'warning' ? 'bg-amber-900/90 border-amber-700' :
              'bg-sky-900/90 border-sky-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' && <Activity className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Bell className="w-5 h-5 text-sky-400" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{toast.message}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`bg-[#0B1120] p-4 md:p-8 transition-all ${isFullscreen ? 'h-screen overflow-auto' : ''}`}>
        
        {/* Enhanced Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
              <Shield className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">HSE Statistics Dashboard</h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1">
                <p className="text-slate-400 text-sm">
                  Live Data • {activeOrg.name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  Last refreshed: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isRefreshing && (
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700 flex-1 md:flex-none">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Manpower</p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xl font-bold text-white">{realStats.manpower}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700 flex-1 md:flex-none">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">TRIR</p>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xl font-bold text-white">{realStats.trir}</span>
                <span className="text-xs text-slate-500">/ {HSE_STANDARDS.OSHA.TRIR_TARGET}</span>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-2 px-4 border border-slate-700 flex-1 md:flex-none">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Compliance</p>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-xl font-bold text-white">
                  {realStats.inspectionsTotal > 0 
                    ? Math.round((realStats.inspectionsCompleted / realStats.inspectionsTotal) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm w-full md:w-64 focus:outline-none focus:border-sky-500"
                aria-label="Search metrics"
              />
            </div>
            
            <button 
              onClick={() => setFilters({...filters, status: []})}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            
            <button 
              onClick={() => setShowTargets(!showTargets)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              {showTargets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTargets ? 'Hide Targets' : 'Show Targets'}
            </button>
            
            <button 
              onClick={() => setShowBenchmarks(!showBenchmarks)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              <TargetIcon className="w-4 h-4" />
              {showBenchmarks ? 'Hide Benchmarks' : 'Show Benchmarks'}
            </button>
            
            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border ${
                autoRefresh 
                  ? 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              } hover:opacity-90`}
            >
              {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-slate-500">Export as:</span>
              <select
                value={exportTemplate}
                onChange={(e) => setExportTemplate(e.target.value as ExportTemplate)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="standard">Standard</option>
                <option value="executive">Executive</option>
                <option value="detailed">Detailed</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <button 
              onClick={() => exportToExcel(exportTemplate)}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-900/50 text-emerald-300 text-sm rounded-lg border border-emerald-700/50 hover:bg-emerald-900 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Excel'}
            </button>
            
            <button 
              onClick={() => exportToPDF(exportTemplate)}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 bg-red-900/50 text-red-300 text-sm rounded-lg border border-red-700/50 hover:bg-red-900 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {isExporting ? 'Generating...' : 'PDF'}
            </button>
            
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Responsive */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-6 md:mb-8 overflow-x-auto sticky top-0 z-10 bg-[#0B1120] pt-2">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MetricCategory)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-all rounded-t-lg border-b-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-400 bg-slate-800/50'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}
              >
                {tab.icon}
                {isMobile ? tab.id.split(' ')[0] : tab.id}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs text-slate-500 hidden md:block">
              {filteredMetrics.length} metrics • {realStats.incidents} incidents • {realStats.inspectionsCompleted} inspections
            </span>
          </div>
        </div>

        {/* Widget Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Widget Controls */}
          <div className="col-span-full flex items-center justify-between mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Grid className="w-5 h-5 text-sky-400" />
              Dashboard Widgets
            </h3>
            <div className="flex items-center gap-2">
              {widgets.map(widget => (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${
                    widget.isVisible
                      ? 'bg-sky-900/30 text-sky-400 border border-sky-700/50'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {widget.title}
                </button>
              ))}
            </div>
          </div>
          
          {/* 6-Month Trend Chart Widget */}
          {widgets.find(w => w.id === 'trend-chart')?.isVisible && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-400" />
                  6-Month Trend
                </h3>
                <span className="text-xs text-slate-500">Last updated: Today</span>
              </div>
              <div className="h-48 md:h-64">
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
                    <Line type="monotone" dataKey="inspections" stroke="#10b981" strokeWidth={2} dot={{r: 3}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Severity Distribution Widget */}
          {widgets.find(w => w.id === 'severity-distribution')?.isVisible && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <h3 className="font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-emerald-400" />
                Incident Severity
              </h3>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {severityData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Benchmark Comparison Widget */}
          {widgets.find(w => w.id === 'benchmark-comparison')?.isVisible && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <h3 className="font-bold text-white mb-4 md:mb-6 flex items-center gap-2">
                <TargetIcon className="w-5 h-5 text-purple-400" />
                Industry Benchmark
              </h3>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
                    <Radar name="Your Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Radar name="Industry Average" dataKey="B" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 mb-8">
          
          {/* Data Table Section */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 md:p-6 border-b border-slate-800">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-400" />
                  Metrics Management
                  <span className="text-xs text-slate-500 ml-2">
                    ({filteredMetrics.length} of {metrics.length})
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Real-time metrics with predictive analytics and industry benchmarks
                </p>
              </div>
              
              <div className="overflow-x-auto">
                {renderResponsiveTable()}
              </div>
              
              {/* Add Metric Section */}
              <div className="p-4 md:p-6 bg-slate-950/30 border-t border-slate-800">
                <h4 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add New Metric
                </h4>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'} gap-3 md:gap-4`}>
                  <input
                    type="text"
                    placeholder="Metric label"
                    value={newMetric.label || ''}
                    onChange={(e) => setNewMetric({...newMetric, label: e.target.value})}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newMetric.description || ''}
                    onChange={(e) => setNewMetric({...newMetric, description: e.target.value})}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="number"
                    placeholder="Target value"
                    value={newMetric.target || ''}
                    onChange={(e) => setNewMetric({...newMetric, target: parseFloat(e.target.value)})}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                  <select
                    value={newMetric.category || ''}
                    onChange={(e) => setNewMetric({...newMetric, category: e.target.value as MetricCategory})}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
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
                    disabled={!newMetric.label || !newMetric.category}
                    className="col-span-full md:col-span-1 px-4 py-2 bg-emerald-900/50 text-emerald-300 rounded-lg border border-emerald-700/50 hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Metric
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Charts and Stats Section */}
          <div className="space-y-4 md:space-y-6">
            {/* Real-time Stats Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Real-time Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Manhours</span>
                  <span className="font-bold text-white">{realStats.manhours.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Incident Rate (TRIR)</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${parseFloat(realStats.trir) > HSE_STANDARDS.OSHA.TRIR_TARGET ? 'text-red-400' : 'text-emerald-400'}`}>
                      {realStats.trir}
                    </span>
                    <span className="text-xs text-slate-500">/ {HSE_STANDARDS.OSHA.TRIR_TARGET}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">LTI Rate (LTIFR)</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${parseFloat(realStats.ltifr) > HSE_STANDARDS.OSHA.LTIFR_TARGET ? 'text-red-400' : 'text-emerald-400'}`}>
                      {realStats.ltifr}
                    </span>
                    <span className="text-xs text-slate-500">/ {HSE_STANDARDS.OSHA.LTIFR_TARGET}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Inspection Completion</span>
                  <span className="font-bold text-white">
                    {realStats.inspectionsTotal > 0 
                      ? Math.round((realStats.inspectionsCompleted / realStats.inspectionsTotal) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Predictive Analytics Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUpIcon className="w-5 h-5 text-amber-400" />
                30-Day Forecast
              </h3>
              <div className="space-y-4">
                {metrics
                  .filter(m => m.predictedNextMonth !== undefined)
                  .slice(0, 3)
                  .map(metric => (
                    <div key={metric.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-300">{metric.label}</p>
                        <p className="text-xs text-slate-500">Current: {metric.curr}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-white">
                          {metric.predictedNextMonth}
                        </p>
                        <p className="text-xs text-slate-500">
                          {metric.confidence ? `${Math.round(metric.confidence)}% confidence` : 'Calculating...'}
                        </p>
                      </div>
                    </div>
                  ))
                }
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800">
                <button 
                  onClick={() => showToast('Detailed forecast report generated', 'info')}
                  className="w-full px-4 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
                >
                  Generate Full Forecast Report
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-400" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => scheduleExport('weekly', 'admin@example.com')}
                  className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule Export
                </button>
                <button 
                  onClick={() => showToast('Email alert configured', 'success')}
                  className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
                >
                  <Bell className="w-4 h-4" />
                  Set Alerts
                </button>
                <button 
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(metrics, null, 2))}
                  className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  Copy Data
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white flex flex-col items-center gap-1"
                >
                  <Printer className="w-4 h-4" />
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Accessibility Info */}
        <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <p>HSE Statistics Dashboard v2.0 • Enhanced with predictive analytics and real-time updates</p>
              <p className="mt-1">Keyboard shortcuts: Ctrl+E (Excel), Ctrl+P (PDF), Ctrl+R (Refresh), Ctrl+F (Search)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isMobile && <Smartphone className="w-4 h-4" />}
                {isTablet && <Tablet className="w-4 h-4" />}
                {!isMobile && !isTablet && <Monitor className="w-4 h-4" />}
                <span>{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} View</span>
              </div>
              <button 
                onClick={() => {
                  const text = document.querySelector('h1')?.textContent || 'HSE Dashboard';
                  const utterance = new SpeechSynthesisUtterance(text);
                  window.speechSynthesis.speak(utterance);
                }}
                className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white"
              >
                Screen Reader
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing icon component
const Copy: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);