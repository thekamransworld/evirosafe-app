import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Activity } from 'lucide-react';

interface SafetyPulseWidgetProps {
    onExpand: () => void;
}

const seriesConfig = {
    incident: { name: 'Incident', color: '#ef4444' },
    unsafeAct: { name: 'Unsafe Act', color: '#f97316' },
    unsafeCondition: { name: 'Unsafe Cond.', color: '#06b6d4' },
    positiveObservation: { name: 'Positive Obs.', color: '#10b981' },
};

const hotspots = [
    { area: 'Tower B', count: 4, risk: 'High' },
    { area: 'Scaffold Zone', count: 3, risk: 'Med' },
    { area: 'Loading Bay', count: 2, risk: 'Low' },
];

const generateTrendData = (points: number) => {
    const data = [];
    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 5 * 60000);
        data.push({
            time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            incident: Math.random() > 0.95 ? 1 : 0,
            unsafeAct: Math.floor(Math.random() * 5) + 1,
            unsafeCondition: Math.floor(Math.random() * 3),
            positiveObservation: Math.floor(Math.random() * 6) + 2,
        });
    }
    return data;
};

const KPICard: React.FC<{ title: string; value: string; change: number; color: string }> = ({ title, value, change, color }) => (
    <div className="flex flex-col justify-between p-3 bg-white/5 rounded-lg border border-white/5">
        <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{title}</p>
            <p className="text-xl font-bold text-white mt-1">{value}<span className="text-xs text-slate-500 font-normal">/hr</span></p>
        </div>
        <div className="flex items-center mt-2">
            <span className={`text-xs font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {change > 0 ? '▲' : '▼'} {Math.abs(change)}%
            </span>
            <div className="ml-auto flex space-x-0.5 items-end h-4">
                {[40, 60, 30, 80, 50].map((h, i) => (
                    <div key={i} style={{ height: `${h}%`, backgroundColor: color }} className="w-1 rounded-t-sm opacity-60"></div>
                ))}
            </div>
        </div>
    </div>
);

export const SafetyPulseWidget: React.FC<SafetyPulseWidgetProps> = ({ onExpand }) => {
    const [data, setData] = useState(() => generateTrendData(24));
    const [selectedRange, setSelectedRange] = useState('Last 60m');

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                const nextTime = new Date();
                const newPoint = {
                    time: nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    incident: 0,
                    unsafeAct: Math.floor(Math.random() * 4) + 2,
                    unsafeCondition: Math.floor(Math.random() * 2),
                    positiveObservation: Math.floor(Math.random() * 4) + 1,
                };
                return [...prev.slice(1), newPoint];
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="glass-card h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center space-x-3">
                    <Activity className="w-4 h-4 text-neon-blue" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Real-Time Safety Pulse</h3>
                    <div className="flex items-center space-x-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
                        <div className="live-dot"></div>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">LIVE</span>
                    </div>
                </div>
                <div className="flex space-x-1 bg-white/5 p-1 rounded-lg">
                    {['Last 60m', '3h', '24h'].map(range => (
                        <button 
                            key={range}
                            onClick={() => setSelectedRange(range)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${selectedRange === range ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {range}
                        </button>
                    ))}
                    <button onClick={onExpand} className="px-3 py-1 text-xs font-medium text-neon-blue hover:text-white transition-colors">
                        Expand ↗
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col p-4 border-r border-white/10">
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <KPICard title="Incident" value="0.0" change={-100} color={seriesConfig.incident.color} />
                        <KPICard title="Unsafe Acts" value="9.0" change={-20.6} color={seriesConfig.unsafeAct.color} />
                        <KPICard title="Conditions" value="3.0" change={-12.4} color={seriesConfig.unsafeCondition.color} />
                        <KPICard title="Positive Obs." value="6.0" change={20.1} color={seriesConfig.positiveObservation.color} />
                    </div>

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

                <div className="w-48 p-4 flex flex-col bg-black/20">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Hot Spots (1h)</h4>
                    <div className="space-y-2">
                        {hotspots.map((spot, i) => (
                            <div key={i} className="flex justify-between items-center p-2 rounded bg-white/5 border border-white/5">
                                <div>
                                    <p className="text-xs font-bold text-slate-200">{spot.area}</p>
                                    <p className={`text-[10px] font-semibold ${spot.risk === 'High' ? 'text-red-400' : 'text-yellow-400'}`}>{spot.risk} Risk</p>
                                </div>
                                <div className="text-lg font-black text-white/80">{spot.count}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-auto">
                         <div className="text-[10px] text-slate-500 text-center mt-2">Updated just now</div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-2 bg-gradient-to-r from-blue-900/40 to-transparent border-t border-white/10 flex items-center space-x-3">
                 <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-blue"></span>
                </span>
                <p className="text-xs text-slate-300 font-medium truncate">
                    <span className="text-neon-blue font-bold mr-1">AI Insight:</span> 
                    Spike in Unsafe Acts near Substation A (10:10–10:25) linked to electrical scaffolding work.
                </p>
            </div>
        </div>
    );
};