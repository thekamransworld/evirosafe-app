/**
 * EviroSafe — useHseKpis hook
 * Returns live KPI data. Falls back to zeros until Supabase is connected.
 * To connect: npm install @supabase/supabase-js, add .env vars.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAppContext } from '../contexts';

export interface HseKpis {
  totalManHours:       number;
  totalIncidents:      number;
  nearMissCount:       number;
  lostTimeIncidents:   number;
  totalDaysLost:       number;
  oshRecordableCount:  number;
  ltir:                number;
  trir:                number;
  dartRate:            number;
  activePermits:       number;
  openCars:            number;
  overdueCars:         number;
  trainingExpiring30d: number;
  safetyScore:         number;
  safeManHours:        string;
  incidentTrend:       MonthlyTrend[];
  nearMissTrend:       MonthlyTrend[];
  manHoursTrend:       MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  year:  number;
  value: number;
}

const EMPTY_KPIS: HseKpis = {
  totalManHours: 0, totalIncidents: 0, nearMissCount: 0,
  lostTimeIncidents: 0, totalDaysLost: 0, oshRecordableCount: 0,
  ltir: 0, trir: 0, dartRate: 0, activePermits: 0,
  openCars: 0, overdueCars: 0, trainingExpiring30d: 0,
  safetyScore: 100, safeManHours: '0',
  incidentTrend: [], nearMissTrend: [], manHoursTrend: [],
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const calculateSafetyScore = (kpis: Partial<HseKpis>): number => {
  let score = 100;
  if ((kpis.ltir ?? 0) > 0)       score -= Math.min((kpis.ltir ?? 0) * 10, 30);
  if ((kpis.openCars ?? 0) > 0)   score -= Math.min((kpis.openCars ?? 0) * 2, 20);
  if ((kpis.overdueCars ?? 0) > 0) score -= Math.min((kpis.overdueCars ?? 0) * 5, 25);
  if ((kpis.trainingExpiring30d ?? 0) > 0) score -= Math.min((kpis.trainingExpiring30d ?? 0), 10);
  return Math.max(0, Math.round(score));
};

function buildMonthlyTrend(records: any[], dateField: string): MonthlyTrend[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const year = d.getFullYear(), month = d.getMonth();
    const value = records.filter(r => {
      const rd = new Date(r[dateField]);
      return rd.getFullYear() === year && rd.getMonth() === month;
    }).length;
    return { month: MONTHS[month], year, value };
  });
}

function buildMonthlyManHours(records: any[]): MonthlyTrend[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const year = d.getFullYear(), month = d.getMonth();
    const value = records
      .filter(r => { const rd = new Date(r.log_date); return rd.getFullYear() === year && rd.getMonth() === month; })
      .reduce((sum, r) => sum + (r.hours_worked ?? 0), 0);
    return { month: MONTHS[month], year, value: Math.round(value) };
  });
}

export const useHseKpis = (projectId?: string) => {
  const { activeUser } = useAppContext();
  const [kpis, setKpis]       = useState<HseKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchKpis = useCallback(async () => {
    // Use activeUser.org_id — AppContextType has activeUser not currentUser
    if (!activeUser?.org_id) return;
    setLoading(true);
    setError(null);

    const db = getSupabase();

    try {
      const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let mhQ = db.from('man_hours_log').select('hours_worked, log_date')
        .eq('org_id', activeUser.org_id).gte('log_date', yearAgo);
      if (projectId) mhQ = mhQ.eq('project_id', projectId);
      const { data: mhData } = await mhQ;

      const totalManHours = (mhData ?? []).reduce((s: number, r: any) => s + (r.hours_worked ?? 0), 0);

      let rQ = db.from('reports')
        .select('type, incident_type, is_osha_recordable, days_lost, days_restricted, occurred_at')
        .eq('org_id', activeUser.org_id).gte('occurred_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
      if (projectId) rQ = rQ.eq('project_id', projectId);
      const { data: rptData } = await rQ;

      const reports           = rptData ?? [];
      const totalIncidents    = reports.filter((r: any) => r.type === 'incident').length;
      const nearMissCount     = reports.filter((r: any) => r.type === 'near_miss').length;
      const lostTimeIncidents = reports.filter((r: any) => ['lost_time_injury','fatality'].includes(r.incident_type)).length;
      const totalDaysLost     = reports.reduce((s: number, r: any) => s + (r.days_lost ?? 0), 0);
      const totalDaysDART     = reports.reduce((s: number, r: any) => s + (r.days_lost ?? 0) + (r.days_restricted ?? 0), 0);
      const oshRecordableCount = reports.filter((r: any) => r.is_osha_recordable).length;

      const ltir     = totalManHours > 0 ? +(lostTimeIncidents  * 200000 / totalManHours).toFixed(2) : 0;
      const trir     = totalManHours > 0 ? +(oshRecordableCount * 200000 / totalManHours).toFixed(2) : 0;
      const dartRate = totalManHours > 0 ? +(totalDaysDART      * 200000 / totalManHours).toFixed(2) : 0;

      let ptwQ = db.from('ptws').select('id', { count: 'exact', head: true })
        .eq('org_id', activeUser.org_id).eq('status', 'ACTIVE');
      if (projectId) ptwQ = ptwQ.eq('project_id', projectId);
      const { count: activePermits } = await ptwQ;

      let carQ = db.from('corrective_actions').select('status').eq('org_id', activeUser.org_id);
      if (projectId) carQ = carQ.eq('project_id', projectId);
      const { data: carData } = await carQ;
      const cars        = carData ?? [];
      const openCars    = cars.filter((c: any) => ['open','in_progress'].includes(c.status)).length;
      const overdueCars = cars.filter((c: any) => c.status === 'overdue').length;

      const in30d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { count: trainingExpiring30d } = await db.from('training_records')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', activeUser.org_id)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte('expiry_date', in30d);

      const rawKpis = { ltir, trir, dartRate, openCars, overdueCars, trainingExpiring30d: trainingExpiring30d ?? 0 };
      const safetyScore = calculateSafetyScore(rawKpis);

      setKpis({
        totalManHours, totalIncidents, nearMissCount, lostTimeIncidents,
        totalDaysLost, oshRecordableCount, ltir, trir, dartRate,
        activePermits: activePermits ?? 0, openCars, overdueCars,
        trainingExpiring30d: trainingExpiring30d ?? 0,
        safetyScore,
        safeManHours:   totalManHours.toLocaleString('en-US'),
        incidentTrend:  buildMonthlyTrend(reports.filter((r: any) => r.type === 'incident'), 'occurred_at'),
        nearMissTrend:  buildMonthlyTrend(reports.filter((r: any) => r.type === 'near_miss'), 'occurred_at'),
        manHoursTrend:  buildMonthlyManHours(mhData ?? []),
      });
    } catch (err: any) {
      console.error('[useHseKpis]', err);
      setError(err.message ?? 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  }, [activeUser?.org_id, projectId]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  return { kpis, loading, error, refetch: fetchKpis };
};