import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

interface SafetyPulseWidgetProps {
    onExpand: () => void;
    stats?: {
        incidents: number;
        unsafeActs: number;
        unsafeConditions: number;
        positiveObs: number;
    };
}

const seriesConfig = {
    incident: { name: 'Incident', color: '#ef4444', gradient: ['#ef4444', '#7f1d1d'] },
    unsafeAct: { name: 'Unsafe Act', color: '#f97316', gradient: ['#f97316', '#7c2d12'] },
    unsafeCondition: { name: 'Unsafe Cond.', color: '#06b6d4', gradient: ['#06b6d4', '#164e63'] },
    positiveObservation: { name: 'Positive Obs.', color: '#10b981', gradient: ['#10b981', '#064e3b'] },
};

// Mock Data Generator
const generateTrendData = (points: number) => {
    const data = [];
    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 5 * 60000); // 5 min intervals
        data.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            incident: 0,
            unsafeAct: Math.floor(Math.random() * 3) + 1,
            unsafeCondition: Math.floor(Math.random() * 2),
            positiveObservation: Math.floor(Math.random() * 4) + 1,
        });
    }
    return data;
};

const KPICard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
    <div className="flex flex-col justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
        <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{title}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="flex items-center mt-2">
            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                <div style={{ width: '60%', backgroundColor: color }} className="h-full rounded-full opacity-80"></div>
            </div>
        </div>
    </div>
);

export const SafetyPulseWidget: React.FC<SafetyPulseWidgetProps> = ({ onExpand, stats }) => {
    // Initialize with function to ensure it runs only once
    const [data, setData] = useState<any[]>(() => generateTrendData(24));
    const [selectedRange, setSelectedRange] = useState('Last 60m');

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                // CRITICAL FIX: If prev is undefined/null, reset it
                if (!prev || !Array.isArray(prev)) return generateTrendData(24);

                const nextTime = new Date();
                const newPoint = {
                    time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    incident: 0,
                    unsafeAct: Math.floor(Math.random() * 3),
                    unsafeCondition: Math.floor(Math.random() * 2),
                    positiveObservation: Math.floor(Math.random() * 3),
                };
                // Safe slice
                return [...prev.slice(1), newPoint];
            });
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    // Default values if stats are loading
    const safeStats = stats || { incidents: 0, unsafeActs: 0, unsafeConditions: 0, positiveObs: 0 };

    return (
        <div className="h-full flex flex-col overflow-hidden bg-slate-900/50 rounded-xl border border-white/10 backdrop-blur-sm">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Real-Time Safety Pulse</h3>
                    <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">LIVE</span>
                    </div>
                </div>
                <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
                    {['Last 60m', '24h'].map(range => (
                        <button 
                            key={range}
                            onClick={() => setSelectedRange(range)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${selectedRange === range ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {range}
                        </button>
                    ))}
                    <button onClick={onExpand} className="px-3 py-1 text-xs font-medium text-sky-400 hover:text-white transition-colors">
                        Expand ↗
                    </button>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Metrics & Chart */}
                <div className="flex-1 flex flex-col p-4">
                    {/* KPI Strip */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <KPICard title="Incidents" value={safeStats.incidents} color={seriesConfig.incident.color} />
                        <KPICard title="Unsafe Acts" value={safeStats.unsafeActs} color={seriesConfig.unsafeAct.color} />
                        <KPICard title="Conditions" value={safeStats.unsafeConditions} color={seriesConfig.unsafeCondition.color} />
                        <KPICard title="Positive Obs." value={safeStats.positiveObs} color={seriesConfig.positiveObservation.color} />
                    </div>

                    {/* Main Chart */}
                    <div className="flex-1 min-h-0 relative w-full h-full" style={{ minHeight: '150px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                <defs>
                                    {Object.keys(seriesConfig).map(key => (
                                        <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={(seriesConfig as any)[key].color} stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor={(seriesConfig as any)[key].color} stopOpacity={0}/>
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="time" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 600 }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="unsafeAct" stroke={seriesConfig.unsafeAct.color} fill={`url(#grad-unsafeAct)`} strokeWidth={2} stackId="1" />
                                <Area type="monotone" dataKey="positiveObservation" stroke={seriesConfig.positiveObservation.color} fill={`url(#grad-positiveObservation)`} strokeWidth={2} stackId="1" />
                                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Threshold', fill: '#ef4444', fontSize: 10, position: 'right' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};