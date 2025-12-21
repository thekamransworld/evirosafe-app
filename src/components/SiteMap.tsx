import React, { useState, useMemo } from 'react';
import { useAppContext, useDataContext, useModalContext } from '../contexts';
import type { Ptw, Report } from '../types';
import { ptwTypeDetails } from '../config';
import { getRiskConfig } from './Reports'; // Use the new config

interface MarkerProps {
    x: number;
    y: number;
    type: 'ptw' | 'incident';
    data: any;
    onClick: () => void;
}

const Marker: React.FC<MarkerProps> = ({ x, y, type, data, onClick }) => {
    let color = '';
    
    if (type === 'ptw') {
        const ptw = data as Ptw;
        const details = ptwTypeDetails[ptw.type];
        color = details.hex;
    } else if (type === 'incident') {
        const report = data as Report;
        // Use the new risk config structure safely
        const risk = getRiskConfig(report.risk_pre_control.severity, report.risk_pre_control.likelihood);
        // Map Tailwind colors to Hex for SVG
        color = risk.label === 'CRITICAL' ? '#f43f5e' : 
                risk.label === 'HIGH' ? '#f97316' : 
                risk.label === 'MEDIUM' ? '#eab308' : '#10b981';
    }

    return (
        <g transform={`translate(${x}, ${y})`} onClick={(e) => { e.stopPropagation(); onClick(); }} className="cursor-pointer hover:scale-125 transition-transform duration-200">
            <circle r="12" fill={color} fillOpacity="0.3" className="animate-pulse" />
            <circle r="5" fill={color} stroke="white" strokeWidth="1.5" />
        </g>
    );
};

const MapZone: React.FC<{ 
    id: string; 
    d: string; 
    label: string; 
    isActive: boolean;
    onClick: () => void 
}> = ({ id, d, label, isActive, onClick }) => {
    return (
        <g onClick={onClick} className="cursor-pointer group">
            <path 
                d={d} 
                fill={isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.03)'} 
                stroke={isActive ? '#06b6d4' : '#334155'} 
                strokeWidth={isActive ? 2 : 1} 
                className="transition-all duration-300 hover:fill-white/10"
            />
            {/* Center Label Logic */}
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
                        className={`pointer-events-none text-[10px] font-bold uppercase tracking-widest ${isActive ? 'fill-cyan-400' : 'fill-slate-600'}`}
                     >
                         {label}
                     </text>
                 )
             })()}
        </g>
    );
};

export const SiteMap: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const { projects, ptwList, reportList } = useDataContext();
    const { setSelectedPtw, setSelectedReport } = useModalContext();
    
    const [selectedProject, setSelectedProject] = useState(projects[0] || null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);

    // Mock Site Layout (SVG Paths)
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

    if (!selectedProject) return <div className="p-8 text-center text-slate-500">Please select or create a project.</div>;

    return (
        <div className="h-full flex flex-col">
            {!embedded && (
                <div className="p-6 mb-4 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Site Digital Twin</h1>
                        <p className="text-sm text-slate-400">Live spatial visualization</p>
                    </div>
                </div>
            )}

            <div className={`flex-1 relative overflow-hidden flex items-center justify-center ${embedded ? '' : 'bg-slate-950 rounded-2xl border border-white/5'}`}>
                {/* 3D Perspective Container */}
                <div className="relative transform-style-3d rotate-x-12 scale-90 transition-transform duration-700 hover:scale-95" style={{ width: '800px', height: '600px' }}>
                     {/* Grid Floor */}
                    <div className="absolute inset-0 opacity-20" style={{ 
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
                        backgroundSize: '40px 40px' 
                    }}></div>
                    
                    <svg width="800" height="600" className="absolute inset-0 z-10 drop-shadow-2xl">
                        {zones.map(zone => (
                            <MapZone 
                                key={zone.id}
                                id={zone.id}
                                d={zone.d}
                                label={zone.label}
                                isActive={selectedZone === zone.id}
                                onClick={() => setSelectedZone(zone.id)}
                            />
                        ))}
                        {mappedData.ptws.map((ptw: any) => (
                            <Marker key={ptw.id} x={ptw.mapLoc.x} y={ptw.mapLoc.y} type="ptw" data={ptw} onClick={() => { setSelectedPtw(ptw); setSelectedZone(ptw.mapLoc.zoneId); }} />
                        ))}
                        {mappedData.incidents.map((inc: any) => (
                            <Marker key={inc.id} x={inc.mapLoc.x} y={inc.mapLoc.y} type="incident" data={inc} onClick={() => { setSelectedReport(inc); setSelectedZone(inc.mapLoc.zoneId); }} />
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    );
};