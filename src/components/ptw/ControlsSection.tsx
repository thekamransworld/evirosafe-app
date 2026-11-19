import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { Ptw } from '../../types';
import type { EnginePermit } from '../../lib/ptw/engine';
import { competencyNeeds, evaluateGates, type GateContext, type GateResult } from '../../lib/ptw/gates';
import { checkCompetency } from '../../lib/ptw/competency';
import { ACTIONS, COMPETENCY_LABEL, FORWARD_ACTIONS, type GateGroup } from '../../lib/ptw/model';
import { effectiveStatus } from '../../lib/ptw/validity';
import { gasTestStatus } from '../../lib/ptw/gas';
import { typeRule } from '../../lib/ptw/model';
import { useNow } from './useNow';

type GateInputs = Pick<GateContext, 'others' | 'competency'>;

const Icon: React.FC<{ level: GateResult['level'] }> = ({ level }) =>
  level === 'block' ? <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
  : level === 'warn' ? <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
  : <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />;

/**
 * "Controls & checks": everything the permit is checked against before it can move on,
 * live. This is what the action bar will enforce, shown ahead of time.
 */
export const ControlsSection: React.FC<{ permit: Ptw; gateInputs: GateInputs }> = ({ permit, gateInputs }) => {
  const now = useNow(15_000);
  const p = permit as unknown as EnginePermit;
  const stage = effectiveStatus(p, now);
  const rule = typeRule(permit.type);

  const groups: GateGroup[] = [];
  if (stage) {
    for (const id of FORWARD_ACTIONS[stage] ?? []) { const g = ACTIONS[id].gate; if (g && !groups.includes(g)) groups.push(g); }
    if (stage === 'ACTIVE') for (const g of ['revalidate', 'completion'] as GateGroup[]) if (!groups.includes(g)) groups.push(g);
  }
  const label: Record<GateGroup, string> = {
    submit: 'Before it can be submitted', inspection: 'Before the site inspection can be passed', approve: 'Before it can be approved',
    activate: 'Before the work can start', revalidate: 'Before it can be extended or resumed', completion: 'Before completion can be requested', close: 'Before it can be closed',
  };

  const needs = competencyNeeds(permit as any);
  const gas = rule?.gasMaxAgeMin ? gasTestStatus((permit.payload as any)?.gas_tests, now, rule.gasMaxAgeMin) : null;

  return (
    <div className="space-y-6" data-testid="controls-section">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        These checks run automatically. A red item stops the next step. Some can be overridden by an approver, in writing.
        Checks on the content of a permit are made by the app; who may do what, and the validity time, are also enforced by the database.
      </p>

      {groups.length === 0 && <p className="text-sm text-gray-500">No further steps on this permit.</p>}
      {groups.map(g => {
        const results = evaluateGates(g, { permit: p, now, action: g === 'revalidate' ? 'revalidate' : undefined, ...gateInputs });
        return (
          <section key={g} className="border rounded-lg dark:border-dark-border">
            <h4 className="px-4 py-2 font-bold text-sm bg-gray-50 dark:bg-white/5 border-b dark:border-dark-border text-gray-800 dark:text-gray-200">{label[g]}</h4>
            <ul className="p-3 space-y-1.5 text-sm">
              {results.map(r => (
                <li key={r.id} className="flex items-start gap-2"><Icon level={r.level} /><span className="text-gray-800 dark:text-gray-200">{r.message}{r.level === 'block' && r.overridable ? ' (approver can override)' : ''}</span></li>
              ))}
            </ul>
          </section>
        );
      })}

      {gas && (
        <section className="border rounded-lg p-4 dark:border-dark-border text-sm">
          <h4 className="font-bold mb-1 text-gray-800 dark:text-gray-200">Gas test</h4>
          <p className="text-gray-700 dark:text-gray-300">
            {gas.status === 'none' ? 'No complete gas test recorded.'
              : gas.status === 'pass' ? `Latest test passed ${gas.ageMin} min ago (valid for ${rule!.gasMaxAgeMin} min).`
              : gas.status === 'stale' ? `Latest test is ${gas.ageMin} min old: re-test (valid for ${rule!.gasMaxAgeMin} min).`
              : `Latest test FAILED: ${gas.failures.join('; ')}.`}
          </p>
        </section>
      )}

      <section className="border rounded-lg p-4 dark:border-dark-border">
        <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200 text-sm">Competency</h4>
        {needs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{rule && rule.competency.length > 0 ? 'No team members listed, so nobody can be checked.' : 'This permit type has no competency requirement.'}</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500"><th className="py-1">Person</th><th>Needs</th><th>Status</th></tr></thead>
            <tbody>
              {needs.flatMap(n => n.keys.map(key => {
                const c = gateInputs.competency ? checkCompetency(n.user_id, key, gateInputs.competency, now) : null;
                const text = !c ? 'Not checked' : c.status === 'ok' ? 'Certified' : c.status === 'missing' ? 'No valid certificate' : c.status === 'unverified' ? 'No account: check on site' : 'No course tagged';
                const cls = !c ? 'text-gray-500' : c.status === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : c.status === 'missing' ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-amber-700 dark:text-amber-300';
                return (
                  <tr key={`${n.name}-${key}`} className="border-t dark:border-dark-border">
                    <td className="py-1.5">{n.name}</td>
                    <td>{(COMPETENCY_LABEL as Record<string, string>)[key] ?? key}</td>
                    <td className={cls}>{text}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};
