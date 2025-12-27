import React, { useState, useMemo } from 'react';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import type { Ptw, Report, Project } from '../types';
import { ptwTypeDetails } from '../config';
import { getRiskLevel } from '../utils/riskUtils'; // Imported from utils

interface MarkerProps {
    x: number;
    y: number;
    type: 'ptw' | 'incident';
    data: any;
    onClick: () => void;
}

interface SiteMapProps {
    embedded?: boolean;
}

const Marker: React.FC<MarkerProps> = ({ x, y, type, data, onClick }) => {
    let color = '';
    
    if (type === 'ptw') {
        const ptw = data as Ptw;
        const details = ptwTypeDetails[ptw.type];
        color = details.hex;
    } else if (type === 'incident') {
        const report = data as Report;
        const risk = getRiskLevel(report.risk_pre_control);
        color = risk.color === 'red' ? '#ef4444' : '#f59e0b';
    }

    return (
        <g transform={`translate(${x}, ${y})`} onClick={(e) => { e.stopPropagation(); onClick(); }} className="cursor-pointer hover:scale-125 transition-transform duration-200">
            <circle r="16" fill={color} fillOpacity="0.4" className="animate-pulse" />
            <circle r="6" fill={color} stroke="white" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <line x1="0" y1="0" x2="0" y2="20" stroke={color} strokeWidth="2" strokeOpacity="0.5" />
            <circle cx="0" cy="20" r="2" fill={color} fillOpacity="0.5" />
        </g>
    );
};

const MapZone: React.FC<{ 
    id: string; 
    d: string; 
    label: string; 
    isActive: boolean;
    riskScore: number; 
    onClick: () => void 
}> = ({ id, d, label, isActive, riskScore, onClick }) => {
    const getRiskFill = (score: number) => {
        if (score === 0) return 'rgba(255, 255, 255, 0.02)';
        if (score < 5) return 'rgba(250, 204, 21, 0.1)';
        if (score < 10) return 'rgba(251, 146, 60, 0.2)';
        return 'rgba(248, 113, 113, 0.3)';
    };

    return (
        <g onClick={onClick} className="cursor-pointer group">
            <path 
                d={d} 
                fill={getRiskFill(riskScore)} 
                stroke={isActive ? '#00f3ff' : '#64748b'} 
                strokeWidth={isActive ? 2 : 1} 
                className="transition-all duration-300 hover:fill-opacity-20 hover:stroke-white/80"
                style={{ filter: isActive ? 'drop-shadow(0 0 8px rgba(0, 243, 255, 0.5))' : 'none' }}
            />
             {(() => {
                 const bboxMatch = d.match(/M\s(\d+),(\d+)\sH\s(\d+)\sV\s(\d+)/);
                 let x = 0, y = 0;
                 if (bboxMatch) {
                     x = (parseInt(bboxMatch[1]) + parseInt(bboxMatch[3])) / 2;
                     y = (parseInt(bboxMatch[2]) + parseInt(bboxMatch[4])) / 2;
                 }
                 return (
                     <text 
                        x={x} y={y} 
                        textAnchor="middle" 
                        dominantBaseline="middle"
                        className="pointer-events-none font-bold uppercase text-[10px] fill-slate-400 select-none tracking-widest"
                     >
                         {label}
                     </text>
                 )
             })()}
        </g>
    );
};

