import React, { useState, useMemo } from 'react';
import { 
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale
} from 'chart.js';
import { Line, Doughnut, Radar } from 'react-chartjs-2';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Shield, Users, Clock, RefreshCw, 
  Activity, AlertTriangle, CheckCircle, HardHat, 
  TrendingUp, TrendingDown, FileSpreadsheet, Leaf, HeartPulse, 
  Factory, BrainCircuit, DollarSign, Download,
  BarChart3, Calendar, Eye, EyeOff, Target, Zap, ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, 
                ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

// --- TYPES ---
type MetricCategory = 
  | 'core' | 'compliance' | 'environmental' | 'health' 
  | 'process' | 'behavioral' | 'contractor' | 'financial' 
  | 'operational' | 'leading' | 'benchmarking' | 'investigation' 
  | 'technical' | 'certification' | 'digital' | 'social';

interface MetricData {
    prev: number;
    curr: number;
    unit: string;
    target?: number;
    trend?: 'up' | 'down' | 'stable';
}

interface MonthlyData {
    month: string;
    incidents: number;
    manhours: number;
    compliance: number;
    environmental: number;
    safetyObservations: number;
    [key: string]: any;
}

// --- INITIAL DATA ---
const INITIAL_HSE_DATA: Record<string, Record<string, MetricData>> = {
    incident_stats: {
        'Total Recordable Incidents': { prev: 2, curr: 0, unit: '', target: 0, trend: 'down' },
        'Lost Time Injuries (LTI)': { prev: 0, curr: 0, unit: '', target: 0, trend: 'stable' },
        'First Aid Cases': { prev: 5, curr: 2, unit: '', target: 1, trend: 'down' },
        'Medical Treatment Cases': { prev: 1, curr: 0, unit: '', target: 0, trend: 'down' },
        'Near Misses': { prev: 12, curr: 4, unit: '', target: 10, trend: 'down' },
        'Fatalities': { prev: 0, curr: 0, unit: '', target: 0, trend: 'stable' },
    },
    workforce: {
        'Manpower - Client': { prev: 5, curr: 5, unit: '', target: 6, trend: 'stable' },
        'Manpower - Consultant': { prev: 8, curr: 8, unit: '', target: 10, trend: 'stable' },
        'Manpower - Main Contractor': { prev: 45, curr: 50, unit: '', target: 55, trend: 'up' },
        'Manpower - Subcontractor': { prev: 120, curr: 135, unit: '', target: 140, trend: 'up' },
        'Manhours - Client': { prev: 800, curr: 800, unit: 'h', target: 1000, trend: 'stable' },
        'Manhours - Consultant': { prev: 1280, curr: 1280, unit: 'h', target: 1500, trend: 'stable' },
        'Manhours - Main Contractor': { prev: 9000, curr: 10000, unit: 'h', target: 11000, trend: 'up' },
        'Manhours - Subcontractor': { prev: 24000, curr: 27000, unit: 'h', target: 28000, trend: 'up' },
        'Overtime Hours': { prev: 500, curr: 450, unit: 'h', target: 400, trend: 'down' },
    },
    compliance: {
        'Safety Inspections Conducted': { prev: 10, curr: 12, unit: '', target: 15, trend: 'up' },
        'Inspection Compliance Rate': { prev: 95, curr: 98, unit: '%', target: 100, trend: 'up' },
        'PTW Compliance': { prev: 98, curr: 100, unit: '%', target: 100, trend: 'up' },
        'Toolbox Talks Conducted': { prev: 25, curr: 30, unit: '', target: 35, trend: 'up' },
        'Safety Observations': { prev: 150, curr: 180, unit: '', target: 200, trend: 'up' },
    },
    environmental: {
        'Spills / Releases': { prev: 0, curr: 0, unit: '', target: 0, trend: 'stable' },
        'Waste Generated': { prev: 1000, curr: 950, unit: 'kg', target: 800, trend: 'down' },
        'Energy Consumption': { prev: 5000, curr: 4800, unit: 'kWh', target: 4500, trend: 'down' },
    },
    health: {
        'Health Screenings': { prev: 85, curr: 95, unit: '', target: 100, trend: 'up' },
        'Work-Related Illness': { prev: 2, curr: 1, unit: '', target: 0, trend: 'down' },
    },
    process: {
        'Process Safety Events': { prev: 0, curr: 0, unit: '', target: 0, trend: 'stable' },
        'PSM Compliance': { prev: 92, curr: 95, unit: '%', target: 100, trend: 'up' },
    },
    behavioral: {
        'Safe Acts Observed': { prev: 120, curr: 145, unit: '', target: 150, trend: 'up' },
        'Unsafe Acts Observed': { prev: 30, curr: 35, unit: '', target: 20, trend: 'up' },
    },
    financial: {
        'Direct Safety Costs': { prev: 5000, curr: 2000, unit: '$', target: 1000, trend: 'down' },
    },
    digital: {
        'Mobile Reporting Usage': { prev: 75, curr: 80, unit: '%', target: 90, trend: 'up' },
    },
};

