import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useDataContext, useAppContext } from '../contexts';
import { TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:     string;
  value:     string | number;
  target?:   number;
  industry?: number;
  unit?:     string;
  trend?:    'up' | 'down' | 'flat';
  good?:     'low' | 'high'; // whether lower or higher is better
  icon:      React.FC<any>;
  color:     string;
  bg:        string;
}

// ─── OSHA benchmarks ──────────────────────────────────────────────────────────

const BENCHMARKS = {
  ltir:     { target: 0.5,  industry: 1.2,  good: 'low'  as const },
  trir:     { target: 1.0,  industry: 2.5,  good: 'low'  as const },
  dartRate: { target: 0.8,  industry: 2.0,  good: 'low'  as const },
  nearMiss: { target: 5,    industry: 3,    good: 'high' as const }, // high near-miss = good reporting culture
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const trendIcon = (trend: 'up' | 'down' | 'flat', good: 'low' | 'high') => {
  if (trend === 'flat') return <Minus className="w-4 h-4 text-gray-400" />;
  const isGood = (trend === 'down' && good === 'low') || (trend === 'up' && good === 'high');
  if (trend === 'up')   return <TrendingUp   className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
  return                       <TrendingDown  className={`w-4 h-4 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KpiCard: React.FC<KpiCardProps> = ({ label, value, target, industry, unit, trend = 'flat', good = 'low', icon: Icon, color, bg }) => {
  const numVal  = parseFloat(String(value));
  const vsTarget = target ? ((numVal - target) / target * 100) : null;
  const isGoodVsTarget = good === 'low' ? numVal <= (target ?? Infinity) : numVal >= (target ?? 0);

  return (
    <div className={`${bg} rounded-xl p-5 border border-white/5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        {trend && trendIcon(trend, good)}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}{unit && <span className="text-lg ml-0.5">{unit}</span>}</p>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{label}</p>
      <div className="mt-3 space-y-1 text-xs">
        {target !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Target</span>
            <span className={`font-bold ${isGoodVsTarget ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {isGoodVsTarget ? '✓' : '✗'} {target}{unit}
            </span>
          </div>
        )}
        {industry !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Industry avg</span>
            <span className="text-gray-400 font-mono">{industry}{unit}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-gray-800 dark:text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600 dark:text-gray-300">{p.name}:</span>
          <span className="font-bold text-gray-800 dark:text-white">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const KpiDashboard: React.FC = () => {
  const { reportList, inspectionList, projects } = useDataContext();
  const { usersList } = useAppContext();
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');

  // ── Real KPI calculations ──────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const totalManpower    = usersList.length || 50;
    const estimatedHours   = totalManpower * 160 * 12; // annual

    const ltiReports       = reportList.filter(r => r.type === 'Lost Time Injury (LTI)');
    const recordable       = reportList.filter(r => !['Positive Observation', 'Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(r.type));
    const nearMisses       = reportList.filter(r => r.type === 'Near Miss');
    const totalDaysLost    = ltiReports.length * 5; // estimate 5 days/LTI
    const totalDaysDART    = totalDaysLost + recordable.length * 2;

    const ltir     = estimatedHours > 0 ? +(ltiReports.length  * 200000 / estimatedHours).toFixed(2) : 0;
    const trir     = estimatedHours > 0 ? +(recordable.length  * 200000 / estimatedHours).toFixed(2) : 0;
    const dartRate = estimatedHours > 0 ? +(totalDaysDART      * 200000 / estimatedHours).toFixed(2) : 0;

    const inspDone    = inspectionList.filter(i => i.status === 'Closed' || i.status === 'Approved').length;
    const inspTotal   = Math.max(inspectionList.length, 1);
    const inspRate    = Math.round((inspDone / inspTotal) * 100);
    const openCars    = recordable.filter(r => r.status !== 'closed').length;
    const safetyScore = Math.max(0, Math.round(100 - (ltir * 10) - (trir * 4) - (openCars * 2)));

    return { ltir, trir, dartRate, nearMisses: nearMisses.length, inspRate, openCars, safetyScore, ltiCount: ltiReports.length, totalHours: estimatedHours };
  }, [reportList, inspectionList, usersList]);

  // ── Monthly trend data ─────────────────────────────────────────────────────

  const monthlyData = useMemo(() => {
    const monthCount = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    return Array.from({ length: monthCount }, (_, i) => {
      const d      = new Date();
      d.setMonth(d.getMonth() - (monthCount - 1 - i));
      const month  = d.getMonth();
      const year   = d.getFullYear();
      const label  = `${MONTHS[month]} ${year !== new Date().getFullYear() ? year : ''}`.trim();

      const monthReports  = reportList.filter(r => {
        const rd = new Date(r.occurred_at);
        return rd.getMonth() === month && rd.getFullYear() === year;
      });
      const monthInsp    = inspectionList.filter(r => {
        const rd = new Date(r.created_at || '');
        return rd.getMonth() === month && rd.getFullYear() === year;
      });

      const lti        = monthReports.filter(r => r.type === 'Lost Time Injury (LTI)').length;
      const recordable = monthReports.filter(r => !['Positive Observation', 'Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(r.type)).length;
      const nearMiss   = monthReports.filter(r => r.type === 'Near Miss').length;
      const hours      = (usersList.length || 50) * 160;
      const ltir       = hours > 0 ? +(lti       * 200000 / hours).toFixed(2) : 0;
      const trir       = hours > 0 ? +(recordable * 200000 / hours).toFixed(2) : 0;

      return {
        month: label,
        incidents: recordable,
        nearMisses: nearMiss,
        ltir,
        trir,
        inspections: monthInsp.length,
        hours: Math.round(hours / 1000), // in thousands
      };
    });
  }, [reportList, inspectionList, usersList, period]);

  // ── Radar data (leading vs lagging) ───────────────────────────────────────

  const radarData = [
    { subject: 'Near Miss Reporting',     A: Math.min(kpis.nearMisses * 10, 100),  fullMark: 100 },
    { subject: 'Inspection Completion',   A: kpis.inspRate,                         fullMark: 100 },
    { subject: 'Safety Score',            A: kpis.safetyScore,                     fullMark: 100 },
    { subject: 'Low LTIR',                A: Math.max(0, 100 - kpis.ltir * 50),    fullMark: 100 },
    { subject: 'Low TRIR',                A: Math.max(0, 100 - kpis.trir * 20),    fullMark: 100 },
    { subject: 'Open CARs (inverse)',     A: Math.max(0, 100 - kpis.openCars * 5), fullMark: 100 },
  ];

  // ── Incident type breakdown ────────────────────────────────────────────────

  const typeBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    reportList.forEach(r => { types[r.type] = (types[r.type] || 0) + 1; });
    return Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, value }));
  }, [reportList]);

  const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="LTIR" value={kpis.ltir} target={BENCHMARKS.ltir.target} industry={BENCHMARKS.ltir.industry}
          trend={kpis.ltir <= BENCHMARKS.ltir.target ? 'down' : 'up'} good="low"
          icon={AlertTriangle} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" />
        <KpiCard label="TRIR" value={kpis.trir} target={BENCHMARKS.trir.target} industry={BENCHMARKS.trir.industry}
          trend={kpis.trir <= BENCHMARKS.trir.target ? 'down' : 'up'} good="low"
          icon={Shield} color="text-orange-600 dark:text-orange-400" bg="bg-orange-50 dark:bg-orange-900/20" />
        <KpiCard label="DART Rate" value={kpis.dartRate} target={BENCHMARKS.dartRate.target} industry={BENCHMARKS.dartRate.industry}
          trend={kpis.dartRate <= BENCHMARKS.dartRate.target ? 'down' : 'up'} good="low"
          icon={Clock} color="text-yellow-600 dark:text-yellow-400" bg="bg-yellow-50 dark:bg-yellow-900/20" />
        <KpiCard label="Safety Score" value={`${kpis.safetyScore}%`}
          trend={kpis.safetyScore >= 80 ? 'up' : 'down'} good="high"
          icon={CheckCircle} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trend Analysis</h2>
        <div className="flex gap-2">
          {(['3m', '6m', '12m'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${period === p ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>
              {p === '3m' ? '3 Months' : p === '6m' ? '6 Months' : '12 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* LTIR / TRIR trend */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">LTIR & TRIR Monthly Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine y={BENCHMARKS.ltir.target}  stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'LTIR Target', fontSize: 10, fill: '#22c55e' }} />
            <ReferenceLine y={BENCHMARKS.trir.target}   stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'TRIR Target', fontSize: 10, fill: '#f59e0b' }} />
            <Line type="monotone" dataKey="ltir"  name="LTIR"  stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="trir"  name="TRIR"  stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Incident vs Near Miss bar chart */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Incidents vs Near Misses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="incidents"  name="Incidents"   fill="#ef4444" radius={[3,3,0,0]} />
              <Bar dataKey="nearMisses" name="Near Misses" fill="#3b82f6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 italic">
            High near-miss to incident ratio = strong reporting culture
          </p>
        </div>

        {/* Leading vs lagging radar */}
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">HSE Performance Radar</h3>
          <p className="text-xs text-gray-400 mb-2">Leading & lagging indicators (higher = better)</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar name="Performance" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Incident type breakdown */}
      {typeBreakdown.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Incident Type Breakdown</h3>
          <div className="space-y-3">
            {typeBreakdown.map((item, i) => {
              const max = typeBreakdown[0].value;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-40 truncate flex-shrink-0">{item.name}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6 text-right">{item.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inspection trend area chart */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border p-5">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Inspection Activity</h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="inspGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="inspections" name="Inspections" stroke="#22c55e" fill="url(#inspGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};