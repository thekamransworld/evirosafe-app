import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SafetyPulseWidget } from './SafetyPulseWidget';
import { SafetyPulseModal } from './SafetyPulseModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { SiteMap } from './SiteMap';
import { 
  Sun, Users, AlertTriangle, ClipboardList, 
  Megaphone, TrendingUp, DollarSign, Search,
  Activity, CheckCircle, Clock
} from 'lucide-react';

// --- Helper Component for Micro-Animations ---
const AnimatedMetric: React.FC<{ value: string | number; className?: string }> = ({ value, className }) => {
    const [animating, setAnimating] = useState(false);
    const prevValue = useRef(value);

    useEffect(() => {
        if (prevValue.current !== value) {
            setAnimating(true);
            const timer = setTimeout(() => setAnimating(false), 300);
            prevValue.current = value;
            return () => clearTimeout(timer);
        }
    }, [value]);

    return (
        <span className={`${className} inline-block transition-colors duration-300 ${animating ? 'animate-bump text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`}>
            {value}
        </span>
    );
};

// --- Components ---

const DashboardHeader: React.FC<{ riskLevel: string; workforceCount: number; temperature: number }> = ({ riskLevel, workforceCount, temperature }) => {
    const { activeOrg } = useAppContext();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const isHighRisk = riskLevel === 'High' || riskLevel === 'Critical';

    return (
        <header className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl px-6 py-3 flex flex-col md:flex-row items-center justify-between shadow-[0_12px_35px_rgba(0,0,0,0.65)]">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
                <div className="text-sm font-medium tracking-[0.17em] text-slate-300 uppercase">
                    EviroSafe 3.0
                </div>
                <div className="hidden md:block w-px h-4 bg-slate-700"></div>
                <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{activeOrg?.name || 'Organization'}</span>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className={isHighRisk ? 'text-red-400' : 'text-emerald-400'}>RISK: {riskLevel.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Sun className="w-3 h-3 text-orange-400" />
                    <span>HEAT: <AnimatedMetric value={temperature} className="text-orange-400 font-bold" />°C</span>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 text-blue-400" />
                    <span>WORKFORCE: <AnimatedMetric value={workforceCount} className="text-blue-400 font-bold" /></span>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                    <div className="live-dot"></div>
                    <span className="text-slate-200 font-mono">{time.toLocaleTimeString([], { hour12: false })}</span>
                </div>
            </div>
        </header>
    );
};

const RiskLevelCard: React.FC<{ 
    riskLevel: string; 
    aiSummary: string; 
    financialImpact: number;
    investigations: number;
    className?: string 
}> = ({ riskLevel, aiSummary, financialImpact, investigations, className }) => {
    const isHighRisk = riskLevel === 'High' || riskLevel === 'Critical';
    const baseClass = "rounded-3xl p-6 text-slate-100 transition-all duration-300 shadow-[0_18px_45px_rgba(0,0,0,0.55)]";
    const themeClass = isHighRisk ? "hero-card-high" : "hero-card-normal";
    
    return (
        <div className={`${baseClass} ${themeClass} ${className} flex flex-col justify-between relative overflow-hidden`}>
            <div className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl opacity-20 ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[11px] tracking-[0.25em] uppercase text-slate-300 font-semibold opacity-80">
                            Operational Status
                        </p>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-5xl font-black tracking-tighter ${isHighRisk ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-red-200 to-red-500 drop-shadow-sm' : 'text-emerald-300'}`}>
                                {riskLevel.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Est. Financial Impact</p>
                        <p className="text-2xl font-mono text-white font-bold">${financialImpact.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-2 flex items-start gap-3 relative z-10">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                        AI
                    </div>
                    <div className="flex-1 rounded-2xl bg-slate-950/40 border border-slate-700/50 px-5 py-4 text-sm leading-relaxed text-slate-200 backdrop-blur-sm">
                        <span className="text-sky-400 font-bold">Insight: </span>
                        {aiSummary}
                    </div>
                </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5 grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] uppercase text-slate-400">Active Investigations</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Search className="w-4 h-4 text-purple-400" />
                        <span className="text-lg font-bold text-white">{investigations}</span>
                    </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] uppercase text-slate-400">CAPA Open</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <span className="text-lg font-bold text-white">3</span>
                    </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] uppercase text-slate-400">Compliance</p>
                    <div className="flex items-center gap-2 mt-1">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-lg font-bold text-white">94%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuickAction: React.FC<{ label: string; hotkey?: string; icon?: React.ReactNode; onClick?: () => void; disabled?: boolean }> = ({ label, hotkey, icon, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-xs transition-all group
        ${disabled 
            ? "border-slate-700/40 bg-slate-900/40 text-slate-600 cursor-not-allowed" 
            : "border-slate-600/70 bg-slate-900/60 hover:bg-slate-800 hover:border-sky-500/50 text-slate-200 hover:text-white hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]"
        }`}
    >
        <div className="flex items-center gap-3">
            <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-lg transition-colors ${disabled ? 'bg-slate-800/50 text-slate-600' : 'bg-slate-800 text-slate-400 group-hover:text-sky-400 group-hover:bg-sky-500/20'}`}>
                {icon || '+'}
            </span>
            <span className="font-medium tracking-wide">{label}</span>
        </div>
        {hotkey && (
            <span className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                {hotkey}
            </span>
        )}
    </button>
);

const WidgetCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`glass-card flex flex-col ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-[0.1em]">{title}</h3>
            <div className="h-1 w-8 bg-slate-700 rounded-full"></div>
        </div>
        <div className="flex-1 relative">
            {children}
        </div>
    </div>
);

export const Dashboard: React.FC = () => {
    const { reportList, ptwList } = useDataContext();
    const { usersList } = useAppContext();
    const { setIsReportCreationModalOpen, setIsTbtCreationModalOpen, setSelectedReport, setIsInspectionCreationModalOpen } = useModalContext();
    const { setCurrentView } = useAppContext();
    
    const [isSafetyPulseModalOpen, setIsSafetyPulseModalOpen] = useState(false);
    const [simulatedTemp, setSimulatedTemp] = useState(38);

    const safePtwList = Array.isArray(ptwList) ? ptwList : [];
    const safeReportList = Array.isArray(reportList) ? reportList : [];
    const safeUsersList = Array.isArray(usersList) ? usersList : [];

    const activePermits = useMemo(() => safePtwList.filter(p => p.status === 'ACTIVE').length, [safePtwList]);
    
    // Enhanced Risk Analysis
    const riskAnalysis = useMemo(() => {
        const openIncidents = safeReportList.filter(r => r.status !== 'closed');
        const criticalCount = openIncidents.filter(r => (r.risk_pre_control.severity * r.risk_pre_control.likelihood) >= 15).length;
        const highCount = openIncidents.filter(r => (r.risk_pre_control.severity * r.risk_pre_control.likelihood) >= 9).length;
        
        // Calculate Financial Impact
        const totalCost = safeReportList.reduce((sum, r) => sum + (r.costs?.total_estimated || 0), 0);
        const activeInvestigations = safeReportList.filter(r => r.status === 'under_investigation').length;

        let level = 'Low';
        let summary = 'Site operations are stable. No major incidents.';

        if (criticalCount > 0) {
            level = 'Critical';
            summary = `${criticalCount} Critical Incidents. Immediate executive review required.`;
        } else if (highCount > 0) {
            level = 'High';
            summary = `${highCount} High Risk Incidents. Increase supervision intensity.`;
        } else if (openIncidents.length > 5) {
            level = 'Medium';
            summary = 'Multiple open reports. Review control measures.';
        }

        return { level, summary, totalCost, activeInvestigations };
    }, [safeReportList]);

    const pulseStats = useMemo(() => ({
        incidents: safeReportList.filter(r => ['Incident', 'Accident', 'Fire Event'].includes(r.type)).length,
        unsafeActs: safeReportList.filter(r => r.type === 'Unsafe Act').length,
        unsafeConditions: safeReportList.filter(r => r.type === 'Unsafe Condition').length,
        positiveObs: safeReportList.filter(r => r.type === 'Positive Observation').length,
    }), [safeReportList]);

    const workforceCount = safeUsersList.length + (activePermits * 4);

    // Pending Approvals (Reports + PTW)
    const pendingItems = useMemo(() => {
        const reports = safeReportList.filter(r => r.status === 'submitted' || r.status === 'under_investigation').map(r => ({
            id: r.id, type: r.type, date: r.reported_at, status: r.status, category: 'Report'
        }));
        const ptws = safePtwList.filter(p => p.status === 'APPROVAL' || p.status === 'SUBMITTED').map(p => ({
            id: p.id, type: p.type, date: p.created_at, status: p.status, category: 'Permit'
        }));
        return [...reports, ...ptws].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [safeReportList, safePtwList]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSimulatedTemp(prev => parseFloat((prev + (Math.random() > 0.5 ? 0.1 : -0.1)).toFixed(1)));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="dashboard-bg">
            <DashboardHeader riskLevel={riskAnalysis.level} workforceCount={workforceCount} temperature={simulatedTemp} />

            {/* ROW 1: HERO & ACTIONS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                <div className="xl:col-span-8">
                    <RiskLevelCard 
                        riskLevel={riskAnalysis.level} 
                        aiSummary={riskAnalysis.summary} 
                        financialImpact={riskAnalysis.totalCost}
                        investigations={riskAnalysis.activeInvestigations}
                        className="h-full"
                    />
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="glass-card p-5">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <QuickAction label="New Incident Report" hotkey="N" icon={<AlertTriangle className="w-4 h-4"/>} onClick={() => setIsReportCreationModalOpen(true)} />
                            <QuickAction 
                                label="Start Inspection" 
                                hotkey="I" 
                                icon={<ClipboardList className="w-4 h-4"/>} 
                                onClick={() => {
                                    setCurrentView('inspections');
                                    setIsInspectionCreationModalOpen(true);
                                }} 
                            />
                            <QuickAction label="Conduct Toolbox Talk" hotkey="T" icon={<Megaphone className="w-4 h-4"/>} onClick={() => setIsTbtCreationModalOpen(true)} />
                        </div>
                    </div>

                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400 flex justify-between">
                            <span>Pending Actions</span>
                            <span className="text-sky-400">{pendingItems.length}</span>
                        </h2>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-48">
                            {pendingItems.length > 0 ? pendingItems.slice(0, 5).map(item => (
                                <button key={item.id} onClick={() => {
                                    if(item.category === 'Report') setSelectedReport(safeReportList.find(r => r.id === item.id));
                                    // Add PTW selection logic here if needed
                                }} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-200 group-hover:text-white">{item.type}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.category === 'Permit' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.category}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                                        {item.status.replace(/_/g, ' ')} • {new Date(item.date).toLocaleDateString()}
                                    </p>
                                </button>
                            )) : (
                                <p className="text-xs text-slate-600 italic text-center py-4">All clear. No pending items.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: SITE TWIN & ENVIRONMENT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <div className="xl:col-span-2 h-96">
                    <WidgetCard title="3D Site Digital Twin" className="h-full p-0 overflow-hidden relative group">
                        <div className="absolute top-4 right-4 z-10 flex gap-2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 bg-black/60 rounded text-[10px] text-red-300 border border-red-900/50">Incident</span>
                            <span className="px-2 py-1 bg-black/60 rounded text-[10px] text-blue-300 border border-blue-900/50">Permit</span>
                        </div>
                        <SiteMap embedded={true} />
                    </WidgetCard>
                </div>

                <div className="space-y-6 flex flex-col h-96">
                    <WidgetCard title="Environment" className="flex-1 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 text-orange-500/20 animate-spin-slow">
                            <Sun className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-baseline gap-2">
                                <AnimatedMetric value={simulatedTemp} className="text-5xl font-black text-slate-100" />
                                <span className="text-lg text-slate-400">°C</span>
                            </div>
                            <p className="text-xs font-bold text-orange-400 mt-1 uppercase tracking-wider animate-pulse">Heat Stress Warning</p>
                            
                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase">Wind</p>
                                    <p className="text-sm font-mono text-cyan-400">25 km/h</p>
                                </div>
                                <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                                    <p className="text-[10px] text-slate-500 uppercase">AQI</p>
                                    <p className="text-sm font-mono text-emerald-400">Good</p>
                                </div>
                            </div>
                        </div>
                    </WidgetCard>

                    <WidgetCard title="Live Workforce" className="flex-1">
                        <div className="flex justify-between items-end">
                            <div>
                                <AnimatedMetric value={workforceCount} className="text-4xl font-black text-slate-100" />
                                <span className="text-xs text-slate-500 block">Active Personnel</span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400">Permits Active</p>
                                <p className="text-xl font-bold text-sky-400 font-mono">{activePermits}</p>
                            </div>
                        </div>
                        <div className="mt-auto pt-4">
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[85%] rounded-full"></div>
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                <span>Compliance</span>
                                <span>85%</span>
                            </div>
                        </div>
                    </WidgetCard>
                </div>
            </div>

            {/* ROW 3: SAFETY PULSE */}
            <div className="h-80">
                 <SafetyPulseWidget onExpand={() => setIsSafetyPulseModalOpen(true)} stats={pulseStats} />
            </div>

            <SafetyPulseModal isOpen={isSafetyPulseModalOpen} onClose={() => setIsSafetyPulseModalOpen(false)} />
        </div>
    );
};