const MONTHLY_TREND_DATA: MonthlyData[] = [
    { month: 'Jan', incidents: 3, manhours: 32000, compliance: 92, environmental: 5200, safetyObservations: 120 },
    { month: 'Feb', incidents: 2, manhours: 31000, compliance: 94, environmental: 5100, safetyObservations: 135 },
    { month: 'Mar', incidents: 4, manhours: 33000, compliance: 91, environmental: 5300, safetyObservations: 110 },
    { month: 'Apr', incidents: 1, manhours: 34000, compliance: 95, environmental: 5000, safetyObservations: 150 },
    { month: 'May', incidents: 2, manhours: 35000, compliance: 96, environmental: 4900, safetyObservations: 165 },
    { month: 'Jun', incidents: 0, manhours: 36000, compliance: 98, environmental: 4800, safetyObservations: 180 },
    { month: 'Jul', incidents: 1, manhours: 37000, compliance: 97, environmental: 4700, safetyObservations: 190 },
    { month: 'Aug', incidents: 0, manhours: 38000, compliance: 99, environmental: 4600, safetyObservations: 205 },
    { month: 'Sep', incidents: 2, manhours: 39000, compliance: 98, environmental: 4500, safetyObservations: 195 },
    { month: 'Oct', incidents: 1, manhours: 40000, compliance: 100, environmental: 4400, safetyObservations: 210 },
    { month: 'Nov', incidents: 0, manhours: 41000, compliance: 99, environmental: 4300, safetyObservations: 220 },
    { month: 'Dec', incidents: 0, manhours: 42000, compliance: 100, environmental: 4200, safetyObservations: 230 },
];

const EXPORT_CONFIG = {
    fileName: `HSE_Dashboard_Export_${new Date().toISOString().slice(0, 10)}`,
};

