import React, { useState, useEffect, useRef } from 'react';
import { generateAiRiskForecast } from '../services/geminiService';
import { SafetyPulseWidget } from './SafetyPulseWidget';
import { SafetyPulseModal } from './SafetyPulseModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { SiteMap } from './SiteMap';
import { 
    Sun, Users, AlertTriangle, Clipboard, Megaphone, 
    Satellite, Wind, Activity 
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
        <header className="mb-6 rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-lg">
            <div className="flex items-center gap-4 mb-2 md:mb-0">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Satellite className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                    <div className="text-sm font-bold tracking-widest text-slate-200 uppercase">
                        {activeOrg.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                        Live Site Operations
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                    <span className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className={isHighRisk ? 'text-red-400' : 'text-emerald-400'}>RISK: {riskLevel.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Sun className="w-3 h-3 text-orange-400" />
                    <span>HEAT: <AnimatedMetric value={temperature} className="text-orange-400 font-bold" />°C</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700">
                    <Users className="w-3 h-3 text-blue-400" />
                    <span>ACTIVE WORKERS: <AnimatedMetric value={workforceCount} className="text-blue-400 font-bold" /></span>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-slate-800 text-slate-500 font-mono">
                    {time.toLocaleTimeString([], { hour12: false })}
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
    const baseClass = "rounded-3xl p-6 text-slate-100 transition-all duration-300 shadow-xl relative overflow-hidden";
    // Force dark theme colors regardless of system preference for the "Command Center" look
    const themeClass = isHighRisk 
        ? "bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900 border border-red-500/30" 
        : "bg-gradient-to-br from-slate-900 via-emerald-900/10 to-slate-900 border border-emerald-500/30";

    return (
        <div className={`${baseClass} ${themeClass} ${className} flex flex-col justify-between`}>
            {/* Decorative Glow */}
            <div className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl opacity-10 ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="space-y-1">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-slate-400 font-bold">
                            Today's Risk Forecast
                        </p>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-6xl font-black tracking-tighter ${isHighRisk ? 'text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]' : 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]'}`}>
                                {riskLevel.toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI Insight Pill */}
                <div className="mt-2 flex items-start gap-3 relative z-10">
                    <div className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400">
                        <Satellite className="w-4 h-4" />
                    </div>
                    <div className="flex-1 rounded-xl bg-black/20 border border-white/5 px-4 py-3 text-sm leading-relaxed text-slate-300">
                        <span className="text-sky-400 font-bold text-xs uppercase tracking-wide block mb-1">AI Analysis</span>
                        {aiSummary || "Analyzing site telemetry..."}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 border-t border-white/5 pt-5">
                <p className="mb-3 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-bold">
                    Priority Actions
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
        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-xs transition-all group
        ${disabled 
            ? "border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed" 
            : "border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-sky-500/50 text-slate-300 hover:text-white hover:shadow-lg"
        }`}
    >
        <div className="flex items-center gap-3">
            <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg transition-colors ${disabled ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-slate-400 group-hover:text-sky-400 group-hover:bg-sky-500/10'}`}>
                {icon || '+'}
            </span>
            <span className="font-medium tracking-wide">{label}</span>
        </div>
        {hotkey && (
            <span className="rounded border border-white/5 bg-black/20 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 group-hover:text-slate-400">
                {hotkey}
            </span>
        )}
    </button>
);

const WidgetCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm p-5 flex flex-col ${className}`}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <div className="h-1 w-1 bg-slate-600 rounded-full"></div>
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
    
    // Live Data Simulation State
    const [simulatedWorkforce, setSimulatedWorkforce] = useState(65);
    const [simulatedTemp, setSimulatedTemp] = useState(38);

    // Mock Data Loading
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

    // Simulate live data changes
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
    const pendingReports = reportList.filter(r => r.status === 'under_review');

    return (
        <div className="min-h-screen bg-[#020617] p-6"> {/* Forced Dark Background */}
            <DashboardHeader riskLevel={riskLevel} workforceCount={simulatedWorkforce} temperature={simulatedTemp} />

            {/* ROW 1: HERO & ACTIONS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
                {/* Hero Risk Card (8 cols) */}
                <div className="xl:col-span-8">
                    <RiskLevelCard 
                        riskLevel={riskLevel} 
                        aiSummary={aiForecast?.summary || ""} 
                        recommendations={aiForecast?.recommendations || []}
                        className="h-full"
                    />
                </div>

                {/* Quick Actions & Stats (4 cols) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    {/* Quick Actions */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase text-slate-500">
                            Operations
                        </h2>
                        <div className="space-y-3">
                            <QuickAction label="New Incident Report" hotkey="N" icon={<AlertTriangle size={18}/>} onClick={() => setIsReportCreationModalOpen(true)} />
                            <QuickAction 
                                label="Start Inspection" 
                                hotkey="I" 
                                icon={<Clipboard size={18}/>} 
                                onClick={() => {
                                    setCurrentView('inspections');
                                    setIsInspectionCreationModalOpen(true);
                                }} 
                            />
                            <QuickAction label="Conduct Toolbox Talk" hotkey="T" icon={<Megaphone size={18}/>} onClick={() => setIsTbtCreationModalOpen(true)} />
                        </div>
                    </div>

                    {/* Approvals Mini List */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 flex-1 p-5 flex flex-col">
                        <h2 className="mb-4 text-xs font-bold tracking-widest uppercase text-slate-500 flex justify-between">
                            <span>Pending Approvals</span>
                            <span className="text-sky-500 bg-sky-500/10 px-2 rounded">{pendingReports.length}</span>
                        </h2>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {pendingReports.length > 0 ? pendingReports.slice(0, 3).map(r => (
                                <button key={r.id} onClick={() => setSelectedReport(r)} className="w-full text-left p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-300 group-hover:text-white">{r.type}</span>
                                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded">Review</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate">#{r.id} • {new Date(r.reported_at).toLocaleDateString()}</p>
                                </button>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                    <Clipboard className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs italic">All caught up.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: SITE TWIN & ENVIRONMENT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                {/* Site Digital Twin (2 cols) */}
                <div className="xl:col-span-2 h-96">
                    <WidgetCard title="3D Site Digital Twin" className="h-full p-0 overflow-hidden relative group border-slate-800 bg-slate-950">
                        {/* Legend Overlay */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className="px-2 py-1 bg-black/80 rounded text-[10px] text-red-400 border border-red-900/50">Incident</span>
                            <span className="px-2 py-1 bg-black/80 rounded text-[10px] text-blue-400 border border-blue-900/50">Permit</span>
                        </div>
                        {/* Map Component */}
                        <SiteMap embedded={true} />
                    </WidgetCard>
                </div>

                {/* Environment Widget (1 col) */}
                <div className="h-96">
                    <WidgetCard title="Site Conditions" className="h-full relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 text-orange-500/10 animate-spin-slow">
                            <Sun className="w-48 h-48" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-baseline gap-2 mt-4">
                                <AnimatedMetric value={simulatedTemp} className="text-6xl font-black text-slate-100" />
                                <span className="text-xl text-slate-500">°C</span>
                            </div>
                            <p className="text-xs font-bold text-orange-400 mt-2 uppercase tracking-wider flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" />
                                Heat Stress Warning
                            </p>
                            
                            <div className="grid grid-cols-1 gap-3 mt-auto">
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Wind className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs text-slate-400 uppercase">Wind Speed</span>
                                    </div>
                                    <p className="text-sm font-mono text-cyan-400">25 km/h</p>
                                </div>
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-slate-500" />
                                        <span className="text-xs text-slate-400 uppercase">Air Quality</span>
                                    </div>
                                    <p className="text-sm font-mono text-emerald-400">Good (42)</p>
                                </div>
                            </div>
                        </div>
                    </WidgetCard>
                </div>
            </div>

            {/* ROW 3: SAFETY PULSE */}
            <div className="h-80">
                 <SafetyPulseWidget onExpand={() => setIsSafetyPulseModalOpen(true)} />
            </div>

            <SafetyPulseModal isOpen={isSafetyPulseModalOpen} onClose={() => setIsSafetyPulseModalOpen(false)} />
        </div>
    );
};

// Icons
const Sun = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;