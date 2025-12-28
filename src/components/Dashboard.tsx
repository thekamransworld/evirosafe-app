import React, { useState, useEffect, useRef } from 'react';
import { generateAiRiskForecast } from '../services/geminiService';
import { SafetyPulseWidget } from './SafetyPulseWidget';
import { SafetyPulseModal } from './SafetyPulseModal';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import { SiteMap } from './SiteMap';

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
        <span className={`${className} inline-block transition-all duration-300 ${animating ? 'scale-110 text-white drop-shadow-md' : ''}`}>
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
        <header className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-lg">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className="text-lg font-bold tracking-wide text-slate-100">
                    EviroSafe <span className="text-sky-500">3.0</span>
                </div>
                <div className="hidden md:block w-px h-6 bg-slate-700"></div>
                <span className="text-sm text-slate-400 font-mono uppercase tracking-wider">{activeOrg.name}</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-300">
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <span className={`w-2.5 h-2.5 rounded-full ${isHighRisk ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className={isHighRisk ? 'text-red-400' : 'text-emerald-400'}>RISK: {riskLevel.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <SunIcon className="w-4 h-4 text-orange-400" />
                    <span><AnimatedMetric value={temperature} className="text-orange-400 font-bold" />°C</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
                    <UsersIcon className="w-4 h-4 text-blue-400" />
                    <span><AnimatedMetric value={workforceCount} className="text-blue-400 font-bold" /> Active</span>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 shadow-inner">
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
    // Use the new CSS classes from index.css
    const themeClass = isHighRisk ? "hero-card-high" : "hero-card-normal";

    return (
        <div className={`rounded-3xl p-8 transition-all duration-300 ${themeClass} ${className} flex flex-col justify-between relative overflow-hidden`}>
            {/* Decorative Glow */}
            <div className={`pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full blur-[100px] opacity-30 ${isHighRisk ? 'bg-red-500' : 'bg-emerald-500'}`} />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-2">
                        <p className="text-xs tracking-[0.3em] uppercase font-bold opacity-90">
                            Daily Risk Forecast
                        </p>
                        <div className="flex items-baseline gap-4">
                            <span className="text-7xl font-black tracking-tighter drop-shadow-lg">
                                {riskLevel.toUpperCase()}
                            </span>
                            {isHighRisk && (
                                <span className="rounded-full border border-red-400/50 bg-red-500/20 px-4 py-1 text-xs font-bold uppercase text-red-100 tracking-widest animate-pulse">
                                    Alert
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Insight Pill */}
                <div className="mt-4 flex items-start gap-4">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 text-sm font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                        AI
                    </div>
                    <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-700/50 px-6 py-4 text-sm leading-relaxed text-slate-100 backdrop-blur-md shadow-inner">
                        <span className="text-sky-400 font-bold uppercase text-xs tracking-wide block mb-1">Analysis</span>
                        {aiSummary || "Analyzing site telemetry..."}
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="mt-8 border-t border-white/10 pt-6 relative z-10">
                <p className="mb-4 text-xs tracking-[0.2em] uppercase font-bold opacity-80">
                    Priority Actions
                </p>
                <ul className="space-y-3">
                    {recommendations.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="flex gap-3 items-center text-sm font-medium bg-black/20 px-4 py-3 rounded-xl border border-white/5 hover:bg-black/30 transition-colors cursor-default">
                            <span className={`flex-shrink-0 h-2 w-2 rounded-full ${idx === 0 ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : idx === 1 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
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
        className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 text-sm transition-all group
        ${disabled 
            ? "border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed" 
            : "border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-sky-500/50 text-slate-200 hover:text-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
        }`}
    >
        <div className="flex items-center gap-4">
            <span className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-colors ${disabled ? 'bg-slate-800 text-slate-600' : 'bg-slate-900 text-slate-400 group-hover:text-sky-400 group-hover:bg-sky-950'}`}>
                {icon || '+'}
            </span>
            <span className="font-semibold tracking-wide">{label}</span>
        </div>
        {hotkey && (
            <span className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-[10px] font-mono text-slate-400">
                {hotkey}
            </span>
        )}
    </button>
);

const WidgetCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`glass-card flex flex-col ${className}`}>
        <div className="flex justify-between items-center mb-5 px-6 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em]">{title}</h3>
            <div className="h-1 w-12 bg-slate-700 rounded-full"></div>
        </div>
        <div className="flex-1 relative px-6 pb-6">
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
    const activePermits = ptwList.filter(p => p.status === 'ACTIVE').length;
    const pendingReports = reportList.filter(r => r.status === 'under_review');

    return (
        <div className="dashboard-bg pb-20"> {/* Added padding bottom for scrolling */}
            <DashboardHeader riskLevel={riskLevel} workforceCount={simulatedWorkforce} temperature={simulatedTemp} />

            {/* ROW 1: HERO & ACTIONS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
                {/* Hero Risk Card (8 cols) */}
                <div className="xl:col-span-8 min-h-[400px]">
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
                    <div className="glass-card p-6">
                        <h2 className="mb-5 text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <QuickAction label="New Incident Report" hotkey="N" icon={<AlertIcon/>} onClick={() => setIsReportCreationModalOpen(true)} />
                            <QuickAction 
                                label="Start Inspection" 
                                hotkey="I" 
                                icon={<ClipboardIcon/>} 
                                onClick={() => {
                                    setCurrentView('inspections');
                                    setIsInspectionCreationModalOpen(true);
                                }} 
                            />
                            <QuickAction label="Conduct Toolbox Talk" hotkey="T" icon={<MegaphoneIcon/>} onClick={() => setIsTbtCreationModalOpen(true)} />
                        </div>
                    </div>

                    {/* Approvals Mini List */}
                    <div className="glass-card flex-1 p-6 flex flex-col min-h-[200px]">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400 flex justify-between items-center">
                            <span>Pending Approvals</span>
                            <span className="bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full text-[10px]">{pendingReports.length}</span>
                        </h2>
                        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {pendingReports.length > 0 ? pendingReports.slice(0, 3).map(r => (
                                <button key={r.id} onClick={() => setSelectedReport(r)} className="w-full text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:bg-slate-800 hover:border-sky-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-sm font-bold text-slate-200 group-hover:text-white">{r.type}</span>
                                        <span className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Review</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 truncate">#{r.id} • {new Date(r.reported_at).toLocaleDateString()}</p>
                                </button>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                    <CheckCircleIcon className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-xs italic">All caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROW 2: SITE TWIN & ENVIRONMENT */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Site Digital Twin (2 cols) */}
                <div className="xl:col-span-2 h-[500px]">
                    <WidgetCard title="3D Site Digital Twin" className="h-full p-0 overflow-hidden relative group">
                        {/* Legend Overlay */}
                        <div className="absolute top-6 right-6 z-10 flex gap-2 pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">
                            <span className="px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg text-xs font-bold text-red-400 border border-red-500/30 shadow-lg">Incident</span>
                            <span className="px-3 py-1.5 bg-slate-900/80 backdrop-blur rounded-lg text-xs font-bold text-blue-400 border border-blue-500/30 shadow-lg">Permit</span>
                        </div>
                        {/* Map Component */}
                        <div className="w-full h-full rounded-2xl overflow-hidden">
                            <SiteMap embedded={true} />
                        </div>
                    </WidgetCard>
                </div>

                {/* Env & Workforce Stack (1 col) */}
                <div className="space-y-8 flex flex-col h-[500px]">
                    {/* Environment */}
                    <WidgetCard title="Environment" className="flex-1 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 text-orange-500/10 animate-spin-slow pointer-events-none">
                            <SunIcon className="w-48 h-48" />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <AnimatedMetric value={simulatedTemp} className="text-6xl font-black text-slate-100 tracking-tighter" />
                                    <span className="text-2xl text-slate-500 font-light">°C</span>
                                </div>
                                <p className="text-sm font-bold text-orange-400 mt-2 uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                    High Heat Stress
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Wind Speed</p>
                                    <p className="text-lg font-mono text-cyan-400">25 <span className="text-xs text-slate-600">km/h</span></p>
                                </div>
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Air Quality</p>
                                    <p className="text-lg font-mono text-emerald-400">Good</p>
                                </div>
                            </div>
                        </div>
                    </WidgetCard>

                    {/* Live Workforce */}
                    <WidgetCard title="Live Workforce" className="flex-1">
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex justify-between items-end">
                                <div>
                                    <AnimatedMetric value={simulatedWorkforce} className="text-5xl font-black text-slate-100 tracking-tighter" />
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wide block mt-1">On Site Now</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Active Permits</p>
                                    <p className="text-2xl font-bold text-sky-400 font-mono">{activePermits}</p>
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="flex justify-between mb-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                    <span>Compliance Rate</span>
                                    <span className="text-emerald-400">98%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[98%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>
                        </div>
                    </WidgetCard>
                </div>
            </div>

            {/* ROW 3: SAFETY PULSE */}
            <div className="h-96">
                 <SafetyPulseWidget onExpand={() => setIsSafetyPulseModalOpen(true)} />
            </div>

            <SafetyPulseModal isOpen={isSafetyPulseModalOpen} onClose={() => setIsSafetyPulseModalOpen(false)} />
        </div>
    );
};

// Icons
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const AlertIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504 1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;
const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>;
const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;