export const SiteMap: React.FC<SiteMapProps> = ({ embedded = false }) => {
    const { projects } = useDataContext();
    const { ptwList, reportList } = useDataContext();
    const { setSelectedPtw, setSelectedReport } = useModalContext();
    
    const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] || null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showPtws, setShowPtws] = useState(true);
    const [showIncidents, setShowIncidents] = useState(true);

    const zones = [
        { id: 'zone_a', label: 'Tower A', d: 'M 50,50 H 250 V 300 H 50 Z' },
        { id: 'zone_b', label: 'Tower B', d: 'M 300,50 H 500 V 300 H 300 Z' },
        { id: 'zone_laydown', label: 'Laydown', d: 'M 550,50 H 750 V 200 H 550 Z' },
        { id: 'zone_excavation', label: 'Pit', d: 'M 50,350 H 400 V 550 H 50 Z' },
        { id: 'zone_office', label: 'Office', d: 'M 450,400 H 750 V 550 H 450 Z' },
    ];

    const mapItemToZone = (locationText: string): { zoneId: string, x: number, y: number } | null => {
        if (!locationText) return null;
        const lowerLoc = locationText.toLowerCase();
        const rand = (min: number, max: number) => Math.random() * (max - min) + min;
        if (lowerLoc.includes('tower a') || lowerLoc.includes('sector a')) return { zoneId: 'zone_a', x: rand(60, 240), y: rand(60, 290) };
        if (lowerLoc.includes('tower b') || lowerLoc.includes('sector b')) return { zoneId: 'zone_b', x: rand(310, 490), y: rand(60, 290) };
        if (lowerLoc.includes('laydown')) return { zoneId: 'zone_laydown', x: rand(560, 740), y: rand(60, 190) };
        if (lowerLoc.includes('excavation') || lowerLoc.includes('pit')) return { zoneId: 'zone_excavation', x: rand(60, 390), y: rand(360, 540) };
        if (lowerLoc.includes('office')) return { zoneId: 'zone_office', x: rand(460, 740), y: rand(410, 540) };
        return null;
    };

    const mappedData = useMemo(() => {
        const ptws = ptwList
            .filter(p => p.status === 'ACTIVE' && p.project_id === selectedProject?.id)
            .map(p => ({ ...p, mapLoc: mapItemToZone(p.payload?.work?.location || '') }))
            .filter(p => p.mapLoc !== null);
            
        const incidents = reportList
            .filter(r => r.status !== 'closed' && r.project_id === selectedProject?.id)
            .map(r => {
                const locText = r.location?.text || '';
                const specificArea = r.location?.specific_area || '';
                return { ...r, mapLoc: mapItemToZone(locText + ' ' + specificArea) };
            })
            .filter(r => r.mapLoc !== null);

        return { ptws, incidents };
    }, [ptwList, reportList, selectedProject]);

    const zoneRiskScores = useMemo(() => {
        const scores: Record<string, number> = {};
        zones.forEach(z => scores[z.id] = 0);
        mappedData.incidents.forEach(inc => { if (inc.mapLoc) scores[inc.mapLoc.zoneId] += (inc.risk_pre_control.severity * inc.risk_pre_control.likelihood); });
        mappedData.ptws.forEach(ptw => { if (ptw.mapLoc) scores[ptw.mapLoc.zoneId] += 2; });
        return scores;
    }, [mappedData, zones]);

    const selectedZoneItems = useMemo(() => {
        if (!selectedZone) return { ptws: [], incidents: [] };
        return {
            ptws: mappedData.ptws.filter(p => p.mapLoc?.zoneId === selectedZone),
            incidents: mappedData.incidents.filter(i => i.mapLoc?.zoneId === selectedZone)
        };
    }, [selectedZone, mappedData]);

    if (!selectedProject) return <div className="p-8 text-center text-gray-500">Please select or create a project.</div>;

    return (
        <div className="h-full flex flex-col">
            {!embedded && (
                <div className="p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Site Digital Twin</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Live view of {selectedProject.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <ToggleButton label="Heatmap" active={showHeatmap} onClick={() => setShowHeatmap(!showHeatmap)} />
                        <ToggleButton label="Permits" active={showPtws} onClick={() => setShowPtws(!showPtws)} />
                        <ToggleButton label="Incidents" active={showIncidents} onClick={() => setShowIncidents(!showIncidents)} />
                    </div>
                </div>
            )}

            <div className={`flex-1 flex overflow-hidden relative ${embedded ? 'rounded-none' : ''}`}>
                <div className={`flex-1 relative overflow-auto flex items-center justify-center ${embedded ? '' : 'bg-slate-100 dark:bg-slate-900/50 rounded-xl mx-4 mb-4 border border-slate-200 dark:border-white/10 shadow-inner'}`}>
                    <div className="relative" style={{ width: '800px', height: '600px' }}>
                        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                        
                        <svg width="800" height="600" className="absolute inset-0">
                            {zones.map(zone => (
                                <MapZone 
                                    key={zone.id}
                                    id={zone.id}
                                    d={zone.d}
                                    label={zone.label}
                                    isActive={selectedZone === zone.id}
                                    riskScore={showHeatmap ? zoneRiskScores[zone.id] : 0}
                                    onClick={() => setSelectedZone(zone.id)}
                                />
                            ))}
                            {showPtws && mappedData.ptws.map((ptw: any) => (
                                <Marker key={ptw.id} x={ptw.mapLoc.x} y={ptw.mapLoc.y} type="ptw" data={ptw} onClick={() => { setSelectedPtw(ptw); setSelectedZone(ptw.mapLoc.zoneId); }} />
                            ))}
                            {showIncidents && mappedData.incidents.map((inc: any) => (
                                <Marker key={inc.id} x={inc.mapLoc.x} y={inc.mapLoc.y} type="incident" data={inc} onClick={() => { setSelectedReport(inc); setSelectedZone(inc.mapLoc.zoneId); }} />
                            ))}
                        </svg>
                    </div>
                </div>

                <div className={`absolute top-4 right-4 w-72 max-h-[calc(100%-2rem)] glass-panel rounded-xl shadow-2xl overflow-hidden transition-transform duration-300 flex flex-col ${selectedZone ? 'translate-x-0' : 'translate-x-[120%]'}`}>
                    <div className="p-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 backdrop-blur-md flex justify-between items-center">
                        <h2 className="font-bold text-slate-800 dark:text-white text-sm">{zones.find(z => z.id === selectedZone)?.label}</h2>
                        <button onClick={() => setSelectedZone(null)} className="text-gray-500 hover:text-red-500">&times;</button>
                    </div>
                    <div className="p-3 overflow-y-auto space-y-4">
                         <div>
                            <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Active Permits</h3>
                             <div className="space-y-2">
                                {selectedZoneItems.ptws.map((ptw: any) => (
                                    <div key={ptw.id} onClick={() => setSelectedPtw(ptw)} className="p-2 rounded bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-primary-400 cursor-pointer text-xs transition-colors">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{ptw.type}</p>
                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{ptw.payload.work.description}</p>
                                    </div>
                                ))}
                                {selectedZoneItems.ptws.length === 0 && <p className="text-xs text-slate-400 italic">None.</p>}
                             </div>
                        </div>
                         <div>
                            <h3 className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-2">Incidents</h3>
                             <div className="space-y-2">
                                {selectedZoneItems.incidents.map((inc: any) => (
                                    <div key={inc.id} onClick={() => setSelectedReport(inc)} className="p-2 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 hover:border-red-400 cursor-pointer text-xs transition-colors">
                                        <p className="font-semibold text-red-700 dark:text-red-300">{inc.type}</p>
                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{inc.description}</p>
                                    </div>
                                ))}
                                {selectedZoneItems.incidents.length === 0 && <p className="text-xs text-slate-400 italic">None.</p>}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToggleButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all border ${
            active 
            ? 'bg-slate-800 border-slate-800 text-white dark:bg-neon-blue dark:text-black dark:border-neon-blue shadow-neon-blue' 
            : 'bg-transparent border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
        }`}
    >
        {label}
    </button>
);