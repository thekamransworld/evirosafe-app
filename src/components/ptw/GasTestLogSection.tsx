import React from 'react';
import type { GasTestLogEntry } from '../../types';
import { evaluateGasReading, gasTestStatus, isCompleteRow, DEFAULT_GAS_LIMITS as L } from '../../lib/ptw/gas';
import { typeRule } from '../../lib/ptw/model';
import { Button } from '../ui/Button';
import { useNow } from './useNow';

const cell = 'w-full bg-transparent border rounded p-1 text-sm disabled:opacity-70 dark:border-dark-border';
const hhmm = (ms: number) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

type Field = 'o2' | 'lel' | 'h2s' | 'co';

/**
 * Gas test log.
 *  - New rows start BLANK: nothing is pre-filled with a passing reading.
 *  - A row that has been saved is locked: a reading is a record, not a draft.
 *    To correct it, add a new test.
 *  - Each row shows pass or fail against the limits, and the permit shows
 *    whether the LATEST complete test is still fresh enough.
 */
export const GasTestLogSection: React.FC<{
  gasTests: GasTestLogEntry[];
  onChange: (rows: GasTestLogEntry[]) => void;
  disabled: boolean;
  /** How many of the first rows are already saved (and therefore locked). */
  lockedCount: number;
  permitType: string;
  testerName: string;
}> = ({ gasTests = [], onChange, disabled, lockedCount, permitType, testerName }) => {
  const now = useNow(15_000);
  const maxAge = typeRule(permitType)?.gasMaxAgeMin ?? 60;
  const status = gasTestStatus(gasTests as any, now, maxAge);

  const add = () => onChange([...gasTests, { time: hhmm(now), o2: '' as any, lel: '' as any, co: '' as any, h2s: '' as any, tester_name: testerName }]);
  const set = (i: number, patch: Partial<Record<Field | 'time' | 'tester_name', any>>) => onChange(gasTests.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const num = (v: string) => (v === '' ? '' : Number(v));

  const banner =
    status.status === 'pass' ? { tone: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:border-emerald-800', text: `Latest test passed ${status.ageMin} min ago. Valid for ${maxAge} min.` }
    : status.status === 'stale' ? { tone: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800', text: `Latest test is ${status.ageMin} min old. Re-test (valid for ${maxAge} min).` }
    : status.status === 'fail' ? { tone: 'bg-red-50 text-red-900 border-red-300 dark:bg-red-900/25 dark:text-red-200 dark:border-red-800', text: `Latest test FAILED: ${status.failures.join('; ')}. Ventilate and re-test.` }
    : { tone: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-dark-border', text: 'No complete gas test recorded yet.' };

  return (
    <div className="border rounded-lg p-4 mb-6 dark:border-dark-border" data-testid="gas-log">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-bold text-gray-800 dark:text-gray-200">Gas test log</h4>
        {!disabled && <Button size="sm" onClick={add}>+ Add test</Button>}
      </div>
      <p className={`text-sm rounded border px-3 py-2 mb-3 ${banner.tone}`} role="status" data-testid="gas-status">{banner.text}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Limits (defaults, confirm with your procedure): O₂ {L.o2Min}–{L.o2Max}%, LEL at most {L.lelMax}%, H₂S at most {L.h2sMax} ppm, CO at most {L.coMax} ppm.
        Saved tests are locked. To correct one, add a new test.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 dark:bg-white/5"><tr>
            <th className="p-2">Time</th><th className="p-2">O₂ %</th><th className="p-2">LEL %</th><th className="p-2">H₂S ppm</th><th className="p-2">CO ppm</th><th className="p-2">Tester</th><th className="p-2">Result</th><th className="p-2" />
          </tr></thead>
          <tbody>
            {gasTests.map((r, i) => {
              const locked = disabled || i < lockedCount;
              const complete = isCompleteRow(r as any, now);
              const ev = complete ? evaluateGasReading(r as any) : null;
              return (
                <tr key={i} className="border-b dark:border-dark-border align-top">
                  <td className="p-2 w-24"><input type="time" className={cell} value={r.time ?? ''} disabled={locked} onChange={e => set(i, { time: e.target.value })} aria-label={`Test ${i + 1} time`} /></td>
                  {(['o2', 'lel', 'h2s', 'co'] as Field[]).map(f => (
                    <td key={f} className="p-2 w-20"><input type="number" step="0.1" className={cell} value={(r as any)[f] ?? ''} disabled={locked} onChange={e => set(i, { [f]: num(e.target.value) })} aria-label={`Test ${i + 1} ${f}`} /></td>
                  ))}
                  <td className="p-2"><input type="text" className={cell} value={r.tester_name ?? ''} disabled={locked} onChange={e => set(i, { tester_name: e.target.value })} aria-label={`Test ${i + 1} tester`} /></td>
                  <td className="p-2 text-xs min-w-[8rem]">
                    {!complete ? <span className="text-gray-500">Incomplete (ignored)</span>
                      : ev!.pass ? <span className="text-emerald-700 dark:text-emerald-300 font-semibold">Pass</span>
                      : <span className="text-red-700 dark:text-red-300 font-semibold">FAIL: {ev!.failures.join('; ')}</span>}
                    {i < lockedCount && <div className="text-gray-400">Saved</div>}
                  </td>
                  <td className="p-2">{!disabled && i >= lockedCount && <button type="button" className="text-red-500" onClick={() => onChange(gasTests.filter((_, k) => k !== i))} aria-label={`Remove test ${i + 1}`}>×</button>}</td>
                </tr>
              );
            })}
            {gasTests.length === 0 && <tr><td colSpan={8} className="p-3 text-center text-gray-500 dark:text-gray-400">No tests recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
