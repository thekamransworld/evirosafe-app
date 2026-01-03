import React, { useState, useEffect, useMemo, useRef } from 'react';
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
                <span className="text-xs text-slate-500 font-mono uppercase tracking-wider">{activeOrg.name}</span>
            </div>
            
            <div className="flex items-center gap-6 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span className={isHighRisk ? 'text-red-400' : 'text-emerald-400'}>RISK: {riskLevel.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                    <SunIcon className="w-3 h-3 text-orange-400" />
                    <span>HEAT: <AnimatedMetric value={temperature} className="text-orange-400 font-bold" />°C</span>
                </div>
                <div className="flex items-center gap-2">
                    <UsersIcon className="w-3 h-3 text-blue-400" />
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
    const baseClass = "rounded-3xl p-6 text-slate-100 transition-all duration-300 shadow-[0_18px_45px_rgba(0,0,0,0.55)]";
    const themeClass = isHighRisk ? "hero-card-high" : "hero-card-normal";

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
                            <span className={`text-6xl font-black tracking-tighter ${isHighRisk ? 'text-transparent bg-clip-text bg-gradient-to-br from-white via-red-200 to-red-500 drop-shadow-sm' : 'text-emerald-300'}`}>
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
                        {aiSummary}
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
    const { usersList, setCurrentView } = useAppContext(); // <--- FIXED: usersList from AppContext
    const { setIsReportCreationModalOpen, setIsTbtCreationModalOpen, setSelectedReport, setIsInspectionCreationModalOpen } = useModalContext();
    
    const [isSafetyPulseModalOpen, setIsSafetyPulseModalOpen] = useState(false);
    const [simulatedTemp, setSimulatedTemp] = useState(38);

    // --- REAL DATA CALCULATIONS ---
    const activePermits = useMemo(() => ptwList.filter(p => p.status === 'ACTIVE').length, [ptwList]);
    const pendingReports = useMemo(() => reportList.filter(r => r.status === 'under_review' || r.status === 'submitted'), [reportList]);
    
    // Calculate Risk Level based on Open Incidents
    const riskAnalysis = useMemo(() => {
        const openIncidents = reportList.filter(r => r.status !== 'closed');
        const criticalCount = openIncidents.filter(r => (r.risk_pre_control.severity * r.risk_pre_control.likelihood) >= 15).length;
        const highCount = openIncidents.filter(r => (r.risk_pre_control.severity * r.risk_pre_control.likelihood) >= 9).length;

        if (criticalCount > 0) return { level: 'Critical', summary: `${criticalCount} Critical Incidents Open. Immediate Action Required.` };
        if (highCount > 0) return { level: 'High', summary: `${highCount} High Risk Incidents Open. Monitor closely.` };
        if (openIncidents.length > 5) return { level: 'Medium', summary: 'Multiple open reports. Review control measures.' };
        return { level: 'Low', summary: 'Site operations are stable. No major incidents.' };
    }, [reportList]);

    // Calculate Stats for Pulse Widget
    const pulseStats = useMemo(() => ({
        incidents: reportList.filter(r => ['Incident', 'Accident', 'Fire Event'].includes(r.type)).length,
        unsafeActs: reportList.filter(r => r.type === 'Unsafe Act').length,
        unsafeConditions: reportList.filter(r => r.type === 'Unsafe Condition').length,
        positiveObs: reportList.filter(r => r.type === 'Positive Observation').length,
    }), [reportList]);

    // Estimate Workforce (Users + 4 workers per active permit)
    // FIX: Added safety check for usersList
    const workforceCount = (usersList?.length || 0) + (activePermits * 4);

    // Recommendations based on Risk
    const recommendations = useMemo(() => {
        if (riskAnalysis.level === 'Critical') return ['Stop work in affected areas', 'Conduct emergency meeting', 'Review all active permits'];
        if (riskAnalysis.level === 'High') return ['Increase inspection frequency', 'Verify all PTW controls', 'Conduct TBT on recent incidents'];
        return ['Maintain housekeeping standards', 'Ensure hydration breaks', 'Routine equipment checks'];
    }, [riskAnalysis.level]);

    // Simulate temp fluctuation
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
                        recommendations={recommendations}
                        className="h-full"
                    />
                </div>

                <div className="xl:col-span-4 flex flex-col gap-6">
                    <div className="glass-card p-5">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400">
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

                    <div className="glass-card flex-1 p-5 flex flex-col">
                        <h2 className="mb-4 text-xs font-bold tracking-[0.2em] uppercase text-slate-400 flex justify-between">
                            <span>Approvals</span>
                            <span className="text-sky-400">{pendingReports.length}</span>
                        </h2>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {pendingReports.length > 0 ? pendingReports.slice(0, 3).map(r => (
                                <button key={r.id} onClick={() => setSelectedReport(r)} className="w-full text-left p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-slate-200 group-hover:text-white">{r.type}</span>
                                        <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Pending</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 truncate">#{r.id.slice(-6)} • {new Date(r.reported_at).toLocaleDateString()}</p>
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
                            <SunIcon className="w-32 h-32" />
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

// Icons
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>;
const UsersIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>;
const AlertIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;
const ClipboardIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504 1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>;
const MegaphoneIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.463a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.43.816 1.035.816 1.73 0 .695-.32 1.3-.816 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>;