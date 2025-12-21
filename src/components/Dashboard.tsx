import React, { useState, useEffect, useRef } from 'react';
import { generateAiRiskForecast } from '../services/geminiService';
import { SafetyPulseWidget } from './SafetyPulseWidget';
import { SafetyPulseModal } from './SafetyPulseModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { SiteMap } from './SiteMap';
import { 
  Sun, 
  Users, 
  AlertTriangle, 
  ClipboardList, 
  Megaphone 
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
        <header className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-lg">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
                <div className="text-sm font-medium tracking-[0.17em] text-slate-300 uppercase">
                    EviroSafe 3.0
                </div>
                <div className="hidden md:block w-px h-4 bg-slate-700"></div>
                <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{activeOrg.name}</span>
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
    recommendations: string[]; 
    className?: string 
}> = ({ riskLevel, aiSummary, recommendations, className }) => {
    const isHighRisk = riskLevel === 'High' || riskLevel === 'Critical';
    const baseClass = "rounded-3xl p-6 text-slate-100 transition-all duration-300 shadow-xl border border-white/5 relative overflow-hidden";
    const themeClass = isHighRisk 
        ? "bg-gradient-to-br from-red-900/40 to-slate-900/90 border-red-500/30" 
        : "bg-gradient-to-br from-emerald-900/20 to-slate-900/90 border-emerald-500/20";

    return (
        <div className={`${baseClass} ${themeClass} ${className} flex flex-col justify-between`}>
            <div className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl opacity-20 ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[11px] tracking-[0.25em] uppercase text-slate-300 font-semibold opacity-80">
                            Today&apos;s Risk Level
                        </p>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-6xl font-black tracking-tighter ${isHighRisk ? 'text-red-400 drop-shadow-lg' : 'text-emerald-400'}`}>
                                {riskLevel.toUpperCase()}
                            </span>
                            {isHighRisk && (
                                <span className="rounded-full border border-red-400/60 bg-red-500/20 px-3 py-1 text-[10px] font-bold uppercase text-red-200 tracking-[0.15em] animate-pulse">
                                    Alert
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-2 flex items-start gap-3 relative z-10">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                        AI
                    </div>
                    <div className="flex-1 rounded-2xl bg-slate-950/40 border border-slate-700/50 px-5 py-4 text-sm leading-relaxed text-slate-200 backdrop-blur-sm">
                        <span className="text-sky-400 font-bold">Insight: </span>
                        {aiSummary || "Analyzing site telemetry..."}
                    </div>
                </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
                <p className="mb-3 text-[10px] tracking-[0.2em] uppercase text-slate-400 font-bold">
                    Recommended Actions
                </p>
                <ul className="space-y-2">
                    {recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="flex gap-3 items-center text-xs text-slate-300 bg-white/5 px-3 py-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                            <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${idx === 0 ? 'bg-sky-400' : idx === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span>{rec}</span>
                        </li>
                    ))}
                </ul>
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
    <div className={`rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col shadow-lg ${className}`}>
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
    const { setIsReportCreationModalOpen, setIsTbtCreationModalOpen, setSelectedReport, setIsInspectionCreationModalOpen } = useModalContext();
    const { setCurrentView } = useAppContext();
    
    const [aiForecast, setAiForecast] = useState<{ risk_level: string, summary: string, recommendations: string[] } | null>(null);
    const [isSafetyPulseModalOpen, setIsSafetyPulseModalOpen] = useState(false);
    
    const [simulatedWorkforce, setSimulatedWorkforce] = useState(65);
    const [simulatedTemp, setSimulatedTemp] = useState(38);

    useEffect(() => {
        const fetchForecast = async () => {
            try {
                const forecast = await generateAiRiskForecast();
                setAiForecast(forecast);
            } catch (error) {
                setAiForecast({ risk_level: 'High', summary: 'Simulated High Risk due to Heat Stress warning.', recommendations: ['Enforce 15min breaks every hour', 'Review lifting plans for wind gusts', 'Verify hydration stations'] });
            }
        };
        fetchForecast();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setSimulatedWorkforce(prev => Math.max(10, prev + (Math.random() > 0.5 ? 1 : -1) * (Math.random() > 0.7 ? 1 : 0)));
            setSimulatedTemp(prev => {
                const change = (Math.random() > 0.5 ? 0.1 : -0.1) * (Math.random() > 0.8 ? 1 : 0);
                return parseFloat((prev + change).toFixed(1));
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const riskLevel = aiForecast?.risk_level || 'Medium';
    const activePermits = ptwList.filter(p => p.status === 'ACTIVE').length;
    const pendingReports = reportList.filter(r => r.status === 'under_review');

    return (
        <div className="dashboard-bg p-6 md:p-8 min-h-full">
            <DashboardHeader riskLevel={riskLevel} workforceCount={simulatedWorkforce} temperature={simulatedTemp} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                <div className="xl:col-span-8">
                    <RiskLevelCard 
                        riskLevel={riskLevel} 
                        aiSummary={aiForecast?.summary || ""} 
                        recommendations={aiForecast?.recommendations || []}
                        className="h-full"
                    />
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md p-5 shadow-lg">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <QuickAction label="New Incident Report" hotkey="N" icon={<AlertTriangle size={18}/>} onClick={() => setIsReportCreationModalOpen(true)} />
                            <QuickAction 
                                label="Start Inspection" 
                                hotkey="I" 
                                icon={<ClipboardList size={18}/>} 
                                onClick={() => {
                                    setCurrentView('inspections');
                                    setIsInspectionCreationModalOpen(true);
                                }} 
                            />
                            <QuickAction label="Conduct Toolbox Talk" hotkey="T" icon={<Megaphone size={18}/>} onClick={() => setIsTbtCreationModalOpen(true)} />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col shadow-lg flex-1">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400 flex justify-between">
                            <span>Approvals</span>
                            <span className="text-sky-400">{pendingReports.length}</span>
                        </h2>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-48">
                            {pendingReports.length > 0 ? pendingReports.slice(0, 3).map(r => (
                                <button key={r.id} onClick={() => setSelectedReport(r)} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-200 group-hover:text-white">{r.type}</span>
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Pending</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate">#{r.id} • {new Date(r.reported_at).toLocaleDateString()}</p>
                                </button>
                            )) : (
                                <p className="text-xs text-slate-600 italic text-center py-4">All clear. No pending items.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                            <p className="text-xs font-bold text-orange-400 mt-1 uppercase tracking-wider animate-pulse">High Heat Stress</p>
                            
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
                                <AnimatedMetric value={simulatedWorkforce} className="text-4xl font-black text-slate-100" />
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

            <div className="h-80 mb-8">
                 <SafetyPulseWidget onExpand={() => setIsSafetyPulseModalOpen(true)} />
            </div>

            <SafetyPulseModal isOpen={isSafetyPulseModalOpen} onClose={() => setIsSafetyPulseModalOpen(false)} />
        </div>
    );
};