import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface SafetyPulseModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const seriesConfig = {
    incident: { name: 'Incident', color: '#FF5252' },
    unsafeAct: { name: 'Unsafe Act', color: '#FFB300' },
    unsafeCondition: { name: 'Unsafe Condition', color: '#42A5F5' },
    positiveObservation: { name: 'Positive Observation', color: '#66BB6A' },
};
type SeriesKey = keyof typeof seriesConfig;

const generateModalData = (minutes: number) => {
    const data = [];
    const now = new Date();
    for (let i = minutes - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60000);
        data.push({
            time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            incident: Math.random() > 0.98 ? 1 : 0,
            unsafeAct: Math.random() > 0.9 ? Math.floor(Math.random() * 2) + 1 : 0,
            unsafeCondition: Math.random() > 0.92 ? Math.floor(Math.random() * 2) : 0,
            positiveObservation: Math.random() > 0.85 ? Math.floor(Math.random() * 3) + 1 : 0,
        });
    }
    return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900 p-3 border border-border-color dark:border-dark-border rounded-lg shadow-lg">
                <p className="font-bold text-text-primary dark:text-dark-text-primary">{label}</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }} className="text-sm">
                        {`${p.name}: ${p.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const SafetyPulseModal: React.FC<SafetyPulseModalProps> = ({ isOpen, onClose }) => {
    const [data, setData] = useState(() => generateModalData(60));
    const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
        incident: true,
        unsafeAct: true,
        unsafeCondition: true,
        positiveObservation: true,
    });

    useEffect(() => {
        if (!isOpen) return;

        const interval = setInterval(() => {
            setData(prevData => {
                // CRITICAL FIX: Check if prevData exists
                if (!prevData || !Array.isArray(prevData)) return generateModalData(60);

                const now = new Date();
                const newDataPoint = {
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    incident: Math.random() > 0.99 ? 1 : 0,
                    unsafeAct: Math.random() > 0.95 ? 1 : 0,
                    unsafeCondition: Math.random() > 0.96 ? 1 : 0,
                    positiveObservation: Math.random() > 0.90 ? 1 : 0,
                };
                return [...prevData.slice(1), newDataPoint];
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [isOpen]);

    const toggleSeries = (key: SeriesKey) => {
        setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
            <div className="w-full lg:w-3/4 h-full bg-card dark:bg-dark-card shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b dark:border-dark-border flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary">Live Safety Pulse Analytics</h2>
                        <p className="text-sm text-text-secondary dark:text-dark-text-secondary">Detailed view of real-time safety event rates.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-border">
                        <XIcon className="w-6 h-6 text-text-secondary dark:text-dark-text-secondary" />
                    </button>
                </header>

                <div className="p-4 border-b dark:border-dark-border flex-shrink-0">
                    <div className="flex justify-between items-center">
                         <div className="flex items-center space-x-2">
                             <FilterIcon className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary"/>
                             <select className="p-1 border rounded-md text-sm bg-transparent dark:bg-dark-background dark:border-dark-border"><option>All Projects</option></select>
                         </div>
                         <div className="flex items-center space-x-2">
                             <Button size="sm" variant="secondary">Export PNG</Button>
                         </div>
                    </div>
                </div>

                <main className="flex-grow p-4 overflow-auto">
                    <div className="h-[60vh] w-full">
                        <ResponsiveContainer>
                            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" />
                                <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-text-secondary dark:text-dark-text-secondary" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend onClick={(e) => toggleSeries(e.dataKey as SeriesKey)} wrapperStyle={{ fontSize: "12px" }} />
                                {Object.keys(seriesConfig).map(key => (
                                    <Line 
                                        key={key}
                                        type="monotone" 
                                        dataKey={key}
                                        name={seriesConfig[key as SeriesKey].name}
                                        stroke={seriesConfig[key as SeriesKey].color}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        activeDot={{ r: 6 }}
                                        hide={!visibleSeries[key as SeriesKey]}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </main>
            </div>
        </div>
    );
};

const XIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const FilterIcon = (props: React.SVGProps<SVGSVGElement>) => <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.572a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" /></svg>;