export const HseStatistics: React.FC = () => {
    const [activeTab, setActiveTab] = useState<MetricCategory>('core');
    const [data, setData] = useState(INITIAL_HSE_DATA);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showTargets, setShowTargets] = useState(true);
    const [exportProgress, setExportProgress] = useState(0);
    const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['incidents', 'manhours', 'compliance']);
    const [timeRange, setTimeRange] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

    // --- CALCULATIONS ---
    const totalManhours = useMemo(() => {
        const wf = data.workforce;
        return (
            (wf['Manhours - Client']?.curr || 0) + 
            (wf['Manhours - Consultant']?.curr || 0) + 
            (wf['Manhours - Main Contractor']?.curr || 0) + 
            (wf['Manhours - Subcontractor']?.curr || 0)
        );
    }, [data]);

    const totalManpower = useMemo(() => {
        const wf = data.workforce;
        return (
            (wf['Manpower - Client']?.curr || 0) + 
            (wf['Manpower - Consultant']?.curr || 0) + 
            (wf['Manpower - Main Contractor']?.curr || 0) + 
            (wf['Manpower - Subcontractor']?.curr || 0)
        );
    }, [data]);

    const kpi = useMemo(() => {
        const hours = totalManhours || 1;
        const recordables = data.incident_stats['Total Recordable Incidents']?.curr || 0;
        const ltis = data.incident_stats['Lost Time Injuries (LTI)']?.curr || 0;
        const fatalities = data.incident_stats['Fatalities']?.curr || 0;

        const trir = ((recordables * 200000) / hours).toFixed(2);
        const ltifr = ((ltis * 1000000) / hours).toFixed(2);
        const fatalityRate = ((fatalities * 1000000) / hours).toFixed(4);
        
        const spi = (
            (100 - parseFloat(trir) * 10) + 
            (100 - parseFloat(ltifr) * 2) + 
            (data.compliance['Inspection Compliance Rate']?.curr || 0) * 0.5
        ).toFixed(1);

        return { trir, ltifr, fatalityRate, spi };
    }, [totalManhours, data]);

    const handleInputChange = (category: string, metric: string, field: 'prev' | 'curr', value: string) => {
        const numValue = parseFloat(value) || 0;
        setData(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [metric]: {
                    ...prev[category][metric],
                    [field]: numValue,
                    trend: field === 'curr' ? 
                        (numValue > prev[category][metric].prev ? 'up' : 
                         numValue < prev[category][metric].prev ? 'down' : 'stable') : 
                        prev[category][metric].trend
                }
            }
        }));
    };

    const handleExportExcel = async () => {
        setExportProgress(0);
        try {
            const wb = XLSX.utils.book_new();
            setExportProgress(50);
            
            // Summary Sheet
            const summaryData = [
                ['HSE DASHBOARD SUMMARY', '', '', ''],
                ['Generated', new Date().toLocaleString(), '', ''],
                ['', '', '', ''],
                ['KPIs', 'Value', '', ''],
                ['TRIR', kpi.trir, '', ''],
                ['LTIFR', kpi.ltifr, '', ''],
                ['Total Manhours', totalManhours, '', ''],
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, ws1, "Summary");

            // Detailed Data Sheet
            const detailedData = [['Category', 'Metric', 'Previous', 'Current', 'Target', 'Unit']];
            Object.entries(data).forEach(([category, metrics]) => {
                Object.entries(metrics).forEach(([metric, values]) => {
                    detailedData.push([category.toUpperCase(), metric, values.prev, values.curr, values.target || '', values.unit]);
                });
            });
            const ws2 = XLSX.utils.aoa_to_sheet(detailedData);
            XLSX.utils.book_append_sheet(wb, ws2, "Details");

            XLSX.writeFile(wb, `${EXPORT_CONFIG.fileName}.xlsx`);
            setExportProgress(100);
            setTimeout(() => setExportProgress(0), 2000);
        } catch (error) {
            console.error('Export failed:', error);
            setExportProgress(0);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // --- CHART DATA ---
    const massiveGraphData = {
        labels: MONTHLY_TREND_DATA.map(m => m.month),
        datasets: [
            {
                label: 'Incidents',
                data: MONTHLY_TREND_DATA.map(m => m.incidents),
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                yAxisID: 'y',
            },
            {
                label: 'Manhours (K)',
                data: MONTHLY_TREND_DATA.map(m => m.manhours / 1000),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                yAxisID: 'y1',
            }
        ],
    };

    const massiveGraphOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
            x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
            y: { type: 'linear' as const, display: true, position: 'left' as const, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
            y1: { type: 'linear' as const, display: true, position: 'right' as const, grid: { drawOnChartArea: false }, ticks: { color: '#94a3b8' } },
        },
    };

    const radarData = {
        labels: ['Safety', 'Compliance', 'Environment', 'Health', 'Process', 'Training'],
        datasets: [
            {
                label: 'Current',
                data: [90, data.compliance['Inspection Compliance Rate']?.curr || 0, 85, 95, 92, 88],
                backgroundColor: 'rgba(6, 182, 212, 0.2)',
                borderColor: '#06b6d4',
                borderWidth: 2,
            },
            {
                label: 'Target',
                data: [100, 100, 100, 100, 100, 100],
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderDash: [5, 5],
            },
        ],
    };

    const renderMetricRow = (category: string, metric: string, rowData: MetricData) => (
        <tr key={metric} className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0">
            <td className="px-4 py-3 text-slate-300 text-sm font-medium">{metric}</td>
            <td className="px-4 py-3 text-right">
                <input 
                    type="number" 
                    value={rowData.prev} 
                    onChange={(e) => handleInputChange(category, metric, 'prev', e.target.value)}
                    className="w-20 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-slate-400 focus:border-blue-500 focus:outline-none text-sm"
                />
            </td>
            <td className="px-4 py-3 text-right">
                <input 
                    type="number" 
                    value={rowData.curr} 
                    onChange={(e) => handleInputChange(category, metric, 'curr', e.target.value)}
                    className="w-20 bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-right text-white font-bold focus:border-emerald-500 focus:outline-none text-sm"
                />
            </td>
            {showTargets && (
                <td className="px-4 py-3 text-right text-amber-400 text-sm">{rowData.target || '-'}</td>
            )}
            <td className="px-4 py-3 text-right text-slate-500 text-xs">{rowData.unit}</td>
        </tr>
    );

    const renderCategoryTable = (categoryKey: string, title: string) => (
        <Card title={title} className="h-full">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Metric</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Prev</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Curr</th>
                            {showTargets && <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Target</th>}
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(data[categoryKey] || {}).map(([metric, values]) => 
                            renderMetricRow(categoryKey, metric, values)
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-br from-slate-900/50 to-slate-800/30 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-800/50">
                        <HardHat className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100">HSE Statistics</h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <Badge color="blue" icon={Shield}>ISO 45001</Badge>
                            <Badge color="green" icon={CheckCircle}>Live Data</Badge>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
                    <KpiStat label="Manpower" value={totalManpower} icon={Users} color="text-blue-400" />
                    <KpiStat label="Manhours" value={totalManhours.toLocaleString()} icon={Clock} color="text-cyan-400" />
                    <KpiStat label="TRIR" value={kpi.trir} icon={AlertTriangle} color="text-red-400" />
                    <KpiStat label="SPI Score" value={kpi.spi} icon={CheckCircle} color="text-green-400" />
                </div>
            </div>

            {/* CONTROLS */}
            <Card className="p-4 sticky top-0 z-20 backdrop-blur-md bg-slate-900/90 border-b border-slate-800">
                <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                    <div className="flex overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 gap-1 no-scrollbar">
                        {[
                            { id: 'core', label: 'Core & Workforce', icon: Shield },
                            { id: 'compliance', label: 'Compliance', icon: CheckCircle },
                            { id: 'environmental', label: 'Environment', icon: Leaf },
                            { id: 'health', label: 'Health', icon: HeartPulse },
                            { id: 'process', label: 'Process', icon: Factory },
                            { id: 'behavioral', label: 'Behavioral', icon: Users },
                            { id: 'financial', label: 'Financial', icon: DollarSign },
                            { id: 'digital', label: 'Digital', icon: BrainCircuit },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as MetricCategory)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50' 
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => setShowTargets(!showTargets)} leftIcon={showTargets ? <EyeOff /> : <Eye />}>
                            {showTargets ? 'Hide Targets' : 'Show Targets'}
                        </Button>
                        <Button variant="secondary" onClick={handleRefresh} leftIcon={<RefreshCw className={isRefreshing ? 'animate-spin' : ''} />}>Refresh</Button>
                        <Button variant="outline" onClick={handleExportExcel} leftIcon={<Download />}>
                            {exportProgress > 0 ? `Exporting ${exportProgress}%` : 'Export Excel'}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* KPI CARDS ROW (Moved to top for better visibility) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="TRIR" value={kpi.trir} sub="per 200k hrs" trend="Calc" trendDir="flat" icon={Activity} color="text-cyan-400" />
                <KpiCard title="LTIFR" value={kpi.ltifr} sub="per 1M hrs" trend="Calc" trendDir="flat" icon={AlertTriangle} color="text-orange-400" />
                <KpiCard title="Manpower" value={totalManpower} sub="Active Workers" trend="Live" trendDir="up" icon={Users} color="text-purple-400" />
                <KpiCard title="Manhours" value={totalManhours.toLocaleString()} sub="Total Hours" trend="Live" trendDir="up" icon={TrendingUp} color="text-green-400" />
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* LEFT COLUMN: DATA ENTRY (Takes 2/3 width) */}
                <div className="xl:col-span-2 space-y-6">
                    {activeTab === 'core' && (
                        <>
                            {renderCategoryTable('incident_stats', 'A. Incident Statistics')}
                            {renderCategoryTable('workforce', 'B. Workforce Exposure Data')}
                        </>
                    )}
                    {activeTab === 'compliance' && renderCategoryTable('compliance', 'Compliance & Training')}
                    {activeTab === 'environmental' && renderCategoryTable('environmental', 'Environmental Metrics')}
                    {activeTab === 'health' && renderCategoryTable('health', 'Health & Wellness')}
                    {activeTab === 'process' && renderCategoryTable('process', 'Process Safety')}
                    {activeTab === 'behavioral' && renderCategoryTable('behavioral', 'Behavioral Safety')}
                    {activeTab === 'financial' && renderCategoryTable('financial', 'Financial Metrics')}
                    {activeTab === 'digital' && renderCategoryTable('digital', 'Digital Transformation')}
                </div>

                {/* RIGHT COLUMN: CHARTS (Takes 1/3 width) */}
                <div className="space-y-6">
                    <Card title="Performance Radar">
                        <div className="h-64 flex items-center justify-center">
                            <Radar data={radarData} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } }, plugins: { legend: { display: false } } }} />
                        </div>
                    </Card>

                    <Card title="Workforce Distribution">
                        <div className="h-64 flex items-center justify-center">
                            <Doughnut 
                                data={{
                                    labels: ['Client', 'Consultant', 'Main', 'Sub'],
                                    datasets: [{
                                        data: [
                                            data.workforce['Manpower - Client']?.curr || 0,
                                            data.workforce['Manpower - Consultant']?.curr || 0,
                                            data.workforce['Manpower - Main Contractor']?.curr || 0,
                                            data.workforce['Manpower - Subcontractor']?.curr || 0,
                                        ],
                                        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981'],
                                        borderWidth: 0
                                    }]
                                }} 
                                options={{ cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } } }} 
                            />
                        </div>
                    </Card>
                </div>
            </div>

            {/* BOTTOM: MASSIVE TREND GRAPH */}
            <Card title="12-Month Trend Analysis" className="mt-6">
                <div className="h-96">
                    <Line data={massiveGraphData} options={massiveGraphOptions} />
                </div>
            </Card>
        </div>
    );
};

// --- SUB-COMPONENTS ---
const KpiStat: React.FC<{ label: string, value: string | number, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50">
        <Icon className={color} />
        <div>
            <span className="block text-xs text-slate-500">{label}</span>
            <span className="block text-lg font-bold text-slate-100">{value}</span>
        </div>
    </div>
);

const KpiCard: React.FC<{ title: string, value: number | string, sub: string, trend: string, trendDir: 'up' | 'down' | 'flat', icon: any, color: string }> = ({ title, value, sub, trend, trendDir, icon: Icon, color }) => (
    <Card className="relative overflow-hidden group hover:border-slate-600 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-slate-800/50 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                trendDir === 'down' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800/50' : 
                trendDir === 'up' ? 'bg-blue-900/30 text-blue-300 border-blue-800/50' :
                'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
                {trend}
            </span>
        </div>
        <div className="text-3xl font-black text-slate-100 mb-1">{value}</div>
        <div className="text-xs text-slate-500">{sub}</div>
    </Card>
);